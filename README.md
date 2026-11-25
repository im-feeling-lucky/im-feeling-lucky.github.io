# Smart "I'm Feeling Lucky" Redirector

A lightweight static redirector for Chrome's custom search engines that immediately forwards `?q=...` queries to Google's **I'm Feeling Lucky** (`&btnI=1`), while preserving browser history so pressing **Back** opens a pre-filled recovery UI instead of re-redirecting.

## Deployment Options

- **GitHub Pages:** Push this repository to GitHub and enable Pages on the `main` branch (`/` root). Your URL will be `https://<username>.github.io/<repo>/` (or `https://<username>.github.io/` for a user/org site).
- **Cloudflare Pages:** Connect the repository with no build command and output directory `/`.
- **Local HTTP Server:** Serve the directory locally for testing:
  ```sh
  python3 -m http.server 8080
  ```
  Then use `http://localhost:8080/?q=%s`.

## Chrome Custom Search Engine Setup

1. Open `chrome://settings/searchEngines` in Chrome.
2. Under **Site search**, click **Add**.
3. Fill in the fields:
   - **Name:** `I'm Feeling Lucky`
   - **Shortcut:** `l`
   - **URL with `%s` in place of query:** `https://<your-host>/?q=%s`
4. Click **Add**.

Now type `l <query>` in Chrome's address bar and press `Enter`.

## Recovery UI & Keyboard Shortcuts

If you press the browser **Back** button after a redirect (or visit the page without `?q=`), the recovery UI appears with your query pre-filled and selected:

- `Enter` (or **I'm Feeling Lucky** button): Re-submits to Google I'm Feeling Lucky (`&btnI=1`).
- `Shift+Enter` (or **Google Search** button): Opens standard Google Search results for the query.

## Development & Tests

Run the unit tests with Node.js (v18+):

```sh
node --test redirect.test.js
```
