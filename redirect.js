(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LuckyRedirect = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * Extract and trim the `q` query parameter from a URL search string.
   * @param {string} searchString
   * @returns {string}
   */
  function parseQuery(searchString) {
    const params = new URLSearchParams(searchString || '');
    const raw = params.get('q');
    return raw ? raw.trim() : '';
  }

  /**
   * Build the target Google URL for either 'lucky' or 'search' mode.
   * @param {string} query
   * @param {'lucky' | 'search'} mode
   * @returns {string}
   */
  function buildTargetUrl(query, mode) {
    const trimmed = typeof query === 'string' ? query.trim() : '';
    if (!trimmed) {
      throw new Error('Query must be a non-empty string');
    }
    const baseUrl = `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
    if (mode === 'lucky') {
      return `${baseUrl}&btnI=1`;
    }
    if (mode === 'search') {
      return baseUrl;
    }
    throw new Error(`Unsupported redirect mode: ${mode}`);
  }

  /**
   * Determine whether the page should auto-redirect on load.
   * @param {{ query?: string, historyState?: { redirected?: boolean } | null, navType?: string, isPersisted?: boolean }} params
   * @returns {boolean}
   */
  function shouldAutoRedirect({ query, historyState, navType, isPersisted } = {}) {
    if (!query) {
      return false;
    }
    if (isPersisted === true) {
      return false;
    }
    if (navType === 'back_forward') {
      return false;
    }
    if (historyState?.redirected === true) {
      return false;
    }
    return true;
  }

  const LAST_REDIRECT_KEY = 'luckyRedirect:last';

  /**
   * Record that a forward redirect occurred in history state and navigate via assign.
   * @param {History} historyObj
   * @param {Location} locationObj
   * @param {string} url
   * @param {{ pushAnchor?: boolean }} [options]
   */
  function markRedirected(historyObj, locationObj, url, options = {}) {
    const { pushAnchor = true } = options;
    if (pushAnchor && typeof historyObj.pushState === 'function') {
      historyObj.pushState({ anchor: true }, '');
    }
    historyObj.replaceState({ redirected: true }, '');
    locationObj.assign(url);
  }

  /**
   * Persist the most recent redirected query and timestamp in sessionStorage.
   * Safely no-ops if storage is unavailable or throws.
   * @param {Storage | null | undefined} storage
   * @param {string} query
   * @param {number} [now]
   */
  function recordLastRedirect(storage, query, now = Date.now()) {
    if (!storage || typeof storage.setItem !== 'function' || !query) {
      return;
    }
    try {
      storage.setItem(
        LAST_REDIRECT_KEY,
        JSON.stringify({ query, timestamp: now })
      );
    } catch (_) {
      // Ignore storage quota or security errors
    }
  }

  /**
   * Check whether the same query was recently auto-redirected within maxAgeMs.
   * Safely returns false if storage is unavailable, malformed, or throws.
   * @param {Storage | null | undefined} storage
   * @param {string} query
   * @param {number} [maxAgeMs=60000]
   * @param {number} [now]
   * @returns {boolean}
   */
  function hasRecentRedirect(storage, query, maxAgeMs = 60000, now = Date.now()) {
    if (!storage || typeof storage.getItem !== 'function' || !query) {
      return false;
    }
    try {
      const raw = storage.getItem(LAST_REDIRECT_KEY);
      if (!raw) {
        return false;
      }
      const parsed = JSON.parse(raw);
      return (
        parsed?.query === query &&
        typeof parsed.timestamp === 'number' &&
        now - parsed.timestamp >= 0 &&
        now - parsed.timestamp <= maxAgeMs
      );
    } catch (_) {
      return false;
    }
  }

  return {
    parseQuery,
    buildTargetUrl,
    shouldAutoRedirect,
    markRedirected,
    recordLastRedirect,
    hasRecentRedirect,
  };
});
