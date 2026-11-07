'use strict';
/* Player trading: trade window with simulated players (AI personalities, counter offers, lock → confirm), incoming requests, history */
(function (G) {
  const U = G.U, D = G.D, S = G.S, UI = G.UI, W = G.W, E = G.E;
  const $ = s => document.querySelector(s), esc = UI.esc;
  const PERSONAS = {
    fair: { th: 'ยุติธรรม', greed: 1.0, line: ['ดีลนี้แฟร์ดี', 'โอเค ยุติธรรม'], no: ['ยังไม่ค่อยคุ้มนะ', 'ขาดไปนิดหน่อย'] },
    greedy: { th: 'เขี้ยว', greed: 1.3, line: ['ก็ได้ ๆ ดีลนี้พอไหว', 'โอเค ตกลง'], no: ['แบบนี้ผมขาดทุนนะ', 'เพิ่มอีกหน่อยสิ'] },
    generous: { th: 'ใจดี', greed: 0.8, line: ['เอาไปเลยเพื่อน', 'ช่วยกันไป'], no: ['อยากช่วยนะ แต่ห่างไปหน่อย', 'เพิ่มอีกนิดเดียวพอ'] },
    collector: { th: 'นักสะสม', greed: 1.1, line: ['ผมสะสมของแบบนี้อยู่พอดี!', 'ชิ้นนี้แหละที่ตามหา'], no: ['ของพวกนี้ผมหวงนะ', 'ถ้ามีของที่ผมสะสมจะง่ายกว่านี้'] }
  };
  const MAX_SLOTS = 8;
  const val = it => Math.round(S.itemPrice(it) * (1 + (it.lv || 0) * 0.15) * (it.set ? 1.3 : 1) * (it.affix ? 1.6 : 1) * (it.core ? 1.5 : 1));
  const tradable = it => S.isEquip(it) || it.kind === 'rune' || it.kind === 'gem' || it.kind === 'fpack';
  const myFash = () => { const s = S.save; const eq = new Set(Object.values(s.fashion.eq).filter(Boolean)); return s.fashion.owned.filter(it => !eq.has(it) && !it.lock); };

  // trader profile for a simulated player (lazy, persists for the session)
  S.traderOf = (u) => {
    if (u.trader) return u.trader; const s = S.save; const pk = U.pick(Object.keys(PERSONAS)); const lvl = U.clamp(s.lvl + U.ri(-25, 25), 1, D.MAX_LV);
    const baseT = U.clamp(Math.ceil(lvl / 22), 1, 9); const inv = [];
    if (Math.random() < 0.5) inv.push(S.genItem('fashion', U.clamp(baseT + U.ri(-1, 2), 1, 10), 1));
    for (let i = 0; i < U.ri(10, 18); i++) inv.push(S.genItem(U.pick(['gear', 'gear', 'acc', 'rune', 'gem', 'relic']), U.clamp(baseT + U.ri(-2, 2), 1, 10), U.clamp(Math.round(lvl / 2) + U.ri(-8, 8), 1, 100), { pvp: Math.random() < 0.4 }));
    u.trader = { name: u.name, cls: u.cls || (u.look && u.look.cls) || U.pick(D.CLASSES).id, lvl, gold: Math.round(2000 + lvl * lvl * U.rf(2, 8)), inv, persona: pk, wants: U.pick(['gear', 'acc', 'rune', 'gem', 'relic']), mood: 1 };
    return u.trader;
  };
  const sims = () => W.units.filter(u => u.sim && !u.dead);

  // ---------- evaluation ----------
  const offerVal = (side, T) => side.items.reduce((a, it) => a + val(it) * (T && T.persona === 'collector' && it.kind === T.wants ? 1.4 : 1) * (T && it.kind === T.wants ? 1.15 : 1), 0) + side.gold;
  const evalTrade = (X) => { const T = X.T, P = PERSONAS[T.persona]; const give = offerVal(X.me, T); const take = X.them.items.reduce((a, it) => a + val(it), 0) + X.them.gold; const need = Math.ceil(take * P.greed * (2 - T.mood)); return { give, take, need, ok: give >= need, short: Math.max(0, need - give) }; };

  // ---------- open / close ----------
  UI.startTrade = (u, incoming) => {
    const m = W.mode; if (!m || m.kind !== 'town') return UI.toast('เทรดได้เฉพาะในเมือง', 'bad');
    const T = S.traderOf(u); UI.trade = { u, T, me: { items: [], gold: 0 }, them: { items: [], gold: 0 }, myLock: false, theirLock: false, msg: incoming ? `${T.name}: อยากแลกของกันไหม?` : `${T.name}: ว่าไง จะแลกอะไร?`, log: [] };
    UI.openPanel('trade');
  };
  UI.tradeRequest = (u) => { if (!$('#modal').hidden || !$('#panel').hidden) return; const T = S.traderOf(u); UI._treq = u;
    UI.modal(`<h2>คำขอเทรด</h2><div class="treq"><img src="${UI.bodyURL(T.cls)}" alt=""><div><b>${esc(T.name)}</b> <small>Lv${T.lvl} ${esc(D.CLS[T.cls].name)} · นิสัย${PERSONAS[T.persona].th}</small><p>ขอเทรดกับคุณ · กำลังมองหา <b>${({ gear: 'เกียร์', acc: 'เครื่องประดับ', rune: 'รูน', gem: 'เจม', relic: 'Relic' })[T.wants]}</b></p></div></div><div class="list"><button class="btn primary" data-act="t-reqyes">เปิดหน้าต่างเทรด</button><button class="btn" data-act="t-reqno">ปฏิเสธ</button></div>`); };

  // ---------- trade panel ----------
  const slots = (side, who, X) => { const cells = side.items.map((it, i) => `<button class="icell t${it.tier}" data-act="t-rm" data-who="${who}" data-i="${i}" title="${esc(it.name)} · ${U.fmt(val(it))}">${`<img src="${UI.itemIcon(it)}" alt="">`}${it.lv ? `<span class="ip">+${it.lv}</span>` : ''}</button>`); while (cells.length < MAX_SLOTS) cells.push('<div class="icell empty"></div>'); return `<div class="tslots">${cells.join('')}</div>`; };
  const side = (title, sideObj, who, X, img, sub, locked) => `<div class="tside ${locked ? 'locked' : ''}"><div class="thead"><img src="${img}" alt=""><div><b>${esc(title)}</b><small>${sub}</small></div>${locked ? '<span class="tlock">🔒 ล็อกแล้ว</span>' : ''}</div>${slots(sideObj, who, X)}
    <div class="tgold"><img src="${UI.curIcon('gold')}" alt="">${who === 'me' ? `<input type="number" id="tgme" min="0" step="100" value="${sideObj.gold}" ${X.myLock ? 'disabled' : ''}>` : `<input type="number" id="tgthem" min="0" step="100" value="${sideObj.gold}" ${X.myLock ? 'disabled' : ''} title="ขอทองจากอีกฝ่าย">`}<small>${who === 'me' ? `มี ${U.fmt(S.save.gold)}` : `ขอทอง (เขามี ${U.fmt(X.T.gold)})`}</small></div>
    <div class="tval">มูลค่ารวม ≈ <b>${U.fmt(who === 'me' ? offerVal(sideObj, null) : offerVal(sideObj, null))}</b></div></div>`;
  UI.PANELS.trade = { title: 'เทรดกับผู้เล่น', tabs: [['deal', 'หน้าต่างเทรด'], ['near', 'ผู้เล่นใกล้เคียง'], ['hist', 'ประวัติเทรด']], render(tab, P) {
    const s = S.save; const X = UI.trade;
    if (tab === 'near' || (!X && tab === 'deal')) { const L = sims(); return `<p class="muted">เทรดได้เฉพาะในเมือง · คลิกผู้เล่นในแผนที่หรือเลือกจากรายการ · ผู้เล่นแต่ละคนมีนิสัยและของในกระเป๋าต่างกัน</p>${W.mode && W.mode.kind === 'town' ? '' : '<p class="bad">ตอนนี้ไม่ได้อยู่ในเมือง</p>'}<div class="tnear">${L.map(u => { const T = S.traderOf(u); return `<div class="tnc"><img src="${UI.bodyURL(T.cls)}" alt=""><div><b>${esc(T.name)}</b><small>Lv${T.lvl} ${esc(D.CLS[T.cls].name)}</small><small>นิสัย${PERSONAS[T.persona].th} · ของ ${T.inv.length} ชิ้น</small></div><button class="btn primary" data-act="t-open" data-id="${u.id}">เทรด</button></div>`; }).join('') || '<p class="muted">ไม่มีผู้เล่นอยู่ใกล้</p>'}</div>`; }
    if (tab === 'hist') { const H = s.tradeLog || []; return `<table class="tbl"><tr><th>เวลา</th><th>กับ</th><th>ให้ไป</th><th>ได้รับ</th></tr>${H.map(h => `<tr><td class="nowrap">${new Date(h.t).toLocaleString('th-TH')}</td><td>${esc(h.who)}</td><td>${h.gave.map(n => esc(n)).join(', ') || '-'}${h.gg ? ` +${U.fmt(h.gg)} ทอง` : ''}</td><td>${h.got.map(n => esc(n)).join(', ') || '-'}${h.tg ? ` +${U.fmt(h.tg)} ทอง` : ''}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">ยังไม่มีการเทรด</td></tr>'}</table>`; }
    const T = X.T; const ev = evalTrade(X); const mine = s.inv.filter(tradable).concat(myFash()).filter(it => !it.lock && !X.me.items.includes(it)); const theirs = T.inv.filter(it => !X.them.items.includes(it));
    const P2 = PERSONAS[T.persona];
    return `<div class="tradepage"><div class="tmain">${side(s.name + ' (คุณ)', X.me, 'me', X, UI.bodyURL(s.cls, s.fashion.eq), `Lv${s.lvl} ${esc(D.CLS[s.cls].name)}`, X.myLock)}
      <div class="tmid"><div class="tarrow">⇄</div><div class="tmood"><small>ความพอใจของ ${esc(T.name)}</small><div class="tbar"><i style="width:${Math.min(100, ev.need ? ev.give / ev.need * 100 : 100)}%" class="${ev.ok ? 'ok' : ''}"></i></div><small>${ev.ok ? 'พอใจ' : ev.need ? `ขาดอีก ≈ ${U.fmt(ev.short)}` : 'ยังไม่มีข้อเสนอ'}</small></div>
        <div class="tmsg">💬 ${esc(X.msg)}</div>
        ${X.myLock && X.theirLock ? '<button class="btn primary big" data-act="t-confirm">✔ ยืนยันเทรด</button>' : X.myLock ? '<button class="btn" data-act="t-unlock">ปลดล็อก / แก้ข้อเสนอ</button>' : '<button class="btn primary big" data-act="t-lock">🔒 ล็อกข้อเสนอ</button>'}
        <div class="list"><button class="mini-btn" data-act="t-ask">ขอให้เขาเสนอราคา</button><button class="mini-btn" data-act="t-cancel">ยกเลิกเทรด</button></div></div>
      ${side(T.name, X.them, 'them', X, UI.bodyURL(T.cls), `Lv${T.lvl} ${esc(D.CLS[T.cls].name)} · นิสัย${P2.th} · อยากได้${({ gear: 'เกียร์', acc: 'เครื่องประดับ', rune: 'รูน', gem: 'เจม', relic: 'Relic' })[T.wants]}`, X.theirLock)}</div>
      <div class="tinvs"><div><h4>กระเป๋าของคุณ (คลิกเพื่อใส่ในข้อเสนอ)</h4><div class="igrid">${mine.map(it => `<button class="icell t${it.tier}" data-act="t-add" data-who="me" data-uid="${it.uid}" title="${esc(it.name)} · มูลค่า ${U.fmt(val(it))}"><img src="${UI.itemIcon(it)}" alt="">${it.lv ? `<span class="ip">+${it.lv}</span>` : ''}<span class="ilv">${it.ilv || ''}</span></button>`).join('') || '<span class="muted">ไม่มีของที่เทรดได้ (ของที่ล็อกเทรดไม่ได้)</span>'}</div></div>
        <div><h4>ของของ ${esc(T.name)} (คลิกเพื่อขอ)</h4><div class="igrid">${theirs.map(it => `<button class="icell t${it.tier}" data-act="t-add" data-who="them" data-uid="${it.uid}" title="${esc(it.name)} · มูลค่า ${U.fmt(val(it))}"><img src="${UI.itemIcon(it)}" alt="">${it.lv ? `<span class="ip">+${it.lv}</span>` : ''}<span class="ilv">${it.ilv || ''}</span></button>`).join('') || '<span class="muted">ไม่มีของเหลือ</span>'}</div>
        ${X.hover ? '' : ''}</div></div></div>`;
  }, after(P) { const X = UI.trade; if (!X) return; const a = $('#tgme'), b = $('#tgthem'); if (a) a.onchange = () => { X.me.gold = U.clamp(Math.floor(+a.value || 0), 0, S.save.gold); unlock(X); UI.renderPanel(); }; if (b) b.onchange = () => { X.them.gold = U.clamp(Math.floor(+b.value || 0), 0, X.T.gold); unlock(X); UI.renderPanel(); }; } };
  const unlock = X => { if (X.myLock || X.theirLock) X.msg = `${X.T.name}: แก้ข้อเสนอใหม่เหรอ งั้นปลดล็อกก่อนนะ`; X.myLock = false; X.theirLock = false; };

  // ---------- actions ----------
  const act0 = UI.act;
  UI.act = (el, e) => {
    const a = el.dataset.act; if (!a || !a.startsWith('t-')) return act0(el, e);
    const s = S.save, X = UI.trade;
    switch (a) {
      case 't-reqyes': UI.closeModal(); if (UI._treq) UI.startTrade(UI._treq, true); return;
      case 't-reqno': UI.closeModal(); if (UI._treq) { const T = S.traderOf(UI._treq); UI.log(`${T.name}: โอเค ไว้คราวหน้านะ`, 'chat'); } return;
      case 't-open': { const u = W.units.find(x => x.id === +el.dataset.id); if (u) UI.startTrade(u); return; }
      case 't-add': { if (!X || X.myLock) break; const who = el.dataset.who; const sd = X[who]; if (sd.items.length >= MAX_SLOTS) { UI.toast(`ใส่ได้สูงสุด ${MAX_SLOTS} ชิ้น`, 'bad'); break; } const src = who === 'me' ? s.inv.concat(myFash()) : X.T.inv; const it = src.find(i => i.uid === el.dataset.uid); if (it) { sd.items.push(it); unlock(X); } break; }
      case 't-rm': { if (!X || X.myLock) break; X[el.dataset.who].items.splice(+el.dataset.i, 1); unlock(X); break; }
      case 't-lock': { if (!X) break; if (!X.me.items.length && !X.me.gold && !X.them.items.length && !X.them.gold) { X.msg = 'ยังไม่มีข้อเสนอเลย'; break; }
        X.myLock = true; X.msg = `${X.T.name} กำลังพิจารณา...`; UI.renderPanel();
        setTimeout(() => { if (UI.trade !== X || !X.myLock) return; const ev = evalTrade(X), P2 = PERSONAS[X.T.persona];
          if (s.inv.length - X.me.items.length + X.them.items.length > S.invMax) { X.myLock = false; X.msg = 'กระเป๋าของคุณจะเต็ม'; }
          else if (ev.ok) { X.theirLock = true; X.msg = `${X.T.name}: ${U.pick(P2.line)} 🔒 ล็อกแล้ว กดยืนยันได้เลย`; }
          else { X.myLock = false; X.T.mood = Math.max(0.75, X.T.mood - 0.03); const g = Math.ceil(ev.short / 50) * 50; X.msg = !X.them.items.length && !X.them.gold ? `${X.T.name}: อยากได้อะไรตอบแทนล่ะ?` : `${X.T.name}: ${U.pick(P2.no)} ขอเพิ่มอีกประมาณ ${U.fmt(g)} ทอง หรือของที่มูลค่าใกล้เคียง`; X.counter = g; }
          if (UI.panel && UI.panel.id === 'trade') UI.renderPanel(); }, 700 + Math.random() * 700); return; }
      case 't-unlock': if (X) unlock(X); break;
      case 't-ask': { if (!X) break; const ev = evalTrade(X); if (!X.them.items.length) { X.msg = `${X.T.name}: เลือกของฝั่งผมก่อนสิ แล้วผมจะบอกราคา`; break; } X.msg = `${X.T.name}: ของพวกนี้ ผมขอแลกกับของหรือทองมูลค่าราว ${U.fmt(ev.need)}${ev.ok ? ' ซึ่งตอนนี้พอแล้ว' : ` (ตอนนี้ขาด ${U.fmt(ev.short)})`}`; if (!ev.ok && s.gold >= X.me.gold + ev.short) X.msg += ' · ใส่ทองเพิ่มให้ไหม?'; break; }
      case 't-cancel': if (X) { UI.log(`ยกเลิกเทรดกับ ${X.T.name}`, 'sys'); UI.trade = null; } UI.closePanel(); return;
      case 't-confirm': { if (!X || !X.myLock || !X.theirLock) break; const ev = evalTrade(X); if (!ev.ok || s.gold < X.me.gold || X.T.gold < X.them.gold) { unlock(X); X.msg = 'ข้อเสนอเปลี่ยนไป ล็อกใหม่อีกครั้ง'; break; }
        for (const it of X.me.items) { const i = s.inv.indexOf(it); if (i >= 0) s.inv.splice(i, 1); const f = s.fashion.owned.indexOf(it); if (f >= 0) s.fashion.owned.splice(f, 1); X.T.inv.push(it); }
        for (const it of X.them.items) { const i = X.T.inv.indexOf(it); if (i >= 0) X.T.inv.splice(i, 1); if (it.kind === 'fashion') s.fashion.owned.push(it); else s.inv.push(it); }
        s.gold += X.them.gold - X.me.gold; X.T.gold += X.me.gold - X.them.gold; X.T.mood = Math.min(1.1, X.T.mood + 0.04);
        s.tradeLog = s.tradeLog || []; s.tradeLog.unshift({ t: Date.now(), who: X.T.name, gave: X.me.items.map(i => i.name), gg: X.me.gold, got: X.them.items.map(i => i.name), tg: X.them.gold }); s.tradeLog = s.tradeLog.slice(0, 30);
        S.persist(); UI.toast(`เทรดกับ ${X.T.name} สำเร็จ`, 'good'); UI.log(`เทรดสำเร็จกับ ${X.T.name}: ได้ ${X.them.items.length} ชิ้น${X.them.gold ? ` + ${U.fmt(X.them.gold)} ทอง` : ''}`, 'sys');
        if (X.u) { X.u.say = 'ขอบคุณที่เทรดนะ!'; X.u.sayT = W.time + 3; }
        UI.trade = { u: X.u, T: X.T, me: { items: [], gold: 0 }, them: { items: [], gold: 0 }, myLock: false, theirLock: false, msg: `${X.T.name}: ขอบคุณ! แลกอะไรอีกไหม?` }; if (S.autoEquip && s.settings.autoEquip) S.autoEquip(); break; }
    }
    UI.renderPanel();
  };

  // click a simulated player in the world → trade request menu
  const canvas = document.getElementById('cv');
  canvas.addEventListener('click', ev => { if (!W.player || !W.map || !UI.unitAt) return; const r = canvas.getBoundingClientRect(); const sx = (ev.clientX - r.left) / r.width * E.VW, sy = (ev.clientY - r.top) / r.height * E.VH; const t = UI.unitAt(sx, sy); if (t && t.sim) { const T = S.traderOf(t);
    UI._treq = t; UI.modal(`<h2>${esc(T.name)}</h2><div class="treq"><img src="${UI.bodyURL(T.cls)}" alt=""><div><small>Lv${T.lvl} ${esc(D.CLS[T.cls].name)} · นิสัย${PERSONAS[T.persona].th}</small><p>ต้องการทำอะไร?</p></div></div><div class="list"><button class="btn primary" data-act="t-reqyes">ขอเทรด</button><button class="btn" data-act="t-reqno">ปิด</button></div>`); } });

  // incoming trade requests while idle in town
  let reqT = U.rf(90, 180);
  const upd0 = E.update; if (upd0) E.update = function (dt) { const r = upd0.apply(this, arguments); try { if (W.mode && W.mode.kind === 'town' && S.save && S.save.settings.tradeReq !== false) { reqT -= dt; if (reqT <= 0) { reqT = U.rf(150, 300); const L = sims(); if (L.length) UI.tradeRequest(U.pick(L)); } } } catch (e) { } return r; };

  // menu + settings + GM
  if (UI.ICONS) UI.ICONS.MENU.trade = K => { K.L(5, 11, 23, 11, 3, '#4aa3ff'); K.P([[22, 5], [29, 11], [22, 17]], '#4aa3ff'); K.L(27, 21, 9, 21, 3, '#ff8a3a'); K.P([[10, 15], [3, 21], [10, 27]], '#ff8a3a'); };
  const bind0 = UI.bindHud; UI.bindHud = function () { const r = bind0.apply(this, arguments); const m = $('#menu'); if (m && !m.querySelector('[data-p=trade]')) { const b = document.createElement('button'); b.dataset.act = 'panel'; b.dataset.p = 'trade'; b.innerHTML = `<img src="${UI.menuIcon('trade')}" alt=""><span>เทรด</span>`; const set = m.querySelector('[data-p=settings]'); m.insertBefore(b, set); } return r; };
  const op0 = UI.openPanel; UI.openPanel = (id, tab) => { if (id === 'trade' && !tab) tab = UI.trade ? 'deal' : 'near'; return op0(id, tab); };
  const gmR = UI.gmRender; UI.gmRender = (tab, P) => { let h = gmR(tab, P); if (tab === 'sys') h += `<h4>ระบบเทรด</h4><div class="list"><button class="btn" data-act="gm" data-c="treq">ส่งคำขอเทรดเข้ามาทันที</button><button class="btn" data-act="gm" data-c="trefill">เติมของ/ทองให้ผู้เล่นจำลองทั้งหมด</button><button class="btn" data-act="gm" data-c="treqoff">${S.save.settings.tradeReq === false ? 'เปิด' : 'ปิด'}คำขอเทรดอัตโนมัติ</button></div>`; return h; };
  const gmC = UI.gmCmd; UI.gmCmd = (c, el) => { if (c === 'treq') { UI.closePanel(); const L = sims(); if (!L.length) return UI.toast('ต้องอยู่ในเมือง', 'bad'); UI.tradeRequest(U.pick(L)); return; } if (c === 'trefill') { for (const u of sims()) { u.trader = null; S.traderOf(u); } UI.toast('สุ่มของใหม่ให้ผู้เล่นจำลองแล้ว', 'good'); return; } if (c === 'treqoff') { S.save.settings.tradeReq = S.save.settings.tradeReq === false; UI.renderPanel(); return; } return gmC(c, el); };
})(window.G);
