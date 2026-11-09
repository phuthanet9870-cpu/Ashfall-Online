'use strict';
/* Online social layer (self-hosted builds):
   · No fake players: town/field "sim" players, wandering bots and field PvP wanderers are not spawned (real online
     players still appear). PvP / guild war / world boss keep their AI teams so those modes still work.
   · Friends: send / accept / decline requests, see who is online (server + map), whisper, remove.
   · Guilds: create an online guild, browse guilds, request to join, leader/officers approve or deny, members with
     online status, promote/kick, leave, guild chat (type "/g ข้อความ" in chat or use the guild tab).
   · Click a real player in the world → add friend / whisper / invite to guild. */
(function (G) {
  const U = G.U, D = G.D, S = G.S, UI = G.UI, W = G.W, E = G.E; const esc = UI.esc; const $ = s => document.querySelector(s);
  const CFG = window.ASHFALL_CFG || {}; const NET = window.ASHFALL_NET;
  // ---------- 1) no fake players ----------
  if (CFG.noBots !== false && NET) {
    const fake = u => !!u && !u.online && (u.wanderBot || u.wanderer || (u.kind === 'npc' && u.sim));
    const sp0 = E.spawn; E.spawn = function (u) { if (fake(u)) return u; return sp0.apply(this, arguments); };
    const up0 = E.update; E.update = function () { const L = W.units; if (L) for (let i = L.length - 1; i >= 0; i--) if (fake(L[i])) L.splice(i, 1); return up0.apply(this, arguments); };
  }
  if (!NET) return; // inside claude.ai: nothing below (no server for friends/guilds there)
  const st = G.SOCIAL = { friends: [], incoming: [], guild: null, guilds: [], pms: [], gchat: [], lobby: [] };
  const rerender = (...ids) => { if (UI.panel && ids.includes(UI.panel.id)) UI.renderPanel(); };
  const markMenu = () => { const b = $('#menu [data-p=friends]'); if (b) b.classList.toggle('hasnew', st.incoming.length > 0); };
  // ---------- network events ----------
  NET.on('note', m => UI.toast(m.msg, 'info'));
  NET.on('auth_fail', () => UI.toast('เชื่อมต่อบัญชีออนไลน์ไม่สำเร็จ (รหัสไม่ตรง)', 'bad'));
  NET.on('kicked', () => UI.toast('บัญชีนี้ถูกเปิดเล่นจากที่อื่น', 'bad'));
  NET.on('fr_list', m => { st.friends = m.friends || []; st.incoming = m.incoming || []; markMenu(); rerender('friends'); });
  NET.on('fr_in', m => { UI.toast(`${m.from.name} ส่งคำขอเป็นเพื่อน — เปิดเมนู "เพื่อน" เพื่อตอบรับ`, 'good'); UI.log(`[เพื่อน] ${m.from.name} ขอเป็นเพื่อน`, 'sys'); });
  NET.on('pm', m => { st.pms.push({ from: m.from.name, pid: m.from.pid, text: m.text, me: false, t: Date.now() }); if (st.pms.length > 80) st.pms.shift(); UI.log(`[กระซิบจาก ${m.from.name}] ${m.text}`, 'chat'); UI.toast(`💬 ${m.from.name}: ${m.text}`, 'info'); rerender('friends'); });
  NET.on('pm_ok', m => { const f = st.friends.find(x => x.pid === m.to); st.pms.push({ from: 'คุณ → ' + (f ? f.name : ''), pid: m.to, text: m.text, me: true, t: Date.now() }); UI.log(`[กระซิบถึง ${f ? f.name : ''}] ${m.text}`, 'chat'); rerender('friends'); });
  NET.on('g_list', m => { st.guilds = m.guilds || []; rerender('guild'); });
  NET.on('g_reqin', m => { UI.toast(`${m.from.name} ขอเข้ากิลด์ ${m.guild}`, 'good'); UI.log(`[กิลด์] ${m.from.name} ขอเข้ากิลด์`, 'sys'); });
  NET.on('g_chat', m => { st.gchat.push({ from: m.from.name, text: m.text }); if (st.gchat.length > 60) st.gchat.shift(); UI.log(`[กิลด์] ${m.from.name}: ${m.text}`, 'chat'); rerender('guild'); });
  NET.on('g_info', m => { st.guild = m.guild; const s = S.save; if (!s) return;
    if (m.guild) { if (!s.guild || s.guild.oid !== m.guild.id) { if (!s.guild) S.createGuild(m.guild.name, m.guild.tag); s.guild.name = m.guild.name; s.guild.tag = m.guild.tag; s.guild.oid = m.guild.id; S.persist && S.persist(); S.refreshPlayer && S.refreshPlayer(); } }
    else if (s.guild && s.guild.oid) { delete s.guild.oid; s.guild = null; S.persist && S.persist(); S.refreshPlayer && S.refreshPlayer(); }
    rerender('guild'); });
  NET.on('lobby', m => { st.lobby = (m.peers || []).map(p => p.presence).filter(p => p && p.pid && p.pid !== NET.pid); });
  // ---------- friends panel ----------
  const srvName = id => ({ s1: 'Aurelion-1', s2: 'Aurelion-2', s3: 'Solaris', s4: 'Umbra' })[id] || id || '';
  UI.PANELS.friends = { title: 'เพื่อน', tabs: [['list', 'รายชื่อเพื่อน'], ['add', 'เพิ่มเพื่อน'], ['pm', 'ข้อความ']], render(tab, P) {
    if (!NET.connected) return '<p class="muted">ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์ออนไลน์</p>';
    const cls = c => esc((D.CLS[c] || {}).name || c || '-');
    if (tab === 'add') { const fr = new Set(st.friends.map(f => f.pid)); const L = st.lobby.filter(p => !fr.has(p.pid)).slice(0, 80);
      return `<p class="muted">ผู้เล่นที่ออนไลน์อยู่ตอนนี้ — กด "+ เพื่อน" เพื่อส่งคำขอ หรือคลิกผู้เล่นในแมพก็ได้</p><div class="soclist">${L.length ? L.map(p => `<div class="socrow"><b>${esc(String(p.n || 'ผู้เล่น'))}</b><small>Lv${p.lv | 0} · ${cls(p.c)} · ${esc(srvName(p.srv))}</small><button class="btn" data-act="so-add" data-pid="${p.pid}">+ เพื่อน</button></div>`).join('') : '<p class="muted">ยังไม่มีผู้เล่นคนอื่นออนไลน์</p>'}</div>`; }
    if (tab === 'pm') { P.pmTo = P.pmTo || (st.friends.find(f => f.online) || {}).pid;
      return `<div class="pmsel">${st.friends.map(f => `<button class="chip ${P.pmTo === f.pid ? 'on' : ''}" data-act="so-pmto" data-pid="${f.pid}">${f.online ? '🟢' : '⚫'} ${esc(f.name)}</button>`).join('') || '<span class="muted">ยังไม่มีเพื่อน</span>'}</div>
        <div class="pmlog">${st.pms.filter(x => !P.pmTo || x.pid === P.pmTo).slice(-40).map(x => `<div class="${x.me ? 'me' : ''}"><b>${esc(x.from)}</b> ${esc(x.text)}</div>`).join('') || '<p class="muted">ยังไม่มีข้อความ</p>'}</div>
        <div class="pmin"><input id="pmtext" maxlength="120" placeholder="พิมพ์ข้อความกระซิบ…"><button class="btn primary" data-act="so-pm">ส่ง</button></div>`; }
    const inc = st.incoming.length ? `<h4>คำขอเป็นเพื่อน (${st.incoming.length})</h4><div class="soclist">${st.incoming.map(f => `<div class="socrow"><b>${esc(f.name)}</b><small>Lv${f.lv} · ${cls(f.cls)}</small><button class="btn primary" data-act="so-ans" data-pid="${f.pid}" data-ok="1">ตอบรับ</button><button class="btn" data-act="so-ans" data-pid="${f.pid}" data-ok="0">ปฏิเสธ</button></div>`).join('')}</div>` : '';
    const L = st.friends.slice().sort((a, b) => b.online - a.online || b.lv - a.lv);
    return inc + `<h4>เพื่อน ${L.length} คน · ออนไลน์ ${L.filter(f => f.online).length}</h4><div class="soclist">${L.length ? L.map(f => `<div class="socrow ${f.online ? 'on' : ''}"><i class="dot"></i><b>${esc(f.name)}</b><small>Lv${f.lv} · ${cls(f.cls)} · ${f.online ? esc(srvName(f.srv)) + (f.map ? ' · ' + esc(f.map) : '') : 'ออฟไลน์'}</small>${f.online ? `<button class="btn" data-act="so-pmto" data-pid="${f.pid}" data-go="1">💬 กระซิบ</button>` : ''}<button class="btn" data-act="so-rm" data-pid="${f.pid}">ลบ</button></div>`).join('') : '<p class="muted">ยังไม่มีเพื่อน — ไปที่แท็บ "เพิ่มเพื่อน" หรือคลิกผู้เล่นออนไลน์ในแมพ</p>'}</div>`; } };
  // ---------- guild: online tab + join requests on the no-guild screen ----------
  const GP = UI.PANELS.guild; if (GP && !GP.tabs.find(t => t[0] === 'online')) GP.tabs.splice(1, 0, ['online', 'สมาชิกออนไลน์']);
  const guildBrowse = (P) => { if (!P._gl) { P._gl = 1; NET.send({ t: 'g_list', q: '' }); }
    return `<h4>หรือขอเข้ากิลด์ที่มีอยู่</h4><div class="pmin"><input id="gq" maxlength="20" placeholder="ค้นหาชื่อ/แท็กกิลด์"><button class="btn" data-act="so-gsearch">ค้นหา</button></div>
      <div class="soclist">${st.guilds.length ? st.guilds.map(g => `<div class="socrow"><b>[${esc(g.tag)}] ${esc(g.name)}</b><small>สมาชิก ${g.n}/${g.max} · ออนไลน์ ${g.on} · หัวหน้า ${esc(g.leader)}</small>${g.asked ? '<span class="muted">ส่งคำขอแล้ว</span>' : `<button class="btn primary" data-act="so-greq" data-id="${g.id}" ${g.n >= g.max ? 'disabled' : ''}>ขอเข้ากิลด์</button>`}</div>`).join('') : '<p class="muted">ยังไม่มีกิลด์ออนไลน์ — สร้างกิลด์แรกได้เลย</p>'}</div>`; };
  const gr0 = GP && GP.render; if (gr0) GP.render = function (tab, P) { const s = S.save;
    if (!s.guild) return gr0.call(this, tab, P) + (NET.connected ? guildBrowse(P) : '');
    if (tab !== 'online') { const h = gr0.call(this, tab, P); return !s.guild.oid && NET.connected && tab === 'info' ? `<div class="socwarn">กิลด์นี้ยังไม่ได้ลงทะเบียนออนไลน์ <button class="btn primary" data-act="so-greg">ลงทะเบียนกิลด์ออนไลน์</button></div>` + h : h; }
    const g = st.guild; if (!g) return `<p class="muted">${NET.connected ? 'กิลด์นี้ยังไม่ได้ลงทะเบียนออนไลน์' : 'ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์'}</p>${NET.connected ? '<button class="btn primary" data-act="so-greg">ลงทะเบียนกิลด์ออนไลน์</button>' : ''}`;
    const role = { leader: 'หัวหน้า', officer: 'รองหัวหน้า', member: 'สมาชิก' }; const lead = g.myRole === 'leader', staff = lead || g.myRole === 'officer';
    const req = staff && g.requests.length ? `<h4>คำขอเข้ากิลด์ (${g.requests.length})</h4><div class="soclist">${g.requests.map(r => `<div class="socrow"><b>${esc(r.name)}</b><small>Lv${r.lv} · ${esc((D.CLS[r.cls] || {}).name || '')}${r.msg ? ' · “' + esc(r.msg) + '”' : ''}</small><button class="btn primary" data-act="so-gans" data-pid="${r.pid}" data-ok="1">รับเข้า</button><button class="btn" data-act="so-gans" data-pid="${r.pid}" data-ok="0">ปฏิเสธ</button></div>`).join('')}</div>` : '';
    const mem = g.members.slice().sort((a, b) => b.online - a.online || (a.role === 'leader' ? -1 : 0));
    return `<h4>[${esc(g.tag)}] ${esc(g.name)} · สมาชิก ${g.members.length}/50 · ออนไลน์ ${g.members.filter(m => m.online).length}</h4>${req}
      <div class="soclist">${mem.map(m => `<div class="socrow ${m.online ? 'on' : ''}"><i class="dot"></i><b>${esc(m.name)}</b><small>${role[m.role]} · Lv${m.lv || '?'} · ${esc((D.CLS[m.cls] || {}).name || '')}</small>${lead && m.pid !== NET.pid ? `<button class="btn" data-act="so-grank" data-pid="${m.pid}" data-role="${m.role === 'officer' ? 'member' : 'officer'}">${m.role === 'officer' ? 'ลดเป็นสมาชิก' : 'ตั้งรอง'}</button><button class="btn danger" data-act="so-gkick" data-pid="${m.pid}">นำออก</button>` : ''}</div>`).join('')}</div>
      <h4>แชทกิลด์</h4><div class="pmlog">${st.gchat.slice(-30).map(x => `<div><b>${esc(x.from)}</b> ${esc(x.text)}</div>`).join('') || '<p class="muted">ยังไม่มีข้อความ · พิมพ์ /g ข้อความ ในแชทก็ได้</p>'}</div>
      <div class="pmin"><input id="gchat" maxlength="120" placeholder="คุยในกิลด์…"><button class="btn primary" data-act="so-gchat">ส่ง</button></div>
      <div class="list"><button class="btn danger" data-act="so-gleave">ออกจากกิลด์</button></div>`; };
  // ---------- click a real player in the world ----------
  const on0 = UI.openNpc; UI.openNpc = (npc) => { if (!npc || !npc.online) return on0(npc); const pid = NET.peerPid.get(npc.online); if (!pid) return on0(npc); const isF = st.friends.some(f => f.pid === pid); const g = st.guild;
    UI.modal(`<h2>${esc(npc.name)}</h2><p class="muted">ผู้เล่นออนไลน์จริง</p><div class="list">${isF ? `<button class="btn primary" data-act="so-pmto" data-pid="${pid}" data-go="1">💬 กระซิบ</button>` : `<button class="btn primary" data-act="so-add" data-pid="${pid}">+ เพิ่มเพื่อน</button>`}${g && g.myRole !== 'member' ? '' : ''}<button class="btn" data-act="x-close">ปิด</button></div>`); };
  // ---------- actions ----------
  const val = id => (($('#' + id) || {}).value || '').trim();
  const a0 = UI.act; UI.act = (el, e) => { const a = el.dataset.act; if (!a || !a.startsWith('so-')) { const r = a0(el, e); if (a === 'mkguild' && S.save && S.save.guild && !S.save.guild.oid && NET.connected) NET.send({ t: 'g_create', name: S.save.guild.name, tag: S.save.guild.tag }); return r; }
    const P = UI.panel || {};
    switch (a) {
      case 'so-add': NET.send({ t: 'fr_req', to: el.dataset.pid }); UI.closeModal && UI.closeModal(); break;
      case 'so-ans': NET.send({ t: 'fr_ans', from: el.dataset.pid, ok: el.dataset.ok === '1' }); break;
      case 'so-rm': NET.send({ t: 'fr_rm', pid: el.dataset.pid }); break;
      case 'so-pmto': if (el.dataset.go) { UI.closeModal && UI.closeModal(); UI.openPanel('friends', 'pm'); } UI.panel.pmTo = el.dataset.pid; UI.renderPanel(); return;
      case 'so-pm': { const t = val('pmtext'); if (t && P.pmTo) NET.send({ t: 'pm', to: P.pmTo, text: t }); const i = $('#pmtext'); if (i) i.value = ''; return; }
      case 'so-gsearch': NET.send({ t: 'g_list', q: val('gq') }); return;
      case 'so-greq': NET.send({ t: 'g_req', id: el.dataset.id, msg: '' }); setTimeout(() => NET.send({ t: 'g_list', q: '' }), 300); return;
      case 'so-greg': if (S.save.guild) NET.send({ t: 'g_create', name: S.save.guild.name, tag: S.save.guild.tag }); return;
      case 'so-gans': NET.send({ t: 'g_ans', pid: el.dataset.pid, ok: el.dataset.ok === '1' }); return;
      case 'so-gkick': NET.send({ t: 'g_kick', pid: el.dataset.pid }); return;
      case 'so-grank': NET.send({ t: 'g_rank', pid: el.dataset.pid, role: el.dataset.role }); return;
      case 'so-gchat': { const t = val('gchat'); if (t) NET.send({ t: 'g_chat', text: t }); const i = $('#gchat'); if (i) i.value = ''; return; }
      case 'so-gleave': UI.modal(`<h2>ออกจากกิลด์?</h2><p>คุณจะออกจากกิลด์ ${esc((st.guild || {}).name || '')}</p><div class="list"><button class="btn danger" data-act="so-gleave-ok">ออก</button><button class="btn" data-act="x-close">ยกเลิก</button></div>`); return;
      case 'so-gleave-ok': NET.send({ t: 'g_leave' }); UI.closeModal && UI.closeModal(); return;
    }
    UI.renderPanel(); };
  // "/g text" in the chat box → guild chat · "/w name text" → whisper a friend
  const say0 = S.say; S.say = function (u, text) { const t = String(text || ''); if (u === W.player && /^\/g\s+/i.test(t)) { NET.send({ t: 'g_chat', text: t.replace(/^\/g\s+/i, '') }); return; }
    const w = t.match(/^\/w\s+(\S+)\s+(.+)/i); if (u === W.player && w) { const f = st.friends.find(x => x.name.toLowerCase() === w[1].toLowerCase()); if (f) NET.send({ t: 'pm', to: f.pid, text: w[2] }); else UI.toast('ไม่พบเพื่อนชื่อนี้', 'bad'); return; }
    return say0.apply(this, arguments); };
  // menu button
  const bind0 = UI.bindHud; UI.bindHud = function () { const r = bind0.apply(this, arguments); const m = $('#menu'); if (m && !m.querySelector('[data-p=friends]')) { const b = document.createElement('button'); b.dataset.act = 'panel'; b.dataset.p = 'friends'; b.innerHTML = `<img src="${UI.menuIcon('guild')}" alt=""><span>เพื่อน</span>`; m.appendChild(b); } markMenu(); return r; };
  // keep guild/friends fresh when panels open
  const op0 = UI.openPanel; UI.openPanel = function (id) { const r = op0.apply(this, arguments); if (id === 'guild' && NET.connected) { NET.send({ t: 'g_info' }); if (!S.save.guild) NET.send({ t: 'g_list', q: '' }); } return r; };
  const css = document.createElement('style'); css.textContent = `.soclist{display:flex;flex-direction:column;gap:4px;max-height:46vh;overflow:auto}.socrow{display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid #3a2f1c;border-radius:8px;background:#15110c}.socrow b{color:#e8dcc0}.socrow small{flex:1;color:#9a8a6a}.socrow .dot{width:9px;height:9px;border-radius:50%;background:#555;flex:none}.socrow.on .dot{background:#5fe07a;box-shadow:0 0 6px #5fe07a}
    .pmsel{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px}.pmlog{height:220px;overflow:auto;border:1px solid #3a2f1c;border-radius:8px;padding:6px;background:#0f0c09;font-size:13px}.pmlog div{margin:2px 0}.pmlog .me{color:#9fe8ff}.pmlog b{color:#f2d27a;margin-right:4px}.pmin{display:flex;gap:6px;margin:6px 0}.pmin input{flex:1}
    .socwarn{padding:8px;margin-bottom:8px;border:1px dashed #a8843a;border-radius:8px;display:flex;align-items:center;gap:8px;justify-content:space-between}#menu [data-p=friends].hasnew::after{content:'';position:absolute;top:4px;right:4px;width:9px;height:9px;border-radius:50%;background:#ff4a4a}#menu [data-p=friends]{position:relative}`;
  document.head.appendChild(css);
})(window.G);
