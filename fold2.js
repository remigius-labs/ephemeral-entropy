(function (root) {
  "use strict";
  const ORDER = "◦✧◇○▯✛◯☉✦□⊙✚▣◈⚉◘◆◉◙●■";
  const ENTRIES = [
  { k: "fam4", g: "◤◥◣◢" },
  { k: "self", g: "◦" },
  { k: "fam4", g: "◰◳◱◲" },
  { k: "self", g: "✧" },
  { k: "fam4", g: "◸◹◺◿" },
  { k: "self", g: "◇" },
  { k: "fam4", g: "⌜⌝⌞⌟" },
  { k: "row", g: "◂▸" },
  { k: "self", g: "○" },
  { k: "self", g: "▯" },
  { k: "self", g: "✛" },
  { k: "row", g: "≺≻" },
  { k: "self", g: "◯" },
  { k: "self", g: "☉" },
  { k: "self", g: "✦" },
  { k: "row", g: "⬖⬗" },
  { k: "self", g: "□" },
  { k: "self", g: "⊙" },
  { k: "self", g: "✚" },
  { k: "col", g: "▴▾" },
  { k: "self", g: "▣" },
  { k: "self", g: "◈" },
  { k: "col", g: "∧∨" },
  { k: "self", g: "⚉" },
  { k: "self", g: "◘" },
  { k: "self", g: "◆" },
  { k: "self", g: "◉" },
  { k: "self", g: "◙" },
  { k: "self", g: "●" },
  { k: "col", g: "⬘⬙" },
  { k: "self", g: "■" }
  ];
  const WEIGHT = { "◤◥◣◢": 15, "⌜⌝⌞⌟": 5, "◸◹◺◿": 10, "◰◳◱◲": 50, "▴▾": 10, "◂▸": 10, "⬘⬙": 45, "⬖⬗": 45, "∧∨": 30, "≺≻": 30 };
  const TWIN = { "▴": "◂", "◂": "▴", "▾": "▸", "▸": "▾", "⬘": "⬖", "⬖": "⬘", "⬙": "⬗", "⬗": "⬙", "∧": "≺", "≺": "∧", "∨": "≻", "≻": "∨" };
  const GROUPS = { circles: "○●◦◯◉☉⚉⊙◘◙◖◗", squares: "■□▣▯◰◳◱◲⬒⬓⬘⬙⬖⬗◆◇◈", crosses: "✚✛✦✧", corners: "◤◥◣◢◸◹◺◿⌜⌝⌞⌟", pointers: "◂▸▲▼△▽▴▾❮❯❰❱≺≻∧∨⋏⋎⋐⋑∈∋⊓⊔⊤⊥⍎⍕∪⋂∴∵⋃╼╾⦇⦈" };
  const MOTIFS = Object.keys(GROUPS);
  const PROFILES = { core: [12, 38, 64, 90], edge: [90, 64, 38, 12], band: [20, 85, 55, 25], flat: [50, 50, 50, 50] };
  const WEIGHTS = Object.keys(PROFILES);
  const HEARTS = ["pointers", "circles", "empty", "plus", "x", "heavy", "light"];
  const SHAPE = { 0: 1000, 1: 968, 2: 951, 4: 922, 5: 910, 8: 878, 9: 868, 10: 859, 13: 833, 16: 809, 17: 801, 18: 794, 20: 779, 25: 744, 32: 700 };
  const CENTER = "✠", BLANK = "\u2800", FALLBACK = "◇";

  const wOf = (e) => e.k === "self" ? ORDER.indexOf(e.g) * 5 : WEIGHT[e.g];
  const groupOf = (e) => MOTIFS.find(k => GROUPS[k].includes([...e.g][0])) || "other";
  function cellValue(ash, r, c) {
    const i = r * 5 + c, base = (ash[i] * 131 + ash[(i + 7) % 32]) % 256;
    const shaped = Math.floor(base * SHAPE[(r - 4) * (r - 4) + (c - 4) * (c - 4)] / 1000);
    const jitter = ((ash[(i + 13) % 32] ^ ash[(i + 19) % 32]) * 97 + ash[(i + 29) % 32]) % 256;
    return Math.min(255, Math.floor((shaped + jitter) / 2));
  }
  function charFor(ash) {
    return { weight: WEIGHTS[ash[0] & 3], sparse: (ash[1] % 4) === 0, motif: MOTIFS[ash[2] % MOTIFS.length], anchors: !!(ash[3] & 1), twice: (ash[4] % 8) === 0, heart: HEARTS[ash[6] % HEARTS.length] };
  }
  const charLabel = (ch) => ["heart " + ch.heart, ch.weight, ch.sparse ? "sparse" : "full", ch.motif, ch.anchors ? "anchors" : "even", ch.twice ? "one double" : "no doubles"].join(" · ");
  function member(e, r, c) {
    if (e.k === "self") return e.g;
    const m = [...e.g];
    if (e.k === "fam4") return m[(r < 4 ? 0 : 2) + (c < 4 ? 0 : 1)];
    if (e.k === "row") return m[c < 4 ? 0 : 1];
    return m[r < 4 ? 0 : 1];
  }
  function flipDiag(e, g) {
    if (e.k === "self") return g;
    if (e.k === "fam4") { const m = [...e.g]; return m[[0, 2, 1, 3][m.indexOf(g)]]; }
    return TWIN[g] || g;
  }
  function quarter(ash) {
    const ch = charFor(ash), target = PROFILES[ch.weight];
    const ent = Array.from({ length: 5 }, () => Array(5).fill(null));
    const used = {}; let doubled = false;
    for (let r = 0; r < 5; r++) for (let c = r; c < 5; c++) {
      if (r === 4 && c === 4) { ent[r][c] = { k: "self", g: CENTER }; continue; }
      const i = r * 5 + c, d = Math.max(4 - r, 4 - c), z = 4 - d, b = ash[(i + 5) % 32], axis = r === 4 || c === 4;
      if (d === 1 && (ch.heart === "empty" || (ch.heart === "plus" && !axis) || (ch.heart === "x" && axis))) { ent[r][c] = { k: "self", g: BLANK }; continue; }
      if (d !== 1 && ch.sparse && (b & 3) === 0) { ent[r][c] = { k: "self", g: BLANK }; continue; }
      const cand = ENTRIES.filter(e => {
        if (e.k === "fam4" && axis) return false;
        if (e.k === "row" && c === 4) return false; if (e.k === "col" && r === 4) return false;
        if (r === c && (e.k === "row" || e.k === "col")) return false;
        const n = used[e.g] || 0; return n === 0 || (n === 1 && ch.twice && !doubled);
      });
      if (!cand.length) { ent[r][c] = { k: "self", g: FALLBACK }; continue; }
      const wantMotif = ((b >> 2) % 9) < 5;
      const inM = cand.filter(e => groupOf(e) === ch.motif), outM = cand.filter(e => groupOf(e) !== ch.motif);
      let pool = wantMotif ? (inM.length ? inM : cand) : (outM.length ? outM : cand);
      let t = target[z];
      if (ch.anchors && d === 4 && ((r === 0 && c === 0) || c === 4)) t = ch.weight === "edge" ? 2 : 98;
      if (d === 1) {
        if (ch.heart === "circles") { const cc = cand.filter(e => groupOf(e) === "circles"); if (cc.length) pool = cc; }
        if (ch.heart === "pointers" && axis) { const pp = cand.filter(e => groupOf(e) === "pointers"); if (pp.length) pool = pp; }
        if (ch.heart === "heavy") t = 98; if (ch.heart === "light") t = 2;
      }
      pool = pool.slice().sort((a, b2) => Math.abs(wOf(a) - t) - Math.abs(wOf(b2) - t));
      const K = Math.min(pool.length, 6), pick = pool[Math.floor(cellValue(ash, r, c) * K / 256)];
      ent[r][c] = pick; used[pick.g] = (used[pick.g] || 0) + 1; if (used[pick.g] === 2) doubled = true;
    }
    return ent;
  }
  function grid(ash) {
    const ent = quarter(ash);
    const mem = (e, r, c) => e.g === BLANK ? BLANK : member(e, r, c);
    const cellAt = (r, c) => {
      const qr = Math.min(r, 8 - r), qc = Math.min(c, 8 - c);
      if (qr <= qc) return mem(ent[qr][qc], r, c);
      const e = ent[qc][qr]; return e.g === BLANK ? BLANK : flipDiag(e, mem(e, c, r));
    };
    return Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, c) => cellAt(r, c)));
  }
  const rows = (ash) => grid(ash).map(row => row.join("  "));
  const RULE_TOP = "╔══╦═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═╦══╗", RULE_BOTTOM = "╚══╩═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═╩══╝";
  const framed = (ash) => [RULE_TOP, ...rows(ash).map(r => "║  " + r + "  ║"), RULE_BOTTOM];
  const seal = (ash) => framed(ash).join("\n");

  root.FOLD2 = { VERSION: 2, BLANK, CENTER, ORDER, ENTRIES, WEIGHT, TWIN, GROUPS, PROFILES, HEARTS, SHAPE, cellValue, charFor, charLabel, member, flipDiag, quarter, grid, rows, framed, seal };
})(typeof globalThis !== "undefined" ? globalThis : this);
