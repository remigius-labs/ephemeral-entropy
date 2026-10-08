


    function veil() {
      const el = document.getElementById("veil");
      if (!el) return Promise.resolve();
      const cols = Math.ceil(window.innerWidth / 8) + 1;
      const rows = Math.ceil(window.innerHeight / 14) + 1;
      const cx = cols / 2, cy = rows / 2;
      const maxd = Math.sqrt(cx * cx + (cy * 14 / 8) ** 2);
      const lock = new Float32Array(cols * rows);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const d = Math.sqrt((x - cx) ** 2 + ((y - cy) * 14 / 8) ** 2) / maxd;
        lock[y * cols + x] = 250 + d * 1100 + Math.random() * 180;
      }
      const t0 = performance.now();
      return new Promise(res => {
        function tick() {
          const t = performance.now() - t0;
          let done = true;
          const lines = new Array(rows);
          for (let y = 0; y < rows; y++) {
            let line = "";
            for (let x = 0; x < cols; x++) {
              const left = lock[y * cols + x] - t;
              if (left <= 0) { line += " "; continue; }
              done = false;
              if (left > 300) line += "█";
              else if (left > 90) line += DECAY[Math.min(3, ((300 - left) / 55) | 0)];
              else line += Math.random() < 0.5 ? SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0] : " ";
            }
            lines[y] = line;
          }
          el.textContent = lines.join("\n");
          if (done) { el.remove(); res(); } else requestAnimationFrame(tick);
        }
        tick();
      });
    }



    function printIn(final, el) {
      let row = 0, col = 0;
      const meta = [...final].map(c => {
        if (c === "\n") { row++; col = 0; } else { col++; }
        return { final: c, lock: (c === " " || c === "\n") ? 0 : 150 + row * 220 + col * 5 + Math.random() * 40 };
      });
      const t0 = performance.now();
      return new Promise(res => {
        function tick() {
          const t = performance.now() - t0;
          let done = true, out = "";
          for (const m of meta) {
            if (m.final === " " || m.final === "\n" || t >= m.lock) out += m.final;
            else if (t >= m.lock - 200) { out += SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0]; done = false; }
            else { out += " "; done = false; }
          }
          el.textContent = out;
          if (done) res(); else requestAnimationFrame(tick);
        }
        tick();
      });
    }



    function evaporate(el, span = 1700) {
      const final = el.textContent;
      const lines = final.split("\n");
      const rows = lines.length, cols = Math.max(...lines.map(l => [...l].length));
      const cy = (rows - 1) / 2, cx = (cols - 1) / 2;
      const maxD = Math.sqrt(cy * cy + (cx / 2.4) ** 2);
      const meta = [];
      lines.forEach((line, r) => {
        [...line].forEach((ch, c) => {
          const d = Math.sqrt((r - cy) ** 2 + ((c - cx) / 2.4) ** 2) / maxD;
          let go = 200 + (1 - d) * span * 0.55 + Math.random() * span * 0.45;
          if (ch === CENTER) go = 200 + span + 400;
          meta.push({ ch, go });
        });
        if (r < rows - 1) meta.push({ ch: "\n", go: -1 });
      });
      const t0 = performance.now();
      return new Promise(res => {
        function tick() {
          const t = performance.now() - t0;
          let done = true, out = "";
          for (const m of meta) {
            if (m.go < 0) { out += "\n"; continue; }
            if (m.ch === " ") { out += " "; continue; }
            const left = m.go - t;
            if (left > 260) { out += m.ch; done = false; }
            else if (left > 120) { out += SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0]; done = false; }
            else if (left > 0) { out += DECAY[3 - Math.min(3, ((120 - left) / 30) | 0)]; done = false; }
            else out += " ";
          }
          el.textContent = out;
          if (done) { el.textContent = lines.map(l => " ".repeat([...l].length)).join("\n"); res(); }
          else requestAnimationFrame(tick);
        }
        tick();
      });
    }
    function letGo(el, ms = 60000) {
      const stand = Math.min(4000, ms * 0.1);
      let left = stand, last = performance.now(), timer = null;
      const fire = () => {
        if (REDUCED) { el.style.transition = "opacity 400ms ease"; el.style.opacity = "0"; return; }
        evaporate(el, ms - stand);
      };
      const arm = () => { last = performance.now(); timer = setTimeout(fire, left); };
      const pause = () => { clearTimeout(timer); left -= performance.now() - last; };
      document.addEventListener("visibilitychange", () => document.hidden ? pause() : arm());
      if (!document.hidden) arm();
    }

    const FLICKER = "@#$%&*+-=~^!?<>";
    const CALM = matchMedia("(max-width: 640px)").matches;
    function bootIn(el, { speed = 1.6, rowStagger = 90, delay = 0, churn = 110, glyphs = FLICKER } = {}) {
      if (!el) return Promise.resolve();
      if (CALM) churn = 0;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const nodes = [];
      for (let n; (n = walker.nextNode());) nodes.push(n);
      let row = 0, col = 0;
      const parts = nodes.map(node => {
        const final = node.nodeValue;
        const meta = [...final].map(c => {
          if (c === "\n") { row++; col = 0; return { final: c, lock: 0 }; }
          col++;
          return { final: c, lock: /\s/.test(c) ? 0 : delay + row * rowStagger + col * speed + Math.random() * 25 };
        });
        return { node, meta };
      });
      const box = el.getBoundingClientRect(), was = [el.style.minWidth, el.style.minHeight];
      if (getComputedStyle(el).display !== "inline") { el.style.minWidth = box.width + "px"; el.style.minHeight = box.height + "px"; }
      el.style.visibility = "visible";
      const t0 = performance.now();
      return new Promise(done0 => {
        const res = () => { [el.style.minWidth, el.style.minHeight] = was; done0(); };
        function tick() {
          const t = performance.now() - t0;
          let done = true;
          for (const { node, meta } of parts) {
            let out = "";
            for (const m of meta) {
              if (m.lock === 0 || t >= m.lock) out += m.final;
              else if (t >= m.lock - churn) { out += glyphs[(Math.random() * glyphs.length) | 0]; done = false; }
              else { out += " "; done = false; }
            }
            node.nodeValue = out;
          }
          if (done) res(); else requestAnimationFrame(tick);
        }
        tick();
      });
    }
    { const vt = () => document.documentElement.classList.add("vt");
      if (document.fonts && document.fonts.load) { document.fonts.load('1em "VT323"').then(vt, vt); setTimeout(vt, 2000); } else vt(); }
    const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
    async function bootPage() {
      const els = [...document.querySelectorAll("[data-boot]")];
      if (REDUCED) { els.forEach(e => e.style.visibility = "visible"); return; }
      const ready = document.fonts.check('16px "JetBrains Mono"') ? Promise.resolve()
        : Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 700))]);
      await ready;
      const run = (list) => {
        let delay = 60, held = null;
        const t0 = performance.now();
        const go = (at, fn) => held ? held.then(() => fn(Math.max(0, at - (performance.now() - t0)))) : fn(at);
        return Promise.all(list.map(e => {
          if (e.__ready) held = Promise.resolve(e.__ready).catch(() => {});
          if (e.classList.contains("seal") || (e.__ready && e.tagName.toLowerCase() === "svg")) {
            const p = go(delay, d => revealSeal(e, { mode: "bloom", delay: d }));
            delay += 420;
            return p;
          }
          const isTitle = e.tagName === "H1", isArt = e.tagName === "PRE";
          const speed = isTitle ? 45 : 1.6;
          const at = delay;
          const p = go(at, d => bootIn(e, { speed, rowStagger: isTitle ? 0 : 90, delay: d, glyphs: (isTitle || isArt) ? SCRAMBLE : FLICKER }));
          delay += Math.max(120, e.textContent.replace(/\s/g, "").length * speed * 0.35);
          return p;
        }));
      };
      await run(els.filter(e => e.dataset.boot !== "last"));
      await run(els.filter(e => e.dataset.boot === "last"));
    }
    addEventListener("DOMContentLoaded", bootPage);

    const KEEP = { rpc: { 1: "https://ethereum-rpc.publicnode.com", 11155111: "https://ethereum-sepolia-rpc.publicnode.com" }, contract: null, chainId: 1, max: 1000, render: null };
    async function keepCount() {
      const fake = new URLSearchParams(location.search).get("keep"); if (fake !== null) return Math.max(0, Math.min(KEEP.max, +fake));
      if (!KEEP.contract && window.EE_RELAY) {
        try { const j = await (await fetch(window.EE_RELAY + "/index.json", { cache: "no-store" })).json(); if (j.contract) { KEEP.contract = j.contract; KEEP.chainId = j.chainId || 1; } } catch {}
      }
      if (!KEEP.contract) return null;
      try {
        const r = await fetch(KEEP.rpc[KEEP.chainId] || KEEP.rpc[1], { method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: KEEP.contract, data: "0x18160ddd" }, "latest"] }) });
        const j = await r.json();
        return j.result ? parseInt(j.result, 16) : null;
      } catch { return null; }
    }
    function keepAscii(el, n, max) {
      const width = 34, filled = Math.round(width * n / max);
      el.textContent = "▓".repeat(filled) + "░".repeat(width - filled) + "  " + n + " / " + max + " minted";
    }
    async function keepBar() {
      const el = document.getElementById("keepbar");
      if (!el) return;
      const tick = async () => { const n = await keepCount(); if (n !== null) (KEEP.render || keepAscii)(el, n, KEEP.max); };
      await tick(); setInterval(tick, 30000);
    }
    addEventListener("DOMContentLoaded", keepBar);

    const FUSE_KNOWN = { 1: "0x9f0749bb1d015cdc982a53784d1b692ce5736e15" };
    async function fusedAsh() {
      if (!KEEP.contract && window.EE_RELAY) {
        try { const j = await (await fetch(window.EE_RELAY + "/index.json", { cache: "no-store" })).json(); if (j.contract) { KEEP.contract = j.contract; KEEP.chainId = j.chainId || 1; } } catch {}
      }
      const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !window.EE_TESTNET;
      const contract = KEEP.contract || (local ? FUSE_KNOWN[1] : null), chainId = KEEP.contract ? KEEP.chainId : 1;
      if (!contract) return null;
      const rpc = KEEP.rpc[chainId] || KEEP.rpc[1], key = "ee.fusion." + chainId + "." + contract.toLowerCase();
      const call = async (body) => { const r = await fetch(rpc, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); return r.json(); };
      const hex = (b) => [...b].map(x => x.toString(16).padStart(2, "0")).join("");
      const seal = (id) => ({ jsonrpc: "2.0", id, method: "eth_call", params: [{ to: contract, data: "0x86fe212d" + id.toString(16).padStart(64, "0") }, "latest"] });
      const fuse = async () => {
        let n = 0, all = null;
        for (let from = 1; from === 1 || from <= n; from += 100) {
          const batch = [];
          if (from === 1) batch.push({ jsonrpc: "2.0", id: 0, method: "eth_call", params: [{ to: contract, data: "0x18160ddd" }, "latest"] });
          for (let id = from; id < from + 100 && (from === 1 || id <= n); id++) batch.push(seal(id));
          const res = await call(batch);
          if (!Array.isArray(res) || res.length !== batch.length) throw new Error("batch");
          if (from === 1) {
            const t = res.find(r => r.id === 0);
            n = t && t.result ? parseInt(t.result, 16) : 0;
            if (!n) return null;
            all = new Uint8Array(32 * n);
          }
          for (const r of res) {
            if (r.id < 1 || r.id > n) continue;
            if (!r.result || r.result.length < 66) throw new Error("seal " + r.id);
            const ash = r.result.slice(2, 66);
            for (let i = 0; i < 32; i++) all[(r.id - 1) * 32 + i] = parseInt(ash.substr(i * 2, 2), 16);
          }
        }
        const ash = new Uint8Array(await crypto.subtle.digest("SHA-256", all));
        try { localStorage.setItem(key, JSON.stringify({ n, ash: hex(ash) })); } catch {}
        return { n, ash };
      };
      let cached = null;
      try { const c = JSON.parse(localStorage.getItem(key) || "null"); if (c && c.n > 0 && /^[0-9a-f]{64}$/.test(c.ash)) cached = c; } catch {}
      if (cached) {
        fuse().catch(() => {});
        return { n: cached.n, ash: Uint8Array.from(cached.ash.match(/../g), h => parseInt(h, 16)) };
      }
      return fuse();
    }

    addEventListener("DOMContentLoaded", () => {
      if (!window.EE_TESTNET) return;
      for (const a of document.querySelectorAll("a[href]")) {
        const href = a.getAttribute("href");
        if (/^(https?:)?\/\//.test(href) || href.startsWith("#") || href.startsWith("mailto:") || href.includes("?")) continue;
        const [path, hash] = href.split("#"); a.setAttribute("href", path + "?testnet" + (hash ? "#" + hash : ""));
      }
    });

    function keepFrame(line, n, max) {
      const cta = document.querySelector("a.cta"); if (!cta) return;
      if (cta.classList.contains("soon")) { cta.classList.remove("soon"); cta.removeAttribute("aria-disabled"); cta.setAttribute("href", (cta.dataset.href || "write/") + (window.EE_TESTNET ? "?testnet" : "")); }
      const NS = "http://www.w3.org/2000/svg";
      if (!cta.__keep) {
        const id = "keep" + Math.random().toString(36).slice(2, 8);
        const svg = document.createElementNS(NS, "svg"); svg.setAttribute("preserveAspectRatio", "none"); svg.setAttribute("aria-hidden", "true");
        svg.innerHTML = '<defs><clipPath id="' + id + 'c"><rect class="wall"/><rect class="arms"/><rect class="rt"/><rect class="rb"/></clipPath>' +
          '<linearGradient id="' + id + 'g" gradientUnits="userSpaceOnUse" y1="0" y2="0"><stop offset="0" stop-color="#fff1dc" stop-opacity="0"/><stop offset="0.5" stop-color="#fff1dc" stop-opacity="1"/><stop offset="1" stop-color="#fff1dc" stop-opacity="0"/>' +
          '<animateTransform class="slide" attributeName="gradientTransform" type="translate" dur="5s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.32;1" keySplines="0.42 0 0.58 1;0 0 1 1"/></linearGradient></defs>' +
          '<path class="ktrack"/><g clip-path="url(#' + id + 'c)"><path class="kfill"/><path class="ksheen" stroke="url(#' + id + 'g)"/></g>';
        cta.classList.add("keepframe"); cta.appendChild(svg);
        const q = (k) => svg.querySelector(k), K = cta.__keep = { svg, q, W: 0, H: 0, frac: 0 };
        K.layout = () => {
          const W = K.W = cta.offsetWidth, H = K.H = cta.offsetHeight, o = 0.5; svg.setAttribute("viewBox", "0 0 " + W + " " + H);
          const d = "M" + o + " " + o + "H" + (W - o) + "V" + (H - o) + "H" + o + "Z";
          q(".ktrack").setAttribute("d", d); q(".kfill").setAttribute("d", d); q(".ksheen").setAttribute("d", d);
          const bw = W * 0.28, g = q("linearGradient"), slide = q(".slide");
          g.setAttribute("x1", -bw); g.setAttribute("x2", 0);
          slide.setAttribute("values", "0 0;" + (W + bw) + " 0;" + (W + bw) + " 0"); if (REDUCED) slide.remove();
          K.paint();
        };
        K.paint = () => {
          const W = K.W, H = K.H, L = 2 * W + 2 * H, lit = L * K.frac, t = 3;
          const a = Math.min(lit, H) / 2;
          const xf = Math.max(0, Math.min(W, (lit - H) / 2));
          const yr = Math.max(0, Math.min(H / 2, (lit - H - 2 * W) / 2));
          const set = (k, v) => { const r = q(k); for (const key in v) r.setAttribute(key, v[key]); };
          set(".wall", { x: 0, y: H / 2 - a, width: t, height: 2 * a });
          set(".arms", { x: 0, y: 0, width: Math.min(xf, W - t), height: H });
          set(".rt", { x: W - t, y: 0, width: t, height: yr });
          set(".rb", { x: W - t, y: H - yr, width: t, height: yr });
        };
        addEventListener("resize", K.layout); K.layout();
      }
      const K = cta.__keep; K.frac = Math.max(0, Math.min(1, n / max)); K.paint();
      const kl = document.getElementById("keepline");
      if (kl && n >= max) {
        const os = !KEEP.contract ? "https://opensea.io" : KEEP.chainId === 11155111 ? "https://testnets.opensea.io/assets/sepolia/" + KEEP.contract : "https://opensea.io/assets/ethereum/" + KEEP.contract;
        kl.innerHTML = '<s>Want to keep it? Mint one for 0.00777 ETH and it stays on Ethereum forever. Fully on chain, no dependencies.</s><br>Sold out. You can trade on <a class="link" href="' + os + '" target="_blank" rel="noopener">OpenSea</a> and still cast for free.';
      }
      const first = !line.dataset.shown; line.dataset.shown = "1";
      line.innerHTML = n >= max ? '<b>' + max.toLocaleString("en") + '</b> of ' + max.toLocaleString("en") + ' minted · writing and casting stay free'
                                : '<b>' + n.toLocaleString("en") + '</b> of ' + max.toLocaleString("en") + ' minted';
      if (first && line.style.visibility === "visible") bootIn(line, { speed: 30, rowStagger: 0, glyphs: SCRAMBLE });
    }

    function generateCircuit(cols, rows) {
      const grid = Array.from({ length: rows }, () => Array(cols).fill(' '));
      const order = [];
      const target = Math.floor(cols * rows * 0.35);
      let walkers = [];
      let guard = cols * rows * 20;

      const spawn = (x, y, dx, dy) => walkers.push({ x, y, dx, dy });
      const randomSeed = () => {
        const horiz = Math.random() > 0.5;
        const sign = Math.random() > 0.5 ? 1 : -1;
        spawn(
          Math.floor(Math.random() * cols),
          Math.floor(Math.random() * rows),
          horiz ? sign : 0,
          horiz ? 0 : sign
        );
      };

      const seedCount = Math.max(6, Math.floor((cols * rows) / 1000));
      const gridN = Math.ceil(Math.sqrt(seedCount));
      let planted = 0;
      for (let gy = 0; gy < gridN && planted < seedCount; gy++) {
        for (let gx = 0; gx < gridN && planted < seedCount; gx++) {
          const horiz = Math.random() > 0.5;
          const sign = Math.random() > 0.5 ? 1 : -1;
          spawn(
            Math.floor(((gx + 0.15 + Math.random() * 0.7) / gridN) * cols),
            Math.floor(((gy + 0.15 + Math.random() * 0.7) / gridN) * rows),
            horiz ? sign : 0,
            horiz ? 0 : sign
          );
          planted++;
        }
      }

      while (order.length < target && guard-- > 0) {
        if (!walkers.length) randomSeed();

        for (let i = walkers.length - 1; i >= 0; i--) {
          const w = walkers[i];

          if (w.x < 0 || w.x >= cols || w.y < 0 || w.y >= rows) {
            walkers.splice(i, 1);
            continue;
          }

          if (grid[w.y][w.x] !== ' ') {
            const cell = grid[w.y][w.x];
            const perpendicular =
              (cell === '─' && w.dy !== 0) || (cell === '│' && w.dx !== 0);
            if (perpendicular) {
              const roll = Math.random();
              if (roll < 0.4) {
                const cross = Math.random() < 0.12 ? '+' : '┼';
                grid[w.y][w.x] = cross;
                order.push({ x: w.x, y: w.y, ch: cross });
              } else if (roll < 0.7) {
                const over = w.dx !== 0 ? '─' : '│';
                grid[w.y][w.x] = over;
                order.push({ x: w.x, y: w.y, ch: over });
              }
              w.x += w.dx;
              w.y += w.dy;
              continue;
            }
            walkers.splice(i, 1);
            continue;
          }

          let crowd = 0;
          for (let oy = -1; oy <= 1; oy++) {
            for (let ox = -1; ox <= 1; ox++) {
              if (ox === 0 && oy === 0) continue;
              const cx = w.x + ox, cy = w.y + oy;
              if (cx >= 0 && cx < cols && cy >= 0 && cy < rows && grid[cy][cx] !== ' ') crowd++;
            }
          }
          if (crowd >= 4 && Math.random() < 0.5) {
            walkers.splice(i, 1);
            continue;
          }
          if (Math.random() < 0.05 + crowd * 0.05) {
            const hop = 1 + Math.floor(Math.random() * (crowd >= 3 ? 3 : 2));
            w.x += w.dx * hop;
            w.y += w.dy * hop;
            continue;
          }

          const nx = w.x + w.dx;
          const ny = w.y + w.dy;
          const wouldExit = nx < 0 || nx >= cols || ny < 0 || ny >= rows;

          let ch;
          if (wouldExit || Math.random() < 0.16) {
            let ndx = 0, ndy = 0;
            if (w.dx !== 0) {
              const canUp = w.y > 0, canDown = w.y < rows - 1;
              ndy = canUp && canDown ? (Math.random() > 0.5 ? 1 : -1) : (canDown ? 1 : -1);
            } else {
              const canLeft = w.x > 0, canRight = w.x < cols - 1;
              ndx = canLeft && canRight ? (Math.random() > 0.5 ? 1 : -1) : (canRight ? 1 : -1);
            }
            ch = (w.dx === 1 || ndx === -1)
              ? ((w.dy === -1 || ndy === 1) ? '┐' : '┘')
              : ((w.dy === -1 || ndy === 1) ? '┌' : '└');
            w.dx = ndx; w.dy = ndy;
          } else {
            ch = w.dx !== 0 ? '─' : '│';
          }

          grid[w.y][w.x] = ch;
          order.push({ x: w.x, y: w.y, ch });

          if (walkers.length < 120 && Math.random() < 0.08) {
            const bdx = w.dx === 0 ? (Math.random() > 0.5 ? 1 : -1) : 0;
            const bdy = w.dx === 0 ? 0 : (Math.random() > 0.5 ? 1 : -1);
            const tee = w.dx !== 0 ? (bdy === 1 ? '┬' : '┴') : (bdx === 1 ? '├' : '┤');
            grid[w.y][w.x] = tee;
            order[order.length - 1].ch = tee;
            spawn(w.x + bdx, w.y + bdy, bdx, bdy);
          }

          if (Math.random() < 0.02) {
            grid[w.y][w.x] = '·';
            order[order.length - 1].ch = '·';
            walkers.splice(i, 1);
            continue;
          }

          w.x += w.dx;
          w.y += w.dy;
        }
      }

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (grid[y][x] === ' ' && Math.random() < 0.008) {
            const ch = '·.:*'[Math.floor(Math.random() * 4)];
            grid[y][x] = ch;
            order.push({ x, y, ch });
          }
        }
      }

      return { grid, order };
    }

    const bg = document.getElementById("bg");
    let bgCols = 0;
    function drawBg() {
      if (!bg) return;
      const height = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, window.innerHeight);
      bg.style.height = height + "px";
      const cols = Math.ceil(window.innerWidth / 8) + 2;
      const rows = Math.ceil(height / (14 * 1.2));
      if (cols === bgCols && bg.dataset.rows >= rows) return;
      bgCols = cols; bg.dataset.rows = rows;
      const { grid } = generateCircuit(cols, rows);
      const CW = 8.4, CH = 14 * 1.2, dpr = window.devicePixelRatio || 1;
      const DIRS = { "─": "we", "│": "ns", "┌": "es", "┐": "ws", "└": "ne", "┘": "nw", "╭": "es", "╮": "ws", "╰": "ne", "╯": "nw",
                     "├": "nse", "┤": "nsw", "┬": "wes", "┴": "wen", "┼": "nesw", "═": "we", "║": "ns" };
      let cv = bg.querySelector("canvas"); if (!cv) { bg.textContent = ""; cv = document.createElement("canvas"); cv.style.display = "block"; bg.appendChild(cv); }
      const W = Math.ceil(cols * CW), H = Math.min(Math.ceil(rows * CH), height);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + "px"; cv.style.height = H + "px";
      const cx = cv.getContext("2d"); cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const ink = getComputedStyle(bg).color; cx.strokeStyle = ink; cx.fillStyle = ink; cx.lineWidth = 1; cx.lineCap = "square";
      cx.font = "14px 'JetBrains Mono', monospace"; cx.textAlign = "center"; cx.textBaseline = "middle";
      cx.beginPath();
      grid.forEach((row, r) => row.forEach((ch, c) => {
        if (ch === " ") return;
        const x = Math.round(c * CW + CW / 2) + 0.5, y = Math.round(r * CH + CH / 2) + 0.5, d = DIRS[ch];
        if (!d) { cx.fillText(ch, x, y); return; }
        if (d.includes("n")) { cx.moveTo(x, y); cx.lineTo(x, Math.round(r * CH) + 0.5); }
        if (d.includes("s")) { cx.moveTo(x, y); cx.lineTo(x, Math.round((r + 1) * CH) + 0.5); }
        if (d.includes("w")) { cx.moveTo(x, y); cx.lineTo(Math.round(c * CW) + 0.5, y); }
        if (d.includes("e")) { cx.moveTo(x, y); cx.lineTo(Math.round((c + 1) * CW) + 0.5, y); }
      }));
      cx.stroke();
    }
    drawBg();
    addEventListener("load", drawBg);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawBg);
    let bgTimer; addEventListener("resize", () => { clearTimeout(bgTimer); bgTimer = setTimeout(drawBg, 150); });

    const PALETTE = "∙∘◦⊹✧◇○◊✦◆●◈◉";
    const CENTER = "✠";
    function glyph(entry) { return entry; }

    async function burn(message) {
      const salt = crypto.getRandomValues(new Uint8Array(32));
      const body = new TextEncoder().encode(message);
      const input = new Uint8Array(salt.length + body.length);
      input.set(salt); input.set(body, salt.length);
      const buf = await crypto.subtle.digest("SHA-256", input);
      return new Uint8Array(buf);
    }

    function quadrant(ash) {
      const q = [];
      for (let r = 0; r < 5; r++) {
        const row = [];
        for (let c = 0; c < 5; c++) {
          const i = r * 5 + c;
          row.push((ash[i] * 131 + ash[(i + 7) % 32]) % 256);
        }
        q.push(row);
      }
      return q;
    }

    function mirror(q) {
      const g = Array.from({ length: 9 }, () => Array(9).fill(0));
      for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
        const v = q[r][c];
        g[r][c] = v; g[r][8 - c] = v; g[8 - r][c] = v; g[8 - r][8 - c] = v;
      }
      return g;
    }

    function shapeChar(v, r, c) {
      if (r === 4 && c === 4) return CENTER;
      const d = Math.sqrt((r - 4) ** 2 + (c - 4) ** 2) / Math.sqrt(32);
      const shaped = v * (1.0 - 0.5 * Math.pow(d, 1.3));
      let idx = Math.floor(shaped / 256 * PALETTE.length);
      idx = Math.max(0, Math.min(idx, PALETTE.length - 1));
      return glyph(PALETTE[idx], r, c);
    }

    function frame(rows) {
      const w = rows[0].length;
      const inner = w - 2;
      const dash = "═" + " ═".repeat((inner - 1) / 2);
      const top = "╔══╦" + dash + "╦══╗";
      const orn = "║  ◇" + " ".repeat(inner) + "◇  ║";
      const bot = "╚══╩" + dash + "╩══╝";
      return [top, orn, ...rows.map(r => "║  " + r + "  ║"), orn, bot].join("\n");
    }

    function renderGrid(g) {
      const rows = [];
      for (let r = 0; r < 9; r++) {
        const chars = [];
        for (let c = 0; c < 9; c++) chars.push(shapeChar(g[r][c], r, c));
        rows.push(chars.join("  "));
      }
      return frame(rows);
    }

    const SVG_NS = "http://www.w3.org/2000/svg";
    const CELL_X = 22, CELL_Y = 22;
    const VB_W = 250, VB_H = 250;
    const gx = c => VB_W / 2 + (c - 4) * CELL_X;
    const gy = r => VB_H / 2 + (r - 4) * CELL_Y;
    const TICK_L = gx(0), TICK_R = gx(8);

    const svgEl = (tag, attrs) => {
      const n = document.createElementNS(SVG_NS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      return n;
    };

    function starPath(n, ro, ri) {
      const pts = [];
      for (let i = 0; i < n * 2; i++) {
        const a = -Math.PI / 2 + i * Math.PI / n, r = i % 2 ? ri : ro;
        pts.push((Math.cos(a) * r).toFixed(2) + "," + (Math.sin(a) * r).toFixed(2));
      }
      return "M" + pts.join("L") + "Z";
    }
    function sparkPath(r, k = 0.26) {
      const q = (r * k).toFixed(2), R = r.toFixed(2);
      return `M0,-${R}Q${q},-${q} ${R},0Q${q},${q} 0,${R}Q-${q},${q} -${R},0Q-${q},-${q} 0,-${R}Z`;
    }
    function diamondPath(w, h) { return `M0,-${h}L${w},0L0,${h}L-${w},0Z`; }
    const CROSS_PATH =
      "M-1,-1Q-1.4,-4 -2.9,-5.5L2.9,-5.5Q1.4,-4 1,-1" +
      "Q4,-1.4 5.5,-2.9L5.5,2.9Q4,1.4 1,1" +
      "Q1.4,4 2.9,5.5L-2.9,5.5Q-1.4,4 -1,1" +
      "Q-4,1.4 -5.5,2.9L-5.5,-2.9Q-4,-1.4 -1,-1Z";

    const GLYPH_PATHS = {};
    function glyphPath(cx, ch, x, y, S, ink = "#c4b5a0") {
      if (ch === " " || ch === "\u2800") return;
      const d = ch === CENTER ? CROSS_PATH : (typeof SHAPES2 !== "undefined" ? SHAPES2[ch] : null);
      if (!d) {
        cx.fillStyle = ink; cx.font = Math.max(8, S * 0.7) + "px 'DejaVu Sans Mono', 'JetBrains Mono', monospace";
        cx.textAlign = "center"; cx.textBaseline = "middle"; cx.fillText(ch, x, y); return;
      }
      const p = GLYPH_PATHS[d] || (GLYPH_PATHS[d] = new Path2D(d));
      cx.save(); cx.translate(x, y); cx.scale(S / 22, S / 22); cx.fillStyle = ink; cx.fill(p); cx.restore();
    }

    const SHAPES = [
      { c: 0.9, fill: 1 },
      { c: 1.7 },
      { c: 2.4 },
      { d: "M0,-3.7V-1.3M0,1.3V3.7M-3.7,0H-1.3M1.3,0H3.7" },
      { d: sparkPath(4.2) },
      { d: diamondPath(3.0, 3.6) },
      { c: 3.3 },
      { d: diamondPath(2.3, 4.3) },
      { d: sparkPath(4.5), fill: 1 },
      { d: diamondPath(3.2, 3.8), fill: 1 },
      { c: 3.3, fill: 1 },
      { d: diamondPath(3.7, 4.4), core: diamondPath(1.85, 2.2) },
      { c: 4.0, eye: 1.9 },
    ];

    const BLANK2 = "\u2800";
    function glyphNode(ch, style = 1) {
      const g = svgEl("g", { class: "mark" });
      if (ch === " " || ch === BLANK2) return g;
      if (ch === CENTER) { g.appendChild(svgEl("path", { class: "fill", d: CROSS_PATH })); return g; }
      const i = PALETTE.indexOf(ch), traced = typeof SHAPES2 !== "undefined" ? SHAPES2[ch] : null;
      if (traced && (style === 2 || i < 0)) { g.appendChild(svgEl("path", { class: "fill", d: traced })); return g; }
      const s = i < 0 ? { d: CROSS_PATH, fill: 1 } : SHAPES[i];
      if (s.d) g.appendChild(svgEl("path", { class: s.fill ? "fill" : "line", d: s.d }));
      else g.appendChild(svgEl("circle", { class: s.fill ? "fill" : "line", r: s.c }));
      if (s.eye) g.appendChild(svgEl("circle", { class: "fill", r: s.eye }));
      if (s.core) g.appendChild(svgEl("path", { class: "fill", d: s.core }));
      return g;
    }

    const OUT = 2.5, IN = 5.5, TL = TICK_L - 1.5, TR = TICK_R - 1.5;
    const CH = CELL_X / 3;
    const r2 = n => Math.round(n * 100) / 100;

    function cut(x1, y1, x2, y2, step) {
      const out = [], n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / step));
      for (let i = 0; i < n; i++) {
        const a = i / n, b = (i + 1) / n;
        const ax = x1 + (x2 - x1) * a, ay = y1 + (y2 - y1) * a;
        const bx = x1 + (x2 - x1) * b, by = y1 + (y2 - y1) * b;
        out.push({ d: `M${r2(ax)},${r2(ay)}L${r2(bx)},${r2(by)}`, at: [(ax + bx) / 2, (ay + by) / 2] });
      }
      return out;
    }

    function marks(x1, x2, y) {
      const out = [], n = Math.max(1, Math.round((x2 - x1) / (CH * 2))), d = (x2 - x1) / (2 * n - 1);
      for (let i = 0; i < n; i++) {
        const ax = x1 + i * 2 * d;
        out.push({ d: `M${r2(ax)},${y}L${r2(ax + d)},${y}`, at: [ax + d / 2, y] });
      }
      return out;
    }

    const FRAME = (() => {
      const B = VB_H - OUT, b = VB_H - IN, R = VB_W - OUT, r = VB_W - IN, p = [];
      p.push(...cut(OUT, OUT, OUT, B, CELL_Y), ...cut(IN, IN, IN, b, CELL_Y));
      p.push(...cut(R, OUT, R, B, CELL_Y), ...cut(r, IN, r, b, CELL_Y));
      for (const [y, x0, x1] of [[OUT, OUT, TL + 3], [IN, IN, TL + 3],
                                 [OUT, TR, R], [IN, TR, r],
                                 [B, OUT, TL + 3], [b, IN, TL + 3],
                                 [B, TR, R], [b, TR, r]]) p.push(...cut(x0, y, x1, y, CH));
      for (const y of [OUT, IN, B, b]) p.push(...marks(TL + 3, TR, y));
      for (const x of [TL, TL + 3, TR, TR + 3]) {
        p.push({ d: `M${x},${OUT}L${x},10.5`, at: [x, 6.5] });
        p.push({ d: `M${x},${B}L${x},${VB_H - 10.5}`, at: [x, VB_H - 6.5] });
      }
      return p;
    })();
    const ORNAMENTS = [[TICK_L, 15], [TICK_R, 15], [TICK_L, VB_H - 15], [TICK_R, VB_H - 15]];

    function charGrid(g) {
      return g.map((row, r) => row.map((v, c) => shapeChar(v, r, c)));
    }

    function gridFromText(text) {
      const rows = [];
      for (const raw of text.split("\n")) {
        const line = raw.replace(/\s+$/, "");
        if (!line.startsWith("║  ") || !line.endsWith("  ║")) continue;
        const cells = line.slice(3, -3).split("  ");
        if (cells.length === 9 && cells.every(c => c.length === 1)) rows.push(cells);
        if (rows.length === 9) break;
      }
      return rows.length === 9 ? rows : null;
    }

    function drawSeal(node, glyphs, { style } = {}) {
      const flat = glyphs.flat();
      if (!style) style = flat.some(ch => ch === " " || ch === BLANK2 || (ch !== CENTER && !PALETTE.includes(ch))) ? 2 : 1;
      node.textContent = "";
      node.setAttribute("viewBox", `0 0 ${VB_W} ${VB_H}`);
      node.setAttribute("preserveAspectRatio", "xMidYMid meet");
      node.classList.add("seal");

      const art = svgEl("g", { class: "art" });
      for (const piece of FRAME) {
        const seg = svgEl("path", { class: "rule", d: piece.d });
        seg.__at = piece.at;
        art.appendChild(seg);
      }
      const place = (inner, x, y) => {
        const slot = svgEl("g", { transform: `translate(${x},${y})` });
        slot.appendChild(inner);
        art.appendChild(slot);
        inner.__at = [x, y];
        return inner;
      };
      for (const [x, y] of (style === 2 ? [] : ORNAMENTS)) {
        const o = svgEl("g", { class: "mark" });
        o.appendChild(svgEl("path", { class: "line", d: diamondPath(3.0, 3.6) }));
        place(o, x, y);
      }
      glyphs.forEach((row, r) => row.forEach((ch, c) => {
        const n = place(glyphNode(ch, style), gx(c), gy(r)); n.__centre = ch === CENTER;
        n.setAttribute("data-rc", r + "," + c);
      }));
      node.appendChild(art);
      node.__parts = [...art.querySelectorAll(".mark, .rule")];
      node.style.visibility = REDUCED ? "visible" : "hidden";
      return node;
    }

    const MAX_D = Math.hypot(VB_W / 2, VB_H / 2);
    const spread = p => Math.hypot(p.__at[0] - VB_W / 2, p.__at[1] - VB_H / 2) / MAX_D;

    const whenVisible = () => document.hidden
      ? new Promise(res => document.addEventListener("visibilitychange", function h() { if (!document.hidden) { document.removeEventListener("visibilitychange", h); res(); } }))
      : Promise.resolve();
    async function revealSeal(node, opts = {}) { await whenVisible(); return revealParts(node, opts); }
    function revealParts(node, { mode = "crumble", delay = 0 } = {}) {
      const parts = node.__parts || [];
      node.style.visibility = "visible";
      if (REDUCED) return Promise.resolve();

      let last = 0, lastEl = null;
      const IN_MS = 300, SPREAD = 2000;
      for (const p of parts) {
        let at;
        if (mode === "bloom") {
          const row = (p.__at[1] - gy(0)) / CELL_Y, col = (p.__at[0] - gx(0)) / CELL_X;
          at = delay + (p.classList.contains("rule") ? 1900 : 200 + 300 * Math.hypot(row - 4, col - 4));
        } else if (mode === "print") {
          const row = (p.__at[1] - gy(0)) / CELL_Y, col = (p.__at[0] - gx(0)) / CELL_X;
          at = Math.max(delay, delay + 180 + row * 95 + col * 26);
        } else {
          at = delay + 120 + (1 - spread(p)) * 90 + spread(p) * SPREAD + Math.random() * 220;
        }
        p.style.animationDelay = at + "ms";
        const len = mode === "bloom" ? 600 : IN_MS;
        if (at + len > last) { last = at + len; lastEl = p; }
      }
      node.classList.add("printing"); node.classList.toggle("bloom", mode === "bloom");

      let blocks = null;
      if (mode === "crumble") {
        blocks = svgEl("g", { class: "blocks" });
        const cols = 18, rows = 13, w = VB_W / cols, h = VB_H / rows;
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
          const b = svgEl("rect", { class: "blk", x: x * w - 0.25, y: y * h - 0.25, width: w + 0.5, height: h + 0.5 });
          const d = Math.hypot((x + 0.5) * w - VB_W / 2, (y + 0.5) * h - VB_H / 2) / MAX_D;
          const at = delay + 100 + d * SPREAD + Math.random() * 260;
          b.style.animationDelay = at + "ms";
          if (at + 440 > last) { last = at + 440; lastEl = b; }
          blocks.appendChild(b);
        }
        node.appendChild(blocks);
      }

      const hold = () => node.classList.toggle("held", document.hidden);
      document.addEventListener("visibilitychange", hold); hold();
      return new Promise(res => {
        const finish = () => {
          document.removeEventListener("visibilitychange", hold); node.classList.remove("held", "printing");
          if (blocks) blocks.remove();
          node.classList.add("lit");
          node.dispatchEvent(new Event("revealed"));
          res();
        };
        if (lastEl) lastEl.addEventListener("animationend", () => setTimeout(finish, 120), { once: true });
        else setTimeout(finish, last + 120);
      });
    }

    const ROUTES = (() => {
      const PHI = (1 + Math.sqrt(5)) / 2, TAU = Math.PI * 2, B = Math.log(PHI) / (Math.PI / 2), MAXR = Math.hypot(4, 4);
      const polar = (r, c) => [Math.hypot(r - 4, c - 4), Math.atan2(c - 4, 4 - r)];
      const spiral = (r, c, arms) => { const [rad, th] = polar(r, c); if (!rad) return 0; return ((th - Math.log(rad) / B) / TAU * arms % 1 + 1) % 1; };
      const fold = (r, c) => { let q = Math.min(r, 8 - r), p = Math.min(c, 8 - c); if (q > p) [q, p] = [p, q]; let k = 0; for (let a = 0; a < 5; a++) for (let b = a; b < 5; b++) { if (a === q && b === p) return k / 14; k++; } return 1; };
      return [
        { name: "bounce",        travel: 1000, back: true, phase: (r, c) => polar(r, c)[0] / MAXR },
        { name: "ring",          travel: 1000,             phase: (r, c) => polar(r, c)[0] / MAXR },
        { name: "golden spiral", travel: 1400,             phase: (r, c) => spiral(r, c, 1) },
        { name: "twin spiral",   travel: 1000,             phase: (r, c) => spiral(r, c, 2) },
        { name: "top to bottom", travel: 1100,             phase: (r) => r / 8 },
        { name: "bottom to top", travel: 1100,             phase: (r) => 1 - r / 8 },
        { name: "diagonal",      travel: 1200,             phase: (r, c) => (r + c) / 16 },
        { name: "sweep",         travel: 1400,             phase: (r, c) => ((polar(r, c)[1] / TAU) + 1) % 1 },
        { name: "fold",          travel: 1500,             phase: fold },
        { name: "sparkle",       travel: 2600,             phase: (r, c, ash) => ((ash[(r * 9 + c) % 32] * 31 + r * 7 + c * 13) % 256) / 255 },
        { name: "still",         travel: 0 },
      ];
    })();
    function lightSeal(node, ash) {
      const route = ROUTES[ash[5] % ROUTES.length];
      if (REDUCED || !route.travel) return route.name;
      for (const mark of node.querySelectorAll(".mark[data-rc]")) {
        if (!mark.firstChild) continue;
        const [r, c] = mark.dataset.rc.split(",").map(Number), ph = route.phase(r, c, ash);
        const delays = [ph * route.travel];
        if (route.back) delays.push(route.travel + (1 - ph) * route.travel);
        for (const at of delays) {
          const hot = mark.cloneNode(true);
          hot.setAttribute("class", "w"); hot.removeAttribute("data-rc");
          hot.style.animationDelay = Math.round(at) + "ms";
          mark.parentNode.appendChild(hot);
        }
      }
      return route.name;
    }

    function letGoSeal(node, ms = 60000) {
      const stand = Math.min(4000, ms * 0.1), span = ms - stand;
      let left = stand, mark = performance.now(), timer = null, going = false;
      let done; const finished = new Promise(res => { done = res; });

      const end = () => { document.removeEventListener("visibilitychange", onVis); node.classList.remove("held"); done(); };
      const fire = () => {
        going = true;
        if (REDUCED) { node.style.transition = "opacity 400ms ease"; node.style.opacity = "0"; setTimeout(end, 400); return; }
        node.classList.remove("lit");
        for (const p of node.__parts || []) {
          const d = spread(p);
          const at = p.__centre ? span + 400 : 200 + (1 - d) * span * 0.55 + Math.random() * span * 0.45;
          p.style.animationDelay = at + "ms";
          p.style.setProperty("--jx", ((Math.random() < 0.5 ? -1 : 1) * (1 + Math.random())).toFixed(1) + "px");
        }
        node.classList.add("gone");
        const cross = (node.__parts || []).find(p => p.__centre);
        if (cross) cross.addEventListener("animationend", end, { once: true }); else setTimeout(end, span + 400 + 420);
      };
      const arm = () => { mark = performance.now(); timer = setTimeout(fire, left); };
      const hold = () => { clearTimeout(timer); left -= performance.now() - mark; };
      const onVis = () => {
        if (going) { node.classList.toggle("held", document.hidden); return; }
        document.hidden ? hold() : arm();
      };
      document.addEventListener("visibilitychange", onVis);
      if (!document.hidden) arm();
      return finished;
    }

    const SCRAMBLE = "░▒▓█▀▄│─┼·";
    const DECAY = "█▓▒░";
    function reveal(final, el) {
      const lines = final.split("\n");
      const meta = [];
      const rows = lines.length, cols = Math.max(...lines.map(l => [...l].length));
      const cy = (rows - 1) / 2, cx = (cols - 1) / 2;
      const maxD = Math.sqrt(cy * cy + (cx / 2.4) ** 2);
      lines.forEach((line, r) => {
        [...line].forEach((ch, c) => {
          const d = Math.sqrt((r - cy) ** 2 + ((c - cx) / 2.4) ** 2) / maxD;
          const lock = 350 + d * 1250 + Math.random() * 140;
          meta.push({ final: ch, lock, seed: Math.random() });
        });
        if (r < lines.length - 1) meta.push({ final: "\n", lock: 0 });
      });
      const t0 = performance.now();
      return new Promise(res => {
        function tick() {
          const t = performance.now() - t0;
          let done = true, out = "";
          for (const m of meta) {
            if (m.final === "\n") { out += "\n"; continue; }
            if (t >= m.lock) { out += m.final; continue; }
            done = false;
            const left = m.lock - t;
            if (left > 420) out += "█";
            else if (left > 160) out += DECAY[Math.min(3, ((420 - left) / 87) | 0)];
            else out += SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0];
          }
          el.textContent = out;
          if (done) res(); else requestAnimationFrame(tick);
        }
        tick();
      });
    }
