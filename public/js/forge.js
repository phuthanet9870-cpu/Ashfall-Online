'use strict';
(function (init) {
  (globalThis.ASHFALL_SIM_FACTORIES ||= {})['forge'] = init;
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
/* Blacksmith forge v2 — three tabs in one framed page:
   · ตีบวก: anvil stage with the item on a glowing ring, 10 level pips, a circular success gauge, stat preview,
     material slots and a big hammer button; success / failure flash with the result text.
   · เจาะช่อง: drill extra gem sockets (gear up to 4, weapon up to 5, relic up to 3) — gold + diamonds, rising
     cost and falling success chance; click a socket to set / remove a gem.
   · สุ่มค่าพลัง: re-roll the main stat value (±), re-roll all random sub stats (reroll stone or diamonds), or re-roll
     a single sub (Reforge scroll / gold); shows the item's roll quality. */
(function (G) {
  const U = G.U, D = G.D, S = G.S, UI = G.UI, W = G.W, V = G.VFX; const esc = UI.esc; const rf = (a, b) => a + Math.random() * (b - a);
  const fmtV = (s, v) => D.PCT[s] ? (Math.round(v * 10) / 10) + '%' : U.fmt(Math.round(v));
  const find = uid => UI.findItem(uid);
  const MAXE = 10;
  // ---------- sockets ----------
  const sockMax = it => it.kind === 'relic' ? 3 : it.slot === 'weapon' ? 5 : 4;
  const DRILL_RATE = [100, 100, 85, 70, 50, 35];
  const drillCost = it => { const n = (it.sockets || []).length; return { gold: Math.round(3000 * (it.tier || 1) * Math.pow(n + 1, 1.6) * (1 + (it.ilv || 1) / 50)), dia: n >= 2 ? (n - 1) * 5 : 0, rate: DRILL_RATE[n] || 25 }; };
  S.drillSocket = (it) => { const s = S.save; if (!it || !(it.kind === 'gear' || it.kind === 'relic')) return 'เจาะได้เฉพาะเกียร์และ Relic'; it.sockets = it.sockets || [];
    if (it.sockets.length >= sockMax(it)) return `ช่องเต็มแล้ว (${sockMax(it)} ช่อง)`; const c = drillCost(it);
    if (s.gold < c.gold) return `ทองไม่พอ (ต้องใช้ ${U.fmt(c.gold)})`; if ((s.diamond || 0) < c.dia) return `เพชรไม่พอ (ต้องใช้ ${c.dia})`; s.gold -= c.gold; s.diamond = (s.diamond || 0) - c.dia;
    if (Math.random() * 100 < c.rate) { it.sockets.push(null); S.refreshPlayer(); S.persist(); return { ok: true, msg: `เจาะช่องสำเร็จ! ตอนนี้มี ${it.sockets.length} ช่อง` }; }
    S.persist(); return { ok: false, msg: 'เจาะช่องล้มเหลว — สูญเสียวัสดุ (ไอเทมไม่เสียหาย)' }; };
  // ---------- stat rerolls ----------
  const MAIN_COST = it => Math.round(1500 * (it.tier || 1) * (1 + (it.ilv || 1) / 40));
  S.rerollMain = (it) => { const s = S.save; if (!it || !it.main) return 'ไอเทมนี้ไม่มีค่าหลัก'; const c = MAIN_COST(it); if (s.gold < c) return `ทองไม่พอ (ต้องใช้ ${U.fmt(c)})`;
    let base = it._mainBase; if (!base) { try { const f = S.genItem(it.kind, it.tier, it.ilv, { slot: it.slot, cls: it.cls || s.cls }); if (f && f.main && f.main.s === it.main.s) base = f.main.v; } catch (e) { } base = base || it.main.v; it._mainBase = base; }
    s.gold -= c; const r = rf(0.8, 1.3); const old = it.main.v; it.main.v = D.PCT[it.main.s] ? Math.round(base * r * 10) / 10 : Math.round(base * r); S.refreshPlayer(); S.persist();
    return { ok: true, msg: `ค่าหลัก ${D.STAT_TH[it.main.s] || it.main.s}: ${fmtV(it.main.s, old)} → ${fmtV(it.main.s, it.main.v)} (${Math.round(r * 100)}%)`, up: it.main.v >= old }; };
  // ---------- page ----------
  const pips = lv => `<div class="fg-pips">${Array.from({ length: MAXE }, (_, i) => `<i class="${i < lv ? 'on' : ''} ${i >= 5 ? 'hi' : ''}"></i>`).join('')}</div>`;
  const gauge = (rate, label) => `<div class="fg-gauge" style="--p:${rate}"><div><b>${rate}%</b><small>${label}</small></div></div>`;
  const mat = (img, have, need, name) => `<div class="fg-mat ${have >= need ? '' : 'no'}"><img src="${img}" alt=""><span>${esc(name)}</span><b>${U.fmt(have)} / ${U.fmt(need)}</b></div>`;
  const stage = (sel, P) => `<div class="fg-stage ${P.ffx ? 'fx-' + P.ffx : ''}"><div class="fg-rays"></div><div class="fg-ring t${sel.tier}"></div><div class="fg-item icell t${sel.tier}"><img src="${UI.itemIcon(sel)}" alt="">${sel.lv ? `<i>+${sel.lv}</i>` : ''}</div><div class="fg-anvil"></div>${P.fmsg ? `<div class="fg-res ${P.ffx}">${esc(P.fmsg)}</div>` : ''}</div>`;
  const statRows = (sel) => { const rows = []; if (sel.main) rows.push(`<div class="fg-st main"><span>${esc(D.STAT_TH[sel.main.s] || sel.main.s)}</span><b>${fmtV(sel.main.s, sel.main.v)}</b></div>`);
    for (const sb of sel.subs || []) rows.push(`<div class="fg-st ${sb.enh ? 'enh' : ''} ${sb.sig ? 'sig' : ''}"><span>${sb.enh ? '◆ ' : sb.sig ? '★ ' : ''}${esc(D.STAT_TH[sb.s] || sb.s)}</span><b>+${fmtV(sb.s, sb.v)}</b></div>`); return rows.join(''); };
  const tabEnh = (sel, P) => { const s = S.save; const lv = sel.lv || 0; if (sel.kind !== 'gear') return `<p class="muted">ตีบวกได้เฉพาะเกียร์ (เครื่องประดับไปที่ช่างอัญมณี)</p>`;
    if (lv >= MAXE) return `<div class="fg-max">✦ ตีบวกสูงสุด +${MAXE} แล้ว ✦</div>`;
    const c = S.enchantCost(sel); const rate = S.enchantRate(lv); const st = Math.min(10, sel.tier); const have = s.bag.stones[st - 1];
    const risk = lv >= 9 ? 'ล้มเหลวอาจลดระดับ' : lv >= 5 ? 'ล้มเหลวไม่ลดระดับ' : 'สำเร็จแน่นอน';
    return `<div class="fg-row">${gauge(rate, 'โอกาสสำเร็จ')}<div class="fg-next"><div class="fg-lvl"><b>+${lv}</b><i>➜</i><b class="up">+${lv + 1}</b></div>${sel.main ? `<div class="fg-gain">${esc(D.STAT_TH[sel.main.s] || sel.main.s)} เพิ่มขึ้น +6% · ได้ออปชั่นสุ่มใหม่ 1 อัน</div>` : ''}<div class="fg-risk ${lv >= 9 ? 'bad' : ''}">${risk}</div></div></div>
      <div class="fg-mats">${mat(UI.curIcon('gold'), s.gold, c.gold, 'ทอง')}${mat(UI.bagIcon('stone', st - 1), have, c.stones, 'หินตีบวก ระดับ ' + st)}${P.prot ? mat(UI.bagIcon('protect'), s.bag.protect, 1, 'Protect Scroll') : ''}</div>
      <label class="chk fg-prot"><input type="checkbox" data-act="x-prot" ${P.prot ? 'checked' : ''}> ใช้ Protect Scroll กันลดระดับ (มี ${s.bag.protect})</label>
      <button class="fg-go" data-act="${P.prot ? 'enchantp' : 'enchant'}"><span>🔨 ตีบวก +${lv + 1}</span></button>`; };
  const tabDrill = (sel, P) => { const s = S.save; if (!(sel.kind === 'gear' || sel.kind === 'relic')) return '<p class="muted">เจาะช่องได้เฉพาะเกียร์และ Relic</p>'; sel.sockets = sel.sockets || []; const mx = sockMax(sel); const gems = s.inv.filter(i => i.kind === 'gem');
    const slots = Array.from({ length: mx }, (_, i) => { const g = sel.sockets[i]; if (i >= sel.sockets.length) return `<div class="fg-sock lock" title="ยังไม่ได้เจาะ">×</div>`; return g ? `<button class="fg-sock on" data-act="unsocket" data-i="${i}" title="คลิกเพื่อถอด ${esc(g.name)} (${100 * g.tier} ทอง)"><img src="${UI.itemIcon(g)}" alt=""></button>` : `<div class="fg-sock empty" title="ช่องว่าง — เลือกเจมด้านล่าง">+</div>`; }).join('');
    let h = `<div class="fg-socks">${slots}</div><p class="muted center">ช่องเจม ${sel.sockets.filter(Boolean).length}/${sel.sockets.length} · เจาะได้สูงสุด ${mx} ช่อง</p>`;
    if (sel.sockets.length < mx) { const c = drillCost(sel); h += `<div class="fg-row">${gauge(c.rate, 'โอกาสเจาะสำเร็จ')}<div class="fg-next"><div class="fg-lvl"><b>${sel.sockets.length}</b><i>➜</i><b class="up">${sel.sockets.length + 1} ช่อง</b></div><div class="fg-risk">ล้มเหลว: เสียวัสดุ ไอเทมไม่เสียหาย</div></div></div>
      <div class="fg-mats">${mat(UI.curIcon('gold'), s.gold, c.gold, 'ทอง')}${c.dia ? mat(UI.curIcon('diamond'), s.diamond || 0, c.dia, 'เพชร') : ''}</div><button class="fg-go drill" data-act="fg-drill"><span>⛏ เจาะช่องที่ ${sel.sockets.length + 1}</span></button>`; }
    else h += '<div class="fg-max">✦ เจาะครบทุกช่องแล้ว ✦</div>';
    if (sel.sockets.includes(null)) h += `<h4 class="fg-h">ใส่เจม (${gems.length})</h4><div class="fg-gems">${gems.length ? gems.slice(0, 40).map(g => `<button class="icell t${g.tier}" data-act="socket" data-g="${g.uid}" title="${esc(g.name)}"><img src="${UI.itemIcon(g)}" alt=""></button>`).join('') : '<span class="muted">ไม่มีเจมในกระเป๋า</span>'}</div>`;
    return h; };
  const tabRoll = (sel, P) => { const s = S.save; const n = s.bag.reroll || 0; const q = sel.q;
    let h = `<div class="fg-q"><span>คุณภาพการสุ่ม</span><div class="fg-qbar"><i style="width:${q || 0}%"></i></div><b>${q != null ? q + '%' : '—'}</b></div><div class="fg-stats">${statRows(sel)}</div><div class="fg-rolls">`;
    if (sel.main) { const c = MAIN_COST(sel); h += `<div class="fg-rc"><b>🎲 สุ่มค่าหลัก</b><small>สุ่มค่า ${esc(D.STAT_TH[sel.main.s] || sel.main.s)} ใหม่ 80–130% ของค่าฐาน</small>${mat(UI.curIcon('gold'), s.gold, c, 'ทอง')}<button class="btn primary" data-act="fg-main">สุ่มค่าหลัก</button></div>`; }
    if (sel.subs && sel.subs.length) h += `<div class="fg-rc"><b>🎲 สุ่มค่ารองทั้งหมด</b><small>สุ่มชนิดและค่าของออปชั่นรอง + ออปชั่นตีบวกใหม่ทั้งหมด</small>${mat(UI.bagIcon('reroll'), n, 1, 'หินสุ่มออปชั่น')}<div class="fg-two"><button class="btn primary" data-act="rr-use" data-uid="${sel.uid}" ${n ? '' : 'disabled'}>ใช้หิน</button><button class="btn" data-act="rr-buy" data-uid="${sel.uid}"><img src="${UI.curIcon('diamond')}" alt="" class="fg-ci">3 เพชร</button></div></div>`;
    if (sel.kind === 'gear' && sel.subs && sel.subs.filter(x => !x.enh && !x.sig).length) h += `<div class="fg-rc wide"><b>🔧 Reforge ทีละค่า</b><small>Reforge Scroll ${s.bag.reforge} หรือ ${U.fmt(300 * sel.tier)} ทอง ต่อครั้ง</small><div class="fg-chips">${sel.subs.map((sb, i) => sb.enh || sb.sig ? '' : `<button class="mini-btn" data-act="reforge" data-i="${i}">${esc(D.STAT_TH[sb.s] || sb.s)} ${fmtV(sb.s, sb.v)}</button>`).join('')}</div></div>`;
    return h + '</div>'; };
  const n0 = UI.npcRender; UI.npcRender = (P) => { if (P.role !== 'smith') return n0(P); const s = S.save;
    const ok = i => i && (i.kind === 'gear' || i.kind === 'relic'); const eqd = Object.values(s.eq).filter(ok); const pool = P.onlyEq ? eqd : eqd.concat(s.inv.filter(ok));
    if (!P.sel || !find(P.sel)) P.sel = pool[0] ? pool[0].uid : null; const sel = P.sel ? find(P.sel) : null; P.ftab = P.ftab || 'enh';
    const TABS = [['enh', '🔨 ตีบวก'], ['drill', '⛏ เจาะช่อง'], ['roll', '🎲 สุ่มค่าพลัง']];
    const list = pool.map(it => `<button class="fg-li ${P.sel === it.uid ? 'on' : ''}" data-act="fg-sel" data-uid="${it.uid}"><span class="icell t${it.tier}"><img src="${UI.itemIcon(it)}" alt="">${it.lv ? `<i>+${it.lv}</i>` : ''}</span><span class="fg-ln"><b class="tc t${it.tier}">${esc(it.name)}</b><small>${eqd.includes(it) ? '<em>สวมอยู่</em> · ' : ''}${(it.sockets || []).length ? "ช่อง " + it.sockets.length + ' · ' : ''}${it.q != null ? 'Q' + it.q + '%' : 'iLv ' + it.ilv}</small></span></button>`).join('');
    const body = !sel ? '<p class="muted center">ไม่มีเกียร์ให้ตีบวก</p>' : P.ftab === 'drill' ? tabDrill(sel, P) : P.ftab === 'roll' ? tabRoll(sel, P) : tabEnh(sel, P);
    const out = `<div class="fg"><div class="fg-left"><label class="chk"><input type="checkbox" data-act="x-onlyeq" ${P.onlyEq ? 'checked' : ''}> เฉพาะที่สวมใส่</label><div class="fg-list">${list || '<span class="muted">ว่าง</span>'}</div></div>
      <div class="fg-main">${sel ? `<div class="fg-title"><b class="tc t${sel.tier}">${esc(sel.name)}${sel.lv ? ' +' + sel.lv : ''}</b><small>ระดับ ${sel.tier} ${esc(D.TIERS[sel.tier - 1].n)} · iLv ${sel.ilv}</small></div>${stage(sel, P)}${sel.kind === 'gear' ? pips(sel.lv || 0) : ''}` : ''}</div>
      <div class="fg-right"><div class="fg-tabs">${TABS.map(([k, n]) => `<button class="${P.ftab === k ? 'on' : ''}" data-act="fg-tab" data-v="${k}">${n}</button>`).join('')}</div><div class="fg-body">${body}</div><div id="npcmsg" class="npcmsg"></div></div></div>`;
    P.ffx = null; P.fmsg = null; return out; };
  // ---------- actions (wrap enchant/socket/reforge/reroll to drive the stage effect) ----------
  const fx = (ok, msg) => { const P = UI.panel; if (!P || P.role !== 'smith') return; P.ffx = ok ? 'ok' : 'fail'; P.fmsg = msg; const p = W.player; if (ok && p && V) try { V.pillar(p.x, p.y, '#ffd84a', 80, 0.8, 8); } catch (e) { } };
  const a0 = UI.act; UI.act = (el, e) => { const a = el.dataset.act, P = UI.panel;
    if (!P || P.id !== 'npc' || P.role !== 'smith') return a0(el, e);
    const sel = P.sel ? find(P.sel) : null; const msg = r => typeof r === 'string' ? r : r && r.msg;
    switch (a) {
      case 'fg-sel': P.sel = el.dataset.uid; UI.renderPanel(); return;
      case 'fg-tab': P.ftab = el.dataset.v; UI.renderPanel(); return;
      case 'fg-drill': { const r = S.drillSocket(sel); if (typeof r === 'string') { UI.toast(r, 'bad'); return; } fx(r.ok, r.msg); UI.toast(r.msg, r.ok ? 'good' : 'bad'); UI.renderPanel(); return; }
      case 'fg-main': { const r = S.rerollMain(sel); if (typeof r === 'string') { UI.toast(r, 'bad'); return; } fx(r.up, r.msg); UI.toast(r.msg, r.up ? 'good' : 'info'); UI.renderPanel(); return; }
      case 'enchant': case 'enchantp': { if (!sel) return; const lv0 = sel.lv || 0; const r = S.enchant(sel, a === 'enchantp'); const m = msg(r) || ''; const up = (sel.lv || 0) > lv0; if (typeof r === 'string') { UI.toast(r, 'bad'); return; } fx(up, m || (up ? `สำเร็จ! +${sel.lv}` : 'ล้มเหลว')); UI.toast(m || (up ? 'สำเร็จ' : 'ล้มเหลว'), up ? 'good' : 'bad'); UI.renderPanel(); return; }
      case 'rr-use': case 'rr-buy': { const r = S.rerollOptions(sel, a === 'rr-buy'); if (typeof r === 'string') { UI.toast(r, 'bad'); return; } fx(true, r.msg); UI.toast(r.msg, 'good'); UI.renderPanel(); return; }
      case 'reforge': { if (!sel) return; const r = S.reforge(sel, +el.dataset.i); if (typeof r === 'string') { UI.toast(r, 'bad'); return; } if (r) { fx(!!r.ok, r.msg); UI.toast(r.msg, r.ok ? 'good' : 'bad'); } UI.renderPanel(); return; }
    }
    return a0(el, e); };
  const css = document.createElement('style'); css.textContent = `
  .fg{display:grid;grid-template-columns:minmax(190px,240px) minmax(220px,1fr) minmax(280px,1.15fr);gap:12px;min-height:440px}
  .fg-left{display:flex;flex-direction:column;gap:6px;min-height:0}.fg-list{flex:1;overflow:auto;max-height:58vh;display:flex;flex-direction:column;gap:4px;padding-right:4px}
  .fg-li{display:flex;gap:8px;align-items:center;padding:5px 6px;border:1px solid #3a2f1c;border-radius:8px;background:linear-gradient(90deg,#1a1510,#100d0a);color:#e8dcc0;text-align:left;cursor:pointer}
  .fg-li:hover{border-color:#8a6a2a}.fg-li.on{border-color:#f2d27a;box-shadow:0 0 0 1px #f2d27a inset,0 0 10px rgba(242,210,122,.25)}
  .fg-li .icell{width:40px;height:40px;flex:none;position:relative}.fg-li .icell i{position:absolute;right:1px;bottom:0;font:700 10px sans-serif;color:#ffe9a8;text-shadow:0 1px 2px #000;font-style:normal}
  .fg-ln{min-width:0}.fg-ln b{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fg-ln small{color:#9a8a6a;font-size:10.5px}.fg-ln em{color:#7affb0;font-style:normal}
  .fg-main{display:flex;flex-direction:column;align-items:center;gap:8px;border:1px solid #3a2f1c;border-radius:12px;padding:10px;background:radial-gradient(ellipse at 50% 40%,#2a1f12 0%,#120e0a 70%)}
  .fg-title{text-align:center}.fg-title b{display:block;font-size:16px}.fg-title small{color:#a8987a}
  .fg-stage{position:relative;width:220px;height:220px;display:flex;align-items:center;justify-content:center}
  .fg-rays{position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 0deg,transparent 0 10deg,rgba(255,200,90,.10) 10deg 20deg,transparent 20deg 40deg,rgba(255,200,90,.08) 40deg 50deg,transparent 50deg 80deg,rgba(255,200,90,.1) 80deg 90deg,transparent 90deg 120deg,rgba(255,200,90,.08) 120deg 130deg,transparent 130deg 170deg,rgba(255,200,90,.1) 170deg 180deg,transparent 180deg);animation:fgspin 18s linear infinite;mask:radial-gradient(circle,#000 30%,transparent 70%);-webkit-mask:radial-gradient(circle,#000 30%,transparent 70%)}
  .fg-ring{position:absolute;width:170px;height:170px;border-radius:50%;border:2px solid rgba(242,210,122,.55);box-shadow:0 0 22px rgba(242,180,80,.35),inset 0 0 22px rgba(242,180,80,.25);animation:fgpulse 2.4s ease-in-out infinite}
  .fg-ring::before{content:'';position:absolute;inset:10px;border-radius:50%;border:1px dashed rgba(242,210,122,.45);animation:fgspin 30s linear infinite reverse}
  .fg-item{position:relative;width:96px!important;height:96px!important;z-index:2;box-shadow:0 0 24px rgba(0,0,0,.6)}.fg-item img{width:84px;height:84px}
  .fg-item i{position:absolute;right:-6px;top:-10px;font:900 20px/1 Georgia,serif;color:#ffe9a8;text-shadow:0 0 6px #ff9a2e,0 2px 2px #000;font-style:normal}
  .fg-anvil{position:absolute;bottom:6px;width:120px;height:20px;border-radius:50%;background:radial-gradient(ellipse,rgba(0,0,0,.65),transparent 70%)}
  .fg-stage.fx-ok .fg-ring{animation:fgok .9s ease-out;border-color:#ffe24a}.fg-stage.fx-ok .fg-item{animation:fghit .5s ease-out}
  .fg-stage.fx-fail .fg-ring{animation:fgfail .9s ease-out;border-color:#ff5a4a}.fg-stage.fx-fail .fg-item{animation:fgshake .45s ease-out}
  .fg-res{position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);white-space:nowrap;max-width:300px;overflow:hidden;text-overflow:ellipsis;padding:4px 12px;border-radius:999px;font-weight:700;font-size:12px;z-index:3;animation:fgres 2.6s ease-out forwards}
  .fg-res.ok{background:linear-gradient(#ffe9a0,#d8a030);color:#3a2408;box-shadow:0 0 16px rgba(255,210,80,.6)}.fg-res.fail{background:linear-gradient(#ff8a7a,#a8302a);color:#fff}
  .fg-pips{display:flex;gap:5px}.fg-pips i{width:14px;height:14px;transform:rotate(45deg);border:1px solid #6a5530;background:#1a140c}.fg-pips i.on{background:linear-gradient(135deg,#fff3c0,#e8b040);box-shadow:0 0 6px #ffcf5a}.fg-pips i.hi.on{background:linear-gradient(135deg,#ffd0f0,#ff6ad0);box-shadow:0 0 7px #ff6ad0}
  .fg-right{display:flex;flex-direction:column;gap:8px;min-width:0}
  .fg-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}.fg-tabs button{padding:8px 4px;border:1px solid #4a3c22;border-radius:8px;background:linear-gradient(#211a12,#130f0b);color:#c8b890;font-weight:700;cursor:pointer}
  .fg-tabs button.on{border-color:#f2d27a;color:#2a1a06;background:linear-gradient(#ffe9a0,#d8a030);box-shadow:0 0 10px rgba(242,210,122,.4)}
  .fg-body{border:1px solid #3a2f1c;border-radius:12px;padding:12px;background:linear-gradient(180deg,#17120d,#0d0a08);display:flex;flex-direction:column;gap:10px}
  .fg-row{display:flex;gap:14px;align-items:center}
  .fg-gauge{--p:50;width:96px;height:96px;flex:none;border-radius:50%;background:conic-gradient(#ffd25a calc(var(--p)*1%),#2a2117 0);display:flex;align-items:center;justify-content:center;box-shadow:0 0 14px rgba(255,200,80,.25)}
  .fg-gauge>div{width:76px;height:76px;border-radius:50%;background:#110d09;display:flex;flex-direction:column;align-items:center;justify-content:center}.fg-gauge b{font:800 21px/1 Georgia,serif;color:#ffe9a8}.fg-gauge small{font-size:9.5px;color:#a8987a}
  .fg-next{flex:1;min-width:0}.fg-lvl{display:flex;align-items:center;gap:8px;font:800 22px Georgia,serif;color:#e8dcc0}.fg-lvl i{color:#a8843a;font-style:normal;font-size:16px}.fg-lvl .up{color:#7affb0;text-shadow:0 0 8px rgba(122,255,176,.5)}
  .fg-gain{font-size:12px;color:#d8c8a0;margin-top:2px}.fg-risk{font-size:11.5px;color:#9fe8ff;margin-top:3px}.fg-risk.bad{color:#ff8a7a}
  .fg-mats{display:flex;flex-wrap:wrap;gap:6px}.fg-mat{display:flex;align-items:center;gap:6px;padding:5px 8px;border:1px solid #3e321e;border-radius:8px;background:#1c160f;font-size:11.5px;color:#c8b890}
  .fg-mat img{width:24px;height:24px;image-rendering:pixelated}.fg-mat b{color:#7affb0;margin-left:2px}.fg-mat.no b{color:#ff7a6a}
  .fg-go{position:relative;padding:12px;border-radius:10px;border:1px solid #ffe9a0;background:linear-gradient(#ffd96a,#c8841e);color:#2a1606;font:900 17px sans-serif;cursor:pointer;overflow:hidden;box-shadow:0 4px 0 #6a4210,0 0 18px rgba(255,190,70,.45)}
  .fg-go:hover{filter:brightness(1.08)}.fg-go:active{transform:translateY(3px);box-shadow:0 1px 0 #6a4210}.fg-go::after{content:'';position:absolute;top:0;left:-60%;width:40%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);transform:skewX(-20deg);animation:fgshine 2.8s ease-in-out infinite}
  .fg-go.drill{background:linear-gradient(#9fe8ff,#3a8ac8);border-color:#d0f4ff;box-shadow:0 4px 0 #1a4a6a,0 0 18px rgba(120,210,255,.45)}
  .fg-prot{font-size:12px}.fg-max{text-align:center;padding:16px;font:800 16px Georgia,serif;color:#ffe9a8;text-shadow:0 0 10px #ff9a2e}
  .fg-socks{display:flex;justify-content:center;gap:10px;padding:6px}.fg-sock{width:52px;height:52px;display:flex;align-items:center;justify-content:center;transform:rotate(45deg);border:2px solid #6a5530;background:#120e0a;color:#6a5530;font-size:18px}
  .fg-sock>*{transform:rotate(-45deg)}.fg-sock.empty{border-color:#9fe8ff;color:#9fe8ff;box-shadow:0 0 10px rgba(159,232,255,.35) inset}.fg-sock.on{border-color:#f2d27a;cursor:pointer;box-shadow:0 0 12px rgba(242,210,122,.4)}.fg-sock.on img{width:38px;height:38px;image-rendering:pixelated}.fg-sock.lock{opacity:.5}
  .fg-sock.lock{font-size:15px}.fg-h{margin:2px 0}.fg-gems{display:grid;grid-template-columns:repeat(auto-fill,44px);gap:5px;max-height:150px;overflow:auto}.fg-gems .icell{width:44px;height:44px;cursor:pointer}
  .fg-q{display:flex;align-items:center;gap:8px;font-size:12px;color:#c8b890}.fg-qbar{flex:1;height:10px;border-radius:6px;background:#241d14;border:1px solid #3e321e;overflow:hidden}.fg-qbar i{display:block;height:100%;background:linear-gradient(90deg,#ff7a5a,#ffd25a,#7affb0)}.fg-q b{color:#ffe9a8}
  .fg-stats{display:grid;grid-template-columns:1fr 1fr;gap:3px 10px;padding:8px;border:1px solid #2e2516;border-radius:8px;background:#100c09}.fg-st{display:flex;justify-content:space-between;font-size:12px;color:#d8c8a0}.fg-st b{color:#fff}.fg-st.main{grid-column:1/-1;color:#ffe9a8;font-weight:700}.fg-st.enh{color:#ff9ad8}.fg-st.sig{color:#ffd25a}
  .fg-rolls{display:grid;grid-template-columns:1fr 1fr;gap:8px}.fg-rc{display:flex;flex-direction:column;gap:5px;padding:9px;border:1px solid #3e321e;border-radius:10px;background:linear-gradient(#1c160f,#110d09)}.fg-rc.wide{grid-column:1/-1}.fg-rc b{color:#ffe9a8}.fg-rc small{color:#9a8a6a;font-size:11px}
  .fg-two{display:flex;gap:5px}.fg-two .btn{flex:1}.fg-ci{width:16px;height:16px;vertical-align:middle;margin-right:3px}.fg-chips{display:flex;flex-wrap:wrap;gap:4px}.center{text-align:center}
  @keyframes fgspin{to{transform:rotate(360deg)}}@keyframes fgpulse{50%{box-shadow:0 0 34px rgba(242,180,80,.5),inset 0 0 26px rgba(242,180,80,.35)}}
  @keyframes fgok{0%{transform:scale(.7);box-shadow:0 0 80px #ffe24a}100%{transform:scale(1)}}@keyframes fgfail{0%{transform:scale(1.15);box-shadow:0 0 60px #ff3a2a}100%{transform:scale(1)}}
  @keyframes fghit{30%{transform:scale(1.18)}100%{transform:scale(1)}}@keyframes fgshake{20%{transform:translateX(-7px)}40%{transform:translateX(7px)}60%{transform:translateX(-4px)}80%{transform:translateX(3px)}}
  @keyframes fgres{0%{opacity:0;transform:translate(-50%,8px)}12%{opacity:1;transform:translate(-50%,0)}80%{opacity:1}100%{opacity:0}}@keyframes fgshine{0%,60%{left:-60%}100%{left:130%}}
  @media (max-width:900px){.fg{grid-template-columns:1fr}.fg-list{max-height:180px}.fg-stage{width:180px;height:180px}.fg-rolls{grid-template-columns:1fr}}`;
  document.head.appendChild(css);
})(G);

});
