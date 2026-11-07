'use strict';
/* Auto v2 (player): clean target lock, straight approach to attack range (no orbit / random strafe / offset goals),
   stuck detection with temporary blacklist, loot pickup only nearby, roaming inside the chosen range.
   Range: 5 · 10 · 20 · 40 · 80 tiles around the start point, or the whole map. PvP / siege keep their team brains. */
(function (G) {
  const U = G.U, D = G.D, S = G.S, UI = G.UI, W = G.W, E = G.E, V = G.VFX; const $ = s => document.querySelector(s);
  const RANGES = [5, 10, 20, 40, 80, 0]; // 0 = whole map
  const cfg = () => { const a = S.af ? S.af() : (S.save.settings.af = S.save.settings.af || {}); if (a.range === undefined) a.range = a.area === 'map' ? 0 : (a.radius || 10); return a; };
  const anchor = (u) => { const a = cfg(); const id = W.map && W.map.id; if (!a.anc || a.anc.mid !== id) a.anc = { mid: id, x: u.x, y: u.y }; return a.anc; };
  S.autoResetAnchor = () => { const u = W.player, a = cfg(); if (u && W.map) a.anc = { mid: W.map.id, x: u.x, y: u.y }; };
  const TEAM_KINDS = ['pvp', 'siege', 'gallery'];
  const ab0 = S.autoBrain;
  const st = u => u._a2 || (u._a2 = { t: null, bl: new Map(), chk: 0, lastD: 0, stuck: 0, roam: null, roamT: 0 });
  const okMob = (u, e, a, A, R2, ctl) => { if (e.dead || e === u || !E.isEnemy(u, e) || !E.targetable(u, e) || e.kind === 'npc' || e.kind === 'struct' && !(ctl && ctl.siegeTarget)) return false;
    if (e.kind === 'mob') { if (!e.isWB && !e.wbAdd && a.grades && a.grades[e.grade || 'normal'] === false) return false; if (e.md && a.skip && a.skip[e.md.n]) return false; }
    if (e.kind === 'hero') { const hitMe = e.target === u && (W.time - (e.lastHitT || 0) < 4 || u.combatT < 2); if (!(a.players === 'all' || (a.players === 'red' && e.red) || hitMe)) return false; }
    if (ctl && ctl.allow && !ctl.allow(e)) return false;
    if (R2 && U.d2(e.x, e.y, A.x, A.y) > R2) return e.target === u; // attackers are always answered
    return true; };
  // never wander onto warp portals / gates: they would teleport the player away from the farming spot
  const nearPortal = (x, y, r) => { const m = W.mode, mp = W.map; const L = [...((m && m.portals) || []), ...((mp && mp.warps) || [])]; return L.some(p => p && typeof p.x === 'number' && (p.x - x) ** 2 + (p.y - y) ** 2 < r * r); };
  const brain = (u, dt) => { const m = W.mode; const ctl = m && m.autoCtl ? (m.autoCtl(u) || {}) : {}; const a = cfg(); const s = st(u); const A = anchor(u);
    S.save.settings.autoLoot = a.loot !== false;
    if (a.sellFull && S.save.inv.length >= S.invMax - 2) { let gsum = 0, n = 0; for (const it of S.save.inv.slice()) if (!it.lock && it.tier <= 3 && S.isEquip(it) && !it.cset) { gsum += S.sell(it); n++; } if (n) UI.toast(`ออโต้: กระเป๋าใกล้เต็ม ขายของระดับ 1–3 ${n} ชิ้น (+${U.fmt(gsum)} ทอง)`, 'info'); }
    const R = a.range || 0; const R2 = R ? (R + 0.5) * (R + 0.5) : 0;
    // ring showing the range
    if (R && V && V.ring) { s.ringT = (s.ringT || 0) - dt; if (s.ringT <= 0) { s.ringT = 1.6; V.ring(A.x, A.y, R, ['#ffffff', '#f2d27a', '#a8843a'], 1.6, { w: 1, grow: false }); } }
    // blacklist expiry
    for (const [e, t] of s.bl) if (t < W.time || e.dead) s.bl.delete(e);
    // keep / pick target
    let t = s.t; if (t && (!okMob(u, t, a, A, R2, ctl) || s.bl.has(t))) t = null;
    s.pick = (s.pick || 0) - dt;
    if (!t || s.pick <= 0) { s.pick = 0.6; let best = null, bs = 1e9; const cur = t;
      for (const e of W.units) { if (s.bl.has(e) || !okMob(u, e, a, A, R2, ctl)) continue; let sc = Math.hypot(e.x - u.x, e.y - u.y);
        if (ctl.prefer && ctl.prefer(e)) sc -= 8; if (a.priority === 'elite' && e.grade && e.grade !== 'normal') sc -= 10; if (a.priority === 'weak') sc -= (1 - e.hp / e.maxhp) * 8;
        if (e.target === u) sc -= 4; if (e === cur) sc *= 0.6; // hysteresis: only switch for a clearly better target
        if (sc < bs) { bs = sc; best = e; } }
      if (best !== t) { s.chk = 0; s.lastD = best ? Math.hypot(best.x - u.x, best.y - u.y) : 0; s.stuck = 0; } t = best; }
    s.t = t;
    // loot nearby when not fighting
    if (S.save.settings.autoLoot && W.loots.length && !(m && m.kind === 'dungeon') && !(t && Math.hypot(t.x - u.x, t.y - u.y) < 3.5)) {
      let bl = null, bd = 64; for (const l of W.loots) { if ((R2 && U.d2(l.x, l.y, A.x, A.y) > R2) || nearPortal(l.x, l.y, 2)) continue; const d = U.d2(u.x, u.y, l.x, l.y); if (d < bd) { bd = d; bl = l; } }
      if (bl) { E.walkTo(u, bl.x, bl.y, dt, 0.3); return; } }
    if (t) {
      // stuck detection: no progress toward an out-of-range target → blacklist for 10 s
      const d = Math.hypot(t.x - u.x, t.y - u.y); const rng = (D.CLS[u.cls] || {}).rng || 2; s.chk += dt;
      if (s.chk > 2) { if (d > rng + 1.5 && s.lastD - d < 0.6 && E.canMove(u)) { s.stuck++; if (s.stuck >= 1) { s.bl.set(t, W.time + 10); s.t = null; s.stuck = 0; return; } } else s.stuck = 0; s.chk = 0; s.lastD = d; }
      s.idle = 0; s.warned = false; u.target = t; const ai = u.ai; ai.focus = t;
      // straight-line slot: angle always points from the target to me, no flank / strafe / orbit
      ai.flank = 0; ai.strafe = null; ai.rad = 0; ai.retarget = 99; const ang = Math.atan2(u.y - t.y, u.x - t.x); ai.ang = ang - W.time * 0.15 * (u.id % 2 ? 1 : -1);
      E.heroAI(u, dt, Object.assign({}, ctl, { vision: 999, allow: e => e === t || e.target === u }));
      ai.focus = null; if (u.target) S.select(u.target); return; }
    s.idle = (s.idle || 0) + dt; if (R && s.idle > 8) { s.idle = 0; let best = null, bd = 1e18; for (const e of W.units) { if (!okMob(u, e, a, A, 0, ctl) || e.kind !== 'mob' || nearPortal(e.x, e.y, 4)) continue; const d = U.d2(e.x, e.y, u.x, u.y); if (d < bd) { bd = d; best = e; } } if (best) { a.anc = { mid: W.map.id, x: best.x, y: best.y }; s.roam = null; UI.toast(`ออโต้: ไม่มีมอนสเตอร์ในระยะ ${R} ช่อง — ย้ายจุดศูนย์กลางไปยังกลุ่มมอนสเตอร์ที่ใกล้ที่สุด`, 'info'); } }
    // nothing to fight: follow the mode's goal (dungeon portal, boss …) or roam inside the range
    const g = ctl.goal ? ctl.goal(u) : null;
    if (g && !(m && m.kind === 'farm')) { if (U.d2(u.x, u.y, g.x, g.y) > 0.5) E.walkTo(u, g.x, g.y, dt, g.r || 0.6); return; }
    s.roamT -= dt; if (!s.roam || s.roamT <= 0 || U.d2(u.x, u.y, s.roam.x, s.roam.y) < 1.2) { s.roamT = 8; const mp = W.map; const rr = R || Math.max(mp.w, mp.h) * 0.45; const cx = R ? A.x : mp.w / 2, cy = R ? A.y : mp.h / 2; const ang = Math.random() * 6.283, dd = Math.sqrt(Math.random()) * rr * 0.9; let tries = 0; do { const an2 = Math.random() * 6.283, d2 = Math.sqrt(Math.random()) * rr * 0.9; s.roam = S.freePt(mp, U.clamp(cx + Math.cos(an2) * d2, 2, mp.w - 2), U.clamp(cy + Math.sin(an2) * d2, 2, mp.h - 2)); } while (nearPortal(s.roam.x, s.roam.y, 4.5) && ++tries < 25); if (nearPortal(s.roam.x, s.roam.y, 4.5)) s.roam = null; }
    if (!s.roam) return;
    E.walkTo(u, s.roam.x, s.roam.y, dt, 0.8); };
  S.autoBrain = (u, dt) => { const m = W.mode; if (!m || TEAM_KINDS.includes(m.kind)) return ab0(u, dt); u.ai.diff = D.DIFFS[3]; u.ai.persona = 'bold'; try { return brain(u, dt); } catch (e) { return ab0(u, dt); } };
  // reset the start point whenever auto is switched on / the map changes
  let was = false; setInterval(() => { const on = !!(S.auto && S.auto.on); if (on && !was && W.player) { S.autoResetAnchor(); if (W.player._a2) W.player._a2 = null; } was = on; }, 250);

  // ---------- settings: range chips up to the whole map ----------
  const P0 = UI.PANELS.autoset && UI.PANELS.autoset.render;
  if (P0) UI.PANELS.autoset.render = function () { let h = P0.apply(this, arguments); const a = cfg(); const mp = W.map;
    const chips = RANGES.map(r => `<button class="chip ${a.range === r ? 'on' : ''}" data-act="a2-range" data-v="${r}">${r ? r + ' ช่อง' : 'ทั้งแมพ'}</button>`).join('');
    const max = mp ? Math.max(mp.w, mp.h) : 200;
    const blk = `<h4>ระยะออโต้</h4><div class="gmrow">${chips}</div><label class="fl">ระยะ ${a.range ? a.range + ' ช่อง รอบจุดเริ่ม' : 'ทั้งแมพ'}<input type="range" id="a2rad" min="3" max="${max}" value="${a.range || max}"></label>
      <div class="gmrow"><button class="btn" data-act="a2-anchor">📍 ตั้งจุดเริ่มที่ตำแหน่งปัจจุบัน</button><small class="muted">${a.range ? (a.anc ? `จุดเริ่ม: ${a.anc.x.toFixed(0)}, ${a.anc.y.toFixed(0)} · ตั้งใหม่อัตโนมัติทุกครั้งที่เปิดออโต้` : 'จะใช้ตำแหน่งตอนเปิดออโต้') : 'ตีมอนทุกตัวในแผนที่ ตัวที่ใกล้ที่สุดก่อน'}</small></div>`;
    h = h.replace(/<h4>พื้นที่ออโต้<\/h4>[\s\S]*?(?=<h4>จัดลำดับเป้าหมาย<\/h4>)/, blk);
    return h.replace(/<button class="btn[^"]*" data-act="autoq">[^<]*<\/button>/, '').replace(/<p class="muted">(?:ขณะเปิดออโต้ภารกิจ|ภารกิจหลัก)[^<]*<\/p>/, ''); };
  const af0 = UI.PANELS.autoset && UI.PANELS.autoset.after; if (UI.PANELS.autoset) UI.PANELS.autoset.after = function () { if (af0) af0.apply(this, arguments); const r = $('#a2rad'); if (r) r.onchange = () => { const mp = W.map; const v = +r.value; cfg().range = mp && v >= Math.max(mp.w, mp.h) ? 0 : v; S.persist(); UI.renderPanel(); }; };
  const act0 = UI.act; UI.act = (el, e) => { const k = el.dataset.act;
    if (k === 'a2-range') { const a = cfg(); a.range = +el.dataset.v; a.area = a.range ? 'area' : 'map'; if (a.range) S.autoResetAnchor(); S.persist(); UI.renderPanel(); UI.toast(a.range ? `ระยะออโต้ ${a.range} ช่อง` : 'ระยะออโต้: ทั้งแมพ', 'info'); return; }
    if (k === 'a2-anchor') { S.autoResetAnchor(); S.persist(); UI.renderPanel(); UI.toast('ตั้งจุดเริ่มออโต้แล้ว', 'good'); return; }
    return act0(el, e); };
})(window.G);
