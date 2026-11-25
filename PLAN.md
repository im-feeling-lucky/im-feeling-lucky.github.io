# PLAN.md — Smart "I'm Feeling Lucky" Redirector

- [x] Step 01: Implement Core Redirect & History-State Decision Logic
    - **Files:** `redirect.js`
    - **Spec:** Create a pure, UMD/dual-compatible module (`window.LuckyRedirect` in browser, `module.exports` in CommonJS) with:
      - `parseQuery(searchString)`: extracts and trims `q` from `URLSearchParams` (returns `""` if missing/whitespace).
      - `buildTargetUrl(query, mode)`: trims `query` (throwing an `Error` if empty/whitespace) and returns `https://www.google.com/search?q=${encodeURIComponent(trimmed)}&btnI=1` when `mode === 'lucky'` and `https://www.google.com/search?q=${encodeURIComponent(trimmed)}` when `mode === 'search'`.
      - `shouldAutoRedirect({ query, historyState, navType, isPersisted })`: returns `false` if `!query`, `isPersisted === true`, `navType === 'back_forward'`, or `historyState?.redirected === true`; otherwise returns `true`.
      - `markRedirected(historyObj, locationObj, url)`: calls `historyObj.replaceState({ redirected: true }, '')` so the current entry records that a forward redirect occurred, then calls `locationObj.assign(url)` (must use `assign`, never `replace`, to preserve the page in the browser history stack).
    - **Verify:** `node --check redirect.js`

- [x] Step 01b: Exclude `PLAN.md` From Step Commits and Guard Empty Queries in `buildTargetUrl`
    - **Files:** `PLAN.md`, `redirect.js`
    - **Spec:** Do not commit `PLAN.md` in step or feature commits (keep `PLAN.md` out of `plan(step-XX)` commits so only each step's target files are committed), and in `redirect.js`'s `buildTargetUrl(query, mode)` trim/validate `query` (`const trimmed = typeof query === 'string' ? query.trim() : ''`) and throw an `Error('Query must be a non-empty string')` if `!trimmed` rather than emitting `https://www.google.com/search?q=`.
    - **Verify:** `node --check redirect.js`

- [x] Step 02: Add Unit Tests for Query Parsing, URL Building, and Back-Navigation Detection
    - **Files:** `redirect.test.js`
    - **Spec:** Using Node's built-in `node:test` and `node:assert/strict`, test:
      - `parseQuery` with standard queries, URL-encoded spaces/symbols, empty strings, and missing `?q=`.
      - `buildTargetUrl` for both `'lucky'` (`&btnI=1`) and `'search'` modes, trimming whitespace, and throwing on empty/whitespace-only queries.
      - `shouldAutoRedirect` across all cases: fresh load (`true`), empty query (`false`), `historyState: { redirected: true }` (`false`), `navType: 'back_forward'` (`false`), and `isPersisted: true` (`false`).
      - `markRedirected` verifying `replaceState` is called with `{ redirected: true }` prior to `location.assign(url)` and `location.replace` is never invoked.
    - **Verify:** `node --test redirect.test.js`

- [x] Step 03: Build Minimal Static Shell & Recovery UI Markup
    - **Files:** `index.html`, `styles.css`
    - **Spec:**
      - `index.html`: Load `styles.css` and `redirect.js` synchronously in `<head>` (or immediately before the mount container) so auto-redirects fire before painting the recovery form. Include a `#recovery-ui` container (hidden by default via `hidden` attribute) containing a `<form id="search-form">` with `<input id="query-input" type="text" name="q" autocomplete="off" spellcheck="false" aria-label="Search query">`, primary submit button `<button type="submit" data-mode="lucky">I'm Feeling Lucky</button>`, secondary button `<button type="button" id="google-search-btn" data-mode="search">Google Search</button>`, and subtle keyboard shortcut hints (`Enter` for Lucky, `Shift+Enter` for Google Search).
      - `styles.css`: Clean, centered, system-font layout supporting `prefers-color-scheme: dark` and `light`, visible focus rings, and zero external assets.
    - **Verify:** `node -e "const fs=require('fs'); const html=fs.readFileSync('index.html','utf8'); if(!html.includes('id=\"recovery-ui\"') || !html.includes('id=\"query-input\"') || !html.includes('redirect.js')) process.exit(1);"`

- [x] Step 04: Wire Browser Lifecycle (`DOMContentLoaded` & `pageshow` bfcache) and Form Actions
    - **Files:** `app.js`, `index.html`
    - **Spec:**
      - Include `<script src="app.js" defer></script>` in `index.html`.
      - On initial execution, read `query = LuckyRedirect.parseQuery(window.location.search)` and `navType = performance.getEntriesByType('navigation')[0]?.type || 'navigate'`.
      - If `LuckyRedirect.shouldAutoRedirect({ query, historyState: window.history.state, navType, isPersisted: false })` is `true`, immediately call `LuckyRedirect.markRedirected(window.history, window.location, LuckyRedirect.buildTargetUrl(query, 'lucky'))`.
      - Otherwise, reveal `#recovery-ui`, populate `#query-input` with `query`, focus it, and select all text (`input.select()`).
      - Attach a `window.addEventListener('pageshow', (event) => ...)` handler: if `event.persisted` is `true` (bfcache restore on Back button), reveal `#recovery-ui`, populate with `LuckyRedirect.parseQuery(window.location.search)`, and call `input.focus(); input.select()`.
      - Handle form submission (`Enter` / primary button) to update the current URL query param (`history.replaceState({ redirected: true }, '', '?q=' + encodeURIComponent(newQuery))`) and navigate via `location.assign(buildTargetUrl(newQuery, 'lucky'))`. Handle `#google-search-btn` click and `Shift+Enter` inside `#query-input` to update `?q=` similarly and navigate to `buildTargetUrl(newQuery, 'search')`.
    - **Verify:** `node --check app.js && node --test redirect.test.js`

- [x] Step 04b: Handle Non-Persisted Back/Forward Navigation in `pageshow`
    - **Files:** `app.js`
    - **Spec:** In the `pageshow` listener, check not only `event.persisted` (bfcache restore) but also `performance.getEntriesByType('navigation')[0]?.type === 'back_forward'` or `window.history.state?.redirected === true` so that if a browser restores or re-evaluates the page on back navigation without `event.persisted === true` (and `query` is non-empty), `showRecoveryUI(query)` is still invoked rather than missing a non-bfcache back navigation. (Do not commit `PLAN.md` in the step commit.)
    - **Verify:** `node --check app.js && node --test redirect.test.js`

- [x] Step 04c: Delay Auto-Redirect Until After `load` to Preserve History Entry
    - **Files:** `app.js`, `redirect.test.js`
    - **Spec:** In `app.js`, schedule initial auto-redirect after `window` finishes `load` (falling back immediately if `document.readyState === 'complete'`) with a short timeout (e.g., `100ms`) so Chrome commits the `https://im-feeling-lucky.github.io/?q=...` entry and its `{ redirected: true }` history state before `markRedirected` calls `location.assign(...)`. Ensure `pageshow` / recovery UI still cancels or bypasses any pending timer if the user navigates or restores. In `redirect.test.js`, add unit tests covering any exported/pure helper logic if refactored. (Do not commit `PLAN.md` in the step commit.)
    - **Verify:** `node --check app.js && node --test redirect.test.js`

- [x] Step 04c-fix: Reset `redirectCancelled` on `pageshow` Restore and Avoid Early Cancellation on `pagehide` Before Timer Fires
    - **Files:** `app.js`
    - **Spec:** In `app.js`, `window.addEventListener('pagehide', cancelPendingRedirect)` permanently sets `redirectCancelled = true` on any `pagehide` event, and `showRecoveryUI` also sets `redirectCancelled = true` without resetting it if the page is later restored via bfcache (`pageshow`). Reset `redirectCancelled = false` when `pageshow` fires (unless `isBackNav` is true and showing recovery UI), and only cancel a pending timer on `pagehide` if `event.persisted` is `true` or `pendingRedirectTimer !== null` so non-bfcache `pagehide` events don't permanently block future auto-redirects on restored pages. (Do not commit `PLAN.md` in the step commit.)
    - **Verify:** `node --check app.js && node --test redirect.test.js`

- [x] Step 04d: Add `sessionStorage` Fallback for Skipped Back-Navigation Entries
    - **Files:** `app.js`, `redirect.js`, `redirect.test.js`
    - **Spec:** Add pure `sessionStorage` helper functions in `redirect.js` (e.g., `recordLastRedirect(storage, query)` and `hasRecentRedirect(storage, query, maxAgeMs = 60000)`) that safely no-op if `storage` is unavailable or throws, storing `{ query, timestamp }`. In `app.js`, record `{ query, timestamp: Date.now() }` via `sessionStorage` right when auto-redirecting, and treat a matching recent `sessionStorage` entry on re-entry as a reason not to auto-redirect again so you can edit the query or run a normal Google Search even when Chrome omits the page from the Back stack. Add unit tests in `redirect.test.js` for the new `redirect.js` helpers. (Do not commit `PLAN.md` in the step commit.)
    - **Verify:** `node --check redirect.js && node --check app.js && node --test redirect.test.js`

- [x] Step 04d-fix: Clean Up Stale `sessionStorage` Entry After Recovery & Add `shouldAutoRedirect` Test for Recent Redirects
    - **Files:** `app.js`, `redirect.test.js`
    - **Spec:** In `app.js`, when `recentRedirect` triggers recovery UI (or when the user submits a modified/new query in `navigateWithMode`), clear or overwrite `luckyRedirect:last` in `sessionStorage` so a stale entry from an earlier mistake doesn't linger indefinitely across subsequent edits, and in `redirect.test.js` add a unit test verifying `!recentRedirect` interaction with `shouldAutoRedirect` and `hasRecentRedirect` edge cases (negative clock skew / expired window). (Do not commit `PLAN.md` in the step commit.)
    - **Verify:** `node --check redirect.js && node --check app.js && node --test redirect.test.js`

- [x] Step 05: Add Chrome Custom Search Engine Setup Documentation
    - **Files:** `README.md`
    - **Spec:** Document local/hosted deployment options (GitHub Pages / Cloudflare Pages / local HTTP server), exact Chrome settings path (`chrome://settings/searchEngines` -> Site search -> Add), shortcut `l`, and URL format `https://<your-host>/?q=%s`, plus keyboard shortcuts (`Enter` vs `Shift+Enter`). (Do not commit `PLAN.md` in the step commit.)
    - **Verify:** `test -s README.md && grep -q "%s" README.md`
