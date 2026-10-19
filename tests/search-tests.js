(() => {
  "use strict";
  const results = document.querySelector("#results");
  const summary = document.querySelector("#summary");
  let passed = 0;
  let failed = 0;

  function test(name, assertion) {
    const item = document.createElement("li");
    try {
      assertion();
      item.textContent = "PASS: " + name;
      passed++;
    } catch (error) {
      item.textContent = "FAIL: " + name + " — " + (error instanceof Error ? error.message : String(error));
      item.style.color = "crimson";
      failed++;
    }
    results.appendChild(item);
  }

  function equal(actual, expected) {
    if (actual !== expected) throw new Error("Expected " + JSON.stringify(expected) + ", got " + JSON.stringify(actual));
  }

  function truthy(value) {
    if (!value) throw new Error("Expected a truthy value.");
  }

  const search = globalThis.VoidSearch;
  if (!search) {
    summary.textContent = "FAIL: search.js did not load.";
    return;
  }

  test("provider list includes Google and DuckDuckGo", () => {
    const ids = search.providers().map((provider) => provider.id);
    truthy(ids.includes("google"));
    truthy(ids.includes("duckduckgo"));
  });

  test("Google search URL encodes Japanese text", () => {
    equal(search.buildSearchUrl("リーマンゼータ関数", "google"),
      "https://www.google.com/search?q=" + encodeURIComponent("リーマンゼータ関数"));
  });

  test("Bing provider can build a search URL", () => {
    truthy(search.buildSearchUrl("void browser", "bing").startsWith("https://www.bing.com/search?q="));
  });

  test("explicit HTTPS URL resolves to navigation", () => {
    const result = search.resolveInput("https://example.com/path?q=1");
    equal(result.kind, "url");
    equal(result.action, "navigate");
    equal(new URL(result.url).hostname, "example.com");
  });

  test("bare domain gets HTTPS", () => {
    const result = search.resolveInput("example.com/docs");
    equal(result.kind, "url");
    equal(result.url, "https://example.com/docs");
  });

  test("localhost with port is treated as a URL", () => {
    const result = search.resolveInput("localhost:8000");
    equal(result.kind, "url");
    equal(result.url, "https://localhost:8000/");
  });

  test("IPv4 address with port is treated as a URL", () => {
    const result = search.resolveInput("127.0.0.1:8080");
    equal(result.kind, "url");
    equal(new URL(result.url).hostname, "127.0.0.1");
  });

  test("single word is a search query", () => {
    const result = search.resolveInput("ゼータ関数", { provider: "duckduckgo" });
    equal(result.kind, "search");
    equal(result.provider, "duckduckgo");
    equal(result.query, "ゼータ関数");
    truthy(result.url.startsWith("https://duckduckgo.com/"));
  });

  test("phrase with spaces is a search query", () => {
    const result = search.resolveInput("how browser engines work", { provider: "brave" });
    equal(result.kind, "search");
    equal(result.provider, "brave");
  });

  test("empty input does nothing", () => {
    equal(search.resolveInput("   ").action, "none");
  });

  test("javascript scheme is rejected", () => {
    const result = search.resolveInput("javascript:alert(1)");
    equal(result.kind, "error");
    equal(result.code, "unsupported-scheme");
  });

  test("malformed explicit URL is rejected", () => {
    equal(search.resolveInput("https://[invalid").code, "invalid-url");
  });

  test("unknown search provider is rejected", () => {
    equal(search.resolveInput("anything", { provider: "not-a-provider" }).code, "unknown-provider");
  });

  test("leading and trailing spaces are trimmed", () => {
    const result = search.resolveInput("  example.com/path  ");
    equal(result.url, "https://example.com/path");
  });

  test("unsupported FTP URL scheme is rejected", () => {
    const result = search.resolveInput("ftp://example.com/file");
    equal(result.kind, "error");
    equal(result.code, "unsupported-scheme");
  });

  test("out-of-range port is rejected", () => {
    const result = search.resolveInput("localhost:99999");
    equal(result.kind, "error");
    equal(result.code, "invalid-url");
  });

  test("every provider builds an HTTPS URL", () => {
    search.providers().forEach((provider) => {
      truthy(search.buildSearchUrl("test", provider.id).startsWith("https://"));
    });
  });

  summary.textContent = passed + " passed, " + failed + " failed.";
  summary.style.fontWeight = "bold";
  summary.style.color = failed ? "crimson" : "green";
})();