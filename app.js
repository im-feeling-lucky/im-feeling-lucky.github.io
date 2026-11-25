(function () {
  'use strict';

  const recoveryUi = document.getElementById('recovery-ui');
  const form = document.getElementById('search-form');
  const input = document.getElementById('query-input');
  const googleSearchBtn = document.getElementById('google-search-btn');

  let pendingRedirectTimer = null;
  let redirectCancelled = false;

  /**
   * Cancel any pending delayed auto-redirect timer.
   */
  function cancelPendingRedirect() {
    redirectCancelled = true;
    if (pendingRedirectTimer !== null) {
      window.clearTimeout(pendingRedirectTimer);
      pendingRedirectTimer = null;
    }
  }

  /**
   * Reveal the recovery UI, populate the query input, and focus/select it.
   * @param {string} query
   */
  function showRecoveryUI(query) {
    cancelPendingRedirect();
    if (!recoveryUi || !input) {
      return;
    }
    recoveryUi.hidden = false;
    input.value = query;
    input.focus();
    input.select();
  }

  /**
   * Persist the edited query into history state and navigate to Google.
   * @param {'lucky' | 'search'} mode
   */
  function navigateWithMode(mode) {
    if (!input) {
      return;
    }
    const newQuery = input.value.trim();
    if (!newQuery) {
      input.focus();
      return;
    }
    window.history.replaceState(
      { redirected: true },
      '',
      '?q=' + encodeURIComponent(newQuery)
    );
    window.location.assign(LuckyRedirect.buildTargetUrl(newQuery, mode));
  }

  /**
   * Read the current navigation type from the Performance API.
   * @returns {string}
   */
  function getNavType() {
    const navEntry = performance.getEntriesByType('navigation')[0];
    return (navEntry && navEntry.type) || 'navigate';
  }

  window.addEventListener('pageshow', function (event) {
    const currentQuery = LuckyRedirect.parseQuery(window.location.search);
    const isBackNav =
      event.persisted ||
      (Boolean(currentQuery) &&
        (getNavType() === 'back_forward' ||
          window.history.state?.redirected === true));

    if (isBackNav) {
      showRecoveryUI(currentQuery);
    } else {
      redirectCancelled = false;
    }
  });

  if (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      navigateWithMode('lucky');
    });
  }

  if (googleSearchBtn) {
    googleSearchBtn.addEventListener('click', function () {
      navigateWithMode('search');
    });
  }

  if (input) {
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && event.shiftKey) {
        event.preventDefault();
        navigateWithMode('search');
      }
    });
  }

  /**
   * Safely access window.sessionStorage, returning null if restricted.
   * @returns {Storage | null}
   */
  function getSessionStorage() {
    try {
      return window.sessionStorage;
    } catch (_) {
      return null;
    }
  }

  /**
   * Schedule an auto-redirect after window load + 100ms so Chrome commits the history entry.
   * @param {string} targetUrl
   * @param {string} query
   */
  function scheduleAutoRedirect(targetUrl, query) {
    const startTimer = function () {
      if (redirectCancelled) {
        return;
      }
      pendingRedirectTimer = window.setTimeout(function () {
        pendingRedirectTimer = null;
        if (!redirectCancelled) {
          LuckyRedirect.recordLastRedirect(getSessionStorage(), query);
          LuckyRedirect.markRedirected(window.history, window.location, targetUrl);
        }
      }, 100);
    };

    if (document.readyState === 'complete') {
      startTimer();
    } else {
      window.addEventListener('load', startTimer, { once: true });
    }
  }

  window.addEventListener('pagehide', function (event) {
    if (event.persisted || pendingRedirectTimer !== null) {
      cancelPendingRedirect();
    }
  });

  const query = LuckyRedirect.parseQuery(window.location.search);
  const navType = getNavType();
  const recentRedirect = LuckyRedirect.hasRecentRedirect(getSessionStorage(), query);

  if (
    !recentRedirect &&
    LuckyRedirect.shouldAutoRedirect({
      query,
      historyState: window.history.state,
      navType,
      isPersisted: false,
    })
  ) {
    scheduleAutoRedirect(LuckyRedirect.buildTargetUrl(query, 'lucky'), query);
  } else {
    showRecoveryUI(query);
  }
})();
