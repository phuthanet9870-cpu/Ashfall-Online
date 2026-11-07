'use strict';
/* Classic MMO damage numbers: chunky bitmap digits with a hard black outline.
   Critical → big yellow digits over a red spiky starburst with a punch-in scale; normal hits → small white/gray
   digits that pop and drift up; damage taken → red; heals → green. Other floating words keep the old style. */
(function (G) {
  const V = G.VFX, SPR = G.SPR; if (!V || !V.renderTexts) return;
  // 5×7 digit font
  const GL = { '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'], '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'], '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'], '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'], '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
    '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'], '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'], '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'], '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'], '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
    'K': ['10001', '10010', '10100', '11000', '10100', '10010', '10001'], 'M': ['10001', '11011', '10101', '10101', '10001', '10001', '10001'], 'B': ['11110', '10001', '10001', '11110', '10001', '10001', '11110'], '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'], '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'], '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'] };
  const PAL = { crit: ['#fff6a0', '#ffd21a', '#c88a00'], norm: ['#ffffff', '#e4e4e4', '#9a9a9a'], hurt: ['#ffb0a0', '#ff4a3a', '#a01a10'], heal: ['#c8ffc8', '#5ae05a', '#1a8a2a'], other: ['#e8e0f4', '#b8b0c8', '#7a7090'] };
  const cache = new Map();
  // a glyph drawn at unit u: 1px outline on every side, top rows lighter (bevel)
  const glyph = (ch, pal, u) => { const key = ch + pal + u; if (cache.has(key)) return cache.get(key); const g = GL[ch]; if (!g) return null; const P = PAL[pal]; const w = (5 + 2) * u, h = (7 + 2) * u; const [cv, x] = SPR.mk(w, h);
    x.fillStyle = '#000'; for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (g[r][c] === '1') x.fillRect(c * u, r * u, u * 3, u * 3);
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (g[r][c] === '1') { x.fillStyle = r < 2 ? P[0] : r < 5 ? P[1] : P[2]; x.fillRect((c + 1) * u, (r + 1) * u, u, u); }
    const o = { cv, w, h }; cache.set(key, o); return o; };
  const burst = (() => { let c = null; return () => { if (c) return c; const S = 128; const [cv, x] = SPR.mk(S, S); const n = 11; x.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * 6.283 - 1.57, r = i % 2 ? S * 0.2 : S * (0.42 + ((i * 7) % 5) * 0.015); x.lineTo(S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r); } x.closePath();
    const g = x.createRadialGradient(S / 2, S / 2, 4, S / 2, S / 2, S * 0.45); g.addColorStop(0, '#ff6a4a'); g.addColorStop(0.6, '#d8281e'); g.addColorStop(1, '#8a0a0a'); x.fillStyle = g; x.fill(); x.lineWidth = 3; x.strokeStyle = '#3a0404'; x.stroke(); return c = cv; }; })();
  const isNum = s => /^[+]?[0-9][0-9.KMB]*!?$/.test(s);
  const palOf = t => t.crit || (t.color === '#ffd84a' && /!$/.test(t.txt)) ? 'crit' : t.color === '#ff5a5a' ? 'hurt' : t.color === '#6be07a' ? 'heal' : t.color === '#ffffff' ? 'norm' : 'other';
  const r0 = V.renderTexts; V.renderTexts = (ctx, cam, F = 2) => { const rest = [];
    for (const t of V.texts) { if (!isNum(t.txt)) { rest.push(t); continue; } const pal = palOf(t); const crit = pal === 'crit'; const txt = t.txt.replace('!', ''); const k = t.t / t.dur;
      const [sx, sy] = cam.w2s(t.x, t.y); const u = Math.max(1, Math.round((crit ? 2.16 : t.size >= 8 ? 1.22 : 0.95) * F / 2 * 10) / 10);
      const pop = crit ? (k < 0.12 ? 1.9 - k / 0.12 * 0.9 : 1) : (k < 0.08 ? 1.3 - k / 0.08 * 0.3 : 1);
      const gs = [...txt].map(ch => glyph(ch, pal, u)).filter(Boolean); const tw = gs.reduce((a, g) => a + g.w, 0); const X = sx * F, Y = (sy - t.z) * F;
      ctx.save(); ctx.globalAlpha = k > 0.72 ? (1 - k) / 0.28 : 1; ctx.imageSmoothingEnabled = false; ctx.translate(Math.round(X), Math.round(Y)); ctx.scale(pop, pop);
      if (crit) { const b = burst(); const bs = Math.max(tw * 1.15, 9 * u * 2.2); ctx.save(); ctx.rotate((t.x * 13 % 1) * 0.6 + k * 0.4); ctx.globalAlpha *= 0.92; ctx.drawImage(b, -bs / 2, -bs / 2, bs, bs); ctx.restore(); }
      let cx = -tw / 2; const gh = gs.length ? gs[0].h : 0; for (const g of gs) { ctx.drawImage(g.cv, Math.round(cx), Math.round(-gh / 2)); cx += g.w; }
      ctx.restore(); }
    if (rest.length) { const all = V.texts; V.texts = rest; try { r0(ctx, cam, F); } finally { V.texts = all; } } ctx.globalAlpha = 1; };
  // crits fly a little longer and normal numbers stack upward like a column
  const tx0 = V.text; V.text = (x, y, txt, color, o = {}) => { const r = tx0(x, y, txt, color, o); const t = V.texts[V.texts.length - 1]; if (t && isNum(String(txt))) { if (o.crit || /!$/.test(txt)) { t.dur = 1.15; t.vz = 22; t.x = x; } else { t.vz = 34; t.x = x + (Math.random() - 0.5) * 0.25; } } return r; };
})(window.G);
