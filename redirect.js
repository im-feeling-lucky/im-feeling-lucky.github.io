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
    const baseUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
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

  /**
   * Record that a forward redirect occurred in history state and navigate via assign.
   * @param {History} historyObj
   * @param {Location} locationObj
   * @param {string} url
   */
  function markRedirected(historyObj, locationObj, url) {
    historyObj.replaceState({ redirected: true }, '');
    locationObj.assign(url);
  }

  return {
    parseQuery,
    buildTargetUrl,
    shouldAutoRedirect,
    markRedirected,
  };
});
