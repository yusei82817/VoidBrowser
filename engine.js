/* VoidBrowser hybrid engine prototype.
 * Parsing/compilation is experimental; the browser's native DOM engine renders the output.
 */
(() => {
  "use strict";

  const escapeClosingTag = (source, tag) =>
    String(source ?? "").replace(new RegExp("</" + tag, "gi"), "<\\/" + tag);

  function inspectMarkup(source) {
    const tokens = String(source ?? "").match(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g) || [];
    const stack = [];
    const voidTags = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
    let elements = 0;
    let textNodes = 0;
    let mismatches = 0;

    for (const token of tokens) {
      if (token.startsWith("<!--") || token.startsWith("<!") || token.startsWith("<?")) continue;
      const close = token.match(/^<\s*\/\s*([\w:-]+)/);
      const open = token.match(/^<\s*([\w:-]+)/);
      if (close) {
        const name = close[1].toLowerCase();
        if (stack[stack.length - 1] === name) stack.pop();
        else if (stack.includes(name)) {
          mismatches++;
          while (stack.length && stack.pop() !== name) {}
        } else mismatches++;
      } else if (open) {
        elements++;
        const name = open[1].toLowerCase();
        if (!voidTags.has(name) && !/\/\s*>$/.test(token)) stack.push(name);
      } else if (token.trim()) {
        textNodes++;
      }
    }
    return { tokens: tokens.length, elements, textNodes, mismatches, unclosed: stack.length };
  }

  function buildDocument(html, css, js) {
    const source = String(html ?? "").trim();
    const style = "<style>\n" + escapeClosingTag(css, "style") + "\n</style>";
    const script = "<script>\n" + escapeClosingTag(js, "script") + "\n<" + "/script>";
    const hasDocument = /<\s*html[\s>]/i.test(source);

    if (!hasDocument) {
      return "<!doctype html><html lang=\"ja\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
        style + "</head><body>" + source + script + "</body></html>";
    }

    let output = source;
    if (/<\s*\/\s*head\s*>/i.test(output)) {
      output = output.replace(/<\s*\/\s*head\s*>/i, style + "</head>");
    } else if (/<\s*body[\s>]/i.test(output)) {
      output = output.replace(/<\s*body[\s>]/i, style + "$&");
    } else {
      output = output.replace(/<\s*html[^>]*>/i, "$&<head>" + style + "</head>");
    }

    if (/<\s*\/\s*body\s*>/i.test(output)) {
      output = output.replace(/<\s*\/\s*body\s*>/i, script + "</body>");
    } else if (/<\s*\/\s*html\s*>/i.test(output)) {
      output = output.replace(/<\s*\/\s*html\s*>/i, "<body>" + script + "</body></html>");
    } else {
      output += script;
    }
    return output;
  }

  window.VoidEngine = Object.freeze({
    version: "0.1.0",
    inspectMarkup,
    compile(html, css, js) {
      const diagnostics = inspectMarkup(html);
      return {
        document: buildDocument(html, css, js),
        diagnostics,
        mode: "hybrid-dom"
      };
    }
  });
})();
