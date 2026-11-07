'use strict';
/* Basic attack: click an enemy to lock it (red ring under the target); the hero walks into range and auto-attacks with a
   class-themed normal attack, independent from skills. Moving (WASD), clicking the ground or Esc releases the lock. */
(function (G) {
  const U = G.U, D = G.D, E = G.E, W = G.W, S = G.S, V = G.VFX, UI = G.UI;
  const MELEE = { melee: 1, tank: 1, assassin: 1, hybrid: 1 };
  const rangeOf = (u) => { const c = D.CLS[u.cls]; return MELEE[c.role] ? 1.5 + 0.15 * (u.sc || 1) : Math.max(4.5, c.rng || 6); };
  S.basic = { lock: null };
  const valid = (p, t) => t && !t.dead && E.isEnemy(p, t) && E.targetable(p, t);
  const swing = (u, t) => {
    const c = D.CLS[u.cls]; const melee = !!MELEE[c.role]; const pal = (G.FX6 && G.FX6.PAL[u.cls]) || D.ELEM[c.elem].pal; const ang = Math.atan2(t.y - u.y, t.x - u.x);
    E.face(u, t.x, t.y); u.anim.at = 0.3; const pow = 1.0; const s0 = { elem: c.elem, cc: {} };
    if (melee) {
      E.hit(u, t, pow, s0);
      if (E.vis(t.x, t.y)) { V.fx.push({ k: 'f6cres', t: 0, x: u.x, y: u.y, follow: null, a: ang, R: 1.05, w: 0.2, sw: 1.7, pal, dur: 0.18, flip: (u._bsw = !u._bsw), jag: false, delay: 0 }); if (G.FX6) G.FX6.mini(u, t.x, t.y, ang); }
    } else {
      const d = Math.hypot(t.x - u.x, t.y - u.y); const tt = Math.max(0.08, d / 16); const sh = (G.FX6 && G.FX6.PROJ[u.cls] && (G.FX6.PROJ[u.cls].find(Boolean))) || 'orb';
      if (E.vis(u.x, u.y)) V.fly(u.x, u.y, t.x, t.y, sh, pal[0], 4, tt, { spin: 0, arc: 0, z: 14 });
      E.later(tt, () => { if (u.dead || t.dead) return; E.hit(u, t, pow, s0); if (E.vis(t.x, t.y) && G.FX6) G.FX6.mini(u, t.x, t.y, ang); });
    }
  };
  // player control: chase + attack the locked target
  const pc0 = S.playerControl;
  S.playerControl = (u, dt) => {
    const B = S.basic; const IN = S.IN; const k = IN.keys; const manual = k && (k.has('w') || k.has('a') || k.has('s') || k.has('d') || k.has('arrowup') || k.has('arrowdown') || k.has('arrowleft') || k.has('arrowright')) || (IN.joy && (IN.joy.x || IN.joy.y));
    if (manual) B.lock = null;
    if (B.lock && !valid(u, B.lock)) B.lock = null;
    const L = B.lock;
    if (!L || IN.clickMove || u.pending || manual) return pc0(u, dt);
    // keep the original controller for queued skills / potions, but drive movement ourselves
    const auto = S.auto.on; S.auto.on = false; try { pc0(u, dt); } finally { S.auto.on = auto; }
    if (u.target !== L) S.select(L);
    const d = Math.hypot(L.x - u.x, L.y - u.y); const R = rangeOf(u);
    u.bcd = (u.bcd || 0) - dt;
    if (d > R) { if (E.canMove(u)) E.walkTo(u, L.x, L.y, dt, R * 0.85); }
    else if (u.bcd <= 0 && E.canAct(u) && !(u.cc && u.cc.st > 0)) { u.bcd = 0.85 / (1 + (u.st.aspd || 0) / 100); swing(u, L); }
  };
  // click handling: enemy click locks, ground click releases (runs after the default tap handler)
  const hook = () => { const cv = document.getElementById('game') || document.querySelector('canvas'); if (!cv || cv._basic) return; cv._basic = true;
    cv.addEventListener('click', () => { const p = W.player; if (!p) return; if (S.IN.clickMove && !S.IN.clickMove.npc) { S.basic.lock = null; return; } const t = p.target; if (valid(p, t) && !S.IN.clickMove) { S.basic.lock = t; p.bcd = Math.min(p.bcd || 0, 0.05); } });
    addEventListener('keydown', e => { if (e.key === 'Escape') S.basic.lock = null; }); };
  document.addEventListener('DOMContentLoaded', hook); setTimeout(hook, 0);
  // red lock ring under the target (drawn before the unit so it sits on the ground)
  const install = () => { if (E._basicRing) return; E._basicRing = true; const du = E.drawUnit;
    E.drawUnit = (ctx, u) => { const L = S.basic.lock; if (L === u && !u.dead) { const [sx, sy] = W.cam.w2s(u.x, u.y); const T = G.TS; let r = T * (0.55 + 0.25 * (u.sc || 1)); if (E.MON48 && E.MON48.isPx(u) && G.MON48) { const e = G.MON48.list[u.md.px]; r = Math.max(r, (e.bb[2] - e.bb[0]) * 0.55); } if (u.md && u.md.duel && G.BOSS_MAN && G.BOSS_MAN[u.md.duel]) r = Math.max(r, G.BOSS_MAN[u.md.duel].cw * 0.45);
        const t = W.time; ctx.save(); ctx.translate(Math.round(sx), Math.round(sy)); ctx.scale(1, 0.45);
        ctx.globalAlpha = 0.28; ctx.fillStyle = '#ff2a2a'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
        ctx.globalAlpha = 0.95; ctx.strokeStyle = '#ff3a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke();
        ctx.rotate(t * 1.6); ctx.strokeStyle = '#ffd0c0'; ctx.lineWidth = 1.5; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(0, 0, r * 1.18, i * Math.PI / 2 + 0.25, i * Math.PI / 2 + 1.05); ctx.stroke(); }
        ctx.restore(); }
      return du(ctx, u); }; };
  document.addEventListener('DOMContentLoaded', install); setTimeout(install, 0);
  // hint in skills panel
  if (UI.PANELS && UI.PANELS.skills) { const r0 = UI.PANELS.skills.render; UI.PANELS.skills.render = function (tab, P) { return '<p class="muted">โจมตีปกติ: คลิกศัตรูเพื่อล็อกเป้า (วงแดงใต้ตัว) ตัวละครจะเดินเข้าไปโจมตีเองต่อเนื่อง ใช้สกิลไปพร้อมกันได้ · เดิน/คลิกพื้น/Esc เพื่อยกเลิก</p>' + r0.call(this, tab, P); }; }
})(window.G);
