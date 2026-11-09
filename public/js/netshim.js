'use strict';
/* Self-hosted online play. When the game runs on its own website (itch.io, GitHub Pages, your server …) this provides
   the small "room" API the game uses (onConnection / onPeers / peers / presence / join → sub-room) over a WebSocket to
   the Ashfall server (Cloudflare Worker or Node), plus window.ASHFALL_NET for friends / guilds / whispers.
   Inside claude.ai the built-in room is used and this file does nothing. */
(function () {
  if (window.claude && window.claude.use) return; if (!/^https?:$/.test(location.protocol)) return;
  const CFG = window.ASHFALL_CFG || {}; const URL_ = CFG.ws || window.ASHFALL_WS || ((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
  // persistent player identity (id + secret key) — the key proves to the server that this browser owns the id
  const ls = (k, v) => { try { if (v === undefined) return globalThis.ASHFALL_STORAGE.getItem(k); globalThis.ASHFALL_STORAGE.setItem(k, v); } catch (e) { return null; } };
  const rnd = n => { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map(b => b.toString(16).padStart(2, '0')).join(''); };
  let PID = ls('ashfall_pid'); if (!/^[a-f0-9]{16}$/.test(PID || '')) { PID = rnd(8); ls('ashfall_pid', PID); }
  let KEY = ls('ashfall_key'); if (!KEY || KEY.length < 32) { KEY = rnd(16); ls('ashfall_key', KEY); }
  let guestPID = PID;
  const requests = new Map();
  const bus = new Map(); const emit = (t, m) => { for (const f of bus.get(t) || []) { try { f(m); } catch (e) { } } };
  const NET = window.ASHFALL_NET = { pid: PID, sessionToken: ls('ashfall_session') || '', connected: false, authed: false, error: '', url: URL_, peerPid: new Map(), on(t, f) { (bus.get(t) || bus.set(t, []).get(t)).push(f); }, send(o) { send(o); }, request(o) { return new Promise((resolve,reject)=>{const request=crypto.randomUUID();const timer=setTimeout(()=>{requests.delete(request);reject(new Error('request_timeout'));},20000);requests.set(request,{resolve,reject,timer});send({...o,request});}); } };
  let ws = null, myId = null, retry = 1000, authStr = '';
  const send = (o) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
  const auth = (force) => { const S = window.G && window.G.S; const s = S && S.save; if (!NET.connected || NET.signedOut || NET.authPending) return; if (NET.sessionToken) { if (NET.authed && !force) return; NET.authPending=true;send({t:'account_resume',token:NET.sessionToken}); return; } const profile=s||{name:'ผู้เล่น',cls:'blademaster',lvl:1}; const a = { t: 'auth', pid: PID, key: KEY, name: String(profile.name || '').slice(0, 20), cls: profile.cls, lv: profile.lvl | 0 }; const str = JSON.stringify(a); if (!force && str === authStr) return; authStr = str; NET.authPending=true;send(a); };
  NET.enterGuest=async()=>{
    if(NET.sessionToken||NET.signedOut)await NET.request({t:'account_logout'});
    if(NET.authed)return;
    await new Promise((resolve,reject)=>{let finished=false;const timer=setTimeout(()=>{finished=true;reject(new Error('auth_timeout'));},20000);NET.on('me',()=>{if(finished)return;finished=true;clearTimeout(timer);resolve();});authStr='';auth(true);});
  };
  setInterval(() => auth(false), 2000);
  const makeRoom = () => {
    let connected = false, lastLobby = null, lobbyStr = '', lobbyT = 0;
    const connCbs = [], peerCbs = [], lobby = new Map(), subs = new Map();
    const asPeers = (map) => [...map].map(([peer, presence]) => ({ peer, presence, kind: 'viewer', isMe: peer === myId }));
    const connect = () => { try { ws = new WebSocket(URL_); NET.error = ''; } catch (e) { NET.error = 'WebSocket URL ไม่ถูกต้อง: ' + (e.message || e); console.error('[Ashfall Online] WebSocket URL:', URL_, e); setTimeout(connect, retry); return; }
      ws.onopen = () => { NET.authPending=false; NET.error = ''; connected = NET.connected = true; retry = 1000; authStr = ''; auth(true); connCbs.forEach(f => { try { f(true); } catch (e) { } }); if (lastLobby) send({ t: 'lp', d: lastLobby }); for (const s of subs.values()) { s.last = ''; send({ t: 'join', room: s.name }); } emit('open', {}); };
      ws.onclose = (event) => { NET.authPending=false; NET.error = 'การเชื่อมต่อถูกปิด (code ' + event.code + ')'; const was = connected; connected = NET.connected = NET.authed = false; if (was) { connCbs.forEach(f => { try { f(false); } catch (e) { } }); emit('close', {}); } setTimeout(connect, retry + Math.random() * 1000); retry = Math.min(15000, retry * 1.6); };
      ws.onerror = (event) => { NET.error = 'เชื่อมต่อ WebSocket ไม่สำเร็จ ตรวจ URL และ Cloudflare Worker'; console.error('[Ashfall Online] WebSocket error:', URL_, event); };
      ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (er) { return; }
        if (m.request && requests.has(m.request)) { const p=requests.get(m.request);clearTimeout(p.timer);requests.delete(m.request);if(m.t==='online_error')p.reject(new Error(m.error));else p.resolve(m); }
        if (m.t === 'account_ok') { NET.authPending=false; PID = NET.pid = m.pid; NET.sessionToken=m.token;ls('ashfall_session',m.token);NET.authed=true;NET.signedOut=false; }
        if (m.t === 'account_logged_out') { NET.sessionToken='';ls('ashfall_session','');PID=NET.pid=guestPID=rnd(8);KEY=rnd(16);ls('ashfall_pid',PID);ls('ashfall_key',KEY);NET.authPending=false;NET.authed=false;NET.signedOut=false;authStr=''; }
        if (m.t === 'kicked') { NET.authPending=false;NET.authed=false;NET.signedOut=true;NET.sessionToken='';ls('ashfall_session','');emit('login_required',m); }
        if(m.t==='online_error'&&['session_expired','invalid_session'].includes(m.error)){NET.authPending=false;NET.authed=false;NET.signedOut=true;NET.sessionToken='';ls('ashfall_session','');emit('login_required',m);}
        if (m.t === 'hi') { myId = m.id; NET.features = m.features || {}; return; }
        if (m.t === 'me') { NET.authPending=false;NET.authed = true; }
        if(m.t==='auth_fail'){
          NET.authPending=false;NET.authed=false;authStr='';
          // A guest identity can remain in browser storage after it was linked to an account.
          // Never reuse an account-locked guest key or pretend its lobby socket is authenticated.
          if(!NET.sessionToken&&['account_login_required','key','bad id'].includes(m.why)){
            PID=NET.pid=guestPID=rnd(8);KEY=rnd(16);ls('ashfall_pid',PID);ls('ashfall_key',KEY);auth(true);
          }else NET.error='ยืนยันตัวตนไม่สำเร็จ: '+m.why;
        }
        if(m.t==='online_error'&&m.error==='auth_required'&&!NET.signedOut){
          NET.authed=false;NET.authPending=false;authStr='';emit('auth_lost',m);auth(true);
        }
        if (m.t === 'lobby') { lobby.clear(); for (const p of m.peers || []) { lobby.set(p.peer, p.presence); if (p.presence && p.presence.pid) NET.peerPid.set(p.peer, p.presence.pid); } api.counts = m.counts || {}; peerCbs.forEach(f => { try { f({ peers: api.peers() }); } catch (er) { } }); emit('lobby', m); return; }
        if (m.t === 'snap' || m.t === 'pd') { const s = subs.get(m.room); if (!s) return; if (m.t === 'snap') { s.map.clear(); s.channel = m.ch; NET.channel = m.ch; }
          for (const p of m.upd || []) { s.map.set(p.peer, p.presence); if (p.presence && p.presence.pid) NET.peerPid.set(p.peer, p.presence.pid); } for (const g of m.gone || []) s.map.delete(g); s.cbs.forEach(f => { try { f({ peers: s.peers() }); } catch (er) { } }); return; }
        emit(m.t, m); }; };
    const api = {
      counts: {},
      onConnection(cb) { connCbs.push(cb); if (connected) cb(true); },
      onPeers(cb) { peerCbs.push(cb); },
      peers() { return asPeers(lobby); },
      presence(d) { lastLobby = d; const str = JSON.stringify(d); const now = Date.now(); if (now - lobbyT < 1000) return; if (str === lobbyStr && now - lobbyT < 5000) return; lobbyStr = str; lobbyT = now; send({ t: 'lp', d }); },
      async join(name) { const s = { name, map: new Map(), cbs: [], channel: 1, last: '', lastT: 0,
          peers() { return asPeers(this.map); }, onPeers(cb) { this.cbs.push(cb); },
          async presence(d) { const now = Date.now(); if (now - this.lastT < 160) return; const o = Object.assign({}, d, { pid: PID }); const str = JSON.stringify(o); if (str === this.last && now - this.lastT < 3000) return; this.last = str; this.lastT = now; send({ t: 'rp', room: name, d: o }); },
          async leave() { subs.delete(name); send({ t: 'leave', room: name }); } };
        subs.set(name, s); send({ t: 'join', room: name }); return s; }
    };
    connect(); return api; };
  let R = null; window.claude = Object.assign(window.claude || {}, { use: async (cap) => cap === 'room' ? (R || (R = makeRoom())) : null });
})();
