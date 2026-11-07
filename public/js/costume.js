'use strict';
/* Costumes v2: every fashion slot renders on the character (wings by theme, aura, footstep trail, floating orb …),
   new Magic Circles worn on the head / under the feet / on the back (3 designs each), a magic-circle gacha box,
   and junk loot from monsters (sold for gold). */
(function (G) {
  const U = G.U, D = G.D, E = G.E, W = G.W, S = G.S, V = G.VFX, UI = G.UI, SPR = G.SPR; const esc = UI.esc;
  // ---------- new fashion slots ----------
  D.FASHION_SLOTS.push({ k: 'f_mch', th: 'วงแหวนเวท (บนหัว)' }, { k: 'f_mcf', th: 'วงแหวนเวท (ใต้เท้า)' }, { k: 'f_mcb', th: 'วงแหวนเวท (ด้านหลัง)' });
  const MC = {
    f_mch: [['มงกุฎดวงดาว', 'star'], ['รัศมีเทวา', 'halo'], ['เกลียวอาคม', 'spiral']],
    f_mcf: [['วงเวทอัญเชิญ', 'summon'], ['ตราหกแฉก', 'hexagram'], ['นาฬิกาแห่งกาล', 'clock']],
    f_mcb: [['วงแหวนหนามดารา', 'thornring'], ['ดาราโกลาหล', 'chaosstar'], ['ประตูมิติ', 'gate']]
  };
  D.MAGIC_CIRCLES = MC;
  const gen0 = S.genItem; S.genItem = (kind, tier, ilv, o = {}) => { const it = gen0(kind, tier, ilv, o); if (kind === 'fashion' && MC[it.slot]) { it.mc = o.mc ?? Math.floor(Math.random() * 3); it.name = D.FASHION_THEMES[it.theme].n + ' · ' + MC[it.slot][it.mc][0]; } return it; };
  // ---------- drawing helpers ----------
  const rune = (x, i, s) => { const k = i % 5; x.beginPath(); if (k === 0) { x.moveTo(-s, -s); x.lineTo(s, s); x.moveTo(s, -s); x.lineTo(-s, s); } else if (k === 1) { x.moveTo(0, -s); x.lineTo(s, s); x.lineTo(-s, s); x.closePath(); } else if (k === 2) { x.arc(0, 0, s * 0.8, 0, 7); x.moveTo(0, -s); x.lineTo(0, s); } else if (k === 3) { x.moveTo(-s, 0); x.lineTo(s, 0); x.moveTo(-s * 0.5, -s); x.lineTo(-s * 0.5, s); x.moveTo(s * 0.5, -s); x.lineTo(s * 0.5, s); } else { x.moveTo(0, -s); x.lineTo(s, 0); x.lineTo(0, s); x.lineTo(-s, 0); x.closePath(); } x.stroke(); };
  const star = (x, n, r, skip) => { x.beginPath(); for (let i = 0; i <= n; i++) { const a = (i * skip) / n * 6.283 - 1.571; const px = Math.cos(a) * r, py = Math.sin(a) * r; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); };
  const glowC = (x, r, c, a) => { const g = x.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); x.globalAlpha = a; x.fillStyle = g; x.beginPath(); x.arc(0, 0, r, 0, 7); x.fill(); };
  // one magic-circle design drawn centred at 0,0 (radius r) — flattened by caller for ground/head
  const DES = {
    star: (x, r, t, c1, c2) => { x.strokeStyle = c2; x.lineWidth = 1.2; x.beginPath(); x.arc(0, 0, r, 0, 7); x.stroke(); x.rotate(t); star(x, 5, r * 0.9, 2); x.rotate(-t * 2); for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283; x.save(); x.translate(Math.cos(a) * r, Math.sin(a) * r); x.fillStyle = c1; x.beginPath(); x.arc(0, 0, 1.6, 0, 7); x.fill(); x.restore(); } },
    halo: (x, r, t, c1, c2) => { x.strokeStyle = c1; x.lineWidth = 2.4; x.beginPath(); x.arc(0, 0, r, 0, 7); x.stroke(); x.strokeStyle = c2; x.lineWidth = 1; x.beginPath(); x.arc(0, 0, r * 0.75, 0, 7); x.stroke(); x.rotate(t * 1.5); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; x.beginPath(); x.moveTo(Math.cos(a) * r * 1.05, Math.sin(a) * r * 1.05); x.lineTo(Math.cos(a) * r * 1.35, Math.sin(a) * r * 1.35); x.stroke(); } },
    spiral: (x, r, t, c1, c2) => { x.rotate(t * 2); x.strokeStyle = c2; x.lineWidth = 1.3; for (let arm = 0; arm < 3; arm++) { x.beginPath(); for (let k = 0; k <= 20; k++) { const q = k / 20; const a = arm * 2.094 + q * 4; x.lineTo(Math.cos(a) * r * q, Math.sin(a) * r * q); } x.stroke(); } x.strokeStyle = c1; x.beginPath(); x.arc(0, 0, r, 0, 7); x.stroke(); },
    summon: (x, r, t, c1, c2) => { x.strokeStyle = c2; x.lineWidth = 1.5; x.beginPath(); x.arc(0, 0, r, 0, 7); x.stroke(); x.lineWidth = 1; x.beginPath(); x.arc(0, 0, r * 0.82, 0, 7); x.stroke(); x.save(); x.rotate(t * 0.6); x.strokeStyle = c1; for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; x.save(); x.translate(Math.cos(a) * r * 0.91, Math.sin(a) * r * 0.91); x.rotate(a); rune(x, i, r * 0.05); x.restore(); } x.restore(); x.rotate(-t); star(x, 8, r * 0.78, 3); x.beginPath(); x.arc(0, 0, r * 0.3, 0, 7); x.stroke(); },
    hexagram: (x, r, t, c1, c2) => { x.strokeStyle = c2; x.lineWidth = 1.5; x.beginPath(); x.arc(0, 0, r, 0, 7); x.stroke(); x.rotate(t * 0.8); x.strokeStyle = c1; x.lineWidth = 1.3; for (const o of [0, Math.PI / 3]) { x.save(); x.rotate(o); x.beginPath(); for (let i = 0; i <= 3; i++) { const a = i / 3 * 6.283 - 1.571; x.lineTo(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92); } x.stroke(); x.restore(); } x.beginPath(); x.arc(0, 0, r * 0.45, 0, 7); x.stroke(); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; x.save(); x.translate(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62); rune(x, i + 1, r * 0.06); x.restore(); } },
    clock: (x, r, t, c1, c2) => { x.strokeStyle = c2; x.lineWidth = 1.6; x.beginPath(); x.arc(0, 0, r, 0, 7); x.stroke(); x.lineWidth = 1; x.beginPath(); x.arc(0, 0, r * 0.86, 0, 7); x.stroke(); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; x.beginPath(); x.moveTo(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86); x.lineTo(Math.cos(a) * r * (i % 3 ? 0.78 : 0.7), Math.sin(a) * r * (i % 3 ? 0.78 : 0.7)); x.stroke(); }
      x.strokeStyle = c1; x.lineWidth = 2; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(t * 2) * r * 0.65, Math.sin(t * 2) * r * 0.65); x.stroke(); x.lineWidth = 1.4; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(t * 0.3) * r * 0.45, Math.sin(t * 0.3) * r * 0.45); x.stroke(); x.save(); x.rotate(-t * 0.5); x.setLineDash([3, 4]); x.beginPath(); x.arc(0, 0, r * 1.12, 0, 7); x.stroke(); x.restore(); },
    zodiac: (x, r, t, c1, c2) => { x.strokeStyle = c2; x.lineWidth = 1.4; x.beginPath(); x.arc(0, 0, r, 0, 7); x.stroke(); x.beginPath(); x.arc(0, 0, r * 0.7, 0, 7); x.stroke(); x.save(); x.rotate(t * 0.5); x.strokeStyle = c1; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; x.beginPath(); x.moveTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7); x.lineTo(Math.cos(a) * r, Math.sin(a) * r); x.stroke(); x.save(); x.translate(Math.cos(a + 0.26) * r * 0.85, Math.sin(a + 0.26) * r * 0.85); rune(x, i, r * 0.05); x.restore(); } x.restore(); x.rotate(-t); star(x, 4, r * 0.66, 1); },
    lotus: (x, r, t, c1, c2) => { x.rotate(t * 0.4); for (let ring = 0; ring < 2; ring++) { const n = ring ? 8 : 12, rr = r * (ring ? 0.55 : 0.85); for (let i = 0; i < n; i++) { const a = i / n * 6.283 + ring * 0.2; x.save(); x.rotate(a); x.translate(0, -rr * 0.55); x.fillStyle = ring ? c1 : c2; x.globalAlpha *= 0.85; x.beginPath(); x.ellipse(0, 0, rr * 0.16, rr * 0.5, 0, 0, 7); x.fill(); x.restore(); } } x.strokeStyle = c1; x.lineWidth = 1; x.beginPath(); x.arc(0, 0, r, 0, 7); x.stroke(); },
    gate: (x, r, t, c1, c2) => { glowC(x, r, c2, 0.35); x.globalAlpha = 1; x.strokeStyle = c1; x.lineWidth = 1.6; for (let k = 0; k < 4; k++) { const rr = r * (1 - k * 0.2); x.save(); x.rotate(t * (k % 2 ? -1 : 1) * (0.6 + k * 0.3)); x.setLineDash([rr * 0.6, rr * 0.25]); x.beginPath(); x.arc(0, 0, rr, 0, 7); x.stroke(); x.restore(); } x.fillStyle = '#ffffff'; x.beginPath(); x.arc(0, 0, r * 0.12, 0, 7); x.fill(); }
  };
  const MCI2 = new Map(); const ovK = () => Math.max(1, Math.round((G.S2 || 2) * 2) / 2);
  const drawMC = (ctx, it, cx, cy, r, flat, t) => { const k = ovK(); const key = it.slot + (it.mc || 0) + (it.dye || it.colors[1]) + it.colors[0] + r + '@' + k; let c = MCI2.get(key); if (!c) { const S = Math.ceil(r * 2.8); const kk = k * 1.5; const [cv, x] = SPR.mk(Math.ceil(S * kk), Math.ceil(S * kk)); x.setTransform(kk, 0, 0, kk, 0, 0); drawMC0(x, it, S / 2, S / 2, r, 1, 0); c = { cv, S }; MCI2.set(key, c); if (MCI2.size > 120) MCI2.delete(MCI2.keys().next().value); }
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, flat); ctx.rotate(t * 0.5); ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(c.cv, -c.S / 2, -c.S / 2, c.S, c.S); ctx.restore(); };
  const NO_ORN = { clock: 1, thornring: 1, chaosstar: 1 };
  const ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  const gearPath = (x, cx, cy, R, n, tooth) => { x.beginPath(); for (let i = 0; i < n * 4; i++) { const a = i / (n * 4) * 6.2832; const rr = (i % 4 < 2) ? R : R - tooth; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); };
  const kite = (x, L, W, inner) => { x.beginPath(); x.moveTo(0, -L); x.lineTo(W, -L * 0.42); x.lineTo(0, 0); x.lineTo(-W, -L * 0.42); x.closePath(); };
  const NEWDES = {
    clock: (x, r, t, c1, c2) => { const lum = c => { const n = parseInt(String(c).slice(1, 7), 16); return ((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11; }; const hi = lum(c1) >= lum(c2) ? c1 : c2; c2 = U.shade ? U.shade(hi, 0.55) : hi; c1 = hi; x.save(); x.strokeStyle = c2; x.fillStyle = c2;
      // background gears (outlined, partly hidden behind the dial bands)
      x.globalAlpha = 0.55; x.lineWidth = 0.9; for (const [gx, gy, gr, n] of [[-0.42, -0.36, 0.26, 10], [0.46, 0.18, 0.2, 8], [-0.3, 0.42, 0.22, 9], [0.22, -0.5, 0.16, 7]]) { x.save(); x.translate(gx * r, gy * r); x.rotate(t * (n % 2 ? 0.6 : -0.6)); gearPath(x, 0, 0, gr * r, n, gr * r * 0.22); x.stroke(); x.beginPath(); x.arc(0, 0, gr * r * 0.45, 0, 6.2832); x.stroke(); x.restore(); } x.globalAlpha = 1;
      // rims + numeral band
      x.lineWidth = 1.6; x.beginPath(); x.arc(0, 0, r, 0, 6.2832); x.stroke(); x.lineWidth = 0.8; x.beginPath(); x.arc(0, 0, r * 0.95, 0, 6.2832); x.stroke(); x.beginPath(); x.arc(0, 0, r * 0.76, 0, 6.2832); x.stroke(); x.lineWidth = 1.2; x.beginPath(); x.arc(0, 0, r * 0.72, 0, 6.2832); x.stroke();
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `700 ${Math.max(3, r * 0.12)}px Georgia, serif`;
      for (let i = 0; i < 12; i++) { const a = i / 12 * 6.2832 - 1.5708; x.save(); x.translate(Math.cos(a) * r * 0.855, Math.sin(a) * r * 0.855); x.rotate(a + 1.5708); x.fillText(ROMAN[i], 0, 0); x.restore();
        const b = a + 0.2618; x.save(); x.translate(Math.cos(b) * r * 0.855, Math.sin(b) * r * 0.855); x.rotate(b); x.beginPath(); x.moveTo(-r * 0.03, 0); x.lineTo(0, -r * 0.02); x.lineTo(r * 0.03, 0); x.lineTo(0, r * 0.02); x.closePath(); x.fill(); x.restore(); }
      // inner dial ring + centre gear
      x.lineWidth = 1; x.beginPath(); x.arc(0, 0, r * 0.5, 0, 6.2832); x.stroke(); x.save(); x.rotate(-t * 0.8); x.lineWidth = 1.2; gearPath(x, 0, 0, r * 0.36, 12, r * 0.06); x.stroke(); x.lineWidth = 0.8; x.beginPath(); x.arc(0, 0, r * 0.22, 0, 6.2832); x.stroke(); x.restore();
      // hands with ornate tips
      const hand = (ang, L, W) => { x.save(); x.rotate(ang); x.beginPath(); x.moveTo(-W * 0.4, 0); x.lineTo(-W * 0.25, -L * 0.72); x.lineTo(-W, -L * 0.8); x.lineTo(0, -L); x.lineTo(W, -L * 0.8); x.lineTo(W * 0.25, -L * 0.72); x.lineTo(W * 0.4, 0); x.closePath(); x.fill(); x.fillStyle = c1; x.beginPath(); x.moveTo(0, -L * 0.94); x.lineTo(W * 0.45, -L * 0.8); x.lineTo(0, -L * 0.74); x.lineTo(-W * 0.45, -L * 0.8); x.closePath(); x.fill(); x.restore(); x.fillStyle = c2; };
      hand(t * 0.25 + 2.2, r * 0.68, r * 0.07); hand(t * 0.05 + 0.9, r * 0.5, r * 0.08); x.beginPath(); x.arc(0, 0, r * 0.06, 0, 6.2832); x.fill(); x.fillStyle = c1; x.beginPath(); x.arc(0, 0, r * 0.03, 0, 6.2832); x.fill(); x.restore(); },
    thornring: (x, r, t, c1, c2) => { x.save(); x.strokeStyle = c1; x.fillStyle = c1; x.lineWidth = 1.6; x.beginPath(); x.arc(0, 0, r * 0.74, 0, 6.2832); x.stroke(); x.lineWidth = 0.7; x.beginPath(); x.arc(0, 0, r * 0.68, 0, 6.2832); x.stroke();
      for (let i = 0; i < 16; i++) { const a = i / 16 * 6.2832; const big = i % 4 === 0, mid = i % 4 === 2; const L = big ? r * 0.52 : mid ? r * 0.36 : r * 0.24, W = big ? r * 0.1 : mid ? r * 0.09 : r * 0.06;
        x.save(); x.rotate(a); x.translate(0, -r * 0.7);
        // outer spike
        x.beginPath(); x.moveTo(0, -L * (big ? 1 : 0.8)); x.lineTo(W, -L * 0.25); x.lineTo(W * 0.4, 0); x.lineTo(-W * 0.4, 0); x.lineTo(-W, -L * 0.25); x.closePath(); x.fillStyle = c1; x.fill(); x.strokeStyle = c2; x.lineWidth = 0.5; x.stroke();
        // side blades for the big/mid spikes
        if (big || mid) for (const sd of [-1, 1]) { x.beginPath(); x.moveTo(sd * W * 0.6, -L * 0.15); x.lineTo(sd * W * (big ? 3.2 : 2.4), -L * (big ? 0.28 : 0.32)); x.lineTo(sd * W * 0.9, -L * 0.42); x.closePath(); x.fill(); }
        // inner diamond window
        x.fillStyle = c2; x.beginPath(); x.moveTo(0, -L * 0.62); x.lineTo(W * 0.42, -L * 0.36); x.lineTo(0, -L * 0.14); x.lineTo(-W * 0.42, -L * 0.36); x.closePath(); x.fill();
        // inward tooth
        x.fillStyle = c1; x.beginPath(); x.moveTo(-W * 0.35, 0); x.lineTo(0, r * (big ? 0.12 : 0.07)); x.lineTo(W * 0.35, 0); x.closePath(); x.fill(); x.restore(); }
      // dotted halo of sparks
      for (let i = 0; i < 48; i++) { const a = i / 48 * 6.2832 + 0.065; const rr = r * (i % 3 === 0 ? 1.02 : 0.95); x.globalAlpha = i % 3 === 0 ? 0.9 : 0.55; x.beginPath(); x.arc(Math.cos(a) * rr, Math.sin(a) * rr, i % 3 === 0 ? r * 0.018 : r * 0.01, 0, 6.2832); x.fill(); } x.globalAlpha = 1; x.restore(); },
    chaosstar: (x, r, t, c1, c2) => { x.save(); const dk = U.shade ? U.shade(c1, -0.45) : c1;
      for (let i = 0; i < 8; i++) { const a = i / 8 * 6.2832; const L = i % 2 ? r * 0.78 : r; const W = i % 2 ? r * 0.13 : r * 0.15; x.save(); x.rotate(a);
        x.beginPath(); x.moveTo(0, -L); x.lineTo(W, -L * 0.62); x.lineTo(W * 0.55, -L * 0.62); x.lineTo(W * 0.85, -r * 0.42); x.lineTo(-W * 0.85, -r * 0.42); x.lineTo(-W * 0.55, -L * 0.62); x.lineTo(-W, -L * 0.62); x.closePath(); x.fillStyle = dk; x.fill(); x.strokeStyle = c1; x.lineWidth = 1.1; x.stroke();
        x.beginPath(); x.moveTo(0, -L * 0.92); x.lineTo(W * 0.45, -L * 0.66); x.lineTo(0, -L * 0.56); x.lineTo(-W * 0.45, -L * 0.66); x.closePath(); x.fillStyle = c1; x.fill(); x.restore(); }
      // central rings
      x.strokeStyle = c1; x.lineWidth = r * 0.08; x.beginPath(); x.arc(0, 0, r * 0.4, 0, 6.2832); x.stroke(); x.strokeStyle = dk; x.lineWidth = r * 0.025; x.beginPath(); x.arc(0, 0, r * 0.4, 0, 6.2832); x.stroke();
      // four half-moon knobs on the ring
      for (let i = 0; i < 4; i++) { x.save(); x.rotate(i * 1.5708); x.translate(0, -r * 0.4); x.fillStyle = c1; x.beginPath(); x.arc(0, 0, r * 0.11, Math.PI, 0); x.closePath(); x.fill(); x.fillStyle = dk; x.beginPath(); x.arc(0, 0, r * 0.065, Math.PI, 0); x.closePath(); x.fill(); x.fillStyle = c1; x.fillRect(-r * 0.008, -r * 0.065, r * 0.016, r * 0.065); x.restore(); }
      // inner cross with hooked arms
      x.strokeStyle = c1; x.lineWidth = r * 0.035; x.lineCap = 'round'; for (let i = 0; i < 4; i++) { x.save(); x.rotate(i * 1.5708 + 0.785); x.beginPath(); x.moveTo(0, -r * 0.05); x.lineTo(0, -r * 0.2); x.quadraticCurveTo(r * 0.04, -r * 0.3, r * 0.1, -r * 0.27); x.stroke(); x.beginPath(); x.moveTo(0, -r * 0.2); x.quadraticCurveTo(-r * 0.04, -r * 0.3, -r * 0.1, -r * 0.27); x.stroke(); x.restore(); }
      x.fillStyle = c1; x.beginPath(); x.moveTo(0, -r * 0.09); x.lineTo(r * 0.09, 0); x.lineTo(0, r * 0.09); x.lineTo(-r * 0.09, 0); x.closePath(); x.fill();
      x.font = `700 ${Math.max(2.5, r * 0.08)}px Georgia, serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('VIII', 0, -r * 0.72); x.restore(); }
  };
  // shared ornate layer: double rim + rune band + ticks + inner glyph ring + cardinal gems (drawn under each design)
  const ornate = (x, r, t, c1, c2) => { x.save(); x.globalAlpha = 0.95; x.strokeStyle = c2; x.lineWidth = 0.9; x.beginPath(); x.arc(0, 0, r * 1.12, 0, 6.2832); x.stroke(); x.lineWidth = 0.6; x.beginPath(); x.arc(0, 0, r * 1.04, 0, 6.2832); x.stroke();
    x.save(); x.rotate(-t * 0.35); x.lineWidth = 0.7; x.strokeStyle = c1; for (let i = 0; i < 24; i++) { const a = i / 24 * 6.2832; x.save(); x.rotate(a); x.translate(0, -r * 1.08); rune(x, i, r * 0.028); x.stroke(); x.restore(); } x.restore();
    x.lineWidth = 0.6; for (let i = 0; i < 72; i++) { const a = i / 72 * 6.2832, l = i % 6 ? 0.025 : 0.06; x.beginPath(); x.moveTo(Math.cos(a) * r * 1.12, Math.sin(a) * r * 1.12); x.lineTo(Math.cos(a) * r * (1.12 + l), Math.sin(a) * r * (1.12 + l)); x.stroke(); }
    x.save(); x.rotate(t * 0.6); x.setLineDash([r * 0.05, r * 0.035]); x.lineWidth = 0.7; x.beginPath(); x.arc(0, 0, r * 0.38, 0, 6.2832); x.stroke(); x.setLineDash([]); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.2832; x.beginPath(); x.moveTo(Math.cos(a) * r * 0.38, Math.sin(a) * r * 0.38); x.lineTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2); x.stroke(); } x.restore();
    for (let i = 0; i < 4; i++) { const a = i / 4 * 6.2832 + t * 0.2; const px = Math.cos(a) * r * 1.12, py = Math.sin(a) * r * 1.12; x.fillStyle = c1; x.beginPath(); x.moveTo(px, py - r * 0.05); x.lineTo(px + r * 0.035, py); x.lineTo(px, py + r * 0.05); x.lineTo(px - r * 0.035, py); x.closePath(); x.fill(); x.fillStyle = '#ffffff'; x.beginPath(); x.arc(px, py, r * 0.012, 0, 6.2832); x.fill(); }
    x.restore(); };
  const drawMC0 = (ctx, it, cx, cy, r, flat, t) => { const dk0 = MC[it.slot][it.mc || 0][1]; const des = NEWDES[dk0] || DES[dk0]; const c1 = it.dye || it.colors[1], c2 = it.colors[0] === '#1a1a2a' || it.colors[0] === '#20103a' ? it.colors[1] : it.colors[0];
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, flat); ctx.globalCompositeOperation = 'lighter'; glowC(ctx, r * 1.3, c1, 0.3); ctx.globalAlpha = 1; ctx.lineCap = 'round'; if (!NO_ORN[MC[it.slot][it.mc || 0][1]]) ornate(ctx, r, t, c1, c2); ctx.lineWidth = 1.4; des(ctx, r, t, c1, c2); if (!NO_ORN[dk0]) { ctx.globalAlpha = 0.5; ctx.lineWidth = 2.6; ctx.strokeStyle = c1; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke(); } ctx.restore(); }; G.MCDRAW = (...a) => drawMC0(...a);
  // ---------- wings by theme ----------
  const WING = ['dragon', 'feather', 'bat', 'crystal', 'feather', 'tatter', 'mech', 'petal', 'scarab', 'void'];
  const wingShape = (x, kind, c1, c2, flap) => { // right wing drawn pointing right from origin (detailed, layered)
    const sh = (c, f) => U.shade ? U.shade(c, f) : c; const OL = 'rgba(12,8,6,.85)'; x.lineJoin = 'round'; x.lineCap = 'round';
    const lg = (x0, y0, x1, y1, a, b, c) => { const g = x.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, a); g.addColorStop(c ? 0.55 : 1, b); if (c) g.addColorStop(1, c); return g; };
    const feather = (L, W2, col, edge) => { x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(L * 0.45, -W2, L, 0); x.quadraticCurveTo(L * 0.45, W2 * 0.7, 0, 0); x.closePath(); x.fillStyle = lg(0, 0, L, 0, sh(col, 0.25), col, sh(col, -0.35)); x.fill(); x.lineWidth = 0.45; x.strokeStyle = OL; x.stroke(); x.beginPath(); x.moveTo(0.5, 0); x.lineTo(L * 0.92, 0); x.strokeStyle = edge; x.lineWidth = 0.35; x.stroke(); };
    if (kind === 'feather' || kind === 'petal') {
      const rows = kind === 'petal' ? [[7, 0.9, 13, 3.4]] : [[8, 1, 23, 2.3], [7, 0.85, 15, 2.6], [6, 0.7, 9, 2.8]];
      rows.forEach(([n, br, L, Wd], r) => { const col = r === 0 ? c1 : r === 1 ? sh(c1, 0.12) : sh(c1, 0.25); for (let i = n - 1; i >= 0; i--) { const a = (-1.05 + i * 0.26 * flap) * br; x.save(); x.translate(r * 1.2, -r * 0.6); x.rotate(a); feather(L - i * (r ? 0.9 : 1.6), Wd, i === 0 ? sh(col, 0.15) : col, sh(c2, 0.2)); x.restore(); } });
      x.beginPath(); x.moveTo(-1, 1); x.quadraticCurveTo(6, -9 * flap, 14, -7 * flap); x.quadraticCurveTo(9, -2, -1, 1); x.fillStyle = lg(0, -8, 12, 0, sh(c2, 0.3), c2, sh(c2, -0.3)); x.fill(); x.lineWidth = 0.6; x.strokeStyle = OL; x.stroke();
      for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(3 + i * 2.6, -3.5 * flap - i * 0.6, 0.55, 0, 6.28); x.fillStyle = 'rgba(255,255,255,.7)'; x.fill(); } }
    else if (kind === 'bat' || kind === 'dragon' || kind === 'tatter') {
      const tip = [[6, -13 * flap], [15, -15 * flap], [23, -11 * flap], [26, -4 * flap]]; const elbow = [7, -9 * flap];
      x.beginPath(); x.moveTo(0, 0); x.lineTo(elbow[0], elbow[1]); for (const t of tip) x.lineTo(t[0], t[1]); let px = 26, py = -4 * flap; const sc = kind === 'tatter' ? 3.2 : 2.2;
      for (let i = 3; i >= 0; i--) { const t = i ? tip[i - 1] : [2, 2]; x.quadraticCurveTo((px + t[0]) / 2 - 1, (py + t[1]) / 2 + sc + 2, t[0], t[1] + (i ? 1 : 0)); px = t[0]; py = t[1]; } x.closePath();
      x.fillStyle = lg(0, -12, 24, 4, sh(c1, 0.15), c1, sh(c1, -0.45)); x.fill(); x.lineWidth = 0.7; x.strokeStyle = OL; x.stroke();
      x.globalAlpha = 0.45; x.strokeStyle = sh(c1, -0.5); x.lineWidth = 0.4; for (const t of tip) { x.beginPath(); x.moveTo(elbow[0], elbow[1]); x.quadraticCurveTo((elbow[0] + t[0]) / 2, (elbow[1] + t[1]) / 2 + 3, t[0], t[1] + 4); x.stroke(); } x.globalAlpha = 1;
      x.strokeStyle = sh(c2, -0.1); x.lineWidth = 1.5; x.beginPath(); x.moveTo(0, 0); x.lineTo(elbow[0], elbow[1]); x.stroke(); x.lineWidth = 0.9; for (const t of tip) { x.beginPath(); x.moveTo(elbow[0], elbow[1]); x.lineTo(t[0], t[1]); x.stroke(); }
      x.fillStyle = '#f0e8d8'; x.beginPath(); x.moveTo(elbow[0], elbow[1]); x.lineTo(elbow[0] - 1, elbow[1] - 3.5); x.lineTo(elbow[0] + 1.2, elbow[1] - 0.5); x.fill(); x.beginPath(); x.arc(elbow[0], elbow[1], 1.1, 0, 6.28); x.fillStyle = c2; x.fill();
      if (kind === 'dragon') { x.fillStyle = sh(c2, 0.2); for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(3 + i * 1.2, -3 - i * 1.4 * flap, 0.8, 0, 6.28); x.fill(); } } }
    else if (kind === 'crystal') { for (let i = 0; i < 5; i++) { x.save(); x.rotate(-0.95 + i * 0.36 * flap); const L = 19 - i * 2.4; x.beginPath(); x.moveTo(0, 0); x.lineTo(L * 0.7, -2.6); x.lineTo(L, 0); x.lineTo(L * 0.7, 2.6); x.closePath(); x.globalAlpha = 0.88; x.fillStyle = lg(0, -3, 0, 3, sh(c1, 0.55), c1, sh(c1, -0.35)); x.fill(); x.globalAlpha = 1; x.lineWidth = 0.6; x.strokeStyle = sh(c2, -0.3); x.stroke(); x.beginPath(); x.moveTo(1, 0); x.lineTo(L, 0); x.moveTo(L * 0.7, -2.6); x.lineTo(L * 0.85, 0); x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = 0.4; x.stroke(); x.restore(); } }
    else if (kind === 'mech') { x.fillStyle = lg(0, -4, 0, 2, '#9aa0b0', '#4a5060'); x.fillRect(-1, -3.5, 9, 5); x.strokeStyle = OL; x.lineWidth = 0.5; x.strokeRect(-1, -3.5, 9, 5); for (let i = 0; i < 5; i++) { x.save(); x.rotate(-0.75 + i * 0.32 * flap); const L = 17 - i * 1.2; x.fillStyle = lg(6, -2, 6, 2, sh(c1, 0.35), c1, sh(c1, -0.4)); x.beginPath(); x.moveTo(6, -1.8); x.lineTo(6 + L, -1); x.lineTo(7 + L, 0.4); x.lineTo(6, 1.8); x.closePath(); x.fill(); x.stroke(); x.fillStyle = c2; x.shadowColor = c2; x.shadowBlur = 3; x.fillRect(5 + L - 3, -0.5, 3, 1); x.shadowBlur = 0; x.fillStyle = '#d8dce8'; x.beginPath(); x.arc(8, 0, 0.6, 0, 6.28); x.fill(); x.restore(); } }
    else if (kind === 'scarab') { for (const [rx, ry, oy, col] of [[12, 7, -5, c1], [8, 4.5, 3, sh(c1, -0.2)]]) { x.beginPath(); x.ellipse(rx * 0.85, oy * flap, rx, ry, -0.35, 0, 6.28); x.fillStyle = lg(0, oy - ry, rx * 2, oy + ry, sh(col, 0.35), col, sh(col, -0.4)); x.fill(); x.lineWidth = 0.6; x.strokeStyle = OL; x.stroke(); }
      x.beginPath(); x.arc(13, -6 * flap, 3, 0, 6.28); x.fillStyle = c2; x.fill(); x.beginPath(); x.arc(13, -6 * flap, 1.6, 0, 6.28); x.fillStyle = OL; x.fill(); x.beginPath(); x.arc(12.4, -6.6 * flap, 0.6, 0, 6.28); x.fillStyle = '#fff'; x.fill();
      x.strokeStyle = sh(c1, -0.5); x.lineWidth = 0.35; for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(1, -1); x.lineTo(4 + i * 4, -11 * flap + i * 2); x.stroke(); } }
    else { const g = x.createRadialGradient(10, -4 * flap, 1, 10, -4 * flap, 14); g.addColorStop(0, sh(c2, 0.2)); g.addColorStop(0.5, c1); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; for (let i = 0; i < 4; i++) { x.globalAlpha = 0.75 - i * 0.12; x.beginPath(); x.ellipse(8 + i * 3, -4 * flap - i * 2, 11 - i * 2, 4.5, -0.5, 0, 6.28); x.fill(); } x.globalAlpha = 1; for (let i = 0; i < 6; i++) { x.fillStyle = i % 2 ? '#ffffff' : c2; x.beginPath(); x.arc(4 + i * 3, -3 * flap - (i * 7 % 6), 0.55, 0, 6.28); x.fill(); } } };
  const WIC = new Map(); const icW0 = UI.itemIcon; UI.itemIcon = (it) => { if (!it || it.kind !== 'fashion' || it.slot !== 'f_wings' || !it.colors) return icW0(it); const kind = WING[(it.theme || 0) % WING.length]; const c1 = it.dye || it.colors[0], c2 = it.colors[1]; const key = kind + c1 + c2; if (WIC.has(key)) return WIC.get(key);
    const [cv, x] = SPR.mk(64, 64); const g = x.createRadialGradient(32, 30, 2, 32, 30, 34); g.addColorStop(0, U.shade ? U.shade(c2, -0.55) : '#222'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    x.translate(32, 36); x.scale(1.25, 1.25); for (const sd of [-1, 1]) { x.save(); x.scale(sd, 1); x.translate(1.5, 0); wingShape(x, kind, c1, c2, 1); x.restore(); } const u = cv.toDataURL(); WIC.set(key, u); return u; };
  const drawWings = (ctx, u, sx, sy, h) => { const f = u.fashion.f_wings; const kind = WING[f.theme % WING.length]; const c1 = f.dye || f.colors[0], c2 = f.colors[1]; const t = W.time + u.id; const flap = 0.75 + 0.25 * Math.sin(t * (u.moving ? 9 : 4)); const y = sy - h * 0.62;
    ctx.save(); ctx.translate(sx, y); for (const sd of [-1, 1]) { ctx.save(); ctx.scale(sd, 1); ctx.translate(2, 0); wingShape(ctx, kind, c1, c2, flap); ctx.restore(); }
    if ((f.tier || 1) >= 8 || kind === 'crystal' || kind === 'void') { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + 0.1 * Math.sin(t * 3); for (const sd of [-1, 1]) { ctx.save(); ctx.scale(sd, 1); ctx.translate(2, 0); wingShape(ctx, kind, c2, c2, flap); ctx.restore(); } } ctx.restore(); };
  // aura + trail state
  const TRAIL = []; const trailPush = (u) => { const f = u.fashion.f_trail; if (!u.moving || W.time - (u._trT || 0) < 0.12) return; u._trT = W.time; TRAIL.push({ x: u.x + U.rf(-0.15, 0.15), y: u.y + U.rf(-0.1, 0.1), t: W.time, c: f.dye || f.colors[1], c2: f.colors[0], k: f.theme % 4 }); if (TRAIL.length > 260) TRAIL.splice(0, TRAIL.length - 260); };
  const drawTrail = (ctx) => { for (let i = TRAIL.length - 1; i >= 0; i--) { const p = TRAIL[i]; const a = 1 - (W.time - p.t) / 1.2; if (a <= 0) { TRAIL.splice(i, 1); continue; } if (!E.vis(p.x, p.y)) continue; const [sx, sy] = W.cam.w2s(p.x, p.y); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.8; ctx.fillStyle = p.c; ctx.translate(sx, sy - (1 - a) * 6 * (p.k === 1 ? 1 : 0));
      if (p.k === 0) { ctx.beginPath(); ctx.arc(0, 0, 2 * a + 0.5, 0, 7); ctx.fill(); } else if (p.k === 1) { ctx.fillRect(-1, -1, 2, 2); ctx.fillStyle = p.c2; ctx.fillRect(-0.5, -3, 1, 1); } else if (p.k === 2) { ctx.scale(1, 0.5); ctx.beginPath(); ctx.ellipse(0, 0, 3, 2, 0, 0, 7); ctx.fill(); } else { ctx.rotate(W.time * 3 + i); ctx.fillRect(-2, -0.5, 4, 1); ctx.fillRect(-0.5, -2, 1, 4); } ctx.restore(); } };
  const drawAura = (ctx, u, sx, sy, h, front) => { const f = u.fashion.f_aura; const c1 = f.dye || f.colors[1], c2 = f.colors[0]; const t = W.time + u.id;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; if (!front) { ctx.translate(sx, sy); ctx.scale(1, 0.4); glowC(ctx, 16, c1, 0.35 + 0.1 * Math.sin(t * 3)); ctx.restore(); return; }
    for (let i = 0; i < 7; i++) { const q = ((t * 0.6 + i / 7) % 1); const a = i * 0.9 + t * 0.5; const px = sx + Math.cos(a) * (7 + 3 * Math.sin(i)), py = sy - q * h * 1.1; ctx.globalAlpha = (1 - q) * 0.8; ctx.fillStyle = i % 2 ? c1 : c2; ctx.beginPath(); ctx.arc(px, py, 1.4 * (1 - q) + 0.6, 0, 7); ctx.fill(); } ctx.restore(); };
  // ---------- hook the unit renderer ----------
  E.WINGS2 = true;
  const install = () => { if (E._cos) return; E._cos = true; const du0 = E.drawUnit;
    E.drawUnit = (ctx, u) => { const fa = u.fashion; if (!fa || u.kind !== 'hero' && !u.sim || u.dead) return du0(ctx, u);
      const [sx0, sy0] = W.cam.w2s(u.x, u.y); const sx = Math.round(sx0), sy = Math.round(sy0 - (u.jz || 0) - (u.mounted ? 10 : 0)); const h = (G.CHIBI && u.kind === "hero" ? 44 : 32) * (u.sc || 1); const t = W.time + u.id * 0.3;
      if (fa.f_trail) trailPush(u);
      const O = E.octx; const hi = O && !u.mounted && (fa.f_mcf || fa.f_mcb || fa.f_mch || fa.f_wings || fa.f_aura);
      if (!hi) { if (fa.f_mcf) drawMC(ctx, fa.f_mcf, sx, sy0, 26, 0.45, t); if (fa.f_aura) drawAura(ctx, u, sx, sy0, h, false); if (fa.f_mcb) drawMC(ctx, fa.f_mcb, sx, sy - h * 0.58, 31, 1, t); if (fa.f_wings) drawWings(ctx, u, sx, sy, h);
        const r = du0(ctx, u); if (fa.f_aura) drawAura(ctx, u, sx, sy0, h, true); if (fa.f_mch) drawMC(ctx, fa.f_mch, sx, sy - h - 8 + Math.sin(t * 2) * 1.2, 12, 0.4, t); return r; }
      // crisp path: every fashion layer goes on the full-resolution overlay, with a copy of the hero sprite keeping the layer order
      const r = du0(ctx, u); const S2 = G.S2 || 2; const al = (u.stealth > 0 ? (u.team === 0 ? 0.4 : 0.15) : 1) * (u.alpha || 1);
      O.save(); O.setTransform(S2, 0, 0, S2, 0, 0); O.globalAlpha = al;
      if (fa.f_mcf) drawMC(O, fa.f_mcf, sx0, sy0, 26, 0.45, t); if (fa.f_aura) drawAura(O, u, sx, sy0, h, false); if (fa.f_mcb) drawMC(O, fa.f_mcb, sx, sy - h * 0.58, 31, 1, t); if (fa.f_wings) drawWings(O, u, sx, sy, h);
      if (fa.f_mcf || fa.f_mcb || fa.f_wings) { const si = E.spriteInfo(u); const sc = si.sc, w = si.w * sc, hh = si.h * sc; O.save(); O.globalCompositeOperation = 'source-over'; O.globalAlpha = al; O.imageSmoothingEnabled = false; O.translate(sx, sy); if (si.flip) O.scale(-1, 1); O.drawImage(si.img, si.sx, si.sy, si.w, si.h, -w / 2, -hh + 2, w, hh); O.restore(); }
      O.globalAlpha = al; if (fa.f_aura) drawAura(O, u, sx, sy0, h, true); if (fa.f_mch) drawMC(O, fa.f_mch, sx, sy - h - 8 + Math.sin(t * 2) * 1.2, 12, 0.4, t);
      O.restore();
      return r; };
    // trails sit on the ground under everyone
    const rg = V.renderGround; V.renderGround = (ctx, cam) => { const r = rg(ctx, cam); try { drawTrail(ctx); } catch (e) { } return r; }; };
  document.addEventListener('DOMContentLoaded', install); setTimeout(install, 0);
  // engine's generic wing sprite is replaced by the themed one
  // ---------- icons for the magic-circle slots ----------
  const K = UI.ICONKIT; const ic0 = UI.itemIcon;
  UI.itemIcon = (it) => { if (it && it.kind === 'fashion' && MC[it.slot]) { const key = 'mc' + it.slot + (it.mc || 0) + (it.dye || it.colors[1]) + it.colors[0]; return K.make(key, k => { const x = k.x || null; }, { spark: [[25, 6]] }) && mcIcon(it); } return ic0(it); };
  const MCI = new Map(); const mcIcon = UI.mcIcon = (it) => { const key = it.slot + (it.mc || 0) + (it.dye || it.colors[1]) + it.colors[0]; if (MCI.has(key)) return MCI.get(key); const [cv, x] = SPR.mk(64, 64); x.fillStyle = '#100c08'; x.fillRect(0, 0, 64, 64); x.scale(2, 2);
    drawMC0(x, it, 16, it.slot === 'f_mcb' ? 16 : 17, 12.5, it.slot === 'f_mcb' ? 1 : 0.62, 0.6); x.globalCompositeOperation = 'source-over'; x.fillStyle = '#ffffff'; x.font = 'bold 7px sans-serif'; x.fillText(it.slot === 'f_mch' ? '▲' : it.slot === 'f_mcf' ? '▼' : '●', 1.5, 30.5); const u = cv.toDataURL(); MCI.set(key, u); return u; };
  // ---------- magic-circle gacha ----------
  const gp0 = UI.PANELS.gacha && UI.PANELS.gacha.render; if (gp0) { UI.PANELS.gacha.render = function (tab, P) { const h = gp0.call(this, tab, P); const cost = 50000;
      const box = `<div class="gbox"><div class="gimg"><img src="${mcIcon({ slot: 'f_mcf', mc: 0, colors: ['#4a8aff', '#bff4ff'] })}" alt=""></div><b>กล่องวงแหวนเวท</b><small>สุ่มวงแหวนเวท 9 แบบ (บนหัว / ใต้เท้า / ด้านหลัง) × 10 ธีมสี</small><div class="gbtns"><button class="sprice" data-act="g-mc" data-n="1"><img src="${UI.curIcon('gold')}" alt="">${U.fmt(cost)} ×1</button><button class="sprice" data-act="g-mc" data-n="10"><img src="${UI.curIcon('gold')}" alt="">${U.fmt(cost * 9)} ×10</button></div></div>`;
      return h.replace('<div class="gboxes">', '<div class="gboxes">' + box); }; }
  const RARC = [['ธรรมดา', 6, '#8a96a8', 52], ['หายาก', 7, '#3a8aff', 28], ['มหากาพย์', 8, '#a85cff', 13], ['ตำนาน', 9, '#ff9a1e', 5.5], ['ปฐมกาล', 10, '#ff5ae8', 1.5]];
  const a0 = UI.act; UI.act = (el, e) => { const a = el.dataset.act;
    if (a === 'g-mc') { const s = S.save; const n = +el.dataset.n; const cost = n === 10 ? 50000 * 9 : 50000; if (s.gold < cost) { UI.toast('ทองไม่พอ', 'bad'); return; } s.gold -= cost; const res = [];
      for (let i = 0; i < n; i++) { let x = Math.random() * 100, ri = 0; for (let k = 0; k < RARC.length; k++) { x -= RARC[k][3]; if (x <= 0) { ri = k; break; } } const r = RARC[ri]; const slot = U.pick(['f_mch', 'f_mcf', 'f_mcb']); const it = S.genItem('fashion', r[1], 1, { slot }); s.fashion.owned.push(it); res.push({ r: { n: r[0], t: r[1], c: r[2] }, img: UI.itemIcon(it), n: it.name, it }); }
      UI.panel.res = res; S.persist(); UI.renderPanel(); UI.toast(`ได้รับวงแหวนเวท ${n} ชิ้น · ใส่ได้ที่หน้าแฟชั่น`, 'good'); return; }
    if (a === 'junk-sell') { sellJunk(); UI.renderPanel(); return; }
    return a0(el, e); };
  // ---------- junk loot ----------
  const JUNK = [['bone', 'กระดูกแตก', 4, '#e8e0c8'], ['fang', 'เขี้ยวบิ่น', 6, '#f0e8d0'], ['hide', 'หนังสัตว์ขาด', 5, '#a06a3a'], ['slime', 'เมือกเหนียว', 3, '#7fd36a'], ['feather', 'ขนนกยุ่ง', 3, '#c8c0b0'], ['rag', 'เศษผ้าขาด', 2, '#8a7a9a'],
    ['rust', 'เหล็กขึ้นสนิม', 7, '#a8704a'], ['shell', 'เปลือกแตก', 5, '#d8b88a'], ['ash', 'เถ้าถ่าน', 4, '#6a6a72'], ['shard', 'เศษคริสตัลหมอง', 9, '#8ab8d8'], ['ear', 'หูก็อบลิน', 6, '#7a9a4a'], ['tooth', 'ฟันผุ', 2, '#e8e8c0']];
  D.JUNK = JUNK;
  const JI = new Map(); UI.junkIcon = (k) => { if (JI.has(k)) return JI.get(k); const j = JUNK.find(x => x[0] === k) || JUNK[0]; const [cv, x] = SPR.mk(32, 32); x.fillStyle = '#1a1622'; x.fillRect(0, 0, 32, 32); x.fillStyle = j[3]; x.strokeStyle = '#3a2a2a'; x.lineWidth = 1.5;
    const i = JUNK.indexOf(j) % 6; x.beginPath(); if (i === 0) { x.moveTo(6, 22); x.lineTo(24, 8); x.lineTo(27, 11); x.lineTo(9, 25); } else if (i === 1) { x.moveTo(12, 6); x.quadraticCurveTo(22, 14, 16, 27); x.lineTo(10, 18); } else if (i === 2) { x.moveTo(6, 8); x.lineTo(26, 6); x.lineTo(24, 24); x.lineTo(14, 27); x.lineTo(8, 20); } else if (i === 3) { x.ellipse(16, 18, 10, 8, 0, 0, 7); } else if (i === 4) { x.moveTo(8, 26); x.quadraticCurveTo(10, 8, 24, 6); x.quadraticCurveTo(18, 18, 8, 26); } else { x.moveTo(8, 10); x.lineTo(24, 8); x.lineTo(22, 24); x.lineTo(10, 22); }
    x.closePath(); x.fill(); x.stroke(); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(12, 11, 3, 2); const u = cv.toDataURL(); JI.set(k, u); return u; };
  const sellJunk = () => { const s = S.save; s.junk = s.junk || {}; let g = 0, n = 0; for (const [k, c] of Object.entries(s.junk)) { const j = JUNK.find(x => x[0] === k); if (!j || !c) continue; g += j[2] * c * (1 + Math.floor(s.lvl / 25)); n += c; } s.junk = {}; s.gold += g; UI.toast(n ? `ขายขยะ ${n} ชิ้น ได้ ${U.fmt(g)} ทอง` : 'ไม่มีขยะให้ขาย', n ? 'good' : 'info'); S.persist(); };
  S.sellJunk = sellJunk;
  const add0 = S.addItem; S.addItem = (it, quiet) => { if (it && it.kind === 'junk') { const s = S.save; s.junk = s.junk || {}; s.junk[it.k] = (s.junk[it.k] || 0) + (it.n || 1); if (!quiet) UI.toast(`ได้รับ ${it.name}`, 'info'); return true; } return add0(it, quiet); };
  // drop from monsters
  const inst2 = () => { if (E._junk) return; E._junk = true; const k0 = E.kill; E.kill = (t, k) => { const was = t && !t.dead; const r = k0(t, k); if (was && t.dead && t.kind === 'mob' && !t.dummy && Math.random() < (t.boss ? 1 : 0.32)) { const own = k && (k.owner || k); if (own && own.team === 0) { const j = U.pick(JUNK); S.dropLoot(t.x + U.rf(-0.5, 0.5), t.y + U.rf(-0.4, 0.4), { kind: 'junk', k: j[0], name: j[1], n: t.boss ? U.ri(3, 6) : 1, tier: 1 }); } } return r; }; };
  document.addEventListener('DOMContentLoaded', inst2); setTimeout(inst2, 0);
  // bag tab: junk section with sell-all
  const ir0 = UI.PANELS.inv && UI.PANELS.inv.render; if (ir0) UI.PANELS.inv.render = function (tab, P) { const h = ir0.call(this, tab, P); if (tab !== 'bag') return h; const s = S.save; const J = Object.entries(s.junk || {}).filter(([, c]) => c > 0);
    return h + `<h4>ไอเทมขยะ (ขายได้ที่ไหนก็ได้)</h4><div class="bgrid">${J.length ? J.map(([k, c]) => { const j = JUNK.find(x => x[0] === k) || [k, k, 1]; return `<div class="bcard t1" title="${esc(j[1])} · ${j[2]} ทอง/ชิ้น"><div class="icell t1"><img src="${UI.junkIcon(k)}" alt=""><span class="qty">${c}</span></div><span>${esc(j[1])}</span></div>`; }).join('') : '<p class="muted">ยังไม่มีขยะ — ได้จากการกำจัดมอนสเตอร์</p>'}</div>${J.length ? '<button class="btn primary" data-act="junk-sell">ขายขยะทั้งหมด</button>' : ''}`; };
  // auto-sell junk when the bag is opened from a shop NPC is not needed: one button sells all
})(window.G);
// ---------- fashion now grants stats (scales with the item's tier) ----------
(function (G) {
  const D = G.D, E = G.E, UI = G.UI, S = G.S;
  const FS = { f_head: [['hpP', 0.6]], f_body: [['atkP', 0.5], ['defP', 0.5]], f_weapon: [['atkP', 0.7]], f_wings: [['spd', 0.8], ['atkP', 0.3]], f_aura: [['crit', 0.4]], f_crown: [['critDmg', 1.2]], f_mask: [['cdr', 0.3]], f_back: [['defP', 0.6]], f_float: [['aspd', 0.6]], f_trail: [['spd', 0.6]], f_frame: [['hpP', 0.4]], f_mch: [['cdr', 0.35], ['crit', 0.2]], f_mcf: [['atkP', 0.6], ['hpP', 0.3]], f_mcb: [['defP', 0.4], ['atkP', 0.4]] };
  D.FASHION_STATS = FS;
  const statsOf = it => (FS[it.slot] || []).map(([k, b]) => [k, Math.round(b * (it.tier || 1) * 10) / 10]);
  const ps0 = E.passiveStats; E.passiveStats = (u, s) => { if (ps0) ps0(u, s); const fa = u && u.fashion; if (!fa) return; for (const it of Object.values(fa)) { if (!it || !it.slot) continue; for (const [k, v] of statsOf(it)) { if (k === 'atkP') s.atk *= 1 + v / 100; else if (k === 'defP') s.def *= 1 + v / 100; else if (k === 'hpP') s.hp *= 1 + v / 100; else s[k] = (s[k] || 0) + v; } } };
  const TH = { atkP: 'ATK', defP: 'DEF', hpP: 'HP สูงสุด', spd: 'ความเร็ววิ่ง', crit: 'คริติคอล', critDmg: 'แรงคริ', cdr: 'ลดคูลดาวน์', aspd: 'ความเร็วโจมตี' };
  const det0 = UI.itemDetail; UI.itemDetail = (it, actions) => { let h = det0(it, actions); if (it && it.kind === 'fashion' && FS[it.slot]) h = h.replace('<div class="iact">', `<div class="iset"><b>ค่าพลังแฟชั่น</b><div>${statsOf(it).map(([k, v]) => `${TH[k] || k} +${v}%`).join(' · ')}</div></div><div class="iact">`); return h; };
  // re-apply stats when fashion changes
  const a0 = UI.act; UI.act = (el, e) => { const r = a0(el, e); const a = el.dataset && el.dataset.act; if ((a === 'fashequip' || a === 'fashremove') && S.refreshPlayer) try { S.refreshPlayer(); } catch (er) { } return r; };
})(window.G);
