/* Gravity Well — scientific calculator expression evaluator (no eval). Trig in degrees. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GWCalc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const DEG = Math.PI / 180;
  const CONST = { pi: Math.PI, 'π': Math.PI, e: Math.E, G: 6.67e-11, g: 6.67e-11 };
  const FN = {
    sqrt: Math.sqrt, abs: Math.abs, ln: Math.log, log: Math.log10, exp: Math.exp,
    sin: x => Math.sin(x * DEG), cos: x => Math.cos(x * DEG), tan: x => Math.tan(x * DEG),
    asin: x => Math.asin(x) / DEG, acos: x => Math.acos(x) / DEG, atan: x => Math.atan(x) / DEG,
    atan2: (y, x) => Math.atan2(y, x) / DEG, hypot: Math.hypot, min: Math.min, max: Math.max,
  };

  function tokenize(src) {
    const t = []; let i = 0;
    src = src.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\^/g, '^').replace(/²/g, '^2').replace(/√/g, 'sqrt');
    while (i < src.length) {
      const c = src[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9.]/.test(c)) {
        let m = src.slice(i).match(/^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/);
        t.push({ type: 'num', v: parseFloat(m[0]) }); i += m[0].length; continue;
      }
      if (/[a-zA-Zπ_]/.test(c)) {
        let m = src.slice(i).match(/^[a-zA-Zπ_][a-zA-Z0-9_]*/);
        t.push({ type: 'id', v: m[0] }); i += m[0].length; continue;
      }
      if ('+-*/^(),'.includes(c)) { t.push({ type: 'op', v: c }); i++; continue; }
      throw new Error('Unexpected "' + c + '"');
    }
    return t;
  }

  function evaluate(src, vars) {
    vars = vars || {};
    const toks = tokenize(src); let p = 0;
    const peek = () => toks[p], next = () => toks[p++];
    function expr() { let v = term(); while (peek() && peek().type === 'op' && (peek().v === '+' || peek().v === '-')) { const o = next().v; const r = term(); v = o === '+' ? v + r : v - r; } return v; }
    function term() { let v = unary(); while (peek() && peek().type === 'op' && (peek().v === '*' || peek().v === '/')) { const o = next().v; const r = unary(); v = o === '*' ? v * r : v / r; } return v; }
    function unary() { if (peek() && peek().type === 'op' && peek().v === '-') { next(); return -unary(); } if (peek() && peek().type === 'op' && peek().v === '+') { next(); return unary(); } return power(); }
    function power() { const b = atom(); if (peek() && peek().type === 'op' && peek().v === '^') { next(); return Math.pow(b, unary()); } return b; }
    function atom() {
      const tk = next(); if (!tk) throw new Error('Incomplete expression');
      if (tk.type === 'num') return implicit(tk.v);
      if (tk.type === 'op' && tk.v === '(') { const v = expr(); const c = next(); if (!c || c.v !== ')') throw new Error('Missing )'); return implicit(v); }
      if (tk.type === 'id') {
        const name = tk.v, lower = name.toLowerCase();
        if (peek() && peek().type === 'op' && peek().v === '(') {
          const fn = FN[lower]; if (!fn) throw new Error('Unknown function ' + name);
          next(); const args = [];
          if (!(peek() && peek().v === ')')) { args.push(expr()); while (peek() && peek().v === ',') { next(); args.push(expr()); } }
          const c = next(); if (!c || c.v !== ')') throw new Error('Missing )');
          return implicit(fn.apply(null, args));
        }
        if (lower === 'ans') return implicit(vars.ans || 0);
        if (name in vars) return implicit(vars[name]);
        if (name in CONST) return implicit(CONST[name]);
        if (lower in CONST) return implicit(CONST[lower]);
        throw new Error('Unknown name ' + name);
      }
      throw new Error('Unexpected ' + tk.v);
    }
    // implicit multiplication: 2(3), 2pi, (2)(3)
    function implicit(v) {
      while (peek() && ((peek().type === 'op' && peek().v === '(') || peek().type === 'id' || peek().type === 'num')) {
        if (peek().type === 'num') break; // "2 3" is an error, let it surface
        v = v * atom();
      }
      return v;
    }
    const v = expr();
    if (p < toks.length) throw new Error('Unexpected ' + toks[p].v);
    if (!isFinite(v)) throw new Error('Not a number');
    return v;
  }

  function format(v) {
    if (v === 0) return '0';
    const a = Math.abs(v);
    if (a >= 1e7 || a < 1e-4) return v.toExponential(4).replace(/\.?0+e/, 'e');
    return parseFloat(v.toPrecision(7)).toString();
  }

  return { evaluate, format };
});
