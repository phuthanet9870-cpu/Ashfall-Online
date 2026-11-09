'use strict';
(function(init){(globalThis.ASHFALL_SIM_FACTORIES ||= {}).gm2=init;if(typeof window!=='undefined')init(window.G);})(function(G){
'use strict';
/* GM v2:
   · "ชุดด่วน" builds the strongest kit for the current class: every gear/accessory/relic slot is picked from a pool of
     tier-10 ilv-100 rolls by the class score, then enhanced to +10 (with its random enhance options) and socketed with
     the best gems — class-set items are never used.
   · "ออโต้ใส่ชุดดีที่สุด (ไม่รวมชุดคลาส)" equips the best items from the bag for the class, skipping class-set pieces.
   · Class-set pieces now roll random stats like every other item (main ±, random sub picks and sizes). */
(function (G) {
  const U = G.U, D = G.D, S = G.S, UI = G.UI; const rf = (a, b) => a + Math.random() * (b - a);
  // ---------- class set: random rolls ----------
  const gc0 = S.genClassItem; if (gc0) S.genClassItem = (cls, slot, tier, ilv) => { const it = gc0(cls, slot, tier, ilv); const rolls = [];
    if (it.main) { const r = rf(0.8, 1.25); it.main.v = D.PCT[it.main.s] ? Math.round(it.main.v * r * 10) / 10 : Math.round(it.main.v * r); rolls.push(r / 1.25); }
    const role = (it.subs || []).map(x => x.s); const pool = [...new Set([...role, ...role, ...D.SUB_POOL])].filter(x => x !== (it.main || {}).s);
    const n = Math.max(2, (it.subs || []).length) + (Math.random() < 0.35 ? 1 : 0); const pick = []; const bag = pool.slice();
    while (pick.length < n && bag.length) { const i = Math.floor(Math.random() * bag.length); const st = bag.splice(i, 1)[0]; if (!pick.includes(st)) pick.push(st); }
    it.subs = pick.map(st => { const r = rf(0.5, 1.3); rolls.push(r / 1.3); return { s: st, v: S.statVal(st, it.ilv, it.tier, 0.4 * r) }; });
    it.q = Math.round(100 * rolls.reduce((a, b) => a + b, 0) / Math.max(1, rolls.length)); return it; };
  // ---------- class score of the current loadout ----------
  const score = () => S.classScore(S.calcPlayer().st, S.save.cls);
  const slotsAll = () => [...D.GEAR_SLOTS.map(x => ['gear', x.k]), ...D.ACC_SLOTS.map(x => ['acc', x.k]), ['relic', 'relic']];
  const bestGem = (it) => { const s = S.save; let best = null, bv = -1; for (const g of D.GEMS) { const gem = S.genItem('gem', 10, 100, { gem: g.k }); const i = it.sockets.indexOf(null); it.sockets[i] = gem; const v = score(); it.sockets[i] = null; if (v > bv) { bv = v; best = gem; } } return best; };
  S.gmBestKit = (tries = 10) => { const s = S.save; const cls = s.cls; const old = Object.assign({}, s.eq);
    for (const [kind, slot] of slotsAll()) { if (slot === 'earring2' || slot === 'ring2') continue; let best = null, bv = -1;
      for (let i = 0; i < tries; i++) { const it = kind === 'relic' ? S.genItem('relic', 10, 100) : S.genItem(kind, 10, 100, { slot, cls, pvp: true, noCat: false }); if (it.cset) continue; if (kind === 'acc') it.slot = slot;
        s.eq[slot] = it; const v = score(); if (v > bv) { bv = v; best = it; } }
      s.eq[slot] = best; if (best && (best.kind === 'gear' || best.kind === 'acc')) { best.lv = 10; S.applyEnhOptions && S.applyEnhOptions(best); }
      if (slot === 'earring1' || slot === 'ring1') { const twin = slot === 'earring1' ? 'earring2' : 'ring2'; const c = JSON.parse(JSON.stringify(best)); c.uid = U.uid(); c.slot = twin; s.eq[twin] = c; } }
    // sockets: best gem per socket
    for (const k in s.eq) { const it = s.eq[k]; if (!it || !it.sockets) continue; for (let i = 0; i < it.sockets.length; i++) if (!it.sockets[i]) { const g = bestGem(it); it.sockets[i] = g; } }
    // the replaced items go back to the bag (class set and anything else)
    for (const k in old) if (old[k] && old[k] !== s.eq[k] && !Object.values(s.eq).includes(old[k])) S.addItem(old[k], true);
    S.refreshPlayer(true); S.persist(); return S.calcPlayer().cp; };
  S.gmAutoNoSet = () => { const s = S.save; for (const k in s.eq) { const it = s.eq[k]; if (it && it.cset) { s.inv.push(it); delete s.eq[k]; } }
    const hidden = s.inv.filter(it => it.cset); s.inv = s.inv.filter(it => !it.cset); let r; try { r = S.autoEquip(); } finally { s.inv.push(...hidden); } S.refreshPlayer(true); S.persist(); return r; };
  if (G.headless) return;
  // ---------- GM panel ----------
  const gmR = UI.gmRender; UI.gmRender = (tab, P) => { let h = gmR(tab, P); if (tab !== 'item') return h;
    return h.replace(/<button class="btn" data-act="gm" data-c="kit">[^<]*<\/button>/, `<button class="btn primary" data-act="gm" data-c="kit2">⚡ ชุดด่วน: เก่งสุดสำหรับ ${UI.esc(D.CLS[S.save.cls].name)} (ระดับ 10 · ตีบวก +10 · เจมครบ · ไม่ใช้ชุดคลาส)</button><button class="btn" data-act="gm" data-c="autons">🎯 ออโต้ใส่ของดีที่สุดในกระเป๋า (ไม่รวมชุดคลาส)</button>`); };
  const gmC = UI.gmCmd; UI.gmCmd = (c, el) => {
    if (c === 'kit2' || c === 'kit') { const cp0 = S.calcPlayer().cp; const cp = S.gmBestKit(c === 'kit2' ? 12 : 8); UI.toast(`GM: สวมชุดเก่งสุดสำหรับ ${D.CLS[S.save.cls].name} · พลัง ${U.fmt(cp0)} → ${U.fmt(cp)}`, 'good'); UI.renderPanel(); return; }
    if (c === 'autons') { const cp0 = S.calcPlayer().cp; const r = S.gmAutoNoSet(); UI.toast(`GM: ออโต้สวมใส่ ${r && r.changes ? r.changes.length : 0} ชิ้น (ไม่รวมชุดคลาส) · พลัง ${U.fmt(cp0)} → ${U.fmt(S.calcPlayer().cp)}`, 'good'); UI.renderPanel(); return; }
    return gmC(c, el); };
})(G);
if (G.headless) return;
// ---------- bag: instant "auto class set" button ----------
(function (G) {
  const S = G.S, UI = G.UI, D = G.D;
  const PIECES = ['weapon', 'head', 'chest', 'gloves', 'legs', 'boots'];
  const ownedN = () => { const s = S.save; const k = 'cs_' + s.cls; return new Set([...s.inv, ...Object.values(s.eq)].filter(i => i && i.set === k).map(i => i.slot)).size; };
  const inv0 = UI.PANELS.inv.render; UI.PANELS.inv.render = function (tab, P) { const h = inv0.call(this, tab, P); if (h.indexOf('data-act="x-auto"') < 0 || h.indexOf('data-act="cs-auto"') >= 0) return h; const n = ownedN();
    return h.replace(/(<button class="rbtn" data-act="x-auto">[\s\S]*?<\/button>)/, `$1<button class="rbtn cs-auto" data-act="cs-auto" title="สวมชุดคลาสของ ${UI.esc(D.CLS[S.save.cls].name)} ที่ดีที่สุดที่มีทันที"><img src="${UI.itemIcon({ cset: S.save.cls, slot: 'chest', tier: 9 })}" alt="">ออโต้ชุดคลาส ${n}/6</button>`); };
  const a0 = UI.act; UI.act = (el, e) => { if (el.dataset.act !== 'cs-auto') return a0(el, e); const s = S.save;
    if (!ownedN()) { UI.toast('ยังไม่มีชิ้นส่วนชุดคลาสของคลาสนี้', 'bad'); return; }
    const before = PIECES.filter(p => s.eq[p] && s.eq[p].set === 'cs_' + s.cls).length; S.wearSet('cs_' + s.cls); const worn = PIECES.filter(p => s.eq[p] && s.eq[p].set === 'cs_' + s.cls).length;
    S.persist && S.persist(); UI.toast(worn > before ? `สวมชุดคลาส ${worn}/6 ชิ้น${worn >= 6 ? ' · ปลดล็อกอัลติเมตชุดคลาส' : ''}` : `ใส่ชุดคลาสที่ดีที่สุดอยู่แล้ว (${worn}/6)`, worn > before ? 'good' : 'info'); UI.renderPanel(); };
  const css = document.createElement('style'); css.textContent = '.rbtn.cs-auto{border-color:#ff8ad8!important;color:#ffd0f0}'; document.head.appendChild(css);
})(G);

});
