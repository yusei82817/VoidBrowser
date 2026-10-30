(() => {
  "use strict";
  const panel = document.querySelector("#calculator-panel");
  if (!panel) return;
  const display = panel.querySelector("#calculator-display");
  const expression = panel.querySelector("#calculator-expression");
  const modeLabel = panel.querySelector("#calculator-mode");
  const keys = panel.querySelector(".calculator-keys");
  let input = "";
  let degrees = true;
  let justEvaluated = false;

  function tokenize(source) {
    const tokens = [];
    const re = /\s*(?:(\d+(?:\.\d*)?|\.\d+)(?:([eE][+-]?\d+))?|([a-zA-Z]+)|(\+|\-|\*|\/|\%|\^|\(|\)))/gy;
    let pos = 0;
    while (pos < source.length) {
      re.lastIndex = pos;
      const m = re.exec(source);
      if (!m || m.index !== pos) throw new Error("入力を確認してね");
      pos = re.lastIndex;
      if (m[1] !== undefined) tokens.push({type:"number", value:Number(m[1] + (m[2] || ""))});
      else if (m[3]) tokens.push({type:"name", value:m[3].toLowerCase()});
      else tokens.push({type:m[4] === "(" || m[4] === ")" ? "paren" : "op", value:m[4]});
    }
    return tokens;
  }

  function calculate(source) {
    const tokens = tokenize(source);
    let i = 0;
    const peek = () => tokens[i];
    const take = () => tokens[i++];
    const toAngle = n => degrees ? n * Math.PI / 180 : n;
    const fromAngle = n => degrees ? n * 180 / Math.PI : n;
    const functions = {
      sqrt: Math.sqrt, abs: Math.abs, log: Math.log10, ln: Math.log,
      sin: n => Math.sin(toAngle(n)), cos: n => Math.cos(toAngle(n)),
      tan: n => Math.tan(toAngle(n)),
      asin: n => fromAngle(Math.asin(n)), acos: n => fromAngle(Math.acos(n)),
      atan: n => fromAngle(Math.atan(n))
    };
    function primary() {
      const t = take();
      if (!t) throw new Error("式が途中で終わってる");
      if (t.type === "op" && (t.value === "+" || t.value === "-")) {
        const v = primary(); return t.value === "-" ? -v : v;
      }
      if (t.type === "number") return t.value;
      if (t.type === "name") {
        if (t.value === "pi") return Math.PI;
        if (t.value === "e") return Math.E;
        const fn = functions[t.value];
        if (!fn || !peek() || peek().value !== "(") throw new Error("未対応の関数: " + t.value);
        take();
        const arg = sum();
        if (!peek() || take().value !== ")") throw new Error("括弧が閉じてない");
        return fn(arg);
      }
      if (t.value === "(") {
        const value = sum();
        if (!peek() || take().value !== ")") throw new Error("括弧が閉じてない");
        return value;
      }
      throw new Error("式を確認してね");
    }
    function power() {
      let value = primary();
      if (peek() && peek().value === "^") { take(); value = Math.pow(value, power()); }
      return value;
    }
    function product() {
      let value = power();
      while (peek() && ["*","/","%"].includes(peek().value)) {
        const op = take().value, right = power();
        if ((op === "/" || op === "%") && right === 0) throw new Error("0では割れないよ");
        value = op === "*" ? value * right : op === "/" ? value / right : value % right;
      }
      return value;
    }
    function sum() {
      let value = product();
      while (peek() && (peek().value === "+" || peek().value === "-")) {
        const op = take().value, right = product();
        value = op === "+" ? value + right : value - right;
      }
      return value;
    }
    if (!tokens.length) throw new Error("数式を入力してね");
    const result = sum();
    if (i !== tokens.length) throw new Error("式の続きが読めない");
    if (!Number.isFinite(result)) throw new Error("計算できない値になった");
    return result;
  }

  function render() {
    display.textContent = input || "0";
    expression.textContent = "";
    modeLabel.textContent = degrees ? "DEG" : "RAD";
    const angleButton = keys.querySelector('[data-action="angle"]');
    if (angleButton) angleButton.textContent = degrees ? "DEG" : "RAD";
  }
  function append(value) {
    if (justEvaluated && /[0-9.(a-z]/i.test(value)) input = "";
    input += value;
    justEvaluated = false;
    render();
  }
  function equals() {
    if (!input) return;
    try {
      const result = calculate(input);
      expression.textContent = input + " =";
      input = String(Number(result.toPrecision(12)));
      display.textContent = input;
      justEvaluated = true;
    } catch (error) {
      expression.textContent = error.message;
    }
  }
  function clear() { input = ""; justEvaluated = false; render(); }
  function backspace() { input = input.slice(0,-1); justEvaluated = false; render(); }
  function sign() {
    if (!input) input = "-";
    else if (/^-?\d*\.?\d+$/.test(input)) input = String(-Number(input));
    else input = "-(" + input + ")";
    justEvaluated = false; render();
  }
  keys.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.value !== undefined) append(button.dataset.value);
    else switch (button.dataset.action) {
      case "clear": clear(); break;
      case "backspace": backspace(); break;
      case "equals": equals(); break;
      case "sign": sign(); break;
      case "angle": degrees = !degrees; render(); break;
    }
  });
  document.addEventListener("keydown", event => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    if (/^[0-9.+*/%^()\-]$/.test(event.key)) { append(event.key); event.preventDefault(); }
    else if (event.key === "Enter" || event.key === "=") { equals(); event.preventDefault(); }
    else if (event.key === "Backspace") { backspace(); event.preventDefault(); }
    else if (event.key === "Escape") { clear(); }
  });
  render();
})();