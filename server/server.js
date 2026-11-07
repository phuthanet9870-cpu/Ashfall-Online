'use strict';
/* Ashfall Online — game server (Node.js 18+).
   · Serves the game (../public) over HTTP.
   · WebSocket /ws: lobby presence (who is online on which game server) + rooms (one per game server × map).
     Each room is split into channels of ROOM_CAP players (ch1, ch2 …) so a crowded map never overloads a client.
     Room state is sent as deltas 10×/s (only players whose state changed), lobby lists every 2 s.
   Env: PORT (default 8080) · ROOM_CAP (60) · LOBBY_PER_SERVER (200) · MAX_CLIENTS (3000) */
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const { WebSocketServer } = require('ws');
const PORT = +process.env.PORT || 8080, ROOM_CAP = +process.env.ROOM_CAP || 60, LOBBY_PER = +process.env.LOBBY_PER_SERVER || 200, MAX_CLIENTS = +process.env.MAX_CLIENTS || 3000;
const PUB = path.resolve(__dirname, '..', 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.cur': 'image/x-icon' };
// ---------------- static files ----------------
const server = http.createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ ok: true, clients: clients.size, rooms: channels.size })); }
  let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
  if (p === '/') p = '/index.html'; const file = path.resolve(PUB, '.' + p);
  if (!file.startsWith(PUB + path.sep) && file !== PUB) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => { if (err || !st.isFile()) { res.writeHead(404); return res.end('not found'); }
    const ext = path.extname(file).toLowerCase(); const isHtml = ext === '.html';
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': isHtml ? 'no-cache' : 'public, max-age=3600' });
    fs.createReadStream(file).pipe(res); });
});
// ---------------- realtime ----------------
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 8 * 1024 });
const clients = new Map();            // id → client
const channels = new Map();           // "room#n" → { room, n, members:Set<client>, dirty:Set<client>, gone:[] }
const clamp = (s, n) => String(s == null ? '' : s).slice(0, n);
const cleanRoom = r => clamp(r, 48).replace(/[^a-z0-9_.-]/gi, '');
// keep presence small and safe (numbers stay numbers, strings trimmed)
const sanitize = (d) => { if (!d || typeof d !== 'object' || Array.isArray(d)) return {}; const o = {}; let k = 0;
  for (const key of Object.keys(d)) { if (++k > 32) break; const v = d[key]; const kk = clamp(key, 16);
    if (typeof v === 'number') o[kk] = Number.isFinite(v) ? v : 0; else if (typeof v === 'string') o[kk] = clamp(v, kk === 'say' ? 80 : 40); else if (typeof v === 'boolean') o[kk] = v;
    else if (Array.isArray(v)) o[kk] = v.slice(0, 8).map(x => typeof x === 'number' ? x : clamp(x, 12)); }
  return o; };
const send = (c, o) => { if (c.ws.readyState === 1) c.ws.send(typeof o === 'string' ? o : JSON.stringify(o)); };
const joinRoom = (c, room) => { room = cleanRoom(room); if (!room || c.rooms.has(room)) return; let n = 1, ch;
  for (; ; n++) { ch = channels.get(room + '#' + n); if (!ch) { ch = { room, n, members: new Set(), dirty: new Set(), gone: [] }; channels.set(room + '#' + n, ch); break; } if (ch.members.size < ROOM_CAP) break; }
  ch.members.add(c); c.rooms.set(room, ch); c.rp.set(room, c.rp.get(room) || {});
  send(c, { t: 'snap', room, ch: n, upd: [...ch.members].filter(m => m.rp.get(room)).map(m => ({ peer: m.id, presence: m.rp.get(room) })) }); ch.dirty.add(c); };
const leaveRoom = (c, room) => { const ch = c.rooms.get(room); if (!ch) return; ch.members.delete(c); ch.dirty.delete(c); ch.gone.push(c.id); c.rooms.delete(room); c.rp.delete(room);
  if (!ch.members.size) channels.delete(room + '#' + ch.n); };
wss.on('connection', (ws, req) => {
  if (clients.size >= MAX_CLIENTS) { ws.close(1013, 'server full'); return; }
  const c = { id: crypto.randomBytes(6).toString('hex'), ws, lp: null, rooms: new Map(), rp: new Map(), alive: true, budget: 40, ip: req.socket.remoteAddress };
  clients.set(c.id, c); send(c, { t: 'hi', id: c.id });
  ws.on('pong', () => { c.alive = true; });
  ws.on('message', (buf) => { if (--c.budget < 0) return; let m; try { m = JSON.parse(buf); } catch (e) { return; } if (!m || typeof m !== 'object') return;
    if (m.t === 'lp') c.lp = sanitize(m.d);
    else if (m.t === 'join') { if (c.rooms.size < 4) joinRoom(c, m.room); }
    else if (m.t === 'leave') leaveRoom(c, cleanRoom(m.room));
    else if (m.t === 'rp') { const room = cleanRoom(m.room); const ch = c.rooms.get(room); if (!ch) return; const d = sanitize(m.d); const s = JSON.stringify(d); if (s === c['_rp' + room]) return; c['_rp' + room] = s; c.rp.set(room, d); ch.dirty.add(c); } });
  ws.on('close', () => { for (const room of [...c.rooms.keys()]) leaveRoom(c, room); clients.delete(c.id); });
});
// message budget refill (≈ 20 msgs/s per client)
setInterval(() => { for (const c of clients.values()) c.budget = Math.min(40, c.budget + 4); }, 200);
// room deltas 10×/s
setInterval(() => { for (const ch of channels.values()) { if (!ch.dirty.size && !ch.gone.length) continue;
    const msg = JSON.stringify({ t: 'pd', room: ch.room, upd: [...ch.dirty].map(m => ({ peer: m.id, presence: m.rp.get(ch.room) })), gone: ch.gone });
    ch.dirty.clear(); ch.gone = []; for (const m of ch.members) send(m, msg); } }, 100);
// lobby every 2 s: per game server the top players (by level) + exact counts
setInterval(() => { const by = {}; const counts = {}; for (const c of clients.values()) { const p = c.lp; if (!p || !p.srv) continue; const s = clamp(p.srv, 8); counts[s] = (counts[s] || 0) + 1; (by[s] = by[s] || []).push(c); }
  const peers = []; for (const s in by) { by[s].sort((a, b) => (b.lp.lv || 0) - (a.lp.lv || 0)); for (const c of by[s].slice(0, LOBBY_PER)) peers.push({ peer: c.id, presence: c.lp }); }
  const msg = JSON.stringify({ t: 'lobby', peers, counts }); for (const c of clients.values()) send(c, msg); }, 2000);
// drop dead connections
setInterval(() => { for (const c of clients.values()) { if (!c.alive) { c.ws.terminate(); continue; } c.alive = false; try { c.ws.ping(); } catch (e) { } } }, 30000);
server.listen(PORT, () => console.log(`Ashfall Online server on :${PORT} (room cap ${ROOM_CAP})`));
