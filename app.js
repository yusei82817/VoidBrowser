(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const htmlInput = $("#html-input");
  const cssInput = $("#css-input");
  const jsInput = $("#js-input");
  const preview = $("#preview");
  const log = $("#engine-log");
  const status = $("#engine-status");
  const runButton = $("#run-button");
  let runCount = 0;
  let installPrompt = null;

  function writeLog(message, isError = false) {
    const line = document.createElement("p");
    if (isError) line.className = "log-error";
    const mark = document.createElement("span");
    mark.className = "log-mark";
    mark.textContent = isError ? "!" : "›";
    line.append(mark, document.createTextNode(" " + message));
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  }

  function run() {
    if (!window.VoidEngine) {
      writeLog("Engine module did not load.", true);
      return;
    }
    runButton.disabled = true;
    status.lastChild.textContent = " Compiling…";
    try {
      const result = window.VoidEngine.compile(htmlInput.value, cssInput.value, jsInput.value);
      preview.srcdoc = result.document;
      runCount++;
      const d = result.diagnostics;
      $("#source-stats").textContent = `${d.elements} elements · ${d.tokens} tokens · run ${runCount}`;
      if (d.mismatches || d.unclosed) {
        writeLog(`Markup check: ${d.mismatches} possible mismatch(es), ${d.unclosed} unclosed tag(s). Browser parsing may still recover.`);
      }
      writeLog(`Compiled ${d.elements} element(s) in ${result.mode} mode.`);
      status.lastChild.textContent = " Engine ready";
    } catch (error) {
      writeLog(error instanceof Error ? error.message : String(error), true);
      status.lastChild.textContent = " Engine error";
    } finally {
      runButton.disabled = false;
    }
  }

  function loadSample() {
    htmlInput.value = `<main class="demo">
  <p class="tag">VOID / 002</p>
  <h1>Small engine.<br><span>Big universe.</span></h1>
  <p>Edit the three panels, then run the page.</p>
  <button id="counter">Click counter: 0</button>
</main>`;
    cssInput.value = `body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0b1220; color: #edf3ff; font: 16px system-ui, sans-serif; }
.demo { max-width: 34rem; padding: 2rem; }
.tag { color: #79aaff; letter-spacing: .2em; font: .75rem monospace; }
h1 { font-size: clamp(2.2rem, 8vw, 4.5rem); line-height: 1.02; }
h1 span { color: #79aaff; }
button { padding: .8rem 1rem; border: 1px solid #537fc7; border-radius: 9px; background: #203b64; color: white; cursor: pointer; }`;
    jsInput.value = `let count = 0;
document.querySelector("#counter")?.addEventListener("click", (event) => {
  count++;
  event.currentTarget.textContent = "Click counter: " + count;
});`;
    run();
  }

  runButton.addEventListener("click", run);
  $("#refresh-button").addEventListener("click", run);
  $("#sample-button").addEventListener("click", loadSample);
  $("#clear-button").addEventListener("click", () => {
    htmlInput.value = "";
    cssInput.value = "";
    jsInput.value = "";
    run();
  });
  $("#clear-log-button").addEventListener("click", () => { log.replaceChildren(); });
  [htmlInput, cssInput, jsInput].forEach((editor) => {
    editor.addEventListener("keydown", (event) => {
      if (event.key === "Tab") {
        event.preventDefault();
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        editor.setRangeText("  ", start, end, "end");
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        run();
      }
    });
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    $("#install-button").hidden = false;
  });
  $("#install-button").addEventListener("click", async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    $("#install-button").hidden = true;
  });

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js")
        .then(() => writeLog("Offline shell registered."))
        .catch((error) => writeLog("Offline shell unavailable: " + error.message, true));
    });
  }

  if (window.VoidSearch) {
    const providerNames = window.VoidSearch.providers().map((provider) => provider.name).join(", ");
    writeLog("Search subsystem ready. Providers: " + providerNames + ".");
  } else {
    writeLog("Search subsystem failed to load.", true);
  }

  const addressForm = $("#address-form");
  const addressInput = $("#address-input");
  const providerSelect = $("#search-provider");

  function initializeSearchUI() {
    if (!window.VoidSearch || !addressForm || !addressInput || !providerSelect) return;

    window.VoidSearch.providers().forEach((provider) => {
      const option = document.createElement("option");
      option.value = provider.id;
      option.textContent = provider.name;
      providerSelect.appendChild(option);
    });
    providerSelect.value = window.VoidSearch.getDefaultProvider();

    providerSelect.addEventListener("change", () => {
      try {
        const result = window.VoidSearch.setDefaultProvider(providerSelect.value);
        writeLog("Default search provider set to " + result.provider + (result.saved ? "." : " for this session only; storage is unavailable."));
      } catch (error) {
        writeLog(error instanceof Error ? error.message : String(error), true);
      }
    });

    addressForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const result = window.VoidSearch.resolveInput(addressInput.value, { provider: providerSelect.value });
      if (result.action === "none") {
        addressInput.focus();
        return;
      }
      if (result.action === "error") {
        const detail = result.code === "unsupported-scheme"
          ? "Only HTTP(S) URLs and search queries are supported. Scheme rejected: " + (result.scheme || "unknown")
          : "Input could not be resolved (" + result.code + ").";
        writeLog(detail, true);
        addressInput.setAttribute("aria-invalid", "true");
        return;
      }

      addressInput.removeAttribute("aria-invalid");
      const targetType = result.action === "search" ? "Search: " + result.query : "Navigate: " + result.url;
      window.open(result.url, "_blank", "noopener,noreferrer");
      writeLog(targetType + " — requested in a new tab.");
    });
  }

  initializeSearchUI();
  run();
})();
