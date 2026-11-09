// Ashfall Online — Cloudflare Worker host. All players connect to ONE Durable Object ("world"), which runs the
// shared realtime core (rooms/channels, lobby, friends, guilds) and keeps player/guild data in its storage.
// Routes: GET /ws (WebSocket) · GET /health · anything else → short info text.
import { createCore } from '../server/core.mjs';
const hash = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
export class World {
  constructor(ctx, env) { this.ctx = ctx; this.core = createCore({ storage: { get: k => ctx.storage.get(k), put: (k, v) => v === null ? ctx.storage.delete(k) : ctx.storage.put(k, v), transaction: fn => ctx.storage.transaction(tx => fn({ get: k => tx.get(k), put: (k,v) => v === null ? tx.delete(k) : tx.put(k,v) })) }, hash, allowLegacyImport: env.ALLOW_LEGACY_IMPORT !== '0', roomCap: +(env.ROOM_CAP || 60) }); this.timers = false; }
  startTimers() { if (this.timers) return; this.timers = true; this.f = setInterval(() => this.core.tickFast(), 50); this.l = setInterval(() => this.core.tickLobby(), 3000); }
  stopTimersIfIdle() { if (this.core.stats().clients) return; clearInterval(this.f); clearInterval(this.l); this.timers = false; }
  async fetch(req) {
    const url = new URL(req.url); if (url.pathname === '/health') return Response.json({ ok: true, ...this.core.stats() });
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
    const [client, server] = Object.values(new WebSocketPair()); server.accept(); this.startTimers();
    const c = this.core.connect({ send: s => { try { server.send(s); } catch (e) { } }, close: () => { try { server.close(); } catch (e) { } } });
    server.addEventListener('message', e => this.core.message(c, e.data)); const bye = () => { this.ctx.waitUntil(this.core.disconnect(c)); this.stopTimersIfIdle(); };
    server.addEventListener('close', bye); server.addEventListener('error', bye);
    return new Response(null, { status: 101, webSocket: client }); }
}
export default {
  async fetch(req, env) { const url = new URL(req.url);
    if (url.pathname === '/ws' || url.pathname === '/health') return env.WORLD.get(env.WORLD.idFromName('world')).fetch(req);
    return new Response('Ashfall Online realtime server. Game connects to /ws', { headers: { 'content-type': 'text/plain; charset=utf-8' } }); }
};
