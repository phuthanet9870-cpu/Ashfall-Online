'use strict';
/* Auto-farm settings (area / radius / anchor, monster grades & species to attack or skip, players, priority, potions, bag)
   + robust auto-quest that always finishes: level gate, guaranteed quest elites, dungeon retries with grinding & auto-equip */
(function (G) {
  const U = G.U, D = G.D, S = G.S, UI = G.UI, W = G.W, E = G.E, V = G.VFX, SPR = G.SPR;
  const $ = s => document.querySelector(s), esc = UI.esc;
  const GRADES = ['normal', 'elite', 'champion', 'rare', 'boss', 'world'];
  const DEF = () => ({ area: 'map', radius: 10, anchor: null, grades: { normal: true, elite: true, champion: true, rare: true, boss: true, world: false }, skip: {}, players: 'none', priority: 'near', hpPot: 40, sellFull: true, loot: true });
  S.af = () => { const st = S.save.settings; if (!st.af) st.af = DEF(); const a = st.af; for (const [k, v] of Object.entries(DEF())) if (a[k] === undefined) a[k] = v; return a; };
  const mapId = () => W.mode && W.mode.kind === 'farm' ? W.mode.def.id : null;
  const anchorOk = a => a.anchor && a.anchor.map === mapId();
  S.afSetAnchor = () => { const p = W.player, a = S.af(); if (!p || !mapId()) return false; a.anchor = { map: mapId(), x: p.x, y: p.y }; return true; };

  // ---------- control for the auto brain in farm maps ----------
  const buildCtl = (base, u) => {
    const a = S.af(), quest = D.MAIN_QUESTS[S.save.quests.main]; const qMode = S.auto.quest; const elQ = quest && quest.type === 'elite';
    const area = qMode ? 'map' : a.area; if ((area === 'area' || area === 'near') && !anchorOk(a)) S.afSetAnchor();
    const R = area === 'near' ? Math.min(a.radius, 6) : a.radius; const A = a.anchor;
    const inArea = e => area === 'map' || !A || U.d2(e.x, e.y, A.x, A.y) <= (R + 0.5) ** 2;
    const allow = e => {
      if (e.kind === 'mob') { if (qMode || e.isWB || e.wbAdd) return true; if (!a.grades[e.grade || 'normal']) return false; if (e.md && a.skip[e.md.n]) return false; return inArea(e); }
      if (e.kind === 'hero') { if (!E.isEnemy(u, e)) return false; return a.players === 'all' || (a.players === 'red' && e.red) || (u.target === e && u.combatT < 2); }
      return true;
    };
    const prefer = e => { if (e.kind !== 'mob') return false; if (elQ && qMode) return e.grade !== 'normal'; if (a.priority === 'elite') return e.grade !== 'normal'; if (a.priority === 'weak') return e.hp / e.maxhp < 0.6; return false; };
    const goal = area === 'map' ? base.goal : (b) => { if (!A) return base.goal ? base.goal(b) : null; if (U.d2(b.x, b.y, A.x, A.y) > R * R || !b.ai.afWp || U.d2(b.x, b.y, b.ai.afWp.x, b.ai.afWp.y) < 1 || Math.random() < 0.004) { const ang = U.rf(0, 6.28), rr = U.rf(0, R * 0.8); b.ai.afWp = S.freePt(W.map, A.x + Math.cos(ang) * rr, A.y + Math.sin(ang) * rr); } return b.ai.afWp; };
    return Object.assign({}, base, { vision: area === 'map' ? (base.vision || 14) : R + 2, allow, prefer, goal });
  };
  const ab0 = S.autoBrain;
  S.autoBrain = (u, dt) => {
    const m = W.mode;
    if (m && m.kind === 'farm' && !m._afWrapped) { const b0 = m.autoCtl.bind(m); m.autoCtl = (x) => buildCtl(b0(x), x); m._afWrapped = true; }
    if (m && m.kind === 'farm') { const a = S.af(); S.save.settings.autoLoot = a.loot;
      if (a.sellFull && S.save.inv.length >= S.invMax - 2) { let g = 0, n = 0; for (const it of S.save.inv.slice()) if (!it.lock && it.tier <= 3 && S.isEquip(it) && !it.cset) { g += S.sell(it); n++; } if (n) UI.toast(`ออโต้: กระเป๋าใกล้เต็ม ขายของระดับ 1–3 ${n} ชิ้น (+${U.fmt(g)} ทอง)`, 'info'); }
      if ((a.area !== 'map') && !S.auto.quest && anchorOk(a)) { m._ringT = (m._ringT || 0) - dt; if (m._ringT <= 0) { m._ringT = 1.4; V.ring(a.anchor.x, a.anchor.y, a.area === 'near' ? Math.min(a.radius, 6) : a.radius, ['#ffffff', '#9ad8ff', '#4a8aff'], 1.4, { w: 1, grow: false }); } } }
    return ab0(u, dt);
  };

  // ---------- settings panel ----------
  const monIcon = (() => { const C = new Map(); return md => { const k = md.body + md.c + md.c2; if (C.has(k)) return C.get(k); const [cv, x] = SPR.mk(28, 28); try { const s = SPR.monSheet(md.body, md.c, md.c2); const fw = s.fw || 24, fh = s.fh || 32; const sc = Math.min(26 / fw, 26 / fh); x.drawImage(s.sheet, 0, 0, fw, fh, (28 - fw * sc) / 2, (28 - fh * sc) / 2, fw * sc, fh * sc); } catch (e) { } const u = cv.toDataURL(); C.set(k, u); return u; }; })();
  const GTH = { normal: 'ปกติ', elite: 'Elite', champion: 'Champion', rare: 'Rare', boss: 'Map Boss', world: 'World Boss' };
  UI.PANELS.autoset = { title: 'ตั้งค่าออโต้', render() {
    const a = S.af(), s = S.save; const def = W.mode && W.mode.kind === 'farm' ? W.mode.def : null;
    const mons = def ? [...def.mobs.map(m => [m, 'normal']), [def.champ, 'champion'], [def.rare, 'rare'], [def.boss, 'boss'], [def.world, 'world']].filter(x => x[0]) : [];
    const chip = (k, v, cur, txt, act = 'af-set') => `<button class="chip ${cur === v ? 'on' : ''}" data-act="${act}" data-k="${k}" data-v="${v}">${txt}</button>`;
    return `<div class="afpage"><div class="afcol">
      <h4>สถานะ</h4><div class="gmrow"><button class="btn ${S.auto.on ? 'primary' : ''}" data-act="af-toggle">${S.auto.on ? '■ หยุดออโต้' : '▶ เริ่มออโต้'}</button><button class="btn ${S.auto.quest ? 'primary' : ''}" data-act="autoq">${S.auto.quest ? 'ออโต้ภารกิจ: เปิด' : 'ออโต้ภารกิจ: ปิด'}</button></div>
      <p class="muted">${S.auto.quest ? 'ขณะเปิดออโต้ภารกิจ ระบบจะเดินทาง เลือกแผนที่ และตีมอนตามภารกิจเอง (การจำกัดพื้นที่/ชนิดมอนจะถูกข้าม)' : 'ภารกิจหลัก: ' + esc(S.questText())}</p>
      <h4>พื้นที่ออโต้</h4><div class="gmrow">${chip('area', 'map', a.area, 'ทั้งแผนที่')}${chip('area', 'area', a.area, 'ในรัศมีรอบจุดศูนย์กลาง')}${chip('area', 'near', a.area, 'ใกล้ตัว (ไม่เดินไกล)')}</div>
      <label class="fl">รัศมี ${a.radius} ช่อง<input type="range" id="afrad" min="4" max="30" value="${a.radius}"></label>
      <div class="gmrow"><button class="btn" data-act="af-anchor" ${def ? '' : 'disabled'}>📍 ตั้งจุดศูนย์กลางที่ตำแหน่งปัจจุบัน</button><small class="muted">${anchorOk(a) ? `จุดศูนย์กลาง: ${a.anchor.x.toFixed(0)}, ${a.anchor.y.toFixed(0)}` : 'ยังไม่ตั้ง (จะใช้ตำแหน่งตอนเริ่มออโต้)'}</small></div>
      <h4>จัดลำดับเป้าหมาย</h4><div class="gmrow">${chip('priority', 'near', a.priority, 'ตัวที่ใกล้ที่สุด')}${chip('priority', 'elite', a.priority, 'Elite/บอสก่อน')}${chip('priority', 'weak', a.priority, 'ตัวที่ HP น้อยก่อน')}</div>
      <h4>ผู้เล่นอื่น</h4><div class="gmrow">${chip('players', 'none', a.players, 'ไม่ตีผู้เล่น (ตอบโต้เมื่อถูกตี)')}${chip('players', 'red', a.players, 'ตีเฉพาะชื่อแดง')}${chip('players', 'all', a.players, 'ตีทุกคน (เปิด PK)')}</div>
      <h4>ยาและกระเป๋า</h4><label class="fl">ใช้ยา HP เมื่อ HP ต่ำกว่า ${a.hpPot}%<input type="range" id="afhp" min="10" max="90" step="5" value="${a.hpPot}"></label>
      <label class="chk"><input type="checkbox" data-act="af-flag" data-k="loot" ${a.loot ? 'checked' : ''}> เก็บของอัตโนมัติ</label><label class="chk"><input type="checkbox" data-act="af-flag" data-k="sellFull" ${a.sellFull ? 'checked' : ''}> กระเป๋าใกล้เต็ม: ขายของระดับ 1–3 อัตโนมัติ</label><label class="chk"><input type="checkbox" data-act="x-autot" ${s.settings.autoEquip ? 'checked' : ''}> สวมของที่ดีกว่าอัตโนมัติ</label>
      </div><div class="afcol">
      <h4>เกรดมอนสเตอร์ที่จะตี</h4><div class="gmrow">${GRADES.map(g => `<label class="chk"><input type="checkbox" data-act="af-grade" data-k="${g}" ${a.grades[g] ? 'checked' : ''}> ${GTH[g]}</label>`).join('')}</div>
      <h4>มอนสเตอร์ในแผนที่นี้ ${def ? '— ' + esc(def.th) : ''}</h4>${def ? `<p class="muted">คลิกเพื่อสลับ ตี / ไม่ตี</p><div class="afmons">${mons.map(([md, g]) => { const off = !!a.skip[md.n] || !a.grades[g]; return `<button class="afmon ${off ? 'off' : ''}" data-act="af-mon" data-k="${esc(md.n)}" title="${esc(md.n)}"><img src="${monIcon(md)}" alt=""><b>${esc(md.n)}</b><small>${GTH[g]}${!a.grades[g] ? ' (ปิดทั้งเกรด)' : ''}</small><i>${off ? 'ไม่ตี' : 'ตี'}</i></button>`; }).join('')}</div><div class="gmrow"><button class="mini-btn" data-act="af-all" data-v="1">ตีทั้งหมด</button><button class="mini-btn" data-act="af-all" data-v="0">ไม่ตีทั้งหมด</button></div>` : '<p class="muted">เข้าแผนที่ฟาร์มเพื่อเลือกชนิดมอนสเตอร์ · ในดันเจี้ยนออโต้จะเคลียร์ทุกตัวและลงชั้นถัดไปเอง</p>'}
      </div></div>`;
  }, after() { const r = $('#afrad'); if (r) r.onchange = () => { S.af().radius = +r.value; S.persist(); UI.renderPanel(); }; const h = $('#afhp'); if (h) h.onchange = () => { S.af().hpPot = +h.value; S.persist(); UI.renderPanel(); }; } };
  const act0 = UI.act;
  UI.act = (el, e) => {
    const a0 = el.dataset.act; if (!a0 || !a0.startsWith('af-')) return act0(el, e); const a = S.af(); const k = el.dataset.k;
    switch (a0) {
      case 'af-set': a[k] = el.dataset.v; if (k === 'players' && a.players === 'all') { S.save.pk = true; UI.toast('เปิดโหมด PK แล้ว (ชื่ออาจกลายเป็นสีแดง)', 'bad'); } if (k === 'area' && a.area !== 'map') S.afSetAnchor(); break;
      case 'af-grade': a.grades[k] = !a.grades[k]; break;
      case 'af-mon': a.skip[k] = !a.skip[k]; break;
      case 'af-all': { const def = W.mode && W.mode.def; if (def) for (const md of [...def.mobs, def.champ, def.rare, def.boss, def.world].filter(Boolean)) a.skip[md.n] = el.dataset.v === '0'; break; }
      case 'af-flag': a[k] = !a[k]; break;
      case 'af-anchor': if (S.afSetAnchor()) UI.toast('ตั้งจุดศูนย์กลางออโต้แล้ว', 'good'); break;
      case 'af-toggle': S.auto.on = !S.auto.on; if (S.auto.on && a.area !== 'map' && !anchorOk(a)) S.afSetAnchor(); UI.toast(S.auto.on ? 'เริ่มออโต้' : 'หยุดออโต้', 'info'); break;
    }
    S.persist(); UI.renderPanel();
  };
  // HUD gear button + hp threshold
  const bind0 = UI.bindHud; UI.bindHud = function () { const r = bind0.apply(this, arguments); const tb = $('.tr-btns'); if (tb && !tb.querySelector('[data-p=autoset]')) { const b = document.createElement('button'); b.dataset.act = 'panel'; b.dataset.p = 'autoset'; b.title = 'ตั้งค่าออโต้'; b.setAttribute('aria-label', 'ตั้งค่าออโต้'); b.textContent = '⚙'; b.className = 'afbtn'; tb.insertBefore(b, $('#btn-autoq')); } return r; };
  const pot0 = S.usePotion; S.usePotion = (k, auto) => { if (auto && k === 'hpPot' && S.save && S.save.settings.af && W.player && W.player.hp / W.player.maxhp >= S.save.settings.af.hpPot / 100) return; return pot0(k, auto); };
  const pc0 = S.playerControl; S.playerControl = (u, dt) => { const r = pc0(u, dt); const a = S.save && S.save.settings.af; if (a && S.save.settings.autoPot && !u.dead && u.hp / u.maxhp < a.hpPot / 100 && u.hp / u.maxhp >= 0.4) S.usePotion('hpPot', true); return r; };

  // ---------- AUTO QUEST v2 ----------
  const bestMapFor = lvl => { let i = 0; D.FARM_MAPS.forEach((m, k) => { if (lvl >= m.lv[0]) i = k; }); return i; };
  const st = () => { const s = S.save; s.aq = s.aq || { fail: 0, grindT: 0, lastProg: '', stuckT: 0, prevKind: null, eliteT: 0, deaths: [] }; return s.aq; };
  let modalT = 0;
  S.autoQuestStep = (dt) => {
    const s = S.save, A = st(), m = W.mode; if (!m) return;
    if (!$('#modal').hidden) { modalT += dt; if (modalT >= 3) { modalT = 0; UI.closeModal(); if (m.kind === 'dungeon' || m.kind === 'pvp') S.goTown(s.lastTown || 'aurelion'); } return; } modalT = 0;
    if (!$('#panel').hidden && UI.panel && UI.panel.id !== 'autoset') return;
    if (m.kind === 'pvp' || m.kind === 'siege' || m.kind === 'gallery') return;
    const q = D.MAIN_QUESTS[s.quests.main]; S.auto.on = true;
    // detect a failed dungeon attempt (left the dungeon without finishing the floor quest)
    if (A.prevKind === 'dungeon' && m.kind !== 'dungeon' && q && q.type === 'floor') { A.fail++; if (A.fail >= 2) { A.fail = 0; A.grindT = 150; UI.toast('ออโต้ภารกิจ: ดันเจี้ยนยากไป ฟาร์มเก็บเลเวล/ของ 2.5 นาทีก่อนลองใหม่', 'info'); } }
    A.prevKind = m.kind;
    if (!q) { if (m.kind !== 'farm') S.goFarm(bestMapFor(s.lvl)); return; }
    // stuck detector: progress unchanged for 8 minutes → grind then retry
    const pk = s.quests.main + ':' + s.quests.prog; if (pk !== A.lastProg) { A.lastProg = pk; A.stuckT = 0; } else A.stuckT += dt;
    if (A.stuckT > 480) { A.stuckT = 0; A.grindT = 120; UI.toast('ออโต้ภารกิจ: ติดอยู่นาน ฟาร์มเพิ่มพลังก่อน', 'info'); }
    // deaths in the quest map → grind a lower/same-level map first
    if (W.player && W.player.dead && !A._deadMark) { A._deadMark = true; A.deaths.push(Date.now()); A.deaths = A.deaths.filter(t => Date.now() - t < 180000); if (A.deaths.length >= 3) { A.deaths = []; A.grindT = 150; UI.toast('ออโต้ภารกิจ: ตายบ่อย ฟาร์มเลเวลก่อน', 'info'); } }
    if (W.player && !W.player.dead) A._deadMark = false;
    const need = q.lv || 1; const grindMap = bestMapFor(Math.min(s.lvl, need));
    if (A.grindT > 0 || s.lvl < need - 2) {
      if (A.grindT > 0) A.grindT -= dt;
      const gi = A.grindT > 0 ? Math.max(0, bestMapFor(s.lvl) - (A.deaths.length ? 1 : 0)) : grindMap;
      if (m.kind === 'dungeon' && !m.ended) return;
      if (m.kind !== 'farm' || m.idx !== gi) { UI.toast(`ออโต้ภารกิจ: ${s.lvl < need - 2 ? `เลเวลยังไม่ถึง ${need} ` : ''}ไปฟาร์มที่ ${D.FARM_MAPS[gi].th}`, 'info'); S.goFarm(gi); }
      if (S.autoEquip && Math.random() < 0.05) S.autoEquip();
      return;
    }
    if (q.map) {
      const mi = D.FARM_MAPS.findIndex(f => f.id === q.map);
      if (m.kind === 'dungeon' && !m.ended) return;
      if (m.kind !== 'farm' || m.def.id !== q.map) { UI.toast('ออโต้ภารกิจ: เดินทางไป ' + D.FARM_MAPS[mi].th, 'info'); S.goFarm(mi); return; }
      if (q.type === 'elite') { const alive = W.units.some(u => u.kind === 'mob' && !u.dead && u.grade !== 'normal'); A.eliteT = alive ? 0 : A.eliteT + dt;
        if (A.eliteT > 35) { A.eliteT = 0; const p = W.player, md = U.pick(m.def.mobs); const pt = S.freePt(W.map, p.x + U.rf(-6, 6), p.y + U.rf(-6, 6)); E.spawn(S.mkMob(md, m.lvlFor('elite'), 'elite', pt.x, pt.y, {})); UI.toast(`Elite ${md.n} ปรากฏตัว (เป้าหมายภารกิจ)`, 'info'); } }
      return;
    }
    if (q.type === 'floor') {
      if (m.kind === 'dungeon') return;
      const best = Object.entries(s.dungeons).sort((a, b) => (b[1].cp || 0) - (a[1].cp || 0))[0]; const id = best ? best[0] : 'armory'; const cp = best ? best[1].cp || 0 : 0;
      if (S.autoEquip) S.autoEquip(); UI.toast(`ออโต้ภารกิจ: ลงดันเจี้ยนชั้น ${cp ? cp + 1 : 1} (เป้าหมายชั้น ${q.n})`, 'info'); S.goDungeon(id, cp ? cp + 1 : 1, 0); A.prevKind = 'dungeon';
    }
  };
})(window.G);
