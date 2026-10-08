(function () {
  const INK = "#c4b5a0", HOT = "#fff1dc";
  const DUR = 700, PERIOD = 2600;
  const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const wave = (ms) => { if (ms < 0 || ms > DUR) return 0; const u = ms / DUR; return u < 0.4 ? ease(u / 0.4) : ease(1 - (u - 0.4) / 0.6); };
  const STYLE = ".line{fill:none;stroke:" + INK + ";stroke-width:.9;stroke-linecap:round;stroke-linejoin:round}.fill{fill:" + INK + "}.rule{fill:none;stroke:" + INK + ";stroke-width:1.1}" +
                ".w .fill{fill:" + HOT + "}.w .line{stroke:" + HOT + "}";

  const unpack = (src) => src.length ? { grid: FOLD2.grid(src), ash: src } : { grid: src.glyphs, ash: src.seed };
  async function sealGIF(src, { size = 1080, fps = 20, seconds = PERIOD / 1000, onProgress = null } = {}) {
    const { GIFEncoder, quantize, applyPalette } = window.gifenc;
    const { grid, ash } = unpack(src);
    const route = ROUTES[ash[5] % ROUTES.length];
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    drawSeal(svg, grid, { style: 2 }); svg.style.visibility = "visible"; svg.removeAttribute("class");
    const st = document.createElementNS("http://www.w3.org/2000/svg", "style"); st.textContent = STYLE; svg.insertBefore(st, svg.firstChild);
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect"); bg.setAttribute("width", "100%"); bg.setAttribute("height", "100%"); bg.setAttribute("fill", "#000"); svg.insertBefore(bg, st.nextSibling);
    const hot = [];
    if (route.travel) for (const mark of svg.querySelectorAll(".mark[data-rc]")) {
      if (!mark.firstChild) continue;
      const [r, c] = mark.dataset.rc.split(",").map(Number), ph = route.phase(r, c, ash);
      const starts = [ph * route.travel]; if (route.back) starts.push(route.travel + (1 - ph) * route.travel);
      for (const at of starts) { const h = mark.cloneNode(true); h.setAttribute("class", "w"); h.removeAttribute("data-rc"); h.setAttribute("opacity", "0"); mark.parentNode.appendChild(h); hot.push({ el: h, at }); }
    }
    svg.setAttribute("width", size); svg.setAttribute("height", size);
    svg.querySelectorAll(".mark, .rule").forEach(n => { n.style.animation = "none"; n.style.visibility = "visible"; });

    const canvas = document.createElement("canvas"); canvas.width = canvas.height = size;
    const cx = canvas.getContext("2d", { willReadFrequently: true });
    const frames = Math.round(seconds * fps), delay = Math.round(1000 / fps), START = 300;
    const gif = GIFEncoder();
    const drawFrame = async () => {
      const img = new Image();
      await new Promise((ok, bad) => { img.onload = ok; img.onerror = bad; img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(svg)); });
      cx.fillStyle = "#000"; cx.fillRect(0, 0, size, size); cx.drawImage(img, 0, 0, size, size);
      return cx.getImageData(0, 0, size, size).data;
    };
    hot.forEach(({ el }, k) => el.setAttribute("opacity", ["1", "0.5", "0"][k % 3]));
    let palette = quantize(await drawFrame(), 128, { format: "rgb565" });
    for (let i = 0; i < frames; i++) {
      const t = i * delay;
      for (const { el, at } of hot) el.setAttribute("opacity", wave(t - START - at).toFixed(3));
      const rgba = await drawFrame();
      const index = applyPalette(rgba, palette, "rgb565");
      gif.writeFrame(index, size, size, { palette, delay, repeat: 0 });
      if (onProgress) onProgress((i + 1) / frames);
    }
    gif.finish();
    return new Blob([gif.bytes()], { type: "image/gif" });
  }

  async function sealPNG(src, { size = 1000 } = {}) {
    const { grid } = unpack(src);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    drawSeal(svg, grid, { style: 2 }); svg.style.visibility = "visible"; svg.removeAttribute("class");
    const st = document.createElementNS("http://www.w3.org/2000/svg", "style"); st.textContent = STYLE; svg.insertBefore(st, svg.firstChild);
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect"); bg.setAttribute("width", "100%"); bg.setAttribute("height", "100%"); bg.setAttribute("fill", "#000"); svg.insertBefore(bg, st.nextSibling);
    svg.setAttribute("width", size); svg.setAttribute("height", size);
    svg.querySelectorAll(".mark, .rule").forEach(n => { n.style.animation = "none"; n.style.visibility = "visible"; });
    const img = new Image();
    await new Promise((ok, bad) => { img.onload = ok; img.onerror = bad; img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(svg)); });
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = size; const cx = canvas.getContext("2d");
    cx.fillStyle = "#000"; cx.fillRect(0, 0, size, size); cx.drawImage(img, 0, 0, size, size);
    return new Promise(res => canvas.toBlob(res, "image/png"));
  }
  const download = (blob, name) => { if (matchMedia("(pointer: coarse)").matches) return sheet(blob, name); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 10000); };
  function sheet(blob, name) {
    const url = URL.createObjectURL(blob), file = new File([blob], name, { type: blob.type });
    const box = document.createElement("div");
    box.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1rem;padding:1.5rem;font:inherit;color:#c4b5a0";
    const img = document.createElement("img"); img.src = url; img.alt = name; img.style.cssText = "max-width:100%;max-height:calc(65vh / var(--z));border:1px solid #2a231e";
    const tip = document.createElement("div"); tip.textContent = "Long press the image to save it"; tip.style.cssText = "font-size:.85rem;letter-spacing:.05em;color:#9a8d7c";
    const row = document.createElement("div"); row.style.cssText = "display:flex;gap:.8rem";
    const btn = (label, main) => { const b = document.createElement("button"); b.textContent = label; b.style.cssText = "font:inherit;font-size:.9rem;padding:.55rem 1.2rem;border:1px solid " + (main ? "#c4b5a0" : "#6b5f52") + ";background:" + (main ? "#c4b5a0" : "transparent") + ";color:" + (main ? "#000" : "#c4b5a0"); row.appendChild(b); return b; };
    const close = () => { box.remove(); URL.revokeObjectURL(url); };
    if (navigator.canShare && navigator.canShare({ files: [file] })) btn("Share", true).onclick = () => navigator.share({ files: [file] }).catch(() => {});
    btn("Close", false).onclick = close;
    box.onclick = (e) => { if (e.target === box) close(); };
    box.append(img, tip, row); document.body.appendChild(box);
  }
  const short = (src) => [...unpack(src).ash].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 8);
  async function saveSealGIF(src, opts = {}) { const blob = await sealGIF(src, opts); download(blob, "seal-" + short(src) + ".gif"); return blob; }
  async function saveSealPNG(src, opts = {}) { const blob = await sealPNG(src, opts); download(blob, "seal-" + short(src) + ".png"); return blob; }
  window.sealGIF = sealGIF; window.sealPNG = sealPNG; window.saveSealGIF = saveSealGIF; window.saveSealPNG = saveSealPNG;
})();
