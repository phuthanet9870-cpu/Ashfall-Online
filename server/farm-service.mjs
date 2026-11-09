import { createFarmWorld } from './farm-world.mjs';

// A channel owns one simulation. Commands never accept client snapshots or damage amounts.
export function createFarmService({ storage, send, now = Date.now }) {
  const worlds = new Map(), sessions = new Map();
  let chain = Promise.resolve(), lastTick = now(), accumulator = 0, broadcastAt = 0;
  const enqueue = fn => { const job = chain.then(fn); chain = job.catch(e => console.error('Shared world storage:', e.message)); return job; };
  const inboxKey = pid => `world:inbox:${pid}`;
  async function deliver(pid, reward) {
    const key = inboxKey(pid), inbox = (await storage.get(key)) || [];
    const receipt = { ...reward, character: pid.split(':')[1], id: crypto.randomUUID() };
    inbox.push(receipt); await storage.put(key, inbox);
    for (const [c] of sessions) if (sessions.get(c).playerId === pid) send(c, { t: 'world_reward', receipt });
  }
  function detach(c) {
    const s = sessions.get(c); if (!s) return;
    sessions.delete(c); c.farmRoom = null; s.world.sim.leave(s.playerId); s.world.idleAt = now();
  }
  async function handle(c, m) {
    if (m.t === 'world_enter') {
      if (!c.pid) return send(c, { t: 'world_error', error: 'auth_required' });
      if (typeof m.character !== 'string' || !/^[a-zA-Z0-9_-]{8,64}$/.test(m.character)) return;
      const accountPid = c.pid;
      const playerId = accountPid + ':' + m.character;
      const ch = c.rooms.get(m.room);
      if (!ch || !/^s[1-4]-[a-z0-9_]+$/.test(m.room) || m.room.slice(3) !== m.map) return;
      // Make duplicate login replace the old simulation participant too.
      for (const [other, s] of sessions) if (other !== c && s.pid === c.pid) detach(other);
      const key = `${m.room}#${ch.n}`;
      let world = worlds.get(key);
      if (!world) {
        if (worlds.size >= 64) return send(c, { t: 'world_error', error: 'world_capacity' });
        try { world = { sim: createFarmWorld(m.map, { emit: (pid, reward) => enqueue(() => deliver(pid, reward)) }), idleAt: now(), key }; }
        catch { return send(c, { t: 'world_error', error: 'unsupported_map' }); }
        worlds.set(key, world);
      }
      if (sessions.get(c)?.world !== world || sessions.get(c)?.playerId !== playerId) {
        detach(c);
        const profile = await storage.get('p:' + c.pid);
        // Account authentication establishes the profile; clients cannot send combat stats here.
        if (!profile || c.pid !== accountPid || c.rooms.get(m.room) !== ch) return;
        world.sim.enter(playerId, { cls: profile.cls, lv: profile.lv, name: profile.name });
        sessions.set(c, { world, pid: c.pid, playerId, room: m.room }); c.farmRoom = m.room;
        if (m.loadout) world.sim.loadout(playerId, m.loadout);
      }
      send(c, { t: 'world_ready', playerId, character: m.character, room: m.room, ch: ch.n, geometry: world.sim.geometry(), state: world.sim.snapshot(), self: world.sim.self(playerId) });
      for (const receipt of (await storage.get(inboxKey(playerId))) || []) send(c, { t: 'world_reward', receipt });
      return;
    }
    const s = sessions.get(c);
    if (!s || !c.pid || c.pid !== s.pid || m.room !== s.room || !c.rooms.has(s.room)) return;
    if (m.t === 'world_loadout') s.world.sim.loadout(s.playerId, m.loadout);
    if (m.t === 'world_action') s.world.sim.action(s.playerId, m);
    if (m.t === 'world_pickup' && typeof m.id === 'string') {
      const picker = s.world.sim.G.W.units.find(u => u.pid === s.playerId);
      const item = s.world.sim.take(s.playerId, m.id);
      if (item) {
        try { await deliver(s.playerId, { kind: 'item', item }); }
        catch (error) { // Restore the same drop if durable delivery fails.
          const u = picker || s.world.sim.G.W.map.spawn;
          s.world.sim.G.W.loots.push({ id: m.id, item, tier: item.tier || 1, x: u.x, y: u.y, created: s.world.sim.G.W.time });
          send(c, { t: 'world_error', error: 'pickup_storage_failed' }); throw error;
        }
      }
      send(c, { t: 'world_pickup_result', id: m.id, ok: !!item });
    }
    if (m.t === 'world_ack' && typeof m.id === 'string') {
      const key = inboxKey(s.playerId), inbox = (await storage.get(key)) || [];
      await storage.put(key, inbox.filter(r => r.id !== m.id));
    }
  }
  return {
    message(c, m) { return enqueue(() => handle(c, m)); },
    leave: detach,
    tick() {
      const t = now(); accumulator += Math.min(250, Math.max(0, t - lastTick)); lastTick = t;
      while (accumulator >= 50) { for (const world of worlds.values()) if (world.sim.size) world.sim.tick(0.05); accumulator -= 50; }
      for (const [key, w] of worlds) if (!w.sim.size && t - w.idleAt > 300000) worlds.delete(key);
      if (t - broadcastAt < 150) return; broadcastAt = t;
      const snapshots = new Map();
      for (const [c, s] of sessions) {
        if (c.pid !== s.pid || !c.rooms.has(s.room)) { detach(c); continue; }
        if (!snapshots.has(s.world)) snapshots.set(s.world, s.world.sim.snapshot());
        send(c, { t: 'world_state', room: s.room, state: snapshots.get(s.world), self: s.world.sim.self(s.playerId) });
      }
    },
    get worlds() { return worlds; }, flush() { return chain; }
  };
}
