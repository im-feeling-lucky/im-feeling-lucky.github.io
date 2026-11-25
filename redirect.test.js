'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  parseQuery,
  buildTargetUrl,
  shouldAutoRedirect,
  markRedirected,
  recordLastRedirect,
  hasRecentRedirect,
} = require('./redirect.js');

describe('parseQuery', () => {
  it('extracts and trims a standard query', () => {
    assert.equal(parseQuery('?q=hello+world'), 'hello world');
    assert.equal(parseQuery('?q=%20%20node.js%20%20'), 'node.js');
  });

  it('handles URL-encoded spaces and symbols', () => {
    assert.equal(parseQuery('?q=c%2B%2B%20%26%20rust%3F'), 'c++ & rust?');
  });

  it('returns empty string for empty, whitespace-only, or missing q', () => {
    assert.equal(parseQuery(''), '');
    assert.equal(parseQuery('?q='), '');
    assert.equal(parseQuery('?q=%20%20%20'), '');
    assert.equal(parseQuery('?other=value'), '');
  });
});

describe('buildTargetUrl', () => {
  it('builds lucky URL with btnI=1', () => {
    assert.equal(
      buildTargetUrl('openai api', 'lucky'),
      'https://www.google.com/search?q=openai%20api&btnI=1'
    );
  });

  it('builds search URL without btnI=1', () => {
    assert.equal(
      buildTargetUrl('openai api', 'search'),
      'https://www.google.com/search?q=openai%20api'
    );
  });

  it('trims whitespace around query', () => {
    assert.equal(
      buildTargetUrl('  mdn fetch  ', 'lucky'),
      'https://www.google.com/search?q=mdn%20fetch&btnI=1'
    );
  });

  it('throws on empty or whitespace-only queries', () => {
    assert.throws(() => buildTargetUrl('', 'lucky'), /non-empty string/);
    assert.throws(() => buildTargetUrl('   ', 'search'), /non-empty string/);
    assert.throws(() => buildTargetUrl(null, 'lucky'), /non-empty string/);
  });
});

describe('shouldAutoRedirect', () => {
  it('returns true on a fresh load with a non-empty query', () => {
    assert.equal(
      shouldAutoRedirect({
        query: 'rust book',
        historyState: null,
        navType: 'navigate',
        isPersisted: false,
      }),
      true
    );
  });

  it('returns false when query is empty', () => {
    assert.equal(
      shouldAutoRedirect({
        query: '',
        historyState: null,
        navType: 'navigate',
        isPersisted: false,
      }),
      false
    );
  });

  it('returns false when historyState indicates prior redirect', () => {
    assert.equal(
      shouldAutoRedirect({
        query: 'rust book',
        historyState: { redirected: true },
        navType: 'navigate',
        isPersisted: false,
      }),
      false
    );
  });

  it('returns false when navType is back_forward', () => {
    assert.equal(
      shouldAutoRedirect({
        query: 'rust book',
        historyState: null,
        navType: 'back_forward',
        isPersisted: false,
      }),
      false
    );
  });

  it('returns false when restored from bfcache (isPersisted: true)', () => {
    assert.equal(
      shouldAutoRedirect({
        query: 'rust book',
        historyState: null,
        navType: 'navigate',
        isPersisted: true,
      }),
      false
    );
  });
});

describe('markRedirected', () => {
  it('calls replaceState with { redirected: true } before location.assign and never calls replace', () => {
    const calls = [];
    const historyMock = {
      replaceState(state, title) {
        calls.push(['replaceState', state, title]);
      },
    };
    const locationMock = {
      assign(url) {
        calls.push(['assign', url]);
      },
      replace(url) {
        calls.push(['replace', url]);
      },
    };

    const targetUrl = 'https://www.google.com/search?q=test&btnI=1';
    markRedirected(historyMock, locationMock, targetUrl);

    assert.deepEqual(calls, [
      ['replaceState', { redirected: true }, ''],
      ['assign', targetUrl],
    ]);
  });
});

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
  };
}

describe('recordLastRedirect & hasRecentRedirect', () => {
  it('records query with timestamp and detects matching recent redirect', () => {
    const storage = createMemoryStorage();
    recordLastRedirect(storage, 'rust book', 1000);

    assert.equal(hasRecentRedirect(storage, 'rust book', 60000, 15000), true);
    assert.equal(hasRecentRedirect(storage, 'other query', 60000, 15000), false);
    assert.equal(hasRecentRedirect(storage, 'rust book', 60000, 62000), false);
  });

  it('safely no-ops and returns false when storage is missing, malformed, or throws', () => {
    assert.doesNotThrow(() => recordLastRedirect(null, 'test', 1000));
    assert.equal(hasRecentRedirect(null, 'test', 60000, 1000), false);

    const throwingStorage = {
      getItem() {
        throw new Error('SecurityError');
      },
      setItem() {
        throw new Error('QuotaExceededError');
      },
    };
    assert.doesNotThrow(() => recordLastRedirect(throwingStorage, 'test', 1000));
    assert.equal(hasRecentRedirect(throwingStorage, 'test', 60000, 1000), false);

    const malformedStorage = {
      getItem() {
        return '{not-json';
      },
    };
    assert.equal(hasRecentRedirect(malformedStorage, 'test', 60000, 1000), false);
  });
});
