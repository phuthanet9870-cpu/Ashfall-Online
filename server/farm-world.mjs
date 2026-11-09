import { createHeadless } from './headless.mjs';
// The same simulation rules run in browsers and in Node/Workers; rendering is stubbed here.
import '../public/js/data.js';
import '../public/js/skills25.js';
import '../public/js/engine.js';
import '../public/js/riders.js';
import '../public/js/systems.js';
import '../public/js/modes.js';
import '../public/js/classset.js';
import '../public/js/passives.js';
import '../public/js/setult2.js';
import '../public/js/elements.js';
import '../public/js/mon_manifest.js';
import '../public/js/monsters48.js';
import '../public/js/bosses.js';
import '../public/js/balance.js';

const clone = value => JSON.parse(JSON.stringify(value));
const finite = (n, fallback = 0) => Number.isFinite(n) ? n : fallback;
const noop = () => {};
export function createFarmWorld(mapId, { emit = noop } = {}) {
  const G = createHeadless();
  const { D, E, S, W, U } = G;
  const index = D.FARM_MAPS.findIndex(m => m.id === mapId);
  if (index < 0) throw new Error('Unsupported shared farm map');
  const members = new Map(); const worldId = crypto.randomUUID(); let lootSeq = 0, revision = 0;
  const baseSave = S.newSave('World', 'blademaster');
  S.save = baseSave; E.renderMapCanvas = noop; E.vis = () => false; E.spriteInfo = () => ({ img: null, sx: 0, sy: 0, w: 24, h: 24, sc: 1 });
  S.persist = noop; S.refreshPlayer = noop; S.onLevel = noop;
  // Player rewards are routed privately and acknowledged by the transport, never broadcast as inventories.
  S.gainXp = n => { if (W.player?.pid) emit(W.player.pid, { kind: 'xp', n }); };
  S.codexKill = noop; S.quest = noop; S.ach = noop;
  const mode = W.mode = S.FarmMode(index);
  W.map = mode.build();
  // Rendering-only props do not enter snapshots. The authoritative collision grid is sent once on entry.
  const fake = E.heroUnit('blademaster', 1, 0, W.map.spawn); W.player = fake;
  mode.spawnWanderer = noop; mode.init(); W.player = null;
  const dropLoot = S.dropLoot;
  S.dropLoot = (x, y, item) => { dropLoot(x, y, item); const l = W.loots.at(-1); l.id = `${worldId}-${++lootSeq}`; l.created = W.time; };
  const modeUpdate = mode.update; mode.update = dt => { modeUpdate.call(mode, dt); for (const a of members.values()) if (!W.units.includes(a.unit)) E.spawn(a.unit); };
  S.updateLoot = noop; // Only explicit server-validated claims may transfer a shared item.
  const updateUnit = E.updateUnit;
  E.updateUnit = (u, dt) => {
    if (!u.pid) return updateUnit(u, dt);
    const account = members.get(u.pid); if (!account) return;
    const p0 = W.player, s0 = S.save; W.player = u; S.save = account.save;
    try { updateUnit(u, dt); } finally { W.player = p0; S.save = s0; }
  };
  const kill = E.kill;
  E.kill = (t, k) => {
    const owner = k && (k.owner || k), account = members.get(owner?.pid);
    const p0 = W.player, s0 = S.save;
    if (account) { W.player = account.unit; S.save = account.save; }
    const gold = S.save.gold, kills = S.save.stats.kills;
    try { kill(t, k); if (account && S.save.gold !== gold) emit(owner.pid, { kind: 'gold', n: S.save.gold - gold }); if (account && S.save.stats.kills > kills) emit(owner.pid, { kind: 'kill', name: t.md?.n, map: mapId, grade: t.grade }); }
    finally { W.player = p0; S.save = s0; }
  };
  S.playerControl = (u, dt) => {
    const a = members.get(u.pid); if (!a || u.dead) return;
    if (a.move && E.canMove(u)) E.walkTo(u, a.move.x, a.move.y, dt);
  };
  const geometry = () => ({ id: mapId, w: W.map.w, h: W.map.h, block: Array.from(W.map.block), fall: Array.from(W.map.fall), spawn: W.map.spawn });
  function loadout(pid, input) {
    const a = members.get(pid); if (!a || !input || typeof input !== 'object') return false;
    const previousUnit = { ...a.unit };
    const previous = a.save, candidate = S.newSave(a.unit.name, a.unit.cls);
    candidate.lvl = U.clamp(input.lvl | 0 || a.unit.lvl, 1, D.MAX_LV);
    candidate.cls = D.CLS[input.cls] ? input.cls : a.unit.cls;
    // Compatibility bridge for existing local characters. This is not an anti-cheat migration.
    for (const k of ['eq', 'runeBoard', 'skillRunes', 'ownedSR', 'page', 'foods', 'pet', 'mount', 'ach', 'codex', 'fashion', 'dungeons', 'bag']) if (input[k] !== undefined) candidate[k] = clone(input[k]);
    const p0 = W.player, s0 = S.save; W.player = a.unit; S.save = candidate;
    try {
      const c = S.calcPlayer();
      if (!Object.values(c.st).every(v => Number.isFinite(v) && Math.abs(v) <= 1e12)) return false;
      a.save = candidate; a.unit.cls = candidate.cls; a.unit.lvl = candidate.lvl; a.unit.build = D.CLS[candidate.cls].build; a.unit.st0 = c.st; S.applyFlags(a.unit, c); E.recalc(a.unit); return true;
    } catch { a.save = previous; Object.assign(a.unit, previousUnit); return false; }
    finally { W.player = p0; S.save = s0; }
  }
  function enter(pid, profile) {
    if (members.has(pid)) return members.get(pid).unit;
    const cls = D.CLS[profile.cls] ? profile.cls : 'blademaster';
    const lvl = U.clamp(profile.lv | 0, 1, D.MAX_LV);
    const save = S.newSave(String(profile.name || 'ผู้เล่น').slice(0, 20), cls); save.lvl = lvl;
    const unit = E.heroUnit(cls, lvl, 0, { ...W.map.spawn, name: save.name, pid, isPlayer: true });
    // Existing equipment is still local. Do not accept client HP, damage, position, or arbitrary stat objects.
    members.set(pid, { unit, save, move: null }); E.spawn(unit); return unit;
  }
  function action(pid, m) {
    const a = members.get(pid); if (!a) return false;
    const u = a.unit; if (u.dead) return false;
    if (m.action === 'move') {
      if (!Number.isFinite(m.x) || !Number.isFinite(m.y) || !E.inside(W.map, m.x, m.y)) return false;
      a.move = { x: m.x, y: m.y }; return true;
    }
    if (m.action === 'potion' && ['hpPot', 'mpPot'].includes(m.key)) {
      const p0 = W.player, s0 = S.save; W.player = u; S.save = a.save;
      const before = a.save.bag[m.key];
      try { S.usePotion(m.key); if (a.save.bag[m.key] < before) { emit(pid, { kind: 'consume', key: m.key }); return true; } return false; }
      finally { W.player = p0; S.save = s0; }
    }
    const target = W.units.find(t => t.id === m.target && !t.dead);
    if (m.action === 'basic') {
      if (!target || !E.isEnemy(u, target) || !E.targetable(u, target) || !E.canAct(u)) return false;
      const cls = D.CLS[u.cls], range = ['melee', 'tank', 'assassin', 'hybrid'].includes(cls.role) ? 1.7 : Math.max(4.5, cls.rng || 6);
      if (U.dist(u, target) > range + 0.35 || !E.clearLine(u.x, u.y, target.x, target.y) || (u.basicAt || 0) > W.time) return false;
      u.basicAt = W.time + 0.85 / (1 + (u.st.aspd || 0) / 100); E.face(u, target.x, target.y); u.anim.at = 0.3;
      E.hit(u, target, 1, { elem: cls.elem, cc: {} }); return true;
    }
    if (m.action === 'cast') {
      if (!Number.isInteger(m.slot) || m.slot < 0 || m.slot >= D.NSK || !Number.isFinite(m.x) || !Number.isFinite(m.y) || !E.inside(W.map, m.x, m.y)) return false;
      const p0 = W.player, s0 = S.save; W.player = u; S.save = a.save;
      // The browser's zero-cooldown convenience is not used on the authority.
      W.player = null;
      try { return !!E.cast(u, m.slot, { x: m.x, y: m.y, u: target }); }
      finally { W.player = p0; S.save = s0; }
    }
    return false;
  }
  function tick(dt = 0.05) {
    const first = members.values().next().value;
    if (!first) return;
    W.player = first.unit; S.save = first.save;
    E.update(Math.min(0.05, Math.max(0, finite(dt))));
    for (const a of members.values()) if (!W.units.includes(a.unit)) E.spawn(a.unit);
    for (const a of members.values()) if (a.unit.dead && a.unit.deadT > 4) {
      const u = a.unit; Object.assign(u, { dead: false, deadT: 0, hp: u.maxhp / 2, x: W.map.spawn.x, y: W.map.spawn.y, kb: null, dashing: false, dashTo: null }); a.move = null;
    }
    W.loots = W.loots.filter(l => W.time - l.created < 120);
    revision++;
  }
  function snapshot() {
    const keys = ['id', 'pid', 'kind', 'cls', 'team', 'name', 'lvl', 'x', 'y', 'fx', 'fy', 'sc', 'hp', 'maxhp', 'res', 'resMax', 'shield', 'dead', 'deadT', 'moving', 'grade', 'boss', 'col', 'col2', 'body', 'elem', 'md', 'fashion', 'title', 'guildTag', 'mounted', 'cc', 'buffs', 'stealth', 'jz'];
    return { revision, time: W.time, map: mapId,
      units: W.units.filter(u => !u.removeMe && (!u.dead || u.deadT < 3 || u.pid)).map(u => { const o = {}; for (const k of keys) if (u[k] !== undefined) o[k] = u[k]; o.owner = u.owner?.id; o.anim = { at: u.anim.at, ct: u.anim.ct }; return o; }),
      loots: W.loots.map(l => ({ id: l.id, x: l.x, y: l.y, item: l.item, tier: l.tier, t: W.time - l.created })),
      timers: { ...mode.timers }, dangers: W.dangers.map(d => ({ x: d.x, y: d.y, r: d.r, t: d.t, team: d.team })),
      projs: W.projs.map(p => ({ x: p.x, y: p.y, vx: p.vx, vy: p.vy, z: p.z, elem: p.elem, size: p.size, pal: p.pal })),
      zones: W.zones.map(z => ({ x: z.x, y: z.y, r: z.r, t: z.t, dur: z.dur, elem: z.s?.elem })) };
  }
  function take(pid, id) {
    const a = members.get(pid), l = W.loots.find(l => l.id === id);
    if (!a || a.unit.dead || !l || U.dist(a.unit, l) > 1.2) return null;
    W.loots.splice(W.loots.indexOf(l), 1); return clone(l.item);
  }
  return { enter, action, tick, snapshot, geometry, take, loadout, self(pid) { const u = members.get(pid)?.unit; return u ? { st: u.st, cds: Array.from(u.cds), gcd: u.gcd, runes: u.runes, sets: u.sets } : null; }, leave(pid) { const a = members.get(pid); if (a) { a.unit.dead = true; W.units = W.units.filter(u => u !== a.unit && u.owner !== a.unit); W.projs = W.projs.filter(p => p.owner !== a.unit); W.zones = W.zones.filter(z => z.owner !== a.unit); W.traps = W.traps.filter(t => t.owner !== a.unit); members.delete(pid); } }, get size() { return members.size; }, G };
}
