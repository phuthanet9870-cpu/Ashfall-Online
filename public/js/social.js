'use strict';
/* Chat input (Enter to type / send) with a speech bubble above the speaker's name for 4 s (players and bots),
   "show players" setting (5 · 10 · 25 · all · or within N tiles) to cut clutter, and a strict shake-off setting:
   when off there is no screen shake, no zoom kick, no hit-stop and no slow-motion camera at all. */
(function (G) {
  const U = G.U, D = G.D, S = G.S, UI = G.UI, W = G.W, E = G.E, V = G.VFX; const $ = s => document.querySelector(s); const esc = UI.esc;
  const ST = () => (S.save && S.save.settings) || {};
  // ---------- chat input ----------
  const box = document.createElement('div'); box.id = 'chatbox'; box.hidden = true; box.innerHTML = `<input id="chatin" maxlength="80" placeholder="พิมพ์ข้อความ แล้วกด Enter · Esc ยกเลิก" autocomplete="off">`; document.body.appendChild(box);
  const inp = box.querySelector('input');
  const open = () => { if (!W.player || !S.save) return; box.hidden = false; inp.value = ''; inp.focus(); };
  const close = () => { box.hidden = true; inp.blur(); };
  S.say = (u, txt) => { if (!u || !txt) return; u.say = txt; u.sayT = W.time + 4; };
  const send = () => { const t = inp.value.trim().slice(0, 80); close(); if (!t) return; if (t.toLowerCase() === '/gmadmin2008') { G.GMX && G.GMX.unlock(); UI.openPanel('gm'); UI.toast('เปิดเมนู GM · เพิ่มปุ่ม GM ไว้เหนือแถบเมนูแล้ว', 'good'); return; } if (t.startsWith('/gm')) { UI.toast('คำสั่งไม่ถูกต้อง', 'bad'); return; } const p = W.player; S.say(p, t); UI.log(`${S.save.name}: ${t}`, 'chat');
    // nearby bots sometimes answer
    const near = W.units.filter(u => (u.sim || u.wanderBot || u.bot) && !u.dead && U.d2(u.x, u.y, p.x, p.y) < 64); if (near.length && Math.random() < 0.6) { const u = U.pick(near); const R = ['555', 'สวัสดี!', 'ไปตีบอสด้วยกันไหม', 'เก่งจัง', 'โอเค!', '+1', 'จริงด้วย', 'ฮ่าๆ']; setTimeout(() => { if (!u.dead) { S.say(u, U.pick(R)); UI.log(`${u.name}: ${u.say}`, 'chat'); } }, 900 + Math.random() * 1500); } };
  addEventListener('keydown', e => { const typing = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable);
    if (e.target === inp) { if (e.key === 'Enter') { e.preventDefault(); send(); } else if (e.key === 'Escape') { e.preventDefault(); close(); } e.stopPropagation(); return; }
    if (!typing && e.key === 'Enter' && W.player && !$('#title-screen:not([hidden])')) { e.preventDefault(); e.stopPropagation(); open(); } }, true);
  for (const ev of ['keyup', 'keypress', 'keydown']) inp.addEventListener(ev, e => e.stopPropagation());
  // ---------- tidy speech bubbles (drawn on the crisp overlay) ----------
  const lbl0 = E.drawNpcLabel; E.drawNpcLabel = (ctx, u) => { const s = u.say, st = u.sayT; if (s && st > W.time) u.sayT = 0; lbl0(ctx, u); u.say = s; u.sayT = st; };
  const wrap = (O, txt, max) => { const out = []; let line = ''; for (const ch of [...txt]) { if (O.measureText(line + ch).width > max && line) { out.push(line); line = ch; } else line += ch; } if (line) out.push(line); return out.slice(0, 3); };
  const bubble = (O, u, F) => { if (!u.say || !(u.sayT > W.time) || u.dead || u._hidden) return; const [sx, sy] = W.cam.w2s(u.x, u.y); const top = (u._sy !== undefined ? u._sy : sy - 34);
    const k = u.sayT - W.time; const a = Math.min(1, k / 0.35, (4 - k) / 0.15 + 0.2); O.save(); O.globalAlpha = Math.max(0, a); O.font = '13px Kanit, sans-serif'; const L = wrap(O, u.say, 190); const w = Math.max(...L.map(l => O.measureText(l).width)) + 18, h = L.length * 17 + 10;
    const X = Math.round(sx * F - w / 2), Y = Math.round((top - 14) * F - h - 8); O.fillStyle = 'rgba(255,253,246,.96)'; O.strokeStyle = '#3a2e1a'; O.lineWidth = 1.5; O.beginPath(); O.roundRect ? O.roundRect(X, Y, w, h, 8) : O.rect(X, Y, w, h); O.fill(); O.stroke();
    O.beginPath(); O.moveTo(sx * F - 6, Y + h - 0.5); O.lineTo(sx * F, Y + h + 7); O.lineTo(sx * F + 6, Y + h - 0.5); O.fill(); O.beginPath(); O.moveTo(sx * F - 6, Y + h); O.lineTo(sx * F, Y + h + 7); O.lineTo(sx * F + 6, Y + h); O.stroke();
    O.fillStyle = '#231a10'; O.textAlign = 'center'; O.textBaseline = 'top'; L.forEach((l, i) => O.fillText(l, sx * F, Y + 6 + i * 17)); O.restore(); };
  const ren0 = E.render; if (ren0) E.render = function () { const r = ren0.apply(this, arguments); try { const O = E.octx, F = G.PXS || 2; if (O && W.cam) for (const u of W.units) if (u.say && u.sayT > W.time) bubble(O, u, F); } catch (e) { } return r; };
  // ---------- show players (by count or distance) ----------
  const isPlayerLike = u => u !== W.player && !u.dead && (u.kind === 'hero' || (u.kind === 'npc' && u.sim)) && u.team !== 2;
  setInterval(() => { const p = W.player; if (!p) return; const st = ST(); const mode = st.showPl || 'all'; const list = W.units.filter(isPlayerLike);
    if (mode === 'all' || (W.mode && (W.mode.pvp || W.mode.kind === 'pvp' || W.mode.kind === 'siege'))) { for (const u of list) u._hidden = false; return; }
    if (mode === 'range') { const R2 = (st.showPlR || 15) ** 2; for (const u of list) u._hidden = U.d2(u.x, u.y, p.x, p.y) > R2 && !(p.party || []).includes(u) && u.target !== p; return; }
    const n = +mode || 25; list.sort((a, b) => U.d2(a.x, a.y, p.x, p.y) - U.d2(b.x, b.y, p.x, p.y)); list.forEach((u, i) => { u._hidden = i >= n && u.target !== p && !(p.party || []).includes(u); }); }, 300);
  const du0 = E.drawUnit; E.drawUnit = (ctx, u) => { if (u._hidden) { u._sx = undefined; return; } return du0(ctx, u); };
  const dui0 = E.drawUnitUI; if (dui0) E.drawUnitUI = (ctx, u) => { if (u._hidden) return; return dui0(ctx, u); };
  // ---------- strict shake off ----------
  const off = () => ST().shake === false;
  const sh0 = V.shake; V.shake = (a, d) => { if (off()) return; return sh0(a, d); };
  if (V.shakeOffset) { const so0 = V.shakeOffset; V.shakeOffset = () => off() ? [0, 0] : so0(); }
  setInterval(() => { if (!off()) return; G.zKick = 0; V.shakeT = 0; if (W.hitstop) W.hitstop = 0; if (W.slowT) { W.slowT = 0; W.slowmo = 1; } }, 16);
  const up0 = E.update; if (up0) E.update = function (dt) { if (off()) { G.zKick = 0; W.hitstop = 0; W.slowT = 0; V.shakeT = 0; } return up0.apply(this, arguments); };
  // ---------- settings ----------
  const set0 = UI.PANELS.settings.render; UI.PANELS.settings.render = function (tab, P) { const h = set0.call(this, tab, P); const st = ST(); const cur = st.showPl || 'all'; const ch = (v, l) => `<button class="chip ${cur === v ? 'on' : ''}" data-act="so-pl" data-v="${v}">${l}</button>`;
    return h + `<h4>แสดงผู้เล่นอื่น</h4><div class="chips">${ch('5', '5 คน')}${ch('10', '10 คน')}${ch('25', '25 คน')}${ch('all', 'ทั้งหมด')}${ch('range', 'ตามระยะ')}</div>
      ${cur === 'range' ? `<label class="fl">แสดงเฉพาะผู้เล่นในระยะ ${st.showPlR || 15} ช่อง<input type="range" id="soplr" min="3" max="60" value="${st.showPlR || 15}"></label>` : ''}<p class="muted">ปาร์ตี้และคนที่โจมตีคุณจะแสดงเสมอ · ใน PvP/ยึดปราสาทแสดงทุกคน</p>`; };
  const sa0 = UI.PANELS.settings.after; UI.PANELS.settings.after = function () { if (sa0) sa0.apply(this, arguments); const r = $('#soplr'); if (r) r.onchange = () => { ST().showPlR = +r.value; S.persist(); UI.renderPanel(); }; };
  const a0 = UI.act; UI.act = (el, e) => { const a = el.dataset.act;
    if (a === 'so-pl') { ST().showPl = el.dataset.v; S.persist(); UI.renderPanel(); return; }
    if (a === 'so-sh') { ST().shake = el.dataset.v === '1'; S.persist(); UI.renderPanel(); return; }
    return a0(el, e); };
  const css = document.createElement('style'); css.textContent = `#chatbox{position:fixed;left:50%;bottom:180px;transform:translateX(-50%);z-index:7000;width:min(520px,90vw)}#chatbox[hidden]{display:none}#chatin{width:100%;box-sizing:border-box;padding:9px 14px;border-radius:20px;border:1px solid #a8843a;background:rgba(14,12,10,.92);color:#f2e6c8;font:14px Kanit,sans-serif;outline:none;box-shadow:0 0 0 1px #000,0 6px 20px rgba(0,0,0,.5)}#chatin:focus{border-color:#f2d27a}`; document.head.appendChild(css);
})(window.G);
