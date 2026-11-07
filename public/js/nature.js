'use strict';
/* Nature decoration: trees / bushes / rocks / logs / flowers (Pixel Art Nature Env Pack by AstroCom).
   Natural placement: trees grow in noise-driven groves with spacing, bushes hug grove edges, flowers form small patches,
   rocks & logs are sparse. Kept light so maps never look cluttered. Dungeons are untouched. */
(function (G) {
  const U = G.U, E = G.E, W = G.W, SPR = G.SPR;
  const NAT = G.NAT = { ready: false, img: {} };
  const MAN = G.NATURE_MAN || {};
  const CATS = ['trees', 'bushes', 'rocks', 'logs', 'flowers'];
  // theme per map: season + species lists + density multipliers
  const T = (s, trees, bush, rock, log, flower, d = {}) => ({ s, trees, bush, rock, log, flower, d });
  const SUM = 'summer', AUT = 'autumn', WIN = 'winter';
  const TH = {
    meadow: T(SUM, ['oak', 'birch', 'apple', 'maple'], ['round_bush', 'berry_bush', 'flower_bush'], ['stone', 'mossy_rock', 'pebbles'], ['tree_stump', 'fallen_log'], ['tulips', 'pink_flowers', 'white_daisies', 'yellow_flowers', 'red_flowers']),
    dunes: T(SUM, ['palm', 'banana'], ['dry_bush'], ['flat_rock', 'cracked_rock', 'rock_pile'], [], [], { tree: 0.5, bush: 0.6, flower: 0 }),
    forest: T(SUM, ['pine', 'spruce', 'oak', 'willow'], ['fern', 'shrub', 'round_bush'], ['mossy_rock', 'boulder'], ['mossy_log', 'hollow_log', 'tree_stump'], ['blue_flowers', 'white_daisies'], { tree: 1.7, flower: 0.5 }),
    swamp: T(SUM, ['willow', 'deadtree'], ['fern', 'dry_bush'], ['mossy_rock'], ['mossy_log', 'hollow_log'], ['blue_flowers'], { tree: 0.9, flower: 0.3 }),
    tundra: T(WIN, ['pine', 'spruce', 'deadtree'], ['round_bush', 'shrub'], ['boulder', 'stone', 'rock_pile'], ['fallen_log', 'tree_stump'], [], { flower: 0 }),
    volcano: T(AUT, ['deadtree', 'stump'], ['dry_bush'], ['cracked_rock', 'rock_pile', 'boulder'], ['split_wood'], [], { tree: 0.5, flower: 0 }),
    ruins: T(SUM, ['palm'], ['fern'], ['flat_rock', 'mossy_rock', 'stone'], ['wood_planks'], [], { tree: 0.3, flower: 0 }),
    sky: T(SUM, ['sakura', 'birch'], ['flower_bush', 'round_bush'], ['crystal_rock', 'stone'], [], ['pink_flowers', 'white_daisies', 'blue_flowers'], { tree: 0.8 }),
    void: T(WIN, ['deadtree'], [], ['crystal_rock', 'cracked_rock'], [], [], { tree: 0.3, flower: 0, bush: 0 }),
    abyss: T(AUT, ['deadtree'], ['dry_bush'], ['cracked_rock', 'crystal_rock'], [], [], { tree: 0.35, flower: 0 }),
    jade: T(SUM, ['sakura', 'willow', 'maple'], ['fern', 'flower_bush'], ['mossy_rock', 'flat_rock'], ['mossy_log'], ['pink_flowers', 'white_daisies']),
    canyon: T(SUM, ['deadtree'], ['dry_bush'], ['cracked_rock', 'boulder', 'rock_pile'], [], [], { tree: 0.3, flower: 0 }),
    mirror: T(WIN, ['birch', 'spruce'], ['round_bush'], ['crystal_rock', 'stone'], [], ['white_daisies'], { flower: 0.4 }),
    clockwork: T(AUT, ['stump', 'deadtree'], [], ['rock_pile', 'flat_rock'], ['wood_planks', 'log_pile', 'split_wood'], [], { tree: 0.3, flower: 0, log: 2 }),
    fungal: T(AUT, ['deadtree'], ['fern', 'shrub'], ['crystal_rock', 'mossy_rock'], ['hollow_log', 'mossy_log'], [], { tree: 0.4, flower: 0 }),
    thunder: T(WIN, ['pine', 'deadtree'], ['shrub'], ['boulder', 'rock_pile', 'cracked_rock'], [], [], { tree: 0.6, flower: 0 }),
    bonedesert: T(SUM, ['deadtree'], ['dry_bush'], ['flat_rock', 'cracked_rock'], ['tree_stump'], [], { tree: 0.35, flower: 0 }),
    gardens: T(SUM, ['sakura', 'apple', 'maple', 'birch'], ['flower_bush', 'hedge', 'round_bush'], ['stone'], [], ['tulips', 'sunflower', 'pink_flowers', 'orange_flowers', 'white_daisies'], { flower: 1.6 }),
    nightmare: T(AUT, ['deadtree'], ['dry_bush'], ['crystal_rock', 'cracked_rock'], ['hollow_log'], [], { tree: 0.5, flower: 0 }),
    creation: T(WIN, ['sakura', 'birch'], [], ['crystal_rock'], [], ['white_daisies', 'blue_flowers'], { tree: 0.4, flower: 0.4 }),
    aurelion: T(SUM, ['oak', 'maple', 'apple'], ['hedge', 'flower_bush', 'round_bush'], ['stone'], ['log_pile', 'wood_planks'], ['tulips', 'red_flowers', 'yellow_flowers'], { tree: 0.42, bush: 0.6, rock: 0.6, log: 0.5, flower: 0.8 }),
    haven: T(SUM, ['oak', 'birch', 'apple'], ['berry_bush', 'round_bush'], ['stone', 'pebbles'], ['split_wood', 'log_pile'], ['white_daisies', 'pink_flowers', 'sunflower'], { tree: 0.9 }),
    colosseum: T(AUT, [], [], ['cracked_rock', 'rock_pile'], [], [], { rock: 0.6 }),
    bridges: T(SUM, ['pine'], ['shrub'], ['boulder', 'mossy_rock'], [], [], { tree: 0.5 }),
    valley: T(SUM, ['birch', 'oak'], ['round_bush'], ['crystal_rock', 'stone'], [], ['blue_flowers', 'white_daisies'], { tree: 0.6 }),
    harbor: T(SUM, ['palm'], [], ['flat_rock'], ['wood_planks', 'log_pile'], [], { tree: 0.4 }),
    spire: T(WIN, ['spruce', 'pine'], ['shrub'], ['boulder'], [], [], { tree: 0.6 }),
    jungle: T(SUM, ['banana', 'palm', 'willow'], ['fern'], ['mossy_rock'], ['mossy_log'], [], { tree: 1.2 }),
    skyarena: T(SUM, ['sakura'], [], ['stone'], [], ['pink_flowers'], { tree: 0.4 }),
    rift: T(AUT, ['deadtree'], [], ['cracked_rock'], [], [], { tree: 0.4 }),
    grand: T(SUM, ['oak', 'birch'], ['round_bush'], ['stone', 'boulder'], ['tree_stump'], ['yellow_flowers'], { tree: 0.6 }),
    graveyard: T(AUT, ['deadtree'], ['dry_bush'], ['cracked_rock'], ['tree_stump'], [], { tree: 0.6 }),
    border: T(SUM, ['oak', 'pine'], ['round_bush'], ['stone'], ['tree_stump'], ['white_daisies'], { tree: 0.7 }),
    castle0: T(SUM, ['oak'], ['hedge'], ['stone'], [], [], { tree: 0.4 }), castle1: T(AUT, ['deadtree'], ['dry_bush'], ['cracked_rock'], [], [], { tree: 0.4 }),
    castle2: T(WIN, ['birch'], ['round_bush'], ['crystal_rock'], [], [], { tree: 0.4 }), castle3: T(AUT, ['deadtree'], [], ['cracked_rock'], [], [], { tree: 0.3 }),
    wbarena: T(AUT, ['deadtree'], ['dry_bush'], ['crystal_rock', 'cracked_rock'], [], [], { tree: 0.5 }),
    castle4: T(SUM, ['sakura'], ['hedge', 'flower_bush'], ['stone'], [], ['tulips'], { tree: 0.4 })
  };
  NAT.TH = TH;
  const themeOf = m => TH[m.id] || (m.kind === 'farm' ? TH.meadow : m.kind === 'town' ? TH.haven : m.kind === 'pvp' ? TH.grand : m.kind === 'siege' ? TH.border : null);
  // sprite lookup: species + season, fallback through seasons / variants
  const pickName = (sp, season, R) => { const vs = [1, 2].sort(() => R() - 0.5); for (const s of [season, SUM, AUT, WIN]) for (const v of vs) { const n = `${sp}_${s}_${v}`; if (MAN[n]) return n; } return null; };
  const sprCache = new Map();
  const sprOf = (name, scale = 1) => { const k = name + scale; if (sprCache.has(k)) return sprCache.get(k); const e = MAN[name]; const im = NAT.img[e[0]]; if (!im) return null; const [, sx, sy, cell, top, lx, rx] = e; const w = Math.max(4, rx - lx), h = cell - top; const W2 = Math.round(w * scale), H2 = Math.round(h * scale); const [cv, x] = SPR.mk(W2 + 2, H2); x.imageSmoothingEnabled = scale !== 1; x.drawImage(im, sx + lx, sy + top, w, h, 1, 0, W2, H2); const s = { img: cv, w: W2 + 2, h: H2 + 2, nat: e[0] }; sprCache.set(k, s); return s; };

  // ---------- placement ----------
  const BAD = new Set([2, 3, 4, 5, 6, 8]);
  const place = (m) => {
    const th = themeOf(m); if (!th || m._nat || m.kind === 'dungeon') return; m._nat = true;
    const seed = U.hash('nat' + m.id); const R = U.seeded(seed); const K = m.k || 1; const d = th.d || {};
    const blocking = m.kind === 'farm' || m.kind === 'town';
    const avoid = []; const add = p => { if (p && typeof p.x === 'number') avoid.push([p.x, p.y]); };
    add(m.spawn); add(m.portalPt); add(m.bossPt); add(m.worldPt); add(m.spawnA); add(m.spawnB); add(m.exitPt); (m.champPts || []).forEach(add); (m.points || []).forEach(add); (m.towers || []).forEach(add);
    const townR = m.kind === 'town' && m.c ? (m.npcR || 6) * 1.6 + 4 : 0;
    const near = (x, y, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const xx = Math.floor(x + dx), yy = Math.floor(y + dy); if (xx < 0 || yy < 0 || xx >= m.w || yy >= m.h) return true; const t = m.tiles[yy * m.w + xx]; if (BAD.has(t) || m.block[yy * m.w + xx]) return true; } return false; };
    const okAt = (x, y, r, clear) => { if (m.noNat && m.noNat(x, y)) return false; if (near(x, y, r)) return false; for (const [ax, ay] of avoid) if (U.d2(x, y, ax, ay) < clear * clear) return false; if (townR && U.d2(x, y, m.c, m.c) < townR * townR) return false; return true; };
    const placed = []; const spacingOk = (x, y, s) => placed.every(([px, py, ps]) => U.d2(x, y, px, py) >= ((s + ps) / 2) ** 2);
    const grove = E.noise(seed, m.w, m.h, Math.max(6, Math.round(9 * K)));
    const area = m.w * m.h / (K * K); // in original tile units
    const want = { tree: Math.round(area * 0.018 * (d.tree ?? 1)), bush: Math.round(area * 0.012 * (d.bush ?? 1)), rock: Math.round(area * 0.0075 * (d.rock ?? 1)), log: Math.round(area * 0.0025 * (d.log ?? 1)), flower: Math.round(area * 0.006 * (d.flower ?? 1)) };
    const put = (cat, sp, x, y, sc, blockTrunk, spacing) => { const name = pickName(sp, th.s, R); if (!name) return false; const spr = sprOf(name, sc); if (!spr) return false; const p = { x, y, kind: 'nat_' + cat, spr, natCat: cat }; m.props.push(p); placed.push([x, y, spacing]); if (blockTrunk && blocking) { const ii = Math.floor(y - 0.2) * m.w + Math.floor(x); if (ii >= 0 && ii < m.block.length) m.block[ii] = 2; } return true; };
    // trees: grove noise acceptance + spacing
    for (let k = 0, got = 0; k < want.tree * 30 && got < want.tree && th.trees.length; k++) {
      const x = R() * m.w, y = R() * m.h; const g = grove(x, y); if (R() > (g > 0.58 ? 0.9 : g > 0.45 ? 0.25 : 0.04)) continue;
      if (!okAt(x, y, 1, 5 * K) || !spacingOk(x, y, 2.4 * K)) continue;
      if (put('trees', th.trees[Math.floor(R() * th.trees.length)], x, y, 1, true, 2.4 * K)) got++;
    }
    const trees = placed.slice();
    // bushes: mostly at grove edges (near trees), some alone
    for (let k = 0, got = 0; k < want.bush * 25 && got < want.bush && th.bush.length; k++) {
      let x, y; if (trees.length && R() < 0.7) { const t = trees[Math.floor(R() * trees.length)]; const a = R() * 6.28, r = U.rf(1.4, 3) * K; x = t[0] + Math.cos(a) * r; y = t[1] + Math.sin(a) * r; } else { x = R() * m.w; y = R() * m.h; }
      if (!okAt(x, y, 0, 4 * K) || !spacingOk(x, y, 1.3 * K)) continue;
      if (put('bushes', th.bush[Math.floor(R() * th.bush.length)], x, y, 1, false, 1.3 * K)) got++;
    }
    // rocks + logs: sparse
    for (const [cat, list, n, spc] of [['rocks', th.rock, want.rock, 1.6], ['logs', th.log, want.log, 2]]) for (let k = 0, got = 0; k < n * 25 && got < n && list.length; k++) {
      const x = R() * m.w, y = R() * m.h; if (!okAt(x, y, 0, 4 * K) || !spacingOk(x, y, spc * K)) continue;
      const sp = list[Math.floor(R() * list.length)]; const big = sp === 'boulder' || sp === 'log_pile';
      if (put(cat, sp, x, y, 1, big, spc * K)) got++;
    }
    // flowers: small patches of 3–5
    for (let k = 0, got = 0; k < want.flower * 20 && got < want.flower && th.flower.length; k++) {
      const cx = R() * m.w, cy = R() * m.h; if (!okAt(cx, cy, 0, 3 * K) || !spacingOk(cx, cy, 1.5 * K)) continue; const sp = th.flower[Math.floor(R() * th.flower.length)]; const n = 3 + Math.floor(R() * 3);
      for (let i = 0; i < n; i++) { const x = cx + U.rf(-1, 1) * K, y = cy + U.rf(-0.7, 0.7) * K; if (near(x, y, 0)) continue; const name = pickName(sp, th.s, R); const spr = name && sprOf(name, 1); if (spr) m.props.push({ x, y, kind: 'nat_flowers', spr, natCat: 'flowers' }); }
      placed.push([cx, cy, 1.5 * K]); got++;
    }
    NAT.lastCount = placed.length;
  };
  NAT.place = place;

  // ---------- loading + hooks ----------
  const base = (() => { const s = [...document.scripts].find(x => /js\/nature\.js/.test(x.src)); return s ? s.src.replace(/js\/nature\.js.*$/, '') : ''; })();
  let left = CATS.length; for (const c of CATS) { const im = new Image(); im.onload = () => { NAT.img[c] = im; if (--left === 0) done(); }; im.onerror = () => { if (--left === 0) done(); }; im.src = base + 'assets/nature/' + c + '.png'; }
  function done() { NAT.ready = Object.keys(NAT.img).length > 0; if (NAT.ready && W.map) place(W.map); }
  const rm0 = E.renderMapCanvas;
  E.renderMapCanvas = (m) => { rm0(m); if (NAT.ready) place(m); };
  // credits
  const UI = G.UI; if (UI && UI.PANELS && UI.PANELS.settings) { const r0 = UI.PANELS.settings.render; UI.PANELS.settings.render = function (tab, P) { return r0.call(this, tab, P) + '<p class="muted">Trees / Bushes / Rocks / Logs / Flowers: Pixel Art Nature Env Pack by AstroCom</p>'; }; }
})(window.G);
