'use strict';
/* Game modes + map generators: town, farm, dungeon, pvp, siege, gallery */
(function (init) {
  (globalThis.ASHFALL_SIM_FACTORIES ||= {})['modes'] = init;
  if (typeof window !== 'undefined') init(window.G ||= {});
})(function (G) {
  const U = G.U, D = G.D, E = G.E, W = G.W, V = G.VFX, SPR = G.SPR, S = G.S;
  const MAP_ELEM = ['nature', 'phys', 'nature', 'poison', 'ice', 'fire', 'ice', 'wind', 'shadow', 'fel', 'nature', 'blood', 'ice', 'tech', 'poison', 'lightning', 'death', 'holy', 'shadow', 'arcane'];

  // ---------------- enter / leave ----------------
  S.enter = (mode) => {
    if (W.mode && W.mode.leave) W.mode.leave();
    W.units.length = 0; W.projs.length = 0; W.zones.length = 0; W.traps.length = 0; W.loots.length = 0; W.timers.length = 0; W.dangers.length = 0; V.clear();
    W.slowT = 0; W.hitstop = 0;
    W.mode = mode; W.map = mode.build(); E.renderMapCanvas(W.map);
    const sp = mode.playerSpawn ? mode.playerSpawn() : W.map.spawn;
    S.makePlayer(sp.x, sp.y);
    if (mode.normalized) S.refreshPlayer(true);
    if (mode.init) mode.init();
    W.cam.x = W.player.x; W.cam.y = W.player.y; S.IN.clickMove = null; S.select(null);
    G.UI.onEnter(mode); S.persist();
  };
  S.goTown = id => S.enter(S.TownMode(id || S.save.lastTown || 'haven'));
  S.goFarm = i => S.enter(S.FarmMode(i));
  S.goDungeon = (id, floor, mercs) => S.enter(S.DungeonMode(id, floor, mercs));
  S.goPvP = cfg => S.enter(S.PvPMode(cfg));
  S.goSiege = cfg => S.enter(S.SiegeMode(cfg));
  S.goGallery = () => S.enter(S.GalleryMode());
  S.resetUnitsForMap = (keep) => { W.units = W.units.filter(u => keep.includes(u)); W.projs.length = 0; W.zones.length = 0; W.traps.length = 0; W.dangers.length = 0; W.loots.length = 0; };

  // ---------------- bots ----------------
  S.makeBot = (cls, team, cp, diffI, o = {}) => {
    const lvl = o.lvl || S.save.lvl; let st = o.stats ? o.stats : o.normalized ? E.normalizedStats(cls) : E.finalize(E.baseStats(cls, lvl));
    if (!o.stats && !o.normalized && cp) { const k = cp / E.cp(st); st.atk = Math.round(st.atk * k); st.def = Math.round(st.def * k); st.hp = Math.round(st.hp * k); }
    let fashion = null; if (Math.random() < 0.3) { const f = S.genItem('fashion', U.ri(3, 9), 1, { slot: 'f_body' }); fashion = { f_body: f }; if (Math.random() < 0.4) fashion.f_head = S.genItem('fashion', 5, 1, { slot: 'f_head', theme: f.theme }); }
    const u = E.heroUnit(cls, lvl, team, { stats: st, name: o.name || U.pick(D.NAMES) + U.ri(1, 99), bot: o.bot !== false, x: o.x || 0, y: o.y || 0, fashion });
    if (fashion) { u.fashion = fashion; if (Math.random() < 0.3) fashion.f_wings = S.genItem('fashion', 8, 1, { slot: 'f_wings', theme: fashion.f_body.theme }); }
    u.ai.diff = D.DIFFS[diffI]; u.ai.persona = o.persona || U.pick(D.PERSONAS).k;
    for (let i = 0; i < D.NSK; i++) u.runes[i] = Math.random() < 0.35 ? U.ri(1, 3) : 0;
    u.brain = o.brain || ((b, dt) => E.heroAI(b, dt, W.mode && W.mode.ctl ? W.mode.ctl(b) : {}));
    u.guildTag = o.tag || null; u.isMerc = !!o.merc; u.mercCls = o.merc ? cls : null;
    return u;
  };
  S.randomClasses = (n, limit = 3) => { const cnt = {}; const out = []; let guard = 0; while (out.length < n && guard++ < 999) { const c = U.pick(D.CLASSES).id; if ((cnt[c] || 0) >= limit) continue; cnt[c] = (cnt[c] || 0) + 1; out.push(c); } return out; };

  // ---------------- mob ----------------
  S.mkMob = (md, lvl, grade, x, y, o = {}) => {
    const g = D.GRADES[grade]; const L = Math.max(1, lvl); const hm = o.hpMul || 1;
    const st = { atk: Math.round((8 + L * 4.2) * g.atk), def: Math.round(L * 3.5 * (g.boss ? 1.5 : 1)), hp: Math.round((50 + L * 20 + L * L * 0.35) * g.hp * hm), crit: 5, critDmg: 50, dr: 0, ccRes: g.boss ? 30 : 0, elem: 0, ls: 0, pvpDmg: 0, pvpDef: 0, aspd: 0, cdr: 0, spd: 0 };
    const u = E.mkUnit({ kind: 'mob', team: 2, x, y, name: (grade === 'normal' ? '' : '') + md.n, body: md.body, col: md.c, col2: md.c2, sc: g.sc * (md.body === 'dragon' ? 0.9 : 1), lvl: L, grade, boss: !!g.boss, ccImmune: !!g.boss, aggro: g.boss ? 8 : grade === 'normal' ? 5 : 6.5, leash: o.leash ?? 14, atkRate: g.boss ? 1.4 : 1.3, ranged: md.ranged, elem: o.elem || 'phys', st, maxhp: st.hp, hp: st.hp, moveSpd: 2.4 + (grade === 'normal' ? 0 : 0.3), md });
    if (md.body === 'skeleton' || md.body === 'knight') u.sheet = SPR.monSheet(md.body, md.c, md.c2);
    return u;
  };
  S.mobCredit = (t, k) => { const p = W.player; if (!p) return false; return k === p || (k && k.owner === p) || (k && k.team === 0 && k.isMerc) || (t.pdmg || 0) >= t.maxhp * 0.1; };
  S.mobXp = (t) => 10 * Math.pow(t.lvl, 1.5) * D.GRADES[t.grade].xp;

  // ---------------- map generators ----------------
  function genTown(id) {
    const big = id === 'aurelion'; const w = big ? 44 : 34, h = w; const c = w / 2;
    const m = E.newMap({ id, kind: 'town', w, h, g: big ? ['#5f8a4f', '#679656'] : ['#5f9e4a', '#6aab52'], acc: big ? '#3e6a32' : '#3e7a32', bg: '#0e0c14' });
    const n1 = E.noise(U.hash(id), w, h, 6);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = x + 0.5 - c, dy = y + 0.5 - c; let t = n1(x, y) > 0.55 ? 1 : 0;
      if (Math.abs(dx) + Math.abs(dy) < (big ? 11 : 8)) t = 8; else if ((Math.abs(dx) < 1.6 || Math.abs(dy) < 1.6) && Math.abs(dx) + Math.abs(dy) < (big ? 20 : 15)) t = 2;
      E.setTile(m, x, y, t);
    }
    const fp = E.addProp(m, 'fountain', c, c, null); for (const [ox, oy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) m.block[E.idx(m, c + ox, c + oy)] = 2;
    const houses = big ? 10 : 6; const R = U.seeded(U.hash(id) + 7);
    const roofs = ['#a8403a', '#3a6aa8', '#6a8a3a', '#8a4aa0', '#c08a3a'];
    for (let i = 0; i < houses; i++) {
      const a = i / houses * Math.PI * 2 + 0.3; const r = big ? 16 : 11.5; const hx = Math.round(c + Math.cos(a) * r), hy = Math.round(c + Math.sin(a) * r);
      if (Math.abs(hx - c) < 2 || Math.abs(hy - c) < 2) continue;
      E.addProp(m, 'house', hx + 0.5, hy + 1.6, { wall: U.pick(['#d8c8a8', '#c8b898', '#e0d4b8']), roof: roofs[i % roofs.length] });
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) if (E.inside(m, hx + ox, hy + oy)) m.block[E.idx(m, hx + ox, hy + oy)] = 2;
    }
    for (let i = 0; i < (big ? 12 : 8); i++) { const a = i / (big ? 12 : 8) * Math.PI * 2; const r = big ? 10.5 : 7.5; E.addProp(m, i % 2 ? 'lamp' : 'banner', c + Math.cos(a) * r, c + Math.sin(a) * r, { c: big ? '#b0303a' : '#3a6aa8', c2: '#ffd84a' }); }
    for (let i = 0; i < (big ? 70 : 50); i++) { const x = R() * w, y = R() * h; const dx = x - c, dy = y - c; if (Math.abs(dx) + Math.abs(dy) < (big ? 13 : 10) || m.block[E.idx(m, x, y)] || m.tiles[E.idx(m, x, y)] === 2) continue; E.addProp(m, U.pick(['tree', 'tree', 'bush', 'flower', 'rock']), x, y, { acc: m.acc }); }
    m.spawn = { x: c + 0.5, y: c + (big ? 6 : 4.5) }; m.npcR = big ? 7.5 : 5.5; m.c = c;
    return E.scaleMap(m, G.MAPK);
  }
  function genFarm(def, i) {
    const w = 56, h = 56; const seed = U.hash(def.id);
    const m = E.newMap({ id: def.id, kind: 'farm', w, h, g: def.g, acc: def.acc, crystal: def.mobs[0].c, bg: def.block === 'void' ? '#0a0814' : '#0e0c14', edges: def.block === 'void', speck: def.id === 'meadow' ? '#ffe04a' : null });
    const n1 = E.noise(seed, w, h, 7), n2 = E.noise(seed + 1, w, h, 5);
    const bt = { water: 3, lava: 4, void: 5 }[def.block];
    const pathY = x => 28 + Math.sin(x / 6) * 4;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let t = n1(x, y) > 0.55 ? 1 : 0; const onPath = Math.abs(y - pathY(x)) < 1.1 && x > 2;
      if (bt && n2(x, y) > 0.72 && !onPath && Math.hypot(x - 5, y - 28) > 8) t = bt;
      if (def.id === 'tundra' && n1(x, y) > 0.78 && t !== bt) t = 6;
      if (onPath) t = 2; E.setTile(m, x, y, t); if (x >= 36) m.pvp[E.idx(m, x, y)] = 1;
    }
    const R = U.seeded(seed + 3);
    for (let k = 0; k < 230; k++) { const x = R() * w, y = R() * h; const ii = E.idx(m, x, y); if (m.block[ii] || m.tiles[ii] === 2 || Math.hypot(x - 5, y - 28) < 5) continue; E.addProp(m, def.props[Math.floor(R() * def.props.length)], x, y, { acc: def.acc, crystal: def.mobs[0].c }); }
    m.spawn = { x: 5.5, y: 28.5 }; m.portalPt = { x: 3, y: 28.5 };
    m.champPts = [{ x: 20, y: 14 }, { x: 28, y: 42 }, { x: 44, y: 18 }]; m.bossPt = { x: 46, y: 32 }; m.worldPt = { x: 30, y: 28 };
    E.addProp(m, 'portal', m.portalPt.x, m.portalPt.y, { c: '#7a5aff' });
    for (const p of [...m.champPts, m.bossPt, m.worldPt]) { const ii = E.idx(m, p.x, p.y); if (m.block[ii]) { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) E.setTile(m, p.x + dx, p.y + dy, 0); } }
    return E.scaleMap(m, G.MAPK);
  }
  function genDungeon(dg, F) {
    const mi = Math.floor((F - 1) / 5) % D.FARM_MAPS.length; const base = D.FARM_MAPS[mi];
    const w = 22, h = 22; const m = E.newMap({ id: dg.id + F, kind: 'dungeon', w, h, g: [U.shade(base.g[0], -0.25), U.shade(base.g[1], -0.25)], acc: base.acc, crystal: dg.c, bg: '#07060b' });
    const n1 = E.noise(U.hash(dg.id) + F, w, h, 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) E.setTile(m, x, y, n1(x, y) > 0.6 ? 1 : (n1(x, y) < 0.25 ? 2 : 0));
    const wc = U.shade(dg.c, -0.55);
    for (let x = 0; x < w; x++) { E.addWall(m, x, 0, wc, 26); E.addWall(m, x, h - 1, wc, 26); }
    for (let y = 1; y < h - 1; y++) { E.addWall(m, 0, y, wc, 26); E.addWall(m, w - 1, y, wc, 26); }
    for (const [x, y] of [[6, 6], [15, 6], [6, 15], [15, 15]]) E.addProp(m, 'pillar', x + 0.5, y + 0.5, null, true);
    for (const [x, y] of [[2, 2], [19, 2], [2, 19], [19, 19], [10, 2], [2, 10]]) E.addProp(m, 'crystal', x + 0.5, y + 0.5, { crystal: dg.c });
    for (let k = 0; k < 10; k++) E.addProp(m, U.pick(['bones', 'rock', 'lavarock']), U.rf(2, 20), U.rf(2, 20), {});
    m.spawn = { x: 11, y: 18.5 }; m.portalPt = { x: 11, y: 3.5 }; m.exitPt = { x: 4, y: 3.5 }; m.bossSpot = { x: 11, y: 8 }; m.center = { x: 11, y: 11 };
    return E.scaleMap(m, G.MAPK);
  }
  function genPvP(mi) {
    const def = D.PVP_MAPS[mi]; let w = 40, h = 40; const id = def.id;
    const sizes = { colosseum: [26, 26], bridges: [44, 30], valley: [50, 50], harbor: [48, 40], spire: [40, 40], jungle: [40, 40], skyarena: [36, 36], rift: [40, 40], graveyard: [46, 46], grand: [60, 60] };
    [w, h] = sizes[id];
    const m = E.newMap({ id, kind: 'pvp', w, h, g: def.g, acc: U.shade(def.g[0], -0.3), bg: '#0b0a12', crystal: '#4ad6c8' });
    const n1 = E.noise(U.hash(id), w, h, 6), n2 = E.noise(U.hash(id) + 9, w, h, 4); const R = U.seeded(U.hash(id) + 5);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) E.setTile(m, x, y, n1(x, y) > 0.55 ? 1 : 0);
    const c = { x: w / 2, y: h / 2 };
    const scatter = (kinds, n, avoid, theme, block) => { for (let k = 0; k < n; k++) { const x = R() * w, y = R() * h; const ii = E.idx(m, x, y); if (m.block[ii] || m.tiles[ii] === 5) continue; if (avoid && avoid(x, y)) continue; E.addProp(m, kinds[Math.floor(R() * kinds.length)], x, y, theme || { acc: m.acc }, block); } };
    switch (id) {
      case 'colosseum': {
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const d = Math.hypot(x + 0.5 - c.x, y + 0.5 - c.y); if (d < 11.3) E.setTile(m, x, y, d < 4 ? 8 : 2); else if (d < 12.4) E.addWall(m, x, y, '#7a6a5a', 24); else { m.block[E.idx(m, x, y)] = 2; m.tiles[E.idx(m, x, y)] = 5; } }
        m.spawnA = { x: 6.5, y: 13 }; m.spawnB = { x: 19.5, y: 13 }; for (const a of [0.8, 2.4, 3.9, 5.5]) E.addProp(m, 'pillar', c.x + Math.cos(a) * 7, c.y + Math.sin(a) * 7, null, true); break; }
      case 'bridges': {
        m.edges = true; for (let y = 0; y < h; y++) for (let x = 15; x <= 28; x++) { if ((y >= 6 && y <= 9) || (y >= 20 && y <= 23)) E.setTile(m, x, y, 2); else E.setTile(m, x, y, 5); }
        m.spawnA = { x: 5, y: 15 }; m.spawnB = { x: 39, y: 15 }; scatter(['rock', 'tree', 'bush'], 50, (x, y) => (x > 13 && x < 30) || Math.hypot(x - 5, y - 15) < 4 || Math.hypot(x - 39, y - 15) < 4); break; }
      case 'valley': {
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (n2(x, y) > 0.75 && Math.abs(x - y) > 6 && Math.abs(x + y - 50) > 6) E.setTile(m, x, y, 3);
        m.spawnA = { x: 5, y: 45 }; m.spawnB = { x: 45, y: 5 }; m.points = [{ x: 12, y: 38 }, { x: 25, y: 25 }, { x: 38, y: 12 }];
        for (const p of m.points) for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) E.setTile(m, p.x + dx, p.y + dy, 2);
        for (const p of m.points) for (const a of [0, 2.1, 4.2]) E.addProp(m, 'crystal', p.x + Math.cos(a) * 2.6, p.y + Math.sin(a) * 2.6, { crystal: '#7ae8ff' });
        scatter(['tree', 'rock', 'crystal', 'bush'], 80, (x, y) => m.points.some(p => Math.hypot(x - p.x, y - p.y) < 4) || Math.hypot(x - 5, y - 45) < 5 || Math.hypot(x - 45, y - 5) < 5, { acc: m.acc, crystal: '#7ae8ff' }); break; }
      case 'harbor': {
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (y < 5 || y > 35) E.setTile(m, x, y, 3); else if (Math.abs(y - 20) < 2.2) E.setTile(m, x, y, 2); }
        m.spawnA = { x: 4, y: 20 }; m.spawnB = { x: 44, y: 20 }; m.path = []; for (let x = 6; x <= 42; x += 2) m.path.push({ x, y: 20 + Math.sin(x / 5) * 1.2 });
        for (let k = 0; k < 40; k++) { const x = 8 + R() * 32, y = 7 + R() * 26; if (Math.abs(y - 20) < 3.5) continue; E.addProp(m, 'crate', Math.floor(x) + 0.5, Math.floor(y) + 0.5, null, true); } break; }
      case 'spire': {
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const d = Math.hypot(x - c.x, y - c.y); if (d > 6 && d < 14 && n2(x, y) > 0.35) E.setTile(m, x, y, 6); if (d < 3) E.setTile(m, x, y, 8); }
        m.ice = true; m.spawnA = { x: 5, y: 35 }; m.spawnB = { x: 35, y: 5 }; m.hill = { x: c.x, y: c.y };
        scatter(['icespike', 'pine', 'rock'], 60, (x, y) => Math.hypot(x - c.x, y - c.y) < 5 || Math.hypot(x - 5, y - 35) < 4 || Math.hypot(x - 35, y - 5) < 4, { acc: '#4a7a6a' }); break; }
      case 'jungle': {
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (n2(x, y) > 0.6 && Math.hypot(x - 4, y - 20) > 5 && Math.hypot(x - 36, y - 20) > 5) E.setTile(m, x, y, 7);
        m.fog = 6.5; m.spawnA = { x: 4, y: 20 }; m.spawnB = { x: 36, y: 20 };
        scatter(['tree', 'pine', 'mushroom', 'bush'], 110, (x, y) => Math.hypot(x - 4, y - 20) < 4 || Math.hypot(x - 36, y - 20) < 4, { acc: '#2a5a2a' });
        for (let k = 0; k < 18; k++) { const x = 6 + R() * 28, y = 3 + R() * 34; E.addProp(m, 'pillar', Math.floor(x) + 0.5, Math.floor(y) + 0.5, null, true); } break; }
      case 'skyarena': {
        m.edges = true; m.bg = '#4a5a7a'; m.sky = true;
        S.skyLayout(m, 0); m.spawnA = { x: 6.5, y: 29.5 }; m.spawnB = { x: 29.5, y: 6.5 }; m.hill = { x: 18, y: 18 }; break; }
      case 'rift': {
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const d = Math.hypot(x + 0.5 - c.x, y + 0.5 - c.y); if (d > 19) E.setTile(m, x, y, 4); }
        m.spawnA = { x: 10, y: 30 }; m.spawnB = { x: 30, y: 10 }; m.rift = true; scatter(['lavarock', 'rock', 'deadtree'], 50, (x, y) => Math.hypot(x - c.x, y - c.y) > 17); break; }
      case 'graveyard': {
        m.spawnA = { x: 5, y: 41 }; m.spawnB = { x: 41, y: 5 }; m.bossPt = { x: 23, y: 23 }; m.bossAt = 180;
        scatter(['bones', 'bones', 'deadtree', 'rock', 'pillar'], 120, (x, y) => Math.hypot(x - 23, y - 23) < 5 || Math.hypot(x - 5, y - 41) < 4 || Math.hypot(x - 41, y - 5) < 4); break; }
      case 'grand': {
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dd = Math.abs(x - y); if (dd < 2.5 && !(Math.abs(x - 15) < 3 || Math.abs(x - 30) < 3 || Math.abs(x - 45) < 3)) E.setTile(m, x, y, 3); if (Math.abs(x + y - 60) < 2.5) E.setTile(m, x, y, 2); }
        m.spawnA = { x: 4, y: 56 }; m.spawnB = { x: 56, y: 4 }; m.points = [{ x: 15, y: 45 }, { x: 30, y: 30 }, { x: 45, y: 15 }]; m.bossPt = { x: 38, y: 38 }; m.towers = [{ x: 9, y: 51, team: 0 }, { x: 51, y: 9, team: 1 }]; m.bossAt = 120;
        scatter(['tree', 'rock', 'bush', 'pine'], 160, (x, y) => m.points.some(p => Math.hypot(x - p.x, y - p.y) < 4) || Math.hypot(x - 4, y - 56) < 6 || Math.hypot(x - 56, y - 4) < 6 || Math.abs(x + y - 60) < 3); break; }
    }
    // defaults for any mode on any map
    const A = m.spawnA, B = m.spawnB;
    m.points = m.points || [0.25, 0.5, 0.75].map(t => S.freePt(m, U.lerp(A.x, B.x, t), U.lerp(A.y, B.y, t)));
    m.hill = m.hill || S.freePt(m, (A.x + B.x) / 2, (A.y + B.y) / 2);
    m.flagA = m.flagA || { x: A.x, y: A.y }; m.flagB = m.flagB || { x: B.x, y: B.y };
    m.path = m.path || Array.from({ length: 12 }, (_, i) => S.freePt(m, U.lerp(A.x, B.x, (i + 1) / 13), U.lerp(A.y, B.y, (i + 1) / 13)));
    m.bossPt = m.bossPt || S.freePt(m, (A.x + B.x) / 2, (A.y + B.y) / 2);
    m.spawn = A;
    return E.scaleMap(m, G.MAPK);
  }
  S.freePt = (m, x, y) => { for (let r = 0; r < 8; r++) for (let k = 0; k < 16; k++) { const a = k / 16 * 6.28; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (E.inside(m, px, py) && !m.block[E.idx(m, px, py)]) return { x: Math.floor(px) + 0.5, y: Math.floor(py) + 0.5 }; } return { x, y }; };
  S.skyLayout = (m, alt) => {
    if (m.k && m.k !== 1) { const b = E.newMap({ w: m.bw, h: m.bh }); S.skyLayout(b, alt); for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) { const sI = Math.min(m.bh - 1, Math.floor(j / m.k)) * m.bw + Math.min(m.bw - 1, Math.floor(i / m.k)); E.setTile(m, i, j, b.tiles[sI]); } return; }
    const P = [2, 13.5, 25]; const sz = 9;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) E.setTile(m, x, y, 5);
    for (const py of P) for (const px of P) for (let y = py; y < py + sz; y++) for (let x = px; x < px + sz; x++) E.setTile(m, Math.floor(x), Math.floor(y), (x + y) % 7 < 1 ? 1 : 0);
    const bridge = (x0, y0, x1, y1) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2); for (let i = 0; i <= n; i++) { const x = U.lerp(x0, x1, i / n), y = U.lerp(y0, y1, i / n); for (let o = -1; o <= 0; o++) { E.setTile(m, Math.floor(x + (y0 === y1 ? 0 : o)), Math.floor(y + (y0 === y1 ? o : 0)), 2); } } };
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      const on = alt ? (i + j) % 2 === 0 : (i + j) % 2 === 1 || i === 1;
      if (on || j === 0 && i === 1) bridge(P[j] + sz, P[i] + 4.5, P[j + 1], P[i] + 4.5);
      if (!on || i === 1 && j === 1) bridge(P[i] + 4.5, P[j] + sz, P[i] + 4.5, P[j + 1]);
    }
  };
  function gateSprite(c, w = 72) { const h = 50; const [cv, x] = SPR.mk(w, h); x.fillStyle = U.shade(c, -0.4); x.fillRect(0, 10, w, h - 10); const dw = Math.round(w * 0.62), dx = Math.round((w - dw) / 2); x.fillStyle = '#5a3a22'; x.fillRect(dx, 16, dw, h - 16); for (let i = 0; i <= dw; i += 10) { x.fillStyle = '#3a2416'; x.fillRect(dx + i, 16, 2, h - 16); } x.fillStyle = '#8a8a96'; x.fillRect(dx, 24, dw, 2); x.fillRect(dx, 38, dw, 2); x.fillStyle = U.shade(c, -0.2); for (let i = 0; i < w; i += 8) x.fillRect(i, 4, 5, 7); x.fillStyle = '#ffd84a'; x.fillRect(Math.round(w / 2) - 2, 30, 4, 4); SPR.crisp(cv); return { img: cv, w, h }; }
  function genCastle(ci, defColor) {
    if (ci === 0) {
      const w = 36, h = 36; const m = E.newMap({ id: 'border', kind: 'siege', w, h, g: ['#6a8a4a', '#759652'], acc: '#4a6a3a', bg: '#0b0a12' });
      const n1 = E.noise(77, w, h, 6); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) E.setTile(m, x, y, n1(x, y) > 0.55 ? 1 : 0);
      for (let y = 16; y < 21; y++) for (let x = 16; x < 21; x++) E.setTile(m, x, y, 2);
      const R = U.seeded(99); for (let k = 0; k < 60; k++) { const x = R() * w, y = R() * h; if (Math.hypot(x - 18, y - 18) < 5 || Math.abs(x - 18) < 3) continue; E.addProp(m, U.pick(['rock', 'tree', 'bush']), x, y, { acc: m.acc }); }
      m.spawnAtt = { x: 18, y: 33 }; m.spawnDef = { x: 18, y: 3.5 }; m.flag = { x: 18.5, y: 18.5 }; m.border = true; m.spawn = m.spawnAtt; return E.scaleMap(m, G.MAPK);
    }
    const cd = D.CASTLES[ci - 1]; const w = 36, h = 40;
    const m = E.newMap({ id: 'castle' + ci, kind: 'siege', w, h, g: cd.g, acc: U.shade(cd.g[0], -0.3), bg: '#0b0a12' });
    const n1 = E.noise(ci * 13, w, h, 5); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) E.setTile(m, x, y, y < 20 ? 8 : n1(x, y) > 0.55 ? 1 : 0);
    if (ci === 3) for (let y = 22; y < 40; y++) for (let x = 0; x < w; x++) if (n1(x, y) > 0.72 && Math.abs(x - 18) > 5) E.setTile(m, x, y, 3);
    if (ci === 4) for (let y = 22; y < 40; y++) for (let x = 0; x < w; x++) if (n1(x, y) > 0.74 && Math.abs(x - 18) > 5) E.setTile(m, x, y, 4);
    if (ci === 2) for (let y = 22; y < 34; y++) for (let x = 0; x < w; x++) if (Math.abs(x - 18) > 4 && Math.abs(x - 18) < 13 && y % 6 < 3) E.addProp(m, 'rock', x + 0.5, y + 0.5, null, true);
    const wc = U.shade(cd.g[0], -0.1);
    for (let x = 0; x < w; x++) { if (x >= 16 && x <= 19) continue; E.addWall(m, x, 20, wc, 30); }
    m.gateTiles = [16, 17, 18, 19].map(x => ({ x, y: 20 })); for (const t of m.gateTiles) m.block[E.idx(m, t.x, t.y)] = 2;
    if (ci === 5) { for (let x = 6; x < 30; x++) { if (x >= 16 && x <= 19) continue; E.addWall(m, x, 12, U.shade(wc, 0.15), 30); } m.innerTiles = [16, 17, 18, 19].map(x => ({ x, y: 12 })); for (const t of m.innerTiles) m.block[E.idx(m, t.x, t.y)] = 2; }
    m.spawnAtt = { x: 18, y: 36.5 }; m.spawnDef = { x: 18, y: ci === 5 ? 7.5 : 10 }; m.throne = { x: 18, y: 4.5 }; m.towers = [{ x: 9.5, y: 17.5 }, { x: 26.5, y: 17.5 }];
    E.addProp(m, 'throne', 18, 3.4, null); for (const x of [14, 22]) E.addProp(m, 'banner', x, 4, { c: defColor, c2: '#ffd84a' });
    const R = U.seeded(ci * 31); for (let k = 0; k < 40; k++) { const x = R() * w, y = 22 + R() * 17; if (Math.abs(x - 18) < 4) continue; if (m.block[E.idx(m, x, y)]) continue; E.addProp(m, U.pick(['rock', 'bush', 'tree']), x, y, { acc: m.acc }); }
    m.gatePt = { x: 18, y: 20.5 }; m.innerPt = { x: 18, y: 12.5 }; m.guardPt = { x: 18, y: 6 }; m.ballistaPt = { x: 18, y: 16.5 }; m.attGate = { x: 18, y: 21.8 }; m.attInner = { x: 18, y: 13.8 }; m.defGate = { x: 18, y: 18.3 }; m.defInner = { x: 18, y: 10.5 }; m.cx = 18;
    m.spawn = m.spawnAtt; m.ci = ci; return E.scaleMap(m, G.MAPK);
  }
  S.gateSprite = gateSprite;

  // ======================================================================
  // TOWN
  // ======================================================================
  S.TownMode = (id) => {
    const town = D.TOWNS.find(t => t.id === id);
    const M = {
      kind: 'town', id, name: town.th, allowMount: true, safe: true, portals: [],
      build() { return genTown(id); },
      init() {
        const m = W.map; const list = D.NPCS[id]; S.save.lastTown = id;
        list.forEach((nd, i) => {
          const a = i / list.length * Math.PI * 2 - Math.PI / 2; const x = m.c + 0.5 + Math.cos(a) * m.npcR, y = m.c + 0.5 + Math.sin(a) * m.npcR;
          const cls = D.CLASSES[(U.hash(nd.n) % 20)].id; const look = SPR.lookFor(cls, null, { skin: U.pick(['#f0c8a0', '#d8a878', '#a8784a', '#f8d8b8']) });
          const u = E.mkUnit({ kind: 'npc', team: 9, x, y, fx: (m.c - x), fy: (m.c - y), name: nd.n, role: nd.role, roleTh: nd.th, look, label: nd.role === 'quest' || nd.role === 'teleport' || nd.role === 'dungeon', st: { def: 0 } });
          E.face(u, m.c, m.c); E.spawn(u);
          if (['shop', 'market', 'smith', 'jeweler', 'tailor', 'runesmith'].includes(nd.role)) E.addProp(m, 'stall', x - Math.cos(a) * 1.4, y - Math.sin(a) * 1.4, { c: U.pick(['#e04a4a', '#4a8ad0', '#e8b04a', '#5ab84a']), item: '#ffd84a' });
        });
        // simulated players
        const n = id === 'aurelion' ? 40 : 9;
        for (let i = 0; i < n; i++) {
          const cls = U.pick(D.CLASSES).id; let fashion = null; if (Math.random() < 0.5) { fashion = { f_body: S.genItem('fashion', U.ri(2, 10), 1, { slot: 'f_body' }) }; if (Math.random() < 0.5) fashion.f_wings = S.genItem('fashion', 8, 1, { slot: 'f_wings' }); if (Math.random() < 0.4) fashion.f_head = S.genItem('fashion', 6, 1, { slot: 'f_head' }); }
          const pt = S.freePt(m, m.c + U.rf(-9, 9) * m.k, m.c + U.rf(-9, 9) * m.k);
          const u = E.mkUnit({ kind: 'npc', team: 9, x: pt.x, y: pt.y, name: U.pick(D.NAMES) + U.ri(1, 999), look: SPR.lookFor(cls, fashion), wander: true, wr: 7 * m.k, fashion, sim: true, st: { def: 0 } });
          u.home = { x: m.c, y: m.c }; E.spawn(u);
        }
        this.chatT = 3; this.chalT = U.rf(120, 260);
      },
      update(dt) {
        this.chatT -= dt; if (this.chatT <= 0) { this.chatT = U.rf(5, 11); const sims = W.units.filter(u => u.sim); if (sims.length) { const u = U.pick(sims); u.say = U.pick(D.CHAT); u.sayT = W.time + 4; G.UI.log(`${u.name}: ${u.say}`, 'chat'); } }
        if (S.save.guild) { this.chalT -= dt; if (this.chalT <= 0) { this.chalT = U.rf(240, 420); G.UI.challengePopup(U.pick(S.save.rivals)); } }
        S.updateLoot(dt);
      },
      hud() { return `<b>${town.th}</b> · เขตปลอดภัย`; }
    };
    return M;
  };

  // ======================================================================
  // FARM
  // ======================================================================
  S.FarmMode = (i) => {
    const def = D.FARM_MAPS[i]; const elem = MAP_ELEM[i];
    const M = {
      kind: 'farm', idx: i, def, name: def.th, allowMount: true, portals: [], timers: {}, respawnQ: [], t: 0,
      build() { return genFarm(def, i); },
      init() {
        const m = W.map; this.portals = [{ x: m.portalPt.x, y: m.portalPt.y, step: true, use: () => S.goTown(S.save.lastTown) }];
        this.timers = { champion: D.FIRST_SPAWN.champion, rare: D.FIRST_SPAWN.rare, boss: D.FIRST_SPAWN.boss };
        for (let k = 0; k < 150; k++) this.spawnNormal(); // denser farm maps
        for (let k = 0; k < 14; k++) this.spawnWanderer();
        this.wbCheck = 0; G.UI.log(`เข้าสู่ ${def.th} (เลเวล ${def.lv[0]}–${def.lv[1]}) ฝั่งตะวันออกเป็นโซน PvP`, 'sys');
        W.player.red = S.save.infamy >= 3;
      },
      lvlFor(grade) { const [a, b] = def.lv; return grade === 'normal' ? U.ri(a, b) : grade === 'elite' ? U.ri(a + 2, b) : b; },
      spawnNormal() {
        const m = W.map; let x, y, g = 0; do { x = U.rf(3, m.w - 3); y = U.rf(3, m.h - 3); g++; } while ((m.block[E.idx(m, x, y)] || Math.hypot(x - m.spawn.x, y - m.spawn.y) < 8 * m.k) && g < 50);
        const md = U.pick(def.mobs); const grade = Math.random() < 0.05 ? 'elite' : 'normal';
        E.spawn(S.mkMob(md, this.lvlFor(grade), grade, x, y, { elem }));
      },
      spawnGrade(grade, pt) {
        const m = W.map; const p = pt || (grade === 'champion' ? U.pick(m.champPts) : grade === 'boss' ? m.bossPt : grade === 'world' ? m.worldPt : S.freePt(m, U.rf(0.15, 0.9) * m.w, U.rf(0.1, 0.9) * m.h));
        const md = grade === 'champion' ? def.champ : grade === 'rare' ? def.rare : grade === 'boss' ? def.boss : grade === 'world' ? def.world : U.pick(def.mobs);
        const u = E.spawn(S.mkMob(md, this.lvlFor(grade), grade, p.x, p.y, { elem, leash: grade === 'world' ? 30 : 16 }));
        V.pillar(p.x, p.y, D.GRADES[grade].col, grade === 'world' ? 999 : 160, grade === 'world' ? 999 : 2.5, grade === 'world' ? 14 : 10);
        if (grade === 'rare') u.beacon = V.pillar(p.x, p.y, '#c07aff', 200, 9999, 8);
        V.ring(p.x, p.y, 3, [D.GRADES[grade].col, '#ffffff', D.GRADES[grade].col], 1, { w: 4 });
        const msg = { champion: `Champion ${md.n} ปรากฏตัวแล้ว!`, rare: `Rare Spawn ${md.n} ปรากฏตัว! (มองหาเสาแสงสีม่วง)`, boss: `Map Boss ${md.n} ปรากฏตัวในโซน PvP!`, world: `⚠ WORLD BOSS ${md.n} ปรากฏตัวที่ ${def.th}!` }[grade];
        if (msg) { G.UI.announce(D.GRADES[grade].th, msg); G.UI.log(msg, 'sys'); }
        if (grade === 'world') { u.worldBeacon = true; this.worldAlive = u; for (let k = 0; k < 4; k++) this.spawnWanderer(true, p); }
        return u;
      },
      spawnWanderer(nearBoss, p) {
        const m = W.map; const pt = nearBoss ? S.freePt(m, p.x + U.rf(-5, 5), p.y + U.rf(-5, 5)) : S.freePt(m, U.rf(0.18, 0.92) * m.w, U.rf(0.1, 0.9) * m.h);
        const cls = U.pick(D.CLASSES).id; const lvl = U.ri(def.lv[0], def.lv[1]); const wb = S.worldBotStats(cls, lvl, U.rf(0.5, 1.5));
        const u = S.makeBot(cls, 4, 0, U.ri(1, 3), { stats: wb.st, lvl, x: pt.x, y: pt.y, tag: Math.random() < 0.5 ? U.pick(D.GUILD_NAMES).split(' ').map(w => w[0]).join('') : null });
        u.red = Math.random() < 0.25; u.wanderer = true; u.home = { x: pt.x, y: pt.y }; E.spawn(u);
      },
      ctl(u) { // wanderer brain
        return { vision: 8, goal: (b) => { if (!b.ai.wp || U.d2(b.x, b.y, b.ai.wp.x, b.ai.wp.y) < 1 || Math.random() < 0.01) b.ai.wp = S.freePt(W.map, U.rf(0.1, 0.92) * W.map.w, U.rf(0.1, 0.9) * W.map.h); return b.ai.wp; } };
      },
      autoCtl(u) {
        const quest = D.MAIN_QUESTS[S.save.quests.main];
        return { vision: 14, prefer: t => t.kind === 'mob' && (quest && quest.type === 'elite' ? t.grade !== 'normal' : true), goal: (b) => { if (!b.ai.wp || U.d2(b.x, b.y, b.ai.wp.x, b.ai.wp.y) < 1.5) { const mobs = W.units.filter(t => t.kind === 'mob' && !t.dead && (S.save.pk || !W.map.pvp[E.idx(W.map, t.x, t.y)] || t.boss)); const t = mobs.sort((a, c) => U.d2(b.x, b.y, a.x, a.y) - U.d2(b.x, b.y, c.x, c.y))[0]; b.ai.wp = t ? { x: t.x, y: t.y } : S.freePt(W.map, U.rf(0.1, 0.6) * W.map.w, U.rf(0.1, 0.9) * W.map.h); } return b.ai.wp; } };
      },
      update(dt) {
        this.t += dt; const ts = W.gm.time;
        for (const k of ['champion', 'rare', 'boss']) { if (this.alive && this.alive[k] && !this.alive[k].dead) continue; this.timers[k] -= dt * ts; if (this.timers[k] <= 0) { (this.alive = this.alive || {})[k] = this.spawnGrade(k); this.timers[k] = 1e9; } }
        // world boss schedule (12:00 & 20:00 local, first minute)
        this.wbCheck -= dt; if (this.wbCheck <= 0) { this.wbCheck = 20; const d = new Date(); if ((d.getHours() === 12 || d.getHours() === 20) && d.getMinutes() < 2 && !this.worldAlive && this.wbHour !== d.getHours()) { this.wbHour = d.getHours(); this.spawnGrade('world'); } }
        for (let k = this.respawnQ.length - 1; k >= 0; k--) { this.respawnQ[k].t -= dt; if (this.respawnQ[k].t <= 0) { const r = this.respawnQ.splice(k, 1)[0]; if (r.w) this.spawnWanderer(); else this.spawnNormal(); } }
        for (let k = W.units.length - 1; k >= 0; k--) { const u = W.units[k]; if (u.dead && u !== W.player && u.deadT > 3) W.units.splice(k, 1); }
        const p = W.player; if (p.dead && p.deadT > 4) { p.dead = false; p.hp = p.maxhp * 0.5; p.x = W.map.spawn.x; p.y = W.map.spawn.y; p.anim.t = 0; G.UI.toast('ฟื้นคืนชีพที่จุดเกิด', 'info'); if (S.save.infamy >= 3 && S.save.inv.length) { const it = S.save.inv.splice(Math.floor(Math.random() * S.save.inv.length), 1)[0]; G.UI.toast(`ชื่อแดงตาย! ทำ ${it.name} หล่น`, 'bad'); } }
        S.updateLoot(dt);
      },
      onKill(t, k) {
        if (t === W.player) { S.save.stats.deaths++; G.UI.toast('คุณถูกสังหาร — จะฟื้นใน 4 วิ', 'bad'); return; }
        if (t.wanderer) { this.respawnQ.push({ t: 25, w: true }); return; }
        if (t.kind !== 'mob') return;
        if (t.grade === 'normal' || t.grade === 'elite') this.respawnQ.push({ t: U.rf(4, 8) });
        if (['champion', 'rare', 'boss'].includes(t.grade)) { this.timers[t.grade] = t.grade === 'rare' ? U.rf(...D.SPAWN_T.rare) : D.SPAWN_T[t.grade]; if (t.beacon) t.beacon.t = t.beacon.dur; }
        if (t.grade === 'world') { this.worldAlive = null; }
        if (!S.mobCredit(t, k)) return;
        const s = S.save; s.stats.kills++; S.codexKill(t.md.n);
        S.gainXp(S.mobXp(t)); s.gold += Math.round((2 + t.lvl * 0.8) * D.GRADES[t.grade].xp * (1 + (W.player.st.gold || 0) / 100));
        S.quest('kill', 1, { map: def.id }); if (t.grade !== 'normal') S.quest('elite', 1, { map: def.id }); if (['champion', 'rare', 'boss', 'world'].includes(t.grade)) S.quest('boss');
        const g = D.GRADES[t.grade]; const M = def.B + g.bonus; const st = W.player.st;
        let chance = g.drop * (1 + (st.drop || 0) / 100) * W.gm.drop; if (s.lvl - t.lvl >= 20) chance *= 0.5;
        let n = g.n || 1; if (t.grade === 'world') { const share = (t.pdmg || 0) / t.maxhp; n = share > 0.1 ? 5 : share > 0.03 ? 4 : 3; }
        const items = [];
        if (g.drop >= 1) { for (let q = 0; q < n; q++) items.push(S.rollDrop('farm', S.rollTier(D.farmDist(M, g.boss)), t.lvl / 2)); if (Math.random() < chance - 1) items.push(S.rollDrop('farm', S.rollTier(D.farmDist(M, g.boss)), t.lvl / 2)); }
        else if (Math.random() < chance) items.push(S.rollDrop('farm', S.rollTier(D.farmDist(M, false)), t.lvl / 2));
        if (t.grade === 'world' && (t.pdmg || 0) / t.maxhp > 0.1) items.push(S.rollDrop('farm', M, t.lvl / 2));
        if (t.grade === 'rare') { items.push({ kind: 'cur', cur: 'thread', n: 8 + M * 2, label: 'ด้ายแฟชั่น (วัตถุดิบเฉพาะแผนที่)', tier: M }); if (Math.random() < 0.1) items.push(S.genItem('relic', M, t.lvl / 2)); }
        for (const it of items) if (it) S.dropLoot(t.x, t.y, it);
      },
      hud() {
        const p = W.player; const inPvp = W.map.pvp[E.idx(W.map, p.x, p.y)];
        const f = s => s > 1e8 ? 'อยู่แล้ว' : s > 60 ? Math.ceil(s / 60) + ' นาที' : Math.ceil(s) + ' วิ';
        return `<b>${def.th}</b> · Lv ${def.lv[0]}–${def.lv[1]} · ระดับดรอปพื้นฐาน B=${def.B}${inPvp ? ' · <span class="pvpz">โซน PvP</span>' : ''}<br><small>Champion ${f(this.timers.champion)} · Rare ${f(this.timers.rare)} · Map Boss ${f(this.timers.boss)}</small>`;
      }
    };
    return M;
  };

  // ======================================================================
  // DUNGEON
  // ======================================================================
  S.DungeonMode = (dgId, startFloor, mercN = 0) => {
    const dg = D.DUNGEONS.find(d => d.id === dgId);
    const M = {
      kind: 'dungeon', mercN, dg, floor: startFloor, startFloor, allowMount: false, run: { cleared: 0, bosses: [], king: false, got: [] }, mercs: [], portals: [], ended: false,
      build() { return genDungeon(dg, this.floor); },
      init() {
        const s = S.save; const d = s.dungeons[dgId] = s.dungeons[dgId] || { best: 0, cp: 0, daily: { date: '', runs: 0 } };
        if (d.daily.date !== U.today()) d.daily = { date: U.today(), runs: 0 }; d.daily.runs++; this.full = d.daily.runs <= D.DUNGEON_DAILY_FULL;
        const cp = W.player.cpv; for (let k = 0; k < mercN; k++) { const cls = S.randomClasses(1)[0]; if (!S.mercUse(cls, 1)) { G.UI.toast('ทองไม่พอจ้างทหารรับจ้างเพิ่ม', 'bad'); break; } const r = S.mercRank(cls); const u = S.makeBot(cls, 0, cp, r.ai, { x: W.player.x + U.rf(-1, 1), y: W.player.y + 0.8, merc: true, name: D.CLS[cls].name + ' (รับจ้าง)' }); u.brain = (b, dt) => E.heroAI(b, dt, { vision: 24, goal: () => this.portal && this.cleared ? this.portal : W.player }); E.spawn(u); this.mercs.push(u); S.merc(cls).m++; }
        this.setupFloor();
        if (!this.full) G.UI.toast(`วันนี้เกิน ${D.DUNGEON_DAILY_FULL} รอบแล้ว รางวัลลดเหลือ 30%`, 'info');
      },
      setupFloor() {
        const F = this.floor; const mi = Math.min(D.FARM_MAPS.length - 1, Math.floor((F - 1) / 5)); const base = D.FARM_MAPS[mi]; const L = Math.min(D.MAX_LV, Math.round(F * 0.6 + 3)); const hpMul = (1 + F / 60) * (1 + Math.max(0, F - 300) / 250);
        this.cleared = false; this.portals = []; this.portal = null;
        const mp = W.map; const pts = () => S.freePt(mp, U.rf(0.15, 0.85) * mp.w, U.rf(0.15, 0.65) * mp.h);
        if (F % 10 === 0) { const md = F === 1000 ? Object.assign({}, base.world, { n: 'Dungeon King ' + base.world.n }) : base.boss; const p = W.map.bossSpot; const u = E.spawn(S.mkMob(md, L, F === 1000 ? 'world' : 'boss', p.x, p.y, { elem: MAP_ELEM[mi], hpMul: hpMul * (F === 1000 ? 0.35 : 0.6), leash: 99 })); u.aggro = 30; for (let k = 0; k < 3; k++) { const q = pts(); const mm = E.spawn(S.mkMob(U.pick(base.mobs), L, 'normal', q.x, q.y, { elem: MAP_ELEM[mi], hpMul, leash: 99 })); mm.aggro = 30; } G.UI.announce(F === 100 ? 'ราชาดันเจี้ยน' : 'BOSS FLOOR', `${dg.n} ชั้น ${F}: ${md.n}`); }
        else { const n = Math.min(18, 7 + Math.floor(F / 7)); for (let k = 0; k < n; k++) { const q = pts(); const grade = F % 5 === 0 && k === 0 ? 'champion' : Math.random() < 0.15 ? 'elite' : 'normal'; const md = grade === 'champion' ? base.champ : U.pick(base.mobs); const u = E.spawn(S.mkMob(md, L, grade, q.x, q.y, { elem: MAP_ELEM[mi], hpMul: grade === 'champion' ? hpMul * 0.7 : hpMul, leash: 99 })); u.aggro = 30; } }
        G.UI.log(`${dg.n} ชั้น ${F} — ระดับไอเทม ${D.tierOfFloor(F)} (${D.TIERS[D.tierOfFloor(F) - 1].n})`, 'sys');
      },
      floorClear() {
        const s = S.save; const F = this.floor; const d = s.dungeons[dgId]; this.cleared = true; this.run.cleared++; s.stats.floors++;
        d.best = Math.max(d.best, F); if (F % 10 === 0) { d.cp = Math.max(d.cp, F); this.run.bosses.push({ f: F, t: D.tierOfFloor(F) }); }
        S.quest('floors'); S.quest('floor', 0, { floor: F }); if (F % 10 === 0) S.quest('boss');
        if (F === 100) S.ach('f100'); if (F === 1000) { this.run.king = true; }
        E.heal(W.player, W.player, W.player.maxhp * 0.2); E.later(0.6, () => this.vacuum()); this.autoT = 2.2;
        const m = W.map; V.pillar(m.portalPt.x, m.portalPt.y, dg.c, 120, 1.5, 12);
        if (F >= 1000) { E.later(1.2, () => this.endRun('complete')); return; }
        E.addProp(m, 'portal', m.portalPt.x, m.portalPt.y, { c: dg.c });
        this.portal = { x: m.portalPt.x, y: m.portalPt.y, step: true, use: () => this.nextFloor() }; this.portals = [this.portal];
        if (F % 10 === 0) { E.addProp(m, 'portal', m.exitPt.x, m.exitPt.y, { c: '#ffd84a' }); this.portals.push({ x: m.exitPt.x, y: m.exitPt.y, step: true, exit: true, use: () => this.endRun('exit') }); G.UI.toast('ห้องพัก: ประตูสีทอง = ออกพร้อมรางวัล, ประตูสีดันเจี้ยน = ลงต่อ', 'good'); }
        G.UI.toast(`ผ่านชั้น ${F}!`, 'good');
      },
      nextFloor() {
        if (this.busy) return; this.busy = true; this.floor++;
        const keep = [W.player, ...this.mercs.filter(u => !u.dead)]; S.resetUnitsForMap(keep); W.timers.length = 0; V.clear();
        W.map = this.build(); E.renderMapCanvas(W.map); const sp = W.map.spawn; keep.forEach((u, i) => { u.x = sp.x + (i ? U.rf(-1.2, 1.2) : 0); u.y = sp.y + (i ? 0.6 : 0); u.ai.path = null; u.kb = null; });
        W.cam.x = W.player.x; W.cam.y = W.player.y; S.IN.clickMove = null; this.setupFloor(); this.busy = false;
      },
      update(dt) {
        if (this.ended) return;
        S.updateLoot(dt);
        if (!this.cleared && !W.units.some(u => u.kind === 'mob' && !u.dead)) this.floorClear();
        if (this.cleared && this.portal && S.auto.on && !this.busy && !W.player.dead) { this.autoT -= dt; if (this.autoT <= 0) { this.vacuum(); G.UI.toast(`ออโต้: ลงชั้น ${this.floor + 1}`, 'info'); this.nextFloor(); } }
        if (W.player.dead && W.player.deadT > 1.5) this.endRun('dead');
      },
      onKill(t, k) {
        if (t.kind !== 'mob') return; S.gainXp(S.mobXp(t) * 0.6); S.save.gold += Math.round(1 + t.lvl * 0.5); S.codexKill(t.md.n); S.quest('kill', 1, {});
        // every monster drops loot; tier follows the floor rule (never above this floor's tier)
        const F = this.floor, T = D.tierOfFloor(F), dist = D.dungeonDist(F); const n = { normal: 1, elite: 2, champion: 2, boss: 4, world: 6 }[t.grade] || 1;
        for (let q = 0; q < n; q++) { const tr = S.rollTier(dist); const [a, b] = D.FLOOR_BANDS[tr - 1]; const ilv = tr === T ? U.ri(a, F) : U.ri(Math.ceil((a + b) / 2), b); const it = S.rollDrop(this.dg.drop, tr, ilv); if (it) S.dropLoot(t.x, t.y, it); }
        if (Math.random() < 0.35) S.dropLoot(t.x, t.y, { kind: 'cur', cur: 'gold', n: Math.round(20 * T * T + t.lvl * 3), label: 'ทอง', tier: 1 });
      },
      onPickup(it) { this.run.got.push(it); },
      vacuum() { const p = W.player; for (const l of W.loots.slice()) { if (E.vis(l.x, l.y)) V.fly(l.x, l.y, p.x, p.y, 'star4', D.tierColor(l.tier), 4, 0.35); if (S.addItem(l.item, true)) { this.onPickup(l.item); W.loots.splice(W.loots.indexOf(l), 1); } } },
      endRun(reason) {
        if (this.ended) return; this.ended = true; this.vacuum();
        const res = S.dungeonRewards(this, reason);
        for (const it of res.items) S.addItem(it, true);
        S.persist(); G.UI.dungeonResult(this, res, reason);
      },
      autoCtl() { return { vision: 30, goal: () => this.cleared && this.portal ? Object.assign({ r: 0.1 }, this.portal) : W.map.center }; },
      hud() { const F = this.floor, T = D.tierOfFloor(F); const r = S.dungeonRollCount(this); return `<b>${dg.n}</b> · ชั้น ${F}/1000 · ระดับไอเทม <span style="color:${D.tierColor(T)}">${T} ${D.TIERS[T - 1].n}</span><br><small>ผ่านในรอบนี้ ${this.run.cleared} ชั้น · สุ่มรางวัล ${r} ครั้ง (บอส ${this.run.bosses.length})${this.full ? '' : ' · รางวัล 30%'}</small>`; }
    };
    return M;
  };
  S.dungeonRollCount = (m) => { let n = Math.max(1, Math.floor(m.run.cleared / 5)) + m.run.bosses.length; n = Math.min(30, n); if (!m.full) n = Math.max(1, Math.round(n * 0.3)); return n; };
  S.dungeonRewards = (m, reason) => {
    const F = Math.max(1, m.floor); const T = D.tierOfFloor(F); const dist = D.dungeonDist(F); const items = []; const log = [];
    let rolls = S.dungeonRollCount(m); const bossN = Math.min(rolls, m.run.bosses.length); let normal = rolls - bossN;
    const drop = (W.player.st.drop || 0) / 100; if (Math.random() < drop * normal) normal++;
    for (let k = 0; k < normal; k++) {
      const t = S.rollTier(dist); const [a, b] = D.FLOOR_BANDS[t - 1]; const ilv = t === T ? U.ri(a, F) : U.ri(Math.ceil((a + b) / 2), b);
      const it = S.rollDrop(m.dg.drop, t, ilv); if (it) { items.push(it); log.push({ t, src: 'สุ่ม' }); }
    }
    for (let k = 0; k < bossN; k++) { const bb = m.run.bosses[m.run.bosses.length - 1 - k]; const it = S.rollDrop(m.dg.drop, bb.t, bb.f); if (it) { items.push(it); log.push({ t: bb.t, src: 'บอสชั้น ' + bb.f }); } }
    if (m.run.king) { let it = S.rollDrop(m.dg.drop, 10, 100); if (it.kind === 'gear' || it.kind === 'acc') { it.name = 'King\'s ' + it.name; it.affix = it.affix || U.pick(D.T10_AFFIX).k; } items.push(it); log.push({ t: 10, src: 'ของเฉพาะชั้น 100' }); }
    return { items, F, T, dist, rolls, bossN, log };
  };

  // ======================================================================
  // PVP BATTLEGROUND
  // ======================================================================
  S.PvPMode = (cfg) => {
    const md = D.PVP_MODES.find(x => x.id === cfg.mode); const mapDef = D.PVP_MAPS[cfg.map]; const diff = D.DIFFS[cfg.diff];
    const size = Math.min(cfg.size, mapDef.max);
    const M = {
      kind: 'pvp', pvp: true, cfg, md, mapDef, size, diff, allowMount: false, noPet: true, normalized: cfg.normalized, noPotion: cfg.normalized,
      score: [0, 0], t: 0, limit: 600, over: false, respawn: [], round: 1, roundWins: [0, 0], idleT: 0,
      build() { return genPvP(cfg.map); },
      playerSpawn() { return W.map.spawnA; },
      init() {
        const m = W.map; const p = W.player; const cp = p.cpv;
        p.ms = { k: 0, d: 0, a: 0, dmg: 0, heal: 0, obj: 0, streak: 0 };
        this.team = [[p], []]; this.usedMercs = [];
        if (cfg.mercs) {
          const preset = (S.save.mercPresets[cfg.preset || 0] || []).slice(); const pool = preset.length ? preset : S.randomClasses(size - 1);
          for (let k = 0; k < size - 1; k++) { const cls = pool[k % pool.length] || U.pick(D.CLASSES).id; if (!S.mercUse(cls, cfg.diff)) { G.UI.toast('ทองไม่พอจ้างทหารรับจ้างครบทุกช่อง', 'bad'); break; } const r = S.mercRank(cls); const mc = S.merc(cls);
            const u = S.makeBot(cls, 0, cp, r.ai, { merc: true, persona: mc.persona, normalized: cfg.normalized, name: D.CLS[cls].name + ' [' + r.th + ']' }); S.markPvpBrain(u, r.ai); this.team[0].push(u); this.usedMercs.push(cls); }
        }
        const ecls = S.randomClasses(size, size >= 15 ? 3 : size >= 10 ? 2 : 1);
        for (const cls of ecls) this.team[1].push(S.markPvpBrain(S.makeBot(cls, 1, cp, cfg.diff, { normalized: cfg.normalized }), cfg.diff));
        for (const tm of [0, 1]) this.team[tm].forEach((u, i) => { const sp = tm ? m.spawnB : m.spawnA; const pt = S.freePt(m, sp.x + Math.cos(i * 2.399 + Math.random() * 1.2) * (0.8 + Math.sqrt(i) * 1.15 + Math.random() * 0.9), sp.y + Math.sin(i * 2.399 + Math.random() * 1.2) * (0.8 + Math.sqrt(i) * 1.0 + Math.random() * 0.9)); u.x = pt.x; u.y = pt.y; u.home = { x: sp.x, y: sp.y }; u.ms = { k: 0, d: 0, a: 0, dmg: 0, heal: 0, obj: 0, streak: 0 }; if (u !== p) { u.ai.role = Math.random() < 0.6 ? 'att' : 'def'; E.spawn(u); } });
        const T = { tdm: { 1: 10, 3: 30, 5: 50, 10: 100, 15: 150 }[size] || 50 };
        this.target = md.id === 'tdm' || md.id === 'boss' ? T.tdm : md.id === 'dom' ? 1000 : md.id === 'ctf' ? 3 : md.id === 'koth' ? 180 : md.id === 'war' ? 1500 : 3;
        if (md.id === 'dom' || md.id === 'war') this.points = m.points.map(pt => ({ x: pt.x, y: pt.y, prog: 0, owner: -1 }));
        if (md.id === 'ctf') this.flags = [{ team: 0, home: m.flagA, x: m.flagA.x, y: m.flagA.y, carrier: null, atHome: true, dropT: 0 }, { team: 1, home: m.flagB, x: m.flagB.x, y: m.flagB.y, carrier: null, atHome: true, dropT: 0 }];
        if (md.id === 'koth') this.hill = { x: m.hill.x, y: m.hill.y, r: 2.6 };
        if (md.id === 'escort') { this.half = 0; this.esc = [{ prog: 0, time: 0 }, { prog: 0, time: 0 }]; this.payload = { i: 0, x: m.path[0].x, y: m.path[0].y }; this.halfT = 0; }
        if (md.id === 'war' && m.towers) for (const tw of m.towers) this.mkTower(tw.x, tw.y, tw.team, cp);
        else if (md.id === 'war') { this.mkTower(m.spawnA.x + 2, m.spawnA.y - 2, 0, cp); this.mkTower(m.spawnB.x - 2, m.spawnB.y + 2, 1, cp); }
        this.bossAt = md.id === 'boss' ? 30 : md.id === 'war' ? 120 : m.bossAt || 0; this.bossDone = false;
        this.mech = { spike: 30, sky: 60, skyAlt: 0 };
        G.UI.announce(md.n, `${mapDef.n} · ${size}v${size} · บอท${diff.th}`);
      },
      mkTower(x, y, team, cp) { const pt = S.freePt(W.map, x, y); const hp = (300 + S.save.lvl * 45) * 12 * (cp / 3000 + 1); const u = E.spawn(E.mkUnit({ kind: 'struct', sub: 'tower', team, x: pt.x, y: pt.y, hp, maxhp: hp, st: { def: 200, atk: (20 + S.save.lvl * 5) * 1.5, dr: 0 }, name: team ? 'ป้อมศัตรู' : 'ป้อมเรา', propSpr: SPR.prop('tower', { c: team ? '#8a5a5a' : '#5a7a8a', flag: team ? '#c03a3a' : '#3a8ad0' }), atkCd: 0 })); u.update = (s, dt) => { s.atkCd -= dt; if (s.atkCd <= 0) { const t = E.nearestEnemy(s, 6.5, x => x.kind === 'hero'); if (t) { s.atkCd = 1.2; const d = Math.hypot(t.x - s.x, t.y - s.y); W.projs.push({ x: s.x, y: s.y, vx: (t.x - s.x) / d * 10, vy: (t.y - s.y) / d * 10, life: 1, owner: s, s: { elem: 'fire', cc: {} }, pow: 1.2, pierce: 0, hitSet: new Set(), r: 0, pal: D.ELEM.fire.pal, size: 3, z: 40, elem: 'fire', over: true }); } } }; return u; },
      ctl(u) {
        const me = this; return { vision: 9, siegeTarget: md.id === 'war', prefer: t => md.id === 'ctf' && me.flags && me.flags.some(f => f.carrier === t), goal: (b) => me.goal(b) };
      },
      autoCtl(u) { return this.ctl(u); },
      goal(b) {
        const m = W.map; const tm = b.team; const mySp = tm ? m.spawnB : m.spawnA, enSp = tm ? m.spawnA : m.spawnB;
        if (b.ai.cmd && b.team === 0 && b.isMerc) { const c = b.ai.cmd; const P = W.player; if (c === 'follow' || c === 'rally') return { x: P.x + U.rf(-1, 1), y: P.y + U.rf(-1, 1), r: 1.5 }; if ((c === 'attack' || c === 'defend') && b.ai.cmdPt) return b.ai.cmdPt; }
        switch (md.id) {
          case 'dom': case 'war': { const pts = this.points; const want = pts.filter(p => p.owner !== tm).sort((a, c) => U.d2(b.x, b.y, a.x, a.y) - U.d2(b.x, b.y, c.x, c.y)); const p = b.ai.role === 'def' ? pts.filter(p => p.owner === tm)[0] || want[0] : want[0] || pts[b.id % pts.length]; if (md.id === 'war' && this.boss && !this.boss.dead && b.ai.role === 'att' && b.id % 3 === 0) return this.boss; if (md.id === 'war' && !want.length) { const tw = W.units.find(u => u.sub === 'tower' && u.team !== tm && !u.dead); if (tw) return tw; } return p ? { x: p.x, y: p.y, r: 1.5 } : enSp; }
          case 'ctf': { const mine = this.flags[tm], theirs = this.flags[1 - tm]; if (theirs.carrier === b) return { x: mine.home.x, y: mine.home.y, r: 0.3 }; if (!mine.atHome && !mine.carrier) return { x: mine.x, y: mine.y, r: 0.3 }; if (mine.carrier) return mine.carrier; if (b.ai.role === 'def') return { x: mine.home.x + U.rf(-2, 2), y: mine.home.y + U.rf(-2, 2), r: 2 }; return theirs.carrier ? theirs.carrier : { x: theirs.x, y: theirs.y, r: 0.3 }; }
          case 'koth': return { x: this.hill.x + U.rf(-1, 1), y: this.hill.y + U.rf(-1, 1), r: 1 };
          case 'escort': { const att = this.half === 0 ? 0 : 1; return { x: this.payload.x + (tm === att ? -0.5 : 1), y: this.payload.y, r: 1.2 }; }
          case 'boss': if (this.boss && !this.boss.dead) return this.boss; return enSp;
          default: return b.ai.role === 'def' ? { x: (mySp.x + enSp.x) / 2 + U.rf(-3, 3), y: (mySp.y + enSp.y) / 2 + U.rf(-3, 3), r: 2 } : enSp;
        }
      },
      dmgMod(src, t) {
        let k = 1; if (W.map.id === 'valley' && this.points) for (const p of this.points) if (p.owner === src.team && U.d2(src.x, src.y, p.x, p.y) < 16) k *= 1.1;
        return k;
      },
      update(dt) {
        if (this.over) return; this.t += dt; const m = W.map; const p = W.player;
        // AFK tracking
        this.idleT = (S.IN.keys.size || S.IN.clickMove || S.auto.on || p.anim.at > 0 || p.anim.ct > 0) ? 0 : this.idleT + dt;
        // respawns
        for (let i = this.respawn.length - 1; i >= 0; i--) { const r = this.respawn[i]; r.t -= dt; if (r.t <= 0) { this.respawn.splice(i, 1); this.revive(r.u); } }
        // map mechanics
        if (m.id === 'colosseum') { this.mech.spike -= dt; if (this.mech.spike <= 0) { this.mech.spike = 30; for (let k = 0; k < 7; k++) { const q = S.freePt(m, U.rf(0.2, 0.8) * m.w, U.rf(0.2, 0.8) * m.h); V.telegraph(q.x, q.y, 1.3, 1, '#ff8a3a'); W.dangers.push({ x: q.x, y: q.y, r: 1.3, t: 1, team: -1 }); E.later(1, () => { for (const u of W.units) if (!u.dead && u.kind === 'hero' && U.d2(u.x, u.y, q.x, q.y) < 1.7) { u.hp -= u.maxhp * 0.15; u.flash = 0.1; if (u.hp <= 0) E.kill(u, null); } V.burst(q.x, q.y, 4, ['#ffffff', '#c8c0b0', '#8a8070'], 14, 2, 0.4, 2, { up: 80 }); }); } } }
        if (m.sky) { this.mech.sky -= dt; if (this.mech.sky <= 5 && !this.mech.warn) { this.mech.warn = true; G.UI.announce('แพลตฟอร์มกำลังสลับ!', 'อีก 5 วินาที — อยู่บนเกาะให้ปลอดภัย'); } if (this.mech.sky <= 0) { this.mech.sky = 60; this.mech.warn = false; this.mech.skyAlt ^= 1; S.skyLayout(m, this.mech.skyAlt); E.renderMapCanvas(m); for (const u of W.units) if (!u.dead && E.isFall(u.x, u.y)) { E.kill(u, null); V.text(u.x, u.y, 'FALL!', '#ff7a7a', { size: 9 }); } } }
        if (m.rift) { this.safeR = Math.max(6, 19 - this.t / 360 * 13) * (m.k || 1); for (const u of W.units) if (!u.dead && u.kind === 'hero' && Math.hypot(u.x - m.w / 2, u.y - m.h / 2) > this.safeR) { u.hp -= u.maxhp * 0.04 * dt; if (u.hp <= 0) E.kill(u, null); } }
        if (m.fog) for (const u of W.units) u.hidden = m.tiles[E.idx(m, u.x, u.y)] === 7;
        if (this.bossAt && !this.bossDone && this.t >= this.bossAt) { this.bossDone = true; const bp = m.bossPt; const L = S.save.lvl; const b = S.mkMob({ n: m.id === 'graveyard' ? 'Bone Dragon' : 'Warlord Behemoth', body: m.id === 'graveyard' ? 'dragon' : 'golem', c: m.id === 'graveyard' ? '#e0d8c8' : '#8a4a2a', c2: '#5a5048' }, L, 'boss', bp.x, bp.y, { elem: 'shadow', leash: 8, hpMul: 0.5 * (1 + size / 5) }); b.team = 3; b.st.atk *= p.cpv / 4000 + 0.6; E.spawn(b); this.boss = b; G.UI.announce('BOSS', `${b.name} ปรากฏตัวกลางแผนที่! ใครปิดได้รับบัฟ`); }
        // mode logic
        const T = (x, y, r) => { const c = [0, 0]; for (const u of W.units) if (!u.dead && u.kind === 'hero' && U.d2(u.x, u.y, x, y) < r * r) c[u.team]++; return c; };
        if (this.points) { for (const pt of this.points) { const c = T(pt.x, pt.y, 2.3); const diffc = U.clamp(c[0] - c[1], -3, 3); if (diffc) { pt.prog = U.clamp(pt.prog + diffc * 20 * dt, -100, 100); if (pt.prog >= 100 && pt.owner !== 0) { pt.owner = 0; G.UI.feed('ทีมเรายึดจุดได้!', 'good'); for (const u of W.units) if (u.team === 0 && U.d2(u.x, u.y, pt.x, pt.y) < 6) u.ms.obj++; } if (pt.prog <= -100 && pt.owner !== 1) { pt.owner = 1; G.UI.feed('ศัตรูยึดจุดได้!', 'bad'); } } if (pt.owner >= 0) this.score[pt.owner] += 4 * dt; } }
        if (this.flags) for (const f of this.flags) {
          const enemyT = 1 - f.team;
          if (f.carrier) { if (f.carrier.dead) { f.carrier = null; f.dropT = 15; } else { f.x = f.carrier.x; f.y = f.carrier.y; const own = this.flags[enemyT]; if (U.d2(f.x, f.y, own.home.x, own.home.y) < 1.2 && own.atHome) { this.score[enemyT]++; f.carrier.ms.obj += 3; G.UI.feed(`${f.carrier.name} ยึดธงสำเร็จ!`, enemyT === 0 ? 'good' : 'bad', true); f.carrier = null; f.atHome = true; f.x = f.home.x; f.y = f.home.y; } } }
          else { if (!f.atHome) { f.dropT -= dt; if (f.dropT <= 0) { f.atHome = true; f.x = f.home.x; f.y = f.home.y; } }
            for (const u of W.units) { if (u.dead || u.kind !== 'hero' || U.d2(u.x, u.y, f.x, f.y) > 0.7) continue; if (u.team === enemyT) { f.carrier = u; f.atHome = false; G.UI.feed(`${u.name} ขโมยธง!`, u.team === 0 ? 'good' : 'bad'); break; } else if (!f.atHome) { f.atHome = true; f.x = f.home.x; f.y = f.home.y; u.ms.obj++; G.UI.feed(`${u.name} นำธงกลับฐาน`, u.team === 0 ? 'good' : 'bad'); break; } } }
        }
        if (this.hill) { const c = T(this.hill.x, this.hill.y, this.hill.r); if (c[0] && !c[1]) this.score[0] += dt; if (c[1] && !c[0]) this.score[1] += dt; }
        if (this.payload) {
          const att = this.half === 0 ? 0 : 1; const c = T(this.payload.x, this.payload.y, 2.5); this.halfT += dt; const path = m.path;
          if (c[att] && !c[1 - att] && this.payload.i < path.length - 1) { const nx = path[this.payload.i + 1]; const d = Math.hypot(nx.x - this.payload.x, nx.y - this.payload.y); const st = 0.7 * dt; if (d <= st) { this.payload.i++; this.payload.x = nx.x; this.payload.y = nx.y; } else { this.payload.x += (nx.x - this.payload.x) / d * st; this.payload.y += (nx.y - this.payload.y) / d * st; } }
          this.esc[att].prog = this.payload.i / (path.length - 1); this.score[att] = Math.round(this.esc[att].prog * 100);
          if (this.payload.i >= path.length - 1 || this.halfT >= 240) { this.esc[att].time = this.halfT; if (this.half === 0) { this.half = 1; this.halfT = 0; this.payload = { i: 0, x: path[0].x, y: path[0].y }; G.UI.announce('สลับฝั่ง', 'ศัตรูเป็นฝ่ายคุ้มกันเรือ'); for (const u of W.units) if (u.kind === 'hero') { this.revive(u, true); } } else this.finish(this.esc[0].prog > this.esc[1].prog || (this.esc[0].prog === this.esc[1].prog && this.esc[0].time < this.esc[1].time) ? 0 : 1); }
        }
        // win checks
        if (md.id === 'elim') { for (const tm of [0, 1]) if (this.team[tm].every(u => u.dead)) { this.roundEnd(1 - tm); break; } }
        else if (md.id !== 'escort') { if (this.score[0] >= this.target) this.finish(0); else if (this.score[1] >= this.target) this.finish(1); }
        if (this.t >= this.limit && !this.over) this.finish(this.score[0] >= this.score[1] ? 0 : 1);
      },
      roundEnd(w) {
        if (this.rEnding) return; this.rEnding = true; this.roundWins[w]++; this.score = this.roundWins.slice(); G.UI.announce(`รอบที่ ${this.round}`, w === 0 ? 'ทีมเราชนะรอบนี้' : 'ศัตรูชนะรอบนี้');
        if (this.roundWins[w] >= 3) { this.finish(w); return; }
        E.later(3, () => { this.round++; this.rEnding = false; for (const tm of [0, 1]) for (const u of this.team[tm]) this.revive(u, true); });
      },
      revive(u, reposition = true) { const m = W.map; const sp = u.team ? m.spawnB : m.spawnA; const pt = S.freePt(m, sp.x + U.rf(-1.5, 1.5), sp.y + U.rf(-1.5, 1.5)); u.dead = false; u.hp = u.maxhp; u.res = u.resMax; u.cds.fill(0); u.x = pt.x; u.y = pt.y; u.cc = { st: 0, rt: 0, sl: 0, sil: 0, fz: 0 }; u.anim.t = 0; u.ai.path = null; u.invuln = false; u.dashing = false; u.dashTo = null; u.deadT = 0; if (!W.units.includes(u)) E.spawn(u); V.pillar(u.x, u.y, u.team ? '#ff5a5a' : '#4ad6c8', 60, 0.6, 8); },
      onKill(t, k) {
        if (t.kind === 'mob' && t === this.boss) { const tm = k ? k.team : -1; if (tm === 0 || tm === 1) { for (const u of this.team[tm]) { u.teamBuff = { atk: 20, def: 20 }; E.recalc(u); } if (md.id === 'war') this.score[tm] += 200; if (k) k.ms.obj += 5; G.UI.announce('BOSS DOWN', tm === 0 ? 'ทีมเราได้บัฟ ATK/DEF +20% จนจบเกม' : 'ศัตรูได้บัฟ ATK/DEF +20%'); } return; }
        if (t.sub === 'tower') { const tm = 1 - t.team; this.score[tm] += 300; G.UI.feed(tm === 0 ? 'ทำลายป้อมศัตรูแล้ว! +300' : 'ป้อมเราถูกทำลาย!', tm === 0 ? 'good' : 'bad', true); return; }
        if (t.kind !== 'hero') return;
        if (k && k.kind === 'hero' && k.team !== t.team) { if (md.id === 'tdm' || md.id === 'boss') this.score[k.team]++; if (md.id === 'war' || md.id === 'dom') this.score[k.team] += 5; }
        if (md.id !== 'elim') this.respawn.push({ u: t, t: 5 + (md.id === 'war' ? 3 : 0) });
      },
      finish(w) {
        if (this.over) return; this.over = true; const s = S.save; const p = W.player; W.slowmo = 0.3; W.slowT = 1.2;
        const team0 = this.team[0]; const avg = team0.reduce((a, u) => a + u.ms.dmg + u.ms.heal + u.ms.obj * 2000, 0) / team0.length; const mine = p.ms.dmg + p.ms.heal + p.ms.obj * 2000;
        const afk = this.idleT > 60; const active = mine >= avg * 0.1 && !afk;
        const botShare = 1; // all opponents are AI in this build
        const pct = botShare >= 0.5 ? (this.team[0].length > 1 || true ? diff.pct : 1) : 1;
        const honor = active ? Math.round((w === 0 ? 60 : 25) * Math.sqrt(size / 5 + 0.2) * pct * diff.reward * (1 + S.save.lvl / 100)) : 0;
        s.honor += honor; if (w === 0) { s.pvp.wins++; S.quest('pvpwin'); if (s.pvp.wins >= 10) S.ach('pvp10'); } else s.pvp.losses++;
        let chest = null; if (active && diff.chest) { const t = S.rollTier(D.farmDist(diff.chest, false)); chest = S.rollDrop('farm', t, s.lvl / 2); S.addItem(chest, true); }
        for (const c of this.usedMercs) S.merc(c).m++;
        const all = [...this.team[0], ...this.team[1]]; const score = u => u.ms.dmg / 1000 + u.ms.heal / 800 + u.ms.k * 3 + u.ms.obj * 5 - u.ms.d;
        const mvp = { dmg: all.reduce((a, u) => u.ms.dmg > a.ms.dmg ? u : a), heal: all.reduce((a, u) => u.ms.heal > a.ms.heal ? u : a), obj: all.reduce((a, u) => u.ms.obj > a.ms.obj ? u : a) };
        const bossLoot = S.bossClashLoot ? S.bossClashLoot(this, w) : null; S.persist(); E.later(1.4, () => G.UI.pvpResult(this, w, { honor, chest, active, afk, mvp, score, bossLoot }));
      },
      renderGround(ctx, cam) {
        const m = W.map; const ring = (x, y, r, c, a = 0.35) => { const [sx, sy] = cam.w2s(x, y); ctx.globalAlpha = a; ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(sx, sy, r * G.TS, r * G.TS, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 0.9; ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1; };
        const tc = t => t === 0 ? '#4ad6c8' : t === 1 ? '#ff5a5a' : '#c8c0b0';
        if (this.points) for (const pt of this.points) { ring(pt.x, pt.y, 2.3, tc(pt.owner), 0.2); const [sx, sy] = cam.w2s(pt.x, pt.y); ctx.fillStyle = '#120e18'; ctx.fillRect(sx - 12, sy - 34, 24, 4); ctx.fillStyle = pt.prog >= 0 ? '#4ad6c8' : '#ff5a5a'; ctx.fillRect(sx, sy - 33, Math.round(pt.prog / 100 * 11), 2); }
        if (this.hill) ring(this.hill.x, this.hill.y, this.hill.r, '#ffd84a', 0.18);
        if (this.payload) ring(this.payload.x, this.payload.y, 2.5, this.half === 0 ? '#4ad6c8' : '#ff5a5a', 0.15);
        if (m.rift && this.safeR) { const [sx, sy] = cam.w2s(m.w / 2, m.h / 2); ctx.strokeStyle = '#ff6a2a'; ctx.lineWidth = 2; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.ellipse(sx, sy, this.safeR * G.TS, this.safeR * G.TS, 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
        for (const sp of [m.spawnA, m.spawnB]) ring(sp.x, sp.y, 1.8, sp === m.spawnA ? '#4ad6c8' : '#ff5a5a', 0.12);
      },
      renderTop(ctx, cam) {
        if (this.flags) for (const f of this.flags) { const [sx, sy] = cam.w2s(f.x, f.y); const c = f.team ? '#ff5a5a' : '#4ad6c8'; ctx.fillStyle = '#5a4a3a'; ctx.fillRect(Math.round(sx) - 1, Math.round(sy) - 30, 2, 30); ctx.fillStyle = c; ctx.fillRect(Math.round(sx) + 1, Math.round(sy) - 30 + Math.round(Math.sin(W.time * 6)), 9, 6); if (Math.random() < 0.2) V.p(f.x, f.y, 26, 0, 0, 10, 0.5, 2, c); }
        if (this.payload) { const [sx, sy] = cam.w2s(this.payload.x, this.payload.y); ctx.fillStyle = '#7a5028'; ctx.fillRect(Math.round(sx) - 14, Math.round(sy) - 10, 28, 8); ctx.fillStyle = '#a0703a'; ctx.fillRect(Math.round(sx) - 12, Math.round(sy) - 12, 24, 3); ctx.fillStyle = '#e8e4d8'; ctx.fillRect(Math.round(sx) - 1, Math.round(sy) - 34, 2, 22); ctx.fillRect(Math.round(sx) + 1, Math.round(sy) - 32, 10, 10); }
        const m = W.map; if (m.fog) { const [px, py] = cam.w2s(W.player.x, W.player.y); const g = ctx.createRadialGradient(px, py - 10, 20, px, py - 10, m.fog * G.TS * (m.k || 1)); g.addColorStop(0, 'rgba(8,14,10,0)'); g.addColorStop(1, 'rgba(8,14,10,0.88)'); ctx.fillStyle = g; ctx.fillRect(0, 0, E.VW, E.VH); }
      },
      hud() {
        const mm = Math.floor((this.limit - this.t) / 60), ss = Math.floor((this.limit - this.t) % 60);
        const sc = md.id === 'koth' ? this.score.map(x => Math.floor(x) + 'วิ') : md.id === 'escort' ? this.score.map(x => x + '%') : this.score.map(x => Math.floor(x));
        return `<b>${md.th}</b> · ${mapDef.th} · ${size}v${size}<div class="score"><span class="t0">${sc[0]}</span> : <span class="t1">${sc[1]}</span></div><small>เป้า ${md.id === 'koth' ? this.target + ' วิ' : md.id === 'escort' ? 'คุ้มกันเรือ (ครึ่ง ' + (this.half + 1) + ')' : this.target} · เหลือ ${mm}:${String(ss).padStart(2, '0')}${md.id === 'elim' ? ' · รอบ ' + this.round : ''}</small>`;
      }
    };
    return M;
  };

  // ======================================================================
  // GUILD SIEGE (5 castles per side, tug-of-war)
  // ======================================================================
  S.SiegeMode = (cfg) => {
    const rival = cfg.rival; const size = cfg.size; const g = S.save.guild;
    const M = {
      kind: 'siege', pvp: true, siege: true, cfg, allowMount: true, noPet: true, line: 0, round: 0, phase: 'prep', prepT: 20, roundT: 360, elapsed: 0,
      pool: [100, 100], buys: [[], []], history: [], minLine: 0, lostAny: false, captures: [], chests: [], over: false, kills: [0, 0],
      build() { return genCastle(0, '#3a8ad0'); },
      playerSpawn() { return W.map.spawnAtt; },
      init() {
        const p = W.player; const cp = p.cpv; p.ms = { k: 0, d: 0, a: 0, dmg: 0, heal: 0, obj: 0, streak: 0 };
        const myR = g.rating, rr = rival.rating; this.rivalMult = U.clamp(1 + (rr - myR) / 900, 0.8, 1.45);
        this.team = [[p], []];
        const mem = g.members.slice().sort((a, b) => b.lvl - a.lvl).slice(0, size - 1);
        for (const mb of mem) { const u = S.makeBot(mb.cls, 0, 0, U.clamp(mb.skill || 2, 1, 4), { stats: S.worldBotStats(mb.cls, mb.lvl, 1).st, name: mb.name, bot: false, tag: g.tag, lvl: mb.lvl }); u.guildMate = true; this.team[0].push(u); }
        const ecls = S.randomClasses(size, 3);
        const rv = S.normRival ? S.normRival(rival) : rival; const rEff = U.clamp(0.6 + (rr - 900) / 1500, 0.4, 1.6);
        for (const cls of ecls) { const rl = U.clamp(Math.round(S.save.lvl + (rr - g.rating) / 60) + U.ri(-6, 6), 1, D.MAX_LV); const u = S.makeBot(cls, 1, 0, U.clamp(Math.round(1 + (rr - 900) / 300), 1, 4), { stats: S.worldBotStats(cls, rl, rEff).st, lvl: rl, bot: false, tag: rival.tag, name: U.pick(D.NAMES) + U.ri(1, 99) }); this.team[1].push(u); }
        for (const tm of [0, 1]) for (const u of this.team[tm]) { u.ms = { k: 0, d: 0, a: 0, dmg: 0, heal: 0, obj: 0, streak: 0 }; u.brain = (b, dt) => E.heroAI(b, dt, this.ctl(b)); }
        this.setupRound();
        G.UI.announce('GUILD SIEGE', `${g.name} ⚔ ${rival.name} · ${size}v${size} · ${cfg.type === 'ranked' ? 'Ranked' : cfg.type === 'wager' ? 'Wager' : 'Friendly'}`);
      },
      roles() { // returns {att, def, ci}
        const L = this.line; if (L === 0) return { att: -1, def: -1, ci: 0 }; if (L > 0) return { att: 0, def: 1, ci: L + 1 }; return { att: 1, def: 0, ci: -L + 1 };
      },
      setupRound() {
        this.round++; const R = this.roles(); this.R = R;
        const keep = [...this.team[0], ...this.team[1]]; S.resetUnitsForMap([]); W.timers.length = 0; V.clear();
        W.map = genCastle(R.ci, R.def === 1 ? '#c03a3a' : g.castleSkin || '#3a8ad0'); E.renderMapCanvas(W.map); const m = W.map;
        this.tickets = [size * 2, size * 2]; this.respawn = []; this.throne = 0; this.hold = [0, 0]; this.gate = null; this.inner = null; this.structs = [];
        for (const tm of [0, 1]) this.team[tm].forEach((u, i) => {
          const sp = R.ci === 0 ? (tm === 0 ? m.spawnAtt : m.spawnDef) : (tm === R.att ? m.spawnAtt : m.spawnDef);
          const pt = S.freePt(m, sp.x + Math.cos(i * 2.399 + Math.random() * 1.2) * (0.8 + Math.sqrt(i) * 1.2 + Math.random()), sp.y + Math.abs(Math.sin(i * 2.399 + Math.random() * 1.2)) * (0.6 + Math.sqrt(i) * 1.1 + Math.random()) * (sp.y > 20 ? -1 : 1)); Object.assign(u, { x: pt.x, y: pt.y, dead: false, deadT: 0, kb: null, dashTo: null, dashing: false, invuln: false }); u.home = { x: sp.x, y: sp.y };
          u.hp = u.maxhp; u.res = u.resMax; u.cds.fill(0); u.cc = { st: 0, rt: 0, sl: 0, sil: 0, fz: 0 }; u.buffs = []; u.teamBuff = this.perkBuff(tm); u.regenBonus = this.perks(tm).regen || 0; E.recalc(u, true); u.hp = u.maxhp; u.rooted = true; u.ai.path = null; E.spawn(u);
        });
        W.cam.x = W.player.x; W.cam.y = W.player.y;
        const avgHp = this.team[0].reduce((a, u) => a + u.maxhp, 0) / size; const avgAtk = this.team[0].reduce((a, u) => a + u.st.atk, 0) / size;
        if (R.ci > 0) {
          const dTeam = R.def; const gh = avgHp * size * 1.6 * (1 + R.ci * 0.15);
          const gw = new Set(m.gateTiles.map(t => t.x)).size * G.TS; this.gate = this.mkStruct('gate', dTeam, m.gatePt.x, m.gatePt.y, gh, gateSprite(dTeam === 1 ? '#8a5a5a' : '#5a7a9a', gw), m.gateTiles);
          if (R.ci === 5) { this.inner = this.mkStruct('gate', dTeam, m.innerPt.x, m.innerPt.y, gh * 0.7, gateSprite(dTeam === 1 ? '#a06a6a' : '#6a8aaa', gw), m.innerTiles); const gd = S.makeBot('guardian', dTeam, W.player.cpv * 2.2, 3, { name: 'Royal Guardian', bot: false }); const gp = m.guardPt; gd.x = gp.x; gd.y = gp.y; gd.sc = 1.4; gd.home = { x: gp.x, y: gp.y }; gd.brain = (b, dt) => E.heroAI(b, dt, { vision: 7, goal: () => ({ x: gp.x, y: gp.y, r: 1 }) }); gd.ms = { k: 0, d: 0, a: 0, dmg: 0, heal: 0, obj: 0, streak: 0 }; E.spawn(gd); this.guardian = gd; }
          for (const tw of m.towers) this.mkTower(tw.x, tw.y, dTeam, avgAtk);
        }
        this.phase = 'prep'; this.prepT = 20; this.roundT = 360;
        G.UI.siegePrep(this, true);
      },
      perks(tm) { const out = {}; const L = this.line; const held = tm === 0 ? Math.max(0, L) : Math.max(0, -L); for (let i = 0; i < Math.min(4, held); i++) Object.assign(out, D.CASTLES[i].perk); return out; },
      perkBuff(tm) { const p = this.perks(tm); return { spd: p.spd || 0, atk: p.atkP || 0, def: 0 }; },
      mkStruct(sub, team, x, y, hp, spr, tiles) {
        const u = E.spawn(E.mkUnit({ kind: 'struct', sub, team, x, y, hp, maxhp: hp, st: { def: 150, atk: 0, dr: 0 }, name: sub === 'gate' ? 'ประตูปราสาท' : 'ป้อม', propSpr: spr, tiles, sprOff: 10 }));
        this.structs.push(u); return u;
      },
      mkTower(x, y, team, atk) {
        const hp = W.player.maxhp * 6; const u = this.mkStruct('tower', team, x, y, hp, SPR.prop('tower', { c: team === 1 ? '#8a6a6a' : '#6a7a8a', flag: team === 1 ? '#c03a3a' : '#3a8ad0' }));
        u.atkCd = 0; u.st.atk = atk * 0.9; u.update = (s, dt) => { if (this.phase !== 'fight') return; s.atkCd -= dt; if (s.atkCd > 0) return; const t = E.nearestEnemy(s, 7, z => z.kind === 'hero' || z.sub === 'ram'); if (!t) return; s.atkCd = 1.2; const d = Math.hypot(t.x - s.x, t.y - s.y) || 1; W.projs.push({ x: s.x, y: s.y, vx: (t.x - s.x) / d * 10, vy: (t.y - s.y) / d * 10, life: 1, owner: s, s: { elem: 'fire', cc: {} }, pow: 1, pierce: 0, hitSet: new Set(), r: 0, pal: D.ELEM.fire.pal, size: 3, z: 44, elem: 'fire', over: true }); };
        return u;
      },
      buy(tm, item) {
        const R = this.R || this.roles(); const side = tm === R.att ? 'atk' : 'def'; if (R.ci === 0) return 'รอบชายแดนไม่มีอาวุธปิดล้อม';
        const def = D.SIEGE_ITEMS[side].find(x => x.k === item); if (!def) return 'ฝ่ายนี้ซื้อไอเทมนี้ไม่ได้';
        const cost = Math.round(def.cost * (this.perks(tm).siege ? 0.8 : 1)); if (this.pool[tm] < cost) return 'แต้มสงครามไม่พอ';
        this.pool[tm] -= cost; this.buys[tm].push(item); return true;
      },
      applyBuys() {
        const R = this.roles(); const m = W.map;
        for (const tm of [0, 1]) { for (const it of this.buys[tm]) {
          if (it === 'ram') { const sp = m.spawnAtt; const hp = W.player.maxhp * 2; const ram = this.mkStruct('ram', tm, sp.x + 1, sp.y - 2, hp, SPR.prop('crate')); ram.atkCd = 0; ram.update = (s, dt) => { if (this.phase !== 'fight' || s.dead) return; const gt = this.gate && !this.gate.dead ? this.gate : this.inner && !this.inner.dead ? this.inner : null; if (!gt) return; const d = Math.hypot(gt.x - s.x, gt.y + 1 - s.y); if (d > 1.4) { const st = 1.2 * dt; s.x += (gt.x - s.x) / d * st; s.y += (gt.y + 1 - s.y) / d * st; } else { s.atkCd -= dt; if (s.atkCd <= 0) { s.atkCd = 1.5; gt.hp -= gt.maxhp * 0.08; gt.flash = 0.1; V.shake(3, 0.2); V.burst(gt.x, gt.y + 0.6, 8, ['#ffffff', '#c8a070', '#7a5028'], 14, 3, 0.5, 3, { add: false }); if (gt.hp <= 0) E.kill(gt, W.player.team === tm ? W.player : this.team[tm][0]); } } }; }
          if (it === 'catapult') { const sp = m.spawnAtt; const cat = this.mkStruct('catapult', tm, sp.x - 3, sp.y - 1, W.player.maxhp * 1.5, SPR.prop('crate')); cat.atkCd = 2; cat.update = (s, dt) => { if (this.phase !== 'fight' || s.dead) return; s.atkCd -= dt; if (s.atkCd > 0) return; s.atkCd = 3; const tg = [this.gate, this.inner, ...this.structs.filter(x => x.sub === 'tower')].find(x => x && !x.dead && x.team !== tm); if (!tg) return; V.telegraph(tg.x, tg.y, 1.5, 1, '#ffb347'); E.later(0.7, () => V.fall(tg.x, tg.y, D.ELEM.fire.pal, 0.3, 7)); E.later(1, () => { if (tg.dead) return; tg.hp -= tg.maxhp * 0.05; tg.flash = 0.1; V.ring(tg.x, tg.y, 1.5, D.ELEM.fire.pal, 0.4, { fill: true }); V.burst(tg.x, tg.y, 8, D.ELEM.fire.pal, 16, 3, 0.5, 3); V.shake(2, 0.2); if (tg.hp <= 0) E.kill(tg, this.team[tm][0]); }); }; }
          if (it === 'totem') { const sp = tm === R.att ? m.spawnAtt : m.spawnDef; this.totems = (this.totems || []).concat([{ x: sp.x, y: sp.y + (sp.y > 20 ? -4 : 4), team: tm }]); E.addProp(m, 'banner', sp.x, sp.y + (sp.y > 20 ? -4 : 4), { c: tm ? '#c03a3a' : '#3a8ad0', c2: '#ffd84a' }); }
          if (it === 'repair' && this.gate) { this.gate.maxhp *= 1.3; this.gate.hp = this.gate.maxhp; }
          if (it === 'ballista') this.mkTower(m.ballistaPt.x, m.ballistaPt.y, R.def, this.team[R.def][0].st.atk);
        } this.buys[tm] = []; }
      },
      enemyBuys() { const R = this.roles(); if (R.ci === 0) return; const tm = 1; const side = tm === R.att ? 'atk' : 'def'; for (const it of D.SIEGE_ITEMS[side]) if (Math.random() < 0.6) this.buy(tm, it.k); },
      dmgMod(src, t) {
        let k = 1; if (this.totems) for (const tt of this.totems) { if (tt.team === src.team && U.d2(src.x, src.y, tt.x, tt.y) < 16) k *= 1.1; if (tt.team === t.team && U.d2(t.x, t.y, tt.x, tt.y) < 16) k *= 0.9; }
        if (src.sets && src.sets.siegebuff) k *= 1.1; if (src.st && src.st.pvpDmg) { /* already */ } return k;
      },
      ctl(u) {
        const me = this; const R = this.R || this.roles();
        return { vision: 8, siegeTarget: true, prefer: t => t.sub === 'gate' && R.att === u.team || t.sub === 'ram', goal: (b) => {
          const m = W.map; if (b.ai.cmd && b.team === 0 && b !== W.player && b.ai.cmd !== 'free') { const P = W.player; if (b.ai.cmd === 'follow' || b.ai.cmd === 'rally') return { x: P.x + U.rf(-1, 1), y: P.y + U.rf(-1, 1), r: 1.5 }; if (b.ai.cmdPt) return b.ai.cmdPt; }
          if (R.ci === 0) return { x: m.flag.x + U.rf(-1.5, 1.5), y: m.flag.y + U.rf(-1.5, 1.5), r: 1 };
          const gateUp = me.gate && !me.gate.dead, innerUp = me.inner && !me.inner.dead;
          const k = m.k || 1; if (b.team === R.att) { if (gateUp) return { x: m.cx + U.rf(-2, 2), y: m.attGate.y, r: 0.8 }; if (innerUp) return { x: m.cx + U.rf(-2, 2), y: m.attInner.y, r: 0.8 }; return { x: m.throne.x + U.rf(-1, 1), y: m.throne.y + 1, r: 0.6 }; }
          if (gateUp) return { x: m.cx + U.rf(-4, 4) * k, y: m.defGate.y, r: 1 }; if (innerUp) return { x: m.cx + U.rf(-3, 3) * k, y: m.defInner.y, r: 1 }; return { x: m.throne.x + U.rf(-1.5, 1.5), y: m.throne.y + 1.5, r: 1 };
        } };
      },
      autoCtl(u) { return this.ctl(u); },
      update(dt) {
        if (this.over) return; this.elapsed += dt;
        if (this.phase === 'prep') { this.prepT -= dt; for (const u of W.units) if (u.kind === 'hero') { u.hp = u.maxhp; u.cds.fill(0); } if (this.prepT <= 0) { this.phase = 'fight'; this.enemyBuys(); this.applyBuys(); for (const u of W.units) u.rooted = false; G.UI.siegePrep(this, false); G.UI.announce(`รอบที่ ${this.round}`, this.R.ci === 0 ? 'แย่งธงชายแดน!' : this.R.att === 0 ? `บุก ${D.CASTLES[this.R.ci - 1].th}!` : `ป้องกัน ${D.CASTLES[this.R.ci - 1].th}!`); } return; }
        this.roundT -= dt; const m = W.map; const R = this.R;
        for (let i = this.respawn.length - 1; i >= 0; i--) { const r = this.respawn[i]; r.t -= dt; if (r.t <= 0) { this.respawn.splice(i, 1); const u = r.u; const sp = u.home; const pt = S.freePt(m, sp.x + U.rf(-1.5, 1.5), sp.y + U.rf(-1, 1)); Object.assign(u, { dead: false, deadT: 0, x: pt.x, y: pt.y, hp: u.maxhp, dashing: false, invuln: false, dashTo: null }); u.cc = { st: 0, rt: 0, sl: 0, sil: 0, fz: 0 }; u.res = u.resMax; u.anim.t = 0; u.ai.path = null; V.pillar(u.x, u.y, u.team ? '#ff5a5a' : '#4ad6c8', 60, 0.6, 8); } }
        const count = (x, y, r) => { const c = [0, 0]; for (const u of W.units) if (!u.dead && u.kind === 'hero' && u !== this.guardian && U.d2(u.x, u.y, x, y) < r * r) c[u.team]++; return c; };
        if (R.ci === 0) { const c = count(m.flag.x, m.flag.y, 2.5); for (const tm of [0, 1]) if (c[tm] && !c[1 - tm]) { this.hold[tm] += dt * (this.team[tm].some(u => u.sets && u.sets.capture && U.d2(u.x, u.y, m.flag.x, m.flag.y) < 6.25) ? 1.25 : 1); } if (this.hold[0] >= 60) return this.endRound(0); if (this.hold[1] >= 60) return this.endRound(1); }
        else {
          const gateDown = (!this.gate || this.gate.dead) && (!this.inner || this.inner.dead);
          if (gateDown) { const c = count(m.throne.x, m.throne.y + 0.6, 1.8); if (c[R.att] && !c[R.def]) { this.throne += dt * (this.team[R.att].some(u => u.sets && u.sets.capture) ? 1.25 : 1); } else if (!c[R.att]) this.throne = Math.max(0, this.throne - dt * 0.5); if (this.throne >= 10) return this.endRound(R.att); }
          if (this.roundT <= 0) return this.endRound(R.def);
        }
        if (R.ci === 0 && this.roundT <= 0) return this.endRound(this.hold[0] >= this.hold[1] ? 0 : 1);
        for (const tm of [0, 1]) if (this.tickets[tm] <= 0 && this.team[tm].every(u => u.dead)) return this.endRound(1 - tm);
      },
      onKill(t, k) {
        if (t.kind === 'struct' && t.sub === 'turret') return;
        if (t.kind === 'struct') { if (t.tiles) { for (const tl of t.tiles) W.map.block[E.idx(W.map, tl.x, tl.y)] = 0; for (const u of W.units) u.ai.path = null; } V.shake(6, 0.6); V.flash('#ffd8a0', 0.3); for (let i = 0; i < 4; i++) V.burst(t.x + U.rf(-1.5, 1.5), t.y + U.rf(-0.5, 0.5), 10, ['#d8c8a8', '#a08a6a', '#6a5a4a'], 16, 3, 0.9, 4, { add: false, up: 70 }); G.UI.feed(t.sub === 'gate' ? (t.team === 0 ? 'ประตูของเราถูกพัง!' : 'พังประตูศัตรูสำเร็จ!') : `${t.name} ถูกทำลาย`, t.team === 0 ? 'bad' : 'good', true); if (k) { k.ms.obj += 3; this.pool[k.team] += 50; } return; }
        if (t.kind !== 'hero') return;
        if (k && k.team !== t.team) { this.kills[k.team]++; this.pool[k.team] += 10; }
        if (t === this.guardian) return;
        if (this.tickets[t.team] > 0) { this.tickets[t.team]--; this.respawn.push({ u: t, t: 8 }); }
      },
      endRound(w) {
        if (this.phase !== 'fight') return; this.phase = 'between'; this.pool[w] += 80; const R = this.R;
        const prev = this.line; this.line += w === 0 ? 1 : -1; if (w === 1) this.lostAny = true; this.minLine = Math.min(this.minLine, this.line);
        this.history.push({ round: this.round, ci: R.ci, w, line: this.line });
        let chestMsg = '';
        if (w === 0 && this.line > 0 && this.line > prev && cfg.type !== 'friendly') {
          const k = this.line; const L = D.leagueOf(g.rating).L; const max = Math.min(10, L + (k >= 5 ? 2 : k >= 3 ? 1 : 0)); const n = k >= 5 ? 3 : k >= 3 ? 2 : 1;
          const items = []; for (let q = 0; q < n; q++) { let t = S.rollTier(D.farmDist(max, false)); if (D.leagueOf(g.rating).gm && k >= 5 && Math.random() < 0.05) t = 10; items.push(S.rollDrop(U.pick(['gear', 'jewel', 'rune']), t, S.save.lvl / 2)); }
          items.forEach(it => S.addItem(it, true)); this.chests.push({ k, items }); this.captures.push(k); chestMsg = ` · ได้รับหีบปราสาท ${n} ชิ้น (สูงสุดระดับ ${max})`;
        }
        const name = R.ci === 0 ? 'ชายแดน' : D.CASTLES[R.ci - 1].th;
        G.UI.announce(w === 0 ? 'ชนะรอบ!' : 'แพ้รอบ', `${name} · แนวหน้า ${this.line > 0 ? '+' : ''}${this.line}${chestMsg}`);
        if (Math.abs(this.line) >= 5) return E.later(2.5, () => this.endWar(this.line > 0 ? 0 : 1));
        if (this.round >= 11 || this.elapsed >= 3600) return E.later(2.5, () => this.endWar(this.line > 0 ? 0 : this.line < 0 ? 1 : (this.kills[0] >= this.kills[1] ? 0 : 1)));
        E.later(2.5, () => this.setupRound());
      },
      endWar(w) {
        if (this.over) return; this.over = true; const s = S.save; const ranked = cfg.type !== 'friendly'; const res = { w, ranked };
        if (ranked) {
          const exp = 1 / (1 + Math.pow(10, (rival.rating - g.rating) / 400)); const delta = Math.round(32 * ((w === 0 ? 1 : 0) - exp)); g.rating += delta; rival.rating -= delta; res.delta = delta;
          const L = D.leagueOf(g.rating).L; const war = w === 0 ? 300 : Math.round(300 * (0.3 + 0.1 * this.captures.length)); s.war += war; res.war = war;
          const gold = w === 0 ? 5000 * size / 5 : 1250 * size / 5; s.gold += gold; res.gold = gold; S.guildXp(w === 0 ? 800 : 200);
          res.victory = w === 0 ? [S.rollDrop(U.pick(['gear', 'jewel']), Math.min(10, L + 1), s.lvl / 2)] : [];
          if (w === 0 && !this.lostAny && this.history.length === 5) { res.flawless = S.rollDrop('jewel', Math.min(10, L + 2), s.lvl / 2); res.victory.push(res.flawless); S.ach('flawless'); }
          if (w === 0 && this.minLine <= -3) { res.comeback = true; res.victory.push(S.rollDrop('gear', Math.min(10, L + 1), s.lvl / 2)); }
          res.victory.forEach(it => S.addItem(it, true)); if (w === 0 && S.guildWinBonus) S.guildWinBonus(res);
          if (cfg.type === 'wager') { if (w === 0) { const win = Math.round(cfg.stake * 2 * 0.9); s.gold += win; res.wager = win; } else res.wager = -cfg.stake; }
          if (w === 0) { g.wins++; S.ach('siege1'); } else g.losses++;
        }
        const all = this.team[0]; const mv = (k) => all.reduce((a, u) => u.ms[k] > a.ms[k] ? u : a);
        res.mvp = { dmg: mv('dmg'), heal: mv('heal'), obj: mv('obj') }; if (ranked && Object.values(res.mvp).includes(W.player)) { const it = S.rollDrop('gear', Math.min(10, D.leagueOf(g.rating).L + 1), s.lvl / 2); S.addItem(it, true); res.mvpItem = it; }
        S.quest('siege'); g.history.unshift({ vs: rival.name, w, line: this.line, date: Date.now(), type: cfg.type }); g.history = g.history.slice(0, 20);
        S.persist(); G.UI.siegeResult(this, res);
      },
      renderGround(ctx, cam) {
        const m = W.map; const R = this.R || this.roles(); const ring = (x, y, r, c, a) => { const [sx, sy] = cam.w2s(x, y); ctx.globalAlpha = a; ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(sx, sy, r * G.TS, r * G.TS, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 0.9; ctx.strokeStyle = c; ctx.stroke(); ctx.globalAlpha = 1; };
        if (R.ci === 0) { ring(m.flag.x, m.flag.y, 2.5, this.hold[0] > this.hold[1] ? '#4ad6c8' : '#ff5a5a', 0.15); }
        else { ring(m.throne.x, m.throne.y + 0.6, 1.8, '#ffd84a', 0.15 + this.throne / 30); }
        if (this.totems) for (const t of this.totems) ring(t.x, t.y, 4, t.team ? '#ff5a5a' : '#4ad6c8', 0.07);
      },
      renderTop(ctx, cam) {
        const m = W.map; const R = this.R || this.roles();
        if (R.ci === 0) { const [sx, sy] = cam.w2s(m.flag.x, m.flag.y); ctx.fillStyle = '#5a4a3a'; ctx.fillRect(Math.round(sx) - 1, Math.round(sy) - 36, 2, 36); ctx.fillStyle = '#ffd84a'; ctx.fillRect(Math.round(sx) + 1, Math.round(sy) - 36 + Math.round(Math.sin(W.time * 5)), 11, 7); }
        else if (this.throne > 0) { const [sx, sy] = cam.w2s(m.throne.x, m.throne.y); ctx.fillStyle = '#120e18'; ctx.fillRect(sx - 16, sy - 40, 32, 5); ctx.fillStyle = '#ffd84a'; ctx.fillRect(sx - 15, sy - 39, Math.round(30 * this.throne / 10), 3); }
      },
      hud() {
        const R = this.R || this.roles(); const name = R.ci === 0 ? 'ชายแดน' : D.CASTLES[R.ci - 1].th; const t = this.phase === 'prep' ? `เตรียมตัว ${Math.ceil(this.prepT)} วิ` : `${Math.floor(this.roundT / 60)}:${String(Math.floor(this.roundT % 60)).padStart(2, '0')}`;
        const obj = R.ci === 0 ? `ยึดธง ${Math.floor(this.hold[0])}/60 : ${Math.floor(this.hold[1])}/60` : `${(this.gate && !this.gate.dead) || (this.inner && !this.inner.dead) ? 'ประตู HP ' + Math.round(100 * ((this.inner && !this.inner.dead ? this.inner : this.gate).hp / (this.inner && !this.inner.dead ? this.inner : this.gate).maxhp)) + '%' : 'บัลลังก์ ' + this.throne.toFixed(1) + '/10 วิ'}`;
        return `<b>ยึดปราสาท · รอบ ${this.round}/11</b> · ${name} · ${R.ci === 0 ? '' : R.att === 0 ? 'เราบุก' : 'เราตั้งรับ'}${G.UI.siegeLine(this)}<small>${t} · ${obj} · ตั๋ว ${this.tickets[0]} : ${this.tickets[1]} · แต้มสงคราม ${this.pool[0]}</small>`;
      }
    };
    return M;
  };

  // ======================================================================
  // GALLERY (training ground: every skill + VFX)
  // ======================================================================
  S.GalleryMode = () => {
    const M = {
      kind: 'gallery', name: 'สนามซ้อม VFX', allowMount: false, noPet: false, show: null,
      build() {
        const w = 26, h = 26; const m = E.newMap({ id: 'gallery', kind: 'gallery', w, h, g: ['#5a5a66', '#62626e'], acc: '#3a6a3a', bg: '#0b0a12' });
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const d = Math.hypot(x - 13, y - 13); E.setTile(m, x, y, d < 11 ? ((x + y) % 2 ? 8 : 2) : 0); if (d >= 11.5 && d < 12.5) E.addWall(m, x, y, '#5a5a6a', 16); else if (d >= 12.5) m.block[E.idx(m, x, y)] = 2; }
        for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; E.addProp(m, k % 2 ? 'lamp' : 'banner', 13 + Math.cos(a) * 10, 13 + Math.sin(a) * 10, { c: '#4ad6c8', c2: '#ffd84a' }); }
        m.spawn = { x: 19.5, y: 18.5 }; m.showPt = { x: 13, y: 16 }; m.focus = { x: 13, y: 14 }; m.dummyPts = [[9, 10], [13, 9], [17, 10], [11, 13], [15, 13], [13, 11.5]].map(([x, y]) => ({ x, y })); return E.scaleMap(m, G.MAPK);
      },
      init() {
        W.player.allSkills = true; this.dummies = [];
        this.focusPt = W.map.focus;
        for (const { x, y } of W.map.dummyPts) { const u = E.spawn(S.mkMob({ n: 'Training Dummy', body: 'plant', c: '#d8b878', c2: '#a07a4a' }, S.save.lvl, 'normal', x, y, { hpMul: 50 })); u.dummy = true; u.propSpr = SPR.prop('dummy'); u.sprOff = 3; this.dummies.push(u); }
        G.UI.toast('สนามซ้อม: ใช้สกิลได้ครบ 25 ตัวทุกเลเวล · เปิด "โชว์ VFX อัตโนมัติ" ได้ที่แผงซ้ายบน', 'info');
      },
      startShow(cls, variants) {
        if (this.show && this.show.u) { E.remove(this.show.u); }
        const sp = W.map.showPt; const u = S.makeBot(cls, 0, W.player.cpv, 3, { name: D.CLS[cls].name, bot: false, x: sp.x, y: sp.y }); u.brain = () => { }; u.allSkills = true; u.lvl = 200; E.spawn(u); u.res = 1e9; u.resMax = 1e9;
        this.show = { u, cls, i: 0, v: 0, t: 0.5, variants: !!variants };
        W.cam.x = W.map.focus.x; W.cam.y = W.map.focus.y;
      },
      stopShow() { if (this.show && this.show.u) E.remove(this.show.u); this.show = null; },
      update(dt) {
        for (const d of this.dummies) { if (d.dead) { d.dead = false; d.hp = d.maxhp; } if (d.hp < d.maxhp * 0.5) d.hp = d.maxhp; }
        const sh = this.show; if (sh) {
          sh.t -= dt; const u = sh.u; u.res = 1e9; u.x = U.lerp(u.x, W.map.showPt.x, dt * 4); u.y = U.lerp(u.y, W.map.showPt.y, dt * 4);
          if (sh.t <= 0) {
            u.cds.fill(0); u.gcd = 0; u.runes[sh.i] = sh.v; const s = E.skillOf(u, sh.i); const t = this.dummies[(sh.i + sh.v) % this.dummies.length];
            u.cc = { st: 0, rt: 0, sl: 0, sil: 0, fz: 0 };
            E.cast(u, sh.i, { x: t.x, y: t.y, u: t }); G.UI.skillBanner(u, s, sh.i);
            sh.t = s.ult ? 3.2 : ['summon', 'zone', 'turret'].includes(s.arch) ? 2.2 : 1.5;
            if (sh.variants) { sh.v++; if (sh.v > 3) { sh.v = 0; sh.i++; } } else sh.i++;
            if (sh.i >= 15) { sh.i = 0; sh.v = 0; W.units.filter(x => x.kind === 'summon').forEach(x => x.removeMe = true); }
          }
        }
        S.updateLoot(dt);
      },
      onKill(t) { if (t.dummy) { t.dead = false; t.hp = t.maxhp; } },
      hud() { const sh = this.show; return `<b>สนามซ้อม VFX</b> · ${sh ? `โชว์ ${D.CLS[sh.cls].name}: สกิล ${Math.min(15, sh.i + 1)}/15${sh.variants ? ' · รูน ' + (D.VARIANTS[sh.v] ? D.VARIANTS[sh.v].th : 'ปกติ') : ''}` : 'ลองสกิลได้ทุกตัว'}`; },
      leave() { if (W.player) W.player.allSkills = false; }
    };
    return M;
  };
});
