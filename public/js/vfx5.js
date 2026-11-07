'use strict';
/* VFX v5 — performance redesign:
   · no per-frame GPU read-back (pixel pass removed; textures are pre-baked pixel art)
   · relevance LOD: your own skills / bosses get the full show, party members a lighter cut, everyone else a clean minimal version
   · tighter object / particle budgets + an adaptive governor that trims decoration when the frame rate drops
   · solid colour ramps in textures (no dither dots) */
(function (G) {
  const U = G.U, V = G.VFX, FX = G.FX;
  // tighter budgets per quality level
  if (V.LEVELS) { const B = [[160, 260], [320, 650], [520, 1100]]; V.LEVELS.forEach((L, i) => { L.fxCap = B[i][0]; L.pCap = B[i][1]; });
    V.LEVELS[0].desc = 'เอฟเฟกต์หลักชั้นเดียว · ไม่มีแสงเรือง · เบาที่สุด'; V.LEVELS[1].desc = 'สวยครบ แต่สกิลของคนอื่นจะแสดงแบบย่อ · ลื่นไหล'; V.LEVELS[2].desc = 'เอฟเฟกต์เต็มทุกชั้น · แสงเรือง 2 ชั้น (ใช้เครื่องแรง)'; }
  // relevance of a caster: 1 = you / your summons / bosses, 0.5 = party, 0.25 = everyone else
  const ST = () => (G.S && G.S.save && G.S.save.settings) || {};
  // fxWho: 'all' | 'party' | 'me' — whose skill effects are drawn (boss mechanics always shown)
  const rel = u => { const W = G.W; const P = W && W.player; if (!u || !P) return 1; const o = u.owner || u; if (o === P) return 1; if (o.isWB || o.boss || o.kind === 'mob') return 0.8; const who = ST().fxWho || 'all';
    if (who === 'me') return 0; if (who === 'party') return o.team === P.team ? 1 : 0; return 1; };
  V._dens = 1; V._rel = 1; V._gov = 1; // governor multiplier (1 → 0.35)
  const DECOR = { gglow: 1, decal: 1, rain: 1, glow: 1, sigil: 1, links: 1, rays: 1, columns: 1, orbit: 1, spiral: 1 };
  const withRel = (u, fn) => { const r0 = V._rel; V._rel = Math.min(r0, rel(u)); try { return fn(); } finally { V._rel = r0; } };
  // gate effect objects
  const push1 = V.fx.push;
  V.fx.push = function (o) {
    if (o && o.k !== 'tele' && o.k !== 'vig' && V._rel === 0) return this.length;
    if (o && o.k !== 'tele' && o.k !== 'vig' && !V._ult) { const r = V._rel * V._gov;
      if (r < 0.9 && (DECOR[o.k] || (o.k === 'tex' && o.kind === 'spark'))) return this.length;
      if (r < 0.6 && o.k === 'shape' && Math.random() > r + 0.2) return this.length;
      if (r < 0.4 && (o.k === 'ring' || o.k === 'tex') && Math.random() > 0.55) return this.length; }
    return push1.call(this, o);
  };
  // particle density
  const p0 = V.p; V.p = function (...a) { if (V._rel === 0) return; const d = V._rel * V._gov; if (d < 1 && Math.random() > d * 0.9 + 0.05) return; return p0.apply(this, a); };
  // damage numbers: others' hits only on crits, everything capped
  const t0 = V.text; V.text = (x, y, txt, color, o = {}) => { if (V._rel === 0) return; if (V._rel < 0.4 && !o.crit && typeof txt !== 'string') return; if (V._rel < 0.4 && !o.crit && /^\d/.test(String(txt)) && Math.random() < 0.7) return; t0(x, y, txt, color, o); if (V.texts.length > 70) V.texts.splice(0, V.texts.length - 70); };
  // shakes / flashes only from things that matter to you
  const sh0 = V.shake; V.shake = (a, d) => { if (ST().shake === false || V._rel < 0.6) return; sh0(a, d); };
  const fl0 = V.flash; V.flash = (c, d) => { if ((ST().shake === false && d > 0.25) || V._rel < 0.6) return; fl0(c, d); };
  // wrap every effect entry point with the caster's relevance
  const at0 = FX.at; FX.at = (u, s, x, y, ang, o = {}) => withRel(u, () => at0(u, s, x, y, ang, rel(u) < 0.6 ? Object.assign({}, o, { light: true }) : o));
  const ca0 = FX.cast; FX.cast = (u, s, A) => withRel(u, () => ca0(u, s, A));
  const install = () => { const E = G.E; if (!E || !E.hit || E._v5) return; E._v5 = true; const UI = G.UI;
    if (UI && UI.PANELS && UI.PANELS.settings) { const r0 = UI.PANELS.settings.render; UI.PANELS.settings.render = function (tab, P) { const h = r0.call(this, tab, P); const st = ST(); const who = st.fxWho === 'party' ? 'all' : (st.fxWho || 'all');
      const sec = `<h4>เอฟเฟกต์สกิลของผู้อื่น</h4><div class="chips">${[['all', 'เปิด (เห็นเอฟเฟคทุกคน)'], ['me', 'ปิด (เห็นเฉพาะตัวเรา)']].map(([k, n]) => `<button class="chip ${who === k ? 'on' : ''}" data-act="v5-set" data-k="fxWho" data-v="${k}">${n}</button>`).join('')}</div><p class="muted">วงเตือนสกิลบอสและมอนสเตอร์จะแสดงเสมอ · เลือก "ตัวเองเท่านั้น" ลื่นที่สุดในลานบอสโลก/PvP</p>
        <h4>สั่นหน้าจอ</h4><div class="chips"><button class="chip ${st.shake !== false ? 'on' : ''}" data-act="v5-set" data-k="shake" data-v="1">สั่น</button><button class="chip ${st.shake === false ? 'on' : ''}" data-act="v5-set" data-k="shake" data-v="0">ไม่สั่น (ปิดทั้งหมด)</button></div><p class="muted">ปิด = ไม่มีการสั่น ไม่ซูมกระตุก ไม่หยุดภาพ และไม่สโลว์โมชั่นเลย</p><p class="muted">ปิดสั่นจะปิดแสงวาบเต็มจอด้วย</p>`;
      const i = h.indexOf('<h4>ขนาด UI'); return i >= 0 ? h.slice(0, i) + sec + h.slice(i) : h + sec; };
      const a0 = UI.act; UI.act = (el, e) => { if (el.dataset.act === 'v5-set') { const st = ST(); const k = el.dataset.k; st[k] = k === 'shake' ? el.dataset.v === '1' : el.dataset.v; if (k === 'shake' && !st.shake) { V.shakeA = 0; V.shakeT = 0; } G.S.persist(); UI.renderPanel(); return; } return a0(el, e); }; } const hit0 = E.hit; E.hit = (src, t, pow, s, o) => { const P = G.W.player; const r = (t === P || (t && t.owner === P)) ? 1 : rel(src); const r0 = V._rel; V._rel = Math.min(r0, r); try { return hit0(src, t, pow, s, o); } finally { V._rel = r0; } }; };
  document.addEventListener('DOMContentLoaded', install); setTimeout(install, 0);
  const dp0 = V.drawProj; if (dp0) V.drawProj = (ctx, cam, p) => { const r0 = V._rel; V._rel = rel(p.owner); try { return dp0(ctx, cam, p); } finally { V._rel = r0; } };
  // adaptive governor: watches frame time, trims decoration under load, restores when smooth
  let acc = 0, n = 0, last = performance.now();
  const tick = (t) => { install(); const dt = t - last; last = t; if (dt < 250) { acc += dt; n++; } if (n >= 30) { const avg = acc / n; acc = 0; n = 0;
      if (avg > 21) V._gov = Math.max(0.35, V._gov - 0.15); else if (avg < 17.5) V._gov = Math.min(1, V._gov + 0.05); }
    requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  V.perf = () => ({ gov: V._gov, fx: V.fx.length, parts: V.parts.length, texts: V.texts.length });
})(window.G);
