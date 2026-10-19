/* VoidBrowser search subsystem.
 * Resolves address-bar input into a safe HTTP(S) navigation target or a search URL.
 * This is a search-provider adapter, not a web crawler or independent search index.
 */
(() => {
  "use strict";

  const STORAGE_KEY = "voidbrowser.searchProvider";
  const DEFAULT_PROVIDER = "google";
  const PROVIDERS = Object.freeze({
    google: Object.freeze({
      id: "google",
      name: "Google",
      buildUrl: (query) => "https://www.google.com/search?q=" + encodeURIComponent(query)
    }),
    duckduckgo: Object.freeze({
      id: "duckduckgo",
      name: "DuckDuckGo",
      buildUrl: (query) => "https://duckduckgo.com/?q=" + encodeURIComponent(query)
    }),
    bing: Object.freeze({
      id: "bing",
      name: "Bing",
      buildUrl: (query) => "https://www.bing.com/search?q=" + encodeURIComponent(query)
    }),
    brave: Object.freeze({
      id: "brave",
      name: "Brave Search",
      buildUrl: (query) => "https://search.brave.com/search?q=" + encodeURIComponent(query)
    }),
    startpage: Object.freeze({
      id: "startpage",
      name: "Startpage",
      buildUrl: (query) => "https://www.startpage.com/sp/search?query=" + encodeURIComponent(query)
    })
  });

  const owns = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

  function listProviders() {
    return Object.keys(PROVIDERS).map((id) => ({
      id: PROVIDERS[id].id,
      name: PROVIDERS[id].name
    }));
  }

  function isProvider(id) {
    return typeof id === "string" && owns(PROVIDERS, id);
  }

  function getDefaultProvider() {
    try {
      const saved = globalThis.localStorage.getItem(STORAGE_KEY);
      return isProvider(saved) ? saved : DEFAULT_PROVIDER;
    } catch {
      return DEFAULT_PROVIDER;
    }
  }

  function setDefaultProvider(id) {
    if (!isProvider(id)) {
      throw new RangeError("Unknown search provider: " + String(id));
    }
    let saved = false;
    try {
      globalThis.localStorage.setItem(STORAGE_KEY, id);
      saved = true;
    } catch {
      // Private browsing or storage restrictions may make persistence unavailable.
    }
    return { provider: id, saved };
  }

  function buildSearchUrl(query, provider) {
    const text = String(query == null ? "" : query).trim();
    if (!text) throw new TypeError("Search query must not be empty.");
    if (!isProvider(provider)) throw new RangeError("Unknown search provider: " + String(provider));
    return PROVIDERS[provider].buildUrl(text);
  }

  function isValidIPv4(host) {
    const parts = host.split(".");
    return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
  }

  function looksLikeHost(input) {
    if (!input || /\s/.test(input) || /[\u0000-\u001f\u007f]/.test(input)) return false;
    const authority = input.split(/[/?#]/, 1)[0];
    if (!authority || authority.includes("@")) return false;

    if (/^localhost(?::\d{1,5})?$/i.test(authority)) return true;
    const ipv6 = authority.match(/^\[([0-9a-f:.]+)\](?::\d{1,5})?$/i);
    if (ipv6) return true;

    const ipv4 = authority.match(/^((?:\d{1,3}\.){3}\d{1,3})(?::\d{1,5})?$/);
    if (ipv4) return isValidIPv4(ipv4[1]);

    if (!authority.includes(".")) return false;
    try {
      const parsed = new URL("https://" + input);
      return parsed.protocol === "https:" &&
        parsed.hostname.includes(".") &&
        !parsed.username &&
        !parsed.password;
    } catch {
      return false;
    }
  }

  function parseWebUrl(value) {
    try {
      const url = new URL(value);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return { ok: false, code: "unsupported-scheme", scheme: url.protocol.slice(0, -1) };
      }
      if (!url.hostname) return { ok: false, code: "invalid-url" };
      return { ok: true, url: url.href };
    } catch {
      return { ok: false, code: "invalid-url" };
    }
  }

  function resolveInput(input, options) {
    const raw = String(input == null ? "" : input).trim();
    const opts = options || {};
    if (!raw) return { kind: "empty", action: "none", input: "" };
    if (/[\u0000-\u001f\u007f]/.test(raw)) {
      return { kind: "error", action: "error", code: "invalid-characters", input: raw };
    }

    if (/^https?:\/\//i.test(raw)) {
      const parsed = parseWebUrl(raw);
      if (!parsed.ok) return { kind: "error", action: "error", code: parsed.code, input: raw };
      return { kind: "url", action: "navigate", input: raw, url: parsed.url };
    }

    if (looksLikeHost(raw)) {
      const parsed = parseWebUrl("https://" + raw);
      if (!parsed.ok) return { kind: "error", action: "error", code: parsed.code, input: raw };
      return { kind: "url", action: "navigate", input: raw, url: parsed.url };
    }

    const scheme = raw.match(/^([a-z][a-z0-9+.-]*):/i);
    if (scheme) {
      return {
        kind: "error",
        action: "error",
        code: "unsupported-scheme",
        scheme: scheme[1].toLowerCase(),
        input: raw
      };
    }

    const provider = opts.provider == null ? getDefaultProvider() : opts.provider;
    if (!isProvider(provider)) {
      return { kind: "error", action: "error", code: "unknown-provider", input: raw };
    }
    return {
      kind: "search",
      action: "search",
      input: raw,
      query: raw,
      provider,
      url: buildSearchUrl(raw, provider)
    };
  }

  globalThis.VoidSearch = Object.freeze({
    version: "0.1.0",
    providers: listProviders,
    isProvider,
    getDefaultProvider,
    setDefaultProvider,
    buildSearchUrl,
    looksLikeHost,
    resolveInput
  });
})();
