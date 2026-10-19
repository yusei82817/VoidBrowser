# VoidBrowser

VoidBrowser is an experimental **hybrid browser-engine playground** designed to be edited in a browser-based IDE such as GitHub Codespaces.

## Current prototype

- HTML, CSS, and JavaScript input panels
- Isolated page preview using a sandboxed `iframe`
- Small markup diagnostics and a compile/run loop
- Responsive dark UI
- PWA manifest and offline app-shell cache

## Important architecture note

This is **not a standalone browser engine** and does not implement the complete HTML, CSS, or JavaScript specifications. It compiles the editor input into a preview document, while the browser's built-in DOM/layout/rendering engine does the actual page rendering. That hybrid approach is intentional for the first prototype.

The preview uses `sandbox="allow-scripts"` without `allow-same-origin`, so preview scripts run in an opaque-origin iframe instead of receiving normal access to the parent app. Treat all code entered into the preview as executable code nonetheless.

## Run in GitHub Codespaces

1. Open the repository and choose **Code → Codespaces → Create codespace on main**.
2. In the Codespaces terminal, run:

   ```sh
   python3 -m http.server 8000
   ```

3. Open the **Ports** tab, make port `8000` visible, then open its forwarded URL.
4. Edit the HTML, CSS, and JavaScript panels and press **Run** or **Ctrl/⌘ + Enter**.

No local Linux environment or Node.js installation is required for this prototype.

## Next engineering milestones

1. Replace the regular-expression diagnostics with a real tokenizer and tree builder.
2. Add a CSS declaration parser and a small style-resolution layer.
3. Add navigation/history and URL loading as a separate, carefully sandboxed feature.
4. Add tests for malformed markup and parser recovery.
5. Keep the rendering engine and the experimental parsing layer clearly separated.

## Project structure

- `index.html` — app shell and editor interface
- `style.css` — responsive UI styles
- `engine.js` — hybrid compilation and basic markup diagnostics
- `app.js` — controls, preview execution, and PWA registration
- `manifest.json` — PWA metadata
- `sw.js` — offline app-shell caching
- `icon.svg` — application icon
