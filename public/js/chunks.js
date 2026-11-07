'use strict';
/* Chunked ground for huge maps: the terrain is painted lazily in 48×48-tile chunks around the camera (with a margin so
   edges blend seamlessly), cached LRU-style. Map size is no longer limited by canvas memory or load time. */
(function (G) {
  const E = G.E, W = G.W, SPR = G.SPR, TER = G.TER; if (!TER) return;
  const CH = 48, MG = 6, MAXC = 24;
  const sub = (m, cx, cy) => { const x0 = cx * CH - MG, y0 = cy * CH - MG, w = CH + MG * 2, h = CH + MG * 2; const n = w * h;
    const s = { id: m.id, kind: m.kind, w, h, tiles: new Uint8Array(n), block: new Uint8Array(n), fall: new Uint8Array(n), pvp: new Uint8Array(n), props: [], walls: [], points: [], g: m.g, acc: m.acc, bg: m.bg, k: m.k, _clean: true, _sub: true, _core: [MG, MG, MG + CH, MG + CH] };
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const X = Math.min(m.w - 1, Math.max(0, x0 + i)), Y = Math.min(m.h - 1, Math.max(0, y0 + j)); const a = Y * m.w + X, b = j * w + i; s.tiles[b] = m.tiles[a]; s.block[b] = m.block[a] === 1 ? 1 : 0; s.fall[b] = m.fall[a]; s.pvp[b] = m.pvp[a]; }
    return [s, x0, y0]; };
  const paint = (m, cx, cy) => { const TS = G.TS; const [s, x0, y0] = sub(m, cx, cy); TER.OFF.x = x0 * TS; TER.OFF.y = y0 * TS; const t0 = performance.now();
    try { TER.renderGround(s); } finally { TER.OFF.x = 0; TER.OFF.y = 0; }
    const [cv, x] = SPR.mk(CH * TS, CH * TS); if (s.canvas) x.drawImage(s.canvas, MG * TS, MG * TS, CH * TS, CH * TS, 0, 0, CH * TS, CH * TS);
    if (m.paintDecals) m.paintDecals(x, cx * CH, cy * CH, CH);
    m.chunkMs = Math.round(performance.now() - t0); return cv; };
  const get = (m, cx, cy) => { const key = cx + ',' + cy; let c = m.chunks.get(key); if (c) { m.chunks.delete(key); m.chunks.set(key, c); return c; } c = paint(m, cx, cy); m.chunks.set(key, c); while (m.chunks.size > MAXC) m.chunks.delete(m.chunks.keys().next().value); return c; };
  E.drawChunks = (ctx, cam) => { const m = W.map; const TS = G.TS; const [ox, oy] = cam.w2s(0, 0); const vx0 = Math.floor(-ox / TS / CH), vy0 = Math.floor(-oy / TS / CH), vx1 = Math.floor((-ox + E.VW) / TS / CH), vy1 = Math.floor((-oy + E.VH) / TS / CH); const nx = Math.ceil(m.w / CH), ny = Math.ceil(m.h / CH);
    let painted = 0; for (let cy = Math.max(0, vy0); cy <= Math.min(ny - 1, vy1); cy++) for (let cx = Math.max(0, vx0); cx <= Math.min(nx - 1, vx1); cx++) { const had = m.chunks.has(cx + ',' + cy); const c = get(m, cx, cy); if (!had) painted++; ctx.drawImage(c, Math.round(ox + cx * CH * TS), Math.round(oy + cy * CH * TS)); }
    // prefetch one neighbouring chunk per ~200 ms when nothing was painted this frame
    const now = performance.now(); if (!painted && now - (m._pf || 0) > 200) { m._pf = now; const pcx = Math.floor(W.player.x / CH), pcy = Math.floor(W.player.y / CH); outer: for (let r = 1; r <= 1; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const cx = pcx + dx, cy = pcy + dy; if (cx < 0 || cy < 0 || cx >= nx || cy >= ny || m.chunks.has(cx + ',' + cy)) continue; get(m, cx, cy); break outer; } } };
  // enable for big maps
  const rm0 = E.renderMapCanvas; E.renderMapCanvas = (m) => { if (!m._sub && (m.chunked || m.w * m.h > 160 * 160) && TER.ready) { m.chunked = true; m.chunks = new Map(); m.canvas = null; } return rm0(m); };
})(window.G);
