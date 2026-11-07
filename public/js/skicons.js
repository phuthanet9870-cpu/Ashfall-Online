'use strict';
/* Painted skill icons (64×64): element-coloured radial burst, an archetype motif in the background (slash arcs,
   speed lines, vortex, shockwave rings, beam, chain links, shield dome, healing cross …), the skill's own glowing
   symbol pair with a white-hot core, sparks, vignette and a bevelled slot frame. Unique per skill (symbol pair +
   archetype + per-skill angle), cached. */
(function (G) {
  const U = G.U, D = G.D, UI = G.UI, FX = G.FX, SPR = G.SPR; if (!FX || !FX.drawShape) return;
  const N = 64, cache = new Map();
  const sh = (c, f) => U.shade ? U.shade(c, f) : c;
  const hashOf = s => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const palOf = s => { const e = D.ELEM && D.ELEM[s.elem]; const p = e ? e.pal : ['#ffffff', '#ffd84a', '#c87a1a', '#3a1a08']; return [p[0] || '#ffffff', p[1] || p[0], p[2] || p[1], p[3] || '#1a0a10']; };
  const MOT = {
    slash: (x, P, a) => { for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(32, 34, 22 - i * 5, a - 1.3, a + 1.3); x.lineWidth = 6 - i * 1.6; x.strokeStyle = i ? P[1] : P[0]; x.globalAlpha = 0.75 - i * 0.18; x.stroke(); } },
    spin: (x, P, a) => { for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(32, 32, 24 - i * 4, a + i * 2.1, a + i * 2.1 + 2.4); x.lineWidth = 4; x.strokeStyle = P[1]; x.globalAlpha = 0.7; x.stroke(); } },
    thrust: (x, P, a) => { for (let i = -3; i <= 3; i++) { x.globalAlpha = 0.5 - Math.abs(i) * 0.1; x.strokeStyle = P[0]; x.lineWidth = 2; x.beginPath(); x.moveTo(4, 32 + i * 5); x.lineTo(54, 32 + i * 1.2); x.stroke(); } },
    proj: (x, P, a) => { x.save(); x.translate(32, 32); x.rotate(a); for (let i = 0; i < 9; i++) { x.globalAlpha = 0.25 + (i % 3) * 0.12; x.strokeStyle = i % 2 ? P[0] : P[1]; x.lineWidth = 1.5 + (i % 3); x.beginPath(); x.moveTo(-34, -14 + i * 3.5); x.lineTo(-4 - (i % 4) * 4, -6 + i * 1.5); x.stroke(); } x.restore(); },
    nova: (x, P) => { for (let i = 0; i < 4; i++) { x.globalAlpha = 0.55 - i * 0.1; x.strokeStyle = i % 2 ? P[0] : P[1]; x.lineWidth = 3 - i * 0.5; x.beginPath(); x.arc(32, 32, 8 + i * 7, 0, 6.2832); x.stroke(); } },
    ground: (x, P) => { x.globalAlpha = 0.65; x.fillStyle = P[1]; x.beginPath(); x.ellipse(32, 48, 26, 8, 0, 0, 6.2832); x.fill(); for (let i = 0; i < 7; i++) { const px = 10 + i * 7.5, h = 10 + (i * 37 % 14); x.globalAlpha = 0.7; x.fillStyle = i % 2 ? P[0] : P[2]; x.beginPath(); x.moveTo(px - 3, 50); x.lineTo(px, 50 - h); x.lineTo(px + 3, 50); x.fill(); } },
    zone: (x, P, a) => { x.save(); x.translate(32, 36); x.scale(1, 0.55); for (let i = 0; i < 3; i++) { x.globalAlpha = 0.6 - i * 0.15; x.strokeStyle = P[1]; x.lineWidth = 2.4; x.setLineDash([6, 4]); x.beginPath(); x.arc(0, 0, 14 + i * 8, a, a + 6.2832); x.stroke(); } x.restore(); x.setLineDash([]); },
    beam: (x, P, a) => { x.save(); x.translate(32, 32); x.rotate(a); const g = x.createLinearGradient(0, -8, 0, 8); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, P[0]); g.addColorStop(1, 'rgba(0,0,0,0)'); x.globalAlpha = 0.85; x.fillStyle = g; x.fillRect(-40, -8, 80, 16); x.fillStyle = '#ffffff'; x.globalAlpha = 0.9; x.fillRect(-40, -1.5, 80, 3); x.restore(); },
    chain: (x, P, a) => { x.save(); x.translate(32, 32); x.rotate(a); x.globalAlpha = 0.8; x.strokeStyle = P[0]; x.lineWidth = 2; x.beginPath(); let px = -30, py = 0; x.moveTo(px, py); for (let i = 0; i < 8; i++) { px += 8; py = (i % 2 ? -1 : 1) * (4 + (i * 7 % 5)); x.lineTo(px, py); } x.stroke(); x.restore(); },
    dash: (x, P) => { for (let i = 0; i < 6; i++) { x.globalAlpha = 0.25 + i * 0.08; x.fillStyle = P[1]; x.beginPath(); x.ellipse(14 + i * 6, 32, 10 - i, 3 + i * 0.6, 0, 0, 6.2832); x.fill(); } },
    leap: (x, P) => { x.globalAlpha = 0.6; x.strokeStyle = P[0]; x.lineWidth = 2.4; x.beginPath(); x.moveTo(6, 54); x.quadraticCurveTo(32, -6, 58, 54); x.stroke(); x.fillStyle = P[1]; x.beginPath(); x.ellipse(32, 54, 18, 5, 0, 0, 6.2832); x.fill(); },
    barrage: (x, P, a) => { for (let i = 0; i < 7; i++) { const an = a + i * 0.9, r = 12 + (i * 5 % 14); x.globalAlpha = 0.7; x.fillStyle = i % 2 ? P[0] : P[1]; x.beginPath(); x.arc(32 + Math.cos(an) * r, 32 + Math.sin(an) * r, 2.5 + i % 3, 0, 6.2832); x.fill(); } },
    summon: (x, P, a) => { x.save(); x.translate(32, 44); x.scale(1, 0.45); x.globalAlpha = 0.8; x.strokeStyle = P[1]; x.lineWidth = 2; x.beginPath(); x.arc(0, 0, 24, 0, 6.2832); x.stroke(); x.beginPath(); for (let i = 0; i <= 5; i++) { const an = a + i * 2 * 2.513; x.lineTo(Math.cos(an) * 24, Math.sin(an) * 24); } x.stroke(); x.restore(); },
    turret: (x, P) => { x.globalAlpha = 0.6; x.fillStyle = P[2]; x.fillRect(20, 40, 24, 14); x.fillStyle = P[1]; x.fillRect(26, 30, 12, 12); },
    trap: (x, P, a) => { x.globalAlpha = 0.7; x.strokeStyle = P[1]; x.lineWidth = 2; for (let i = 0; i < 8; i++) { const an = a + i * 0.785; x.beginPath(); x.moveTo(32 + Math.cos(an) * 10, 40 + Math.sin(an) * 5); x.lineTo(32 + Math.cos(an) * 24, 40 + Math.sin(an) * 12); x.stroke(); } },
    buff: (x, P) => { for (let i = 0; i < 5; i++) { x.globalAlpha = 0.5; x.fillStyle = P[1]; x.beginPath(); const px = 12 + i * 10; x.moveTo(px, 50); x.lineTo(px + 4, 40 - (i % 2) * 8); x.lineTo(px + 8, 50); x.fill(); } },
    shield: (x, P) => { x.globalAlpha = 0.5; const g = x.createRadialGradient(32, 40, 4, 32, 40, 30); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.8, P[1]); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.beginPath(); x.arc(32, 42, 30, Math.PI, 0); x.fill(); },
    heal: (x, P) => { x.globalAlpha = 0.45; x.fillStyle = P[1]; x.fillRect(26, 8, 12, 48); x.fillRect(8, 26, 48, 12); for (let i = 0; i < 8; i++) { x.globalAlpha = 0.7; x.fillStyle = '#ffffff'; x.beginPath(); x.arc(8 + (i * 23 % 48), 56 - (i * 13 % 44), 1.4, 0, 6.2832); x.fill(); } },
    blink: (x, P) => { for (let i = 0; i < 3; i++) { x.globalAlpha = 0.25 + i * 0.2; x.fillStyle = P[1]; x.beginPath(); x.ellipse(14 + i * 14, 32, 6, 14, 0, 0, 6.2832); x.fill(); } },
    stealth: (x, P) => { x.globalAlpha = 0.5; x.fillStyle = '#000000'; x.beginPath(); x.arc(32, 32, 24, 0, 6.2832); x.fill(); x.globalAlpha = 0.8; x.strokeStyle = P[1]; x.lineWidth = 1.4; x.setLineDash([3, 3]); x.beginPath(); x.arc(32, 32, 20, 0, 6.2832); x.stroke(); x.setLineDash([]); }
  };
  const paint = (s, pair) => { const key = s.id + '|' + (s.variant || 0) + '|' + s.cls; if (cache.has(key)) return cache.get(key); const [cv, x] = SPR.mk(N, N); const P = palOf(s); const h = hashOf(s.id); const a = (h % 628) / 100;
    // backdrop
    let g = x.createRadialGradient(32, 32, 2, 32, 32, 46); g.addColorStop(0, sh(P[2], 0.05)); g.addColorStop(0.45, sh(P[2], -0.35)); g.addColorStop(0.8, sh(P[3], -0.35)); g.addColorStop(1, '#050308'); x.fillStyle = g; x.fillRect(0, 0, N, N);
    // rays
    x.save(); x.translate(32, 32); x.rotate(a); x.globalCompositeOperation = 'lighter'; for (let i = 0; i < 14; i++) { x.rotate(6.2832 / 14); x.globalAlpha = 0.04 + (i % 3) * 0.025; x.fillStyle = P[1]; x.beginPath(); x.moveTo(0, 0); x.lineTo(-3, -46); x.lineTo(3, -46); x.fill(); } x.restore();
    // archetype motif
    x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.55; const ga = x.globalAlpha; const sa = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'globalAlpha'); (MOT[s.arch] || MOT.nova)(new Proxy(x, { get: (o, k) => { const v = o[k]; return typeof v === 'function' ? v.bind(o) : v; }, set: (o, k, v) => { o[k] = k === 'globalAlpha' ? v * 0.55 : v; return true; } }), P, a); x.restore(); x.globalAlpha = 1;
    // main symbol: outer glow → body → white-hot core
    const main = pair[0], sub = pair[1]; const rot = ['sword', 'lance', 'arrow', 'bullet', 'spear', 'rocket', 'blade', 'shard', 'bone', 'lkknife'].includes(main) ? -0.78 : 0;
    x.save(); x.translate(32, 32); x.rotate(rot); x.shadowColor = P[1]; x.shadowBlur = 10; x.globalAlpha = 0.95; FX.drawShape(x, main, 19, sh(P[2], -0.2), P[3], 0.4); x.shadowBlur = 0; x.globalAlpha = 1; FX.drawShape(x, main, 16.5, P[1], P[3], 0.4); FX.drawShape(x, main, 13, P[0], P[2], 0.4);
    x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.25; FX.drawShape(x, main, 7, '#ffffff', '#ffffff', 0.4); x.restore();
    if (sub) { x.save(); x.translate(48, 48); x.fillStyle = 'rgba(8,6,12,.75)'; x.beginPath(); x.arc(0, 0, 10, 0, 6.2832); x.fill(); x.strokeStyle = P[1]; x.lineWidth = 1.4; x.stroke(); x.shadowColor = P[1]; x.shadowBlur = 6; FX.drawShape(x, sub, 7, P[0], P[2], 0.4); x.restore(); }
    // sparks
    x.save(); x.globalCompositeOperation = 'lighter'; for (let i = 0; i < 10; i++) { const an = a + i * 2.4, r = 14 + (i * 17 % 18); const px = 32 + Math.cos(an) * r, py = 32 + Math.sin(an) * r; x.globalAlpha = 0.5 + (i % 3) * 0.15; x.fillStyle = i % 2 ? '#ffffff' : P[0]; x.beginPath(); x.arc(px, py, 0.7 + (i % 3) * 0.5, 0, 6.2832); x.fill(); } x.restore();
    // vignette + bevel frame
    g = x.createRadialGradient(32, 32, 22, 32, 32, 46); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.65)'); x.fillStyle = g; x.fillRect(0, 0, N, N);
    const fc = s.ult ? ['#ffe9a0', '#b8862a', '#4a3008'] : (s.idx >= 20 ? ['#ffe9a0', '#b8862a', '#4a3008'] : s.idx >= 15 ? ['#bff4ef', '#3aa89c', '#0e3a36'] : ['#e8d2b0', '#8a6a44', '#2a1a0c']);
    x.lineWidth = 3; x.strokeStyle = fc[2]; x.strokeRect(1.5, 1.5, N - 3, N - 3); x.lineWidth = 1.4; x.strokeStyle = fc[1]; x.strokeRect(3, 3, N - 6, N - 6); x.strokeStyle = fc[0]; x.globalAlpha = 0.7; x.beginPath(); x.moveTo(3, N - 4); x.lineTo(3, 3); x.lineTo(N - 4, 3); x.stroke(); x.globalAlpha = 1;
    if (s.ult) { x.fillStyle = '#ffe24a'; for (const [cx, cy] of [[6, 6], [N - 6, 6], [6, N - 6], [N - 6, N - 6]]) { x.beginPath(); x.moveTo(cx, cy - 4); x.lineTo(cx + 2, cy); x.lineTo(cx, cy + 4); x.lineTo(cx - 2, cy); x.fill(); } }
    if (s.variant) { const vc = ['', '#4ad6c8', '#ff7a3a', '#ffe04a'][s.variant]; x.fillStyle = '#0c0a10'; x.fillRect(4, N - 16, 12, 12); x.fillStyle = vc; x.fillRect(6, N - 14, 8, 8); }
    const url = cv.toDataURL(); cache.set(key, url); if (cache.size > 1500) cache.delete(cache.keys().next().value); return url; };
  let mine = null; const hook = () => { if (!UI.skillIcon || UI.skillIcon === mine) return; const si0 = UI.skillIcon; mine = UI.skillIcon = (s) => { if (!s || !s.id) return si0(s); const pair = (G.FX6 && G.FX6.iconShapes && s.cls && s.idx != null && (() => { try { return G.FX6.iconShapes(s.cls, s.idx); } catch (e) { return null; } })()) || [(G.FX6 && G.FX6.STY && G.FX6.STY[s.cls] && G.FX6.STY[s.cls].sh && G.FX6.STY[s.cls].sh[0]) || 'star', null]; try { return paint(s, pair); } catch (e) { return si0(s); } }; };
  setTimeout(hook, 0); document.addEventListener('DOMContentLoaded', hook); let n = 0; const iv = setInterval(() => { hook(); if (++n > 40) clearInterval(iv); }, 250); G.SKICON_HOOK = hook;
})(window.G);
