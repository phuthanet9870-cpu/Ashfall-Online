'use strict';
/* Duels: right-click another player character or bot → small menu → "ท้าดวล". Bots answer after a moment (most accept),
   a 3-2-1 countdown starts, only the two duelists can hurt each other, and the duel ends — never with a death — when one
   falls under 10 % HP, walks away (25 tiles) or after 90 s. Both are healed afterwards. Real online players can be
   challenged by message only (no shared combat yet). */
(function (G) {
  const U = G.U, D = G.D, S = G.S, UI = G.UI, W = G.W, E = G.E, V = G.VFX; const esc = UI.esc; const $ = s => document.querySelector(s);
  let duel = null; // { a: player, b: opponent, t0, live }
  const menu = document.createElement('div'); menu.id = 'ctxmenu'; menu.hidden = true; document.body.appendChild(menu);
  const hideMenu = () => { menu.hidden = true; };
  const isFoe = u => u && !u.dead && u !== W.player && (u.kind === 'hero' || (u.kind === 'npc' && u.sim));
  const nameOf = u => String(u.name || 'ผู้เล่น').replace(/^★\s*/, '');
  // ---------- combat rules ----------
  let ieMine = null; const wrapIE = () => { if (E.isEnemy === ieMine) return; const ie0 = E.isEnemy; ieMine = E.isEnemy = (a, b) => { if (duel) { const A = duel.a, B = duel.b; if ((a === A && b === B) || (a === B && b === A)) return duel.live; if (a === B || b === B) return false; } return ie0(a, b); }; };
  wrapIE(); setInterval(wrapIE, 500);
  const hit0 = E.hit; E.hit = (src, t, pow, s, o) => { if (duel && (t === duel.a || t === duel.b)) { const own = src && (src.owner || src); const other = t === duel.a ? duel.b : duel.a; if (own !== other) { if (t === duel.b) return 0; } else if (!duel.live) return 0; }
    const r = hit0(src, t, pow, s, o); if (duel && duel.live && (t === duel.a || t === duel.b) && t.hp < t.maxhp * 0.1) { t.hp = Math.max(1, t.hp); end(t === duel.a ? duel.b : duel.a, 'ko'); } return r; };
  // ---------- opponent from a "sim" townsperson: swap in a fighting bot with the same look ----------
  const fighter = (u) => { if (u.kind === 'hero') return u; const cls = (u.look && u.look.cls) || U.pick(D.CLASSES).id; const P = W.player;
    const b = S.makeBot(D.CLS[cls] ? cls : 'blademaster', 7, P.cpv || 0, 2, { lvl: S.save.lvl, x: u.x, y: u.y, name: nameOf(u), bot: true }); if (u.fashion) b.fashion = u.fashion; E.spawn(b); u._hiddenForDuel = true; u.alpha = 0; b._fromSim = u; return b; };
  const brainOf = (b) => (u, dt) => { if (!duel || duel.b !== u) return; const A = duel.a; E.heroAI(u, dt, { vision: 40, allow: e => e === A }); if (duel && duel.live) u.target = duel.a; };
  const start = (opp) => { const P = W.player; if (!P || P.dead) return; if (duel) return UI.toast('กำลังดวลอยู่แล้ว', 'bad'); if (W.mode && (W.mode.pvp || ['pvp', 'siege', 'dungeon', 'wbarena'].includes(W.mode.kind))) return UI.toast('ท้าดวลไม่ได้ในโหมดนี้', 'bad');
    if (opp.online) { UI.toast(`ส่งคำท้าดวลถึง ${nameOf(opp)} แล้ว (การดวลกับผู้เล่นจริงจะมาในอัปเดตถัดไป)`, 'info'); S.say && S.say(P, `⚔ ${nameOf(opp)} มาดวลกันไหม!`); return; }
    UI.toast(`ท้าดวล ${nameOf(opp)}…`, 'info'); S.say && S.say(P, `⚔ ${nameOf(opp)} ดวลกันหน่อย!`);
    setTimeout(() => { if (opp.dead || !W.player) return; const yes = Math.random() < 0.82; S.say && S.say(opp, yes ? U.pick(['รับคำท้า!', 'มาเลย!', 'ได้เลย อย่าเสียใจนะ', 'จัดไป!']) : U.pick(['ไม่ล่ะ ขอบใจ', 'ยุ่งอยู่', 'ไว้คราวหน้านะ']));
      if (!yes) { UI.toast(`${nameOf(opp)} ปฏิเสธคำท้า`, 'bad'); return; }
      const b = fighter(opp); b._brain0 = b.brain; b.brain = brainOf(b); b._team0 = b.team; duel = { a: W.player, b, t0: W.time, live: false, home: { x: W.player.x, y: W.player.y } };
      E.face(b, W.player.x, W.player.y); let n = 3; const cd = () => { if (!duel) return; if (n > 0) { UI.announce && UI.announce(String(n), `ดวลกับ ${nameOf(b)}`); n--; setTimeout(cd, 800); } else { duel.live = true; duel.t0 = W.time; UI.announce && UI.announce('FIGHT!', 'ลด HP คู่ต่อสู้ให้ต่ำกว่า 10% เพื่อชนะ'); } }; cd(); }, 1000 + Math.random() * 800); };
  const end = (winner, why) => { if (!duel) return; const { a, b } = duel; duel.live = false; const me = winner === a;
    for (const u of [a, b]) { if (!u || u.dead) continue; u.hp = Math.max(u.hp, u.maxhp * 0.3); if (u.cc) for (const k in u.cc) u.cc[k] = 0; u.target = null; }
    if (why === 'ko') { UI.announce && UI.announce(me ? 'ชนะการดวล!' : 'แพ้การดวล', `${nameOf(winner)} เป็นฝ่ายชนะ`); if (V && winner && E.vis(winner.x, winner.y)) V.pillar(winner.x, winner.y, me ? '#ffd84a' : '#ff5a5a', 90, 1, 10); if (me) { S.save.stats.duelWins = (S.save.stats.duelWins || 0) + 1; S.persist(); } S.say && S.say(b, me ? U.pick(['เก่งมาก!', 'ยอมแล้ว ๆ', 'GG']) : U.pick(['ฝึกอีกนะ', 'GG!', 'ง่ายไป~'])); }
    else UI.toast(why === 'far' ? 'การดวลยุติ: ออกนอกระยะ' : 'การดวลยุติ: หมดเวลา', 'info');
    const bb = b; setTimeout(() => { if (bb._fromSim) { const s = bb._fromSim; s.alpha = 1; s._hiddenForDuel = false; s.x = bb.x; s.y = bb.y; bb.removeMe = true; const i = W.units.indexOf(bb); if (i >= 0) W.units.splice(i, 1); } else { bb.brain = bb._brain0; } }, 2500);
    duel = null; };
  setInterval(() => { if (!duel) return; const { a, b } = duel; if (!W.player || a !== W.player || b.dead || a.dead) return end(a.dead ? b : a, 'ko'); if (U.d2(a.x, a.y, b.x, b.y) > 25 * 25) return end(null, 'far'); if (duel.live && W.time - duel.t0 > 90) end(null, 'time'); }, 300);
  // ---------- right-click menu ----------
  const cv = () => document.getElementById('cv');
  const unitAtEvent = (e) => { const c = cv(); if (!c) return null; const r = c.getBoundingClientRect(); return UI.unitAt ? UI.unitAt((e.clientX - r.left) / r.width * E.VW, (e.clientY - r.top) / r.height * E.VH) : null; };
  addEventListener('contextmenu', e => { if (!W.player || (e.target.id !== 'cv' && e.target.id !== 'ov')) return; const u = unitAtEvent(e); if (!isFoe(u)) { hideMenu(); return; } e.preventDefault();
    const cls = D.CLS[u.cls || (u.look && u.look.cls)] || null; menu.innerHTML = `<b>${esc(nameOf(u))}</b><small>${cls ? esc(cls.name) + ' · ' : ''}${u.lvl ? 'Lv ' + u.lvl : ''}${u.online ? ' · ผู้เล่นจริง' : u.kind === 'hero' || u.sim ? ' · บอท' : ''}</small><button data-dm="duel">⚔ ท้าดวล</button><button data-dm="target">🎯 ล็อกเป้า</button><button data-dm="close">ปิด</button>`;
    menu._u = u; menu.hidden = false; const mw = 170, mh = 130; menu.style.left = Math.min(innerWidth - mw - 8, e.clientX + 6) + 'px'; menu.style.top = Math.min(innerHeight - mh - 8, e.clientY + 6) + 'px'; }, true);
  menu.addEventListener('click', e => { const b = e.target.closest('[data-dm]'); if (!b) return; const u = menu._u; hideMenu(); if (!u) return; if (b.dataset.dm === 'duel') start(u); else if (b.dataset.dm === 'target') S.select && S.select(u); });
  addEventListener('mousedown', e => { if (!menu.hidden && !e.target.closest('#ctxmenu')) hideMenu(); }, true);
  addEventListener('keydown', e => { if (e.key === 'Escape') hideMenu(); });
  const du0 = E.drawUnit; E.drawUnit = (ctx, u) => { if (u._hiddenForDuel) return; return du0(ctx, u); };
  S.duelState = () => duel;
  const css = document.createElement('style'); css.textContent = `#ctxmenu{position:fixed;z-index:9200;width:170px;display:flex;flex-direction:column;gap:4px;padding:8px;border-radius:10px;background:linear-gradient(180deg,#221d17,#0e0c0a);border:1px solid #a8843a;box-shadow:0 0 0 1px #000,0 10px 26px rgba(0,0,0,.6);font-family:Kanit,sans-serif;color:#f2e6c8}#ctxmenu[hidden]{display:none}#ctxmenu b{font-size:14px;color:#f2d27a}#ctxmenu small{font-size:11px;color:#a89c84;margin-bottom:2px}#ctxmenu button{text-align:left;padding:6px 9px;border-radius:7px;border:1px solid #3a2e1a;background:#16130f;color:#f2e6c8;font:500 13px Kanit,sans-serif;cursor:pointer}#ctxmenu button:hover{border-color:#f2d27a}#ctxmenu button[data-dm=duel]{border-color:#8a2a2a;background:linear-gradient(180deg,#4a1a1a,#2a0e0e)}`; document.head.appendChild(css);
})(window.G);
