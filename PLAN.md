# PLAN.md — Smart "I'm Feeling Lucky" Redirector

- [x] Step 01: Implement Core Redirect & History-State Decision Logic
    - **Files:** `redirect.js`
    - **Spec:** Create a pure, UMD/dual-compatible module (`window.LuckyRedirect` in browser, `module.exports` in CommonJS) with:
      - `parseQuery(searchString)`: extracts and trims `q` from `URLSearchParams` (returns `""` if missing/whitespace).
      - `buildTargetUrl(query, mode)`: returns `https://www.google.com/search?q=${encodeURIComponent(query)}&btnI=1` when `mode === 'lucky'` and `https://www.google.com/search?q=${encodeURIComponent(query)}` when `mode === 'search'`.
      - `shouldAutoRedirect({ query, historyState, navType, isPersisted })`: returns `false` if `!query`, `isPersisted === true`, `navType === 'back_forward'`, or `historyState?.redirected === true`; otherwise returns `true`.
      - `markRedirected(historyObj, locationObj, url)`: calls `historyObj.replaceState({ redirected: true }, '')` so the current entry records that a forward redirect occurred, then calls `locationObj.assign(url)` (must use `assign`, never `replace`, to preserve the page in the browser history stack).
    - **Verify:** `node --check redirect.js`

- [ ] Step 02: Add Unit Tests for Query Parsing, URL Building, and Back-Navigation Detection
    - **Files:** `redirect.test.js`
    - **Spec:** Using Node's built-in `node:test` and `node:assert/strict`, test:
      - `parseQuery` with standard queries, URL-encoded spaces/symbols, empty strings, and missing `?q=`.
      - `buildTargetUrl` for both `'lucky'` (`&btnI=1`) and `'search'` modes.
      - `shouldAutoRedirect` across all cases: fresh load (`true`), empty query (`false`), `historyState: { redirected: true }` (`false`), `navType: 'back_forward'` (`false`), and `isPersisted: true` (`false`).
      - `markRedirected` verifying `replaceState` is called with `{ redirected: true }` prior to `location.assign(url)` and `location.replace` is never invoked.
    - **Verify:** `node --test redirect.test.js`

- [ ] Step 03: Build Minimal Static Shell & Recovery UI Markup
    - **Files:** `index.html`, `styles.css`
    - **Spec:**
      - `index.html`: Load `styles.css` and `redirect.js` synchronously in `<head>` (or immediately before the mount container) so auto-redirects fire before painting the recovery form. Include a `#recovery-ui` container (hidden by default via `hidden` attribute) containing a `<form id="search-form">` with `<input id="query-input" type="text" name="q" autocomplete="off" spellcheck="false" aria-label="Search query">`, primary submit button `<button type="submit" data-mode="lucky">I'm Feeling Lucky</button>`, secondary button `<button type="button" id="google-search-btn" data-mode="search">Google Search</button>`, and subtle keyboard shortcut hints (`Enter` for Lucky, `Shift+Enter` for Google Search).
      - `styles.css`: Clean, centered, system-font layout supporting `prefers-color-scheme: dark` and `light`, visible focus rings, and zero external assets.
    - **Verify:** `node -e "const fs=require('fs'); const html=fs.readFileSync('index.html','utf8'); if(!html.includes('id=\"recovery-ui\"') || !html.includes('id=\"query-input\"') || !html.includes('redirect.js')) process.exit(1);"`

- [ ] Step 04: Wire Browser Lifecycle (`DOMContentLoaded` & `pageshow` bfcache) and Form Actions
    - **Files:** `app.js`, `index.html`
    - **Spec:**
      - Include `<script src="app.js" defer></script>` in `index.html`.
      - On initial execution, read `query = LuckyRedirect.parseQuery(window.location.search)` and `navType = performance.getEntriesByType('navigation')[0]?.type || 'navigate'`.
      - If `LuckyRedirect.shouldAutoRedirect({ query, historyState: window.history.state, navType, isPersisted: false })` is `true`, immediately call `LuckyRedirect.markRedirected(window.history, window.location, LuckyRedirect.buildTargetUrl(query, 'lucky'))`.
      - Otherwise, reveal `#recovery-ui`, populate `#query-input` with `query`, focus it, and select all text (`input.select()`).
      - Attach a `window.addEventListener('pageshow', (event) => ...)` handler: if `event.persisted` is `true` (bfcache restore on Back button), reveal `#recovery-ui`, populate with `LuckyRedirect.parseQuery(window.location.search)`, and call `input.focus(); input.select()`.
      - Handle form submission (`Enter` / primary button) to update the current URL query param (`history.replaceState({ redirected: true }, '', '?q=' + encodeURIComponent(newQuery))`) and navigate via `location.assign(buildTargetUrl(newQuery, 'lucky'))`. Handle `#google-search-btn` click and `Shift+Enter` inside `#query-input` to update `?q=` similarly and navigate to `buildTargetUrl(newQuery, 'search')`.
    - **Verify:** `node --check app.js && node --test redirect.test.js`

- [ ] Step 05: Add Chrome Custom Search Engine Setup Documentation
    - **Files:** `README.md`
    - **Spec:** Document local/hosted deployment options (GitHub Pages / Cloudflare Pages / local HTTP server), exact Chrome settings path (`chrome://settings/searchEngines` -> Site search -> Add), shortcut `l`, and URL format `https://<your-host>/?q=%s`, plus keyboard shortcuts (`Enter` vs `Shift+Enter`).
    - **Verify:** `test -s README.md && grep -q "%s" README.md`
