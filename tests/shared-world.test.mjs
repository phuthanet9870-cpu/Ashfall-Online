import test from 'node:test';
import assert from 'node:assert/strict';
import { createFarmWorld } from '../server/farm-world.mjs';
import { createFarmService } from '../server/farm-service.mjs';

function fixture() {
  const db = new Map(); const outputs = new Map(); let time = 1000;
  const storage = { async get(k) { return structuredClone(db.get(k)); }, async put(k, v) { db.set(k, structuredClone(v)); } };
  const service = createFarmService({ storage, send(c, m) { outputs.get(c).push(structuredClone(m)); }, now: () => time });
  function client(pid, channel = 1, map = 'meadow') {
    const c = { pid, rooms: new Map([[`s1-${map}`, { n: channel }]]) }; outputs.set(c, []);
    db.set('p:' + pid, { name: pid, cls: 'blademaster', lv: 1 }); return c;
  }
  const enter = (c, character = 'character-1', map = 'meadow') => service.message(c, { t: 'world_enter', room: `s1-${map}`, map, character });
  return { service, db, outputs, storage, client, enter, tick(n = 1) { for (let i = 0; i < n; i++) { time += 50; service.tick(); } } };
}

test('one authoritative monster population per channel; late join sees the same IDs/HP', async () => {
  const f = fixture(), a = f.client('a'), b = f.client('b'); await f.enter(a); f.tick(4); await f.enter(b); f.tick(4);
  assert.equal(f.service.worlds.size, 1);
  const last = c => f.outputs.get(c).filter(m => m.t === 'world_state').at(-1).state;
  assert.deepEqual(last(a), last(b)); assert.equal(last(a).units.filter(u => u.kind === 'mob').length, 150);
  assert.equal(last(a).units.filter(u => u.pid).length, 2);
});

test('channels and maps have separate world instances', async () => {
  const f = fixture(); await f.enter(f.client('a')); await f.enter(f.client('b', 2)); await f.enter(f.client('c', 1, 'dunes'), 'character-1', 'dunes');
  assert.equal(f.service.worlds.size, 3);
});

test('world entry requires authentication and actual room membership', async () => {
  const f = fixture(), a = f.client(null); await f.enter(a); assert.equal(f.service.worlds.size, 0);
  a.pid = 'a'; a.rooms.clear(); await f.enter(a); assert.equal(f.service.worlds.size, 0);
});

test('contested drop transfers exactly once and never broadcasts private rewards', async () => {
  const f = fixture(), a = f.client('a'), b = f.client('b'); await f.enter(a); await f.enter(b);
  const world = [...f.service.worlds.values()][0].sim, p = world.G.W.units.find(u => u.pid);
  world.G.W.loots.push({ id: 'contested', x: p.x, y: p.y, item: { kind: 'stone', tier: 1, n: 1 }, tier: 1, created: 0 });
  await Promise.all([a, b].map(c => f.service.message(c, { t: 'world_pickup', room: 's1-meadow', id: 'contested' })));
  const rewards = [a, b].flatMap(c => f.outputs.get(c).filter(m => m.t === 'world_reward'));
  assert.equal(rewards.length, 1); assert.equal(world.snapshot().loots.length, 0);
  assert.equal(f.outputs.get(b).filter(m => m.t === 'world_reward').length, 0);
  const receipt = rewards[0].receipt;
  assert.equal(f.db.get('world:inbox:a:character-1').length, 1);
  f.service.leave(a); await f.enter(a);
  assert.equal(f.outputs.get(a).filter(m => m.t === 'world_reward' && m.receipt.id === receipt.id).length, 2);
  await f.service.message(a, { t: 'world_ack', room: 's1-meadow', id: receipt.id });
  assert.equal(f.db.get('world:inbox:a:character-1').length, 0);
});

test('drop deliveries are scoped to the character, including reconnects and slot switching', async () => {
  const f = fixture(), a = f.client('a'); await f.enter(a);
  const world = [...f.service.worlds.values()][0].sim, p = world.G.W.units.find(u => u.pid);
  world.G.W.loots.push({ id: 'private', x: p.x, y: p.y, item: { kind: 'stone', tier: 1 }, created: 0 });
  await f.service.message(a, { t: 'world_pickup', room: 's1-meadow', id: 'private' });
  f.outputs.set(a, []); await f.enter(a, 'character-2');
  assert.equal(f.outputs.get(a).filter(m => m.t === 'world_reward').length, 0);
  await f.enter(a, 'character-1'); assert.equal(f.outputs.get(a).filter(m => m.t === 'world_reward').length, 1);
});

test('pickup requires living player proximity; invalid IDs cannot create items', () => {
  const w = createFarmWorld('meadow'); const p = w.enter('a', { cls: 'blademaster', lv: 1 });
  w.G.W.loots.push({ id: 'far', x: p.x + 10, y: p.y, item: { kind: 'stone', tier: 1 }, created: 0 });
  assert.equal(w.take('a', 'far'), null); assert.equal(w.take('a', 'forged'), null);
  p.dead = true; w.G.W.loots[0].x = p.x; assert.equal(w.take('a', 'far'), null);
});

test('server rejects out-of-range attacks, forged damage, client HP and speed teleports', () => {
  const w = createFarmWorld('meadow'), p = w.enter('a', { cls: 'blademaster', lv: 1 });
  const mob = w.G.W.units.find(u => u.kind === 'mob'); mob.x = p.x + 12; mob.y = p.y; const hp = mob.hp;
  assert.equal(w.action('a', { action: 'basic', target: mob.id, damage: 1e15 }), false); assert.equal(mob.hp, hp);
  assert.equal(w.action('a', { action: 'move', x: Infinity, y: 0 }), false);
  const x = p.x, y = p.y; w.action('a', { action: 'move', x: x + 20, y }); w.tick();
  assert.ok(Math.hypot(p.x - x, p.y - y) <= p.moveSpd * 0.05 + 0.001);
  assert.equal(w.action('a', { action: 'snapshot', hp: 1e15 }), false);
});

test('basic attack cooldown is enforced on the server', () => {
  const w = createFarmWorld('meadow'), p = w.enter('a', { cls: 'blademaster', lv: 1 });
  const mob = w.G.W.units.find(u => u.kind === 'mob'); mob.x = p.x + 0.2; mob.y = p.y; mob.hp = mob.maxhp = 10000;
  assert.equal(w.action('a', { action: 'basic', target: mob.id }), true);
  const hp = mob.hp; assert.equal(w.action('a', { action: 'basic', target: mob.id }), false); assert.equal(mob.hp, hp);
});

test('a dead non-leading player remains in the shared world and respawns', () => {
  const w = createFarmWorld('meadow'); w.enter('a', { cls: 'blademaster', lv: 1 }); const b = w.enter('b', { cls: 'cleric', lv: 1 }); b.dead = true; b.hp = 0;
  for (let i = 0; i < 90; i++) w.tick();
  assert.ok(w.G.W.units.includes(b)); assert.equal(b.dead, false); assert.ok(b.hp > 0);
});

test('all 30 class kits execute on the headless authority without renderer dependencies', () => {
  const w = createFarmWorld('meadow'); let count = 0;
  for (const cls of w.G.D.CLASSES) {
    const u = w.enter(cls.id, { cls: cls.id, lv: 250 });
    for (let slot = 0; slot < 25; slot++) {
      u.sets.setult = true; u.cds.fill(0); u.gcd = 0; u.res = 10000;
      Object.assign(u, { ...w.G.W.map.spawn, dead: false, hp: u.maxhp, dashing: false, dashTo: null, cc: { st: 0, rt: 0, sl: 0, sil: 0, fz: 0 }, invuln: true });
      assert.equal(w.action(cls.id, { action: 'cast', slot, x: u.x + 1, y: u.y }), true, cls.id + ':' + slot);
      for (let t = 0; t < 6; t++) w.tick(); count++;
    }
    w.leave(cls.id);
  }
  assert.equal(count, 750);
});

test('failed durable pickup restores the drop instead of losing the item', async () => {
  const f = fixture(), a = f.client('a'); await f.enter(a);
  const w = [...f.service.worlds.values()][0].sim, p = w.G.W.units.find(u => u.pid);
  w.G.W.loots.push({ id: 'rollback', x: p.x, y: p.y, item: { kind: 'stone', tier: 1 }, tier: 1, created: 0 });
  const put = f.storage.put; f.storage.put = async () => { throw new Error('simulated storage failure'); };
  await assert.rejects(f.service.message(a, { t: 'world_pickup', room: 's1-meadow', id: 'rollback' }), /simulated storage failure/);
  assert.equal(w.snapshot().loots.length, 1);
  assert.equal(f.outputs.get(a).filter(m => m.t === 'world_reward').length, 0);
  f.storage.put = put;
  await f.service.message(a, { t: 'world_pickup', room: 's1-meadow', id: 'rollback' });
  assert.equal(w.snapshot().loots.length, 0);
  assert.equal(f.outputs.get(a).filter(m => m.t === 'world_reward').length, 1);
});

test('private reward inbox survives a service restart', async () => {
  const f = fixture(), a = f.client('a'); await f.enter(a);
  const w = [...f.service.worlds.values()][0].sim, p = w.G.W.units.find(u => u.pid);
  w.G.W.loots.push({ id: 'persist', x: p.x, y: p.y, item: { kind: 'stone', tier: 1 }, created: 0 });
  await f.service.message(a, { t: 'world_pickup', room: 's1-meadow', id: 'persist' });
  const messages = [], replacement = createFarmService({ storage: f.storage, send: (c, m) => messages.push(m) });
  await replacement.message(a, { t: 'world_enter', room: 's1-meadow', map: 'meadow', character: 'character-1' });
  assert.equal(messages.filter(m => m.t === 'world_reward').length, 1);
});

test('malformed legacy loadout cannot corrupt an active character', () => {
  const w = createFarmWorld('meadow'), p = w.enter('a', { cls: 'blademaster', lv: 1 });
  const before = structuredClone(w.self('a'));
  assert.equal(w.loadout('a', { fashion: null }), false);
  assert.equal(p.cls, 'blademaster'); assert.deepEqual(w.self('a'), before);
});
