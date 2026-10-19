# VoidBrowser

VoidBrowser is an experimental browser-engine project being built in small, browser-friendly stages.

## Current prototype

- HTML, CSS, and JavaScript playground with a sandboxed preview
- Experimental markup diagnostics; native browser DOM/layout/rendering still renders the preview
- Search subsystem that resolves address-bar text into either an HTTP(S) URL or a search-provider URL
- Search provider adapters for Google, DuckDuckGo, Bing, Brave Search, and Startpage
- Browser-based tests for search input classification and URL generation
- PWA manifest and offline app-shell cache

## Search subsystem

`search.js` exposes `window.VoidSearch`:

- `resolveInput(input, { provider })` classifies input as navigation, search, empty, or an error.
- `buildSearchUrl(query, provider)` builds a provider search URL with encoded query text.
- `providers()` lists supported providers.
- `getDefaultProvider()` and `setDefaultProvider(id)` read or save the preferred provider in local storage.

The default provider is Google. URL inputs are restricted to HTTP and HTTPS; unsupported schemes such as `javascript:` are rejected rather than executed. Bare domains and local addresses such as `localhost:8000` are normalized to HTTPS. This module delegates search to existing providers; it is not a crawler, search index, or independent web search engine. Search UI and full page navigation have not been implemented yet.

## Test the search subsystem

Serve the repository over HTTP(S), then open `tests/search-tests.html`. The tests do not send queries to search providers.

## Run in GitHub Codespaces

1. Open the repository and choose Code → Codespaces → Create codespace on main.
2. In the Codespaces terminal, run:

   `python3 -m http.server 8000`

3. Open the Ports tab and open the forwarded URL.
4. The test page is available at `/tests/search-tests.html`.

No local Linux environment or Node.js installation is required for this prototype.

## Architecture note

This is not currently a full standalone browser and does not implement complete HTML, CSS, JavaScript, or networking specifications. The eventual project plan separates browser navigation, a Chromium-based page-rendering host, the experimental VoidBrowser engine lab, and a Pyodide-based Python lab. A PWA alone cannot embed every website because some sites forbid iframe embedding.

## Project structure

- `index.html` — current app shell and playground UI
- `style.css` — current UI styles
- `search.js` — address input classification and search provider adapters
- `engine.js` — hybrid preview compilation and basic markup diagnostics
- `app.js` — controls, preview execution, and PWA registration
- `tests/search-tests.html` and `tests/search-tests.js` — browser-run tests
- `manifest.json` — PWA metadata
- `sw.js` — offline app-shell caching
- `icon.svg` — application icon