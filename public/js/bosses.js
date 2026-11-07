'use strict';
/* Bosses from "Duelyst Unit Animations": animated sprite bosses replace every map / PvP / dungeon boss; the remaining bosses
   become World Bosses that rotate in a dedicated arena (ลานบอสโลก) on a real-time spawn schedule. */
(function (G) {
  const U = G.U, D = G.D, E = G.E, W = G.W, S = G.S, SPR = G.SPR, V = G.VFX;
  const BM = G.BOSS_MAN || {};
  const NAMES = { andromeda: 'Andromeda', antiswarm: 'Antiswarm', borealjuggernaut: 'Boreal Juggernaut', candypanda: 'Candy Panda', chaosknight: 'Chaos Knight', christmas: 'Frostfire Krampus', cindera: 'Cindera', city: 'Spirit of the City', crystal: 'Crystal Wyrm', decepticle: 'Decepticle', decepticlechassis: 'Decepticle Chassis', decepticlehelm: 'Decepticle Helm', decepticleprime: 'Decepticle Prime', decepticlesword: 'Decepticle Blade', decepticlewings: 'Decepticle Wings', dissonance: 'Dissonance', emp: 'E.M.P.', gol: 'Gol', grym: 'Grym', harmony: 'Harmony', invader: 'Invader', kane: 'Kane', kron: 'Kron', legion: 'Legion', malyk: 'Malyk', manaman: 'Manaman', orias: 'Orias', oriasidol: 'Orias Idol', paragon: 'Paragon of Light', protector: 'Protector', sandpanther: 'Sand Panther', serpenti: 'Serpenti', shadowlord: 'Shadow Lord', shinkagezendo: 'Shinkage Zendo', skurge: 'Skurge', skyfalltyrant: 'Skyfall Tyrant', solfist: 'Solfist', soulstealer: 'Soul Stealer', spelleater: 'Spelleater', taskmaster: 'Taskmaster', treatdemon: 'Treat Demon', treatdrake: 'Treat Drake', treatoni: 'Treat Oni', umbra: 'Umbra', unhallowed: 'Unhallowed', valiant: 'Valiant', vampire: 'Vampire Lord', wolfpunch: 'Wolfpunch', wraith: 'Wraith', wujin: 'Wujin' };
  const mdOf = (id, base) => Object.assign({}, base || {}, { n: NAMES[id] || id, duel: 'boss_' + id, body: (base && base.body) || 'golem', c: (base && base.c) || '#8a8a9a', c2: (base && base.c2) || '#4a4a5a' });
  // map bosses (themed) — farm map order
  const MAPBOSS = { meadow: 'candypanda', dunes: 'sandpanther', forest: 'oriasidol', swamp: 'umbra', tundra: 'borealjuggernaut', volcano: 'cindera', ruins: 'serpenti', sky: 'skyfalltyrant', void: 'andromeda', abyss: 'shadowlord', jade: 'wujin', canyon: 'solfist', mirror: 'crystal', clockwork: 'emp', fungal: 'legion', thunder: 'grym', bonedesert: 'wraith', gardens: 'harmony', nightmare: 'treatdemon', creation: 'paragon' };
  const PVPBOSS = { 'Bone Dragon': 'unhallowed', 'Warlord Behemoth': 'protector' };
  const used = new Set([...Object.values(MAPBOSS), ...Object.values(PVPBOSS)]);
  D.WORLD_BOSSES = Object.keys(BM).map(k => k.replace(/^boss_/, '')).filter(k => !used.has(k)).sort();
  for (const def of D.FARM_MAPS) { if (MAPBOSS[def.id]) def.boss = mdOf(MAPBOSS[def.id], def.boss); }
  D.FARM_MAPS.forEach((def, i) => { def.world = mdOf(D.WORLD_BOSSES[(i * 7) % D.WORLD_BOSSES.length], def.world); });
  D.BOSS_NAMES = NAMES; D.BOSS_MD = id => mdOf(id);
  const mk0 = S.mkMob; S.mkMob = (md, ...a) => { if (md && PVPBOSS[md.n] && !md.duel) md = mdOf(PVPBOSS[md.n], md); return mk0(md, ...a); };

  // ---------- sprite loading + rendering ----------
  const base = (() => { const s = [...document.scripts].find(x => /js\/bosses\.js/.test(x.src)); return s ? s.src.replace(/js\/bosses\.js.*$/, '') : ''; })();
  const IMG = {}; const imgOf = id => { if (IMG[id]) return IMG[id]; const im = new Image(); im.src = base + 'assets/bosses/' + id + '.png'; IMG[id] = im; return im; };
  for (const id of new Set([...Object.values(MAPBOSS), ...Object.values(PVPBOSS)])) imgOf('boss_' + id); // preload common
  const frameOf = (u) => {
    const m = BM[u.md.duel]; if (!m) return null; const A = m.anims; const t = u.anim ? u.anim.t : 0; let list, f;
    if (u.dead) { list = A.death || A.idle; f = Math.min(list.length - 1, Math.floor((u.deadT || 0) * 11)); }
    else if (u.anim && u.anim.at > 0) { list = A.attack || A.idle; const p = 1 - Math.min(1, u.anim.at / 0.32); f = Math.min(list.length - 1, Math.floor(p * list.length)); }
    else if (u.flash > 0 && A.hit) { list = A.hit; f = Math.min(list.length - 1, Math.floor((0.15 - Math.min(0.15, u.flash)) / 0.05)); }
    else if (u.moving && A.run) { list = A.run; f = Math.floor(t * 12) % list.length; }
    else { list = A.idle; f = Math.floor(t * 9) % list.length; }
    const i = list[f]; return { m, sx: (i % m.cols) * m.cw, sy: Math.floor(i / m.cols) * m.ch };
  };
  const si0 = E.spriteInfo; E.spriteInfo = (u) => { if (u.md && u.md.duel && BM[u.md.duel]) { const m = BM[u.md.duel]; const fr = frameOf(u); return { img: imgOf(u.md.duel), sx: fr.sx, sy: fr.sy, w: m.cw, h: m.foot, flip: u.fx < 0, sc: 1 }; } return si0(u); };
  const BSC = G.BOSS_SCALE = u => (u.isWB || u.grade === 'world') ? 2.25 : u.wbClone ? 1.75 : 1.75;
  const du0 = E.drawUnit;
  E.drawUnit = (ctx, u) => {
    if (!(u.md && u.md.duel && BM[u.md.duel])) return du0(ctx, u);
    const im = imgOf(u.md.duel); const fr = frameOf(u); if (!fr || !im.complete) return du0(ctx, u); const m = fr.m;
    const [sx0, sy0] = W.cam.w2s(u.x, u.y); const sx = Math.round(sx0), sy = Math.round(sy0 - (u.jz || 0));
    const deadA = u.dead ? Math.max(0, 1 - Math.max(0, (u.deadT || 0) - 1.4) / 1.2) : 1; if (deadA <= 0) return;
    { const kk = BSC(u); u._sx = sx; u._sy = sy - m.foot * kk; u._ph = m.foot * kk; u._pw = m.cw * 0.55 * kk; }
    ctx.save(); ctx.globalAlpha = 0.38 * deadA; ctx.fillStyle = '#000'; ctx.beginPath(); const k = BSC(u); ctx.ellipse(sx, sy, m.cw * 0.32 * k, m.cw * 0.1 * k, 0, 0, 7); ctx.fill();
    if (!u.dead) { const gc = D.GRADES[u.grade] ? D.GRADES[u.grade].col : '#ff4af0'; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.22 + 0.12 * Math.sin(W.time * 3); ctx.fillStyle = gc; ctx.beginPath(); ctx.ellipse(sx, sy, m.cw * 0.42 * k, m.cw * 0.14 * k, 0, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
    ctx.globalAlpha = deadA; ctx.translate(sx, sy); ctx.scale(u.fx < 0 ? -k : k, k); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(im, fr.sx, fr.sy, m.cw, m.ch, -m.ax, -m.foot, m.cw, m.ch);
    if ((u.flash > 0 || (u.cc && u.cc.fz > 0)) && !u.dead) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55; ctx.drawImage(im, fr.sx, fr.sy, m.cw, m.ch, -m.ax, -m.foot, m.cw, m.ch); }
    ctx.restore();
  };
  // nameplate / bars sit above the sprite
  const ui0 = E.drawUnitUI; if (ui0) E.drawUnitUI = (ctx, u, ...a) => { if (u.md && u.md.duel && BM[u.md.duel]) { const j = u.jz || 0; u.jz = j + Math.max(0, BM[u.md.duel].foot * BSC(u) - 34); const r = ui0(ctx, u, ...a); u.jz = j; return r; } return ui0(ctx, u, ...a); };

  // ---------- World Boss arena ----------
  const WB = G.WB = {};
  WB.interval = () => ((S.save && S.save.settings.wbMin) || 15) * 60000;
  WB.slot = () => Math.floor(Date.now() / WB.interval());
  WB.bossFor = (slot) => { const s = S.save; if (s && s.wb && s.wb.force && s.wb.force.slot === slot) return s.wb.force.id; return D.WORLD_BOSSES[((slot % D.WORLD_BOSSES.length) + D.WORLD_BOSSES.length) % D.WORLD_BOSSES.length]; };
  WB.state = () => { const s = S.save; s.wb = s.wb || { done: {}, ann: {} }; return s.wb; };
  WB.timeLeft = () => { const st = WB.state(); const slot = WB.slot(); const inSlot = Date.now() - slot * WB.interval(); if (!st.done[slot] && inSlot < 10 * 60000) return 0; return (slot + 1) * WB.interval() - Date.now(); };
  const fmt = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  function genArena() {
    const w = 48, h = 48, c = 24; const m = E.newMap({ id: 'wbarena', kind: 'wbarena', w, h, g: ['#3a3048', '#433858'], acc: '#2a2038', bg: '#07060b', edges: true });
    const n1 = E.noise(77, w, h, 6);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const d = Math.hypot(x + 0.5 - c, y + 0.5 - c); let t = n1(x, y) > 0.55 ? 1 : 0; if (d > 22) t = 5; else if (d < 6.5) t = 8; else if (Math.abs(d - 11) < 0.8) t = 2; else if (d > 17 && n1(x, y) > 0.7) t = 4; if (Math.abs(x + 0.5 - c) < 1.2 && y > c && d <= 22) t = 2; E.setTile(m, x, y, t); }
    m.spawn = { x: c + 0.5, y: c + 18 }; m.portalPt = { x: c + 0.5, y: c + 20.5 }; m.bossPt = { x: c + 0.5, y: c + 0.5 }; m.c = c;
    E.addProp(m, 'portal', m.portalPt.x, m.portalPt.y, { c: '#ffd84a' });
    return E.scaleMap(m, G.MAPK);
  }
  WB.genArena = genArena;
  S.WorldBossMode = () => ({
    kind: 'wbarena', name: 'ลานบอสโลก', allowMount: true, portals: [], t: 0, boss: null, allies: [],
    build() { return genArena(); },
    init() { const m = W.map; this.portals = [{ x: m.portalPt.x, y: m.portalPt.y, step: true, use: () => S.goTown(S.save.lastTown || 'aurelion') }]; G.UI.log('เข้าสู่ลานบอสโลก — บอสโลกเกิดตามเวลา และผู้เล่นคนอื่นจะมาร่วมต่อสู้', 'sys');
      const L = S.save.lvl; for (let k = 0; k < 8; k++) { const cls = U.pick(D.CLASSES).id; const lv = U.clamp(L + U.ri(-12, 12), 1, D.MAX_LV); const pt = S.freePt(m, m.spawn.x + U.rf(-6, 6), m.spawn.y - U.rf(1, 6)); const u = S.makeBot(cls, 0, 0, U.ri(2, 3), { stats: S.worldBotStats(cls, lv, 1.1).st, lvl: lv, x: pt.x, y: pt.y, bot: false, name: U.pick(D.NAMES) + U.ri(1, 999) });
        u.brain = (b, dt) => E.heroAI(b, dt, { vision: 40, goal: () => this.boss && !this.boss.dead ? this.boss : { x: m.bossPt.x + Math.cos(b.id) * 9, y: m.bossPt.y + 10 + Math.sin(b.id) * 2, r: 1.5 } }); E.spawn(u); this.allies.push(u); } },
    spawnBoss(id) { const m = W.map; const st = WB.state(); const L = U.clamp(S.save.lvl + 10, 30, D.MAX_LV); const md = mdOf(id); const u = E.spawn(S.mkMob(md, L, 'world', m.bossPt.x, m.bossPt.y, { leash: 99, hpMul: 1.6 })); u.aggro = 40; u.isWB = true; u.wbSlot = WB.slot(); this.boss = u; imgOf(md.duel);
      V.pillar(m.bossPt.x, m.bossPt.y, '#ff4af0', 999, 3, 14); V.ring(m.bossPt.x, m.bossPt.y, 5, ['#ffffff', '#ff4af0', '#7a2aff'], 1.2, { w: 5 }); V.shake(8, 0.6); G.UI.announce('WORLD BOSS', `${md.n} ปรากฏตัวที่ลานบอสโลก!`); G.UI.log(`⚠ WORLD BOSS ${md.n} ปรากฏตัว`, 'sys'); st.ann[u.wbSlot] = true; },
    update(dt) { this.t += dt; S.updateLoot(dt);
      const st = WB.state(); const slot = WB.slot(); if ((!this.boss || this.boss.dead) && !st.done[slot] && WB.timeLeft() === 0) this.spawnBoss(WB.bossFor(slot));
      for (let k = W.units.length - 1; k >= 0; k--) { const u = W.units[k]; if (u.dead && u !== W.player && u.deadT > 3 && !u.isWB) { if (this.allies.includes(u)) { u.dead = false; u.hp = u.maxhp; const sp = S.freePt(W.map, W.map.spawn.x + U.rf(-4, 4), W.map.spawn.y - U.rf(0, 3)); u.x = sp.x; u.y = sp.y; } else W.units.splice(k, 1); } }
      const p = W.player; if (p.dead && p.deadT > 5) { p.dead = false; p.hp = p.maxhp * 0.6; p.x = W.map.spawn.x; p.y = W.map.spawn.y; G.UI.toast('ฟื้นคืนชีพที่จุดเกิด', 'info'); } },
    onKill(t, k) {
      if (t === W.player) { S.save.stats.deaths++; G.UI.toast('คุณถูกสังหาร — จะฟื้นใน 5 วิ', 'bad'); return; }
      if (!t.isWB) return; const s = S.save; const st = WB.state(); st.done[t.wbSlot] = true; this.boss = null;
      const share = (t.pdmg || 0) / t.maxhp; const n = share > 0.15 ? 6 : share > 0.05 ? 5 : 4; S.gainXp(S.mobXp(t) * 2); const gold = Math.round(800 + t.lvl * 40); s.gold += gold; s.honor += 120;
      for (let q = 0; q < n; q++) S.dropLoot(t.x + U.rf(-1.5, 1.5), t.y + U.rf(-1, 1), S.rollDrop('farm', U.clamp(7 + Math.floor(Math.random() * Math.random() * 4), 7, 10), t.lvl / 2));
      S.quest('boss'); G.UI.announce('WORLD BOSS DOWN', `${t.md.n} ถูกปราบแล้ว! รางวัล ${n} ชิ้น + ${U.fmt(gold)} ทอง`); S.persist();
    },
    autoCtl() { const m = W.map; return { vision: 40, goal: () => this.boss && !this.boss.dead ? this.boss : { x: m.bossPt.x, y: m.bossPt.y + 6, r: 2 } }; },
    hud() { const nx = WB.bossFor(this.boss && !this.boss.dead ? this.boss.wbSlot : WB.timeLeft() === 0 ? WB.slot() : WB.slot() + 1); const alive = this.boss && !this.boss.dead;
      return `<b>ลานบอสโลก</b> · ${alive ? `<span class="pvpz">${U.esc ? '' : ''}${(NAMES[nx] || nx)} กำลังอาละวาด!</span>` : `บอสโลกถัดไป: <b>${NAMES[nx] || nx}</b> ใน ${fmt(WB.timeLeft())}`}<br><small>เกิดทุก ${WB.interval() / 60000} นาที · หมุนเวียน ${D.WORLD_BOSSES.length} ตัว · รางวัลระดับ 7–10</small>`; }
  });
  S.goWorldBoss = () => S.enter(S.WorldBossMode());

  // global spawn announcement anywhere
  setInterval(() => { try { if (!S.save || !W.mode) return; const st = WB.state(); const slot = WB.slot(); if (W.mode.kind !== 'wbarena' && !st.done[slot] && !st.ann[slot] && WB.timeLeft() === 0) { st.ann[slot] = true; const n = NAMES[WB.bossFor(slot)]; G.UI.announce('WORLD BOSS', `${n} ปรากฏตัวที่ลานบอสโลก!`); G.UI.toast(`บอสโลก ${n} ปรากฏแล้ว — เปิดแผนที่ (M) เพื่อวาร์ปไปลานบอสโลก`, 'good'); } } catch (e) { } }, 4000);

  // ---------- UI: map panel entry, GM controls, actions ----------
  const UI = G.UI;
  const mp0 = UI.PANELS.map.render; UI.PANELS.map.render = function (tab, P) { const tl = WB.timeLeft(); const nx = WB.bossFor(tl === 0 ? WB.slot() : WB.slot() + 1); return `<h4>ลานบอสโลก</h4><div class="list"><button class="btn primary" data-act="wb-go">วาร์ปไปลานบอสโลก</button></div><p class="muted">${tl === 0 ? `<b class="bad">บอสโลก ${NAMES[nx]} อยู่ในลานตอนนี้!</b>` : `บอสโลกถัดไป: <b>${NAMES[nx]}</b> ใน ${fmt(tl)}`} · เกิดทุก ${WB.interval() / 60000} นาที (หมุนเวียน ${D.WORLD_BOSSES.length} ตัว)</p>` + mp0.call(this, tab, P); };
  const gr0 = UI.gmRender; UI.gmRender = (tab, P) => { let h = gr0(tab, P); if (tab === 'world') h += `<h4>บอสโลก (${D.WORLD_BOSSES.length} ตัว)</h4><label class="fl">เลือกบอส<select id="wbsel">${D.WORLD_BOSSES.map(b => `<option value="${b}">${NAMES[b] || b}</option>`).join('')}</select></label><div class="list"><button class="btn primary" data-act="gm" data-c="wbnow">เรียกบอสที่เลือกที่ลานบอสโลกทันที</button>${[5, 10, 15, 30, 60].map(n => `<button class="chip ${((S.save.settings.wbMin) || 15) === n ? 'on' : ''}" data-act="gm" data-c="wbint" data-v="${n}">ทุก ${n} นาที</button>`).join('')}</div>`; return h; };
  const gc0 = UI.gmCmd; UI.gmCmd = (c, el) => { const st = WB.state(); if (c === 'wbnow') { const id = (document.querySelector('#wbsel') || {}).value || D.WORLD_BOSSES[0]; const slot = WB.slot(); st.done[slot] = false; delete st.done[slot]; st.force = { slot, id }; S.save.wbForceT = Date.now(); UI.closePanel(); if (W.mode && W.mode.kind === 'wbarena') { if (W.mode.boss && !W.mode.boss.dead) { W.mode.boss.hp = 0; W.mode.boss.dead = true; } W.mode.spawnBoss(id); } else { S.goWorldBoss(); } return; } if (c === 'wbint') { S.save.settings.wbMin = +el.dataset.v; S.persist(); UI.renderPanel(); return; } return gc0(c, el); };
  // a forced spawn always counts as "inside the window"
  const tl0 = WB.timeLeft; WB.timeLeft = () => { const st = WB.state(); if (st.force && st.force.slot === WB.slot() && !st.done[WB.slot()]) return 0; return tl0(); };
  const act0 = UI.act; UI.act = (el, e) => { if (el.dataset.act === 'wb-go') { UI.closePanel(); S.goWorldBoss(); return; } return act0(el, e); };
  // credits
  if (UI.PANELS.settings) { const r0 = UI.PANELS.settings.render; UI.PANELS.settings.render = function (tab, P) { return r0.call(this, tab, P) + '<p class="muted">Boss animations: Duelyst unit animations (Counterplay Games)</p>'; }; }
})(window.G);
