'use strict';
/* Chronomancer skill circle: a clock dial (double rim, Roman numerals I–XII with diamond pips, inner band, gear
   cluster behind) replaces the generic magic circle; the gear layer turns slowly and the minute + hour hands sweep
   live every frame. Dial and gears are cached per palette/size; only the hands are redrawn. */
(function (G) {
  const V = G.VFX; if (!V || !V.X || !V.X.f6sig) return;
  const ROM = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  const isChrono = pal => { const P = G.FX6 && G.FX6.PAL && G.FX6.PAL.chronomancer; return !!(P && pal && (pal === P || (pal[0] === P[0] && pal[1] === P[1]))); };
  const gear = (x, R, n, tooth) => { x.beginPath(); for (let i = 0; i < n * 4; i++) { const a = i / (n * 4) * 6.2832; const rr = (i % 4 < 2) ? R : R - tooth; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.closePath(); };
  const C = new Map();
  const layers = (pal, R) => { const R0 = Math.max(12, Math.min(160, Math.round(R / 8) * 8)); const key = pal[0] + pal[1] + R0; if (C.has(key)) return C.get(key); const S = Math.ceil(R0 * 2.5);
    const glow = pal[1], line = G.U.shade ? G.U.shade(pal[0], 0.5) : '#ffffff';
    const mk = () => { const [cv, x] = G.SPR.mk(S, S); x.translate(S / 2, S / 2); x.lineCap = 'round'; x.lineJoin = 'round'; return [cv, x]; };
    // dial
    const [dv, d] = mk(); const r = R0;
    const bg = d.createRadialGradient(0, 0, r * 0.1, 0, 0, r * 1.12); const dk = G.U.shade ? G.U.shade(glow, -0.72) : '#101808'; bg.addColorStop(0, dk + 'cc'); bg.addColorStop(0.8, dk + 'b0'); bg.addColorStop(0.93, glow + '70'); bg.addColorStop(1, glow + '00'); d.fillStyle = bg; d.beginPath(); d.arc(0, 0, r * 1.12, 0, 6.2832); d.fill();
    d.shadowColor = glow; d.shadowBlur = r * 0.06; d.strokeStyle = line; d.fillStyle = line;
    const ring = (rr, w) => { d.lineWidth = Math.max(1, r * w); d.beginPath(); d.arc(0, 0, rr, 0, 6.2832); d.stroke(); };
    ring(r, 0.028); ring(r * 0.955, 0.012); ring(r * 0.745, 0.012); ring(r * 0.705, 0.024); ring(r * 0.48, 0.016);
    d.textAlign = 'center'; d.textBaseline = 'middle'; d.font = `700 ${Math.max(5, r * 0.12)}px Georgia, 'Times New Roman', serif`;
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.2832 - 1.5708; d.save(); d.translate(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85); d.rotate(a + 1.5708); d.fillText(ROM[i], 0, 0); d.restore();
      const b = a + 0.2618; d.save(); d.translate(Math.cos(b) * r * 0.85, Math.sin(b) * r * 0.85); d.rotate(b); d.beginPath(); d.moveTo(-r * 0.035, 0); d.lineTo(0, -r * 0.022); d.lineTo(r * 0.035, 0); d.lineTo(0, r * 0.022); d.closePath(); d.fill(); d.restore(); }
    // gears (rotating layer)
    const [gv, g] = mk(); g.shadowColor = glow; g.shadowBlur = r * 0.04; g.strokeStyle = line; g.lineWidth = Math.max(1, r * 0.014); g.globalAlpha = 0.8;
    for (const [gx, gy, gr, n] of [[-0.4, -0.34, 0.24, 10], [0.44, 0.2, 0.19, 8], [-0.28, 0.42, 0.21, 9], [0.2, -0.5, 0.15, 7], [0.5, -0.2, 0.12, 6]]) { g.save(); g.translate(gx * r, gy * r); gear(g, gr * r, n, gr * r * 0.24); g.stroke(); g.beginPath(); g.arc(0, 0, gr * r * 0.42, 0, 6.2832); g.stroke(); g.restore(); }
    g.globalAlpha = 1; g.lineWidth = Math.max(1, r * 0.02); gear(g, r * 0.35, 12, r * 0.06); g.stroke(); g.beginPath(); g.arc(0, 0, r * 0.2, 0, 6.2832); g.stroke();
    const o = { dv, gv, S, R0 }; C.set(key, o); if (C.size > 60) C.delete(C.keys().next().value); return o; };
  const hand = (x, ang, L, W, line, tip) => { x.save(); x.rotate(ang); x.beginPath(); x.moveTo(-W * 0.35, W * 0.6); x.lineTo(-W * 0.22, -L * 0.7); x.lineTo(-W, -L * 0.78); x.lineTo(0, -L); x.lineTo(W, -L * 0.78); x.lineTo(W * 0.22, -L * 0.7); x.lineTo(W * 0.35, W * 0.6); x.closePath(); x.fillStyle = line; x.fill();
    x.beginPath(); x.moveTo(0, -L * 0.93); x.lineTo(W * 0.42, -L * 0.79); x.lineTo(0, -L * 0.73); x.lineTo(-W * 0.42, -L * 0.79); x.closePath(); x.fillStyle = tip; x.fill(); x.restore(); };
  const d0 = V.X.f6sig.draw;
  V.X.f6sig.draw = function (x, cam, f, k) { if (!isChrono(f.pal)) return d0.call(this, x, cam, f, k);
    const u = f.follow; const [sx, sy] = cam.w2s(u ? u.x : f.x, u ? u.y : f.y); const T = G.TS; const r = f.R * T * (k < 0.12 ? 0.5 + k / 0.12 * 0.5 : 1); const al = Math.min(1, f.t * 5) * (k > 0.75 ? (1 - k) / 0.25 : 1); if (r < 2) return;
    const L = layers(f.pal, r); const sc = r / L.R0; x.save(); x.translate(sx, sy); x.scale(1, 0.55); x.globalCompositeOperation = 'source-over'; x.filter = 'none'; x.globalAlpha = al;
    x.drawImage(L.dv, -L.S / 2 * sc, -L.S / 2 * sc, L.S * sc, L.S * sc);
    x.save(); x.globalCompositeOperation = 'lighter'; x.rotate(f.t * 0.6); x.drawImage(L.gv, -L.S / 2 * sc, -L.S / 2 * sc, L.S * sc, L.S * sc); x.restore();
    // hands: minute sweeps a full turn per ~2 s, hour a twelfth as fast; they start at 10:10 like a dial face
    const mA = -0.35 + f.t * 3.1, hA = -1.75 + f.t * 0.26; x.shadowColor = f.pal[1]; x.shadowBlur = r * 0.08;
    const hc = G.U.shade ? G.U.shade(f.pal[0], 0.5) : '#ffffff'; hand(x, hA, r * 0.46, r * 0.085, hc, f.pal[1]); hand(x, mA, r * 0.68, r * 0.07, hc, f.pal[1]);
    x.beginPath(); x.arc(0, 0, r * 0.065, 0, 6.2832); x.fillStyle = hc; x.fill(); x.beginPath(); x.arc(0, 0, r * 0.03, 0, 6.2832); x.fillStyle = f.pal[1]; x.fill();
    x.restore(); };
})(window.G);
