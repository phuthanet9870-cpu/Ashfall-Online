import { createOnlineService } from './online-service.mjs';
import { createFarmService } from './farm-service.mjs';
// Ashfall Online — realtime core shared by the Cloudflare Worker (Durable Object) and the Node.js server.
// Rooms (game server × map) split into channels, lobby presence, player identity, friends (requests, accept,
// online status, whispers) and guilds (create, list, join requests, approve/deny, members, leave/kick, guild chat).
// Transport-agnostic: the host passes sockets with send()/close() and a key-value storage with get()/put().

const clamp = (s, n) => String(s == null ? '' : s).slice(0, n);
const cleanRoom = r => clamp(r, 48).replace(/[^a-z0-9_.-]/gi, '');
const cleanName = s => clamp(s, 20).replace(/[\u0000-\u001f<>]/g, '').trim();
const PID = /^[a-f0-9]{16}$/;
const sanitize = (d) => { if (!d || typeof d !== 'object' || Array.isArray(d)) return {}; const o = {}; let k = 0;
  for (const key of Object.keys(d)) { if (++k > 32) break; const v = d[key]; const kk = clamp(key, 16);
    if (typeof v === 'number') o[kk] = Number.isFinite(v) ? v : 0; else if (typeof v === 'string') o[kk] = clamp(v, kk === 'say' ? 80 : 40); else if (typeof v === 'boolean') o[kk] = v;
    else if (Array.isArray(v)) o[kk] = v.slice(0, 8).map(x => typeof x === 'number' ? x : clamp(x, 12)); }
  return o; };

export function createCore({ storage, hash, roomCap = 60, lobbyPer = 200, maxFriends = 100, maxGuild = 50, allowLegacyImport = true }) {
  const clients = new Set(); let budgetTime=Date.now();
  const channels = new Map();          // "room#n" → { room, n, members:Set, dirty:Set, gone:[] }
  const online = new Map();            // pid → client
  const pcache = new Map(), gcache = new Map(); let gidx = null; let seq = 0;
  // ---------- storage helpers ----------
  const getP = async pid => { if (pcache.has(pid)) return pcache.get(pid); const r = (await storage.get('p:' + pid)) || null; if (r) pcache.set(pid, r); return r; };
  const putP = (r) => { pcache.set(r.pid, r); return storage.put('p:' + r.pid, r); };
  const getG = async id => { if (!id) return null; if (gcache.has(id)) return gcache.get(id); const g = (await storage.get('g:' + id)) || null; if (g) gcache.set(id, g); return g; };
  const putG = (g) => { gcache.set(g.id, g); return storage.put('g:' + g.id, g); };
  const delG = async (id) => { gcache.delete(id); await storage.put('g:' + id, null); const ix = await gIndex(); const i = ix.indexOf(id); if (i >= 0) { ix.splice(i, 1); await storage.put('gidx', ix); } };
  const gIndex = async () => { if (!gidx) gidx = (await storage.get('gidx')) || []; return gidx; };
  const send = (c, o) => { try { c.sock.send(typeof o === 'string' ? o : JSON.stringify(o)); } catch (e) { } };
  const farm = createFarmService({ storage, send });
  const authority = createOnlineService({ storage, send, allowLegacyImport, playerCap: roomCap, profileChanged: (id,save) => { getP(id).then(p=>{if(p){p.name=cleanName(save.name);p.cls=save.cls;p.lv=save.lvl;return putP(p);}}).catch(e=>console.error('Profile update:',e.message)); }, identityChanged: (c,oldId,newId) => { if(oldId&&online.get(oldId)===c)online.delete(oldId); if(newId){const previous=online.get(newId);if(previous&&previous!==c){send(previous,{t:'kicked',why:'login_elsewhere'});previous.pid=null;previous.sock.close();}online.set(newId,c);} }, guildChanged: (id,next) => { const g=gcache.get(id); if(g)Object.assign(g,next); } });
  const toPid = (pid, o) => { const c = online.get(pid); if (c) send(c, o); };
  const card = (r) => r ? { pid: r.pid, name: r.name, cls: r.cls, lv: r.lv } : null;
  // ---------- rooms ----------
  const joinRoom = (c, room) => { room = cleanRoom(room); if (!room || c.rooms.has(room)) return; let n = 1, ch;
    for (; ; n++) { ch = channels.get(room + '#' + n); if (!ch) { ch = { room, n, members: new Set(), dirty: new Set(), gone: [] }; channels.set(room + '#' + n, ch); break; } if (ch.members.size < roomCap) break; }
    ch.members.add(c); c.rooms.set(room, ch); c.rp.set(room, c.rp.get(room) || {});
    send(c, { t: 'snap', room, ch: n, upd: [...ch.members].filter(m => m.rp.get(room)).map(m => ({ peer: m.id, presence: m.rp.get(room) })) }); ch.dirty.add(c); };
  const leaveRoom = (c, room) => { if (c.farmRoom === room) { farm.leave(c); c.farmRoom = null; } const ch = c.rooms.get(room); if (!ch) return; ch.members.delete(c); ch.dirty.delete(c); ch.gone.push(c.id); c.rooms.delete(room); c.rp.delete(room); if (!ch.members.size) channels.delete(room + '#' + ch.n); };
  // ---------- friends ----------
  const friendList = async (r) => { const out = []; for (const f of r.friends || []) { const fr = await getP(f); if (!fr) continue; const oc = online.get(f); out.push({ ...card(fr), online: !!oc, srv: oc && oc.lp ? oc.lp.srv : '', map: oc && oc.lp ? oc.lp.map : '', last: fr.last || 0 }); }
    const inc = []; for (const f of r.inc || []) { const fr = await getP(f); if (fr) inc.push(card(fr)); } return { t: 'fr_list', friends: out, incoming: inc }; };
  const pushFriends = async (pid) => { const c = online.get(pid); if (!c) return; const r = await getP(pid); if (r) send(c, await friendList(r)); };
  // ---------- guilds ----------
  const guildView = async (g, forPid) => { const mem = []; for (const m of g.members) { const r = await getP(m.pid); mem.push({ ...card(r || { pid: m.pid, name: m.name }), role: m.role, online: online.has(m.pid) }); }
    const me = g.members.find(m => m.pid === forPid); const staff = me && (me.role === 'leader' || me.role === 'officer');
    return { id: g.id, name: g.name, tag: g.tag, leader: g.leader, created: g.created, members: mem, requests: staff ? g.requests : [], myRole: me ? me.role : null }; };
  const pushGuild = async (g) => { for (const m of g.members) { const c = online.get(m.pid); if (c) send(c, { t: 'g_info', guild: await guildView(g, m.pid) }); } };
  const setGuild = async (pid, gid) => { const r = await getP(pid); if (!r) return; r.guild = gid; await putP(r); };
  // ---------- message handlers ----------
  const H = {
    lp(c, m) { c.lp = sanitize(m.d); },
    join(c, m) { if (c.rooms.size < 4) joinRoom(c, m.room); },
    leave(c, m) { leaveRoom(c, cleanRoom(m.room)); },
    rp(c, m) { const room = cleanRoom(m.room); const ch = c.rooms.get(room); if (!ch) return; const d = sanitize(m.d); const s = JSON.stringify(d); if (s === c.rps.get(room)) return; c.rps.set(room, s); c.rp.set(room, d); ch.dirty.add(c); },
    async auth(c, m) { const pid = String(m.pid || ''); const key = String(m.key || ''); if (!PID.test(pid) || key.length < 16) return send(c, { t: 'auth_fail', why: 'bad id' });
      if(await storage.get('account-locked:'+pid))return send(c,{t:'auth_fail',why:'account_login_required'});const kh = await hash(key); let r = await getP(pid); if (r && r.kh !== kh) return send(c, { t: 'auth_fail', why: 'key' });
      if (!r) r = { pid, kh, friends: [], inc: [], guild: null, created: Date.now() };
      r.name = cleanName(m.name) || 'ผู้เล่น'; r.cls = clamp(m.cls, 20); r.lv = Math.max(1, Math.min(999, m.lv | 0)); r.last = Date.now(); await putP(r);
      const first = c.pid !== pid; if (c.pid && c.pid !== pid && online.get(c.pid) === c) online.delete(c.pid); c.pid = pid; const prev = online.get(pid); if (prev && prev !== c) { send(prev, { t: 'kicked', why: 'login elsewhere' }); prev.pid = null; } online.set(pid, c);
      if (first) { send(c, { t: 'me', pid }); send(c, await friendList(r)); const g = await getG(r.guild); if (g && g.members.some(x => x.pid === pid)) send(c, { t: 'g_info', guild: await guildView(g, pid) }); else if (r.guild) { r.guild = null; await putP(r); send(c, { t: 'g_info', guild: null }); }
        for (const f of r.friends) pushFriends(f); } },
    // friends
    async fr_req(c, m) { if (!c.pid) return; const to = String(m.to || ''); if (!PID.test(to) || to === c.pid) return; const r = await getP(c.pid), t = await getP(to); if (!t) return send(c, { t: 'note', msg: 'ไม่พบผู้เล่น' });
      if (r.friends.includes(to)) return send(c, { t: 'note', msg: 'เป็นเพื่อนกันอยู่แล้ว' }); if (r.friends.length >= maxFriends) return send(c, { t: 'note', msg: 'รายชื่อเพื่อนเต็มแล้ว' });
      if (r.inc.includes(to)) return H.fr_ans(c, { from: to, ok: true }); // they already asked me → accept
      if (!t.inc.includes(c.pid)) { t.inc.push(c.pid); if (t.inc.length > 50) t.inc.shift(); await putP(t); } send(c, { t: 'note', msg: `ส่งคำขอเป็นเพื่อนถึง ${t.name} แล้ว` }); toPid(to, { t: 'fr_in', from: card(r) }); pushFriends(to); },
    async fr_ans(c, m) { if (!c.pid) return; const from = String(m.from || ''); const r = await getP(c.pid), f = await getP(from); if (!f) return; r.inc = r.inc.filter(x => x !== from);
      if (m.ok && !r.friends.includes(from) && r.friends.length < maxFriends && f.friends.length < maxFriends) { r.friends.push(from); if (!f.friends.includes(c.pid)) f.friends.push(c.pid); f.inc = (f.inc || []).filter(x => x !== c.pid); await putP(f); toPid(from, { t: 'note', msg: `${r.name} ตอบรับเป็นเพื่อนแล้ว` }); }
      await putP(r); pushFriends(c.pid); pushFriends(from); },
    async fr_rm(c, m) { if (!c.pid) return; const o = String(m.pid || ''); const r = await getP(c.pid), f = await getP(o); r.friends = r.friends.filter(x => x !== o); await putP(r); if (f) { f.friends = f.friends.filter(x => x !== c.pid); await putP(f); } pushFriends(c.pid); pushFriends(o); },
    async pm(c, m) { if (!c.pid) return; const to = String(m.to || ''); const text = clamp(m.text, 120).trim(); if (!text) return; const r = await getP(c.pid); if (!r.friends.includes(to)) return send(c, { t: 'note', msg: 'กระซิบได้เฉพาะเพื่อน' });
      if (!online.has(to)) return send(c, { t: 'note', msg: 'เพื่อนออฟไลน์อยู่' }); toPid(to, { t: 'pm', from: card(r), text }); send(c, { t: 'pm_ok', to, text }); },
    // guilds
    async g_create(c, m) { if (!c.pid) return; const r = await getP(c.pid); if (r.guild && await getG(r.guild)) return send(c, { t: 'note', msg: 'คุณมีกิลด์อยู่แล้ว' }); const name = cleanName(m.name), tag = clamp(m.tag, 4).toUpperCase().replace(/[^A-Z0-9ก-๙]/g, '');
      if (name.length < 2 || tag.length < 2) return send(c, { t: 'note', msg: 'ชื่อกิลด์ 2–20 ตัว แท็ก 2–4 ตัว' }); const ix = await gIndex();
      for (const id of ix) { const g = await getG(id); if (g && (g.name.toLowerCase() === name.toLowerCase() || g.tag === tag)) return send(c, { t: 'note', msg: 'ชื่อหรือแท็กกิลด์นี้มีคนใช้แล้ว' }); }
      const id = Date.now().toString(36) + (seq++).toString(36) + Math.random().toString(36).slice(2, 6); const g = { id, name, tag, leader: c.pid, created: Date.now(), members: [{ pid: c.pid, name: r.name, role: 'leader' }], requests: [] };
      await putG(g); ix.push(id); await storage.put('gidx', ix); await setGuild(c.pid, id); send(c, { t: 'g_info', guild: await guildView(g, c.pid) }); },
    async g_list(c, m) { const q = clamp(m.q, 20).toLowerCase(); const out = []; for (const id of await gIndex()) { const g = await getG(id); if (!g) continue; if (q && !g.name.toLowerCase().includes(q) && !g.tag.toLowerCase().includes(q)) continue; const ld = await getP(g.leader);
        out.push({ id: g.id, name: g.name, tag: g.tag, n: g.members.length, max: maxGuild, leader: ld ? ld.name : '?', on: g.members.filter(x => online.has(x.pid)).length, asked: !!(c.pid && g.requests.some(x => x.pid === c.pid)) }); if (out.length >= 100) break; }
      out.sort((a, b) => b.on - a.on || b.n - a.n); send(c, { t: 'g_list', guilds: out }); },
    async g_req(c, m) { if (!c.pid) return; const r = await getP(c.pid); if (r.guild && await getG(r.guild)) return send(c, { t: 'note', msg: 'ออกจากกิลด์เดิมก่อน' }); const g = await getG(String(m.id || '')); if (!g) return send(c, { t: 'note', msg: 'ไม่พบกิลด์' });
      if (g.members.length >= maxGuild) return send(c, { t: 'note', msg: 'กิลด์เต็มแล้ว' }); if (g.requests.some(x => x.pid === c.pid)) return send(c, { t: 'note', msg: 'ส่งคำขอไปแล้ว รอหัวหน้ากิลด์ตอบ' });
      g.requests.push({ ...card(r), msg: clamp(m.msg, 60), at: Date.now() }); if (g.requests.length > 30) g.requests.shift(); await putG(g); send(c, { t: 'note', msg: `ส่งคำขอเข้ากิลด์ ${g.name} แล้ว` });
      for (const x of g.members) if (x.role !== 'member') toPid(x.pid, { t: 'g_reqin', from: card(r), guild: g.name }); await pushGuild(g); },
    async g_ans(c, m) { if (!c.pid) return; const r = await getP(c.pid); const g = await getG(r.guild); if (!g) return; const me = g.members.find(x => x.pid === c.pid); if (!me || me.role === 'member') return;
      const pid = String(m.pid || ''); const rq = g.requests.find(x => x.pid === pid); if (!rq) return; g.requests = g.requests.filter(x => x.pid !== pid); const u = await getP(pid);
      if (m.ok && u && !(u.guild && await getG(u.guild)) && g.members.length < maxGuild) { g.members.push({ pid, name: u.name, role: 'member' }); await setGuild(pid, g.id); toPid(pid, { t: 'note', msg: `ได้รับเข้ากิลด์ ${g.name} แล้ว!` }); }
      else toPid(pid, { t: 'note', msg: `คำขอเข้ากิลด์ ${g.name} ไม่ผ่าน` }); await putG(g); await pushGuild(g); if (m.ok) toPid(pid, { t: 'g_info', guild: await guildView(g, pid) }); },
    async g_leave(c) { if (!c.pid) return; const r = await getP(c.pid); const g = await getG(r.guild); r.guild = null; await putP(r); send(c, { t: 'g_info', guild: null }); if (!g) return;
      g.members = g.members.filter(x => x.pid !== c.pid); if (!g.members.length) return delG(g.id); if (g.leader === c.pid) { const nx = g.members.find(x => x.role === 'officer') || g.members[0]; nx.role = 'leader'; g.leader = nx.pid; } await putG(g); await pushGuild(g); },
    async g_kick(c, m) { if (!c.pid) return; const r = await getP(c.pid); const g = await getG(r.guild); if (!g || g.leader !== c.pid) return; const pid = String(m.pid || ''); if (pid === c.pid || !g.members.some(x=>x.pid===pid)) return; g.members = g.members.filter(x => x.pid !== pid); await setGuild(pid, null); toPid(pid, { t: 'g_info', guild: null }); toPid(pid, { t: 'note', msg: `คุณถูกนำออกจากกิลด์ ${g.name}` }); await putG(g); await pushGuild(g); },
    async g_rank(c, m) { if (!c.pid) return; const r = await getP(c.pid); const g = await getG(r.guild); if (!g || g.leader !== c.pid) return; const x = g.members.find(y => y.pid === String(m.pid || '')); if (!x || x.pid === c.pid) return; x.role = m.role === 'officer' ? 'officer' : 'member'; await putG(g); await pushGuild(g); },
    async g_chat(c, m) { if (!c.pid) return; const r = await getP(c.pid); const g = await getG(r.guild); if (!g) return; const text = clamp(m.text, 120).trim(); if (!text) return; for (const x of g.members) toPid(x.pid, { t: 'g_chat', from: card(r), text }); },
    async g_info(c) { if (!c.pid) return; const r = await getP(c.pid); const g = await getG(r.guild); send(c, { t: 'g_info', guild: g ? await guildView(g, c.pid) : null }); }
  };
  // ---------- host API ----------
  return {
    connect(sock) { const c = { id: Math.random().toString(16).slice(2, 14), sock, pid: null, lp: null, rooms: new Map(), rp: new Map(), rps: new Map(), budget: 80 }; clients.add(c); send(c, { t: 'hi', id: c.id, features: { sharedFarm: 1, onlineAuthority: 2 } }); return c; },
    async message(c, data) { if (--c.budget < 0) return; if ((typeof data === 'string' ? data.length : data?.byteLength || 0) > 2 * 1024 * 1024) return; let m; try { m = JSON.parse(typeof data === 'string' ? data : new TextDecoder().decode(data)); } catch (e) { return; } if (!m || typeof m !== 'object' || typeof m.t !== 'string') return; if (m.t.startsWith('online_') || m.t.startsWith('account_')) { await authority.message(c,m); return; } if (m.t.startsWith('world_')) { try { await farm.message(c, m); } catch (e) { send(c, { t: 'world_error', error: 'server_error' }); } return; } const h = H[m.t]; if (!h) return; try { await h(c, m); } catch (e) { send(c, { t: 'note', msg: 'เซิร์ฟเวอร์ผิดพลาด ลองใหม่' }); } },
    disconnect(c) { const persisted=authority.leave(c); farm.leave(c); for (const room of [...c.rooms.keys()]) leaveRoom(c, room); clients.delete(c); if (c.pid && online.get(c.pid) === c) { online.delete(c.pid); getP(c.pid).then(r => { if (r) { r.last = Date.now(); putP(r); for (const f of r.friends) pushFriends(f); if (r.guild) getG(r.guild).then(g => g && pushGuild(g)); } }); } return persisted; },
    tickFast() { authority.tick().catch(e=>console.error('Authority tick:',e.message)); farm.tick(); const budgetNow=Date.now(), refill=Math.min(1,Math.max(0,(budgetNow-budgetTime)/1000))*40;budgetTime=budgetNow;for (const c of clients) c.budget = Math.min(80,c.budget+refill);
      for (const ch of channels.values()) { if (!ch.dirty.size && !ch.gone.length) continue; const msg = JSON.stringify({ t: 'pd', room: ch.room, upd: [...ch.dirty].map(m => ({ peer: m.id, presence: m.rp.get(ch.room) })), gone: ch.gone }); ch.dirty.clear(); ch.gone = []; for (const m of ch.members) send(m, msg); } },
    tickLobby() { const by = {}, counts = {}; for (const c of clients) { const p = c.lp; if (!p || !p.srv) continue; const s = clamp(p.srv, 8); counts[s] = (counts[s] || 0) + 1; (by[s] = by[s] || []).push(c); }
      const peers = []; for (const s in by) { by[s].sort((a, b) => (b.lp.lv || 0) - (a.lp.lv || 0)); for (const c of by[s].slice(0, lobbyPer)) peers.push({ peer: c.id, presence: { ...c.lp, pid: c.pid || '' } }); }
      const msg = JSON.stringify({ t: 'lobby', peers, counts }); for (const c of clients) send(c, msg); },
    flush() { return authority.flush(); },
    stats() { return { clients: clients.size, players: online.size, channels: channels.size, authority: authority.stats() }; }
  };
}
