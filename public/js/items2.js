'use strict';
(function (init) {
  (globalThis.ASHFALL_SIM_FACTORIES ||= {})['items2'] = init;
  if (typeof window !== 'undefined') init(window.G);
})(function (G) {
  const document = G.headless ? G.platform.document : globalThis.document;
  const window = G.headless ? G.platform.window : globalThis.window;
  const Image = G.headless ? G.platform.Image : globalThis.Image;
  const localStorage = G.headless ? G.platform.localStorage : globalThis.ASHFALL_STORAGE;
  const setTimeout = G.headless ? G.platform.setTimeout : globalThis.setTimeout;
  const setInterval = G.headless ? G.platform.setInterval : globalThis.setInterval;
  const addEventListener = G.headless ? (() => {}) : globalThis.addEventListener;
'use strict';
/* 500 named item bases (gear / accessories / runes): 20 materials × slot designs, each with own look, tier band and signature bonus */
(function (G) {
  const U = G.U, D = G.D, S = G.S, UI = G.UI;
  const MATS = [
    ['Iron', 'เหล็ก', '#b4b4ac', '#7a6a5a'], ['Oak', 'โอ๊ก', '#b08a5a', '#5ac84a'], ['Bronze', 'สำริด', '#d8a060', '#a85a2a'], ['Silver', 'เงิน', '#e0e6f0', '#6a9ae0'],
    ['Jade', 'หยก', '#8ae0b0', '#1f8a5a'], ['Bone', 'กระดูก', '#ece4cc', '#8a4a3a'], ['Ember', 'ถ่านเพลิง', '#ffb060', '#ff3d1a'], ['Frost', 'น้ำค้างแข็ง', '#c8f0ff', '#3a8aff'],
    ['Storm', 'พายุ', '#c8d0ff', '#ffe04a'], ['Obsidian', 'ออบซิเดียน', '#5a4a6a', '#c84aff'], ['Serpent', 'อสรพิษ', '#7ac85a', '#e8c04a'], ['Crystal', 'คริสตัล', '#d8f8ff', '#ff7ae0'],
    ['Shadow', 'เงา', '#6a6a8a', '#a06aff'], ['Radiant', 'รัศมี', '#fff2b0', '#ffb020'], ['Dragonscale', 'เกล็ดมังกร', '#d86a5a', '#ffd84a'], ['Mythril', 'มิธริล', '#c0f0f0', '#4ad6c8'],
    ['Abyssal', 'ห้วงลึก', '#4a3a6a', '#ff5af5'], ['Celestial', 'สวรรค์', '#f4f8ff', '#9ad8ff'], ['Chrono', 'กาลเวลา', '#e8d8a8', '#4ae0ff'], ['Void', 'ความว่าง', '#2a2440', '#e8e8ff']
  ];
  const BEAST = ['Wolf', 'Raven', 'Lion', 'Serpent', 'Bear', 'Hawk', 'Stag', 'Viper', 'Tiger', 'Owl', 'Boar', 'Crane', 'Fox', 'Mantis', 'Drake', 'Kraken', 'Phoenix', 'Griffin', 'Wyrm', 'Leviathan'];
  // gear: 2 designs per slot × 20 materials = 280 · acc: 1 design × 8 slots × 20 = 160 · runes: 3 colours × 20 = 60  → 500
  const GEARN = { weapon: [null, 'of the {B}'], offhand: ['Aegis', 'Ward'], head: ['Helm', 'Circlet'], chest: ['Cuirass', 'Robe'], gloves: ['Gauntlets', 'Grips'], legs: ['Greaves', 'Leggings'], boots: ['Sabatons', 'Treads'] };
  const ACCN = { necklace: 'Pendant', earring1: 'Earring', ring1: 'Signet', bracelet: 'Bangle', belt: 'Girdle', talisman: 'Talisman', brooch: 'Brooch', cloak: 'Mantle' };
  const RUNEN = { red: 'Rune of Fury', blue: 'Rune of Bastion', green: 'Rune of Flow' };
  const BONUS = ['atk', 'def', 'hp', 'crit', 'critDmg', 'aspd', 'cdr', 'spd', 'ls', 'dr', 'ccRes', 'atkP', 'defP', 'hpP', 'elem', 'regen'];
  const band = i => { const lo = U.clamp(1 + Math.floor(i / 2.2), 1, 10); return [lo, U.clamp(lo + 3, 1, 10)]; };
  const B = []; const add = o => { o.id = 'b' + B.length; B.push(o); };
  MATS.forEach((m, mi) => {
    const [tmin, tmax] = band(mi);
    for (const [slot, ns] of Object.entries(GEARN)) ns.forEach((nn, st) => add({ kind: 'gear', slot, mat: mi, style: st, orn: (mi + st * 3 + slot.length) % 6, tmin, tmax, noun: nn, beast: BEAST[(mi * 7 + st * 3) % 20] }));
    for (const [slot, nn] of Object.entries(ACCN)) add({ kind: 'acc', slot, mat: mi, style: 0, orn: (mi + slot.length) % 6, tmin, tmax, noun: nn });
    for (const [c, nn] of Object.entries(RUNEN)) add({ kind: 'rune', color: c, mat: mi, style: 0, orn: (mi + c.length) % 6, tmin, tmax, noun: nn });
  });
  B.forEach((b, i) => { const st = BONUS[(U.hash(b.id) + i) % BONUS.length]; b.bonus = st; const m = MATS[b.mat]; b.matN = m[0]; b.matTh = m[1]; });
  D.ITEM_BASES = B; D.ITEM_MATS = MATS;
  const nameOf = (b, cls) => b.slot === 'weapon' ? `${b.matN} ${S.weaponName(cls)}${b.style ? ' ' + b.noun.replace('{B}', b.beast) : ''}` : `${b.matN} ${b.noun}`;
  const keyOf = sl => sl === 'earring2' ? 'earring1' : sl === 'ring2' ? 'ring1' : sl;

  // ---------- generation hook ----------
  const gen0 = S.genItem;
  S.genItem = (kind, tier, ilv, o = {}) => {
    const it = gen0(kind, tier, ilv, o); if (o.noBase) return it;
    if (!((kind === 'gear' || kind === 'acc') || (kind === 'rune' && !it.core))) return it;
    let pool = B.filter(b => b.kind === kind && (kind === 'rune' ? b.color === it.color : b.slot === keyOf(it.slot)));
    if (o.base) { const f = B.find(b => b.id === o.base); if (f) pool = [f]; }
    const inBand = pool.filter(b => it.tier >= b.tmin && it.tier <= b.tmax); const cands = o.base ? pool : inBand.length ? inBand : pool.slice().sort((a, c) => Math.abs(a.tmin - it.tier) - Math.abs(c.tmin - it.tier)).slice(0, 3); const b = cands.length ? U.pick(cands) : null;
    if (!b) return it;
    if (kind !== 'rune' && b.slot !== keyOf(it.slot)) return it;
    it.base = b.id; const cls = o.cls || (S.save && S.save.cls) || 'blademaster'; const setN = it.set ? ((kind === 'gear' ? D.GEAR_SETS : kind === 'acc' ? D.ACC_SETS : D.RUNE_SETS).find(x => x.k === it.set) || {}).n : null;
    it.name = (setN && kind !== 'rune' ? setN + ' ' : '') + nameOf(b, cls) + (kind === 'rune' && setN ? ` (${setN})` : '');
    const bv = S.statVal(b.bonus, it.ilv, it.tier, 0.25); it.subs = (it.subs || []).concat([{ s: b.bonus, v: bv, sig: true }]);
    return it;
  };

  // ---------- icons: material colours + design + ornament ----------
  const K = UI.ICONKIT, IC = UI.ICONS;
  const ALT = {
    offhand: (k, m, a) => { k.C(16, 16, 12, m); k.C(16, 16, 8, a); k.C(16, 16, 4, m); k.R(15, 4, 2, 24, a); },
    head: (k, m, a) => { k.A(16, 18, 11, 3.3, 6.1, 4, m); k.P([[16, 3], [20, 10], [16, 14], [12, 10]], a); k.C(8, 13, 2, a); k.C(24, 13, 2, a); },
    chest: (k, m, a) => { k.P([[10, 3], [22, 3], [27, 12], [24, 14], [27, 29], [5, 29], [8, 14], [5, 12]], m); k.P([[13, 3], [19, 3], [16, 12]], a); k.R(8, 18, 16, 2, a); k.R(15, 20, 2, 9, a); },
    gloves: (k, m, a) => { k.R(9, 10, 13, 14, m); k.R(9, 5, 3, 7, m); k.R(13, 4, 3, 8, m); k.R(17, 5, 3, 7, m); k.R(9, 20, 13, 3, a); k.C(15, 15, 2, a); },
    legs: (k, m, a) => { k.R(8, 4, 16, 4, a); k.P([[8, 8], [15, 8], [14, 29], [9, 29]], m); k.P([[17, 8], [24, 8], [23, 29], [18, 29]], m); k.R(9, 16, 5, 2, a); k.R(18, 16, 5, 2, a); },
    boots: (k, m, a) => { k.P([[10, 6], [17, 6], [18, 22], [28, 24], [28, 29], [9, 29]], m); k.P([[8, 4], [19, 4], [17, 8], [10, 8]], a); k.L(12, 12, 16, 18, 1, a); }
  };
  const ORN = [
    () => {},
    (k, m, a) => { k.C(24, 24, 3, a); k.R(23, 23, 1, 1, '#ffffff'); },
    (k, m, a) => { for (const [x, y] of [[4, 4], [27, 4], [4, 27]]) k.P([[x, y - 3], [x + 2, y], [x, y + 3], [x - 2, y]], a); },
    (k, m, a) => { k.P([[26, 20], [31, 14], [30, 22], [27, 24]], '#f0f4ff'); k.P([[6, 20], [1, 14], [2, 22], [5, 24]], '#f0f4ff'); },
    (k, m, a) => { k.L(3, 28, 7, 24, 1, a); k.L(25, 3, 29, 7, 1, a); k.R(26, 26, 3, 3, a); },
    (k, m, a) => { k.A(16, 16, 14, 0.2, 1.2, 1, a); k.A(16, 16, 14, 3.3, 4.3, 1, a); }
  ];
  const icon0 = UI.itemIcon;
  UI.itemIcon = (it) => {
    if (!it || !it.base) return icon0(it); const b = B.find(x => x.id === it.base); if (!b) return icon0(it);
    const [, , m, a] = MATS[b.mat]; const t = U.clamp((it.tier || 1) - 1, 0, 9); const w = it.wpn || (S.save && D.CLS[S.save.cls] ? D.CLS[S.save.cls].weapon : 'sword');
    return K.make('B' + b.id + (b.slot === 'weapon' ? w : '') + (t >= 7 ? t : ''), k => {
      if (b.kind === 'rune') { IC.runeIcon(k, D.RUNE_COLORS[b.color].c, false); k.C(16, 16, 3, a); }
      else if (b.slot === 'weapon') { (IC.W[w] || IC.W.sword)(k, m, a); if (b.style) k.C(9, 23, 2, a); }
      else if (b.style && ALT[b.slot]) ALT[b.slot](k, m, a);
      else (IC.ARM[b.slot] || IC.ARM.chest)(k, m, a);
      ORN[b.orn](k, m, a);
    }, { spark: K.sparkFor(t + 1) });
  };
  // detail: show signature bonus + base info
  const det0 = UI.itemDetail;
  UI.itemDetail = (it, actions) => { let h = det0(it, actions); if (it && it.base) { const b = B.find(x => x.id === it.base); if (b) h = h.replace('<div class="iact">', `<div class="iset"><b>วัสดุ ${esc(b.matTh)} (${esc(b.matN)})</b><div>ค่าพิเศษประจำแบบ: ${esc(D.STAT_TH[b.bonus] || b.bonus)} · ดรอประดับ ${b.tmin}–${b.tmax} · แบบที่ ${+b.id.slice(1) + 1}/${B.length}</div></div><div class="iact">`); } return h; };
  const esc = UI.esc;

  // ---------- GM: browse all 500 bases ----------
  const gmR = UI.gmRender;
  UI.gmRender = (tab, P) => {
    let h = gmR(tab, P); if (tab !== 'item') return h;
    h = h.replace('<div class="gmcats">', `<div class="gmcats"><button class="gcat ${P.gcat === 'bases' ? 'on' : ''}" data-act="gm" data-c="gmset" data-f="gcat" data-v="bases"><img src="${UI.itemIcon({ kind: 'gear', slot: 'chest', tier: 9, base: 'b' + (19 * 25 + 6) })}" alt="">แบบไอเทม ${B.length}</button>`);
    if (P.gcat !== 'bases') return h;
    P.bslot = P.bslot || 'weapon'; const slots = [...Object.keys(GEARN), ...Object.keys(ACCN), 'rune'];
    const th = k => k === 'rune' ? 'รูน' : (D.SLOT[k] || {}).th.replace(' 1', '');
    const list = B.filter(b => P.bslot === 'rune' ? b.kind === 'rune' : b.slot === P.bslot);
    const grid = `<div class="gmrow"><b>ช่อง</b>${slots.map(k => `<button class="chip ${P.bslot === k ? 'on' : ''}" data-act="gm" data-c="gmbslot" data-v="${k}">${th(k)} (${B.filter(b => k === 'rune' ? b.kind === 'rune' : b.slot === k).length})</button>`).join('')}</div>
      <p class="muted">ไอเทมทั้งหมด ${B.length} แบบ (เกียร์ 280 · เครื่องประดับ 160 · รูน 60) — 20 วัสดุ แต่ละแบบมีลวดลาย ช่วงระดับดรอป และค่าพิเศษประจำแบบไม่ซ้ำกัน · คลิกเพื่อเสกที่ระดับต่ำสุดของแบบ</p>
      <div class="gmgrid">${list.map(b => { const t = U.clamp(P.gt || b.tmin, b.tmin, b.tmax); return `<button class="gcell" data-act="gm" data-c="gmbase" data-k="${b.id}" title="${esc(nameOf(b, S.save.cls))} · ระดับ ${b.tmin}–${b.tmax} · ${esc(D.STAT_TH[b.bonus] || b.bonus)}"><div class="icell t${t}"><img src="${UI.itemIcon({ base: b.id, tier: t, slot: b.slot, kind: b.kind })}" alt=""></div><span>${esc(nameOf(b, S.save.cls))}</span></button>`; }).join('')}</div>`;
    return h.replace(/<div class="gmmain">[\s\S]*$/, `<div class="gmmain">${grid}</div></div>`);
  };
  const gmC = UI.gmCmd;
  UI.gmCmd = (c, el) => {
    const P = UI.panel;
    if (c === 'gmbslot') { P.bslot = el.dataset.v; UI.renderPanel(); return; }
    if (c === 'gmbase') { const b = B.find(x => x.id === el.dataset.k); if (!b) return; const t = U.clamp(P.gt || b.tmin, b.tmin, b.tmax); const it = S.genItem(b.kind, t, P.gilv || 100, { slot: b.slot, color: b.color, base: b.id, pvp: true }); S.addItem(it, true); UI.toast(`GM: ได้รับ ${it.name}`, 'item', it.tier); return; }
    return gmC(c, el);
  };
})(G);

});
