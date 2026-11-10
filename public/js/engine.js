'use strict';
/* Engine: maps, units, combat, skills, AI, pathfinding, rendering */
(function (init) {
  (globalThis.ASHFALL_SIM_FACTORIES ||= {})['engine'] = init;
  if (typeof window !== 'undefined') init(window.G ||= {});
})(function (G) {
  const U = G.U, D = G.D, V = G.VFX, SPR = G.SPR;
  const W = G.W = { units: [], projs: [], zones: [], traps: [], loots: [], timers: [], dangers: [], map: null, time: 0, player: null, mode: null, cam: { x: 0, y: 0 }, hitstop: 0, slowmo: 0, slowT: 0, idc: 1, gm: { god: false, oneHit: false, speed: 1, time: 1, drop: 1, xp: 1, noCd: false, ai: true, debug: false } };
  const E = G.E = {};
  const T_BLOCK = { 3: 1, 4: 1, 5: 1 }; // water lava void
  // tile codes: 0 grass 1 grass2 2 path 3 water 4 lava 5 void 6 ice 7 bush 8 plaza

  // ---------------- map ----------------
  E.newMap = (o) => {
    const w = o.w, h = o.h, n = w * h;
    return Object.assign({ tiles: new Uint8Array(n), block: new Uint8Array(n), fall: new Uint8Array(n), pvp: new Uint8Array(n), props: [], walls: [], points: [], g: ['#5f9e4a', '#6aab52'], acc: '#3e7a32', bg: '#0e0c14' }, o);
  };
  E.idx = (m, x, y) => (y | 0) * m.w + (x | 0);
  E.inside = (m, x, y) => !!m && x >= 0 && y >= 0 && x < m.w && y < m.h;
  E.blocked = (x, y) => { const m = W.map; if (!E.inside(m, x, y)) return true; return m.block[E.idx(m, x, y)] > 0; };
  E.isFall = (x, y) => { const m = W.map; if (!E.inside(m, x, y)) return false; return m.fall[E.idx(m, x, y)] > 0; };
  E.setTile = (m, x, y, t) => { if (!E.inside(m, x, y)) return; const i = E.idx(m, x, y); m.tiles[i] = t; m.block[i] = T_BLOCK[t] ? 1 : 0; m.fall[i] = t === 5 ? 1 : 0; };
  E.addWall = (m, x, y, color, h) => { if (!E.inside(m, x, y)) return; const i = E.idx(m, x, y); m.block[i] = 2; m.walls.push({ x: x + 0.5, y: y + 0.5, img: SPR.wallBlock(color, Math.round((h || 22) * 0.66)), tx: x, ty: y }); };
  E.addProp = (m, kind, x, y, theme, block) => { const p = { x, y, kind, spr: SPR.prop(kind, theme || { acc: m.acc, crystal: m.crystal }) }; m.props.push(p); if (block) { m.block[E.idx(m, x, y)] = 2; } return p; };

  E.renderMapCanvas = (m) => {
    const TS = G.TS; const cw = m.w * TS, ch = m.h * TS + TS;
    const [cv, x] = SPR.mk(cw, ch); m.canvas = cv; m.ox = 0; m.oy = 0;
    x.fillStyle = m.bg; x.fillRect(0, 0, cw, ch);
    const names = ['grass', 'grass', 'path', 'water', 'lava', 'void', 'ice', 'bush', 'plaza'];
    for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) {
      const t = m.tiles[j * m.w + i]; const v = (i * 7 + j * 13 + ((i * j) % 5)) % 6;
      x.drawImage(SPR.tile(names[t], t === 1 ? m.g[1] : m.g[0], m.speck, v).img, i * TS, j * TS);
      if (m.pvp[j * m.w + i]) { x.fillStyle = 'rgba(255,40,60,0.10)'; x.fillRect(i * TS, j * TS, TS, TS); }
    }
    // cliff faces where ground meets void (straight view: face hangs below the tile)
    for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) {
      const t = m.tiles[j * m.w + i]; if (t === 5) continue;
      const below = j + 1 >= m.h ? m.edges : m.tiles[(j + 1) * m.w + i] === 5;
      if (below) { x.fillStyle = U.shade(m.g[0], -0.5); x.fillRect(i * TS, (j + 1) * TS, TS, 12); x.fillStyle = U.shade(m.g[0], -0.7); x.fillRect(i * TS, (j + 1) * TS + 10, TS, 2); x.fillStyle = U.shade(m.g[0], -0.35); x.fillRect(i * TS, (j + 1) * TS, TS, 2); }
    }
  };
  // enlarge a generated map by factor k (nearest-neighbour tiles, scaled coordinates)
  E.scaleMap = (m, k) => {
    if (!k || k === 1) { m.k = 1; m.bw = m.w; m.bh = m.h; return m; }
    const ow = m.w, oh = m.h, nw = Math.round(ow * k), nh = Math.round(oh * k), n = nw * nh;
    const wallAt = new Map(); for (const wl of m.walls) wallAt.set(wl.ty * ow + wl.tx, wl);
    const T = new Uint8Array(n), B = new Uint8Array(n), F = new Uint8Array(n), PV = new Uint8Array(n); const walls = [];
    const src = (i, j) => Math.min(oh - 1, Math.floor(j / k)) * ow + Math.min(ow - 1, Math.floor(i / k));
    const remapTiles = (list) => { if (!list) return list; const set = new Set(list.map(t => t.y * ow + t.x)); const out = []; for (let j = 0; j < nh; j++) for (let i = 0; i < nw; i++) if (set.has(src(i, j))) out.push({ x: i, y: j }); return out; };
    for (let j = 0; j < nh; j++) for (let i = 0; i < nw; i++) {
      const s = src(i, j), d = j * nw + i; T[d] = m.tiles[s]; B[d] = m.block[s]; F[d] = m.fall[s]; PV[d] = m.pvp[s];
      const wl = wallAt.get(s); if (wl) walls.push({ x: i + 0.5, y: j + 0.5, img: wl.img, tx: i, ty: j });
    }
    m.gateTiles = remapTiles(m.gateTiles); m.innerTiles = remapTiles(m.innerTiles);
    const seen = new Set(); const sc = (o) => { if (!o || typeof o !== 'object' || seen.has(o)) return; seen.add(o); if (typeof o.x === 'number' && typeof o.y === 'number') { o.x *= k; o.y *= k; } };
    for (const key in m) { const v = m[key]; if (['tiles', 'block', 'fall', 'pvp', 'walls', 'gateTiles', 'innerTiles', 'canvas', 'g'].includes(key)) continue; if (Array.isArray(v)) v.forEach(sc); else sc(v); }
    for (const p of m.props) { if (!seen.has(p)) { seen.add(p); p.x *= k; p.y *= k; } }
    for (const key of ['c', 'npcR', 'cx']) if (typeof m[key] === 'number') m[key] *= k;
    Object.assign(m, { w: nw, h: nh, tiles: T, block: B, fall: F, pvp: PV, walls, k, bw: ow, bh: oh });
    return m;
  };

  // simple value noise
  E.noise = (seed, w, h, scale) => {
    const R = U.seeded(seed); const gw = Math.ceil(w / scale) + 2, gh = Math.ceil(h / scale) + 2; const g = [];
    for (let i = 0; i < gw * gh; i++) g.push(R());
    return (x, y) => { const fx = x / scale, fy = y / scale, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      const a = g[iy * gw + ix], b = g[iy * gw + ix + 1], c = g[(iy + 1) * gw + ix], d = g[(iy + 1) * gw + ix + 1];
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty); return U.lerp(U.lerp(a, b, sx), U.lerp(c, d, sx), sy); };
  };

  // ---------------- pathfinding ----------------
  E.clearLine = (x0, y0, x1, y1) => {
    const d = Math.hypot(x1 - x0, y1 - y0); const n = Math.ceil(d / 0.35);
    for (let i = 1; i <= n; i++) { const t = i / n; if (E.blocked(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false; }
    return true;
  };
  E.path = (sx, sy, tx, ty) => {
    const m = W.map; const w = m.w, h = m.h;
    sx |= 0; sy |= 0; tx |= 0; ty |= 0;
    if (!E.inside(m, tx, ty) || m.block[ty * w + tx]) { // find nearest free
      let best = null, bd = 1e9;
      for (let r = 1; r < 6 && !best; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = tx + dx, y = ty + dy; if (E.inside(m, x, y) && !m.block[y * w + x]) { const dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = [x, y]; } } }
      if (!best) return null; [tx, ty] = best;
    }
    const start = sy * w + sx, goal = ty * w + tx; if (start === goal) return [];
    const gS = new Float32Array(w * h).fill(1e9), came = new Int32Array(w * h).fill(-1), closed = new Uint8Array(w * h);
    const heap = []; const push = (i, f) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let s = k; if (l < heap.length && heap[l][0] < heap[s][0]) s = l; if (r < heap.length && heap[r][0] < heap[s][0]) s = r; if (s === k) break; [heap[s], heap[k]] = [heap[k], heap[s]]; k = s; } } return top; };
    gS[start] = 0; push(start, 0); let it = 0;
    const H = (i) => { const x = i % w, y = (i / w) | 0; const dx = Math.abs(x - tx), dy = Math.abs(y - ty); return Math.max(dx, dy) + 0.41 * Math.min(dx, dy); };
    while (heap.length && it++ < 6000) {
      const [, cur] = pop(); if (cur === goal) break; if (closed[cur]) continue; closed[cur] = 1;
      const cx = cur % w, cy = (cur / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const ni = ny * w + nx;
        if (m.block[ni]) continue; if (dx && dy && (m.block[cy * w + nx] || m.block[ny * w + cx])) continue;
        const ng = gS[cur] + (dx && dy ? 1.414 : 1); if (ng < gS[ni]) { gS[ni] = ng; came[ni] = cur; push(ni, ng + H(ni)); }
      }
    }
    if (came[goal] < 0) return null;
    const out = []; let c = goal; while (c !== start && c >= 0) { out.push([c % w + 0.5, ((c / w) | 0) + 0.5]); c = came[c]; }
    out.reverse();
    // smooth: drop waypoints visible from previous
    const sm = []; let ax = sx + 0.5, ay = sy + 0.5;
    for (let i = 0; i < out.length; i++) { const nxt = out[i + 1]; if (nxt && E.clearLine(ax, ay, nxt[0], nxt[1])) continue; sm.push(out[i]); [ax, ay] = out[i]; }
    return sm;
  };

  // ---------------- stats ----------------
  E.baseStats = (cls, lvl) => {
    const r = D.ROLES[D.CLS[cls].role];
    return { hp: (300 + lvl * 45) * r.hp, atk: (20 + lvl * 5) * r.atk, def: (10 + lvl * 4) * r.def, crit: 5, critDmg: 50, aspd: 0, cdr: 0, spd: 0, ls: 0, dr: 0, ccRes: 0, pvpDmg: 0, pvpDef: 0, elem: 0, atkP: 0, defP: 0, hpP: 0, regen: 0, drop: 0, xp: 0, gold: 0 };
  };
  E.addStats = (s, b, mult = 1) => { for (const k in b) if (typeof b[k] === 'number' && k in s) s[k] += b[k] * mult; return s; };
  E.finalize = (s) => {
    s.hp *= 1 + s.hpP / 100; s.atk *= 1 + s.atkP / 100; s.def *= 1 + s.defP / 100;
    for (const k in D.CAPS) if (s[k] > D.CAPS[k]) s[k] = D.CAPS[k]; if (E.softStats) E.softStats(s);
    s.hp = Math.round(s.hp); s.atk = Math.round(s.atk); s.def = Math.round(s.def); return s;
  };
  E.cp = s => Math.round(s.atk * 4 + s.def * 3 + s.hp * 0.3 + s.atk * (s.crit / 100) * (s.critDmg / 100) * 6 + s.atk * (s.aspd + s.cdr) / 100 * 3 + s.atk * s.elem / 100 * 2);
  E.normalizedStats = (cls) => { const s = E.baseStats(cls, 200); s.hp *= 2.2; s.atk *= 2.4; s.def *= 2; s.crit = 25; s.critDmg = 80; s.aspd = 20; s.cdr = 15; return E.finalize(s); };

  // ---------------- units ----------------
  E.mkUnit = (o) => {
    const u = Object.assign({ id: W.idc++, x: 0, y: 0, fx: 1, fy: 1, vx: 0, vy: 0, team: 1, kind: 'hero', name: '', lvl: 1, sc: 1, hp: 100, maxhp: 100, res: 100, resMax: 100, shield: 0, shieldT: 0,
      cds: new Float32Array(D.NSK || 25), gcd: 0, buffs: [], cc: { st: 0, rt: 0, sl: 0, sil: 0, fz: 0 }, dr: {}, kb: null, anim: { s: 'idle', t: 0, at: 0, ct: 0 }, flash: 0, dead: false, deadT: 0,
      combo: 0, comboT: 0, stealth: 0, nextCrit: false, combatT: 99, ai: {}, runes: [], ms: { k: 0, d: 0, a: 0, dmg: 0, heal: 0, obj: 0, streak: 0 }, castCount: 0, alive: true, home: null, sets: {}, fxCd: {} }, o);
    u.home = u.home || { x: u.x, y: u.y };
    return u;
  };
  E.heroUnit = (cls, lvl, team, o = {}) => {
    const st0 = o.stats || E.finalize(E.baseStats(cls, lvl));
    const u = E.mkUnit(Object.assign({ kind: 'hero', cls, lvl, team, st0, look: o.look || SPR.lookFor(cls, o.fashion), build: D.CLS[cls].build }, o));
    E.recalc(u, true); u.hp = u.maxhp; u.res = u.build ? 50 : 100;
    return u;
  };
  E.recalc = (u, full) => {
    if (!u.st0) { if (!u.st0b && u.st) u.st0b = Object.assign({}, u.st); if (!u.st0b) return; u.st0 = u.st0b; }
    const s = Object.assign({}, u.st0);
    for (const b of u.buffs) { if (b.type === 'atk') s.atk *= 1 + b.v / 100; else if (b.type === 'def') s.def *= 1 + b.v / 100; else if (b.type in s) s[b.type] += b.v; }
    if (E.passiveStats) E.passiveStats(u, s);
    if (u.teamBuff) { s.atk *= 1 + (u.teamBuff.atk || 0) / 100; s.def *= 1 + (u.teamBuff.def || 0) / 100; s.spd += u.teamBuff.spd || 0; }
    for (const k in D.CAPS) if (s[k] > D.CAPS[k]) s[k] = D.CAPS[k]; if (E.softStats) E.softStats(s);
    u.st = s; const oldMax = u.maxhp; if (Number.isFinite(s.hp)) u.maxhp = Math.round(s.hp);
    if (!full && oldMax) u.hp = Math.min(u.maxhp, u.hp * (u.maxhp / oldMax));
    u.moveSpd = 3.6 * (1 + (s.spd || 0) / 100);
  };
  E.playerLike = u => u && (u.kind === 'hero');
  E.isEnemy = (a, b) => {
    if (!a || !b || a === b) return false;
    const ta = a.team, tb = b.team; if (ta === tb) return false;
    if (ta === 9 || tb === 9) return false; // npcs
    if (ta === 3 || tb === 3) return true;
    if (ta === 2 || tb === 2) return true;
    if (ta === 4 || tb === 4) { // world pvp wanderers vs player team 0
      const o = ta === 4 ? b : a, w = ta === 4 ? a : b; if (o.team !== 0) return false;
      const m = W.map; const inP = m.pvp[E.idx(m, w.x, w.y)] && m.pvp[E.idx(m, o.x, o.y)];
      const pl = o.owner || o; return !!(inP && (pl.pk || w.red));
    }
    return true;
  };
  E.targetable = (viewer, u) => !u.dead && !u.untarget && (!u.stealth || (viewer && U.d2(viewer.x, viewer.y, u.x, u.y) < 2.2)) && (!u.hidden || !viewer || viewer.team === u.team || U.d2(viewer.x, viewer.y, u.x, u.y) < 6.25);
  E.enemiesNear = (u, x, y, r, max = 99) => {
    const out = []; const r2 = r * r;
    for (const t of W.units) { if (t.dead || !E.isEnemy(u, t) || t.untarget) continue; const rr = r + 0.35 * t.sc; if (U.d2(x, y, t.x, t.y) <= rr * rr && (r2 >= 0)) { if (t.stealth && U.d2(u.x, u.y, t.x, t.y) > 4) continue; out.push(t); if (out.length >= max) break; } }
    return out;
  };
  E.alliesNear = (u, x, y, r) => W.units.filter(t => !t.dead && t.team === u.team && t.kind !== 'struct' && U.d2(x, y, t.x, t.y) <= r * r);
  E.nearestEnemy = (u, r, filter) => {
    let best = null, bd = r * r;
    for (const t of W.units) { if (t.dead || !E.isEnemy(u, t) || !E.targetable(u, t)) continue; if (filter && !filter(t)) continue; const d = U.d2(u.x, u.y, t.x, t.y); if (d < bd) { bd = d; best = t; } }
    return best;
  };
  E.spawn = (u) => { W.units.push(u); return u; };
  E.remove = (u) => { const i = W.units.indexOf(u); if (i >= 0) W.units.splice(i, 1); };

  // visibility (for VFX culling)
  E.vis = (x, y) => { const c = W.cam; return Math.abs(x - c.x) * G.TS < (E.VW || 400) * 0.62 && Math.abs(y - c.y) * G.TS < (E.VH || 300) * 0.66; };

  // ---------------- movement ----------------
  E.move = (u, dx, dy) => {
    const nx = u.x + dx, ny = u.y + dy;
    if (!E.blocked(nx, ny)) { u.x = nx; u.y = ny; return true; }
    if (!E.blocked(nx, u.y)) { u.x = nx; return true; }
    if (!E.blocked(u.x, ny)) { u.y = ny; return true; }
    return false;
  };
  E.canAct = u => !u.dead && u.cc.st <= 0 && u.cc.fz <= 0 && !u.dashing;
  E.canMove = u => E.canAct(u) && u.cc.rt <= 0 && !u.rooted;
  E.face = (u, x, y) => { const dx = x - u.x, dy = y - u.y, l = Math.hypot(dx, dy); if (l > 0.01) { u.fx = dx / l; u.fy = dy / l; } };
  E.walkTo = (u, x, y, dt, stopDist = 0.15) => {
    if (!E.canMove(u)) return false;
    const ai = u.ai; const d = Math.hypot(x - u.x, y - u.y); if (d <= stopDist) { ai.path = null; return true; }
    let tx = x, ty = y;
    if (!E.clearLine(u.x, u.y, x, y)) {
      if (!ai.path || !ai.pathGoal || U.d2(ai.pathGoal[0], ai.pathGoal[1], x, y) > 2.25 || (W.time - (ai.pathT || 0)) > 1.5) {
        ai.path = E.path(u.x, u.y, x, y) || []; ai.pathGoal = [x, y]; ai.pathT = W.time;
      }
      while (ai.path && ai.path.length && U.d2(u.x, u.y, ai.path[0][0], ai.path[0][1]) < 0.09) ai.path.shift();
      if (ai.path && ai.path.length) { [tx, ty] = ai.path[0]; }
    } else ai.path = null;
    const dd = Math.hypot(tx - u.x, ty - u.y) || 1; let sp = u.moveSpd * (u.cc.sl > 0 ? 0.6 : 1) * (u.mounted ? 1 + u.mounted / 100 : 1);
    if (W.map.ice && W.map.tiles[E.idx(W.map, u.x, u.y)] === 6) sp *= 1.2;
    const step = Math.min(dd, sp * dt);
    E.face(u, tx, ty); const ok = E.move(u, (tx - u.x) / dd * step, (ty - u.y) / dd * step); u.moving = true;
    if (!ok) { ai.path = null; ai.pathT = 0; }
    return false;
  };

  // ---------------- combat ----------------
  E.drFactor = (t, cat) => {
    const r = t.dr[cat]; if (!r || W.time - r.t > 15) { t.dr[cat] = { n: 1, t: W.time }; return 1; }
    r.t = W.time; r.n++; return [1, 0.5, 0.25, 0][Math.min(3, r.n - 1)];
  };
  E.applyCC = (src, t, cc) => {
    if (!cc || t.dead || t.kind === 'struct') return; if (t.ccImmT > W.time) return;
    const boss = t.ccImmune; const res = 1 - Math.min(E.playerLike(t) && E.playerLike(src) ? D.PVP_CAPS.ccRes : D.CAPS.ccRes, t.st.ccRes || 0) / 100;
    let hard = false;
    for (const k in cc) {
      const v = cc[k];
      if (k === 'kb' || k === 'pl') {
        if (boss) continue; const dx = t.x - src.x, dy = t.y - src.y, l = Math.hypot(dx, dy) || 1; const dist = k === 'kb' ? v : -Math.min(v, Math.max(0, l - 0.9));
        t.kb = { vx: dx / l * dist / 0.18, vy: dy / l * dist / 0.18, t: 0.18 }; continue;
      }
      if (boss && k !== 'sl') continue;
      if (k === 'st' || k === 'fz') { if (t.sets.ccimmune && W.time - (t.fxCd.ccimm || -99) > 20) { t.fxCd.ccimm = W.time; V.text(t.x, t.y, 'IMMUNE', '#ffffff', { size: 7 }); continue; } hard = true; }
      const cat = k === 'fz' ? 'st' : k; const f = k === 'sl' ? 1 : E.drFactor(t, cat); if (f <= 0) { V.text(t.x, t.y, 'IMMUNE', '#c8c8c8', { size: 7 }); continue; }
      const dur = v * f * res; t.cc[k] = Math.max(t.cc[k] || 0, dur);
      if (k === 'fz' && E.vis(t.x, t.y)) { V.burst(t.x, t.y, 12, D.ELEM.ice.pal, 10, 1.5, 0.5, 2); }
      if (k === 'st' && E.vis(t.x, t.y)) V.text(t.x, t.y, 'STUN', '#ffe04a', { size: 7, z: 34 });
      if (k === 'rt' && E.vis(t.x, t.y)) V.ring(t.x, t.y, 0.6, D.ELEM.nature.pal, 0.5, { w: 2 });
      if (k === 'sil' && E.vis(t.x, t.y)) V.text(t.x, t.y, 'SILENCE', '#b06cff', { size: 7, z: 34 });
    }
    if (hard && t.sets.ccshield) { t.shield = Math.max(t.shield, t.maxhp * 0.1); t.shieldT = 3; }
  };

  E.hit = (src0, t, pow, s, o = {}) => {
    if (!t || t.dead || t.invuln) return 0;
    if (t.invulnT > W.time) { if (E.vis(t.x, t.y) && Math.random() < 0.3) V.text(t.x, t.y, 'IMMUNE', '#ffffff', { size: 7 }); return 0; }
    const src = src0.owner && !src0.st ? src0.owner : src0; const owner = src0.owner || src0;
    const st = src0.st || src.st; if (!st) return 0;
    const rp = G.RD.pre(owner, t, s || {}); if (rp.miss) { if (E.vis(t.x, t.y)) V.text(t.x, t.y, 'MISS', '#c8c8c8', { size: 7 }); return 0; }
    let a = st.atk;
    if (owner.core === 'berserk') a *= 1 + (1 - owner.hp / owner.maxhp);
    if (owner.sets && owner.sets.lowhp && owner.hp / owner.maxhp < 0.3) a *= 1.2;
    let dmg = a * pow * (1 + (st.elem || 0) / 100) * U.rf(0.94, 1.06);
    let crit = Math.random() * 100 < (st.crit || 0) + rp.critAdd;
    if (owner.nextCrit || o.crit) { crit = true; }
    if (crit) dmg *= 1.5 + ((st.critDmg || 0) + rp.critDmgAdd) / 100;
    dmg *= rp.mul; if (rp.flat) dmg += rp.flat * pow; const rawD = dmg;
    { const K = E.defK ? E.defK(owner, t) : 650; dmg *= K / (K + (t.st.def || 0)); }
    dmg *= 1 + Math.min(0.2, (owner.combo || 0) * 0.002);
    const pvp = E.playerLike(owner) && E.playerLike(t);
    if (pvp) dmg *= 0.55 * (1 + (st.pvpDmg || 0) / 100) * (1 - Math.min(D.PVP_CAPS.dr, (t.st.dr || 0) + (t.st.pvpDef || 0)) / 100);
    else dmg *= 1 - Math.min(D.CAPS.dr, t.st.dr || 0) / 100;
    if (rp.trueFrac) dmg = dmg * (1 - rp.trueFrac) + rawD * rp.trueFrac * (pvp ? 0.55 : 1);
    if (t.kind === 'struct' && o.siege) dmg *= o.siege;
    if (W.mode && W.mode.dmgMod) dmg *= W.mode.dmgMod(owner, t);
    if (t.core === 'aegis' && t.shield > 0) dmg *= 0.85;
    if (t === W.player && W.gm.god) dmg = 0;
    if (owner === W.player && W.gm.oneHit) dmg = t.hp + t.shield + 1;
    dmg = Math.max(1, Math.round(dmg)); if (!Number.isFinite(dmg)) dmg = 1;
    let left = dmg;
    if (t.shield > 0) { const ab = Math.min(t.shield, left); t.shield -= ab; left -= ab; }
    t.hp -= left; t.flash = 0.09; if (owner === W.player || owner.owner === W.player || owner.team === 0 && t.boss) t.pdmg = (t.pdmg || 0) + dmg; t.combatT = 0; owner.combatT = 0; t.lastHit = owner; t.lastHitT = W.time;
    if (t.mounted) t.mounted = 0;
    if (t.stealth > 0 && left > 0) t.stealth = 0;
    // lifesteal
    let ls = (st.ls || 0) + (s && s.ls ? 30 : 0); if (pvp) ls = Math.min(ls, D.PVP_CAPS.ls + (s && s.ls ? 15 : 0));
    if (ls > 0 && owner.hp > 0) { const h = dmg * ls / 100; owner.hp = Math.min(owner.maxhp, owner.hp + h); owner.ms.heal += h * 0.3; }
    if (owner.build && owner.kind === 'hero') owner.res = Math.min(owner.resMax, owner.res + 3);
    owner.combo = (owner.combo || 0) + 1; owner.comboT = 2.5; owner.ms.dmg += dmg; E.lastCrit = !!crit;
    // feedback
    if (E.vis(t.x, t.y)) {
      const mine = owner === W.player || (owner.owner === W.player), onMe = t === W.player;
      if (mine || onMe || (W.player && U.d2(t.x, t.y, W.player.x, W.player.y) < 64 && crit && Math.random() < 0.12)) {
        const col = onMe ? '#ff5a5a' : crit ? '#ffd84a' : mine ? '#ffffff' : '#b8b0c8';
        V.text(t.x, t.y, U.fmt(dmg) + (crit ? '!' : ''), col, { size: mine || onMe ? (crit ? 11 : 8) : (crit ? 8 : 6), crit: crit && (mine || onMe) });
      }
      if (o.fx !== false && s && E.gen(s)) { const pal = D.ELEM[s.elem || 'phys'].pal; V.burst(t.x, t.y, 12, pal, crit ? 8 : 4, 2.5, 0.3, 2, { up: 25 }); }
      if (crit && mine) { W.hitstop = Math.max(W.hitstop, 0.04); V.shake(1.5, 0.12); if (dmg > t.maxhp * 0.15) G.zKick = Math.max(G.zKick || 0, 0.025); }
    }
    if (s && s.cc && Object.keys(s.cc).length && !o.noCC) E.applyCC(owner, t, s.cc);
    if (t.hp <= 0 && t.lastStandT > W.time) { t.hp = 1; t.lastStandT = 0; if (E.vis(t.x, t.y)) { V.text(t.x, t.y, 'LAST STAND', '#ffd84a', { size: 9 }); V.pillar(t.x, t.y, '#ffd84a', 80, 0.6, 10); } }
    if (s) G.RD.post(owner, t, s, dmg, t.hp <= 0);
    if (t.hp <= 0) E.kill(t, owner);
    return dmg;
  };
  E.heal = (src, t, amt) => {
    if (!t || t.dead) return; const h = Math.min(t.maxhp - t.hp, amt); t.hp += h; if (src.ms) src.ms.heal += h; if (t.overheal > W.time && amt > h) { t.shield = Math.max(t.shield, amt - h); t.shieldT = Math.max(t.shieldT, 5); }
    if (E.vis(t.x, t.y) && h > 1 && (t === W.player || src === W.player || src.owner === W.player)) V.text(t.x, t.y, '+' + U.fmt(h), '#6be07a', { size: 8 });
  };
  E.kill = (t, k) => {
    if (t.dead) return;
    if (t.relic === 'phoenix' && W.time - (t.fxCd.phoenix || -999) > 120) {
      t.fxCd.phoenix = W.time; t.hp = t.maxhp * 0.3; V.pillar(t.x, t.y, '#ffb347', 90, 1, 10); V.burst(t.x, t.y, 10, D.ELEM.fire.pal, 30, 4, 0.8, 3); V.text(t.x, t.y, 'REVIVE!', '#ffb347', { size: 10 }); return;
    }
    t.dead = true; t.deadT = 0; t.hp = 0; t.shield = 0; t.buffs.length = 0; t.cc = { st: 0, rt: 0, sl: 0, sil: 0, fz: 0 }; t.kb = null; t.stealth = 0; t.dashing = false;
    if (E.vis(t.x, t.y)) { const pal = t.kind === 'mob' ? [U.shade(t.col || '#ffffff', 0.4), t.col || '#ffffff', U.shade(t.col || '#888888', -0.3)] : ['#ffffff', '#ff7a7a', '#b0101e']; V.burst(t.x, t.y, 10, pal, 14 * t.sc, 3, 0.6, 2.5); if (t.boss) { V.shake(5, 0.5); V.flash('#ffffff', 0.3); V.ring(t.x, t.y, 4, pal, 0.8, { w: 4 }); } }
    if (k && k.kind === 'hero' && k !== t) {
      if (t.kind === 'hero') { k.ms.k++; k.ms.streak++; t.ms.d++; const sh = t.ms.streak; t.ms.streak = 0; G.S && G.S.onHeroKill && G.S.onHeroKill(k, t, sh); }
      if (k.core === 'reaper' && W.time - (k.fxCd.reaper || -99) > 10) { k.fxCd.reaper = W.time; k.cds.fill(0); V.text(k.x, k.y, 'RESET!', '#ffd84a', { size: 9 }); }
      if (k.sets.killheal && t.kind === 'hero') E.heal(k, k, k.maxhp * 0.25);
    }
    if (t.kind === 'hero' && t.ms) t.ms.streak = 0;
    if (W.mode && W.mode.onKill) W.mode.onKill(t, k);
    G.RD.onKill(t, k);
  };

  // buffs
  E.addBuff = (u, type, v, d, o = {}) => {
    const ex = u.buffs.find(b => b.type === type && b.src === (o.src || 'skill')); if (ex) { ex.v = Math.max(ex.v, v); ex.t = Math.max(ex.t, d); }
    else u.buffs.push({ type, v, t: d, src: o.src || 'skill', c: o.c });
    E.recalc(u);
  };

  // ---------------- skills ----------------
  E.skillOf = (u, i) => {
    if (i === D.SET_IDX) return D.CLS[u.cls].setUlt;
    const base = D.CLS[u.cls].skills[i]; const v = u.runes && u.runes[i] || 0; return D.applyVariant(base, v);
  };
  E.skillRange = (s) => {
    switch (s.arch) {
      case 'slash': case 'spin': case 'nova': return s.r * 0.95; case 'thrust': case 'beam': case 'barrage': case 'dash': return s.R; case 'leap': return s.R;
      case 'proj': return s.R || 7.5; case 'chain': case 'ground': case 'zone': return s.R || 6; case 'trap': return s.r + 0.5; case 'blink': return s.p ? s.R : 99;
      default: return 99;
    }
  };
  E.unlocked = (u, i) => i === D.SET_IDX ? !!(u.sets && u.sets.setult && D.CLS[u.cls].setUlt) : u.lvl >= D.UNLOCK[i] || u.allSkills;
  E.ready = (u, i) => {
    if (!E.unlocked(u, i)) return false; if (u.cds[i] > 0 || u.gcd > 0) return false; if (!E.canAct(u) || u.cc.sil > 0) return false;
    const s = E.skillOf(u, i); return u.res >= s.m || W.gm.noCd && u === W.player;
  };
  E.gen = (s) => !(s && G.FX6 && G.FX6.REC[s.cls]);
  E.cast = (u, i, aim) => {
    if (!E.ready(u, i)) return false;
    const s = Object.assign({}, E.skillOf(u, i), { castId: (E.castN = (E.castN || 0) + 1) });
    const free = u.sets.freecast && Math.random() < 0.15;
    if (!(W.gm.noCd && u === W.player) && !free) u.res -= s.m;
    const aspdK = 1 + (u.st.aspd || 0) / 100;
    let cd = s.c * (1 - (u.st.cdr || 0) / 100); if (i < D.ATK_N) cd /= aspdK;
    u.castCount++;
    if (u.core === 'overload' && u.castCount % 5 === 0) cd = 0;
    if (u.affix === 'nocd') { u.fxCd.nocd = (u.fxCd.nocd || []).filter(t => W.time - t < 5); u.fxCd.nocd.push(W.time); if (u.fxCd.nocd.length >= 10) { cd = 0; u.fxCd.nocd = []; } }
    u.cds[i] = W.gm.noCd && u === W.player ? 0.05 : cd;
    u.gcd = 0.32 / aspdK;
    // aim
    let A = aim; if (!A) { const t = u.target && !u.target.dead ? u.target : E.nearestEnemy(u, 9); A = t ? { x: t.x, y: t.y, u: t } : { x: u.x + u.fx * 3, y: u.y + u.fy * 3 }; }
    E.face(u, A.x, A.y);
    const melee = ['slash', 'spin', 'thrust', 'barrage', 'dash', 'leap'].includes(s.arch) && (s.R || 0) < 3;
    u.anim.at = melee || s.arch === 'proj' ? 0.25 : 0; u.anim.ct = melee ? 0 : 0.28; if (s.arch === 'proj' && !['staff', 'orb', 'book', 'tome', 'hourglass'].includes(D.CLS[u.cls].weapon)) { u.anim.at = 0.22; u.anim.ct = 0; }
    G.FX.cast(u, s, A); G.RD.self(u, s);
    const rep = s.repeat || 1;
    for (let r = 0; r < rep; r++) { if (r === 0) E.exec(u, s, A); else E.later(r * 0.14, () => !u.dead && E.exec(u, s, A)); }
    if (s.ult && E.vis(u.x, u.y)) { V.flash(D.ELEM[s.elem].pal[1], 0.35); V.shake(4, 0.4); W.slowmo = 0.45; W.slowT = 0.35; if (u === W.player || u.team === 0) G.UI && G.UI.ultBanner && G.UI.ultBanner(u, s); }
    if (u.stealth > 0 && s.dmg) { u.stealth = 0; }
    // echo
    const echo = (u.core === 'echo' ? 20 : 0) + (u.relic === 'echo' ? (u.relicV || 8) : 0);
    if (echo && s.dmg && !s.ult && Math.random() * 100 < echo) E.later(0.22, () => { if (!u.dead) { E.exec(u, s, A); if (E.vis(u.x, u.y)) V.text(u.x, u.y, 'ECHO', '#ff7ae0', { size: 7, z: 36 }); } });
    // set procs
    if (u.sets.autobolt && u.castCount % 5 === 0) { const t = E.nearestEnemy(u, 8); if (t) { V.bolt(u.x, u.y, t.x, t.y, D.ELEM.lightning.pal, 0.3, { z1: 60 }); E.hit(u, t, 1.5, { elem: 'lightning' }); } }
    if (u.relic === 'stormeye' && u.castCount % 8 === 0) { const t = E.nearestEnemy(u, 9); if (t) { V.bolt(t.x, t.y - 0.01, t.x, t.y, D.ELEM.lightning.pal, 0.35, { z1: 120, z2: 0, segs: 9 }); E.hit(u, t, 2, { elem: 'lightning' }); } }
    if (s.dmg) setTimeout(() => { u.nextCrit = false; }, 0);
    if (u === W.player && G.S && G.S.onPlayerCast) G.S.onPlayerCast(i);
    return true;
  };
  E.later = (t, fn) => W.timers.push({ t, fn });

  const segDist2 = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay; const l = dx * dx + dy * dy || 1; let t = ((px - ax) * dx + (py - ay) * dy) / l; t = U.clamp(t, 0, 1); return U.d2(px, py, ax + dx * t, ay + dy * t); };
  E.hitArea = (u, s, x, y, r, pow, o = {}) => { const ts = E.enemiesNear(u, x, y, r); for (const t of ts) E.hit(u, t, pow, s, o); return ts.length; };

  E.exec = (u, s, A) => {
    const pal = D.ELEM[s.elem].pal; const sc = (s.scale || 1) * (s.ult ? 1.5 : 1); const vis = E.vis(u.x, u.y);
    const ang = Math.atan2(A.y - u.y, A.x - u.x); const dx = Math.cos(ang), dy = Math.sin(ang);
    const P = s.p;
    switch (s.arch) {
      case 'slash': {
        const r = s.r; const ts = E.enemiesNear(u, u.x, u.y, r + 0.3).filter(t => { let da = Math.atan2(t.y - u.y, t.x - u.x) - ang; da = Math.atan2(Math.sin(da), Math.cos(da)); return Math.abs(da) < 1.25 || U.d2(t.x, t.y, u.x, u.y) < 0.4; });
        ts.forEach(t => E.hit(u, t, P, s)); G.FX.at(u, s, u.x + dx * s.r * 0.6, u.y + dy * s.r * 0.6, ang, { r: s.r });
        if (vis) { V.arc(u.x, u.y, ang, r * 0.9, pal, s.rapid ? 0.16 : 0.24, { w: 4 * sc, sweep: 2.4 }); V.elemFlavor(u.x + dx * r * 0.6, u.y + dy * r * 0.6, s.elem, 5 * sc); if (ts.length) V.slashMark(ts[0].x, ts[0].y, ang + 1.2, 1.2 * sc, pal); }
        break; }
      case 'spin': {
        const n = s.n, r = s.r;
        for (let k = 0; k < n; k++) E.later(k * 0.11, () => { if (u.dead) return; E.hitArea(u, s, u.x, u.y, r, P); if (k === 0 || k === n - 1) G.FX.at(u, s, u.x, u.y, k * 2.1, { r, light: k > 0 }); u.fx = Math.cos(k * 1.6); u.fy = Math.sin(k * 1.6);
          if (E.vis(u.x, u.y)) { V.arc(u.x, u.y, k * 2.1, r * 0.85, pal, 0.18, { sweep: 4.2, w: 3 * sc }); if (k % 2 === 0) V.elemFlavor(u.x, u.y, s.elem, 4 * sc); } });
        if (vis) V.ring(u.x, u.y, r, pal, n * 0.12, { w: 2, fill: true });
        break; }
      case 'thrust': {
        const R = s.R, ex = u.x + dx * R, ey = u.y + dy * R;
        for (const t of W.units) if (!t.dead && E.isEnemy(u, t) && E.targetable(u, t) && segDist2(t.x, t.y, u.x, u.y, ex, ey) < 0.55 * 0.55 * sc) E.hit(u, t, P, s);
        G.FX.at(u, s, ex, ey, ang, { sx: u.x, sy: u.y, line: true });
        if (vis) { V.line(u.x, u.y, ex, ey, pal, 0.22, { w: 6 * sc, z: 9 }); for (let k = 1; k <= 4; k++) V.elemFlavor(u.x + dx * R * k / 4, u.y + dy * R * k / 4, s.elem, 2 * sc); V.burst(ex, ey, 8, pal, 6 * sc, 2, 0.3, 2); }
        break; }
      case 'proj': {
        const n = s.n, spread = n > 1 ? Math.min(1.25, 0.2 * (n - 1)) : 0;
        for (let k = 0; k < n; k++) {
          const a = ang + (n > 1 ? -spread / 2 + spread * k / (n - 1) : 0);
          W.projs.push({ x: u.x + Math.cos(a) * 0.4, y: u.y + Math.sin(a) * 0.4, vx: Math.cos(a) * 11, vy: Math.sin(a) * 11, life: (s.R || 7.5) / 11 + 0.05, owner: u, s, pow: P, pierce: s.pi || 0, hitSet: new Set(), r: s.r || 0, pal, size: (n > 3 ? 2 : 3) * sc, z: 12, elem: s.elem, trail: 0, shape: G.FX.projShape(s), pc: 0 });
        }
        if (vis) V.burst(u.x + dx * 0.5, u.y + dy * 0.5, 12, pal, 4, 1.5, 0.2, 2);
        break; }
      case 'nova': {
        const r = s.r; const c = E.hitArea(u, s, u.x, u.y, r, P); G.FX.at(u, s, u.x, u.y, ang, { r });
        if (vis) { V.ring(u.x, u.y, r, pal, 0.4, { w: 4 * sc, fill: true }); V.ring(u.x, u.y, r * 0.6, pal, 0.3, { w: 2 }); V.burst(u.x, u.y, 8, pal, 16 * sc, r * 2.2, 0.45, 2.5); V.elemFlavor(u.x, u.y, s.elem, 10 * sc); if (s.ult || c > 2) V.shake(2 * sc, 0.2); }
        break; }
      case 'ground': {
        const tx = U.clamp(A.x, u.x - s.R, u.x + s.R), ty = U.clamp(A.y, u.y - s.R, u.y + s.R);
        const strike = (x, y, r, delay, pow) => {
          if (E.vis(x, y)) { V.telegraph(x, y, r, delay, pal[2]); E.later(Math.max(0, delay - 0.3), () => V.fallTex(x, y, s.elem, 9 * Math.min(2, sc) * Math.max(0.7, r / 1.5), 0.3, { h: 160 })); }
          W.dangers.push({ x, y, r, t: delay, team: u.team });
          E.later(delay, () => { if (u.dead && !u.owner) return; E.hitArea(u, s, x, y, r, pow); G.FX.at(u, s, x, y, ang, { r, light: s.n > 1 && Math.random() < 0.6 }); if (E.vis(x, y)) { V.ring(x, y, r, pal, 0.35, { w: 4, fill: true }); V.burst(x, y, 6, pal, 12 * Math.min(2, sc), r * 2.5, 0.45, 2.5); V.elemFlavor(x, y, s.elem, 6); V.shake(1.5 * Math.min(2, sc), 0.15); } });
        };
        if (s.n > 1) { for (let k = 0; k < s.n; k++) { const a = Math.random() * 6.28, rr = Math.sqrt(Math.random()) * s.r; strike(tx + Math.cos(a) * rr, ty + Math.sin(a) * rr, Math.max(0.8, s.r * 0.35), 0.35 + k * 0.07, P); } if (vis) V.ring(tx, ty, s.r, pal, 0.35 + s.n * 0.07, { w: 1, grow: false }); }
        else strike(tx, ty, s.r, 0.5, P);
        break; }
      case 'zone': {
        const tx = U.clamp(A.x, u.x - s.R, u.x + s.R), ty = U.clamp(A.y, u.y - s.R, u.y + s.R);
        W.zones.push({ x: tx, y: ty, r: s.r, t: 0, dur: s.d, tick: 0, owner: u, s, pow: P }); G.FX.at(u, s, tx, ty, ang, { r: s.r, dur: s.d });
        if (E.vis(tx, ty)) V.swirl(tx, ty, s.r, pal, s.d);
        break; }
      case 'beam': {
        const R = s.R, ex = u.x + dx * R, ey = u.y + dy * R; let tot = 0;
        for (const t of W.units) if (!t.dead && E.isEnemy(u, t) && E.targetable(u, t) && segDist2(t.x, t.y, u.x, u.y, ex, ey) < 0.6 * 0.6 * sc) { E.hit(u, t, P, s); tot++; }
        G.FX.at(u, s, ex, ey, ang, { sx: u.x, sy: u.y, line: true });
        if (vis) { V.line(u.x, u.y, ex, ey, pal, 0.3, { w: 7 * sc, z: 12 }); V.line(u.x, u.y, ex, ey, ['#ffffff', '#ffffff', pal[0]], 0.12, { w: 2, z: 12 }); V.burst(ex, ey, 12, pal, 8, 2, 0.3, 2); for (let k = 1; k <= 5; k++) V.elemFlavor(u.x + dx * R * k / 5, u.y + dy * R * k / 5, s.elem, 1); }
        if (s.cc.pl && tot) { /* handled by cc */ }
        break; }
      case 'chain': {
        let cur = A.u && !A.u.dead && E.isEnemy(u, A.u) ? A.u : E.nearestEnemy(u, s.R || 6); if (!cur) break;
        const hit = new Set(); let px = u.x, py = u.y, pz = 14; let k = 0;
        const step = () => {
          if (!cur || u.dead) return; hit.add(cur);
          if (E.vis(cur.x, cur.y)) { if (s.elem === 'lightning' || s.elem === 'tech') V.bolt(px, py, cur.x, cur.y, pal, 0.25, { z1: pz, w: 2 * sc }); else V.line(px, py, cur.x, cur.y, pal, 0.25, { w: 3 * sc, z: 12 }); V.impact(cur.x, cur.y, s.elem, 0.8 * sc); }
          E.hit(u, cur, P, s); G.FX.at(u, s, cur.x, cur.y, ang, { sx: px, sy: py, light: k > 0 && k < s.n - 1 }); { const shp = G.FX.projShape(s); if (shp && E.vis(cur.x, cur.y)) V.fly(px, py, cur.x, cur.y, shp, pal[1], 5, 0.12, { spin: shp === 'shield' ? 20 : 0 }); } px = cur.x; py = cur.y; pz = 12; k++;
          if (k >= s.n) return; let nb = null, bd = 3.6 * 3.6; for (const t of W.units) { if (t.dead || hit.has(t) || !E.isEnemy(u, t) || !E.targetable(u, t)) continue; const d = U.d2(px, py, t.x, t.y); if (d < bd) { bd = d; nb = t; } }
          cur = nb; if (cur) E.later(0.07, step);
        };
        step(); break; }
      case 'dash': {
        const R = s.R; let lx = u.x, ly = u.y; const sx = u.x, sy = u.y; let steps = Math.ceil(R / 0.25); const hit = new Set();
        for (let k = 0; k < steps; k++) { const nx = lx + dx * 0.25, ny = ly + dy * 0.25; if (E.blocked(nx, ny)) break; lx = nx; ly = ny; }
        u.dashing = true; u.invuln = true; const si = E.spriteInfo(u);
        const dur = 0.16; const t0 = W.time;
        u.dashTo = { sx, sy, ex: lx, ey: ly, t: 0, dur };
        E.later(dur, () => { u.dashing = false; u.invuln = false; u.dashTo = null; u.x = lx; u.y = ly; if (u.sets.blinkstealth) { u.stealth = 1; } if (u.relic === 'fang' || u.sets.stealthcrit) u.nextCrit = true; });
        if (P > 0) for (const t of W.units) if (!t.dead && E.isEnemy(u, t) && E.targetable(u, t) && segDist2(t.x, t.y, sx, sy, lx, ly) < 0.7 * 0.7) { E.hit(u, t, P, s); }
        G.FX.at(u, s, lx, ly, ang, { sx, sy, line: true }); G.RD.trail(u, s, sx, sy, lx, ly);
        if (vis) { for (let k = 0; k < 5; k++) { const f = k / 5; V.ghost(U.lerp(sx, lx, f), U.lerp(sy, ly, f), si, 0.45, 0.3 + f * 0.1, true); } V.line(sx, sy, lx, ly, pal, 0.25, { w: 3, z: 10 }); V.elemFlavor(lx, ly, s.elem, 6); V.burst(sx, sy, 2, ['#d8d0c0', '#a8a090', '#888070'], 6, 1.5, 0.4, 3, { add: false }); }
        break; }
      case 'leap': {
        const d = Math.min(s.R, Math.hypot(A.x - u.x, A.y - u.y)); let lx = u.x + dx * d, ly = u.y + dy * d; if (E.blocked(lx, ly)) { lx = A.x; ly = A.y; if (E.blocked(lx, ly)) { lx = u.x; ly = u.y; } }
        const sx = u.x, sy = u.y; u.dashing = true; u.invuln = true; u.dashTo = { sx, sy, ex: lx, ey: ly, t: 0, dur: 0.35, jump: 30 };
        if (vis) V.telegraph(lx, ly, s.r, 0.35, pal[2]);
        E.later(0.35, () => { u.dashing = false; u.invuln = false; u.dashTo = null; u.x = lx; u.y = ly; E.hitArea(u, s, lx, ly, s.r, P); G.FX.at(u, s, lx, ly, ang, { r: s.r }); G.RD.trail(u, s, sx, sy, lx, ly);
          if (E.vis(lx, ly)) { V.ring(lx, ly, s.r, pal, 0.4, { w: 4, fill: true }); V.burst(lx, ly, 4, ['#d8d0c0', '#a8a090', '#888070'], 14, 3, 0.5, 3, { add: false, up: 50 }); V.elemFlavor(lx, ly, s.elem, 8); V.shake(3, 0.2); } });
        break; }
      case 'barrage': {
        let t = A.u && !A.u.dead && E.isEnemy(u, A.u) ? A.u : E.nearestEnemy(u, s.R + 0.5); if (!t) break; const ranged = s.R > 3;
        for (let k = 0; k < s.n; k++) E.later(k * (s.rapid ? 0.04 : 0.065), () => {
          if (u.dead) return; if (!t || t.dead) { t = E.nearestEnemy(u, s.R + 0.5); if (!t) return; }
          if (!ranged && U.d2(u.x, u.y, t.x, t.y) > (s.R + 0.6) ** 2) return;
          E.hit(u, t, P, s, { fx: false }); if (k === 0 || k === s.n - 1) G.FX.at(u, s, t.x, t.y, ang, { light: k === 0 && s.n > 2 });
          if (E.vis(t.x, t.y)) { if (ranged) V.line(u.x + U.rf(-0.2, 0.2), u.y + U.rf(-0.2, 0.2), t.x + U.rf(-0.2, 0.2), t.y + U.rf(-0.2, 0.2), pal, 0.1, { w: 2, z: 12 }); else V.slashMark(t.x + U.rf(-0.2, 0.2), t.y + U.rf(-0.2, 0.2), Math.random() * 6.28, 0.9 * sc, pal, 0.12);
            V.burst(t.x, t.y, 12, pal, 3, 2.5, 0.25, 2); if (k % 3 === 0) V.elemFlavor(t.x, t.y, s.elem, 2); }
          E.face(u, t.x, t.y); u.anim.at = 0.12;
        });
        break; }
      case 'summon': {
        const n = s.n;
        for (let k = 0; k < n; k++) {
          const a = k / n * 6.28 + Math.random(); const x = u.x + Math.cos(a) * 1.2, y = u.y + Math.sin(a) * 1.2; const px = E.blocked(x, y) ? u.x : x, py = E.blocked(x, y) ? u.y : y;
          E.later(0.15 + k * 0.05, () => { if (u.dead) return; E.spawnSummon(u, s, px, py); G.FX.at(u, s, px, py, ang, { light: k > 0 }); if (E.vis(px, py)) { V.runes(px, py, 0.9, pal, 0.7); V.pillar(px, py, pal[1], 40, 0.5, 5); V.elemFlavor(px, py, s.elem, 6); } });
        }
        break; }
      case 'turret': {
        const x = E.blocked(u.x + dx, u.y + dy) ? u.x : u.x + dx, y = E.blocked(u.x + dx, u.y + dy) ? u.y : u.y + dy;
        const tu = E.spawn(E.mkUnit({ kind: 'struct', sub: 'turret', body: 'elemental', sc: 0.7, team: u.team, x, y, owner: u, st: Object.assign({}, u.st), hp: u.maxhp * 0.4, maxhp: u.maxhp * 0.4, life: s.d, s, pow: P, atkCd: 0, name: 'Turret', col: '#e8c04a' }));
        if (u._explodeNext) { tu.explode = u._explodeNext.v; u._explodeNext = null; } G.FX.at(u, s, x, y, ang, {});
        if (vis) { V.runes(x, y, 0.8, pal, 0.6); V.burst(x, y, 10, pal, 10, 2, 0.4, 2); }
        break; }
      case 'trap': {
        const mine = W.traps.filter(t => t.owner === u); if (mine.length >= 3) W.traps.splice(W.traps.indexOf(mine[0]), 1);
        W.traps.push({ x: u.x, y: u.y, r: s.r, owner: u, s, pow: P, life: 20, arm: 0.4 }); G.FX.at(u, s, u.x, u.y, ang, { light: true, r: s.r });
        if (vis) V.runes(u.x, u.y, s.r * 0.6, pal, 0.5);
        break; }
      case 'buff': {
        const targets = s.allies ? E.alliesNear(u, u.x, u.y, 4) : [u];
        G.FX.at(u, s, u.x, u.y, ang, {});
        for (const t of targets) { E.addBuff(t, s.buff, s.v, s.d, { c: pal[1] }); if (E.vis(t.x, t.y)) { V.pillar(t.x, t.y, pal[1], 50, 0.5, 8); V.ring(t.x, t.y, 1, pal, 0.4); V.elemFlavor(t.x, t.y, s.elem, 8, 10); } }
        break; }
      case 'shield': {
        const targets = s.allies ? E.alliesNear(u, u.x, u.y, 4) : [u];
        G.FX.at(u, s, u.x, u.y, ang, {});
        for (const t of targets) { t.shield = Math.max(t.shield, t.maxhp * s.v / 100); t.shieldT = s.d; if (E.vis(t.x, t.y)) { V.dome(t, pal, s.d); V.burst(t.x, t.y, 14, pal, 10, 1.5, 0.4, 2); } }
        break; }
      case 'heal': {
        const targets = s.r > 0 || s.allies ? E.alliesNear(u, u.x, u.y, Math.max(s.r, 4)) : [u];
        G.FX.at(u, s, u.x, u.y, ang, { r: s.r || 1.5 });
        for (const t of targets) { E.heal(u, t, t.maxhp * s.v / 100); if (E.vis(t.x, t.y)) { V.ring(t.x, t.y, 0.8, ['#eaffd8', '#8aff8a', '#3ac84a'], 0.5); for (let k = 0; k < 10; k++) V.p(t.x + U.rf(-0.5, 0.5), t.y + U.rf(-0.5, 0.5), U.rf(0, 10), 0, 0, U.rf(30, 60), U.rf(0.5, 0.9), 2, U.pick(['#8aff8a', pal[0], pal[1]]), { kind: 'cross', grav: 0 }); } }
        if (s.r > 0 && vis) V.ring(u.x, u.y, s.r, ['#eaffd8', '#8aff8a', '#3ac84a'], 0.5, { fill: true });
        if (s.ult) for (const t of targets) { t.shield = Math.max(t.shield, t.maxhp * 0.3); t.shieldT = 5; }
        break; }
      case 'blink': {
        const sx = u.x, sy = u.y; let lx = u.x, ly = u.y;
        if (s.p > 0 && A.u && !A.u.dead) { lx = A.u.x - dx * 0.7; ly = A.u.y - dy * 0.7; if (E.blocked(lx, ly)) { lx = A.u.x; ly = A.u.y; } }
        else { const back = u.hp / u.maxhp < 0.35 && u.ai.flee; const ddx = back ? -dx : dx, ddy = back ? -dy : dy; for (let k = 1; k <= s.R / 0.25; k++) { const nx = sx + ddx * k * 0.25, ny = sy + ddy * k * 0.25; if (E.blocked(nx, ny)) break; lx = nx; ly = ny; } }
        const si = E.spriteInfo(u);
        u.x = lx; u.y = ly; u.cc.rt = 0; u.cc.sl = 0; u.ai.path = null; G.FX.at(u, s, lx, ly, ang, { sx, sy, line: true }); G.RD.trail(u, s, sx, sy, lx, ly);
        if (vis) { V.ghost(sx, sy, si, 0.6, 0.35, true); V.burst(sx, sy, 10, pal, 14, 2, 0.4, 3, { add: false }); V.burst(lx, ly, 10, pal, 14, 2, 0.4, 2); V.elemFlavor(lx, ly, s.elem, 6); V.ring(lx, ly, 0.8, pal, 0.3); }
        if (s.p > 0 && A.u) E.hit(u, A.u, P, s, { crit: u.nextCrit });
        if (u.relic === 'fang' || u.sets.stealthcrit) u.nextCrit = true; if (u.sets.blinkstealth) u.stealth = 1;
        break; }
      case 'stealth': {
        u.stealth = s.d; u.nextCrit = true; G.FX.at(u, s, u.x, u.y, ang, {}); if (vis) { V.burst(u.x, u.y, 8, ['#5a5a6a', '#3a3a4a', '#2a2a34'], 20, 1.5, 0.7, 4, { add: false }); V.elemFlavor(u.x, u.y, s.elem, 6); }
        // drop aggro
        for (const t of W.units) if (t.target === u) t.target = null;
        break; }
    }
  };

  E.spawnSummon = (u, s, x, y) => {
    const cls = u.cls; let body = 'skeleton', col = '#e0d8c8', name = 'Skeleton', ranged = false, sc = 0.85, mirror = false;
    if (cls === 'beastmaster') { if (s.idx === 10) { body = 'golem'; col = '#6a4a2a'; name = 'Bear'; sc = 1; } else { body = 'beast'; col = '#8a8a9a'; name = 'Wolf'; sc = 0.8; } }
    if (cls === 'warlock') { if (s.ult) { body = 'imp'; col = '#ff4a2a'; name = 'Doom Lord'; sc = 2.4; } else { body = 'imp'; col = '#7aff4a'; name = 'Imp'; ranged = true; sc = 0.8; } }
    if (cls === 'jester') { body = 'imp'; col = '#ff4ab0'; name = 'Jack'; sc = 1; }
    if (cls === 'shadowdancer' || cls === 'shadowmancer') { mirror = true; name = cls === 'shadowmancer' ? 'Shadow Clone' : 'Mirror'; sc = 1; }
    if (cls === 'necromancer' && s.ult) { sc = U.rf(0.8, 1.1); }
    if (!['beastmaster', 'warlock', 'shadowdancer', 'shadowmancer', 'necromancer', 'jester'].includes(cls)) { body = 'elemental'; col = D.ELEM[s.elem].pal[2]; name = 'Spirit'; ranged = true; sc = 0.7; }
    const st = Object.assign({}, u.st); st.atk = u.st.atk * s.p; st.def = u.st.def * 0.7;
    const hp = u.maxhp * (s.ult ? 0.6 : 0.35) * Math.max(0.6, s.p);
    const m = E.mkUnit({ kind: 'summon', team: u.team, x, y, owner: u, st, hp, maxhp: hp, life: s.d, explode: u._explodeNext ? u._explodeNext.v : 0, name, body, col, ranged, sc, moveSpd: 4.2, atkCd: 0, elem: s.elem, mirror, look: mirror ? u.look : null, cls: mirror ? u.cls : null });
    if (!mirror) m.sheet = SPR.monSheet(body, col, U.shade(col, -0.4));
    m.alpha = mirror ? 0.55 : 1;
    E.spawn(m); return m;
  };

  // ---------------- AI ----------------
  E.mobAI = (u, dt) => {
    if (u.dummy) return;
    const ai = u.ai; ai.t = (ai.t || 0) - dt; u.atkCd = (u.atkCd || 0) - dt;
    if (!E.canAct(u)) return; if (G.RD.canFlee(u, dt)) return; G.RD.taunted(u);
    if (u.target && (u.target.dead || !E.isEnemy(u, u.target) || !E.targetable(u, u.target))) u.target = null;
    if (!u.target && ai.t <= 0) { ai.t = 0.4; const t = E.nearestEnemy(u, u.aggro || 5); if (t) u.target = t; }
    if (u.target) {
      const t = u.target; const d = Math.hypot(t.x - u.x, t.y - u.y);
      if (u.leash && U.d2(u.x, u.y, u.home.x, u.home.y) > u.leash * u.leash) { u.target = null; ai.ret = true; return; }
      if (u.boss) E.bossAI(u, t, d, dt);
      const range = u.ranged ? 5 : 1.0 + 0.3 * u.sc;
      if (d > range) E.walkTo(u, t.x, t.y, dt, range * 0.9);
      else if (u.atkCd <= 0) {
        u.atkCd = (u.atkRate || 1.3) * (u.cc.sl > 0 ? 1.4 : 1); E.face(u, t.x, t.y); u.anim.at = 0.3;
        const pal = D.ELEM[u.elem || 'phys'].pal;
        if (u.ranged) W.projs.push({ x: u.x, y: u.y, vx: (t.x - u.x) / d * 8, vy: (t.y - u.y) / d * 8, life: 0.9, owner: u, s: { elem: u.elem || 'phys', cc: {} }, pow: 1, pierce: 0, hitSet: new Set(), r: 0, pal, size: 2.5 * Math.min(2, u.sc), z: 10 * u.sc, elem: u.elem });
        else { E.hit(u, t, 1, { elem: u.elem || 'phys', cc: {} }); if (E.vis(u.x, u.y)) V.arc(u.x, u.y, Math.atan2(t.y - u.y, t.x - u.x), 0.9 * u.sc, pal, 0.18, { w: 2 * u.sc }); }
      }
    } else {
      if (ai.ret) { if (E.walkTo(u, u.home.x, u.home.y, dt, 0.5)) { ai.ret = false; u.hp = u.maxhp; } u.hp = Math.min(u.maxhp, u.hp + u.maxhp * 0.2 * dt); return; }
      if (!ai.wp || ai.wt <= 0) { ai.wt = U.rf(2, 6); const a = Math.random() * 6.28, r = Math.random() * 3; ai.wp = { x: u.home.x + Math.cos(a) * r, y: u.home.y + Math.sin(a) * r }; }
      ai.wt -= dt; if (U.d2(u.x, u.y, ai.wp.x, ai.wp.y) > 0.2) { const sp = u.moveSpd; u.moveSpd = sp * 0.35; E.walkTo(u, ai.wp.x, ai.wp.y, dt, 0.3); u.moveSpd = sp; }
    }
  };
  E.bossAI = (u, t, d, dt) => {
    const ai = u.ai; ai.bt = (ai.bt ?? 3) - dt; if (ai.bt > 0) return; ai.bt = u.grade === 'world' ? 3.2 : 4.5;
    const pal = D.ELEM[u.elem || 'fire'].pal; const pow = 1.8; const s = { elem: u.elem || 'fire', cc: {} };
    const pick = U.pick(['slam', 'meteor', 'volley', 'charge']);
    if (pick === 'slam') { const r = 3 * Math.min(1.6, u.sc / 2); V.telegraph(u.x, u.y, r, 0.9, '#ff3a3a'); W.dangers.push({ x: u.x, y: u.y, r, t: 0.9, team: u.team }); E.later(0.9, () => { if (u.dead) return; E.hitArea(u, s, u.x, u.y, r, pow * 1.3); V.ring(u.x, u.y, r, pal, 0.5, { w: 5, fill: true }); V.burst(u.x, u.y, 6, pal, 30, 5, 0.6, 3); V.shake(4, 0.3); }); }
    else if (pick === 'meteor') { for (let k = 0; k < 5; k++) { const x = t.x + U.rf(-2.5, 2.5), y = t.y + U.rf(-2.5, 2.5); V.telegraph(x, y, 1.3, 1, '#ff3a3a'); W.dangers.push({ x, y, r: 1.3, t: 1, team: u.team }); E.later(0.7, () => V.fall(x, y, pal, 0.3, 6)); E.later(1, () => { if (u.dead) return; E.hitArea(u, s, x, y, 1.3, pow); V.ring(x, y, 1.3, pal, 0.35, { w: 3, fill: true }); V.burst(x, y, 6, pal, 12, 3, 0.4, 2.5); }); } }
    else if (pick === 'volley') { for (let k = 0; k < 14; k++) { const a = k / 14 * 6.28; W.projs.push({ x: u.x, y: u.y, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, life: 1.4, owner: u, s, pow: pow * 0.7, pierce: 0, hitSet: new Set(), r: 0, pal, size: 4, z: 14, elem: s.elem }); } V.ring(u.x, u.y, 1.5, pal, 0.3); }
    else { const dx = t.x - u.x, dy = t.y - u.y, l = Math.hypot(dx, dy) || 1; const ex = u.x + dx / l * Math.min(6, l), ey = u.y + dy / l * Math.min(6, l); V.telegraph((u.x + ex) / 2, (u.y + ey) / 2, 1.2, 0.6, '#ff3a3a');
      E.later(0.6, () => { if (u.dead) return; const sx = u.x, sy = u.y; for (const tt of W.units) if (!tt.dead && E.isEnemy(u, tt) && segDist2(tt.x, tt.y, sx, sy, ex, ey) < 1.2) { E.hit(u, tt, pow, s); E.applyCC(u, tt, { kb: 2 }); } if (!E.blocked(ex, ey)) { u.x = ex; u.y = ey; } V.line(sx, sy, ex, ey, pal, 0.3, { w: 8 }); V.shake(3, 0.2); }); }
  };

  E.summonAI = (u, dt) => {
    u.life -= dt; if (u.life <= 0 || !u.owner || u.owner.dead) { if (u.explode && u.owner && !u.owner.dead) { for (const e of E.enemiesNear(u.owner, u.x, u.y, 2)) E.hit(u.owner, e, u.explode / 100, { elem: u.elem || 'fire', cc: {} }); if (E.vis(u.x, u.y)) { if (E.gen(u.owner)) G.FX.M.explosion({ x: u.x, y: u.y, pal: D.ELEM[u.elem || 'fire'].pal, sc: 1.2, ang: 0 }); else G.FX6.mini(u.owner, u.x, u.y, 0, 1); } } u.dead = true; u.removeMe = true; if (E.vis(u.x, u.y)) V.burst(u.x, u.y, 10, D.ELEM[u.elem || 'shadow'].pal, 10, 2, 0.5, 2); return; }
    u.atkCd -= dt; if (!E.canAct(u)) return; if (u.decoy) return; if (G.RD.canFlee(u, dt)) return;
    if (u.sub === 'turret') { if (u.atkCd <= 0) { const t = E.nearestEnemy(u, 7); if (t) { u.atkCd = 0.6; const d = Math.hypot(t.x - u.x, t.y - u.y) || 1; W.projs.push({ x: u.x, y: u.y, vx: (t.x - u.x) / d * 12, vy: (t.y - u.y) / d * 12, life: 0.7, owner: u, s: u.s, pow: u.pow, pierce: 0, hitSet: new Set(), r: 0, pal: D.ELEM.tech.pal, size: 2, z: 16, elem: 'tech' }); } } return; }
    if (!u.target || u.target.dead || !E.targetable(u, u.target)) u.target = (u.owner.target && !u.owner.target.dead && E.isEnemy(u, u.owner.target)) ? u.owner.target : E.nearestEnemy(u, 8);
    const t = u.target;
    if (t) {
      const d = Math.hypot(t.x - u.x, t.y - u.y); const range = u.ranged ? 4.5 : 1 + 0.3 * u.sc;
      if (d > range) E.walkTo(u, t.x, t.y, dt, range * 0.9);
      else if (u.atkCd <= 0) { u.atkCd = 0.9; E.face(u, t.x, t.y); u.anim.at = 0.25; const pal = D.ELEM[u.elem || 'shadow'].pal;
        if (u.ranged) W.projs.push({ x: u.x, y: u.y, vx: (t.x - u.x) / d * 10, vy: (t.y - u.y) / d * 10, life: 0.6, owner: u, s: { elem: u.elem, cc: {} }, pow: 1, pierce: 0, hitSet: new Set(), r: 0, pal, size: 2.5 * u.sc, z: 12, elem: u.elem });
        else { E.hit(u, t, 1, { elem: u.elem, cc: {} }); if (E.vis(u.x, u.y)) { if (E.gen(u.owner)) V.arc(u.x, u.y, Math.atan2(t.y - u.y, t.x - u.x), 0.9 * u.sc, pal, 0.16, { w: 2 * u.sc }); else G.FX6.mini(u.owner, t.x, t.y, Math.atan2(t.y - u.y, t.x - u.x)); } } }
    } else { const o = u.owner; if (U.d2(u.x, u.y, o.x, o.y) > 4) E.walkTo(u, o.x + U.rf(-1, 1), o.y + U.rf(-1, 1), dt, 1); }
  };

  // hero AI (bots, mercs, wanderers, player auto)
  const SUPPORT = { buff: 1, shield: 1, heal: 1, blink: 1, stealth: 1, summon: 1, turret: 1, trap: 1 };
  E.pickSkill = (u, t, near, smart) => {
    let best = -1, bs = 0; const d = t ? Math.hypot(t.x - u.x, t.y - u.y) : 99; const hpP = u.hp / u.maxhp; const inCombat = u.combatT < 4 || near > 0;
    for (let i = 0; i < D.NSK; i++) {
      if (!E.ready(u, i)) continue; const s = E.skillOf(u, i); let sc = 0;
      if (s.dmg && !SUPPORT[s.arch]) {
        if (!t) continue; const rng = E.skillRange(s);
        if (d > rng + 0.3) { if ((s.arch === 'dash' || s.arch === 'leap') && d < s.R + 1 && d > 2) sc = 2; else continue; }
        else {
          let pt = s.p * (['spin', 'barrage'].includes(s.arch) || (s.arch === 'ground' && s.n > 1) || (s.arch === 'proj' && s.n > 1) ? s.n * 0.75 : s.arch === 'chain' ? s.n * 0.7 : s.arch === 'zone' ? s.d * 1.2 : 1);
          if (['nova', 'spin', 'ground', 'zone', 'chain', 'beam', 'thrust', 'slash'].includes(s.arch)) pt *= 1 + 0.35 * Math.max(0, near - 1);
          sc = 1 + pt;
          if (s.ult) { if (near >= 2 || (t.kind === 'hero') || t.boss) sc *= 3; else continue; }
          const hard = s.cc.st || s.cc.fz; if (hard && smart >= 2 && (t.cc.st > 0 || t.cc.fz > 0 || t.ccImmune)) sc *= 0.2;
          if (hard && smart >= 3) { const r = t.dr.st; if (r && W.time - r.t < 15 && r.n >= 2) sc *= 0.25; }
        }
      } else {
        switch (s.arch) {
          case 'heal': { const lowAlly = s.r > 0 ? E.alliesNear(u, u.x, u.y, s.r).some(a => a.hp / a.maxhp < 0.55) : false; if (hpP < 0.55 || lowAlly) sc = 7; break; }
          case 'shield': if (hpP < 0.65 && inCombat) sc = 5; break;
          case 'buff': if (inCombat && t && !u.buffs.some(b => b.type === s.buff)) sc = 3; break;
          case 'summon': case 'turret': if (inCombat && t) sc = 3.5; break;
          case 'trap': if (t && d < 2.5) sc = 2.5; break;
          case 'stealth': if ((hpP < 0.3 && near) || (t && d > 3 && d < 7 && u.st.crit < 60 && smart >= 1)) sc = 2.2; break;
          case 'blink': if (s.p > 0 && t && d < s.R + 0.5) sc = 2 + s.p; else if (hpP < 0.3 && near && smart >= 1) { u.ai.flee = true; sc = 4; } else if (t && d > 5 && d < s.R + 4 && smart >= 2) sc = 1.2; break;
        }
      }
      if (sc > bs) { bs = sc; best = i; }
    }
    return best;
  };
  E.heroAI = (u, dt, ctl = {}) => {
    const ai = u.ai; const diff = ai.diff || D.DIFFS[1]; ai.think = (ai.think || 0) - dt; u.ai.flee = false;
    if (ai.ang === undefined) { // individual personality: own approach angle, spacing, tempo, aggression
      ai.ang = Math.random() * 6.28; ai.rad = U.rf(1.4, 3.6); ai.tempo = U.rf(0.75, 1.35); ai.flank = U.rf(-1.1, 1.1); ai.wanderT = U.rf(1, 4);
      ai.aggr = ai.persona === 'bold' ? U.rf(0.8, 1.2) : ai.persona === 'careful' ? U.rf(0.3, 0.6) : U.rf(0.5, 0.8); ai.lowHp = ai.persona === 'careful' ? 0.4 : ai.persona === 'guard' ? 0.3 : 0.18;
    }
    if (!E.canAct(u)) return; if (G.RD.canFlee(u, dt)) return;
    // dodge telegraphs
    if (ai.dodgeT > 0) { ai.dodgeT -= dt; E.walkTo(u, ai.dx, ai.dy, dt, 0.1); return; }
    for (const dz of W.dangers) {
      if (dz.team === u.team || dz.seen && dz.seen.has(u.id)) continue; (dz.seen = dz.seen || new Set()).add(u.id);
      if (U.d2(u.x, u.y, dz.x, dz.y) < (dz.r + 0.4) ** 2 && Math.random() < diff.dodge) { const a = Math.atan2(u.y - dz.y, u.x - dz.x) + U.rf(-0.5, 0.5); ai.dx = dz.x + Math.cos(a) * (dz.r + 1); ai.dy = dz.y + Math.sin(a) * (dz.r + 1); ai.dodgeT = 0.45; return; }
    }
    if (ai.think <= 0) {
      ai.think = diff.react * U.rf(0.8, 1.2) * ai.tempo; if (Math.random() < 0.08) { ai.ang += U.rf(-1.2, 1.2); ai.flank = U.rf(-1.1, 1.1); }
      // target selection
      const vision = ctl.vision || 9; let t = u.target && !u.target.dead && E.isEnemy(u, u.target) && E.targetable(u, u.target) && U.d2(u.x, u.y, u.target.x, u.target.y) < (vision + 3) ** 2 && (!ctl.allow || ctl.allow(u.target)) ? u.target : null;
      if (ai.focus && !ai.focus.dead) t = ai.focus;
      if (!t || ai.retarget-- <= 0) {
        ai.retarget = 4;
        let best = null, bs = -1e9;
        for (const e of W.units) { if (e.dead || !E.isEnemy(u, e) || !E.targetable(u, e) || e.kind === 'npc' || (ctl.allow && !ctl.allow(e))) continue; const d2 = U.d2(u.x, u.y, e.x, e.y); if (d2 > vision * vision) continue;
          let s = -Math.sqrt(d2) * (0.7 + 0.6 * (1 - ai.aggr)); if (diff.smart >= 2 && e.kind === 'hero') { const r = D.CLS[e.cls] && D.CLS[e.cls].role; if (r === 'healer') s += 4; s += (1 - e.hp / e.maxhp) * 3; } if (e.kind === 'struct' && !ctl.siegeTarget) s -= 6; if (e.kind === 'summon') s -= 2; if (ctl.prefer && ctl.prefer(e)) s += 6;
          if (!ai.focus) { let crowd = 0; for (const a of W.units) if (a !== u && a.team === u.team && a.target === e && !a.dead) crowd++; s -= crowd * (e.boss || e.kind === 'struct' ? 0.2 : 1.1); }
          if (ai.persona === 'careful') s += (1 - e.hp / e.maxhp) * 4; else if (ai.persona === 'bold' && (e.kind === 'hero' || e.boss)) s += 2;
          else if (ai.persona === 'guard') { let pr = 0; for (const a of W.units) if (a.team === u.team && a !== u && !a.dead && a.kind === 'hero' && U.d2(a.x, a.y, e.x, e.y) < 9) pr++; s += pr * 1.5; }
          s += ((e.id * 7 + u.id * 13) % 10) * 0.12;
          if (s > bs) { bs = s; best = e; } }
        t = best || t;
      }
      u.target = t; G.RD.taunted(u);
      ai.goal = ctl.goal ? ctl.goal(u) : null;
    }
    const t = u.target; const persona = ai.persona || 'bold';
    if (t) {
      const d = Math.hypot(t.x - u.x, t.y - u.y); const near = E.enemiesNear(u, u.x, u.y, 3).length;
      const i = E.pickSkill(u, t, near, diff.smart);
      if (i >= 0 && Math.random() < 0.9 + diff.smart * 0.025) { const s = E.skillOf(u, i); const ok = s.dmg ? d <= E.skillRange(s) + 1 || s.arch === 'dash' || s.arch === 'leap' : true; if (ok) E.cast(u, i, { x: t.x, y: t.y, u: t }); }
      // positioning
      const role = D.CLS[u.cls].role; const rangedRole = role === 'caster' || role === 'ranged' || role === 'healer' || role === 'summoner';
      const crng = D.CLS[u.cls].rng || 5; let want = rangedRole || crng >= 3 ? Math.max(2.5, crng * 0.7) : Math.max(0.9, crng * 0.75);
      if (persona === 'careful') want += 1; if (ai.cmd === 'defend' && ai.cmdPt && U.d2(u.x, u.y, ai.cmdPt.x, ai.cmdPt.y) > 25) { E.walkTo(u, ai.cmdPt.x, ai.cmdPt.y, dt, 1); return; }
      if (u.hp / u.maxhp < 0.25 && persona === 'careful' && u.home && diff.smart >= 1) { E.walkTo(u, u.home.x, u.home.y, dt, 1); return; }
      if (u.hp / u.maxhp < ai.lowHp && near && diff.smart >= 1 && !u.isPlayer) { // retreat on its own to recover
        const a = Math.atan2(u.y - t.y, u.x - t.x) + ai.flank * 0.5; E.walkTo(u, u.x + Math.cos(a) * 3, u.y + Math.sin(a) * 3, dt, 0.3); return; }
      if (!rangedRole) want += 0.25 * ((u.id % 3));
      // each bot holds its own slot around the target: melee surround, ranged fan out on its own flank
      const base = rangedRole ? Math.atan2(u.y - t.y, u.x - t.x) + ai.flank * 0.6 : ai.ang + W.time * 0.15 * (u.id % 2 ? 1 : -1);
      const sx = t.x + Math.cos(base) * want, sy = t.y + Math.sin(base) * want;
      if (ai.strafe && ai.strafe.t > 0) { ai.strafe.t -= dt; E.walkTo(u, ai.strafe.x, ai.strafe.y, dt, 0.1); }
      else if (d > want + 2.5) E.walkTo(u, sx, sy, dt, 0.4);
      else if (U.d2(u.x, u.y, sx, sy) > 0.5) { E.walkTo(u, sx, sy, dt, 0.3); E.face(u, t.x, t.y); }
      else { E.face(u, t.x, t.y); if (diff.smart >= 1 && Math.random() < 0.012 * (1 + diff.smart)) { const a = base + U.rf(-1.4, 1.4); ai.strafe = { x: t.x + Math.cos(a) * want, y: t.y + Math.sin(a) * want, t: U.rf(0.3, 0.7) }; } }
    } else {
      // out of combat: heal up/buff, then goal
      const i = E.pickSkill(u, null, 0, diff.smart); if (i >= 0 && E.skillOf(u, i).arch === 'heal') E.cast(u, i);
      const g = ai.goal;
      if (g) {
        const loose = (g.r || 0.6) >= 0.6 && !g.kind; // precise goals (portals, throne, units) stay exact
        const ox = loose ? Math.cos(ai.ang) * ai.rad * Math.min(1, (g.r || 0.6) + 0.4) : 0, oy = loose ? Math.sin(ai.ang) * ai.rad * Math.min(1, (g.r || 0.6) + 0.4) : 0;
        let gx = g.x + ox, gy = g.y + oy; if (E.blocked(gx, gy)) { gx = g.x; gy = g.y; }
        if (U.d2(u.x, u.y, gx, gy) > 0.6) E.walkTo(u, gx, gy, dt, g.r || 0.6);
        else { ai.wanderT -= dt; if (ai.wanderT <= 0) { ai.wanderT = U.rf(2, 6); ai.ang += U.rf(-1, 1); } else if (Math.random() < 0.01) E.face(u, u.x + U.rf(-1, 1), u.y + U.rf(-1, 1)); }
      } else { ai.wanderT -= dt; if (ai.wanderT <= 0) { ai.wanderT = U.rf(3, 7); const a = Math.random() * 6.28; ai.idle = { x: u.x + Math.cos(a) * 2, y: u.y + Math.sin(a) * 2 }; } if (ai.idle && !E.blocked(ai.idle.x, ai.idle.y)) { const sp = u.moveSpd; u.moveSpd = sp * 0.5; if (E.walkTo(u, ai.idle.x, ai.idle.y, dt, 0.2)) ai.idle = null; u.moveSpd = sp; } }
    }
  };

  // ---------------- update ----------------
  E.update = (dtReal) => {
    let dt = Math.min(0.05, dtReal) * W.gm.speed;
    if (W.hitstop > 0) { W.hitstop -= dtReal; dt *= 0.08; }
    if (W.slowT > 0) { W.slowT -= dtReal; dt *= W.slowmo; }
    W.time += dt;
    // timers
    for (let i = W.timers.length - 1; i >= 0; i--) { const tm = W.timers[i]; if (!tm) continue; tm.t -= dt; if (tm.t <= 0) { W.timers.splice(i, 1); try { tm.fn(); } catch (e) { console.error(e); } } }
    for (let i = W.dangers.length - 1; i >= 0; i--) { W.dangers[i].t -= dt; if (W.dangers[i].t <= 0) W.dangers.splice(i, 1); }
    if (W.mode && W.mode.update) W.mode.update(dt);
    for (const u of W.units) E.updateUnit(u, dt);
    for (let i = W.units.length - 1; i >= 0; i--) if (W.units[i].removeMe) W.units.splice(i, 1);
    // separation
    const us = W.units; for (let i = 0; i < us.length; i++) { const a = us[i]; if (a.dead || a.kind === 'struct' || a.kind === 'npc' || a.dashing) continue; for (let j = i + 1; j < us.length; j++) { const b = us[j]; if (b.dead || b.kind === 'struct' || b.kind === 'npc' || b.dashing) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy; const pals = a.kind === 'hero' && b.kind === 'hero' && a.team === b.team; const mr = pals ? 0.95 : 0.32 * (a.sc + b.sc); if (d2 < mr * mr && d2 > 0.0001) { const d = Math.sqrt(d2), push = (mr - d) * (pals ? Math.min(0.5, 4 * dt) : 0.5); const px = dx / d * push, py = dy / d * push; if (!E.blocked(a.x - px, a.y - py)) { a.x -= px; a.y -= py; } if (!E.blocked(b.x + px, b.y + py)) { b.x += px; b.y += py; } } } }
    // projectiles
    for (let i = W.projs.length - 1; i >= 0; i--) {
      const p = W.projs[i]; p.life -= dt; const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
      if (p.life <= 0 || !p.over && E.blocked(nx, ny) && W.map.block[E.idx(W.map, nx, ny)] === 2) { if (p.r) E.projExplode(p); W.projs.splice(i, 1); continue; }
      p.x = nx; p.y = ny; p.trail += dt; (p.hist = p.hist || []).push(nx, ny); if (p.hist.length > 16) p.hist.splice(0, 2);
      if (p.trail > 0.03 && E.vis(p.x, p.y) && E.gen(p.s)) { p.trail = 0; V.p(p.x, p.y, p.z, 0, 0, 0, 0.2, p.size * 0.9, p.pal[1], { drag: 1 }); if (Math.random() < 0.3) V.elemFlavor(p.x, p.y, p.elem || 'phys', 1, p.z); }
      for (const t of W.units) {
        if (t.dead || p.hitSet.has(t) || !E.isEnemy(p.owner, t) || !E.targetable(p.owner, t)) continue;
        const rr = 0.38 + 0.3 * t.sc; if (U.d2(p.x, p.y, t.x, t.y) < rr * rr) {
          p.hitSet.add(t); E.hit(p.owner, t, p.pow, p.pc ? Object.assign({}, p.s, { _pierced: p.pc }) : p.s); p.pc = (p.pc || 0) + 1; G.FX.at(p.owner, p.s, t.x, t.y, Math.atan2(p.vy, p.vx), { light: (p.s.n || 1) > 2 || p.pc > 1, sx: p.x - p.vx * 0.05, sy: p.y - p.vy * 0.05 }); if (E.vis(t.x, t.y) && E.gen(p.s)) V.impact(t.x, t.y, p.elem || 'phys', 0.7 * (p.scale || 1));
          if (p.r) { E.projExplode(p, t); W.projs.splice(i, 1); break; }
          if (p.pierce-- <= 0) { W.projs.splice(i, 1); break; }
        }
      }
    }
    // zones
    for (let i = W.zones.length - 1; i >= 0; i--) {
      const z = W.zones[i]; z.t += dt; z.tick -= dt;
      if (z.s.flags && z.s.flags.grav) for (const e of E.enemiesNear(z.owner, z.x, z.y, z.r + 0.6)) { if (e.ccImmune || e.kb) continue; const dx = z.x - e.x, dy = z.y - e.y, l = Math.hypot(dx, dy); if (l > 0.3) { const st = Math.min(l - 0.3, 2.4 * dt); if (!E.blocked(e.x + dx / l * st, e.y + dy / l * st)) { e.x += dx / l * st; e.y += dy / l * st; } } }
      if (z.tick <= 0) { z.tick = 0.5; E.hitArea(z.owner, z.s, z.x, z.y, z.r, z.pow, { fx: false }); if (E.vis(z.x, z.y) && E.gen(z.s)) for (let k = 0; k < 3; k++) { const a = Math.random() * 6.28, r = Math.random() * z.r; const zx = z.x + Math.cos(a) * r, zy = z.y + Math.sin(a) * r; V.elemFlavor(zx, zy, z.s.elem, 2, 2); if (k === 0 && G.TX) { const el = z.s.elem; if (['fire', 'fel', 'holy', 'blood'].includes(el)) G.TX.flames(zx, zy, el, 1, 0.2, 0.8, 0.6); else V.tex(zx, zy, el, 'spark', { vz: 30, z: 2, dur: 0.6, once: false, fps: 10 }); } } }
      if (z.t >= z.dur) W.zones.splice(i, 1);
    }
    // traps
    for (let i = W.traps.length - 1; i >= 0; i--) {
      const tr = W.traps[i]; tr.life -= dt; tr.arm -= dt; if (tr.life <= 0 || tr.owner.dead) { W.traps.splice(i, 1); continue; }
      if (tr.arm <= 0 && E.enemiesNear(tr.owner, tr.x, tr.y, tr.r * 0.7).length) {
        E.hitArea(tr.owner, tr.s, tr.x, tr.y, tr.r, tr.pow); const pal = D.ELEM[tr.s.elem].pal;
        if (E.vis(tr.x, tr.y)) { if (E.gen(tr.s)) { V.ring(tr.x, tr.y, tr.r, pal, 0.4, { w: 4, fill: true }); V.burst(tr.x, tr.y, 6, pal, 18, 3, 0.5, 2.5); } else G.FX.at(tr.owner, tr.s, tr.x, tr.y, 0, { r: tr.r }); V.shake(2, 0.15); }
        W.traps.splice(i, 1);
      }
    }
    V.update(dt);
    return dt;
  };
  E.projExplode = (p, skip) => { E.hitArea(p.owner, p.s, p.x, p.y, p.r, p.pow * 0.7, { fx: false }); if (E.vis(p.x, p.y) && E.gen(p.s)) { V.ring(p.x, p.y, p.r, p.pal, 0.3, { w: 3, fill: true }); V.burst(p.x, p.y, 10, p.pal, 12, 3, 0.4, 2.5); V.elemFlavor(p.x, p.y, p.elem, 5); } };

  E.updateUnit = (u, dt) => {
    u.anim.t += dt; u.moving = false;
    if (u.flash > 0) u.flash -= dt;
    if (u.dead) { u.deadT += dt; return; }
    if (!Number.isFinite(u.hp)) u.hp = Number.isFinite(u.maxhp) ? u.maxhp : 1;
    if (u.kind === 'npc') { if (u.wander) E.npcWander(u, dt); return; }
    if (u.kind === 'struct' && u.sub !== 'turret') { if (u.update) u.update(u, dt); return; }
    // dash interpolation
    if (u.dashTo) { const d = u.dashTo; d.t += dt; const k = Math.min(1, d.t / d.dur); u.x = U.lerp(d.sx, d.ex, k); u.y = U.lerp(d.sy, d.ey, k); u.jz = d.jump ? Math.sin(k * Math.PI) * d.jump : 0; }
    else u.jz = 0;
    G.RD.tick(u, dt); if (u.dead) return;
    // kb
    if (u.kb) { u.kb.t -= dt; const nx = u.x + u.kb.vx * dt, ny = u.y + u.kb.vy * dt; if (E.isFall(nx, ny)) { u.x = nx; u.y = ny; u.kb = null; u.fell = true; u.hp = 0; E.kill(u, u.lastHit); if (E.vis(u.x, u.y)) V.text(u.x, u.y, 'FALL!', '#ff7a7a', { size: 9 }); return; } if (!E.blocked(nx, ny)) { u.x = nx; u.y = ny; } if (u.kb.t <= 0) u.kb = null; }
    // timers
    for (const k in u.cc) if (u.cc[k] > 0) u.cc[k] -= dt;
    for (let i = 0; i < D.NSK; i++) if (u.cds[i] > 0) u.cds[i] -= dt;
    if (u.gcd > 0) u.gcd -= dt; if (u.anim.at > 0) u.anim.at -= dt; if (u.anim.ct > 0) u.anim.ct -= dt;
    if (u.shieldT > 0) { u.shieldT -= dt; if (u.shieldT <= 0) u.shield = 0; }
    if (u.stealth > 0) u.stealth -= dt;
    if (u.comboT > 0) { u.comboT -= dt; if (u.comboT <= 0) u.combo = 0; }
    let changed = false; for (let i = u.buffs.length - 1; i >= 0; i--) { u.buffs[i].t -= dt; if (u.buffs[i].t <= 0) { u.buffs.splice(i, 1); changed = true; } } if (changed) E.recalc(u);
    u.combatT += dt;
    // regen
    if (u.kind === 'hero') {
      const rg = (u.build ? 6 : 18) * (1 + (u.st.regen || 0) / 100); u.res = Math.min(u.resMax, u.res + rg * dt);
      const outC = u.combatT > 5; u.hp = Math.min(u.maxhp, u.hp + u.maxhp * (outC ? 0.04 * (1 + (u.regenBonus || 0) / 100) : 0.004) * dt);
      if (u.buffs.length && E.vis(u.x, u.y) && Math.random() < dt * 6) { const b = U.pick(u.buffs); V.p(u.x + U.rf(-0.4, 0.4), u.y + U.rf(-0.4, 0.4), 2, 0, 0, U.rf(20, 40), 0.5, 2, b.c || '#ffd84a', { grav: 0 }); }
    }
    // controller
    if (u.kind === 'mob') E.mobAI(u, dt);
    else if (u.kind === 'summon' || u.sub === 'turret') E.summonAI(u, dt);
    else if (u.kind === 'hero') {
      if (u === W.player) G.S.playerControl(u, dt);
      else if (W.gm.ai && u.brain) u.brain(u, dt);
    }
  };
  E.npcWander = (u, dt) => {
    const ai = u.ai; ai.wt = (ai.wt || 0) - dt;
    if (ai.wt <= 0) { ai.wt = U.rf(3, 9); const a = Math.random() * 6.28, r = U.rf(1, u.wr || 6); ai.wp = { x: u.home.x + Math.cos(a) * r, y: u.home.y + Math.sin(a) * r }; }
    if (ai.wp && U.d2(u.x, u.y, ai.wp.x, ai.wp.y) > 0.1) { u.moveSpd = 1.6; E.walkTo(u, ai.wp.x, ai.wp.y, dt, 0.2); }
  };

  // ---------------- rendering ----------------
  const cam = W.cam;
  cam.w2s = (x, y) => [(x - cam.x) * G.TS + E.VW / 2 + cam.sx, (y - cam.y) * G.TS + E.VH / 2 + cam.sy];
  cam.s2w = (sx, sy) => [(sx - E.VW / 2 - cam.sx) / G.TS + cam.x, (sy - E.VH / 2 - cam.sy) / G.TS + cam.y];
  cam.sx = 0; cam.sy = 0;

  E.spriteInfo = (u) => {
    if (u.kind === 'hero' || u.mirror || (u.kind === 'npc' && u.look)) {
      const sh = SPR.charSheet(u.look); const view = u.fy < -0.38 ? 'back' : 'front'; const flip = u.fx < 0;
      const N = sh.n || { idle: 2, walk: 4, attack: 3, cast: 2, hurt: 1 };
      let anim = 'idle', f = Math.floor(u.anim.t * (N.idle > 2 ? 4 : 2.5)) % N.idle;
      if (u.dead) { anim = 'dead'; f = 0; } else if (u.anim.at > 0) { anim = 'attack'; f = N.attack >= 4 ? (u.anim.at > 0.19 ? 0 : u.anim.at > 0.13 ? 1 : u.anim.at > 0.06 ? 2 : 3) : (u.anim.at > 0.17 ? 0 : u.anim.at > 0.08 ? 1 : 2); } else if (u.anim.ct > 0) { anim = 'cast'; f = Math.floor(u.anim.t * 10) % N.cast; } else if (u.moving || u.dashing) { anim = 'walk'; f = Math.floor(u.anim.t * (N.walk > 4 ? 12 : 9)) % N.walk; } else if (u.flash > 0 && N.hurt > 1) { anim = 'hurt'; f = u.flash > 0.08 ? 0 : 1; }
      const row = sh.idx[view + anim]; return { img: sh.sheet, sx: f * sh.fw, sy: row * sh.fh, w: sh.fw, h: sh.fh, flip, sc: u.sc };
    }
    const sh = u.sheet || (u.sheet = SPR.monSheet(u.body || 'slime', u.col || '#7fd36a', u.col2 || U.shade(u.col || '#7fd36a', -0.35)));
    if (sh.kind === 'char') { const sdx = u.fx; let anim = u.dead ? 'dead' : u.anim.at > 0 ? 'attack' : u.moving ? 'walk' : 'idle'; const f = anim === 'walk' ? Math.floor(u.anim.t * 8) % 4 : anim === 'attack' ? 1 : anim === 'idle' ? Math.floor(u.anim.t * 2) % 2 : 0; return { img: sh.sheet, sx: f * sh.fw, sy: sh.idx['front' + anim] * sh.fh, w: sh.fw, h: sh.fh, flip: sdx < 0, sc: u.sc }; }
    const sdx = u.fx; let f = u.flash > 0 ? 3 : u.anim.at > 0 ? 2 : (u.moving ? Math.floor(u.anim.t * 6) % 2 : Math.floor(u.anim.t * 2) % 2);
    return { img: sh.sheet, sx: f * sh.fw, sy: 0, w: sh.fw, h: sh.fh, flip: sdx < 0, sc: u.sc };
  };

  const wingCache = {};
  function wings(c, tier) {
    const k = c + tier; if (wingCache[k]) return wingCache[k];
    const [cv, x] = SPR.mk(40, 24);
    for (let side = 0; side < 2; side++) for (let i = 0; i < 6; i++) { const len = 14 - i * 2; x.fillStyle = i % 2 ? c : U.shade(c, 0.3); const bx = side ? 20 : 20 - len; for (let j = 0; j < len; j++) x.fillRect(bx + j, 4 + i * 3 + Math.round(Math.abs(side ? j : len - j) * 0.25), 1, 3); }
    SPR.crisp(cv); wingCache[k] = cv; return cv;
  }

  E.drawUnit = (ctx, u) => {
    if (u.propSpr) { const [px, py] = cam.w2s(u.x, u.y); const s = u.propSpr; if (u.dead && u.sub !== 'throne') { ctx.globalAlpha = 0.35; } ctx.drawImage(s.img, Math.round(px - s.w / 2), Math.round(py - s.h + (u.sprOff || 3))); if (u.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; ctx.drawImage(s.img, Math.round(px - s.w / 2), Math.round(py - s.h + (u.sprOff || 3))); ctx.globalCompositeOperation = 'source-over'; } ctx.globalAlpha = 1; u._sx = px; u._sy = py - s.h + 4; return; }
    const [sx0, sy0] = cam.w2s(u.x, u.y); const sx = Math.round(sx0), sy = Math.round(sy0 - (u.jz || 0));
    const si = E.spriteInfo(u); const sc = si.sc; const w = si.w * sc, h = si.h * sc;
    // shadow
    ctx.globalAlpha = 0.35; ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.ellipse(sx0, sy0, 7 * sc, 3.2 * sc, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    if (u.selected) { ctx.strokeStyle = E.isEnemy(W.player, u) ? '#ff5a5a' : '#6be07a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(sx0, sy0, 9 * sc, 4.5 * sc, 0, 0, 7); ctx.stroke(); }
    // grade aura
    if (u.grade && u.grade !== 'normal' && !u.dead) { const gc = D.GRADES[u.grade].col; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + 0.15 * Math.sin(W.time * 4); ctx.fillStyle = gc; ctx.beginPath(); ctx.ellipse(sx0, sy0, 10 * sc, 4.5 * sc, 0, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    // mount
    if (u.mounted && u.mountSpr) { const m = u.mountSpr; ctx.save(); ctx.translate(sx, sy); if (si.flip) ctx.scale(-1, 1); ctx.drawImage(m.sheet, (Math.floor(W.time * 8) % 2) * m.fw, 0, m.fw, m.fh, -m.fw / 2, -m.fh + 4, m.fw, m.fh); ctx.restore(); }
    const lift = u.mounted ? 10 : 0;
    // wings
    const CW = { seraph: '#f4f6ff', demon: '#5a1418' }; const cw = !(u.fashion && u.fashion.f_wings) && !u._hs && u.cls && CW[u.cls];
    if (cw && !u.dead && u.kind === 'hero') { const img = wings(cw, 9); const flap = 0.85 + 0.15 * Math.sin(W.time * 6); ctx.drawImage(img, sx - 20 * flap, sy - h - 2 - lift + 8, 40 * flap, 24); }
    if (u.fashion && u.fashion.f_wings && !u.dead && !E.WINGS2) { const f = u.fashion.f_wings; const img = wings(f.dye || f.colors[0], f.tier); const flap = 0.85 + 0.15 * Math.sin(W.time * 6); ctx.drawImage(img, sx - 20 * flap, sy - h - 2 - lift + 8, 40 * flap, 24); }
    ctx.globalAlpha = (u.stealth > 0 ? (u.team === 0 ? 0.4 : 0.15) : 1) * (u.alpha || 1) * (u.dead ? Math.max(0, 1 - Math.max(0, u.deadT - 2)) : 1);
    ctx.save(); ctx.translate(sx, sy - lift); if (si.flip) ctx.scale(-1, 1);
    ctx.drawImage(si.img, si.sx, si.sy, si.w, si.h, -w / 2, -h + 2, w, h);
    if (u.flash > 0 || u.cc.fz > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = u.cc.fz > 0 ? 0.5 : 0.7; ctx.drawImage(si.img, si.sx, si.sy, si.w, si.h, -w / 2, -h + 2, w, h); ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore(); ctx.globalAlpha = 1;
    if (u.cc.fz > 0) { ctx.globalAlpha = 0.45; ctx.fillStyle = '#9ad8ff'; ctx.fillRect(sx - w / 2 + 2, sy - h + 4, w - 4, h - 4); ctx.globalAlpha = 1; }
    if (u.cc.st > 0 && !u.dead) { for (let k = 0; k < 3; k++) { const a = W.time * 5 + k * 2.1; ctx.fillStyle = '#ffe04a'; ctx.fillRect(Math.round(sx + Math.cos(a) * 7), Math.round(sy - h - 2 + Math.sin(a) * 2), 2, 2); } }
    // float orb
    if (u.fashion && u.fashion.f_float && !u.dead) { const f = u.fashion.f_float; const bx = sx + 12, by = sy - h + 6 + Math.sin(W.time * 3) * 3; ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = f.colors[1]; ctx.globalAlpha = 0.4; ctx.beginPath(); ctx.arc(bx, by, 5, 0, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = f.colors[0]; ctx.fillRect(bx - 2, by - 2, 4, 4); ctx.globalCompositeOperation = 'source-over'; }
    u._sy = sy - h - lift; u._sx = sx;
  };
  E.drawUnitUI = (ctx, u) => {
    if (u.dead || u.kind === 'npc' && !u.label) { if (u.kind === 'npc') E.drawNpcLabel(ctx, u); return; }
    if (u.kind === 'npc') { E.drawNpcLabel(ctx, u); return; }
    if (u.sub === 'turret') return;
    const sx = u._sx, sy = u._sy; if (sx === undefined) return; if (u.stealth > 0 && u.team !== 0) return;
    const bw = u.boss ? 34 : u.kind === 'struct' ? 30 : 20; const y = Math.round(sy - 4);
    const showBar = u === W.player || u.hp < u.maxhp || u.kind === 'hero' || u.boss || u.selected;
    if (showBar) {
      ctx.fillStyle = '#120e18'; ctx.fillRect(Math.round(sx - bw / 2) - 1, y - 1, bw + 2, 4);
      const col = u.wanderBot ? '#9ad8ff' : u.team === 0 ? (u === W.player ? '#6be07a' : '#4ad6c8') : u.team === 4 ? (u.red ? '#ff5a5a' : '#e8e4d8') : '#ff5a5a';
      ctx.fillStyle = '#3a2a30'; ctx.fillRect(Math.round(sx - bw / 2), y, bw, 2);
      ctx.fillStyle = col; ctx.fillRect(Math.round(sx - bw / 2), y, Math.max(0, Math.round(bw * u.hp / u.maxhp)), 2);
      if (u.shield > 0) { ctx.fillStyle = '#e8f6ff'; ctx.fillRect(Math.round(sx - bw / 2), y - 2, Math.min(bw, Math.round(bw * u.shield / u.maxhp)), 1); }
    }
    const P0 = W.player; const near = P0 && U.d2(u.x, u.y, P0.x, P0.y); const showName = u === P0 || u.selected || (u.grade && u.grade !== 'normal') || (u.kind === 'struct' && u.name) || (u.kind === 'hero' && u.team !== 0 && near < 12);
    if (showName) {
      const O = E.octx, F = G.PXS || 2; if (!O) return;
      let nm = u.name; if (u.bot) nm = '[BOT] ' + nm; if (u.guildTag) nm = '<' + u.guildTag + '> ' + nm; if (u.kind === 'hero' && u.lvl && (u === W.player || u.selected)) nm = 'Lv' + u.lvl + ' ' + nm;
      const col = u.grade ? D.GRADES[u.grade].col : u.red ? '#ff5a5a' : u.wanderBot ? '#e8f4ff' : u.team === 0 ? (u === W.player ? '#ffe9a8' : '#9af0e4') : u.team === 4 ? '#e8e4d8' : '#ff9a9a';
      const X = sx * F, Y = (y - 2) * F; O.textAlign = 'center'; O.textBaseline = 'alphabetic'; O.font = '600 12px "Pixelify Sans", Kanit, monospace';
      if (u.frame) { const tw = O.measureText(nm).width + 10; O.fillStyle = u.frame; O.globalAlpha = 0.55; O.fillRect(Math.round(X - tw / 2), Y - 13, Math.round(tw), 16); O.globalAlpha = 1; }
      O.lineWidth = 3; O.strokeStyle = '#120e18'; O.strokeText(nm, X, Y); O.fillStyle = col; O.fillText(nm, X, Y);
      if (u.title) { O.font = '500 11px Kanit, sans-serif'; const t = '«' + u.title + '»'; O.strokeText(t, X, Y - 14); O.fillStyle = '#ffd84a'; O.fillText(t, X, Y - 14); }
    }
  };
  E.drawNpcLabel = (ctx, u) => {
    const sx = u._sx, sy = u._sy; if (sx === undefined) return;
    if (u.label) { const bob = Math.round(Math.sin(W.time * 3) * 1.5); ctx.fillStyle = '#ffd84a'; ctx.fillRect(sx - 1, sy - 18 + bob, 2, 5); ctx.fillRect(sx - 1, sy - 11 + bob, 2, 2); }
    const O = E.octx, F = G.PXS || 2; if (!O) return; const X = sx * F, Y = (sy - 3) * F;
    O.textAlign = 'center'; O.font = '600 12px "Pixelify Sans", Kanit, monospace'; O.lineWidth = 3; O.strokeStyle = '#120e18'; O.strokeText(u.name, X, Y); O.fillStyle = u.label ? '#ffd84a' : '#e8e4d8'; O.fillText(u.name, X, Y);
    if (u.say && u.sayT > W.time) { O.font = '13px Kanit, sans-serif'; const tw = Math.min(260, O.measureText(u.say).width + 14); O.fillStyle = 'rgba(18,14,24,0.9)'; O.fillRect(Math.round(X - tw / 2), Y - 40, Math.round(tw), 22); O.fillStyle = '#f0ead8'; O.fillText(u.say, X, Y - 24); }
  };

  // pixel-art pass: ordered-dither the alpha channel and snap colours so every effect reads as hard pixels
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
  // pixel pass without dithering: stepped alpha (no checkerboard dots) + mild colour banding
  const AQ = new Uint8Array(256); for (let a = 0; a < 256; a++) AQ[a] = a < 22 ? 0 : a < 70 ? 64 : a < 125 ? 110 : a < 180 ? 165 : a < 225 ? 215 : 255;
  E.pixelate = (cv, x) => {
    const w = cv.width, h = cv.height; if (w * h > 2.6e6) return; const id = x.getImageData(0, 0, w, h); const d = id.data;
    for (let o = 0; o < d.length; o += 4) { const a = d[o + 3]; if (!a) continue; d[o + 3] = AQ[a]; d[o] = (d[o] & 0xf0) | 8; d[o + 1] = (d[o + 1] & 0xf0) | 8; d[o + 2] = (d[o + 2] & 0xf0) | 8; }
    x.putImageData(id, 0, 0);
  };
  E.render = (ctx) => {
    const m = W.map; if (!m) return; const VW = E.VW, VH = E.VH; if (E.octx) E.octx.clearRect(0, 0, innerWidth, innerHeight);
    const [shx, shy] = V.shakeOffset(); cam.sx = shx; cam.sy = shy;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = m.bg || '#0b0a12'; ctx.fillRect(0, 0, VW, VH);
    if (m.chunks && E.drawChunks) E.drawChunks(ctx, cam); else { const [ox, oy] = cam.w2s(0, 0); if (m.canvas) ctx.drawImage(m.canvas, Math.round(ox), Math.round(oy)); }
    if (W.mode && W.mode.renderGround) W.mode.renderGround(ctx, cam);
    // traps
    for (const tr of W.traps) { const [sx, sy] = cam.w2s(tr.x, tr.y); const pal = D.ELEM[tr.s.elem].pal; ctx.globalAlpha = tr.owner.team === W.player.team ? 0.8 : 0.25; ctx.strokeStyle = pal[1]; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(sx, sy, tr.r * G.TS, tr.r * G.TS, 0, 0, 7); ctx.stroke(); ctx.fillStyle = pal[0]; ctx.fillRect(Math.round(sx) - 1, Math.round(sy) - 1, 3, 3); ctx.globalAlpha = 1; }
    V.renderGround(ctx, cam); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    // drawables
    const list = [];
    const vx0 = cam.x, vy0 = cam.y; const R2 = Math.pow(Math.hypot(VW, VH) / (2 * G.TS) + 4, 2);
    for (const p of m.props) if (U.d2(p.x, p.y, vx0, vy0) < R2) list.push({ d: p.y, p });
    for (const wl of m.walls) if (U.d2(wl.x, wl.y, vx0, vy0) < R2) list.push({ d: wl.ty + 1, wl });
    for (const u of W.units) if (U.d2(u.x, u.y, vx0, vy0) < R2) list.push({ d: u.y + (u.dead ? -0.3 : 0), u });
    for (const l of W.loots) if (U.d2(l.x, l.y, vx0, vy0) < R2) list.push({ d: l.y - 0.1, l });
    if (W.pet && W.pet.spr) list.push({ d: W.pet.y, pet: W.pet });for(const pet of W.onlinePets||[])if(pet.spr)list.push({d:pet.y,pet});
    list.sort((a, b) => a.d - b.d);
    for (const it of list) {
      if (it.p) { const [sx, sy] = cam.w2s(it.p.x, it.p.y); const s = it.p.spr; const pl = W.player; const fade = pl && !it.p.removed && it.p.y > pl.y + 0.15 && it.p.y - pl.y < s.h / G.TS * 0.95 && Math.abs(it.p.x - pl.x) < s.w / G.TS * 0.5 && s.h / G.TS > 1.1; if (fade) ctx.globalAlpha = 0.38; ctx.drawImage(s.img, Math.round(sx - s.w / 2), Math.round(sy - s.h + 3)); if (fade) ctx.globalAlpha = 1; }
      else if (it.wl) { const [sx, sy] = cam.w2s(it.wl.tx, it.wl.ty + 1); const s = it.wl.img; ctx.drawImage(s.img, Math.round(sx), Math.round(sy - s.h)); }
      else if (it.u) E.drawUnit(ctx, it.u);
      else if (it.l) E.drawLoot(ctx, it.l);
      else if (it.pet) { const p = it.pet; const [sx, sy] = cam.w2s(p.x, p.y); const s = p.spr; ctx.globalAlpha = 0.3; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(sx, sy, 5, 2, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.save(); ctx.translate(Math.round(sx), Math.round(sy - Math.abs(Math.sin(W.time * 6)) * (p.moving ? 2 : 0))); if (p.flip) ctx.scale(-1, 1); ctx.drawImage(s.sheet, (Math.floor(W.time * 3) % 2) * s.fw, 0, s.fw, s.fh, -s.fw / 2, -s.fh + 1, s.fw, s.fh); ctx.restore(); }
    }
    const B = E.bloom; const O = E.octx;
    if (O && G.S2 && !E.LORES) {
      // crisp effects: drawn at full screen resolution on the overlay (smooth edges, no blocky upscaling)
      O.save(); try { O.setTransform(G.S2, 0, 0, G.S2, 0, 0); O.imageSmoothingEnabled = true; O.lineJoin = 'round';
      for (const p of W.projs) if (E.vis(p.x, p.y)) V.drawProj(O, cam, p);
      V.renderAir(O, cam); } finally { O.restore(); } O.globalCompositeOperation = 'source-over'; O.globalAlpha = 1;
      if (B && V.level >= 1) { const bx = B.bx; bx.globalCompositeOperation = 'copy'; bx.imageSmoothingEnabled = true; bx.drawImage(O.canvas, 0, 0, B.bc.width, B.bc.height); bx.globalCompositeOperation = 'source-over';
        O.save(); O.setTransform(1, 0, 0, 1, 0, 0); O.imageSmoothingEnabled = true; O.globalCompositeOperation = 'lighter'; O.globalAlpha = (V.level === 2 ? 0.6 : 0.4) * (V._gov || 1); O.drawImage(B.bc, 0, 0, O.canvas.width, O.canvas.height); O.restore(); }
    } else if (B) {
      const fx = B.fx; fx.setTransform(1, 0, 0, 1, 0, 0); fx.clearRect(0, 0, B.fc.width, B.fc.height); fx.imageSmoothingEnabled = false;
      for (const p of W.projs) if (E.vis(p.x, p.y)) V.drawProj(fx, cam, p);
      V.renderAir(fx, cam); fx.globalCompositeOperation = 'source-over'; fx.globalAlpha = 1;
      if (E.PIXEL_PASS) E.pixelate(B.fc, fx);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.drawImage(B.fc, 0, 0);
      if (V.level >= 1) { const bx = B.bx; bx.globalCompositeOperation = 'copy'; bx.imageSmoothingEnabled = true; bx.drawImage(B.fc, 0, 0, B.bc.width, B.bc.height); bx.globalCompositeOperation = 'source-over';
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(0.6, 0.2 + V.quality * 0.22) * (V._gov || 1); ctx.imageSmoothingEnabled = false; ctx.drawImage(B.bc, 0, 0, B.bc.width * 3, B.bc.height * 3); if (V.level === 2) { ctx.globalAlpha = 0.3; ctx.drawImage(B.bc, -B.bc.width * 0.75, -B.bc.height * 0.75, B.bc.width * 4.5, B.bc.height * 4.5); } ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    } else {
      for (const p of W.projs) if (E.vis(p.x, p.y)) V.drawProj(ctx, cam, p);
      V.renderAir(ctx, cam);
    }
    for (const it of list) if (it.u) E.drawUnitUI(ctx, it.u);
    if (E.octx) V.renderTexts(E.octx, cam, G.PXS || 2);
    if (W.mode && W.mode.renderTop) W.mode.renderTop(ctx, cam);
    V.renderScreen(ctx, VW, VH);
  };
  E.drawLoot = (ctx, l) => {
    const [sx, sy] = cam.w2s(l.x, l.y); const c = D.tierColor(l.tier, W.time * 1000); const h = 10 + l.tier * 5;
    ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(0, sy - h, 0, sy); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, c);
    ctx.globalAlpha = 0.45 + 0.2 * Math.sin(W.time * 4 + l.x); ctx.fillStyle = g; ctx.fillRect(Math.round(sx) - 2, Math.round(sy - h), 4, h); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    const bob = Math.round(Math.sin(W.time * 3 + l.y) * 1.5);
    ctx.fillStyle = '#120e18'; ctx.fillRect(Math.round(sx) - 3, Math.round(sy) - 6 + bob, 7, 6); ctx.fillStyle = c; ctx.fillRect(Math.round(sx) - 2, Math.round(sy) - 5 + bob, 5, 4); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(sx) - 2, Math.round(sy) - 5 + bob, 1, 1);
    if (l.tier >= 6 && Math.random() < 0.08) V.p(l.x + U.rf(-0.3, 0.3), l.y + U.rf(-0.3, 0.3), 4, 0, 0, 30, 0.6, 2, c);
  };
});
