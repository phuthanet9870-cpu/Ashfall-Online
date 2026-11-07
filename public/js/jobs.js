'use strict';
/* Job equipment (Ragnarok-style):
   · Weapons are job-restricted by weapon type; some types are shared by related jobs (daggers, staves, maces, swords,
     spears, bows …). Armor, accessories and relics are shared by every job (class-set pieces stay class-only).
   · Monsters, bosses, dungeons and world bosses drop weapons of ANY job, not just yours.
   · Every equipment tooltip shows which jobs can equip it (red when your current job can't).
   · 100 junk items (no use, sell for gold) dropped by monsters.
   · Item shop: "อาวุธเริ่มต้น" tab with a beginner and a soldier weapon for every weapon type. */
(function (G) {
  const U = G.U, D = G.D, S = G.S, UI = G.UI, W = G.W, E = G.E; const esc = UI.esc;
  // ---------- weapon type → jobs ----------
  const EXTRA = {
    sword: ['guardian', 'paladin', 'darkknight', 'seraph'], greatsword: ['blademaster', 'berserker'], daggers: ['blademaster', 'berserker', 'spellblade', 'pyromancer', 'cryomancer', 'stormcaller', 'ranger', 'marksman', 'engineer', 'jester', 'loki', 'shadowdancer'],
    blades: ['assassin'], staff: ['cryomancer', 'necromancer', 'warlock', 'chronomancer', 'deity', 'loki', 'cleric'], mace: ['paladin', 'cleric', 'monk'], hammer: ['guardian', 'engineer', 'cleric'],
    axe: ['engineer', 'guardian', 'demon'], spear: ['guardian', 'paladin', 'seraph', 'darkknight'], halospear: ['paladin'], bow: ['starhunter', 'jester'], starbow: ['ranger'],
    book: ['warlock', 'deity', 'chronomancer'], tome: ['necromancer', 'cleric'], scythe: [], orb: ['pyromancer', 'stormcaller', 'lightbringer'], prism: ['cleric', 'deity'], scepter: ['lightbringer', 'cleric'],
    fists: ['berserker'], demonclaw: ['berserker'], wrench: [], rifle: ['engineer'], hourglass: [], lurerod: [], jesterstick: ['loki'], trickstaff: ['jester']
  };
  D.WPN_JOBS = {}; for (const c of D.CLASSES) { (D.WPN_JOBS[c.weapon] = D.WPN_JOBS[c.weapon] || new Set()).add(c.id); }
  for (const [w, L] of Object.entries(EXTRA)) { D.WPN_JOBS[w] = D.WPN_JOBS[w] || new Set(); for (const c of L) if (D.CLS[c]) D.WPN_JOBS[w].add(c); }
  S.jobsFor = it => { if (!it) return null; if (it.clsOnly || it.cset) return [it.clsOnly || it.cset]; if ((it.slot === 'weapon' || it.wpn) && it.kind === 'gear' && it.wpn && D.WPN_JOBS[it.wpn]) return [...D.WPN_JOBS[it.wpn]]; return null; }; // null = all jobs
  S.jobOk = (it, cls) => { const J = S.jobsFor(it); return !J || J.includes(cls || S.save.cls); };
  const eq0 = S.equip; S.equip = (it) => { if (it && !S.jobOk(it)) return `อาชีพ ${D.CLS[S.save.cls].name} ใช้${D.WEAPON_TH[it.wpn] || 'อาวุธนี้'}ไม่ได้`; return eq0(it); };
  const ae0 = S.autoEquip; S.autoEquip = function (o) { const s = S.save; const hide = s.inv.filter(it => !S.jobOk(it)); if (!hide.length) return ae0.apply(this, arguments); s.inv = s.inv.filter(it => S.jobOk(it)); try { return ae0.apply(this, arguments); } finally { s.inv.push(...hide); } };
  const cc0 = S.changeClass; S.changeClass = function (cls) { const r = cc0.apply(this, arguments); const s = S.save; const w = s.eq.weapon; if (w && !S.jobOk(w)) { delete s.eq.weapon; s.inv.push(w); UI.toast(`ถอด ${w.name} — อาชีพใหม่ใช้อาวุธนี้ไม่ได้`, 'info'); S.refreshPlayer && S.refreshPlayer(true); } return r; };
  // ---------- drops: weapons of any job ----------
  S.randCls = () => U.pick(D.CLASSES).id; let anyCls = 0;
  const gi0 = S.genItem; S.genItem = (kind, tier, ilv, o = {}) => anyCls && kind === 'gear' ? gi0(kind, tier, ilv, Object.assign({}, o, { cls: S.randCls() })) : gi0(kind, tier, ilv, o);
  const rd0 = S.rollDrop; S.rollDrop = function () { anyCls++; try { return rd0.apply(this, arguments); } finally { anyCls--; } };
  if (S.genWBItem) { const wb0 = S.genWBItem; S.genWBItem = function () { anyCls++; try { return wb0.apply(this, arguments); } finally { anyCls--; } }; }
  // world boss ranking rewards call genItem directly inside the mode's onKill
  const ent0 = S.enter; S.enter = function (mode) { if (mode && mode.onKill && !mode._jobsWrap) { const k0 = mode.onKill; mode.onKill = function () { anyCls++; try { return k0.apply(this, arguments); } finally { anyCls--; } }; mode._jobsWrap = true; } return ent0.apply(this, arguments); };
  // ---------- tooltip: which jobs can equip ----------
  const det0 = UI.itemDetail; UI.itemDetail = (it, actions) => { let h = det0(it, actions); if (!it || !S.isEquip(it) || !S.save) return h; const J = S.jobsFor(it); const me = S.save.cls; const ok = !J || J.includes(me);
    const list = J ? J.map(c => `<span class="jb ${c === me ? 'me' : ''}">${esc(D.CLS[c] ? D.CLS[c].name : c)}</span>`).join('') : '<span class="jb all">ทุกอาชีพ</span>';
    const blk = `<div class="ijobs ${ok ? '' : 'no'}"><b>${it.slot === 'weapon' && it.wpn ? esc(D.WEAPON_TH[it.wpn] || '') + ' · ' : ''}อาชีพที่สวมใส่ได้</b>${ok ? '' : `<em>✖ ${esc(D.CLS[me].name)} ใส่ไม่ได้</em>`}<div>${list}</div></div>`;
    return h.includes('<div class="iact">') ? h.replace('<div class="iact">', blk + '<div class="iact">') : h + blk; };
  // ---------- 100 junk items ----------
  const JUNK = D.JUNK || (D.JUNK = []); const have = new Set(JUNK.map(j => j[0]));
  const ADD = [
    ['claw', 'กรงเล็บหัก', 6, '#d8c8a8'], ['horn', 'เขาสัตว์บิ่น', 8, '#c8b088'], ['scale', 'เกล็ดหมอง', 5, '#6aa898'], ['wing', 'ปีกค้างคาวขาด', 4, '#5a4a5a'], ['tail', 'หางจิ้งจกแห้ง', 3, '#8a9a4a'],
    ['web', 'ใยแมงมุมพันกัน', 2, '#e8e8f0'], ['eye', 'ลูกตาแห้ง', 7, '#e8e0d0'], ['pelt', 'ขนสัตว์ร่วง', 4, '#9a7a5a'], ['husk', 'เปลือกแมลง', 3, '#7a6a3a'], ['antenna', 'หนวดแมลงหัก', 2, '#4a3a2a'],
    ['skull', 'กะโหลกเล็กร้าว', 9, '#e8e0c8'], ['rib', 'ซี่โครงผุ', 5, '#d8d0b8'], ['jaw', 'ขากรรไกรหลุด', 6, '#d0c8b0'], ['beak', 'จะงอยปากหัก', 4, '#e8b04a'], ['quill', 'ขนเม่นทื่อ', 3, '#a89a7a'],
    ['moss', 'ตะไคร่แห้ง', 1, '#5a8a3a'], ['root', 'รากไม้เน่า', 2, '#7a5a3a'], ['leaf', 'ใบไม้กรอบ', 1, '#a88a3a'], ['petal', 'กลีบดอกเหี่ยว', 2, '#d87aa8'], ['seed', 'เมล็ดลีบ', 1, '#8a7a4a'],
    ['bark', 'เปลือกไม้ลอก', 2, '#6a4a2a'], ['spore', 'สปอร์เห็ดหมดฤทธิ์', 3, '#b89ad8'], ['cap', 'หมวกเห็ดช้ำ', 2, '#c84a3a'], ['thorn', 'หนามทื่อ', 2, '#5a6a3a'], ['sap', 'ยางไม้แข็งตัว', 4, '#d8a03a'],
    ['pebble', 'ก้อนกรวดธรรมดา', 1, '#8a8a8a'], ['clay', 'ดินเหนียวแตก', 1, '#a86a4a'], ['sand', 'ทรายหยาบ', 1, '#d8c08a'], ['coal', 'ถ่านป่น', 2, '#3a3a3a'], ['glass', 'เศษแก้ว', 2, '#a8d8e8'],
    ['nail', 'ตะปูงอ', 2, '#8a8a9a'], ['chain', 'โซ่ขาด', 4, '#7a7a8a'], ['gear0', 'เฟืองบิ่น', 5, '#a8884a'], ['spring', 'สปริงล้า', 3, '#9a9aa8'], ['bolt', 'น็อตเป็นสนิม', 2, '#8a6a4a'],
    ['buckle', 'หัวเข็มขัดหัก', 3, '#c8a04a'], ['button', 'กระดุมหลุด', 1, '#a87a5a'], ['coin', 'เหรียญปลอม', 2, '#c8b04a'], ['key', 'กุญแจไม่มีประตู', 3, '#b8a060'], ['ring0', 'แหวนทองเหลืองบิด', 4, '#c8a050'],
    ['cloth', 'ผ้าพันแผลใช้แล้ว', 1, '#d8d0c0'], ['string', 'เชือกขาด', 1, '#b8a888'], ['sack', 'ถุงผ้ารู', 2, '#9a8060'], ['patch', 'ผ้าปะเก่า', 1, '#7a6a9a'], ['ribbon', 'ริบบิ้นซีด', 2, '#e88aa8'],
    ['boot', 'รองเท้าข้างเดียว', 3, '#6a4a3a'], ['glove', 'ถุงมือขาด', 2, '#7a5a4a'], ['hat', 'หมวกยับ', 2, '#5a4a6a'], ['mask', 'หน้ากากร้าว', 5, '#d8d0b0'], ['sock', 'ถุงเท้าเหม็น', 1, '#a8a890'],
    ['candle', 'เทียนกุด', 1, '#f0e8c8'], ['cup', 'ถ้วยบิ่น', 2, '#c8b8a8'], ['plate', 'จานแตก', 2, '#e0e0e8'], ['spoon', 'ช้อนงอ', 1, '#b8b8c8'], ['bottle', 'ขวดเปล่า', 1, '#8ad8a8'],
    ['jar', 'โถร้าว', 2, '#a88a6a'], ['lamp', 'ตะเกียงไม่มีน้ำมัน', 4, '#c8a04a'], ['bell', 'กระดิ่งไม่ดัง', 3, '#d8b84a'], ['comb', 'หวีซี่หัก', 1, '#b88a5a'], ['mirror', 'กระจกแตก', 3, '#c8e0f0'],
    ['page', 'หน้ากระดาษขาด', 1, '#e8dcc0'], ['scroll0', 'ม้วนกระดาษเปล่า', 2, '#e0d0a8'], ['map0', 'แผนที่เลือนลาง', 4, '#d8c090'], ['quill0', 'ปากกาขนนกทื่อ', 2, '#e8e8e0'], ['ink', 'ขวดหมึกแห้ง', 2, '#2a2a4a'],
    ['dice', 'ลูกเต๋าถ่วงน้ำหนัก', 3, '#f0f0f0'], ['card', 'ไพ่ขาดสำรับ', 2, '#e85a5a'], ['toy', 'ตุ๊กตาไม้หัก', 3, '#c88a5a'], ['marble', 'ลูกแก้วขุ่น', 2, '#8ac8e8'], ['whistle', 'นกหวีดเป่าไม่ดัง', 2, '#a8a8b8'],
    ['shell2', 'เปลือกหอยแตก', 2, '#f0d8c8'], ['coral', 'ปะการังซีด', 3, '#e8a8a0'], ['fin', 'ครีบปลาแห้ง', 2, '#6a8aa8'], ['pearl0', 'ไข่มุกปลอม', 4, '#f0f0e8'], ['kelp', 'สาหร่ายเน่า', 1, '#4a6a3a'],
    ['ember', 'ถ่านไฟมอด', 3, '#d85a2a'], ['ice0', 'น้ำแข็งละลายครึ่ง', 1, '#c8e8f8'], ['soot', 'เขม่าควัน', 1, '#4a4a4a'], ['ashbone', 'กระดูกไหม้เกรียม', 4, '#5a4a40'], ['frost', 'เกล็ดน้ำค้างแข็ง', 2, '#e0f4ff'],
    ['dust', 'ฝุ่นวิญญาณจาง', 3, '#c8b8e8'], ['tear', 'หยดน้ำตาผีแห้ง', 5, '#a8c8f0'], ['chainlink', 'ห่วงโซ่ตรวน', 3, '#6a6a7a'], ['shard2', 'เศษหินเวทหมดพลัง', 6, '#9a7ad8'], ['rune0', 'รูนสลักผิด', 5, '#7a8ad8'],
    ['crown0', 'มงกุฎกระดาษ', 2, '#e8c84a'], ['badge', 'เข็มกลัดสนิมเกาะ', 3, '#a8885a'], ['flag', 'ธงขาดวิ่น', 2, '#c84a4a'], ['arrow0', 'ลูกธนูหัก', 2, '#8a6a4a'], ['hilt', 'ด้ามดาบไร้ใบ', 6, '#7a6a5a'],
    ['shieldf', 'เศษโล่ไม้', 4, '#8a6a3a'], ['helmf', 'เศษหมวกเหล็ก', 5, '#8a8a9a'], ['plume', 'พู่หมวกร่วง', 2, '#d84a6a']
  ];
  for (const j of ADD) if (!have.has(j[0]) && JUNK.length < 100) { JUNK.push(j); have.add(j[0]); }
  // nicer junk icons: shape by name hint
  const SH = { bone: 'bone', rib: 'bone', jaw: 'bone', skull: 'skull', ashbone: 'bone', fang: 'fang', claw: 'fang', horn: 'fang', tooth: 'fang', thorn: 'fang', quill: 'fang', beak: 'fang', leaf: 'leaf', petal: 'leaf', moss: 'leaf', kelp: 'leaf', feather: 'leaf', plume: 'leaf', wing: 'leaf', fin: 'leaf', coin: 'coin', button: 'coin', badge: 'coin', ring0: 'ring', chainlink: 'ring', chain: 'ring', bottle: 'bottle', ink: 'bottle', jar: 'bottle', lamp: 'bottle', tear: 'drop', sap: 'drop', slime: 'drop', page: 'paper', scroll0: 'paper', map0: 'paper', card: 'paper', flag: 'paper', cloth: 'paper', rag: 'paper', patch: 'paper', glass: 'shard', shard: 'shard', shard2: 'shard', mirror: 'shard', ice0: 'shard', frost: 'shard', pebble: 'rock', coal: 'rock', clay: 'rock', sand: 'rock', ash: 'rock', soot: 'rock', dust: 'rock', ember: 'rock', marble: 'orb', pearl0: 'orb', eye: 'orb', dice: 'box', toy: 'box', sack: 'box', key: 'key', nail: 'stick', bolt: 'stick', arrow0: 'stick', hilt: 'stick', root: 'stick', bark: 'stick', spoon: 'stick', comb: 'stick', candle: 'stick' };
  const JI = new Map(); const ji0 = UI.junkIcon; UI.junkIcon = (k) => { if (JI.has(k)) return JI.get(k); const j = JUNK.find(x => x[0] === k); if (!j) return ji0 ? ji0(k) : ''; const shp = SH[k] || ['box', 'orb', 'leaf', 'rock', 'stick', 'coin', 'shard', 'drop'][JUNK.indexOf(j) % 8];
    const [cv, x] = G.SPR.mk(32, 32); const c = j[3], d = U.shade ? U.shade(c, -0.45) : '#333', l = U.shade ? U.shade(c, 0.35) : '#fff'; x.fillStyle = '#16121c'; x.fillRect(0, 0, 32, 32); x.lineWidth = 1.6; x.strokeStyle = d; x.fillStyle = c; x.beginPath();
    switch (shp) {
      case 'bone': x.moveTo(8, 24); x.lineTo(23, 9); x.arc(25, 8, 3, 2.4, 5.8); x.arc(24, 11, 2.6, 0.4, 3.6); x.lineTo(10, 26); x.arc(7, 25, 3, -0.8, 2.6); x.arc(7, 22, 2.6, 2.6, 5.6); break;
      case 'skull': x.arc(16, 14, 9, 0, 7); x.rect(11, 19, 10, 7); break;
      case 'fang': x.moveTo(10, 6); x.quadraticCurveTo(24, 10, 18, 27); x.quadraticCurveTo(14, 17, 10, 6); break;
      case 'leaf': x.moveTo(6, 26); x.quadraticCurveTo(6, 8, 26, 6); x.quadraticCurveTo(24, 24, 6, 26); break;
      case 'coin': x.arc(16, 16, 9, 0, 7); break;
      case 'ring': x.arc(16, 16, 9, 0, 7); x.moveTo(21, 16); x.arc(16, 16, 5, 0, 7, true); break;
      case 'bottle': x.rect(13, 5, 6, 6); x.moveTo(10, 12); x.lineTo(22, 12); x.lineTo(24, 27); x.lineTo(8, 27); x.closePath(); break;
      case 'drop': x.moveTo(16, 5); x.quadraticCurveTo(26, 18, 16, 27); x.quadraticCurveTo(6, 18, 16, 5); break;
      case 'paper': x.moveTo(8, 6); x.lineTo(22, 6); x.lineTo(25, 10); x.lineTo(24, 26); x.lineTo(9, 27); x.lineTo(7, 16); x.closePath(); break;
      case 'shard': x.moveTo(15, 4); x.lineTo(24, 14); x.lineTo(18, 28); x.lineTo(8, 18); x.closePath(); break;
      case 'rock': x.moveTo(7, 22); x.lineTo(9, 12); x.lineTo(17, 8); x.lineTo(25, 13); x.lineTo(26, 23); x.lineTo(16, 27); x.closePath(); break;
      case 'orb': x.arc(16, 17, 8, 0, 7); break;
      case 'key': x.arc(11, 11, 5, 0, 7); x.rect(14, 13, 12, 3); x.rect(22, 16, 3, 5); break;
      case 'stick': x.moveTo(7, 25); x.lineTo(24, 6); x.lineTo(26, 8); x.lineTo(9, 27); x.closePath(); break;
      default: x.rect(8, 10, 16, 15);
    }
    x.fill('evenodd'); x.stroke(); x.fillStyle = l; x.globalAlpha = 0.55; x.fillRect(12, 10, 3, 2); x.globalAlpha = 1; const u = cv.toDataURL(); JI.set(k, u); return u; };
  // ---------- starter weapons in the item shop ----------
  const WTYPES = [...new Set(D.CLASSES.map(c => c.weapon))];
  const GRADE = [['ฝึกหัด', 1, 1, 300], ['ทหาร', 2, 15, 2500], ['ชำนาญ', 3, 30, 12000]];
  const ownerOf = w => D.CLASSES.find(c => c.weapon === w).id;
  S.buyStarter = (w, g) => { const s = S.save; const [th, tier, ilv, price] = GRADE[g]; if (s.gold < price) return 'ทองไม่พอ'; s.gold -= price;
    const it = S.genItem('gear', tier, ilv, { slot: 'weapon', cls: ownerOf(w), noCat: true, noBase: true }); it.wpn = w; it.name = `${D.WEAPON_TH[w] || w}${th}`; S.addItem(it); S.persist && S.persist(); return { ok: true, msg: `ซื้อ ${it.name} แล้ว` }; };
  const n0 = UI.npcRender; UI.npcRender = (P) => { let h = n0(P); if (P.role !== 'shop') return h;
    h = h.replace(/(<div class="shopcats">[\s\S]*?)(<div class="sqty">|<\/div>)/, (m, a, b) => a + `<button class="scat ${P.scat === 'wpn' ? 'on' : ''}" data-act="x-scat" data-v="wpn">⚔ อาวุธเริ่มต้น</button>` + b);
    if (P.scat !== 'wpn') return h; const s = S.save; P.wg = P.wg || 0; const [gth, tier, , price] = GRADE[P.wg];
    const grades = `<div class="jbgr">${GRADE.map((g, i) => `<button class="chip ${P.wg === i ? 'on' : ''}" data-act="jb-grade" data-v="${i}">${g[0]} · ระดับ ${g[1]}</button>`).join('')}</div>`;
    const cards = WTYPES.map(w => { const jobs = [...D.WPN_JOBS[w]]; const mine = jobs.includes(s.cls); return `<div class="scard jbw ${mine ? 'mine' : ''}"><div class="sname">${esc(D.WEAPON_TH[w] || w)}${gth}</div><div class="simg icell t${tier}"><img src="${UI.itemIcon({ kind: 'gear', slot: 'weapon', wpn: w, tier })}" alt=""></div><div class="ssub jbj">${jobs.map(c => `<span class="${c === s.cls ? 'me' : ''}">${esc(D.CLS[c].name)}</span>`).join('')}</div><button class="sprice ${s.gold >= price ? '' : 'no'}" data-act="jb-buy" data-w="${w}"><img src="${UI.curIcon('gold')}" alt="">${U.fmt(price)}</button></div>`; }).join('');
    h = h.replace(/<div class="sqty">[\s\S]*?<\/div>/, `<div class="sqty"><b>เกรดอาวุธ</b>${grades}</div>`); return h.replace(/<div class="shopgrid">[\s\S]*?<\/div><div id="npcmsg"/, `<div class="shopgrid">${cards}</div><div id="npcmsg"`); };
  const a0 = UI.act; UI.act = (el, e) => { const a = el.dataset.act;
    if (a === 'jb-grade') { UI.panel.wg = +el.dataset.v; UI.renderPanel(); return; }
    if (a === 'jb-buy') { const r = S.buyStarter(el.dataset.w, UI.panel.wg || 0); UI.toast(typeof r === 'string' ? r : r.msg, typeof r === 'string' ? 'bad' : 'good'); UI.renderPanel(); return; }
    return a0(el, e); };
  const css = document.createElement('style'); css.textContent = `.ijobs{margin:6px 0;padding:6px 8px;border:1px solid #3e5a3a;border-radius:6px;background:rgba(40,70,40,.25);font-size:12px}.ijobs.no{border-color:#7a3030;background:rgba(90,20,20,.3)}.ijobs b{color:#9fe8a0;display:block}.ijobs.no b{color:#ff9a8a}.ijobs em{color:#ff7a6a;font-style:normal;font-weight:700;margin-left:4px}
    .ijobs div{display:flex;flex-wrap:wrap;gap:3px;margin-top:3px}.jb{padding:0 5px;border-radius:4px;background:#241d14;border:1px solid #3e321e;color:#d8c8a0;font-size:11px}.jb.me{border-color:#f2d27a;color:#ffe9a8}.jb.all{color:#9fe8a0}
    .jbgr{display:flex;flex-direction:column;gap:4px;margin:4px 0 8px}.jbw .jbj{display:flex;flex-wrap:wrap;gap:2px;justify-content:center;font-size:10px;min-height:28px}.jbw .jbj span{padding:0 3px;border-radius:3px;background:rgba(255,255,255,.06)}.jbw .jbj span.me{color:#ffe9a8;background:rgba(242,210,122,.2)}.jbw.mine{box-shadow:0 0 0 1px #f2d27a inset}`;
  document.head.appendChild(css);
})(window.G);
