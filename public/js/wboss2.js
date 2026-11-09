'use strict';
(function (init) {
  (globalThis.ASHFALL_SIM_FACTORIES ||= {})['wboss2'] = init;
  if (typeof window !== 'undefined') init(window.G);
})(function (G) {
  const document = G.headless ? G.platform.document : globalThis.document;
  const window = G.headless ? G.platform.window : globalThis.window;
  const Image = G.headless ? G.platform.Image : globalThis.Image;
  const localStorage = G.headless ? G.platform.localStorage : globalThis.ASHFALL_STORAGE;
  const setTimeout = G.headless ? G.platform.setTimeout : globalThis.setTimeout;
  const setInterval = G.headless ? G.platform.setInterval : globalThis.setInterval;
  const addEventListener = G.headless ? (() => {}) : globalThis.addEventListener;
'use strict';
/* World Boss v2: free-for-all arena (everyone hostile except your party), per-player damage ranking with top-10 tiered rewards,
   optional bots, 28 hand-designed world bosses (stats, passives, ability kits, 3 phases, ultimate, enrage),
   84 boss-exclusive items, and the Monster Book (สมุดมอนสเตอร์). */
(function (G) {
  const U = G.U, D = G.D, E = G.E, W = G.W, S = G.S, V = G.VFX, UI = G.UI;
  const BM = G.BOSS_MAN || {}; const WB = G.WB; const esc = UI.esc; const $ = s => document.querySelector(s);
  const NAME = id => (D.BOSS_NAMES && D.BOSS_NAMES[id]) || id;

  // ---------------- world boss stats: Lv300, ≥1B HP scaled by the boss's kit ----------------
  S.wbStats = (id, n = 1) => { const k = (D.WB_KIT && D.WB_KIT[id]) || { hp: 1, atk: 1, pass: [] }; const tough = Math.max(1, 1.5 + (k.hp - 0.95) * 4);
    const hp = Math.round(1e9 * tough * (1 + Math.min(0.5, Math.max(0, n - 1) * 0.025)) / 1e6) * 1e6;
    const atk = Math.round(52000 * k.atk * (k.pass && k.pass.includes('rage') ? 0.9 : 1));
    const def = Math.round(9000 * (k.pass && k.pass.includes('armor') ? 1.35 : 1)); return { lvl: 300, hp, atk, def }; };
  // ---------------- ability library ----------------
  const ABIL = {
    nova: ['ระเบิดรอบตัว', 'วงระเบิดใหญ่รอบตัวบอส วิ่งออกจากวงแดงให้ทัน'],
    meteor: ['ฝนอุกกาบาต', 'อุกกาบาตตกใส่ผู้เล่นหลายคนพร้อมกัน'],
    volley: ['กระสุนรอบทิศ', 'ยิงกระสุนรอบตัว 360° หลายระลอก'],
    spiral: ['เกลียวกระสุน', 'กระสุนหมุนเป็นเกลียว ต้องเดินหลบตามช่องว่าง'],
    charge: ['พุ่งชน', 'พุ่งทะลวงเป็นเส้นตรงต่อกันหลายครั้งพร้อมกระเด็น'],
    cone: ['ลมหายใจมรณะ', 'พ่นพลังเป็นแนวยาวด้านหน้า'],
    summon: ['เรียกสมุน', 'เรียกสมุนระดับ Elite ออกมาช่วย'],
    pull: ['หลุมดำ', 'ดูดทุกคนเข้าหาตัวแล้วระเบิดทันที'],
    fortify: ['เกราะเหล็ก', 'ลดความเสียหายที่ได้รับ 60% เป็นเวลา 6 วิ และสร้างโล่'],
    drain: ['ดูดชีวิต', 'ดูดพลังชีวิตทุกคนในระยะ แล้วฟื้นฟูตัวเอง'],
    blink: ['วาร์ปจู่โจม', 'วาร์ปไปหาผู้เล่นแบบสุ่มแล้วกระแทกพื้น'],
    mark: ['ตราระเบิด', 'ประทับตราผู้เล่น 3 คน ระเบิดหลัง 2.5 วิ แยกตัวออกจากเพื่อน'],
    execute: ['ประหาร', 'เล็งคนที่เลือดน้อยที่สุด โจมตีรุนแรงมาก'],
    frost: ['ยุคน้ำแข็ง', 'คลื่นน้ำแข็งแช่แข็ง 1.5 วิ'],
    stun: ['คลื่นกระแทก', 'คลื่นสตันรอบตัว 1.2 วิ'],
    berserk: ['คลั่งเลือด', 'โจมตีและเคลื่อนที่เร็วขึ้นมาก 7 วิ'],
    rain: ['พายุพิบัติ', 'พื้นที่อันตรายสุ่มทั่วลาน'],
    clone: ['ร่างแยก', 'สร้างร่างแยก 2 ร่างที่ยิงกระสุนได้'],
    cross: ['ลำแสงกากบาท', 'ลำแสง 4–8 ทิศจากตัวบอส'],
    quake: ['แผ่นดินไหว', 'คลื่นกระแทกขยายออกเป็นวง 3 ชั้น'],
    silence: ['ผนึกเวท', 'ใบ้สกิล 3 วิ ในระยะกว้าง'],
    slowfield: ['บิดกาลเวลา', 'สนามเวลาทำให้ช้าลงมากและทำดาเมจต่อเนื่อง']
  };
  const ULT = {
    safezone: ['พิพากษาสุดท้าย', 'ทั้งลานคือความตาย ยกเว้นวงปลอดภัยวงเดียว'],
    apocalypse: ['วันสิ้นโลก', 'อุกกาบาต 3 ระลอกถล่มทั่วลาน'],
    bullethell: ['ห่ากระสุน', 'เกลียวกระสุน 6 ระลอกต่อเนื่อง'],
    deathmark: ['ตราประหารหมู่', 'ประทับตราทุกคน ต้องหนีให้ห่างกัน'],
    overload: ['โอเวอร์โหลด', 'ลำแสง 8 ทิศ + แผ่นดินไหวซ้อนกัน'],
    swarm: ['กองทัพมืด', 'เรียกสมุน 8 ตัวพร้อมโล่ 15%']
  };
  const PASS = {
    thorns: 'สะท้อนดาเมจ 12% กลับใส่ผู้โจมตี', regen: 'ฟื้นฟู HP 0.25%/วิ', aura: 'ออร่าเผาไหม้รอบตัว 3 ช่อง',
    armor: 'ลดดาเมจที่ได้รับ 25%', swift: 'เคลื่อนที่เร็ว +50%', rage: 'ยิ่งเลือดน้อยยิ่งแรง (ATK สูงสุด ×2)'
  };
  // ---------------- the 28 world bosses ----------------
  // hp/atk: relative multipliers · kit: rotation · ult: phase-3 ultimate · pass: passives · sig: item signature stats
  const P = (role, elem, hp, atk, kit, ult, pass, sig, slot, acc, lore) => ({ role, elem, hp, atk, kit, ult, pass, sig, slot, acc, lore });
  D.WB_KIT = {
    antiswarm: P('ราชินีฝูงแมลง', 'poison', 1.1, 1.0, ['summon', 'rain', 'volley', 'spiral'], 'swarm', ['regen'], ['ls', 'hpP'], 'chest', 'talisman', 'ฝูงแมลงไร้ที่สิ้นสุด ฆ่าสมุนไม่ทันจะถูกรุมจนตาย'),
    chaosknight: P('อัศวินโกลาหล', 'dark', 1.2, 1.35, ['charge', 'cross', 'execute', 'nova'], 'overload', ['thorns'], ['critDmg', 'atkP'], 'head', 'ring1', 'ดาบทุกครั้งฉีกห้วงมิติ ใครโจมตีแรงจะเจ็บเอง'),
    christmas: P('ครัมปัสเพลิงหิมะ', 'ice', 1.25, 1.15, ['frost', 'meteor', 'summon', 'cone'], 'apocalypse', ['aura'], ['ccRes', 'hpP'], 'chest', 'cloak', 'น้ำแข็งกับไฟในร่างเดียว ยืนใกล้ ๆ ก็ไหม้แล้ว'),
    city: P('วิญญาณนคร', 'arcane', 1.5, 0.95, ['cross', 'rain', 'fortify', 'quake'], 'overload', ['armor'], ['defP', 'dr'], 'offhand', 'brooch', 'ทั้งนครคือเกราะของมัน แข็งที่สุดในบรรดาบอสโลก'),
    decepticle: P('จักรกลลวงตา', 'tech', 1.0, 1.1, ['cross', 'volley', 'clone', 'blink'], 'bullethell', ['swift'], ['aspd', 'crit'], 'gloves', 'earring1', 'ต้นแบบจักรกลที่หลอกตาด้วยร่างแยก'),
    decepticlechassis: P('แชสซีเหล็กกล้า', 'tech', 1.6, 0.9, ['fortify', 'quake', 'charge', 'stun'], 'overload', ['armor', 'thorns'], ['def', 'hpP'], 'chest', 'belt', 'ป้อมปราการเดินได้ ตีไม่เข้าและสะท้อนกลับ'),
    decepticlehelm: P('หมวกบัญชาการ', 'lightning', 1.05, 1.1, ['stun', 'mark', 'cross', 'silence'], 'deathmark', ['regen'], ['cdr', 'ccRes'], 'head', 'necklace', 'สมองกลของกองทัพ ล็อกเป้าหมายด้วยตราสายฟ้า'),
    decepticleprime: P('ไพรม์จักรกลสูงสุด', 'tech', 1.7, 1.4, ['cross', 'quake', 'execute', 'summon', 'spiral'], 'overload', ['armor', 'rage'], ['atkP', 'critDmg'], 'chest', 'talisman', 'ร่างรวมของจักรกลทั้งหมด บอสโลกที่โหดที่สุดในวงจร'),
    decepticlesword: P('ดาบจักรกล', 'phys', 0.95, 1.5, ['charge', 'execute', 'berserk', 'cross'], 'deathmark', ['swift'], ['critDmg', 'crit'], 'gloves', 'ring1', 'ใบมีดที่มีชีวิต ตีแรงที่สุดแต่เลือดบาง'),
    decepticlewings: P('ปีกจักรกล', 'wind', 0.95, 1.15, ['blink', 'spiral', 'rain', 'volley'], 'bullethell', ['swift'], ['spd', 'aspd'], 'boots', 'cloak', 'บินวนทั่วลานพร้อมโปรยกระสุน'),
    dissonance: P('เสียงแห่งความวิปลาส', 'arcane', 1.0, 1.2, ['silence', 'spiral', 'clone', 'pull'], 'bullethell', ['regen'], ['cdr', 'elem'], 'head', 'earring1', 'คลื่นเสียงที่ทำให้ร่ายเวทไม่ได้'),
    gol: P('โกเลมยักษ์', 'phys', 1.6, 1.1, ['quake', 'stun', 'fortify', 'charge'], 'apocalypse', ['armor'], ['def', 'hp'], 'legs', 'belt', 'ก้อนหินมีชีวิต ทุกก้าวคือแผ่นดินไหว'),
    invader: P('ผู้รุกรานจากดวงดาว', 'star', 1.1, 1.25, ['meteor', 'blink', 'rain', 'cross'], 'apocalypse', ['regen'], ['elem', 'atkP'], 'offhand', 'brooch', 'เรียกดาวตกลงมาจากท้องฟ้า'),
    kane: P('ขุนศึกโลหิต', 'blood', 1.15, 1.35, ['drain', 'execute', 'berserk', 'charge'], 'deathmark', ['rage'], ['ls', 'atkP'], 'gloves', 'bracelet', 'ยิ่งเลือดออกยิ่งคลั่ง ดูดเลือดฟื้นตัวเอง'),
    kron: P('ผู้คุมกาลเวลา', 'time', 1.2, 1.05, ['slowfield', 'clone', 'spiral', 'frost'], 'safezone', ['regen'], ['cdr', 'spd'], 'head', 'talisman', 'บิดเวลาให้ทุกคนช้าลง ขณะที่มันเร็วขึ้น'),
    malyk: P('จอมอสูรพิษ', 'fel', 1.2, 1.1, ['summon', 'rain', 'pull', 'drain'], 'swarm', ['aura'], ['hpP', 'regen'], 'legs', 'necklace', 'หนองพิษลามทั่วลาน และสมุนไม่หยุดเกิด'),
    manaman: P('มนุษย์มานา', 'arcane', 1.0, 1.25, ['silence', 'volley', 'blink', 'nova'], 'bullethell', ['swift'], ['elem', 'cdr'], 'chest', 'earring1', 'กลืนกินมานา ผู้ใช้เวทจะลำบากที่สุด'),
    orias: P('จ้าวแห่งห้วงลึก', 'dark', 1.35, 1.2, ['pull', 'nova', 'mark', 'drain'], 'safezone', ['aura'], ['atkP', 'ls'], 'chest', 'cloak', 'หลุมดำดูดทุกอย่าง แล้วระเบิดในพริบตา'),
    shinkagezendo: P('ซามูไรเงา', 'chi', 1.0, 1.45, ['blink', 'charge', 'cross', 'execute'], 'deathmark', ['swift'], ['crit', 'critDmg'], 'boots', 'ring1', 'ดาบเร็วกว่าตา วาร์ปไปฟันคนที่อ่อนแอที่สุด'),
    skurge: P('อัศวินแสงพิพากษา', 'light', 1.25, 1.2, ['cross', 'volley', 'execute', 'stun'], 'safezone', ['regen'], ['atkP', 'crit'], 'head', 'brooch', 'ลำแสงศักดิ์สิทธิ์ตัดผ่านทั้งลาน'),
    soulstealer: P('ผู้ขโมยวิญญาณ', 'shadow', 1.1, 1.2, ['drain', 'mark', 'silence', 'clone'], 'deathmark', ['regen'], ['ls', 'cdr'], 'cloak', 'necklace', 'ทุกคนที่ตายจะเติมพลังให้มัน'),
    spelleater: P('ผู้กลืนเวท', 'arcane', 1.3, 1.05, ['silence', 'fortify', 'spiral', 'pull'], 'bullethell', ['thorns'], ['ccRes', 'elem'], 'offhand', 'talisman', 'กลืนเวทมนตร์และสะท้อนดาเมจกลับ'),
    taskmaster: P('นายทาสสายฟ้า', 'lightning', 1.15, 1.15, ['stun', 'mark', 'summon', 'cross'], 'swarm', ['armor'], ['aspd', 'atk'], 'gloves', 'bracelet', 'แส้สายฟ้ากับทาสที่ไม่มีวันหมด'),
    treatdrake: P('มังกรขนมหวาน', 'fire', 1.25, 1.2, ['cone', 'meteor', 'charge', 'nova'], 'apocalypse', ['aura'], ['atkP', 'hpP'], 'chest', 'cloak', 'ลมหายใจไฟจากมังกรที่ดูน่ารักแต่โหดเหี้ยม'),
    treatoni: P('อสูรโอนิ', 'blood', 1.2, 1.3, ['berserk', 'quake', 'charge', 'stun'], 'overload', ['rage'], ['atk', 'critDmg'], 'legs', 'belt', 'กระบองยักษ์ทุบทุกอย่างเป็นผุยผง'),
    valiant: P('อัศวินผู้กล้าหาญ', 'holy', 1.45, 1.05, ['fortify', 'stun', 'execute', 'cross'], 'safezone', ['regen', 'armor'], ['def', 'regen'], 'offhand', 'necklace', 'โล่ศักดิ์สิทธิ์ที่ฟื้นตัวเองตลอดเวลา'),
    vampire: P('เจ้าแห่งแวมไพร์', 'blood', 1.2, 1.2, ['drain', 'blink', 'summon', 'mark'], 'swarm', ['regen'], ['ls', 'spd'], 'cloak', 'ring1', 'ฝูงค้างคาวกับการดูดเลือดที่ไม่มีวันหยุด'),
    wolfpunch: P('หมาป่ากำปั้นเหล็ก', 'wind', 1.05, 1.35, ['charge', 'berserk', 'quake', 'blink'], 'overload', ['swift', 'rage'], ['aspd', 'atk'], 'gloves', 'bracelet', 'หมัดเร็วดั่งพายุ ไล่ล่าไม่หยุด')
  };
  const KIT = id => D.WB_KIT[id] || P('บอสโลก', 'arcane', 1, 1, ['nova', 'meteor', 'volley', 'charge'], 'apocalypse', [], ['atk', 'hp'], 'chest', 'ring1', '');
  const ELEM = e => (D.ELEM[e] ? e : 'arcane');

  // ---------------- boss brain ----------------
  const seg2 = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1; let t = ((px - ax) * dx + (py - ay) * dy) / l2; t = U.clamp(t, 0, 1); const qx = ax + dx * t - px, qy = ay + dy * t - py; return qx * qx + qy * qy; };
  const foes = (u, r) => W.units.filter(t => !t.dead && E.isEnemy(u, t) && t.kind === 'hero' && (!r || U.d2(u.x, u.y, t.x, t.y) < r * r));
  const tele = (u, x, y, r, dly, fn, col = '#ff3a3a') => { V.telegraph(x, y, r, dly, col); W.dangers.push({ x, y, r, t: dly, team: u.team }); E.later(dly, () => { if (!u.dead) fn(); }); };
  const boom = (u, x, y, r, pow, cc) => { const s = { elem: u.elem, cc: {} }; for (const t of E.enemiesNear(u, x, y, r)) { E.hit(u, t, pow, s); if (cc) E.applyCC(u, t, cc); } const pal = D.ELEM[u.elem].pal; V.ring(x, y, r, pal, 0.45, { w: 4, fill: true }); V.burst(x, y, 6, pal, 10, 4, 0.5, 2.5); };
  const shot = (u, a, spd, pow, life = 2.2) => { const pal = D.ELEM[u.elem].pal; W.projs.push({ x: u.x, y: u.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life, owner: u, s: { elem: u.elem, cc: {} }, pow, pierce: 0, hitSet: new Set(), r: 0, pal, size: 4, z: 16, elem: u.elem }); };
  const DO = {
    nova(u, t, ph) { const r = 4.5 + ph * 0.6; tele(u, u.x, u.y, r, 1.25 - ph * 0.1, () => { boom(u, u.x, u.y, r, 2.4); V.shake(5, 0.3); }); },
    meteor(u, t, ph) { const tg = foes(u, 30).sort(() => Math.random() - 0.5).slice(0, 3 + ph); for (const f of tg) for (let k = 0; k < 2 + ph; k++) { const x = f.x + U.rf(-2, 2), y = f.y + U.rf(-2, 2); E.later(k * 0.25, () => tele(u, x, y, 1.6, 1.1, () => boom(u, x, y, 1.6, 1.9))); E.later(k * 0.25 + 0.8, () => V.fall(x, y, D.ELEM[u.elem].pal, 0.3, 7)); } },
    volley(u, t, ph) { for (let w = 0; w < 1 + ph; w++) E.later(w * 0.45, () => { if (u.dead) return; const n = 16 + ph * 4, o = w * 0.2; for (let k = 0; k < n; k++) shot(u, o + k / n * 6.283, 6, 0.95); V.ring(u.x, u.y, 1.5, D.ELEM[u.elem].pal, 0.3); }); },
    spiral(u, t, ph) { const waves = 3 + ph * 2; for (let w = 0; w < waves * 6; w++) E.later(w * 0.09, () => { if (u.dead) return; for (let arm = 0; arm < 4; arm++) shot(u, w * 0.28 + arm * 1.571, 5.5, 0.8); }); },
    charge(u, t, ph) { let d = 0; for (let k = 0; k < ph + 1; k++) { E.later(d, () => { if (u.dead) return; const tg = U.pick(foes(u, 25)) || t; if (!tg) return; const dx = tg.x - u.x, dy = tg.y - u.y, l = Math.hypot(dx, dy) || 1; const ex = u.x + dx / l * Math.min(9, l + 2), ey = u.y + dy / l * Math.min(9, l + 2); const sx = u.x, sy = u.y; for (let q = 1; q <= 4; q++) V.telegraph(sx + (ex - sx) * q / 4, sy + (ey - sy) * q / 4, 1.3, 0.7, '#ff3a3a'); W.dangers.push({ x: (sx + ex) / 2, y: (sy + ey) / 2, r: 2, t: 0.7, team: u.team });
        E.later(0.7, () => { if (u.dead) return; for (const f of W.units) if (!f.dead && E.isEnemy(u, f) && seg2(f.x, f.y, sx, sy, ex, ey) < 1.7) { E.hit(u, f, 2.3, { elem: u.elem, cc: {} }); E.applyCC(u, f, { kb: 2.5 }); } if (!E.blocked(ex, ey)) { u.x = ex; u.y = ey; } V.line(sx, sy, ex, ey, D.ELEM[u.elem].pal, 0.35, { w: 10 }); V.shake(4, 0.25); }); }); d += 1.0; } },
    cone(u, t, ph) { if (!t) return; const a0 = Math.atan2(t.y - u.y, t.x - u.x); for (let s = -1; s <= 1; s++) { const a = a0 + s * 0.35; for (let q = 1; q <= 5; q++) { const x = u.x + Math.cos(a) * q * 1.6, y = u.y + Math.sin(a) * q * 1.6; tele(u, x, y, 1.1 + q * 0.12, 1.0, () => boom(u, x, y, 1.1 + q * 0.12, 1.4 + ph * 0.2)); } } },
    summon(u, t, ph) { const def = U.pick(D.FARM_MAPS.slice(-8)); for (let k = 0; k < 2 + ph; k++) { const pt = S.freePt(W.map, u.x + U.rf(-4, 4), u.y + U.rf(-4, 4)); const m = S.mkMob(U.pick(def.mobs), u.lvl, 'elite', pt.x, pt.y, { leash: 40 }); m.aggro = 20; m.st.atk = Math.round(m.st.atk * 1.4); m.wbAdd = true; E.spawn(m); V.pillar(pt.x, pt.y, D.ELEM[u.elem].pal[1], 50, 0.6, 4); } },
    pull(u, t, ph) { V.ring(u.x, u.y, 9, D.ELEM[u.elem].pal, 0.8, { w: 3 }); for (const f of foes(u, 9)) E.applyCC(u, f, { pl: 7 }); E.later(0.35, () => tele(u, u.x, u.y, 3.6, 0.75, () => { boom(u, u.x, u.y, 3.6, 2.8); V.shake(6, 0.3); })); },
    fortify(u) { u.wbFort = W.time + 6; u.shield = Math.max(u.shield || 0, u.maxhp * (u.isWB ? 0.015 : 0.04)); u.shieldT = 6; V.ring(u.x, u.y, 2.6, ['#ffffff', '#bfe0ff', '#6aa8ff'], 1, { w: 4 }); V.text(u.x, u.y, 'FORTIFY', '#bfe0ff', { size: 10, z: 60 }); },
    drain(u, t, ph) { tele(u, u.x, u.y, 6.5, 1.3, () => { let tot = 0; for (const f of foes(u, 6.5)) { const h = f.hp; E.hit(u, f, 1.5, { elem: u.elem, cc: {} }); tot += Math.max(0, h - Math.max(0, f.hp)); V.line(f.x, f.y, u.x, u.y, D.ELEM.blood.pal, 0.4, { w: 3 }); } u.hp = Math.min(u.maxhp, u.hp + tot * 3 + u.maxhp * 0.01 * ph); V.text(u.x, u.y, 'DRAIN', '#ff4d4d', { size: 10, z: 60 }); }, '#ff2a4a'); },
    blink(u, t, ph) { for (let k = 0; k < ph; k++) E.later(k * 1.3, () => { if (u.dead) return; const f = U.pick(foes(u, 30)); if (!f) return; const x = f.x, y = f.y; tele(u, x, y, 2.6, 0.9, () => { V.burst(u.x, u.y, 8, D.ELEM[u.elem].pal, 12, 3, 0.4, 2); if (!E.blocked(x, y)) { u.x = x; u.y = y; } boom(u, x, y, 2.6, 2.5, { st: 0.6 }); V.shake(5, 0.3); }); }); },
    mark(u, t, ph) { const tg = foes(u, 30).sort(() => Math.random() - 0.5).slice(0, 2 + ph); for (const f of tg) { V.text(f.x, f.y, '☠ MARK', '#ff5a5a', { size: 9, z: 40 }); for (let q = 0; q < 5; q++) E.later(q * 0.5, () => { if (!f.dead) V.ring(f.x, f.y, 2.8, ['#ffffff', '#ff7a7a', '#ff2a2a'], 0.45, { w: 2 }); }); E.later(2.5, () => { if (u.dead || f.dead) return; boom(u, f.x, f.y, 2.8, 2.6); }); } },
    execute(u, t, ph) { const f = foes(u, 30).sort((a, b) => a.hp / a.maxhp - b.hp / b.maxhp)[0]; if (!f) return; V.text(f.x, f.y, 'EXECUTE', '#ff2a2a', { size: 11, z: 44 }); const x = f.x, y = f.y; tele(u, x, y, 1.8, 1.4, () => { boom(u, x, y, 1.8, 6 + ph); V.pillar(x, y, '#ff2a2a', 120, 0.5, 8); V.shake(7, 0.3); }); },
    frost(u, t, ph) { tele(u, u.x, u.y, 7, 1.4, () => boom(u, u.x, u.y, 7, 1.6, { fz: 1.5 }), '#6ac8ff'); },
    stun(u, t, ph) { tele(u, u.x, u.y, 6, 1.2, () => boom(u, u.x, u.y, 6, 1.7, { st: 1.2 }), '#ffe04a'); },
    berserk(u) { u.wbBers = W.time + 7; V.text(u.x, u.y, 'BERSERK', '#ff5a3a', { size: 11, z: 60 }); V.pillar(u.x, u.y, '#ff3a1a', 90, 0.8, 8); },
    rain(u, t, ph) { const m = W.map; for (let k = 0; k < 10 + ph * 6; k++) { const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * 26; const x = m.bossPt.x + Math.cos(a) * r, y = m.bossPt.y + Math.sin(a) * r; E.later(Math.random() * 1.5, () => tele(u, x, y, 1.8, 1.2, () => boom(u, x, y, 1.8, 1.5))); } },
    clone(u, t, ph) { for (let k = 0; k < 2; k++) { const pt = S.freePt(W.map, u.x + U.rf(-5, 5), u.y + U.rf(-5, 5)); const c = S.mkMob(u.md, u.lvl, 'champion', pt.x, pt.y, { leash: 40 }); c.name = u.md.n + ' (ร่างแยก)'; c.wbAdd = true; c.wbClone = u; c.boss = true; c.aggro = 25; c.elem = u.elem; c.ai.bt = 2; E.spawn(c); V.burst(pt.x, pt.y, 12, D.ELEM[u.elem].pal, 20, 3, 0.6, 2); } },
    cross(u, t, ph) { const n = ph >= 2 ? 8 : 4, o = Math.random() * 0.8; for (let k = 0; k < n; k++) { const a = o + k / n * 6.283; for (let q = 1; q <= 7; q++) { const x = u.x + Math.cos(a) * q * 1.7, y = u.y + Math.sin(a) * q * 1.7; tele(u, x, y, 1.0, 1.1, () => boom(u, x, y, 1.0, 1.9)); } } },
    quake(u, t, ph) { for (let k = 0; k < 3; k++) { const r = 3 + k * 3.2; E.later(k * 0.55, () => { if (u.dead) return; V.telegraph(u.x, u.y, r, 0.7, '#ffa040'); E.later(0.7, () => { if (u.dead) return; for (const f of E.enemiesNear(u, u.x, u.y, r)) { if (Math.hypot(f.x - u.x, f.y - u.y) > r - 3.2) { E.hit(u, f, 1.8, { elem: u.elem, cc: {} }); E.applyCC(u, f, { sl: 1.5 }); } } V.ring(u.x, u.y, r, D.ELEM[u.elem].pal, 0.5, { w: 6 }); V.shake(4, 0.2); }); }); } },
    silence(u, t, ph) { tele(u, u.x, u.y, 9, 1.0, () => boom(u, u.x, u.y, 9, 0.8, { sil: 3 }), '#b06cff'); },
    slowfield(u, t, ph) { const x = (t || u).x, y = (t || u).y; V.ring(x, y, 5, D.ELEM.time.pal, 4, { w: 3, fill: true }); for (let q = 0; q < 8; q++) E.later(q * 0.5, () => { if (u.dead) return; for (const f of E.enemiesNear(u, x, y, 5)) { E.hit(u, f, 0.45, { elem: u.elem, cc: {} }); E.applyCC(u, f, { sl: 1 }); } }); u.wbBers = W.time + 4; }
  };
  const ULTDO = {
    safezone(u) { const m = W.map; const a = Math.random() * 6.283, r = U.rf(8, 18); const sx = m.bossPt.x + Math.cos(a) * r, sy = m.bossPt.y + Math.sin(a) * r;
      G.UI.announce('ULTIMATE', `${u.md.n}: ${ULT.safezone[0]} — วิ่งเข้าวงทองให้ทัน!`); for (let q = 0; q < 8; q++) E.later(q * 0.5, () => V.ring(sx, sy, 3.2, ['#ffffff', '#fff6c2', '#ffd84a'], 0.5, { w: 4 })); V.telegraph(m.bossPt.x, m.bossPt.y, 34, 4, '#ff1a1a');
      E.later(4, () => { if (u.dead) return; for (const f of W.units) if (!f.dead && E.isEnemy(u, f) && Math.hypot(f.x - sx, f.y - sy) > 3.2) E.hit(u, f, 12, { elem: u.elem, cc: {} }); V.flash('#ffffff', 0.4); V.shake(12, 0.6); }); },
    apocalypse(u) { G.UI.announce('ULTIMATE', `${u.md.n}: ${ULT.apocalypse[0]}`); for (let w = 0; w < 3; w++) E.later(w * 1.4, () => { if (!u.dead) DO.rain(u, null, 3); }); },
    bullethell(u) { G.UI.announce('ULTIMATE', `${u.md.n}: ${ULT.bullethell[0]}`); for (let w = 0; w < 6; w++) E.later(w * 0.7, () => { if (!u.dead) DO.spiral(u, null, 1); }); },
    deathmark(u) { G.UI.announce('ULTIMATE', `${u.md.n}: ${ULT.deathmark[0]} — แยกกันเดี๋ยวนี้!`); for (const f of foes(u, 40)) { V.text(f.x, f.y, '☠', '#ff2a2a', { size: 14, z: 44 }); E.later(3, () => { if (u.dead || f.dead) return; const near = W.units.filter(o => !o.dead && o !== f && o.kind === 'hero' && Math.hypot(o.x - f.x, o.y - f.y) < 3).length; boom(u, f.x, f.y, 3, 2.5 + near * 2.5); }); } },
    overload(u) { G.UI.announce('ULTIMATE', `${u.md.n}: ${ULT.overload[0]}`); DO.cross(u, null, 3); E.later(0.6, () => { if (!u.dead) DO.quake(u, null, 3); }); E.later(1.8, () => { if (!u.dead) DO.cross(u, null, 3); }); },
    swarm(u) { G.UI.announce('ULTIMATE', `${u.md.n}: ${ULT.swarm[0]}`); DO.summon(u, null, 6); u.shield = Math.max(u.shield || 0, u.maxhp * 0.05); u.shieldT = 15; }
  };
  const ba0 = E.bossAI;
  E.bossAI = (u, t, d, dt) => {
    if (u.wbClone) { const ai = u.ai; ai.bt = (ai.bt ?? 2) - dt; if (ai.bt <= 0) { ai.bt = 3.5; DO.volley(u, t, 1); } return; }
    if (!u.isWB) return ba0(u, t, d, dt);
    const k = u.wbKit, ai = u.ai; const ph = u.wbPh || 1; ai.bt = (ai.bt ?? 2.5) - dt * (u.wbBers > W.time ? 1.6 : 1); if (ai.bt > 0) return;
    ai.bt = Math.max(0.9, 2.4 - ph * 0.4 - (u.wbEnr ? 0.6 : 0));
    if (ph >= 3 && W.time - (u.wbUltT || 0) > 18) { u.wbUltT = W.time; ULTDO[k.ult](u); return; }
    ai.ki = ((ai.ki || 0) + 1) % k.kit.length; const pool = k.kit.slice(0, Math.min(k.kit.length, 2 + ph)); const ab = pool[ai.ki % pool.length];
    if (E.vis(u.x, u.y)) V.text(u.x, u.y, ABIL[ab][0], D.ELEM[u.elem].pal[1], { size: 9, z: 70 });
    DO[ab](u, t, ph);
  };

  // ---------------- damage ledger / reflect / damage reduction ----------------
  const hit0 = E.hit;
  E.hit = (src0, t, pow, s, o) => {
    if (!t || !t.isWB || t.dead) return hit0(src0, t, pow, s, o);
    const b = t.hp; const r = hit0(src0, t, pow, s, o); let d = b - Math.max(0, t.hp);
    if (d > 0) { const ow = src0.owner || src0; const who = ow.owner || ow; const k = t.wbKit;
      let back = (k.pass.includes('armor') ? 0.25 : 0) + (t.wbFort > W.time ? 0.6 : 0); if (back > 0 && !t.dead) { const h = d * Math.min(0.75, back); t.hp += h; d -= h; }
      if (who && who.kind === 'hero') { const L = t.wbDmg || (t.wbDmg = new Map()); L.set(who, (L.get(who) || 0) + d);
        if (k.pass.includes('thorns') && !who.dead && who !== t) { who.hp -= Math.min(d * 0.12, who.maxhp * 0.06); who.flash = 0.06; if (who.hp <= 0) E.kill(who, t); } } }
    return r;
  };
  // spawn protection: freshly (re)spawned fighters are not valid targets for a few seconds
  const ie0 = E.isEnemy; E.isEnemy = (a, b) => { const r = ie0(a, b); if (!r || !W.mode || W.mode.kind !== 'wbarena') return r; if ((a.wbProt || 0) > W.time || (b.wbProt || 0) > W.time) return false; return r; };

  // ---------------- boss-exclusive items (3 per world boss) ----------------
  const PIECE = { weapon: 'อาวุธ', armor: 'เกราะ', acc: 'เครื่องประดับ' };
  const NOUN = { weapon: 'Fang', chest: 'Carapace', head: 'Crown', gloves: 'Fists', legs: 'Greaves', boots: 'Striders', offhand: 'Bulwark', cloak: 'Shroud', necklace: 'Heart', talisman: 'Core', ring1: 'Seal', earring1: 'Echo', brooch: 'Sigil', belt: 'Coil', bracelet: 'Shackle' };
  D.WB_ITEMS = []; (D.WORLD_BOSSES || []).forEach((id, i) => { const k = KIT(id); for (const [p, slot] of [['weapon', 'weapon'], ['armor', k.slot], ['acc', k.acc]]) D.WB_ITEMS.push({ id: id + ':' + p, boss: id, piece: p, slot, kind: p === 'acc' ? 'acc' : 'gear', idx: i }); });
  S.genWBItem = (bossId, piece, tier = 10, ilv) => {
    const k = KIT(bossId); const def = D.WB_ITEMS.find(x => x.id === bossId + ':' + piece) || D.WB_ITEMS.find(x => x.boss === bossId); if (!def) return null;
    ilv = ilv || U.clamp(Math.round((S.save ? S.save.lvl : 100) / 2) + 10, 40, 100); const cls = S.save ? S.save.cls : 'blademaster';
    const it = S.genItem(def.kind, tier, ilv, { slot: def.slot, noBase: true, cls }); if (!it) return null;
    delete it.set; it.wb = bossId; it.wbPiece = piece; it.main.v = Math.round(it.main.v * 1.3);
    it.subs = (it.subs || []).filter(x => !k.sig.includes(x.s)).concat(k.sig.map(s => ({ s, v: Math.round(S.statVal(s, ilv, tier, 0.5) * 10) / 10 || 1, sig: true })));
    it.name = `${NAME(bossId)}'s ${def.slot === 'weapon' ? S.weaponName(cls) : NOUN[def.slot] || 'Relic'}`; if (def.slot === 'weapon') it.wpn = D.CLS[cls].weapon;
    return it;
  };
  // icons: element palette + boss crest glyph, unique per boss × slot
  const K = UI.ICONKIT, IC = UI.ICONS;
  const icon0 = UI.itemIcon;
  UI.itemIcon = (it) => {
    if (!it || !it.wb) return icon0(it); const k = KIT(it.wb); const pal = D.ELEM[ELEM(k.elem)].pal; const i = Math.max(0, (D.WORLD_BOSSES || []).indexOf(it.wb));
    const m = U.shade ? U.shade(pal[2], -0.1) : pal[2], a = pal[1]; const w = it.wpn || (S.save && D.CLS[S.save.cls] ? D.CLS[S.save.cls].weapon : 'sword');
    return K.make('WB' + it.wb + it.slot + (it.slot === 'weapon' ? w : ''), q => {
      if (it.slot === 'weapon') (IC.W[w] || IC.W.sword)(q, m, a); else (IC.ARM[it.slot] || IC.ARM.chest)(q, m, a);
      // crest: dark disc + glyph unique to the boss (dot ring pattern by index)
      q.C(25, 7, 5, '#1a0a20'); q.C(25, 7, 4, pal[3] || '#3a1050'); const n = 3 + (i % 5), rot = (i / 28) * 6.283;
      for (let j = 0; j < n; j++) { const an = rot + j / n * 6.283; q.R(Math.round(25 + Math.cos(an) * 2.6) - (i % 2 ? 0 : 0), Math.round(7 + Math.sin(an) * 2.6), 1, 1, '#ffffff'); }
      q.R(24, 6, 2, 2, a);
    }, { spark: K.sparkFor(10) });
  };
  const det0 = UI.itemDetail;
  UI.itemDetail = (it, actions) => { let h = det0(it, actions); if (it && it.wb) { const k = KIT(it.wb); h = h.replace('<div class="iact">', `<div class="iset wbset"><b>ไอเทมเฉพาะบอสโลก · ${esc(NAME(it.wb))}</b><div>${esc(k.role)} · ค่าพิเศษ: ${k.sig.map(s => esc(D.STAT_TH[s] || s)).join(', ')} · ค่าหลัก +30%</div><div class="muted">ดรอปเฉพาะผู้ทำดาเมจ 10 อันดับแรกในลานบอสโลก</div></div><div class="iact">`); } return h; };

  // ---------------- arena mode (FFA + parties + ranking) ----------------
  const fmt = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const RANK_REWARD = [ // [items, tier lo, tier hi, exclusive chance]
    [5, 10, 10, 1], [4, 9, 10, 0.6], [4, 9, 10, 0.45], [3, 9, 9, 0.3], [3, 8, 9, 0.25], [3, 8, 9, 0.15], [2, 8, 8, 0.12], [2, 7, 8, 0.1], [2, 7, 8, 0.08], [2, 7, 7, 0.06]];
  WB.RANK_REWARD = RANK_REWARD;
  WB.FOCUS = [['boss', 'บอสโลก'], ['players', 'ผู้เล่นอื่น'], ['adds', 'สมุนบอส'], ['mixed', 'ผสม (ใกล้สุด)']];
  WB.focus = () => { const a = S.af ? S.af() : S.save.settings; return a.wbFocus || 'boss'; };
  const gset = () => { const st = S.save.settings; if (st.wbBots === undefined) st.wbBots = true; if (st.wbParty === undefined) st.wbParty = 2; return st; };
  const TEAM_ANG = [Math.PI / 2, -Math.PI / 2, 0, Math.PI, Math.PI / 4, -Math.PI * 3 / 4];
  S.WorldBossMode = (opt = {}) => ({
    kind: 'wbarena', name: 'ลานบอสโลก', allowMount: true, portals: [], t: 0, boss: null, allies: [], fighters: [], bots: opt.bots ?? gset().wbBots, last: null,
    build() { return S.WorldBossMode.gen(); },
    spawnPt(team) { const m = W.map; if (team === 0) return S.freePt(m, m.spawn.x + U.rf(-2, 2), m.spawn.y - U.rf(0, 2)); const a = TEAM_ANG[(team - 20) % TEAM_ANG.length + 1] ?? 0; const R = 25; return S.freePt(m, m.bossPt.x + Math.cos(a) * R + U.rf(-1.5, 1.5), m.bossPt.y + Math.sin(a) * R + U.rf(-1.5, 1.5)); },
    mkFighter(team, partyName) { const L = S.save.lvl; const cls = U.pick(D.CLASSES).id; const lv = U.clamp(L + U.ri(-10, 10), 1, D.MAX_LV); const pt = this.spawnPt(team);
      const u = S.makeBot(cls, team, 0, U.ri(2, 3), { stats: S.worldBotStats(cls, lv, 1.05).st, lvl: lv, x: pt.x, y: pt.y, bot: false, name: U.pick(D.NAMES) + U.ri(1, 999) }); u.wbParty = partyName; u.wbProt = W.time + 3; u.wbFocus = team === 0 ? 'boss' : U.pick(['boss', 'boss', 'mixed', 'mixed', 'players']);
      u.brain = (b, dt) => E.heroAI(b, dt, this.ctlFor(b)); E.spawn(u); this.fighters.push(u); return u; },
    ctlFor(b) { const m = W.map, me = this; const F = b === W.player ? WB.focus() : (b.wbFocus || 'mixed'); const alive = () => me.boss && !me.boss.dead;
      const idle = { x: m.bossPt.x + Math.cos(b.id) * 9, y: m.bossPt.y + Math.sin(b.id) * 9, r: 1.5 };
      const near = (f, R) => { let best = null, bd = R * R; for (const e of W.units) { if (e.dead || !f(e) || !E.isEnemy(b, e)) continue; const d = U.d2(b.x, b.y, e.x, e.y); if (d < bd) { bd = d; best = e; } } return best; };
      const hero = e => e.kind === 'hero', add = e => !!e.wbAdd;
      if (F === 'boss') return { vision: 40, allow: e => e.isWB || (add(e) && U.d2(b.x, b.y, e.x, e.y) < 16) || (hero(e) && e.target === b && U.d2(b.x, b.y, e.x, e.y) < 9), goal: () => alive() ? me.boss : idle };
      if (F === 'adds') return { vision: 40, allow: e => add(e) || e.isWB, goal: () => near(add, 30) || (alive() ? me.boss : idle) };
      if (F === 'players') return { vision: 40, allow: e => hero(e) || (!near(hero, 40) && (e.isWB || add(e))), goal: () => { const h = near(hero, 40); return h || (alive() ? me.boss : idle); } };
      return { vision: 40, allow: e => e.isWB || add(e) || (hero(e) && U.d2(b.x, b.y, e.x, e.y) < (alive() ? 30 : 120)), goal: () => alive() ? me.boss : idle }; },
    init() { const m = W.map; W.player.wbProt = W.time + 3; this.portals = [{ x: m.portalPt.x, y: m.portalPt.y, step: true, use: () => S.goTown(S.save.lastTown || 'aurelion') }];
      G.UI.log(this.bots ? 'ลานบอสโลก (โหมด FFA): ทุกคนเป็นศัตรู ยกเว้นปาตี้ของคุณ · รางวัลแจกเฉพาะ 10 อันดับดาเมจสูงสุด' : 'ลานบอสโลก (ไม่มีบอท): คุณกับปาตี้ปะทะบอสโลกเพียงลำพัง', 'sys');
      if (this.bots) { const st = gset(); for (let k = 0; k < st.wbParty; k++) this.mkFighter(0, 'party');
        const sizes = [3, 3, 2, 2, 1]; sizes.forEach((n, i) => { const tag = U.pick(['Raven', 'Ember', 'Nova', 'Fang', 'Storm', 'Lotus', 'Iron', 'Ghost']) + ' ' + (i + 1); for (let q = 0; q < n; q++) this.mkFighter(20 + i, tag); }); } },
    spawnBoss(id) { const m = W.map; const st = WB.state(); const k = KIT(id); const L = 300; const md = Object.assign({}, D.BOSS_MD(id));
      const n = 1 + this.fighters.length; const hpMul = 1;
      const u = E.spawn(S.mkMob(md, L, 'world', m.bossPt.x, m.bossPt.y, { leash: 99, hpMul, elem: ELEM(k.elem) })); u.elem = ELEM(k.elem); const WS = S.wbStats(id, this.bots ? n : 1); u.maxhp = u.hp = WS.hp; for (const q of [u.st, u.st0, u.st0b]) if (q) { q.hp = WS.hp; q.atk = WS.atk; q.def = WS.def; q.crit = 30; q.critDmg = 100; q.ccRes = 60; q.dr = 10; } u.wbAtk0 = u.st.atk; u.wbEnrAt = this.bots ? 900 : 1200; u.lvl = 300;
      u.aggro = 40; u.isWB = true; u.wbId = id; u.wbKit = k; u.wbPh = 1; u.wbT0 = W.time; u.wbSlot = WB.slot(); u.wbDmg = new Map(); u.ai.bt = 3; if (k.pass.includes('swift')) u.moveSpd *= 1.5; this.boss = u; this.last = null;
      V.pillar(m.bossPt.x, m.bossPt.y, D.ELEM[u.elem].pal[1], 999, 3, 14); V.ring(m.bossPt.x, m.bossPt.y, 5, D.ELEM[u.elem].pal, 1.2, { w: 5 }); V.shake(8, 0.6);
      G.UI.announce('WORLD BOSS', `${md.n} — ${k.role} ปรากฏตัว!`); G.UI.log(`⚠ WORLD BOSS ${md.n} (${k.role}) · ธาตุ${D.ELEM[u.elem].th} · ${k.pass.map(p => PASS[p]).join(' · ')}`, 'sys'); st.ann[u.wbSlot] = true; },
    respawn(u) { const sp = this.spawnPt(u === W.player ? 0 : u.team); u.dead = false; u.hp = u.maxhp; u.x = sp.x; u.y = sp.y; u.wbProt = W.time + 3; u.target = null; },
    update(dt) { this.t += dt; S.updateLoot(dt);
      const st = WB.state(); const slot = WB.slot(); if ((!this.boss || this.boss.dead) && !st.done[slot] && WB.timeLeft() === 0) this.spawnBoss(WB.bossFor(slot));
      const b = this.boss; if (b && !b.dead) { const k = b.wbKit; const pct = b.hp / b.maxhp; const ph = pct > 0.66 ? 1 : pct > 0.33 ? 2 : 3;
        if (ph > b.wbPh) { b.wbPh = ph; b.invulnT = W.time + 2; b.shield = Math.max(b.shield || 0, b.maxhp * 0.04); b.shieldT = 12; b.ccImmune = true; b.atkRate = ph === 3 ? 0.85 : 1.1; DO.summon(b, null, ph); G.UI.announce(`PHASE ${ph}`, `${b.md.n} ${ph === 3 ? 'ปลดปล่อยพลังสูงสุด: ' + ULT[k.ult][0] : 'โกรธจัด! สกิลใหม่ปลดล็อก'}`); V.flash(D.ELEM[b.elem].pal[1], 0.3); V.shake(9, 0.5); DO.nova(b, null, ph); }
        if (k.pass.includes('regen') && W.time - (b.lastHitT || 0) > 6) b.hp = Math.min(b.maxhp, b.hp + b.maxhp * 0.002 * dt);
        if (k.pass.includes('aura')) { b.wbAuraT = (b.wbAuraT || 0) - dt; if (b.wbAuraT <= 0) { b.wbAuraT = 1; for (const f of E.enemiesNear(b, b.x, b.y, 3)) E.hit(b, f, 0.35, { elem: b.elem, cc: {} }); if (E.vis(b.x, b.y)) V.ring(b.x, b.y, 3, D.ELEM[b.elem].pal, 0.6, { w: 2 }); } }
        let am = [1, 1, 1.3, 1.7][b.wbPh] || 1; if (k.pass.includes('rage')) am *= 1 + (1 - pct) * 0.5; if (b.wbBers > W.time) am *= 1.35; const el = W.time - b.wbT0; if (el > (b.wbEnrAt || 1200) && !b.wbEnr) { b.wbEnr = true; G.UI.announce('ENRAGE', `${b.md.n} คลั่งเต็มที่! ATK ×3 (หมดเวลา ${Math.round((b.wbEnrAt || 1200) / 60)} นาที)`); } if (b.wbEnr) am *= 3; b.st.atk = Math.round(b.wbAtk0 * am);
        b.atkRate = b.wbBers > W.time ? 0.6 : b.wbPh === 3 ? 0.85 : b.wbPh === 2 ? 1.1 : 1.3; }
      for (let q = W.units.length - 1; q >= 0; q--) { const u = W.units[q]; if (u.dead && u !== W.player && u.deadT > 4 && !u.isWB) { if (this.fighters.includes(u)) this.respawn(u); else W.units.splice(q, 1); } }
      const p = W.player; if (p.dead && p.deadT > 5) { this.respawn(p); p.hp = p.maxhp * 0.7; G.UI.toast('ฟื้นคืนชีพที่จุดเกิด (อมตะ 3 วิ)', 'info'); } },
    ranking(b) { b = b || this.boss || (this.last && this.last.boss); if (!b || !b.wbDmg) return []; return [...b.wbDmg.entries()].filter(([u]) => u.kind === 'hero').sort((x, y) => y[1] - x[1]).map(([u, d], i) => ({ u, d, i, me: u === W.player, party: u === W.player || u.team === W.player.team })); },
    onKill(t, k) {
      if (t === W.player) { S.save.stats.deaths++; G.UI.toast(`คุณถูก${k && k.kind === 'hero' ? ' ' + k.name + ' ' : ''}สังหาร — จะฟื้นใน 5 วิ`, 'bad'); return; }
      if (t.kind === 'hero' && (k === W.player || (k && k.owner === W.player))) { S.save.honor += 15; G.UI.toast(`สังหาร ${t.name} (+15 Honor)`, 'good'); return; }
      if (!t.isWB) return; const s = S.save; const st = WB.state(); st.done[t.wbSlot] = true; this.boss = null;
      const R = this.ranking(t); const top = R.slice(0, 10); const me = R.find(r => r.me); const res = { boss: t, id: t.wbId, name: t.md.n, rows: top.map(r => ({ n: r.u.name, cls: r.u.cls, d: Math.round(r.d), me: r.me, party: r.party, team: r.u.team, items: RANK_REWARD[r.i][0], tier: RANK_REWARD[r.i][2] })), myRank: me ? me.i + 1 : 0, total: R.length, got: [] };
      S.gainXp(S.mobXp(t) * (me ? 2 : 0.5)); s.honor += me && me.i < 10 ? 150 - me.i * 10 : 20;
      if (me && me.i < 10) { const [n, lo, hi, ex] = RANK_REWARD[me.i]; const gold = Math.round((1600 + t.lvl * 60) * (1 - me.i * 0.07)); s.gold += gold; res.gold = gold;
        for (let q = 0; q < n; q++) { const r = Math.random(); const it = S.genItem(r < 0.55 ? 'gear' : r < 0.85 ? 'acc' : 'rune', U.ri(lo, hi), U.clamp(Math.round(t.lvl / 2) + 10, 1, 100), { cls: s.cls }); if (it) { S.addItem(it, true); res.got.push(it); } }
        if (Math.random() < ex) { const pc = U.pick(['weapon', 'armor', 'acc']); const it = S.genWBItem(t.wbId, pc, me.i < 3 ? 10 : 9); if (it) { S.addItem(it, true); res.got.unshift(it); G.UI.toast(`★ ได้รับไอเทมบอสโลก ${it.name}!`, 'item', it.tier); } }
        G.UI.announce('WORLD BOSS DOWN', `${t.md.n} ถูกปราบ! คุณอันดับ ${me.i + 1}/${R.length} · ได้รับ ${res.got.length} ชิ้น`);
      } else G.UI.announce('WORLD BOSS DOWN', `${t.md.n} ถูกปราบ — คุณไม่ติด 10 อันดับดาเมจ (อันดับ ${me ? me.i + 1 : '-'}) ไม่ได้รับไอเทม`);
      S.codexKill(t.md.n); s.wbKills = s.wbKills || {}; s.wbKills[t.wbId] = (s.wbKills[t.wbId] || 0) + 1; this.last = res; S.wbLast = res; S.quest('boss'); S.persist();
      for (const u of W.units) if (u.wbAdd && !u.dead) { u.hp = 0; E.kill(u, null); }
      setTimeout(() => { try { if (W.mode === this) UI.openPanel('wbres'); } catch (e) { } }, 1600);
    },
    autoCtl() { return this.ctlFor(W.player); },
    hud() { const b = this.boss && !this.boss.dead ? this.boss : null; const nx = WB.bossFor(b ? b.wbSlot : WB.timeLeft() === 0 ? WB.slot() : WB.slot() + 1); const k = KIT(b ? b.wbId : nx);
      let h = `<b>ลานบอสโลก</b> · <small>${this.bots ? 'FFA มีบอท' : 'ไม่มีบอท'}</small> · ${b ? `<span class="pvpz">${esc(b.md.n)} เฟส ${b.wbPh}/3${b.wbEnr ? ' · ENRAGE' : ` · คลั่งใน ${fmt((300 - (W.time - b.wbT0)) * 1000)}`}</span>` : `บอสถัดไป: <b>${esc(NAME(nx))}</b> (${esc(k.role)}) ใน ${fmt(WB.timeLeft())}`}`;
      const R = this.ranking(b); if (R.length) { const me = R.find(r => r.me); const tot = R.reduce((a, r) => a + r.d, 0) || 1;
        h += `<div class="wbrank">${R.slice(0, 10).map(r => `<div class="${r.me ? 'me' : r.party ? 'pt' : ''}"><i>${r.i + 1}</i><span>${esc(r.u.name.slice(0, 12))}</span><b>${Math.round(r.d / tot * 100)}%</b></div>`).join('')}${me && me.i >= 10 ? `<div class="me out"><i>${me.i + 1}</i><span>${esc(me.u.name.slice(0, 12))}</span><b>${Math.round(me.d / tot * 100)}%</b></div>` : ''}</div>`; }
      const f = WB.focus(); h += `<div class="wbfocus"><small>ออโต้เน้น:</small>${WB.FOCUS.map(([k, n]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="wb-focus" data-v="${k}">${n}</button>`).join('')}</div>`;
      return h + `<small>ทุกคนเป็นศัตรู ยกเว้นปาตี้ · รางวัลเฉพาะ Top 10 ดาเมจ</small>`; }
  });
  // keep the arena generator from bosses.js
  S.WorldBossMode.gen = G.WB.genArena || (() => { throw new Error('arena gen missing'); });
  S.goWorldBoss = (bots) => { const st = gset(); if (bots !== undefined) { st.wbBots = !!bots; S.persist(); } S.enter(S.WorldBossMode({ bots: st.wbBots })); };

  // results panel
  UI.PANELS.wbres = { title: 'ผลการปราบบอสโลก', render() { const r = S.wbLast; if (!r) return '<p class="muted">ยังไม่มีผล</p>';
    return `<h4>${esc(r.name)} · อันดับของคุณ ${r.myRank || '-'} / ${r.total}</h4><table class="tbl"><tr><th>#</th><th>ผู้เล่น</th><th>ปาตี้</th><th>ดาเมจ</th><th>รางวัล</th></tr>${r.rows.map((x, i) => `<tr class="${x.me ? 'me' : ''}"><td>${i + 1}</td><td>${esc(x.n)}</td><td>${x.party ? 'ปาตี้คุณ' : 'ศัตรู'}</td><td>${U.fmt(x.d)}</td><td>${x.items} ชิ้น · ระดับ ≤${x.tier}${i === 0 ? ' + ไอเทมบอส' : ''}</td></tr>`).join('')}</table>
      ${r.got.length ? `<h4>คุณได้รับ${r.gold ? ` · ${U.fmt(r.gold)} ทอง` : ''}</h4><div class="bag mini">${r.got.map(it => `<div class="icell t${it.tier}" title="${esc(it.name)}"><img src="${UI.itemIcon(it)}" alt=""></div>`).join('')}</div>` : '<p class="muted">ไม่ติด 10 อันดับ — ไม่ได้รับไอเทม</p>'}
      <p class="muted">อันดับ 1: 5 ชิ้นระดับ 10 + ไอเทมบอสโลกแน่นอน · 2–3: 4 ชิ้นระดับ 9–10 · 4–6: 3 ชิ้นระดับ 8–9 · 7–10: 2 ชิ้นระดับ 7–8</p>`; } };

  // ---------------- Monster Book ----------------
  const CACHE = {};
  const mobThumb = (md, grade) => { const key = md.n + grade; if (CACHE[key]) return CACHE[key];
    try { const u = S.mkMob(md, 10, grade, 0, 0); const si = E.spriteInfo(u); const [cv, x] = G.SPR.mk(48, 48); const sc = Math.min(44 / si.w, 44 / si.h); x.imageSmoothingEnabled = false; x.drawImage(si.img, si.sx, si.sy, si.w, si.h, (48 - si.w * sc) / 2, 46 - si.h * sc, si.w * sc, si.h * sc); CACHE[key] = cv.toDataURL(); } catch (e) { CACHE[key] = ''; } return CACHE[key]; };
  const base = (() => { const s = [...document.scripts].find(x => /js\/wboss2\.js/.test(x.src)); return s ? s.src.replace(/js\/wboss2\.js.*$/, '') : ''; })();
  const duelThumb = (duel, box, f = 0) => { const m = BM[duel]; if (!m) return ''; const i = m.anims.idle[f % m.anims.idle.length]; const sx = (i % m.cols) * m.cw, sy = Math.floor(i / m.cols) * m.ch; const k = Math.min(box / m.cw, box / m.ch) * 1.25;
    return `<span class="mbth" style="width:${box}px;height:${box}px"><i data-duel="${duel}" style="width:${m.cw}px;height:${m.ch}px;background:url('${base}assets/bosses/${duel}.png') -${sx}px -${sy}px;transform:scale(${k.toFixed(3)})"></i></span>`; };
  const entriesFor = tab => { const out = [];
    if (tab === 'mob') D.FARM_MAPS.forEach((m, mi) => { for (const md of m.mobs) out.push({ k: m.id + ':' + md.n, md, grade: 'normal', map: m, mi }); out.push({ k: m.id + ':c', md: m.champ, grade: 'champion', map: m, mi }); out.push({ k: m.id + ':r', md: m.rare, grade: 'rare', map: m, mi }); });
    else if (tab === 'boss') { D.FARM_MAPS.forEach((m, mi) => out.push({ k: m.id + ':b', md: m.boss, grade: 'boss', map: m, mi })); for (const id of ['unhallowed', 'protector']) out.push({ k: 'pvp:' + id, md: D.BOSS_MD(id), grade: 'boss', pvp: true }); }
    else (D.WORLD_BOSSES || []).forEach(id => out.push({ k: 'wb:' + id, md: D.BOSS_MD(id), grade: 'world', wb: id }));
    return out; };
  const thumb = (e, box) => e.md && e.md.duel ? duelThumb(e.md.duel, box) : `<img src="${mobThumb(e.md, e.grade)}" alt="" style="width:${box}px;height:${box}px">`;
  const nextSpawn = id => { const iv = WB.interval(); const s0 = WB.slot(); for (let q = 0; q < 200; q++) if (WB.bossFor(s0 + q) === id) return q === 0 && WB.timeLeft() === 0 ? 0 : (s0 + q) * iv - Date.now(); return -1; };
  UI.PANELS.mbook = { title: 'สมุดมอนสเตอร์', tabs: [['mob', 'มอนสเตอร์'], ['boss', 'บอสแผนที่'], ['world', 'บอสโลก']], render(tab, Pn) {
    const s = S.save; const list = entriesFor(tab); const sel = list.find(e => e.k === Pn.mb) || list[0]; Pn.mb = sel && sel.k;
    const kills = e => (s.codex[e.md.n] || 0) || (e.wb && s.wbKills ? s.wbKills[e.wb] || 0 : 0);
    const cards = list.map(e => `<button class="mbc ${e === sel ? 'sel' : ''} ${kills(e) ? '' : 'unk'} g-${e.grade}" data-act="mb-sel" data-k="${esc(e.k)}">${thumb(e, 52)}<small>${esc(e.md.n)}</small></button>`).join('');
    let det = ''; if (sel) { const e = sel; const L = e.map ? e.map.lv[1] : U.clamp(s.lvl + 20, 40, D.MAX_LV); let st = {}; try { st = S.mkMob(e.md, L, e.grade, 0, 0).st; } catch (er) { }
      const k = e.wb ? KIT(e.wb) : null; let hpM = 1, atkM = 1; if (k) { const W2 = S.wbStats(e.wb, 1); st = { hp: W2.hp, atk: W2.atk, def: W2.def }; } const L2 = k ? 300 : L;
      det = `<div class="mbdet"><div class="mbbig">${thumb(e, 120)}</div><h3>${esc(e.md.n)}</h3><p class="muted">${D.GRADES[e.grade].th}${k ? ' · ' + esc(k.role) : ''} · ${e.map ? esc(e.map.th) + ` (Lv ${e.map.lv[0]}–${e.map.lv[1]})` : e.pvp ? 'PvP ศึกชิงบอส' : 'ลานบอสโลก'}</p>
        <table class="tbl"><tr><td>เลเวล</td><td>${L2}</td></tr><tr><td>HP</td><td>${U.fmt(Math.round((st.hp || 0) * hpM))}</td></tr><tr><td>ATK</td><td>${U.fmt(Math.round((st.atk || 0) * atkM))}</td></tr><tr><td>DEF</td><td>${U.fmt(st.def || 0)}</td></tr>${k ? `<tr><td>สเตจ</td><td>3 เฟส (100–66% · 66–33% ATK×1.3 · 33–0% ATK×1.7 + อัลติเมต)</td></tr><tr><td>คลั่ง</td><td>หลัง 20 นาที (มีบอท 15 นาที) ATK×3</td></tr>` : ''}${k ? `<tr><td>ธาตุ</td><td>${D.ELEM[ELEM(k.elem)].th}</td></tr>` : ''}<tr><td>ปราบแล้ว</td><td>${kills(e)} ตัว${e.wb && s.wbKills ? ` (บอสโลก ${s.wbKills[e.wb] || 0})` : ''}</td></tr></table>`;
      if (k) { const ns = nextSpawn(e.wb);
        det += `<p>${esc(k.lore)}</p><h4>พาสซีฟ</h4><ul class="mbl">${k.pass.map(p => `<li>${esc(PASS[p])}</li>`).join('')}<li>เปลี่ยนเฟสที่ 66% / 33%: อมตะ 2 วิ + โล่ 15% + เรียกสมุน · คลั่ง ATK ×2.5 หลัง 5 นาที</li></ul>
          <h4>สกิล</h4><ul class="mbl">${k.kit.map((a, i) => `<li><b>${esc(ABIL[a][0])}</b>${i >= 2 ? ` <small>(เฟส ${i})</small>` : ''} — ${esc(ABIL[a][1])}</li>`).join('')}<li class="ult"><b>อัลติเมต: ${esc(ULT[k.ult][0])}</b> <small>(เฟส 3)</small> — ${esc(ULT[k.ult][1])}</li></ul>
          <h4>ไอเทมเฉพาะบอส</h4><div class="bag mini">${['weapon', 'armor', 'acc'].map(p => { const d = D.WB_ITEMS.find(x => x.id === e.wb + ':' + p); return `<div class="icell t10" title="${esc(NAME(e.wb))} · ${PIECE[p]}"><img src="${UI.itemIcon({ wb: e.wb, slot: d.slot, tier: 10 })}" alt=""></div>`; }).join('')}</div>
          <p class="muted">${ns === 0 ? '<b class="bad">อยู่ในลานบอสโลกตอนนี้!</b>' : ns > 0 ? `เกิดครั้งถัดไปใน ${fmt(ns)}` : ''}</p>`; }
      else det += `<h4>ดรอป</h4><p class="muted">${e.grade === 'normal' ? 'อุปกรณ์ระดับต่ำ วัตถุดิบ ทอง' : e.grade === 'boss' ? 'อุปกรณ์ระดับสูง 3 ชิ้น + ทอง' : 'อุปกรณ์ 1–2 ชิ้น'} · ฆ่าครบ 50 ตัวได้ ATK +0.25%</p>`;
      det += '</div>'; }
    return `<div class="mbook"><div class="mbgrid">${cards}</div>${det}</div>`; } };
  // animate the big boss portrait
  setInterval(() => { const el = document.querySelector('.mbbig i[data-duel]'); if (!el) return; const m = BM[el.dataset.duel]; if (!m) return; el._f = ((el._f || 0) + 1) % m.anims.idle.length; const i = m.anims.idle[el._f]; el.style.backgroundPosition = `-${(i % m.cols) * m.cw}px -${Math.floor(i / m.cols) * m.ch}px`; }, 110);

  // ---------------- UI wiring ----------------
  const act0 = UI.act;
  UI.act = (el, e) => { const a = el.dataset.act;
    if (a === 'mb-sel') { UI.panel.mb = el.dataset.k; UI.renderPanel(); return; }
    if (a === 'wb-go') { UI.closePanel(); S.goWorldBoss(el.dataset.v === undefined ? undefined : el.dataset.v === '1'); return; }
    if (a === 'wb-focus') { const o = S.af ? S.af() : S.save.settings; o.wbFocus = el.dataset.v; S.persist(); UI._mh = null; UI.toast('ออโต้ลานบอสโลก: เน้น' + (WB.FOCUS.find(x => x[0] === o.wbFocus) || [, ''])[1], 'info'); if (UI.panel && UI.panel.id === 'autoset') UI.renderPanel(); return; }
    if (a === 'wb-party') { gset().wbParty = +el.dataset.v; S.persist(); UI.renderPanel(); return; }
    if (a === 'gmwb-give') { const it = S.genWBItem(el.dataset.b, el.dataset.p, UI.panel.gt || 10); if (it) { S.addItem(it, true); UI.toast(`GM: ได้รับ ${it.name}`, 'item', it.tier); } UI.renderPanel(); return; }
    if (a === 'gmwb-all') { for (const d of D.WB_ITEMS) { const it = S.genWBItem(d.boss, d.piece, UI.panel.gt || 10); if (it) S.addItem(it, true); } UI.toast(`GM: ได้รับไอเทมบอสโลกครบ ${D.WB_ITEMS.length} ชิ้น`, 'good'); return; }
    return act0(el, e); };
  // map panel: mode choice
  const mp0 = UI.PANELS.map.render; UI.PANELS.map.render = function (tab, Pn) { const h = mp0.call(this, tab, Pn); const st = gset();
    return h.replace(/<button class="btn primary" data-act="wb-go">[^<]*<\/button>/, `<button class="btn primary" data-act="wb-go" data-v="1">เข้าแบบ FFA มีบอท (แย่งดาเมจ)</button><button class="btn" data-act="wb-go" data-v="0">เข้าแบบไม่มีบอท</button></div><div class="gmrow"><b>เพื่อนร่วมปาตี้ (โหมดมีบอท)</b>${[0, 1, 2, 3, 4].map(n => `<button class="chip ${st.wbParty === n ? 'on' : ''}" data-act="wb-party" data-v="${n}">${n}</button>`).join('')}`); };
  // GM: world-boss items category
  const gmR = UI.gmRender;
  UI.gmRender = (tab, Pn) => { let h = gmR(tab, Pn);
    if (tab === 'world') h += `<h4>โหมดลานบอสโลก</h4><div class="list"><button class="btn" data-act="wb-go" data-v="1">เข้าแบบ FFA มีบอท</button><button class="btn" data-act="wb-go" data-v="0">เข้าแบบไม่มีบอท</button></div>`;
    if (tab !== 'item') return h;
    h = h.replace('<div class="gmcats">', `<div class="gmcats"><button class="gcat ${Pn.gcat === 'wbit' ? 'on' : ''}" data-act="gm" data-c="gmset" data-f="gcat" data-v="wbit"><img src="${UI.itemIcon({ wb: D.WORLD_BOSSES[0], slot: 'weapon', tier: 10 })}" alt="">ไอเทมบอสโลก ${D.WB_ITEMS.length}</button>`);
    if (Pn.gcat !== 'wbit') return h; const t = Pn.gt || 10;
    const body = `<div class="gmrow"><b>ระดับ</b>${[8, 9, 10].map(i => `<button class="tchip t${i} ${t === i ? 'on' : ''}" data-act="gm" data-c="gmset" data-f="gt" data-v="${i}">${i}</button>`).join('')}</div><p class="muted">คลิกไอคอนเพื่อเสก · ไอเทมเฉพาะของบอสโลกทั้ง ${D.WORLD_BOSSES.length} ตัว (ตัวละ 3 ชิ้น)</p>
      <div class="gmgrid">${D.WB_ITEMS.map(d => `<button class="gcell" data-act="gmwb-give" data-b="${d.boss}" data-p="${d.piece}"><div class="icell t${t}"><img src="${UI.itemIcon({ wb: d.boss, slot: d.slot, tier: t })}" alt=""></div><span>${esc(NAME(d.boss))} · ${PIECE[d.piece]}</span></button>`).join('')}</div><button class="btn" data-act="gmwb-all">เสกครบทั้ง ${D.WB_ITEMS.length} ชิ้น</button>`;
    return h.replace(/<div class="gmmain">[\s\S]*$/, `<div class="gmmain">${body}</div></div>`); };
  const as0 = UI.PANELS.autoset && UI.PANELS.autoset.render; if (as0) UI.PANELS.autoset.render = function () { const h = as0.apply(this, arguments); const f = WB.focus();
    const sec = `<h4>ลานบอสโลก: เป้าหมายที่ออโต้จะเน้น</h4><div class="gmrow">${WB.FOCUS.map(([k, n]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="wb-focus" data-v="${k}">${n}</button>`).join('')}</div><p class="muted">บอสโลก: ตีบอสอย่างเดียว (ตอบโต้เมื่อโดนตีใกล้ตัว) · ผู้เล่นอื่น: ไล่ล่าผู้เล่นศัตรู · สมุนบอส: เคลียร์สมุนก่อน · ผสม: ตีสิ่งที่ใกล้ที่สุด</p>`;
    return h.replace('<h4>ยาและกระเป๋า</h4>', sec + '<h4>ยาและกระเป๋า</h4>'); };
  // menu button + key (B opens monster book via codex shortcut stays; add menu entry)
  if (UI.ICONS && UI.ICONS.MENU) UI.ICONS.MENU.mbook = k => { k.R(7, 5, 18, 23, '#7a3a2a'); k.R(9, 7, 14, 19, '#f0e4c8'); k.C(16, 14, 4, '#3a2a2a'); k.R(14, 13, 1, 1, '#ff4a4a'); k.R(17, 13, 1, 1, '#ff4a4a'); k.R(12, 20, 8, 1, '#8a6a4a'); k.R(12, 23, 6, 1, '#8a6a4a'); };
  const bind0 = UI.bindHud; UI.bindHud = function () { const r = bind0.apply(this, arguments); const m = $('#menu'); if (m && !m.querySelector('[data-p=mbook]')) { const b = document.createElement('button'); b.dataset.act = 'panel'; b.dataset.p = 'mbook'; b.innerHTML = `<img src="${UI.menuIcon('mbook')}" alt=""><span>สมุดมอนสเตอร์</span>`; const ref = m.querySelector('[data-p=codex]'); m.insertBefore(b, ref ? ref.nextSibling : null); } return r; };
  // codex panel link
  const cx0 = UI.PANELS.codex.render; UI.PANELS.codex.render = function (tab, Pn) { const h = cx0.call(this, tab, Pn); return tab === 'mon' ? `<div class="list"><button class="btn primary" data-act="panel" data-p="mbook">เปิดสมุดมอนสเตอร์ (รูป ค่าพลัง สกิลบอสโลก)</button></div>` + h : h; };

  // styles
  const css = document.createElement('style'); css.textContent = `
  .wbrank{margin:4px 0 2px;display:grid;grid-template-columns:1fr 1fr;grid-auto-flow:column;grid-template-rows:repeat(5,auto);gap:1px 6px;font-size:10.5px;min-width:300px}
  .wbrank div{display:grid;grid-template-columns:18px 1fr 34px;gap:4px;padding:1px 4px;border-radius:3px;background:rgba(0,0,0,.25)}
  .wbrank div.me{background:rgba(255,216,74,.35);color:#fff}.wbrank div.pt{background:rgba(74,160,255,.25)}.wbrank div.out{margin-top:2px}
  .wbfocus{display:flex;flex-wrap:wrap;gap:3px;align-items:center;justify-content:center;margin:3px 0}.wbfocus .chip{padding:1px 7px;font-size:10.5px;min-height:0}
  .wbrank i{font-style:normal;opacity:.8}.wbrank b{text-align:right}
  .mbook{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:10px;height:100%;min-height:0}
  .mbgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(76px,1fr));gap:6px;overflow:auto;align-content:start;min-height:0;padding-right:4px}
  .mbc{display:flex;flex-direction:column;align-items:center;gap:2px;padding:5px 2px;border:1px solid rgba(160,140,90,.45);border-radius:6px;background:linear-gradient(#fbf7ec,#ece2c8);cursor:pointer;color:#3a3020;min-width:0}
  .mbc small{font-size:10px;line-height:1.1;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
  .mbc.sel{outline:2px solid #e0a020;background:linear-gradient(#fff6d8,#f2d890)}.mbc.unk img,.mbc.unk .mbth i{filter:brightness(.25) saturate(0)}
  .mbc.g-boss{border-color:#ff7a5a}.mbc.g-world{border-color:#d04af0}.mbc.g-rare{border-color:#a07aff}.mbc.g-champion{border-color:#ff9a2e}
  .mbc img{image-rendering:pixelated}
  .mbth{display:flex;align-items:center;justify-content:center;overflow:hidden}.mbth i{flex:none;image-rendering:pixelated;background-repeat:no-repeat}
  .mbdet{overflow:auto;min-height:0;padding:6px;border-radius:8px;background:rgba(255,255,255,.55);border:1px solid rgba(160,140,90,.4)}
  .mbdet h3{margin:4px 0 0}.mbbig{display:flex;justify-content:center;background:radial-gradient(circle,rgba(255,255,255,.9),rgba(220,200,160,.4));border-radius:8px;padding:6px}
  .mbbig img{image-rendering:pixelated}.mbl{margin:2px 0 6px;padding-left:16px;font-size:12px}.mbl li{margin:2px 0}.mbl li.ult{color:#a0208a}
  .bag.mini{display:flex;flex-wrap:wrap;gap:4px}.bag.mini .icell{width:40px;height:40px}.bag.mini .icell img{width:32px;height:32px}
  .wbset b{color:#b0208a}
  @media (max-width:720px){.mbook{grid-template-columns:1fr;grid-template-rows:minmax(0,1fr) auto}.mbdet{max-height:45vh}}
  @media (prefers-color-scheme:dark){.mbc{color:#3a3020}}`;
  document.head.appendChild(css);
})(G);

});
