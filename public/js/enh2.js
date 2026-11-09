'use strict';
(function (init) {
  (globalThis.ASHFALL_SIM_FACTORIES ||= {})['enh2'] = init;
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
/* Items v3: every drop rolls its own stats (main ±, each sub ×0.75–1.25, chance of an extra sub, shown as quality %);
   enhancement +1 … +10 where each level adds a random bonus option; option-reroll stone (หินสุ่มออปชั่น);
   map bosses hit far harder (HP ×7, ATK ×2.4, enrage under 35 % HP). */
(function (G) {
  const U = G.U, D = G.D, S = G.S, UI = G.UI, W = G.W, E = G.E; const esc = UI.esc;
  const rf = (a, b) => a + Math.random() * (b - a); const POOL = D.SUB_POOL; const MAXE = 10;
  const rollable = it => it && (it.kind === 'gear' || it.kind === 'acc' || it.kind === 'relic' || (it.kind === 'rune' && !it.core));
  const val = (o, m) => { if (!o) return; o.v = D.PCT[o.s] ? Math.round(o.v * m * 10) / 10 : Math.round(o.v * m); };
  // ---------- random stats on every item ----------
  const g0 = S.genItem; S.genItem = (kind, tier, ilv, o = {}) => { const it = g0(kind, tier, ilv, o); if (!rollable(it) || it._rr) return it; it._rr = 1;
    if (it.cat) return it; // catalog designs already roll their own
    const rolls = []; if (it.main) { const r = rf(0.85, 1.2); val(it.main, r); rolls.push(r / 1.2); }
    for (const sb of it.subs || []) { if (sb.sig) continue; const r = rf(0.75, 1.25); val(sb, r); rolls.push(r / 1.25); }
    if (Math.random() < 0.3) { const have = new Set([(it.main || {}).s, ...(it.subs || []).map(x => x.s)]); const free = POOL.filter(x => !have.has(x)); if (free.length) { const s = U.pick(free), r = rf(0.5, 1.1); (it.subs = it.subs || []).push({ s, v: S.statVal(s, it.ilv, it.tier, 0.3 * r) }); rolls.push(r / 1.1); } }
    it.q = Math.round(100 * rolls.reduce((a, b) => a + b, 0) / Math.max(1, rolls.length)); return it; };
  // ---------- enhancement options ----------
  const enhSubs = it => (it.subs || []).filter(x => x.enh);
  S.applyEnhOptions = (it) => { if (!it || !(it.kind === 'gear' || it.kind === 'acc')) return; it.subs = it.subs || []; const want = Math.min(MAXE, it.lv || 0);
    while (enhSubs(it).length > want) { const i = it.subs.map(x => !!x.enh).lastIndexOf(true); it.subs.splice(i, 1); }
    while (enhSubs(it).length < want) { const s = U.pick(POOL); it.subs.push({ s, v: S.statVal(s, it.ilv || 1, it.tier || 1, 0.14 * rf(0.5, 1.4)), enh: true }); } };
  const en0 = S.enchant; S.enchant = (it, prot) => { if (it && it.kind === 'gear' && (it.lv || 0) >= MAXE) return `ตีบวกสูงสุดแล้ว (+${MAXE})`; const r = en0(it, prot); if (it) { S.applyEnhOptions(it); S.refreshPlayer(); } if (r && r.ok) { const o = enhSubs(it).slice(-1)[0]; if (o) r.msg += ` · ออปชั่นใหม่: ${D.STAT_TH[o.s] || o.s} +${o.v}${D.PCT[o.s] ? '%' : ''}`; } return r; };
  const rf0 = S.refine; S.refine = (it) => { const r = rf0(it); if (it && r && r.ok) { S.applyEnhOptions(it); S.refreshPlayer(); } return r; };
  // ---------- option reroll stone ----------
  const REROLL_DIA = 3;
  S.rerollOptions = (it, buy) => { const s = S.save; s.bag.reroll = s.bag.reroll || 0; if (!rollable(it)) return 'ไอเทมนี้สุ่มออปชั่นไม่ได้';
    if (s.bag.reroll < 1) { if (!buy) return 'ไม่มีหินสุ่มออปชั่น'; if ((s.diamond || 0) < REROLL_DIA) return `เพชรไม่พอ (ต้องใช้ ${REROLL_DIA})`; s.diamond -= REROLL_DIA; } else s.bag.reroll--;
    const keep = (it.subs || []).filter(x => x.sig); const n = (it.subs || []).filter(x => !x.sig && !x.enh).length; const avoid = new Set([(it.main || {}).s]); const out = []; const rolls = [];
    for (let i = 0; i < n; i++) { const free = POOL.filter(x => !avoid.has(x)); const st = U.pick(free); avoid.add(st); const r = rf(0.5, 1.3); out.push({ s: st, v: S.statVal(st, it.ilv || 1, it.tier || 1, (it.kind === 'rune' ? 0.22 : 0.35) * r) }); rolls.push(r / 1.3); }
    const e = enhSubs(it).map(() => { const st = U.pick(POOL); const r = rf(0.5, 1.4); rolls.push(r / 1.4); return { s: st, v: S.statVal(st, it.ilv || 1, it.tier || 1, 0.14 * r), enh: true }; });
    it.subs = [...out, ...keep, ...e]; it.q = Math.round(100 * rolls.reduce((a, b) => a + b, 0) / Math.max(1, rolls.length)); S.refreshPlayer(); S.persist(); return { ok: true, msg: `สุ่มออปชั่นใหม่แล้ว · คุณภาพ ${it.q}%` }; };
  const det0 = UI.itemDetail; UI.itemDetail = (it, actions = '') => { let h = det0(it, actions); if (!rollable(it) || !S.save) return h; const s = S.save; const n = s.bag.reroll || 0; const owned = s.inv.includes(it) || Object.values(s.eq || {}).includes(it);
    const extra = `<div class="iset"><b>${it.q ? `คุณภาพการสุ่ม ${it.q}%` : 'ออปชั่นสุ่ม'}</b>${enhSubs(it).length ? `<div>ออปชั่นจากการตีบวก: ${enhSubs(it).map(o => `${esc(D.STAT_TH[o.s] || o.s)} +${o.v}${D.PCT[o.s] ? '%' : ''}`).join(' · ')}</div>` : ''}</div>`;
    const btns = owned ? `<button class="btn" data-act="rr-use" data-uid="${it.uid}" ${n ? '' : 'disabled'}>🎲 สุ่มออปชั่นใหม่ (หิน ${n})</button><button class="btn" data-act="rr-buy" data-uid="${it.uid}">🎲 ซื้อ+สุ่ม (${REROLL_DIA} เพชร)</button>` : '';
    return h.replace('<div class="iact">', extra + '<div class="iact">' + btns); };
  const find = uid => { const s = S.save; return s.inv.find(x => x.uid === uid) || Object.values(s.eq || {}).find(x => x && x.uid === uid); };
  const a0 = UI.act; UI.act = (el, e) => { const a = el.dataset.act; if (a === 'rr-use' || a === 'rr-buy') { const it = find(el.dataset.uid); const r = S.rerollOptions(it, a === 'rr-buy'); UI.toast(r.ok ? r.msg : r, r.ok ? 'good' : 'bad'); UI.renderPanel(); return; } return a0(el, e); };
  // reroll stones drop from dungeons & bosses; bag icon
  const rd0 = S.rollDrop; S.rollDrop = (type, tier, ilv) => Math.random() < 0.04 ? { kind: 'cons', key: 'reroll', n: 1, label: 'หินสุ่มออปชั่น', tier: Math.max(4, tier) } : rd0(type, tier, ilv);
  const K = UI.ICONKIT; const bag0 = UI.bagIcon; UI.bagIcon = (k, t) => k === 'reroll' && K ? K.make('bag-reroll', k2 => { k2.P([[16, 3], [27, 10], [27, 22], [16, 29], [5, 22], [5, 10]], '#4a3a6a'); k2.P([[16, 6], [24, 11], [24, 21], [16, 26], [8, 21], [8, 11]], '#8a6ac8'); k2.C(12, 13, 2, '#ffffff'); k2.C(20, 19, 2, '#ffffff'); k2.C(16, 16, 2, '#ffe24a'); }, { spark: [[25, 5]] }) : bag0(k, t);
  // ---------- harder map bosses ----------
  const fm0 = S.FarmMode; S.FarmMode = function () { const M = fm0.apply(this, arguments); const sg = M.spawnGrade; M.spawnGrade = function (grade) { const u = sg.apply(this, arguments);
      if (u && grade === 'boss') { u.st.hp = Math.round(u.st.hp * 7); u.maxhp = u.st.hp; u.hp = u.maxhp; u.st.atk = Math.round(u.st.atk * 2.4); u.st.def = Math.round(u.st.def * 1.6); u.st.crit = 25; u.st.critDmg = 120; u.st.ccRes = 60; u.atkRate = 1.0; u.mapBoss = true; u.name = '☠ ' + u.name; }
      if (u && (grade === 'champion' || grade === 'rare')) { u.st.hp = Math.round(u.st.hp * 2); u.maxhp = u.st.hp; u.hp = u.maxhp; u.st.atk = Math.round(u.st.atk * 1.4); }
      return u; }; return M; };
  setInterval(() => { for (const u of W.units) if (u.mapBoss && !u.dead && !u.enraged && u.hp < u.maxhp * 0.35) { u.enraged = true; u.st.atk = Math.round(u.st.atk * 1.5); u.moveSpd *= 1.3; u.atkRate *= 0.75; if (G.VFX && E.vis && E.vis(u.x, u.y)) { G.VFX.ring(u.x, u.y, 4, ['#ffffff', '#ff4a4a', '#8a0a1a'], 0.8, { w: 5 }); G.VFX.shake && G.VFX.shake(6, 0.5); } UI.toast(`${u.name} คลั่ง! พลังโจมตีเพิ่มขึ้น`, 'bad'); } }, 400);
})(G);

});
