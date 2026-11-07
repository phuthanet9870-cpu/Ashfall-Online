'use strict';
/* Sell by tier/type (+ sell all, item lock) and class-aware auto-equip for gear, accessories, relic, runes and gems */
(function (G) {
  const U = G.U, D = G.D, S = G.S, UI = G.UI, W = G.W;
  const $ = s => document.querySelector(s), esc = UI.esc;

  // ---------- class-aware scoring ----------
  // weight per stat by role: what makes THIS class stronger
  const RW = {
    melee:    { atk: 4, def: 2.2, hp: 0.28, crit: 1, aspd: 1.2, cdr: 0.8, ls: 1.2, dr: 0.8, ccRes: 0.5, elem: 0.6, spd: 0.4, regen: 0.4 },
    tank:     { atk: 2.2, def: 4.2, hp: 0.5, crit: 0.4, aspd: 0.5, cdr: 0.9, ls: 0.6, dr: 1.8, ccRes: 1.4, elem: 0.3, spd: 0.4, regen: 0.8 },
    caster:   { atk: 4.4, def: 1.6, hp: 0.22, crit: 0.9, aspd: 0.5, cdr: 1.6, ls: 0.4, dr: 0.6, ccRes: 0.5, elem: 1.4, spd: 0.5, regen: 0.7 },
    healer:   { atk: 3, def: 2.4, hp: 0.34, crit: 0.5, aspd: 0.6, cdr: 1.8, ls: 0.6, dr: 1, ccRes: 1, elem: 0.8, spd: 0.6, regen: 1.6 },
    ranged:   { atk: 4.3, def: 1.6, hp: 0.22, crit: 1.3, aspd: 1.6, cdr: 0.8, ls: 0.6, dr: 0.6, ccRes: 0.5, elem: 0.7, spd: 0.7, regen: 0.4 },
    assassin: { atk: 4.4, def: 1.5, hp: 0.22, crit: 1.7, aspd: 1.2, cdr: 0.9, ls: 0.8, dr: 0.5, ccRes: 0.6, elem: 0.6, spd: 1, regen: 0.3 },
    hybrid:   { atk: 3.4, def: 3.2, hp: 0.4, crit: 0.8, aspd: 0.9, cdr: 1, ls: 1, dr: 1.2, ccRes: 1, elem: 0.6, spd: 0.5, regen: 0.6 },
    summoner: { atk: 4, def: 1.8, hp: 0.26, crit: 0.7, aspd: 0.6, cdr: 1.6, ls: 0.5, dr: 0.7, ccRes: 0.6, elem: 1.2, spd: 0.5, regen: 0.6 }
  };
  S.classScore = (st, cls) => {
    const w = RW[D.CLS[cls].role] || RW.melee; const a = st.atk || 0;
    let v = a * w.atk + (st.def || 0) * w.def + (st.hp || 0) * w.hp;
    v += a * ((st.crit || 0) / 100) * ((st.critDmg || 0) / 100) * 6 * w.crit;
    v += a * (st.aspd || 0) / 100 * 3 * w.aspd + a * (st.cdr || 0) / 100 * 3 * w.cdr + a * (st.elem || 0) / 100 * 2 * w.elem;
    v += a * (st.ls || 0) / 100 * 2 * w.ls + (st.hp || 0) * (st.dr || 0) / 100 * 0.6 * w.dr + (st.hp || 0) * (st.ccRes || 0) / 100 * 0.15 * w.ccRes;
    v += a * (st.spd || 0) / 100 * w.spd + (st.regen || 0) * 4 * w.regen + a * ((st.pvpDmg || 0) + (st.pvpDef || 0)) / 100 * 1.5;
    return v;
  };
  const fit = (it, cls) => it && it.slot === 'weapon' && it.wpn && it.wpn !== D.CLS[cls].weapon ? 0.97 : 1; // own weapon type preferred
  const score = () => { const s = S.save; const cp = S.calcPlayer(); let v = S.classScore(cp.st, s.cls) * (cp.fx && cp.fx.setult ? 1.15 : 1); for (const k in s.eq) v *= fit(s.eq[k], s.cls); return v; };
  const slotsFor = it => it.slot === 'ring1' || it.slot === 'ring2' ? ['ring1', 'ring2'] : it.slot === 'earring1' || it.slot === 'earring2' ? ['earring1', 'earring2'] : [it.slot];
  const usable = (sl) => { const d = D.SLOT[sl]; return !(d && d.unlock !== undefined) || S.accUnlocked(sl); };

  S.autoEquip = (o = {}) => {
    const s = S.save; if (!s) return { changes: [], gain: 0 }; const start = score(); const changes = [];
    const tryPut = (slot, cand) => { const old = s.eq[slot]; const base = score(); s.eq[slot] = cand; const v = score(); s.eq[slot] = old; return v - base; };
    // gear, accessories, relic (two passes so set bonuses can settle)
    for (let pass = 0; pass < 2; pass++) for (const sd of D.ALL_SLOTS) {
      const slot = sd.k; if (!usable(slot)) continue;
      const cands = s.inv.filter(it => S.isEquip(it) && slotsFor(it).includes(slot) && (!it.clsOnly || it.clsOnly === s.cls));
      let best = null, bg = 0.5; for (const c of cands) { const g = tryPut(slot, c); if (g > bg) { bg = g; best = c; } }
      if (best) { const old = s.eq[slot]; s.inv.splice(s.inv.indexOf(best), 1); if (old) s.inv.push(old); s.eq[slot] = best; changes.push({ slot: sd.th, from: old, to: best }); }
    }
    // runes into the active page
    const page = s.runeBoard[s.page];
    D.RUNE_BOARD.forEach((rb, i) => {
      if (!S.runeSlotOpen(i)) return; const cands = s.inv.filter(it => it.kind === 'rune' && it.color === rb.c); let best = null, bg = 0.5;
      for (const c of cands) { const old = page[i]; const b0 = score(); page[i] = c; const g = score() - b0; page[i] = old; if (g > bg) { bg = g; best = c; } }
      if (best) { const old = page[i]; s.inv.splice(s.inv.indexOf(best), 1); if (old) s.inv.push(old); page[i] = best; changes.push({ slot: 'รูน' + D.RUNE_COLORS[rb.c].th, from: old, to: best }); }
    });
    // gems into empty sockets of equipped items
    if (o.gems !== false) for (const sd of D.ALL_SLOTS) {
      const it = s.eq[sd.k]; if (!it || !it.sockets) continue;
      for (let i = 0; i < it.sockets.length; i++) { if (it.sockets[i]) continue; const gems = s.inv.filter(g => g.kind === 'gem'); let best = null, bg = 0.5;
        for (const g of gems) { const b0 = score(); it.sockets[i] = g; const v = score() - b0; it.sockets[i] = null; if (v > bg) { bg = v; best = g; } }
        if (best) { it.sockets[i] = best; s.inv.splice(s.inv.indexOf(best), 1); changes.push({ slot: 'เจม→' + sd.th, from: null, to: best }); } }
    }
    const end = score(); if (changes.length) S.refreshPlayer(true);
    return { changes, gain: start > 0 ? (end / start - 1) * 100 : 0, cp: S.calcPlayer().cp };
  };
  const auto1 = S.autoEquip; S.autoEquip = (o) => { const s = S.save; const c0 = S.classScore(S.calcPlayer().st, s.cls); const all = []; for (let k = 0; k < 4; k++) { const r = auto1(o); all.push(...r.changes); if (!r.changes.length) break; } const c1 = S.classScore(S.calcPlayer().st, s.cls); return { changes: all, gain: c0 > 0 ? (c1 / c0 - 1) * 100 : 0, cp: S.calcPlayer().cp }; };
  const report = (r, quiet) => {
    if (!r.changes.length) { if (!quiet) UI.toast('ใส่ของที่ดีที่สุดสำหรับคลาสนี้อยู่แล้ว', 'info'); return; }
    if (quiet) { UI.toast(`ออโต้สวมใส่: เปลี่ยน ${r.changes.length} ชิ้น · พลัง +${r.gain.toFixed(1)}%`, 'good'); return; }
    UI.modal(`<h2>ออโต้สวมใส่</h2><p>คลาส <b>${esc(D.CLS[S.save.cls].name)}</b> (${D.ROLES[D.CLS[S.save.cls].role].th}) · เปลี่ยน ${r.changes.length} ชิ้น · พลังตามคลาส <b class="good">+${r.gain.toFixed(1)}%</b> · CP ${U.fmt(r.cp)}</p>
      <table class="tbl"><tr><th>ช่อง</th><th>เดิม</th><th>ใหม่</th></tr>${r.changes.map(c => `<tr><td>${esc(c.slot)}</td><td>${c.from ? `<span class="tc t${c.from.tier}">${esc(c.from.name)}</span>` : '<span class="muted">ว่าง</span>'}</td><td><span class="tc t${c.to.tier}">${esc(c.to.name)}</span></td></tr>`).join('')}</table>
      <p class="muted">คำนวณจากบทบาทของคลาส: เช่น แทงค์ให้น้ำหนัก DEF/HP/ลดดาเมจ · นักฆ่าให้น้ำหนักคริติคอล · ฮีลเลอร์ให้น้ำหนักลดคูลดาวน์/ฟื้นฟู · อาวุธประเภทของคลาสได้คะแนนเพิ่ม · รวมโบนัสเซ็ต</p><div class="list"><button class="btn primary" data-act="x-close">ตกลง</button></div>`);
  };
  // auto equip on pickup (setting)
  const add0 = S.addItem; let pend = 0;
  S.addItem = (it, quiet) => { const r = add0(it, quiet); const st = S.save && S.save.settings; if (st && st.autoEquip && it && (S.isEquip(it) || it.kind === 'rune' || it.kind === 'gem') && !(W.mode && W.mode.pvp && W.mode.over === false)) { clearTimeout(pend); pend = setTimeout(() => report(S.autoEquip(), true), 600); } return r; };

  // ---------- selling ----------
  const KINDS = [['gear', 'เกียร์'], ['acc', 'เครื่องประดับ'], ['relic', 'Relic'], ['rune', 'รูน'], ['gem', 'เจม']];
  const cfg = () => { const st = S.save.settings; st.sellT = st.sellT || [1, 2]; st.sellK = st.sellK || ['gear', 'acc']; return st; };
  const sellable = it => !it.lock && KINDS.some(k => k[0] === it.kind);
  const pickSell = () => { const st = cfg(); return S.save.inv.filter(it => sellable(it) && st.sellT.includes(it.tier) && st.sellK.includes(it.kind)); };
  const doSell = (list) => { let g = 0; for (const it of list) g += S.sell(it); return g; };
  const sellBar = (tab) => { const st = cfg(), list = pickSell(), gold = list.reduce((a, it) => a + S.itemPrice(it), 0); const allN = S.save.inv.filter(sellable).length;
    return `<div class="sellbar"><div class="gmrow"><b>ขายระดับ</b>${D.TIERS.map((T, i) => `<button class="tchip t${i + 1} ${st.sellT.includes(i + 1) ? 'on' : ''}" data-act="x-sellt" data-v="${i + 1}" title="${esc(T.n)}">${i + 1}</button>`).join('')}<button class="chip" data-act="x-sellt" data-v="all">ทุกระดับ</button><button class="chip" data-act="x-sellt" data-v="none">ล้าง</button></div>
      <div class="gmrow"><b>ประเภท</b>${KINDS.map(([k, n]) => `<button class="chip ${st.sellK.includes(k) ? 'on' : ''}" data-act="x-sellk" data-v="${k}">${n}</button>`).join('')}</div>
      <div class="gmrow"><button class="btn primary" data-act="x-sellsel" ${list.length ? '' : 'disabled'}>ขายที่เลือก ${list.length} ชิ้น · ${U.fmt(gold)} ทอง</button><button class="btn danger" data-act="x-sellall">ขายทั้งหมด (${allN})</button><button class="btn" data-act="x-auto">⚡ ออโต้สวมใส่</button><label class="chk"><input type="checkbox" data-act="x-autot" ${S.save.settings.autoEquip ? 'checked' : ''}> ออโต้สวมเมื่อได้ของใหม่</label></div>
      <p class="muted">ของที่ล็อก 🔒 และของที่สวมอยู่จะไม่ถูกขาย · กดออโต้สวมใส่ก่อนขายเพื่อเก็บชิ้นที่ดีที่สุดไว้</p></div>`; };
  UI.sellBar = sellBar;
  const inv0 = UI.PANELS.inv.render;
  UI.PANELS.inv.render = function (tab, P) {
    const h = inv0.call(this, tab, P); if (tab === 'bag') return h;
    return h.replace(/<button class="mini-btn" data-act="sellall">[^<]*<\/button>/, '').replace('<div class="invtop">', sellBar(tab) + '<div class="invtop">')
      .replace(/(<button class="icell[^"]*" data-act="selinv" data-uid="([^"]+)"[^>]*>)/g, (m, a, uid) => { const it = S.save.inv.find(i => i.uid === uid); return it && it.lock ? a + '<span class="lk">🔒</span>' : a; });
  };
  const char0 = UI.PANELS.char.render;
  UI.PANELS.char.render = function (tab, P) { const h = char0.call(this, tab, P); return tab === 'eq' ? `<div class="gmrow"><button class="btn primary" data-act="x-auto">⚡ ออโต้สวมใส่ทุกช่อง (คำนวณตามคลาส ${esc(D.CLS[S.save.cls].name)})</button></div>` + h : h; };
  const det0 = UI.itemDetail;
  UI.itemDetail = (it, actions = '') => { if (it && S.save.inv.includes(it) && sellable(it) || it && it.lock) actions += `<button class="btn" data-act="x-lock" data-uid="${it.uid}">${it.lock ? '🔓 ปลดล็อก' : '🔒 ล็อก (กันขาย)'}</button>`; return det0(it, actions); };

  const act0 = UI.act;
  UI.act = (el, e) => {
    const a = el.dataset.act; if (!a || !a.startsWith('x-')) return act0(el, e);
    const st = cfg();
    switch (a) {
      case 'x-sellt': { const v = el.dataset.v; if (v === 'all') st.sellT = D.TIERS.map((_, i) => i + 1); else if (v === 'none') st.sellT = []; else { const t = +v; st.sellT = st.sellT.includes(t) ? st.sellT.filter(x => x !== t) : [...st.sellT, t]; } break; }
      case 'x-sellk': { const k = el.dataset.v; st.sellK = st.sellK.includes(k) ? st.sellK.filter(x => x !== k) : [...st.sellK, k]; break; }
      case 'x-sellsel': { const L = pickSell(); const hi = L.filter(i => i.tier >= 7).length; const go = () => { const g = doSell(L); UI.toast(`ขาย ${L.length} ชิ้น ได้ ${U.fmt(g)} ทอง`, 'good'); UI.panel && (UI.panel.sel = null); S.persist(); UI.renderPanel(); };
        if (hi) { UI._sellGo = go; UI.modal(`<h2>ยืนยันการขาย</h2><p>จะขาย ${L.length} ชิ้น รวมของระดับ 7 ขึ้นไป <b class="bad">${hi} ชิ้น</b></p><div class="list"><button class="btn danger" data-act="x-confirm">ขายเลย</button><button class="btn" data-act="x-close">ยกเลิก</button></div>`); return; } go(); return; }
      case 'x-sellall': { const L = S.save.inv.filter(sellable); const gold = L.reduce((x, it) => x + S.itemPrice(it), 0); UI._sellGo = () => { const g = doSell(L); UI.toast(`ขายทั้งหมด ${L.length} ชิ้น ได้ ${U.fmt(g)} ทอง`, 'good'); UI.panel && (UI.panel.sel = null); S.persist(); UI.renderPanel(); };
        UI.modal(`<h2>ขายทั้งหมด?</h2><p>ขายเกียร์ เครื่องประดับ Relic รูน และเจมในกระเป๋าทั้งหมด <b>${L.length} ชิ้น</b> ได้ประมาณ <b>${U.fmt(gold)} ทอง</b></p><p class="muted">ของที่สวมอยู่และของที่ล็อกไว้จะไม่ถูกขาย</p><div class="list"><button class="btn danger" data-act="x-confirm">ขายทั้งหมด</button><button class="btn" data-act="x-autosell">ออโต้สวมใส่ก่อน แล้วค่อยขาย</button><button class="btn" data-act="x-close">ยกเลิก</button></div>`); return; }
      case 'x-autosell': S.autoEquip(); { const L = S.save.inv.filter(sellable); const g = doSell(L); UI.toast(`สวมของที่ดีที่สุดแล้ว ขาย ${L.length} ชิ้น ได้ ${U.fmt(g)} ทอง`, 'good'); } $('#modal').hidden = true; S.persist(); UI.renderPanel(); return;
      case 'x-close': UI.closeModal(); return;
      case 'x-confirm': $('#modal').hidden = true; if (UI._sellGo) UI._sellGo(); UI._sellGo = null; return;
      case 'x-auto': { const r = S.autoEquip(); S.persist(); UI.renderPanel(); report(r); return; }
      case 'x-autot': S.save.settings.autoEquip = !S.save.settings.autoEquip; UI.toast(S.save.settings.autoEquip ? 'เปิดออโต้สวมเมื่อได้ของใหม่' : 'ปิดออโต้สวมเมื่อได้ของใหม่', 'info'); break;
      case 'x-lock': { const it = UI.findItem(el.dataset.uid); if (it) it.lock = !it.lock; break; }
    }
    S.persist(); UI.renderPanel();
  };
})(window.G);
