(function () {
  const KEY = "ee.mine";
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
  const write = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {} };
  function migrate() {
    const list = read(), have = new Set(list.map(r => r.blobHash));
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i); if (!k || !k.startsWith("ee.ash.")) continue;
        const blobHash = k.slice(7).toLowerCase(), ash = localStorage.getItem(k);
        if (/^0x01[0-9a-f]{62}$/.test(blobHash) && /^[0-9a-f]{64}$/.test(ash) && !have.has(blobHash)) { list.push({ blobHash, ash, savedAt: 0 }); have.add(blobHash); }
      }
    } catch {}
    write(list); return list;
  }
  function add(r) {
    if (!r || !r.blobHash || !/^[0-9a-f]{64}$/i.test(r.ash || "")) return;
    const list = read(), blobHash = r.blobHash.toLowerCase(), i = list.findIndex(x => x.blobHash === blobHash);
    const rec = { blobHash, ash: r.ash.toLowerCase(), block: r.block || null, tx: r.tx || null, savedAt: Math.floor(Date.now() / 1000) };
    if (i >= 0) list[i] = Object.assign(list[i], Object.fromEntries(Object.entries(rec).filter(([k, v]) => v && k !== "savedAt")));
    else list.push(rec);
    write(list);
  }
  window.EEMine = { all: () => migrate(), add };
})();
