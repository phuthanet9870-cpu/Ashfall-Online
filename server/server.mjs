// Ashfall Online — Node.js host (VPS / home PC). Serves ../public and runs the realtime core on /ws.
// Data (players, friends, guilds) is kept in data/store.json. Env: PORT (8080), ROOM_CAP (60).
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { webcrypto } from 'node:crypto';
import { WebSocketServer } from 'ws'; import { createCore } from './core.mjs';
const DIR = path.dirname(fileURLToPath(import.meta.url)); const PUB = path.resolve(DIR, '..', 'public'); const DATA = path.resolve(DIR, '..', 'data', 'store.json');
const PORT = +process.env.PORT || 8080;
let db = {}; try { db = JSON.parse(fs.readFileSync(DATA, 'utf8')); } catch (e) { } let dirty = false;
const storage = { async get(k) { return db[k] === undefined ? null : JSON.parse(JSON.stringify(db[k])); }, async put(k, v) { if (v === null) delete db[k]; else db[k] = JSON.parse(JSON.stringify(v)); dirty = true; } };
setInterval(() => { if (!dirty) return; dirty = false; fs.mkdirSync(path.dirname(DATA), { recursive: true }); fs.writeFileSync(DATA + '.tmp', JSON.stringify(db)); fs.renameSync(DATA + '.tmp', DATA); }, 5000);
const hash = async s => Buffer.from(await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(s))).toString('hex');
const core = createCore({ storage, hash, roomCap: +process.env.ROOM_CAP || 60 });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.cur': 'image/x-icon' };
const server = http.createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ ok: true, ...core.stats() })); }
  let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
  if (p === '/') p = '/index.html'; const file = path.resolve(PUB, '.' + p); if (!file.startsWith(PUB + path.sep)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => { if (err || !st.isFile()) { res.writeHead(404); return res.end('not found'); } const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600' }); fs.createReadStream(file).pipe(res); });
});
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 8 * 1024 });
wss.on('connection', ws => { const c = core.connect({ send: s => ws.readyState === 1 && ws.send(s), close: () => ws.close() }); let alive = true;
  ws.on('pong', () => { alive = true; }); ws.on('message', d => core.message(c, d.toString())); ws.on('close', () => core.disconnect(c));
  const iv = setInterval(() => { if (!alive) { clearInterval(iv); return ws.terminate(); } alive = false; try { ws.ping(); } catch (e) { } }, 30000); ws.on('close', () => clearInterval(iv)); });
setInterval(() => core.tickFast(), 100); setInterval(() => core.tickLobby(), 2000);
server.listen(PORT, () => console.log(`Ashfall Online on :${PORT}`));
