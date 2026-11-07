'use strict';
/* Ground-targeted casting: pressing an area skill shows a circle (skill radius) that follows the mouse plus the cast-range
   ring; click the ground to cast there. Press the same key again to cast at the cursor · right-click / Esc / WASD cancels. */
(function (G) {
  const U = G.U, D = G.D, E = G.E, W = G.W, S = G.S, UI = G.UI;
  const AIM = { ground: 1, zone: 1, trap: 1, leap: 1 };
  const aimable = s => s && AIM[s.arch] && !s.setUlt;
  S.aim = null;
  const cancel = () => { S.aim = null; document.body.classList.remove('aiming'); };
  const castAt = (x, y) => { const a = S.aim, p = W.player; if (!a || !p) return cancel(); const s = E.skillOf(p, a.i); const R = (s.R || 6) + 0.2; const d = Math.hypot(x - p.x, y - p.y); if (d > R) { x = p.x + (x - p.x) / d * R; y = p.y + (y - p.y) / d * R; }
    cancel(); if (E.ready(p, a.i)) E.cast(p, a.i, { x, y }); };
  S.aimCancel = cancel;
  const tc0 = S.tryCast; S.tryCast = (u, i) => { if (u !== W.player || (S.auto && S.auto.on) || S.settingsQuickCast()) return tc0(u, i); const s = E.skillOf(u, i);
    if (!E.unlocked(u, i)) return tc0(u, i);
    if (!aimable(s)) { const m = S.IN.mouseW; if (!s.dmg || !m || !S.IN.mouseT || performance.now() - S.IN.mouseT > 8000 || D.SLOT_KIND(i) === 'buff') return tc0(u, i); if (!E.ready(u, i)) return false;
      // directional / targeted skills fire toward the cursor; a foe under the cursor becomes the target
      let best = null, bd = 2.2 * 2.2; for (const t of W.units) { if (t.dead || !E.isEnemy(u, t) || !E.targetable(u, t)) continue; const d = U.d2(t.x, t.y, m[0], m[1]); if (d < bd) { bd = d; best = t; } }
      if (best) S.select(best); E.face(u, m[0], m[1]); return E.cast(u, i, best ? { x: best.x, y: best.y, u: best } : { x: m[0], y: m[1] }); }
    if (!E.ready(u, i)) return false;
    if (!(S.save && S.save.settings && S.save.settings.aimConfirm)) { // instant: cursor on the map → there, else in front of the hero
      const m = S.IN.mouseW; const fresh = m && S.IN.mouseT && performance.now() - S.IN.mouseT < 8000; let x, y;
      if (fresh) { x = m[0]; y = m[1]; } else { const L = Math.hypot(u.fx || 0, u.fy || 0) || 1; const R = Math.min((s.R || 6), 3.5); x = u.x + (u.fx || 1) / L * R; y = u.y + (u.fy || 0) / L * R; }
      S.aim = { i, t0: W.time }; castAt(x, y); return true; }
    if (S.aim && S.aim.i === i) { const m = S.IN.mouseW; if (m) castAt(m[0], m[1]); else cancel(); return true; }
    S.aim = { i, t0: W.time }; document.body.classList.add('aiming'); return true; };
  S.settingsQuickCast = () => !!(S.save && S.save.settings && S.save.settings.quickCast);
  const hook = () => { const cv = document.getElementById('cv'); if (!cv || cv._aim) return; cv._aim = true;
    const toW = (e) => { const r = cv.getBoundingClientRect(); const sx = (e.clientX - r.left) / r.width * E.VW, sy = (e.clientY - r.top) / r.height * E.VH; return W.cam.s2w(sx, sy); };
    cv.addEventListener('click', e => { if (!S.aim) return; e.stopImmediatePropagation(); e.preventDefault(); const [x, y] = toW(e); castAt(x, y); }, true);
    cv.addEventListener('mousemove', () => { S.IN.mouseT = performance.now(); });
    cv.addEventListener('contextmenu', e => { if (S.aim) { e.stopImmediatePropagation(); e.preventDefault(); cancel(); } }, true);
    cv.addEventListener('touchmove', e => { if (!S.aim || !e.touches[0]) return; const [x, y] = toW(e.touches[0]); S.IN.mouseW = [x, y]; }, { passive: true });
    addEventListener('keydown', e => { if (!S.aim) return; const k = e.key.toLowerCase(); if (k === 'escape' || 'wasd'.includes(k) && k.length === 1) cancel(); }); };
  document.addEventListener('DOMContentLoaded', hook); setTimeout(hook, 0);
  // draw the indicator on the crisp overlay after the world
  const r0 = E.render; E.render = (ctx) => { const r = r0(ctx); const a = S.aim, p = W.player, O = E.octx; if (!a || !p || !O || p.dead) { if (a && (!p || p.dead)) cancel(); return r; }
    const s = E.skillOf(p, a.i); const m = S.IN.mouseW || [p.x, p.y]; const R = (s.R || 6), rr = Math.max(0.8, s.r || 1.5); let x = m[0], y = m[1]; const d = Math.hypot(x - p.x, y - p.y); const out = d > R + 0.2; if (out) { x = p.x + (x - p.x) / d * R; y = p.y + (y - p.y) / d * R; }
    const pal = (G.FX6 && G.FX6.PAL[p.cls]) || D.ELEM[s.elem].pal; const T = G.TS; const cam = W.cam; O.save(); O.setTransform(G.S2, 0, 0, G.S2, 0, 0);
    const [px, py] = cam.w2s(p.x, p.y), [cx, cy] = cam.w2s(x, y);
    O.strokeStyle = 'rgba(255,255,255,.35)'; O.lineWidth = 1; O.setLineDash([4, 4]); O.beginPath(); O.ellipse(px, py, R * T, R * T * 0.5, 0, 0, 7); O.stroke(); O.setLineDash([]);
    const t = W.time; O.fillStyle = out ? 'rgba(255,80,80,.16)' : pal[2] + '33'; O.strokeStyle = out ? '#ff6a6a' : pal[1]; O.lineWidth = 1.6; O.beginPath(); O.ellipse(cx, cy, rr * T, rr * T * 0.5, 0, 0, 7); O.fill(); O.stroke();
    O.lineWidth = 1; O.globalAlpha = 0.7; O.beginPath(); O.ellipse(cx, cy, rr * T * (0.6 + 0.4 * ((t * 1.5) % 1)), rr * T * 0.5 * (0.6 + 0.4 * ((t * 1.5) % 1)), 0, 0, 7); O.stroke(); O.globalAlpha = 1;
    O.fillStyle = '#ffffff'; O.fillRect(cx - 1, cy - 1, 2, 2);
    O.restore(); O.save(); const F = G.PXS || 2; O.font = '600 11px Kanit, sans-serif'; O.textAlign = 'center'; O.lineWidth = 3; O.strokeStyle = '#0e0c14'; const lbl = `${s.name} · คลิกพื้นเพื่อร่าย · คลิกขวายกเลิก`; O.strokeText(lbl, cx * F, (cy - rr * T * 0.5 - 6) * F); O.fillStyle = '#ffffff'; O.fillText(lbl, cx * F, (cy - rr * T * 0.5 - 6) * F); O.restore();
    return r; };
  // settings: option to keep instant casting
  if (UI.PANELS && UI.PANELS.settings) { const r1 = UI.PANELS.settings.render; UI.PANELS.settings.render = function (tab, P) { const st = S.save && S.save.settings || {}; return r1.call(this, tab, P) + `<h4>การเล็งสกิล</h4><div class="chips"><button class="chip ${!st.quickCast ? 'on' : ''}" data-act="aim-mode" data-v="0">เล็งด้วยเมาส์ (สกิลพื้นที่คลิกพื้นเพื่อร่าย · สกิลยิง/ฟันพุ่งไปทางเมาส์)</button><button class="chip ${st.quickCast ? 'on' : ''}" data-act="aim-mode" data-v="1">ร่ายใส่เป้าอัตโนมัติ</button></div><h4>สกิลพื้นที่</h4><div class="chips"><button class="chip ${!st.aimConfirm ? 'on' : ''}" data-act="aim-conf" data-v="0">กดแล้วใช้ทันที (ลงที่เมาส์)</button><button class="chip ${st.aimConfirm ? 'on' : ''}" data-act="aim-conf" data-v="1">แสดงวงก่อน แล้วคลิกพื้นเพื่อร่าย</button></div>`; }; }
  const a0 = UI.act; UI.act = (el, e) => { if (el.dataset.act === 'aim-conf') { S.save.settings.aimConfirm = el.dataset.v === '1'; S.persist(); UI.renderPanel(); return; } if (el.dataset.act === 'aim-mode') { S.save.settings.quickCast = el.dataset.v === '1'; S.persist(); UI.renderPanel(); return; } return a0(el, e); };
  const css = document.createElement('style'); css.textContent = 'body.aiming #cv{cursor:crosshair}'; document.head.appendChild(css);
})(window.G);
