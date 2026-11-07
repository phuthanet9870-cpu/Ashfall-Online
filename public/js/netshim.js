'use strict';
/* Self-hosted online play: when the game runs on its own website (not inside claude.ai), provide the same small
   "room" API the game uses (onConnection / onPeers / peers / presence / join → sub-room) over a WebSocket to the
   Ashfall Node server. Inside claude.ai the built-in room is used instead and this file does nothing. */
(function () {
  if (window.claude && window.claude.use) return; if (!/^https?:$/.test(location.protocol)) return;
  const URL_ = window.ASHFALL_WS || ((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
  const makeRoom = () => {
    let ws = null, myId = null, connected = false, lastLobby = null, lobbyStr = '', lobbyT = 0, retry = 1000;
    const connCbs = [], peerCbs = [], lobby = new Map(), subs = new Map();
    const send = (o) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
    const asPeers = (map) => [...map].map(([peer, presence]) => ({ peer, presence, kind: 'viewer', isMe: peer === myId }));
    const connect = () => { try { ws = new WebSocket(URL_); } catch (e) { setTimeout(connect, retry); return; }
      ws.onopen = () => { connected = true; retry = 1000; connCbs.forEach(f => { try { f(true); } catch (e) { } }); if (lastLobby) send({ t: 'lp', d: lastLobby }); for (const s of subs.values()) send({ t: 'join', room: s.name }); };
      ws.onclose = () => { const was = connected; connected = false; if (was) connCbs.forEach(f => { try { f(false); } catch (e) { } }); setTimeout(connect, retry + Math.random() * 1000); retry = Math.min(15000, retry * 1.6); };
      ws.onerror = () => { };
      ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (er) { return; }
        if (m.t === 'hi') { myId = m.id; return; }
        if (m.t === 'lobby') { lobby.clear(); for (const p of m.peers || []) lobby.set(p.peer, p.presence); api.counts = m.counts || {}; peerCbs.forEach(f => { try { f({ peers: api.peers() }); } catch (er) { } }); return; }
        if (m.t === 'snap' || m.t === 'pd') { const s = subs.get(m.room); if (!s) return; if (m.t === 'snap') { s.map.clear(); s.channel = m.ch; }
          for (const p of m.upd || []) s.map.set(p.peer, p.presence); for (const g of m.gone || []) s.map.delete(g); s.cbs.forEach(f => { try { f({ peers: s.peers() }); } catch (er) { } }); } }; };
    const api = {
      counts: {},
      onConnection(cb, end) { connCbs.push(cb); if (connected) cb(true); },
      onPeers(cb) { peerCbs.push(cb); },
      peers() { return asPeers(lobby); },
      presence(d) { lastLobby = d; const str = JSON.stringify(d); const now = Date.now(); if (str === lobbyStr && now - lobbyT < 5000) return; lobbyStr = str; lobbyT = now; send({ t: 'lp', d }); },
      async join(name) { const s = { name, map: new Map(), cbs: [], channel: 1,
          peers() { return asPeers(this.map); }, onPeers(cb) { this.cbs.push(cb); },
          async presence(d) { send({ t: 'rp', room: name, d }); }, async leave() { subs.delete(name); send({ t: 'leave', room: name }); } };
        subs.set(name, s); send({ t: 'join', room: name }); return s; }
    };
    connect(); return api; };
  let R = null; window.claude = Object.assign(window.claude || {}, { use: async (cap) => cap === 'room' ? (R || (R = makeRoom())) : null });
})();
