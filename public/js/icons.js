'use strict';
/* Icon kit: 32px pixel icons with auto shading + outline for every item, consumable, currency, pet, mount and menu entry */
(function (G) {
  const U = G.U, D = G.D, SPR = G.SPR, UI = G.UI;
  const N = 32, cache = new Map();
  const sh = (c, k) => U.shade(c, k);
  // tier metal + accent colours
  const METAL = ['#b4b4ac', '#bcd0b4', '#b4cce8', '#ccbcec', '#ecc8a0', '#ecb4b4', '#dcaa78', '#ffe08a', '#c8f8ff', '#ffc8f8'];
  const ACC = ['#8a6a4a', '#4ac85a', '#3a94ff', '#a85cff', '#ff8a1e', '#ff3d3d', '#c8783f', '#ffc81a', '#2ad8ff', '#ff5ae8'];
  const WOOD = '#8a5a34', LEATHER = '#7a4a2a', OUT = '#1e1a2e';

  function canvas() { const [cv, x] = SPR.mk(N, N); return [cv, x]; }
  function kit(x) {
    const R = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h)); };
    const L = (x0, y0, x1, y1, w, c) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); x.fillStyle = c; for (let i = 0; i <= n; i++) { const t = i / n; x.fillRect(Math.round(x0 + (x1 - x0) * t - w / 2), Math.round(y0 + (y1 - y0) * t - w / 2), w, w); } };
    const C = (cx, cy, r, c) => { x.fillStyle = c; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); };
    const E = (cx, cy, rx, ry, c) => { x.fillStyle = c; x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, 7); x.fill(); };
    const P = (pts, c) => { x.fillStyle = c; x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); x.fill(); };
    const A = (cx, cy, r, a0, a1, w, c) => { x.strokeStyle = c; x.lineWidth = w; x.beginPath(); x.arc(cx, cy, r, a0, a1); x.stroke(); };
    return { R, L, C, E, P, A, x };
  }
  // crisp alpha, auto light (top-left) / shadow (bottom-right), outline
  function finish(cv, x, o = {}) {
    const id = x.getImageData(0, 0, N, N), d = id.data;
    for (let i = 3; i < d.length; i += 4) d[i] = d[i] < 110 ? 0 : 255;
    const src = new Uint8ClampedArray(d); const op = (i, j) => i >= 0 && j >= 0 && i < N && j < N && src[(j * N + i) * 4 + 3] > 0;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const q = (j * N + i) * 4;
      if (src[q + 3]) {
        if (o.noShade) continue;
        let k = 0; if (!op(i - 1, j) || !op(i, j - 1)) k = 0.28; else if (!op(i + 1, j) || !op(i, j + 1)) k = -0.3; else if (!op(i + 2, j + 1) || !op(i + 1, j + 2)) k = -0.12;
        if (k) { const f = k > 0 ? (c => c + (255 - c) * k) : (c => c * (1 + k)); d[q] = f(src[q]); d[q + 1] = f(src[q + 1]); d[q + 2] = f(src[q + 2]); }
      } else if (op(i - 1, j) || op(i + 1, j) || op(i, j - 1) || op(i, j + 1)) { d[q] = 30; d[q + 1] = 26; d[q + 2] = 46; d[q + 3] = 255; }
    }
    x.putImageData(id, 0, 0);
    if (o.spark) { x.fillStyle = '#ffffff'; for (const [a, b] of o.spark) { x.fillRect(a, b - 1, 1, 3); x.fillRect(a - 1, b, 3, 1); } }
    return cv.toDataURL();
  }
  const make = (key, fn, o) => { if (cache.has(key)) return cache.get(key); const [cv, x] = canvas(); fn(kit(x)); const url = finish(cv, x, typeof o === 'function' ? o() : o); cache.set(key, url); return url; };
  const sparkFor = t => t >= 8 ? [[6, 6], [26, 10], [9, 25]].slice(0, t - 7) : null;

  // ---------------- weapons ----------------
  const blade = (K, m, a, w = 3, len = 1) => { const { L, R, P } = K; L(9, 23, 9 + 15 * len, 23 - 15 * len, w, m); L(10, 22, 9 + 14 * len, 23 - 15 * len, 1, sh(m, 0.45)); P([[9 + 15 * len - 2, 23 - 15 * len - 1], [9 + 15 * len + 3, 23 - 15 * len - 3], [9 + 15 * len + 1, 23 - 15 * len + 2]], m); };
  const W = {
    sword: (K, m, a) => { blade(K, m, a); K.L(6, 19, 13, 26, 2, a); K.L(5, 26, 8, 23, 3, WOOD); K.C(4, 27, 2, a); },
    greatsword: (K, m, a) => { blade(K, sh(m, -0.25), a, 5, 1.05); K.L(10, 22, 23, 9, 1, '#ff5af5'); K.L(5, 18, 14, 27, 3, a); K.L(4, 27, 7, 24, 3, '#3a2a4a'); K.C(3, 28, 2, '#ff5af5'); },
    mace: (K, m, a) => { K.L(7, 26, 18, 13, 3, WOOD); K.C(21, 10, 6, m); for (let i = 0; i < 8; i++) { const g = i / 8 * 6.28; K.L(21 + Math.cos(g) * 5, 10 + Math.sin(g) * 5, 21 + Math.cos(g) * 8, 10 + Math.sin(g) * 8, 2, m); } K.C(21, 10, 2, a); },
    axe: (K, m, a) => { K.L(7, 27, 22, 6, 3, WOOD); K.P([[18, 5], [28, 6], [29, 17], [20, 13]], m); K.L(27, 7, 28, 16, 1, sh(m, 0.5)); K.C(20, 10, 1.5, a); },
    hammer: (K, m, a) => { K.L(7, 27, 19, 11, 3, WOOD); K.P([[13, 4], [26, 13], [21, 20], [8, 11]], m); K.L(14, 9, 20, 13, 2, a); },
    staff: (K, m, a) => { K.L(6, 28, 22, 10, 3, WOOD); K.A(23, 8, 5, 0.5, 4.6, 2, m); K.C(23, 8, 3.5, a); K.R(22, 6, 2, 2, '#ffffff'); },
    orb: (K, m, a) => { K.P([[9, 27], [23, 27], [20, 22], [12, 22]], m); K.C(16, 13, 9, a); K.C(13, 10, 3, sh(a, 0.5)); K.R(11, 8, 2, 2, '#ffffff'); },
    scythe: (K, m, a) => { K.L(9, 28, 19, 4, 2, WOOD); K.P([[18, 4], [30, 9], [28, 15], [24, 10], [18, 8]], m); K.L(20, 6, 28, 10, 1, sh(m, 0.5)); K.C(10, 26, 2, a); },
    book: (K, m, a) => { K.R(6, 5, 20, 23, sh(a, -0.35)); K.R(8, 6, 17, 21, a); K.R(24, 6, 2, 22, '#f0e8d0'); K.C(16, 15, 4, m); K.R(15, 9, 2, 12, m); },
    tome: (K, m, a) => { K.R(6, 5, 20, 23, '#3a1a2a'); K.R(8, 6, 17, 21, '#6a2a3a'); K.R(24, 6, 2, 22, '#e0d0b0'); K.C(16, 15, 5, a); K.C(16, 15, 2, '#1a0a10'); K.L(8, 6, 12, 10, 2, m); K.L(25, 27, 21, 23, 2, m); },
    daggers: (K, m, a) => { K.L(7, 25, 19, 8, 2, m); K.L(25, 25, 13, 8, 2, m); K.L(5, 22, 11, 25, 2, a); K.L(27, 22, 21, 25, 2, a); K.L(5, 28, 8, 25, 2, LEATHER); K.L(27, 28, 24, 25, 2, LEATHER); },
    blades: (K, m, a) => { K.L(6, 26, 21, 5, 3, m); K.L(26, 26, 11, 5, 3, m); K.L(4, 22, 11, 27, 2, a); K.L(28, 22, 21, 27, 2, a); },
    bow: (K, m, a) => { K.A(8, 16, 13, -1.25, 1.25, 3, WOOD); K.L(12, 4, 12, 28, 1, '#e8e4d8'); K.L(12, 16, 28, 16, 1, m); K.P([[26, 13], [30, 16], [26, 19]], m); K.C(19, 16, 1.5, a); },
    starbow: (K, m, a) => { K.A(8, 16, 13, -1.25, 1.25, 3, '#3a3a8a'); K.L(12, 4, 12, 28, 1, '#fff2a8'); K.L(12, 16, 26, 16, 1, '#fff2a8'); K.P([[24, 9], [26, 14], [31, 16], [26, 18], [24, 23], [22, 18], [17, 16], [22, 14]], '#fff2a8'); },
    rifle: (K, m, a) => { K.L(4, 24, 28, 9, 3, m); K.P([[3, 22], [9, 20], [10, 27], [4, 29]], WOOD); K.R(14, 17, 3, 5, '#3a3a44'); K.R(19, 12, 4, 2, a); },
    wrench: (K, m, a) => { K.L(7, 25, 21, 11, 4, m); K.C(23, 9, 5, m); K.R(23, 4, 4, 5, 'rgba(0,0,0,0)'); x0(K, 22, 4, 6, 5); K.C(7, 25, 3, a); },
    fists: (K, m, a) => { K.R(7, 10, 18, 14, m); for (let i = 0; i < 4; i++) K.C(10 + i * 4, 10, 2.4, sh(m, 0.2)); K.R(7, 20, 18, 4, LEATHER); K.R(14, 14, 4, 3, a); },
    demonclaw: (K, m, a) => { K.R(6, 15, 16, 12, '#4a1a2a'); for (let i = 0; i < 4; i++) K.P([[7 + i * 4, 16], [10 + i * 4, 16], [14 + i * 5, 3 + i]], '#ff6a3a'); K.C(14, 21, 2, a); },
    spear: (K, m, a) => { K.L(5, 28, 22, 10, 2, WOOD); K.P([[20, 12], [29, 2], [24, 14]], m); K.L(19, 11, 23, 15, 2, a); },
    halospear: (K, m, a) => { K.L(5, 28, 21, 11, 2, '#e8d8a0'); K.P([[19, 13], [30, 2], [23, 15]], '#fffbe8'); K.A(23, 9, 6, 0, 6.3, 1, '#ffe680'); },
    hourglass: (K, m, a) => { K.R(7, 4, 18, 3, WOOD); K.R(7, 25, 18, 3, WOOD); K.P([[9, 7], [23, 7], [17, 16], [23, 25], [9, 25], [15, 16]], '#d8f0ff'); K.P([[11, 8], [21, 8], [16, 14]], a); K.P([[12, 24], [20, 24], [16, 19]], a); },
    prism: (K, m, a) => { K.L(7, 28, 18, 14, 3, '#e8e4f0'); K.P([[22, 2], [28, 10], [22, 18], [16, 10]], '#fff6a0'); K.L(22, 4, 22, 16, 1, '#ffffff'); },
    lurerod: (K, m, a) => { K.L(4, 28, 24, 4, 2, '#2a1a3a'); K.L(24, 4, 26, 18, 1, '#a06aff'); K.C(26, 21, 3, '#ffe680'); K.C(26, 21, 1, '#ffffff'); },
    scepter: (K, m, a) => { K.L(8, 28, 18, 13, 3, '#ffe08a'); K.P([[14, 6], [17, 2], [20, 6], [24, 3], [23, 12], [13, 12], [12, 3]], '#ffd84a'); K.C(18, 9, 2, '#ff5ae8'); },
    trickstaff: (K, m, a) => { K.L(7, 29, 17, 12, 3, '#3a2a18'); K.A(12, 8, 6, 2.6, 5.4, 2, '#e8c04a'); K.A(22, 8, 6, 4, 6.8, 2, '#e8c04a'); K.C(17, 10, 3.5, '#a8ff3a'); K.R(16, 8, 2, 2, '#f6ffd8'); K.L(13, 18, 21, 20, 1, '#1f8a4a'); },
    jesterstick: (K, m, a) => { K.L(7, 28, 18, 12, 2, '#8a3ac8'); K.C(20, 9, 5, '#ffe0c0'); K.P([[15, 6], [11, 1], [19, 4]], '#ff4a6a'); K.P([[25, 6], [29, 1], [21, 4]], '#4a9aff'); K.C(11, 2, 1.6, '#ffd84a'); K.C(29, 2, 1.6, '#ffd84a'); K.R(18, 9, 1, 1, '#1a1a1a'); K.R(21, 9, 1, 1, '#1a1a1a'); }
  };
  function x0(K, a, b, w, h) { K.x.clearRect(a, b, w, h); }

  // ---------------- armour / accessories ----------------
  const ARM = {
    offhand: (K, m, a) => { K.P([[6, 5], [26, 5], [26, 16], [16, 28], [6, 16]], m); K.P([[9, 8], [23, 8], [23, 15], [16, 24], [9, 15]], a); K.R(15, 8, 2, 16, m); K.R(9, 13, 14, 2, m); },
    head: (K, m, a) => { K.E(16, 15, 11, 10, m); K.R(5, 15, 22, 9, m); x0(K, 9, 17, 14, 3); K.R(15, 3, 2, 10, a); K.P([[14, 2], [18, 2], [16, 0]], a); K.R(5, 22, 6, 4, m); K.R(21, 22, 6, 4, m); },
    chest: (K, m, a) => { K.P([[8, 4], [12, 4], [16, 8], [20, 4], [24, 4], [29, 9], [26, 14], [24, 13], [24, 28], [8, 28], [8, 13], [6, 14], [3, 9]], m); K.R(15, 9, 2, 18, a); K.R(9, 18, 14, 2, sh(m, -0.2)); K.C(16, 13, 2, a); },
    gloves: (K, m, a) => { K.R(8, 12, 15, 13, m); K.R(8, 6, 3, 8, m); K.R(12, 4, 3, 9, m); K.R(16, 5, 3, 8, m); K.R(20, 8, 3, 6, m); K.L(22, 17, 27, 13, 3, m); K.R(8, 23, 15, 5, a); },
    legs: (K, m, a) => { K.R(7, 4, 18, 6, a); K.P([[7, 9], [15, 9], [14, 28], [8, 28]], m); K.P([[17, 9], [25, 9], [24, 28], [18, 28]], m); K.R(14, 5, 4, 4, '#ffe08a'); },
    boots: (K, m, a) => { K.P([[8, 3], [17, 3], [17, 20], [27, 22], [27, 28], [8, 28]], m); K.R(8, 3, 9, 4, a); K.R(8, 25, 19, 3, sh(m, -0.4)); K.R(10, 12, 5, 2, a); },
    necklace: (K, m, a) => { K.A(16, 8, 10, 0.3, 2.85, 2, '#e8e0c8'); K.P([[16, 16], [22, 22], [16, 30], [10, 22]], a); K.C(16, 22, 2, sh(a, 0.5)); },
    earring1: (K, m, a) => { K.A(16, 6, 4, 0, 6.3, 2, '#e8e0c8'); K.L(16, 10, 16, 14, 1, '#e8e0c8'); K.P([[16, 13], [22, 20], [16, 29], [10, 20]], a); },
    ring1: (K, m, a) => { K.A(16, 19, 8, 0, 6.3, 3, METAL[7]); K.P([[12, 4], [20, 4], [22, 8], [16, 13], [10, 8]], a); K.R(13, 6, 2, 2, '#ffffff'); },
    bracelet: (K, m, a) => { K.E(16, 16, 12, 8, m); x0(K, 8, 12, 16, 8); K.x.clearRect(9, 11, 14, 10); K.C(16, 9, 3, a); K.C(7, 16, 2, a); K.C(25, 16, 2, a); },
    belt: (K, m, a) => { K.R(2, 12, 28, 8, LEATHER); K.R(12, 10, 9, 12, '#ffd84a'); K.R(14, 13, 5, 6, sh(a, -0.2)); K.R(24, 14, 2, 4, '#3a2a1a'); },
    talisman: (K, m, a) => { K.R(9, 3, 14, 24, '#f0e4c0'); K.R(11, 6, 10, 2, a); K.C(16, 14, 4, a); K.R(11, 21, 10, 2, a); K.L(16, 27, 14, 31, 1, '#c83a3a'); K.L(16, 27, 18, 31, 1, '#c83a3a'); },
    brooch: (K, m, a) => { for (let i = 0; i < 8; i++) { const g = i / 8 * 6.28; K.C(16 + Math.cos(g) * 9, 16 + Math.sin(g) * 9, 3, METAL[7]); } K.C(16, 16, 8, METAL[7]); K.C(16, 16, 5, a); K.R(14, 13, 2, 2, '#ffffff'); },
    cloak: (K, m, a) => { K.P([[10, 3], [22, 3], [28, 28], [16, 25], [4, 28]], a); K.P([[12, 5], [20, 5], [16, 22]], sh(a, -0.35)); K.C(16, 5, 3, '#ffd84a'); },
    relic: (K, m, a) => { K.P([[16, 1], [20, 12], [31, 16], [20, 20], [16, 31], [12, 20], [1, 16], [12, 12]], a); K.C(16, 16, 5, '#ffffff'); K.C(16, 16, 3, sh(a, 0.3)); }
  };
  ARM.earring2 = ARM.earring1; ARM.ring2 = ARM.ring1;

  // ---------------- runes / gems / fashion ----------------
  const runeIcon = (K, c, core) => { K.P([[16, 2], [27, 9], [27, 23], [16, 30], [5, 23], [5, 9]], core ? '#4a3a1a' : '#5a6478'); K.P([[16, 5], [24, 10], [24, 22], [16, 27], [8, 22], [8, 10]], core ? '#6a5222' : '#7a8498'); K.L(16, 9, 16, 23, 2, c); K.L(11, 13, 21, 19, 2, c); K.L(21, 13, 11, 19, 1, c); if (core) K.C(16, 16, 3, '#fff2a8'); };
  const gemIcon = (K, c) => { K.P([[9, 7], [23, 7], [28, 13], [16, 28], [4, 13]], c); K.P([[9, 7], [13, 13], [4, 13]], sh(c, 0.4)); K.P([[13, 13], [19, 13], [16, 28]], sh(c, -0.15)); K.P([[19, 13], [28, 13], [16, 28]], sh(c, -0.35)); K.R(10, 9, 3, 2, '#ffffff'); };
  const FASH = {
    f_head: (K, c, c2) => { K.E(16, 20, 13, 4, c); K.P([[9, 19], [11, 6], [21, 6], [23, 19]], c); K.R(10, 15, 12, 3, c2); K.C(22, 9, 2, c2); },
    f_body: (K, c, c2) => { K.P([[10, 3], [22, 3], [26, 10], [23, 12], [27, 29], [5, 29], [9, 12], [6, 10]], c); K.P([[13, 3], [19, 3], [16, 9]], c2); K.R(9, 17, 14, 2, c2); },
    f_weapon: (K, c, c2) => { blade(K, c, c2, 4); K.L(6, 19, 13, 26, 2, c2); K.L(5, 26, 8, 23, 3, c2); },
    f_wings: (K, c, c2) => { for (const sd of [-1, 1]) { const X = v => 16 + sd * v; K.P([[X(2), 14], [X(6), 5], [X(12), 2], [X(15), 4], [X(14), 9], [X(11), 13], [X(4), 18]], c); K.P([[X(3), 16], [X(9), 12], [X(15), 13], [X(14), 18], [X(9), 21], [X(4), 20]], U.shade(c, -0.12)); K.P([[X(3), 19], [X(8), 19], [X(12), 24], [X(9), 27], [X(4), 23]], U.shade(c, -0.22)); K.L(X(3), 15, X(12), 4, 1, c2); K.L(X(4), 18, X(13), 15, 1, c2); } K.C(16, 17, 2.5, c2); },
    f_aura: (K, c, c2) => { K.A(16, 16, 11, 0, 4.7, 3, c); K.A(16, 16, 6, 2, 6, 2, c2); K.C(16, 16, 2.5, '#ffffff'); },
    f_crown: (K, c, c2) => { K.P([[4, 24], [4, 10], [10, 16], [16, 6], [22, 16], [28, 10], [28, 24]], c); K.R(4, 21, 24, 4, sh(c, -0.2)); K.C(16, 18, 2, c2); K.C(9, 21, 1.5, c2); K.C(23, 21, 1.5, c2); },
    f_mask: (K, c, c2) => { K.E(10, 16, 7, 6, c); K.E(22, 16, 7, 6, c); K.R(14, 13, 4, 3, c); K.E(10, 16, 4, 3, c2); K.E(22, 16, 4, 3, c2); },
    f_back: (K, c, c2) => { K.R(8, 6, 16, 22, c); K.R(10, 2, 12, 6, c2); K.R(10, 14, 12, 8, sh(c, -0.2)); K.R(14, 16, 4, 3, c2); },
    f_float: (K, c, c2) => { K.C(16, 13, 8, c); K.C(13, 10, 3, sh(c, 0.5)); K.E(16, 27, 7, 2, c2); },
    f_trail: (K, c, c2) => { K.E(9, 22, 4, 6, c); K.E(22, 10, 4, 6, c); K.C(9, 14, 1.5, c2); K.C(22, 2.5, 1.5, c2); K.C(26, 24, 2, c2); },
    f_frame: (K, c, c2) => { K.R(3, 8, 26, 16, c); x0(K, 6, 11, 20, 10); K.C(4, 9, 3, c2); K.C(28, 9, 3, c2); K.C(4, 23, 3, c2); K.C(28, 23, 3, c2); }
  };

  // ---------------- consumables / materials / currencies ----------------
  const potion = (K, c) => { K.R(13, 3, 6, 4, '#c8a878'); K.R(14, 6, 4, 4, '#d8ecf8'); K.C(16, 19, 10, '#d8ecf8'); K.C(16, 20, 8, c); K.C(12, 16, 2.5, sh(c, 0.6)); };
  const scroll = (K, c, mark) => { K.R(6, 7, 20, 18, '#f0e4c0'); K.R(4, 5, 24, 4, '#c8a070'); K.R(4, 23, 24, 4, '#c8a070'); mark(K, c); };
  const BAG = {
    hpPot: K => potion(K, '#ff3d4a'), mpPot: K => potion(K, '#3a8aff'),
    ret: K => { K.P([[16, 16], [4, 4], [2, 14], [8, 22]], '#ffffff'); K.P([[16, 16], [28, 4], [30, 14], [24, 22]], '#eef6ff'); K.L(16, 16, 6, 7, 1, '#a8c8e8'); K.L(16, 16, 26, 7, 1, '#a8c8e8'); K.C(16, 18, 3, '#ffd84a'); },
    foodXp: K => { K.R(6, 16, 20, 11, '#f0c890'); K.R(6, 13, 20, 5, '#ffffff'); K.C(11, 13, 3, '#ffffff'); K.C(21, 13, 3, '#ffffff'); K.C(16, 9, 3, '#ff3d4a'); K.R(6, 21, 20, 2, '#ff7ab0'); },
    foodDrop: K => { K.E(18, 14, 10, 8, '#c8603a'); K.E(18, 14, 6, 4, '#e8905a'); K.L(9, 20, 4, 27, 3, '#f0ecd8'); K.C(4, 27, 2, '#f0ecd8'); },
    protect: K => scroll(K, '#4aa3ff', (K, c) => { K.P([[11, 10], [21, 10], [21, 16], [16, 21], [11, 16]], c); }),
    reforge: K => scroll(K, '#ff8a1e', (K, c) => { K.L(11, 20, 19, 12, 2, WOOD); K.R(17, 9, 6, 5, '#8a8a98'); K.C(13, 13, 1.5, c); }),
    stone: (K, t) => { const c = t >= 9 ? METAL[t] : ACC[t]; K.P([[6, 20], [9, 9], [17, 4], [26, 9], [27, 21], [17, 28]], sh(c, -0.25)); K.P([[9, 9], [17, 4], [19, 13], [11, 17]], sh(c, 0.25)); K.P([[19, 13], [26, 9], [27, 21]], c); },
    gold: K => { K.C(16, 16, 12, '#ffcf3a'); K.C(16, 16, 9, '#f0a820'); K.R(14, 9, 4, 14, '#ffe680'); K.R(11, 12, 10, 3, '#ffe680'); },
    honor: K => { K.P([[10, 2], [14, 2], [17, 12], [13, 12]], '#3a7aff'); K.P([[22, 2], [18, 2], [15, 12], [19, 12]], '#ff4a4a'); K.C(16, 20, 9, '#e8b04a'); K.C(16, 20, 6, '#ffe08a'); K.P([[16, 15], [18, 19], [22, 20], [18, 22], [16, 26], [14, 22], [10, 20], [14, 19]], '#c8781a'); },
    war: K => { K.R(7, 3, 2, 27, WOOD); K.P([[9, 4], [27, 4], [23, 11], [27, 18], [9, 18]], '#c83a3a'); K.P([[14, 7], [18, 7], [19, 11], [16, 15], [13, 11]], '#ffd84a'); },
    runeDust: K => { K.E(16, 21, 11, 9, '#6a5a8a'); K.R(12, 7, 8, 6, '#6a5a8a'); K.R(11, 11, 10, 2, '#ffd84a'); for (const [a, b] of [[12, 20], [19, 17], [16, 25], [21, 23]]) K.R(a, b, 2, 2, '#c8a0ff'); },
    jewelDust: K => { K.E(16, 21, 11, 9, '#3a6a8a'); K.R(12, 7, 8, 6, '#3a6a8a'); K.R(11, 11, 10, 2, '#ff7ab0'); for (const [a, b] of [[12, 20], [19, 17], [16, 25], [21, 23]]) K.R(a, b, 2, 2, '#9ff4ff'); },
    thread: K => { K.R(9, 4, 14, 4, WOOD); K.R(9, 24, 14, 4, WOOD); K.R(11, 8, 10, 16, '#ff7ab0'); for (let i = 0; i < 5; i++) K.R(11, 9 + i * 3, 10, 1, '#ffb0d0'); K.L(21, 20, 28, 28, 1, '#ff7ab0'); },
    srune: K => { K.R(6, 5, 20, 23, '#2a4a6a'); K.R(8, 6, 17, 21, '#3a6a9a'); K.R(24, 6, 2, 22, '#f0e8d0'); runeMini(K, 16, 16); },
    pk: K => { K.L(6, 26, 24, 6, 3, '#d8d8e0'); K.L(26, 26, 8, 6, 3, '#d8d8e0'); K.C(16, 16, 4, '#ff3d3d'); }
  };
  function runeMini(K, cx, cy) { K.P([[cx, cy - 7], [cx + 6, cy], [cx, cy + 7], [cx - 6, cy]], '#ffd84a'); K.L(cx, cy - 4, cx, cy + 4, 1, '#3a2a10'); }

  // ---------------- menu icons ----------------
  const MENU = {
    char: K => ARM.chest(K, METAL[2], ACC[7]), inv: K => { K.R(6, 9, 20, 19, '#b8784a'); K.R(10, 4, 12, 7, '#8a5a34'); x0(K, 12, 6, 8, 5); K.R(6, 14, 20, 3, '#8a5a34'); K.R(14, 13, 4, 5, '#ffd84a'); },
    skills: K => W.book(K, '#ffd84a', '#3a8aff'), runes: K => runeIcon(K, '#ff5a5a'), fashion: K => FASH.f_body(K, '#ff7ab0', '#ffffff'),
    dungeon: K => { K.C(16, 13, 10, '#ece8dc'); K.R(10, 20, 12, 8, '#ece8dc'); K.C(12, 13, 3, OUT); K.C(20, 13, 3, OUT); K.R(15, 18, 2, 3, OUT); for (let i = 0; i < 3; i++) K.R(12 + i * 3, 25, 2, 3, OUT); },
    pvp: K => { K.L(5, 27, 25, 5, 3, '#e0e4f0'); K.L(27, 27, 7, 5, 3, '#e0e4f0'); K.L(4, 21, 11, 28, 2, '#ffd84a'); K.L(28, 21, 21, 28, 2, '#ffd84a'); },
    guild: K => { K.R(5, 12, 22, 16, '#a8b0c0'); for (let i = 0; i < 4; i++) K.R(5 + i * 6, 8, 4, 5, '#a8b0c0'); K.R(13, 19, 6, 9, '#4a3a2a'); K.R(15, 2, 2, 8, WOOD); K.P([[17, 2], [24, 4], [17, 6]], '#ff4a4a'); },
    mercs: K => { K.C(11, 11, 5, '#f0c8a0'); K.C(22, 11, 5, '#f0c8a0'); K.R(5, 17, 12, 11, '#3a8aff'); K.R(16, 17, 12, 11, '#c83a3a'); },
    quests: K => scroll(K, '#c83a3a', (K, c) => { for (let i = 0; i < 4; i++) K.R(9, 11 + i * 3, 14, 1, '#8a7a5a'); K.C(22, 20, 3, c); }),
    map: K => { K.P([[3, 7], [11, 4], [21, 8], [29, 5], [29, 26], [21, 29], [11, 25], [3, 28]], '#f0e0b0'); K.L(11, 4, 11, 25, 1, '#c8b080'); K.L(21, 8, 21, 29, 1, '#c8b080'); K.L(16, 12, 20, 18, 2, '#c83a3a'); K.L(20, 12, 16, 18, 2, '#c83a3a'); },
    codex: K => { K.E(16, 16, 14, 9, '#f0f0f8'); K.C(16, 16, 6, '#3a8aff'); K.C(16, 16, 3, OUT); K.R(13, 12, 2, 2, '#ffffff'); },
    settings: K => { for (let i = 0; i < 8; i++) { const g = i / 8 * 6.28; K.R(16 + Math.cos(g) * 11 - 3, 16 + Math.sin(g) * 11 - 3, 6, 6, '#a8b4c8'); } K.C(16, 16, 10, '#a8b4c8'); K.C(16, 16, 4, OUT); },
    gm: K => { K.P([[4, 24], [4, 10], [10, 16], [16, 6], [22, 16], [28, 10], [28, 24]], '#ffd84a'); K.R(4, 21, 24, 4, '#c8901a'); K.C(16, 18, 2.5, '#c83aff'); K.C(9, 21, 1.5, '#3ad8ff'); K.C(23, 21, 1.5, '#3ad8ff'); },
    shop: K => { K.R(5, 13, 22, 15, '#f0e0c0'); K.P([[3, 13], [7, 5], [25, 5], [29, 13]], '#ff5a5a'); for (let i = 0; i < 3; i++) K.R(9 + i * 6, 5, 3, 8, '#ffffff'); K.R(13, 19, 6, 9, WOOD); }
  };

  // ---------------- public API ----------------
  const wpnOf = it => it.wpn || (G.S && G.S.save && D.CLS[G.S.save.cls] ? D.CLS[G.S.save.cls].weapon : 'sword');
  UI.ICON_TIER_METAL = METAL; UI.ICON_TIER_ACC = ACC;
  UI.itemIcon = (it) => {
    if (!it) return '';
    const t = U.clamp((it.tier || 1) - 1, 0, 9), m = METAL[t], a = ACC[t];
    if (it.kind === 'rune') { const c = D.RUNE_COLORS[it.color] ? D.RUNE_COLORS[it.color].c : '#ffd84a'; return make('rune' + it.color + t, K => runeIcon(K, c, it.color === 'core'), { spark: sparkFor(t + 1) }); }
    if (it.kind === 'gem') { const g = D.GEMS.find(x => x.k === it.gem) || D.GEMS[0]; return make('gem' + g.k + t, K => gemIcon(K, g.c), { spark: sparkFor(t + 1) }); }
    if (it.kind === 'fashion') { const c = it.dye || (it.colors && it.colors[0]) || '#ff7ab0', c2 = (it.colors && it.colors[1]) || '#ffffff'; return make('f' + it.slot + c + c2, K => (FASH[it.slot] || FASH.f_body)(K, c, c2), { spark: [[26, 6]] }); }
    if (it.kind === 'srune') return make('srune', BAG.srune);
    if (it.kind === 'cur') return UI.bagIcon(it.cur);
    if (it.kind === 'pet') return UI.petIcon(it.k); if (it.kind === 'mount') return UI.mountIcon(it.k);
    if (it.slot === 'weapon') { const w = wpnOf(it); return make('w' + w + t, K => { (W[w] || W.sword)(K, m, a); if (t >= 4) K.C(9, 23, 1.6, a); }, { spark: sparkFor(t + 1) }); }
    const fn = ARM[it.slot] || ARM.chest;
    return make('a' + it.slot + t + (it.relic || ''), K => { fn(K, m, it.slot === 'relic' && it.relic ? ACC[(U.hash(it.relic) >>> 0) % 10] : a); }, { spark: sparkFor(t + 1) });
  };
  UI.bagIcon = (k, tier) => k === 'stone' || k === 'stones' ? make('stone' + tier, K => BAG.stone(K, tier || 0), { spark: sparkFor((tier || 0) + 1) }) : make('bag' + k, BAG[k] || BAG.gold);
  UI.menuIcon = (k) => make('menu' + k, MENU[k] || MENU.settings);
  UI.curIcon = (k) => UI.bagIcon(k);
  const MOUNT_BODY = { horse: 'beast', wolf: 'beast', griffin: 'bat', warmount: 'golem' };
  const sprIcon = (key, body, c, c2) => { if (cache.has(key)) return cache.get(key); const [cv, x] = canvas(); try { const s = SPR.monSheet(body, c, c2); const fw = s.fw || 24, fh = s.fh || 24; const sc = Math.min(30 / fw, 30 / fh); x.drawImage(s.sheet || s, 0, 0, fw, fh, (N - fw * sc) / 2, (N - fh * sc) / 2 + 1, fw * sc, fh * sc); } catch (e) { BAG.gold(kit(x)); } const url = cv.toDataURL(); cache.set(key, url); return url; };
  UI.petIcon = k => { const p = D.PETS.find(x => x.k === k) || D.PETS[0]; return sprIcon('pet' + k, p.body, p.c); };
  UI.mountIcon = k => { const p = D.MOUNTS.find(x => x.k === k) || D.MOUNTS[0]; return sprIcon('mount' + k, MOUNT_BODY[k] || 'beast', p.c); };
  // full-body character portrait (front idle frame) for class grids
  UI.bodyURL = (cls, fashion) => { const key = 'body' + cls + (fashion ? JSON.stringify(Object.keys(fashion)) : ''); if (!fashion && cache.has(key)) return cache.get(key); const L = SPR.lookFor(cls, fashion); const s = SPR.charSheet(L); const [cv, x] = SPR.mk(24, 32); x.drawImage(s.sheet, 0, (s.idx.frontidle || 0) * 32, 24, 32, 0, 0, 24, 32); const url = cv.toDataURL(); if (!fashion) cache.set(key, url); return url; };
  UI.ICONS = { W, ARM, FASH, BAG, MENU, runeIcon, gemIcon }; UI.ICONKIT = { make, kit, sparkFor, x0 };
})(window.G);
