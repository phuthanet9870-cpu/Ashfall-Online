'use strict';
/* Chronomancer · Tick Requiem (rework): opens a clock field on the ground for 6 s (radius 5). Every tick (0.5 s) each
   enemy inside: takes damage, is slowed, has its buffs and shield stripped (the hour hand "rewinds" them), gets ATK −25 %
   and DEF −15 % while inside, and the Chronomancer drains 25 % of that damage as HP. The field is drawn as the clock
   circle with sweeping hands. */
(function (G) {
  const E = G.E, W = G.W, D = G.D, V = G.VFX, U = G.U; if (!E || !E.exec) return;
  const DUR = 8, TICK = 0.5, R = 6; const isSU = (u, s) => !!(u && s && s.setUlt && u.cls === 'chronomancer');
  const fields = [];
  const x0 = E.exec; E.exec = (u, s, A) => { if (!isSU(u, s)) return x0(u, s, A);
    const x = A && typeof A.x === 'number' ? A.x : u.x, y = A && typeof A.y === 'number' ? A.y : u.y;
    const pal = (G.FX6 && G.FX6.PAL && G.FX6.PAL.chronomancer) || ['#e8fff0', '#7affd8', '#2aa88a', '#0a2a22'];
    fields.push({ u, s, x, y, t0: W.time, next: W.time });
    if (V && E.vis(x, y)) { const m0 = V._mine, r0 = V._rel; V._mine = true; V._rel = 1; try { V.fx.push({ k: 'f6sig', x, y, R, sh: 'clock', ticks: 12, pal, dur: DUR, t: 0, ground: true }); V.ring && V.ring(x, y, R, [pal[0], pal[1], pal[2]], 0.6, { w: 3 }); V.shake && V.shake(4, 0.4); } finally { V._mine = m0; V._rel = r0; } }
    return true; };
  const purge = (t) => { const before = t.buffs.length; t.buffs = t.buffs.filter(b => b.v < 0 || String(b.src).startsWith('tickreq')); if (t.shield > 0) t.shield = 0; if (t.buffs.length !== before) E.recalc(t); return before - t.buffs.length; };
  const tick = (dt) => { for (let i = fields.length - 1; i >= 0; i--) { const f = fields[i]; if (W.time - f.t0 >= DUR || f.u.dead || !W.units.includes(f.u)) { fields.splice(i, 1); continue; } f.trap = f.trap || new Set(); for (const t of W.units) { if (t.dead || !E.isEnemy(f.u, t) || !E.targetable(f.u, t)) continue; const dx = t.x - f.x, dy = t.y - f.y, d = Math.hypot(dx, dy); if (d <= R) f.trap.add(t); if (f.trap.has(t)) { if (t._trBase == null) { t._trBase = t.moveSpd; t.moveSpd = t._trBase * 0.3; } t._trUntil = W.time + 0.25; } if (f.trap.has(t) && d > R - 0.35) { const k = (R - 0.35) / (d || 1); t.x = f.x + dx * k; t.y = f.y + dy * k; if (t.kb) t.kb = null; if (t.dashing) t.dashing = false; if (V && E.vis(t.x, t.y) && W.time - (t._trWallT || 0) > 0.6) { t._trWallT = W.time; V.ring && V.ring(t.x, t.y, 0.6, ['#ffffff', '#7affd8', '#2aa88a'], 0.3, { w: 2 }); } } }
      if (W.time < f.next) continue; f.next = W.time + TICK; f.n = (f.n || 0) + 1; f.n = (f.n || 0) + 1;
      let drained = 0; for (const t of W.units) { if (t.dead || !E.isEnemy(f.u, t) || !E.targetable(f.u, t) || U.d2(t.x, t.y, f.x, f.y) > R * R) continue;
        const dmg = E.hit(f.u, t, 1.1, f.s) || 0; drained += dmg;
        E.applyCC(f.u, t, { sl: 0.9 }); t.cc.sl = Math.max(t.cc.sl || 0, 0.9); t._trSlowT = W.time + 0.9;
        E.addBuff(t, 'spd', -70, 0.8, { src: 'tickreq-spd' }); E.addBuff(t, 'aspd', -30, 0.8, { src: 'tickreq-aspd' }); E.addBuff(t, 'atk', -25, 0.8, { src: 'tickreq-atk' }); E.addBuff(t, 'def', -15, 0.8, { src: 'tickreq-def' });
        const n = purge(t); if (n && V && E.vis(t.x, t.y)) V.text(t.x, t.y, 'REWIND', '#7affd8', { size: 7, z: 40 }); }
      if (drained > 0) { E.heal(f.u, f.u, drained * 0.25); } } };
  const restore = () => { for (const t of W.units) if (t._trBase != null && !(t._trUntil > W.time)) { t.moveSpd = t._trBase; t._trBase = null; } };
  const up0 = E.update; E.update = function (dtReal) { const r = up0.apply(this, arguments); try { tick(typeof r === 'number' ? r : Math.min(0.1, dtReal || 0.016)); restore(); } catch (e) { } return r; };
  // describe it in the skill tooltip
  const TH = 'หยุดกาลเวลา: เปิดวงนาฬิกาใหญ่ที่พื้น 8 วิ (รัศมี 6) · ศัตรูที่เข้าวงจะถูกขังออกไม่ได้จนวงหาย · โดนดาเมจทุก 0.5 วิ, เดินช้ามาก (−70%) โจมตีช้าลง 30%, ถูกลบบัฟและโล่ (ย้อนเวลา), ATK −25% DEF −15% · ดูดเลือด 25% ของดาเมจกลับมาเป็น HP';
  const ds0 = D.descSkill; if (ds0) D.descSkill = (s) => s && s.setUlt && s.cls === 'chronomancer' ? TH : ds0(s);
  if (G.SETULT2 && G.SETULT2.chronomancer) G.SETULT2.chronomancer.th = TH; const cc = D.CLS.chronomancer; if (cc && cc.setUlt) cc.setUlt.suTh = TH;
  G.TICKREQ = { fields };
})(window.G);
