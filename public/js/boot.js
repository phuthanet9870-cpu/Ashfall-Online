'use strict';
/* Boot flow: cover (tap anywhere) → loading (real progress) → login (local accounts, server select, settings, exit) → slot select.
   The art has its UI painted in; real inputs/buttons sit exactly over the painted ones (positions in % of the 1672×941 art). */
(function (G) {
  const S = G.S, UI = G.UI, D = G.D; const $ = s => document.querySelector(s); const esc = UI.esc || (s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
  const base = (() => { const s = [...document.scripts].find(x => /js\/boot\.js/.test(x.src)); return s ? s.src.replace(/js\/boot\.js.*$/, '') : ''; })();
  const ART = { cover: base + 'assets/ui/cover.webp', loading: base + 'assets/ui/loading.webp', login: base + 'assets/ui/login.webp' }; const AW = 1672, AH = 941, AR = AW / AH;
  const SERVERS = [{ id: 's1', n: 'Aurelion-1', r: 'เอเชีย', st: 'ลื่นไหล' }, { id: 's2', n: 'Aurelion-2', r: 'เอเชีย', st: 'คนเยอะ' }, { id: 's3', n: 'Solaris', r: 'ยุโรป', st: 'ลื่นไหล' }, { id: 's4', n: 'Umbra', r: 'PvP อิสระ', st: 'ลื่นไหล' }];
  const LS = { get: (k, d) => { try { const v = JSON.parse(globalThis.ASHFALL_STORAGE.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }, set: (k, v) => { try { globalThis.ASHFALL_STORAGE.setItem(k, JSON.stringify(v)); } catch (e) { } } };
  const prefs = () => LS.get('ashfall_prefs', { server: 's1', remember: true, lastAcc: '', set: {} }); const savePrefs = p => LS.set('ashfall_prefs', p);
  const accts = () => LS.get('ashfall_accounts', {}); const saveAccts = a => LS.set('ashfall_accounts', a);
  const norm = s => String(s || '').trim().toLowerCase();
  const hash = async (salt, pw) => { const txt = salt + ':' + pw; try { if (crypto && crypto.subtle) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); } } catch (e) { }
    let h1 = 0x811c9dc5, h2 = 0x1234567; for (let r = 0; r < 4000; r++) for (let i = 0; i < txt.length; i++) { h1 = Math.imul(h1 ^ txt.charCodeAt(i), 16777619) >>> 0; h2 = Math.imul(h2 ^ h1, 2246822519) >>> 0; } return 'f' + h1.toString(16) + h2.toString(16); };
  const salt = () => [...crypto.getRandomValues(new Uint8Array(12))].map(x => x.toString(16).padStart(2, '0')).join('');
  const TIPS = ['เข้ากิลด์เพื่อร่วมศึกยึดปราสาทและรับรางวัลพิเศษ', 'แตะคริสตัลจุดเซฟในหมู่บ้านและเมืองหลัก ตายแล้วจะฟื้นที่นั่น', 'ธาตุที่ชนะทางกันทำดาเมจ ×1.3 — เปิดสมุดความรู้ดูตารางธาตุ', 'บอสโลกแจกรางวัลให้ 10 อันดับดาเมจสูงสุดตามความหายาก', 'ชุดแฟชั่นและวงแหวนเวทเพิ่มค่าพลังด้วย', 'กดค้างที่หัวหน้าต่างเพื่อย้ายตำแหน่ง ระบบจะจำไว้ให้', 'เปิดออโต้แล้วตัวละครจะทำเควสและใช้สกิลเอง', 'แต่ละคลาสมีกลไกเกจเฉพาะตัว ดูได้ในหน้าสกิล'];

  // ---------- stage ----------
  const root = document.createElement('div'); root.id = 'boot'; root.innerHTML = `<div class="bk-bg"></div><div class="bk-stage"><img class="bk-art" alt="" draggable="false"><div class="bk-ui"></div></div>`; document.body.appendChild(root);
  const stage = root.querySelector('.bk-stage'), art = root.querySelector('.bk-art'), ui = root.querySelector('.bk-ui'), bg = root.querySelector('.bk-bg');
  const fit = () => { const vw = innerWidth, vh = innerHeight; const w = Math.min(Math.max(vw, vh * AR), vw / 0.56, vh * AR * 1.11); stage.style.width = w + 'px'; stage.style.height = w / AR + 'px'; root.style.setProperty('--u', (w / AW).toFixed(4) + 'px'); };
  addEventListener('resize', fit); fit();
  const box = (x, y, w, h) => `left:${x / AW * 100}%;top:${y / AH * 100}%;width:${w / AW * 100}%;height:${h / AH * 100}%`;
  let mode = null; const setArt = k => { art.src = ART[k]; bg.style.backgroundImage = `url("${ART[k]}")`; root.dataset.mode = mode = k; };
  const show = () => { root.hidden = false; const t = $('#title-screen'); if (t) t.hidden = true; const h = $('#hud'); if (h) h.hidden = true; };
  const hide = () => { root.hidden = true; ui.innerHTML = ''; mode = null; };

  // ---------- 1) cover ----------
  const cover = () => { show(); setArt('cover'); ui.innerHTML = `<button class="bk-tapall" data-bk="enter" aria-label="แตะเพื่อเข้าเกม"></button><div class="bk-tap" style="${box(436, 893, 800, 40)}">แตะที่ใดก็ได้เพื่อเข้าเกม</div>`; };
  // ---------- 2) loading ----------
  let loadDone = false;
  const loading = () => { setArt('loading'); let tip = Math.floor(Math.random() * TIPS.length);
    ui.innerHTML = `<div class="bk-bar" style="${box(400, 724, 880, 40)}"><i></i><b>0%</b></div><div class="bk-tip" style="${box(412, 812, 852, 40)}"><span>📖</span><b>เคล็ดลับ:</b> <em>${esc(TIPS[tip])}</em></div>`;
    const fill = ui.querySelector('.bk-bar i'), pct = ui.querySelector('.bk-bar b'), tipEl = ui.querySelector('.bk-tip em');
    const imgs = [ART.login, base + 'assets/deco/deco.png', base + 'assets/npc/npc.png', base + 'assets/monsters/mon48.png', ...['palace', 'cathedral', 'castle', 'house', 'shop', 'smithy', 'inn', 'guild'].map(k => base + 'assets/buildings/' + k + '.png'), ...(D.CLASSES || []).slice(0, 5).map(c => base + 'assets/classes/' + c.id + '.jpg?v=45')];
    let ok = 0; imgs.forEach(src => { const im = new Image(); im.onload = im.onerror = () => ok++; im.src = src; });
    let fontsOk = false; (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => fontsOk = true);
    const t0 = performance.now(); let shown = 0; let tipT = t0;
    const tick = () => { if (mode !== 'loading') return; const now = performance.now();
      const real = (ok / imgs.length) * 0.6 + (G.TER && G.TER.ready ? 0.2 : 0) + (G.NAT && G.NAT.ready !== false ? 0.1 : 0) + (fontsOk ? 0.1 : 0); const cap = Math.min(1, (now - t0) / 1400);
      shown += (Math.min(real, cap) - shown) * 0.12; if (real >= 0.999 && cap >= 1 && shown > 0.985) shown = 1;
      fill.style.width = (shown * 100).toFixed(1) + '%'; pct.textContent = Math.round(shown * 100) + '%';
      if (now - tipT > 3200) { tipT = now; tip = (tip + 1) % TIPS.length; tipEl.textContent = TIPS[tip]; }
      if (shown >= 1 || now - t0 > 15000) { loadDone = true; setTimeout(login, 250); return; } requestAnimationFrame(tick); };
    requestAnimationFrame(tick); };
  // ---------- 3) login ----------
  const srv = () => SERVERS.find(s => s.id === prefs().server) || SERVERS[0];
  const msg = (t, k) => { const m = ui.querySelector('.bk-msg'); if (m) { m.textContent = t; m.dataset.k = k || ''; } };
  const login = () => { setArt('login'); const P = prefs();
    ui.innerHTML = `<input class="bk-in" id="bk-acc" style="${box(660, 595, 392, 28)}" maxlength="32" autocomplete="username" placeholder="บัญชี / อีเมล" value="${esc(P.remember ? P.lastAcc || '' : '')}">
      <input class="bk-in" id="bk-pw" type="password" style="${box(660, 637, 350, 28)}" maxlength="64" autocomplete="current-password" placeholder="รหัสผ่าน (อย่างน้อย 4 ตัว)">
      <button class="bk-hot bk-eye" data-bk="eye" style="${box(1012, 636, 38, 30)}" aria-label="แสดง/ซ่อนรหัสผ่าน" title="แสดง/ซ่อนรหัสผ่าน"></button>
      <button class="bk-chk ${P.remember ? 'on' : ''}" data-bk="remember" style="${box(611, 676, 128, 24)}" aria-pressed="${!!P.remember}"><i></i><span>จดจำบัญชี</span></button>
      <button class="bk-link" data-bk="forgot" style="${box(930, 676, 132, 24)}">ลืมรหัสผ่าน?</button>
      <div class="bk-msg" style="${box(380, 892, 912, 28)}"></div>
      <button class="bk-hot bk-btn" data-bk="start" style="${box(640, 734, 392, 68)}" aria-label="เริ่มเกม"></button>
      <button class="bk-hot bk-btn" data-bk="server" style="${box(437, 838, 236, 50)}" aria-label="เลือกเซิร์ฟเวอร์"></button>
      <button class="bk-hot bk-btn" data-bk="settings" style="${box(721, 838, 233, 50)}" aria-label="ตั้งค่า"></button>
      <button class="bk-hot bk-btn" data-bk="exit" style="${box(1003, 838, 230, 50)}" aria-label="ออกจากเกม"></button>`;
    msg(`เซิร์ฟเวอร์ ${srv().n} · ถ้ายังไม่มีบัญชี ระบบจะสร้างให้`);
    setTimeout(() => { const a = $('#bk-acc'); (a && a.value ? $('#bk-pw') : a).focus(); }, 30); };
  let pendingNew = null;
  const doLogin = async () => { const accEl = $('#bk-acc'), pwEl = $('#bk-pw'); const name = (accEl.value || '').trim(), id = norm(name), pw = pwEl.value || '';
    if (id.length < 3) { msg('ชื่อบัญชีต้องมีอย่างน้อย 3 ตัวอักษร', 'bad'); accEl.focus(); return; } if (pw.length < 4) { msg('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร', 'bad'); pwEl.focus(); return; }
    const A = accts(); const a = A[id];
    if (!a) { if (pendingNew !== id) { pendingNew = id; msg(`ยังไม่มีบัญชี "${name}" — กด Start Game อีกครั้งเพื่อสร้างบัญชีใหม่`, 'warn'); return; }
      const sl = salt(); A[id] = { name, salt: sl, h: await hash(sl, pw), created: Date.now() }; saveAccts(A); pendingNew = null; }
    else if (await hash(a.salt, pw) !== a.h) { msg('รหัสผ่านไม่ถูกต้อง', 'bad'); pwEl.select(); return; }
    const P = prefs(); P.lastAcc = P.remember ? name : ''; savePrefs(P); enter(id, (A[id] || a).name); };
  const enter = (id, name) => { G.ACC = { id, name, server: srv().id }; S.useSlots(id + '@' + srv().id); hide(); UI.showTitle(); };
  // ---------- modal (server / settings / forgot / exit) ----------
  const modal = (html) => { let m = root.querySelector('.bk-modal'); if (!m) { m = document.createElement('div'); m.className = 'bk-modal'; root.appendChild(m); } m.innerHTML = `<div class="bk-mwin">${html}<button class="bk-x" data-bk="mclose" aria-label="ปิด">✕</button></div>`; m.hidden = false; };
  const closeModal = () => { const m = root.querySelector('.bk-modal'); if (m) m.hidden = true; };
  const serverModal = () => { const cur = srv().id; modal(`<h3>เลือกเซิร์ฟเวอร์</h3><p class="bk-sub">แต่ละเซิร์ฟเวอร์มีตัวละครแยกกัน (6 สล็อตต่อบัญชี)</p><div class="bk-list">${SERVERS.map(s => `<button class="bk-row ${s.id === cur ? 'on' : ''}" data-bk="pick-srv" data-id="${s.id}"><b>${esc(s.n)}</b><small>${esc(s.r)}</small><em class="${s.st === 'คนเยอะ' ? 'busy' : ''}">● ${esc(s.st)}</em></button>`).join('')}</div>`); };
  const LV = [['ต่ำ (ลื่นสุด)', 0], ['กลาง', 1], ['สูง (สวยสุด)', 2]];
  const settingsModal = () => { const st = prefs().set || {}; const chip = (k, v, l, cur) => `<button class="bk-chip ${cur === v ? 'on' : ''}" data-bk="set" data-k="${k}" data-v='${JSON.stringify(v)}'>${l}</button>`;
    modal(`<h3>ตั้งค่า</h3><p class="bk-sub">ใช้กับทุกตัวละครในบัญชีเมื่อเข้าเกม · ปรับเพิ่มได้ในเกม</p>
      <h4>คุณภาพเอฟเฟค</h4><div class="bk-chips">${LV.map(([l, v]) => chip('level', v, l, st.level ?? 1)).join('')}</div>
      <h4>แสดงเอฟเฟคสกิล</h4><div class="bk-chips">${chip('fxWho', 'all', 'ทุกคน', st.fxWho || 'all')}${chip('fxWho', 'me', 'เฉพาะฉัน', st.fxWho || 'all')}</div>
      <h4>จอสั่น</h4><div class="bk-chips">${chip('shake', true, 'เปิด', st.shake ?? true)}${chip('shake', false, 'ปิด', st.shake ?? true)}</div>
      <h4>ขนาด UI</h4><div class="bk-chips">${[80, 90, 100, 110, 120].map(z => chip('uiScale', z, z + '%', st.uiScale || 100)).join('')}</div>
      <h4>หน้าจอ</h4><div class="bk-chips"><button class="bk-chip ${document.fullscreenElement ? 'on' : ''}" data-bk="fs">${document.fullscreenElement ? 'ออกจากเต็มจอ' : 'เต็มจอ'}</button></div>`); };
  const forgotModal = () => { const a = $('#bk-acc'); modal(`<h3>ตั้งรหัสผ่านใหม่</h3><p class="bk-sub">บัญชีเก็บไว้ในเบราว์เซอร์นี้เท่านั้น จึงตั้งรหัสใหม่ได้ที่นี่เลย</p>
      <label>บัญชี<input class="bk-fin" id="bk-facc" value="${esc(a ? a.value : '')}" maxlength="32"></label><label>รหัสผ่านใหม่<input class="bk-fin" id="bk-fpw" type="password" maxlength="64"></label><label>ยืนยันรหัสผ่านใหม่<input class="bk-fin" id="bk-fpw2" type="password" maxlength="64"></label>
      <p class="bk-fmsg"></p><div class="bk-acts"><button class="bk-gold" data-bk="reset">บันทึกรหัสใหม่</button><button class="bk-plain" data-bk="mclose">ยกเลิก</button></div>`); };
  const exitModal = () => modal(`<h3>ออกจากเกม?</h3><p class="bk-sub">ความคืบหน้าบันทึกอัตโนมัติแล้ว</p><div class="bk-acts"><button class="bk-gold" data-bk="exit-yes">ออกจากเกม</button><button class="bk-plain" data-bk="mclose">ยกเลิก</button></div>`);
  const fmsg = (t) => { const e = root.querySelector('.bk-fmsg'); if (e) e.textContent = t; };
  root.addEventListener('click', async (e) => { const el = e.target.closest('[data-bk]'); if (!el) return; const a = el.dataset.bk;
    switch (a) {
      case 'enter': if (mode === 'cover') { if (loadDone) login(); else loading(); } return;
      case 'eye': { const p = $('#bk-pw'); p.type = p.type === 'password' ? 'text' : 'password'; el.classList.toggle('on', p.type === 'text'); p.focus(); return; }
      case 'remember': { const P = prefs(); P.remember = !P.remember; if (!P.remember) P.lastAcc = ''; savePrefs(P); el.classList.toggle('on', P.remember); el.setAttribute('aria-pressed', P.remember); return; }
      case 'forgot': forgotModal(); return;
      case 'start': doLogin(); return;
      case 'server': serverModal(); return;
      case 'settings': settingsModal(); return;
      case 'exit': exitModal(); return;
      case 'mclose': closeModal(); return;
      case 'pick-srv': { const P = prefs(); P.server = el.dataset.id; savePrefs(P); closeModal(); const l = root.querySelector('.bk-srv'); if (l) l.textContent = srv().n; msg(`เลือกเซิร์ฟเวอร์ ${srv().n} แล้ว`, 'good'); return; }
      case 'set': { const P = prefs(); P.set = P.set || {}; P.set[el.dataset.k] = JSON.parse(el.dataset.v); savePrefs(P); settingsModal(); return; }
      case 'fs': { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch (er) { } setTimeout(settingsModal, 150); return; }
      case 'reset': { const id = norm($('#bk-facc').value), p1 = $('#bk-fpw').value, p2 = $('#bk-fpw2').value; const A = accts();
        if (!A[id]) { fmsg('ไม่พบบัญชีนี้ในเบราว์เซอร์'); return; } if (p1.length < 4) { fmsg('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร'); return; } if (p1 !== p2) { fmsg('รหัสผ่านทั้งสองช่องไม่ตรงกัน'); return; }
        A[id].salt = salt(); A[id].h = await hash(A[id].salt, p1); saveAccts(A); closeModal(); const ac = $('#bk-acc'); if (ac) ac.value = A[id].name; const pw = $('#bk-pw'); if (pw) { pw.value = ''; pw.focus(); } msg('ตั้งรหัสผ่านใหม่แล้ว ลองเข้าสู่ระบบอีกครั้ง', 'good'); return; }
      case 'exit-yes': closeModal(); try { S.persist && S.save && S.persist(); } catch (er) { } G.ACC = null; try { window.close(); } catch (er) { } cover(); return;
    } });
  root.addEventListener('keydown', e => { if (e.key === 'Enter' && mode === 'login' && (e.target.id === 'bk-acc' || e.target.id === 'bk-pw')) { e.preventDefault(); if (e.target.id === 'bk-acc' && !$('#bk-pw').value) $('#bk-pw').focus(); else doLogin(); } if (e.key === 'Escape') closeModal(); });
  addEventListener('keydown', e => { if (!root.hidden && mode === 'cover' && !e.repeat && !['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key)) { if (loadDone) login(); else loading(); } });

  // ---------- integrate with the game ----------
  const st0 = UI.showTitle; UI.showTitle = function () { if (!G.ACC) { cover(); return; } hide(); const r = st0.apply(this, arguments);
    const h = document.querySelector('#title-screen .rohead'); if (h && !h.querySelector('.bk-acct')) h.insertAdjacentHTML('beforeend', `<span class="bk-acct">👤 ${esc(G.ACC.name)} · ${esc((SERVERS.find(s => s.id === G.ACC.server) || SERVERS[0]).n)}</span><button class="btn bk-logout" data-act="bk-logout">ออกจากระบบ</button>`); return r; };
  const a0 = UI.act; UI.act = (el, e) => { const a = el.dataset.act;
    if (a === 'bk-logout') { try { S.save && S.persist(); } catch (er) { } S.save = null; G.ACC = null; S.useSlots(null); loadDone = true; show(); login(); return; }
    if (a === 'sl-play') { const r = a0(el, e); try { const st = (prefs().set) || {}; const ss = S.save && S.save.settings; if (ss) { if (st.fxWho) ss.fxWho = st.fxWho; if (st.shake != null) ss.shake = st.shake; if (st.uiScale) { ss.uiScale = st.uiScale; UI.setUiScale && UI.setUiScale(st.uiScale); } if (st.level != null && G.V && G.V.setLevel) G.V.setLevel(st.level); } } catch (er) { } return r; }
    return a0(el, e); };
  const gt0 = S.goTown; S.goTown = function () { hide(); return gt0.apply(this, arguments); };
  const sc0 = UI.showCreate; UI.showCreate = function () { hide(); return sc0.apply(this, arguments); };
  setInterval(() => { if (!root.hidden && G.W && G.W.map && G.W.player && G.W.mode) hide(); }, 400);
  G.BOOT = { cover, login, enter: (name = 'tester', pw) => { const id = norm(name); G.ACC = { id, name, server: srv().id }; S.useSlots(id + '@' + srv().id); hide(); } };

  const css = document.createElement('style'); css.textContent = `
  #boot{position:fixed;inset:0;z-index:9000;background:#0a0c1e;overflow:hidden;font-family:Kanit,sans-serif;user-select:none}#boot[hidden]{display:none}
  #boot .bk-bg{position:absolute;inset:-40px;background-size:cover;background-position:center;filter:blur(24px) brightness(.55)}
  #boot .bk-stage{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)}
  #boot .bk-art{position:absolute;inset:0;width:100%;height:100%;display:block}
  #boot .bk-ui>*{position:absolute;box-sizing:border-box}
  #boot .bk-tapall{inset:0!important;width:100%;height:100%;background:transparent;border:0;cursor:pointer}
  #boot .bk-tap{display:flex;align-items:center;justify-content:center;pointer-events:none;color:#fff6d8;font-size:calc(var(--u)*24);font-weight:600;letter-spacing:.06em;text-shadow:0 0 calc(var(--u)*10) #2a3cff,0 2px 4px #000;animation:bkp 1.6s ease-in-out infinite}
  @keyframes bkp{0%,100%{opacity:.45}50%{opacity:1}}
  #boot .bk-bar{background:#0c1438;border-radius:calc(var(--u)*6);overflow:hidden;box-shadow:inset 0 0 calc(var(--u)*6) #000}
  #boot .bk-bar i{position:absolute;left:0;top:0;bottom:0;width:0;background:linear-gradient(180deg,#8fd0ff,#2f6dff 55%,#1c3cc8);box-shadow:0 0 calc(var(--u)*14) #5aa8ff}
  #boot .bk-bar i::after{content:"";position:absolute;right:0;top:0;bottom:0;width:calc(var(--u)*6);background:#eaf6ff;box-shadow:0 0 calc(var(--u)*12) #fff}
  #boot .bk-bar b{position:absolute;right:calc(var(--u)*22);top:50%;transform:translateY(-50%);color:#fff2cc;font:600 calc(var(--u)*20) Georgia,serif;text-shadow:0 1px 2px #000}
  #boot .bk-tip{display:flex;align-items:center;justify-content:center;gap:calc(var(--u)*6);background:#101a48;border-radius:calc(var(--u)*6);color:#e8ecff;font-size:calc(var(--u)*17);white-space:nowrap;overflow:hidden}
  #boot .bk-tip b{color:#ffd46a}#boot .bk-tip em{font-style:normal}
  #boot .bk-in{border:0;outline:none;border-radius:calc(var(--u)*3);background:#141d4e;color:#fff3d6;font:500 calc(var(--u)*17) Kanit,sans-serif;padding:0 calc(var(--u)*8);user-select:text}
  #boot .bk-in::placeholder{color:#aab4e0}#boot .bk-in:focus{box-shadow:0 0 0 calc(var(--u)*2) #ffd46a}
  #boot .bk-hot{background:transparent;border:0;cursor:pointer;border-radius:calc(var(--u)*14);transition:background .15s,box-shadow .15s}
  #boot .bk-btn:hover{background:radial-gradient(ellipse at center,rgba(150,200,255,.28),rgba(150,200,255,0) 70%);box-shadow:0 0 calc(var(--u)*20) rgba(255,215,120,.35)}#boot .bk-btn:active{background:rgba(255,255,255,.15)}
  #boot .bk-eye{background:#141d4e}#boot .bk-eye::before{content:"👁";color:#cfd6ff;font-size:calc(var(--u)*17);opacity:.6}#boot .bk-eye.on::before{opacity:1}
  #boot .bk-chk{display:flex;align-items:center;gap:calc(var(--u)*8);background:#121a46;border:0;cursor:pointer;color:#e6e6f6;font:500 calc(var(--u)*15) Kanit,sans-serif;padding:0 calc(var(--u)*3)}
  #boot .bk-chk i{width:calc(var(--u)*18);height:calc(var(--u)*18);border:calc(var(--u)*2) solid #d8c38a;border-radius:calc(var(--u)*3);background:#0c1236;display:grid;place-items:center;flex:none}
  #boot .bk-chk.on i::after{content:"✓";color:#ffe9a8;font-size:calc(var(--u)*14);font-weight:700;line-height:1}
  #boot .bk-link{background:#121a46;border:0;color:#ffd46a;text-decoration:underline;cursor:pointer;font:500 calc(var(--u)*15) Kanit,sans-serif}
  #boot .bk-msg{display:flex;align-items:center;justify-content:center;color:#dfe6ff;font-size:calc(var(--u)*14);text-shadow:0 1px 3px #000;pointer-events:none;text-align:center}
  #boot .bk-msg[data-k=bad]{color:#ff9aa8}#boot .bk-msg[data-k=warn]{color:#ffe08a}#boot .bk-msg[data-k=good]{color:#a8ffc0}
  #boot .bk-srv{display:flex;align-items:center;justify-content:center;color:#ffe9a8;font-size:calc(var(--u)*14);text-shadow:0 1px 3px #000;pointer-events:none}
  #boot .bk-modal{position:absolute;inset:0;background:rgba(6,8,24,.6);display:flex;align-items:center;justify-content:center;z-index:5}#boot .bk-modal[hidden]{display:none}
  #boot .bk-mwin{position:relative;width:min(440px,92vw);max-height:86vh;overflow:auto;background:linear-gradient(180deg,#1c2766,#0f1440);border:2px solid #d8b45a;border-radius:12px;padding:16px 18px;color:#eef0ff;box-shadow:0 0 40px rgba(80,120,255,.4)}
  #boot .bk-mwin h3{margin:0 0 4px;color:#ffe08a;font-size:20px}#boot .bk-mwin h4{margin:12px 0 6px;font-size:14px;color:#cfd8ff}#boot .bk-sub{margin:0 0 8px;font-size:12.5px;color:#aab4e0}
  #boot .bk-x{position:absolute;right:10px;top:8px;background:transparent;border:0;color:#ffe08a;font-size:18px;cursor:pointer}
  #boot .bk-list{display:flex;flex-direction:column;gap:6px}#boot .bk-row{display:grid;grid-template-columns:1fr auto;grid-template-rows:auto auto;text-align:left;gap:0 10px;padding:9px 12px;border-radius:8px;border:1px solid #4a5aa8;background:#18215a;color:#eef0ff;cursor:pointer;font-family:Kanit,sans-serif}
  #boot .bk-row b{font-size:15px}#boot .bk-row small{grid-row:2;color:#aab4e0}#boot .bk-row em{grid-row:1/3;grid-column:2;align-self:center;font-style:normal;color:#7affa0;font-size:13px}#boot .bk-row em.busy{color:#ffd46a}#boot .bk-row.on{border-color:#ffd46a;box-shadow:0 0 0 1px #ffd46a}
  #boot .bk-chips{display:flex;flex-wrap:wrap;gap:6px}#boot .bk-chip{padding:5px 12px;border-radius:14px;border:1px solid #5a6ab8;background:#18215a;color:#e6e8ff;cursor:pointer;font:500 13px Kanit,sans-serif}#boot .bk-chip.on{background:linear-gradient(#ffe9a8,#d9a23a);color:#2a1a04;border-color:#8a6418}
  #boot label{display:flex;flex-direction:column;gap:3px;font-size:13px;color:#cfd8ff;margin:6px 0}#boot .bk-fin{padding:7px 10px;border-radius:6px;border:1px solid #5a6ab8;background:#0e1438;color:#fff;font:500 14px Kanit,sans-serif;user-select:text}
  #boot .bk-fmsg{min-height:18px;margin:4px 0;color:#ff9aa8;font-size:12.5px}#boot .bk-acts{display:flex;gap:8px;margin-top:8px}#boot .bk-acts button{flex:1;padding:8px;border-radius:8px;cursor:pointer;font:600 14px Kanit,sans-serif}
  #boot .bk-gold{background:linear-gradient(#ffe9a8,#d9a23a);border:1px solid #8a6418;color:#2a1a04}#boot .bk-plain{background:#18215a;border:1px solid #5a6ab8;color:#eef0ff}
  .bk-acct{margin-left:auto;font-size:12px;color:#4a5a80}.bk-logout{margin-left:8px;padding:4px 10px!important;font-size:12px!important}`;
  document.head.appendChild(css);
})(window.G);
