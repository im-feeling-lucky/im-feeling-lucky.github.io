(function () {
  'use strict';

  const recoveryUi = document.getElementById('recovery-ui');
  const form = document.getElementById('search-form');
  const input = document.getElementById('query-input');
  const googleSearchBtn = document.getElementById('google-search-btn');

  /**
   * Reveal the recovery UI, populate the query input, and focus/select it.
   * @param {string} query
   */
  function showRecoveryUI(query) {
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

  window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
      showRecoveryUI(LuckyRedirect.parseQuery(window.location.search));
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

  const query = LuckyRedirect.parseQuery(window.location.search);
  const navEntry = performance.getEntriesByType('navigation')[0];
  const navType = (navEntry && navEntry.type) || 'navigate';

  if (
    LuckyRedirect.shouldAutoRedirect({
      query,
      historyState: window.history.state,
      navType,
      isPersisted: false,
    })
  ) {
    LuckyRedirect.markRedirected(
      window.history,
      window.location,
      LuckyRedirect.buildTargetUrl(query, 'lucky')
    );
  } else {
    showRecoveryUI(query);
  }
})();
