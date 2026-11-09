'use strict';
(function (init) {
  (globalThis.ASHFALL_SIM_FACTORIES ||= {})['city'] = init;
  if (typeof window !== 'undefined') init(window.G);
})(function (G) {
  const document = G.headless ? G.platform.document : globalThis.document;
  const window = G.headless ? G.platform.window : globalThis.window;
  const Image = G.headless ? G.platform.Image : globalThis.Image;
  const localStorage = G.headless ? G.platform.localStorage : globalThis.ASHFALL_STORAGE;
  const setTimeout = G.headless ? G.platform.setTimeout : globalThis.setTimeout;
  const setInterval = G.headless ? G.platform.setInterval : globalThis.setInterval;
  const addEventListener = G.headless ? (() => {}) : globalThis.addEventListener;
'use strict';
/* Aurelion v2 — a large city map: walled capital in the centre (4 gates, plaza, street grid, houses), roads radiating
   to the map edges, two rivers with wooden bridges, a lake, farmland plots, outlying villages, light woodland,
   monsters roaming only OUTSIDE the walls, and warp gates at the ends of the roads to other maps. */
(function (G) {
  const U = G.U, D = G.D, E = G.E, W = G.W, S = G.S, SPR = G.SPR, V = G.VFX, UI = G.UI;
  const N = 360, C = N / 2, K = 1.5, Z = N / 126, WALL = 32, c0 = 63, w0 = WALL / Z; const Zp = p => [p[0] * Z, p[1] * Z]; // wall half-size (tiles)
  // ---------- new building sprites ----------
  const SPRC = {};
  // painted building art (assets/buildings): palace, cathedral, castle, guild, inn, shop, smithy, house, stalls, statue
  const BBASE = (() => { const sc = [...document.scripts].find(x => /js\/city\.js/.test(x.src)); return sc ? sc.src.replace(/js\/city\.js.*$/, '') : ''; })();
  const BSZ = { palace: [330, 206], cathedral: [88, 92], castle: [75, 91], guild: [70, 69], inn: [70, 66], shop: [66, 63], smithy: [66, 71], house: [62, 62], stall_blue: [48, 41], stall_gold: [46, 37], stall_red: [45, 39], statue: [30, 61] };
  const BIMG = {}; for (const k in BSZ) { const im = new Image(); im.decoding = 'async'; im.src = BBASE + 'assets/buildings/' + k + '.png'; BIMG[k] = im; }
  const bspr = (k, sc = 1) => { const key = 'X' + k + sc; if (SPRC[key]) return SPRC[key]; const [w0, h0] = BSZ[k]; const w = Math.round(w0 * 2 * sc), h = Math.round(h0 * 2 * sc); const [cv, x] = SPR.mk(w, h); const im = BIMG[k];
    const draw = () => { x.clearRect(0, 0, w, h); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, w, h); };
    if (im.complete && im.naturalWidth) draw(); else im.addEventListener('load', draw); return SPRC[key] = { img: cv, w, h, bt: k }; };
  G.BLD_SPR = bspr;
  const DMAN = G.DECO_MAN || {}; const DIMG = new Image(); DIMG.decoding = 'async'; DIMG.src = BBASE + 'assets/deco/deco.png'; const DQ = [];
  const dspr = (k, sc = 1) => { const key = 'D' + k + sc; if (SPRC[key]) return SPRC[key]; const r = DMAN[k]; if (!r) return null; const w = Math.max(2, Math.round(r[2] * sc)), h = Math.max(2, Math.round(r[3] * sc)); const [cv, x] = SPR.mk(w, h);
    const draw = () => { x.clearRect(0, 0, w, h); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(DIMG, r[0], r[1], r[2], r[3], 0, 0, w, h); };
    if (DIMG.complete && DIMG.naturalWidth) draw(); else DQ.push(draw); return SPRC[key] = { img: cv, w, h, bt: k }; };
  DIMG.addEventListener('load', () => { DQ.splice(0).forEach(f => f()); const m = W.map; if (m && m.chunks && m.gdecals) m.chunks.clear(); });
  const anySpr = (k, sc = 1) => BSZ[k] ? bspr(k, sc) : dspr(k, sc); G.DECO_SPR = anySpr;
  const house = (v) => { const key = 'h' + v; if (SPRC[key]) return SPRC[key]; const R = U.seeded(1000 + v);
    const roofs = [['#c05a3a', '#8a3a24'], ['#a8683a', '#7a4a24'], ['#6a7a8a', '#4a5866'], ['#8a4a3a', '#5a2a20'], ['#b07a3a', '#7a5020'], ['#5a7a4a', '#3a5a30']];
    const walls = [['#e8dcc0', '#c8b898'], ['#d8c8a8', '#b8a888'], ['#c8c0b0', '#a8a090'], ['#e0d0b0', '#b89870']];
    const [r1, r2] = roofs[v % roofs.length], [w1, w2] = walls[(v >> 1) % walls.length]; const big = v % 5 === 0; const W0 = big ? 52 : 40, H0 = big ? 50 : 42;
    const [cv, x] = SPR.mk(W0, H0); const px = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
    const bx = 3, bw = W0 - 6, wy = Math.round(H0 * 0.48), wh = H0 - wy - 2;
    px(bx + 2, H0 - 3, bw - 2, 3, 'rgba(0,0,0,.28)'); // ground shadow
    px(bx, wy, bw, wh, w1); px(bx, wy, 2, wh, w2); px(bx + bw - 3, wy, 3, wh, w2); px(bx, H0 - 4, bw, 2, w2);
    if (v % 3 === 1) for (let i = bx + 5; i < bx + bw - 3; i += 8) px(i, wy, 2, wh, '#7a5a3a'); // timber frame
    if (v % 3 === 2) for (let j = wy + 3; j < H0 - 4; j += 4) for (let i = bx + ((j >> 2) % 2) * 3; i < bx + bw; i += 6) px(i, j, 5, 1, w2); // stone courses
    const dw = big ? 8 : 6; const dx = Math.round(W0 / 2 - dw / 2); px(dx, H0 - 4 - (big ? 12 : 10), dw, big ? 12 : 10, '#5a3a24'); px(dx + 1, H0 - 4 - (big ? 11 : 9), dw - 2, 1, '#7a5030'); px(dx + dw - 2, H0 - 9, 1, 1, '#ffd84a');
    for (const wx of [bx + 4, bx + bw - 10]) { px(wx, wy + 4, 6, 6, '#3a2a1a'); px(wx + 1, wy + 5, 4, 4, R() < 0.7 ? '#ffd870' : '#8ac8e8'); px(wx + 3, wy + 5, 1, 4, '#3a2a1a'); px(wx, wy + 10, 6, 1, w2); }
    // roof (gable)
    const rt = 4, rb = wy + 1; for (let j = rt; j <= rb; j++) { const t = (j - rt) / (rb - rt); const half = Math.round(4 + t * (W0 / 2 - 1)); px(Math.round(W0 / 2 - half), j, half * 2, 1, (j % 3 === 0) ? r2 : r1); }
    px(Math.round(W0 / 2 - 2), rt - 1, 4, 2, r2); px(1, rb, W0 - 2, 2, r2);
    if (v % 2 === 0) { px(W0 - 14, rt + 3, 4, 8, '#7a6a5a'); px(W0 - 15, rt + 2, 6, 2, '#5a4a3a'); }
    x.globalAlpha = 0.18; px(Math.round(W0 / 2), rt, Math.round(W0 / 2) - 1, rb - rt, '#000'); x.globalAlpha = 1; // shaded roof half
    return SPRC[key] = { img: cv, w: W0, h: H0 }; };
  const tower = () => { if (SPRC.tw) return SPRC.tw; const [cv, x] = SPR.mk(30, 58); const px = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
    px(4, 14, 22, 42, '#8a8a92'); px(4, 14, 3, 42, '#6a6a72'); px(23, 14, 3, 42, '#a8a8b0'); for (let j = 18; j < 54; j += 6) for (let i = 4 + (j / 6 % 2) * 4; i < 26; i += 8) px(i, j, 7, 1, '#6a6a72');
    for (let i = 2; i < 28; i += 6) px(i, 8, 4, 6, '#9a9aa2'); px(2, 12, 26, 3, '#7a7a82'); px(13, 26, 4, 7, '#2a2230'); px(14, 27, 2, 5, '#ffb84a');
    px(14, 0, 2, 9, '#6a4a2a'); px(16, 1, 9, 5, '#b0303a'); px(16, 5, 9, 1, '#ffd84a'); return SPRC.tw = { img: cv, w: 30, h: 58 }; };
  const well = () => { if (SPRC.wl) return SPRC.wl; const [cv, x] = SPR.mk(22, 24); const px = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
    px(3, 14, 16, 8, '#8a8a92'); px(4, 13, 14, 2, '#3a6a9a'); px(3, 4, 2, 11, '#6a4a2a'); px(17, 4, 2, 11, '#6a4a2a'); px(1, 2, 20, 3, '#a8402a'); return SPRC.wl = { img: cv, w: 22, h: 24 }; };
  const palace = () => { if (SPRC.pal) return SPRC.pal; const W0 = 540, H0 = 270; const [cv, x] = SPR.mk(W0, H0); const px = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
    const wing = (x0, w, top) => { px(x0, top, w, H0 - top - 6, '#e8e0d0'); px(x0, top, 4, H0 - top - 6, '#c8c0b0'); px(x0 + w - 4, top, 4, H0 - top - 6, '#f4ecdc'); for (let j = top + 24; j < H0 - 40; j += 34) for (let i = x0 + 14; i < x0 + w - 24; i += 30) { px(i, j, 16, 20, '#3a4a6a'); px(i + 2, j + 2, 12, 16, '#8ac8f0'); px(i + 7, j + 2, 2, 16, '#3a4a6a'); }
      for (let j = top - 30; j < top; j++) { const t = (j - top + 30) / 30; const hw = 8 + t * (w / 2 + 6); px(x0 + w / 2 - hw, j, hw * 2, 1, j % 4 ? '#3a6ab8' : '#2a4a8a'); } };
    px(10, H0 - 8, W0 - 20, 8, 'rgba(0,0,0,.25)'); wing(20, 150, 120); wing(W0 - 170, 150, 120); wing(170, 200, 60);
    px(240, H0 - 70, 60, 64, '#5a3a24'); px(246, H0 - 64, 48, 58, '#7a5030'); x.fillStyle = '#5a3a24'; x.beginPath(); x.arc(270, H0 - 70, 30, Math.PI, 0); x.fill(); px(268, H0 - 66, 4, 60, '#3a2414');
    for (const tx of [180, 350]) { px(tx, 20, 20, H0 - 26, '#d8d0c0'); for (let j = 0; j < 18; j++) px(tx - 4 + j * 0, 0, 28, 1, '#2a4a8a'); x.fillStyle = '#2a4a8a'; x.beginPath(); x.moveTo(tx - 4, 22); x.lineTo(tx + 10, -2); x.lineTo(tx + 24, 22); x.fill(); px(tx + 9, -8, 2, 10, '#ffd84a'); }
    px(255, 10, 30, 8, '#b0303a'); px(268, 0, 2, 18, '#6a4a2a'); return SPRC.pal = { img: cv, w: W0, h: H0 }; };
  const hall = () => { if (SPRC.hall) return SPRC.hall; const W0 = 180, H0 = 150; const [cv, x] = SPR.mk(W0, H0); const px = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
    px(6, 70, W0 - 12, H0 - 76, '#d8c8a8'); for (let j = 84; j < H0 - 20; j += 24) for (let i = 18; i < W0 - 24; i += 22) { px(i, j, 12, 14, '#3a3a4a'); px(i + 2, j + 2, 8, 10, '#ffd870'); }
    for (let j = 40; j < 72; j++) { const t = (j - 40) / 32; const hw = 20 + t * (W0 / 2 - 14); px(W0 / 2 - hw, j, hw * 2, 1, j % 3 ? '#a8402a' : '#7a2a1a'); }
    px(W0 / 2 - 14, 8, 28, 34, '#e8dcc0'); px(W0 / 2 - 18, 4, 36, 6, '#a8402a'); x.fillStyle = '#ffd84a'; x.beginPath(); x.arc(W0 / 2, 26, 6, 0, 7); x.fill(); px(W0 / 2 - 10, H0 - 30, 20, 24, '#5a3a24'); px(6, H0 - 6, W0 - 12, 6, 'rgba(0,0,0,.25)'); return SPRC.hall = { img: cv, w: W0, h: H0 }; };
  // ---------- generator ----------
  const genCity = () => {
    const m = E.newMap({ id: 'aurelion', kind: 'town', w: N, h: N, g: ['#5f8a4f', '#679656'], acc: '#3e6a32', bg: '#0e0c14' }); m.k = K; m.bw = N / K; m.bh = N / K; m.c = C; m.npcR = 7.5; m.big = true; m._clean = true;
    const R = U.seeded(4242); const n1 = E.noise(77, N, N, 14); const set = (x, y, t) => { if (E.inside(m, x, y)) E.setTile(m, Math.floor(x), Math.floor(y), t); };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) E.setTile(m, x, y, n1(x, y) > 0.58 ? 1 : 0);
    const inWall = (x, y, pad = 0) => Math.abs(x - C) <= WALL + pad && Math.abs(y - C) <= WALL + pad;
    // rivers (smooth polylines, width w)
    const line = (pts, w, t, keep) => { for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1]; const L = Math.hypot(bx - ax, by - ay); for (let s = 0; s <= L; s += 0.4) { const x = ax + (bx - ax) * s / L, y = ay + (by - ay) * s / L; for (let dy = -w; dy <= w; dy++) for (let dx = -w; dx <= w; dx++) if (dx * dx + dy * dy <= w * w) { const xx = x + dx, yy = y + dy; if (keep && keep(xx, yy)) continue; set(xx, yy, t); } } } };
    const smooth = (pts, amp, seed) => { const r = U.seeded(seed); const out = []; for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1]; for (let k = 0; k < 4; k++) { const t = k / 4; out.push([ax + (bx - ax) * t + (k ? (r() - 0.5) * amp : 0), ay + (by - ay) * t + (k ? (r() - 0.5) * amp : 0)]); } } out.push(pts[pts.length - 1]); return out; };
    const riverA = smooth([[38, -2], [40, 18], [32, 34], [26, 46], [18, 60], [8, 74], [-2, 82]].map(Zp), 5 * Z, 11);
    const riverB = smooth([[128, 50], [108, 56], [96, 76], [84, 88], [62, 92], [44, 94], [26, 100], [-2, 104]].map(Zp), 6 * Z, 12);
    line(riverA, 2.6, 3); line(riverB, 3, 3);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (U.d2(x, y, 20 * Z, 88 * Z) < 30 * Z * Z) set(x, y, 3); // lake
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (U.d2(x, y, 104 * Z, 112 * Z) < 18 * Z * Z) set(x, y, 3); // pond
    // roads
    const bridges = []; const road = (pts0, w = 1.2) => { const pts = pts0.map(Zp); const sp = smooth(pts, 3 * Z, pts.length * 7 + pts[0][0]); for (let i = 0; i < sp.length - 1; i++) { const [ax, ay] = sp[i], [bx, by] = sp[i + 1]; const L = Math.hypot(bx - ax, by - ay); for (let s = 0; s <= L; s += 0.35) { const x = ax + (bx - ax) * s / L, y = ay + (by - ay) * s / L;
          for (let dy = -w; dy <= w; dy++) for (let dx = -w; dx <= w; dx++) { const xx = Math.floor(x + dx), yy = Math.floor(y + dy); if (!E.inside(m, xx, yy) || inWall(xx, yy, -1)) continue; if (m.tiles[E.idx(m, xx, yy)] === 3) bridges.push([xx, yy]); E.setTile(m, xx, yy, 2); } } } };
    road([[c0, c0 - w0], [c0 + 1, 40], [c0 - 2, 22], [c0, 1]], 1.6); road([[c0, c0 + w0], [c0 + 1, 86], [c0 - 1, 104], [c0, 125]], 1.6);
    road([[c0 - w0, c0], [42, c0 + 1], [24, c0 - 1], [1, c0]], 1.6); road([[c0 + w0, c0], [86, c0 - 1], [104, c0 + 2], [125, c0]], 1.6);
    const VILL0 = [[22, 22], [100, 24], [104, 82], [22, 70], [62, 112], [40, 46], [88, 42], [86, 100]]; const VILL = VILL0.map(Zp);
    road([[c0 - 1, 26], [36, 24], [22, 22]]); road([[c0 + 1, 22], [84, 22], [100, 24]]); road([[104, c0 + 1], [104, 70], [104, 82]]); road([[30, c0], [24, 60], [22, 70]]); road([[c0, 104], [58, 108], [62, 112]]);
    road([[c0 - 1, 44], [48, 46], [40, 46]]); road([[c0 + 1, 40], [80, 42], [88, 42]]); road([[c0, 96], [76, 98], [86, 100]]);
    // inside the walls: plaza + street grid
    // inside the walls: layout from the hand-drawn plan (palace north, round plaza, W/E/S avenues, looping side streets)
    const PX = (px, py) => [C + (px - 982) / 835 * (WALL * 2 - 2), C + (py - 487) / 837 * (WALL * 2 - 2)];
    for (let y = C - WALL; y <= C + WALL; y++) for (let x = C - WALL; x <= C + WALL; x++) set(x, y, 8);
    const paint = (pts, w, t = 2) => { const P = pts.map(([a, b]) => PX(a, b)); for (let i = 0; i < P.length - 1; i++) { const [ax, ay] = P[i], [bx, by] = P[i + 1]; const Ln = Math.hypot(bx - ax, by - ay) || 1; for (let q = 0; q <= Ln; q += 0.3) { const x = ax + (bx - ax) * q / Ln, y = ay + (by - ay) * q / Ln; for (let dy = -w; dy <= w; dy++) for (let dx = -w; dx <= w; dx++) if (dx * dx + dy * dy <= w * w + 0.3) set(x + dx, y + dy, t); } } };
    { const [cx, cy] = PX(1015, 487); for (let y = -12; y <= 12; y++) for (let x = -12; x <= 12; x++) if ((x / 9.6) ** 2 + (y / 7.8) ** 2 <= 1) set(cx + x, cy + y, 8); m.plaza = { x: cx, y: cy }; }
    paint([[982, 215], [982, 385]], 1.2, 8);                                   // palace walk
    paint([[560, 485], [890, 482]], 2.4); paint([[1145, 500], [1405, 500]], 2.2); paint([[1012, 595], [1012, 910]], 2.2); // avenues W / E / S
    paint([[575, 724], [990, 724]], 2.4); paint([[600, 700], [592, 740]], 1.6);   // lower-left boulevard
    paint([[706, 520], [706, 660]], 1.1); paint([[753, 520], [753, 668]], 1.1);  // lanes off the west avenue
    paint([[660, 345], [760, 336], [862, 345], [820, 385], [700, 385], [660, 345]], 1.2); paint([[692, 352], [692, 450]], 0.9); paint([[780, 380], [780, 440]], 0.9); // upper-left loop
    paint([[1260, 470], [1258, 380], [1220, 345], [1150, 320], [1122, 280], [1150, 240], [1210, 240], [1250, 270], [1300, 340], [1322, 400], [1322, 470]], 1.2); // upper-right winding road
    paint([[1045, 692], [1140, 684], [1240, 684], [1275, 740], [1260, 784], [1210, 786], [1180, 760], [1100, 772], [1045, 762]], 1.3); // lower-right loop
    // farmland plots (ground decals) near villages and along roads
    m.fields = []; const plot = () => { }; const plot0 = (x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { if (!E.inside(m, i, j) || inWall(i, j, 2)) return; const t = m.tiles[E.idx(m, i, j)]; if (t === 2 || t === 3) return; } m.fields.push({ x, y, w, h, crop: Math.floor(R() * 4) }); };
    for (const [vx, vy] of VILL) for (let k = 0; k < 9; k++) plot(Math.round(vx + (R() - 0.5) * 30), Math.round(vy + (R() - 0.5) * 30), 3 + Math.floor(R() * 3), 2 + Math.floor(R() * 3));
    for (let k = 0; k < 170; k++) { const a = R() * 6.283, d = WALL + 4 + R() * 60; plot(Math.round(C + Math.cos(a) * d), Math.round(C + Math.sin(a) * d), 3 + Math.floor(R() * 3), 2 + Math.floor(R() * 2)); }
    // walls with 4 gates + towers
    const gate = (x, y) => (Math.abs(x - C) < 2.5 && Math.abs((y - C) - WALL) < 0.6) || (Math.abs(y - C) < 2.5 && Math.abs(Math.abs(x - C) - WALL) < 0.6);
    for (let i = C - WALL; i <= C + WALL; i++) for (const [x, y] of [[i, C - WALL], [i, C + WALL], [C - WALL, i], [C + WALL, i]]) { if (gate(x + 0.5, y + 0.5) || gate(x, y)) continue; E.addWall(m, x, y, '#8a8a92', 24); }
    const TW = tower(); for (const [x, y] of [[C - WALL, C - WALL], [C + WALL, C - WALL], [C - WALL, C + WALL], [C + WALL, C + WALL], [C - 3, C + WALL], [C + 3, C + WALL], [C - WALL, C - 3], [C - WALL, C + 3], [C + WALL, C - 3], [C + WALL, C + 3]]) { m.props.push({ x: x + 0.5, y: y + 1, kind: 'bld', spr: TW }); m.block[E.idx(m, x, y)] = 2; }
    // buildings: city blocks + villages (footprint blocks)
    const VT = ['house', 'market_red', 'inn', 'shop', 'warehouse', 'smithy', 'clinic', 'house', 'hall_blue', 'smithy2']; const place = (x, y, v, vk) => { const s = anySpr(VT[v % VT.length], VT[v % VT.length] in BSZ ? 0.72 : 0.8); const fw = Math.ceil(s.w / G.TS / 2 + 0.2), fh = Math.max(2, Math.round(s.h / G.TS * 0.75)); for (let j = -fh - 1; j <= 1; j++) for (let i = -fw - 1; i <= fw; i++) { const xx = Math.floor(x) + i, yy = Math.floor(y) + j; if (!E.inside(m, xx, yy)) return false; const t = m.tiles[E.idx(m, xx, yy)]; if (m.block[E.idx(m, xx, yy)] || t === 2 || t === 3 || t === 8) return false; }
      for (let j = -fh + 1; j <= 0; j++) for (let i = -fw; i <= fw - 1; i++) m.block[E.idx(m, Math.floor(x) + i, Math.floor(y) + j)] = 2; m.props.push({ x, y: y + 0.6, kind: 'bld', spr: s, bt: s.bt, vk }); return true; };
    // city districts: NPC spots stay open, houses only on part of each block
    const DIST = [[925, 420], [1105, 420], [880, 560], [1150, 560], [1060, 640], [960, 640], [820, 520], [1220, 540], [600, 540], [1380, 545], [880, 610], [1100, 860], [930, 860], [1250, 620]].map(([a, b]) => { const [x, y] = PX(a, b); return { x: x + 0.5, y: y + 0.5 }; }); m.districts = DIST;
    const CT = ['smithy', 'shop', 'inn', 'castle', 'guild', 'castle', 'shop', 'clinic', 'smithy', 'market_red', 'castle', 'house', 'warehouse', 'hall_blue', 'house', 'house']; let hv = 0; const big = (v, k) => { const b = house(v); const key = 'B' + v + k; if (SPRC[key]) return SPRC[key]; const [cv, x] = SPR.mk(Math.round(b.w * k), Math.round(b.h * k)); x.imageSmoothingEnabled = false; x.drawImage(b.img, 0, 0, cv.width, cv.height); return SPRC[key] = { img: cv, w: cv.width, h: cv.height }; };
    const placeS = (px, py, spr) => { const [x, y] = PX(px, py); const fw = Math.ceil(spr.w / G.TS / 2); const fh = Math.max(2, Math.round(spr.h / G.TS * 0.45)); for (let j = -fh + 1; j <= 0; j++) for (let i = -fw; i <= fw - 1; i++) { const xx = Math.floor(x) + i, yy = Math.floor(y) + j; if (E.inside(m, xx, yy) && m.tiles[E.idx(m, xx, yy)] !== 2) m.block[E.idx(m, xx, yy)] = 2; } const pr = { x, y: y + 0.6, kind: 'bld', spr, bt: spr.bt, city: true }; m.props.push(pr); return pr; };
    placeS(982, 215, bspr('palace'));  placeS(635, 448, bspr('cathedral'));
    for (const [px, py] of [[690, 330], [793, 328], [740, 446], [830, 446], [1226, 214], [1300, 300], [1180, 420], [660, 684], [797, 678], [916, 678], [1182, 668], [643, 852], [800, 852], [915, 852], [1180, 838], [1332, 776]]) placeS(px, py, anySpr(CT[hv++ % CT.length], CT[(hv - 1) % CT.length] in BSZ ? 1 : 1.15));
    // villages: walled, larger, with an open square in the middle
    const VR = 14; m.VR = VR;
    for (const [vx, vy] of VILL) { const cx = Math.floor(vx), cy = Math.floor(vy);
      for (let i = -VR; i <= VR; i++) for (const [x, y] of [[cx + i, cy - VR], [cx + i, cy + VR], [cx - VR, cy + i], [cx + VR, cy + i]]) { if (!E.inside(m, x, y)) continue; const t = m.tiles[E.idx(m, x, y)]; if (t === 2 || t === 3) continue; if (Math.abs(x - cx) < 2 || Math.abs(y - cy) < 2) continue; E.addWall(m, x, y, '#9a8a6a', 16); }
      for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) if (m.tiles[E.idx(m, x, y)] !== 3) E.setTile(m, x, y, 8);
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) for (let k = 3; k < VR + 2; k++) { const x = cx + dx * k, y = cy + dy * k; if (E.inside(m, x, y) && m.tiles[E.idx(m, x, y)] !== 3) E.setTile(m, x, y, 2); }
      let n = 0; for (let k = 0; k < 400 && n < 12; k++) { const hx = cx + (R() - 0.5) * (VR * 2 - 5), hy = cy + (R() - 0.5) * (VR * 2 - 5); if (Math.abs(hx - cx) < 4 && Math.abs(hy - cy) < 4) continue; if (place(hx, hy, hv++, VILL.indexOf(VILL.find(q => q[0] === vx && q[1] === vy)))) n++; }
      }
    const offRoad = (x, y, w) => { const hw = Math.ceil(w / G.TS / 2) + 1; for (let j = -2; j <= 1; j++) for (let i = -hw; i <= hw; i++) { const xx = Math.floor(x) + i, yy = Math.floor(y) + j; if (E.inside(m, xx, yy) && m.tiles[E.idx(m, xx, yy)] === 2) return false; } return true; };
    { const [pcx, pcy] = PX(1015, 487); const st = dspr('fountain') || bspr('statue'); m.props.push({ x: pcx, y: pcy + 1.6, kind: 'bld', spr: st, deco: true }); for (let j = -1; j <= 1; j++) for (let i = -3; i <= 2; i++) m.block[E.idx(m, Math.floor(pcx) + i, Math.floor(pcy) + j)] = 2; m.plazaC = { x: pcx, y: pcy };
      const SK = ['stall_blue', 'stall_gold', 'stall_red', 'stall_red', 'stall_blue', 'stall_gold']; [[-0.84, -0.66], [0.84, -0.66], [-0.9, 0.56], [0.9, 0.56], [-0.5, 0.95], [0.5, 0.95]].forEach(([a, b], i) => { const x = pcx + a * 13.2, y = pcy + b * 10.6; const sp = bspr(SK[i]); if (!offRoad(x, y, sp.w)) return; if (m.props.some(q => q.city && q.bt && q.bt !== 'stall' && Math.abs(q.x - x) < q.spr.w / G.TS / 2 + 2.5 && y + 0.5 > q.y - q.spr.h / G.TS - 1 && y + 0.5 < q.y + 2)) return; m.props.push({ x, y: y + 0.5, kind: 'bld', spr: sp, bt: 'stall', city: true }); for (let d = -1; d <= 0; d++) m.block[E.idx(m, Math.floor(x) + d, Math.floor(y))] = 2; }); }
    // warp gates at the ends of the roads
    m.warps = [{ x: C, y: 4, to: 2 }, { x: C, y: N - 4, to: 0 }, { x: 4, y: C, to: 3 }, { x: N - 4, y: C, to: 1 }, { x: 100 * Z + 4, y: 24 * Z + 6, to: 'wb', th: 'ลานบอสโลก' }, { x: 22 * Z + 5, y: 70 * Z + 6, to: 'dg', th: 'ดันเจี้ยน' }, { x: 104 * Z + 5, y: 82 * Z + 6, to: 4 }, { x: 88 * Z + 5, y: 42 * Z + 5, to: 5 }];
    for (const wp of m.warps) { if (D.FARM_MAPS[wp.to]) wp.th = D.FARM_MAPS[wp.to].th; E.addProp(m, 'portal', wp.x, wp.y, { c: '#7af0ff' }); }
    m.spawn = { x: C + 0.5, y: C + 6.5 }; m.portalPt = m.spawn;
    m.noNat = (x, y) => inWall(x, y, 3) || m.fields.some(f => x >= f.x - 0.5 && x <= f.x + f.w + 0.5 && y >= f.y - 0.5 && y <= f.y + f.h + 0.5) || VILL.some(([vx, vy]) => Math.abs(x - vx) < VR + 2 && Math.abs(y - vy) < VR + 2) || m.warps.some(w => U.d2(x, y, w.x, w.y) < 16);
    // ---------- village footpaths: every house front connects to the nearest road (BFS around buildings) ----------
    for (const q of m.props) { if (q.vk == null || !q.bt) continue; const sx = Math.floor(q.x), sy = Math.floor(q.y - 0.6) + 1; if (!E.inside(m, sx, sy)) continue;
      const [vx, vy] = VILL[q.vk] || [0, 0]; const inV = (x, y) => Math.abs(x - vx) <= VR - 1 && Math.abs(y - vy) <= VR - 1; const key = (x, y) => y * N + x; const prev = new Map([[key(sx, sy), -1]]); const Q = [[sx, sy]]; let hit = null;
      for (let qi = 0; qi < Q.length && qi < 1500; qi++) { const [x, y] = Q[qi]; const t = m.tiles[E.idx(m, x, y)]; if (t === 2 && !(x === sx && y === sy)) { hit = [x, y]; break; }
        for (const [dx, dy] of (qi === 0 ? [[0, 1], [1, 0], [-1, 0]] : [[0, 1], [1, 0], [-1, 0], [0, -1]])) { const nx = x + dx, ny = y + dy; if (!E.inside(m, nx, ny) || !inV(nx, ny) || prev.has(key(nx, ny))) continue; const i2 = E.idx(m, nx, ny); if (m.block[i2] || m.tiles[i2] === 3) continue; prev.set(key(nx, ny), key(x, y)); Q.push([nx, ny]); } }
      if (!hit) continue; let k = key(hit[0], hit[1]); k = prev.get(k); while (k != null && k !== -1) { const x = k % N, y = Math.floor(k / N); E.setTile(m, x, y, 2); k = prev.get(k); } }
    // ---------- decoration pass (assets/deco): lamps along roads, palace avenue, plaza, gates, trade props beside buildings, gardens ----------
    { const occ = new Set(); const ok0 = (x, y) => E.inside(m, Math.floor(x), Math.floor(y)) && !m.block[E.idx(m, Math.floor(x), Math.floor(y))] && m.tiles[E.idx(m, Math.floor(x), Math.floor(y))] !== 3;
      for (const q of m.props) occ.add(Math.floor(q.x) + ',' + Math.floor(q.y));
      const near = (x, y, r) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (occ.has((Math.floor(x) + i) + ',' + (Math.floor(y) + j))) return true; return false; };
      const put = (k, x, y, o = {}) => { const sp = anySpr(k, o.sc || 1); if (!sp) return false; if (!o.force && (!ok0(x, y) || near(x, y, o.gap == null ? 1 : o.gap) || (!o.road && m.tiles[E.idx(m, Math.floor(x), Math.floor(y))] === 2) || (!o.road && sp.w > 36 && !offRoad(x, y, sp.w - G.TS)))) return false;
        m.props.push({ x, y, kind: 'bld', spr: sp, deco: true }); occ.add(Math.floor(x) + ',' + Math.floor(y)); if (o.block !== false) { const bw = o.bw || 0; for (let i = -bw; i <= bw; i++) m.block[E.idx(m, Math.floor(x) + i, Math.floor(y))] = 2; } return true; };
      const DR = U.seeded(4242); const pick = a => a[Math.floor(DR() * a.length)];
      // palace avenue: royal bridge carpet, banners, guardian statues, flower arch
      m.gdecals = []; { const [bx, by] = PX(982, 300); const b = dspr('bridge');  for (let k = 0; k < 5; k++) { const yy = by - 4 + k * 2.2; put('banner_crown', bx - 4.2, yy, { force: true }); put('banner_crown', bx + 4.2, yy, { force: true }); }
        const [fx, fy] = PX(982, 392); const ly = m.plazaC ? m.plazaC.y - 10 - 0.4 : fy; put('statue_lion', fx - 3.2, ly, { force: true }); put('statue_lion', fx + 3.2, ly, { force: true });
        const [gx, gy] = PX(982, 228); put('statue_griffin', gx - 7.8, gy, { force: true }); put('statue_griffin', gx + 7.8, gy, { force: true }); put('noticeboard', gx + 10.5, gy + 0.4, { force: true }); put('lamp_triple', gx - 10, gy + 0.6, { force: true }); }
      // plaza ring: benches, flower pots, triple lamps
      if (m.plazaC) { const { x: pcx, y: pcy } = m.plazaC; const RXp = 12.5, RYp = 10; m.inPlaza = (x, y, pad = 0) => ((x - pcx) / (RXp + pad)) ** 2 + ((y - pcy) / (RYp + pad)) ** 2 <= 1;
        for (let y = -RYp - 1; y <= RYp + 1; y++) for (let x = -RXp - 1; x <= RXp + 1; x++) if (m.inPlaza(pcx + x, pcy + y)) E.setTile(m, Math.floor(pcx + x), Math.floor(pcy + y), 8);
        for (const a of [0.5, 1.2, 1.95, 2.65, 3.6, 4.35, 5.05, 5.8]) put('lamp_triple', pcx + Math.cos(a) * (RXp + 0.6), pcy + Math.sin(a) * (RYp + 0.6), { force: true });
        // main-city save point: rune monolith over a glowing circle
        const sx = pcx + RXp * 0.55, sy = pcy - RYp * 0.86; m.citySave = { x: sx, y: sy }; m.props.push({ x: sx, y: sy + 0.2, kind: 'bld', spr: dspr('portal'), deco: true }); m.props.push({ x: sx, y: sy + 0.35, kind: 'bld', spr: dspr('runestone'), deco: true }); m.block[E.idx(m, Math.floor(sx), Math.floor(sy))] = 2; occ.add(Math.floor(sx) + ',' + Math.floor(sy));
        // more market stalls down the south avenue
        const [mx, my] = PX(1012, 640); ['stall_fruit', 'stall_potion', 'stall_magic', 'stall_food', 'stall_blue', 'stall_gold'].forEach((k, i) => { const sg = i % 2 ? 1 : -1, yy = my + Math.floor(i / 2) * 3.4; const sp0 = anySpr(k); let ox = null; for (const o of [4.2, 5.2, 6.2, 7.4]) if (offRoad(mx + sg * o, yy, sp0.w)) { ox = o; break; } if (ox != null && put(k, mx + sg * ox, yy, { force: true, bw: 1 })) { const q = m.props[m.props.length - 1]; q.bt = 'stall'; q.city = true; delete q.deco; } }); for (const [k, sg] of [['cart', -1], ['wagon', 1]]) for (const o of [4.4, 5.6, 7]) if (offRoad(mx + sg * o, my + 10.2, anySpr(k).w) && put(k, mx + sg * o, my + 10.2, { bw: 1 })) break; }
      // gates: banner arches over the road + banner poles
      
      for (const [gx, gy] of [[C - WALL + 2, C - 3.2], [C - WALL + 2, C + 3.8], [C + WALL - 1, C - 3.2], [C + WALL - 1, C + 3.8], [C - 3.4, C + WALL - 1], [C + 4.4, C + WALL - 1]]) put('banner_pole', gx, gy, { force: true });
      // trade props beside buildings
      const BES = { smithy: ['weapon_rack', 'barrels', 'crates'], smithy2: ['weapon_rack', 'barrels'], shop: ['sign_potion', 'crates', 'sacks'], market_red: ['crates', 'sacks', 'barrels'], clinic: ['pot_white', 'planter_white'], inn: ['sign_beer', 'barrels', 'cart'], warehouse: ['crates', 'wagon', 'sacks'],
        castle: ['targets', 'armor_stand', 'shield_rack'], guild: ['banner_wing', 'noticeboard', 'banner_wing'], hall_blue: ['banner_wing2', 'board_roof'], cathedral: ['bell', 'statue_angel', 'pot_pink'], house: ['planter_pink', 'pot_purple', 'barrels'], palace: [] };
      for (const q of m.props.slice()) { if (!q.bt || q.deco || !BES[q.bt]) continue; const hw = q.spr.w / G.TS / 2; const L = BES[q.bt]; const sc = q.vk != null ? 0.85 : 1;
        put(L[0], q.x - hw - 0.7, q.y - 0.3, { gap: 0, sc }); if (L[1]) put(L[1], q.x + hw + 0.7, q.y - 0.3, { gap: 0, sc }); if (L[2]) put(L[2], q.x + hw + 0.9, q.y - 1.6, { gap: 0, sc }); }
      // lamps along every road (city + highways), alternating sides
      { let n = 0; for (let y = 2; y < N - 2; y += 1) for (let x = 2; x < N - 2; x += 1) { const t = m.tiles[E.idx(m, x, y)]; if (t === 2 || t === 3) continue; let adj = false; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (m.tiles[E.idx(m, x + dx, y + dy)] === 2) adj = true; if (!adj) continue;
          if (m.inPlaza && m.inPlaza(x, y, 1)) continue; const inC = inWall(x, y, 0); const step = inC ? 7 : 13; if (((x * 31 + y * 17) % step) !== 0) continue; if (near(x, y, inC ? 3 : 5) || VILL.some(([vx, vy]) => Math.abs(x - vx) < 4 && Math.abs(y - vy) < 4)) continue; if (put(inC ? pick(['lamp1', 'lamp3', 'lamp1', 'banner1', 'banner2']) : pick(['lamp1', 'lamp_hang', 'lamp1']), x + 0.5, y + 0.7, { gap: 2 })) n++; if (n > 520) break; } }
      // little gardens fill the open paved blocks of the city
      const GARD = [['planter_long', 'bench_stone'], ['pot_pink', 'bench_wood', 'pot_white'], ['planter_pink', 'lamp3'], ['crates', 'barrels', 'sacks'], ['planter_white', 'bench_stone2'], ['fountain_small'], ['statue_angel'], ['rail_stone', 'pot_purple'], ['chest', 'vase', 'crates']];
      for (let y = C - WALL + 3; y < C + WALL - 2; y += 6) for (let x = C - WALL + 3; x < C + WALL - 2; x += 7) { const jx = x + DR() * 3.5, jy = y + DR() * 3.5; if (DR() < 0.3 || (m.inPlaza && m.inPlaza(jx, jy, 2)) || near(jx, jy, 3) || m.tiles[E.idx(m, Math.floor(jx), Math.floor(jy))] === 2) continue; const set = pick(GARD); set.forEach((k, i) => put(k, jx + (i - (set.length - 1) / 2) * 1.8, jy, { gap: 0, bw: k === 'fountain_small' ? 1 : 0 })); }
      // villages: lamps at the square, a notice board and benches
      for (const [vx, vy] of VILL) { const cx = Math.floor(vx), cy = Math.floor(vy); [[-3, -3], [3, -3], [-3, 3.6], [3, 3.6]].forEach(([dx, dy]) => put('lamp1', cx + 0.5 + dx, cy + dy, { force: true })); put('noticeboard', cx + 5.5, cy - 3.2, { gap: 0 }); put('bench_wood', cx - 5.5, cy + 3.6, { gap: 0 }); put('planter_pink', cx + 5.5, cy + 3.8, { gap: 0 }); put('pot_white', cx - 5.6, cy - 3.2, { gap: 0 }); } }
    m.bridges = bridges; m.vill = VILL; m.inWall = inWall; m.chunked = true;
    m.paintDecals = (x, tx0, ty0, n) => { const T = G.TS; const CROP = [['#9ad04a', '#6a9a2a'], ['#e8c84a', '#b89a2a'], ['#7ab84a', '#4a8a2a'], ['#c8d860', '#98a830']];
      for (const f of m.fields) { if (f.x + f.w < tx0 - 1 || f.y + f.h < ty0 - 1 || f.x > tx0 + n + 1 || f.y > ty0 + n + 1) continue; const [a, b] = CROP[f.crop]; const px = (f.x - tx0) * T, py = (f.y - ty0) * T, w = f.w * T, h = f.h * T; x.fillStyle = '#6a5a3a'; x.fillRect(px - 1, py - 1, w + 2, h + 2); x.fillStyle = '#8a6a44'; x.fillRect(px, py, w, h);
        for (let j = 0; j < h; j += 6) { x.fillStyle = a; x.fillRect(px + 1, py + j + 1, w - 2, 3); x.fillStyle = b; for (let i = 2; i < w - 2; i += 5) x.fillRect(px + i, py + j + 1, 2, 2); } }
      if (false) { m._bd = []; const key = (a, b) => a + ',' + b; const S0 = new Set(m.bridgeSet.map(([a, b]) => key(a, b))), seen = new Set(); const sp = dspr('bridge');
        for (const [a, b] of m.bridgeSet) { if (seen.has(key(a, b))) continue; const q = [[a, b]]; seen.add(key(a, b)); let x0 = a, x1 = a, y0 = b, y1 = b; while (q.length) { const [i, j] = q.pop(); x0 = Math.min(x0, i); x1 = Math.max(x1, i); y0 = Math.min(y0, j); y1 = Math.max(y1, j); for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const k2 = key(i + di, j + dj); if (S0.has(k2) && !seen.has(k2)) { seen.add(k2); q.push([i + di, j + dj]); } } }
          const w = x1 - x0 + 1, h = y1 - y0 + 1; if (sp) m._bd.push({ x0, y0, w, h, cx: (x0 + x1 + 1) / 2, cy: (y0 + y1 + 1) / 2, hor: w >= h, spr: sp }); } }
      for (const d of []) { if (!d.spr || !d.spr.img) continue; const L = (d.hor ? d.w : d.h) + 2.4, Wd = Math.max(4.2, (d.hor ? d.h : d.w) + 1.2); const px = (d.cx - tx0) * T, py = (d.cy - ty0) * T; if (px < -L * T || py < -L * T || px > (n + L) * T || py > (n + L) * T) continue;
        x.save(); x.translate(Math.round(px), Math.round(py)); if (d.hor) x.rotate(Math.PI / 2); x.drawImage(d.spr.img, -Wd * T / 2, -L * T / 2, Wd * T, L * T); x.restore(); }
      for (const d of m.gdecals || []) { const px = (d.x - tx0) * T - d.spr.w / 2, py = (d.y - ty0) * T - d.spr.h / 2; if (px > n * T || py > n * T || px + d.spr.w < 0 || py + d.spr.h < 0) continue; x.drawImage(d.spr.img, Math.round(px), Math.round(py)); }
      for (const [bx, by] of m.bridgeSet) { if (bx < tx0 || by < ty0 || bx >= tx0 + n || by >= ty0 + n) continue; const px = (bx - tx0) * T, py = (by - ty0) * T; x.fillStyle = '#8a5a30'; x.fillRect(px, py, T, T); x.fillStyle = '#a8703a'; for (let j = 0; j < T; j += 6) x.fillRect(px, py + j, T, 4); x.fillStyle = '#5a3a20'; x.fillRect(px, py, T, 1); } };
    m.bridgeSet = [...new Set(bridges.map(b => b[0] + ',' + b[1]))].map(k => k.split(',').map(Number));
    return m;
  };
  // ---------- ground decals: farmland + bridges (painted onto the terrain canvas) ----------
  const rm0 = E.renderMapCanvas; E.renderMapCanvas = (m) => { rm0(m); if (!m.canvas || (!m.fields && !m.bridges)) return; const x = m.canvas.getContext('2d'); const T = G.TS;
    const CROP = [['#9ad04a', '#6a9a2a'], ['#e8c84a', '#b89a2a'], ['#7ab84a', '#4a8a2a'], ['#c8d860', '#98a830']];
    for (const f of m.fields || []) { const [a, b] = CROP[f.crop]; const px = f.x * T, py = f.y * T, w = f.w * T, h = f.h * T; x.fillStyle = '#6a5a3a'; x.fillRect(px - 1, py - 1, w + 2, h + 2); x.fillStyle = '#8a6a44'; x.fillRect(px, py, w, h);
      for (let j = 0; j < h; j += 6) { x.fillStyle = a; x.fillRect(px + 1, py + j + 1, w - 2, 3); x.fillStyle = b; for (let i = 2; i < w - 2; i += 5) x.fillRect(px + i, py + j + 1, 2, 2); } }
    const seen = new Set(); for (const [bx, by] of m.bridges || []) { const k = bx + ',' + by; if (seen.has(k)) continue; seen.add(k); const px = bx * T, py = by * T; x.fillStyle = '#8a5a30'; x.fillRect(px, py, T, T); x.fillStyle = '#a8703a'; for (let j = 0; j < T; j += 6) x.fillRect(px, py + j, T, 4); x.fillStyle = '#5a3a20'; x.fillRect(px, py, T, 1); } };
  // keep trees/rocks out of the walls, villages, fields and warp gates
  const nat = G.NAT; // nature.js reads m.noNat if present (patched below)
  // ---------- mode wiring ----------
  const tm0 = S.TownMode;
  S.TownMode = (id) => { const M = tm0(id); if (id !== 'aurelion') return M;
    M.build = () => genCity();
    const init0 = M.init.bind(M); M.init = function () { init0(); this.mobs = []; this.respawnT = 0; this.fill(true); const m = W.map;
      this.portals = (this.portals || []).concat(m.warps.map(wp => ({ x: wp.x, y: wp.y, step: true, use: () => { if (wp.to === 'wb') S.goWorldBoss(); else if (wp.to === 'dg') { UI.openPanel('dungeon'); } else S.goFarm(wp.to); } }))); };
    M.fill = function (first) { const m = W.map; const want = 240; const alive = W.units.filter(u => u.kind === 'mob' && !u.dead).length; const L = Math.max(1, Math.min(14, S.save.lvl));
      const qz = G.CITY_QPOINT && D.MAIN_QUESTS[S.save.quests.main] && (D.MAIN_QUESTS[S.save.quests.main].type === 'akill' || D.MAIN_QUESTS[S.save.quests.main].type === 'aelite') ? G.CITY_QPOINT(D.MAIN_QUESTS[S.save.quests.main]) : null;
      for (let k = alive, guard = 0; k < want + (qz ? 25 : 0) && guard < 500; guard++) { const nearQ = qz && Math.random() < 0.45; const x = nearQ ? U.clamp(qz.x + U.rf(-16, 16), 3, N - 3) : U.rf(3, N - 3), y = nearQ ? U.clamp(qz.y + U.rf(-16, 16), 3, N - 3) : U.rf(3, N - 3); if (m.inWall(x, y, 4) || E.blocked(x, y) || m.tiles[E.idx(m, x, y)] === 2 || m.tiles[E.idx(m, x, y)] === 3) continue; if (m.vill.some(([vx, vy]) => Math.abs(x - vx) < m.VR + 4 && Math.abs(y - vy) < m.VR + 4)) continue; if (U.d2(x, y, m.spawn.x, m.spawn.y) < 100) continue;
        const band = G.CITY_BAND ? G.CITY_BAND(m, x, y) : [1, 5]; const lv = U.clamp(U.ri(band[0], band[1]), 1, 5); let di = D.FARM_MAPS.findIndex(f => lv >= f.lv[0] && lv <= f.lv[1]); if (di < 0) di = 0; const def = D.FARM_MAPS[di]; const md = U.pick(def.mobs); const qE = qz && D.MAIN_QUESTS[S.save.quests.main].type === 'aelite'; const grade = Math.random() < (qE && nearQ ? 0.5 : 0.1) ? 'elite' : 'normal'; const u = E.spawn(S.mkMob(md, lv, grade, x, y, { leash: 7, elem: def.elem || 'nature' })); u.aggro = 3.5; u.cityMob = true; k++; } };
    const up0 = M.update.bind(M); M.update = function (dt) { up0(dt); this.respawnT -= dt; if (this.respawnT <= 0) { this.respawnT = 6; for (let i = W.units.length - 1; i >= 0; i--) { const u = W.units[i]; if (u.kind === 'mob' && u.dead && u.deadT > 3) W.units.splice(i, 1); } this.fill(false); }
      for (const u of W.units) if (u.cityMob && !u.dead && W.map.inWall(u.x, u.y, 1)) { u.target = null; u.ai.ret = true; } };
    M.onKill = function (t, k) { if (!t || t.kind !== 'mob') return; const kk = k && (k.owner || k); if (!(kk === W.player || (kk && kk.team === 0 && kk.isMerc))) return; const s = S.save; s.stats.kills++; S.codexKill(t.md.n); S.quest('kill', 1, {}); S.gainXp(S.mobXp(t)); s.gold += Math.round(3 + t.lvl * 2); if (Math.random() < (t.grade === 'elite' ? 0.6 : 0.16)) S.dropLoot(t.x, t.y, S.rollDrop('farm', U.clamp(Math.ceil(t.lvl / 6) + (t.grade === 'elite' ? 1 : 0), 1, 3), Math.max(1, t.lvl / 2))); };
    M.safe = false; M.autoCtl = () => ({ vision: 12 });
    M.renderTop = (ctx, cam) => { const O = E.octx, F = G.PXS || 2; if (!O) return; O.save(); O.textAlign = 'center'; O.font = '600 12px Kanit, sans-serif'; for (const wp of W.map.warps) { if (!E.vis(wp.x, wp.y)) continue; const [sx, sy] = cam.w2s(wp.x, wp.y); O.lineWidth = 3; O.strokeStyle = '#0e0c14'; O.strokeText('⇪ ' + wp.th, sx * F, (sy - 30) * F); O.fillStyle = '#7af0ff'; O.fillText('⇪ ' + wp.th, sx * F, (sy - 30) * F); } O.restore(); };
    M.hud = () => `<b>นครออเรเลียน</b> · ในกำแพงปลอดภัย · นอกกำแพงมีมอนสเตอร์ · ประตูวาร์ปอยู่ปลายถนนทุกสาย`;
    return M; };
  // protect the inside of the walls: monsters never deal damage there and cannot enter
  const install = () => { if (E._city) return; E._city = true; const h0 = E.hit; E.hit = (src, t, pow, s, o) => { const m = W.map; if (m && m.id === 'aurelion' && m.inWall && t && t.kind === 'hero') { const own = src && (src.owner || src); if (own && own.kind === 'mob' && m.inWall(t.x, t.y, 0)) return 0; } return h0(src, t, pow, s, o); }; };
  document.addEventListener('DOMContentLoaded', install); setTimeout(install, 0);
})(G);
// ---------- villages, save points, new-player tutorial, single main city ----------
(function (G) {
  const U = G.U, D = G.D, E = G.E, W = G.W, S = G.S, SPR = G.SPR, V = G.VFX, UI = G.UI; const $ = s => document.querySelector(s);
  const VN = ['หมู่บ้านต้นโอ๊ก', 'หมู่บ้านธารเงิน', 'หมู่บ้านทุ่งทอง', 'หมู่บ้านริมบึง', 'หมู่บ้านเริ่มต้น', 'หมู่บ้านเนินลม', 'หมู่บ้านป่าสน', 'หมู่บ้านสะพานไม้'];
  const START_V = 4;
  // remove the separate newbie town: everything routes to Aurelion
  D.TOWNS = D.TOWNS.filter(t => t.id !== 'haven'); D.TOWNS.forEach(t => { if (t.id === 'aurelion') t.th = 'นครออเรเลียน (เมืองหลัก)'; });
  const gt0 = S.goTown; S.goTown = () => gt0('aurelion');
  const ns0 = S.newSave; S.newSave = function () { const s = ns0.apply(this, arguments); s.lastTown = 'aurelion'; s.tut = 0; s.tutK = 0; return s; };
  // save crystal sprite
  let CR = null; const crystal = () => { if (CR) return CR; const [cv, x] = SPR.mk(24, 40); const px = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
    px(4, 34, 16, 5, '#7a7a82'); px(6, 32, 12, 3, '#9a9aa2'); x.fillStyle = '#5ad8ff'; x.beginPath(); x.moveTo(12, 2); x.lineTo(19, 16); x.lineTo(12, 32); x.lineTo(5, 16); x.fill(); x.fillStyle = '#c8f4ff'; x.beginPath(); x.moveTo(12, 2); x.lineTo(12, 32); x.lineTo(5, 16); x.fill(); px(11, 8, 2, 14, '#ffffff'); return CR = { img: cv, w: 24, h: 40 }; };
  // add save points + names after generation
  const tm0 = S.TownMode; S.TownMode = (id) => { const M = tm0('aurelion'); const b0 = M.build;
    M.build = () => { const m = b0(); m.saves = m.vill.map(([x, y], i) => ({ x: Math.floor(x) + 0.5, y: Math.floor(y) + 0.5, name: VN[i] || 'หมู่บ้าน ' + (i + 1), i })); for (const sp of m.saves) { const ob = G.DECO_SPR && G.DECO_SPR('obelisk'), pt = G.DECO_SPR && G.DECO_SPR('portal', 0.8); if (pt) m.props.push({ x: sp.x, y: sp.y + 0.25, kind: 'bld', spr: pt, deco: true }); m.props.push({ x: sp.x, y: sp.y + 0.4, kind: 'bld', spr: ob || crystal() }); m.block[E.idx(m, sp.x, sp.y)] = 2; } const cs = m.citySave || { x: m.c + 0.5, y: m.c + 3 }; m.saves.push({ x: cs.x, y: cs.y, name: 'นครออเรเลียน', i: 99, city: true }); return m; };
    M.playerSpawn = () => { const m = W.map, s = S.save; const sp = s && s.savePt != null ? m.saves.find(x => x.i === s.savePt) : null; if (sp) return S.freePt(m, sp.x, sp.y + 2); if (s && s.tut != null && s.tut < 99) { const v = m.saves[START_V]; return { x: v.x, y: v.y + 5 }; } return m.spawn; };
    const up0 = M.update.bind(M); M.update = function (dt) { up0(dt); const p = W.player, m = W.map, s = S.save; if (!p) return;
      for (const sp of m.saves) { const near = U.d2(p.x, p.y, sp.x, sp.y) < 4; if (!near) { if (M._askSp === sp) M._askSp = null; continue; } if (s.savePt === sp.i || M._askSp === sp || (S.auto && S.auto.on)) continue; M._askSp = sp;
        const cur = s.savePt != null ? m.saves.find(x => x.i === s.savePt) : null; UI.modal(`<h2>บันทึกจุดเซฟ?</h2><p>ตั้ง <b>${UI.esc(sp.name)}</b> เป็นจุดเกิดใหม่เมื่อตาย${cur ? `<br><small class="muted">จุดเซฟปัจจุบัน: ${UI.esc(cur.name)}</small>` : ''}</p><div class="list"><button class="btn primary" data-act="sp-yes" data-i="${sp.i}">✔ บันทึกจุดนี้</button><button class="btn" data-act="sp-no">ยกเลิก</button></div>`); }
      if (p.dead && p.deadT > 3) { const sp = s.savePt != null ? m.saves.find(x => x.i === s.savePt) : null; const at = sp || m.saves[m.saves.length - 1]; p.dead = false; p.hp = p.maxhp; const ap = S.freePt(m, at.x, at.y + 2); p.x = ap.x; p.y = ap.y; p.invulnT = W.time + 3; UI.toast('ฟื้นคืนชีพที่ ' + at.name, 'info'); }
      tutTick(); };
    const rt0 = M.renderTop; M.renderTop = (ctx, cam) => { rt0 && rt0(ctx, cam); const O = E.octx, F = G.PXS || 2; if (!O) return; O.save(); O.textAlign = 'center'; O.font = '600 12px Kanit, sans-serif';
      for (const sp of W.map.saves) { if (!E.vis(sp.x, sp.y)) continue; const [sx, sy] = cam.w2s(sp.x, sp.y); const on = S.save.savePt === sp.i; O.lineWidth = 3; O.strokeStyle = '#0e0c14'; const t = (on ? '★ ' : '') + sp.name; O.strokeText(t, sx * F, (sy - 46) * F); O.fillStyle = on ? '#ffd84a' : '#c8f4ff'; O.fillText(t, sx * F, (sy - 46) * F); }
      const tg = tutTarget(); if (tg) { const [sx, sy] = cam.w2s(tg.x, tg.y); const b = Math.abs(Math.sin(W.time * 4)) * 8; O.fillStyle = '#ffd84a'; O.strokeStyle = '#3a2a0a'; O.lineWidth = 2; const X = sx * F, Y = (sy - 40) * F - b * F; O.beginPath(); O.moveTo(X, Y + 16); O.lineTo(X - 10, Y); O.lineTo(X - 4, Y); O.lineTo(X - 4, Y - 12); O.lineTo(X + 4, Y - 12); O.lineTo(X + 4, Y); O.lineTo(X + 10, Y); O.closePath(); O.fill(); O.stroke();
        const p = W.player; const d = Math.hypot(tg.x - p.x, tg.y - p.y); if (d > 14) { const a = Math.atan2(tg.y - p.y, tg.x - p.x); const [px, py] = cam.w2s(p.x, p.y); const cx = px * F + Math.cos(a) * 70, cy = (py - 14) * F + Math.sin(a) * 70; O.save(); O.translate(cx, cy); O.rotate(a); O.fillStyle = '#ffd84a'; O.beginPath(); O.moveTo(14, 0); O.lineTo(-6, -8); O.lineTo(-6, 8); O.fill(); O.restore(); O.fillStyle = '#ffd84a'; O.font = '600 11px Kanit, sans-serif'; O.fillText(Math.round(d) + ' ช่อง', cx, cy + 22); } }
      O.restore(); };
    const hud0 = M.hud; M.hud = () => { const s = S.save; const T = TUT[s.tut]; return T ? `<b>บทเรียน ${s.tut + 1}/${TUT.length}</b> · ${T.th}${T.n ? ` (${s.tutK || 0}/${T.n})` : ''}` : hud0(); };
    return M; };
  { const a0 = UI.act; UI.act = (el, e) => { const k = el.dataset.act; if (k === 'sp-yes' || k === 'sp-no') { UI.closeModal(); if (k === 'sp-yes' && W.map && W.map.saves && S.save) { const sp = W.map.saves.find(x => x.i === +el.dataset.i); if (sp) { S.save.savePt = sp.i; UI.toast(`บันทึกจุดเซฟ: ${sp.name}`, 'good'); if (E.vis(sp.x, sp.y)) { V.ring(sp.x, sp.y, 1.6, ['#ffffff', '#c8f4ff', '#5ad8ff'], 0.7, { w: 3 }); V.pillar(sp.x, sp.y, '#5ad8ff', 80, 0.8, 8); } S.persist(); tutEv('save'); } } return; } return a0(el, e); }; }
  // ---------- tutorial along the road from the starting village to the city ----------
  const TUT = [
    { th: 'เดินด้วย W A S D หรือคลิกพื้น — เดินไปที่ลูกศรสีทอง', at: m => ({ x: m.saves[START_V].x + 6, y: m.saves[START_V].y + 6 }), reach: 2 },
    { th: 'เดินไปแตะคริสตัลสีฟ้าเพื่อบันทึกจุดเซฟของหมู่บ้าน (ตายแล้วจะฟื้นที่นี่)', at: m => m.saves[START_V], reach: 2.2 },
    { th: 'คลิกมอนสเตอร์เพื่อล็อกเป้า (วงแดง) ตัวละครจะโจมตีปกติเอง — กำจัด 3 ตัว', ev: 'kill', n: 3 },
    { th: 'ใช้สกิล: กดปุ่ม 1 หรือคลิกไอคอนสกิลแถวล่างใส่ศัตรู', ev: 'skill' },
    { th: 'กด I เปิดกระเป๋า ดูอุปกรณ์และใช้ "ออโต้สวมใส่"', ev: 'inv' },
    { th: 'กด K ดูหน้าสกิลและแพสซีฟ (ไอคอนแนวตั้งซ้ายจอ)', ev: 'skills' },
    { th: 'เดินตามถนนขึ้นเหนือไปยังประตูเมืองทิศใต้', at: m => ({ x: m.c, y: m.c + 21 }), reach: 3.5 },
    { th: 'แตะจุดเซฟนครออเรเลียนที่ลานน้ำพุกลางเมืองเพื่อจบบทเรียน', at: m => m.citySave || { x: m.c, y: m.c }, reach: 2.5 }
  ];
  const tutTarget = () => { const s = S.save; const T = s && TUT[s.tut]; if (!T || !T.at || !W.map || !W.map.saves) return null; return T.at(W.map); };
  const next = () => { const s = S.save; s.tut++; s.tutK = 0; if (s.tut >= TUT.length) { s.tut = 99; s.gold += 5000; s.bag.hpPot = (s.bag.hpPot || 0) + 20; s.bag.mpPot = (s.bag.mpPot || 0) + 20; S.gainXp && S.gainXp(400); UI.announce && UI.announce('จบบทเรียน', 'ยินดีต้อนรับสู่นครออเรเลียน! ได้รับ 5,000 ทอง + ยา 40 ขวด'); } else UI.toast('บทเรียน: ' + TUT[s.tut].th, 'info'); S.persist(); };
  const tutEv = (ev) => { const s = S.save; const T = s && TUT[s.tut]; if (!T || T.ev !== ev || !W.map || W.map.id !== 'aurelion') return; s.tutK = (s.tutK || 0) + 1; if (s.tutK >= (T.n || 1)) next(); };
  const tutTick = () => { const s = S.save; const T = s && TUT[s.tut]; if (!T || !T.reach) return; const tg = tutTarget(), p = W.player; if (tg && p && Math.hypot(tg.x - p.x, tg.y - p.y) < T.reach) next(); };
  const install = () => { if (E._tut) return; E._tut = true;
    const k0 = E.kill; E.kill = (t, k) => { const was = t && !t.dead; const r = k0(t, k); if (was && t.dead && t.kind === 'mob' && k && (k === W.player || k.owner === W.player)) tutEv('kill'); return r; };
    const x0 = E.exec; E.exec = (u, s, A) => { const r = x0(u, s, A); if (u === W.player && s && s.dmg) tutEv('skill'); return r; };
    const o0 = UI.openPanel; UI.openPanel = (id, tab) => { const r = o0(id, tab); if (id === 'inv') tutEv('inv'); if (id === 'skills') tutEv('skills'); return r; }; };
  document.addEventListener('DOMContentLoaded', install); setTimeout(install, 0);
  // old saves: skip tutorial
  const ld = S.load; if (ld) S.load = function () { const s = ld.apply(this, arguments); if (s && s.tut == null) s.tut = 99; if (s && s.lastTown === 'haven') s.lastTown = 'aurelion'; return s; };
})(G);
// ---------- village NPCs, city NPC districts + names, main-map quest chain ----------
(function (G) {
  const U = G.U, D = G.D, E = G.E, W = G.W, S = G.S, SPR = G.SPR, V = G.VFX, UI = G.UI;
  const ORDER = [4, 5, 3, 0, 6, 1, 2, 7]; const BANDS = [[1, 2], [1, 2], [2, 3], [2, 3], [3, 4], [3, 4], [4, 5], [4, 5]]; // main map: monsters Lv 1–5 only
  const VN = ['หมู่บ้านต้นโอ๊ก', 'หมู่บ้านธารเงิน', 'หมู่บ้านทุ่งทอง', 'หมู่บ้านริมบึง', 'หมู่บ้านเริ่มต้น', 'หมู่บ้านเนินลม', 'หมู่บ้านป่าสน', 'หมู่บ้านสะพานไม้'];
  // monster level band = band of the nearest village (city surroundings are the gentlest)
  G.CITY_BAND = (m, x, y) => { let bi = 0, bd = 1e9; m.vill.forEach(([vx, vy], i) => { const d = U.d2(x, y, vx, vy); if (d < bd) { bd = d; bi = i; } }); const j = ORDER.indexOf(bi); return BANDS[Math.max(0, j)]; };
  // NPC names that say what they do
  const NAMES = { quest: 'ผู้ให้ภารกิจ', shop: 'ร้านเสบียงและยา', smith: 'ช่างตีบวกอุปกรณ์', jeweler: 'ช่างฝังอัญมณี', runesmith: 'ช่างแกะสลักรูน', tailor: 'ช่างตัดชุดแฟชั่น', market: 'ตลาดประมูล', merc: 'ค่ายทหารรับจ้าง', arena: 'ผู้คุมสนาม PvP', guild: 'ทูตกิลด์และยึดปราสาท', dungeon: 'ผู้เฝ้าประตูดันเจี้ยน', teleport: 'ประตูวาร์ป', codex: 'บรรณารักษ์สมุดสะสม', stable: 'คอกสัตว์เลี้ยงและพาหนะ' };
  if (D.NPCS.aurelion) D.NPCS.aurelion.forEach(n => { if (NAMES[n.role]) n.n = NAMES[n.role]; });
  const VROLES = [['quest', 'ผู้ใหญ่บ้าน'], ['shop', 'ร้านค้าหมู่บ้าน'], ['smith', 'ช่างตีเหล็กหมู่บ้าน'], ['stable', 'คอกม้าหมู่บ้าน']];
  const tm0 = S.TownMode; S.TownMode = (id) => { const M = tm0(id); const i0 = M.init.bind(M);
    M.init = function () { i0(); const m = W.map;
      // spread the city NPCs over the districts
      const city = W.units.filter(u => u.kind === 'npc' && !u.sim); const RB = { quest: ['palace'], shop: ['shop', 'clinic', 'market_red'], smith: ['smithy'], runesmith: ['smithy'], jeweler: ['shop', 'guild'], tailor: ['shop'], market: ['stall'], merc: ['castle'], arena: ['castle'], guild: ['guild'], dungeon: ['castle'], teleport: ['cathedral'], codex: ['cathedral'], stable: ['warehouse', 'inn'] };
      const blds = m.props.filter(q => q.city && q.bt); const used = new Map(); const pickB = u => { const want = RB[u.role] || []; let best = null, bs = 1e9; for (const q of blds) { const n = used.get(q) || 0; const sc = (want.includes(q.bt) ? 0 : 100) + n * 30 + (q.bt === 'house' ? 5 : 0); if (sc < bs) { bs = sc; best = q; } } if (best) used.set(best, (used.get(best) || 0) + 1); return best ? [best, used.get(best) - 1] : [null, 0]; };
      city.forEach((u, i) => { const [h, k] = pickB(u); const d = h ? { x: h.x + (k ? (k % 2 ? 2.6 : -2.6) * Math.ceil(k / 2) : 0), y: h.y + (h.bt === 'stall' ? 0.6 : 0.9) } : m.districts[i % m.districts.length]; const p = S.freePt(m, d.x, d.y); u.x = p.x; u.y = p.y; u.home = { x: p.x, y: p.y }; u.cityNpc = true; u.label = true; E.face(u, p.x, p.y + 1); });
      for (const u of W.units) if (u.sim && u.home && U.d2(u.home.x, u.home.y, m.c, m.c) < 4) { const d = U.pick(m.districts); const p = S.freePt(m, d.x + U.rf(-4, 4), d.y + U.rf(-4, 4)); u.x = p.x; u.y = p.y; u.home = { x: d.x, y: d.y }; u.wr = 6; }
      // village NPCs around each village square
      m.vill.forEach(([vx, vy], vi) => VROLES.forEach(([role, th], k) => { const a = k / VROLES.length * 6.283 + 0.6; const VB = { quest: ['hall_blue', 'inn', 'guild'], shop: ['shop', 'market_red', 'clinic'], smith: ['smithy', 'smithy2'], stable: ['warehouse', 'inn', 'house'] }; const vb = m.props.filter(q => q.vk === vi && !q._npc); const hb = vb.find(q => (VB[role] || []).includes(q.bt)) || vb.sort((q1, q2) => U.d2(q1.x, q1.y, vx, vy) - U.d2(q2.x, q2.y, vx, vy))[0]; if (hb) hb._npc = true; const p = hb ? S.freePt(m, hb.x, hb.y + 1.4) : S.freePt(m, Math.floor(vx) + 0.5 + Math.cos(a) * 4, Math.floor(vy) + 0.5 + Math.sin(a) * 3.5); const cls = D.CLASSES[(vi * 4 + k) % D.CLASSES.length].id;
        const u = E.mkUnit({ kind: 'npc', team: 9, x: p.x, y: p.y, name: `${th} (${VN[vi]})`, role, roleTh: th, look: SPR.lookFor(cls), label: role === 'quest', st: { def: 0 } }); u.vk = vi; E.face(u, p.x, p.y + 1); E.spawn(u); }));
      // simulated players also hang out in villages
      for (let k = 0; k < 24; k++) { const [vx, vy] = U.pick(m.vill); const cls = U.pick(D.CLASSES).id; const p = S.freePt(m, vx + U.rf(-8, 8), vy + U.rf(-8, 8)); const u = E.mkUnit({ kind: 'npc', team: 9, x: p.x, y: p.y, name: U.pick(D.NAMES) + U.ri(1, 999), look: SPR.lookFor(cls), wander: true, wr: 6, sim: true, st: { def: 0 } }); u.home = { x: vx, y: vy }; E.spawn(u); } };
    // auto: go where the current main-map quest points
    M.autoCtl = () => { const q = D.MAIN_QUESTS[S.save.quests.main]; const g = q && questPoint(q); if (g && (q.type === 'akill' || q.type === 'aelite')) { const [vx, vy] = W.map.vill[q.zone]; const VR = W.map.VR; return { vision: 14, allow: e => e.kind === 'mob', goal: () => { const p = W.player; let best = null, bd = 1e9; for (const e of W.units) { if (e.kind !== 'mob' || e.dead || (q.type === 'aelite' && e.grade === 'normal')) continue; if (U.d2(e.x, e.y, vx, vy) > 48 * 48 || (Math.abs(e.x - vx) < VR && Math.abs(e.y - vy) < VR)) continue; const d = U.d2(e.x, e.y, p.x, p.y); if (d < bd) { bd = d; best = e; } } return best || { x: g.x, y: g.y, r: 6 }; } }; }
      if (g) return { vision: 4, goal: () => ({ x: g.x, y: g.y, r: 1.5 }) }; return { vision: 12 }; };
    return M; };
  // ---------- quest chain (only in the main map) ----------
  const Q = []; ORDER.forEach((vi, j) => { const [lo, hi] = BANDS[j]; const V0 = VN[vi];
    if (j > 0) Q.push({ id: 'a' + j + 'r', th: `เดินทางไป${V0}`, type: 'areach', zone: vi, n: 1, xp: 1, lv: lo });
    Q.push({ id: 'a' + j + 't', th: `คุยกับผู้ใหญ่บ้าน${V0}`, type: 'atalk', zone: vi, n: 1, xp: 1, lv: lo });
    Q.push({ id: 'a' + j + 'k', th: `กำจัดมอนสเตอร์รอบ${V0} 15 ตัว (Lv ${lo}–${hi})`, type: 'akill', zone: vi, n: 15, xp: 2, lv: lo });
    Q.push({ id: 'a' + j + 'e', th: `ล่า Elite รอบ${V0} 2 ตัว`, type: 'aelite', zone: vi, n: 2, xp: 3, lv: lo + 2 });
    if (j % 2 === 1 || j === ORDER.length - 1) Q.push({ id: 'a' + j + 'c', th: 'กลับไปรายงานผู้ให้ภารกิจที่ลานกลางนครออเรเลียน', type: 'acity', n: 1, xp: 3, lv: lo }); });
  D.MAIN_QUESTS.length = 0; Q.forEach(q => D.MAIN_QUESTS.push(q));
  const questPoint = (q) => { const m = W.map; if (!m || m.id !== 'aurelion' || !m.vill) return null; if (q.type === 'acity') { const u = W.units.find(x => x.role === 'quest' && x.cityNpc); return u ? { x: u.x, y: u.y } : { x: m.c, y: m.c }; } const [vx, vy] = m.vill[q.zone];
    if (q.type === 'atalk') { const u = W.units.find(x => x.role === 'quest' && x.vk === q.zone); return u ? { x: u.x, y: u.y } : { x: vx, y: vy }; } if (q.type === 'areach') return { x: vx, y: vy };
    // hunt just outside the village wall, on the side away from the city
    const a = Math.atan2(vy - m.c, vx - m.c); const R = m.VR + 12; let x = vx + Math.cos(a) * R, y = vy + Math.sin(a) * R; if (x < 8 || y < 8 || x > m.w - 8 || y > m.h - 8) { const a2 = a + Math.PI / 2; x = vx + Math.cos(a2) * R; y = vy + Math.sin(a2) * R; } return { x: U.clamp(x, 6, m.w - 6), y: U.clamp(y, 6, m.h - 6) }; };
  G.CITY_QPOINT = questPoint;
  const done = () => S.completeMain();
  const cur = () => S.save && D.MAIN_QUESTS[S.save.quests.main];
  const inst = () => { if (E._aq) return; E._aq = true;
    const k0 = E.kill; E.kill = (t, k) => { const was = t && !t.dead; const r = k0(t, k); const q = cur(); const kk = k && (k.owner || k); if (was && t.dead && q && W.map && W.map.id === 'aurelion' && kk === W.player && t.kind === 'mob' && (q.type === 'akill' || q.type === 'aelite')) { const [vx, vy] = W.map.vill[q.zone]; if (U.d2(t.x, t.y, vx, vy) < 50 * 50 && (q.type === 'akill' || t.grade !== 'normal')) { S.save.quests.prog++; if (S.save.quests.prog >= q.n) done(); } } return r; };
    const on0 = UI.openNpc; UI.openNpc = (npc) => { const q = cur(); if (q && npc && npc.role === 'quest' && ((q.type === 'atalk' && npc.vk === q.zone) || (q.type === 'acity' && npc.cityNpc))) { done(); UI.toast(`${npc.name}: ขอบใจมาก! รับภารกิจถัดไปได้เลย`, 'good'); return; } return on0(npc); }; };
  document.addEventListener('DOMContentLoaded', inst); setTimeout(inst, 0);
  // reach checks + auto-talk when standing next to the quest NPC (auto mode)
  setInterval(() => { try { const q = cur(), p = W.player; if (!q || !p || !W.map || W.map.id !== 'aurelion' || (S.save.tut != null && S.save.tut < 99)) return; const g = questPoint(q); if (!g) return; const d = Math.hypot(g.x - p.x, g.y - p.y);
      if (q.type === 'areach' && d < 6) done(); else if ((q.type === 'atalk' || q.type === 'acity') && d < 2.6 && S.auto && S.auto.on) { const u = W.units.find(x => x.role === 'quest' && (q.type === 'acity' ? x.cityNpc : x.vk === q.zone)); if (u) UI.openNpc(u); } } catch (e) { } }, 500);
  // auto-quest stays in the main map
  const aq0 = S.autoQuestStep; S.autoQuestStep = (dt) => { const q = cur(); if (!q) { S.auto.on = true; return; } if (!/^a/.test(q.type)) return aq0 && aq0(dt); const m = W.mode; if (!m) return; S.auto.on = true; if (m.kind === 'dungeon' && !m.ended) return; if (!W.map || W.map.id !== 'aurelion') { UI.toast('ออโต้ภารกิจ: กลับนครออเรเลียน', 'info'); S.goTown('aurelion'); } };
  // quest marker arrow for the current main quest (re-uses the tutorial arrow when the tutorial is over)
  const rt = () => { const m = W.mode; if (!m || m._qa || m.kind !== 'town') return; m._qa = true; const r0 = m.renderTop; m.renderTop = (ctx, cam) => { r0 && r0(ctx, cam); const q = cur(); if (!q || (S.save.tut != null && S.save.tut < 99)) return; const g = questPoint(q); const O = E.octx, F = G.PXS || 2, p = W.player; if (!g || !O || !p) return; const d = Math.hypot(g.x - p.x, g.y - p.y);
      O.save(); if (d > 10) { const a = Math.atan2(g.y - p.y, g.x - p.x); const [px, py] = cam.w2s(p.x, p.y); const cx = px * F + Math.cos(a) * 64, cy = (py - 14) * F + Math.sin(a) * 64; O.translate(cx, cy); O.rotate(a); O.fillStyle = '#7af0ff'; O.beginPath(); O.moveTo(12, 0); O.lineTo(-6, -7); O.lineTo(-6, 7); O.fill(); O.rotate(-a); O.font = '600 11px Kanit, sans-serif'; O.textAlign = 'center'; O.fillText('ภารกิจ ' + Math.round(d) + ' ช่อง', 0, 20); }
      else if (E.vis(g.x, g.y)) { const [sx, sy] = cam.w2s(g.x, g.y); O.fillStyle = '#7af0ff'; O.font = '700 18px Kanit, sans-serif'; O.textAlign = 'center'; O.fillText('!', sx * F, (sy - 40 - Math.abs(Math.sin(W.time * 4)) * 6) * F); } O.restore(); }; };
  setInterval(() => { try { rt(); } catch (e) { } }, 300);
})(G);
// ---------- living world: bot players leave the city to farm, explore, travel between villages and chat ----------
(function (G) {
  const U = G.U, D = G.D, E = G.E, W = G.W, S = G.S, V = G.VFX;
  const LINES = ['ไปฟามกันมั้ย', 'แถวนี้มอนเยอะดี', 'ใครไปหมู่บ้านป่าสนบ้าง', 'Elite ตัวนี้แรงจัง', 'เก็บเลเวลก่อนไปบอสโลก', 'ดรอปของดีแล้ว!', 'ใครมีหินตีบวกขายบ้าง', 'เดินสำรวจแมพหน่อย', 'กลับไปเซฟที่หมู่บ้านก่อน', 'มีปาตี้ว่างมั้ย', 'ไปเมืองหลักซ่อมของ', 'วงเวทใหม่สวยมาก', 'เหนื่อยแล้ว พักก่อน', 'ลุย!'];
  const say = (u, t) => { u.say = t || U.pick(LINES.concat(D.CHAT || [])); u.sayT = W.time + 4; if (E.vis(u.x, u.y) && G.UI && Math.random() < 0.3) G.UI.log(`${u.name}: ${u.say}`, 'chat'); };
  const pickGoal = (u) => { const m = W.map; const r = Math.random();
    if (r < 0.45) { const [vx, vy] = U.pick(m.vill); const a = U.rf(0, 6.28), d = m.VR + U.rf(8, 26); u.wb = { x: U.clamp(vx + Math.cos(a) * d, 6, m.w - 6), y: U.clamp(vy + Math.sin(a) * d, 6, m.h - 6), kind: 'farm', t: U.rf(40, 90) }; }
    else if (r < 0.75) { const [vx, vy] = U.pick(m.vill); u.wb = { x: vx + U.rf(-5, 5), y: vy + U.rf(-5, 5), kind: 'village', t: U.rf(15, 35) }; }
    else if (r < 0.9) { const d = U.pick(m.districts); u.wb = { x: d.x, y: d.y, kind: 'city', t: U.rf(15, 30) }; }
    else u.wb = { x: U.rf(10, m.w - 10), y: U.rf(10, m.h - 10), kind: 'explore', t: U.rf(20, 40) }; };
  const brain = (u, dt) => { const P = W.player; if (P && U.d2(u.x, u.y, P.x, P.y) > 45 * 45) { u._fT = (u._fT || 0) + dt; if (u._fT < 0.25) return; dt = u._fT; u._fT = 0; const g = u.wb; if (!g) { pickGoal(u); return; } const dx = g.x - u.x, dy = g.y - u.y, l = Math.hypot(dx, dy); if (l < 3) { g.t -= dt; if (g.t <= 0) pickGoal(u); return; } const st = Math.min(l, u.moveSpd * dt); const nx = u.x + dx / l * st, ny = u.y + dy / l * st; if (!E.blocked(nx, ny)) { u.x = nx; u.y = ny; } else pickGoal(u); return; } const g = u.wb; if (!g) { pickGoal(u); return; } const arrived = U.d2(u.x, u.y, g.x, g.y) < 9; if (arrived) g.t -= dt; if (g.t <= 0) { pickGoal(u); if (Math.random() < 0.5) say(u); return; }
    if (Math.random() < dt * 0.025) say(u);
    E.heroAI(u, dt, { vision: g.kind === 'farm' ? 10 : 4, allow: e => e.kind === 'mob', goal: () => (arrived && g.kind === 'farm' ? null : { x: g.x, y: g.y, r: 2.5 }) }); };
  const tm0 = S.TownMode; S.TownMode = (id) => { const M = tm0(id); const i0 = M.init.bind(M);
    M.init = function () { i0(); const m = W.map; this.wbots = []; const L = S.save.lvl;
      for (let k = 0; k < 28; k++) { const cls = U.pick(D.CLASSES).id; const lv = U.clamp(L + U.ri(-6, 8), 1, D.MAX_LV); const st0 = U.pick(m.districts.concat(m.vill.map(([x, y]) => ({ x, y })))); const p = S.freePt(m, st0.x + U.rf(-3, 3), st0.y + U.rf(-3, 3));
        const u = S.makeBot(cls, 6, 0, 2, { stats: S.worldBotStats ? S.worldBotStats(cls, lv, 1).st : undefined, lvl: lv, x: p.x, y: p.y, bot: false, name: U.pick(D.NAMES) + U.ri(1, 999) }); u.wanderBot = true; u.brain = brain; E.spawn(u); this.wbots.push(u); } };
    const up0 = M.update.bind(M); M.update = function (dt) { up0(dt); for (const u of this.wbots || []) if (u.dead && u.deadT > 6) { const [vx, vy] = U.pick(W.map.vill); const p = S.freePt(W.map, vx, vy + 3); u.dead = false; u.hp = u.maxhp; u.x = p.x; u.y = p.y; u.wb = null; say(u, 'กลับมาแล้ว!'); } };
    return M; };
  // wandering players are friendly to you and to each other; they only fight monsters
  const inst = () => { if (E._wbots) return; E._wbots = true; const ie = E.isEnemy; E.isEnemy = (a, b) => { if (a && b && (a.wanderBot || b.wanderBot)) { const o = a.wanderBot ? b : a; return o.kind === 'mob' && ie(a, b); } return ie(a, b); }; };
  document.addEventListener('DOMContentLoaded', inst); setTimeout(inst, 0);
})(G);

});
