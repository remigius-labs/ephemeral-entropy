(function () {
  const INK = "#c4b5a0";
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  function frame(cx, x, y, s, alpha = 1) {
    const half = 4.5 * s + 0.8 * s, o = half, i = half - 0.14 * s, tick = 4 * s;
    cx.globalAlpha = alpha; cx.strokeStyle = INK; cx.lineWidth = Math.max(0.6, s * 0.05);
    const R = Math.round, L = (x1, y1, x2, y2) => { cx.beginPath(); cx.moveTo(R(x1), R(y1)); cx.lineTo(R(x2), R(y2)); cx.stroke(); };
    L(x - o, y - o, x - o, y + o); L(x - i, y - i, x - i, y + i); L(x + o, y - o, x + o, y + o); L(x + i, y - i, x + i, y + i);
    for (const sy of [-1, 1]) {
      const yo = y + sy * o, yi = y + sy * i;
      L(x - o, yo, x - tick, yo); L(x - i, yi, x - tick, yi); L(x + tick, yo, x + o, yo); L(x + tick, yi, x + i, yi);
      { const d = s * 0.33, n = Math.floor((2 * tick - d) / (2 * d)), x0 = x - (n * 2 * d - d) / 2;
        for (let k = 0; k < n; k++) { L(x0 + k * 2 * d, yo, x0 + k * 2 * d + d, yo); L(x0 + k * 2 * d, yi, x0 + k * 2 * d + d, yi); } }
      L(x - tick, yo, x - tick, yo - sy * 0.3 * s); L(x + tick, yo, x + tick, yo - sy * 0.3 * s);
    }
    cx.globalAlpha = 1;
  }
  const cellSize = (W, dpr) => Math.round(Math.min(W / (window.EE_CELL_DIV || 12.5), 48 * dpr));
  function sizeSeal(canvas, { font = 14, pad = 0, ash = true } = {}) {
    const W = canvas.width, dpr = window.devicePixelRatio || 1;
    const fs = font * dpr, lh = fs * 1.4, S = cellSize(W, dpr), top = ash ? pad + lh * 2 + S * 1.4 : W / 2 - 4.5 * S;
    canvas.height = Math.round(ash ? top + 9 * S + S * 1.2 : W);
    return canvas.height;
  }
  function sealGeom(canvas, { font = 14, pad = 0, ash = true } = {}) {
    const W = canvas.width, dpr = window.devicePixelRatio || 1;
    const fs = font * dpr, lh = fs * 1.4, S = cellSize(W, dpr), top = ash ? pad + lh * 2 + S * 1.4 : W / 2 - 4.5 * S;
    return { S, X: W / 2, Y: top + 4.5 * S };
  }
  function chosenOf(r, c) { let qr = Math.min(r, 8 - r), qc = Math.min(c, 8 - c); if (qr > qc) [qr, qc] = [qc, qr]; return [qr, qc]; }
  function mirrorsOf(r, c) {
    const out = [], seen = new Set();
    for (const [a, b] of [[r, c], [r, 8 - c], [8 - r, c], [8 - r, 8 - c], [c, r], [c, 8 - r], [8 - c, r], [8 - c, 8 - r]]) { const k = a * 9 + b; if (!seen.has(k)) { seen.add(k); out.push([a, b]); } }
    return out;
  }
  function bytesOf(r, c) { const [qr, qc] = chosenOf(r, c), k = qr * 5 + qc; return new Set([k, (k + 7) % 32, (k + 13) % 32, (k + 19) % 32, (k + 29) % 32, (k + 5) % 32]); }

  async function popCross({ cx, base, X, Y, S, st }) {
    for (const k of [0.45, 0.85, 1.18, 1.0]) { base(); glyphPath(cx, FOLD2.CENTER, X, Y, S * k, INK); await st(55); }
  }
  const HOT = "#fff1dc";
  async function flickerCross({ cx, base, X, Y, S, st, cell, glyphs }) {
    const cross = (ink = INK) => glyphPath(cx, FOLD2.CENTER, X, Y, S, ink);
    for (const [a, ms] of [[0.85, 50], [0, 70], [0.6, 40], [0.15, 60], [1, 30], [0.3, 50]]) {
      base(); if (a) { cx.globalAlpha = a; cross(); cx.globalAlpha = 1; } await st(ms);
    }
    base(); cross(HOT); await st(120);
    for (let t = 0.6; t <= Math.hypot(4, 4) + 2; t += 0.35) {
      base(); cross();
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
        if (r === 4 && c === 4) continue;
        const d = Math.abs(Math.hypot(r - 4, c - 4) - t);
        if (d < 0.6) { const [x, y] = cell(r, c); cx.globalAlpha = 1 - d / 0.6; glyphPath(cx, glyphs[r][c], x, y, S, HOT); cx.globalAlpha = 1; }
      }
      if (t > 5.0) { cx.save(); cx.shadowColor = HOT; cx.shadowBlur = S * 0.35 * Math.max(0, 1 - Math.abs(t - 5.8) / 0.8); frame(cx, X, Y, S, 1); cx.restore(); }
      await st(28);
    }
  }

  async function playSeal(canvas, ashBytes, { tempo = 1, font = 14, pad = 0, ash: showAsh = true, onLit = null, cross = null } = {}) {
    const cx = canvas.getContext("2d"), W = canvas.width, dpr = window.devicePixelRatio || 1;
    const fs = font * dpr, lh = fs * 1.4;
    const S = cellSize(W, dpr);
    const top = showAsh ? pad + lh * 2 + S * 1.4 : W / 2 - 4.5 * S;
    sizeSeal(canvas, { font, pad, ash: showAsh });
    const H = canvas.height, X = W / 2, Y = top + 4.5 * S;
    const st = (ms) => wait(ms * tempo);
    const glyphs = FOLD2.grid(ashBytes);
    const valueAt = (r, c) => { const [qr, qc] = chosenOf(r, c); return (qr === 4 && qc === 4) ? null : FOLD2.cellValue(ashBytes, qr, qc); };
    const hex = [...ashBytes].map(b => b.toString(16).padStart(2, "0"));
    const clear = () => { cx.fillStyle = "#000"; cx.fillRect(0, 0, W, H); };
    const mono = (px) => px + "px 'JetBrains Mono', monospace";
    const cell = (r, c) => [Math.round(X + (c - 4) * S), Math.round(Y + (r - 4) * S)];
    const num = (r, c, a = 1) => {
      const [x, y] = cell(r, c); const v = valueAt(r, c);
      if (v === null) return;
      cx.globalAlpha = a; cx.fillStyle = INK; cx.font = mono(Math.max(8, S * 0.36)); cx.textAlign = "center"; cx.textBaseline = "middle"; cx.fillText(String(v), x, y); cx.globalAlpha = 1;
    };
    let crossIn = false;
    const glyph = (r, c) => { if (r === 4 && c === 4 && !crossIn) return; const [x, y] = cell(r, c); glyphPath(cx, glyphs[r][c], x, y, S, INK); };
    const box = (r, c, a = 0.7) => { const [x, y] = cell(r, c); cx.strokeStyle = INK; cx.lineWidth = dpr; cx.globalAlpha = a; cx.strokeRect(Math.round(x - S * 0.42), Math.round(y - S * 0.42), Math.round(S * 0.84), Math.round(S * 0.84)); cx.globalAlpha = 1; };
    const cw = (() => { cx.font = mono(fs); return cx.measureText("0").width; })();
    const ash = (lit) => {
      if (onLit) onLit(lit);
      if (!showAsh) return;
      cx.font = mono(fs); cx.textAlign = "left"; cx.textBaseline = "middle";
      for (let i = 0; i < 32; i++) { cx.globalAlpha = lit === null ? 1 : (lit.has(i) ? 1 : 0.3); cx.fillStyle = INK; cx.fillText(hex[i], pad + (i % 16) * 2 * cw, pad + lh * (i < 16 ? 0.5 : 1.5)); }
      cx.globalAlpha = 1;
    };
    clear(); ash(null); await st(500);
    const placed = new Set();
    const drawPlaced = () => { for (let rr = 0; rr < 9; rr++) for (let cc = 0; cc < 9; cc++) if (placed.has(rr * 9 + cc)) num(rr, cc); };
    const WEDGES = [(r, c) => [r, c], (r, c) => [r, 8 - c], (r, c) => [c, 8 - r], (r, c) => [8 - c, 8 - r],
                    (r, c) => [8 - r, 8 - c], (r, c) => [8 - r, c], (r, c) => [8 - c, r], (r, c) => [c, r]];
    const chosen = []; for (let r = 0; r < 5; r++) for (let c = r; c < 5; c++) if (!(r === 4 && c === 4)) chosen.push([r, c]);
    for (const [r, c] of chosen) {
      for (const map of WEDGES) { const [rr, cc] = map(r, c); placed.add(rr * 9 + cc); }
      clear(); ash(bytesOf(r, c)); drawPlaced();
      await st(150);
    }
    clear(); ash(null); drawPlaced(); await st(400);
    const order = []; for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (!(r === 4 && c === 4)) order.push([r, c, Math.hypot(r - 4, c - 4)]);
    order.sort((a, b) => b[2] - a[2]); const done = new Set([4 * 9 + 4]);
    for (let i = 0; i < order.length; i++) {
      const [r, c] = order[i]; done.add(r * 9 + c); clear(); ash(null);
      for (let rr = 0; rr < 9; rr++) for (let cc = 0; cc < 9; cc++) { if (done.has(rr * 9 + cc)) glyph(rr, cc); else num(rr, cc, 0.6); }
      await st(40 + 50 * Math.pow(1 - i / order.length, 1.6));
    }
    const fo = 4.5 * S + 0.8 * S + S * 0.5, cornerR = S * 0.9;
    const drawGlyphs = () => { for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) glyph(r, c); };
    const corners = () => { cx.beginPath(); for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) cx.rect(X + sx * fo - (sx > 0 ? cornerR : 0), Y + sy * fo - (sy > 0 ? cornerR : 0), cornerR, cornerR); };
    for (let i = 0; i < 4; i++) {
      clear(); ash(null); drawGlyphs();
      cx.save(); cx.beginPath(); [[-1, -1], [1, -1], [1, 1], [-1, 1]].slice(0, i + 1).forEach(([sx, sy]) => cx.rect(X + sx * fo - (sx > 0 ? cornerR : 0), Y + sy * fo - (sy > 0 ? cornerR : 0), cornerR, cornerR)); cx.clip(); frame(cx, X, Y, S, 1); cx.restore();
      await st(110);
    }
    await st(150);
    const R2 = fo * 2.2;
    for (let t = 0; t <= 1.0001; t += 1 / 40) {
      clear(); ash(null); drawGlyphs();
      cx.save(); corners(); cx.clip(); frame(cx, X, Y, S, 1); cx.restore();
      cx.save(); cx.beginPath(); cx.moveTo(X, Y);
      const a0 = -Math.PI / 2, a1 = a0 + 2 * Math.PI * t;
      cx.lineTo(X + R2 * Math.cos(a0), Y + R2 * Math.sin(a0));
      for (let a = a0; a <= a1; a += 0.05) cx.lineTo(X + R2 * Math.cos(a), Y + R2 * Math.sin(a));
      cx.lineTo(X + R2 * Math.cos(a1), Y + R2 * Math.sin(a1)); cx.closePath(); cx.clip();
      frame(cx, X, Y, S, 1); cx.restore();
      await st(22);
    }
    clear(); ash(null); drawGlyphs(); frame(cx, X, Y, S, 1);
    await st(200);
    const base = () => { clear(); ash(null); drawGlyphs(); frame(cx, X, Y, S, 1); };
    await (cross || flickerCross)({ cx, base, X, Y, S, st, cell, glyphs, dpr, frame: (a = 1) => frame(cx, X, Y, S, a) });
    crossIn = true;
    clear(); ash(null); drawGlyphs(); frame(cx, X, Y, S, 1);
    let lastBoxes = [];
    const paint = (boxes = []) => {
      lastBoxes = boxes;
      clear(); if (showAsh) ash(null); drawGlyphs(); frame(cx, X, Y, S, 1);
      for (const [r, c] of boxes) box(r, c, 0.75);
    };
    const light = () => {
      const route = (typeof ROUTES !== "undefined") && ROUTES[ashBytes[5] % ROUTES.length];
      if (matchMedia("(prefers-reduced-motion: reduce)").matches || !route || !route.travel) return () => {};
      const HOT = "#fff1dc", DUR = 700, PERIOD = 5000;
      const easeIO = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const wave = (ms) => { if (ms < 0 || ms > DUR) return 0; const u = ms / DUR; return u < 0.4 ? easeIO(u / 0.4) : easeIO(1 - (u - 0.4) / 0.6); };
      const starts = [];
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
        const ch = glyphs[r][c]; if (ch === " " || ch === "\u2800") continue;
        const ph = route.phase(r, c, ashBytes); starts.push([r, c, ph * route.travel]);
        if (route.back) starts.push([r, c, route.travel + (1 - ph) * route.travel]);
      }
      const span = route.travel * (route.back ? 2 : 1) + DUR;
      let raf = 0, timer = null;
      const run = () => {
        const t0 = performance.now();
        const tick = () => {
          const t = performance.now() - t0; paint(lastBoxes);
          for (const [r, c, at] of starts) { const a = wave(t - at); if (a <= 0) continue; const [x, y] = cell(r, c); cx.globalAlpha = a; glyphPath(cx, glyphs[r][c], x, y, S, HOT); }
          cx.globalAlpha = 1;
          if (t < span) raf = requestAnimationFrame(tick); else paint(lastBoxes);
        };
        raf = requestAnimationFrame(tick);
      };
      timer = setTimeout(() => { run(); timer = setInterval(run, PERIOD); }, 600);
      return () => { clearTimeout(timer); clearInterval(timer); cancelAnimationFrame(raf); paint(lastBoxes); };
    };
    return { glyphs, paint, light };
  }
  window.playSeal = playSeal; window.popCross = popCross; window.flickerCross = flickerCross; window.sealFrame = frame; window.sizeSeal = sizeSeal; window.sealGeom = sealGeom; window.mirrorsOf = mirrorsOf; window.bytesOf = bytesOf;
})();
