'use strict';
/* Gacha only at the NPCs in front of the Aurelion fountain (one NPC per box), removed from the menu.
   New single-box window (showcase · rates · pity bars · ×1/×10) and a full-screen reveal animation:
   chest shakes → light burst → face-down cards flip one by one, glowing by rarity (click to skip / close). */
(function (G) {
  const U = G.U, D = G.D, S = G.S, UI = G.UI, E = G.E, W = G.W; const esc = UI.esc; const $ = s => document.querySelector(s);
  const BOXES = () => Object.assign({}, UI.GACHA_BOX || {}, { mc: { n: 'กล่องวงแหวนเวท', d: 'สุ่มวงแหวนเวท 9 แบบ (บนหัว / ใต้เท้า / ด้านหลัง) × 10 ธีมสี', cost: 50000, mc: true, icon: () => UI.mcIcon ? UI.mcIcon({ slot: 'f_mcf', mc: 0, colors: ['#4a8aff', '#bff4ff'] }) : '' } });
  const NPC = [['pet', 'ผู้ดูแลไข่สัตว์เลี้ยง', 14, '#ff9a4a'], ['fashion', 'ร้านกล่องแฟชั่น', 18, '#ff7ab0'], ['cset', 'ผู้ผนึกชุดคลาส', 9, '#ffd04a'], ['wings', 'ผู้เฝ้ากล่องปีก', 17, '#7ad0ff'], ['mc', 'นักเวทวงแหวน', 5, '#b07aff']];
  const CHEST = { pet: 5, fashion: 8, cset: 5, wings: 8, mc: 8 };
  const RARC = [{ n: 'ธรรมดา', t: 6, w: 52, c: '#8a96a8' }, { n: 'หายาก', t: 7, w: 28, c: '#3a8aff' }, { n: 'มหากาพย์', t: 8, w: 13, c: '#a85cff' }, { n: 'ตำนาน', t: 9, w: 5.5, c: '#ff9a1e' }, { n: 'ปฐมกาล', t: 10, w: 1.5, c: '#ff5ae8' }];
  const rar = () => UI.GACHA_RAR || RARC;

  // ---------- NPCs in front of the fountain ----------
  const spawnNpcs = () => { const m = W.map; if (!m || m.id !== 'aurelion' || !m.plazaC || !W.player) return; if (W.units.some(u => u.role === 'gacha' && !u.dead)) return;
    const { x: cx, y: cy } = m.plazaC; NPC.forEach(([k, n, art], i) => { const p = S.freePt(m, cx + (i - 2) * 2.4, cy + 4.2); const cls = D.CLASSES[(i * 5) % D.CLASSES.length].id;
      const u = E.mkUnit({ kind: 'npc', team: 9, x: p.x, y: p.y, name: n, role: 'gacha', roleTh: 'กล่องสุ่ม', gk: k, look: G.SPR.lookFor(cls), label: true, st: { def: 0 } }); u._art = art; u.cityNpc = true; u.home = { x: p.x, y: p.y }; E.face(u, p.x, p.y + 1); E.spawn(u); }); };
  setInterval(() => { try { spawnNpcs(); } catch (e) { } }, 700);
  const on0 = UI.openNpc; UI.openNpc = (npc) => { if (npc && npc.role === 'gacha') { UI.openPanel('gacha'); UI.panel.box = npc.gk; UI.panel.res = null; UI.renderPanel(); return; } return on0(npc); };
  // ---------- remove from the menu ----------
  const strip = () => { const b = document.querySelector('#menu [data-p=gacha]'); if (b) b.remove(); };
  const bind0 = UI.bindHud; UI.bindHud = function () { const r = bind0.apply(this, arguments); strip(); return r; }; setInterval(strip, 1500);
  const op0 = UI.openPanel; UI.openPanel = function (id) { const r = op0.apply(this, arguments); if (id === 'gacha' && UI.panel) UI.panel.box = UI.panel.box || null; return r; };

  // ---------- diamonds & tickets ----------
  const DIA_GOLD = 10000, DIA_N = 5, TIX_DIA = 10;
  const wallet = () => { const s = S.save; s.diamond = s.diamond || 0; s.gacha = s.gacha || { pity: {}, tix: 0 }; s.gacha.tix = s.gacha.tix || 0; return s; };
  S.buyDiamond = (packs) => { const s = wallet(); packs = Math.max(1, packs | 0); const cost = packs * DIA_GOLD; if (s.gold < cost) return `ทองไม่พอ (ต้องใช้ ${U.fmt(cost)})`; s.gold -= cost; s.diamond += packs * DIA_N; S.persist(); return { ok: true, msg: `ได้รับเพชร ${packs * DIA_N} เม็ด` }; };
  S.buyTicket = (n) => { const s = wallet(); n = Math.max(1, n | 0); const cost = n * TIX_DIA; if (s.diamond < cost) return `เพชรไม่พอ (ต้องใช้ ${cost})`; s.diamond -= cost; s.gacha.tix += n; S.persist(); return { ok: true, msg: `ได้รับตั๋วสุ่ม ${n} ใบ` }; };
  function shopHtml() { const s = wallet(); const q = UI._g2q || { d: 1, t: 1 };
    return `<div class="g2card g2shop"><h4>แลกเพชร / ซื้อตั๋วสุ่ม</h4>
      <div class="g2wal"><span><img src="${UI.curIcon('gold')}" alt="">${U.fmt(s.gold)}</span><span><img src="${UI.curIcon('diamond')}" alt="">${U.fmt(s.diamond)}</span><span><img src="${UI.curIcon('ticket')}" alt="">${U.fmt(s.gacha.tix)}</span></div>
      <div class="g2ex"><b>เพชร</b><small>${U.fmt(DIA_GOLD)} ทอง → ${DIA_N} เพชร</small><input type="number" id="g2qd" min="1" max="9999" value="${q.d}"><button class="btn" data-act="g2-buyd">แลก ${q.d * DIA_N} เพชร (${U.fmt(q.d * DIA_GOLD)} ทอง)</button></div>
      <div class="g2ex"><b>ตั๋วสุ่ม</b><small>${TIX_DIA} เพชร → 1 ตั๋ว</small><input type="number" id="g2qt" min="1" max="9999" value="${q.t}"><button class="btn primary" data-act="g2-buyt">ซื้อ ${q.t} ตั๋ว (${q.t * TIX_DIA} เพชร)</button></div></div>`; }
  const ICK = G.UI.ICONKIT; const bag0 = UI.bagIcon;
  UI.bagIcon = (k, t) => { if (k === 'diamond' && ICK) return ICK.make('cur-diamond', K => { K.P([[9, 7], [23, 7], [28, 13], [16, 28], [4, 13]], '#bff4ff'); K.P([[9, 7], [13, 13], [4, 13]], '#ffffff'); K.P([[13, 13], [19, 13], [16, 28]], '#7ad8ff'); K.P([[19, 13], [28, 13], [16, 28]], '#3a9ad8'); K.R(10, 9, 3, 2, '#ffffff'); }, { spark: [[25, 5]] });
    if (k === 'ticket' && ICK) return ICK.make('cur-ticket', K => { K.R(3, 9, 26, 15, '#f2c84a'); K.R(5, 11, 22, 11, '#ffe9a8'); K.R(11, 11, 1, 11, '#c8902a'); K.C(3, 16, 2.5, '#120e0a'); K.C(29, 16, 2.5, '#120e0a'); K.P([[19, 12], [21, 15], [24, 15], [22, 18], [23, 21], [19, 19], [16, 21], [17, 18], [14, 15], [17, 15]], '#e0483c'); }, { spark: [[26, 7]] });
    return bag0(k, t); };
  UI.curIcon = (k) => UI.bagIcon(k);
  const cp0 = UI.curPills; UI.curPills = () => { const s = S.save; if (!s) return ''; return cp0() + `<span class="cpill" title="เพชร"><img src="${UI.curIcon('diamond')}" alt="">${U.fmt(s.diamond || 0)}</span><span class="cpill" title="ตั๋วสุ่ม"><img src="${UI.curIcon('ticket')}" alt="">${U.fmt((s.gacha && s.gacha.tix) || 0)}</span>`; };
  // ---------- window ----------
  const CHC = { pet: ['#c87a3a', '#ffd84a'], fashion: ['#c84a8a', '#ffd0f0'], cset: ['#8a5a2a', '#ffe08a'], wings: ['#3a6ab8', '#c8f0ff'], mc: ['#5a3a9a', '#d8b0ff'] };
  const chestImg = k => G.ICONS2 && G.ICONS2.chest ? G.ICONS2.chest(...(CHC[k] || CHC.pet)) : BOXES()[k].icon();
  UI.PANELS.gacha.title = 'กล่องสุ่ม';
  UI.PANELS.gacha.render = function (tab, P) { const s = S.save; s.gacha = s.gacha || { pity: {}, tix: 0 }; const B = BOXES();
    if (!P.box || !B[P.box]) return `<div class="g2none"><img src="${chestImg('pet')}" alt=""><h3>กล่องสุ่มเปิดได้ที่ NPC เท่านั้น</h3><p>ไปที่ลานน้ำพุกลางนครออเรเลียน — มี NPC กล่องสุ่ม ${NPC.length} คนยืนเรียงหน้าน้ำพุ แยกตามหมวด</p>${shopHtml()}<div class="g2npcs">${NPC.map(([k, n, , c]) => `<span style="--c:${c}"><img src="${B[k].icon()}" alt="">${esc(n)} · ${esc(B[k].n)}</span>`).join('')}</div></div>`;
    const k = P.box, b = B[k], col = (NPC.find(x => x[0] === k) || [])[3] || '#f2d27a'; const pity = s.gacha.pity[k] || 0; const R = b.mc ? RARC : rar(); const act = b.mc ? 'g-mc' : 'g-pull';
    const btn = (n) => { const ok = (s.gacha.tix || 0) >= n; return `<button class="g2pull ${n === 10 ? 'ten' : ''}" data-act="${act}" data-k="${k}" data-n="${n}" ${ok ? '' : 'data-poor="1"'}><b>สุ่ม ×${n}</b><span><img src="${UI.curIcon('ticket')}" alt="">ตั๋ว ${n} ใบ</span></button>`; };
    return `<div class="g2" style="--bc:${col}">
      <div class="g2show"><div class="g2rays"></div><img class="g2chest" src="${chestImg(k)}" alt=""><div class="g2ped"></div><h2>${esc(b.n)}</h2><p>${esc(b.d)}</p></div>
      <div class="g2side">
        ${b.mc ? '<div class="g2card"><h4>การันตี</h4><p class="muted">กล่องนี้ไม่มีระบบการันตี</p></div>' : `<div class="g2card"><h4>การันตี</h4><div class="g2bar"><span>มหากาพย์ขึ้นไป</span><i style="width:${(pity % 10) * 10}%"></i><b>${pity % 10}/10</b></div><div class="g2bar leg"><span>ตำนานขึ้นไป</span><i style="width:${Math.min(100, pity / 30 * 100)}%"></i><b>${pity}/30</b></div></div>`}
        <div class="g2card"><h4>อัตราการออก</h4><div class="g2rates">${R.map(r => `<div style="--rc:${r.c}"><i></i><b>${esc(r.n)}</b><small>ระดับ ${r.t}</small><em>${r.w}%</em></div>`).join('')}</div></div>
        <div class="g2btns">${btn(1)}${btn(10)}</div>
        ${shopHtml()}</div>
      ${P.res ? `<div class="g2res"><h4>ผลการสุ่มล่าสุด</h4><div>${P.res.map(x => `<div class="g2it" style="--rc:${x.r.c}" title="${esc(x.n)}"><div class="icell t${x.r.t}"><img src="${x.img}" alt=""></div><small>${esc(x.r.n)}</small></div>`).join('')}</div></div>` : ''}</div>`; };

  const gaf0 = UI.PANELS.gacha.after; UI.PANELS.gacha.after = function () { if (gaf0) gaf0.apply(this, arguments); const d = $('#g2qd'), t = $('#g2qt'); const upd = () => { const qd = U.clamp(+(d && d.value) || 1, 1, 9999), qt = U.clamp(+(t && t.value) || 1, 1, 9999); UI._g2q = { d: qd, t: qt }; const bd = $('[data-act=g2-buyd]'), bt = $('[data-act=g2-buyt]'); if (bd) bd.textContent = `แลก ${qd * DIA_N} เพชร (${U.fmt(qd * DIA_GOLD)} ทอง)`; if (bt) bt.textContent = `ซื้อ ${qt} ตั๋ว (${qt * TIX_DIA} เพชร)`; }; if (d) d.oninput = upd; if (t) t.oninput = upd; };
  // ---------- reveal animation ----------
  const fx = document.createElement('div'); fx.id = 'g2fx'; fx.hidden = true; document.body.appendChild(fx); let stage = 0, timers = [];
  const clear = () => { timers.forEach(clearTimeout); timers = []; };
  const close = () => { clear(); fx.hidden = true; fx.innerHTML = ''; stage = 0; };
  const revealAll = () => { clear(); fx.querySelectorAll('.g2c').forEach(c => c.classList.add('flip')); stage = 3; fx.classList.add('done'); };
  fx.addEventListener('click', () => { if (stage < 3) revealAll(); else close(); });
  const play = (res, k) => { if (!res || !res.length) return; clear(); const R = rar(); const ri = x => Math.max(0, RARC.findIndex(r => r.n === x.r.n)); const best = res.reduce((m, x) => ri(x) > ri(m) ? x : m, res[0]);
    fx.hidden = false; fx.className = ''; stage = 1; fx.style.setProperty('--best', best.r.c);
    fx.innerHTML = `<div class="g2fbg"></div><div class="g2frays"></div><img class="g2fchest" src="${chestImg(k)}" alt=""><div class="g2fflash"></div>
      <div class="g2cards n${res.length}">${res.map((x, i) => `<div class="g2c ${ri(x) >= 3 ? 'leg' : ri(x) >= 2 ? 'epic' : ''}" style="--rc:${x.r.c};--i:${i}"><div class="g2ci"><div class="g2back"></div><div class="g2front"><div class="icell t${x.r.t}"><img src="${x.img}" alt=""></div><b>${esc(x.n)}</b><small>${esc(x.r.n)}</small></div></div></div>`).join('')}</div>
      <p class="g2hint">แตะเพื่อข้าม</p>`;
    timers.push(setTimeout(() => { fx.classList.add('burst'); stage = 2; }, 1100));
    timers.push(setTimeout(() => { fx.classList.add('cards'); }, 1450));
    res.forEach((x, i) => timers.push(setTimeout(() => { const c = fx.querySelectorAll('.g2c')[i]; if (c) c.classList.add('flip'); }, 1900 + i * (res.length > 1 ? 170 : 0))));
    timers.push(setTimeout(() => { stage = 3; fx.classList.add('done'); const h = fx.querySelector('.g2hint'); if (h) h.textContent = 'แตะเพื่อปิด'; }, 2100 + res.length * 170)); };
  const a0 = UI.act; UI.act = (el, e) => { const a = el.dataset.act;
    const qv = () => { UI._g2q = { d: U.clamp(+(($('#g2qd') || {}).value) || 1, 1, 9999), t: U.clamp(+(($('#g2qt') || {}).value) || 1, 1, 9999) }; return UI._g2q; };
    if (a === 'g2-buyd') { const r = S.buyDiamond(qv().d); UI.toast(r.ok ? r.msg : r, r.ok ? 'good' : 'bad'); UI.renderPanel(); return; }
    if (a === 'g2-buyt') { const r = S.buyTicket(qv().t); UI.toast(r.ok ? r.msg : r, r.ok ? 'good' : 'bad'); UI.renderPanel(); return; }
    if ((a === 'g-pull' || a === 'g-mc') && !el.dataset.k2) { const s = wallet(); const n = +el.dataset.n || 1; if (s.gacha.tix < n) { UI.toast(`ตั๋วสุ่มไม่พอ (ต้องใช้ ${n} ใบ) — ซื้อตั๋วด้วยเพชรด้านล่าง`, 'bad'); return; }
      const B = BOXES(); const k = el.dataset.k || 'mc'; const cost = (B[k] ? B[k].cost : 50000) * (n === 10 ? 9 : 1); s.gacha.tix -= n; s.gold += cost; delete el.dataset.tix; }
    if (a === 'g-pull' || a === 'g-mc') { const P = UI.panel; const before = P && P.res; const r = a0(el, e); const P2 = UI.panel; if (P2 && P2.res && P2.res !== before) play(P2.res, el.dataset.k || 'mc'); return r; }
    return a0(el, e); };

  const css = document.createElement('style'); css.textContent = `
  .g2{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:14px;color:#e8e0cc}
  .g2show{position:relative;overflow:hidden;border-radius:12px;border:1px solid #6a5428;background:#14110e;background:radial-gradient(circle at 50% 42%,color-mix(in srgb,var(--bc) 30%,#1a1612),#0a0908 70%);min-height:330px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:14px;text-align:center}
  .g2rays{position:absolute;left:50%;top:42%;width:520px;height:520px;margin:-260px 0 0 -260px;background:repeating-conic-gradient(from 0deg,color-mix(in srgb,var(--bc) 30%,transparent) 0 8deg,transparent 8deg 22deg);opacity:.45;animation:g2spin 24s linear infinite;mask:radial-gradient(circle,#000 20%,transparent 65%);-webkit-mask:radial-gradient(circle,#000 20%,transparent 65%)}
  @keyframes g2spin{to{transform:rotate(360deg)}}
  .g2chest{position:relative;width:150px;height:150px;image-rendering:pixelated;filter:drop-shadow(0 0 18px var(--bc));animation:g2bob 2.6s ease-in-out infinite;margin-bottom:auto;margin-top:26px}
  @keyframes g2bob{50%{transform:translateY(-8px)}}
  .g2ped{position:relative;width:210px;height:26px;margin-top:-6px;border-radius:50%;background:radial-gradient(ellipse,color-mix(in srgb,var(--bc) 60%,#fff) ,transparent 70%);opacity:.55}
  .g2show h2{position:relative;margin:10px 0 2px;font-size:22px;color:#f2d27a;text-shadow:0 2px 0 #000}.g2show p{position:relative;margin:0;font-size:12.5px;color:#c8bca0}
  .g2side{display:flex;flex-direction:column;gap:10px}
  .g2card{border:1px solid #4a3c22;border-radius:10px;background:linear-gradient(180deg,#1c1915,#121010);padding:9px 12px}.g2card h4{margin:0 0 7px!important}
  .g2bar{position:relative;height:22px;border-radius:11px;background:#0a0908;border:1px solid #4a3c22;overflow:hidden;margin:5px 0;font-size:11.5px}
  .g2bar i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#6a3aa8,#b07aff);transition:width .4s}.g2bar.leg i{background:linear-gradient(90deg,#a85a10,#ffb03a)}
  .g2bar span{position:absolute;left:10px;top:50%;transform:translateY(-50%);z-index:1;color:#f0e6d0;text-shadow:0 1px 2px #000}.g2bar b{position:absolute;right:10px;top:50%;transform:translateY(-50%);z-index:1;color:#fff;text-shadow:0 1px 2px #000}
  .g2rates{display:grid;gap:4px}.g2rates div{display:grid;grid-template-columns:10px 1fr auto auto;gap:8px;align-items:center;font-size:12.5px}.g2rates i{width:10px;height:10px;border-radius:50%;background:var(--rc);box-shadow:0 0 6px var(--rc)}.g2rates b{color:var(--rc)}.g2rates small{color:#9a8e78}.g2rates em{font-style:normal;color:#f2d27a;font-weight:600}
  .g2btns{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .g2pull{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;padding:10px 8px;border-radius:10px;cursor:pointer;border:1px solid #8a6a2a;background:linear-gradient(180deg,#3a3026,#1a1612);color:#f2e6c8;font-family:inherit;transition:transform .1s,filter .15s}
  .g2pull b{font-size:16px}.g2pull span{display:flex;align-items:center;gap:4px;font-size:13px;color:#f2d27a}.g2pull img{width:16px;height:16px}
  .g2pull.ten{background:linear-gradient(180deg,#f6dc8a,#b8862a);color:#1a1206;border-color:#f6dc8a;box-shadow:0 0 16px rgba(246,220,138,.35)}.g2pull.ten span{color:#3a2606}
  .g2pull i{position:absolute;top:-8px;right:-6px;font-style:normal;font-size:10.5px;background:#c8283c;color:#fff;padding:1px 6px;border-radius:8px}
  .g2pull.tix{grid-column:1/-1}.g2pull:hover{filter:brightness(1.12);transform:translateY(-1px)}.g2pull[data-poor]{opacity:.55}
  .g2shop{display:flex;flex-direction:column;gap:7px}.g2wal{display:flex;gap:8px;flex-wrap:wrap}.g2wal span{display:flex;align-items:center;gap:4px;padding:3px 10px;border-radius:12px;background:#0c0a08;border:1px solid #4a3c22;font-size:13px;color:#f2d27a}.g2wal img{width:18px;height:18px}
  .g2ex{display:grid;grid-template-columns:auto 1fr 76px;grid-template-rows:auto auto;gap:3px 8px;align-items:center}.g2ex b{color:#f2e6c8;font-size:13px}.g2ex small{color:#a89c84;font-size:11.5px}.g2ex input{grid-row:1/3;grid-column:3;width:72px;padding:6px;border-radius:6px;border:1px solid #6a5428;background:#0c0a08;color:#f2d27a;font:600 14px Kanit,sans-serif;text-align:center}.g2ex .btn{grid-column:1/3;font-size:12.5px;padding:6px 8px}
  .g2gold{margin:0;text-align:right;font-size:12.5px;color:#a89c84;display:flex;align-items:center;justify-content:flex-end;gap:4px}.g2gold img{width:16px}.g2gold b{color:#f2d27a}
  .g2res{grid-column:1/-1}.g2res>div{display:flex;flex-wrap:wrap;gap:8px}.g2it{display:flex;flex-direction:column;align-items:center;gap:2px}.g2it .icell{box-shadow:0 0 0 1px var(--rc),0 0 10px color-mix(in srgb,var(--rc) 50%,transparent)}.g2it small{font-size:10.5px;color:var(--rc)}
  .g2none{text-align:center;padding:20px}.g2none img{width:110px;image-rendering:pixelated}.g2none h3{color:#f2d27a}.g2npcs{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}.g2npcs span{display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:14px;border:1px solid var(--c);font-size:12.5px}.g2npcs img{width:22px}
  @media (max-width:760px){.g2{grid-template-columns:1fr}.g2show{min-height:250px}.g2chest{width:110px;height:110px}}
  #g2fx{position:fixed;inset:0;z-index:8000;display:flex;align-items:center;justify-content:center;cursor:pointer;font-family:Kanit,sans-serif;overflow:hidden}#g2fx[hidden]{display:none}
  .g2fbg{position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,rgba(30,24,16,.88),rgba(0,0,0,.96));animation:g2in .3s}
  @keyframes g2in{from{opacity:0}}
  .g2frays{position:absolute;left:50%;top:50%;width:1400px;height:1400px;margin:-700px 0 0 -700px;background:repeating-conic-gradient(color-mix(in srgb,var(--best) 45%,transparent) 0 6deg,transparent 6deg 18deg);mask:radial-gradient(circle,#000 10%,transparent 60%);-webkit-mask:radial-gradient(circle,#000 10%,transparent 60%);opacity:.0;animation:g2spin 14s linear infinite;transition:opacity .6s}
  #g2fx.burst .g2frays{opacity:.6}
  .g2fchest{position:absolute;left:50%;top:50%;width:190px;height:190px;margin:-95px 0 0 -95px;image-rendering:pixelated;filter:drop-shadow(0 0 30px var(--best));animation:g2shake .12s linear infinite,g2grow 1.1s ease-in forwards}
  @keyframes g2shake{25%{translate:-5px 2px}50%{translate:4px -3px}75%{translate:-3px -2px}}
  @keyframes g2grow{to{transform:scale(1.35)}}
  #g2fx.burst .g2fchest{animation:none;transform:scale(2.2);opacity:0;transition:transform .35s,opacity .35s}
  .g2fflash{position:absolute;inset:0;background:radial-gradient(circle,#fff,color-mix(in srgb,var(--best) 60%,transparent) 40%,transparent 70%);opacity:0;pointer-events:none}
  #g2fx.burst .g2fflash{animation:g2flash .7s ease-out}@keyframes g2flash{0%{opacity:0}15%{opacity:1}100%{opacity:0}}
  .g2cards{position:relative;display:grid;grid-template-columns:repeat(5,128px);gap:14px;opacity:0;transform:scale(.85);transition:opacity .35s,transform .35s}.g2cards.n1{grid-template-columns:150px}
  #g2fx.cards .g2cards{opacity:1;transform:none}
  .g2c{width:100%;aspect-ratio:3/4;perspective:700px;opacity:0;transform:translateY(30px);animation:g2deal .35s ease-out forwards;animation-delay:calc(var(--i) * 45ms + 1.45s)}
  @keyframes g2deal{to{opacity:1;transform:none}}
  .g2ci{position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform .5s cubic-bezier(.3,1.4,.5,1)}.g2c.flip .g2ci{transform:rotateY(180deg)}
  .g2back,.g2front{position:absolute;inset:0;border-radius:10px;backface-visibility:hidden;-webkit-backface-visibility:hidden}
  .g2back{background:repeating-linear-gradient(45deg,#2a2218 0 6px,#1c1610 6px 12px);border:2px solid #a8843a;box-shadow:inset 0 0 0 4px #120e0a,inset 0 0 0 5px #6a5428}
  .g2back::after{content:"✦";position:absolute;inset:0;display:grid;place-items:center;font-size:34px;color:#f2d27a;text-shadow:0 0 12px #f2d27a}
  .g2front{transform:rotateY(180deg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:8px;text-align:center;background:#14110e;background:radial-gradient(circle at 50% 35%,color-mix(in srgb,var(--rc) 35%,#1a1612),#0c0a08);border:2px solid var(--rc);box-shadow:0 0 18px color-mix(in srgb,var(--rc) 60%,transparent)}
  .g2front .icell{width:56px;height:56px}.g2front .icell img{width:48px;height:48px}.g2front b{font-size:11.5px;color:#f2ead6;line-height:1.25;max-height:2.6em;overflow:hidden}.g2front small{font-size:12px;font-weight:700;color:var(--rc);text-shadow:0 0 8px var(--rc)}
  .g2c.leg.flip .g2front{animation:g2leg 1.2s ease-in-out infinite alternate}@keyframes g2leg{to{box-shadow:0 0 34px var(--rc),0 0 60px color-mix(in srgb,var(--rc) 50%,transparent)}}
  .g2hint{position:absolute;bottom:22px;left:0;right:0;text-align:center;color:#c8bca0;font-size:13px;animation:g2p 1.4s ease-in-out infinite}@keyframes g2p{50%{opacity:.4}}
  @media (max-width:760px){.g2cards{grid-template-columns:repeat(3,96px);gap:8px}.g2cards.n1{grid-template-columns:130px}}`;
  document.head.appendChild(css);
})(window.G);
