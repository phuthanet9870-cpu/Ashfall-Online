'use strict';
/* Textured terrain for towns / farm maps / PvP / siege (dungeons keep the procedural look).
   Terrain art: "Pixel Fantasy Terrain Pack 4" by Laphkal (credited in Settings).
   Natural look: seamless ground textures with mixed variants + macro light/shade, organic noise-shaped masks for every
   terrain change (no square tiles), wet shores + foam on water, glowing lava rims, cliff faces under chasms, scattered props. */
(function (G) {
  const U = G.U, D = G.D, E = G.E, W = G.W, SPR = G.SPR;
  const TER = G.TER = { ready: false, img: {}, g: {}, sc: {} };
  const BIOMES = ['coral_reef', 'ember_wastes', 'glacier', 'mangrove', 'meadow', 'mesa_canyon', 'oasis', 'obsidian_depths', 'petrified_forest', 'salt_flats', 'storm_peaks', 'tundra'];
  const GS = 32; // ground texture cell size in game pixels (64px source drawn at half scale)
  const cellOf = n => [((n - 1) % 6) * 64, Math.floor((n - 1) / 6) * 64];

  // ---------- themes: [biome, material pair 0..3] ----------
  const M = (b, p) => ({ b, p });
  const TH = {
    // farm maps
    meadow: { base: M('meadow', 0), alt: M('meadow', 2), path: M('petrified_forest', 0), water: M('oasis', 3), sc: [['meadow', [17, 18, 19, 20, 21, 22, 23, 24]]] },
    dunes: { base: M('oasis', 2), alt: M('oasis', 0), path: M('salt_flats', 2), sc: [['oasis', [18, 20, 21]], ['mesa_canyon', [17, 18, 19, 20, 22, 23, 24]]] },
    forest: { base: M('meadow', 1), alt: M('mangrove', 3), path: M('petrified_forest', 0), water: M('mangrove', 0), sc: [['meadow', [18, 20, 22]], ['petrified_forest', [17, 19, 21, 23]]] },
    swamp: { base: M('mangrove', 3), alt: M('mangrove', 1), path: M('petrified_forest', 2), water: M('mangrove', 0), sc: [['mangrove', [17, 18, 19, 20, 21, 22, 23, 24]]] },
    tundra: { base: M('tundra', 0), alt: M('tundra', 1), path: M('tundra', 2), water: M('glacier', 3), ice: M('tundra', 3), sc: [['tundra', [17, 18, 19, 20, 21, 22, 23, 24]]] },
    volcano: { base: M('ember_wastes', 0), alt: M('ember_wastes', 2), path: M('petrified_forest', 2), lava: M('ember_wastes', 3), sc: [['ember_wastes', [17, 18, 19, 20, 21, 22, 23, 24]]] },
    ruins: { base: M('coral_reef', 0), alt: M('coral_reef', 2), path: M('petrified_forest', 1), water: M('coral_reef', 1), sc: [['coral_reef', [17, 18, 19, 20, 21, 22, 23, 24]]] },
    sky: { base: M('meadow', 0), alt: M('oasis', 1), path: M('salt_flats', 3), cliff: M('storm_peaks', 0), sc: [['meadow', [17, 19, 21, 23, 24]]] },
    void: { base: M('obsidian_depths', 0), alt: M('obsidian_depths', 1), path: M('storm_peaks', 3), cliff: M('obsidian_depths', 2), sc: [['obsidian_depths', [17, 18, 19, 20, 21, 22, 23, 24]]] },
    abyss: { base: M('ember_wastes', 2), alt: M('obsidian_depths', 2), path: M('ember_wastes', 1), lava: M('ember_wastes', 3), sc: [['ember_wastes', [17, 19, 21, 24]], ['obsidian_depths', [17, 20, 22]]] },
    jade: { base: M('meadow', 1), alt: M('oasis', 1), path: M('storm_peaks', 0), water: M('oasis', 3), sc: [['meadow', [17, 19, 21, 22]], ['oasis', [19, 20, 22]]] },
    canyon: { base: M('mesa_canyon', 0), alt: M('mesa_canyon', 2), path: M('mesa_canyon', 3), sc: [['mesa_canyon', [17, 18, 19, 20, 21, 22, 23, 24]]] },
    mirror: { base: M('glacier', 1), alt: M('salt_flats', 1), path: M('salt_flats', 0), water: M('glacier', 3), sc: [['glacier', [17, 18, 19, 20, 22]], ['salt_flats', [19, 21, 23]]] },
    clockwork: { base: M('petrified_forest', 1), alt: M('storm_peaks', 0), path: M('salt_flats', 2), sc: [['petrified_forest', [17, 19, 20, 22, 23]], ['storm_peaks', [17, 18, 19]]] },
    fungal: { base: M('mangrove', 2), alt: M('obsidian_depths', 0), path: M('mangrove', 1), water: M('mangrove', 0), sc: [['meadow', [18]], ['mangrove', [17, 19, 21, 23]], ['obsidian_depths', [19, 21]]] },
    thunder: { base: M('storm_peaks', 0), alt: M('storm_peaks', 1), path: M('storm_peaks', 2), cliff: M('storm_peaks', 1), sc: [['storm_peaks', [17, 18, 19, 20, 21, 22, 23, 24]]] },
    bonedesert: { base: M('salt_flats', 2), alt: M('oasis', 2), path: M('salt_flats', 0), sc: [['salt_flats', [17, 18, 20, 22, 24]], ['mesa_canyon', [20, 22]]] },
    gardens: { base: M('meadow', 0), alt: M('meadow', 3), path: M('petrified_forest', 2), water: M('oasis', 3), sc: [['meadow', [17, 19, 21, 23]], ['oasis', [19, 20, 22]]] },
    nightmare: { base: M('obsidian_depths', 1), alt: M('mangrove', 2), path: M('ember_wastes', 2), cliff: M('obsidian_depths', 3), sc: [['obsidian_depths', [17, 18, 19, 20, 21, 22, 23, 24]]] },
    creation: { base: M('storm_peaks', 3), alt: M('obsidian_depths', 0), path: M('glacier', 1), cliff: M('storm_peaks', 1), sc: [['storm_peaks', [19, 20, 22]], ['glacier', [17, 18, 21]]] },
    // towns
    aurelion: { base: M('meadow', 0), alt: M('meadow', 2), path: M('petrified_forest', 1), plaza: M('salt_flats', 2), water: M('oasis', 3), sc: [['meadow', [17, 19, 21, 23]]], density: 0.5 },
    haven: { base: M('meadow', 1), alt: M('meadow', 3), path: M('petrified_forest', 0), plaza: M('oasis', 2), water: M('oasis', 3), sc: [['meadow', [17, 18, 19, 21, 22, 23]]], density: 0.6 },
    // PvP maps
    colosseum: { base: M('mesa_canyon', 3), alt: M('salt_flats', 2), path: M('ember_wastes', 0), plaza: M('petrified_forest', 1), lava: M('ember_wastes', 3), sc: [['mesa_canyon', [20, 22]], ['ember_wastes', [18, 20]]] },
    bridges: { base: M('storm_peaks', 0), alt: M('petrified_forest', 3), path: M('petrified_forest', 1), water: M('coral_reef', 1), cliff: M('storm_peaks', 1), sc: [['storm_peaks', [17, 18, 19]]] },
    valley: { base: M('meadow', 1), alt: M('glacier', 1), path: M('salt_flats', 3), water: M('glacier', 3), sc: [['glacier', [17, 19, 21, 22]], ['meadow', [19, 21]]] },
    harbor: { base: M('oasis', 2), alt: M('coral_reef', 3), path: M('petrified_forest', 0), water: M('coral_reef', 1), sc: [['coral_reef', [18, 19, 20, 22]]] },
    spire: { base: M('tundra', 0), alt: M('glacier', 1), path: M('tundra', 2), water: M('glacier', 3), ice: M('tundra', 3), sc: [['tundra', [17, 18, 20, 22, 23]]] },
    jungle: { base: M('mangrove', 3), alt: M('meadow', 2), path: M('petrified_forest', 2), water: M('mangrove', 0), sc: [['mangrove', [17, 18, 20, 21]], ['meadow', [20, 22]]] },
    skyarena: { base: M('meadow', 0), alt: M('salt_flats', 3), path: M('salt_flats', 0), cliff: M('storm_peaks', 0), sc: [['meadow', [19, 21]]] },
    rift: { base: M('ember_wastes', 0), alt: M('ember_wastes', 2), path: M('ember_wastes', 1), lava: M('ember_wastes', 3), sc: [['ember_wastes', [17, 18, 19, 20, 21, 22]]] },
    grand: { base: M('meadow', 1), alt: M('petrified_forest', 0), path: M('petrified_forest', 1), water: M('oasis', 3), sc: [['meadow', [17, 19, 22]], ['petrified_forest', [17, 23]]] },
    // siege
    border: { base: M('meadow', 1), alt: M('petrified_forest', 3), path: M('petrified_forest', 0), plaza: M('petrified_forest', 1), sc: [['meadow', [17, 19, 22]]] },
    castle0: { base: M('meadow', 1), alt: M('petrified_forest', 3), path: M('petrified_forest', 1), plaza: M('petrified_forest', 1), sc: [['meadow', [19, 22]]] },
    castle1: { base: M('mesa_canyon', 0), alt: M('mesa_canyon', 3), path: M('petrified_forest', 1), plaza: M('salt_flats', 2), sc: [['mesa_canyon', [20, 22, 23]]] },
    castle2: { base: M('glacier', 1), alt: M('meadow', 1), path: M('salt_flats', 0), plaza: M('petrified_forest', 1), water: M('glacier', 3), sc: [['glacier', [17, 21]]] },
    castle3: { base: M('ember_wastes', 0), alt: M('obsidian_depths', 2), path: M('ember_wastes', 1), plaza: M('petrified_forest', 1), lava: M('ember_wastes', 3), sc: [['ember_wastes', [18, 21, 24]]] },
    castle4: { base: M('salt_flats', 2), alt: M('meadow', 0), path: M('salt_flats', 0), plaza: M('petrified_forest', 1), sc: [['meadow', [17, 21]]] },
    wbarena: { base: M('obsidian_depths', 0), alt: M('ember_wastes', 2), path: M('ember_wastes', 1), plaza: M('storm_peaks', 3), lava: M('ember_wastes', 3), cliff: M('obsidian_depths', 2), sc: [['obsidian_depths', [17, 19, 20, 22]], ['ember_wastes', [18, 21]]] },
    gallery: { base: M('petrified_forest', 1), alt: M('storm_peaks', 0), path: M('salt_flats', 2), plaza: M('petrified_forest', 1), sc: [] }
  };
  TER.TH = TH;
  const themeOf = m => TH[m.id] || (m.kind === 'pvp' ? TH.grand : m.kind === 'siege' ? TH.border : m.kind === 'town' ? TH.haven : m.kind === 'farm' ? TH.meadow : null);


  // texture synthesis: seamless 256px block from soft feathered patches of the clean tile centre (no grid, no mirror symmetry)
  const SZ = 256, PS = 40, IN = 8;
  const feather = (() => { const [c, x] = SPR.mk(PS, PS); const g = x.createRadialGradient(PS / 2, PS / 2, PS * 0.18, PS / 2, PS / 2, PS / 2); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, PS, PS); return c; })();
  function synth(im, n, seed) {
    const [sx, sy] = cellOf(n); const R = U.seeded(seed); const [T, tx] = SPR.mk(SZ, SZ); const CW = 64 - IN * 2;
    for (let j = 0; j < SZ; j += CW) for (let i = 0; i < SZ; i += CW) tx.drawImage(im, sx + IN, sy + IN, CW, CW, i, j, CW, CW);
    const [pc, px] = SPR.mk(PS, PS);
    for (let k = 0; k < 150; k++) {
      px.globalCompositeOperation = 'source-over'; px.clearRect(0, 0, PS, PS); const ox = sx + IN + Math.floor(R() * (CW - PS + 1)), oy = sy + IN + Math.floor(R() * (CW - PS + 1));
      px.save(); px.translate(PS / 2, PS / 2); px.rotate(Math.floor(R() * 4) * Math.PI / 2); px.drawImage(im, ox, oy, PS, PS, -PS / 2, -PS / 2, PS, PS); px.restore();
      px.globalCompositeOperation = 'destination-in'; px.drawImage(feather, 0, 0);
      const x0 = Math.floor(R() * SZ) - PS / 2, y0 = Math.floor(R() * SZ) - PS / 2;
      for (const dx of [0, -SZ, SZ]) for (const dy of [0, -SZ, SZ]) tx.drawImage(pc, x0 + dx, y0 + dy);
    }
    const OUT = Math.round(SZ * GS / 64); const [big, bx] = SPR.mk(SZ * 3, SZ * 3); for (let a = 0; a < 3; a++) for (let c = 0; c < 3; c++) bx.drawImage(T, a * SZ, c * SZ);
    const [mid, mx] = SPR.mk(OUT * 3, OUT * 3); mx.imageSmoothingEnabled = true; mx.imageSmoothingQuality = 'high'; mx.drawImage(big, 0, 0, SZ * 3, SZ * 3, 0, 0, OUT * 3, OUT * 3);
    const [cv, x] = SPR.mk(OUT, OUT); x.drawImage(mid, OUT, OUT, OUT, OUT, 0, 0, OUT, OUT); return cv;
  }
  // ---------- loading ----------
  const base = (() => { const s = [...document.scripts].find(x => /js\/terrain\.js/.test(x.src)); return s ? s.src.replace(/js\/terrain\.js.*$/, '') : ''; })();
  TER.load = () => new Promise(res => {
    let left = BIOMES.length;
    for (const b of BIOMES) { const im = new Image(); im.onload = () => { TER.img[b] = im; if (--left === 0) done(); }; im.onerror = () => { if (--left === 0) done(); }; im.src = base + 'assets/terrain/' + b + '.png'; }
    function done() { for (const b of BIOMES) { const im = TER.img[b]; if (!im) continue; TER.g[b] = []; for (let n = 1; n <= 8; n++) TER.g[b][n] = synth(im, n, U.hash(b) + n); } TER.ready = Object.keys(TER.g).length > 0; res(TER.ready); if (TER.ready) TER.flushProps(); if (TER.ready && W.map && W.map.kind !== 'dungeon' && !W.map._ter) { E.renderMapCanvas(W.map); if (G.UI.buildMinimap) G.UI.buildMinimap(); } }
  });

  // ---------- helpers ----------
  const hash2 = (i, j, s) => { let h = (i * 374761393 + j * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  // fill a whole canvas with a material (2 variants mixed per cell)
  const patCache = new Map();
  const fillMat = (x, mat, w, h, seed) => { const arr = TER.g[mat.b]; if (!arr) return; const v1 = mat.p * 2 + 1, v2 = mat.p * 2 + 2;
    let pat = patCache.get(mat.b + v1); if (!pat) { pat = x.createPattern(arr[v1], 'repeat'); patCache.set(mat.b + v1, pat); } x.save(); x.translate(-OFF.x, -OFF.y); x.fillStyle = pat; x.fillRect(OFF.x, OFF.y, w, h); x.restore();
    // second variant as soft organic patches (no cell seams)
    if (!TER._vmask || TER._vmask.w !== w || TER._vmask.h !== h || TER._vmask.ox !== OFF.x || TER._vmask.oy !== OFF.y) { const sw = Math.ceil(w / 8), sh = Math.ceil(h / 8); const nzv = noiseField(sw, sh, 4242, 9, 8); const [mc, mcx] = SPR.mk(sw, sh); const id = mcx.createImageData(sw, sh); for (let k = 0; k < nzv.length; k++) { id.data[k * 4 + 3] = Math.round(smooth(0.48, 0.62, nzv[k]) * 255); } mcx.putImageData(id, 0, 0); TER._vmask = { w, h, c: mc, ox: OFF.x, oy: OFF.y }; }
    const [L, lx] = SPR.mk(w, h); lx.fillStyle = lx.createPattern(arr[v2], 'repeat'); lx.save(); lx.translate((seed % 7) * 5 - OFF.x, (seed % 5) * 3 - OFF.y); lx.fillRect(OFF.x - 64, OFF.y - 64, w + 128, h + 128); lx.restore(); lx.globalCompositeOperation = 'destination-in'; lx.imageSmoothingEnabled = true; lx.drawImage(TER._vmask.c, 0, 0, w, h); x.drawImage(L, 0, 0); };
  const mkLayer = (w, h, mat, seed) => { const [cv, x] = SPR.mk(w, h); fillMat(x, mat, w, h, seed); return [cv, x]; };
  // value noise canvas (2 octaves) → Float32Array 0..1 at resolution (w,h)
  const OFF = TER.OFF = { x: 0, y: 0 }; // global pixel offset of the canvas being painted (chunked maps)
  const noiseField = (w, h, seed, cell, res = 2) => { const out = new Float32Array(w * h); const offX = OFF.x / res, offY = OFF.y / res; for (const [c, amp] of [[cell, 0.65], [cell / 2.6, 0.35]]) { const g0x = Math.floor(offX / c), g0y = Math.floor(offY / c); const gw = Math.ceil(w / c) + 3, gh = Math.ceil(h / c) + 3; const gr = new Float32Array(gw * gh); for (let k = 0; k < gr.length; k++) gr[k] = hash2(k % gw + g0x, Math.floor(k / gw) + g0y, seed + Math.round(c)); for (let y = 0; y < h; y++) { const fy = (y + offY) / c, y0 = Math.floor(fy) - g0y, ty = fy - Math.floor(fy), sy = ty * ty * (3 - 2 * ty); for (let x = 0; x < w; x++) { const fx = (x + offX) / c, x0 = Math.floor(fx) - g0x, tx = fx - Math.floor(fx), sx = tx * tx * (3 - 2 * tx); const a = gr[y0 * gw + x0], b = gr[y0 * gw + x0 + 1], cc = gr[(y0 + 1) * gw + x0], d = gr[(y0 + 1) * gw + x0 + 1]; out[y * w + x] += amp * ((a + (b - a) * sx) + ((cc + (d - cc) * sx) - (a + (b - a) * sx)) * sy); } } } return out; };
  // soft field of a tile set: tiles → blurred coverage 0..1 at half resolution
  const field = (m, codes, hw, hh, blur) => {
    const [t, tx] = SPR.mk(m.w, m.h); const id = tx.createImageData(m.w, m.h); let any = false;
    for (let k = 0; k < m.w * m.h; k++) if (codes.has(m.tiles[k])) { id.data[k * 4 + 3] = 255; id.data[k * 4] = id.data[k * 4 + 1] = id.data[k * 4 + 2] = 255; any = true; }
    if (!any) return null; tx.putImageData(id, 0, 0);
    const [c, cx] = SPR.mk(hw, hh); cx.imageSmoothingEnabled = true; cx.filter = `blur(${blur}px)`; cx.drawImage(t, 0, 0, m.w * (hw / m.w), m.h * ((hh - (G.TS / 2)) / m.h)); cx.filter = 'none';
    const d = cx.getImageData(0, 0, hw, hh).data; const f = new Float32Array(hw * hh); for (let k = 0; k < f.length; k++) f[k] = d[k * 4 + 3] / 255; return f;
  };
  const smooth = (e0, e1, v) => { const t = Math.min(1, Math.max(0, (v - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  // mask canvas (half-res) from a field with organic noisy threshold
  const maskOf = (f, nz, hw, hh, lo, hi, amp, extra) => { const [c, cx] = SPR.mk(hw, hh); const id = cx.createImageData(hw, hh); const d = id.data; for (let k = 0; k < f.length; k++) { const v = f[k] + (nz[k] - 0.5) * amp; let a = smooth(lo, hi, v); if (extra) a = extra(v, a, k); if (a > 0.004) { d[k * 4] = d[k * 4 + 1] = d[k * 4 + 2] = 255; d[k * 4 + 3] = Math.round(a * 255); } } cx.putImageData(id, 0, 0); return c; };
  // apply half-res mask to a full-res layer and draw it
  const stamp = (x, layer, mask, cw, ch, op = 'source-over', alpha = 1) => { const lx = layer.getContext('2d'); lx.globalCompositeOperation = 'destination-in'; lx.imageSmoothingEnabled = true; lx.drawImage(mask, 0, 0, cw, ch); lx.globalCompositeOperation = 'source-over'; x.globalCompositeOperation = op; x.globalAlpha = alpha; x.drawImage(layer, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; };
  const tint = (layer, color, op, a) => { const lx = layer.getContext('2d'); lx.globalCompositeOperation = op; lx.globalAlpha = a; lx.fillStyle = color; lx.fillRect(0, 0, layer.width, layer.height); lx.globalAlpha = 1; lx.globalCompositeOperation = 'source-over'; return layer; };


  // ---------- remove old hand-drawn nature props on every map; blocking ones become terrain-pack boulders ----------
  const NATURE = new Set(['tree', 'pine', 'deadtree', 'bush', 'flower', 'rock', 'lavarock', 'bones', 'cactus', 'mushroom', 'icespike', 'crystal', 'coral', 'cloud']);
  const pending = [];
  const paintProp = (spr, m, x, y) => { const th = themeOf(m) || { sc: [['storm_peaks', [17, 18, 19]]] }; const list = (th.sc && th.sc.length ? th.sc : [['storm_peaks', [17, 18, 19]]]); const h = U.hash(String(m.id) + Math.round(x * 10) + ',' + Math.round(y * 10)); const [b, idx] = list[h % list.length]; const im = TER.img[b]; if (!im) return; const n = idx[(h >>> 8) % idx.length]; const [sx, sy] = cellOf(n); const c = spr.img.getContext('2d'); c.clearRect(0, 0, spr.w, spr.h); c.globalAlpha = 0.3; c.fillStyle = '#000'; c.beginPath(); c.ellipse(spr.w / 2, spr.h - 4, spr.w * 0.34, 3, 0, 0, 7); c.fill(); c.globalAlpha = 1; c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.drawImage(im, sx, sy, 64, 64, 0, 0, spr.w, spr.w); };
  const add0 = E.addProp;
  // pack-art sprite for functional objects (drawn when the atlases are ready)
  const packSpr = (b, n, size, glow) => { const [cv] = SPR.mk(size, size + 4); const spr = { img: cv, w: size, h: size + 4 }; const paint = () => { const im = TER.img[b]; if (!im) return; const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height); c.globalAlpha = 0.3; c.fillStyle = '#000'; c.beginPath(); c.ellipse(size / 2, size - 2, size * 0.36, 3, 0, 0, 7); c.fill(); c.globalAlpha = 1; c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; const [sx, sy] = cellOf(n); c.drawImage(im, sx, sy, 64, 64, 0, 0, size, size); if (glow) { const g = c.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2); g.addColorStop(0, glow); g.addColorStop(1, 'rgba(0,0,0,0)'); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.55; c.fillStyle = g; c.fillRect(0, 0, size, size); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; } }; if (TER.ready) paint(); else pending.push([null, null, null, null, paint]); return spr; };
  const keepObj = (m, p, r) => { if (r) p.blkR = r; m.props.push(p); return p; };
  E.addProp = (m, kind, x, y, theme, block) => {
    const ti = E.idx(m, x, y);
    if (kind === 'portal') return keepObj(m, { x, y, kind, spr: packSpr('oasis', 19, 34, (theme && theme.c) || '#7a5aff') }, 0);
    if (kind === 'fountain') { const p = keepObj(m, { x, y: y + 0.6, kind, spr: packSpr('salt_flats', 21, 56, null) }, 1.5); p.blkC = { x, y }; return p; }
    const objCrystal = kind === 'crystal' && m.kind === 'pvp' && m.points && m.points.some(pt => Math.hypot(pt.x - x, pt.y - y) < 3.2);
    if (objCrystal) return keepObj(m, { x, y, kind, spr: packSpr('glacier', 21, 28, null) }, 0);
    if (kind === 'banner' && m.kind === 'siege' && W.mode && W.mode.kind === 'siege' && W.mode.phase) return keepObj(m, { x, y, kind, spr: packSpr('obsidian_depths', 19, 30, (theme && theme.c) || '#ffd84a') }, 0); // in-battle totems
    if (block) { m.block[ti] = 2; const [cv] = SPR.mk(30, 32); const spr = { img: cv, w: 30, h: 32 }; const p = keepObj(m, { x, y, kind, spr }, 0.75); if (TER.ready) paintProp(spr, m, x, y); else pending.push([spr, m, x, y]); return p; }
    return { x, y, kind, removed: true }; // every other old object (houses, stalls, lamps, banners, throne, nature…) is gone
  };
  // drop invisible blockers left by removed objects (houses etc.); keep walls and kept objects
  TER.cleanBlocks = (m) => { if (m._clean) return; m._clean = true; const K = m.k || 1; const keep = new Set(); for (const wl of m.walls || []) keep.add(wl.ty * m.w + wl.tx); const blk = m.props.filter(p => p.blkR); for (let k = 0; k < m.block.length; k++) { if (m.block[k] !== 2 || keep.has(k)) continue; const tx = (k % m.w) + 0.5, ty = Math.floor(k / m.w) + 0.5; const near = blk.some(p => { const c = p.blkC || p; return Math.abs(tx - c.x) <= p.blkR * K + 0.01 && Math.abs(ty - c.y) <= p.blkR * K + 0.01; }); if (!near) m.block[k] = 0; } };
  // re-skin wall blocks with terrain-pack stone
  const wallCache = new Map();
  TER.skinWalls = (m) => { if (!TER.ready || !m.walls || !m.walls.length || m.kind === 'dungeon') return; const th = themeOf(m) || {}; const mat = th.wall || M('petrified_forest', 1); const arr = TER.g[mat.b]; if (!arr) return;
    for (const wl of m.walls) { if (wl.img && wl.img.ter) continue; const h = (wl.img.h || (G.TS + 14)) - G.TS; const key = mat.b + mat.p + h; let img = wallCache.get(key); if (!img) { const TS = G.TS; const [cv, x] = SPR.mk(TS, TS + h); x.fillStyle = x.createPattern(arr[mat.p * 2 + 1], 'repeat'); x.fillRect(0, 0, TS, TS + h); x.fillStyle = 'rgba(255,255,240,0.18)'; x.fillRect(0, 0, TS, TS); x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(0, 0, TS, 1); x.fillStyle = 'rgba(10,8,20,0.45)'; x.fillRect(0, TS, TS, h); x.fillStyle = 'rgba(10,8,20,0.3)'; for (let r = 4; r < h; r += 6) x.fillRect(0, TS + r, TS, 1); x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(0, TS + h - 2, TS, 2); img = { img: cv, w: TS, h: TS + h, ter: true }; wallCache.set(key, img); } wl.img = img; } };
  TER.flushProps = () => { while (pending.length) { const a = pending.shift(); if (a[4]) a[4](); else paintProp(...a); } };

  // ---------- renderer ----------
  const render0 = E.renderMapCanvas;
  E.renderMapCanvas = (m) => {
    TER.cleanBlocks(m); TER.skinWalls(m);
    const th = themeOf(m);
    if (m.chunked && !m._sub) return; // ground is painted lazily per chunk (see chunks.js)
    if (!TER.ready || !th || m.kind === 'dungeon') return render0(m);
    const t0 = performance.now(); const TS = G.TS; const cw = m.w * TS, ch = m.h * TS + TS; const hw = Math.ceil(cw / 2), hh = Math.ceil(ch / 2); const seed = U.hash(String(m.id || 'x'));
    const [cv, x] = SPR.mk(cw, ch); m.canvas = cv; m.ox = 0; m.oy = 0; m._ter = true;
    // 1) base ground + macro light/shade so repetition never shows
    fillMat(x, th.base, cw, ch, seed);
    const nzBig = noiseField(hw, hh, seed + 11, 60), nz = noiseField(hw, hh, seed + 5, 14);
    { const [mc, mx] = SPR.mk(hw, hh); const id = mx.createImageData(hw, hh); for (let k = 0; k < nzBig.length; k++) { const v = nzBig[k] - 0.5; const o = k * 4; if (v > 0) { id.data[o] = id.data[o + 1] = 255; id.data[o + 2] = 230; id.data[o + 3] = Math.min(255, v * 120); } else { id.data[o] = 0; id.data[o + 1] = 0; id.data[o + 2] = 20; id.data[o + 3] = Math.min(255, -v * 150); } } mx.putImageData(id, 0, 0); x.imageSmoothingEnabled = true; x.globalCompositeOperation = 'soft-light'; x.drawImage(mc, 0, 0, cw, ch); x.globalCompositeOperation = 'source-over'; }
    // 2) secondary ground patches (organic blobs), bushes as darker patches of the same material
    const altF = field(m, new Set([1, 7]), hw, hh, 7); if (altF && th.alt) { const [L] = mkLayer(cw, ch, th.alt, seed + 1); stamp(x, L, maskOf(altF, nz, hw, hh, 0.38, 0.62, 0.55), cw, ch); }
    const bushF = field(m, new Set([7]), hw, hh, 4); if (bushF) { const [L] = mkLayer(cw, ch, th.alt || th.base, seed + 2); tint(L, '#0a1a08', 'multiply', 0.35); stamp(x, L, maskOf(bushF, nz, hw, hh, 0.35, 0.6, 0.4), cw, ch); }
    // 3) plaza, ice, path — soft but defined edges
    for (const [codes, mat, lo, hi, amp, blur] of [[[8], th.plaza || th.path, 0.42, 0.55, 0.22, 3], [[6], th.ice || th.alt, 0.4, 0.56, 0.4, 4], [[2], th.path, 0.36, 0.52, 0.42, 3.5]]) {
      if (!mat) continue; const f = field(m, new Set(codes), hw, hh, blur); if (!f) continue;
      { const [S] = mkLayer(cw, ch, mat, seed + codes[0] * 7); tint(S, '#000000', 'source-atop', 0.28); stamp(x, S, maskOf(f, nz, hw, hh, lo - 0.08, lo + 0.02, amp), cw, ch, 'source-over', 0.55); } // soft contact shadow
      const [L] = mkLayer(cw, ch, mat, seed + codes[0] * 13); stamp(x, L, maskOf(f, nz, hw, hh, lo, hi, amp), cw, ch);
    }
    // 4) water / lava with wet shore, foam / glowing rim
    for (const [code, mat, isLava] of [[3, th.water || M('oasis', 3), false], [4, th.lava || M('ember_wastes', 3), true]]) {
      const f = field(m, new Set([code]), hw, hh, 5); if (!f) continue;
      // wet / scorched shore: darken the ground just outside the liquid
      { const [S] = mkLayer(cw, ch, th.base, seed + 21); tint(S, isLava ? '#2a0a00' : '#1a2430', 'multiply', isLava ? 0.6 : 0.45); stamp(x, S, maskOf(f, nz, hw, hh, 0.3, 0.42, 0.35), cw, ch); }
      const [L] = mkLayer(cw, ch, mat, seed + 31 + code); if (isLava) { tint(L, '#ff4a08', 'overlay', 0.32); tint(L, '#ffb050', 'lighter', 0.07); } else tint(L, '#0a2a50', 'multiply', 0.18);
      stamp(x, L, maskOf(f, nz, hw, hh, 0.44, 0.5, 0.35), cw, ch);
      // rim: foam (water) or glow (lava) on the edge band
      const rim = maskOf(f, nz, hw, hh, 0, 1, 0.35, (v) => { const b = 1 - Math.abs(v - 0.47) / 0.025; return Math.max(0, Math.min(1, b)); });
      const [R] = SPR.mk(cw, ch); const rx = R.getContext('2d'); rx.fillStyle = isLava ? '#ffd27a' : '#e8f8ff'; rx.fillRect(0, 0, cw, ch); stamp(x, R, rim, cw, ch, isLava ? 'lighter' : 'source-over', isLava ? 0.85 : 0.55);
      if (isLava) { const glow = maskOf(f, nz, hw, hh, 0.25, 0.5, 0.2); const [Gl] = SPR.mk(cw, ch); const gx = Gl.getContext('2d'); gx.fillStyle = '#ff6a1a'; gx.fillRect(0, 0, cw, ch); stamp(x, Gl, glow, cw, ch, 'lighter', 0.22); }
    }
    // 5) scatter details (painted, non-blocking)
    const R = U.seeded(seed + 99); const dens = (th.density || 1) * 0.45; const nSc = Math.round(m.w * m.h / 11 * dens);
    const sp = m.spawn || { x: -99, y: -99 };
    for (let k = 0; k < nSc && th.sc && th.sc.length; k++) {
      const tx0 = Math.floor(R() * m.w), ty0 = Math.floor(R() * m.h); const ii = ty0 * m.w + tx0; const tc = m.tiles[ii];
      if (!(tc === 0 || tc === 1 || tc === 7) || m.block[ii] || U.d2(tx0, ty0, sp.x, sp.y) < 9) continue; if (m._core && (tx0 < m._core[0] + 1 || ty0 < m._core[1] + 1 || tx0 > m._core[2] - 2 || ty0 > m._core[3] - 2)) continue;
      const [b, list] = th.sc[Math.floor(R() * th.sc.length)]; const im = TER.img[b]; if (!im) continue; const n = list[Math.floor(R() * list.length)]; const [sx, sy] = cellOf(n);
      const s = Math.round(TS * U.rf(0.9, 1.25)); const px = Math.round(tx0 * TS + TS / 2 + (R() - 0.5) * TS * 0.6 - s / 2), py = Math.round(ty0 * TS + TS / 2 + (R() - 0.5) * TS * 0.6 - s * 0.7);
      x.globalAlpha = 0.28; x.fillStyle = '#000000'; x.beginPath(); x.ellipse(px + s / 2, py + s * 0.86, s * 0.34, s * 0.12, 0, 0, 7); x.fill(); x.globalAlpha = 1;
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(im, sx, sy, 64, 64, px, py, s, s);
    }
    // 6) chasms: cut holes, then natural cliff faces below every edge
    const vF = field(m, new Set([5]), hw, hh, 3);
    if (vF || m.edges) {
      if (vF) { const hole = maskOf(vF, nz, hw, hh, 0.42, 0.52, 0.25); x.globalCompositeOperation = 'destination-out'; x.imageSmoothingEnabled = true; x.drawImage(hole, 0, 0, cw, ch); x.globalCompositeOperation = 'source-over'; }
      const [sil, sx2] = mkLayer(cw, ch, th.cliff || M('storm_peaks', 1), seed + 77); sx2.fillStyle = 'rgba(10,8,20,0.45)'; sx2.fillRect(0, 0, cw, ch); sx2.globalCompositeOperation = 'destination-in'; sx2.drawImage(cv, 0, 0); sx2.globalCompositeOperation = 'source-over';
      x.globalCompositeOperation = 'destination-over'; for (let dy = 14; dy >= 2; dy -= 4) { x.globalAlpha = 1; x.drawImage(sil, 0, dy); } x.globalAlpha = 1;
      x.fillStyle = 'rgba(0,0,0,0)'; x.globalCompositeOperation = 'source-over';
      const [lip, lx] = SPR.mk(cw, ch); lx.drawImage(cv, 0, 0); lx.globalCompositeOperation = 'source-in'; lx.fillStyle = 'rgba(0,0,0,0.5)'; lx.fillRect(0, 0, cw, ch); // darker lip at the drop
      x.globalCompositeOperation = 'destination-over'; x.drawImage(lip, 0, 16); x.globalCompositeOperation = 'source-over';
    }
    // 7) PvP zone: soft red tint (no squares)
    const pv = (() => { let any = false; for (let k = 0; k < m.pvp.length; k++) if (m.pvp[k]) { any = true; break; } if (!any) return null; const [t, tx] = SPR.mk(m.w, m.h); const id = tx.createImageData(m.w, m.h); for (let k = 0; k < m.w * m.h; k++) if (m.pvp[k]) id.data[k * 4 + 3] = 255; tx.putImageData(id, 0, 0); return t; })();
    if (pv) { const [pc, px2] = SPR.mk(hw, hh); px2.filter = 'blur(8px)'; px2.drawImage(pv, 0, 0, hw, hh - TS / 2); px2.filter = 'none'; px2.globalCompositeOperation = 'source-in'; px2.fillStyle = '#ff2840'; px2.fillRect(0, 0, hw, hh); x.globalAlpha = 0.12; x.imageSmoothingEnabled = true; x.drawImage(pc, 0, 0, cw, ch); x.globalAlpha = 1; }
    // background behind holes
    x.globalCompositeOperation = 'destination-over'; x.fillStyle = m.bg || '#0e0c14'; x.fillRect(0, 0, cw, ch); x.globalCompositeOperation = 'source-over';
    TER.lastMs = Math.round(performance.now() - t0);
  };
  TER.renderGround = E.renderMapCanvas;
  const UI = G.UI; if (UI && UI.PANELS && UI.PANELS.settings) { const r0 = UI.PANELS.settings.render; UI.PANELS.settings.render = function (tab, P) { return r0.call(this, tab, P) + '<h4>เครดิต</h4><p class="muted">Terrain: Pixel Fantasy Terrain Pack 4 by Laphkal</p>'; }; }
  TER.load();
})(window.G);
