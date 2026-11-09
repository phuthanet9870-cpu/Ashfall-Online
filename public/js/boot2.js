'use strict';
/* Boot v2: cover (tap anywhere) → loading (real progress) → login with three ways in:
   · Google — works when the game is hosted on its own site with Firebase configured (window.ASHFALL_FIREBASE);
   · Guest — instant play, a guest id kept in this browser;
   · Own account — name + password (hashed, kept in this browser) with register / forgot.
   Then server pick and the character slots of that account. */
(function (G) {
  const S = G.S, UI = G.UI, D = G.D; const $ = s => document.querySelector(s); const esc = UI.esc;
  const SERVERS = [['s1', 'Aurelion-1'], ['s2', 'Aurelion-2'], ['s3', 'Solaris'], ['s4', 'Umbra']];
  const LS = { get: (k, d) => { try { const v = JSON.parse(globalThis.ASHFALL_STORAGE.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }, set: (k, v) => { try { globalThis.ASHFALL_STORAGE.setItem(k, JSON.stringify(v)); } catch (e) { } } };
  const srv = () => { try { const v = globalThis.ASHFALL_STORAGE.getItem('ashfall_server'); if (SERVERS.some(s => s[0] === v)) return v; } catch (e) { } return 's1'; };
  const setSrv = v => { try { globalThis.ASHFALL_STORAGE.setItem('ashfall_server', v); } catch (e) { } };
  const norm = s => String(s || '').trim().toLowerCase();
  const hash = async (salt, pw) => { const t = salt + ':' + pw; try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); } catch (e) { let h = 0x811c9dc5; for (let r = 0; r < 4000; r++) for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0; return 'f' + h.toString(16); } };
  const rnd = n => [...crypto.getRandomValues(new Uint8Array(n))].map(x => x.toString(16).padStart(2, '0')).join('');
  const TIPS = ['ดันเจี้ยนมี 1000 ชั้น ยิ่งลึกของยิ่งดี', 'ชี้เมาส์ที่ไอเทมเพื่อดูค่าพลัง', 'กด Enter เพื่อพิมพ์แชท ข้อความจะขึ้นบนหัว', 'ตั้งระยะออโต้ได้ถึงทั้งแมพ', 'แลกเพชรแล้วซื้อตั๋วสุ่มที่ NPC หน้าน้ำพุ', 'กระเป๋าเต็มของจะเข้าคลังอัตโนมัติ', 'ตีบวก +1 ถึง +10 ได้ออปชั่นเสริมทุกขั้น'];
  const root = document.createElement('div'); root.id = 'boot2'; root.innerHTML = `<div class="b2bg"><i></i><i></i><i></i></div><div class="b2c"></div>`; document.body.appendChild(root); const box = root.querySelector('.b2c');
  let mode = '', loaded = false;
  const logo = `<div class="b2logo"><span>ASHFALL</span><small>ONLINE</small></div>`;
  const show = () => { root.hidden = false; const t = $('#title-screen'); if (t) t.hidden = true; const h = $('#hud'); if (h) h.hidden = true; };
  const hide = () => { root.hidden = true; mode = ''; };
  const cover = () => { show(); mode = 'cover'; box.innerHTML = `${logo}<p class="b2tap">แตะที่ใดก็ได้เพื่อเข้าเกม</p><p class="b2ver">เล่นออนไลน์ฟรี · 4 เซิร์ฟเวอร์</p>`; };
  const loading = () => { mode = 'loading'; let tip = Math.floor(Math.random() * TIPS.length); box.innerHTML = `${logo}<div class="b2bar"><i></i></div><p class="b2pct">0%</p><p class="b2tip">💡 ${esc(TIPS[tip])}</p>`;
    const fill = box.querySelector('.b2bar i'), pct = box.querySelector('.b2pct'), tipEl = box.querySelector('.b2tip'); let fontsOk = false; (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => fontsOk = true);
    const t0 = performance.now(); let shown = 0, tipT = t0;
    const tick = () => { if (mode !== 'loading') return; const now = performance.now(); const real = (G.TER && G.TER.ready ? 0.5 : 0) + (G.NAT && G.NAT.ready !== false ? 0.25 : 0) + (fontsOk ? 0.25 : 0); const cap = Math.min(1, (now - t0) / 1300);
      shown += (Math.min(real, cap) - shown) * 0.14; if (real >= 0.999 && cap >= 1 && shown > 0.98) shown = 1; fill.style.width = (shown * 100).toFixed(1) + '%'; pct.textContent = Math.round(shown * 100) + '%';
      if (now - tipT > 2800) { tipT = now; tip = (tip + 1) % TIPS.length; tipEl.textContent = '💡 ' + TIPS[tip]; }
      if (shown >= 1 || now - t0 > 15000) { loaded = true; setTimeout(login, 200); return; } requestAnimationFrame(tick); }; requestAnimationFrame(tick); };
  const msg = (t, k) => { const m = box.querySelector('.b2msg'); if (m) { m.textContent = t; m.dataset.k = k || ''; } };
  const srvRow = () => `<div class="b2srv">${SERVERS.map(([id, n]) => `<button class="${id === srv() ? 'on' : ''}" data-b2="srv" data-v="${id}">${esc(n)}</button>`).join('')}</div>`;
  const login = (tab) => { mode = 'login'; const P = LS.get('ashfall_prefs', {}); tab = tab || 'main';
    if (tab === 'main') box.innerHTML = `${logo}<div class="b2card"><h3>เข้าสู่ระบบ</h3><p class="b2s">เลือกเซิร์ฟเวอร์</p>${srvRow()}
      <button class="b2btn" data-b2="tab" data-v="acc">🔑 เข้าสู่ระบบด้วยบัญชีและรหัสผ่าน</button>
      <button class="b2btn ghost" data-b2="guest">👤 เล่นแบบผู้เยี่ยมชม</button><p class="b2msg"></p>
      <p class="b2fine">${globalThis.ASHFALL_STORAGE.persistent ? 'เซฟเก็บบนเซิร์ฟเวอร์ · บัญชีใช้เล่นข้ามเครื่องได้' : 'เบราว์เซอร์นี้ไม่เก็บการเข้าสู่ระบบ · ใช้บัญชีเพื่อกลับมาเล่นตัวละครเดิม'}</p></div>`;
    else box.innerHTML = `${logo}<div class="b2card"><h3>บัญชีของฉัน</h3>${srvRow()}<input class="b2in" id="b2acc" maxlength="32" placeholder="ชื่อบัญชี" value="${esc(P.lastAcc || '')}" autocomplete="username"><div class="b2pw"><input class="b2in" id="b2pw" type="password" maxlength="64" placeholder="รหัสผ่าน (อย่างน้อย 8 ตัว)" autocomplete="current-password"><button data-b2="eye" title="แสดงรหัสผ่าน">👁</button></div>
      <label class="b2chk"><input type="checkbox" id="b2rem" ${P.remember !== false ? 'checked' : ''}> จดจำชื่อบัญชี</label>
      <div class="b2row"><button class="b2btn g" data-b2="login">เข้าสู่ระบบ</button><button class="b2btn" data-b2="register">สร้างบัญชีใหม่</button></div>
      <div class="b2row sm"><button class="b2link" data-b2="forgot">ลืมรหัสผ่าน?</button><button class="b2link" data-b2="tab" data-v="main">← ย้อนกลับ</button></div><p class="b2msg"></p></div>`;
    setTimeout(() => { const a = $('#b2acc'); if (a) (a.value ? $('#b2pw') : a).focus(); }, 30); };
  const enter = (id, name, how) => { G.ACC = { id, name, how, server: srv() }; S.useSlots && S.useSlots(how === 'guest' ? null : id + '@' + srv()); const P = LS.get('ashfall_prefs', {}); P.lastHow = how; LS.set('ashfall_prefs', P); hide(); UI.showTitle(); };
  const accts = () => LS.get('ashfall_accounts', {}); const saveA = a => LS.set('ashfall_accounts', a);
  const doLogin = async create => {
    const name=($('#b2acc').value||'').trim(),pw=$('#b2pw').value||'',NET=window.ASHFALL_NET;
    if(name.length<3||pw.length<8)return msg('ชื่อบัญชีอย่างน้อย 3 ตัว รหัสผ่านอย่างน้อย 8 ตัว','bad');
    if(!NET?.connected||NET.features?.onlineAuthority!==2)return msg('กำลังรอเซิร์ฟเวอร์ออนไลน์ กรุณาลองอีกครั้ง','bad');
    msg('กำลังตรวจสอบบัญชี…');
    try { const result=await NET.request({t:create?'account_register':'account_login',username:name,password:pw});
      enter(result.username,result.username,'acc');S.mergeOnlineSlots?.(result.characters);UI.showTitle();
    } catch(e){msg(e.message,'bad');}
  };
  const google = async () => { const cfg = window.ASHFALL_FIREBASE; if (!cfg) { msg('เข้าสู่ระบบด้วย Google ใช้ได้เมื่อเปิดเกมจากเว็บไซต์ของเกม (ต้องตั้งค่า Firebase ก่อน) — ตอนนี้เลือกบัญชีหรือผู้เยี่ยมชมได้', 'warn'); return; }
    try { msg('กำลังเชื่อมต่อ Google…'); const load = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
      if (!window.firebase) { await load('https://cdn.jsdelivr.net/npm/firebase@10.12.2/firebase-app-compat.js'); await load('https://cdn.jsdelivr.net/npm/firebase@10.12.2/firebase-auth-compat.js'); }
      if (!window.firebase.apps.length) window.firebase.initializeApp(cfg); const res = await window.firebase.auth().signInWithPopup(new window.firebase.auth.GoogleAuthProvider()); const u = res.user; enter('g_' + u.uid, u.displayName || 'Player', 'google'); }
    catch (e) { msg('เข้าสู่ระบบด้วย Google ไม่สำเร็จ: ' + (e && e.message ? e.message : e), 'bad'); } };
  const guest = () => { let g = LS.get('ashfall_guest', null); if (!g) { g = { id: 'guest_' + rnd(6), name: 'ผู้เยี่ยมชม' + Math.floor(1000 + Math.random() * 9000) }; LS.set('ashfall_guest', g); } enter(g.id, g.name, 'guest'); };
  root.addEventListener('click', async e => { if (mode === 'cover') { if (loaded) login(); else loading(); return; } const el = e.target.closest('[data-b2]'); if (!el) return; const a = el.dataset.b2;
    if (a === 'srv') { setSrv(el.dataset.v); root.querySelectorAll('.b2srv button').forEach(b => b.classList.toggle('on', b.dataset.v === el.dataset.v)); return; }
    if (a === 'forgot') return msg('ติดต่อผู้ดูแลเซิร์ฟเวอร์เพื่อกู้บัญชี รหัสผ่านไม่ได้เก็บในเบราว์เซอร์','warn'); if (a === 'tab') return login(el.dataset.v); if (a === 'guest') return guest(); if (a === 'google') return google(); if (a === 'login') return doLogin(false); if (a === 'register') return doLogin(true);
    if (a === 'eye') { const p = $('#b2pw'); p.type = p.type === 'password' ? 'text' : 'password'; return; }
    if (a === 'forgot') { const id = norm(($('#b2acc') || {}).value); const A = accts(); if (!A[id]) return msg('ใส่ชื่อบัญชีที่มีอยู่ก่อน', 'bad'); const pw = ($('#b2pw') || {}).value || ''; if (pw.length < 4) return msg('พิมพ์รหัสผ่านใหม่ในช่องรหัสผ่าน แล้วกด "ลืมรหัสผ่าน?" อีกครั้ง', 'warn'); A[id].salt = rnd(12); A[id].h = await hash(A[id].salt, pw); saveA(A); msg('ตั้งรหัสผ่านใหม่แล้ว — กดเข้าสู่ระบบ', 'good'); } });
  root.addEventListener('keydown', e => { if (e.key === 'Enter' && mode === 'login' && $('#b2pw')) { e.preventDefault(); doLogin(false); } });
  addEventListener('keydown', e => { if (!root.hidden && mode === 'cover' && !e.repeat) { if (loaded) login(); else loading(); } });
  // integrate
  const st0 = UI.showTitle; UI.showTitle = function () { if (!G.ACC) { cover(); return; } hide(); const r = st0.apply(this, arguments); const h = document.querySelector('#title-screen .rohead'); if (h && !h.querySelector('.b2acct')) h.insertAdjacentHTML('beforeend', `<span class="b2acct">${G.ACC.how === 'guest' ? '👤' : G.ACC.how === 'google' ? 'G' : '🔑'} ${esc(G.ACC.name)} · ${esc((SERVERS.find(s => s[0] === srv()) || SERVERS[0])[1])}</span><button class="btn" data-act="b2-logout">ออกจากระบบ</button>`); return r; };
  const a0 = UI.act; UI.act = (el, e) => { if (el.dataset.act === 'b2-logout') { window.ASHFALL_NET?.send({t:'account_logout'}); globalThis.ASHFALL_STORAGE.removeItem('ashfall_session'); if(window.ASHFALL_NET)window.ASHFALL_NET.sessionToken=''; try { S.save && S.persist(); } catch (er) { } S.save = null; G.ACC = null; S.useSlots && S.useSlots(null); show(); login(); return; } return a0(el, e); };
  const gt0 = S.goTown; S.goTown = function () { hide(); return gt0.apply(this, arguments); };
  setInterval(() => { if (!root.hidden && G.W && G.W.player && G.W.mode) hide(); }, 400);
  G.BOOT = { enter: (name = 'tester') => { G.ACC = { id: norm(name), name, how: 'acc', server: srv() }; S.useSlots && S.useSlots(norm(name) + '@' + srv()); hide(); }, cover, login };
  const css = document.createElement('style'); css.textContent = `
  #boot2{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;font-family:Kanit,sans-serif;color:#f2e6c8;background:radial-gradient(ellipse at 50% 30%,#2a2216,#0c0a08 60%,#050404);overflow:hidden;cursor:pointer}#boot2[hidden]{display:none}
  .b2bg i{position:absolute;border-radius:50%;filter:blur(40px);opacity:.35;animation:b2f 12s ease-in-out infinite}.b2bg i:nth-child(1){width:420px;height:420px;left:-80px;top:-60px;background:#a8843a}.b2bg i:nth-child(2){width:360px;height:360px;right:-60px;bottom:-80px;background:#6a2a1a;animation-delay:-4s}.b2bg i:nth-child(3){width:300px;height:300px;left:40%;top:60%;background:#3a2a6a;animation-delay:-8s}
  @keyframes b2f{50%{transform:translate(40px,-30px) scale(1.1)}}
  .b2c{position:relative;display:flex;flex-direction:column;align-items:center;gap:16px;width:min(440px,92vw);cursor:default}
  .b2logo{display:flex;flex-direction:column;align-items:center;line-height:1}.b2logo span{font:800 clamp(44px,9vw,76px) Kanit,sans-serif;letter-spacing:6px;background:linear-gradient(180deg,#fff6d8,#f2d27a 45%,#a8742a);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 4px 0 #2a1a08) drop-shadow(0 0 24px rgba(242,210,122,.35))}.b2logo small{font:600 16px Kanit,sans-serif;letter-spacing:14px;color:#c8bca0;margin-top:4px}
  .b2tap{font-size:18px;animation:b2p 1.6s ease-in-out infinite;margin-top:30px}@keyframes b2p{50%{opacity:.35}}.b2ver{font-size:12px;color:#8a7e66}
  .b2bar{width:100%;height:12px;border-radius:6px;background:#14110c;border:1px solid #6a5428;overflow:hidden;margin-top:30px}.b2bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#a8843a,#f2d27a);box-shadow:0 0 12px #f2d27a}.b2pct{margin:0;color:#f2d27a}.b2tip{margin:0;color:#c8bca0;font-size:13px;text-align:center}
  .b2card{width:100%;box-sizing:border-box;padding:18px;border-radius:14px;background:linear-gradient(180deg,rgba(30,26,20,.96),rgba(12,10,8,.98));border:1px solid #a8843a;box-shadow:0 0 0 1px #000,0 20px 50px rgba(0,0,0,.6);display:flex;flex-direction:column;gap:10px}
  .b2card h3{margin:0;text-align:center;color:#f2d27a;font-size:20px}.b2s{margin:0;font-size:12px;color:#a89c84}
  .b2srv{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}.b2srv button{padding:6px 2px;border-radius:8px;border:1px solid #4a3c22;background:#16130f;color:#e8dcc0;font:500 12px Kanit,sans-serif;cursor:pointer}.b2srv button.on{border-color:#f2d27a;color:#f2d27a;box-shadow:0 0 0 1px #f2d27a}
  .b2btn{display:flex;align-items:center;justify-content:center;gap:8px;padding:11px;border-radius:10px;border:1px solid #6a5428;background:linear-gradient(180deg,#2e271e,#17130e);color:#f2e6c8;font:600 15px Kanit,sans-serif;cursor:pointer;flex:1}.b2btn:hover{border-color:#f2d27a}
  .b2btn.g{background:linear-gradient(180deg,#f6dc8a,#c8902a);color:#1a1206;border-color:#f6dc8a}.b2btn.g b{width:22px;height:22px;border-radius:50%;background:#fff;color:#4285f4;display:grid;place-items:center;font:800 14px sans-serif}.b2btn.ghost{background:transparent}
  .b2in{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:8px;border:1px solid #6a5428;background:#0c0a08;color:#f2e6c8;font:15px Kanit,sans-serif;outline:none}.b2in:focus{border-color:#f2d27a}
  .b2pw{position:relative}.b2pw button{position:absolute;right:6px;top:50%;transform:translateY(-50%);background:none;border:0;cursor:pointer;font-size:16px}
  .b2chk{font-size:13px;color:#c8bca0;display:flex;gap:6px;align-items:center}.b2row{display:flex;gap:8px}.b2row.sm{justify-content:space-between}.b2link{background:none;border:0;color:#f2d27a;text-decoration:underline;cursor:pointer;font:13px Kanit,sans-serif}
  .b2msg{min-height:18px;margin:0;font-size:13px;text-align:center}.b2msg[data-k=bad]{color:#ff9aa8}.b2msg[data-k=warn]{color:#ffd88a}.b2msg[data-k=good]{color:#a8ffc0}.b2fine{margin:0;font-size:11.5px;color:#8a7e66;text-align:center}
  .b2acct{margin-left:auto;font-size:12px;color:#c8bca0;margin-right:6px}`;
  document.head.appendChild(css);
})(window.G);
