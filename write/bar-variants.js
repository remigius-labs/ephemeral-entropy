(function (root) {
  "use strict";
  const flash = (row) => { row.classList.add("hit"); void row.offsetWidth; row.classList.remove("hit"); };
  const bars = (n) => new Array(n).fill("█");
  const ease = (el, props, ms) => { el.style.transition = props.map(p => `${p} ${ms}ms ease-in-out`).join(", "); void el.offsetWidth; };
  const boxH = (box) => box.offsetHeight;
  const size = (c, fs, rowH, extraRows = 0) => { c.hashbox.style.fontSize = fs + "px"; c.hashbox.style.lineHeight = rowH + "px"; c.box.style.height = (rowH * (1 + extraRows) + 2 * c.pad + 2) + "px"; };
  const churn = (cells, c, w = c.W, target = c.BARS()) => c.morph(cells, target, { glyphs: c.BLOCKS, speed: 7, churn: 160, w });
  const morphMs = (c, w, speed, ch) => (120 + w * speed * c.TEMPO + ch * c.TEMPO + 40);

  async function slideUp(c, rowH, sx) {
    const { stack, box, wrap } = c, w0 = box.offsetWidth;
    let h = boxH(box), d = 220;
    wrap.style.width = w0 + "px"; box.style.width = w0 + "px"; box.style.height = h + "px";
    while (stack.children.length > 1) {
      const last = stack.lastElementChild, dd = c.reduced ? 0 : d * c.TEMPO;
      h -= rowH;
      last.style.transition = `transform ${dd}ms ease-in, opacity ${dd}ms ease-in`;
      box.style.transition = `height ${dd}ms ease-in`;
      void last.offsetWidth;
      last.style.transform = `translateY(-${rowH}px)` + (sx ? ` scaleX(${sx})` : ""); last.style.opacity = "0";
      box.style.height = h + "px";
      await c.wait(dd);
      last.remove(); flash(stack.firstChild);
      d = Math.max(35, d * 0.82);
    }
    await c.wait(c.reduced ? 0 : 60 * c.TEMPO);
    box.style.transition = "";
  }
  const handoff = (c, fs, rowH, n) => { c.hashbox.classList.remove("asWritten"); c.hashbox.style.fontSize = fs + "px"; c.hashbox.style.lineHeight = rowH + "px"; const cells = bars(n); c.show(cells, c.hashbox, n); return cells; };
  const exhale = (c, ms) => { ease(c.hashbox, ["font-size", "line-height"], ms); ease(c.box, ["height"], ms); size(c, c.fs1, c.rowH1); setTimeout(() => { c.hashbox.style.transition = ""; c.box.style.transition = ""; }, ms + 50); };

  const V = {};

  V.A = {
    rows: 1,
    settle(row, c) { row.style.fontSize = c.fs1 + "px"; row.style.lineHeight = c.rowH1 + "px"; row.style.transform = `scaleX(${c.SX})`; },
    async collapse(c) { await slideUp(c, c.rowH1, c.SX); return handoff(c, c.fs1, c.rowH1, c.W); },
    phase(_, cells, c) { return churn(cells, c); },
    reveal(cells, hex, c) { return c.morph(cells, hex, { glyphs: c.BLOCKS, speed: 18, churn: 320 }); },
  };

  V.B = {
    rows: 2,
    settle() {},
    async collapse(c) { await slideUp(c, c.rowH0); return handoff(c, c.fs0, c.rowH0, c.COLS); },
    phase(_, cells, c) { return churn(cells, c, c.COLS, bars(c.COLS)); },
    reveal(cells, hex, c) {
      const ms = morphMs(c, 32, 18, 320);
      ease(c.box, ["height"], Math.round(ms * 0.6)); c.box.style.height = (c.rowH0 * 2 + 2 * c.pad + 2) + "px";
      return c.morph(cells, hex, { glyphs: c.BLOCKS, speed: 18, churn: 320, w: 32 });
    },
  };

  V.C = {
    rows: 1,
    settle() {},
    async collapse(c) { await slideUp(c, c.rowH0); return handoff(c, c.fs0, c.rowH0, c.COLS); },
    phase(step, cells, c) {
      if (step === "salt") { exhale(c, morphMs(c, c.W, 7, 160)); return churn(cells, c); }
      return churn(cells, c);
    },
    reveal: V.A.reveal,
  };

  V.D = {
    rows: 1,
    settle() {},
    async collapse(c, { dim = true } = {}) {
      const { stack, box } = c, n = stack.children.length, ms = c.reduced ? 0 : 520 * c.TEMPO;
      box.style.width = box.offsetWidth + "px"; box.style.height = boxH(box) + "px";
      stack.style.transformOrigin = "top center";
      ease(stack, ["transform", "opacity"], ms); ease(box, ["height"], ms);
      stack.style.transform = `scale(${c.SX * c.fs1 / c.fs0}, ${c.rowH1 / (n * c.rowH0)})`; if (dim) stack.style.opacity = "0.55";
      box.style.height = (c.rowH1 + 2 * c.pad + 2) + "px";
      const render = (cur) => [...stack.childNodes].forEach((row, i) => { row.textContent = cur.slice(i * c.COLS, (i + 1) * c.COLS).join(""); });
      const cells = bars(n * c.COLS);
      await c.morph(cells, cells, { glyphs: c.BLOCKS, speed: Math.max(1, Math.round(ms / (n * c.COLS))), churn: ms * 0.5, w: c.COLS, render });
      await c.wait(60);
      stack.remove(); box.style.transition = "";
      return handoff(c, c.fs1, c.rowH1, c.W);
    },
    phase: V.A.phase,
    reveal: V.A.reveal,
  };

  V.E = {
    rows: 1,
    settle() {},
    async collapse(c) {
      const { stack, box, wrap } = c, w0 = box.offsetWidth;
      let h = boxH(box);
      wrap.style.width = w0 + "px"; box.style.width = w0 + "px"; box.style.height = h + "px";
      while (stack.children.length > 1) {
        const last = stack.lastElementChild, chars = [...last.textContent], order = chars.map((_, i) => i).sort(() => Math.random() - 0.5);
        const steps = 6, per = c.reduced ? 0 : 28 * c.TEMPO;
        for (let s = 1; s <= steps; s++) { order.slice(0, Math.round(chars.length * s / steps)).forEach(i => chars[i] = " "); last.textContent = chars.join(""); await c.wait(per); }
        h -= c.rowH0;
        box.style.transition = `height ${c.reduced ? 0 : 260 * c.TEMPO}ms cubic-bezier(.34,1.56,.64,1)`; box.style.height = h + "px";
        last.remove(); flash(stack.firstChild);
        await c.wait(c.reduced ? 0 : 120 * c.TEMPO);
      }
      await c.wait(c.reduced ? 0 : 160 * c.TEMPO); box.style.transition = "";
      return handoff(c, c.fs0, c.rowH0, c.COLS);
    },
    phase(_, cells, c) { return churn(cells, c, c.COLS, bars(c.COLS)); },
    reveal(cells, hex, c) { exhale(c, morphMs(c, c.W, 18, 320)); return c.morph(cells, hex, { glyphs: c.BLOCKS, speed: 18, churn: 320 }); },
  };

  V.F = {
    rows: 1,
    settle() {},
    async collapse(c) { await slideUp(c, c.rowH0); return handoff(c, c.fs0, c.rowH0, c.COLS); },
    phase(step, cells, c) {
      if (step === "salt") { exhale(c, morphMs(c, c.W, 7, 160) * 2 + 250 * c.TEMPO); return churn(cells, c); }
      return churn(cells, c);
    },
    reveal: V.A.reveal,
  };

  V.G = { rows: 1, settle() {}, async collapse(c) { return V.D.collapse(c, { dim: false }); }, phase: V.A.phase, reveal: V.A.reveal };

  async function squash(c, o) {
    const { stack, box } = c, n = stack.children.length, ms = c.reduced ? 0 : o.ms * c.TEMPO;
    const fs = o.thick ? c.fs0 : c.fs1, rowH = o.thick ? c.rowH0 : c.rowH1, sx = o.thick ? 1 : c.SX * c.fs1 / c.fs0;
    box.style.width = box.offsetWidth + "px"; box.style.height = boxH(box) + "px";
    stack.style.transformOrigin = o.origin || "top center";
    if (o.origin === "center") { stack.style.position = "relative"; stack.style.top = ((rowH - n * c.rowH0) / 2) + "px"; ease(stack, ["transform", "top"], ms); }
    else ease(stack, ["transform"], ms);
    ease(box, ["height"], ms);
    stack.style.transitionTimingFunction = o.easing || "ease-in-out"; box.style.transitionTimingFunction = o.easing || "ease-in-out";
    stack.style.transform = `scale(${sx}, ${rowH / (n * c.rowH0)})`;
    if (o.origin === "center") stack.style.top = "0px";
    box.style.height = (rowH + 2 * c.pad + 2) + "px";
    const render = (cur) => [...stack.childNodes].forEach((row, i) => { row.textContent = cur.slice(i * c.COLS, (i + 1) * c.COLS).join(""); });
    const cells = bars(n * c.COLS);
    await c.morph(cells, cells, { glyphs: o.glyphs || c.BLOCKS, speed: Math.max(1, Math.round(ms / (n * c.COLS))), churn: ms * 0.5, w: c.COLS, render });
    await c.wait(Math.max(0, ms - (performance.now() % 1)) * 0 + 60);
    if (o.flash) { const b = document.createElement("div"); b.className = "bar"; b.textContent = "█".repeat(o.thick ? c.COLS : c.W); stack.replaceWith(b); flash(b); await c.wait(120 * c.TEMPO); b.remove(); } else stack.remove();
    box.style.transition = "";
    return handoff(c, fs, rowH, o.thick ? c.COLS : c.W);
  }
  const R2 = (o, extra = {}) => Object.assign({
    rows: 1, settle() {},
    collapse(c) { return squash(c, o); },
    phase(step, cells, c) {
      if (o.thick && step === "salt") { exhale(c, morphMs(c, c.W, 7, 160)); return churn(cells, c); }
      if (o.thick) return churn(cells, c);
      return churn(cells, c);
    },
    reveal: V.A.reveal,
  }, extra);
  V["2A"] = R2({ ms: 520, easing: "ease-in-out" });
  V["2B"] = R2({ ms: 980, easing: "cubic-bezier(.5,0,1,.6)" });
  V["2C"] = R2({ ms: 200, easing: "cubic-bezier(.2,1.4,.5,1)" });
  V["2D"] = R2({ ms: 520, easing: "ease-in-out", origin: "center" });
  V["2E"] = R2({ ms: 520, easing: "ease-in-out", thick: true });
  V["2F"] = R2({ ms: 420, easing: "ease-in-out", flash: true, glyphs: "░▒▓█" });

  const R3 = (collapse) => ({
    rows: 1, settle() {}, collapse,
    phase(step, cells, c) { if (step === "salt") exhale(c, morphMs(c, c.W, 7, 160)); return churn(cells, c); },
    reveal: V.A.reveal,
  });
  const fix = (c) => { const { box, wrap } = c, w0 = box.offsetWidth; wrap.style.width = w0 + "px"; box.style.width = w0 + "px"; box.style.height = boxH(box) + "px"; return boxH(box); };
  const floor = (c, h, ms, curve = "ease-in") => { c.box.style.transition = `height ${ms}ms ${curve}`; c.box.style.height = h + "px"; };
  const done = (c) => { c.box.style.transition = ""; return handoff(c, c.fs0, c.rowH0, c.COLS); };

  V["3A"] = R3(async (c) => { await slideUp(c, c.rowH0); return done(c); });

  V["3B"] = R3(async (c) => {
    const { stack } = c, rows = [...stack.children], top = rows[0], n = rows.length; fix(c);
    const ms = c.reduced ? 0 : 420 * c.TEMPO, gap = c.reduced ? 0 : 70 * c.TEMPO;
    rows.slice(1).forEach((row, k) => {
      row.style.transition = `transform ${ms}ms cubic-bezier(.4,0,.7,.2) ${k * gap}ms, opacity ${ms * 0.5}ms ease-in ${k * gap + ms * 0.5}ms`;
      void row.offsetWidth; row.style.transform = `translateY(-${(k + 1) * c.rowH0}px)`; row.style.opacity = "0";
      setTimeout(() => flash(top), k * gap + ms * 0.85);
    });
    floor(c, c.rowH0 + 2 * c.pad + 2, ms + (n - 2) * gap, "cubic-bezier(.4,0,.7,.2)");
    await c.wait(ms + (n - 2) * gap + 80);
    rows.slice(1).forEach(r => r.remove());
    return done(c);
  });

  V["3C"] = R3(async (c) => {
    const { stack } = c, rows = [...stack.children], top = rows[0]; fix(c);
    let h = boxH(c.box), d = 260;
    for (let k = rows.length - 1; k >= 1; k--) {
      const row = rows[k], ms = c.reduced ? 0 : d * c.TEMPO; h -= c.rowH0;
      row.style.transformOrigin = "center top";
      row.style.transition = `transform ${ms}ms cubic-bezier(.5,0,.8,.4), opacity ${ms}ms ease-in`;
      void row.offsetWidth; row.style.transform = `translateY(-${k * c.rowH0}px) scaleX(0.04)`; row.style.opacity = "0";
      floor(c, h, ms);
      await c.wait(ms); row.remove(); flash(top);
      d = Math.max(60, d * 0.8);
    }
    await c.wait(60);
    return done(c);
  });

  V["3D"] = R3(async (c) => {
    const { stack } = c, rows = [...stack.children], top = rows[0]; fix(c);
    const topCells = [...top.textContent]; top.textContent = "";
    const spans = topCells.map(ch => { const sp = document.createElement("span"); sp.textContent = ch; top.appendChild(sp); return sp; });
    const flying = [];
    rows.slice(1).forEach((row, k) => { [...row.textContent].forEach((ch, col) => { if (ch !== " ") flying.push({ row: k + 1, col, ch }); }); row.textContent = ""; row.style.position = "relative"; });
    flying.sort(() => Math.random() - 0.5);
    const total = c.reduced ? 0 : 900 * c.TEMPO, per = flying.length ? total / flying.length : 0;
    const cw = c.box.clientWidth - 2 * c.pad, colW = cw / c.COLS;
    flying.forEach((b, i) => {
      const sp = document.createElement("span"); sp.textContent = b.ch;
      Object.assign(sp.style, { position: "absolute", left: (b.col * colW) + "px", top: "0", transition: `transform ${c.reduced ? 0 : 160 * c.TEMPO}ms cubic-bezier(.4,0,1,.6) ${i * per}ms, opacity 60ms linear ${i * per + 120 * c.TEMPO}ms` });
      rows[b.row].appendChild(sp);
      setTimeout(() => { sp.style.transform = `translateY(-${b.row * c.rowH0}px)`; sp.style.opacity = "0"; }, 10);
      setTimeout(() => { const t = spans[b.col]; if (t) { t.style.color = "#f3ebdd"; setTimeout(() => t.style.color = "", 90); } }, i * per + 150 * c.TEMPO);
    });
    floor(c, c.rowH0 + 2 * c.pad + 2, total + 200 * c.TEMPO, "ease-in-out");
    await c.wait(total + 260 * c.TEMPO);
    rows.slice(1).forEach(r => r.remove()); top.textContent = topCells.join("");
    return done(c);
  });

  V["3E"] = R3(async (c) => {
    const { stack } = c, rows = [...stack.children]; fix(c); stack.style.perspective = "600px";
    let h = boxH(c.box), d = 300;
    for (let k = rows.length - 1; k >= 1; k--) {
      const row = rows[k], ms = c.reduced ? 0 : d * c.TEMPO; h -= c.rowH0;
      row.style.transformOrigin = "center top"; row.style.backfaceVisibility = "hidden";
      row.style.transition = `transform ${ms}ms ease-in, opacity ${ms * 0.4}ms ease-in ${ms * 0.6}ms`;
      void row.offsetWidth; row.style.transform = "rotateX(-90deg)"; row.style.opacity = "0";
      floor(c, h, ms, "ease-in");
      await c.wait(ms); row.remove(); flash(rows[k - 1]);
      d = Math.max(90, d * 0.78);
    }
    await c.wait(60); stack.style.perspective = "";
    return done(c);
  });

  V["3F"] = R3(async (c) => {
    const { stack } = c, rows = [...stack.children], top = rows[0]; fix(c);
    let h = boxH(c.box), d = 240;
    top.style.transformOrigin = "center center";
    for (let k = rows.length - 1; k >= 1; k--) {
      const row = rows[k], ms = c.reduced ? 0 : d * c.TEMPO; h -= c.rowH0;
      row.style.transition = `transform ${ms}ms cubic-bezier(.55,0,.9,.4), color ${ms}ms ease-in, opacity ${ms * 0.3}ms linear ${ms * 0.7}ms`;
      void row.offsetWidth; row.style.transform = `translateY(-${k * c.rowH0}px)`; row.style.color = "#f3ebdd"; row.style.opacity = "0";
      floor(c, h, ms + 120, "cubic-bezier(.34,1.3,.64,1)");
      await c.wait(ms * 0.85);
      top.style.transition = `transform ${c.reduced ? 0 : 140 * c.TEMPO}ms ease-out, color 80ms`; top.style.transform = "scaleY(1.35)"; top.style.color = "#f3ebdd";
      await c.wait(ms * 0.15 + 90 * c.TEMPO);
      top.style.transform = "scaleY(1)"; top.style.color = ""; row.remove();
      d = Math.max(70, d * 0.8);
    }
    await c.wait(160);
    return done(c);
  });

  const INK = "#c4b5a0", LIT = "#f3ebdd";
  function inkOf(c, fs) {
    const cs = getComputedStyle(c.hashbox), cx = document.createElement("canvas").getContext("2d");
    cx.font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`; const m = cx.measureText("█");
    return { asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent, fa: m.fontBoundingBoxAscent, fd: m.fontBoundingBoxDescent };
  }
  const inkTop = (lineTop, L, k) => lineTop + (L - (k.fa + k.fd)) / 2 + k.fa - k.asc;
  async function compress(c, o) {
    const { stack, box, hashbox } = c, rows = [...stack.children], bb = box.getBoundingClientRect();
    box.style.position = "relative"; box.style.width = box.offsetWidth + "px"; box.style.height = boxH(box) + "px";
    const k0 = inkOf(c, c.fs0), k1 = inkOf(c, c.fs1);
    const strips = rows.map(row => {
      const r = row.getBoundingClientRect(), rg = document.createRange(); rg.selectNodeContents(row); const tw = rg.getBoundingClientRect().width;
      const d = document.createElement("div");
      Object.assign(d.style, { position: "absolute", left: (r.left - bb.left) + "px", top: inkTop(r.top - bb.top, c.rowH0, k0) + "px", width: tw + "px", height: (k0.asc + k0.desc) + "px", background: INK, pointerEvents: "none" });
      box.appendChild(d); return d;
    });
    void box.offsetWidth; stack.style.visibility = "hidden";
    const inner = box.clientWidth - 2 * c.pad, fTop = 1 + c.pad + (inkTop(0, c.rowH1, k1)), fH = k1.asc + k1.desc, fLeft = 1 + c.pad;
    const ms = c.reduced ? 0 : o.ms * c.TEMPO, stagger = c.reduced ? 0 : (o.stagger || 0) * c.TEMPO, n = strips.length;
    const total = ms + stagger * (n - 1);
    if (o.closeFirst && n > 1) {
      const cms = c.reduced ? 0 : 200 * c.TEMPO, h0 = k0.asc + k0.desc, top0 = parseFloat(strips[0].style.top);
      strips.forEach((d, i) => { d.style.transition = `top ${cms}ms ease-in-out, height ${cms}ms ease-in-out`; d.style.top = (top0 + i * h0) + "px"; });
      await c.wait(cms + 20);
    }
    strips.forEach((d, i) => {
      const delay = stagger * (n - 1 - i);
      d.style.transition = `top ${ms}ms ${o.easing} ${delay}ms, height ${ms}ms ${o.easing} ${delay}ms, width ${ms}ms ${o.easing} ${delay}ms, left ${ms}ms ${o.easing} ${delay}ms, background-color ${ms}ms ease-in-out ${delay}ms`;
    });
    box.style.transition = `height ${total}ms ${o.floor || o.easing}`;
    void box.offsetWidth;
    strips.forEach(d => { d.style.top = fTop + "px"; d.style.height = fH + "px"; d.style.width = inner + "px"; d.style.left = fLeft + "px"; });
    box.style.height = (c.rowH1 + 2 * c.pad + 2) + "px";
    if (o.clench) { setTimeout(() => strips.forEach(d => d.style.backgroundColor = LIT), 10); setTimeout(() => strips.forEach(d => { d.style.transition = `background-color ${ms * 0.55}ms ease-out`; d.style.backgroundColor = INK; }), total * 0.45); }
    await c.wait(total + 30);
    stack.remove(); stack.style.visibility = "";
    const cells = handoff(c, c.fs1, c.rowH1, c.W);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    strips.forEach(d => d.remove()); box.style.transition = "";
    return cells;
  }
  const R4 = (o) => ({ rows: 1, settle() {}, collapse(c) { return compress(c, o); }, phase: V.A.phase, reveal: V.A.reveal });
  V["4A"] = R4({ ms: 600, easing: "ease-in-out" });
  V["4B"] = R4({ ms: 950, easing: "cubic-bezier(.2,.8,.2,1)" });
  V["4C"] = R4({ ms: 520, easing: "ease-in-out", stagger: 55 });
  V["4D"] = R4({ ms: 480, easing: "cubic-bezier(.6,0,1,.5)", floor: "cubic-bezier(.34,1.25,.64,1)" });
  V["4E"] = R4({ ms: 420, easing: "ease-in-out", closeFirst: true });
  V["4F"] = R4({ ms: 560, easing: "ease-in-out", clench: true });

  V.S = {
    rows: 1,
    settle() {},
    async collapse(c) {
      await slideUp(c, c.rowH0);
      c.hashbox.classList.remove("asWritten"); c.hashbox.style.fontSize = c.fs0 + "px"; c.hashbox.style.lineHeight = c.rowH0 + "px"; c.hashbox.textContent = "";
      const w = document.createElement("div"); w.id = "hbin"; Object.assign(w.style, { transformOrigin: "left center", whiteSpace: "pre", display: "inline-block" }); c.hashbox.appendChild(w);
      c.hbin = w; const cells = bars(c.COLS); c.show(cells, w, c.COLS); return cells;
    },
    phase(step, cells, c) {
      const w = c.hbin, target = bars(c.COLS);
      if (step === "sha") {
        const ms = morphMs(c, c.COLS, 7, 160);
        w.style.transition = `font-size ${ms}ms ease-in-out, line-height ${ms}ms ease-in-out, transform ${ms}ms ease-in-out`;
        c.box.style.transition = `height ${ms}ms ease-in-out`;
        void w.offsetWidth;
        w.style.fontSize = c.fs1 + "px"; w.style.lineHeight = c.rowH1 + "px"; w.style.transform = `scaleX(${c.SX})`;
        c.box.style.height = (c.rowH1 + 2 * c.pad + 2) + "px";
      }
      return c.morph(cells, target, { glyphs: c.BLOCKS, speed: 7, churn: 160, w: c.COLS, el: w });
    },
    reveal(cells, hex, c) {
      const w = c.hbin;
      c.hashbox.style.fontSize = c.fs1 + "px"; c.hashbox.style.lineHeight = c.rowH1 + "px"; c.box.style.transition = "";
      w.style.transition = ""; w.style.transform = ""; w.style.fontSize = ""; w.style.lineHeight = "";
      return c.morph(cells, hex, { glyphs: c.BLOCKS, speed: 18, churn: 320, el: w });
    },
  };

  root.BAR_VARIANTS = V;
})(typeof globalThis !== "undefined" ? globalThis : this);
