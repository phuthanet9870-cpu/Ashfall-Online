'use strict';
/* VFX pass 2: neon-abyss / solar / ink-devourer motif library + global polish (impact flash, light pools, motes, gather, camera punch) */
(function (G) {
  const U = G.U, D = G.D, V = G.VFX, FX = G.FX, TX = G.TX, SH = FX.SH, M = FX.M;
  const R = (a, b) => U.rf(a, b); const later = (t, f) => G.E.later(t, f); const TS = () => G.TS;
  const NEON = ['#ffffff', '#ff5af5', '#9a2ac0', '#12061a'], SOL = ['#ffffff', '#fffbe0', '#ffe680', '#ffb020'], INK = ['#e8d8ff', '#a06aff', '#2a1a48', '#06040c'];

  // ---------------- new shapes ----------------
  const poly = (x, pts) => { x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); };
  SH.zig = (x, s) => { x.lineWidth = Math.max(1.5, s / 5); x.lineJoin = 'miter'; x.beginPath(); x.moveTo(-s, -s * 0.2); x.lineTo(-s * 0.35, s * 0.25); x.lineTo(-s * 0.1, -s * 0.35); x.lineTo(s * 0.4, s * 0.2); x.lineTo(s * 0.55, -s * 0.15); x.lineTo(s, s * 0.1); x.stroke(); };
  SH.smokecurl = (x, s, c2) => { x.beginPath(); x.arc(-s * 0.45, s * 0.1, s * 0.5, 0, 7); x.arc(s * 0.15, -s * 0.2, s * 0.62, 0, 7); x.arc(s * 0.6, s * 0.15, s * 0.42, 0, 7); x.fill(); x.strokeStyle = c2 || 'rgba(255,255,255,.35)'; x.lineWidth = Math.max(1, s / 8); x.beginPath(); x.arc(s * 0.15, -s * 0.2, s * 0.36, 3.6, 5.6); x.stroke(); };
  SH.ringthick = (x, s) => { x.lineWidth = Math.max(2, s * 0.28); x.beginPath(); x.arc(0, 0, s, 0, 7); x.stroke(); };
  SH.dome = (x, s) => { x.lineWidth = Math.max(1, s / 30); x.beginPath(); x.ellipse(0, 0, s, s * 0.85, 0, Math.PI, 0); x.stroke(); };
  SH.maw = (x, s, c2, t) => { // jaws rise, open, then snap shut
    const open = t < 0.55 ? Math.min(1, t / 0.45) : Math.max(0, 1 - (t - 0.55) * 7); const a = open * 0.95;
    const jaw = (sgn) => { x.save(); x.rotate(sgn * -a * 0.5); x.beginPath(); x.moveTo(-s, 0); x.quadraticCurveTo(-s * 0.2, sgn * -s * 1.25, s * 1.05, sgn * -s * 0.15); x.lineTo(s * 0.9, 0); x.closePath(); x.fill();
      x.fillStyle = c2 || '#d8c8ff'; for (let i = 0; i < 6; i++) { const px = -s * 0.75 + i * s * 0.32; poly(x, [[px, 0], [px + s * 0.12, sgn * s * 0.32], [px + s * 0.24, 0]]); x.fill(); } x.restore(); };
    const fs = x.fillStyle; jaw(1); x.fillStyle = fs; jaw(-1); };
  SH.lure = (x, s, c2) => { x.lineWidth = Math.max(1.5, s / 7); x.lineCap = 'round'; x.beginPath(); x.moveTo(-s * 0.2, s); x.quadraticCurveTo(-s * 0.4, -s * 0.6, s * 0.35, -s * 0.75); x.stroke(); x.fillStyle = c2 || '#e8d8ff'; x.beginPath(); x.arc(s * 0.42, -s * 0.55, s * 0.22, 0, 7); x.fill(); };
  SH.tendril = (x, s) => { x.beginPath(); x.moveTo(-s * 0.25, s); x.quadraticCurveTo(-s * 0.5, 0, s * 0.15, -s); x.quadraticCurveTo(-s * 0.05, 0, s * 0.25, s); x.closePath(); x.fill(); };
  SH.inkwave = (x, s) => { x.beginPath(); x.moveTo(-s, s * 0.4); x.quadraticCurveTo(-s * 0.2, -s * 0.9, s * 0.8, -s * 0.5); x.quadraticCurveTo(s * 0.2, -s * 0.2, s * 0.4, s * 0.4); x.closePath(); x.fill(); };
  SH.spikes = (x, s) => { for (let i = -2; i <= 2; i++) { const h = s * (1.2 - Math.abs(i) * 0.22); poly(x, [[i * s * 0.28 - s * 0.12, s * 0.3], [i * s * 0.28 + R(-0.05, 0.05) * s, -h], [i * s * 0.28 + s * 0.12, s * 0.3]]); x.fill(); } };

  // ---------------- extra primitives ----------------
  const add = (o) => { o.t = 0; V.fx.push(o); return o; };
  V.gglow = (x, y, r, c, dur = 0.5) => add({ k: 'gglow', x, y, r, c, dur, ground: true });
  V.X.gglow = { ground: true, draw(x, cam, f, k) { const [sx, sy] = cam.w2s(f.x, f.y); const Rr = f.r * TS(); const g = x.createRadialGradient(sx, sy, 0, sx, sy, Rr); g.addColorStop(0, f.c); g.addColorStop(1, 'rgba(0,0,0,0)'); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.55 * (1 - k); x.fillStyle = g; x.save(); x.translate(sx, sy); x.scale(1, 0.7); x.translate(-sx, -sy); x.fillRect(sx - Rr, sy - Rr, Rr * 2, Rr * 2); x.restore(); } };
  V.rain = (x, y, r, c, dur, n = 30) => add({ k: 'rain', x, y, r, c, dur, drops: Array.from({ length: n }, () => [R(-1, 1), R(-1, 1), R(0, 1)]) });
  V.X.rain = { draw(x, cam, f, k) { const [sx, sy] = cam.w2s(f.x, f.y); const Rr = f.r * TS(); x.strokeStyle = f.c; x.lineWidth = 1; x.globalAlpha = (1 - k) * 0.8; x.beginPath(); for (const d of f.drops) { if (d[0] * d[0] + d[1] * d[1] > 1) continue; const ph = (d[2] + f.t * 2.4) % 1; const px = sx + d[0] * Rr, py = sy + d[1] * Rr * 0.85 - 70 * (1 - ph); x.moveTo(px, py); x.lineTo(px, py - 9); } x.stroke(); } };

  // ---------------- motifs: Abyss Reaver (neon smoke + lightning) ----------------
  const grey = (x, y, n, sc = 1, z = 6) => { for (let i = 0; i < n; i++) V.shape(x + R(-0.6, 0.6), y + R(-0.4, 0.4), 'smokecurl', U.pick(['#4a4652', '#3a3642', '#5a5662']), R(6, 10) * sc, R(0.6, 1), { solid: true, z: z + R(0, 10), rise: R(6, 20), grow: 0.5, rot: R(-0.4, 0.4), delay: i * 0.03, c2: 'rgba(255,170,250,.35)' }); };
  const neonZig = (x, y, n, sc = 1, z = 14) => { for (let i = 0; i < n; i++) V.shape(x + R(-0.8, 0.8), y + R(-0.6, 0.6), 'zig', U.pick(['#ffffff', '#ff5af5', '#ff9af8']), R(5, 9) * sc, R(0.18, 0.35), { z: z + R(-6, 16), rot: R(0, 6.28), grow: 0.3, delay: R(0, 0.15) }); };
  M.neoncrack = o => { neonZig(o.x, o.y, o.light ? 2 : 5, o.sc); V.cracks(o.x, o.y, 1.3 * o.sc, 6, '#ff5af5', 0.7); V.gglow(o.x, o.y, 1.6 * o.sc, '#ff4af0', 0.5); };
  M.greysmoke = o => grey(o.x, o.y, o.light ? 2 : 5, o.sc);
  M.voidslash = o => { V.shape(o.x, o.y, 'blade', '#3a3642', 22 * o.sc, 0.4, { solid: true, rot: o.ang, z: 12, grow: 0.25 }); V.shape(o.x, o.y, 'blade', '#ff5af5', 20 * o.sc, 0.25, { rot: o.ang, z: 12, grow: 0.25, alpha: 0.9 }); V.shape(o.x, o.y, 'star4', '#ffffff', 10, 0.18, { rot: o.ang, z: 14 }); };
  M.neonclaw = o => { V.shape(o.x, o.y, 'claw', '#ff5af5', 13 * o.sc, 0.35, { rot: o.ang + 0.4, grow: 0.3 }); V.shape(o.x, o.y, 'claw', '#ffffff', 10 * o.sc, 0.2, { rot: o.ang + 0.4 }); grey(o.x, o.y, 2, 0.8); };
  M.abysstreak = o => { for (let i = 0; i < 7; i++) { const off = R(-0.5, 0.5); V.line(o.sx + off * 0.3, o.sy + off, o.x + off * 0.3, o.y + off, ['#ffffff', '#ff9af8', '#9a2ac0'], R(0.15, 0.3), { w: R(1, 2), z: R(4, 24) }); } V.beamTex(o.sx, o.sy, o.x, o.y, 'dark', 0.3, 1.6); };
  M.silhouette = o => { const u = o.u; if (u && u.look) { const si = G.E.spriteInfo(u); for (let i = 0; i < 4; i++) V.ghost(U.lerp(o.sx, o.x, i / 4), U.lerp(o.sy, o.y, i / 4), si, 0.55, 0.45, false); } grey(o.sx, o.sy, 4, 1); for (let i = 0; i < 5; i++) V.line(o.sx, o.sy + R(-0.3, 0.3), o.x, o.y + R(-0.3, 0.3), ['#ffffff', '#d8d0e0', '#8a8496'], 0.22, { w: 1, z: R(6, 26) }); };
  M.smokewhirl = o => { for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; V.shape(o.x + Math.cos(a) * 1.4, o.y + Math.sin(a) * 1.1, 'smokecurl', '#4a4652', 7 * o.sc, 0.6, { solid: true, z: 8, rot: a, spin: 4, delay: i * 0.02 }); } V.spiral(o.x, o.y, (o.r || 2) * 1.1, NEON, 0.55, { arms: 3, w: 2 }); neonZig(o.x, o.y, 3, o.sc); };
  M.abysspillar = o => { V.pillar(o.x, o.y, '#ff4af0', 230, 0.75, 30 * o.sc); V.pillar(o.x, o.y, '#ffffff', 230, 0.45, 7 * o.sc); for (let i = 0; i < 9; i++) { const a = R(0, 6.28), rr = R(0.2, 1.2); V.shape(o.x + Math.cos(a) * rr, o.y + Math.sin(a) * rr * 0.6, 'lance', U.pick(['#2a1a32', '#3a2442']), R(7, 12) * o.sc, 0.8, { solid: true, rot: -Math.PI / 2 + R(-0.35, 0.35), z: 4, rise: 8, grow: 0, delay: i * 0.02 }); V.shape(o.x + Math.cos(a) * rr, o.y + Math.sin(a) * rr * 0.6, 'lance', '#ff5af5', R(3, 5), 0.5, { rot: -Math.PI / 2, z: 20, delay: i * 0.02 }); }
    for (let i = 0; i < 16; i++) V.p(o.x + R(-1, 1), o.y + R(-0.5, 0.5), R(0, 30), 0, 0, R(90, 180), R(0.4, 0.8), 1.5, U.pick(['#ffffff', '#ff5af5']), { kind: 'streak', grav: 0 }); V.ring(o.x, o.y, 2 * o.sc, NEON, 0.5, { w: 3, fill: true }); grey(o.x, o.y, 4, 1.2, 2); neonZig(o.x, o.y, 4, o.sc, 40); V.shake(4, 0.3); };
  M.neonbolt = o => { neonZig(o.x, o.y, 4, o.sc); V.tex(o.x, o.y, 'dark', 'burst', { sc: 0.9, dur: 0.35 }); };
  M.smokering = o => { for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28; V.shape(o.x, o.y, 'smokecurl', '#4a4652', 8 * o.sc, 0.7, { solid: true, z: 4, vx: Math.cos(a) * 3.2, vy: Math.sin(a) * 2.6, grow: 0.6 }); } V.cracks(o.x, o.y, (o.r || 2.3) * 1.2, 9, '#ff5af5', 0.9); neonZig(o.x, o.y, 5, o.sc); V.shake(4, 0.3); };
  M.neonstorm = o => { for (let i = 0; i < 6; i++) later(i * 0.06, () => { const x = o.x + R(-2.5, 2.5), y = o.y + R(-2.5, 2.5); V.bolt(x, y - 0.01, x, y, ['#ffffff', '#ff5af5', '#9a2ac0'], 0.25, { z1: 170, z2: 0, segs: 9, w: 2 }); V.gglow(x, y, 1, '#ff4af0', 0.35); }); grey(o.x, o.y, 6, 1.3); V.flash('#ffb0ff', 0.1); };
  M.smokeaura = o => { for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; V.shape(o.x + Math.cos(a) * 0.9, o.y + Math.sin(a) * 0.6, 'smokecurl', '#4a4652', 6, 0.9, { solid: true, z: 2, rise: 34, grow: 0.4, delay: i * 0.04 }); } neonZig(o.x, o.y, 4, 0.8, 24); V.gglow(o.x, o.y, 1.4, '#ff4af0', 0.8); };
  M.stormdome = o => { const r = (o.r || 4.5) * 1.05; V.circleTex(o.x, o.y, 'dark', r, 1.6, { spin: 0.9 }); V.shape(o.x, o.y, 'dome', '#ff5af5', r * TS(), 1.5, { z: 0, grow: 0, alpha: 0.6 }); V.rain(o.x, o.y, r, '#ff9af8', 1.5, 60);
    for (let i = 0; i < 10; i++) later(i * 0.12, () => { const a = R(0, 6.28), rr = R(0, r * 0.9); const x = o.x + Math.cos(a) * rr, y = o.y + Math.sin(a) * rr * 0.85; V.bolt(x, y - 0.01, x, y, NEON, 0.22, { z1: R(60, 140), z2: 0, segs: 7, w: 2 }); V.gglow(x, y, 1.2, '#ff4af0', 0.4); });
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; grey(o.x + Math.cos(a) * r * 0.95, o.y + Math.sin(a) * r * 0.8, 1, 1.6, 4); } };
  M.blackholering = o => { const sc = o.sc; V.flash('#ffffff', 0.18); V.shape(o.x, o.y, 'orb', '#020103', 24 * sc, 1.4, { solid: true, z: 40, grow: 0.25 }); V.shape(o.x, o.y, 'ringthick', '#ff4af0', 26 * sc, 1.4, { z: 40, grow: 0.25 }); V.shape(o.x, o.y, 'ringthick', '#ffd8ff', 23 * sc, 1.3, { z: 40, grow: 0.25, alpha: 0.7 });
    later(0.35, () => { V.line(o.x - 4, o.y + 1.2, o.x + 4, o.y - 1.6, ['#ffffff', '#ff9af8', '#ff4af0'], 0.6, { w: 10, z: 40 }); V.line(o.x - 4, o.y + 1.2, o.x + 4, o.y - 1.6, ['#ffffff', '#ffffff', '#ffffff'], 0.35, { w: 3, z: 40 }); V.shake(8, 0.5); });
    for (let i = 0; i < 12; i++) later(i * 0.07, () => { const a = R(0, 6.28); V.shape(o.x + Math.cos(a) * 1.8 * sc, o.y + Math.sin(a) * 1.3 * sc, 'zig', '#ff5af5', R(6, 10), 0.25, { z: 40 + R(-20, 20), rot: a }); }); grey(o.x, o.y, 10, 1.8, 10); V.gglow(o.x, o.y, 4 * sc, '#ff4af0', 1.2); };

  // ---------------- motifs: Solar Arbiter ----------------
  M.sunspark = o => { TX.sparks(o.x, o.y, 'light', o.light ? 3 : 7, 3, 14); V.shape(o.x, o.y, 'star4', '#ffffff', 11 * o.sc, 0.22, { rot: R(0, 1) }); V.gglow(o.x, o.y, 1.2, '#ffe680', 0.4); };
  M.prismray = o => { const cs = ['#ff6a8a', '#ffb347', '#ffe680', '#7aff9a', '#6ad8ff', '#b07aff']; const base = R(0, 6.28); for (let i = 0; i < 6; i++) V.rays(o.x, o.y, 1, 2.6 * o.sc, cs[i], 0.4, { rot: base + i * 0.22, w: 2 }); for (let i = 0; i < 6; i++) V.shape(o.x, o.y, 'shard', cs[i], 5, 0.5, { rot: base + i * 1.05, vx: Math.cos(base + i * 1.05) * 2.5, vy: Math.sin(base + i * 1.05) * 2.5, z: 14, grow: 0 }); V.shape(o.x, o.y, 'hex', '#ffffff', 8, 0.3, { z: 14, spin: 4 }); };
  M.solarbeam = o => { V.beamTex(o.sx, o.sy, o.x, o.y, 'light', 0.55, 3.2 * o.sc); V.beamTex(o.sx, o.sy, o.x, o.y, 'holy', 0.4, 1.4 * o.sc); V.rays(o.x, o.y, 14, 2 * o.sc, '#fffbe0', 0.4, { w: 2 }); V.gglow(o.sx, o.sy, 1.5, '#ffe680', 0.5); };
  M.corona = o => { V.shape(o.x, o.y, 'orb', '#ffffff', 12 * o.sc, 0.5, { z: 18, grow: 0.8 }); V.rays(o.x, o.y, 24, 3 * o.sc, '#ffe680', 0.5, { w: 2, z: 18 }); V.shape(o.x, o.y, 'ringthick', '#ffb020', 16 * o.sc, 0.45, { z: 18, grow: 0.8 }); V.gglow(o.x, o.y, 2.6 * o.sc, '#ffe680', 0.6); };
  M.solarpillar = o => { V.pillar(o.x, o.y, '#ffe680', 230, 0.75, 28 * o.sc); V.pillar(o.x, o.y, '#ffffff', 230, 0.45, 8 * o.sc); for (let i = 0; i < 8; i++) { const a = R(0, 6.28), rr = R(0.3, 1.2); V.shape(o.x + Math.cos(a) * rr, o.y + Math.sin(a) * rr * 0.6, 'lance', U.pick(['#fff6c2', '#ffe680']), R(5, 9), 0.7, { rot: -Math.PI / 2 + R(-0.3, 0.3), z: 4, rise: 10, delay: i * 0.03 }); } V.ring(o.x, o.y, 2 * o.sc, SOL, 0.5, { w: 3, fill: true }); for (let i = 0; i < 14; i++) V.p(o.x + R(-1, 1), o.y + R(-0.5, 0.5), R(0, 30), 0, 0, R(90, 160), R(0.4, 0.8), 1.5, '#fffbe0', { kind: 'streak' }); };
  M.radiantdome = o => { const r = o.r || 2.3; V.circleTex(o.x, o.y, 'light', r, o.dur || 1.2, { spin: 0.7 }); V.shape(o.x, o.y, 'dome', '#ffe680', r * TS(), o.dur || 1.2, { z: 0, grow: 0, alpha: 0.5 }); V.rain(o.x, o.y, r, '#fffbe0', o.dur || 1.2, 30); };
  M.aurora = o => { const cs = ['#7aff9a', '#6ad8ff', '#b07aff']; for (let k = 0; k < 3; k++) { const pts = []; for (let i = 0; i <= 14; i++) { const q = i / 14; pts.push([o.x - 1.8 + q * 3.6, o.y - 0.4 + Math.sin(q * 6 + k) * 0.35]); } V.links(pts, cs[k], 1, { z: 40 + k * 10 }); } TX.sparks(o.x, o.y, 'light', 4, 1.5, 40); };
  M.eclipsering = o => { V.flash('#fffbe0', 0.2); V.shape(o.x, o.y, 'orb', '#05040a', 20 * o.sc, 1.3, { solid: true, z: 50, grow: 0.2 }); V.shape(o.x, o.y, 'ringthick', '#ffe680', 22 * o.sc, 1.3, { z: 50, grow: 0.2 }); V.rays(o.x, o.y, 30, 4 * o.sc, '#fffbe0', 1.2, { w: 2, z: 50 }); V.gglow(o.x, o.y, 4 * o.sc, '#ffb020', 1.2); V.shake(7, 0.5); };

  // ---------------- motifs: Umbral Devourer (ink & maw) ----------------
  M.inkpool = o => { const r = (o.r || 1.6); V.shape(o.x, o.y, 'orb', '#0c0818', r * TS() * 0.65, o.dur || 1.4, { solid: true, z: 0, flat: 0.42, grow: 0.25 }); for (let i = 0; i < 3; i++) later(i * 0.2, () => V.ring(o.x, o.y, r * (0.6 + i * 0.25), INK, 0.6, { w: 1 })); V.gglow(o.x, o.y, r, '#6a3aff', o.dur || 1); };
  M.lure = o => { V.shape(o.x, o.y, 'lure', '#1a1428', 10 * o.sc, 1.1, { solid: true, z: 6, rise: 6, grow: 0, c2: '#e8d8ff' }); V.shape(o.x + 0.2, o.y - 0.05, 'orb', '#c08aff', 4, 1.1, { z: 22, grow: 0.3 }); V.gglow(o.x, o.y, 1, '#a06aff', 1); };
  M.inksplash = o => { for (let i = 0; i < 12 * (o.light ? 0.5 : 1); i++) { const a = R(0, 6.28); V.p(o.x, o.y, 6, Math.cos(a) * R(1, 3.5), Math.sin(a) * R(1, 3.5), R(30, 90), R(0.4, 0.8), R(2, 4), U.pick(['#0c0818', '#1a1430', '#2a1a48']), { add: false, grav: 220 }); } V.ring(o.x, o.y, 0.9, INK, 0.35, { w: 1 }); };
  M.inktendril = o => { for (let i = 0; i < (o.light ? 2 : 5); i++) { const a = R(0, 6.28), rr = R(0, 0.9); V.shape(o.x + Math.cos(a) * rr, o.y + Math.sin(a) * rr * 0.6, 'tendril', '#120c22', R(8, 13) * o.sc, 0.7, { solid: true, z: 2, rise: 8, rot: R(-0.4, 0.4), grow: 0.2, delay: i * 0.04 }); } V.gglow(o.x, o.y, 1, '#6a3aff', 0.5); };
  M.inkwave = o => { const n = 6; for (let i = 0; i < n; i++) { const q = (i + 1) / n; V.shape(U.lerp(o.sx, o.x, q), U.lerp(o.sy, o.y, q), 'inkwave', '#120c22', (6 + i) * o.sc, 0.45, { solid: true, z: 4, rot: o.ang, delay: i * 0.035, grow: 0.3 }); } M.inksplash(Object.assign({}, o, { light: true })); };
  M.inkspikes = o => { const r = o.r || 1.8; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28, rr = r * R(0.3, 0.95); V.shape(o.x + Math.cos(a) * rr, o.y + Math.sin(a) * rr * 0.7, 'spikes', '#120c22', R(6, 9) * o.sc, 0.75, { solid: true, z: 2, rise: 6, grow: 0, delay: R(0, 0.12) }); V.shape(o.x + Math.cos(a) * rr, o.y + Math.sin(a) * rr * 0.7, 'star4', '#c08aff', 3, 0.4, { z: 18, delay: 0.12 }); } V.shake(3, 0.2); };
  M.maw = o => { const sc = o.sc * (o.ult ? 1.6 : 1); M.inkpool(Object.assign({}, o, { r: 2.2 * sc, dur: 1.4 })); V.shape(o.x, o.y, 'maw', '#0e0a1c', 20 * sc, 1, { solid: true, z: 22 * sc, rise: 10, grow: 0, c2: '#d8c8ff', rot: -Math.PI / 2 }); later(0.6, () => { V.shake(6 * sc, 0.4); M.inksplash(o); V.gglow(o.x, o.y, 2.5 * sc, '#a06aff', 0.6); if (o.ult) V.flash('#c08aff', 0.15); }); };
  M.launch = o => { V.shape(o.x, o.y, 'inkwave', '#120c22', 16 * o.sc, 0.6, { solid: true, z: 10, rise: 50, rot: -1.2, grow: 0.5 }); M.inksplash(o); };

  // ---------------- tables for the 3 new classes ----------------
  FX.T.darkknight = ['voidslash neoncrack', 'neonclaw greysmoke', 'abysstreak neoncrack', 'silhouette abysstreak', 'smokewhirl neoncrack', 'abysspillar greysmoke', 'neonbolt greysmoke @bolt', 'smokering neoncrack', 'curse neonbolt', 'smokeaura neoncrack', 'neonstorm greysmoke', 'souls smokeaura', 'hexwall smokeaura', 'silhouette greysmoke', 'blackholering stormdome'];
  FX.T.lightbringer = ['sunspark prismray @orb', 'prismray halo @shard', 'solarbeam sunspark', 'prismray arc', 'corona rays', 'solarpillar sunspark', 'radiantdome rune', 'prismray flurry', 'corona eye', 'halo aurora', 'prismray hexagram', 'heal aurora', 'hexwall prismray', 'sunspark afterimage', 'eclipsering solarbeam'];
  FX.T.shadowmancer = ['lure inksplash @orb', 'inktendril inksplash', 'inkpool lure', 'inkwave inksplash', 'inkpool inkspikes', 'inkspikes inksplash', 'inkpool inktendril', 'inkpool inkwave', 'inktendril curse', 'inkpool smoke', 'lure afterimage', 'hexwall inkpool', 'lure maw', 'inkwave launch', 'maw inkpool'];
  for (const k in FX.cache) delete FX.cache[k];

  // ---------------- global polish for every skill ----------------
  const baseAt = FX.at;
  FX.at = (u, s, x, y, ang, o = {}) => {
    baseAt(u, s, x, y, ang, o); if (!s || !s.id || !G.E.vis(x, y)) return; const pal = D.ELEM[s.elem].pal;
    if (!o.light) {
      V.shape(x, y, 'orb', '#ffffff', 5 * (s.ult ? 2 : 1), 0.09, { z: 10, grow: 2.2 }); // impact flash frame
      V.gglow(x, y, (o.r || s.r || 1.2) * 1.1, pal[1], 0.6); // light pool on the ground
      for (let i = 0; i < 3; i++) V.tex(x + R(-0.8, 0.8), y + R(-0.5, 0.5), s.elem, 'spark', { vz: R(8, 20), z: R(4, 20), dur: R(1, 1.6), once: false, fps: 6, delay: R(0, 0.2), alpha: 0.85 }); // lingering motes
    }
    if (u === G.W.player && s.ult) G.zKick = 0.07;
  };
  const baseCast = FX.cast;
  FX.cast = (u, s, A) => {
    baseCast(u, s, A); if (!s.id || !G.E.vis(u.x, u.y)) return; const pal = D.ELEM[s.elem].pal;
    if (s.c >= 1.5 || s.ult) for (let i = 0; i < (s.ult ? 22 : 9); i++) { const a = i / 9 * 6.28 + R(0, 0.5), r = R(1, 1.8) * (s.ult ? 1.6 : 1); V.p(u.x + Math.cos(a) * r, u.y + Math.sin(a) * r, R(6, 26), -Math.cos(a) * r * 4, -Math.sin(a) * r * 4, 0, 0.25, 2, U.pick(pal), { drag: 1, kind: 'streak' }); }
  };
})(window.G);
