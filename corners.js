(function () {
  const ds = (document.currentScript && document.currentScript.dataset) || {};
  const base = ds.base || "";
  const WRITE = ds.mode === "write", DEFER = "defer" in ds;
  const NOWRITE = WRITE || "nowrite" in ds;
  const here = location.pathname.replace(/\/index\.html$/, "/");
  const css = `
    .corner { position: fixed; top: 0.8rem; z-index: 6; font: 0.8rem 'JetBrains Mono', monospace; letter-spacing: 0.05em; color: #c4b5a0; background: transparent; border: 1px solid #6b5f52; padding: 0.3rem 0.9rem; text-decoration: none; cursor: pointer; opacity: 0; }
    .corner.ready { animation: corner-in 700ms ease-out forwards; }
    .corner:hover { background: #c4b5a0; color: #000; }
    .corner.here { border-color: #2a231e; color: #9a8d7c; }
    .corner-l, .corner-r { position: fixed; top: 0.8rem; z-index: 6; display: flex; flex-direction: column; gap: 0.45rem; }
    .corner-l { left: 1.2rem; align-items: stretch; } .corner-r { right: 1.2rem; align-items: stretch; }
    .corner-l .corner, .corner-r .corner { position: static; text-align: center; box-sizing: border-box;
      width: calc(10 * (1ch + 0.05em) + 1.8rem + 2px); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #nav-wallet.on { border-color: #2a231e; }
    .corner.empty { color: #5c5044; border-color: #2a231e; }
    .corner-gap { display: block; height: calc(0.6rem + 1.25em + 2px); }
    @keyframes corner-in { to { opacity: 1; } }
    @media (max-width: 640px) { .corner, .corner-r { display: none !important; } }`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  const isHere = (p) => here.endsWith("/ee/" + p) ? " here" : "";
  const wrap = document.createElement("div");
  wrap.innerHTML = `<div class="corner-l"><a class="corner${isHere("gallery/")}" id="nav-gallery" href="${base}gallery/">Gallery</a>${NOWRITE ? "" : `<a class="corner" id="nav-write" href="${base}write/">Write</a>`}</div>
    <div class="corner-r">${WRITE ? '<span class="corner-gap"></span>' : '<button type="button" class="corner" id="nav-wallet">Connect</button>'}<a class="corner${isHere("mine/")}" id="nav-mine" href="${base}mine/">My Seals</a></div>`;
  const mount = () => {
    document.body.prepend(...wrap.childNodes);
    const b = document.getElementById("nav-wallet") || document.createElement("button"), h1 = document.querySelector("h1");
    const short = (a) => a.slice(0, 6) + "…" + a.slice(-4);
    const ENS_UR = "0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe", ENS_RPC = "https://ethereum-rpc.publicnode.com";
    async function ensName(addr) {
      try {
        const x = addr.toLowerCase().replace(/^0x/, "");
        const data = "0x5d78a217" + "40".padStart(64, "0") + "3c".padStart(64, "0") + "14".padStart(64, "0") + x.padEnd(64, "0");
        const r = await fetch(ENS_RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: ENS_UR, data }, "latest"] }) });
        const hex = ((await r.json()).result || "").slice(2); if (!hex) return null;
        const off = parseInt(hex.slice(0, 64), 16) * 2, len = parseInt(hex.slice(off, off + 64), 16) * 2;
        return new TextDecoder().decode(Uint8Array.from(hex.slice(off + 64, off + 64 + len).match(/../g).map(h => parseInt(h, 16)))) || null;
      } catch { return null; }
    }
    const level = () => {
      if (!h1) return;
      const gap = document.querySelector(".corner-gap"), lead = document.querySelector(".corner-l .corner");
      if (gap && lead) gap.style.height = lead.offsetHeight + "px";
      const h = h1.getBoundingClientRect();
      document.querySelectorAll(".corner-l, .corner-r").forEach(c => { const first = c.firstElementChild; c.style.top = Math.max(8, h.top + (h.height - first.offsetHeight) / 2) + "px"; });
    };
    let label = "Connect", account = null;
    const hasSeals = () => { try { if (JSON.parse(localStorage.getItem("ee.mine") || "[]").length) return true; for (let i = 0; i < localStorage.length; i++) if ((localStorage.key(i) || "").startsWith("ee.ash.")) return true; } catch {} return false; };
    const mark = () => { const m = document.getElementById("nav-mine"); if (m) m.classList.toggle("empty", !account && !hasSeals()); };
    const show = async (a) => {
      account = a || null;
      if (!a) { label = "Connect"; b.textContent = label; b.classList.remove("on"); mark(); return; }
      mark();
      const n = await Promise.race([ensName(a), new Promise(r => setTimeout(() => r(null), 1500))]);
      if (account !== a) return;
      label = n || short(a); if (!b.matches(":hover")) b.textContent = label; b.classList.add("on"); level();
    };
    const mine = document.getElementById("nav-mine");
    mine.addEventListener("click", async (e) => {
      if (account || !window.ethereum || !window.eeConnect) return;
      e.preventDefault(); const href = mine.href;
      try { const a = await window.eeConnect(); if (a) await show(a); } catch {}
      location.href = href;
    });
    b.addEventListener("mouseenter", () => { if (account) b.textContent = "Disconnect"; });
    b.addEventListener("mouseleave", () => { b.textContent = label; });
    const settled = window.eeConnected ? window.eeConnected().then(show).catch(() => {}) : Promise.resolve();
    level(); addEventListener("resize", level);
    mark();
    const reveal = () => { level(); document.querySelectorAll(".corner").forEach(c => c.classList.add("ready")); };
    if (!DEFER) Promise.all([document.fonts.ready, settled]).then(reveal);
    window.eeCornersShow = async (draw, type) => {
      level(); const pills = [...document.querySelectorAll(".corner-l .corner, .corner-r .corner")];
      for (const p of pills) { p.style.opacity = "1"; p.style.color = "transparent"; p.style.borderColor = "transparent"; }
      await Promise.all(pills.map((p, i) => new Promise(r => setTimeout(r, i * 120)).then(() => draw ? draw(p, "#6b5f52", 420) : null)
        .then(() => { p.style.borderColor = ""; p.style.color = ""; if (type) type(p); })));
      const m = document.getElementById("nav-mine");
      if (m && WRITE) { m.textContent = "Saved ✓"; m.style.color = "#fff1dc"; setTimeout(() => { m.textContent = "My Seals"; m.style.color = ""; if (type) type(m); }, 2600); }
    };
    b.addEventListener("click", async () => {
      if (account) {
        try { await window.ethereum.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] }); } catch {}
        await show(null); dispatchEvent(new CustomEvent("ee-wallet", { detail: null })); return;
      }
      if (!window.ethereum) { b.textContent = "No browser wallet"; setTimeout(() => show(null), 2200); return; }
      const a = window.eeConnect ? await window.eeConnect() : null; await show(a);
      if (a) dispatchEvent(new CustomEvent("ee-wallet", { detail: a }));
    });
  };
  document.readyState === "loading" ? addEventListener("DOMContentLoaded", mount) : mount();
})();
