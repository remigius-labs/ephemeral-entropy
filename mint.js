(function () {
  const CFG = { chainId: 1, contract: null, explorer: "https://etherscan.io", signUrl: null,
                price: "0x1b9ac619e7a000",
                selector: "0x47644e70" };
  if (window.EE_RELAY) CFG.signUrl = window.EE_RELAY + "/sign";
  window.EE_MINT = CFG;

  const pad = (h) => h.replace(/^0x/, "").padStart(64, "0");
  const encodeMint = (to, ash, blobHash, expiry, sig) => {
    const s = sig.replace(/^0x/, "");
    return CFG.selector + pad(to) + pad(ash) + pad(blobHash) + pad(expiry.toString(16)) +
      pad("a0") + pad((s.length / 2).toString(16)) + s.padEnd(Math.ceil(s.length / 64) * 64, "0");
  };

  async function index() {
    const url = window.EE_RELAY ? window.EE_RELAY + "/index.json" : "../index.json";
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error("no index");
    return r.json();
  }

  function short(a) { return a.slice(0, 6) + "…" + a.slice(-4); }
  function until(ts) { const d = Math.max(0, ts - Date.now() / 1000); return d < 3600 ? Math.floor(d / 60) + " min" : Math.floor(d / 3600) + " h"; }

  async function mint(ashHex, say) {
    const idx = await index().catch(() => null);
    const contract = (idx && idx.contract) || CFG.contract;
    const chainId = (idx && idx.chainId) || CFG.chainId;
    const k = await keyOf(ashHex), entry = idx && idx.seals.find((s) => s.key === k);
    if (!contract) return say("minting opens when the contract is live. 0.00777 ETH plus gas, one thousand ever.");
    if (!entry) return say("this Seal is not in blob space yet. cast it, wait a minute, come back.");
    if (entry.expiry * 1000 < Date.now()) return say("the network let this one go. it cannot be minted anymore.");
    if (!window.ethereum) return say("no wallet in this browser. open this link in a wallet app, or on desktop with one installed.");
    try {
      const [from] = await ethereum.request({ method: "eth_requestAccounts" });
      const want = "0x" + chainId.toString(16);
      const have = await ethereum.request({ method: "eth_chainId" });
      if (have !== want) await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: want }] });
      let signed = entry;
      if (!entry.sig || entry.to.toLowerCase() !== from.toLowerCase()) {
        if (!CFG.signUrl) return say("this Seal is signed for " + short(entry.to) + ". connect that wallet to mint it.");
        say("asking for a signature…");
        const r = await fetch(CFG.signUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ash: ashHex, to: from, payer: from }) });
        if (!r.ok) return say("the relayer would not sign this one. is the link yours?");
        signed = Object.assign({}, entry, await r.json());
      }
      const already = await mintedId(ashHex, contract, chainId);
      if (already) return say("minted already, Seal #" + already);
      say("confirm in your wallet");
      const tx = await ethereum.request({ method: "eth_sendTransaction", params: [{ from, to: contract, value: CFG.price, gas: "0x3f7a0",
        data: encodeMint(from, ashHex, signed.blobHash, signed.expiry, signed.sig) }] });
      say("minting… " + short(tx), (chainId === 11155111 ? "https://sepolia.etherscan.io" : CFG.explorer) + "/tx/" + tx);
      return tx;
    } catch (e) {
      const m = (e && e.message) || "";
      if (/AlreadyMinted|0x[0-9a-f]{8}/i.test(m) && /AlreadyMinted/i.test(m)) return say("someone minted this one first. it lives once.");
      if (e && e.code === 4001) return say("cancelled");
      return say("the wallet said no: " + m.slice(0, 120));
    }
  }
  async function watch(ashHex, el) {
    for (let n = 0; n < 360; n++) {
      const idx = await index().catch(() => null);
      const k = await keyOf(ashHex), e = idx && idx.seals.find((s) => s.key === k);
      if (e) {
        const d = new Date(e.expiry * 1000);
        el.textContent = "in blob space for 4096 epochs. the network lets it go on " + d.toISOString().slice(0, 10) + ". mint it before then, or don't. ";
        const a = document.createElement("a"); a.className = "link"; a.href = "../seal/#" + e.blobHash.replace(/^0x/, "0x"); a.textContent = "view blob"; el.appendChild(a);
        return e;
      }
      el.textContent = "sending to blob space" + ".".repeat(1 + (n % 3));
      await new Promise((r) => setTimeout(r, 10000));
    }
    el.textContent = "still not in blob space. the Seal lives in this link.";
  }
  const RPCS = { 1: "https://ethereum-rpc.publicnode.com", 11155111: "https://ethereum-sepolia-rpc.publicnode.com" };
  async function supply(el) {
    const idx = await index().catch(() => null);
    const contract = (idx && idx.contract) || CFG.contract; const chainId = (idx && idx.chainId) || CFG.chainId;
    if (!contract) { el.textContent = ""; return; }
    const tick = async () => {
      try {
        const r = await fetch(RPCS[chainId] || RPCS[1], { method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: contract, data: "0x18160ddd" }, "latest"] }) });
        const n = parseInt((await r.json()).result, 16) || 0; const max = 1000, left = max - n;
        const width = 24, filled = Math.round(width * n / max);
        el.textContent = "▓".repeat(filled) + "░".repeat(width - filled) + "  " + n + " minted · " + left + " left · 0.00777 ETH each";
      } catch { el.textContent = ""; }
    };
    tick(); setInterval(tick, 20000);
  }
  async function connect() {
    if (!window.ethereum) return null;
    try { const [a] = await ethereum.request({ method: "eth_requestAccounts" }); return a || null; } catch { return null; }
  }
  async function connected() {
    if (!window.ethereum) return null;
    try { const [a] = await ethereum.request({ method: "eth_accounts" }); return a || null; } catch { return null; }
  }
  if (window.ethereum && ethereum.on) ethereum.on("accountsChanged", (acc) => { const b = document.getElementById("connect"); if (b) b.textContent = acc[0] ? acc[0].slice(0, 6) + "…" + acc[0].slice(-4) : "connect wallet"; });
  async function lookup(ashHex) {
    const idx = await index().catch(() => null);
    const k = await keyOf(ashHex); return idx && idx.seals.find((s) => s.key === k) || null;
  }
  const RPC = { 1: "https://ethereum-rpc.publicnode.com", 11155111: "https://ethereum-sepolia-rpc.publicnode.com" };
  async function mintedId(ashHex, contract = null, chainId = null) {
    if (!contract) { const idx = await index().catch(() => null); contract = idx && idx.contract; chainId = (idx && idx.chainId) || CFG.chainId; }
    if (!contract) return 0;
    try {
      const r = await fetch(RPC[chainId] || RPC[1], { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: contract, data: "0x1f27eead" + ashHex.replace(/^0x/, "").padStart(64, "0") }, "latest"] }) });
      const j = await r.json(); return j.result ? parseInt(j.result, 16) : 0;
    } catch { return 0; }
  }
  const T0 = "0x807b7dcb943630e19161f7a18346259cc0bad4b22a396e833f25227f6a90502b";
  async function mintTx(id, contract, chainId) {
    const rpc = RPC[chainId] || RPC[1];
    const call = async (method, params) => { const r = await fetch(rpc, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) }); return (await r.json()).result; };
    try {
      let to = parseInt(await call("eth_blockNumber", []), 16);
      for (let w = 0; w < 24 && to > 0; w++) {
        const from = Math.max(0, to - 49000);
        const logs = await call("eth_getLogs", [{ address: contract, fromBlock: "0x" + from.toString(16), toBlock: "0x" + to.toString(16), topics: [T0, "0x" + id.toString(16).padStart(64, "0")] }]);
        if (logs && logs[0]) return logs[0].transactionHash;
        to = from - 1;
      }
    } catch {}
    return null;
  }
  async function keyOf(ashHex) {
    const b = Uint8Array.from(ashHex.replace(/^0x/, "").match(/../g).map(h => parseInt(h, 16)));
    return [...new Uint8Array(await crypto.subtle.digest("SHA-256", b))].map(x => x.toString(16).padStart(2, "0")).join("");
  }
  window.eeKey = keyOf;
  window.eeMint = mint; window.eeMintedId = mintedId; window.eeMintTx = mintTx;
  window.eeWatch = watch;
  window.eeLookup = lookup;
  window.eeConnect = connect;
  window.eeConnected = connected;
  window.eeSupply = supply;
})();
