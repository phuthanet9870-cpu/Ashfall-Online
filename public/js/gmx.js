'use strict';
/* GM X: a "มอนสเตอร์" tab where every monster in the game (farm mobs, Champion, Rare, Map Boss, World Boss) is grouped
   by category / map and shown with its own sprite as an icon — click to spawn it anywhere (level, count, elite,
   ally, training dummy). Extra controls (freeze / pull / remove mobs, invisible, run speed, diamonds, tickets, class
   portraits, warp with icons) and an icon on every GM button, tab and toggle. */
(function (G) {
  const U = G.U, D = G.D, S = G.S, UI = G.UI, E = G.E, W = G.W, SPR = G.SPR; const esc = UI.esc; const $ = s => document.querySelector(s);
  const GTH = { normal: 'ปกติ', champion: 'Champion', rare: 'Rare', boss: 'Map Boss', world: 'World Boss' };
  const GCOL = { normal: '#f0ece0', champion: '#ff9a2e', rare: '#c07aff', boss: '#ff4d4d', world: '#ff4af0' };
  // ---------- monster icons (sprite of the monster itself) ----------
  const IC = new Map();
  // returns HTML: image atlases become CSS sprites (no canvas readback → no tainting), canvas sheets become a data URL
  const monIcon = (md, sz = 44) => { const k = (md.duel || '') + '|' + (md.px ?? '') + '|' + md.body + md.c + sz; if (IC.has(k)) return IC.get(k);
    const fake = { kind: 'mob', md, body: md.body, col: md.c, col2: md.c2, anim: { t: 0, at: 0, ct: 0 }, fx: 1, fy: 1, grade: 'normal', flash: 0, sc: 1, id: 0 };
    let inf = null; try { inf = E.spriteInfo(fake); } catch (e) { } let h = `<img class="gmsp" src="${UI.menuIcon('codex')}" style="width:${sz}px;height:${sz}px" alt="">`;
    const BMm = md.duel && G.BOSS_MAN && G.BOSS_MAN[md.duel]; if (inf && BMm && BMm.h) { const hh = Math.min(BMm.h, BMm.foot), ww = Math.min(BMm.cw, Math.round(hh * 1.25)); inf = Object.assign({}, inf, { sx: inf.sx + Math.max(0, Math.round(BMm.ax - ww / 2)), sy: inf.sy + Math.max(0, BMm.foot - hh), w: ww, h: hh }); }
    if (inf && inf.img && inf.w && inf.h) { const sc = Math.min((sz - 2) / inf.w, (sz - 2) / inf.h);
      if (inf.img instanceof HTMLImageElement) h = `<span class="gmsp" style="width:${sz}px;height:${sz}px"><span style="width:${inf.w}px;height:${inf.h}px;background:url('${inf.img.src}') -${inf.sx}px -${inf.sy}px no-repeat;transform:translateX(-50%) scale(${sc.toFixed(3)})"></span></span>`;
      else { try { const [cv, x] = SPR.mk(sz, sz); x.imageSmoothingEnabled = false; const w = inf.w * sc, hh = inf.h * sc; x.drawImage(inf.img, inf.sx, inf.sy, inf.w, inf.h, (sz - w) / 2, sz - 1 - hh, w, hh); h = `<img class="gmsp" src="${cv.toDataURL()}" style="width:${sz}px;height:${sz}px" alt="">`; } catch (e) { } } }
    IC.set(k, h); return h; };
  // ---------- GM button above the dock, shown once /gmadmin2008 was used on this device ----------
  const unlocked = () => { try { return globalThis.ASHFALL_STORAGE.getItem('ashfall_gm') === '1'; } catch (e) { return !!G._gmU; } };
  const placeBtn = () => { const hud = $('#hud'), dock = $('#dock'); let b = $('#gmdock'); if (!unlocked() || !hud || !dock || !dock.offsetWidth) { if (b) b.hidden = true; return; }
    if (!b) { b = document.createElement('button'); b.id = 'gmdock'; b.title = 'GM Console'; b.innerHTML = `<img src="${UI.menuIcon('gm')}" alt=""><span>GM</span>`; b.addEventListener('click', e => { e.stopPropagation(); UI.openPanel('gm'); }); }
    if (b.parentNode !== hud) hud.appendChild(b); b.hidden = false; const hr = hud.getBoundingClientRect(), dr = dock.getBoundingClientRect();
    b.style.left = (dr.left - hr.left + 6) + 'px'; b.style.top = (dr.top - hr.top - 50) + 'px'; };
  setInterval(placeBtn, 400);
  G.GMX = { monIcon, unlock() { G._gmU = true; try { globalThis.ASHFALL_STORAGE.setItem('ashfall_gm', '1'); } catch (e) { } placeBtn(); }, lock() { G._gmU = false; try { globalThis.ASHFALL_STORAGE.removeItem('ashfall_gm'); } catch (e) { } placeBtn(); } };
  // ---------- catalog of every monster ----------
  let ML = null; const list = () => { if (ML) return ML; ML = []; const seen = new Set(); const add = (md, grade, map) => { if (!md) return; const key = md.n + '|' + grade; if (seen.has(key)) return; seen.add(key); ML.push({ md, grade, map }); };
    D.FARM_MAPS.forEach((m, i) => { for (const md of m.mobs) add(md, 'normal', i); add(m.champ, 'champion', i); add(m.rare, 'rare', i); add(m.boss, 'boss', i); add(m.world, 'world', i); });
    if (D.WORLD_BOSSES && D.BOSS_MD) for (const id of D.WORLD_BOSSES) add(D.BOSS_MD(id), 'world', -1);
    return ML; };
  const spawnOne = (e, o) => { const p = W.player; if (!p) return null; const grade = e.grade === 'normal' && o.elite ? 'elite' : e.grade; const a = Math.random() * 6.283, r = 2 + Math.random() * 2.5;
    const u = E.spawn(S.mkMob(e.md, o.lvl, grade, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, { leash: 40 })); if (!u) return null; u.md = u.md || e.md; u._gmx = true;
    if (o.ally) { u.team = 0; u.owner = p; u.isMerc = true; u.name = '♥ ' + u.name; } if (o.dummy) u._gmDummy = true; return u; };
  // ---------- extra GM flags ----------
  Object.assign(W.gm, { freeze: false, invis: false, pspd: 1 }, W.gm);
  const tg0 = E.targetable; E.targetable = (v, u) => { if (W.gm.invis && u === W.player && v && v.kind === 'mob') return false; return tg0(v, u); };
  const rc0 = E.recalc; E.recalc = function (u) { const r = rc0.apply(this, arguments); if (u && u === W.player && W.gm.pspd && W.gm.pspd !== 1) u.moveSpd *= W.gm.pspd; return r; };
  const up0 = E.update; E.update = function () { const r = up0.apply(this, arguments); try { for (const u of W.units) { if (u.dead || u.kind !== 'mob') continue; if (W.gm.freeze || u._gmDummy) { u.cc = u.cc || {}; u.cc.st = Math.max(u.cc.st || 0, 0.2); u.moving = false; } } } catch (e) { } return r; };
  // ---------- icons for every GM control ----------
  const bag = k => UI.bagIcon(k), menu = k => UI.menuIcon(k), cur = k => UI.curIcon(k);
  const sample = {}; const itemIc = (kind, slot) => { const k = kind + slot; if (!sample[k]) { try { const it = S.genItem(kind, 10, 100, slot ? { slot } : {}); sample[k] = UI.itemIcon(it); } catch (e) { sample[k] = menu('inv'); } } return sample[k]; };
  const firstMob = i => { const m = D.FARM_MAPS[i]; return m ? monIcon(m.mobs[0], 22) : `<img src="${menu('map')}" alt="">`; };
  const ICON = {
    setlv: () => menu('char'), setcls: () => menu('char'), cur: el => ({ gold: cur('gold'), honor: bag('honor'), war: bag('war'), runeDust: bag('runeDust'), jewelDust: bag('jewelDust'), thread: bag('thread') }[el] || cur('gold')),
    stones: () => bag('stone'), cons: () => bag('hpPot'), pets: () => menu('mercs'), ach: () => menu('quests'), infamy0: () => bag('pk'), heal: () => bag('hpPot'), tp: () => menu('map'),
    give: () => itemIc('gear', 'weapon'), kit: () => itemIc('gear', 'chest'), kit2: () => itemIc('gear', 'weapon'), autons: () => itemIc('gear', 'chest'), runekit: () => menu('runes'), fashkit: () => menu('fashion'), gems: () => itemIc('gem', ''), clearinv: () => menu('inv'), dropground: () => itemIc('gear', 'boots'),
    spawn: () => menu('codex'), killall: () => menu('pvp'), rates: () => menu('settings'), announce: () => menu('guild'),
    dgenter: () => menu('dungeon'), dgclear: () => menu('dungeon'), dgunlock: () => menu('dungeon'), dgdaily: () => menu('quests'), dgsim: () => menu('codex'),
    pvpwin: () => menu('pvp'), pvplose: () => menu('pvp'), score: () => menu('pvp'), prep: () => menu('guild'), rating: () => menu('guild'), challenge: () => menu('guild'), mkguildq: () => menu('guild'), mercmax: () => menu('mercs'),
    skset: () => menu('skills'), skreset: () => menu('skills'), sktry: () => menu('skills'), show: () => menu('skills'), showv: () => menu('runes'), showstop: () => menu('settings'), export: () => menu('settings'), import: () => menu('settings'),
    dia: () => cur('diamond'), tix: () => cur('ticket'), maxlv: () => menu('char'), allmax: () => menu('gm'), mfreeze: () => menu('skills'), mpull: () => menu('map'), mclear: () => menu('pvp'), mheal: () => bag('hpPot'), mkill: () => menu('pvp'),
    reroll: () => bag('reroll'), bpmode: () => menu('pvp'), wbnow: () => menu('codex'), treq: () => menu('guild')
  };
  const ACTI = { gotown: () => menu('map'), gofarm: el => ({ html: firstMob(+el) }), gogallery: () => menu('skills'), savenow: () => menu('settings'), panel: () => menu('settings') };
  const GMI = { god: '🛡', oneHit: '💥', noCd: '⏱', allSkills: '📘', allRunes: '🔮', allSlots: '💍', ai: '🤖', debug: '🐞', freeze: '❄', invis: '👻' };
  const iconize = h => h.replace(/<button\b([^>]*)>(?!\s*<img)/g, (m, attrs) => {
      const a = (attrs.match(/data-act="([^"]+)"/) || [])[1]; const c = (attrs.match(/data-c="([^"]+)"/) || [])[1]; const k = (attrs.match(/data-k="([^"]+)"/) || [])[1]; const i = (attrs.match(/data-i="([^"]+)"/) || [])[1];
      if (/class="[^"]*\b(dye|tab|gmmon|chip)\b/.test(attrs)) return m; let src = null;
      try { if (a === 'gm' && c) src = ICON[c] ? ICON[c](k) : menu('gm'); else if (ACTI[a]) src = ACTI[a](i); else if (a === 'gm' || /^gmx/.test(a || '')) src = menu('gm'); } catch (e) { src = menu('gm'); }
      return src ? `<button${attrs}>${src.html || `<img class="gmi" src="${src}" alt="">`}` : m; })
    .replace(/<label class="chk"><input type="checkbox" data-gm="([^"]+)"([^>]*)>/g, (m, k, r) => `<label class="chk"><input type="checkbox" data-gm="${k}"${r}><i class="gmie">${GMI[k] || '⚙'}</i>`)
    .replace(/<h4>/g, '<h4 class="gmh">');
  // ---------- monster tab ----------
  const renderMon = (P) => { const s = S.save; P.mg = P.mg || 'all'; P.mm = P.mm ?? 'all'; const o = P.mo = P.mo || { lvl: s.lvl, n: 1, elite: false, ally: false, dummy: false };
    const L = list(); const items = L.map((e, i) => [e, i]).filter(([e]) => (P.mg === 'all' || e.grade === P.mg) && (P.mm === 'all' || e.map === +P.mm || (P.mm === 'wb' && e.map === -1)));
    const chip = (act, v, on, img, n) => `<button class="chip gmchip ${on ? 'on' : ''}" data-act="${act}" data-v="${v}">${img ? (img[0] === '<' ? img : `<img src="${img}" alt="">`) : ''}${esc(n)}</button>`;
    const gc = { all: 'ทั้งหมด', ...GTH }; const cnt = g => L.filter(e => g === 'all' || e.grade === g).length;
    const gIcon = g => { const e = L.find(x => g === 'all' || x.grade === g); return e ? monIcon(e.md, 22) : null; };
    const alive = W.units.filter(u => u.kind === 'mob' && !u.dead).length;
    return `<div class="gmx">
      <div class="chips gmrow">${Object.keys(gc).map(g => chip('gmx-g', g, P.mg === g, gIcon(g), `${gc[g]} (${cnt(g)})`)).join('')}</div>
      <div class="chips gmrow gmmaps">${chip('gmx-m', 'all', P.mm === 'all', menu('map'), 'ทุกแผนที่')}${D.FARM_MAPS.map((m, i) => chip('gmx-m', i, String(P.mm) === String(i), firstMob(i), `${i + 1}. ${m.th || m.n}`)).join('')}${chip('gmx-m', 'wb', P.mm === 'wb', menu('codex'), 'บอสโลกทั้งหมด')}</div>
      <div class="gmopts"><label class="fl"><img class="gmi" src="${menu('char')}" alt="">เลเวล<input type="number" id="gmxlv" value="${o.lvl}" min="1" max="${D.MAX_LV}"></label><label class="fl"><img class="gmi" src="${menu('mercs')}" alt="">จำนวน<input type="number" id="gmxn" value="${o.n}" min="1" max="30"></label>
        <label class="chk"><input type="checkbox" id="gmxel" ${o.elite ? 'checked' : ''}><i class="gmie">⭐</i> ตัวปกติเป็น Elite</label><label class="chk"><input type="checkbox" id="gmxal" ${o.ally ? 'checked' : ''}><i class="gmie">💚</i> เป็นฝ่ายเรา (ช่วยสู้)</label><label class="chk"><input type="checkbox" id="gmxdm" ${o.dummy ? 'checked' : ''}><i class="gmie">🎯</i> หุ่นซ้อม (ไม่ขยับ)</label></div>
      <div class="list gmrow"><button class="btn" data-act="gm" data-c="mkill">ฆ่ามอนสเตอร์ทั้งหมด</button><button class="btn" data-act="gm" data-c="mclear">ลบมอนสเตอร์ออกจากแผนที่</button><button class="btn" data-act="gm" data-c="mpull">ดึงมอนสเตอร์ทั้งหมดมาหาเรา</button><button class="btn" data-act="gm" data-c="mheal">ฮีลมอนสเตอร์เต็ม</button><button class="btn ${W.gm.freeze ? 'primary' : ''}" data-act="gm" data-c="mfreeze">${W.gm.freeze ? 'เลิกแช่แข็ง' : 'แช่แข็งมอนสเตอร์ทั้งหมด'}</button><span class="muted">ในแผนที่ตอนนี้ ${alive} ตัว</span></div>
      <p class="muted">คลิกที่มอนสเตอร์เพื่อเสกข้างตัวคุณ (ใช้ได้ทุกแผนที่) · ${items.length} ชนิด</p>
      <div class="gmmons">${items.map(([e, i]) => `<button class="gmmon" data-act="gmx-spawn" data-i="${i}" title="${esc(e.md.n)} · ${GTH[e.grade]}${e.map >= 0 ? ' · ' + esc(D.FARM_MAPS[e.map].th || D.FARM_MAPS[e.map].n) : ''}">${monIcon(e.md)}<b>${esc(e.md.n)}</b><small style="color:${GCOL[e.grade]}">${GTH[e.grade]}</small></button>`).join('')}</div></div>`; };
  const readOpts = () => { const P = UI.panel; const o = P.mo || {}; const v = id => $('#' + id); if (v('gmxlv')) o.lvl = U.clamp(+v('gmxlv').value || 1, 1, D.MAX_LV); if (v('gmxn')) o.n = U.clamp(+v('gmxn').value || 1, 1, 30); if (v('gmxel')) o.elite = v('gmxel').checked; if (v('gmxal')) o.ally = v('gmxal').checked; if (v('gmxdm')) o.dummy = v('gmxdm').checked; P.mo = o; return o; };
  // ---------- player tab extras ----------
  const extraPlayer = () => { const s = S.save; return `<h4>เพิ่มเติม</h4><div class="list"><button class="mini-btn" data-act="gm" data-c="dia">+ เพชร 1,000</button><button class="mini-btn" data-act="gm" data-c="tix">+ ตั๋วกาชา 100</button><button class="mini-btn" data-act="gm" data-c="reroll">+ หินสุ่มออปชั่น 50</button><button class="mini-btn" data-act="gm" data-c="maxlv">เลเวลสูงสุด</button><button class="mini-btn" data-act="gm" data-c="allmax">ทุกอย่างสูงสุด (เลเวล+เงิน+ชุดเก่งสุด)</button></div>
    <label class="chk"><input type="checkbox" data-gm="invis" ${W.gm.invis ? 'checked' : ''}> ล่องหน (มอนสเตอร์มองไม่เห็น)</label><label class="fl"><img class="gmi" src="${UI.menuIcon('map')}" alt="">ความเร็ววิ่ง ×<input type="number" id="gmxps" value="${W.gm.pspd}" min="0.2" max="5" step="0.1"></label><button class="btn" data-act="gm" data-c="pspd">ใช้ความเร็ว</button>`; };
  // ---------- hook render / commands / tabs ----------
  const gm = UI.PANELS.gm; const TI = { player: menu('char'), item: itemIc('gear', 'weapon'), world: menu('map'), dungeon: menu('dungeon'), pvp: menu('pvp'), skill: menu('skills'), vfx: menu('runes'), sys: menu('settings') };
  gm.tabs = [['player', 'ผู้เล่น'], ['mon', 'มอนสเตอร์'], ...gm.tabs.filter(t => t[0] !== 'player')];
  const tabImg = k => k === 'mon' ? menu('codex') : TI[k] || menu('gm');
  gm.tabs = gm.tabs.map(([k, n]) => [k, `<img class="gmti" src="${tabImg(k)}" alt="">${String(n).replace(/<[^>]*>/g, '')}`]);
  const gr0 = UI.gmRender; UI.gmRender = (tab, P) => { let h = tab === 'mon' ? renderMon(P) : gr0(tab, P); if (tab === 'player') h += extraPlayer(); if (tab === 'sys') h += `<h4>ปุ่ม GM</h4><button class=\"btn\" data-act=\"gm\" data-c=\"gmlock\">ซ่อนปุ่ม GM (เรียกใหม่ด้วย /gmadmin2008)</button>`; return iconize(h); };
  const gc0 = UI.gmCmd; UI.gmCmd = (c, el) => { const s = S.save; const p = W.player; const mobs = () => W.units.filter(u => u.kind === 'mob' && !u.dead);
    switch (c) {
      case 'dia': s.diamond = (s.diamond || 0) + 1000; break;
      case 'tix': s.gacha = s.gacha || {}; s.gacha.tix = (s.gacha.tix || 0) + 100; break;
      case 'reroll': s.bag.reroll = (s.bag.reroll || 0) + 50; break;
      case 'maxlv': S.setLevel(D.MAX_LV); break;
      case 'allmax': S.setLevel(D.MAX_LV); s.gold += 1e8; s.diamond = (s.diamond || 0) + 1e5; if (S.gmBestKit) S.gmBestKit(8); break;
      case 'pspd': W.gm.pspd = U.clamp(+($('#gmxps') || {}).value || 1, 0.2, 5); if (p) E.recalc(p); break;
      case 'mkill': for (const u of mobs()) if (u.team !== 0) { u.hp = 0; E.kill(u, p); } break;
      case 'mclear': W.units = W.units.filter(u => u.kind !== 'mob' || u.team === 0 && u._gmx); break;
      case 'mpull': if (p) for (const u of mobs()) { const a = Math.random() * 6.283; u.x = p.x + Math.cos(a) * 2.5; u.y = p.y + Math.sin(a) * 2.5; } break;
      case 'mheal': for (const u of mobs()) u.hp = u.maxhp; break;
      case 'gmlock': G.GMX.lock(); UI.closePanel(); UI.toast('ซ่อนปุ่ม GM แล้ว', 'info'); return;
      case 'mfreeze': W.gm.freeze = !W.gm.freeze; break;
      default: return gc0(c, el);
    }
    S.persist && S.persist(); UI.toast('GM: เรียบร้อย', 'good'); UI.renderPanel(); };
  const a0 = UI.act; UI.act = (el, e) => { const a = el.dataset.act; const P = UI.panel;
    if (a === 'gmx-g') { readOpts(); P.mg = el.dataset.v; UI.renderPanel(); return; }
    if (a === 'gmx-m') { readOpts(); P.mm = el.dataset.v; UI.renderPanel(); return; }
    if (a === 'gmx-cls') { S.changeClass(el.dataset.v); UI.toast('เปลี่ยนคลาสเป็น ' + D.CLS[el.dataset.v].name, 'good'); UI.renderPanel(); return; }
    if (a === 'gmx-spawn') { const o = readOpts(); const ent = list()[+el.dataset.i]; if (!ent || !W.player) return; let n = 0; for (let i = 0; i < o.n; i++) if (spawnOne(ent, o)) n++; UI.toast(`เสก ${ent.md.n} ×${n} (Lv ${o.lvl})`, 'good'); return; }
    return a0(el, e); };
  const css = document.createElement('style'); css.textContent = `
    img.gmi{width:20px;height:20px;vertical-align:middle;margin-right:5px;image-rendering:pixelated;filter:drop-shadow(0 1px 1px #000)}
    img.gmti{width:18px;height:18px;vertical-align:middle;margin-right:4px;image-rendering:pixelated}
    i.gmie{font-style:normal;display:inline-block;width:20px;text-align:center;margin-right:3px}
    .gmrow{flex-wrap:wrap;gap:4px;margin:4px 0}.gmchip img{width:20px;height:20px;vertical-align:middle;margin-right:4px;image-rendering:pixelated}
    .gmmaps{max-height:78px;overflow:auto}.gmopts .fl img.gmi{display:inline-block}.gmopts .fl{display:block}.gmopts{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;margin:6px 0}.gmopts .fl{width:120px}
    .gmmons,.gmcls{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:6px;max-height:46vh;overflow:auto;padding:2px}
    .gmcls{max-height:none;grid-template-columns:repeat(auto-fill,minmax(78px,1fr))}
    .gmmon{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 4px;background:linear-gradient(#1c1710,#0e0b08);border:1px solid #4a3c22;border-radius:8px;color:#e8dcc0;cursor:pointer;min-width:0}
    .gmmon:hover{border-color:#f2d27a;box-shadow:0 0 8px rgba(242,210,122,.4)}.gmmon.on{border-color:#f2d27a;box-shadow:0 0 0 2px #f2d27a inset}
    .gmmon img{width:44px;height:44px;image-rendering:pixelated}.gmsp{display:inline-block;position:relative;overflow:hidden;vertical-align:middle;image-rendering:pixelated;flex:none}span.gmsp>span{position:absolute;left:50%;bottom:1px;transform-origin:50% 100%;image-rendering:pixelated}.gmchip .gmsp{margin-right:4px}.gmc img{width:40px;height:40px}
    #gmdock{position:absolute;z-index:30;width:50px;height:44px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;border-radius:10px;border:1px solid #c07aff;background:linear-gradient(180deg,rgba(52,30,70,.95),rgba(16,10,22,.96));color:#e8d0ff;font:700 10px sans-serif;cursor:pointer;box-shadow:0 0 10px rgba(192,122,255,.45)}#gmdock img{width:22px;height:22px;image-rendering:pixelated}#gmdock:hover{border-color:#f2d27a;box-shadow:0 0 14px rgba(242,210,122,.6)}
    .gmmon b{font-size:11px;line-height:1.15;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}.gmmon small{font-size:10px}`;
  document.head.appendChild(css);
})(window.G);
