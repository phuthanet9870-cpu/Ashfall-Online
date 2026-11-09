'use strict';
/* Monsters from "64x Detailed Fantasy Monsters – 48×48 Pixel Art Pack" (Pixel-Deck): replaces every regular monster
   (normal / champion / rare on all 20 maps, dungeons and boss adds) with a themed sprite + procedural animation. */
(function (init) {
  (globalThis.ASHFALL_SIM_FACTORIES ||= {})['monsters48'] = init;
  if (typeof window !== 'undefined') init(window.G ||= {});
})(function (G) {
  const U = G.U, D = G.D, E = G.E, W = G.W, SPR = G.SPR; const MAN = G.MON48; if (!MAN) return;
  const mdOf = (i, old) => { const e = MAN.list[i]; return Object.assign({}, old || {}, { n: e.n, px: i, body: 'px48', c: e.c, c2: U.shade ? U.shade(e.c, -0.35) : e.c, ranged: e.ranged }); };
  for (const def of D.FARM_MAPS) { const m = MAN.maps[def.id]; if (!m) continue; def.mobs = m.mobs.map((i, k) => mdOf(i, def.mobs[k])); def.champ = mdOf(m.champ, def.champ); def.rare = mdOf(m.rare, def.rare); }
  if (G.headless) return;
  const base = (() => { const s = [...document.scripts].find(x => /js\/monsters48\.js/.test(x.src)); return s ? s.src.replace(/js\/monsters48\.js.*$/, '') : ''; })();
  const IMG = new Image(); IMG.src = base + 'assets/monsters/mon48.png'; G.MON48.img = IMG;
  const C = MAN.cell, COLS = MAN.cols;
  const isPx = u => u && u.md && u.md.px != null && !u.md.duel;
  const GSC = { normal: 1, elite: 1.1, champion: 1.28, rare: 1.15 };
  E.MON48 = { isPx };
  const si0 = E.spriteInfo; E.spriteInfo = (u) => { if (isPx(u)) { const e = MAN.list[u.md.px]; const bb = e.bb; return { img: IMG, sx: (u.md.px % COLS) * C + bb[0], sy: Math.floor(u.md.px / COLS) * C + bb[1], w: bb[2] - bb[0], h: bb[3] - bb[1], flip: false, sc: 1 }; } return si0(u); };
  const du0 = E.drawUnit;
  E.drawUnit = (ctx, u) => {
    if (!isPx(u) || !IMG.complete || !IMG.naturalWidth) return du0(ctx, u);
    const e = MAN.list[u.md.px], bb = e.bb; const k = GSC[u.grade] || 1; const t = W.time + u.id * 0.37;
    const [sx0, sy0] = W.cam.w2s(u.x, u.y); let sx = Math.round(sx0), sy = Math.round(sy0 - (u.jz || 0));
    const w = bb[2] - bb[0], h = bb[3] - bb[1]; const fxDir = u.fx < 0 ? -1 : 1;
    // animation state
    let scX = 1, scY = 1, rot = 0, ox = 0, oy = 0, alpha = 1;
    if (u.dead) { const d = u.deadT || 0; rot = Math.min(1, d / 0.35) * 1.35 * (e.face || fxDir); oy = Math.min(1, d / 0.35) * h * 0.15; alpha = Math.max(0, 1 - Math.max(0, d - 0.9) / 0.8); if (alpha <= 0) return; }
    else {
      if (u.moving) { const ph = t * 11; oy = -Math.abs(Math.sin(ph)) * 2.2; scY = 1 - 0.05 * Math.abs(Math.cos(ph)); scX = 1 + 0.03 * Math.abs(Math.cos(ph)); rot = 0.06 * fxDir * Math.sin(ph * 0.5); }
      else { scY = 1 + 0.035 * Math.sin(t * 2.6); scX = 1 - 0.018 * Math.sin(t * 2.6); }
      if (u.anim && u.anim.at > 0) { const p = 1 - Math.min(1, u.anim.at / 0.3); const l = Math.sin(p * Math.PI); ox = l * 6 * fxDir; scX *= 1 + l * 0.08; scY *= 1 - l * 0.04; rot += l * 0.12 * fxDir; }
      if (u.flash > 0) { ox += Math.round(U.rf(-1, 1)); }
    }
    u._sx = sx; u._sy = sy - h * k; u._ph = h * k; u._pw = w * k;
    ctx.save();
    // shadow + grade aura
    ctx.globalAlpha = 0.33 * alpha; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(sx, sy, w * 0.36 * k, Math.max(2, w * 0.11 * k), 0, 0, 7); ctx.fill();
    if (!u.dead && (u.grade === 'champion' || u.grade === 'rare' || u.grade === 'elite')) { const gc = D.GRADES[u.grade].col; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + 0.12 * Math.sin(t * 3); ctx.fillStyle = gc; ctx.beginPath(); ctx.ellipse(sx, sy, w * 0.5 * k, w * 0.16 * k, 0, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
    ctx.globalAlpha = alpha; ctx.translate(sx + ox, sy + oy); ctx.rotate(rot);
    // flip so side-facing sprites look where they walk
    const flip = e.face ? (e.face !== fxDir) : false; ctx.scale((flip ? -1 : 1) * k * scX, k * scY); ctx.imageSmoothingEnabled = false;
    const srcX = (u.md.px % COLS) * C + bb[0], srcY = Math.floor(u.md.px / COLS) * C + bb[1];
    ctx.drawImage(IMG, srcX, srcY, w, h, -Math.round(w / 2), -h, w, h);
    if ((u.flash > 0 || (u.cc && u.cc.fz > 0)) && !u.dead) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = u.cc && u.cc.fz > 0 ? 0.35 : 0.6; ctx.drawImage(IMG, srcX, srcY, w, h, -Math.round(w / 2), -h, w, h); }
    if (u.grade === 'rare' && !u.dead && Math.sin(t * 5) > 0.7) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.8; ctx.fillStyle = '#fff2a8'; const a = t * 3; ctx.fillRect(Math.round(Math.cos(a) * w * 0.4), Math.round(-h * 0.6 + Math.sin(a) * 6), 2, 2); }
    ctx.restore();
  };
  // nameplate / bars above the sprite
  const ui0 = E.drawUnitUI; if (ui0) E.drawUnitUI = (ctx, u, ...a) => { if (isPx(u)) { const e = MAN.list[u.md.px]; const h = (e.bb[3] - e.bb[1]) * (GSC[u.grade] || 1); const j = u.jz || 0; u.jz = j + Math.max(0, h - 30); const r = ui0(ctx, u, ...a); u.jz = j; return r; } return ui0(ctx, u, ...a); };
  // credit
  const UI = G.UI; if (UI && UI.PANELS && UI.PANELS.settings) { const r0 = UI.PANELS.settings.render; UI.PANELS.settings.render = function (tab, P) { return r0.call(this, tab, P) + '<p class="muted">Monsters: 64x Detailed Fantasy Monsters – 48×48 Pixel Art Pack (Pixel-Deck)</p>'; }; }
});
