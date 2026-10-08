(function () {
  const INK = "#c4b5a0", HOT = "#fff1dc", BG = "#000", MARK = "#e8e4d8";
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const cellSize = (W, dpr) => Math.round(Math.min(W / (window.EE_CELL_DIV || 12.5), 48 * dpr));

  const slabBand = ({ hold, band }) => hold((t) => band((t / 2600) % 1), { min: 900 });

  const RING = Math.hypot(4, 4);
  function softLamp(o) {
    const { cx, S, cell, glyphs, hold, tempo } = o, P = 2100, HALF = P / 2, FAR = RING + 1.1, LIFE = 1400, WAVES = [[0, 1], [280, 0.5]];
    const since = (u, hits) => { let s = Infinity; for (const h of hits) if (u >= h) s = Math.min(s, u - h); return s; };
    const cool = (s) => s < 80 ? s / 80 : Math.exp(-(s - 80) / 380);
    const bump = (s) => 1 + 0.05 * Math.sin(Math.min(s, 320) / 320 * Math.PI);
    const at = (d) => d / FAR * HALF;
    return hold((t) => {
      const u = (t / tempo) % P;
      o.clear();
      const fs = since(u, [HALF, HALF - P]);
      o.frame(1);
      if (fs < 1000) { cx.save(); cx.shadowColor = HOT; cx.shadowBlur = S * 0.5 * Math.exp(-fs / 300); o.frame(1); cx.restore(); }
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
        const [x, y] = cell(r, c), centre = r === 4 && c === 4, ch = glyphs[r][c], d = at(Math.hypot(r - 4, c - 4));
        let k = 1, a = 0;
        for (const [off, m] of WAVES) {
          const out = centre ? off : d + off, back = centre ? P : P - d + off;
          const s = since(u, [out, back, out - P, back - P]);
          if (s >= LIFE) continue;
          const aa = cool(s) * m;
          if (aa > a) { a = aa; k = centre ? 1 : 1 + (bump(s) - 1) * m; }
        }
        glyphPath(cx, ch, x, y, S * k, INK);
        if (a > 0) { cx.save(); cx.globalAlpha = Math.min(1, a); cx.shadowColor = HOT; cx.shadowBlur = S * (centre ? 1.1 : 0.3) * a; glyphPath(cx, ch, x, y, S * k, HOT); cx.restore(); }
      }
    }, { min: 900 });
  }
  softLamp.slab = false;
  async function boomBoom({ cx, base, X, Y, S, st, cell, glyphs, frame }) {
    const BEATS = [[0, 0.75, 0.7, 0.3], [200, 1, 1.2, 0.5]], STEP = 28, SP = 0.35, far = RING + 2;
    const end = BEATS[1][0] + Math.ceil((far - 0.6) / SP) * STEP;
    const lit = (r, c, a) => { const [x, y] = cell(r, c); cx.save(); cx.globalAlpha = a; if (a >= 0.7) { cx.shadowColor = HOT; cx.shadowBlur = S * 0.3 * a; } glyphPath(cx, glyphs[r][c], x, y, S, HOT); cx.restore(); };
    for (let ms = 0; ms <= end; ms += STEP) {
      base();
      const on = BEATS.find(([at]) => ms >= at && ms < at + 100);
      cx.save(); if (on) { cx.shadowColor = HOT; cx.shadowBlur = S * on[2]; } glyphPath(cx, glyphs[4][4], X, Y, S, on ? HOT : INK); cx.restore();
      const a = new Float32Array(81); let fg = 0;
      for (const [at, h, , g] of BEATS) {
        if (ms < at) continue;
        const t = 0.6 + (ms - at) / STEP * SP;
        for (let i = 0; i < 81; i++) { if (i === 40) continue; const d = Math.abs(Math.hypot(((i / 9) | 0) - 4, i % 9 - 4) - t); if (d < 0.6) a[i] = Math.max(a[i], (1 - d / 0.6) * h); }
        if (t > 5) fg = Math.max(fg, g * Math.max(0, 1 - Math.abs(t - 5.8) / 0.8));
      }
      for (let i = 0; i < 81; i++) if (a[i] > 0) lit((i / 9) | 0, i % 9, a[i]);
      if (fg > 0) { cx.save(); cx.shadowColor = HOT; cx.shadowBlur = S * fg; frame(1); cx.restore(); }
      await st(STEP);
    }
  }

  function sizeCast(canvas) { return canvas.height; }

  async function playCast(canvas, { glyphs, tempo = 1, font = 14, pad = 0, onStage = null, events = {}, nodesUrl = "../nodes.json", pending = slabBand, reveal = null, bytes = null } = {}) {
    const cx = canvas.getContext("2d"), W = canvas.width, H = canvas.height, dpr = window.devicePixelRatio || 1;
    const S = cellSize(W, dpr), X = W / 2, Y = H / 2;
    const st = (ms) => wait(ms * tempo);
    const stage = (s) => { if (onStage) onStage(s); };
    const clear = () => { cx.fillStyle = BG; cx.fillRect(0, 0, W, H); };
    const mono = (px) => px + "px 'JetBrains Mono', monospace";
    const sealAt = () => { for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) glyphPath(cx, glyphs[r][c], X + (c - 4) * S, Y + (r - 4) * S, S, INK); };
    const frame = (alpha = 1) => {
      const half = 4.5 * S + 0.8 * S, o = half, i = half - 0.14 * S, tick = 4 * S;
      cx.globalAlpha = alpha; cx.strokeStyle = INK; cx.lineWidth = Math.max(0.6, S * 0.05);
      const R = Math.round, L = (x1, y1, x2, y2) => { cx.beginPath(); cx.moveTo(R(x1), R(y1)); cx.lineTo(R(x2), R(y2)); cx.stroke(); };
      L(X - o, Y - o, X - o, Y + o); L(X - i, Y - i, X - i, Y + i); L(X + o, Y - o, X + o, Y + o); L(X + i, Y - i, X + i, Y + i);
      for (const sy of [-1, 1]) {
        const yo = Y + sy * o, yi = Y + sy * i;
        L(X - o, yo, X - tick, yo); L(X - i, yi, X - tick, yi); L(X + tick, yo, X + o, yo); L(X + tick, yi, X + i, yi);
        { const d = S * 0.33, n = Math.floor((2 * tick - d) / (2 * d)), x0 = X - (n * 2 * d - d) / 2; for (let k = 0; k < n; k++) { L(x0 + k * 2 * d, yo, x0 + k * 2 * d + d, yo); L(x0 + k * 2 * d, yi, x0 + k * 2 * d + d, yi); } }
        L(X - tick, yo, X - tick, yo - sy * 0.3 * S); L(X + tick, yo, X + tick, yo - sy * 0.3 * S);
      }
      cx.globalAlpha = 1;
    };
    const G = 11, tileAt = (i) => [X + (i % G - 5) * S, Y + (Math.floor(i / G) - 5) * S];
    const slab = (k, dim = null) => {
      clear();
      if (k < G * G) { cx.save(); cx.beginPath(); cx.rect(X - 5.5 * S, Y - 5.5 * S, 11 * S, 11 * S); cx.clip(); frame(); sealAt(); cx.restore(); }
      cx.fillStyle = INK;
      for (let i = 0; i < k; i++) {
        const [x, y] = tileAt(i);
        cx.globalAlpha = dim && dim.has(i) ? 0.93 : 1; cx.fillRect(Math.round(x - S / 2), Math.round(y - S / 2), Math.ceil(S), Math.ceil(S));
      }
      cx.globalAlpha = 1;
    };
    const report = (state, extra = {}) => stage({ state, ...extra });
    const totalP = (events.nodes || fetch(nodesUrl).then(r => r.json())).then(j => j.total).catch(() => 12000);

    const noSlab = pending.slab === false;
    const cell = (r, c) => [X + (c - 4) * S, Y + (r - 4) * S];
    const base = () => { clear(); for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (!(r === 4 && c === 4)) glyphPath(cx, glyphs[r][c], X + (c - 4) * S, Y + (r - 4) * S, S, INK); frame(); };
    const paint = () => { clear(); frame(); sealAt(); };
    report("casting");
    if (noSlab) paint();
    else if (REDUCED) slab(G * G); else { for (let k = 0; k <= G * G; k += 2) { slab(Math.min(k, G * G)); await st(11); } }
    let settled = null, error = null;
    const done = Promise.resolve(events.block).then(v => { settled = v || {}; }, e => { error = e || new Error("no answer"); });
    const isDone = () => !!(settled || error);
    report("pending");
    const band = (phase) => {
      clear();
      cx.fillStyle = INK;
      for (let i = 0; i < G * G; i++) {
        const [x, y] = tileAt(i), r = Math.floor(i / G) - 5, c = i % G - 5;
        const rad = Math.hypot(r, c) / Math.hypot(5, 5);
        let d = rad - phase * 1.25; if (d < -0.6) d += 1.25;
        const a = 1 - 0.34 * Math.exp(-(d * d) / (2 * 0.09 * 0.09)) - 0.14 * Math.exp(-((d + 0.62) ** 2) / (2 * 0.09 * 0.09));
        cx.globalAlpha = Math.max(0.5, a); cx.fillRect(Math.round(x - S / 2), Math.round(y - S / 2), Math.ceil(S), Math.ceil(S));
      }
      cx.globalAlpha = 1;
    };
    const hold = async (draw, { min = 0, ms = 33 } = {}) => {
      const t0 = performance.now();
      while (!isDone() || performance.now() - t0 < min * tempo) { draw(performance.now() - t0); await st(ms); }
    };
    const ash = bytes || Uint8Array.from(glyphs.flat().join("").slice(0, 32), (ch) => ch.charCodeAt(0) & 255);
    const ctx = { cx, X, Y, S, W, H, G, glyphs, bytes: ash, tempo, st, clear, frame, sealAt, slab, tileAt, band, hold, done, isDone, cell, base, paint, INK, HOT, BG };
    if (REDUCED) await hold(() => noSlab ? paint() : slab(G * G)); else await pending(ctx);
    if (!noSlab) slab(G * G);
    const dissolve = async () => {
      const SPREAD = 1400, TILE = 440, GLYPH = 300;
      const tiles = []; for (let i = 0; i < G * G; i++) { const r = Math.floor(i / G) - 5, c = i % G - 5, d = Math.hypot(r, c) / Math.hypot(5, 5); tiles.push({ i, at: 100 + d * SPREAD + Math.random() * 260 }); }
      const cells = []; for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) { const d = Math.hypot(r - 4, c - 4) / Math.hypot(4, 4); cells.push({ r, c, at: 120 + (1 - d) * 90 + d * SPREAD + Math.random() * 220 }); }
      const frameAt = 120 + SPREAD * 0.9;
      const step = (u, keys, vals) => { let v = vals[0]; for (let k = 0; k < keys.length; k++) if (u >= keys[k]) v = vals[k]; return v; };
      const tileA = (u) => u >= 1 ? 0 : step(u, [0, .3, .55, .8], [1, .75, .5, .25]);
      const glyphA = (u) => u >= 1 ? 1 : step(u, [0, .2, .35, .55, .7], [0, .85, .15, .7, .3]);
      const end = Math.max(...tiles.map(t => t.at + TILE), ...cells.map(c => c.at + GLYPH), frameAt + GLYPH) + 60;
      const t0 = performance.now();
      for (;;) {
        const now = (performance.now() - t0) / tempo;
        clear();
        frame(glyphA((now - frameAt) / GLYPH));
        for (const cl of cells) { const a = glyphA((now - cl.at) / GLYPH); if (a > 0) { cx.globalAlpha = a; glyphPath(cx, glyphs[cl.r][cl.c], X + (cl.c - 4) * S, Y + (cl.r - 4) * S, S, INK); } }
        cx.globalAlpha = 1; cx.fillStyle = INK;
        for (const tl of tiles) { const a = tileA((now - tl.at) / TILE); if (a > 0) { const [x, y] = tileAt(tl.i); cx.globalAlpha = a; cx.fillRect(Math.round(x - S / 2), Math.round(y - S / 2), Math.ceil(S), Math.ceil(S)); } }
        cx.globalAlpha = 1;
        if (now >= end) break;
        await st(33);
      }
      clear(); frame(); sealAt();
    };
    const flash = async () => { const end = reveal || window.flickerCross; if (end) await end({ cx, base, X, Y, S, st, cell, glyphs, frame, tempo }); paint(); };
    if (error) {
      report("failed", { error });
      if (REDUCED || noSlab) paint(); else await dissolve();
      return { ok: false, error, paint };
    }
    const blockNo = settled.block || 0;
    report("complete", { block: blockNo, blobHash: settled.blobHash || null });
    if (REDUCED) paint(); else if (noSlab) { await st(120); await flash(); } else { await st(500); await dissolve(); }
    const total = await totalP;
    report("rest", { block: blockNo, blobHash: settled.blobHash || null, tx: settled.tx || null, total: Math.round(total / 100) * 100 });
    return { ok: true, block: blockNo, paint };
  }
  window.playCast = playCast; window.sizeCast = sizeCast; window.slabBand = slabBand; window.softLamp = softLamp; window.boomBoom = boomBoom;
})();
