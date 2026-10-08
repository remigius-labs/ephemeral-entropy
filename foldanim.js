(function () {
  const INK = "#c4b5a0";
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  function frame(cx, x, y, s, alpha = 1) {
    const half = 4.5 * s + 0.8 * s, o = half, i = half - 0.14 * s, tick = 4 * s;
    cx.globalAlpha = alpha; cx.strokeStyle = INK; cx.lineWidth = Math.max(0.6, s * 0.05);
    const L = (x1, y1, x2, y2) => { cx.beginPath(); cx.moveTo(x1, y1); cx.lineTo(x2, y2); cx.stroke(); };
    L(x - o, y - o, x - o, y + o); L(x - i, y - i, x - i, y + i); L(x + o, y - o, x + o, y + o); L(x + i, y - i, x + i, y + i);
    for (const sy of [-1, 1]) {
      const yo = y + sy * o, yi = y + sy * i;
      L(x - o, yo, x - tick, yo); L(x - i, yi, x - tick, yi); L(x + tick, yo, x + o, yo); L(x + tick, yi, x + i, yi);
      { const d = s * 0.33, n = Math.floor((2 * tick - d) / (2 * d)), x0 = x - (n * 2 * d - d) / 2;
        for (let k = 0; k < n; k++) { L(x0 + k * 2 * d, yo, x0 + k * 2 * d + d, yo); L(x0 + k * 2 * d, yi, x0 + k * 2 * d + d, yi); } }
      L(x - tick, yo, x - tick, yo - sy * 0.3 * s); L(x + tick, yo, x + tick, yo - sy * 0.3 * s);
      for (const sx of [-1, 1]) { const ox = x + sx * tick, oy = y + sy * (i - 0.55 * s), d = 0.16 * s; cx.beginPath(); cx.moveTo(ox, oy - d * 1.2); cx.lineTo(ox + d, oy); cx.lineTo(ox, oy + d * 1.2); cx.lineTo(ox - d, oy); cx.closePath(); cx.stroke(); }
    }
    cx.globalAlpha = 1;
  }

  async function playFold(canvas, ashBytes, opts = {}) {
    const stage = opts.onStage || (() => {});
    const cx = canvas.getContext("2d"), W = canvas.width, H = canvas.height;
    const S = opts.cell || (opts.ashSpans ? H / 12.4 : Math.min(W, H) / 14), X = W / 2, Y = opts.ashSpans ? H / 2 : H / 2 + S * 0.6;
    const q = quadrant(ashBytes), g = mirror(q), glyphs = charGrid(g);
    const hex = [...ashBytes].map(b => b.toString(16).padStart(2, "0"));
    const clear = () => { cx.fillStyle = "#000"; cx.fillRect(0, 0, W, H); };
    const cell = (r, c) => [X + (c - 4) * S, Y + (r - 4) * S];
    const num = (r, c, v, a = 1) => { const [x, y] = cell(r, c); cx.globalAlpha = a; cx.fillStyle = INK; cx.font = Math.max(8, S * 0.36) + "px 'JetBrains Mono', monospace"; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.fillText(String(v), x, y); cx.globalAlpha = 1; };
    const glyph = (r, c) => { const [x, y] = cell(r, c); cx.fillStyle = INK; cx.font = Math.max(8, S * 0.7) + "px 'JetBrains Mono', monospace"; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.fillText(glyphs[r][c], x, y); };
    const fs = Math.max(8, S * 0.4), rowW = 32 * fs * 1.15, x0 = X - rowW / 2 + fs * 0.6;
    const spans = opts.ashSpans || null;
    const ashRow = (lit) => {
      if (spans) { for (let i = 0; i < 32; i++) spans[i].style.opacity = lit.size === 0 ? "0.55" : (lit.has(i) ? "1" : "0.3"); return; }
      cx.font = fs + "px 'JetBrains Mono', monospace"; cx.textAlign = "center"; cx.textBaseline = "middle"; for (let i = 0; i < 32; i++) { cx.globalAlpha = lit.has(i) ? 1 : 0.35; cx.fillStyle = INK; cx.fillText(hex[i], x0 + i * fs * 1.15, S * 0.9); } cx.globalAlpha = 1; };
    const label = () => {};
    const CH = "░▒▓█▀▄│─┼";
    const barRow = (t) => {
      cx.font = fs + "px 'JetBrains Mono', monospace"; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.fillStyle = INK;
      for (let i = 0; i < 32; i++) {
        const k = i / 32, ch = t < k ? "██" : (t < k + 0.18 ? CH[(Math.random() * CH.length) | 0] + CH[(Math.random() * CH.length) | 0] : hex[i]);
        cx.globalAlpha = t < k ? 1 : (t < k + 0.18 ? 0.7 : 1);
        cx.fillText(ch, x0 + i * fs * 1.15, S * 0.9);
      }
      cx.globalAlpha = 1;
    };
    if (!spans) {
      stage("your words, as one bar");
      clear(); barRow(0); await wait(700);
      stage("salted, hashed, the salt thrown away. what is left is the ash: 32 bytes.");
      for (let t = 0; t <= 1.2; t += 0.03) { clear(); barRow(t); await wait(30); }
    }
    clear(); ashRow(new Set()); await wait(300);
    const filled = [];
    stage("folded: a 5×5 grid, every cell made from two of those bytes.");
    for (let i = 0; i < 25; i++) { filled.push([Math.floor(i / 5), i % 5]); clear(); ashRow(new Set([i, (i + 7) % 32])); for (const [r, c] of filled) num(r, c, q[r][c]); await wait(70); }
    await wait(450);
    stage("mirrored four ways, so every seal is symmetric.");
    for (const [pass, map] of [[1, (r, c) => [r, 8 - c]], [2, (r, c) => [8 - r, c]], [3, (r, c) => [8 - r, 8 - c]]]) {
      for (let t = 0; t <= 1; t += 0.1) {
        clear(); ashRow(new Set()); label("mirror · 4-fold");
        for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) { const inQ = r < 5 && c < 5, inPrev = (pass >= 2 && r < 5 && c > 4) || (pass >= 3 && r > 4 && c < 5); if (inQ || inPrev) num(r, c, g[r][c]); }
        for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) { const [tr, tc] = map(r, c); if (tr === r && tc === c) continue; const [xa, ya] = cell(r, c), [xb, yb] = cell(tr, tc), e = ease(t); cx.globalAlpha = e; cx.fillStyle = INK; cx.font = Math.max(8, S * 0.36) + "px 'JetBrains Mono', monospace"; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.fillText(String(q[r][c]), xa + (xb - xa) * e, ya + (yb - ya) * e); cx.globalAlpha = 1; }
        await wait(26);
      }
    }
    clear(); for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) num(r, c, g[r][c]); label("mirror · 4-fold"); await wait(450);
    const order = []; for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) order.push([r, c, Math.hypot(r - 4, c - 4)]);
    order.sort((a, b) => b[2] - a[2]); const done = new Set();
    stage("each number becomes a glyph: heavy near the centre, light at the edge. the ✠ is always there.");
    for (let i = 0; i < order.length; i++) {
      const [r, c] = order[i]; done.add(r * 9 + c); clear(); label("shape · centre heavy, edge light");
      for (let rr = 0; rr < 9; rr++) for (let cc = 0; cc < 9; cc++) { if (done.has(rr * 9 + cc)) glyph(rr, cc); else num(rr, cc, g[rr][cc], 0.6); }
      await wait(24);
    }
    stage("your seal.");
    for (let t = 0; t <= 1; t += 0.06) { clear(); frame(cx, X, Y, S, ease(t)); for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) glyph(r, c); await wait(28); }
    return glyphs;
  }
  window.playFold = playFold;
})();
