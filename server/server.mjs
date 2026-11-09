// Ashfall Online — Node.js host (VPS / home PC). Serves ../public and runs the realtime core on /ws.
// Data (players, friends, guilds) is kept in data/store.json. Env: PORT (8080), ROOM_CAP (60).
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { webcrypto } from 'node:crypto';
import { WebSocketServer } from 'ws'; import { createCore } from './core.mjs';
const DIR = path.dirname(fileURLToPath(import.meta.url)); const PUB = path.resolve(DIR, '..', 'public'); const DATA = process.env.ASHFALL_DATA_FILE ? path.resolve(process.env.ASHFALL_DATA_FILE) : path.resolve(DIR, '..', 'data', 'store.json');
const PORT = +process.env.PORT || 8080;
let db = {}; try { db = JSON.parse(fs.readFileSync(DATA, 'utf8')); } catch (e) { if(e.code!=='ENOENT')throw e; } let dirty = false;
const durableWrite = next => {
  fs.mkdirSync(path.dirname(DATA), { recursive: true });
  const fd = fs.openSync(DATA + '.tmp', 'w');
  try { fs.writeFileSync(fd, JSON.stringify(next)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(DATA + '.tmp', DATA);
  const dirFd=fs.openSync(path.dirname(DATA),'r');try{fs.fsyncSync(dirFd);}finally{fs.closeSync(dirFd);}
};
const storage = {
  async get(k) { return db[k] === undefined ? null : JSON.parse(JSON.stringify(db[k])); },
  async put(k,v) { if(v===null)delete db[k];else db[k]=JSON.parse(JSON.stringify(v));dirty=true; },
  async transaction(fn) {
    const writes = new Map();
    const tx = { get: async k => writes.has(k) ? writes.get(k) : storage.get(k), put: async (k,v) => { writes.set(k,v); } };
    const result = await fn(tx), next = { ...db };
    for (const [k,v] of writes) { if(v===null)delete next[k];else next[k]=JSON.parse(JSON.stringify(v)); }
    durableWrite(next); db=next; dirty=false; return result;
  }
};
setInterval(() => { if (!dirty) return; dirty = false; durableWrite(db); }, 5000);
const hash = async s => Buffer.from(await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(s))).toString('hex');
const core = createCore({ storage, hash, allowLegacyImport: process.env.ALLOW_LEGACY_IMPORT !== '0', roomCap: +process.env.ROOM_CAP || 60 });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.cur': 'image/x-icon' };
const server = http.createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ ok: true, ...core.stats() })); }
  let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
  if (p === '/') p = '/index.html'; const file = path.resolve(PUB, '.' + p); if (!file.startsWith(PUB + path.sep)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => { if (err || !st.isFile()) { res.writeHead(404); return res.end('not found'); } const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': ['.html','.js','.json'].includes(ext) ? 'no-cache' : 'public, max-age=3600' }); fs.createReadStream(file).pipe(res); });
});
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 2 * 1024 * 1024 });
wss.on('connection', ws => { const c = core.connect({ send: s => { if(ws.readyState!==1)return; if(ws.bufferedAmount>2*1024*1024){ws.close(1013,'Client too slow');return;}ws.send(s); }, close: () => ws.close() }); let alive = true;
  ws.on('pong', () => { alive = true; }); ws.on('message', d => core.message(c, d.toString())); ws.on('close', () => core.disconnect(c));
  const iv = setInterval(() => { if (!alive) { clearInterval(iv); return ws.terminate(); } alive = false; try { ws.ping(); } catch (e) { } }, 30000); ws.on('close', () => clearInterval(iv)); });
setInterval(() => core.tickFast(), 100); setInterval(() => core.tickLobby(), 2000);
server.listen(PORT, () => console.log(`Ashfall Online on :${PORT}`));

let shuttingDown=false;
async function shutdown(){if(shuttingDown)return;shuttingDown=true;try{for(const ws of wss.clients)ws.close();await core.flush();if(dirty)durableWrite(db);server.close();process.exit(0);}catch(e){console.error('Shutdown persistence failed:',e.message);process.exit(1);}}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
