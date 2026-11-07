'use strict';
/* FX6 — hand-designed skill effects for the 14 core classes.
   Each class has its own visual language (colour ramp + signature shapes) and every one of its 15 skills
   is a distinct composition of lightweight vector primitives (no shared archetype textures, no read-back). */
(function (G) {
  const U = G.U, D = G.D, V = G.VFX, FX = G.FX, SH = FX.SH;
  const TS = () => G.TS; const R = (a, b) => a + Math.random() * (b - a);
  const add = (o) => { o.t = 0; V.fx.push(o); return o; };
  const eo = k => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
  const eb = k => { k = Math.min(1, Math.max(0, k)); const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
  const draw = (x, kind, s, c, c2, t) => { if (!(s > 0.05)) return; FX.drawShape(x, kind, s, c, c2, t || 0); };
  // soft bloom sprites (pre-rendered radial gradients, cached per colour) — the "ฟุ้ง" glow under every effect piece
  const GLC = {}; const glowSpr = (c) => { if (GLC[c]) return GLC[c]; const [cv, x] = G.SPR.mk(64, 64); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, c); g.addColorStop(0.35, c + 'aa'); g.addColorStop(1, c + '00'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return GLC[c] = cv; };
  const GLOW = () => [0.55, 1, 1.35][(V.level ?? 1)];
  const glow = (x, px, py, r, c, a, sy = 1) => { if (r < 1 || a <= 0.01) return; const op = x.globalCompositeOperation, ga = x.globalAlpha; x.globalCompositeOperation = 'lighter'; x.globalAlpha = Math.min(1, a * GLOW()); const R = r * GLOW(); x.drawImage(glowSpr(c.length === 7 ? c : '#ffffff'), px - R, py - R * sy, R * 2, R * 2 * sy); x.globalCompositeOperation = op; x.globalAlpha = ga; };

  // ---------- extra shapes ----------
  SH.crosshair = (x, s) => { x.lineWidth = Math.max(1, s / 7); x.beginPath(); x.arc(0, 0, s * 0.7, 0, 7); x.stroke(); x.beginPath(); x.arc(0, 0, s * 0.32, 0, 7); x.stroke(); for (const [a, b, c, d] of [[0, -s, 0, -s * 0.45], [0, s, 0, s * 0.45], [-s, 0, -s * 0.45, 0], [s, 0, s * 0.45, 0]]) { x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); } x.fillRect(-1, -1, 2, 2); };
  SH.heart = (x, s) => { x.beginPath(); x.moveTo(0, s * 0.75); x.bezierCurveTo(-s * 1.1, 0, -s * 0.6, -s * 0.9, 0, -s * 0.35); x.bezierCurveTo(s * 0.6, -s * 0.9, s * 1.1, 0, 0, s * 0.75); x.fill(); };
  SH.petal = (x, s) => { x.beginPath(); x.moveTo(0, -s); x.quadraticCurveTo(s * 0.7, -s * 0.2, 0, s * 0.8); x.quadraticCurveTo(-s * 0.7, -s * 0.2, 0, -s); x.fill(); };

  // ---------- primitive renderers ----------
  V.X.f6cres = { draw(x, cam, f, k) { if (f.t < f.delay) return; const kk = (f.t - f.delay) / (f.dur - f.delay); const u = f.follow; const [sx, sy] = cam.w2s(u ? u.x : f.x, u ? u.y : f.y); const T = TS();
    const rv = Math.min(1, kk * 4), al = kk < 0.3 ? 1 : 1 - (kk - 0.3) / 0.7; const Ro = f.R * T, Ri = Ro * (1 - f.w), sh = Ro * f.w * 0.55; const a0 = f.a - f.sw / 2, a1 = a0 + f.sw * rv; const mid = (a0 + a1) / 2;
    for (let q = 0; q < 3; q++) { const aa = a0 + (a1 - a0) * (q + 0.5) / 3; glow(x, sx + Math.cos(aa) * Ro * 0.9, sy - 9 + Math.sin(aa) * Ro * 0.65 * (f.flip ? -1 : 1), Ro * 0.55, f.pal[1], al * 0.5); }
    x.save(); x.translate(sx, sy - 9); x.scale(1, 0.72); if (f.flip) x.scale(1, -1);
    const path = (jag) => { x.beginPath(); const N = 18; for (let i = 0; i <= N; i++) { const a = a0 + (a1 - a0) * i / N; const rr = Ro * (jag && i % 2 ? 0.9 : 1); x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } for (let i = N; i >= 0; i--) { const a = a0 + (a1 - a0) * i / N; x.lineTo(Math.cos(mid) * sh + Math.cos(a) * Ri, Math.sin(mid) * sh + Math.sin(a) * Ri); } x.closePath(); };
    x.globalAlpha = al * 0.55; x.fillStyle = f.pal[2]; path(f.jag); x.fill(); x.scale(0.94, 0.94); x.globalAlpha = al; x.fillStyle = f.pal[1]; path(f.jag); x.fill();
    x.globalAlpha = al; x.strokeStyle = f.pal[0]; x.lineWidth = 1.2; x.beginPath(); x.arc(0, 0, Ro * 0.985, a0, a1); x.stroke(); x.restore(); } };
  V.X.f6cut = { draw(x, cam, f, k) { const [sx, sy] = cam.w2s(f.x, f.y); const T = TS(); glow(x, sx, sy - 12, T * 1.2, f.pal[1], (1 - k) * 0.55); x.save(); x.translate(sx, sy - 12);
    f.lines.forEach((ln, i) => { const lt = (f.t - i * f.stg) / (f.dur - i * f.stg); if (lt <= 0) return; const g = Math.min(1, lt * 5), al = lt < 0.35 ? 1 : Math.max(0, 1 - (lt - 0.35) / 0.65); const L = ln.L * T * g, W = f.w * (1 - lt * 0.6);
      x.save(); x.translate(ln.ox * T, ln.oy * T * 0.7); x.rotate(ln.a); const bend = ln.bend || 0;
      x.globalAlpha = al * 0.7; x.fillStyle = f.pal[2]; x.beginPath(); x.moveTo(-L / 2, 0); x.quadraticCurveTo(0, -W * 1.8 + bend * T, L / 2, 0); x.quadraticCurveTo(0, W * 1.8 + bend * T, -L / 2, 0); x.fill();
      x.globalAlpha = al; x.fillStyle = f.pal[0]; x.beginPath(); x.moveTo(-L / 2, 0); x.quadraticCurveTo(0, -W * 0.7 + bend * T, L / 2, 0); x.quadraticCurveTo(0, W * 0.7 + bend * T, -L / 2, 0); x.fill(); x.restore(); });
    x.restore(); } };
  V.X.f6wave = { ground: true, draw(x, cam, f, k) { if (f.t < f.delay) return; const kk = (f.t - f.delay) / (f.dur - f.delay); const u = f.follow; const [sx, sy] = cam.w2s(u ? u.x : f.x, u ? u.y : f.y); const T = TS(); const r = Math.max(1, f.R * T * eo(kk)), al = 1 - kk;
    x.save(); x.translate(sx, sy); x.scale(1, 0.55); x.strokeStyle = f.pal[2]; x.globalAlpha = al * 0.28 * GLOW(); x.lineWidth = f.th * 4; x.beginPath(); x.arc(0, 0, r, 0, 7); x.stroke(); x.strokeStyle = f.pal[1]; x.lineWidth = f.th * (1 - kk * 0.5); x.globalAlpha = al;
    const st = f.st;
    if (st === 'dash') { x.setLineDash([6, 5]); x.lineDashOffset = -f.t * 60; x.beginPath(); x.arc(0, 0, r, 0, 7); x.stroke(); x.setLineDash([]); }
    else if (st === 'jag') { x.beginPath(); const N = 28; for (let i = 0; i <= N; i++) { const a = i / N * 6.283; const rr = r * (i % 2 ? 0.86 : 1.06); x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.stroke(); }
    else if (st === 'hex') { x.beginPath(); for (let i = 0; i <= 6; i++) { const a = i / 6 * 6.283 + f.t * 0.8; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.stroke(); glow(x, 0, 0, r, f.pal[2], al * 0.3); }
    else if (st === 'petal') { const N = 8; for (let i = 0; i < N; i++) { const a = i / N * 6.283 + f.t; x.beginPath(); x.ellipse(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6, r * 0.42, r * 0.16, a, 0, 7); x.stroke(); } }
    else if (st === 'teeth') { x.beginPath(); const N = 16; for (let i = 0; i < N * 2; i++) { const a = i / (N * 2) * 6.283; const rr = i % 2 ? r : r * 0.8; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.closePath(); x.stroke(); }
    else if (st === 'double') { x.beginPath(); x.arc(0, 0, r, 0, 7); x.stroke(); x.globalAlpha = al * 0.7; x.strokeStyle = f.pal[0]; x.lineWidth = 1; x.beginPath(); x.arc(0, 0, r * 0.72, 0, 7); x.stroke(); }
    else { x.beginPath(); x.arc(0, 0, r, 0, 7); x.stroke(); glow(x, 0, 0, r, f.pal[2], al * 0.32); }
    x.restore(); } };
  const SPK = {
    ice: (x, h, p) => { x.fillStyle = p[1]; x.beginPath(); x.moveTo(-3, 0); x.lineTo(0, -h); x.lineTo(3, 0); x.fill(); x.fillStyle = p[0]; x.beginPath(); x.moveTo(-3, 0); x.lineTo(0, -h); x.lineTo(0, 0); x.fill(); },
    crystal: (x, h, p) => { x.fillStyle = p[2]; x.beginPath(); x.moveTo(-4, 0); x.lineTo(-4, -h * 0.7); x.lineTo(0, -h); x.lineTo(4, -h * 0.7); x.lineTo(4, 0); x.fill(); x.fillStyle = p[0]; x.fillRect(-1, -h * 0.85, 2, h * 0.8); },
    blood: (x, h) => { x.fillStyle = '#ff4a4a'; x.beginPath(); x.moveTo(-3, 0); x.lineTo(0, -h); x.lineTo(3, 0); x.fill(); x.fillStyle = '#ffd0c0'; x.fillRect(-0.5, -h * 0.8, 1, h * 0.6); },
    light: (x, h, p) => { x.fillStyle = p[1]; x.fillRect(-2, -h, 4, h); x.fillStyle = p[0]; x.fillRect(-1, -h, 2, h); },
    flame: (x, h, p) => { x.save(); x.translate(0, -h * 0.45); draw(x, 'flame', h * 0.5, p[1], p[3]); x.restore(); },
    hand: (x, h, p) => { x.save(); x.translate(0, -h * 0.5); draw(x, 'hand', h * 0.45, p[1], p[3]); x.restore(); },
    bone: (x, h) => { x.globalCompositeOperation = 'source-over'; x.fillStyle = '#efe6cf'; x.beginPath(); x.moveTo(-3, 0); x.quadraticCurveTo(-4, -h * 0.6, 2, -h); x.quadraticCurveTo(0, -h * 0.5, 3, 0); x.fill(); x.fillStyle = '#9a8a6a'; x.fillRect(1, -h * 0.4, 1, h * 0.4); x.globalCompositeOperation = 'lighter'; },
    thorn: (x, h) => { x.globalCompositeOperation = 'source-over'; x.fillStyle = '#3f8a2a'; x.beginPath(); x.moveTo(-3, 0); x.quadraticCurveTo(-5, -h * 0.6, 3, -h); x.quadraticCurveTo(0, -h * 0.4, 3, 0); x.fill(); x.fillStyle = '#9be34a'; x.fillRect(-1, -h * 0.5, 1, h * 0.4); x.globalCompositeOperation = 'lighter'; },
    rock: (x, h) => { x.globalCompositeOperation = 'source-over'; x.fillStyle = '#7a6a5a'; x.beginPath(); x.moveTo(-5, 0); x.lineTo(-4, -h * 0.6); x.lineTo(-1, -h); x.lineTo(4, -h * 0.7); x.lineTo(5, 0); x.fill(); x.fillStyle = '#b0a08a'; x.beginPath(); x.moveTo(-4, -h * 0.6); x.lineTo(-1, -h); x.lineTo(0, -h * 0.5); x.fill(); x.globalCompositeOperation = 'lighter'; }
  };
  V.X.f6spk = { draw(x, cam, f, k) { const T = TS(); for (const p of f.pts) { const lt = (f.t - p[2]) / (f.dur - p[2]); if (lt <= 0 || lt >= 1) continue; const h = p[3] * T * eb(lt * 5) * (lt > 0.75 ? (1 - lt) / 0.25 : 1); if (h < 1) continue;
      const [sx, sy] = cam.w2s(p[0], p[1]); glow(x, sx, sy - h * 0.4, h * 0.75, f.pal[1], 0.35 * (lt > 0.75 ? (1 - lt) / 0.25 : 1)); x.save(); x.translate(Math.round(sx), Math.round(sy)); x.rotate(p[4]); x.globalAlpha = lt > 0.75 ? (1 - lt) / 0.25 : 1; (SPK[f.sh] || SPK.ice)(x, h, f.pal); x.restore(); } x.globalAlpha = 1; } };
  V.X.f6burst = { draw(x, cam, f, k) { const T = TS(); const [sx, sy] = cam.w2s(f.x, f.y); const d = eo(k); x.globalAlpha = 1 - k * k;
    for (const it of f.items) { const px = sx + Math.cos(it.a) * it.v * d * T, py = sy + Math.sin(it.a) * it.v * d * T * 0.6 - f.z - (it.up * k - f.grav * k * k) * 30; glow(x, px, py, it.s * 2.4, it.c && it.c.length === 7 ? it.c : f.pal[1], (1 - k * k) * 0.45); x.save(); x.translate(px, py); x.rotate(it.r + it.sp * f.t); x.globalAlpha = 1 - k * k; draw(x, f.sh, it.s, it.c || f.pal[1], f.pal[3], f.t); x.restore(); } x.globalAlpha = 1; } };
  V.X.f6stamp = { draw(x, cam, f, k) { if (f.t < f.delay) return; const kk = (f.t - f.delay) / (f.dur - f.delay); const u = f.follow; const [sx, sy] = cam.w2s(u ? u.x : f.x, u ? u.y : f.y); const s = f.s * eb(Math.min(1, kk * 4)) * (1 + kk * 0.25);
    glow(x, sx, sy - f.z, s * 2.6, f.pal[1], (kk < 0.55 ? 1 : (1 - kk) / 0.45) * 0.6); x.save(); x.translate(sx, sy - f.z); x.rotate(f.rot + f.spin * f.t); x.globalAlpha = (kk < 0.55 ? 1 : (1 - kk) / 0.45) * 0.5; draw(x, f.sh, s * 1.25, f.pal[2], f.pal[3], f.t); x.globalAlpha = kk < 0.55 ? 1 : (1 - kk) / 0.45; draw(x, f.sh, s, f.c || f.pal[0], f.pal[2], f.t); x.restore(); } };
  V.X.f6col = { draw(x, cam, f, k) { if (f.t < f.delay) return; const kk = (f.t - f.delay) / (f.dur - f.delay); const [sx, sy] = cam.w2s(f.x, f.y); const h = f.H * Math.min(1, kk * 6), w = f.w * (1 - kk * 0.6); glow(x, sx, sy - h * 0.5, Math.max(w * 2.2, 6), f.pal[1], (1 - kk) * 0.55, Math.max(1, h / Math.max(w * 4.4, 12))); glow(x, sx, sy, w * 2.6, f.pal[0], (1 - kk) * 0.5, 0.45); x.globalAlpha = 1 - kk;
    x.fillStyle = f.pal[2]; x.fillRect(Math.round(sx - w / 2), Math.round(sy - h), Math.round(w), Math.round(h)); x.fillStyle = f.pal[0]; x.fillRect(Math.round(sx - w / 5), Math.round(sy - h), Math.max(1, Math.round(w / 2.5)), Math.round(h));
    x.fillStyle = f.pal[1]; x.beginPath(); x.ellipse(sx, sy, w * 1.1, w * 0.4, 0, 0, 7); x.fill(); x.globalAlpha = 1; } };
  // alchemy-style magic circle: double outer ring with a rune band, star polygon, 4 orbiting sigils, inner wheel
  const RUNE = (x, i, s) => { const k = i % 6; x.beginPath(); if (k === 0) { x.moveTo(-s, -s); x.lineTo(s, s); x.moveTo(s, -s); x.lineTo(-s, s); } else if (k === 1) { x.moveTo(0, -s); x.lineTo(s, s); x.lineTo(-s, s); x.closePath(); } else if (k === 2) { x.arc(0, 0, s * 0.7, 0, 7); x.moveTo(0, -s); x.lineTo(0, s); } else if (k === 3) { x.moveTo(-s, 0); x.lineTo(s, 0); x.moveTo(-s * 0.5, -s); x.lineTo(-s * 0.5, s); } else if (k === 4) { x.moveTo(0, -s); x.lineTo(s, 0); x.lineTo(0, s); x.lineTo(-s, 0); x.closePath(); } else { x.arc(0, -s * 0.3, s * 0.5, 0, Math.PI); x.moveTo(0, s * 0.2); x.lineTo(0, s); } x.stroke(); };
  const MCIRC = (x, r, t, pal, seed, al) => { const c1 = pal[1], c0 = pal[0]; x.lineCap = 'round';
    x.globalAlpha = al * 0.22; const g = x.createRadialGradient(0, 0, 0, 0, 0, r * 1.15); g.addColorStop(0, pal[2]); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, r * 1.15, 0, 7); x.fill();
    x.globalAlpha = al; x.strokeStyle = c1; x.lineWidth = 1.6; x.beginPath(); x.arc(0, 0, r, 0, 7); x.stroke(); x.lineWidth = 1; x.beginPath(); x.arc(0, 0, r * 0.86, 0, 7); x.stroke();
    // rune band
    x.save(); x.rotate(t * 0.35); const nR = Math.max(12, Math.round(r / 2.2)); x.lineWidth = 0.8; for (let i = 0; i < nR; i++) { const a = i / nR * 6.283; x.save(); x.translate(Math.cos(a) * r * 0.93, Math.sin(a) * r * 0.93); x.rotate(a + 1.571); RUNE(x, i + seed, Math.max(1, r * 0.035)); x.restore(); } x.restore();
    // star polygon (hexagram / pentagram / octagram by seed)
    const n = [6, 5, 8, 7][seed % 4], skip = n === 6 ? 2 : n === 8 ? 3 : 2; x.save(); x.rotate(-t * 0.5); x.lineWidth = 1.2; x.strokeStyle = c0; x.beginPath(); for (let i = 0; i <= n; i++) { const a = i * skip / n * 6.283 - 1.571; const px = Math.cos(a) * r * 0.82, py = Math.sin(a) * r * 0.82; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke();
    x.strokeStyle = c1; x.lineWidth = 0.9; x.beginPath(); for (let i = 0; i <= n; i++) { const a = i / n * 6.283 - 1.571; const px = Math.cos(a) * r * 0.82, py = Math.sin(a) * r * 0.82; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); x.restore();
    // 4 orbiting sigils
    x.save(); x.rotate(t * 0.8); for (let i = 0; i < 4; i++) { const a = i / 4 * 6.283 + 0.785; x.save(); x.translate(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6); x.strokeStyle = c1; x.lineWidth = 1; x.beginPath(); x.arc(0, 0, r * 0.15, 0, 7); x.stroke(); x.beginPath(); x.arc(0, 0, r * 0.1, 0, 7); x.stroke(); x.rotate(-t * 2); RUNE(x, i * 2 + seed, r * 0.06); x.restore(); } x.restore();
    // inner wheel
    x.strokeStyle = c0; x.lineWidth = 1.3; x.beginPath(); x.arc(0, 0, r * 0.3, 0, 7); x.stroke(); x.lineWidth = 0.9; x.beginPath(); x.arc(0, 0, r * 0.2, 0, 7); x.stroke(); x.save(); x.rotate(t * 1.6); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; x.beginPath(); x.moveTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2); x.lineTo(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3); x.stroke(); } x.restore(); };
  G.FX6_MCIRC = MCIRC;
  // cached circle images (drawn once per palette/seed/size, then just rotated) — keeps big fights smooth
  const MCC = new Map(); const mcImg = (pal, seed, r) => { const R0 = Math.max(8, Math.min(160, Math.round(r / 6) * 6)); const key = pal[1] + pal[0] + (seed % 8) + '|' + R0; let c = MCC.get(key); if (c) return c; const S = Math.ceil(R0 * 2.4); const [cv, x] = G.SPR.mk(S, S); x.translate(S / 2, S / 2); MCIRC(x, R0, 0, pal, seed % 8, 1); c = { cv, S, R0 }; MCC.set(key, c); if (MCC.size > 120) MCC.delete(MCC.keys().next().value); return c; };
  V.X.f6sig = { ground: true, draw(x, cam, f, k) { const u = f.follow; const [sx, sy] = cam.w2s(u ? u.x : f.x, u ? u.y : f.y); const T = TS(); const r = f.R * T * (k < 0.12 ? 0.5 + k / 0.12 * 0.5 : 1); const al = Math.min(1, f.t * 5) * (k > 0.75 ? (1 - k) / 0.25 : 1); if (r < 2) return;
    const seed = f.seed ?? (f.seed = Math.floor(Math.random() * 97)); const im = mcImg(f.pal, seed, r); const sc = r / im.R0; x.save(); x.translate(sx, sy); x.scale(1, 0.55); x.globalCompositeOperation = 'lighter'; x.globalAlpha = al * 0.95; x.rotate(f.t * 0.4); x.drawImage(im.cv, -im.S / 2 * sc, -im.S / 2 * sc, im.S * sc, im.S * sc); x.rotate(-f.t * 0.4); x.globalAlpha = al * 0.5; draw(x, f.sh, r * 0.12, f.pal[0], f.pal[3], f.t); x.restore(); } };
  V.X.f6streak = { draw(x, cam, f, k) { const [a, b] = cam.w2s(f.x1, f.y1), [c, d] = cam.w2s(f.x2, f.y2); const L = Math.hypot(c - a, d - b) || 1; const nx = -(d - b) / L, ny = (c - a) / L; const head = Math.min(1, k * 5);
    for (let i = 0; i < f.n; i++) { const o = (i - (f.n - 1) / 2) * f.gap; x.globalAlpha = (1 - k) * (i === (f.n - 1) / 2 ? 1 : 0.6); x.strokeStyle = i % 2 ? f.pal[1] : f.pal[0]; x.lineWidth = Math.max(1, f.w * (1 - k)); x.beginPath(); x.moveTo(a + nx * o, b + ny * o - 10); x.lineTo(a + (c - a) * head + nx * o, b + (d - b) * head + ny * o - 10); x.stroke(); }
    x.globalAlpha = 1; } };
  V.X.f6vortex = { draw(x, cam, f, k) { const T = TS(); const [sx, sy] = cam.w2s(f.x, f.y); x.globalAlpha = k < 0.8 ? 1 : (1 - k) / 0.2; const rr = (f.inw ? 1 - eo(k) * 0.9 : 0.25 + eo(k) * 0.75) * f.R * T;
    for (let i = 0; i < f.n; i++) { const a = i / f.n * 6.283 + f.t * f.spd * (f.inw ? 1.6 : 1); const px = sx + Math.cos(a) * rr, py = sy + Math.sin(a) * rr * 0.55 - f.z - Math.sin(a * 2 + f.t * 3) * 3; glow(x, px, py, f.s * 2.2, f.pal[1], 0.35); x.save(); x.translate(px, py); x.rotate(a + Math.PI / 2); draw(x, f.sh, f.s, i % 2 ? f.pal[0] : f.pal[1], f.pal[3], f.t); x.restore(); } x.globalAlpha = 1; } };

  // ---------- builders (each returns a spawner for a hit context c) ----------
  const P = {};
  // only spell-casting skills get magic circles: physical classes / physical skill patterns never do
  const PHYS_CLS = { blademaster: 1, guardian: 1, berserker: 1, assassin: 1, shadowdancer: 1, ranger: 1, marksman: 1, engineer: 1, monk: 1, beastmaster: 1, darkknight: 1, reaper: 1, demon: 1, jester: 1 };
  const PHYS_ARCH = { slash: 1, spin: 1, thrust: 1, dash: 1, barrage: 1, leap: 1, proj: 0, trap: 1 };
  const isMagic = (s) => !!s && !PHYS_CLS[s.cls] && !PHYS_ARCH[s.arch];
  G.FX6_isMagic = isMagic;
  const pal = (c, o) => o.pal || c.pal;
  P.cres = (o = {}) => c => { const n = o.n || 1; const fl = ((c.u && c.u.castCount) || 0) % 2 === 1; for (let i = 0; i < n; i++) add({ k: 'f6cres', x: c.sx, y: c.sy, follow: o.spin ? c.u : null, a: c.ang + (i - (n - 1) / 2) * (o.sp || 0), R: (o.R || 1.2) * c.sc, w: o.w || 0.28, sw: o.sw || 2, pal: pal(c, o), dur: o.dur || 0.3, flip: o.alt ? i % 2 === 1 : fl, jag: !!o.jag, delay: i * (o.dl || 0) }); };
  P.cuts = (o = {}) => c => { const n = o.n || 1, L = o.L || 1.5; const A = c.ang; let lines = [];
    const pat = o.pat || 'one';
    if (pat === 'one') lines = [{ a: A + 0.55, L }]; else if (pat === 'x') lines = [{ a: 0.785, L }, { a: -0.785, L }]; else if (pat === 'star') for (let i = 0; i < n; i++) lines.push({ a: i / n * Math.PI + R(-0.1, 0.1), L });
    else if (pat === 'par') for (let i = 0; i < n; i++) lines.push({ a: A, L, ox: Math.cos(A + 1.571) * (i - (n - 1) / 2) * 0.3, oy: Math.sin(A + 1.571) * (i - (n - 1) / 2) * 0.3 });
    else if (pat === 'claw') for (let i = 0; i < n; i++) lines.push({ a: 1.0, L, ox: (i - (n - 1) / 2) * 0.28, oy: -(i - (n - 1) / 2) * 0.16, bend: 0.12 });
    else if (pat === 'vee') lines = [{ a: 1.15, L, ox: -0.25 }, { a: -1.15, L, ox: 0.25 }];
    else if (pat === 'low') for (let i = 0; i < n; i++) lines.push({ a: R(-0.12, 0.12), L, oy: 0.35 + i * 0.2 });
    else if (pat === 'vert') lines = [{ a: 1.571, L }]; else if (pat === 'stab') lines = [{ a: A, L, ox: Math.cos(A) * 0.3, oy: Math.sin(A) * 0.3 }];
    else for (let i = 0; i < n; i++) lines.push({ a: R(0, 3.14), L: L * R(0.7, 1.1), ox: R(-0.4, 0.4), oy: R(-0.3, 0.3) });
    for (const l of lines) { l.ox = l.ox || 0; l.oy = l.oy || 0; }
    add({ k: 'f6cut', x: c.x, y: c.y, lines, w: o.w || 2.5, stg: o.stg ?? 0.03, pal: pal(c, o), dur: o.dur || 0.32 }); };
  P.wave = (o = {}) => c => { const at = o.self ? c.u : null; add({ k: 'f6wave', x: at ? at.x : c.x, y: at ? at.y : c.y, follow: o.follow ? c.u : null, R: (o.R || c.r || 1.6) * (o.raw ? 1 : c.sc), st: o.st || 'ring', th: o.th || 3, pal: pal(c, o), dur: o.dur || 0.45, delay: o.delay || 0, ground: true }); };
  P.spk = (o = {}) => c => { const n = Math.max(2, Math.round((o.n || 5) * QL())), pts = []; const cx = o.self ? c.sx : c.x, cy = o.self ? c.sy : c.y; const Rr = (o.R || c.r || 1.6) * c.sc; const h = o.h || 1.1;
    for (let i = 0; i < n; i++) { let px, py, dl = 0;
      if (o.pat === 'ring') { const a = i / n * 6.283; px = cx + Math.cos(a) * Rr; py = cy + Math.sin(a) * Rr; dl = R(0, 0.06); }
      else if (o.pat === 'line') { const t = (i + 1) / n; px = U.lerp(c.sx, c.x, t) + R(-0.15, 0.15); py = U.lerp(c.sy, c.y, t) + R(-0.15, 0.15); dl = i * 0.05; }
      else if (o.pat === 'fan') { const a = c.ang + (i / (n - 1) - 0.5) * 1.2; const d = R(1, 2.6); px = c.sx + Math.cos(a) * d; py = c.sy + Math.sin(a) * d; dl = d * 0.05; }
      else { const a = R(0, 6.283), d = Math.sqrt(Math.random()) * Rr; px = cx + Math.cos(a) * d; py = cy + Math.sin(a) * d; dl = R(0, 0.15); }
      pts.push([px, py, dl, h * R(0.75, 1.15), R(-0.15, 0.15)]); }
    add({ k: 'f6spk', pts, sh: o.sh || 'ice', pal: pal(c, o), dur: o.dur || 0.8 }); };
  P.burst = (o = {}) => c => { const n = Math.max(1, Math.round((o.n || 6) * QL())), items = []; for (let i = 0; i < n; i++) items.push({ a: o.ring ? i / n * 6.283 : R(0, 6.283), v: (o.spd || 1.6) * R(0.6, 1), r: R(0, 6.283), sp: R(-6, 6) * (o.spin ?? 1), s: (o.s || 4) * R(0.8, 1.2), up: o.up ?? R(0.3, 1), c: o.c ? (Array.isArray(o.c) ? U.pick(o.c) : o.c) : null });
    const at = o.self ? c.u : c; add({ k: 'f6burst', x: at.x, y: at.y, items, sh: o.sh || 'star', pal: pal(c, o), dur: o.dur || 0.6, z: o.z ?? 12, grav: o.grav || 0 }); };
  P.stamp = (o = {}) => c => { const at = o.self ? c.u : c; add({ k: 'f6stamp', x: at.x, y: at.y, follow: o.follow ? c.u : null, sh: o.sh || 'star', s: (o.s || 10) * (c.ult ? 1.4 : 1), pal: pal(c, o), c: o.c, dur: o.dur || 0.45, z: o.z ?? 16, rot: o.rot ?? (o.aim ? c.ang : 0), spin: o.spin || 0, delay: o.delay || 0 }); };
  P.col = (o = {}) => c => { const at = o.self ? c.u : c; add({ k: 'f6col', x: at.x, y: at.y, w: o.w || 6, H: o.H || 70, pal: pal(c, o), dur: o.dur || 0.45, delay: o.delay || 0 }); };
  P.sig = (o = {}) => c => { if (!isMagic(c.s)) { if (!o.self && !o.follow && V.level === 2) add({ k: 'f6wave', x: c.x, y: c.y, R: (o.R || c.r || 1.6) * 0.8, st: 'ring', th: 2, pal: pal(c, o), dur: 0.35, delay: 0, ground: true }); return; } const at = o.self ? c.u : c; add({ k: 'f6sig', x: at.x, y: at.y, follow: o.follow ? c.u : null, R: (o.R || c.r || 1.6), sh: o.sh || 'star', ticks: o.ticks || 8, pal: pal(c, o), dur: o.dur || c.dur || (c.s && c.s.d) || 0.9, ground: true }); };
  P.streak = (o = {}) => c => { add({ k: 'f6streak', x1: c.sx, y1: c.sy, x2: c.x, y2: c.y, n: o.n || 3, gap: o.gap || 3, w: o.w || 2, pal: pal(c, o), dur: o.dur || 0.3 });
    if (o.ghost && c.u && G.E.spriteInfo) { try { const si = G.E.spriteInfo(c.u); for (let i = 1; i <= o.ghost; i++) V.ghost(U.lerp(c.sx, c.x, i / (o.ghost + 1)), U.lerp(c.sy, c.y, i / (o.ghost + 1)), si, 0.4, 0.3, pal(c, o)[1]); } catch (e) { } } };
  P.vortex = (o = {}) => c => { const at = o.self ? c.u : c; add({ k: 'f6vortex', x: at.x, y: at.y, sh: o.sh || 'leaf', n: o.n || 8, R: (o.R || c.r || 1.6) * c.sc, inw: !!o.inw, spd: o.spd || 5, s: o.s || 4, z: o.z ?? 10, pal: pal(c, o), dur: o.dur || 0.7 }); };
  P.rain = (o = {}) => c => { const n = (o.n || 5) === 1 ? 1 : Math.max(1, Math.round((o.n || 5) * QL())), r = o.r ?? (c.r || 2); const p = pal(c, o); for (let i = 0; i < n; i++) { const a = R(0, 6.283), d = n === 1 ? 0 : Math.sqrt(Math.random()) * r; const px = c.x + Math.cos(a) * d, py = c.y + Math.sin(a) * d; const dl = i * (o.dl ?? 0.06);
      V.fallShape(px, py, o.sh || 'lance', o.c || p[1], o.s || 7, (o.dur || 0.35) + dl, { h: o.h || 130, ang: o.ang ?? 0.25, delay: dl, spin: o.spin || 0 });
      if (o.land !== false) add({ k: 'f6wave', x: px, y: py, R: o.lr || 0.7, st: o.lst || 'ring', th: 2, pal: p, dur: 0.3 + (o.dur || 0.35) + dl, delay: (o.dur || 0.35) + dl - 0.02, ground: true }); } };
  P.fork = (o = {}) => c => { const p = pal(c, o); for (let i = 0; i < (o.n || 2); i++) { if (o.sky) { const px = c.x + R(-0.6, 0.6) * (o.r || 0), py = c.y + R(-0.4, 0.4) * (o.r || 0); setTimeout(() => V.bolt(px, py, px + R(-0.2, 0.2), py, p, 0.22, { segs: 9, w: o.w || 2, z1: 150, z2: 0 }), i * 40); }
      else V.bolt(c.sx, c.sy, c.x + R(-0.4, 0.4), c.y + R(-0.3, 0.3), p, 0.22, { segs: 8, w: o.w || 2 }); } };
  P.chain = (o = {}) => c => { const n = 6; for (let i = 1; i < n; i++) V.shape(U.lerp(c.sx, c.x, i / n), U.lerp(c.sy, c.y, i / n), o.sh || 'chainlink', pal(c, o)[1], o.s || 4, 0.4, { rot: c.ang, z: 12, grow: 0, delay: i * 0.02 }); V.line(c.sx, c.sy, c.x, c.y, pal(c, o), 0.35, { w: 1 }); };
  P.orbit = (o = {}) => c => { if (c.u) V.orbit(c.u, o.n || 3, o.r || 1, o.sh || 'star', pal(c, o)[1], o.s || 4, o.dur || 1.2, o.spd || 4, { c2: pal(c, o)[3] }); };
  P.aura = (o = {}) => c => { const u = c.u; if (!u) return; for (let i = 0; i < Math.round((o.n || 5) * QL()); i++) V.shape(u.x + R(-0.5, 0.5), u.y + R(-0.3, 0.3), o.sh || 'star', o.c || pal(c, o)[U.ri(0, 1)], o.s || 3.5, R(0.7, 1), { rise: o.rise ?? 28, delay: i * 0.08, grow: 0, z: R(4, 18), spin: o.spin || 0 }); };
  P.rays = (o = {}) => c => { const at = o.self ? c.u : c; V.rays(at.x, at.y, o.n || 12, o.len || 2.5, pal(c, o)[0], o.dur || 0.4, { w: o.w || 1.5 }); };

  for (const k of Object.keys(P)) { const f0 = P[k]; P[k] = (o = {}) => { const fn = f0(o); fn.meta = { k, sh: o.sh, pat: o.pat, st: o.st }; return fn; }; }
  // ---------- palettes ----------
  const PAL = {
    blademaster: ['#ffffff', '#cfe4ff', '#7aa8e8', '#24407a'], guardian: ['#fffbe0', '#ffd870', '#c89a3a', '#5a4020'], berserker: ['#ffd0c0', '#ff4a3a', '#a8101e', '#400808'],
    paladin: ['#ffffff', '#fff2b0', '#ffc84a', '#b07a10'], pyromancer: ['#fff3b0', '#ffb347', '#ff5a1f', '#8a1a08'], cryomancer: ['#ffffff', '#c8f4ff', '#5cc8ff', '#1a4a8a'],
    stormcaller: ['#ffffff', '#fffb8a', '#9ad7ff', '#3a3a9a'], necromancer: ['#e8ffe8', '#9aff8a', '#6a3aaa', '#1a0a2e'], cleric: ['#ffffff', '#e8f4ff', '#8ac8ff', '#3a6ab0'],
    druid: ['#f0ffc0', '#9be34a', '#3fa83a', '#1a4a1a'], assassin: ['#f0ffb0', '#b8ff4a', '#4aa82a', '#0a2a0a'], shadowdancer: ['#f0d8ff', '#c04aff', '#6a1aa8', '#1a0a2e'],
    ranger: ['#ffffff', '#d0fff0', '#7ae8c8', '#2a7a5a'], marksman: ['#ffffff', '#ffe8a8', '#ff9a3a', '#5a3a1a']
  };
  const FIRE = PAL.pyromancer, ICE = PAL.cryomancer, GOLD = PAL.paladin, VIO = ['#f0d8ff', '#b07aff', '#5a2a9a', '#1a0a2e'], HEAL = ['#ffffff', '#c8ffd0', '#5ad07a', '#1a6a3a'], SMOKE = ['#e8e8f0', '#9a96a8', '#5a5668', '#2a2634'];
  // ---------- 14 classes × 15 hand-made recipes  [layers…, '@projShape'] ----------
  const { cres, cuts, wave, spk, burst, stamp, col, sig, streak, vortex, rain, fork, chain, orbit, aura, rays } = P;
  const T6 = {
    blademaster: [
      [cres({ R: 1.15, w: 0.2, sw: 2.3 }), cuts({ pat: 'one', L: 1.5, w: 1.6 })],
      [cres({ R: 1.6, w: 0.34, sw: 3 }), burst({ sh: 'moon', n: 3, spd: 1.4, s: 4 })],
      [streak({ n: 3, gap: 4 }), cuts({ pat: 'par', n: 3, L: 2.3, w: 1.4 }), stamp({ sh: 'spear', s: 9, aim: 1 })],
      [streak({ n: 5, gap: 2, ghost: 3 }), cuts({ pat: 'x', L: 1.8 })],
      [burst({ sh: 'petal', n: 10, spd: 2.2, c: ['#ffc8e0', '#ffffff', '#ff9ac8'], s: 3 }), cuts({ pat: 'rand', n: 2, L: 1.1, w: 1.4 })],
      [cres({ n: 4, R: 1.9, sw: 1.3, sp: 1.571, w: 0.22, spin: 1, alt: 1 }), wave({ st: 'dash', R: 2.2 })],
      [cuts({ pat: 'vert', L: 2.6, w: 3 }), wave({ st: 'jag', R: 1.2 }), '@blade'],
      [cuts({ pat: 'star', n: 9, L: 1.6, w: 1.5, stg: 0.02 }), burst({ sh: 'sword', n: 4, spd: 1, s: 4 })],
      [stamp({ sh: 'shield', s: 11 }), burst({ sh: 'shard', n: 7, spd: 1.8, s: 3, c: '#cfe4ff' })],
      [aura({ sh: 'blade', n: 6 }), sig({ sh: 'sword', R: 1.3, self: 1 })],
      [orbit({ sh: 'sword', n: 4, r: 1.1, s: 5 }), col({ w: 6, H: 60, self: 1 })],
      [cuts({ pat: 'low', n: 2, L: 1.4, w: 1.4 }), spk({ sh: 'light', pat: 'line', n: 3, h: 0.7 })],
      [wave({ st: 'double', R: 1.2, follow: 1 }), stamp({ sh: 'xslash', s: 12, self: 1 })],
      [streak({ n: 1, w: 1, ghost: 2 }), burst({ sh: 'feather', n: 5, spd: 1, s: 3, self: 1 })],
      [sig({ sh: 'sword', R: 4, ticks: 16 }), rain({ sh: 'sword', n: 8, r: 3.6, s: 8, ang: 0 }), cuts({ pat: 'star', n: 8, L: 4, w: 3 }), col({ w: 10, H: 120 })]
    ],
    guardian: [
      [stamp({ sh: 'shield', s: 10 }), wave({ st: 'ring', R: 1 })],
      [cres({ R: 1.25, w: 0.5, sw: 1.6, jag: 1 }), spk({ sh: 'rock', n: 4, R: 0.8, h: 0.6 })],
      [stamp({ sh: 'shield', s: 8, spin: 14 }), chain({ sh: 'chainlink', s: 3 })],
      [wave({ st: 'jag', R: 2.3, th: 4 }), spk({ sh: 'rock', pat: 'ring', n: 8, h: 0.8 })],
      [streak({ n: 3, w: 4, gap: 3 }), stamp({ sh: 'shield', s: 14, delay: 0.1 })],
      [rain({ sh: 'hammer', n: 1, s: 14, h: 110, lr: 1.6, lst: 'teeth' }), spk({ sh: 'rock', pat: 'fan', n: 5, h: 0.7 })],
      [cres({ n: 3, R: 1.7, sp: 2.09, w: 0.45, spin: 1, jag: 1 }), burst({ sh: 'chainlink', n: 6, spd: 1.6, s: 4 })],
      [spk({ sh: 'rock', pat: 'line', n: 5, h: 0.9 }), stamp({ sh: 'hammer', s: 10, aim: 1 })],
      [wave({ st: 'double', R: 3.5, th: 4, self: 1 }), vortex({ sh: 'chainlink', n: 8, R: 3, inw: 1, self: 1 })],
      [aura({ sh: 'hex', n: 6, s: 4 }), sig({ sh: 'hex', R: 1.2, self: 1, follow: 1 })],
      [vortex({ sh: 'chainlink', n: 10, R: 3, inw: 1, s: 5 }), wave({ st: 'hex', R: 3 })],
      [sig({ sh: 'shield', R: 4, ticks: 12, self: 1, follow: 1 }), aura({ sh: 'cross', n: 5, c: '#c8ffd0' })],
      [stamp({ sh: 'shield', s: 18, self: 1, follow: 1, dur: 0.8 }), wave({ st: 'hex', R: 1.4, follow: 1 })],
      [col({ w: 5, H: 50 }), wave({ st: 'teeth', R: 2.2 }), spk({ sh: 'rock', pat: 'ring', n: 6, h: 0.8 })],
      [sig({ sh: 'shield', R: 5, ticks: 20 }), col({ w: 12, H: 140 }), wave({ st: 'hex', R: 5, th: 5 }), rain({ sh: 'shield', n: 6, r: 4, s: 9 })]
    ],
    berserker: [
      [cres({ R: 1.35, w: 0.5, sw: 1.8, jag: 1 }), burst({ sh: 'drop', n: 4, spd: 1.2, s: 2.5, grav: 1 })],
      [cuts({ pat: 'claw', n: 3, L: 1.3, w: 2 })],
      [stamp({ sh: 'axe', s: 9, spin: 10 }), burst({ sh: 'drop', n: 5, spd: 1.4, s: 2.5, grav: 1 }), '@axe'],
      [cuts({ pat: 'rand', n: 2, L: 1.5, w: 2.4 }), burst({ sh: 'drop', n: 3, spd: 1, s: 2, grav: 1 })],
      [cres({ n: 2, R: 1.8, sp: 3.14, w: 0.45, spin: 1, jag: 1 }), wave({ st: 'jag', R: 2 })],
      [stamp({ sh: 'skull', s: 12 }), cuts({ pat: 'vert', L: 2.2, w: 3 })],
      [wave({ st: 'jag', R: 2.2, th: 4 }), spk({ sh: 'blood', pat: 'ring', n: 7, h: 0.8 }), burst({ sh: 'drop', n: 8, spd: 2, s: 2.5, grav: 1 })],
      [spk({ sh: 'blood', pat: 'line', n: 6, h: 1.1 })],
      [wave({ st: 'teeth', R: 3, th: 4, self: 1 }), stamp({ sh: 'fang', s: 14, self: 1 })],
      [aura({ sh: 'drop', n: 7, s: 3 }), sig({ sh: 'fang', R: 1.2, self: 1, follow: 1 })],
      [col({ w: 7, H: 70, self: 1 }), aura({ sh: 'flame', n: 5, c: '#ff4a3a' })],
      [chain({ sh: 'chainlink', s: 4 }), stamp({ sh: 'claw', s: 8 })],
      [stamp({ sh: 'skull', s: 16, self: 1, follow: 1, dur: 0.7 }), wave({ st: 'double', R: 1.2, follow: 1 })],
      [wave({ st: 'ring', R: 2.5, th: 6, self: 1 }), spk({ sh: 'rock', n: 6, R: 2.2, self: 1, h: 0.7 })],
      [vortex({ sh: 'axe', n: 8, R: 2.6, s: 6, spd: 7 }), cres({ n: 6, R: 3, sp: 1.05, w: 0.4, jag: 1, spin: 1 }), sig({ sh: 'fang', R: 3 }), burst({ sh: 'drop', n: 14, spd: 3, s: 3, grav: 1 })]
    ],
    paladin: [
      [cres({ R: 1.2, w: 0.3, sw: 2 }), stamp({ sh: 'cross', s: 6 })],
      [col({ w: 8, H: 100 }), sig({ sh: 'cross', R: 1.4 })],
      [stamp({ sh: 'hammer', s: 10, spin: 8 }), rays({ n: 10, len: 1.6 }), '@hammer'],
      [sig({ sh: 'cross', R: 2.5, ticks: 12 }), spk({ sh: 'light', n: 6, R: 2.2, h: 0.6, dur: 1.2 })],
      [spk({ sh: 'light', pat: 'line', n: 4, h: 1.3 }), stamp({ sh: 'lance', s: 10, aim: 1 })],
      [wave({ st: 'petal', R: 2 }), burst({ sh: 'star', n: 8, spd: 1.8, s: 3, ring: 1 })],
      [rain({ sh: 'hammer', n: 1, s: 10, h: 90, lr: 1 })],
      [streak({ n: 3, gap: 3 }), burst({ sh: 'wing', n: 4, spd: 1.2, s: 4 })],
      [rays({ n: 16, len: 3.2, self: 1 }), wave({ st: 'double', R: 3, self: 1 })],
      [orbit({ sh: 'halo', n: 1, r: 0.01, s: 7, spd: 0 }), aura({ sh: 'wing', n: 4, s: 4 })],
      [col({ w: 5, H: 60, pal: HEAL, self: 1 }), aura({ sh: 'cross', n: 5, c: '#c8ffd0' })],
      [sig({ sh: 'halo', R: 4, ticks: 12, self: 1 }), aura({ sh: 'cross', n: 4 })],
      [stamp({ sh: 'wing', s: 16, self: 1, follow: 1, dur: 0.8 }), wave({ st: 'hex', R: 1.3, follow: 1 })],
      [col({ w: 3, H: 80 }), burst({ sh: 'feather', n: 6, spd: 1.2, s: 3 })],
      [sig({ sh: 'cross', R: 4.5, ticks: 16 }), rain({ sh: 'lance', n: 10, r: 4.2, s: 9, ang: 0 }), col({ w: 12, H: 150 }), rays({ n: 20, len: 5 })]
    ],
    pyromancer: [
      [burst({ sh: 'flame', n: 4, spd: 0.9, s: 3, up: 1 }), '@fireball'],
      [wave({ st: 'jag', R: 1.3 }), burst({ sh: 'flame', n: 8, spd: 1.5, s: 4, up: 1 }), '@fireball'],
      [spk({ sh: 'flame', pat: 'fan', n: 7, h: 1.1 })],
      [wave({ st: 'petal', R: 2.2 }), burst({ sh: 'flame', n: 10, spd: 2, s: 4, ring: 1 })],
      [rain({ sh: 'comet', n: 1, s: 16, h: 150, lr: 2, lst: 'teeth' }), spk({ sh: 'rock', pat: 'ring', n: 7, R: 1.6, h: 0.6 })],
      [sig({ sh: 'flame', R: 2.2, ticks: 10 }), spk({ sh: 'flame', n: 8, R: 2, h: 0.9, dur: 2 })],
      [chain({ sh: 'flame', s: 3 }), stamp({ sh: 'flame', s: 7 })],
      [burst({ sh: 'feather', n: 4, spd: 1.2, s: 3, c: '#ffb347' }), '@feather'],
      [stamp({ sh: 'orb', s: 16 }), wave({ st: 'double', R: 2.5 })],
      [aura({ sh: 'flame', n: 6 }), orbit({ sh: 'fireball', n: 3, r: 1, s: 3 })],
      [spk({ sh: 'flame', pat: 'ring', n: 12, h: 1, dur: 1.4 }), wave({ st: 'ring', R: 3 })],
      [vortex({ sh: 'flame', n: 8, R: 1.2, self: 1, s: 4 }), wave({ st: 'dash', R: 1.3, follow: 1 })],
      [col({ w: 4, H: 50 }), burst({ sh: 'flame', n: 6, spd: 1.2, s: 3 })],
      [aura({ sh: 'drop', n: 6, c: '#ff7a2a' }), sig({ sh: 'flame', R: 1.2, self: 1, follow: 1 })],
      [sig({ sh: 'flame', R: 5, ticks: 18 }), rain({ sh: 'comet', n: 8, r: 4.6, s: 12, dl: 0.12, lr: 1.4, lst: 'teeth' }), wave({ st: 'teeth', R: 5, delay: 0.5 }), col({ w: 10, H: 120 })]
    ],
    cryomancer: [
      [burst({ sh: 'shard', n: 4, spd: 1, s: 3 }), '@shard'],
      [spk({ sh: 'ice', pat: 'line', n: 3, h: 0.9 }), '@lance'],
      [sig({ sh: 'snow', R: 2.5, ticks: 12 }), rain({ sh: 'snow', n: 8, r: 2.3, s: 4, spin: 4, land: false })],
      [spk({ sh: 'ice', pat: 'line', n: 6, h: 1.3 })],
      [spk({ sh: 'crystal', pat: 'ring', n: 8, h: 1 }), wave({ st: 'hex', R: 2 })],
      [rain({ sh: 'comet', n: 1, s: 14, pal: ICE, lr: 1.6, lst: 'jag' }), spk({ sh: 'crystal', n: 6, R: 1.5, h: 0.9 })],
      [burst({ sh: 'shard', n: 8, spd: 2, s: 3, ring: 1 }), stamp({ sh: 'snow', s: 9, spin: 4 })],
      [spk({ sh: 'ice', n: 2, R: 0.4, h: 0.7 }), '@shard'],
      [spk({ sh: 'crystal', pat: 'ring', n: 6, R: 0.7, h: 1.4, dur: 2 }), sig({ sh: 'snow', R: 1.4 })],
      [wave({ st: 'teeth', R: 3, self: 1 }), spk({ sh: 'ice', pat: 'ring', n: 12, R: 2.6, self: 1, h: 0.9 })],
      [orbit({ sh: 'snow', n: 3, r: 1, s: 4 }), aura({ sh: 'shard', n: 5 })],
      [stamp({ sh: 'hex', s: 18, self: 1, follow: 1, dur: 1.6 }), spk({ sh: 'crystal', pat: 'ring', n: 6, R: 1, self: 1, h: 1.2, dur: 1.6 })],
      [streak({ n: 2, gap: 5 }), burst({ sh: 'snow', n: 6, spd: 1, s: 3 })],
      [aura({ sh: 'snow', n: 6 }), wave({ st: 'hex', R: 1.2, follow: 1, dur: 0.8 })],
      [spk({ sh: 'crystal', pat: 'ring', n: 24, R: 5.5, h: 1.6, dur: 1.6 }), sig({ sh: 'snow', R: 6, ticks: 24 }), wave({ st: 'hex', R: 6, th: 5 }), rain({ sh: 'snow', n: 10, r: 5, s: 5, spin: 4, land: false })]
    ],
    stormcaller: [
      [fork({ n: 1, w: 1 }), burst({ sh: 'bolt', n: 3, spd: 1, s: 3 }), '@bolt'],
      [fork({ n: 3, w: 2 }), stamp({ sh: 'bolt', s: 9 })],
      [fork({ n: 1, w: 2 }), burst({ sh: 'orb', n: 3, spd: 0.8, s: 2 })],
      [fork({ sky: 1, n: 3, r: 1, w: 3 }), wave({ st: 'jag', R: 1.6, th: 4 })],
      [sig({ sh: 'bolt', R: 2.5, ticks: 14 }), burst({ sh: 'bolt', n: 6, spd: 1.8, s: 3 })],
      [wave({ st: 'dash', R: 0.9 }), '@orb'],
      [wave({ st: 'double', R: 1.6 }), fork({ sky: 1, n: 1, w: 2 }), '@orb'],
      [wave({ st: 'jag', R: 2.2 }), burst({ sh: 'bolt', n: 8, spd: 2.2, s: 4, ring: 1 })],
      [wave({ st: 'double', R: 2.5, th: 4, self: 1 }), stamp({ sh: 'bolt', s: 16, self: 1 })],
      [aura({ sh: 'bolt', n: 6 }), orbit({ sh: 'orb', n: 2, r: 0.9, s: 3, spd: 8 })],
      [vortex({ sh: 'bolt', n: 10, R: 4, inw: 1, self: 1, s: 4 }), wave({ st: 'dash', R: 4, self: 1 })],
      [wave({ st: 'hex', R: 1.3, follow: 1, dur: 0.9 }), aura({ sh: 'bolt', n: 4, rise: 6 })],
      [streak({ n: 2, gap: 4, w: 2 }), fork({ n: 2, w: 1 })],
      [col({ w: 3, H: 90, self: 1 }), sig({ sh: 'bolt', R: 1.2, self: 1, follow: 1 })],
      [sig({ sh: 'bolt', R: 5, ticks: 20 }), fork({ sky: 1, n: 10, r: 5, w: 3 }), wave({ st: 'jag', R: 5, th: 5 }), rays({ n: 14, len: 4 })]
    ],
    necromancer: [
      [spk({ sh: 'bone', pat: 'line', n: 2, h: 0.8 }), '@bone'],
      [cres({ R: 1.4, w: 0.3, sw: 2.4, pal: ['#e8ffe8', '#9aff8a', '#3a8a5a', '#0a2a1a'] }), burst({ sh: 'ghost', n: 3, spd: 1, s: 4, up: 1 })],
      [burst({ sh: 'bone', n: 10, spd: 2.2, s: 4, grav: 1 }), stamp({ sh: 'skull', s: 10 })],
      [vortex({ sh: 'ghost', n: 4, R: 0.9, s: 4 }), '@skull'],
      [sig({ sh: 'skull', R: 2.4, ticks: 10 }), burst({ sh: 'drop', n: 8, spd: 1.2, s: 2.5, c: '#9aff8a', up: 1.5 })],
      [vortex({ sh: 'bone', n: 10, R: 2, s: 4, spd: 7 }), wave({ st: 'dash', R: 2 })],
      [chain({ sh: 'drop', s: 3, pal: ['#ffd0d0', '#9aff8a', '#5a3a9a', '#1a0a2e'] }), aura({ sh: 'drop', n: 3, c: '#9aff8a' })],
      [spk({ sh: 'hand', n: 5, R: 1.2, h: 1 })],
      [sig({ sh: 'skull', R: 1.4 }), col({ w: 6, H: 70 }), burst({ sh: 'tombstone', n: 3, spd: 0.8, s: 4 })],
      [stamp({ sh: 'ghost', s: 18, self: 1 }), wave({ st: 'teeth', R: 3, self: 1 })],
      [spk({ sh: 'hand', pat: 'ring', n: 6, R: 1.3, h: 1.1, dur: 1.4 }), sig({ sh: 'skull', R: 1 })],
      [orbit({ sh: 'bone', n: 5, r: 1, s: 4 }), aura({ sh: 'skull', n: 3, s: 3 })],
      [burst({ sh: 'ghost', n: 4, spd: 0.8, s: 4, self: 1 }), streak({ n: 2, gap: 3, pal: VIO })],
      [col({ w: 6, H: 80, pal: VIO, self: 1 }), sig({ sh: 'hexagram', R: 1.4, self: 1, pal: VIO })],
      [sig({ sh: 'skull', R: 5, ticks: 18 }), spk({ sh: 'hand', pat: 'ring', n: 14, R: 4, h: 1.2, dur: 1.6 }), rain({ sh: 'ghost', n: 8, r: 4, s: 6, land: false }), col({ w: 10, H: 130 })]
    ],
    cleric: [
      [stamp({ sh: 'halo', s: 6 }), '@star'],
      [col({ w: 6, H: 80 }), spk({ sh: 'light', n: 4, R: 1.2, h: 0.6 })],
      [rain({ sh: 'lance', n: 1, s: 6, h: 100, lr: 0.6 })],
      [burst({ sh: 'star', n: 6, spd: 1.4, s: 3 }), '@star'],
      [wave({ st: 'petal', R: 2.2 }), burst({ sh: 'feather', n: 8, spd: 1.6, s: 3, ring: 1 })],
      [streak({ n: 1, w: 6 }), rays({ n: 8, len: 1.5 })],
      [sig({ sh: 'halo', R: 2.5, ticks: 12 }), vortex({ sh: 'feather', n: 4, R: 2, s: 4, spd: 2, dur: 1.5 })],
      [chain({ sh: 'halo', s: 3 }), stamp({ sh: 'cross', s: 8 })],
      [col({ w: 5, H: 70, pal: HEAL, self: 1 }), aura({ sh: 'heart', n: 5, c: ['#ffffff', '#c8ffd0'] })],
      [sig({ sh: 'lotus', R: 5, ticks: 14, self: 1, pal: HEAL }), aura({ sh: 'heart', n: 6, c: '#c8ffd0' })],
      [wave({ st: 'double', R: 3, self: 1 }), rays({ n: 12, len: 3, self: 1 })],
      [stamp({ sh: 'halo', s: 16, self: 1, follow: 1, dur: 0.8, z: 22 }), wave({ st: 'hex', R: 1.3, follow: 1 })],
      [burst({ sh: 'feather', n: 10, spd: 1.4, s: 3, self: 1 }), streak({ n: 1, w: 1 })],
      [aura({ sh: 'wing', n: 4, s: 4 }), orbit({ sh: 'halo', n: 2, r: 0.8, s: 4 })],
      [col({ w: 14, H: 160, pal: HEAL }), sig({ sh: 'lotus', R: 7, ticks: 24, pal: HEAL }), rain({ sh: 'feather', n: 14, r: 6, s: 5, land: false, spin: 3 }), wave({ st: 'petal', R: 7 })]
    ],
    druid: [
      [burst({ sh: 'leaf', n: 3, spd: 1, s: 3 }), '@thorn'],
      [spk({ sh: 'thorn', n: 3, R: 0.6, h: 0.8 }), '@orb'],
      [spk({ sh: 'thorn', pat: 'ring', n: 7, h: 1, dur: 1.2 }), sig({ sh: 'leaf', R: 1.6 })],
      [col({ w: 7, H: 100, pal: ['#ffffff', '#e0e8ff', '#9aa8e8', '#3a3a8a'] }), stamp({ sh: 'moon', s: 9, z: 40, pal: ['#ffffff', '#e0e8ff', '#9aa8e8', '#3a3a8a'] })],
      [sig({ sh: 'leaf', R: 2.5, ticks: 10 }), spk({ sh: 'thorn', n: 8, R: 2.2, h: 0.8, dur: 2 })],
      [cuts({ pat: 'claw', n: 3, L: 1.6, w: 3, pal: ['#fff0d0', '#d8a060', '#8a5a2a', '#3a2010'] }), stamp({ sh: 'paw', s: 9, pal: ['#fff0d0', '#d8a060', '#8a5a2a', '#3a2010'] })],
      [vortex({ sh: 'leaf', n: 8, R: 0.8, s: 3, spd: 9 }), '@tornado'],
      [rain({ sh: 'star', n: 4, r: 3, s: 5, pal: ['#ffffff', '#fff2a8', '#9a7aff', '#2a1a5a'], lst: 'petal' })],
      [vortex({ sh: 'leaf', n: 12, R: 2.5, s: 4, spd: 7, self: 1 }), wave({ st: 'dash', R: 2.5, self: 1 })],
      [aura({ sh: 'leaf', n: 6 }), sig({ sh: 'lotus', R: 4, self: 1, pal: HEAL })],
      [spk({ sh: 'rock', pat: 'ring', n: 6, R: 0.9, self: 1, h: 0.7, dur: 1.2 }), aura({ sh: 'leaf', n: 3, c: '#a06a3a' })],
      [orbit({ sh: 'leaf', n: 6, r: 1, s: 4 }), wave({ st: 'petal', R: 1.2, follow: 1 })],
      [streak({ n: 3, gap: 3 }), burst({ sh: 'paw', n: 3, spd: 0.8, s: 4 })],
      [burst({ sh: 'lotus', n: 6, spd: 2.5, s: 5, self: 1, up: 0.2 }), sig({ sh: 'leaf', R: 6, self: 1, pal: HEAL })],
      [spk({ sh: 'thorn', pat: 'ring', n: 20, R: 5.5, h: 1.5, dur: 1.6 }), sig({ sh: 'leaf', R: 6, ticks: 20 }), rain({ sh: 'leaf', n: 12, r: 5, s: 4, land: false, spin: 4 }), wave({ st: 'jag', R: 6, th: 5 })]
    ],
    assassin: [
      [cuts({ pat: 'stab', L: 1, w: 1.3 })],
      [cres({ R: 1.1, w: 0.18, sw: 1.6 }), burst({ sh: 'drop', n: 4, spd: 1, s: 2.5, grav: 1 })],
      [stamp({ sh: 'shuriken', s: 6, spin: 20 }), '@shuriken'],
      [streak({ n: 2, gap: 3, ghost: 2, pal: SMOKE }), cuts({ pat: 'x', L: 1.5, w: 2 })],
      [cuts({ pat: 'x', L: 2, w: 3.5 }), burst({ sh: 'drop', n: 6, spd: 1.4, s: 3, grav: 1 })],
      [cuts({ pat: 'rand', n: 2, L: 1, w: 1.2 })],
      [sig({ sh: 'drop', R: 2, ticks: 10 }), burst({ sh: 'smokecurl', n: 6, spd: 1.2, s: 5, up: 0.6, c: ['#5ab82a', '#2a6a1a'] })],
      [vortex({ sh: 'blade', n: 8, R: 1.8, s: 4, spd: 8 }), stamp({ sh: 'lotus', s: 10 })],
      [stamp({ sh: 'xslash', s: 10 }), wave({ st: 'ring', R: 0.9 })],
      [burst({ sh: 'smokecurl', n: 8, spd: 1.2, s: 5, self: 1, pal: SMOKE, c: ['#9a96a8', '#5a5668'] })],
      [aura({ sh: 'drop', n: 5, c: '#b8ff4a' }), col({ w: 3, H: 60, self: 1 })],
      [orbit({ sh: 'blade', n: 3, r: 0.9, s: 4, spd: 7 }), wave({ st: 'dash', R: 1, follow: 1 })],
      [streak({ n: 2, gap: 4, pal: SMOKE }), burst({ sh: 'smokecurl', n: 4, spd: 0.8, s: 4, pal: SMOKE })],
      [wave({ st: 'dash', R: 0.8 }), cuts({ pat: 'par', n: 2, L: 1.2, w: 1 })],
      [cuts({ pat: 'star', n: 12, L: 3, w: 2.5, stg: 0.015 }), rain({ sh: 'shuriken', n: 12, r: 5.5, s: 5, spin: 20, dl: 0.04 }), sig({ sh: 'xslash', R: 6, ticks: 16 })]
    ],
    shadowdancer: [
      [cres({ R: 1.25, w: 0.24, sw: 2.5 })],
      [cres({ n: 4, R: 1.5, sp: 1.571, w: 0.18, spin: 1, alt: 1 }), burst({ sh: 'moon', n: 2, spd: 1, s: 3 })],
      [wave({ st: 'dash', R: 0.9 }), '@moon'],
      [streak({ n: 4, gap: 2, ghost: 3 }), burst({ sh: 'moon', n: 3, spd: 1, s: 3 })],
      [cuts({ pat: 'vee', L: 1.4, w: 2.2 })],
      [stamp({ sh: 'moon', s: 18 }), wave({ st: 'petal', R: 2 })],
      [spk({ sh: 'light', pat: 'line', n: 4, h: 1 }), streak({ n: 1, w: 1, ghost: 1 })],
      [rain({ sh: 'blade', n: 4, r: 2, s: 6, ang: 0.6, lst: 'dash' })],
      [vortex({ sh: 'tendril', n: 6, R: 1.5, inw: 1, s: 5 }), sig({ sh: 'moon', R: 1.4 })],
      [burst({ sh: 'smokecurl', n: 8, spd: 1, s: 5, self: 1, c: ['#6a1aa8', '#c04aff'] }), wave({ st: 'ring', R: 1.4, self: 1 })],
      [col({ w: 3, H: 70 }), burst({ sh: 'star', n: 5, spd: 1.2, s: 3 })],
      [orbit({ sh: 'moon', n: 3, r: 1, s: 4 }), wave({ st: 'hex', R: 1.2, follow: 1 })],
      [cuts({ pat: 'x', L: 1.6, w: 2 }), burst({ sh: 'star', n: 6, spd: 1.4, s: 3 })],
      [aura({ sh: 'note', n: 6, s: 4 }), sig({ sh: 'moon', R: 1.2, self: 1, follow: 1 })],
      [cres({ n: 8, R: 3.5, sp: 0.785, w: 0.2, spin: 1, alt: 1, dl: 0.04 }), sig({ sh: 'moon', R: 3.5, ticks: 16 }), rain({ sh: 'moon', n: 8, r: 3, s: 6, spin: 3 }), vortex({ sh: 'blade', n: 10, R: 3, s: 5 })]
    ],
    ranger: [
      [burst({ sh: 'feather', n: 2, spd: 0.8, s: 3 }), '@arrow'],
      [wave({ st: 'jag', R: 0.9 }), streak({ n: 1, w: 2 }), '@arrow'],
      [rays({ n: 5, len: 0.9 }), '@arrow'],
      [rain({ sh: 'arrow', n: 6, r: 2.2, s: 6, ang: 0.15 })],
      [streak({ n: 1, w: 3 }), wave({ st: 'dash', R: 1 })],
      [wave({ st: 'double', R: 1.6 }), burst({ sh: 'feather', n: 6, spd: 1.6, s: 3 }), spk({ sh: 'rock', n: 4, R: 1.2, h: 0.6 })],
      [vortex({ sh: 'leaf', n: 6, R: 1, s: 3, spd: 9 }), '@tornado'],
      [cuts({ pat: 'par', n: 3, L: 1, w: 1.2 }), burst({ sh: 'feather', n: 2, spd: 0.6, s: 2 })],
      [sig({ sh: 'chainlink', R: 1.5, ticks: 8 }), spk({ sh: 'thorn', pat: 'ring', n: 5, R: 1, h: 0.8 })],
      [stamp({ sh: 'eye', s: 10, self: 1, z: 30 }), aura({ sh: 'feather', n: 4 })],
      [wave({ st: 'double', R: 1.3 }), stamp({ sh: 'star', s: 9 }), '@arrow'],
      [burst({ sh: 'leaf', n: 8, spd: 1.2, s: 3, self: 1 }), vortex({ sh: 'leaf', n: 8, R: 1.2, inw: 1, self: 1, s: 3 })],
      [streak({ n: 3, gap: 3 }), burst({ sh: 'feather', n: 6, spd: 1.2, s: 3 })],
      [aura({ sh: 'tornado', n: 3, s: 4 }), orbit({ sh: 'leaf', n: 4, r: 0.9, s: 3, spd: 9 })],
      [rain({ sh: 'arrow', n: 15, r: 5, s: 7, ang: 0.15, dl: 0.05 }), vortex({ sh: 'tornado', n: 4, R: 4, s: 7 }), sig({ sh: 'feather', R: 5, ticks: 20 }), wave({ st: 'jag', R: 5 })]
    ],
    marksman: [
      [burst({ sh: 'star', n: 3, spd: 0.8, s: 2 }), '@bullet'],
      [stamp({ sh: 'crosshair', s: 12 }), streak({ n: 1, w: 1 })],
      [burst({ sh: 'shard', n: 3, spd: 0.8, s: 2, c: '#ffe8a8' }), '@bullet'],
      [wave({ st: 'teeth', R: 1.6 }), burst({ sh: 'shard', n: 8, spd: 2, s: 3, grav: 1, c: ['#8a7a6a', '#ffb347'] }), stamp({ sh: 'orb', s: 10 })],
      [streak({ n: 1, w: 1 }), burst({ sh: 'star', n: 2, spd: 0.6, s: 2 })],
      [streak({ n: 1, w: 5, pal: ['#ffffff', '#bfe8ff', '#4a9aff', '#1a2a6a'] }), rays({ n: 8, len: 1.6, pal: ['#ffffff', '#bfe8ff', '#4a9aff', '#1a2a6a'] })],
      [spk({ sh: 'flame', n: 4, R: 0.9, h: 0.7, pal: FIRE }), '@fireball'],
      [stamp({ sh: 'star', s: 7 }), wave({ st: 'ring', R: 0.6 })],
      [wave({ st: 'double', R: 2, pal: ['#ffffff', '#ffffff', '#e8e8ff', '#8a8aa8'] }), rays({ n: 14, len: 2.6 }), stamp({ sh: 'orb', s: 14, c: '#ffffff' })],
      [stamp({ sh: 'crosshair', s: 10, self: 1, z: 30 }), sig({ sh: 'crosshair', R: 1.2, self: 1, follow: 1 })],
      [wave({ st: 'jag', R: 2, self: 1 }), burst({ sh: 'shard', n: 6, spd: 2, s: 3, self: 1 })],
      [burst({ sh: 'smokecurl', n: 10, spd: 1.4, s: 6, c: ['#c8c4d0', '#8a8496'], up: 0.3 }), sig({ sh: 'orb', R: 2.5, pal: SMOKE })],
      [streak({ n: 2, gap: 4, pal: SMOKE }), burst({ sh: 'shard', n: 4, spd: 0.8, s: 2, c: '#8a7a6a', self: 1 })],
      [orbit({ sh: 'crosshair', n: 1, r: 0.01, s: 6, spd: 0 }), aura({ sh: 'star', n: 4 })],
      [sig({ sh: 'crosshair', R: 4, ticks: 24, pal: ['#ffffff', '#ff6a6a', '#ff2a2a', '#5a0a0a'] }), col({ w: 16, H: 200, delay: 0.25, pal: ['#ffffff', '#bfe8ff', '#4a9aff', '#1a2a6a'] }), wave({ st: 'teeth', R: 4, th: 5, delay: 0.3 }), rays({ n: 18, len: 4.5 })]
    ]
  };

  // ---------- generated designs for every other class: class palette + signature shapes, unique per skill ----------
  const STY = {
    engineer: { sh: ['gear', 'drone', 'rocket', 'bolt'], spk: 'rock', w: ['teeth', 'hex', 'dash'] },
    monk: { sh: ['fist', 'chi', 'lotus', 'orb'], spk: 'light', w: ['petal', 'double', 'ring'] },
    spellblade: { sh: ['rune', 'blade', 'hexagram', 'star'], spk: 'crystal', w: ['hex', 'dash', 'double'] },
    beastmaster: { sh: ['paw', 'claw', 'fang', 'spear'], spk: 'thorn', w: ['jag', 'teeth', 'ring'], pal: ['#fff0d0', '#ffb860', '#a8602a', '#3a1e0a'] },
    chronomancer: { sh: ['clock', 'hourglass', 'shard', 'rune'], spk: 'crystal', w: ['teeth', 'dash', 'double'] },
    warlock: { sh: ['demon', 'eye', 'flame', 'skull'], spk: 'flame', w: ['jag', 'petal', 'hex'] },
    starhunter: { sh: ['star', 'comet', 'moon', 'orb'], spk: 'light', w: ['petal', 'dash', 'double'] },
    darkknight: { sh: ['blade', 'skull', 'eye', 'hex'], spk: 'crystal', w: ['jag', 'hex', 'teeth'] },
    lightbringer: { sh: ['shard', 'halo', 'star', 'orb'], spk: 'light', w: ['double', 'petal', 'hex'] },
    shadowmancer: { sh: ['tendril', 'maw', 'lure', 'eye'], spk: 'hand', w: ['dash', 'jag', 'ring'] },
    seraph: { sh: ['wing', 'halo', 'feather', 'spear'], spk: 'light', w: ['petal', 'hex', 'double'] },
    reaper: { sh: ['ghost', 'skull', 'tombstone', 'moon'], spk: 'bone', w: ['teeth', 'dash', 'jag'] },
    demon: { sh: ['demon', 'claw', 'fang', 'flame'], spk: 'flame', w: ['jag', 'teeth', 'double'] },
    deity: { sh: ['halo', 'eye', 'lotus', 'star'], spk: 'light', w: ['petal', 'double', 'hex'] },
    jester: { sh: ['card', 'balloon', 'note', 'pie'], spk: 'flame', w: ['petal', 'dash', 'teeth'] },
    loki: { sh: ['lkmask', 'lkserpent', 'lkknife', 'lkrune'], spk: 'crystal', w: ['jag', 'hex', 'petal'] }
  };
  const genRecipe = (cls, sk, i) => {
    const st = STY[cls.id] || { sh: ['star', 'orb', 'rune', 'shard'], spk: 'light', w: ['ring', 'dash', 'jag'] };
    const A = st.sh[i % 4], B = st.sh[(i + 1) % 4], C = st.sh[(i + 2) % 4], W = st.w[i % 3], W2 = st.w[(i + 1) % 3]; const v = i % 4; const r = sk.r || 1.6;
    let L;
    switch (sk.arch) {
      case 'slash': L = [cres({ R: r * (0.75 + v * 0.06), w: [0.2, 0.32, 0.45, 0.26][v], sw: 1.8 + v * 0.3, jag: v === 2 }), [stamp({ sh: A, s: 7 }), burst({ sh: A, n: 4, spd: 1.2, s: 3 }), cuts({ pat: 'x', L: 1.3, w: 1.6 }), wave({ st: W, R: 0.9 })][v]]; break;
      case 'spin': L = [cres({ n: 2 + v % 3, R: r * 0.9, sp: 6.283 / (2 + v % 3), w: 0.25, spin: 1, alt: 1, jag: v % 2 === 1 }), vortex({ sh: A, n: 6 + v, R: r * 0.8, s: 4, spd: 7 })]; break;
      case 'thrust': L = [spk({ sh: st.spk, pat: 'line', n: 3 + v, h: 0.9 + v * 0.1 }), [streak({ n: 3 }), stamp({ sh: A, s: 9, aim: 1 }), burst({ sh: A, n: 5, spd: 1.4, s: 3 }), wave({ st: W, R: 1 })][v]]; break;
      case 'beam': L = [streak({ n: 1 + v % 2 * 2, w: 3 + v, gap: 3 }), [rays({ n: 8, len: 1.6 }), stamp({ sh: A, s: 10 }), burst({ sh: A, n: 6, spd: 1.6, s: 3 }), wave({ st: W, R: 1.2 })][v]]; break;
      case 'proj': L = [[burst({ sh: A, n: 4, spd: 1, s: 3 }), wave({ st: W, R: 0.9 }), stamp({ sh: A, s: 8, spin: 6 }), spk({ sh: st.spk, n: 3, R: 0.6, h: 0.7 })][v], '@' + B]; break;
      case 'nova': L = [wave({ st: W, R: r, th: 3 + v % 2 }), [burst({ sh: A, n: 8, spd: r, s: 4, ring: 1 }), spk({ sh: st.spk, pat: 'ring', n: 8, R: r * 0.85, h: 0.9 }), vortex({ sh: A, n: 8, R: r, s: 4 }), stamp({ sh: A, s: 14 })][v]]; break;
      case 'ground': L = [[rain({ sh: A, n: Math.min(6, sk.n || 1), r: r, s: 8, lst: W }), col({ w: 6 + v, H: 90 }), rain({ sh: B, n: 1, s: 14, lr: r, lst: W }), spk({ sh: st.spk, n: 7, R: r, h: 1 })][v], sig({ sh: C, R: r * 0.9 })]; break;
      case 'zone': L = [sig({ sh: A, R: r, ticks: 8 + v * 2 }), [spk({ sh: st.spk, n: 7, R: r, h: 0.8, dur: 2 }), vortex({ sh: B, n: 6, R: r * 0.8, s: 4, spd: 2, dur: 2 }), rain({ sh: B, n: 6, r: r, s: 4, land: false }), burst({ sh: B, n: 8, spd: r * 0.6, s: 4, up: 1.4, dur: 1.4 })][v]]; break;
      case 'chain': L = [chain({ sh: A, s: 3 }), [stamp({ sh: B, s: 8 }), wave({ st: W, R: 0.8 }), burst({ sh: B, n: 4, spd: 1, s: 3 }), fork({ n: 1, w: 1 })][v]]; break;
      case 'dash': L = [streak({ n: 2 + v, gap: 3, ghost: 2 }), [stamp({ sh: A, s: 10 }), wave({ st: W, R: 1.2 }), burst({ sh: A, n: 5, spd: 1.2, s: 3 }), cuts({ pat: 'one', L: 1.8 })][v]]; break;
      case 'leap': L = [wave({ st: W, R: r, th: 4 }), spk({ sh: st.spk, pat: 'ring', n: 7, R: r * 0.8, h: 0.8 }), stamp({ sh: A, s: 10 })]; break;
      case 'barrage': L = [[cuts({ pat: 'rand', n: 2, L: 1.1, w: 1.5 }), burst({ sh: A, n: 3, spd: 0.8, s: 3 }), stamp({ sh: A, s: 6 }), cuts({ pat: 'vee', L: 1.2, w: 1.8 })][v]]; break;
      case 'summon': case 'turret': L = [sig({ sh: A, R: 1.3 }), col({ w: 5, H: 70 }), burst({ sh: B, n: 4, spd: 0.9, s: 4 })]; break;
      case 'trap': L = [sig({ sh: A, R: r, ticks: 6 }), spk({ sh: st.spk, pat: 'ring', n: 5, R: r * 0.7, h: 0.7 })]; break;
      case 'buff': L = [aura({ sh: A, n: 5 + v }), [orbit({ sh: B, n: 3, r: 1, s: 4 }), sig({ sh: B, R: 1.2, self: 1, follow: 1 }), col({ w: 4, H: 70, self: 1 }), wave({ st: W, R: 1.2, follow: 1 })][v]]; break;
      case 'shield': L = [stamp({ sh: A, s: 16, self: 1, follow: 1, dur: 0.8 }), wave({ st: 'hex', R: 1.3, follow: 1 })]; break;
      case 'heal': L = [col({ w: 5 + v, H: 70, pal: HEAL, self: 1 }), aura({ sh: [A, 'heart', B, 'cross'][v], n: 5, c: '#c8ffd0' })]; break;
      case 'blink': L = [burst({ sh: A, n: 5, spd: 1, s: 3 }), streak({ n: 1, w: 1, ghost: 1 })]; break;
      case 'stealth': L = [burst({ sh: 'smokecurl', n: 8, spd: 1, s: 5, self: 1 }), wave({ st: W, R: 1.2, self: 1 })]; break;
      default: L = [burst({ sh: A, n: 6, spd: 1.4, s: 4 })];
    }
    const ACC = [() => burst({ sh: A, n: 3, spd: 0.8, s: 3 }), () => stamp({ sh: B, s: 6 }), () => wave({ st: 'dash', R: 0.7 }), () => rays({ n: 6, len: 1.2 }), () => vortex({ sh: C, n: 4, R: 0.8, s: 3 }),
      () => spk({ sh: st.spk, n: 3, R: 0.7, h: 0.6 }), () => burst({ sh: B, n: 5, spd: 1.2, s: 3, ring: 1 }), () => stamp({ sh: C, s: 8, spin: 6 }), () => wave({ st: 'petal', R: 1 }), () => cuts({ pat: 'x', L: 0.9, w: 1.2 }),
      () => aura({ sh: A, n: 3 }), () => burst({ sh: C, n: 4, spd: 0.6, s: 3, up: 1.4 }), () => stamp({ sh: A, s: 12, delay: 0.08 }), () => wave({ st: 'teeth', R: 0.8 }), () => rays({ n: 10, len: 2 })];
    L.push(ACC[i % 15]());
    if (sk.ult) L = [sig({ sh: A, R: Math.max(3, r + 1), ticks: 20 }), rain({ sh: B, n: 9, r: Math.max(3, r), s: 9, dl: 0.08, lst: W }), col({ w: 12, H: 140 }), wave({ st: W2, R: Math.max(3, r + 1), th: 5 })];
    return L;
  };
  const HAND = {}; for (const k of Object.keys(T6)) HAND[k] = T6[k];
  for (const k of Object.keys(PAL)) if (!STY[k]) STY[k] = { sh: ({ blademaster: ['sword', 'blade', 'xslash', 'moon'], guardian: ['shield', 'hammer', 'hex', 'chainlink'], berserker: ['axe', 'claw', 'fang', 'drop'], paladin: ['cross', 'hammer', 'halo', 'wing'], pyromancer: ['flame', 'fireball', 'comet', 'feather'], cryomancer: ['snow', 'shard', 'hex', 'lance'], stormcaller: ['bolt', 'orb', 'star', 'hex'], necromancer: ['skull', 'bone', 'ghost', 'hand'], cleric: ['halo', 'feather', 'cross', 'heart'], druid: ['leaf', 'thorn', 'paw', 'moon'], assassin: ['xslash', 'shuriken', 'drop', 'blade'], shadowdancer: ['moon', 'blade', 'star', 'note'], ranger: ['feather', 'arrow', 'leaf', 'tornado'], marksman: ['crosshair', 'bullet', 'shard', 'star'] })[k] || ['star', 'orb', 'rune', 'shard'], spk: ({ guardian: 'rock', berserker: 'blood', pyromancer: 'flame', cryomancer: 'crystal', necromancer: 'bone', druid: 'thorn', paladin: 'light', cleric: 'light' })[k] || 'ice', w: ['jag', 'dash', 'double'] };
  for (const cls of D.CLASSES) { const st = STY[cls.id]; if (!PAL[cls.id]) PAL[cls.id] = (st && st.pal) || D.ELEM[cls.elem].pal; const hand = HAND[cls.id];
    T6[cls.id] = cls.skills.map((sk, i) => (hand && sk.src != null && hand[sk.src]) ? hand[sk.src] : genRecipe(cls, sk, i));
  }
  // split recipes / projectile shapes
  const REC = {}, PROJ = {};
  for (const [cls, rows] of Object.entries(T6)) { REC[cls] = rows.map(r => r.filter(f => typeof f === 'function')); PROJ[cls] = rows.map(r => { const s = r.find(f => typeof f === 'string'); return s ? s.slice(1) : null; }); }
  G.FX6 = { REC, PROJ, PAL };


  // ---------- skill icons derived from each skill's own effect design ----------
  const SPKI = { ice: 'shard', crystal: 'hex', rock: 'fist', bone: 'bone', thorn: 'thorn', flame: 'flame', hand: 'hand', light: 'lance', blood: 'drop' };
  const iconShapes = (cls, i) => { const out = []; const pj = PROJ[cls][i]; if (pj) out.push(pj);
    for (const f of REC[cls][i]) { const m = f.meta || {}; let sh = null;
      if (m.k === 'cres') sh = 'blade'; else if (m.k === 'cuts') sh = m.pat === 'claw' || m.pat === 'vee' ? 'claw' : 'xslash'; else if (m.k === 'spk') sh = SPKI[m.sh] || 'shard'; else if (m.k === 'fork') sh = 'bolt'; else if (m.k === 'streak') sh = 'wing'; else if (m.k === 'col') sh = 'lance'; else if (m.k === 'wave') sh = { hex: 'hex', petal: 'lotus', teeth: 'gear', jag: 'star5', dash: 'halo', double: 'halo' }[m.st] || 'halo'; else if (m.k === 'chain') sh = m.sh || 'chainlink'; else if (m.k === 'rays') sh = 'star5'; else sh = m.sh;
      if (sh && !out.includes(sh)) out.push(sh); }
    return out.length ? out : ['star']; };
  const SLOTC = i => i === 14 ? ['#ffd84a', '#8a5a10'] : i >= 12 ? ['#4ad6c8', '#1a4a46'] : i >= 8 ? ['#b8c0d8', '#3a4058'] : ['#d09a5a', '#5a3a1a'];
  const icCache = new Map();
  const iconFor = (s) => { const k = s.id + '|' + (s.variant || 0); if (icCache.has(k)) return icCache.get(k); const N = 26; const [cv, x] = G.SPR.mk(N, N); const pal = PAL[s.cls]; const sh = PICK[s.cls][s.idx];
    const g = x.createRadialGradient(N / 2, N / 2, 1, N / 2, N / 2, N * 0.72); g.addColorStop(0, pal[2]); g.addColorStop(0.6, pal[3]); g.addColorStop(1, '#07050c'); x.fillStyle = g; x.fillRect(0, 0, N, N);
    // background motif: faint ring pattern unique by index
    x.strokeStyle = pal[1]; x.globalAlpha = 0.25; x.lineWidth = 1; for (let r = 0; r < 1 + (s.idx % 3); r++) { x.beginPath(); x.arc(N / 2, N / 2, 6 + r * 4, s.idx * 0.4, s.idx * 0.4 + 4.4); x.stroke(); } x.globalAlpha = 1;
    const main = sh[0], sub = sh[1];
    x.save(); x.translate(N / 2 - (sub ? 1 : 0), N / 2 - (sub ? 1 : 0)); x.rotate(['sword', 'lance', 'arrow', 'bullet', 'spear', 'rocket', 'blade', 'shard', 'bone', 'lkknife'].includes(main) ? -0.78 : 0);
    x.globalAlpha = 0.55; FX.drawShape(x, main, 9.5, pal[1], pal[3], 0.4); x.globalAlpha = 1; FX.drawShape(x, main, 7.8, pal[0], pal[2], 0.4); x.restore();
    if (sub) { x.save(); x.translate(N - 7, N - 7); x.fillStyle = '#0a0810'; x.globalAlpha = 0.7; x.beginPath(); x.arc(0, 0, 5, 0, 7); x.fill(); x.globalAlpha = 1; FX.drawShape(x, sub, 3.6, pal[1], pal[3], 0.4); x.restore(); }
    const [c1, c2] = SLOTC(s.idx); x.fillStyle = c2; x.fillRect(0, 0, N, 1); x.fillRect(0, N - 1, N, 1); x.fillRect(0, 0, 1, N); x.fillRect(N - 1, 0, 1, N); x.fillStyle = c1; x.fillRect(1, 1, N - 2, 1); x.fillRect(1, 1, 1, N - 2);
    if (s.ult) { x.fillStyle = '#ffd84a'; for (let i = 0; i < N; i += 4) { x.fillRect(i, 0, 2, 1); x.fillRect(i, N - 1, 2, 1); } }
    if (s.variant) { const vc = ['', '#4ad6c8', '#ff7a3a', '#ffe04a'][s.variant]; x.fillStyle = '#120e18'; x.fillRect(1, N - 8, 7, 7); x.fillStyle = vc; x.fillRect(2, N - 7, 5, 5); }
    const url = cv.toDataURL(); icCache.set(k, url); return url; };
  const POOL = ['star', 'orb', 'rune', 'shard', 'halo', 'hex', 'lotus', 'eye', 'moon', 'drop', 'feather', 'bolt', 'flame', 'leaf', 'snow', 'cross', 'skull', 'wing', 'fang', 'gear'];
  const PICK = {}; for (const cls of Object.keys(REC)) { const used = new Set(); PICK[cls] = REC[cls].map((_, i) => { const c = iconShapes(cls, i); const cands = [];
      for (const a of c) for (const b2 of c.concat(POOL)) if (a !== b2) cands.push([a, b2]); for (const a of POOL) for (const b2 of POOL) if (a !== b2) cands.push([a, b2]);
      const pk = cands.find(([a, b2]) => !used.has(a + '+' + b2)) || [c[0], null]; used.add(pk[0] + '+' + pk[1]); return pk; }); }
  G.FX6.iconShapes = (cls, i) => PICK[cls][i];

  const hookIcons = () => { const UI = G.UI; if (!UI || !UI.skillIcon || UI._fx6ic) return; UI._fx6ic = true; const si0 = UI.skillIcon; UI.skillIcon = (s) => (s && s.id && REC[s.cls] && PICK[s.cls] && PICK[s.cls][s.idx]) ? iconFor(s) : si0(s); };
  document.addEventListener('DOMContentLoaded', hookIcons); setTimeout(hookIcons, 0);
  // ---------- only the skill's own design is drawn: generic engine layers from these skills are dropped ----------
  V._mine = 0; V._only6 = 0;
  const KEEP = { tele: 1, vig: 1 };
  const p6 = V.p; V.p = function (...a) { if (V._only6 && !V._mine) return; return p6.apply(this, a); };
  const mine = (fn) => { V._mine++; try { return fn(); } finally { V._mine--; } };
  const only = (on, fn) => { if (!on) return fn(); V._only6++; try { return fn(); } finally { V._only6--; } };
  const install6 = () => { const E = G.E; if (!E || !E.exec || E._fx6) return; E._fx6 = true;
    const push6 = V.fx.push; V.fx.push = function (o) { if (V._only6 && o && o.k === 'tele') o.soft = true; if (V._only6 && !V._mine && o && !KEEP[o.k]) return this.length; return push6.call(this, o); };
    const c0 = E.exec; E.exec = (u, s, A) => { const on = !!(s && REC[s.cls]); if (!on) return c0(u, s, A);
      const l0 = E.later; E.later = (t, fn) => l0(t, () => only(true, fn)); try { return only(true, () => c0(u, s, A)); } finally { E.later = l0; } };
    const h0 = E.hit; E.hit = (src, t, pow, s, o) => only(!!(s && REC[s.cls]), () => h0(src, t, pow, s, o)); };
  document.addEventListener('DOMContentLoaded', install6); setTimeout(install6, 0);
  // quality level → density / size; ต่ำ = core layer only, อลังการ = extra class flourish
  const QL = () => [0.6, 1, 1.45][V.level ?? 1];
  V.X.f6glow = { ground: true, draw(x, cam, f, k) { const [sx, sy] = cam.w2s(f.x, f.y); const r = f.R * TS() * (0.6 + 0.4 * eo(k)); const g = x.createRadialGradient(sx, sy, 0, sx, sy, r); g.addColorStop(0, f.pal[1]); g.addColorStop(1, 'rgba(0,0,0,0)'); x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.45 * (1 - k); x.translate(sx, sy); x.scale(1, 0.5); x.translate(-sx, -sy); x.fillStyle = g; x.beginPath(); x.arc(sx, sy, r, 0, 7); x.fill(); x.restore(); } };
  const SYM = { blademaster: 'sword', guardian: 'shield', berserker: 'axe', paladin: 'cross', pyromancer: 'flame', cryomancer: 'snow', stormcaller: 'bolt', necromancer: 'skull', cleric: 'halo', druid: 'leaf', assassin: 'xslash', shadowdancer: 'moon', ranger: 'feather', marksman: 'crosshair' };
  for (const cid of Object.keys(STY)) SYM[cid] = STY[cid].sh[0];
  const flourish = (c, cls) => { const p = PAL[cls]; add({ k: 'f6glow', x: c.x, y: c.y, R: (c.r || 1.6) * 1.3, pal: p, dur: 0.7, ground: true });
    const n = c.ult ? 12 : 5, items = []; for (let i = 0; i < n; i++) items.push({ a: i / n * 6.283 + R(-0.2, 0.2), v: (c.r || 1.6) * R(0.5, 0.9), r: R(0, 6.28), sp: R(-4, 4), s: R(2.5, 3.8), up: R(0.8, 1.6), c: i % 2 ? p[0] : p[1] });
    add({ k: 'f6burst', x: c.x, y: c.y, items, sh: SYM[cls] || 'star', pal: p, dur: 0.9, z: 8, grav: 0 }); };
  // projectile look: class palette trail + glow + designed shape (no generic orb texture)
  const dp6 = V.drawProj; V.drawProj = (ctx, cam, p) => { const s = p.s; if (!(s && REC[s.cls] && p.shape)) return dp6(ctx, cam, p); const pal = PAL[s.cls]; const [sx, sy] = cam.w2s(p.x, p.y); const z = p.z ?? 12; const sz = (p.size || 3) * (p.scale || 1) * (V.level === 2 ? 1.15 : 1);
    ctx.globalCompositeOperation = 'lighter'; if (p.hist && p.hist.length >= 4 && V.level > 0) { const h = p.hist, n = h.length / 2; ctx.lineCap = 'round'; for (let i = 1; i < n; i++) { const [ax, ay] = cam.w2s(h[(i - 1) * 2], h[(i - 1) * 2 + 1]), [bx, by] = cam.w2s(h[i * 2], h[i * 2 + 1]); const q = i / n; ctx.strokeStyle = pal[1]; ctx.globalAlpha = q * 0.6; ctx.lineWidth = Math.max(1, sz * q); ctx.beginPath(); ctx.moveTo(ax, ay - z); ctx.lineTo(bx, by - z); ctx.stroke(); } }
    ctx.globalAlpha = V.level === 0 ? 0.2 : 0.32; ctx.fillStyle = pal[2]; ctx.beginPath(); ctx.arc(sx, sy - z, sz * 2.2, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(sx, sy - z); const spin = { shuriken: 1, shield: 1, axe: 1, star: 1, hammer: 1, gear: 1, card: 1, lkknife: 0 }; ctx.rotate(spin[p.shape] ? performance.now() / 60 : Math.atan2(p.vy, p.vx)); FX.drawShape(ctx, p.shape, sz * 1.9, pal[0], pal[3], performance.now() / 1000); ctx.restore(); ctx.globalCompositeOperation = 'source-over'; };
  G.FX6.mini = (owner, x, y, ang, big) => { const cls = owner && owner.cls; if (!REC[cls] || !G.E.vis(x, y)) return; const p = PAL[cls]; mine(() => { const items = []; for (let i = 0; i < (big ? 6 : 3); i++) items.push({ a: R(0, 6.28), v: R(0.4, big ? 1.4 : 0.8), r: R(0, 6.28), sp: R(-4, 4), s: big ? 3.5 : 2.5, up: R(0.2, 0.8), c: p[i % 2] }); add({ k: 'f6burst', x, y, items, sh: SYM[cls] || 'star', pal: p, dur: 0.4, z: 10, grav: 0 }); }); };
  // ---------- ability detail layer: every mechanic of the skill gets its own visual cue ----------
  const fly = (x1, y1, x2, y2, sh, col, n, s) => { for (let i = 0; i < n; i++) V.fly(x1 + R(-0.3, 0.3), y1 + R(-0.3, 0.3), x2, y2, sh, col, s, 0.45 + i * 0.06, { arc: R(10, 26), spin: 6, z: 14 }); };
  const DET = {
    st: (c, p) => { V.orbit({ x: c.x, y: c.y }, 3, 0.45, 'star', '#ffe04a', 3, 1.1, 7, { z: 30 }); },
    fz: (c, p) => { spk({ sh: 'crystal', pat: 'ring', n: 6, R: 0.55, h: 0.8, dur: 1.4, pal: ICE })(c); stamp({ sh: 'snow', s: 6, z: 32, pal: ICE, dur: 0.9 })(c); },
    rt: (c, p) => { spk({ sh: 'thorn', pat: 'ring', n: 6, R: 0.5, h: 0.7, dur: 1.4 })(c); burst({ sh: 'chainlink', n: 4, spd: 0.4, s: 3, up: 0.1, dur: 1 })(c); },
    sl: (c, p) => { wave({ st: 'double', R: 1.1, raw: 1, dur: 0.9, delay: 0.1 })(c); wave({ st: 'dash', R: 0.7, raw: 1, dur: 0.9, delay: 0.3 })(c); },
    kb: (c, p) => { const n = 5, items = []; for (let i = 0; i < n; i++) items.push({ a: c.ang + R(-0.5, 0.5), v: R(1.4, 2.2), r: R(0, 6.28), sp: R(-8, 8), s: R(2, 3), up: R(0.4, 0.9), c: i % 2 ? '#b0a08a' : p[1] }); add({ k: 'f6burst', x: c.x, y: c.y, items, sh: 'shard', pal: p, dur: 0.5, z: 6, grav: 1 }); },
    pl: (c, p) => { vortex({ sh: 'chainlink', n: 6, R: 1.8, inw: 1, s: 3, raw: 1 })(c); },
    sil: (c, p) => { stamp({ sh: 'hexagram', s: 7, z: 34, dur: 0.9 })(c); stamp({ sh: 'xslash', s: 5, z: 34, delay: 0.15, dur: 0.75 })(c); },
    ls: (c, p) => { fly(c.x, c.y, c.sx, c.sy, 'drop', '#ff4d4d', 4, 3); },
    pi: (c, p) => { streak({ n: 1, w: 1.5, dur: 0.25 })(c); },
    multi: (c, p) => { burst({ sh: 'star', n: 3, spd: 0.6, s: 2, up: 0.4, dur: 0.35 })(c); },
    // buffs
    b_atk: (c, p) => { aura({ sh: 'sword', n: 4, c: '#ff6a4a', rise: 36 })(c); col({ w: 4, H: 60, self: 1, pal: ['#ffd0c0', '#ff6a4a', '#a8201e', '#400808'] })(c); },
    b_aspd: (c, p) => { aura({ sh: 'wing', n: 4, c: '#ffffff', rise: 18 })(c); orbit({ sh: 'feather', n: 3, r: 0.9, s: 3, spd: 10 })(c); },
    b_crit: (c, p) => { stamp({ sh: 'eye', s: 8, self: 1, follow: 1, z: 40, dur: 1 })(c); aura({ sh: 'star', n: 3, c: '#ffe04a' })(c); },
    b_def: (c, p) => { wave({ st: 'hex', R: 1.1, follow: 1, raw: 1, dur: 1 })(c); stamp({ sh: 'shield', s: 9, self: 1, follow: 1, z: 36, dur: 0.9 })(c); },
    b_spd: (c, p) => { aura({ sh: 'tornado', n: 3, rise: 6 })(c); streak({ n: 3, gap: 3, w: 1, dur: 0.5 })(Object.assign({}, c, { x: c.sx - Math.cos(c.ang) * 1.5, y: c.sy - Math.sin(c.ang) * 1.5 })); },
    b_ls: (c, p) => { orbit({ sh: 'drop', n: 4, r: 0.9, s: 3, pal: ['#ffd0d0', '#ff4d4d', '#b0101e', '#5a0010'] })(c); },
    b_cdr: (c, p) => { orbit({ sh: 'clock', n: 2, r: 1, s: 4 })(c); wave({ st: 'teeth', R: 1.2, follow: 1, raw: 1, dur: 0.8 })(c); },
    shield: (c, p) => { stamp({ sh: 'orb', s: 16, self: 1, follow: 1, z: 14, dur: 1.2, c: p[1] })(c); wave({ st: 'hex', R: 1, follow: 1, raw: 1 })(c); },
    heal: (c, p) => { aura({ sh: 'cross', n: 4, c: '#8aff8a', rise: 40 })(c); aura({ sh: 'heart', n: 2, c: '#ffffff', rise: 30 })(c); },
    blink: (c, p) => { burst({ sh: 'star', n: 4, spd: 0.8, s: 2.5, self: 1 })(c); },
    stealth: (c, p) => { burst({ sh: 'smokecurl', n: 4, spd: 0.6, s: 4, self: 1, pal: SMOKE, c: ['#9a96a8', '#5a5668'] })(c); },
    ult: (c, p) => { V.vignette && V.vignette('#05030a', 0.6); wave({ st: 'double', R: Math.max(3, c.r + 1.5), th: 5, delay: 0.1 })(c); rays({ n: 18, len: 4.2 })(c); }
  };
  const motes = (c, cls) => { const p = c.pal; const n = V.level === 2 ? 6 : 3, items = []; for (let i = 0; i < n; i++) items.push({ a: R(0, 6.283), v: R(0.2, 0.7), r: R(0, 6.28), sp: R(-1.5, 1.5), s: R(1.4, 2.2), up: R(1, 2.2), c: i % 2 ? p[0] : p[1] }); add({ k: 'f6burst', x: c.x, y: c.y, items, sh: 'orb', pal: p, dur: 1.3, z: 10, grav: 0 }); };
  const detail = (s, c) => { const p = c.pal; const run = (k) => { try { DET[k](c, p); } catch (e) { } };
    for (const k of ['st', 'fz', 'rt', 'sl', 'kb', 'pl', 'sil']) if (s.cc && s.cc[k]) run(k);
    if (s.ls) run('ls'); if (s.pi) run('pi'); if (s.n > 2 && s.arch !== 'summon') run('multi');
    if (s.arch === 'buff') run('b_' + (s.buff || 'atk')); else if (s.arch === 'shield' || s.arch === 'heal' || s.arch === 'blink' || s.arch === 'stealth') run(s.arch);
    if (s.ult && c.u && c.u._f6ult !== (s.castId || s.id + W6t())) { c.u._f6ult = s.castId || s.id + W6t(); run('ult'); } };
  const W6t = () => Math.floor((G.W.time || 0) * 2);
  // ---------- delivery staging: HOW each skill manifests (from the ground, from the sky, conjured in the air, flanking …) ----------
  V.X.f6halo = { draw(x, cam, f, k) { if (f.t < f.delay) return; const kk = (f.t - f.delay) / (f.dur - f.delay); const u = f.follow; const [sx, sy] = cam.w2s(u ? u.x : f.x, u ? u.y : f.y); const T = TS(); const z = U.lerp(f.z0, f.z1, eo(kk)); const r = f.R * T * (0.6 + 0.4 * eo(Math.min(1, kk * 2)));
    const al = (kk < 0.15 ? kk / 0.15 : kk > 0.75 ? (1 - kk) / 0.25 : 1); glow(x, sx, sy - z, r * 1.2, f.pal[1], al * 0.4, 0.5);
    x.save(); x.translate(sx, sy - z); x.scale(1, 0.4); x.globalAlpha = al; x.strokeStyle = f.pal[1]; x.lineWidth = 2; x.beginPath(); x.arc(0, 0, r, 0, 7); x.stroke(); x.rotate(f.t * 2); x.setLineDash([3, 4]); x.strokeStyle = f.pal[0]; x.lineWidth = 1; x.beginPath(); x.arc(0, 0, r * 0.78, 0, 7); x.stroke(); x.setLineDash([]);
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; x.save(); x.translate(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9); x.scale(1, 2.5); draw(x, f.sh, 2.4, f.pal[0], f.pal[2], f.t); x.restore(); } x.restore(); } };
  V.X.f6rift = { draw(x, cam, f, k) { const [sx, sy] = cam.w2s(f.x, f.y); const T = TS(); const o = k < 0.2 ? k / 0.2 : k > 0.7 ? (1 - k) / 0.3 : 1; const h = f.H * T * o, w = f.W * T * o; glow(x, sx, sy - h * 0.5, Math.max(w, h * 0.5), f.pal[1], o * 0.5, 1.6);
    x.save(); x.translate(sx, sy - h * 0.5); x.globalAlpha = o; x.fillStyle = f.pal[3]; x.beginPath(); x.ellipse(0, 0, w * 0.5, h * 0.5, 0, 0, 7); x.fill(); x.strokeStyle = f.pal[1]; x.lineWidth = 2; x.stroke(); x.strokeStyle = f.pal[0]; x.lineWidth = 1; x.beginPath(); x.ellipse(0, 0, w * 0.32, h * 0.42, 0, 0, 7); x.stroke(); x.restore(); } };
  const off = (c, d, a) => ({ x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d });
  const sym = cls => SYM[cls] || 'star';
  const DLV = {
    // impact-side deliveries
    erupt: (c, cls) => { V.cracks && V.cracks(c.x, c.y, (c.r || 1.6) * 1.1, 7, c.pal[1], 0.9); spk({ sh: (STY[cls] || {}).spk || 'ice', pat: 'ring', n: 7, R: (c.r || 1.6) * 0.55, h: 1.25, dur: 0.9 })(c); burst({ sh: 'shard', n: 6, spd: 1, s: 2.5, up: 1.6, grav: 1.2, c: ['#9a8a7a', c.pal[1]] })(c); },
    skyfall: (c, cls) => { add({ k: 'f6halo', x: c.x, y: c.y, R: Math.min(2.2, c.r || 1.6), z0: 95, z1: 110, sh: sym(cls), pal: c.pal, dur: 0.6, delay: 0 }); V.fallShape(c.x, c.y, sym(cls), c.pal[0], 11, 0.22, { h: 105, ang: 0 }); wave({ st: 'jag', R: (c.r || 1.6) * 0.9, delay: 0.2 })(c); },
    flank: (c, cls) => { const a = c.ang + Math.PI / 2; for (const sd of [-1, 1]) { const p0 = off(c, 1.5, a * 1 + (sd < 0 ? Math.PI : 0)); V.fly(p0.x, p0.y, c.x, c.y, (STY[cls] || {}).sh ? STY[cls].sh[1] : 'blade', c.pal[0], 6, 0.16, { spin: 0, arc: 6, z: 16 }); } cuts({ pat: 'x', L: 1.4, w: 2.2, stg: 0.08 })(c); },
    afterimage: (c, cls) => { if (c.u && G.E.spriteInfo) { const si = G.E.spriteInfo(c.u); for (let i = 0; i < 3; i++) { const p = off(c, 1.1, c.ang + Math.PI + (i - 1) * 1.1); V.ghost(p.x, p.y, si, 0.45, 0.32 + i * 0.05, c.pal[1]); } } cuts({ pat: 'star', n: 3, L: 1.2, w: 1.6, stg: 0.05 })(c); },
    linebreak: (c, cls) => { spk({ sh: (STY[cls] || {}).spk || 'light', pat: 'line', n: 6, h: 1, dur: 0.8 })(c); V.cracks && V.cracks(c.x, c.y, 1, 4, c.pal[1], 0.7); },
    implode: (c, cls) => { vortex({ sh: sym(cls), n: 8, R: (c.r || 2) * 1.2, inw: 1, s: 3, dur: 0.35, spd: 8 })(c); stamp({ sh: 'orb', s: 10, delay: 0.25, dur: 0.4 })(c); },
    orbitals: (c, cls) => { if (c.u) V.orbit(c.u, 6, (c.r || 2) * 0.8, sym(cls), c.pal[1], 4, 0.6, 10, { c2: c.pal[3] }); },
    portal: (c, cls) => { add({ k: 'f6rift', x: c.x, y: c.y, W: 0.9, H: 1.8, pal: c.pal, dur: 0.8 }); burst({ sh: sym(cls), n: 5, spd: 1.3, s: 3.5, up: 0.8, delay: 0.1 })(c); },
    crater: (c, cls) => { V.cracks && V.cracks(c.x, c.y, (c.r || 2) * 1.2, 9, c.pal[2], 1.1); burst({ sh: 'shard', n: 8, spd: 1.6, s: 3, up: 1.4, grav: 1.3, c: ['#8a7a6a', '#b0a08a'] })(c); wave({ st: 'ring', R: (c.r || 2) * 1.2, th: 5, dur: 0.35 })(c); },
    shatter: (c, cls) => { burst({ sh: 'shard', n: 7, spd: 1.4, s: 2.5, ring: 1, c: [c.pal[0], c.pal[1]] })(c); stamp({ sh: 'star5', s: 6, dur: 0.25 })(c); },
    // cast-side deliveries (conjured around the caster before release)
    conjure: (c, cls) => { const u = c.u; if (!u) return; for (let i = 0; i < 3; i++) { const a = c.ang + Math.PI + (i - 1) * 0.9; const p = { x: u.x + Math.cos(a) * 0.7, y: u.y + Math.sin(a) * 0.5 }; add({ k: 'f6stamp', x: p.x, y: p.y, sh: (STY[cls] || {}).sh ? STY[cls].sh[i % 4] : sym(cls), s: 5, pal: c.pal, dur: 0.35, z: 28 + i * 4, rot: c.ang, spin: 0, delay: i * 0.04 }); } },
    draw: (c, cls) => { const u = c.u; if (!u) return; add({ k: 'f6cres', x: u.x, y: u.y, follow: u, a: c.ang + Math.PI, R: 0.8, w: 0.18, sw: 1.6, pal: c.pal, dur: 0.22, flip: false, jag: false, delay: 0 }); },
    coil: (c, cls) => { const u = c.u; if (!u) return; add({ k: 'f6wave', x: u.x, y: u.y, R: 0.9, st: 'dash', th: 2, pal: c.pal, dur: 0.3, delay: 0, ground: true }); burst({ sh: 'shard', n: 4, spd: 0.6, s: 2, self: 1, up: 0.3, c: ['#9a8a7a', '#b0a08a'] })(c); },
    rise: (c, cls) => { const u = c.u; if (!u) return; add({ k: 'f6halo', x: u.x, y: u.y, follow: u, R: 1.1, z0: 0, z1: 30, sh: sym(cls), pal: c.pal, dur: 0.9 }); },
    descend: (c, cls) => { const u = c.u; if (!u) return; add({ k: 'f6halo', x: u.x, y: u.y, follow: u, R: 1.3, z0: 70, z1: 6, sh: 'hex', pal: c.pal, dur: 0.8 }); },
    bloom: (c, cls) => { const u = c.u; if (!u) return; vortex({ sh: 'petal', n: 8, R: 1, self: 1, s: 3, spd: 3, dur: 0.9, z: 4 })(c); },
    gather: (c, cls) => { const u = c.u; if (!u) return; vortex({ sh: sym(cls), n: 12, R: 3, inw: 1, self: 1, s: 4, spd: 6, dur: 0.6 })(c); add({ k: 'f6halo', x: u.x, y: u.y, follow: u, R: 2, z0: 4, z1: 60, sh: sym(cls), pal: c.pal, dur: 1.1 }); }
  };
  const IMPACT = { ground: ['erupt', 'skyfall', 'portal', 'crater'], zone: ['portal', 'erupt', 'skyfall'], slash: ['flank', 'afterimage', 'shatter'], barrage: ['afterimage', 'flank', 'shatter'], spin: ['orbitals', 'implode', 'afterimage'],
    thrust: ['linebreak', 'flank', 'shatter'], beam: ['linebreak', 'shatter', 'skyfall'], nova: ['implode', 'erupt', 'crater'], proj: ['shatter', 'crater', 'skyfall'], chain: ['shatter', 'portal'], dash: ['afterimage', 'crater'], leap: ['crater', 'skyfall', 'erupt'],
    trap: ['erupt', 'portal'], summon: ['portal', 'erupt'], turret: ['portal', 'crater'] };
  const CAST = { proj: 'conjure', chain: 'conjure', beam: 'conjure', slash: 'draw', spin: 'draw', barrage: 'draw', thrust: 'draw', dash: 'coil', leap: 'coil', buff: 'rise', shield: 'descend', heal: 'bloom', blink: 'coil', stealth: 'coil', summon: 'conjure', turret: 'conjure', nova: 'gather', ground: 'conjure', zone: 'conjure', trap: 'coil' };
  const DPLAN = {}; // per class: impact delivery per slot, unique combination with the arch inside the class
  const planFor = (cls) => { if (DPLAN[cls]) return DPLAN[cls]; const C = D.CLS[cls]; const cnt = {}; DPLAN[cls] = (C.skills || []).map((s) => { const L = IMPACT[s.arch]; if (!L) return null; const n = cnt[s.arch] = (cnt[s.arch] || 0) + 1; return L[(n - 1 + C.idx) % L.length]; }); return DPLAN[cls]; };
  G.FX6.planFor = planFor;
  const at0 = FX.at;
  FX.at = (u, s, x, y, ang, o = {}) => {
    if (!s || !s.id || !REC[s.cls]) return at0(u, s, x, y, ang, o); if (!G.E.vis(x, y)) return;
    if (!REC[s.cls][s.idx] && s.idx === D.SET_IDX) { const cls = D.CLS[s.cls]; REC[s.cls][s.idx] = genRecipe(cls, Object.assign({}, s, { ult: true }), s.idx).concat([rays({ n: 24, len: 5 })]).filter(f => typeof f === 'function'); }
    const list = REC[s.cls][s.idx]; if (!list) return at0(u, s, x, y, ang, o);
    const c = { x, y, sx: o.sx ?? u.x, sy: o.sy ?? u.y, ang: ang || 0, r: o.r || s.r || 1.6, pal: PAL[s.cls], sc: (s.scale || 1) * (s.ult ? 1.25 : 1), u, ult: s.ult, light: !!o.light, dur: o.dur, s };
    mine(() => { list.forEach((f, i) => { if (o.light && i > 0) return; try { f(c); } catch (e) { console.error(e); } }); if (!o.light && V.level >= 1) { detail(s, c); if (V.level === 2) motes(c, s.cls); let dv = s.ult ? (IMPACT[s.arch] || ['crater'])[0] : (s.idx < 24 ? planFor(s.cls)[s.idx] : null); if (!isMagic(s) && (dv === 'skyfall' || dv === 'portal')) dv = s.arch === 'proj' || s.arch === 'chain' ? 'shatter' : 'crater'; if (dv && DLV[dv]) try { DLV[dv](c, s.cls); } catch (e) { } } if (V.level === 2 && !o.light) flourish(c, s.cls); });
    if (u === G.W.player && s.ult) G.zKick = 0.07;
  };
  const cast0 = FX.cast;
  FX.cast = (u, s, A) => {
    if (!s || !s.id || !REC[s.cls]) return cast0(u, s, A); if (!G.E.vis(u.x, u.y) || (V.level === 0 && !s.ult)) return; return mine(() => cast6(u, s)); };
  const cast6 = (u, s) => { const pal = PAL[s.cls]; if (V.level >= 1) { const mg0 = isMagic(s); const cv0 = s.ult ? 'gather' : CAST[s.arch]; const cv = mg0 ? cv0 : ({ rise: 'coil', descend: 'coil', gather: 'coil', conjure: 'draw', bloom: null })[cv0] !== undefined ? ({ rise: 'coil', descend: 'coil', gather: 'coil', conjure: 'draw', bloom: null })[cv0] : cv0; const t = u.target || u; const ang = Math.atan2((t.y || u.y) - u.y, (t.x || u.x) - u.x) || 0; if (cv && DLV[cv]) try { DLV[cv]({ x: u.x, y: u.y, sx: u.x, sy: u.y, ang, r: s.r || 1.6, pal, sc: 1, u, s }, s.cls); } catch (e) { } }
    const sym = SYM[s.cls] || 'star';
    const mg = isMagic(s);
    if (s.ult) { V.vignette && V.vignette('#05030a', 0.8); if (mg) add({ k: 'f6sig', x: u.x, y: u.y, follow: u, R: 2.2, sh: sym, ticks: 16, pal, dur: 1.2, ground: true }); else add({ k: 'f6wave', x: u.x, y: u.y, R: 2.2, st: 'jag', th: 4, pal, dur: 0.5, delay: 0, ground: true }); add({ k: 'f6col', x: u.x, y: u.y, w: 8, H: 110, pal, dur: 0.6, delay: 0 }); }
    else if (mg && s.c >= 2.5) add({ k: 'f6sig', x: u.x, y: u.y, follow: u, R: 0.8, sh: sym, ticks: 6, pal, dur: 0.5, ground: true });
  };
  const ps0 = FX.projShape; FX.projShape = (s) => (s && s.id && PROJ[s.cls] && PROJ[s.cls][s.idx] !== undefined) ? PROJ[s.cls][s.idx] : ps0(s);
})(window.G);
