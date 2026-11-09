'use strict';
/* UI: title, HUD, panels, NPC services, results, GM console, input */
(function (G) {
  const U = G.U, D = G.D, E = G.E, W = G.W, V = G.VFX, SPR = G.SPR, S = G.S;
  const UI = G.UI = {};
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  UI.esc = esc;
  const tierSpan = (t, txt) => `<span class="tc t${t}">${txt ?? D.TIERS[t - 1].n}</span>`;
  const fmtStat = (s, v) => `${D.STAT_TH[s] || s} +${D.PCT[s] ? (Math.round(v * 10) / 10) + '%' : U.fmt(v)}`;

  // ---------------- icons ----------------
  const iconCache = new Map();
  const glyphs = {
    slash: P => { for (let i = 0; i < 12; i++) P(4 + i, 18 - Math.round(Math.sin(i / 11 * Math.PI) * 10), 2, 2, 0); },
    spin: P => { for (let a = 0; a < 6.2; a += 0.35) P(11 + Math.round(Math.cos(a) * 7), 11 + Math.round(Math.sin(a) * 7), 2, 2, a > 4 ? 1 : 0); P(10, 10, 4, 4, 1); },
    thrust: P => { for (let i = 0; i < 14; i++) P(4 + i, 18 - i, 2, 2, 0); P(16, 4, 4, 4, 1); },
    proj: P => { P(13, 7, 5, 5, 0); P(14, 8, 3, 3, 1); for (let i = 0; i < 8; i++) P(4 + i, 16 - i, 1, 1, 0); },
    nova: P => { for (let a = 0; a < 6.2; a += 0.5) { P(11 + Math.round(Math.cos(a) * 8), 11 + Math.round(Math.sin(a) * 8), 2, 2, 0); P(11 + Math.round(Math.cos(a) * 4), 11 + Math.round(Math.sin(a) * 4), 1, 1, 1); } P(10, 10, 3, 3, 1); },
    ground: P => { P(11, 3, 3, 9, 1); P(10, 5, 5, 4, 0); for (let i = 0; i < 12; i++) P(5 + i, 18, 1, 2, 0); },
    zone: P => { for (let a = 0; a < 6.2; a += 0.4) P(11 + Math.round(Math.cos(a) * 8), 13 + Math.round(Math.sin(a) * 4), 2, 1, 0); P(8, 10, 2, 4, 1); P(13, 8, 2, 5, 1); },
    beam: P => { for (let i = 0; i < 16; i++) P(3 + i, 11, 2, 3, i % 3 ? 0 : 1); P(18, 9, 3, 7, 1); },
    chain: P => { let x = 4, y = 18; for (let i = 0; i < 6; i++) { const nx = x + 3, ny = y - 3 + (i % 2 ? 2 : -1); P(x, y, 2, 2, 0); x = nx; y = ny; } P(x, y, 3, 3, 1); },
    dash: P => { for (let k = 0; k < 3; k++) for (let i = 0; i < 8; i++) P(3 + i + k * 3, 7 + k * 4, 1, 1, k); P(15, 8, 5, 9, 0); },
    leap: P => { for (let i = 0; i < 14; i++) P(4 + i, 16 - Math.round(Math.sin(i / 13 * Math.PI) * 11), 2, 1, 0); P(3, 18, 18, 1, 1); },
    barrage: P => { for (let k = 0; k < 5; k++) P(4 + k * 3, 4 + (k % 2) * 6 + k * 2, 3, 3, k % 2); },
    summon: P => { P(9, 5, 6, 6, 0); P(8, 11, 8, 8, 0); P(10, 7, 1, 1, 1); P(13, 7, 1, 1, 1); for (let a = 0; a < 6.2; a += 0.6) P(11 + Math.round(Math.cos(a) * 9), 19 + Math.round(Math.sin(a) * 2), 1, 1, 1); },
    turret: P => { P(7, 12, 10, 7, 0); P(10, 7, 4, 5, 1); P(14, 8, 7, 2, 0); },
    trap: P => { P(5, 14, 14, 3, 0); for (let i = 0; i < 4; i++) P(6 + i * 4, 9, 2, 5, 1); },
    buff: P => { P(10, 4, 4, 16, 0); P(6, 8, 12, 4, 0); P(11, 2, 2, 2, 1); },
    shield: P => { P(6, 4, 12, 10, 0); P(8, 14, 8, 3, 0); P(10, 17, 4, 2, 0); P(10, 7, 4, 6, 1); },
    heal: P => { P(9, 4, 6, 16, 1); P(4, 9, 16, 6, 1); P(10, 5, 4, 14, 0); P(5, 10, 14, 4, 0); },
    blink: P => { P(4, 10, 4, 4, 1); P(16, 8, 5, 7, 0); for (let i = 0; i < 6; i++) P(8 + i, 12, 1, 1, i % 2); },
    stealth: P => { P(6, 8, 12, 8, 1); P(8, 10, 2, 2, 0); P(14, 10, 2, 2, 0); }
  };
  UI.skillIcon = (s) => {
    const k = s.id + '|' + (s.variant || 0) + s.arch; if (iconCache.has(k)) return iconCache.get(k);
    const [cv, x] = SPR.mk(24, 24); const pal = D.ELEM[s.elem].pal;
    const g = x.createLinearGradient(0, 0, 24, 24); g.addColorStop(0, U.shade(pal[3], -0.2)); g.addColorStop(1, U.shade(pal[3], -0.6)); x.fillStyle = g; x.fillRect(0, 0, 24, 24);
    const P = (px, py, w, h, c) => { x.fillStyle = c ? pal[0] : pal[1]; x.fillRect(px, py, w, h); };
    (glyphs[s.arch] || glyphs.nova)(P);
    if (s.ult) { x.strokeStyle = '#ffd84a'; x.lineWidth = 2; x.strokeRect(1, 1, 22, 22); }
    if (s.variant) { x.fillStyle = ['', '#4ad6c8', '#ff7a3a', '#ffe04a'][s.variant]; x.fillRect(18, 18, 6, 6); x.fillStyle = '#120e18'; x.fillRect(19, 19, 4, 4); x.fillStyle = ['', '#4ad6c8', '#ff7a3a', '#ffe04a'][s.variant]; x.fillRect(20, 20, 2, 2); }
    const url = cv.toDataURL(); iconCache.set(k, url); return url;
  };
  const SLOT_GLYPH = {
    weapon: (P, c) => { for (let i = 0; i < 12; i++) P(4 + i, 15 - i, 2, 2, c); P(3, 14, 5, 2, '#8a6a4a'); P(4, 16, 2, 3, '#6a4a2a'); },
    offhand: (P, c) => { P(5, 3, 10, 9, c); P(7, 12, 6, 3, c); P(9, 15, 2, 2, c); P(9, 5, 2, 7, '#ffffff'); },
    head: (P, c) => { P(4, 6, 12, 6, c); P(5, 4, 10, 3, c); P(4, 12, 3, 4, c); P(13, 12, 3, 4, c); P(8, 8, 4, 2, '#120e18'); },
    chest: (P, c) => { P(4, 4, 12, 12, c); P(2, 4, 3, 6, c); P(15, 4, 3, 6, c); P(8, 4, 4, 3, '#120e18'); },
    gloves: (P, c) => { P(5, 6, 9, 9, c); P(5, 3, 2, 4, c); P(8, 2, 2, 4, c); P(11, 3, 2, 4, c); P(13, 8, 3, 3, c); },
    legs: (P, c) => { P(5, 3, 10, 4, c); P(5, 7, 4, 10, c); P(11, 7, 4, 10, c); },
    boots: (P, c) => { P(4, 4, 5, 10, c); P(4, 13, 9, 4, c); P(11, 6, 4, 8, c); },
    necklace: (P, c) => { for (let a = 0; a < 3.2; a += 0.3) P(10 + Math.round(Math.cos(a) * 6), 6 + Math.round(Math.sin(a) * 5), 1, 1, '#d8d8e0'); P(8, 12, 4, 5, c); },
    earring1: (P, c) => { P(9, 3, 2, 5, '#d8d8e0'); P(7, 8, 6, 6, c); P(8, 14, 4, 3, c); },
    earring2: (P, c) => { P(9, 3, 2, 5, '#d8d8e0'); P(7, 8, 6, 6, c); },
    ring1: (P, c) => { for (let a = 0; a < 6.3; a += 0.3) P(10 + Math.round(Math.cos(a) * 5), 12 + Math.round(Math.sin(a) * 5), 1, 1, '#e8d08a'); P(8, 4, 5, 4, c); },
    ring2: (P, c) => SLOT_GLYPH.ring1(P, c),
    bracelet: (P, c) => { for (let a = 0; a < 6.3; a += 0.25) P(10 + Math.round(Math.cos(a) * 7), 10 + Math.round(Math.sin(a) * 4), 2, 1, c); },
    belt: (P, c) => { P(2, 8, 16, 4, c); P(8, 7, 5, 6, '#e8d08a'); P(9, 8, 3, 4, '#120e18'); },
    talisman: (P, c) => { P(6, 3, 8, 14, '#e8dcc0'); P(8, 6, 4, 4, c); P(8, 12, 4, 1, c); P(8, 14, 4, 1, c); },
    brooch: (P, c) => { for (let a = 0; a < 6.3; a += 0.8) P(10 + Math.round(Math.cos(a) * 5), 10 + Math.round(Math.sin(a) * 5), 2, 2, '#e8d08a'); P(8, 8, 5, 5, c); },
    cloak: (P, c) => { P(6, 3, 8, 3, c); P(4, 6, 12, 11, c); P(8, 6, 4, 8, U.shade(c, -0.3)); },
    relic: (P, c) => { P(9, 2, 2, 16, c); P(2, 9, 16, 2, c); P(5, 5, 10, 10, c); P(8, 8, 4, 4, '#ffffff'); },
    rune: (P, c) => { for (let y = 0; y < 16; y++) { const w = 8 - Math.abs(8 - y); P(10 - w / 2 * 1.2, 2 + y, w * 1.2, 1, c); } P(9, 8, 2, 4, '#ffffff'); },
    gem: (P, c) => { P(6, 5, 8, 2, c); P(4, 7, 12, 3, c); P(6, 10, 8, 3, c); P(8, 13, 4, 3, c); P(7, 6, 2, 2, '#ffffff'); },
    fashion: (P, c, c2) => { P(4, 4, 12, 3, c); P(2, 6, 4, 5, c); P(14, 6, 4, 5, c); P(5, 7, 10, 10, c); P(9, 7, 2, 10, c2 || '#ffffff'); }
  };
  UI.itemIcon = (it) => {
    const tier = it.tier || 1; const glyph = it.kind === 'rune' ? 'rune' : it.kind === 'gem' ? 'gem' : it.kind === 'fashion' ? 'fashion' : it.slot || 'chest';
    const c = it.kind === 'rune' ? D.RUNE_COLORS[it.color].c : it.kind === 'gem' ? D.GEMS.find(g => g.k === it.gem).c : it.kind === 'fashion' ? (it.dye || it.colors[0]) : tier === 10 ? '#ff7af0' : D.TIERS[tier - 1].c;
    const k = glyph + c + (it.colors ? it.colors[1] : ''); if (iconCache.has(k)) return iconCache.get(k);
    const [cv, x] = SPR.mk(20, 20); const P = (px, py, w, h, col) => { x.fillStyle = col; x.fillRect(Math.round(px), Math.round(py), Math.round(w), Math.round(h)); };
    (SLOT_GLYPH[glyph] || SLOT_GLYPH.chest)(P, c, it.colors && it.colors[1]);
    const id = x.getImageData(0, 0, 20, 20); const d = id.data; const src = new Uint8ClampedArray(d);
    for (let j = 0; j < 20; j++) for (let i = 0; i < 20; i++) { const q = (j * 20 + i) * 4; if (src[q + 3]) continue; const n = [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]].some(([a, b]) => a >= 0 && b >= 0 && a < 20 && b < 20 && src[(b * 20 + a) * 4 + 3]); if (n) { d[q] = 18; d[q + 1] = 14; d[q + 2] = 24; d[q + 3] = 255; } }
    x.putImageData(id, 0, 0); const url = cv.toDataURL(); iconCache.set(k, url); return url;
  };
  UI.portraitURL = (cls, fashion) => { const L = SPR.lookFor(cls, fashion); const sh = SPR.charSheet(L); const [cv, x] = SPR.mk(24, 24); x.drawImage(sh.sheet, 0, 2, 24, 24, 0, 0, 24, 24); return cv.toDataURL(); };

  // ---------------- toasts / log / feed ----------------
  UI.toast = (msg, type = 'info', tier) => {
    const box = $('#toasts'); if (!box) return; const d = document.createElement('div'); d.className = 'toast ' + type + (tier ? ' t' + tier : '');
    d.innerHTML = esc(msg); box.appendChild(d); while (box.children.length > 6) box.firstChild.remove();
    setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 400); }, type === 'item' && tier >= 7 ? 5000 : 3200);
    if (type === 'item' || type === 'good' || type === 'bad') UI.log(msg, type === 'item' ? 'loot' : 'sys');
  };
  UI.logs = []; UI.chatTab = 'all';
  UI.log = (msg, ch = 'sys') => { UI.logs.push({ msg, ch, t: Date.now() }); if (UI.logs.length > 120) UI.logs.shift(); UI.renderLog(); };
  UI.renderLog = () => { const el = $('#chatlog'); if (!el) return; const L = UI.logs.filter(l => UI.chatTab === 'all' || l.ch === UI.chatTab || (UI.chatTab === 'sys' && l.ch === 'loot')).slice(-40); el.innerHTML = L.map(l => `<div class="ln ${l.ch}">${esc(l.msg)}</div>`).join(''); el.scrollTop = el.scrollHeight; };
  UI.feed = (msg, type = 'info', big) => { const f = $('#feed'); if (!f) return; const d = document.createElement('div'); d.className = 'fd ' + type + (big ? ' big' : ''); d.textContent = msg; f.prepend(d); while (f.children.length > 7) f.lastChild.remove(); setTimeout(() => d.remove(), 6000); };
  UI.announce = (title, sub) => { const a = $('#announce'); if (!a) return; a.innerHTML = `<div class="an-t">${esc(title)}</div><div class="an-s">${esc(sub || '')}</div>`; a.classList.remove('show'); void a.offsetWidth; a.classList.add('show'); };
  UI.ultBanner = (u, s) => { const b = $('#ultbar'); if (!b) return; b.innerHTML = `<span class="ub-n">${esc(u.name)}</span><span class="ub-s">${esc(s.name)}</span>`; b.style.setProperty('--uc', D.ELEM[s.elem].pal[1]); b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); };
  UI.skillBanner = (u, s, i) => { const b = $('#skillban'); if (!b) return; b.innerHTML = `<img src="${UI.skillIcon(s)}" alt=""><div><b>${esc(s.name)}</b> <small>[${D.KEYS[i]}] ${D.SLOT_TH(i)}${s.variant ? ' · รูน' + D.VARIANTS[s.variant].th : ''}</small><p>${esc(D.descSkill(s))}</p></div>`; b.hidden = false; clearTimeout(UI._sbT); UI._sbT = setTimeout(() => b.hidden = true, 2600); };

  // ---------------- title / class select ----------------
  UI.selCls = 'pyromancer';
  UI.showTitle = () => {
    const t = $('#title-screen'); t.hidden = false; $('#hud').hidden = true;
    const sv = S.load();
    t.innerHTML = `<div class="title-wrap"><div class="logo"><span class="l1">ASHFALL</span><span class="l2">ONLINE</span></div><p class="tag">MMORPG 2D พิกเซลอาร์ต · มุมมองไอโซเมตริก · เน้น PvP และกิลด์วอร์</p>
      <div class="title-btns">${sv ? `<button class="btn primary big" data-act="continue">เล่นต่อ · ${esc(sv.name)} Lv${sv.lvl} ${esc(D.CLS[sv.cls].name)}</button>` : ''}<button class="btn big" data-act="newchar">สร้างตัวละครใหม่</button></div>
      <p class="note">เวอร์ชันเว็บนี้เล่นแบบออฟไลน์ในเบราว์เซอร์ ผู้เล่นอื่น กิลด์คู่แข่ง และคู่ต่อสู้ทั้งหมดจำลองด้วย AI · เซฟอยู่ในเบราว์เซอร์นี้เท่านั้น</p></div>`;
  };
  UI.showCreate = () => {
    const t = $('#title-screen');
    const cards = D.CLASSES.map(c => `<button class="ccard ${c.id === UI.selCls ? 'sel' : ''}" data-act="pickcls" data-cls="${c.id}"><img src="${UI.portraitURL(c.id)}" alt=""><b>${c.name}</b><small>${c.th}</small><i style="color:${D.ELEM[c.elem].pal[1]}">${D.ROLES[c.role].th} · ${D.ELEM[c.elem].th}</i></button>`).join('');
    t.innerHTML = `<div class="create"><div class="cr-left"><h2>เลือกคลาส <small>${D.CLASSES.length} คลาส · คลาสละ 25 สกิล + แพสซีฟ 5 · ทุกสกิลมีความสามารถเฉพาะตัว · ระยะโจมตีต่างกันตามอาชีพ</small></h2><div class="cgrid">${cards}</div></div>
      <div class="cr-right" id="crdetail"></div></div>`;
    UI.renderCreateDetail();
  };
  UI.renderCreateDetail = () => {
    const c = D.CLS[UI.selCls]; const el = $('#crdetail'); if (!el) return;
    el.innerHTML = `<div class="cd-top"><canvas id="cprev" width="96" height="128"></canvas><div><h3>${c.name} <small>${c.th}</small></h3><p>${D.ROLES[c.role].th} · ธาตุ${D.ELEM[c.elem].th} · อาวุธ ${D.WEAPON_TH[c.weapon]}<br>ทรัพยากร: <b>${c.res}</b>${c.build ? ' (สะสมเมื่อโจมตีโดน)' : ''}<br>ระยะโจมตี: <b>${c.rng} ช่อง</b> (${c.rng < 2 ? 'ประชิดมาก' : c.rng < 3 ? 'ประชิด' : c.rng < 6 ? 'ระยะกลาง' : 'ระยะไกล'})</p></div></div>
      <div class="cd-skills">${c.skills.map((s, i) => `<div class="cds" title="${esc(D.descSkill(s))}"><img src="${UI.skillIcon(s)}" alt=""><span><b>${esc(s.name)}</b><small>Lv${s.unlock} · ${D.SLOT_TH(i)} · ${D.ARCH[s.arch].th}</small></span></div>`).join('')}</div>
      <label class="fl">ชื่อตัวละคร<input id="cname" maxlength="14" value="${esc(UI.lastName || U.pick(D.NAMES))}"></label>
      <button class="btn primary big" data-act="startgame">เริ่มเกมที่หมู่บ้านเฮเวน</button>`;
    const cv = $('#cprev'); const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; const L = SPR.lookFor(c.id); const sh = SPR.charSheet(L);
    cancelAnimationFrame(UI._cpA); let f = 0; const loop = () => { if (!document.body.contains(cv)) return; f++; x.clearRect(0, 0, 96, 128); const seq = ['walk', 'attack', 'cast', 'idle']; const an = seq[Math.floor(f / 90) % 4]; const n = (sh.n && sh.n[an]) || SPR.ANIMS.find(a => a[0] === an)[1]; const fr = Math.floor(f / 8) % n; const row = sh.idx[(Math.floor(f / 360) % 2 ? 'back' : 'front') + an]; x.drawImage(sh.sheet, fr * 24, row * 32, 24, 32, 0, 0, 96, 128); UI._cpA = requestAnimationFrame(loop); }; loop();
  };

  // ---------------- HUD ----------------
  UI.onEnter = (mode) => {
    $('#title-screen').hidden = true; $('#hud').hidden = false; UI.closePanel(); UI.setUiScale(S.save.settings.uiScale || 100); $('#chat').classList.toggle('min', !!S.save.settings.chatMin); $('#quest-track').classList.toggle('min', !!S.save.settings.questMin); G.setZoomPct(S.save.settings.zoomPct || 100, true); V.setLevel(V.levelFromQuality(S.save.settings.quality ?? 1)); UI.buildSkillbar(); UI.buildMinimap(); UI.refreshHud(true);
    $('#cmdbar').hidden = !(mode.kind === 'pvp' || mode.kind === 'siege' || mode.kind === 'dungeon');
    $('#btn-pk').hidden = mode.kind !== 'farm';
    UI.log(`เข้าสู่: ${mode.name || mode.md && mode.md.th || 'ยึดปราสาท'}`, 'sys');
    $('#siegeprep').hidden = true;
  };
  UI.buildSkillbar = () => {
    const sb = $('#skillbar'); const p = W.player; if (!p) return;
    sb.innerHTML = D.KEYS.map((k, i) => `<button class="sk" data-sk="${i}" aria-label="สกิล ${i + 1}"><img alt=""><i class="cd"></i><span class="key">${k}</span><span class="cdt"></span><span class="lock"></span></button>`).join('');
    UI.skEls = [...sb.children];
    UI.refreshSkillIcons();
    $('#potbar').innerHTML = `<button class="pot hp" data-act="pot" data-k="hpPot" title="ยา HP [H]"><span>H</span><b id="pothp"></b></button><button class="pot mp" data-act="pot" data-k="mpPot" title="ยาทรัพยากร [V]"><span>V</span><b id="potmp"></b></button>`;
  };
  UI.refreshSkillIcons = () => { const p = W.player; if (!p || !UI.skEls) return; UI.skEls.forEach((el, i) => { const s = E.skillOf(p, i); el.querySelector('img').src = UI.skillIcon(s); el.classList.toggle('locked', !E.unlocked(p, i)); el.querySelector('.lock').textContent = E.unlocked(p, i) ? '' : 'Lv' + D.UNLOCK[i]; el.classList.toggle('ult', i >= D.ULT0); el.classList.toggle('bf', i >= D.BUFF0 && i < D.ULT0); }); };
  UI.buildMinimap = () => {
    const m = W.map; const k = 2; const w = m.w * k, h = m.h * k; const [cv, x] = SPR.mk(w, h);
    const col = t => ['g0', 'g1', 'p', '#2a6aa8', '#c8401a', null, '#bfe6f6', '#2a4a22', '#8a8278'][t];
    for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) { const t = m.tiles[j * m.w + i]; let c = col(t); if (c === null) continue; if (c === 'g0') c = m.g[0]; if (c === 'g1') c = m.g[1]; if (c === 'p') c = U.shade(m.g[0], 0.15); if (m.block[j * m.w + i] === 2) c = '#3a3444'; x.fillStyle = c; x.fillRect(i * k, j * k, k, k); }
    UI.mini = { cv, k, w, h };
  };
  UI.drawMinimap = () => {
    const mc = $('#mini'); if (!mc || !UI.mini || !W.map) return; const x = mc.getContext('2d'); const M = UI.mini;
    x.imageSmoothingEnabled = false; x.fillStyle = '#0b0910'; x.fillRect(0, 0, mc.width, mc.height);
    const sc = Math.min(mc.width / M.w, mc.height / M.h); const ox = Math.round((mc.width - M.w * sc) / 2), oy = Math.round((mc.height - M.h * sc) / 2);
    x.drawImage(M.cv, ox, oy, M.w * sc, M.h * sc);
    const P = (wx, wy) => [ox + wx * M.k * sc, oy + wy * M.k * sc];
    // camera view rectangle
    const c = W.cam; const hw = E.VW / G.TS / 2, hh = E.VH / G.TS / 2; const [rx, ry] = P(c.x - hw, c.y - hh); x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 1; x.strokeRect(rx, ry, hw * 2 * M.k * sc, hh * 2 * M.k * sc);
    for (const u of W.units) {
      if (u.dead || u.kind === 'summon') continue; let c = null, s = 2;
      if (u === W.player) continue; if (u.kind === 'npc') { if (u.sim) continue; c = '#ffd84a'; } else if (u.kind === 'mob') { c = u.boss ? '#ff4af0' : u.grade !== 'normal' ? '#ff9a2e' : '#c86a4a'; s = u.boss ? 4 : u.grade !== 'normal' ? 3 : 1.5; } else if (u.kind === 'struct') { c = u.team === 0 ? '#4ad6c8' : '#ff5a5a'; s = 3; } else { if (u.stealth > 0 && u.team !== 0) continue; c = u.team === 0 ? '#4ad6c8' : u.team === 4 ? (u.red ? '#ff5a5a' : '#e8e4d8') : '#ff5a5a'; s = 2.5; }
      const [px, py] = P(u.x, u.y); x.fillStyle = c; x.fillRect(px - s / 2, py - s / 2, s, s);
    }
    if (W.mode && W.mode.points) for (const pt of W.mode.points) { const [px, py] = P(pt.x, pt.y); x.strokeStyle = pt.owner === 0 ? '#4ad6c8' : pt.owner === 1 ? '#ff5a5a' : '#c8c0b0'; x.strokeRect(px - 3, py - 3, 6, 6); }
    if (W.mode && W.mode.portals) for (const pt of W.mode.portals) { const [px, py] = P(pt.x, pt.y); x.fillStyle = pt.exit ? '#ffd84a' : '#9a7aff'; x.fillRect(px - 2, py - 2, 4, 4); }
    const p = W.player; if (p) { const [px, py] = P(p.x, p.y); x.fillStyle = '#ffffff'; x.fillRect(px - 2, py - 2, 4, 4); x.strokeStyle = '#120e18'; x.strokeRect(px - 2.5, py - 2.5, 5, 5); }
  };
  UI.refreshHud = (full) => {
    const p = W.player; const s = S.save; if (!p || !s) return;
    if (full) { $('#pname').textContent = s.name + (s.guild ? ` <${s.guild.tag}>` : ''); $('#portrait-img').src = UI.portraitURL(s.cls, s.fashion.eq); UI.refreshSkillIcons(); }
    $('#plv').textContent = `CP ${U.fmt(p.cpv || 0)} · ระยะ ${D.CLS[s.cls].rng} ช่อง`;
    $('#hpfill').style.width = (100 * p.hp / p.maxhp) + '%'; $('#hptxt').textContent = `${U.fmt(p.hp)} / ${U.fmt(p.maxhp)}` + (p.shield > 0 ? ` (+${U.fmt(p.shield)})` : '');
    $('#shfill').style.width = Math.min(100, 100 * p.shield / p.maxhp) + '%';
    $('#resfill').style.width = (100 * p.res / p.resMax) + '%'; $('#restxt').textContent = `${D.CLS[s.cls].res} ${Math.floor(p.res)}`;
    const need = S.xpNeed(s.lvl); $('#xpfill').style.width = (s.lvl >= D.MAX_LV ? 100 : 100 * s.xp / need) + '%'; $('#xptxt').textContent = s.lvl >= D.MAX_LV ? 'MAX LEVEL ' + D.MAX_LV : `EXP ${(100 * s.xp / need).toFixed(1)}%`;
    $('#curr').innerHTML = `<span title="ทอง">💰 ${U.fmt(s.gold)}</span><span title="Honor">⚔ ${U.fmt(s.honor)}</span><span title="แต้มสงคราม">🏰 ${U.fmt(s.war)}</span>`;
    $('#pothp').textContent = s.bag.hpPot; $('#potmp').textContent = s.bag.mpPot;
    // skills
    if (UI.skEls) UI.skEls.forEach((el, i) => { const sk = E.skillOf(p, i); const cd = Math.max(p.cds[i], p.gcd * (E.unlocked(p, i) ? 1 : 0)); const max = Math.max(sk.c, 0.3); const pct = p.cds[i] > 0 ? Math.min(1, p.cds[i] / (max)) : p.gcd > 0 ? p.gcd / 0.32 : 0;
      el.querySelector('.cd').style.height = (pct * 100) + '%'; el.querySelector('.cdt').textContent = p.cds[i] > 0.5 ? Math.ceil(p.cds[i]) : ''; el.classList.toggle('nores', p.res < sk.m); el.classList.toggle('q', S.IN.queue === i); });
    // buffs
    const bh0 = p.buffs.map(b => `<span class="bf" title="${D.BUFF_TH[b.type] || b.type}">${(D.BUFF_TH[b.type] || b.type).slice(0, 6)} ${Math.ceil(b.t)}</span>`).join('') + (p.stealth > 0 ? '<span class="bf st">ล่องหน</span>' : '') + (p.mounted ? '<span class="bf">ขี่พาหนะ</span>' : '') + (S.foodActive('foodXp') ? '<span class="bf fd">EXP+50%</span>' : '') + (S.foodActive('foodDrop') ? '<span class="bf fd">ดรอป+30%</span>' : '') + (p.red ? '<span class="bf red">ชื่อแดง</span>' : '');
    // target
    const t = p.target; const tf = $('#target');
    if (t && !t.dead && t.kind !== 'npc') { tf.hidden = false; $('#tname').innerHTML = `${esc(t.name || 'Monster')} <small>${t.lvl ? 'Lv' + t.lvl : ''} ${t.grade ? D.GRADES[t.grade].th : t.cls ? D.CLS[t.cls].name : ''}</small>`; $('#thpfill').style.width = (100 * t.hp / t.maxhp) + '%'; $('#thptxt').textContent = `${U.fmt(t.hp)} / ${U.fmt(t.maxhp)}`; $('#tname').style.color = t.grade ? D.GRADES[t.grade].col : E.isEnemy(p, t) ? '#ff9a9a' : '#9af0e4'; }
    else tf.hidden = true;
    // mode hud
    if (W.mode && W.mode.hud) { const h = W.mode.hud(); if (UI._mh !== h) { UI._mh = h; $('#modehud').innerHTML = h; } }
    // quest
    const q = S.questText(); const qh = `<b data-act="questmin" title="ย่อ/ขยาย">ภารกิจหลัก</b><span>${esc(q)}</span>`; if (UI._qh !== qh) { UI._qh = qh; $('#quest-track').innerHTML = qh + `<button class="mini-btn" data-act="panel" data-p="quests">ดูทั้งหมด</button>`; }
    $('#btn-auto').classList.toggle('on', S.auto.on); $('#btn-autoq').classList.toggle('on', S.auto.quest); $('#btn-pk').classList.toggle('on', !!s.pk);
    // combo
    const cb = $('#combo'); if (p.combo >= 5) { cb.hidden = false; cb.innerHTML = `<b>${p.combo}</b><span>COMBO</span>`; cb.style.transform = `scale(${1 + Math.min(0.5, p.combo / 200)})`; } else cb.hidden = true;
    if (W.mode && W.mode.kind === 'siege' && W.mode.phase === 'prep') UI.siegePrepTick(W.mode);
  };

  // ---------------- panels ----------------
  UI.panel = null;
  UI.openPanel = (id, tab) => {
    const P = UI.PANELS[id]; if (!P) return; UI.panel = { id, tab: tab || (P.tabs ? P.tabs[0][0] : null), sel: null };
    $('#panel').hidden = false; UI.renderPanel();
  };
  UI.closePanel = () => { $('#panel').hidden = true; UI.panel = null; };
  UI.renderPanel = () => {
    if (!UI.panel) return; const P = UI.PANELS[UI.panel.id];
    $('#ptitle').textContent = P.title; $('#ptabs').innerHTML = P.tabs ? P.tabs.map(([k, n]) => `<button class="tab ${UI.panel.tab === k ? 'on' : ''}" data-act="tab" data-tab="${k}">${n}</button>`).join('') : '';
    const body = $('#pbody'); const st = body.scrollTop; body.innerHTML = P.render(UI.panel.tab, UI.panel); body.scrollTop = st;
    if (P.after) P.after(UI.panel);
  };
  const itemCell = (it, act, extra = '') => it ? `<button class="icell t${it.tier}" data-act="${act}" data-uid="${it.uid}" ${extra} title="${esc(it.name)}"><img src="${UI.itemIcon(it)}" alt=""><span class="ilv">${it.ilv ? it.ilv : ''}</span>${it.lv ? `<span class="ip">+${it.lv}</span>` : ''}</button>` : '';
  UI.itemCell = itemCell;
  UI.itemDetail = (it, actions = '') => {
    if (!it) return '<div class="idet empty">เลือกไอเทมเพื่อดูรายละเอียด</div>';
    const sl = D.SLOT[it.slot] || D.FASHION_SLOTS.find(f => f.k === it.slot) || {};
    let h = `<div class="idet"><div class="ih"><img src="${UI.itemIcon(it)}" class="t${it.tier}" alt=""><div><b class="tc t${it.tier}">${esc(it.name)}${it.lv ? ' +' + it.lv : ''}</b><small>${tierSpan(it.tier, `ระดับ ${it.tier} ${D.TIERS[it.tier - 1].n}`)} · ${sl.th || (it.kind === 'rune' ? 'รูน' + D.RUNE_COLORS[it.color].th : it.kind === 'gem' ? 'เจม' : '')}${it.ilv ? ' · iLv ' + it.ilv : ''}</small></div></div>`;
    if (it.kind === 'fashion') h += `<p class="muted">ชุดแฟชั่นธีม ${D.FASHION_THEMES[it.theme].th} — เปลี่ยนลุคเท่านั้น ไม่มีสเตตัส · ใส่ธีมเดียวกันครบ 3 ชิ้นได้ออร่าเซ็ต</p><div class="swatch"><i style="background:${it.dye || it.colors[0]}"></i><i style="background:${it.colors[1]}"></i></div>`;
    if (it.main) h += `<div class="imain">${fmtStat(it.main.s, it.main.v * (it.kind === 'gear' ? 1 + 0.06 * (it.lv || 0) : it.kind === 'acc' ? 1 + 0.05 * (it.lv || 0) : it.kind === 'rune' ? 1 + 0.08 * (it.lv || 0) : 1))}</div>`;
    if (it.subs && it.subs.length) h += `<ul class="isubs">${it.subs.map(s => `<li>${fmtStat(s.s, s.v)}</li>`).join('')}</ul>`;
    if (it.sockets && it.sockets.length) h += `<div class="isock">${it.sockets.map(g => g ? `<span class="gem" style="--c:${D.GEMS.find(x => x.k === g.gem).c}">${esc(g.name)} · ${fmtStat(g.main.s, g.main.v)}</span>` : '<span class="gem empty">ช่องเจมว่าง</span>').join('')}</div>`;
    if (it.set) { const st = [...D.GEAR_SETS, ...D.ACC_SETS, ...D.RUNE_SETS].find(x => x.k === it.set); if (st) { const b = st.th ? st.th.map((t, i) => `${[2, 4, 6][i]} ชิ้น: ${t}`) : Object.entries(st).filter(([k]) => /^b\d/.test(k)).map(([k, v]) => `${k.slice(1)} ชิ้น: ${Object.entries(v).map(([a, b]) => fmtStat(a, b)).join(', ')}`); h += `<div class="iset"><b>เซ็ต ${esc(st.n)}</b>${b.map(x => `<div>${esc(x)}</div>`).join('')}</div>`; } }
    if (it.relic) { const r = D.RELICS.find(x => x.k === it.relic); h += `<div class="iset"><b>Relic</b><div>${esc(r.th.replace('{v}', it.rv))}</div></div>`; }
    if (it.core) { const c = D.CORE_RUNES.find(x => x.k === it.core); h += `<div class="iset"><b>รูนแกน</b><div>${esc(c.th)}</div></div>`; }
    if (it.affix) { const a = D.T10_AFFIX.find(x => x.k === it.affix); h += `<div class="iset prim"><b>Affix ปฐมกาล</b><div>${esc(a.th)}</div></div>`; }
    if (it.price) h += `<div class="muted">ราคา ${U.fmt(it.price)} ทอง · ผู้ขาย ${esc(it.seller)}</div>`;
    else if (S.isEquip(it) || it.kind === 'rune' || it.kind === 'gem') h += `<div class="muted">ขาย NPC ${U.fmt(S.itemPrice(it))} ทอง</div>`;
    return h + `<div class="iact">${actions}</div></div>`;
  };
  const findItem = uid => S.save.inv.find(i => i.uid === uid) || Object.values(S.save.eq).find(i => i && i.uid === uid) || S.save.fashion.owned.find(i => i.uid === uid) || (S.save.runeBoard.flat().find(i => i && i.uid === uid)) || (UI.market || []).find(i => i.uid === uid);
  UI.findItem = findItem;

  const statRows = (st) => ['hp', 'atk', 'def', 'crit', 'critDmg', 'aspd', 'cdr', 'spd', 'ls', 'dr', 'ccRes', 'pvpDmg', 'pvpDef', 'elem', 'regen', 'drop', 'xp', 'gold'].map(k => `<div class="sr"><span>${D.STAT_TH[k]}</span><b>${D.PCT[k] ? (Math.round(st[k] * 10) / 10) + '%' : U.fmt(st[k])}</b></div>`).join('');

  UI.PANELS = {
    char: { title: 'ตัวละคร', tabs: [['eq', 'อุปกรณ์'], ['stat', 'สเตตัส'], ['cls', 'เปลี่ยนคลาส'], ['title', 'ฉายา']], render(tab, P) {
      const s = S.save; const c = S.calcPlayer();
      if (tab === 'cls') { const cur = D.CLS[s.cls]; return `<p class="muted">กดเลือกคลาสแล้วเปลี่ยนทันที สกิลทั้ง 15 ทรัพยากร และรูปลักษณ์เปลี่ยนตาม · เลเวล เกียร์ และกระเป๋าใช้ร่วมกันทุกคลาส · รูนสกิลแยกเก็บตามคลาส${W.mode && W.mode.pvp ? ' · <b class="bad">เปลี่ยนคลาสไม่ได้ระหว่างแมตช์ PvP/ยึดปราสาท</b>' : ''}</p>
        <div class="cgrid">${D.CLASSES.map(k => `<button class="ccard ${k.id === s.cls ? 'sel' : ''}" data-act="swapcls" data-cls="${k.id}"><img src="${UI.portraitURL(k.id)}" alt=""><b>${k.name}</b><small>${k.th}</small><i style="color:${D.ELEM[k.elem].pal[1]}">${D.ROLES[k.role].th} · ${k.rng} ช่อง</i></button>`).join('')}</div>
        <h4>สกิลของ ${cur.name}</h4><div class="cd-skills">${cur.skills.map((sk, i) => `<div class="cds" title="${esc(D.descSkill(sk))}"><img src="${UI.skillIcon(sk)}" alt=""><span><b>${esc(sk.name)}</b><small>[${D.KEYS[i]}] Lv${sk.unlock} · ${D.ARCH[sk.arch].th}</small></span></div>`).join('')}</div>`; }
      if (tab === 'stat') return `<div class="cpbig">CP <b>${U.fmt(c.cp)}</b></div><div class="statgrid">${statRows(c.st)}</div><h4>เซ็ตที่ทำงาน</h4><div class="muted">${Object.entries(c.sets).filter(([, n]) => n >= 2).map(([k, n]) => { const st = [...D.GEAR_SETS, ...D.ACC_SETS].find(x => x.k === k); return st ? `${st.n} (${n} ชิ้น)` : ''; }).join(' · ') || 'ยังไม่มี'}</div>`;
      if (tab === 'title') { const titles = D.ACHIEVEMENTS.filter(a => a.title && s.ach[a.id]).concat((s.titles || []).map(t => ({ title: t }))); return `<p class="muted">ฉายาได้จากความสำเร็จ แสดงเหนือชื่อตัวละคร</p><div class="list">${titles.map(a => `<button class="btn ${s.title === a.title ? 'primary' : ''}" data-act="settitle" data-t="${esc(a.title)}">«${esc(a.title)}»</button>`).join('') || '<div class="muted">ยังไม่มีฉายา</div>'}<button class="btn" data-act="settitle" data-t="">ไม่แสดงฉายา</button></div>`; }
      const slot = (sl) => { const it = s.eq[sl.k]; const lock = sl.unlock !== undefined && !S.accUnlocked(sl.k); return `<div class="eqs ${lock ? 'lock' : ''}"><small>${sl.th}${lock ? ` (เปิดที่ Jewel Abyss ชั้น ${sl.unlock})` : ''}</small>${it ? itemCell(it, 'seleq') : '<div class="icell empty"></div>'}</div>`; };
      const sel = P.sel ? findItem(P.sel) : null;
      return `<div class="two"><div><h4>เกียร์</h4><div class="eqgrid">${D.GEAR_SLOTS.map(slot).join('')}</div><h4>เครื่องประดับ (10 ช่อง) + Relic</h4><div class="eqgrid">${D.ACC_SLOTS.map(slot).join('')}${slot(D.RELIC_SLOT)}</div></div>
        <div>${UI.itemDetail(sel, sel ? `<button class="btn" data-act="unequip" data-slot="${Object.keys(s.eq).find(k => s.eq[k] === sel)}">ถอด</button>` : '')}<div class="cpbig small">CP <b>${U.fmt(c.cp)}</b></div></div></div>`;
    } },
    inv: { title: 'กระเป๋า', tabs: [['all', 'ทั้งหมด'], ['gear', 'เกียร์'], ['acc', 'เครื่องประดับ'], ['rune', 'รูน'], ['gem', 'เจม'], ['bag', 'ของใช้/วัสดุ']], render(tab, P) {
      const s = S.save;
      if (tab === 'bag') { const b = s.bag; return `<div class="bagrow">${[['hpPot', 'ยา HP'], ['mpPot', 'ยาทรัพยากร'], ['ret', 'สกรอลวาร์ป'], ['foodXp', 'อาหาร EXP'], ['foodDrop', 'อาหารดรอป'], ['protect', 'Protect Scroll'], ['reforge', 'Reforge Scroll']].map(([k, n]) => `<div class="bagc"><b>${b[k] || 0}</b><span>${n}</span>${k.startsWith('food') ? `<button class="mini-btn" data-act="food" data-k="${k}">ใช้</button>` : k === 'ret' ? '<button class="mini-btn" data-act="ret">ใช้</button>' : ''}</div>`).join('')}</div>
        <h4>หินตีบวก</h4><div class="bagrow">${b.stones.map((n, i) => `<div class="bagc"><b class="tc t${i + 1}">${n}</b><span>T${i + 1}</span></div>`).join('')}</div>
        <h4>วัสดุและสกุลเงิน</h4><div class="bagrow"><div class="bagc"><b>${U.fmt(s.gold)}</b><span>ทอง</span></div><div class="bagc"><b>${U.fmt(s.honor)}</b><span>Honor</span></div><div class="bagc"><b>${U.fmt(s.war)}</b><span>แต้มสงคราม</span></div><div class="bagc"><b>${s.runeDust}</b><span>Rune Dust</span></div><div class="bagc"><b>${s.jewelDust}</b><span>Jewel Dust</span></div><div class="bagc"><b>${s.thread}</b><span>ด้ายแฟชั่น</span></div></div>`; }
      const list = s.inv.filter(i => tab === 'all' || i.kind === tab || (tab === 'acc' && i.kind === 'relic'));
      const sel = P.sel ? findItem(P.sel) : null; const inInv = sel && s.inv.includes(sel);
      let acts = ''; if (sel && inInv) { if (S.isEquip(sel)) acts += '<button class="btn primary" data-act="equip">สวมใส่</button>'; if (sel.kind === 'rune') acts += '<button class="btn primary" data-act="runeequip">ใส่ในแผงรูน</button>'; acts += '<button class="btn" data-act="sell">ขาย</button><button class="btn" data-act="salvage">แยกชิ้นส่วน</button>'; }
      return `<div class="two"><div><div class="invtop"><span>${s.inv.length}/${S.invMax}</span><button class="mini-btn" data-act="sort">เรียง</button><button class="mini-btn" data-act="sellall">ขายระดับ 1–2 ทั้งหมด</button></div><div class="igrid">${list.map(i => itemCell(i, 'selinv', P.sel === i.uid ? 'aria-pressed="true"' : '')).join('') || '<div class="muted">ว่าง</div>'}</div></div><div>${UI.itemDetail(sel, acts)}</div></div>`;
    } },
    skills: { title: 'สกิล (25) + แพสซีฟ 5', render(tab, P) {
      const s = S.save; const cls = D.CLS[s.cls]; const p = W.player;
      return `<p class="muted">สกิลโจมตี 15 ช่อง [1–0, Q E R T F] · บัฟ 5 ช่อง [Shift+Q E R T F] · อัลติเมต 4 ช่อง [Shift+1–4] · อัลติเมตชุดคลาส [Shift+5] · รูนสกิล 3 แบบต่อสกิล ดรอปจาก Rune Sanctum</p><div class="sklist">${cls.skills.map((base, i) => {
        const v = (s.skillRunes[s.cls] || {})[i] || 0; const sk = D.applyVariant(base, v); const un = s.lvl >= base.unlock || W.gm.allSkills;
        const vb = [0, 1, 2, 3].map(k => { const own = k === 0 || s.ownedSR[s.cls + '_' + i + '_' + k] || W.gm.allRunes; return `<button class="vbtn ${v === k ? 'on' : ''} ${own ? '' : 'no'}" data-act="setsr" data-i="${i}" data-v="${k}" title="${k ? esc(D.descSkill(D.applyVariant(base, k))) : 'ปกติ'}">${k ? D.VARIANTS[k].th : 'ปกติ'}</button>`; }).join('');
        return `<div class="skrow ${un ? '' : 'locked'}"><img src="${UI.skillIcon(sk)}" alt=""><div class="skinfo"><b>[${D.KEYS[i]}] ${esc(base.name)}</b> <small>${D.SLOT_TH(i)} · ${D.ARCH[base.arch].th} · Lv${base.unlock} · CD ${(sk.c).toFixed(1)} วิ · ใช้ ${sk.m} ${cls.res}</small><p>${esc(D.descSkill(sk))}</p></div><div class="vrow">${vb}</div></div>`; }).join('')}</div>`;
    } },
    runes: { title: 'แผงรูน', render(tab, P) {
      const s = S.save; const page = s.runeBoard[s.page]; const sel = P.sel ? findItem(P.sel) : null;
      const board = D.RUNE_BOARD.map((r, i) => { const it = page[i]; const open = S.runeSlotOpen(i); return `<div class="rslot ${r.c} ${open ? '' : 'lock'}"><small>${D.RUNE_COLORS[r.c].th}${open ? '' : ' · Lv' + r.lv}</small>${it ? itemCell(it, 'selrune') + `<button class="mini-btn" data-act="runeremove" data-i="${i}">ถอด</button>` : '<div class="icell empty"></div>'}</div>`; }).join('');
      const runes = s.inv.filter(i => i.kind === 'rune');
      const acts = sel ? (s.inv.includes(sel) ? '<button class="btn primary" data-act="runeequip">ใส่ช่องที่ตรงสี</button>' : '') + (sel.core ? '' : `<button class="btn" data-act="runeup">อัปเกรด (Rune Dust ${Math.round(8 * sel.tier * (1 + sel.lv))})</button>`) : '';
      return `<div class="pagesel">${[0, 1, 2].map(i => `<button class="tab ${s.page === i ? 'on' : ''}" data-act="runepage" data-i="${i}">หน้า ${i + 1}</button>`).join('')}<span class="muted">Rune Dust: ${s.runeDust}</span></div><div class="two"><div><div class="rboard">${board}</div><h4>รูนในกระเป๋า</h4><div class="igrid">${runes.map(r => itemCell(r, 'selrune')).join('') || '<div class="muted">ยังไม่มีรูน — ลง Rune Sanctum</div>'}</div></div><div>${UI.itemDetail(sel, acts)}<h4>โบนัสเซ็ตรูน</h4><div class="muted">${D.RUNE_SETS.map(st => `${st.n}: 2 ชิ้น ${Object.entries(st.b2).map(([a, b]) => fmtStat(a, b))} · 4 ชิ้น ${Object.entries(st.b4).map(([a, b]) => fmtStat(a, b))}`).join('<br>')}</div></div></div>`;
    } },
    fashion: { title: 'แฟชั่น', tabs: [['wear', 'ชุดที่ใส่'], ['pet', 'สัตว์เลี้ยง/พาหนะ']], render(tab, P) {
      const s = S.save; const sel = P.sel ? findItem(P.sel) : null;
      if (tab === 'pet') return `<h4>สัตว์เลี้ยง (เก็บของอัตโนมัติ + บัฟเล็กน้อย)</h4><div class="list">${D.PETS.map(p => `<button class="btn ${s.pet === p.k ? 'primary' : ''} ${s.pets.includes(p.k) ? '' : 'dis'}" data-act="setpet" data-k="${p.k}">${p.th} — ${Object.entries(p.bonus).map(([a, b]) => fmtStat(a, b))}${s.pets.includes(p.k) ? '' : ' (ซื้อที่คอกสัตว์)'}</button>`).join('')}<button class="btn" data-act="setpet" data-k="">ไม่ใช้สัตว์เลี้ยง</button></div>
        <h4>พาหนะ (ขี่อัตโนมัติเมื่อเดินนอกการต่อสู้ 3 วิ)</h4><div class="list">${D.MOUNTS.map(m => `<button class="btn ${s.mount === m.k ? 'primary' : ''} ${s.mounts.includes(m.k) ? '' : 'dis'}" data-act="setmount" data-k="${m.k}">${m.th} +${m.spd}%${s.mounts.includes(m.k) ? '' : ' (ซื้อที่คอกสัตว์)'}</button>`).join('')}<button class="btn" data-act="setmount" data-k="">ไม่ใช้พาหนะ</button></div>`;
      const eq = s.fashion.eq; const setT = S.fashionSetCount();
      const slots = D.FASHION_SLOTS.map(f => `<div class="eqs"><small>${f.th}</small>${eq[f.k] ? itemCell(eq[f.k], 'selfash') + `<button class="mini-btn" data-act="fashremove" data-slot="${f.k}">ถอด</button>` : '<div class="icell empty"></div>'}</div>`).join('');
      const acts = sel ? `<button class="btn primary" data-act="fashequip">ใส่</button><div class="dyes">${D.DYES.map(c => `<button class="dye" style="background:${c}" data-act="dye" data-c="${c}" aria-label="ย้อมสี ${c}"></button>`).join('')}</div><small class="muted">ย้อมสีใช้ด้ายแฟชั่น 3 ชิ้น (มี ${s.thread})</small>` : '';
      return `<div class="two"><div><canvas id="fprev" width="120" height="150" class="fprev"></canvas>${setT !== null ? `<div class="setok">เซ็ต ${D.FASHION_THEMES[setT].th} ครบ 3 ชิ้น: ออร่าเซ็ตทำงาน</div>` : ''}<div class="eqgrid">${slots}</div></div><div><h4>ตู้เสื้อผ้า (${s.fashion.owned.length})</h4><div class="igrid">${s.fashion.owned.map(i => itemCell(i, 'selfash')).join('') || '<div class="muted">ยังไม่มีชุด — ลง Atelier Tower หรือให้ช่างตัดเย็บทำให้</div>'}</div>${UI.itemDetail(sel, acts)}</div></div>`;
    }, after() { const cv = $('#fprev'); if (!cv) return; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; const sh = SPR.charSheet(S.lookPlayer()); cancelAnimationFrame(UI._fpA); let f = 0; const lp = () => { if (!document.body.contains(cv)) return; f++; x.clearRect(0, 0, 120, 150); const fr = Math.floor(f / 10) % 4; x.drawImage(sh.sheet, fr * 24, sh.idx.frontwalk * 32, 24, 32, 12, 6, 96, 128); UI._fpA = requestAnimationFrame(lp); }; lp(); } },
    dungeon: { title: 'ดันเจี้ยน (4 แห่ง x 1000 ชั้น)', render(tab, P) {
      const s = S.save; P.dg = P.dg || 'armory'; const dg = D.DUNGEONS.find(d => d.id === P.dg); const d = s.dungeons[dg.id] || { best: 0, cp: 0, daily: { date: '', runs: 0 } };
      const runs = d.daily.date === U.today() ? d.daily.runs : 0; P.calcF = P.calcF || Math.max(1, d.best || 1);
      const starts = [1]; for (let f = 10; f <= d.cp && f < 1000; f += 10) starts.push(f + 1);
      P.start = starts.includes(P.start) ? P.start : starts[starts.length - 1]; P.mercN = P.mercN || 0;
      const dist = D.dungeonDist(P.calcF); const T = D.tierOfFloor(P.calcF);
      return `<div class="dgcards">${D.DUNGEONS.map(x => { const dd = s.dungeons[x.id] || {}; return `<button class="dgc ${x.id === P.dg ? 'sel' : ''}" data-act="seldg" data-id="${x.id}" style="--c:${x.c}"><b>${x.n}</b><small>${x.th}</small><span>สูงสุด ชั้น ${dd.best || 0}</span></button>`; }).join('')}</div>
        <div class="two"><div><h4>${dg.n}</h4><p class="muted">${dg.desc}</p><p>ไม่จำกัดเลเวล · ลงได้จนกว่าจะตาย · ตายชั้นไหน สุ่มรางวัลระดับเท่ากับหรือต่ำกว่าชั้นนั้น · Checkpoint ทุก 10 ชั้น</p>
        <div class="sr"><span>ชั้นสูงสุด</span><b>${d.best}</b></div><div class="sr"><span>Checkpoint</span><b>${d.cp}</b></div><div class="sr"><span>รอบวันนี้ (รางวัลเต็ม ${D.DUNGEON_DAILY_FULL} รอบ)</span><b>${runs}</b></div>
        <label class="fl">เริ่มที่ชั้น<select id="dgstart">${starts.map(f => `<option value="${f}" ${f === P.start ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
        <label class="fl">ทหารรับจ้างในปาร์ตี้ (สูงสุด 4)<select id="dgmerc">${[0, 1, 2, 3, 4].map(n => `<option value="${n}" ${n === P.mercN ? 'selected' : ''}>${n} คน${n ? ` (~${U.fmt(S.mercCost(1) * n)} ทอง)` : ''}</option>`).join('')}</select></label>
        <button class="btn primary big" data-act="enterdg">เข้าดันเจี้ยน</button></div>
        <div><h4>เครื่องคำนวณโอกาสดรอป</h4><label class="fl">ถ้าตายที่ชั้น<input type="number" id="calcf" min="1" max="1000" value="${P.calcF}"></label>
        <div class="muted">ระดับของชั้นนี้: ${tierSpan(T, `${T} ${D.TIERS[T - 1].n}`)} · p = ${D.bandP(P.calcF).toFixed(2)}</div>
        <table class="tbl"><tr><th>ระดับ</th><th>โอกาส</th></tr>${dist.map(([t, pp]) => `<tr><td>${tierSpan(t, t + ' ' + D.TIERS[t - 1].n)}</td><td>${(pp * 100).toFixed(1)}%</td></tr>`).join('')}</table>
        <h4>ช่วงชั้น 10 ระดับ</h4><table class="tbl small"><tr><th>ระดับ</th><th>ชั้น</th><th>เลเวลมอนสเตอร์</th></tr>${D.FLOOR_BANDS.map(([a, b], i) => `<tr><td>${tierSpan(i + 1)}</td><td>${a}–${b}</td><td>${Math.min(D.MAX_LV, Math.round(a * 0.6 + 3))}–${Math.min(D.MAX_LV, Math.round(b * 0.6 + 3))}</td></tr>`).join('')}</table></div></div>`;
    }, after(P) { const c = $('#calcf'); if (c) c.onchange = () => { P.calcF = U.clamp(+c.value || 1, 1, 1000); UI.renderPanel(); }; const st = $('#dgstart'); if (st) st.onchange = () => { P.start = +st.value; }; const mc = $('#dgmerc'); if (mc) mc.onchange = () => { P.mercN = +mc.value; }; } },
    pvp: { title: 'สนาม PvP', tabs: [['room', 'สร้างห้อง'], ['shop', 'ร้าน Honor'], ['stat', 'สถิติ']], render(tab, P) {
      const s = S.save;
      if (tab === 'shop') return `<p class="muted">Honor: <b>${U.fmt(s.honor)}</b></p><div class="list">${S.honorShop().map((e, i) => `<button class="btn" data-act="honorbuy" data-i="${i}">${esc(e.th)} — ${e.cost} Honor</button>`).join('')}</div>`;
      if (tab === 'stat') return `<div class="sr"><span>ชนะ</span><b>${s.pvp.wins}</b></div><div class="sr"><span>แพ้</span><b>${s.pvp.losses}</b></div><div class="sr"><span>Honor</span><b>${U.fmt(s.honor)}</b></div>`;
      const c = P.cfg = P.cfg || { mode: 'tdm', map: 0, size: 5, diff: 1, mercs: true, normalized: false, preset: 0, opp: 'bots' };
      const md = D.PVP_MODES.find(x => x.id === c.mode); const mp = D.PVP_MAPS[c.map]; const sizes = md.sizes.filter(z => z <= mp.max); if (!sizes.includes(c.size)) c.size = sizes[sizes.length - 1] || md.sizes[0];
      const cp = W.player.cpv; const df = D.DIFFS[c.diff];
      return `<div class="two"><div><h4>โหมด</h4><div class="chips">${D.PVP_MODES.map(m => `<button class="chip ${m.id === c.mode ? 'on' : ''}" data-act="pvpset" data-k="mode" data-v="${m.id}">${m.th}</button>`).join('')}</div><p class="muted">${md.desc}</p>
        <h4>แผนที่</h4><div class="chips">${D.PVP_MAPS.map((m, i) => `<button class="chip ${i === c.map ? 'on' : ''} ${md.sizes.some(z => z <= m.max) ? '' : 'dis'}" data-act="pvpset" data-k="map" data-v="${i}">${m.th}</button>`).join('')}</div><p class="muted">${mp.n} · ${mp.size} · ${mp.mech} · สูงสุด ${mp.max}v${mp.max}</p>
        <h4>ขนาดทีม</h4><div class="chips">${[1, 3, 5, 10, 15].map(z => `<button class="chip ${z === c.size ? 'on' : ''} ${sizes.includes(z) ? '' : 'dis'}" data-act="pvpset" data-k="size" data-v="${z}">${z}v${z}</button>`).join('')}</div></div>
        <div><h4>ฝ่ายตรงข้าม</h4><div class="chips"><button class="chip on">🤖 บอททั้งหมด</button><button class="chip dis" title="ต้องมีเซิร์ฟเวอร์ออนไลน์">👥 ผู้เล่นจริง</button><button class="chip dis" title="ต้องมีเซิร์ฟเวอร์ออนไลน์">🔀 ผสม</button></div><p class="muted">การจับคู่ผู้เล่นจริงต้องมีเซิร์ฟเวอร์ — เวอร์ชันเว็บนี้สู้กับบอท AI</p>
        <h4>ความยากของบอท</h4><div class="chips">${D.DIFFS.map((d, i) => `<button class="chip ${i === c.diff ? 'on' : ''}" data-act="pvpset" data-k="diff" data-v="${i}">${d.th}</button>`).join('')}</div>
        <p class="muted">CP ของคุณ ${U.fmt(cp)} → บอทศัตรู CP ${U.fmt(cp)} (พลังเท่ากันทุกระดับ) · ความยากเปลี่ยนแค่ความฉลาด: ลังเล/ไม่ตี ${Math.round((df.idle || 0) * 100)}% ของเวลา · เล็งพลาด ±${df.miss || 0} ช่อง · ตอบสนอง ${df.react} วิ · หลบสกิล ${Math.round(df.dodge * 100)}%</p>
        <label class="chk"><input type="checkbox" id="pvpmerc" ${c.mercs ? 'checked' : ''}> เติมทหารรับจ้างฝั่งเรา (${c.size - 1} คน · CP ${U.fmt(cp * 0.9)} · ~${U.fmt(S.mercCost(c.diff) * (c.size - 1))} ทอง ถ้าไม่มีสัญญา)</label>
        <label class="fl">ชุดทหารรับจ้าง<select id="pvppreset">${[0, 1, 2].map(i => `<option value="${i}" ${c.preset === i ? 'selected' : ''}>ชุด ${i + 1} (${(s.mercPresets[i] || []).length} คลาส${(s.mercPresets[i] || []).length ? '' : ' · สุ่ม'})</option>`).join('')}</select></label>
        <label class="chk"><input type="checkbox" id="pvpnorm" ${c.normalized ? 'checked' : ''}> อารีน่า Normalized Stats (สเตตัสทุกคนเท่ากัน · ห้ามใช้ยา)</label>
        <p class="muted">รางวัล: Honor ${Math.round(df.pct * 100)}% × ${df.reward}${df.chest ? ` · หีบ PvP สูงสุดระดับ ${df.chest}` : ' · หีบเฉพาะระดับนรกขึ้นไป'} · ไม่จำกัดรอบต่อวัน</p>
        <button class="btn primary big" data-act="startpvp">เริ่มแมตช์</button></div></div>`;
    }, after(P) { const m = $('#pvpmerc'); if (m) m.onchange = () => P.cfg.mercs = m.checked; const n = $('#pvpnorm'); if (n) n.onchange = () => P.cfg.normalized = n.checked; const pr = $('#pvppreset'); if (pr) pr.onchange = () => P.cfg.preset = +pr.value; } },
    mercs: { title: 'ค่ายทหารรับจ้าง', tabs: [['list', 'ทหารรับจ้าง 20 คลาส'], ['preset', 'จัดทีมล่วงหน้า']], render(tab, P) {
      const s = S.save; const base = S.mercCost(1);
      if (tab === 'preset') { P.pi = P.pi || 0; const pr = s.mercPresets[P.pi]; return `<div class="pagesel">${[0, 1, 2].map(i => `<button class="tab ${P.pi === i ? 'on' : ''}" data-act="mpreset" data-i="${i}">ชุด ${i + 1}</button>`).join('')}<button class="mini-btn" data-act="mpclear">ล้างชุดนี้</button></div><p class="muted">คลิกคลาสเพื่อเพิ่มในชุด (สูงสุด 14) · ชุดว่าง = สุ่มคลาส</p><div class="chips">${pr.map((c, i) => `<button class="chip on" data-act="mpdel" data-i="${i}">${D.CLS[c].name} ✕</button>`).join('') || '<span class="muted">ว่าง</span>'}</div><h4>เพิ่มคลาส</h4><div class="chips">${D.CLASSES.map(c => `<button class="chip" data-act="mpadd" data-c="${c.id}">${c.name}</button>`).join('')}</div>`; }
      return `<p class="muted">สเตตัสบอทรับจ้าง = CP ของผู้เล่นพอดี · ยศเพิ่มความฉลาด (ไม่เพิ่มสเตตัส) · ราคาต่อแมตช์ ${U.fmt(base)} ทอง</p><table class="tbl"><tr><th>คลาส</th><th>ยศ</th><th>แมตช์</th><th>บุคลิก</th><th>สัญญา</th><th>จ้าง</th></tr>${D.CLASSES.map(c => { const m = S.merc(c.id); const r = S.mercRank(c.id); const ct = m.contract ? (m.contract.type === 'day' ? (m.contract.until > Date.now() ? 'รายวัน' : '-') : `เหลือ ${m.contract.left}`) : '-'; return `<tr><td>${c.name}<br><small>${c.th}</small></td><td>${r.th}</td><td>${m.m}</td><td>${D.PERSONAS.find(p => p.k === m.persona).th}</td><td>${ct}</td><td class="nowrap"><button class="mini-btn" data-act="hire" data-c="${c.id}" data-t="match">1 แมตช์ ${U.fmt(base)}</button><button class="mini-btn" data-act="hire" data-c="${c.id}" data-t="ten">10 แมตช์ ${U.fmt(base * 8)}</button><button class="mini-btn" data-act="hire" data-c="${c.id}" data-t="day">1 วัน ${U.fmt(base * 15)}</button></td></tr>`; }).join('')}</table>`;
    } },
    guild: { title: 'กิลด์', tabs: [['info', 'ภาพรวม'], ['war', 'ท้ากิลด์/ยึดปราสาท'], ['rank', 'อันดับ'], ['members', 'สมาชิก'], ['shop', 'ร้านแต้มสงคราม'], ['hist', 'ประวัติศึก']], render(tab, P) {
      const s = S.save; const g = s.guild;
      if (!g) return `<h4>สร้างกิลด์</h4><p class="muted">ต้องมีกิลด์ก่อนจึงจะท้ากิลด์อื่นและยึดปราสาทได้</p><label class="fl">ชื่อกิลด์<input id="gname" maxlength="20" value="${esc(s.name)}'s Legion"></label><label class="fl">แท็ก (2–4 ตัว)<input id="gtag" maxlength="4" value="${esc(s.name.slice(0, 3).toUpperCase())}"></label><button class="btn primary" data-act="mkguild">สร้างกิลด์ (ฟรี)</button>`;
      const lg = D.leagueOf(g.rating);
      if (tab === 'info') { const left = S.seasonLeft(); return `<div class="ginfo"><div class="gbadge" style="--c:${lg.c}">${esc(g.tag)}</div><div><h3>${esc(g.name)}</h3><p>เลเวลกิลด์ ${g.lvl} (${g.xp}/${1000 * g.lvl}) · Rating ${g.rating} · ลีก <b style="color:${lg.c}">${lg.n}</b> (รางวัลพื้นฐาน L=${lg.L})</p><p>ชนะ ${g.wins} · แพ้ ${g.losses} · ซีซัน ${S.seasonNo()} เหลือ ${Math.floor(left / 864e5)} วัน</p><p>${S.guildTop3() ? '<b class="good">ติดอันดับ 1–3 ของเซิร์ฟ: ครองปราสาทจริงในโลกเปิด · ดรอป +10% ทุกแผนที่และดันเจี้ยน</b>' : 'ติดอันดับ 1–3 ของซีซันเพื่อครองปราสาทจริงในโลกเปิด (ดรอป +10%)'}</p></div></div>
        <h4>ลีกกิลด์</h4><table class="tbl small"><tr>${D.LEAGUES.map(l => `<th style="color:${l.c}">${l.n}</th>`).join('')}</tr><tr>${D.LEAGUES.map(l => `<td>${l.min}+<br>L=${l.L}${l.gm ? '+' : ''}</td>`).join('')}</tr></table>
        <h4>ปราสาท 5 แห่งต่อฝั่ง</h4><table class="tbl small">${D.CASTLES.map((c, i) => `<tr><td>${i + 1}</td><td>${c.th}</td><td>${c.perkTh}</td></tr>`).join('')}</table>`; }
      if (tab === 'war') { P.size = P.size || 15; P.type = P.type || 'ranked'; P.stake = P.stake || 5000; const wk = S.weekNo(); if (g.declines.week !== wk) g.declines = { week: wk, n: 0 };
        return `<p class="muted">ชักเย่อ 5 ปราสาทต่อฝั่ง · รอบแรกสู้ที่ชายแดน · ชนะ = ยึดปราสาทถัดไป · แพ้ = แนวหน้าถอย · พัก 20 วิระหว่างรอบ · ยึดวังได้ = ชนะทั้งศึก · สูงสุด 11 รอบ/60 นาที</p>
        <div class="chips">${[5, 10, 15].map(z => `<button class="chip ${P.size === z ? 'on' : ''}" data-act="gset" data-k="size" data-v="${z}">${z}v${z}</button>`).join('')}</div>
        <div class="chips">${[['ranked', 'Ranked'], ['friendly', 'Friendly (ซ้อม)'], ['wager', 'Wager (เดิมพัน)']].map(([k, n]) => `<button class="chip ${P.type === k ? 'on' : ''}" data-act="gset" data-k="type" data-v="${k}">${n}</button>`).join('')}</div>
        ${P.type === 'wager' ? `<label class="fl">เดิมพัน (ทอง)<input type="number" id="gstake" min="1000" step="1000" value="${P.stake}"></label>` : ''}
        <table class="tbl"><tr><th>กิลด์</th><th>Rating</th><th>ลีก</th><th></th></tr>${s.rivals.slice().sort((a, b) => b.rating - a.rating).map(r => { const l = D.leagueOf(r.rating); return `<tr><td>${esc(r.name)} <small>&lt;${esc(r.tag)}&gt;</small></td><td>${r.rating}</td><td style="color:${l.c}">${l.n}</td><td><button class="mini-btn" data-act="challenge" data-n="${esc(r.name)}">ท้า</button></td></tr>`; }).join('')}</table><p class="muted">ปฏิเสธคำท้า Ranked ฟรีสัปดาห์ละ 2 ครั้ง (ใช้ไป ${g.declines.n})</p>`; }
      if (tab === 'rank') return `<table class="tbl"><tr><th>#</th><th>กิลด์</th><th>Rating</th><th>ลีก</th></tr>${S.leaderboard().map((r, i) => `<tr class="${r.me ? 'me' : ''}"><td>${i + 1}</td><td>${esc(r.name)}</td><td>${r.rating}</td><td style="color:${D.leagueOf(r.rating).c}">${D.leagueOf(r.rating).n}</td></tr>`).join('')}</table>`;
      if (tab === 'members') return `<p class="muted">สมาชิกกิลด์ (จำลองด้วย AI) ลงศึกยึดปราสาทกับคุณ</p><table class="tbl"><tr><th>ชื่อ</th><th>คลาส</th><th>Lv</th></tr><tr class="me"><td>${esc(s.name)} (หัวหน้า)</td><td>${D.CLS[s.cls].name}</td><td>${s.lvl}</td></tr>${g.members.map(m => `<tr><td>${esc(m.name)}</td><td>${D.CLS[m.cls].name}</td><td>${m.lvl}</td></tr>`).join('')}</table>`;
      if (tab === 'shop') return `<p class="muted">แต้มสงคราม: <b>${U.fmt(s.war)}</b></p><div class="list">${S.warShop().map((e, i) => `<button class="btn" data-act="warbuy" data-i="${i}">${esc(e.th)} — ${e.cost} แต้ม</button>`).join('')}</div>`;
      if (tab === 'hist') return `<table class="tbl"><tr><th>คู่แข่ง</th><th>ผล</th><th>แนวหน้า</th><th>ประเภท</th></tr>${g.history.map(h => `<tr><td>${esc(h.vs)}</td><td class="${h.w === 0 ? 'good' : 'bad'}">${h.w === 0 ? 'ชนะ' : 'แพ้'}</td><td>${h.line > 0 ? '+' : ''}${h.line}</td><td>${h.type}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">ยังไม่มีศึก</td></tr>'}</table>`;
    }, after(P) { const st = $('#gstake'); if (st) st.onchange = () => P.stake = Math.max(1000, +st.value || 1000); } },
    codex: { title: 'สมุดสะสม (Codex) & ความสำเร็จ', tabs: [['mon', 'มอนสเตอร์'], ['ach', 'ความสำเร็จ']], render(tab) {
      const s = S.save;
      if (tab === 'ach') return `<table class="tbl">${D.ACHIEVEMENTS.map(a => `<tr class="${s.ach[a.id] ? 'me' : ''}"><td>${s.ach[a.id] ? '✔' : '·'}</td><td>${a.th}</td><td>${Object.entries(a.bonus).map(([k, v]) => fmtStat(k, v)).join(', ')}</td><td>${a.title ? '«' + a.title + '»' : ''}</td></tr>`).join('')}</table>`;
      const done = Object.values(s.codex).filter(n => n >= 50).length;
      return `<p class="muted">ฆ่าครบ 50 ตัวต่อชนิด ได้ ATK +0.25% (สูงสุด 5%) · ครบแล้ว ${done} ชนิด</p>${D.FARM_MAPS.map(m => `<h4>${m.th}</h4><div class="chips">${[...m.mobs, m.champ, m.rare, m.boss, m.world].map(x => { const n = s.codex[x.n] || 0; return `<span class="chip ${n >= 50 ? 'on' : ''}">${esc(x.n)} ${Math.min(50, n)}/50</span>`; }).join('')}</div>`).join('')}`;
    } },
    quests: { title: 'ภารกิจ', render() {
      const s = S.save; S.dailyCheck(); const q = D.MAIN_QUESTS[s.quests.main];
      return `<h4>ภารกิจหลัก (${s.quests.main + 1}/${D.MAIN_QUESTS.length})</h4><p>${esc(S.questText())}</p>${q && q.map ? `<button class="btn" data-act="gofarmq" data-m="${q.map}">ไปที่แผนที่</button>` : ''}
        <h4>ภารกิจรายวัน</h4><table class="tbl">${D.DAILY_QUESTS.map(dq => { const p = s.quests.daily.prog[dq.id] || 0; const d = s.quests.daily.done[dq.id]; return `<tr class="${d ? 'me' : ''}"><td>${esc(dq.th)}</td><td>${Math.min(p, dq.n)}/${dq.n}</td><td>${dq.gold ? U.fmt(dq.gold) + ' ทอง' : dq.honor ? dq.honor + ' Honor' : dq.war + ' แต้มสงคราม'}</td></tr>`; }).join('')}</table>
        <p class="muted">เปิด "ออโต้ภารกิจ" แล้วตัวละครจะเดินทางไปแผนที่ของภารกิจและฟาร์มให้อัตโนมัติ</p>`;
    } },
    map: { title: 'แผนที่โลก / วาร์ป', render() {
      const s = S.save;
      return `<h4>เมือง</h4><div class="list">${D.TOWNS.map(t => `<button class="btn" data-act="gotown" data-id="${t.id}">${t.th}</button>`).join('')}<button class="btn" data-act="gogallery">สนามซ้อม VFX (ดูเอฟเฟกต์สกิลทั้งหมด)</button></div>
        <h4>แผนที่ฟาร์ม ${D.FARM_MAPS.length} แผนที่ · Lv 1–${D.MAX_LV}</h4><table class="tbl">${D.FARM_MAPS.map((m, i) => `<tr class="${s.lvl >= m.lv[0] && s.lvl <= m.lv[1] ? 'me' : ''}"><td>${i + 1}</td><td>${m.th}<br><small>${m.n}</small></td><td>Lv ${m.lv[0]}–${m.lv[1]}</td><td>B=${m.B} · บอสโลกถึงระดับ ${m.B + 4}</td><td><button class="mini-btn" data-act="gofarm" data-i="${i}">วาร์ป</button></td></tr>`).join('')}</table>`;
    } },
    settings: { title: 'ตั้งค่า', after() { clearInterval(UI._vqT); UI._vqT = setInterval(() => { const e = $('#vqstat'); if (!e) return clearInterval(UI._vqT); e.textContent = `ตอนนี้: อนุภาค ${V.parts.length} · เอฟเฟกต์ ${V.fx.length} (สูงสุด ${V.LEVELS[V.level].fxCap})`; }, 300); const r = $('#zrange'); if (r) r.oninput = () => { G.setZoomPct(+r.value); $('#zset').textContent = r.value + '%'; }; }, render() {
      const s = S.save; const st = s.settings;
      return `<h4>ซูม <span id="zset">${G.zTarget}%</span></h4><input type="range" id="zrange" min="${G.ZMIN}" max="${G.ZMAX}" step="1" value="${G.zTarget}" style="width:100%"><div class="chips">${[50, 75, 100, 125, 150, 200, 250, 300].map(z => `<button class="chip ${G.zTarget === z ? 'on' : ''}" data-act="setzoom" data-v="${z}">${z}%</button>`).join('')}</div><p class="muted">ล้อเมาส์ (ปรับละเอียดต่อเนื่อง) · ปุ่ม + / − (ทีละ 10%) · จีบนิ้วบนมือถือ — ซูมนุ่มนวลแบบเคลื่อนไหว ภาพพิกเซลยังคมชัด</p>
        <h4>คุณภาพ VFX: ${V.LEVELS[V.level].th}</h4><div class="chips">${V.LEVELS.map((L, i) => `<button class="chip ${V.level === i ? 'on' : ''}" data-act="setq" data-v="${i}">VFX ${L.th}</button>`).join('')}</div><p class="muted">${V.LEVELS[V.level].desc}</p><p class="muted" id="vqstat"></p>
        <h4>ขนาด UI ${st.uiScale || 100}%</h4><div class="chips">${[80, 90, 100, 110, 120, 130].map(z => `<button class="chip ${(st.uiScale || 100) === z ? 'on' : ''}" data-act="uiscale" data-v="${z}">${z}%</button>`).join('')}</div><p class="muted">ปรับขนาดกรอบ HUD ทั้งหมด · ย่อแชท (▾) และภารกิจ (คลิกหัวข้อ) ได้</p>
        <h4>ระบบอัตโนมัติ</h4><label class="chk"><input type="checkbox" data-set="autoPot" ${st.autoPot ? 'checked' : ''}> ใช้ยา HP อัตโนมัติเมื่อต่ำกว่า 40%</label><label class="chk"><input type="checkbox" data-set="autoLoot" ${st.autoLoot ? 'checked' : ''}> เก็บของอัตโนมัติ (ต้องมีสัตว์เลี้ยง หรือเปิดออโต้)</label><label class="chk"><input type="checkbox" data-set="autoSell" ${st.autoSell ? 'checked' : ''}> ขายไอเทมระดับ 1–2 อัตโนมัติ</label>
        <h4>เซฟ</h4><div class="list"><button class="btn" data-act="savenow">บันทึกตอนนี้</button><button class="btn" data-act="totitle">กลับหน้าแรก</button><button class="btn danger" data-act="askwipe">ลบเซฟและเริ่มใหม่</button></div><div id="wipeconfirm"></div>
        <h4>ปุ่มลัด</h4><p class="muted">WASD/ลูกศร เดิน · คลิกซ้าย เดิน/เลือกเป้า/คุย NPC · คลิกขวา สกิล 1 · 1–0 Q E R T F สกิล · Tab สลับเป้า · Space คุย/ใช้ประตู · ล้อเมาส์ หรือ + / − ซูม · Z ออโต้ · X ออโต้ภารกิจ · H/V ยา · C ตัวละคร · I กระเป๋า · K สกิล · U รูน · N แฟชั่น · L ดันเจี้ยน · P PvP · G กิลด์ · J ภารกิจ · M แผนที่ · B Codex · \` GM · Esc ปิด</p>`;
    } },
    npc: { title: 'NPC', render(tab, P) { return UI.npcRender(P); }, after(P) { const q = $('#shopqty'); if (q) q.onchange = () => P.qty = U.clamp(+q.value || 1, 1, 99); } },
    gm: { title: 'GM Console — ควบคุมทุกอย่าง', tabs: [['player', 'ผู้เล่น'], ['item', 'ไอเทม'], ['world', 'โลก/มอนสเตอร์'], ['dungeon', 'ดันเจี้ยน'], ['pvp', 'PvP/กิลด์'], ['skill', 'แก้สกิล'], ['vfx', 'VFX/สไปรต์'], ['sys', 'ระบบ']], render(tab, P) { return UI.gmRender(tab, P); }, after(P) { UI.gmAfter(P); } }
  };

  // ---------------- NPC services ----------------
  UI.openNpc = (npc) => {
    const role = npc.role || npc; const map = { runesmith: 'runes', merc: 'mercs', arena: 'pvp', guild: 'guild', dungeon: 'dungeon', teleport: 'map', codex: 'codex', quest: 'quests' };
    if (role === 'trainer') { S.goGallery(); return; }
    if (map[role]) { UI.openPanel(map[role]); return; }
    UI.panel = { id: 'npc', role, sel: null, qty: 1 }; $('#panel').hidden = false; UI.PANELS.npc.title = (npc.name || '') + ' · ' + ({ shop: 'ร้านค้า', smith: 'ช่างตีเหล็ก', jeweler: 'ช่างอัญมณี', tailor: 'ช่างตัดเย็บ', market: 'ตลาดประมูล', stable: 'คอกสัตว์' }[role] || ''); UI.renderPanel();
  };
  UI.npcRender = (P) => {
    const s = S.save; const sel = P.sel ? findItem(P.sel) : null;
    if (P.role === 'shop') return `<p class="muted">ทอง ${U.fmt(s.gold)}</p><label class="fl">จำนวน<input type="number" id="shopqty" min="1" max="99" value="${P.qty || 1}"></label><div class="list">${S.SHOP.map((e, i) => `<button class="btn" data-act="buy" data-i="${i}">${esc(e.th)} — ${e.price} ทอง</button>`).join('')}</div>`;
    if (P.role === 'stable') return `<div class="list">${S.STABLE.map((e, i) => { const own = e.type === 'pet' ? s.pets.includes(e.k) : s.mounts.includes(e.k); return `<button class="btn ${own ? 'dis' : ''}" data-act="stablebuy" data-i="${i}">${esc(e.th)} — ${own ? 'มีแล้ว' : e.honor ? e.honor + ' Honor' : U.fmt(e.price) + ' ทอง'}</button>`; }).join('')}</div>`;
    if (P.role === 'market') { UI.market = UI.market || S.marketList(); const acts = sel ? (sel.price ? `<button class="btn primary" data-act="mbuy">ซื้อ ${U.fmt(sel.price)} ทอง</button>` : `<button class="btn primary" data-act="msell">ลงขาย (รับ ${U.fmt(Math.round(S.itemPrice(sel) * 1.2 * 0.95))} หลังหักภาษี 5%)</button>`) : '';
      return `<div class="two"><div><h4>รายการในตลาด (รีเฟรชทุก 10 นาที)</h4><div class="igrid">${UI.market.map(i => itemCell(i, 'npcsel')).join('')}</div><h4>ลงขายจากกระเป๋า</h4><div class="igrid">${s.inv.filter(S.isEquip).map(i => itemCell(i, 'npcsel')).join('')}</div></div><div>${UI.itemDetail(sel, acts)}</div></div>`; }
    if (P.role === 'tailor') { const acts = ''; return `<p>ด้ายแฟชั่น: <b>${s.thread}</b></p><button class="btn primary" data-act="craftf">ตัดเย็บชุดแฟชั่นแบบสุ่ม (ด้าย 30)</button><p class="muted">ย้อมสีและเปลี่ยนชุดได้ที่แผงแฟชั่น</p><button class="btn" data-act="panel" data-p="fashion">เปิดแผงแฟชั่น</button>${acts}`; }
    const pool = P.role === 'smith' ? s.inv.concat(Object.values(s.eq)).filter(i => i && (i.kind === 'gear' || i.kind === 'acc' || i.kind === 'relic')) : s.inv.concat(Object.values(s.eq)).filter(i => i && (i.kind === 'acc' || i.kind === 'gear'));
    let acts = '';
    if (sel) {
      if (P.role === 'smith') { if (sel.kind === 'gear') { const c = S.enchantCost(sel); acts += `<button class="btn primary" data-act="enchant">ตีบวก +${sel.lv + 1} (${S.enchantRate(sel.lv)}% · ${U.fmt(c.gold)} ทอง · หิน x${c.stones}${sel.tier >= 7 ? ' T7+' : ''})</button><button class="btn" data-act="enchantp">ตีบวกแบบใช้ Protect (${s.bag.protect})</button>`; }
        if (sel.subs && sel.subs.length) acts += `<div class="muted">Reforge (สุ่ม substat ใหม่ · Scroll ${s.bag.reforge} หรือ ${U.fmt(300 * sel.tier)} ทอง)</div>` + sel.subs.map((sb, i) => `<button class="mini-btn" data-act="reforge" data-i="${i}">สุ่ม ${D.STAT_TH[sb.s]}</button>`).join('');
        if (s.inv.includes(sel)) acts += `<button class="btn" data-act="salvage">แยกชิ้นส่วน</button>`; }
      if (P.role === 'jeweler') { if (sel.kind === 'acc') acts += `<button class="btn primary" data-act="refine">Refine +${sel.lv + 1} (Jewel Dust ${Math.round(10 * sel.tier * (1 + sel.lv))})</button>`; const gems = s.inv.filter(i => i.kind === 'gem'); if (sel.sockets && sel.sockets.includes(null)) acts += `<div class="muted">ใส่เจม:</div>` + gems.map(g => `<button class="mini-btn" data-act="socket" data-g="${g.uid}">${esc(g.name)}</button>`).join(''); (sel.sockets || []).forEach((g, i) => { if (g) acts += `<button class="mini-btn" data-act="unsocket" data-i="${i}">ถอด ${esc(g.name)} (${100 * g.tier} ทอง)</button>`; });
        if (sel.kind === 'acc' && s.inv.includes(sel)) { P.fuse = P.fuse || []; acts += `<button class="btn" data-act="fusesel">${P.fuse.includes(sel.uid) ? 'ยกเลิกเลือก Fusion' : 'เลือกเพื่อ Fusion'} (${P.fuse.length}/3)</button>`; } if (P.fuse && P.fuse.length === 3) acts += `<button class="btn primary" data-act="fusion">Fusion 3 ชิ้น → ระดับถัดไป (สูงสุดระดับ 6)</button>`; }
    }
    return `<div class="two"><div><p class="muted">${P.role === 'smith' ? 'ตีบวก +0–15 (+1–5 สำเร็จ 100% · +10 ขึ้นไปล้มเหลวลดระดับ เว้นใช้ Protect) · Reforge · แยกชิ้นส่วน' : 'Refine เครื่องประดับ +0–10 (+3/+6/+10 ได้ substat ใหม่) · ใส่/ถอดเจม · Fusion 3 ชิ้นระดับเดียวกัน'}</p><div class="igrid">${pool.map(i => itemCell(i, 'npcsel', P.fuse && P.fuse.includes(i.uid) ? 'aria-pressed="true"' : '')).join('') || '<div class="muted">ไม่มีไอเทมที่ใช้ได้</div>'}</div></div><div>${UI.itemDetail(sel, acts)}<p class="muted">ทอง ${U.fmt(s.gold)} · หิน ${s.bag.stones.map((n, i) => `T${i + 1}:${n}`).join(' ')} · Jewel Dust ${s.jewelDust}</p><div id="npcmsg" class="npcmsg"></div></div></div>`;
  };

  // ---------------- results ----------------
  UI.modal = (html) => { $('#mbody').innerHTML = html; $('#modal').hidden = false; };
  UI.closeModal = () => { $('#modal').hidden = true; };
  const itemList = items => `<div class="igrid">${items.map(i => i ? (i.kind === 'srune' ? `<span class="chip on">รูนสกิล ${esc(D.CLS[i.cls].skills[i.idx].name)} (${D.VARIANTS[i.v].th})</span>` : i.kind === 'stone' ? `<span class="chip tc t${i.tier}">หินตีบวก T${i.tier} x${i.n}</span>` : i.kind === 'cur' ? `<span class="chip">${esc(i.label)} +${U.fmt(i.n)}</span>` : i.kind === 'cons' ? `<span class="chip">${esc(i.label)} x${i.n}</span>` : itemCell(i, 'none')) : '').join('')}</div>`;
  UI.dungeonResult = (m, res, reason) => {
    const T = res.T; const title = reason === 'dead' ? `ตายที่ชั้น ${res.F}` : reason === 'complete' ? 'เคลียร์ชั้น 1000! ราชาดันเจี้ยนพ่ายแพ้' : `ออกจากดันเจี้ยนที่ชั้น ${res.F}`;
    UI.modal(`<h2>${esc(m.dg.n)}</h2><h3>${title}</h3><p>ผ่าน ${m.run.cleared} ชั้นในรอบนี้ · บอส ${m.run.bosses.length} ตัว · สุ่ม ${res.rolls} ครั้ง${m.full ? '' : ' (รางวัล 30% เพราะเกินรอบรายวัน)'}</p>
      <p>ระดับของชั้น ${res.F}: ${tierSpan(T, T + ' ' + D.TIERS[T - 1].n)} · สุ่มได้เฉพาะระดับนี้หรือต่ำกว่า</p>
      <table class="tbl small"><tr>${res.dist.map(([t]) => `<th>${tierSpan(t, t)}</th>`).join('')}</tr><tr>${res.dist.map(([, p]) => `<td>${(p * 100).toFixed(1)}%</td>`).join('')}</tr></table>
      <h4>ไอเทมที่ได้จากมอนสเตอร์ระหว่างดันเจี้ยน (${m.run.got.length} ชิ้น)</h4><div class="chips">${[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(t => { const n = m.run.got.filter(i => i.tier === t && i.kind !== 'cur').length; return n ? `<span class="chip tc t${t}">${D.TIERS[t - 1].n} x${n}</span>` : ''; }).join('')}${(() => { const g = m.run.got.filter(i => i.kind === 'cur' && i.cur === 'gold').reduce((a, i) => a + i.n, 0); return g ? `<span class="chip">ทอง +${U.fmt(g)}</span>` : ''; })()}</div><div class="loot-list">${itemList(m.run.got.filter(i => !(i.kind === 'cur' && i.cur === 'gold')))}</div>
      <h4>รางวัลจบดันเจี้ยน (${res.items.length} ชิ้น)</h4>${itemList(res.items)}
      <div class="list"><button class="btn primary" data-act="mclose-town">กลับเมือง</button><button class="btn" data-act="mclose-dg" data-id="${m.dg.id}">เปิดแผงดันเจี้ยน</button></div>`);
  };
  UI.pvpResult = (m, w, r) => {
    const row = u => `<tr class="${u === W.player ? 'me' : ''}"><td>${esc(u.name)}${u === r.mvp.dmg ? ' <span class="mvp">MVP ดาเมจ</span>' : ''}${u === r.mvp.heal && u.ms.heal > 0 ? ' <span class="mvp">MVP ฮีล</span>' : ''}${u === r.mvp.obj && u.ms.obj > 0 ? ' <span class="mvp">MVP ภารกิจ</span>' : ''}</td><td>${D.CLS[u.cls].name}</td><td>${u.ms.k}/${u.ms.d}</td><td>${U.fmt(u.ms.dmg)}</td><td>${U.fmt(u.ms.heal)}</td><td>${u.ms.obj}</td></tr>`;
    const tbl = tm => `<table class="tbl small"><tr><th>ชื่อ</th><th>คลาส</th><th>K/D</th><th>ดาเมจ</th><th>ฮีล</th><th>ภารกิจ</th></tr>${m.team[tm].slice().sort((a, b) => r.score(b) - r.score(a)).map(row).join('')}</table>`;
    UI.modal(`<h2 class="${w === 0 ? 'good' : 'bad'}">${w === 0 ? 'ชัยชนะ!' : 'พ่ายแพ้'}</h2><p>${esc(m.md.th)} · ${esc(m.mapDef.th)} · ${m.size}v${m.size} · ${m.online?'ผู้เล่นออนไลน์':'บอท'+m.diff.th}</p>
      <p>Honor +${r.honor}${r.chest ? ' · หีบ PvP: ' + tierSpan(r.chest.tier, esc(r.chest.name || 'ไอเทม')) : ''}${!r.active ? ` · <span class="bad">${r.afk ? 'AFK เกิน 60 วิ' : 'มีส่วนร่วมไม่ถึง 10%'} — ไม่ได้รับรางวัล</span>` : ''}</p>
      <h4 class="t0c">ทีมเรา</h4>${tbl(0)}<h4 class="t1c">ทีมศัตรู</h4>${tbl(1)}
      <div class="list"><button class="btn primary" data-act="mclose-town">กลับเมือง</button><button class="btn" data-act="mclose-pvp">เล่นอีกครั้ง</button></div>`);
  };
  UI.siegeResult = (m, res) => {
    const L = m.history.map(h => `<tr><td>${h.round}</td><td>${h.ci === 0 ? 'ชายแดน' : D.CASTLES[h.ci - 1].th}</td><td class="${h.w === 0 ? 'good' : 'bad'}">${h.w === 0 ? 'ชนะ' : 'แพ้'}</td><td>${h.line > 0 ? '+' : ''}${h.line}</td></tr>`).join('');
    UI.modal(`<h2 class="${res.w === 0 ? 'good' : 'bad'}">${res.w === 0 ? 'ชนะศึกยึดปราสาท!' : 'แพ้ศึกยึดปราสาท'}</h2><p>${esc(S.save.guild.name)} ⚔ ${esc(m.cfg.rival.name)} · ${m.cfg.size}v${m.cfg.size} · ${m.cfg.type}</p>
      ${res.ranked ? `<p>Rating ${res.delta >= 0 ? '+' : ''}${res.delta} → ${S.save.guild.rating} (${D.leagueOf(S.save.guild.rating).n}) · แต้มสงคราม +${res.war} · ทอง +${U.fmt(res.gold)}${res.wager ? ` · เดิมพัน ${res.wager > 0 ? '+' : ''}${U.fmt(res.wager)}` : ''}</p>` : '<p class="muted">Friendly — ไม่มีรางวัลและไม่มีผลกับ Rating</p>'}
      ${res.flawless ? '<p class="good">FLAWLESS 5–0! ได้หีบ Flawless และฉายา «ผู้พิชิตไร้พ่าย»</p>' : ''}${res.comeback ? '<p class="good">COMEBACK! เคยเสีย 3 ปราสาทแต่พลิกกลับมาชนะ</p>' : ''}
      <p>MVP: ดาเมจ ${esc(res.mvp.dmg.name)} · ฮีล ${esc(res.mvp.heal.name)} · ภารกิจ ${esc(res.mvp.obj.name)}${res.mvpItem ? ' · คุณได้หีบ MVP' : ''}</p>
      <h4>หีบปราสาท</h4>${m.chests.length ? m.chests.map(c => `<div>ยึดปราสาท ${c.k}: ${itemList(c.items)}</div>`).join('') : '<p class="muted">ไม่มี</p>'}
      ${res.victory && res.victory.length ? `<h4>หีบชัยชนะ</h4>${itemList(res.victory)}` : ''}
      <h4>ลำดับรอบ</h4><table class="tbl small"><tr><th>รอบ</th><th>สนาม</th><th>ผล</th><th>แนวหน้า</th></tr>${L}</table>
      <div class="list"><button class="btn primary" data-act="mclose-town">กลับเมือง</button></div>`);
  };
  UI.siegeLine = (m) => { const out = []; for (let i = -5; i <= 5; i++) { const own = i < 0 ? (m.line > i ? 'a' : 'b') : i > 0 ? (m.line >= i ? 'a' : 'b') : 'n'; const label = i === 0 ? '⚔' : Math.abs(i); const cur = (m.line >= 0 && i === m.line + 1) || (m.line < 0 && i === m.line - 1) || (m.line === 0 && i === 0); out.push(`<i class="cs ${i === 0 ? 'mid' : own} ${cur ? 'cur' : ''}" title="${i === 0 ? 'ชายแดน' : (i < 0 ? 'ปราสาทเรา ' : 'ปราสาทศัตรู ') + Math.abs(i) + ' ' + D.CASTLES[Math.abs(i) - 1].th}">${label}</i>`); } return `<div class="sline">${out.join('')}</div>`; };
  UI.siegePrep = (m, show) => {
    const el = $('#siegeprep'); el.hidden = !show; if (!show) return; const R = m.roles(); const side = R.ci === 0 ? null : R.att === 0 ? 'atk' : 'def';
    el.innerHTML = `<div class="sp-t">เตรียมตัว <b id="sp-c">20</b></div><div class="sp-s">${R.ci === 0 ? 'รอบชายแดน: แย่งธงกลาง สะสม 60 วิ' : (R.att === 0 ? 'เราบุก ' : 'เราตั้งรับ ') + D.CASTLES[R.ci - 1].th + ' · ' + D.CASTLES[R.ci - 1].perkTh}</div>
      ${side ? `<div class="sp-b">${D.SIEGE_ITEMS[side].map(it => `<button class="btn" data-act="siegebuy" data-k="${it.k}">${it.th} <small>${it.d} · ${it.cost}</small></button>`).join('')}</div>` : ''}<div class="sp-p">แต้มสงครามทีม: <b id="sp-pool">${m.pool[0]}</b> · HP/คูลดาวน์รีเซ็ตเต็ม · สลับหน้ารูนได้ที่แผงรูน (U)</div>`;
  };
  UI.siegePrepTick = (m) => { const c = $('#sp-c'); if (c) c.textContent = Math.ceil(m.prepT); const p = $('#sp-pool'); if (p) p.textContent = m.pool[0]; };
  UI.challengePopup = (r) => {
    if (!$('#modal').hidden || !r) return; UI._chal = r;
    UI.modal(`<h2>คำท้าจากกิลด์</h2><p><b>${esc(r.name)}</b> &lt;${esc(r.tag)}&gt; (Rating ${r.rating} · ${D.leagueOf(r.rating).n}) ท้ายึดปราสาท Ranked 15v15</p><p class="muted">ปฏิเสธฟรีสัปดาห์ละ 2 ครั้ง ครั้งที่ 3 ขึ้นไปถือว่าแพ้</p><div class="list"><button class="btn primary" data-act="chal-yes">รับคำท้า</button><button class="btn" data-act="chal-no">ปฏิเสธ</button></div>`);
  };

  // ---------------- GM ----------------
  UI.gmRender = (tab, P) => {
    const s = S.save; const gm = W.gm; const tg = (k, n) => `<label class="chk"><input type="checkbox" data-gm="${k}" ${gm[k] ? 'checked' : ''}> ${n}</label>`;
    const num = (id, label, val, min, max, step = 1) => `<label class="fl">${label}<input type="number" id="${id}" value="${val}" min="${min}" max="${max}" step="${step}"></label>`;
    switch (tab) {
      case 'player': return `<div class="two"><div>${num('gmlv', 'เลเวล (1–' + D.MAX_LV + ')', s.lvl, 1, D.MAX_LV)}<button class="btn" data-act="gm" data-c="setlv">ตั้งเลเวล</button>
        <label class="fl">เปลี่ยนคลาส<select id="gmcls">${D.CLASSES.map(c => `<option value="${c.id}" ${c.id === s.cls ? 'selected' : ''}>${c.name}</option>`).join('')}</select></label><button class="btn" data-act="gm" data-c="setcls">เปลี่ยนคลาส</button>
        <h4>สกุลเงิน</h4>${num('gmamt', 'จำนวน', 100000, 1, 1e9)}<div class="list">${[['gold', 'ทอง'], ['honor', 'Honor'], ['war', 'แต้มสงคราม'], ['runeDust', 'Rune Dust'], ['jewelDust', 'Jewel Dust'], ['thread', 'ด้ายแฟชั่น']].map(([k, n]) => `<button class="mini-btn" data-act="gm" data-c="cur" data-k="${k}">+ ${n}</button>`).join('')}</div>
        <div class="list"><button class="mini-btn" data-act="gm" data-c="stones">หินตีบวกทุกระดับ +50</button><button class="mini-btn" data-act="gm" data-c="cons">ยา/สกรอล +50</button><button class="mini-btn" data-act="gm" data-c="pets">ปลดล็อกสัตว์เลี้ยง/พาหนะทั้งหมด</button><button class="mini-btn" data-act="gm" data-c="ach">ปลดล็อกความสำเร็จทั้งหมด</button><button class="mini-btn" data-act="gm" data-c="infamy0">ล้าง Infamy</button></div></div>
        <div>${tg('god', 'God mode (ไม่รับดาเมจ)')}${tg('oneHit', 'One-hit kill')}${tg('noCd', 'ไม่มีคูลดาวน์/ไม่ใช้ทรัพยากร')}${tg('allSkills', 'ปลดล็อกสกิลทุกตัว')}${tg('allRunes', 'ปลดล็อกรูนสกิลทั้งหมด')}${tg('allSlots', 'เปิดช่องเครื่องประดับ/รูนทั้งหมด')}
        <button class="btn" data-act="gm" data-c="heal">ฮีลเต็ม/รีเซ็ตคูลดาวน์</button><button class="btn" data-act="gm" data-c="tp">วาร์ปไปจุดที่คลิกล่าสุด</button></div></div>`;
      case 'item': return `<div class="two"><div><label class="fl">ชนิด<select id="gmkind">${['gear', 'acc', 'relic', 'rune', 'gem', 'fashion'].map(k => `<option>${k}</option>`).join('')}</select></label>
        <label class="fl">ช่อง (ถ้ามี)<select id="gmslot"><option value="">สุ่ม</option>${[...D.GEAR_SLOTS, ...D.ACC_SLOTS].map(x => `<option value="${x.k}">${x.th}</option>`).join('')}${D.FASHION_SLOTS.map(x => `<option value="${x.k}">แฟชั่น: ${x.th}</option>`).join('')}</select></label>
        <label class="fl">เซ็ต (ถ้ามี)<select id="gmset"><option value="">สุ่ม/ไม่มี</option>${[...D.GEAR_SETS, ...D.ACC_SETS].map(x => `<option value="${x.k}">${x.n}</option>`).join('')}</select></label>
        ${num('gmtier', 'ระดับ (1–10)', 10, 1, 10)}${num('gmilv', 'iLv (1–100)', 100, 1, 100)}${num('gmcount', 'จำนวน', 1, 1, 50)}<button class="btn primary" data-act="gm" data-c="give">สร้างไอเทม</button></div>
        <div><button class="btn" data-act="gm" data-c="kit">ชุดเต็ม 18 ช่อง (ระดับ/iLv ที่ตั้ง)</button><button class="btn" data-act="gm" data-c="runekit">รูนเต็มแผง + รูนแกน</button><button class="btn" data-act="gm" data-c="fashkit">ชุดแฟชั่นทุกช่อง (ธีมสุ่ม)</button><button class="btn" data-act="gm" data-c="gems">เจมระดับที่ตั้ง x6</button><button class="btn danger" data-act="gm" data-c="clearinv">ล้างกระเป๋า</button><button class="btn" data-act="gm" data-c="dropground">ทิ้งไอเทมทุกระดับลงพื้น (ดูเอฟเฟกต์ดรอป)</button></div></div>`;
      case 'world': return `<div class="two"><div><h4>วาร์ป</h4><div class="list">${D.TOWNS.map(t => `<button class="mini-btn" data-act="gotown" data-id="${t.id}">${t.n}</button>`).join('')}${D.FARM_MAPS.map((m, i) => `<button class="mini-btn" data-act="gofarm" data-i="${i}">${i + 1}. ${m.n}</button>`).join('')}<button class="mini-btn" data-act="gogallery">สนามซ้อม</button></div>
        <h4>เสกมอนสเตอร์ (แผนที่ฟาร์ม)</h4><div class="list">${Object.keys(D.GRADES).map(g => `<button class="mini-btn" data-act="gm" data-c="spawn" data-g="${g}">${D.GRADES[g].th}</button>`).join('')}</div><button class="btn danger" data-act="gm" data-c="killall">ฆ่ามอนสเตอร์/ศัตรูทั้งหมด</button></div>
        <div>${num('gmspeed', 'ความเร็วเกม', gm.speed, 0.1, 5, 0.1)}${num('gmtime', 'ตัวคูณเวลาเกิดบอส/Champion', gm.time, 0.1, 500, 0.1)}${num('gmdrop', 'ตัวคูณอัตราดรอป', gm.drop, 0, 100, 0.5)}${num('gmxp', 'ตัวคูณ EXP', gm.xp, 0, 1000, 1)}<button class="btn" data-act="gm" data-c="rates">ใช้ค่า</button>${tg('ai', 'เปิด AI ของบอท/ผู้เล่นจำลอง')}${tg('debug', 'แสดงข้อมูล debug (FPS/จำนวนหน่วย)')}
        <h4>ประกาศทั้งเซิร์ฟ</h4><input id="gmmsg" placeholder="ข้อความประกาศ"><button class="btn" data-act="gm" data-c="announce">ประกาศ</button></div></div>`;
      case 'dungeon': return `<label class="fl">ดันเจี้ยน<select id="gmdg">${D.DUNGEONS.map(d => `<option value="${d.id}">${d.n}</option>`).join('')}</select></label>${num('gmfloor', 'ชั้น (1–1000)', 1, 1, 1000)}<div class="list"><button class="btn primary" data-act="gm" data-c="dgenter">เข้าชั้นที่กำหนด</button><button class="btn" data-act="gm" data-c="dgclear">เคลียร์ชั้นปัจจุบันทันที</button><button class="btn" data-act="gm" data-c="dgunlock">ปลดล็อก checkpoint ทุกดันเจี้ยน (ชั้น 100)</button><button class="btn" data-act="gm" data-c="dgdaily">รีเซ็ตรอบรายวัน</button><button class="btn" data-act="gm" data-c="dgsim">จำลองรางวัลเมื่อตายที่ชั้นนี้ (100 ครั้ง)</button></div><div id="gmout" class="gmout"></div>`;
      case 'pvp': return `<div class="list"><button class="btn" data-act="gm" data-c="pvpwin">บังคับชนะแมตช์/รอบปัจจุบัน</button><button class="btn" data-act="gm" data-c="pvplose">บังคับแพ้</button><button class="btn" data-act="gm" data-c="score">+10 แต้มทีมเรา</button><button class="btn" data-act="gm" data-c="prep">ข้ามช่วงเตรียมตัว 20 วิ (ยึดปราสาท)</button></div>
        ${num('gmrating', 'Rating กิลด์', s.guild ? s.guild.rating : 1000, 0, 3000)}<button class="btn" data-act="gm" data-c="rating">ตั้ง Rating</button><button class="btn" data-act="gm" data-c="challenge">ส่งคำท้าเข้ามาทันที</button><button class="btn" data-act="gm" data-c="mkguildq">สร้างกิลด์ด่วน</button><button class="btn" data-act="gm" data-c="mercmax">ทหารรับจ้างทุกคลาสเป็น Legend</button>`;
      case 'skill': { P.gc = P.gc || s.cls; P.gs = P.gs ?? 0; const sk = D.CLS[P.gc].skills[P.gs];
        return `<div class="two"><div><label class="fl">คลาส<select id="gmsc">${D.CLASSES.map(c => `<option value="${c.id}" ${c.id === P.gc ? 'selected' : ''}>${c.name}</option>`).join('')}</select></label><label class="fl">สกิล<select id="gmss">${D.CLS[P.gc].skills.map((x, i) => `<option value="${i}" ${i === P.gs ? 'selected' : ''}>${i + 1}. ${x.name} (${x.arch})</option>`).join('')}</select></label>
        ${num('gsp', 'พลัง p (×ATK)', sk.p, 0, 50, 0.05)}${num('gsc', 'คูลดาวน์ c (วิ)', sk.c, 0, 120, 0.1)}${num('gsr', 'รัศมี r', sk.r, 0, 10, 0.1)}${num('gsR', 'ระยะ R', sk.R, 0, 15, 0.1)}${num('gsn', 'จำนวน n', sk.n, 1, 30)}${num('gsd', 'ระยะเวลา d', sk.d, 0, 30, 0.5)}${num('gsv', 'ค่า v (%)', sk.v, 0, 200)}
        <label class="fl">CC (เช่น st1 sl2 kb2)<input id="gscc" value="${Object.entries(sk.cc).map(([k, v]) => k + v).join(' ')}"></label><div class="list"><button class="btn primary" data-act="gm" data-c="skset">บันทึกการแก้</button><button class="btn" data-act="gm" data-c="skreset">คืนค่าเดิม</button><button class="btn" data-act="gm" data-c="sktry">ทดสอบในสนามซ้อม</button></div></div>
        <div><img src="${UI.skillIcon(sk)}" class="bigicon" alt=""><p><b>${esc(sk.name)}</b></p><p>${esc(D.descSkill(sk))}</p><p class="muted">คำอธิบายและ VFX สร้างจากค่าชุดเดียวกัน แก้ตัวเลขแล้วทั้งคำอธิบายและเอฟเฟกต์เปลี่ยนตาม</p></div></div>`; }
      case 'vfx': { P.vc = P.vc || s.cls; P.vm = P.vm || 0; const sh = SPR.charSheet(SPR.lookFor(P.vc)); const allM = D.FARM_MAPS.flatMap(m => [...m.mobs, m.champ, m.rare, m.boss, m.world]); const mo = allM[P.vm];
        return `<div class="two"><div><h4>โชว์ VFX สกิลทั้ง 15 ตัว (${D.CLASSES.length * 15} สกิลทั้งเกม)</h4><label class="fl">คลาส<select id="gmvc">${D.CLASSES.map(c => `<option value="${c.id}" ${c.id === P.vc ? 'selected' : ''}>${c.name}</option>`).join('')}</select></label><div class="list"><button class="btn primary" data-act="gm" data-c="show">โชว์ 15 สกิล</button><button class="btn" data-act="gm" data-c="showv">โชว์ 15 สกิล × รูน 4 แบบ (60 VFX)</button><button class="btn" data-act="gm" data-c="showstop">หยุดโชว์</button></div>
          <h4>Sprite sheet ตัวละคร</h4><p class="muted">แถว: idle·walk·attack·cast·hurt·dead (หน้า) แล้วซ้ำ (หลัง) · เฟรม 24×32 · คลิกขวาที่รูปเพื่อบันทึก</p><img class="sheet" src="${SPR.sheetPreview(sh, 3).toDataURL()}" alt="sprite sheet ${esc(P.vc)}"></div>
          <div><h4>Sprite sheet มอนสเตอร์</h4><label class="fl">มอนสเตอร์<select id="gmvm">${allM.map((x, i) => `<option value="${i}" ${i === P.vm ? 'selected' : ''}>${x.n} (${x.body})</option>`).join('')}</select></label><img class="sheet" src="${SPR.sheetPreview(SPR.monSheet(mo.body, mo.c, mo.c2), 4).toDataURL()}" alt="monster sheet"></div></div>`; }
      case 'sys': return `<div class="list"><button class="btn" data-act="gm" data-c="export">ส่งออกเซฟ (JSON)</button><button class="btn" data-act="gm" data-c="import">นำเข้าเซฟจากกล่องข้อความ</button><button class="btn" data-act="savenow">บันทึก</button></div><textarea id="gmsave" rows="8" placeholder="วาง JSON เซฟที่นี่"></textarea>
        <h4>สถานะระบบ</h4><div class="statgrid"><div class="sr"><span>หน่วยในโลก</span><b>${W.units.length}</b></div><div class="sr"><span>อนุภาค VFX</span><b>${V.parts.length}</b></div><div class="sr"><span>กระสุน</span><b>${W.projs.length}</b></div><div class="sr"><span>โหมด</span><b>${W.mode ? W.mode.kind : '-'}</b></div></div>`;
    }
    return '';
  };
  UI.gmAfter = (P) => {
    const sc = $('#gmsc'); if (sc) sc.onchange = () => { P.gc = sc.value; P.gs = 0; UI.renderPanel(); };
    const ss = $('#gmss'); if (ss) ss.onchange = () => { P.gs = +ss.value; UI.renderPanel(); };
    const vc = $('#gmvc'); if (vc) vc.onchange = () => { P.vc = vc.value; UI.renderPanel(); };
    const vm = $('#gmvm'); if (vm) vm.onchange = () => { P.vm = +vm.value; UI.renderPanel(); };
  };
  const val = id => { const e = $('#' + id); return e ? e.value : ''; };
  UI.gmCmd = (c, el) => {
    const s = S.save; const P = UI.panel; const p = W.player; let msg = '';
    switch (c) {
      case 'setlv': S.setLevel(+val('gmlv')); msg = 'ตั้งเลเวลแล้ว'; break;
      case 'setcls': S.changeClass(val('gmcls')); msg = 'เปลี่ยนคลาสแล้ว'; break;
      case 'cur': s[el.dataset.k] += +val('gmamt') || 0; msg = 'เพิ่มแล้ว'; break;
      case 'stones': s.bag.stones = s.bag.stones.map(n => n + 50); break;
      case 'cons': for (const k of ['hpPot', 'mpPot', 'ret', 'foodXp', 'foodDrop', 'protect', 'reforge']) s.bag[k] += 50; break;
      case 'pets': s.pets = D.PETS.map(x => x.k); s.mounts = D.MOUNTS.map(x => x.k); break;
      case 'ach': for (const a of D.ACHIEVEMENTS) S.ach(a.id); break;
      case 'infamy0': s.infamy = 0; if (p) p.red = false; break;
      case 'heal': if (p) { p.hp = p.maxhp; p.res = p.resMax; p.cds.fill(0); p.dead = false; } break;
      case 'tp': if (p && S.IN.lastClickW) { p.x = S.IN.lastClickW[0]; p.y = S.IN.lastClickW[1]; } break;
      case 'give': { const n = U.clamp(+val('gmcount') || 1, 1, 50); for (let i = 0; i < n; i++) S.addItem(S.genItem(val('gmkind'), +val('gmtier'), +val('gmilv'), { slot: val('gmslot') || null, set: val('gmset') || null, pvp: true })); msg = 'สร้างแล้ว'; break; }
      case 'kit': { const t = +val('gmtier') || 10, ilv = +val('gmilv') || 100; for (const sl of D.GEAR_SLOTS) s.eq[sl.k] = S.genItem('gear', t, ilv, { slot: sl.k }); for (const sl of D.ACC_SLOTS) { s.eq[sl.k] = S.genItem('acc', t, ilv, { slot: sl.k, pvp: true }); s.eq[sl.k].slot = sl.k; } s.eq.relic = S.genItem('relic', t, ilv); S.refreshPlayer(true); msg = 'สวมชุดเต็มแล้ว'; break; }
      case 'runekit': { const t = +val('gmtier') || 10; s.runeBoard[s.page] = D.RUNE_BOARD.map(r => S.genItem('rune', t, 100, { color: r.c })); S.refreshPlayer(true); break; }
      case 'fashkit': { const th = U.ri(0, 9); for (const f of D.FASHION_SLOTS) { const it = S.genItem('fashion', 10, 1, { slot: f.k, theme: th }); s.fashion.owned.push(it); s.fashion.eq[f.k] = it; } S.refreshPlayer(); break; }
      case 'gems': for (const g of D.GEMS) S.addItem(S.genItem('gem', +val('gmtier') || 5, +val('gmilv') || 50, { gem: g.k }), true); break;
      case 'clearinv': s.inv = []; break;
      case 'dropground': if (p) for (let t = 1; t <= 10; t++) S.dropLoot(p.x + Math.cos(t) * 2, p.y + Math.sin(t) * 2, S.genItem('gear', t, t * 10)); UI.closePanel(); break;
      case 'spawn': if (W.mode && W.mode.spawnGrade) { if (el.dataset.g === 'normal' || el.dataset.g === 'elite') { const md = U.pick(W.mode.def.mobs); E.spawn(S.mkMob(md, W.mode.lvlFor(el.dataset.g), el.dataset.g, p.x + 2, p.y, {})); } else W.mode.spawnGrade(el.dataset.g, { x: p.x + 3, y: p.y }); UI.closePanel(); } else msg = 'ใช้ได้ในแผนที่ฟาร์ม'; break;
      case 'killall': for (const u of W.units) if (!u.dead && E.isEnemy(p, u) && u.kind !== 'npc') { u.hp = 0; E.kill(u, p); } break;
      case 'rates': W.gm.speed = +val('gmspeed') || 1; W.gm.time = +val('gmtime') || 1; W.gm.drop = +val('gmdrop'); W.gm.xp = +val('gmxp'); msg = 'ใช้ค่าแล้ว'; break;
      case 'announce': UI.announce('ประกาศจาก GM', val('gmmsg')); UI.log('[GM] ' + val('gmmsg'), 'sys'); break;
      case 'dgenter': S.goDungeon(val('gmdg'), U.clamp(+val('gmfloor') || 1, 1, 1000), 0); break;
      case 'dgclear': if (W.mode && W.mode.kind === 'dungeon') { for (const u of W.units) if (u.kind === 'mob' && !u.dead) { u.hp = 0; E.kill(u, p); } UI.closePanel(); } break;
      case 'dgunlock': for (const d of D.DUNGEONS) { const x = s.dungeons[d.id] = s.dungeons[d.id] || { best: 0, cp: 0, daily: { date: '', runs: 0 } }; x.best = 100; x.cp = 90; } S.refreshPlayer(); msg = 'ปลดล็อกแล้ว'; break;
      case 'dgdaily': for (const k in s.dungeons) s.dungeons[k].daily = { date: '', runs: 0 }; break;
      case 'dgsim': { const F = U.clamp(+val('gmfloor') || 1, 1, 100); const cnt = {}; for (let i = 0; i < 1000; i++) { const t = S.rollTier(D.dungeonDist(F)); cnt[t] = (cnt[t] || 0) + 1; } $('#gmout').innerHTML = `ตายชั้น ${F} สุ่ม 1,000 ครั้ง: ` + Object.keys(cnt).sort((a, b) => b - a).map(t => `${tierSpan(+t, t)} ${(cnt[t] / 10).toFixed(1)}%`).join(' · '); return; }
      case 'pvpwin': if (W.mode && W.mode.finish) W.mode.finish(0); if (W.mode && W.mode.kind === 'siege' && W.mode.phase === 'fight') W.mode.endRound(0); UI.closePanel(); break;
      case 'pvplose': if (W.mode && W.mode.finish) W.mode.finish(1); if (W.mode && W.mode.kind === 'siege' && W.mode.phase === 'fight') W.mode.endRound(1); UI.closePanel(); break;
      case 'score': if (W.mode && W.mode.score) W.mode.score[0] += 10; if (W.mode && W.mode.hold) W.mode.hold[0] += 10; break;
      case 'prep': if (W.mode && W.mode.kind === 'siege') W.mode.prepT = 0; UI.closePanel(); break;
      case 'rating': if (s.guild) s.guild.rating = +val('gmrating'); break;
      case 'challenge': if (s.guild) { UI.closePanel(); UI.challengePopup(U.pick(s.rivals)); } else msg = 'ต้องมีกิลด์ก่อน'; break;
      case 'mkguildq': if (!s.guild) S.createGuild('GM Legion', 'GM'); msg = 'มีกิลด์แล้ว'; break;
      case 'mercmax': for (const c of D.CLASSES) S.merc(c.id).m = 150; break;
      case 'skset': { const sk = D.CLS[P.gc].skills[P.gs]; sk.p = +val('gsp'); sk.c = +val('gsc'); sk.r = +val('gsr'); sk.R = +val('gsR'); sk.n = Math.max(1, +val('gsn') | 0); sk.d = +val('gsd'); sk.v = +val('gsv'); sk.cc = {}; val('gscc').split(/\s+/).forEach(t => { const m = t.match(/^([a-z]+)([\d.]+)$/); if (m && D.CC_TH[m[1]]) sk.cc[m[1]] = +m[2]; }); sk.dmg = !!D.ARCH[sk.arch].dmg && sk.p > 0; iconCache.clear(); UI.refreshSkillIcons(); msg = 'บันทึกแล้ว'; break; }
      case 'skreset': { const sk = D.CLS[P.gc].skills[P.gs]; Object.assign(sk, JSON.parse(JSON.stringify(sk.base))); sk.dmg = !!D.ARCH[sk.arch].dmg && sk.p > 0; msg = 'คืนค่าแล้ว'; break; }
      case 'sktry': S.goGallery(); setTimeout(() => W.mode.startShow(P.gc, false), 100); return;
      case 'show': case 'showv': { const cls = P.vc || s.cls; if (!W.mode || W.mode.kind !== 'gallery') { S.goGallery(); setTimeout(() => W.mode.startShow(cls, c === 'showv'), 100); } else { W.mode.startShow(cls, c === 'showv'); UI.closePanel(); } return; }
      case 'showstop': if (W.mode && W.mode.stopShow) W.mode.stopShow(); break;
      case 'export': $('#gmsave').value = S.exportSave(); $('#gmsave').select(); return;
      case 'import': try { S.importSave($('#gmsave').value); S.goTown(S.save.lastTown); } catch (e) { UI.toast('JSON ไม่ถูกต้อง', 'bad'); } return;
    }
    if (msg) UI.toast(msg, 'info'); UI.renderPanel();
  };

  // ---------------- click handling ----------------
  UI.act = (el, e) => {
    const a = el.dataset.act; const s = S.save; const P = UI.panel; const sel = P && P.sel ? findItem(P.sel) : null;
    const res = (r) => { if (r === true) return; if (typeof r === 'string') { UI.toast(r, 'bad'); const nm = $('#npcmsg'); if (nm) nm.textContent = r; } else if (r && r.msg) { UI.toast(r.msg, r.ok ? 'good' : 'bad'); const nm = $('#npcmsg'); if (nm) nm.textContent = r.msg; } };
    switch (a) {
      case 'continue': S.save = S.load(); S.goTown(S.save.lastTown || 'haven'); break;
      case 'newchar': UI.showCreate(); break;
      case 'pickcls': UI.lastName = ($('#cname') || {}).value; UI.selCls = el.dataset.cls; document.querySelectorAll('.ccard').forEach(c => c.classList.toggle('sel', c.dataset.cls === UI.selCls)); UI.renderCreateDetail(); break;
      case 'startgame': { const name = ($('#cname').value || 'Hero').trim().slice(0, 14) || 'Hero'; S.save = S.newSave(name, UI.selCls); S.save.inv.push(S.genItem('gear', 1, 3, { slot: 'weapon', cls: UI.selCls }), S.genItem('gear', 2, 5, { slot: 'chest' }), S.genItem('acc', 1, 3, { slot: 'necklace' })); S.persist(); S.goTown('haven'); UI.toast('ยินดีต้อนรับสู่ Ashfall! ลองเปิดกระเป๋า (I) เพื่อสวมอุปกรณ์เริ่มต้น', 'good'); break; }
      case 'tab': P.tab = el.dataset.tab; P.sel = null; UI.renderPanel(); break;
      case 'panel': UI.openPanel(el.dataset.p); $('#menu').classList.remove('open'); break;
      case 'close': UI.closePanel(); break;
      case 'menu': $('#menu').classList.toggle('open'); break;
      case 'chatmin': { const c = $('#chat'); const min = !c.classList.contains('min') && !(innerWidth <= 1100 && !c.classList.contains('open')); c.classList.toggle('min', min); c.classList.toggle('open', !min); s.settings.chatMin = min; break; }
      case 'questmin': { const q = $('#quest-track'); q.classList.toggle('min'); s.settings.questMin = q.classList.contains('min'); break; }
      case 'uiscale': UI.setUiScale(+el.dataset.v); UI.renderPanel(); break;
      case 'swapcls': if (W.mode && W.mode.pvp) { UI.toast('เปลี่ยนคลาสไม่ได้ระหว่างแมตช์ PvP/ยึดปราสาท', 'bad'); break; } if (S.changeClass(el.dataset.cls)) UI.renderPanel(); break;
      case 'selally': { const a = W.units.find(x => x.id === +el.dataset.id); if (a) S.select(a); break; }
      case 'auto': S.auto.on = !S.auto.on; UI.toast(S.auto.on ? 'เปิดออโต้: โจมตี/ฟาร์ม/เก็บของอัตโนมัติ' : 'ปิดออโต้', 'info'); break;
      case 'autoq': S.auto.quest = !S.auto.quest; if (S.auto.quest) S.auto.on = true; UI.toast(S.auto.quest ? 'เปิดออโต้ภารกิจ: เดินทางไปทำภารกิจหลักอัตโนมัติ' : 'ปิดออโต้ภารกิจ', 'info'); break;
      case 'pk': s.pk = !s.pk; if (W.player) W.player.pk = s.pk; UI.toast(s.pk ? 'เปิดโหมด PK: โจมตีผู้เล่นอื่นในโซน PvP ได้ (ฆ่าคนชื่อขาวจะได้ Infamy)' : 'ปิดโหมด PK', s.pk ? 'bad' : 'info'); break;
      case 'pot': S.usePotion(el.dataset.k); break;
      case 'cmd': { const k = el.dataset.k; const pt = S.IN.lastClickW ? { x: S.IN.lastClickW[0], y: S.IN.lastClickW[1], r: 1.5 } : { x: W.player.x, y: W.player.y, r: 1.5 }; const focus = W.player.target; for (const u of W.units) if (u.team === 0 && u !== W.player && u.kind === 'hero') { u.ai.cmd = k; u.ai.cmdPt = pt; u.ai.focus = k === 'focus' ? focus : null; } UI.toast('สั่งการ: ' + D.COMMANDS.find(c => c.k === k).th + (k === 'attack' || k === 'defend' ? ' (ไปยังจุดที่คลิกล่าสุด)' : ''), 'info'); document.querySelectorAll('#cmdbar button').forEach(b => b.classList.toggle('on', b.dataset.k === k)); break; }
      case 'seleq': case 'selinv': case 'selrune': case 'selfash': case 'npcsel': P.sel = el.dataset.uid; UI.renderPanel(); break;
      case 'equip': if (sel) { const r = S.equip(sel); res(r); P.sel = null; UI.renderPanel(); } break;
      case 'unequip': res(S.unequip(el.dataset.slot)); P.sel = null; UI.renderPanel(); break;
      case 'sell': if (sel) { UI.toast(`ขายได้ ${U.fmt(S.sell(sel))} ทอง`, 'info'); P.sel = null; UI.renderPanel(); } break;
      case 'salvage': if (sel) { S.salvage(sel); UI.toast('แยกชิ้นส่วนแล้ว', 'info'); P.sel = null; UI.renderPanel(); } break;
      case 'sort': s.inv.sort((a, b) => b.tier - a.tier || b.ilv - a.ilv); UI.renderPanel(); break;
      case 'sellall': { let g = 0; for (const it of s.inv.slice()) if (it.tier <= 2 && S.isEquip(it)) g += S.sell(it); UI.toast(`ขายได้ ${U.fmt(g)} ทอง`, 'info'); UI.renderPanel(); break; }
      case 'food': S.useFood(el.dataset.k); UI.renderPanel(); break;
      case 'ret': if (s.bag.ret > 0) { s.bag.ret--; S.goTown(s.lastTown); } break;
      case 'runeequip': if (sel) { const page = s.runeBoard[s.page]; let idx = D.RUNE_BOARD.findIndex((r, i) => r.c === sel.color && !page[i] && S.runeSlotOpen(i)); if (idx < 0) idx = D.RUNE_BOARD.findIndex((r, i) => r.c === sel.color && S.runeSlotOpen(i)); if (idx < 0) res('ไม่มีช่องรูนสีนี้ที่เปิดอยู่'); else res(S.runeEquip(sel, idx)); P.sel = null; UI.renderPanel(); } break;
      case 'runeremove': S.runeRemove(+el.dataset.i); UI.renderPanel(); break;
      case 'runeup': if (sel) { res(S.runeUpgrade(sel)); UI.renderPanel(); } break;
      case 'runepage': s.page = +el.dataset.i; S.refreshPlayer(); UI.renderPanel(); break;
      case 'setsr': res(S.setSkillRune(+el.dataset.i, +el.dataset.v)); UI.refreshSkillIcons(); UI.renderPanel(); break;
      case 'fashequip': if (sel) { S.fashionEquip(sel); UI.renderPanel(); } break;
      case 'fashremove': S.fashionRemove(el.dataset.slot); UI.renderPanel(); break;
      case 'dye': if (sel) { res(S.dye(sel, el.dataset.c)); UI.renderPanel(); } break;
      case 'setpet': if (!el.dataset.k || s.pets.includes(el.dataset.k)) { s.pet = el.dataset.k || null; S.refreshPlayer(); S.setupPet(W.player); UI.renderPanel(); } else UI.toast('ยังไม่มีสัตว์เลี้ยงตัวนี้ — ซื้อที่คอกสัตว์ในนครออเรเลียน', 'bad'); break;
      case 'setmount': if (!el.dataset.k || s.mounts.includes(el.dataset.k)) { s.mount = el.dataset.k || null; S.refreshPlayer(); UI.renderPanel(); } else UI.toast('ยังไม่มีพาหนะนี้ — ซื้อที่คอกสัตว์ในนครออเรเลียน', 'bad'); break;
      case 'settitle': s.title = el.dataset.t || null; S.refreshPlayer(); UI.renderPanel(); break;
      case 'seldg': P.dg = el.dataset.id; UI.renderPanel(); break;
      case 'enterdg': S.goDungeon(P.dg, P.start || 1, P.mercN || 0); break;
      case 'pvpset': { const k = el.dataset.k; P.cfg[k] = k === 'mode' ? el.dataset.v : +el.dataset.v; if (k === 'mode') { const md = D.PVP_MODES.find(x => x.id === P.cfg.mode); if (!md.maps.includes(P.cfg.map)) P.cfg.map = md.maps[0]; } UI.renderPanel(); break; }
      case 'startpvp': S.goPvP(Object.assign({}, P.cfg)); UI._lastPvp = Object.assign({}, P.cfg); break;
      case 'honorbuy': res(S.buyFrom(S.honorShop()[+el.dataset.i])); UI.renderPanel(); break;
      case 'warbuy': res(S.buyFrom(S.warShop()[+el.dataset.i])); UI.renderPanel(); break;
      case 'hire': res(S.hireContract(el.dataset.c, el.dataset.t)); UI.renderPanel(); break;
      case 'mpreset': P.pi = +el.dataset.i; UI.renderPanel(); break;
      case 'mpadd': { const pr = s.mercPresets[P.pi || 0]; if (pr.length < 14) pr.push(el.dataset.c); UI.renderPanel(); break; }
      case 'mpdel': s.mercPresets[P.pi || 0].splice(+el.dataset.i, 1); UI.renderPanel(); break;
      case 'mpclear': s.mercPresets[P.pi || 0] = []; UI.renderPanel(); break;
      case 'mkguild': { const n = ($('#gname').value || '').trim(), t = ($('#gtag').value || '').trim(); if (n.length < 2 || t.length < 2) return UI.toast('ใส่ชื่อและแท็กอย่างน้อย 2 ตัวอักษร', 'bad'); S.createGuild(n, t); UI.renderPanel(); break; }
      case 'gset': P[el.dataset.k] = el.dataset.k === 'size' ? +el.dataset.v : el.dataset.v; UI.renderPanel(); break;
      case 'challenge': { const r = s.rivals.find(x => x.name === el.dataset.n); if (P.type === 'wager') { if (s.gold < P.stake) return UI.toast('ทองไม่พอสำหรับเดิมพัน', 'bad'); s.gold -= P.stake; } UI.toast(`${r.name} รับคำท้าแล้ว!`, 'good'); S.goSiege({ rival: r, size: P.size, type: P.type, stake: P.stake }); break; }
      case 'chal-yes': UI.closeModal(); S.goSiege({ rival: UI._chal, size: 15, type: 'ranked', stake: 0 }); break;
      case 'chal-no': { UI.closeModal(); const g = s.guild; const wk = S.weekNo(); if (g.declines.week !== wk) g.declines = { week: wk, n: 0 }; g.declines.n++; if (g.declines.n > 2) { const exp = 1 / (1 + Math.pow(10, (UI._chal.rating - g.rating) / 400)); const d = Math.round(32 * exp); g.rating -= d; UI._chal.rating += d; g.losses++; UI.toast(`ปฏิเสธเกินโควตา ถือว่าแพ้ (Rating -${d})`, 'bad'); } else UI.toast(`ปฏิเสธคำท้า (ฟรีเหลือ ${2 - g.declines.n} ครั้งสัปดาห์นี้)`, 'info'); break; }
      case 'siegebuy': { const r = W.mode.buy(0, el.dataset.k); res(r === true ? { ok: true, msg: 'ซื้อแล้ว — ใช้งานเมื่อเริ่มรอบ' } : r); break; }
      case 'gotown': S.goTown(el.dataset.id); break;
      case 'gofarm': S.goFarm(+el.dataset.i); break;
      case 'gofarmq': S.goFarm(D.FARM_MAPS.findIndex(m => m.id === el.dataset.m)); break;
      case 'gogallery': S.goGallery(); break;
      case 'buy': { const e = S.SHOP[+el.dataset.i]; res(S.buy(e, P.qty || 1) === true ? { ok: true, msg: 'ซื้อแล้ว' } : 'ทองไม่พอ'); UI.renderPanel(); break; }
      case 'stablebuy': { const e = S.STABLE[+el.dataset.i]; const list = e.type === 'pet' ? s.pets : s.mounts; if (list.includes(e.k)) return; if (e.honor) { if (s.honor < e.honor) return UI.toast('Honor ไม่พอ', 'bad'); s.honor -= e.honor; } else { if (s.gold < e.price) return UI.toast('ทองไม่พอ', 'bad'); s.gold -= e.price; } list.push(e.k); if (e.type === 'pet' && !s.pet) s.pet = e.k; if (e.type === 'mount' && !s.mount) s.mount = e.k; S.refreshPlayer(); S.setupPet(W.player); UI.toast('ซื้อแล้ว — ตั้งค่าได้ที่แผงแฟชั่น > สัตว์เลี้ยง/พาหนะ', 'good'); UI.renderPanel(); break; }
      case 'mbuy': if (sel && sel.price) { if (s.gold < sel.price) return UI.toast('ทองไม่พอ', 'bad'); if (s.inv.length >= S.invMax) return UI.toast('กระเป๋าเต็ม', 'bad'); s.gold -= sel.price; UI.market.splice(UI.market.indexOf(sel), 1); delete sel.price; delete sel.seller; s.inv.push(sel); UI.toast('ซื้อแล้ว', 'good'); P.sel = null; UI.renderPanel(); } break;
      case 'msell': if (sel) { const g = S.sell(sel, true); UI.toast(`ขายในตลาดได้ ${U.fmt(g)} ทอง`, 'good'); P.sel = null; UI.renderPanel(); } break;
      case 'craftf': res(S.craftFashion()); UI.renderPanel(); break;
      case 'enchant': case 'enchantp': if (sel) { const r = S.enchant(sel, a === 'enchantp'); res(r); if (r && r.ok) { const pl = W.player; V.pillar(pl.x, pl.y, '#ffd84a', 80, 0.8, 8); } UI.renderPanel(); } break;
      case 'reforge': if (sel) { res(S.reforge(sel, +el.dataset.i)); UI.renderPanel(); } break;
      case 'refine': if (sel) { res(S.refine(sel)); UI.renderPanel(); } break;
      case 'socket': if (sel) { const g = s.inv.find(i => i.uid === el.dataset.g); res(S.socket(sel, g)); UI.renderPanel(); } break;
      case 'unsocket': if (sel) { res(S.unsocket(sel, +el.dataset.i)); UI.renderPanel(); } break;
      case 'fusesel': if (sel) { P.fuse = P.fuse || []; const i = P.fuse.indexOf(sel.uid); if (i >= 0) P.fuse.splice(i, 1); else if (P.fuse.length < 3) P.fuse.push(sel.uid); UI.renderPanel(); } break;
      case 'fusion': { const items = P.fuse.map(u => s.inv.find(i => i.uid === u)).filter(Boolean); const r = S.fusion(items); res(r); if (r && r.ok) { P.fuse = []; P.sel = r.item.uid; } UI.renderPanel(); break; }
      case 'setzoom': G.setZoomPct(+el.dataset.v); UI.renderPanel(); break;
      case 'zoom': G.setZoom(+el.dataset.d); break;
      case 'setq': V.setLevel(+el.dataset.v); UI.toast(`VFX: ${V.LEVELS[V.level].th}`, 'info'); UI.renderPanel(); break;
      case 'savenow': S.persist(); UI.toast('บันทึกแล้ว', 'good'); break;
      case 'totitle': S.persist(); W.mode = null; W.map = null; UI.closePanel(); UI.showTitle(); break;
      case 'askwipe': $('#wipeconfirm').innerHTML = '<p class="bad">ลบเซฟถาวร ย้อนกลับไม่ได้</p><button class="btn danger" data-act="wipe">ยืนยันลบเซฟ</button>'; break;
      case 'wipe': S.wipe(); S.save = null; W.mode = null; W.map = null; UI.closePanel(); UI.showTitle(); break;
      case 'gm': UI.gmCmd(el.dataset.c, el); break;
      case 'mclose-town': UI.closeModal(); S.goTown(s.lastTown); break;
      case 'mclose-dg': UI.closeModal(); S.goTown('aurelion'); UI.openPanel('dungeon'); break;
      case 'mclose-pvp': UI.closeModal(); S.goPvP(UI._lastPvp || { mode: 'tdm', map: 0, size: 5, diff: 1, mercs: true }); break;
    }
  };

  // ---------------- input ----------------
  UI.bindInput = (canvas) => {
    document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (el && !el.classList.contains('dis')) { e.preventDefault(); UI.act(el, e); } const sk = e.target.closest('[data-sk]'); if (sk && W.player) { S.IN.queue = +sk.dataset.sk; } });
    document.addEventListener('change', e => { const t = e.target; if (t.dataset.gm) { W.gm[t.dataset.gm] = t.checked; if (t.dataset.gm === 'allSkills' && W.player) { W.player.allSkills = t.checked; UI.refreshSkillIcons(); } if (t.dataset.gm === 'allSlots') S.refreshPlayer(); } if (t.dataset.set) { S.save.settings[t.dataset.set] = t.checked; } });
    $('#pclose').onclick = () => UI.closePanel();
    const typing = () => { const a = document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT'); };
    const PK = { c: 'char', i: 'inv', k: 'skills', u: 'runes', n: 'fashion', l: 'dungeon', p: 'pvp', g: 'guild', j: 'quests', m: 'map', b: 'codex', o: 'settings' };
    window.addEventListener('keydown', e => {
      if (typing()) { if (e.key === 'Escape') document.activeElement.blur(); return; }
      if (!W.player || !$('#title-screen').hidden) return;
      const k = e.key.toLowerCase();
      if (k === 'escape') { if (!$('#modal').hidden) return; UI.closePanel(); return; }
      if (e.shiftKey && D.SHIFT_KEYS && D.SHIFT_KEYS[e.code] !== undefined) { S.IN.queue = D.SHIFT_KEYS[e.code]; e.preventDefault(); return; }
      if (PK[k] && !e.ctrlKey && !e.metaKey) { if (UI.panel && UI.panel.id === PK[k]) UI.closePanel(); else UI.openPanel(PK[k]); e.preventDefault(); return; }
      const si = D.KEYS.findIndex(x => x.toLowerCase() === k); if (si >= 0) { S.IN.queue = si; e.preventDefault(); return; }
      if (k === 'tab') { e.preventDefault(); const p = W.player; const list = W.units.filter(u => !u.dead && E.isEnemy(p, u) && E.targetable(p, u) && U.d2(u.x, u.y, p.x, p.y) < 144 && u.kind !== 'npc').sort((a, b) => U.d2(a.x, a.y, p.x, p.y) - U.d2(b.x, b.y, p.x, p.y)); if (list.length) { const i = list.indexOf(p.target); S.select(list[(i + 1) % list.length]); } return; }
      if (k === 'z') { UI.act({ dataset: { act: 'auto' } }); return; } if (k === 'x') { UI.act({ dataset: { act: 'autoq' } }); return; }
      if (k === '=' || k === '+') { G.setZoom(1); return; } if (k === '-' || k === '_') { G.setZoom(-1); return; }
      if (k === 'h') { S.usePotion('hpPot'); return; } if (k === 'v') { S.usePotion('mpPot'); return; }
      if (k === ' ') { e.preventDefault(); UI.interact(); return; }
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { S.IN.keys.add(k); e.preventDefault(); }
    });
    window.addEventListener('keyup', e => S.IN.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => S.IN.keys.clear());
    const toWorld = (e) => { const r = canvas.getBoundingClientRect(); const sx = (e.clientX - r.left) / r.width * E.VW, sy = (e.clientY - r.top) / r.height * E.VH; return [sx, sy, ...W.cam.s2w(sx, sy)]; };
    canvas.addEventListener('mousemove', e => { if (!W.map) return; const [, , wx, wy] = toWorld(e); S.IN.mouseW = [wx, wy]; });
    canvas.addEventListener('contextmenu', e => { e.preventDefault(); if (!W.player) return; const [, , wx, wy] = toWorld(e); S.IN.mouseW = [wx, wy]; const t = UI.unitAt(...toWorld(e).slice(0, 2)); if (t && E.isEnemy(W.player, t)) S.select(t); S.IN.queue = 0; });
    const tap = (e) => {
      if (!W.player || !W.map) return; const [sx, sy, wx, wy] = toWorld(e); S.IN.lastClickW = [wx, wy];
      const t = UI.unitAt(sx, sy);
      if (t && t.kind === 'npc' && !t.sim) { S.IN.clickMove = { npc: t }; return; }
      if (t && E.isEnemy(W.player, t)) { S.select(t); if (W.player.target === t && e.detail >= 2) S.IN.queue = 0; return; }
      if (t && t.kind === 'hero') { S.select(t); return; }
      const portal = W.mode && W.mode.portals && W.mode.portals.find(p => U.d2(p.x, p.y, wx, wy) < 2.2); if (portal) { S.IN.clickMove = { portal }; return; }
      S.IN.clickMove = { x: wx, y: wy }; S.IN.manualT = 1.2; W.player.pending = null; V.ring(wx, wy, 0.5, ['#ffffff', '#ffe9a8', '#e8b04a'], 0.35, { w: 1 });
    };
    canvas.addEventListener('click', tap);
    canvas.addEventListener('wheel', e => { e.preventDefault(); if (!W.map) return; const d = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY; G.setZoomPct(G.zTarget * Math.exp(-d * 0.0012)); }, { passive: false });
    canvas.addEventListener('touchstart', e => { if (e.touches.length === 2) { UI._pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); UI._pinchZ = G.zTarget; } }, { passive: true });
    canvas.addEventListener('touchmove', e => { if (e.touches.length === 2 && UI._pinch) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); G.setZoomPct(UI._pinchZ * d / UI._pinch, true); } }, { passive: true });
    // touch joystick
    const joy = $('#joy');
    canvas.addEventListener('touchstart', e => { const t = e.changedTouches[0]; if (t.clientX < innerWidth * 0.4 && t.clientY > innerHeight * 0.45) { S.IN.joyId = t.identifier; S.IN.joyO = [t.clientX, t.clientY]; joy.hidden = false; joy.style.left = t.clientX + 'px'; joy.style.top = t.clientY + 'px'; e.preventDefault(); } }, { passive: false });
    canvas.addEventListener('touchmove', e => { for (const t of e.changedTouches) if (t.identifier === S.IN.joyId) { const dx = t.clientX - S.IN.joyO[0], dy = t.clientY - S.IN.joyO[1]; const l = Math.hypot(dx, dy); const k = Math.min(1, l / 50); S.IN.joy = l > 6 ? { x: dx / l * k, y: dy / l * k } : null; joy.firstChild.style.transform = `translate(${dx / Math.max(1, l) * Math.min(l, 40)}px,${dy / Math.max(1, l) * Math.min(l, 40)}px)`; e.preventDefault(); } }, { passive: false });
    canvas.addEventListener('touchend', e => { for (const t of e.changedTouches) if (t.identifier === S.IN.joyId) { S.IN.joyId = null; S.IN.joy = null; joy.hidden = true; } });
    document.querySelectorAll('.chat-tabs button').forEach(b => b.onclick = () => { UI.chatTab = b.dataset.ch; document.querySelectorAll('.chat-tabs button').forEach(x => x.classList.toggle('on', x === b)); UI.renderLog(); });
    $('#cmdbar').innerHTML = D.COMMANDS.map(c => `<button data-act="cmd" data-k="${c.k}">${c.th}</button>`).join('');
    $('#menu').innerHTML = [['char', 'ตัวละคร', 'C'], ['inv', 'กระเป๋า', 'I'], ['skills', 'สกิล', 'K'], ['runes', 'รูน', 'U'], ['fashion', 'แฟชั่น', 'N'], ['dungeon', 'ดันเจี้ยน', 'L'], ['pvp', 'PvP', 'P'], ['guild', 'กิลด์', 'G'], ['mercs', 'รับจ้าง', ''], ['quests', 'ภารกิจ', 'J'], ['map', 'แผนที่', 'M'], ['codex', 'Codex', 'B'], ['settings', 'ตั้งค่า', 'O']].map(([p, n, k]) => `<button data-act="panel" data-p="${p}" class="${p === 'gm' ? 'gmb' : ''}"><span>${n}</span>${k ? `<kbd>${k}</kbd>` : ''}</button>`).join('');
  };
  UI.setUiScale = (p) => { p = U.clamp(p || 100, 70, 140); if (S.save) S.save.settings.uiScale = p; $('#hud').style.setProperty('--uiz', (p / 100).toFixed(2)); };
  UI.unitAt = (sx, sy) => {
    let best = null, bd = 1e9;
    for (const u of W.units) { if (u.dead || u === W.player || u._sx === undefined) continue; const h = u._ph || (u.propSpr ? u.propSpr.h : 32 * u.sc); const cx = u._sx, cy = u._sy + h * 0.55; const dx = Math.abs(sx - cx), dy = Math.abs(sy - cy); if (dx < (u._pw ? Math.max(10, u._pw * 0.5) : 10 * Math.max(1, u.sc)) && dy < h * 0.6) { const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = u; } } }
    return best;
  };
  UI.interact = () => {
    const p = W.player; let best = null, bd = 6.25;
    for (const u of W.units) if (u.kind === 'npc' && !u.sim) { const d = U.d2(u.x, u.y, p.x, p.y); if (d < bd) { bd = d; best = u; } }
    if (best) { UI.openNpc(best); return; }
    if (W.mode && W.mode.portals) for (const pt of W.mode.portals) if (U.d2(pt.x, pt.y, p.x, p.y) < 4) { pt.use(); return; }
    UI.toast('ไม่มีอะไรให้โต้ตอบใกล้ ๆ', 'info');
  };
})(window.G);
