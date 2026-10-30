# VoidBrowser

VoidBrowser is an experimental browser-engine project being built in small, browser-friendly stages.

## Current prototype

- HTML, CSS, and JavaScript playground with a sandboxed preview
- Experimental markup diagnostics; native browser DOM/layout/rendering still renders the preview
- Search subsystem that resolves address-bar text into either an HTTP(S) URL or a search-provider URL
- Home-screen weather widget with editable city search, current conditions, feels-like temperature, humidity, wind, precipitation probability, and daily high/low
- YouTube search handoff to YouTube plus a dedicated embedded player for pasted video URLs or IDs (subject to YouTube embed restrictions)
- Void Spatial Audio: capture a user-selected tab's shared audio and spatialize it with Web Audio API HRTF panning, adjustable azimuth/elevation/distance, and generated reverb
- Weather data from Open-Meteo with graceful error messages; city preference is saved locally when storage is available
- Search provider adapters for Google, DuckDuckGo, Bing, Brave Search, and Startpage
- Browser-based regression tests for search input classification and URL generation
- Address/search form connected to the resolver, with provider selection and new-tab opening
- PWA manifest and offline app-shell cache

## Search subsystem

`search.js` exposes `window.VoidSearch`:

- `resolveInput(input, { provider })` classifies input as navigation, search, empty, or an error.
- `buildSearchUrl(query, provider)` builds a provider search URL with encoded query text.
- `providers()` lists supported providers.
- `getDefaultProvider()` and `setDefaultProvider(id)` read or save the preferred provider in local storage.

The weather widget starts with Shizuoka City as a changeable example location; enter any supported city name to change it. It uses the Open-Meteo geocoding and forecast APIs and does not request device location. Weather data is provided as-is; the widget shows retrieval errors instead of inventing values. The default search provider is Google. URL inputs are restricted to HTTP and HTTPS; unsupported schemes such as `javascript:` are rejected rather than executed. Bare domains and local addresses such as `localhost:8000` are normalized to HTTPS. This module delegates search to existing providers; it is not a crawler, search index, or independent web search engine. The app now has an address/search form. Submitting a URL or query requests opening the target in a new tab; the PWA does not embed arbitrary sites in its own preview because many sites block iframe embedding. This is a search-provider adapter, not a crawler or independent search index.

## Test the search subsystem

Serve the repository over HTTP(S), then open `tests/search-tests.html`. The 17 tests do not send queries to search providers. They are written for the browser and still need to be run in the Codespaces browser to confirm the complete page-level result.

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
- `weather.js` — city geocoding and live weather widget using Open-Meteo
- `youtube.js` — YouTube search handoff and embedded video player
- `spatial-audio.js` — tab-audio capture and HRTF spatial audio processing
- `spatial-audio.css` — spatial audio panel styles
- `engine.js` — hybrid preview compilation and basic markup diagnostics
- `app.js` — address/search controls, preview execution, and PWA registration
- `tests/search-tests.html` and `tests/search-tests.js` — browser-run tests
- `manifest.json` — PWA metadata
- `sw.js` — offline app-shell caching
- `icon.svg` — application icon

## YouTube panel

Search opens YouTube results in a separate tab because a standalone PWA cannot reliably read YouTube search results without an API key or server-side integration. Paste the selected video's URL or 11-character ID into the player field to load it in the VoidBrowser panel. Some videos cannot be embedded or require sign-in, and those restrictions are controlled by YouTube/video owners.


## Void Spatial Audio

Use the Void Spatial Audio panel on the home screen and choose **Tab** in the browser's screen-sharing picker. Enable the option to share that tab's audio. The panel uses `getDisplayMedia()` and the Web Audio API `PannerNode` with HRTF positioning. Azimuth, elevation, distance, and generated convolution reverb can be adjusted while audio is playing. Stop sharing from the panel or the browser's sharing indicator. This requires a secure context (HTTPS or localhost), a browser that supports tab-audio capture, and an explicit user gesture/permission each time. The browser may not offer tab audio on every platform. The captured audio is treated as one source; it does not separate vocals or instruments into independent 3D objects.
