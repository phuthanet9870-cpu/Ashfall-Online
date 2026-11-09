'use strict';
/* Free online play over the artifact's live room (no server of our own).
   · 4 servers; each server × map is its own named room, so you only meet people on the same server and map.
   · Everyone shares position, facing, class look, level, wings and chat line through presence (≈10/s, absolute state).
   · Real players appear as characters with a ★ name tag, smooth-interpolated, with speech bubbles; their chat goes to the log.
   · The lobby carries {server, map, name, level} so the server list shows live player counts.
   Without the room (offline file, signed-out viewer) the game simply stays single-player. */
(function (G) {
  const U = G.U, D = G.D, S = G.S, UI = G.UI, W = G.W, E = G.E, SPR = G.SPR; const esc = UI.esc; const $ = s => document.querySelector(s);
  const SERVERS = [['s1', 'Aurelion-1'], ['s2', 'Aurelion-2'], ['s3', 'Solaris'], ['s4', 'Umbra']];
  const LS = 'ashfall_server'; const srv = () => { try { const v = globalThis.ASHFALL_STORAGE.getItem(LS); if (SERVERS.some(s => s[0] === v)) return v; } catch (e) { } return 's1'; };
  const setSrv = v => { try { globalThis.ASHFALL_STORAGE.setItem(LS, v); } catch (e) { } };
  let room = null, cur = null, curKey = '', ghosts = new Map(), lastSay = new Map(), sendT = 0, status = 'offline';
  G.ONLINE = { get roomKey() { return curKey; }, get channel() { return window.ASHFALL_NET?.channel || 1; } };
  const clean = s => String(s || '').toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 30) || 'map';
  const keyNow = () => { const m = W.map, md = W.mode; if (!m || !W.player || !md || ['dungeon', 'pvp', 'siege', 'gallery'].includes(md.kind)) return ''; return `${srv()}-${clean(m.id)}`; };
  const lookOf = () => { const s = S.save; const f = s && s.fashion && s.fashion.eq && s.fashion.eq.f_wings; return { c: s.cls, w: f ? [f.theme || 0, f.dye || f.colors[0], f.colors[1], f.tier || 1] : null }; };
  // ---------- connect ----------
  const start = async () => { try { if (!window.claude || !window.claude.use) return; const r = await window.claude.use('room'); if (!r) { status = 'offline'; return; } room = r; status = 'lobby';
      room.onConnection(c => { status = c ? (cur ? 'online' : 'lobby') : 'reconnecting'; badge(); }, () => { status = 'offline'; badge(); });
      room.onPeers(() => { badge(); if (UI.panel && UI.panel.id === 'online') UI.renderPanel(); }, () => { });
      setInterval(tick, 100); requestAnimationFrame(lerp); } catch (e) { status = 'offline'; } };
  setTimeout(start, 0);
  const switchRoom = async (k) => { if (k === curKey) return; curKey = k; for (const g of ghosts.values()) { g.dead = true; g.removeMe = true; const i = W.units.indexOf(g); if (i >= 0) W.units.splice(i, 1); } ghosts.clear();
    if (cur) { try { await cur.leave(); } catch (e) { } cur = null; } if (!k || !room) { status = room ? 'lobby' : 'offline'; badge(); return; }
    try { const r = await room.join(k); if (curKey !== k) { r.leave(); return; } cur = r; status = 'online'; cur.onPeers(ch => sync(ch.peers), () => { cur = null; curKey = ''; }); sync(cur.peers()); } catch (e) { status = 'lobby'; curKey = ''; } badge(); };
  // ---------- send my state ----------
  const tick = () => { if (!room) return; const k = keyNow(); if (k !== curKey) switchRoom(k); const p = W.player, s = S.save; const now = performance.now();
    const lobby = { srv: srv(), map: W.map ? W.map.id : '', n: s ? String(s.name).slice(0, 14) : '', lv: s ? s.lvl : 0, c: s ? s.cls : '' };
    if (now - sendT < 95) return; sendT = now; try { room.presence(lobby); } catch (e) { }
    if (!cur || !p || !s) return; const say = p.say && p.sayT > W.time ? String(p.say).slice(0, 80) : '';
    const pr = { n: lobby.n, lv: s.lvl, x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100, fx: p.fx < 0 ? -1 : 1, fy: Math.round((p.fy || 0) * 10) / 10, mv: p.moving ? 1 : 0, dead: p.dead ? 1 : 0, hp: Math.round(100 * p.hp / p.maxhp), say, sid: say ? (p._sayId = p._sayId && p._lastSay === say ? p._sayId : (p._lastSay = say, Date.now())) : 0, ...lookOf() };
    cur.presence(pr).catch(() => { }); };
  // ---------- other players ----------
  const sync = (peers) => { if (G.SHARED_WORLD?.active) return; const seen = new Set(); if (!W.map) return;
    for (const pe of peers) { if (pe.isMe || pe.kind !== 'viewer') continue; const q = pe.presence || {}; if (typeof q.x !== 'number' || typeof q.y !== 'number') continue; seen.add(pe.peer);
      let g = ghosts.get(pe.peer); const cls = D.CLS[q.c] ? q.c : 'blademaster';
      if (!g || g.cls !== cls || W.units.indexOf(g) < 0) { if (g) { const i = W.units.indexOf(g); if (i >= 0) W.units.splice(i, 1); }
        g = E.mkUnit({ kind: 'npc', team: 9, x: q.x, y: q.y, name: '★ ' + String(q.n || 'ผู้เล่น').slice(0, 14), look: SPR.lookFor(cls), sim: true, label: false, st: { def: 0 } }); g.cls = cls; g.online = pe.peer; g.tx = q.x; g.ty = q.y; E.spawn(g); ghosts.set(pe.peer, g); }
      g.name = '★ ' + String(q.n || 'ผู้เล่น').slice(0, 14) + (q.lv ? ` Lv${q.lv | 0}` : ''); g.tx = q.x; g.ty = q.y; g.fx = q.fx < 0 ? -1 : 1; g.fy = +q.fy || 0; g.netMove = !!q.mv; g.alpha = q.dead ? 0.4 : 1; g.guest = pe.guest;
      g.fashion = Array.isArray(q.w) ? { f_wings: { slot: 'f_wings', kind: 'fashion', theme: q.w[0] | 0, colors: [String(q.w[1]).slice(0, 9), String(q.w[2]).slice(0, 9)], tier: q.w[3] | 0 } } : null;
      if (q.say && q.sid && lastSay.get(pe.peer) !== q.sid) { lastSay.set(pe.peer, q.sid); g.say = String(q.say).slice(0, 80); g.sayT = W.time + 4; UI.log(`${String(q.n || 'ผู้เล่น').slice(0, 14)}: ${g.say}`, 'chat'); } }
    for (const [k, g] of ghosts) if (!seen.has(k)) { const i = W.units.indexOf(g); if (i >= 0) W.units.splice(i, 1); ghosts.delete(k); } };
  const lerp = () => { for (const g of ghosts.values()) { if (g.tx == null) continue; const dx = g.tx - g.x, dy = g.ty - g.y, d = Math.hypot(dx, dy); if (d > 8) { g.x = g.tx; g.y = g.ty; } else { g.x += dx * 0.22; g.y += dy * 0.22; } g.moving = g.netMove || d > 0.05; if (g.anim) g.anim.t = (g.anim.t || 0) + 0.016; } requestAnimationFrame(lerp); };
  const on0 = UI.openNpc; UI.openNpc = (npc) => { if (npc && npc.online) { UI.toast(`${npc.name}${npc.guest ? ' (แขก)' : ''} — ผู้เล่นออนไลน์จริง · พิมพ์ทักได้ด้วย Enter`, 'info'); return; } return on0(npc); };
  // ---------- servers panel & badge ----------
  const lobbyPeers = () => room && (!window.ASHFALL_NET || window.ASHFALL_NET.connected) ? room.peers().filter(p => p.kind === 'viewer') : [];
  UI.PANELS.online = { title: 'ออนไลน์ & เซิร์ฟเวอร์', render() { const ps = lobbyPeers(); const me = srv();
    const cnt = id => ps.filter(p => (p.presence || {}).srv === id).length;
    const list = ps.filter(p => (p.presence || {}).srv === me && (p.presence || {}).n).map(p => p.presence).sort((a, b) => (b.lv | 0) - (a.lv | 0));
    const mapName = id => { const f = (D.FARM_MAPS || []).find(m => m.id === id); return f ? f.th : id === 'aurelion' ? 'นครออเรเลียน' : String(id || '-'); };
    return `<p class="muted">${window.ASHFALL_NET && !window.ASHFALL_NET.connected ? '🔴 ยังไม่เชื่อมต่อ Cloudflare Worker: ' + esc(window.ASHFALL_NET.error || 'กำลังลองเชื่อมต่อ…') : room ? (G.SHARED_WORLD?.active&&!G.SHARED_WORLD.ready ? '🟡 กำลังยืนยันตัวตนและเข้าโลกเกม' : status === 'online' ? '🟢 เชื่อมต่อแล้ว — ผู้เล่นในเซิร์ฟเวอร์และแมพเดียวกันจะเห็นกัน' : status === 'reconnecting' ? '🟡 กำลังเชื่อมต่อใหม่…' : '🟢 อยู่ในล็อบบี้ (เข้าแมพเพื่อพบผู้เล่น)') : '⚪ ยังไม่ได้เริ่มการเชื่อมต่อออนไลน์'}</p>
      <h4>เลือกเซิร์ฟเวอร์</h4><div class="onsrv">${SERVERS.map(([id, n]) => `<button class="onsv ${id === me ? 'on' : ''}" data-act="on-srv" data-v="${id}"><b>${esc(n)}</b><small>${room ? cnt(id) + ' คนออนไลน์' : '—'}</small></button>`).join('')}</div>
      <h4>ผู้เล่นออนไลน์ใน ${esc((SERVERS.find(s => s[0] === me) || SERVERS[0])[1])} (${list.length})</h4>
      <table class="tbl small"><tr><th>ชื่อ</th><th>อาชีพ</th><th>เลเวล</th><th>อยู่ที่</th></tr>${list.map(q => `<tr><td>${esc(String(q.n).slice(0, 14))}</td><td>${esc((D.CLS[q.c] || {}).name || '-')}</td><td>${q.lv | 0}</td><td>${esc(mapName(q.map))}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">ยังไม่มีใครออนไลน์ในเซิร์ฟเวอร์นี้</td></tr>'}</table>
      <p class="muted">พิมพ์แชท: กด Enter · ข้อความจะขึ้นบนหัวและในช่องแชทของทุกคนในแมพเดียวกัน · ตัวละคร กระเป๋า และเซฟยังแยกในเครื่องของแต่ละคน · ${G.SHARED_WORLD?.active ? (G.SHARED_WORLD.ready ? 'แมพฟาร์มใช้สถานะกลางจากเซิร์ฟเวอร์ · ของดรอปใครเก็บก่อนคนนั้นได้' : 'กำลังรอสถานะแมพจากเซิร์ฟเวอร์') : 'โหมดนี้ยังใช้การจำลองต่อสู้ในเครื่อง'}</p>`; } };
  const a0 = UI.act; UI.act = (el, e) => { if (el.dataset.act === 'on-srv') { setSrv(el.dataset.v); curKey = '__'; switchRoom(keyNow()); UI.toast(`ย้ายไปเซิร์ฟเวอร์ ${(SERVERS.find(s => s[0] === el.dataset.v) || [])[1]}`, 'good'); UI.renderPanel(); return; } return a0(el, e); };
  const badgeEl = document.createElement('button'); badgeEl.id = 'onbadge'; badgeEl.dataset.act = 'panel'; badgeEl.dataset.p = 'online'; document.body.appendChild(badgeEl);
  const badge = () => { const ps = lobbyPeers().filter(p => (p.presence || {}).srv === srv()).length; const n = (SERVERS.find(s => s[0] === srv()) || SERVERS[0])[1]; badgeEl.innerHTML = `<i class="${window.ASHFALL_NET && (!window.ASHFALL_NET.connected || !window.ASHFALL_NET.authed || G.SHARED_WORLD?.active&&!G.SHARED_WORLD.ready) ? 'reconnecting' : status}"></i>${esc(n)} · ${ps} ออนไลน์`; badgeEl.hidden = !W.player; };
  setInterval(badge, 1000);
  const css = document.createElement('style'); css.textContent = `#onbadge{position:fixed;left:50%;top:44px;transform:translateX(-50%);z-index:60;display:flex;align-items:center;gap:6px;padding:3px 12px;border-radius:12px;border:1px solid #6a5428;background:rgba(14,12,10,.85);color:#f2e6c8;font:12px Kanit,sans-serif;cursor:pointer}#onbadge[hidden]{display:none}#onbadge i{width:8px;height:8px;border-radius:50%;background:#7a7a7a}#onbadge i.online,#onbadge i.lobby{background:#5ae05a;box-shadow:0 0 6px #5ae05a}#onbadge i.reconnecting{background:#ffd04a}
  .onsrv{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}.onsv{display:flex;flex-direction:column;gap:2px;padding:10px;border-radius:9px;border:1px solid #4a3c22;background:#16130f;color:#f2e6c8;cursor:pointer;font-family:inherit;text-align:left}.onsv.on{border-color:#f2d27a;box-shadow:0 0 0 1px #f2d27a}.onsv small{color:#7ae07a}`; document.head.appendChild(css);
})(window.G);
