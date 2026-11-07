'use strict';
/* Item catalog: 100 unique designs for each of weapon · armor · accessory · relic · rune · gem · fashion (700 total).
   Each design has its own name, colours, icon motif, drop band and 1–2 signature stats; every copy rolls random stats
   (main value, number + kind + size of sub-stats, signature strength), so no two drops are the same.
   Designs also enter normal drops (≈45 % of eligible items). */
(function (G) {
  const U = G.U, D = G.D, S = G.S, UI = G.UI, E = G.E; const esc = UI.esc;
  const K = UI.ICONKIT, IC = UI.ICONS; if (!K || !IC) return;
  const R = U.seeded ? U.seeded(77031) : Math.random;
  const PRE = ['Dawn', 'Dusk', 'Storm', 'Ember', 'Frost', 'Soul', 'Star', 'Moon', 'Blood', 'Void', 'Sun', 'Thorn', 'Gale', 'Wyrm', 'Rune', 'Grave', 'Sky', 'Tide', 'Ash', 'Night', 'Iron', 'Dream', 'Thunder', 'Crystal', 'Shadow'];
  const PAL = [['#ffd8a0', '#ff8a3a', '#fff2c0', 'อรุณ'], ['#8a7ab0', '#ff7ab0', '#ffd0f0', 'สนธยา'], ['#c8d0ff', '#ffe04a', '#ffffff', 'พายุ'], ['#ffb060', '#ff3d1a', '#ffe08a', 'ถ่านเพลิง'], ['#d8f4ff', '#3a8aff', '#ffffff', 'น้ำแข็ง'],
    ['#b8f0e0', '#4ad6c8', '#e8fff8', 'วิญญาณ'], ['#fff2b0', '#6a5aff', '#ffffff', 'ดวงดาว'], ['#e0e6f0', '#9ab0ff', '#f4f8ff', 'จันทรา'], ['#d86a5a', '#8a0a1a', '#ffb0a0', 'โลหิต'], ['#3a2a50', '#e8e8ff', '#c84aff', 'ความว่าง'],
    ['#fff0a0', '#ffb020', '#ffffff', 'สุริยะ'], ['#7ac85a', '#2a6a2a', '#e8ff9a', 'หนาม'], ['#d8f0f8', '#7ad0e0', '#ffffff', 'ลมกรด'], ['#d8a060', '#5a8a2a', '#ffd84a', 'อสูรมังกร'], ['#c0c8ff', '#4a6aff', '#a0ffff', 'รูน'],
    ['#ece4cc', '#5a4a6a', '#a0ffa0', 'สุสาน'], ['#b0e0ff', '#ffffff', '#ffe8a0', 'นภา'], ['#6ac8d8', '#1a5a8a', '#c0ffff', 'กระแสน้ำ'], ['#a8a0a0', '#ff6a3a', '#ffd0a0', 'เถ้าถ่าน'], ['#3a3a6a', '#a06aff', '#e0c8ff', 'ราตรี'],
    ['#b4b4ac', '#5a6a7a', '#ffffff', 'เหล็กกล้า'], ['#f0c8ff', '#7a5aff', '#ffffff', 'ความฝัน'], ['#ffe880', '#4a5aff', '#ffffff', 'อสนี'], ['#d8f8ff', '#ff7ae0', '#ffffff', 'คริสตัล'], ['#5a5a7a', '#2a1a3a', '#ff5af5', 'เงามืด']];
  const SUFW = ['breaker', 'fang', 'song', 'reaver', 'bane', 'caller', 'edge', 'heart', 'whisper', 'fall'];
  const ARMN = { offhand: ['Aegis', 'Bulwark', 'Ward'], head: ['Helm', 'Crown', 'Visage'], chest: ['Plate', 'Vestment', 'Hauberk'], gloves: ['Gauntlets', 'Grasp', 'Wraps'], legs: ['Greaves', 'Tassets', 'Legwraps'], boots: ['Striders', 'Sabatons', 'Treads'] };
  const ACCN = { necklace: ['Pendant', 'Locket', 'Torque'], earring1: ['Earring', 'Stud', 'Hoop'], ring1: ['Signet', 'Band', 'Loop'], bracelet: ['Bangle', 'Cuff', 'Chain'], belt: ['Girdle', 'Sash', 'Cinch'], talisman: ['Talisman', 'Charm', 'Sigil'], brooch: ['Brooch', 'Clasp', 'Pin'], cloak: ['Mantle', 'Shroud', 'Cape'] };
  const RELN = ['Idol', 'Relic', 'Totem', 'Reliquary', 'Chalice', 'Horn', 'Orb', 'Tome', 'Mirror', 'Lantern'];
  const RUNN = ['Rune', 'Glyph', 'Sigil', 'Mark', 'Seal'];
  const GEMT = [['Ruby', '#ff4a5a', 'ruby'], ['Sapphire', '#4a7aff', 'sapphire'], ['Emerald', '#4ad070', 'emerald'], ['Topaz', '#ffd04a', 'topaz'], ['Amethyst', '#b04aff', 'amethyst'], ['Diamond', '#e0f8ff', 'diamond'], ['Opal', '#f0d8ff', 'diamond'], ['Garnet', '#a01a3a', 'ruby'], ['Onyx', '#3a3a4a', 'amethyst'], ['Pearl', '#fff6ea', 'diamond'],
    ['Jasper', '#c85a3a', 'ruby'], ['Citrine', '#ffb83a', 'topaz'], ['Peridot', '#a8e04a', 'emerald'], ['Moonstone', '#c8d8ff', 'sapphire'], ['Sunstone', '#ff9a3a', 'topaz'], ['Bloodstone', '#5a1a1a', 'ruby'], ['Aquamarine', '#6ae0e0', 'sapphire'], ['Tourmaline', '#ff6ab0', 'amethyst'], ['Spinel', '#ff3a7a', 'ruby'], ['Obsidian', '#2a1a3a', 'amethyst']];
  const POOL = D.SUB_POOL;
  const WEAP = [...new Set(D.CLASSES.map(c => c.weapon))].map(w => ({ w, cls: D.CLASSES.find(c => c.weapon === w).id }));
  const CAT = { weapon: [], armor: [], acc: [], relic: [], rune: [], gem: [] }; const BY = {}; const used = new Set(); // fashion keeps its original set const BY = {}; const used = new Set();
  const uniq = (fn) => { for (let k = 0; k < 400; k++) { const n = fn(k); if (!used.has(n)) { used.add(n); return n; } } return fn(0) + ' II'; };
  const sig2 = (i, n, avoid) => { const out = []; let k = (i * 5 + 3) % POOL.length; while (out.length < n) { const s = POOL[k % POOL.length]; if (s !== avoid && !out.includes(s)) out.push(s); k += 7; } return out; };
  const band = i => { const lo = 1 + Math.floor(i * 9 / 100); return [lo, Math.min(10, lo + 3)]; };
  const add = (cat, i, o) => { const [tmin, tmax] = band(i); const d = Object.assign({ id: cat[0] + cat[1] + i, cat, n: i, tmin, tmax, pal: (i * 7 + cat.length) % PAL.length, mot: (i * 3 + cat.length) % 8 }, o); d.pth = PAL[d.pal][3]; CAT[cat].push(d); BY[d.id] = d; };
  for (let i = 0; i < 100; i++) { const t = i % WEAP.length, k = Math.floor(i / WEAP.length); add('weapon', i, { w: WEAP[t].w, cls: WEAP[t].cls, slot: 'weapon', name: uniq(j => PRE[(k * 7 + t * 3 + j * 11) % 25] + SUFW[(t + k * 3 + j) % 10]), sig: sig2(i, 2) }); }
  const AS = Object.keys(ARMN); for (let i = 0; i < 100; i++) { const sl = AS[i % AS.length], k = Math.floor(i / AS.length); add('armor', i, { slot: sl, name: uniq(j => `${PRE[(k * 7 + (i % AS.length) * 3 + j * 4) % 25]} ${ARMN[sl][(k + j) % 3]}`), sig: sig2(i, 2) }); }
  const CS = Object.keys(ACCN); for (let i = 0; i < 100; i++) { const sl = CS[i % CS.length], k = Math.floor(i / CS.length); add('acc', i, { slot: sl, name: uniq(j => `${PRE[(k * 7 + (i % CS.length) * 3 + j * 4) % 25]} ${ACCN[sl][(k + j) % 3]}`), sig: sig2(i, 2) }); }
  for (let i = 0; i < 100; i++) { const r = D.RELICS[i % D.RELICS.length]; const nn = i % RELN.length; add('relic', i, { r: r.k, slot: 'relic', shape: nn, name: uniq(j => `${PRE[(i * 3 + j * 7) % 25]} ${RELN[(nn + j) % RELN.length]}`), sig: sig2(i, 1) }); }
  const RC = ['red', 'blue', 'green']; for (let i = 0; i < 100; i++) { const c = RC[i % 3]; add('rune', i, { color: c, name: uniq(j => `${RUNN[(Math.floor(i / 3) + j) % 5]} of ${PRE[(i * 4 + j * 3) % 25]}`), sig: sig2(i, 2) }); }
  for (let i = 0; i < 100; i++) { const g = GEMT[i % GEMT.length]; add('gem', i, { g: g[2], gc: g[1], stat: POOL[(i * 3 + Math.floor(i / 20)) % POOL.length], shape: Math.floor(i / 20) % 4, name: uniq(j => `${PRE[(Math.floor(i / 20) * 5 + i % 20 + j * 2) % 25]} ${g[0]}`) }); }
  // (fashion: original items only, no catalog)
  D.ITEM_CATALOG = CAT; D.ITEM_CAT_BY = BY;
  const KIND = { weapon: 'gear', armor: 'gear', acc: 'acc', relic: 'relic', rune: 'rune', gem: 'gem', fashion: 'fashion' };
  const keyOf = sl => sl === 'earring2' ? 'earring1' : sl === 'ring2' ? 'ring1' : sl;

  // ---------- random rolls ----------
  const rf = (a, b) => a + Math.random() * (b - a);
  const subRoll = (it, n, f, avoid) => { const pool = POOL.filter(s => !avoid.includes(s)); const out = []; while (out.length < n && pool.length) { const s = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]; const r = rf(0.45, 1.15); out.push({ s, v: S.statVal(s, it.ilv, it.tier, f * r), r }); } return out; };
  const apply = (it, d) => { it.cat = d.id; delete it.base; it.name = d.name; const rolls = [];
    if (d.cat === 'weapon') { it.wpn = d.w; }
    if (it.main && d.cat !== 'gem') { const r = rf(0.82, 1.22); it.main.v = D.PCT[it.main.s] ? Math.round(it.main.v * r * 10) / 10 : Math.round(it.main.v * r); rolls.push(r / 1.22); }
    if (d.cat === 'gem') { const r = rf(0.75, 1.3); it.main = { s: d.stat, v: S.statVal(d.stat, it.ilv, it.tier, 0.5 * r) }; it.gem = d.g; rolls.push(r / 1.3); }
    else if (d.cat === 'fashion') { it.colors = d.colors.slice(); it.fsub = [...d.sig, ...POOL.filter(s => !d.sig.includes(s)).sort(() => Math.random() - 0.5).slice(0, Math.random() < 0.5 ? 1 : 2)].map(s => { const r = rf(0.5, 1.2); rolls.push(r / 1.2); return [s, D.PCT[s] ? Math.round(r * (it.tier || 1) * 5) / 10 : Math.round(r * (it.tier || 1) * 2)]; }); }
    else { const avoid = [it.main && it.main.s, ...(d.sig || [])].filter(Boolean); const base = it.kind === 'relic' ? Math.max(1, (D.SUBS[it.tier - 1] || 1) - 1) : (D.SUBS[it.tier - 1] || 1); const n = base + (Math.random() < 0.4 ? 1 : 0);
      it.subs = subRoll(it, n, it.kind === 'rune' ? 0.24 : 0.36, avoid); it.subs.forEach(x => rolls.push(x.r / 1.15));
      for (const s of d.sig || []) { const r = rf(0.7, 1.35); it.subs.push({ s, v: S.statVal(s, it.ilv, it.tier, 0.3 * r), sig: true }); rolls.push(r / 1.35); } }
    it.q = Math.round(100 * rolls.reduce((a, b) => a + b, 0) / Math.max(1, rolls.length)); return it; };
  // ---------- generation ----------
  const gen0 = S.genItem;
  const spawn = (d, tier, ilv, o = {}) => { const kind = KIND[d.cat]; const it = gen0(kind, tier, ilv, Object.assign({}, o, { slot: d.slot, cls: d.cls || o.cls, relic: d.r, color: d.color, gem: d.g, noBase: true, noCat: true })); return apply(it, d); };
  S.genCatalog = (id, tier, ilv, o) => { const d = BY[id]; return d ? spawn(d, tier, ilv, o) : null; };
  S.genItem = (kind, tier, ilv, o = {}) => { const it = gen0(kind, tier, ilv, o);
    if (o.noCat || o.base || o.cset || o.wb || it.cset || it.wb || it.core || Math.random() > 0.45) return it;
    const cat = kind === 'gear' ? (it.slot === 'weapon' ? 'weapon' : 'armor') : kind; const list = CAT[cat]; if (!list) return it;
    let pool = list.filter(d => (d.slot == null || keyOf(it.slot) === d.slot) && (d.cat !== 'weapon' || d.w === it.wpn) && (d.cat !== 'rune' || d.color === it.color) && (d.cat !== 'relic' || d.r === it.relic) && (d.cat !== 'gem' || d.g === it.gem));
    const inB = pool.filter(d => it.tier >= d.tmin && it.tier <= d.tmax); if (inB.length) pool = inB; if (!pool.length) return it;
    return apply(it, pool[Math.floor(Math.random() * pool.length)]); };
  // fashion extra stats
  const ps0 = E.passiveStats; E.passiveStats = (u, s) => { if (ps0) ps0(u, s); const fa = u && u.fashion; if (!fa) return; for (const it of Object.values(fa)) { if (!it || !it.fsub) continue; for (const [k, v] of it.fsub) { if (k === 'atkP') s.atk *= 1 + v / 100; else if (k === 'defP') s.def *= 1 + v / 100; else if (k === 'hpP') s.hp *= 1 + v / 100; else if (k === 'atk' || k === 'def' || k === 'hp') s[k] = (s[k] || 0) + v * (k === 'hp' ? 50 : 10); else s[k] = (s[k] || 0) + v; } } };

  // ---------- icons ----------
  const sh = (c, f) => U.shade ? U.shade(c, f) : c;
  const MOT = [() => { }, (k, m, a, g) => { k.C(24, 24, 3, g); k.R(23, 23, 1, 1, '#ffffff'); }, (k, m, a, g) => { for (const [x, y] of [[4, 4], [27, 4], [4, 27]]) k.P([[x, y - 3], [x + 2, y], [x, y + 3], [x - 2, y]], a); },
    (k, m, a, g) => { k.P([[26, 20], [31, 14], [30, 22], [27, 24]], g); k.P([[6, 20], [1, 14], [2, 22], [5, 24]], g); }, (k, m, a, g) => { k.L(3, 28, 7, 24, 1, a); k.L(25, 3, 29, 7, 1, a); k.R(26, 26, 3, 3, g); },
    (k, m, a, g) => { k.A(16, 16, 14, 0.2, 1.2, 1, a); k.A(16, 16, 14, 3.3, 4.3, 1, a); }, (k, m, a, g) => { k.C(6, 6, 2, g); k.C(26, 6, 1.5, g); k.C(26, 26, 2, a); }, (k, m, a, g) => { k.L(2, 30, 30, 2, 1, g); k.C(16, 16, 2, '#ffffff'); }];
  const RELSH = [IC.ARM.relic, IC.ARM.talisman, IC.W.orb, IC.W.tome, IC.ARM.necklace, IC.W.hourglass, IC.W.prism, IC.W.book, IC.ARM.brooch, IC.W.scepter].map(f => f || IC.ARM.relic);
  const icon0 = UI.itemIcon;
  UI.itemIcon = (it) => { const d = it && it.cat && BY[it.cat]; if (!d) return icon0(it);
    if (d.cat === 'fashion') return icon0(Object.assign({}, it, { cat: null, colors: d.colors }));
    const t = U.clamp((it.tier || 1) - 1, 0, 9); const [m, a, g] = PAL[d.pal];
    return K.make('Q' + d.id + t, k => {
      if (d.cat === 'weapon') (IC.W[d.w] || IC.W.sword)(k, m, a);
      else if (d.cat === 'armor' || d.cat === 'acc') (IC.ARM[d.slot] || IC.ARM.chest)(k, m, a);
      else if (d.cat === 'relic') RELSH[d.shape](k, m, a);
      else if (d.cat === 'rune') { IC.runeIcon(k, D.RUNE_COLORS[d.color].c, false); k.C(16, 16, 3, a); }
      else if (d.cat === 'gem') { const c = d.gc; if (d.shape === 0) IC.gemIcon(k, c); else if (d.shape === 1) { k.C(16, 16, 12, sh(c, -0.3)); k.C(16, 16, 9, c); k.C(13, 12, 3, sh(c, 0.5)); } else if (d.shape === 2) { k.P([[16, 3], [27, 10], [27, 22], [16, 29], [5, 22], [5, 10]], sh(c, -0.25)); k.P([[16, 7], [23, 12], [23, 20], [16, 25], [9, 20], [9, 12]], c); k.R(12, 10, 3, 3, '#ffffff'); } else { k.P([[16, 2], [24, 16], [16, 30], [8, 16]], c); k.P([[16, 2], [24, 16], [16, 16]], sh(c, 0.35)); k.P([[16, 16], [24, 16], [16, 30]], sh(c, -0.35)); } }
      MOT[d.mot](k, m, a, g);
    }, { spark: K.sparkFor(t + 1) }); };
  const det0 = UI.itemDetail; UI.itemDetail = (it, actions) => { let h = det0(it, actions); const d = it && it.cat && BY[it.cat]; if (!d) return h;
    const extra = d.cat === 'fashion' && it.fsub ? `<div>ค่าสุ่มพิเศษ: ${it.fsub.map(([k, v]) => `${esc(D.STAT_TH[k] || k)} +${D.PCT[k] ? v + '%' : v * (k === 'hp' ? 50 : 10)}`).join(' · ')}</div>` : '';
    return h.replace('<div class="iact">', `<div class="iset"><b>${esc(d.name)} · แบบที่ ${d.n + 1}/100 (${esc(CATTH[d.cat])})</b><div>ธีม${esc(d.pth)}${d.sig ? ` · ค่าประจำแบบ: ${d.sig.map(s => esc(D.STAT_TH[s] || s)).join(', ')}` : ''}${d.stat ? ` · ค่าหลัก: ${esc(D.STAT_TH[d.stat] || d.stat)}` : ''} · ดรอประดับ ${d.tmin}–${d.tmax}</div>${extra}<div>คุณภาพการสุ่ม <b style="color:${it.q >= 85 ? '#e0a020' : it.q >= 70 ? '#4a9a4a' : '#6a7a9a'}">${it.q || '-'}%</b></div></div><div class="iact">`); };
  const CATTH = { weapon: 'อาวุธ', armor: 'เกราะ', acc: 'เครื่องประดับ', relic: 'Relic', rune: 'รูน', gem: 'เจม', fashion: 'แฟชั่น' };

  // ---------- GM: each category lists its 100 designs ----------
  const gmR = UI.gmRender; UI.gmRender = (tab, P) => { let h = gmR(tab, P); if (tab !== 'item') return h;
    for (const c in CAT) h = h.replace(new RegExp(`(data-v="${c}"><img [^>]*>)([^<]*)(</button>)`), (all, a, n, b) => `${a}${n.replace(/ \d+$/, '')} ${CAT[c].length}${b}`);
    const c = P.gcat; if (!CAT[c]) return h; const t = P.gt || 10; const cls = S.save && S.save.cls;
    const cells = CAT[c].map(d => `<button class="gcell" data-act="gm" data-c="gmcat" data-k="${d.id}" title="${esc(d.name)} · ธีม${esc(d.pth)} · ดรอประดับ ${d.tmin}–${d.tmax}"><div class="icell t${t}"><img src="${UI.itemIcon({ cat: d.id, tier: t, kind: KIND[d.cat], slot: d.slot, colors: d.colors })}" alt=""></div><span>${esc(d.name)}</span></button>`).join('');
    return h.replace(/<div class="gmgrid">[\s\S]*?<\/div>\s*(\$\{|<button class="btn" data-act="gm" data-c="gmsrall"|<h4>ชุดด่วน)/, (all, tail) => `<p class="muted">${CATTH[c]} ${CAT[c].length} แบบ — ทุกชิ้นสุ่มค่าพลังใหม่ไม่ซ้ำกัน (ค่าหลัก ±20% · จำนวนและชนิดค่ารอง · ค่าประจำแบบ) · ดรอปจากมอนสเตอร์ได้ด้วย</p><div class="gmgrid">${cells}</div>${tail}`); };
  const gmC = UI.gmCmd; UI.gmCmd = (c, el) => { const P = UI.panel;
    if (c === 'gmcat') { const d = BY[el.dataset.k]; if (!d) return; const iv = document.getElementById('gmilv2'); const ilv = iv ? U.clamp(+iv.value || 100, 1, 100) : (P.gilv || 100); const n = P.gn || 1; let last;
      for (let i = 0; i < n; i++) { last = spawn(d, d.cat === 'fashion' ? 10 : (P.gt || 10), ilv, { pvp: true, theme: P.gth }); S.addItem(last, true); }
      UI.toast(`GM: ได้รับ ${last.name}${n > 1 ? ' ×' + n : ''} · คุณภาพ ${last.q}%`, 'item', last.tier); return; }
    return gmC(c, el); };
})(window.G);
