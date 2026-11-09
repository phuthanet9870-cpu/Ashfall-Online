'use strict';
/* Ashfall Online — game data: classes, skills, tiers, maps, dungeons, PvP, siege */
(function (init) {
  (globalThis.ASHFALL_SIM_FACTORIES ||= {})['data'] = init;
  if (typeof window !== 'undefined') init(window.G ||= {});
})(function (G) {
  // ---------- utils ----------
  const U = G.U = {
    rnd: Math.random,
    ri: (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
    rf: (a, b) => a + Math.random() * (b - a),
    pick: a => a[Math.floor(Math.random() * a.length)],
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
    d2: (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by),
    fmt: n => (n >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : Math.round(n) + ''),
    uid: () => Math.random().toString(36).slice(2, 10),
    seeded(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; },
    hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; },
    shade(hex, f) { // f -1..1
      const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
      if (f >= 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
      return '#' + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1);
    },
    today() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); },
    wpick(weights) { // [[value, w], ...]
      let s = 0; for (const w of weights) s += w[1]; let r = Math.random() * s;
      for (const w of weights) { r -= w[1]; if (r <= 0) return w[0]; } return weights[weights.length - 1][0];
    }
  };

  G.TS = 24; G.MAPK = 1.5; // straight top-down tile size (px) and global map enlargement
  const D = G.D = {};

  // ---------- tiers (10) ----------
  D.TIERS = [
    { n: 'Common', th: 'ธรรมดา', c: '#c9c6bd' },
    { n: 'Uncommon', th: 'ไม่ธรรมดา', c: '#5fd068' },
    { n: 'Rare', th: 'หายาก', c: '#4aa3ff' },
    { n: 'Epic', th: 'มหากาพย์', c: '#b06cff' },
    { n: 'Legendary', th: 'ตำนาน', c: '#ff9a2e' },
    { n: 'Mythic', th: 'เทพนิยาย', c: '#ff4d4d' },
    { n: 'Ancient', th: 'โบราณ', c: '#d9894f' },
    { n: 'Divine', th: 'ศักดิ์สิทธิ์', c: '#ffd84a' },
    { n: 'Celestial', th: 'สวรรค์', c: '#9ff4ff' },
    { n: 'Primordial', th: 'ปฐมกาล', c: '#ff7af0' }
  ];
  D.tierColor = (t, time) => {
    if (t === 10) { const h = ((time || performance.now()) / 8) % 360; return `hsl(${h},95%,68%)`; }
    return D.TIERS[t - 1].c;
  };
  D.FLOOR_BANDS = [[1, 50], [51, 120], [121, 200], [201, 300], [301, 410], [411, 530], [531, 660], [661, 790], [791, 920], [921, 1000]]; D.MAX_FLOOR = 1000;
  D.TIER_MULT = [1, 1.3, 1.6, 2, 2.5, 3.1, 3.8, 4.6, 5.5, 6.5];
  D.SUBS = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5];
  D.SOCKETS = [0, 0, 1, 1, 1, 2, 2, 2, 3, 3];
  D.tierOfFloor = F => { F = U.clamp(Math.floor(F), 1, 1000); for (let i = 0; i < 10; i++) if (F <= D.FLOOR_BANDS[i][1]) return i + 1; return 10; };
  D.bandP = F => { const t = D.tierOfFloor(F); const [a, b] = D.FLOOR_BANDS[t - 1]; return b === a ? 1 : (F - a) / (b - a); };
  // dungeon death roll distribution: returns [[tier, prob], ...]
  D.dungeonDist = F => {
    const T = D.tierOfFloor(F), p = D.bandP(F);
    const raw = [[T, 0.10 + 0.20 * p], [T - 1, 0.40], [T - 2, 0.30], [T - 3, 0.20 - 0.20 * p]];
    const out = {};
    for (const [t, w] of raw) { if (w <= 0) continue; const tt = Math.max(1, t); out[tt] = (out[tt] || 0) + w; }
    return Object.keys(out).map(k => [+k, out[k]]).sort((a, b) => b[0] - a[0]);
  };
  D.farmDist = (M, boss) => {
    const w = boss ? [0.25, 0.40, 0.35] : [0.15, 0.35, 0.50]; const out = {};
    [M, M - 1, M - 2].forEach((t, i) => { const tt = Math.max(1, t); out[tt] = (out[tt] || 0) + w[i]; });
    return Object.keys(out).map(k => [+k, out[k]]).sort((a, b) => b[0] - a[0]);
  };

  // ---------- elements ----------
  D.ELEM = {
    fire: { th: 'ไฟ', pal: ['#fff3b0', '#ffb347', '#ff5a1f', '#a8200d'], fx: 'ember' },
    ice: { th: 'น้ำแข็ง', pal: ['#ffffff', '#bff4ff', '#5cc8ff', '#2a6fdb'], fx: 'shard' },
    lightning: { th: 'สายฟ้า', pal: ['#ffffff', '#fffb8a', '#9ad7ff', '#5b6cff'], fx: 'spark' },
    shadow: { th: 'เงา', pal: ['#e9c8ff', '#9b4dff', '#4b1d7a', '#1a0a2e'], fx: 'smoke' },
    holy: { th: 'แสง', pal: ['#ffffff', '#fff6c2', '#ffd84a', '#e09a1a'], fx: 'feather' },
    nature: { th: 'ธรรมชาติ', pal: ['#eaffc2', '#9be34a', '#3fa83a', '#1d5e2a'], fx: 'leaf' },
    phys: { th: 'กายภาพ', pal: ['#ffffff', '#e8e8f0', '#a0a8c0', '#5a607a'], fx: 'dust' },
    arcane: { th: 'อาคม', pal: ['#ffe0ff', '#ff7ae0', '#b04cff', '#5a1fa8'], fx: 'glyph' },
    blood: { th: 'เลือด', pal: ['#ffd0d0', '#ff4d4d', '#b0101e', '#5a0010'], fx: 'drop' },
    time: { th: 'กาลเวลา', pal: ['#fffbe0', '#d6ff7a', '#5ff0c8', '#1f8a8a'], fx: 'tick' },
    poison: { th: 'พิษ', pal: ['#f0ffb0', '#b8ff4a', '#5ab82a', '#2a5a10'], fx: 'bubble' },
    tech: { th: 'จักรกล', pal: ['#ffffff', '#ffe08a', '#ff9a2e', '#5a6070'], fx: 'spark' },
    wind: { th: 'ลม', pal: ['#ffffff', '#d0fff0', '#7ae8c8', '#3aa890'], fx: 'swirl' },
    chi: { th: 'ปราณ', pal: ['#ffffff', '#fff0a0', '#7af0ff', '#2a8ad0'], fx: 'ringlet' },
    fel: { th: 'อสูร', pal: ['#e0ffd0', '#7aff4a', '#2aa83a', '#103a14'], fx: 'ember' },
    star: { th: 'ดวงดาว', pal: ['#ffffff', '#fff2a8', '#9a7aff', '#2a1a6a'], fx: 'twinkle' },
    dark: { th: 'ห้วงลึก', pal: ['#ffffff', '#ff5af5', '#9a2ac0', '#12061a'], fx: 'smoke' },
    light: { th: 'แสงบริสุทธิ์', pal: ['#ffffff', '#fffbe0', '#ffe680', '#ffb020'], fx: 'twinkle' },
    umbra: { th: 'เงามืด', pal: ['#e8d8ff', '#a06aff', '#2a1a48', '#06040c'], fx: 'smoke' },
    celestial: { th: 'สวรรค์', pal: ['#ffffff', '#fff6d0', '#9ad8ff', '#4a6ad0'], fx: 'feather' },
    death: { th: 'ความตาย', pal: ['#e8fff4', '#6affc8', '#1a8a6a', '#061814'], fx: 'smoke' },
    infernal: { th: 'นรก', pal: ['#fff0c0', '#ff6a1a', '#a01a10', '#1a0606'], fx: 'ember' },
    divine: { th: 'เทพ', pal: ['#ffffff', '#ffe9a0', '#a0d8ff', '#6a4aff'], fx: 'twinkle' },
    jester: { th: 'ตลกคะนอง', pal: ['#ffffff', '#ffd84a', '#ff4ab0', '#2a1a4a'], fx: 'glyph' },
    chaos: { th: 'กลลวงโกลาหล', pal: ['#f6ffd8', '#a8ff3a', '#1f8a4a', '#081a10'], fx: 'glyph' }
  };

  // ---------- roles ----------
  D.ROLES = {
    melee: { th: 'ประชิด DPS', hp: 1.05, atk: 1.1, def: 1.0 },
    tank: { th: 'แทงค์', hp: 1.45, atk: 0.85, def: 1.5 },
    caster: { th: 'เวทระยะไกล', hp: 0.8, atk: 1.22, def: 0.75 },
    healer: { th: 'ฮีลเลอร์', hp: 0.95, atk: 0.9, def: 0.95 },
    ranged: { th: 'ยิงระยะไกล', hp: 0.85, atk: 1.15, def: 0.8 },
    assassin: { th: 'นักฆ่า', hp: 0.85, atk: 1.25, def: 0.8 },
    hybrid: { th: 'ไฮบริด', hp: 1.15, atk: 1.0, def: 1.2 },
    summoner: { th: 'อัญเชิญ', hp: 0.95, atk: 1.05, def: 0.9 }
  };

  // ---------- skill archetypes ----------
  D.ARCH = {
    slash: { r: 1.6, dmg: 1, th: 'ฟันวงโค้ง' }, spin: { r: 2, n: 3, dmg: 1, th: 'หมุนรอบตัว' }, thrust: { R: 2.5, dmg: 1, th: 'แนวตรง' },
    proj: { R: 8, dmg: 1, th: 'กระสุน' }, nova: { r: 2, dmg: 1, th: 'ระเบิดรอบตัว' }, ground: { R: 6, r: 1.5, dmg: 1, th: 'ถล่มพื้นที่' },
    zone: { R: 6, r: 2.2, d: 4, dmg: 1, th: 'พื้นที่ต่อเนื่อง' }, beam: { R: 6, dmg: 1, th: 'ลำแสง' }, chain: { R: 6, n: 3, dmg: 1, th: 'ลูกโซ่' },
    dash: { R: 4, dmg: 1, th: 'พุ่งตัว' }, leap: { R: 5, r: 1.8, dmg: 1, th: 'กระโดดกระแทก' }, barrage: { R: 1.8, n: 3, dmg: 1, th: 'โจมตีรัว' },
    summon: { n: 1, d: 12, th: 'อัญเชิญ' }, turret: { d: 10, th: 'ป้อม' }, trap: { r: 1.5, dmg: 1, th: 'กับดัก' },
    buff: { d: 8, th: 'บัฟ' }, shield: { d: 4, th: 'โล่' }, heal: { r: 0, th: 'ฟื้นฟู' }, blink: { R: 4, th: 'วาร์ป' }, stealth: { d: 3, th: 'ล่องหน' }
  };
  D.BUFF_TYPES = ['atk', 'aspd', 'crit', 'def', 'spd', 'ls', 'cdr'];
  D.BUFF_TH = { atk: 'พลังโจมตี', aspd: 'ความเร็วโจมตี/ร่าย', crit: 'โอกาสคริติคอล', def: 'พลังป้องกัน', spd: 'ความเร็ววิ่ง', ls: 'ดูดเลือด', cdr: 'ลดคูลดาวน์' };
  D.CC_TH = { st: 'สตัน', rt: 'ตรึงอยู่กับที่', sl: 'ชะลอ 40%', fz: 'แช่แข็ง', kb: 'ผลักกระเด็น', pl: 'ดึงเข้าหา', sil: 'ใบ้ (ห้ามใช้สกิล)' };
  D.UNLOCK = [1, 1, 2, 4, 7, 10, 14, 18, 24, 30, 38, 48, 60, 80, 120, 1];
  D.SLOT_TH = i => (i < 8 ? 'โจมตี' : i < 12 ? 'เทคนิค/ควบคุม' : i < 14 ? 'ป้องกัน/หลบ' : i === 15 ? 'อัลติเมตชุดคลาส' : 'อัลติเมต');
  D.KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'Q', 'E', 'R', 'T', 'F', 'G'];

  // ---------- 20 classes x 15 skills ----------
  // skill spec: "Name|arch|opts"  opts: p power, c cooldown, m cost, r radius, R range, n count, d duration, v value, pi pierce,
  // cc: st stun, rt root, sl slow, fz freeze, kb knockback, pl pull, sil silence; flags: buff type, ls drain, u ultimate
  const C = (id, name, th, role, res, build, elem, weapon, col, hair, skills) => ({ id, name, th, role, res, build, elem, weapon, col, hair, specs: skills });
  D.CLASSES = [
    C('blademaster', 'Blademaster', 'นักดาบ', 'melee', 'Fury', true, 'phys', 'sword', ['#3a5a9a', '#d8d8e8'], '#2a2a3a', [
      'Iai Draw|slash|p1.1 c0.5 r1.6',
      'Crescent Moon|slash|p1.45 c1.3 r1.9',
      'Falcon Pierce|thrust|p1.7 c1.8 R3 pi1',
      'Flash Step Slash|dash|p1.5 c2.5 R4.5',
      'Storm of Petals|barrage|p0.34 n7 c2.6 R1.8',
      'Tempest Whirl|spin|p0.5 n4 r2.1 c3',
      'Sky Splitter Wave|proj|p1.6 c2 pi2',
      'Nine Dragon Flash|barrage|p0.28 n9 c3.2 R1.9',
      'Guard Breaker|slash|p1 c8 r1.8 st1',
      'Kenki Focus|buff|crit v22 d8 c15',
      'Sword Saint Stance|buff|atk v25 d8 c16',
      'Tendon Cut|thrust|p0.8 c10 R2.5 sl3',
      'Counter Stance|shield|v30 d3 c12',
      'Mirage Step|blink|R4.5 c10',
      'Eight Heavens Severing|ground|p1.5 r4 n8 c50 st1 u'
    ]),
    C('guardian', 'Guardian', 'ผู้พิทักษ์', 'tank', 'Guard', true, 'phys', 'mace', ['#5a6a8a', '#c8a050'], '#6a4a2a', [
      'Shield Slam|slash|p1 c0.8 r1.4',
      'Crushing Mace|slash|p1.35 c1.2 r1.5 sl1',
      'Aegis Boomerang|chain|p1.1 n3 c2.5 R6',
      'Earthshaker|nova|p1.2 r2.3 c3 sl1.5',
      'Bastion Charge|dash|p1.2 R4 c3 st0.6',
      'Meteor Mace|ground|p1.85 r1.6 c2.6 R4',
      'Iron Cyclone|spin|p0.42 n3 r1.9 c3',
      'Rampart Ram|thrust|p1.6 R2.4 c2 kb1.5',
      'Challenge Roar|nova|p0.3 r3.5 c10 pl2',
      'Iron Skin|buff|def v50 d6 c16',
      'Gravity Chains|nova|p0.5 r3 c12 rt2',
      'Sentinel Aura|heal|v10 r4 c18',
      'Fortress Wall|shield|v45 d4 c14',
      'Valiant Leap|leap|p1 R5 r2.2 c12',
      'Last Bastion|nova|p7 r5 c55 st2 u'
    ]),
    C('berserker', 'Berserker', 'นักรบคลั่ง', 'melee', 'Rage', true, 'blood', 'axe', ['#7a2a2a', '#5a4a3a'], '#c84a2a', [
      'Savage Cleave|slash|p1.2 c0.6 r1.7',
      'Wolf Rend|barrage|p0.5 n3 c1 R1.7',
      'Hurled Axe|proj|p1.45 c1.5 pi1',
      'Frenzy Chop|barrage|p0.3 n6 c2.5 R1.7',
      'Blood Cyclone|spin|p0.6 n5 r2 c3',
      'Skull Splitter|slash|p2.2 c2.5 r1.7 st0.5',
      'Reckless Leap|leap|p1.5 R5 r2 c4',
      'Bloodspike Rupture|thrust|p1.9 R2.6 c2',
      'Dread Howl|nova|p0.2 r3 c12 sl3',
      'Bloodlust|buff|ls v15 d8 c16',
      'Berserk Fury|buff|aspd v35 d6 c15',
      'Chain Hook|beam|p0.6 R6 c10 pl4',
      'Undying Rage|shield|v30 d3 c18',
      'Quake Stomp|nova|p0.8 r2.5 c12 st1',
      'Crimson Rampage|spin|p0.9 n12 r3 c55 u'
    ]),
    C('paladin', 'Paladin', 'อัศวินศักดิ์สิทธิ์', 'hybrid', 'Holy Power', false, 'holy', 'hammer', ['#e8e0c8', '#e8b04a'], '#e8d08a', [
      'Oath Strike|slash|p1.1 c0.6 r1.5',
      'Pillar of Judgment|ground|p1.6 r1.4 c1.8 R5',
      'Radiant Hammer|proj|p1.4 c1.5',
      'Consecrated Ground|zone|p0.35 r2.5 d4 c4',
      'Lance of Dawn|thrust|p1.8 R3 c2.2 pi1',
      'Sunburst|nova|p1.2 r2 c2.5',
      'Hammer of Justice|ground|p1.5 r1.2 c2.5 R5 st0.6',
      'Crusader Charge|dash|p1.3 R4 c3',
      'Blinding Light|nova|p0.3 r3 c12 sil2',
      'Halo of Valor|buff|atk v20 d10 c18',
      'Lay on Hands|heal|v30 c20',
      'Sanctuary|heal|v12 r4 c16',
      'Divine Wings|shield|v50 d3 c22',
      'Holy Step|blink|R4 c11',
      'Wrath of Heaven|ground|p1.8 r4.5 n5 c55 st1.5 u'
    ]),
    C('pyromancer', 'Pyromancer', 'จอมเวทไฟ', 'caster', 'Mana', false, 'fire', 'staff', ['#9a2a1a', '#e8a03a'], '#ff7a3a', [
      'Fire Bolt|proj|p1.1 c0.5',
      'Fireball|proj|p1.6 c1.5 r1.2',
      'Flame Fan|thrust|p1.4 R3.2 c1.8',
      'Fire Lotus|nova|p1.3 r2.2 c2.5',
      'Meteor|ground|p2.4 r2 c3 R6',
      'Inferno Field|zone|p0.4 r2.2 d4 c4',
      'Blaze Chain|chain|p0.9 n4 c2.2',
      'Phoenix Feathers|proj|p0.6 n5 c2.5',
      'Combustion|nova|p0.5 r2.5 c10 kb2',
      'Ignite Mind|buff|crit v25 d8 c16',
      'Ring of Fire|zone|p0.2 r3 d4 c14 rt1.5',
      'Flame Barrier|shield|v30 d4 c16',
      'Flame Blink|blink|R5 c10',
      'Molten Armor|buff|def v30 d6 c18',
      'Armageddon|ground|p2 r5 n8 c60 u'
    ]),
    C('cryomancer', 'Cryomancer', 'จอมเวทน้ำแข็ง', 'caster', 'Mana', false, 'ice', 'orb', ['#2a5a9a', '#bfe8ff'], '#d8f0ff', [
      'Ice Shard|proj|p1 c0.5 sl1',
      'Frost Lance|proj|p1.5 c1.5 pi2',
      'Blizzard|zone|p0.4 r2.5 d4 c4 sl1',
      'Glacier Spikes|thrust|p1.5 R3.6 c2',
      'Crystal Bloom|nova|p1.3 r2 c2.5 sl2',
      'Comet of Frost|ground|p2.2 r1.8 c3 R6',
      'Shatter Chain|chain|p0.9 n3 c2.2',
      'Icicle Storm|proj|p0.5 n6 c2.5',
      'Crystal Prison|ground|p0.6 r1.5 c12 R6 fz2',
      'Frost Nova|nova|p0.4 r3 c12 rt2',
      'Snow Focus|buff|cdr v20 d8 c18',
      'Ice Block|shield|v60 d2 c20',
      'Glide|blink|R5 c10',
      'Frost Armor|buff|def v35 d6 c18',
      'Absolute Zero|nova|p8 r6 c60 fz2.5 u'
    ]),
    C('stormcaller', 'Stormcaller', 'ผู้เรียกพายุ', 'caster', 'Charge', true, 'lightning', 'staff', ['#3a3a7a', '#ffe04a'], '#f0f0ff', [
      'Spark Bolt|proj|p1 c0.5',
      'Lightning Lance|beam|p1.5 R6 c1.5',
      'Chain Lightning|chain|p1 n5 c2',
      'Thunder Strike|ground|p2 r1.5 c2.5 R6',
      'Static Field|zone|p0.35 r2.5 d4 c4',
      'Volt Orbs|proj|p0.6 n4 c2.5 pi1',
      'Ball Lightning|proj|p1.8 c2.5 pi3',
      'Shock Nova|nova|p1.2 r2.2 c2.5',
      'Thunderclap|nova|p0.5 r2.5 c11 st1',
      'Overcharge|buff|aspd v30 d7 c16',
      'Magnetic Vortex|nova|p0.2 r4 c12 pl3',
      'Static Shield|shield|v30 d4 c15',
      'Lightning Dash|dash|p0.8 R5 c9',
      'Conductor|buff|crit v20 d8 c18',
      'Storm of Ragnarok|ground|p1.6 r5 n10 c55 st0.5 u'
    ]),
    C('necromancer', 'Necromancer', 'จอมเวทมรณะ', 'summoner', 'Essence', false, 'shadow', 'scythe', ['#2a1a3a', '#7a4aaa'], '#e0e0e0', [
      'Bone Spear|proj|p1.1 c0.6 pi2',
      'Soul Rend|slash|p1.4 c1.2 r1.8',
      'Corpse Explosion|ground|p1.8 r1.6 c2.5 R6',
      'Death Coil|proj|p1.5 c1.8',
      'Plague Field|zone|p0.4 r2.4 d5 c4',
      'Bone Storm|spin|p0.5 n5 r2 c3',
      'Drain Life|beam|p1.2 R5 c2.5 ls',
      'Grave Hands|barrage|p0.4 n5 c2.5 R5',
      'Raise Dead|summon|n3 d15 c18 p0.6',
      'Terror|nova|p0.2 r3 c12 sl3 sil1',
      'Grave Grasp|ground|p0.5 r1.8 c12 R6 rt2',
      'Bone Armor|shield|v35 d5 c16',
      'Wraith Step|blink|R4 c10',
      'Dark Pact|buff|atk v30 d8 c18',
      'Army of the Dead|summon|n8 d20 c60 p1 u'
    ]),
    C('cleric', 'Cleric', 'นักบวช', 'healer', 'Faith', false, 'holy', 'book', ['#f0f0f0', '#4a8ad0'], '#e8c86a', [
      'Smite|proj|p1 c0.5',
      'Holy Fire|ground|p1.4 r1.4 c1.8 R6',
      'Penance|barrage|p0.45 n4 c2 R6',
      'Divine Star|proj|p1.2 c2 pi3',
      'Holy Nova|nova|p1 r2.2 c2.5',
      'Radiance Beam|beam|p1.5 R6 c2.2',
      'Sacred Ring|zone|p0.3 r2.5 d4 c4',
      'Light Chain|chain|p0.8 n4 c2.5',
      'Mending Light|heal|v25 c6',
      'Prayer of Healing|heal|v15 r5 c12',
      'Purify|nova|p0.3 r3 c12 st0.8',
      'Halo Ward|shield|v40 d5 c14',
      'Angelic Feather|blink|R4 c10',
      'Grace|buff|def v30 d8 c18',
      'Divine Ascension|heal|v80 r7 c60 u'
    ]),
    C('druid', 'Druid', 'ดรูอิด', 'healer', 'Nature', false, 'nature', 'staff', ['#4a6a2a', '#a06a3a'], '#6a8a3a', [
      'Thorn Shot|proj|p1 c0.5',
      'Wrath|proj|p1.5 c1.5',
      'Entangling Vines|ground|p0.8 r1.6 c3 R6 rt1',
      'Moonfire|ground|p1.6 r1.2 c1.8 R6',
      'Thorn Field|zone|p0.35 r2.5 d4 c4',
      'Bear Swipe|slash|p1.5 c1.5 r1.7',
      'Tornado|proj|p0.5 c2.5 pi5',
      'Starfall|ground|p0.8 r3 n4 c3 R6',
      'Cyclone|nova|p0.4 r2.5 c11 kb2',
      'Rejuvenation|heal|v20 r4 c12',
      'Barkskin|buff|def v40 d6 c16',
      'Leaf Shield|shield|v30 d5 c14',
      'Wild Charge|dash|p0.8 R5 c9',
      'Wild Bloom|heal|v15 r6 c18',
      'Wrath of Gaia|nova|p8 r6 c60 rt2 u'
    ]),
    C('assassin', 'Assassin', 'นักฆ่า', 'assassin', 'Energy', false, 'poison', 'daggers', ['#2a2a2a', '#5ab82a'], '#1a1a1a', [
      'Stab|barrage|p0.55 n2 c0.5 R1.5',
      'Venom Blade|slash|p1.3 c1 r1.5',
      'Shuriken Fan|proj|p0.6 n3 c1.5',
      'Shadow Strike|blink|p1.8 R5 c3',
      'Eviscerate|thrust|p2.2 R1.8 c2.5',
      'Blade Flurry|barrage|p0.3 n8 c3 R1.6',
      'Toxic Cloud|zone|p0.4 r2 d4 c4 sl1',
      'Death Lotus|spin|p0.5 n4 r1.8 c3',
      'Kidney Shot|slash|p0.8 c12 r1.5 st1.5',
      'Vanish|stealth|d3 c14',
      'Adrenaline|buff|aspd v40 d6 c18',
      'Evasion|buff|def v50 d3 c15',
      'Smoke Dash|dash|p0.6 R5 c9',
      'Garrote Wire|slash|p0.6 c12 r1.5 sil2',
      'Thousand Shadows|barrage|p0.6 n20 c55 R6 u'
    ]),
    C('shadowdancer', 'Shadowdancer', 'นักเต้นเงา', 'assassin', 'Combo', true, 'shadow', 'blades', ['#3a1a4a', '#c04aff'], '#9a6ad0', [
      'Shadow Cut|slash|p1.1 c0.5 r1.6',
      'Dance of Blades|spin|p0.45 n4 r1.7 c2',
      'Moon Bolt|proj|p1.2 c1.2',
      'Umbral Dash|dash|p1.3 R4 c2.5',
      'Night Fang|barrage|p0.4 n5 c2.5 R1.6',
      'Eclipse|nova|p1.3 r2 c2.5',
      'Phantom Edge|thrust|p1.8 R2.5 c2',
      'Shadow Rain|ground|p0.6 r2 n4 c3 R5',
      'Shadow Bind|ground|p0.4 r1.5 c12 R5 rt2',
      'Dark Veil|stealth|d2.5 c14',
      'Mirror Image|summon|n2 d8 c18 p0.5',
      'Moon Guard|shield|v30 d4 c14',
      'Blink Strike|blink|p1 R5 c9',
      'Moonlight Rhythm|buff|crit v30 d6 c18',
      'Requiem of Night|spin|p0.8 n14 r3.5 c55 u'
    ]),
    C('ranger', 'Ranger', 'พรานป่า', 'ranged', 'Focus', false, 'wind', 'bow', ['#3a5a2a', '#8a6a3a'], '#a87a3a', [
      'Quick Shot|proj|p1 c0.5',
      'Power Shot|proj|p1.7 c1.5 pi2',
      'Multi Shot|proj|p0.6 n5 c1.8',
      'Arrow Rain|ground|p0.5 r2.2 n5 c3 R7',
      'Piercing Wind|beam|p1.6 R7 c2',
      'Explosive Arrow|ground|p1.8 r1.5 c2.5 R7',
      'Gale Arrow|proj|p1.2 c2 kb1 pi1',
      'Volley|barrage|p0.35 n7 c3 R7',
      'Snare Trap|trap|p0.5 r1.5 c10 rt2',
      'Hawk Eye|buff|crit v25 d8 c16',
      'Concussive Shot|proj|p0.6 c11 st1',
      'Camouflage|stealth|d3 c16',
      'Disengage|blink|R4 c9',
      'Swift Wind|buff|spd v40 d6 c16',
      'Gale Storm Volley|ground|p0.9 r5 n15 c55 u'
    ]),
    C('marksman', 'Marksman', 'มือปืน', 'ranged', 'Aim', false, 'phys', 'rifle', ['#4a4a3a', '#b08a4a'], '#3a2a1a', [
      'Rifle Shot|proj|p1.1 c0.6',
      'Headshot|beam|p2.2 R8 c2.5',
      'Buckshot|proj|p0.5 n6 c1.8',
      'Frag Grenade|ground|p1.7 r1.6 c2.5 R6',
      'Rapid Fire|barrage|p0.3 n8 c2.5 R7',
      'Rail Shot|beam|p1.8 R8 c2',
      'Incendiary Round|proj|p1.3 c2 r1.2',
      'Ricochet|chain|p0.9 n4 c2.2',
      'Flashbang|ground|p0.3 r2 c12 R6 st1',
      'Steady Aim|buff|atk v30 d8 c18',
      'Concussion Blast|nova|p0.6 r2 c11 kb3',
      'Smoke Screen|zone|p0.05 r2.5 d4 c16 sl1',
      'Combat Roll|dash|p0.1 R3 c7',
      'Deadeye|buff|crit v35 d6 c18',
      'Orbital Strike|ground|p12 r4 c60 u'
    ]),
    C('engineer', 'Engineer', 'วิศวกร', 'ranged', 'Gadget', false, 'tech', 'wrench', ['#8a5a2a', '#e8c04a'], '#d07a2a', [
      'Wrench Hit|slash|p1 c0.5 r1.5', 'Nail Gun|barrage|p0.3 n5 c1.2 R6', 'Rocket|proj|p1.6 c1.8 r1.3', 'Flame Thrower|thrust|p1.2 R3 c2',
      'Mine Field|trap|p1.4 r1.6 c3', 'Tesla Coil|chain|p0.9 n4 c2.2', 'Mortar|ground|p1.8 r1.8 c2.5 R7', 'Drone Swarm|proj|p0.5 n5 c2.5',
      'Auto Turret|turret|p0.5 d10 c14', 'EMP|nova|p0.4 r3 c12 sil2', 'Overclock|buff|aspd v30 d8 c16', 'Force Field|shield|v35 d5 c15',
      'Jetpack|leap|p0.6 R5 r1.5 c10', 'Repair Bot|heal|v20 r3 c18', 'Mega Mech Barrage|ground|p1.2 r5 n12 c55 u']),
    C('monk', 'Monk', 'นักพรต', 'melee', 'Chi', true, 'chi', 'fists', ['#e8a02a', '#8a3a1a'], '#1a1a1a', [
      'Jab|barrage|p0.5 n2 c0.4 R1.4', 'Palm Strike|thrust|p1.3 R1.8 c1 kb1', 'Hundred Fists|barrage|p0.25 n10 c2.5 R1.5', 'Chi Wave|proj|p1.3 c1.5 pi2',
      'Rising Dragon|nova|p1.4 r1.8 c2.5', 'Flying Kick|dash|p1.4 R4 c2.5', 'Tiger Claw|slash|p1.6 c1.8 r1.6', 'Spirit Bomb|ground|p1.9 r1.6 c2.8 R5',
      'Pressure Point|slash|p0.6 c11 r1.5 st1.2', 'Inner Focus|buff|aspd v30 d8 c16', 'Meditation|heal|v25 c16', 'Iron Body|shield|v35 d4 c14',
      'Cloud Step|blink|R4 c8', 'Chi Burst|nova|p0.4 r3 c12 kb2', 'Heaven Splitting Fist|barrage|p1 n15 c55 R2 u']),
    C('spellblade', 'Spellblade', 'นักดาบเวท', 'hybrid', 'Mana+Rage', true, 'arcane', 'sword', ['#4a2a6a', '#ff7ae0'], '#e04ab0', [
      'Arcane Slash|slash|p1.1 c0.5 r1.7', 'Rune Blade|thrust|p1.5 R2.5 c1.2', 'Spell Wave|proj|p1.4 c1.6 pi2', 'Blink Slash|dash|p1.5 R4 c2.5',
      'Mana Burst|nova|p1.3 r2 c2.5', 'Arcane Orbs|proj|p0.6 n4 c2.5', 'Sword Circle|spin|p0.5 n4 r2 c3', 'Arcane Meteor|ground|p2 r1.6 c3 R6',
      'Rune Prison|ground|p0.4 r1.5 c12 R6 rt2', 'Enchant Blade|buff|atk v25 d8 c16', 'Spell Steal|nova|p0.3 r3 c12 sil1.5', 'Mana Shield|shield|v35 d4 c15',
      'Phase Shift|blink|R5 c9', 'Arcane Haste|buff|cdr v20 d8 c18', 'Sword of Infinity|ground|p1.5 r4 n9 c55 u']),
    C('beastmaster', 'Beastmaster', 'นายพราน', 'summoner', 'Bond', false, 'nature', 'spear', ['#6a4a2a', '#3a7a3a'], '#5a3a1a', [
      'Spear Thrust|thrust|p1.1 R2 c0.5', 'Claw Command|barrage|p0.45 n3 c1.2 R5', 'Javelin|proj|p1.5 c1.5 pi1', 'Stampede|dash|p1.3 R5 c2.5',
      'Roar Wave|nova|p1.2 r2 c2.5', 'Hawk Dive|ground|p1.7 r1.3 c2.2 R6', 'Wolf Pack|summon|n2 d12 c12 p0.5', 'Serpent Bite|proj|p1.2 c2 sl1.5',
      'Beast Roar|nova|p0.3 r3 c12 st0.8', 'Primal Bond|buff|atk v25 d8 c16', 'Call Bear|summon|n1 d15 c18 p1', 'Thick Hide|shield|v30 d5 c14',
      'Wild Leap|leap|p0.8 R5 r1.6 c9', 'Mend Pet|heal|v20 r3 c16', 'Lord of Beasts|summon|n6 d20 c60 p1.2 u']),
    C('chronomancer', 'Chronomancer', 'จอมเวทกาลเวลา', 'caster', 'Time Shards', false, 'time', 'hourglass', ['#1f6a6a', '#e8d08a'], '#c8f0e0', [
      'Time Bolt|proj|p1 c0.5', 'Rewind Lance|beam|p1.5 R6 c1.5', 'Clock Shards|proj|p0.55 n4 c1.8', 'Temporal Rift|zone|p0.4 r2.4 d4 c4 sl1',
      'Age Strike|ground|p1.9 r1.5 c2.5 R6', 'Chrono Chain|chain|p0.9 n4 c2.2', 'Second Hand|spin|p0.45 n4 r2 c3', 'Paradox Nova|nova|p1.3 r2.2 c2.5',
      'Time Stop|ground|p0.3 r1.8 c14 R6 fz2', 'Haste|buff|cdr v25 d8 c18', 'Slow Field|zone|p0.1 r3 d5 c12 sl1', 'Chrono Shield|shield|v40 d4 c15',
      'Time Skip|blink|R5 c9', 'Accelerate|buff|aspd v35 d6 c16', 'End of Time|nova|p9 r6 c60 fz2 u']),
    C('warlock', 'Warlock', 'จอมเวทอสูร', 'caster', 'Corruption', false, 'fel', 'tome', ['#1a2a1a', '#7aff4a'], '#2a3a2a', [
      'Fel Bolt|proj|p1 c0.5', 'Corruption|ground|p1.3 r1.3 c1.5 R6', 'Hellfire Wave|thrust|p1.5 R3.5 c1.8', 'Soul Siphon|beam|p1.2 R6 c2 ls',
      'Rain of Fire|zone|p0.4 r2.5 d4 c4', 'Chaos Bolt|proj|p2.2 c2.5', 'Shadow Fury|nova|p1.2 r2.2 c2.5', 'Curse Chain|chain|p0.8 n4 c2.2',
      'Fear|nova|p0.2 r3 c12 st1', 'Demonic Pact|buff|atk v30 d8 c18', 'Summon Imp|summon|n2 d15 c16 p0.5', 'Demon Skin|shield|v35 d4 c15',
      'Demonic Circle|blink|R5 c9', 'Life Tap|heal|v20 c14', 'Doom Gate|summon|n1 d15 c60 p3 u']),
    C('starhunter', 'Star Hunter', 'นักล่าดวงดาว', 'ranged', 'Starlight', false, 'star', 'starbow', ['#1a1a4a', '#ffe9a8'], '#e8e0ff', [
      'Star Shot|proj|p1.1 c0.5', 'Twin Comets|proj|p0.85 n2 c1.2', 'Constellation Link|chain|p0.9 n5 c2', 'Falling Star|ground|p2.1 r1.6 c2.5 R7',
      'Stardust Nova|nova|p1.3 r2.4 c2.5', 'Orbit Blades|spin|p0.45 n5 r2 c3', 'Celestial Lance|beam|p1.8 R8 c2', 'Meteor Shower|ground|p0.6 r2.5 n7 c3 R7',
      'Gravity Well|zone|p0.3 r2.6 d4 c12 sl1 grav', 'Astral Mark|buff|crit v30 d8 c16', 'Starfall Snare|trap|p0.6 r1.6 c10 rt2', 'Nebula Veil|stealth|d2.5 c14',
      'Stellar Shield|shield|v35 d4 c15', 'Warp Star|blink|p1.2 R6 c9', 'Supernova|nova|p9 r6.5 c60 st1.5 u']),
    C('darkknight', 'Abyss Reaver', 'ยมทูตห้วงลึก', 'melee', 'Abyss Charge', true, 'dark', 'greatsword', ['#22202a', '#ff4af0'], '#d8d0e0', [
      'Void Rend|slash|p1.2 c0.6 r1.7', 'Rift Fang|barrage|p0.5 n3 c1.1 R1.8', 'Abyss Surge|thrust|p1.5 R3.2 c1.6', 'Phantom Lunge|dash|p1.4 R4.5 c2.5 st0.5',
      'Storm Reap|spin|p0.55 n4 r2.1 c3', 'Abyssal Spire|ground|p2.1 r1.7 c2.8 R5', 'Nether Bolt|proj|p1.6 c1.8 pi2', 'Cataclysm Slam|nova|p1.4 r2.3 c2.6 kb1',
      'Abyssal Shackles|beam|p0.6 R6 c11 pl3', 'Abyss Mantle|buff|atk v30 d8 c16', 'Dread Thunder|nova|p0.3 r3.5 c12 sil1.5', 'Soul Siphon Pact|heal|v22 c15',
      'Void Carapace|shield|v40 d4 c15', 'Shade Step|blink|p1 R4 c10', 'Event Horizon|ground|p6 r4.5 c55 st1.5 u']),
    C('lightbringer', 'Solar Arbiter', 'ตุลาการสุริยะ', 'caster', 'Radiance', false, 'light', 'prism', ['#fff6e0', '#ffd84a'], '#fff2b0', [
      'Sunlance Bolt|proj|p1.05 c0.5', 'Prism Scatter|proj|p0.6 n3 c1.3', 'Solar Beam|beam|p1.7 R7 c1.8', 'Refraction Chain|chain|p0.9 n4 c2',
      'Corona Burst|nova|p1.3 r2.3 c2.5', 'Dawnbreak Pillar|ground|p2 r1.6 c2.6 R7', 'Sanctum of Noon|zone|p0.4 r2.3 d4 c4', 'Glimmer Volley|barrage|p0.35 n7 c3 R7',
      'Blinding Zenith|nova|p0.3 r3 c12 st1', 'Halo of Dawn|buff|cdr v20 d8 c16', 'Mirror Sigil|trap|p0.6 r1.6 c10 rt1.5', 'Sunlit Grace|heal|v18 r4 c14',
      'Crystal Bastion|shield|v38 d4 c15', 'Lightspeed|blink|R6 c9', 'Solar Eclipse Verdict|beam|p9 R10 c55 u']),
    C('shadowmancer', 'Umbral Devourer', 'จอมกลืนเงา', 'summoner', 'Hunger', false, 'umbra', 'lurerod', ['#1a1830', '#a06aff'], '#2a2a4a', [
      'Ink Lure|proj|p1.1 c0.6', 'Tide of Ink|barrage|p0.45 n4 c1.2 R4.5', 'Puddle Spawn|summon|n2 d10 c12 p0.55', 'Undertow Lash|thrust|p1.5 R3.5 c1.6',
      'Abyssal Pool|ground|p1.2 r1.8 c2.4 R5 rt1', 'Spike Bloom|nova|p1.2 r2.2 c2.5', 'Drowning Mire|zone|p0.35 r2.4 d4 c4 sl1', 'Shadow Dive|blink|p1.4 R5 c3',
      'Hungering Grasp|chain|p0.8 n4 c2.2 st0.4', 'Submerge|stealth|d3 c14', 'Lure of the Deep|buff|spd v35 d6 c15', 'Ink Membrane|shield|v32 d4 c14',
      "Angler's Bait|trap|p0.8 r1.5 c10", 'Riptide Surge|dash|p0.8 R5 c9', 'The Big Gulp|ground|p7 r3 c55 st2 u']),
    C('seraph', 'Seraph', 'ทูตสวรรค์', 'hybrid', 'Grace', false, 'celestial', 'halospear', ['#f0f0ff', '#ffd84a'], '#fff6d0', [
      'Feather Dart|proj|p1 c0.5', 'Seraphic Lance|beam|p1.6 R6 c1.6', 'Wingstorm|proj|p0.5 n6 c2', 'Halo Chakram|chain|p0.9 n4 c2',
      "Heaven's Gate|ground|p2.1 r1.7 c2.8 R6", 'Choir Burst|nova|p1.3 r2.3 c2.5', 'Sanctified Ground|zone|p0.35 r2.4 d4 c4', 'Descent|leap|p1.6 R5 r2 c4',
      'Rapture Bind|ground|p0.4 r1.6 c12 R6 rt2', 'Wings of Valor|buff|atk v25 d8 c16', 'Guardian Feather|shield|v35 d4 c14', 'Miracle|heal|v22 r5 c14',
      'Ascend|blink|R6 c9', 'Hymn of Haste|buff|spd v35 d6 c15', "Seraph's Judgment|ground|p1.7 r4.5 n9 c55 st1 u"]),
    C('reaper', 'Grim Reaper', 'ยมทูต', 'melee', 'Souls', true, 'death', 'scythe', ['#141820', '#6affc8'], '#e8e8e8', [
      'Reap|slash|p1.25 c0.6 r2', 'Soul Rip|barrage|p0.5 n3 c1.1 R2.2', 'Death Sentence|thrust|p1.7 R3 c2', 'Grave Dash|dash|p1.3 R4.5 c2.5',
      'Harvest Moon|spin|p0.55 n4 r2.3 c3', 'Tombstone Drop|ground|p2.2 r1.6 c2.8 R5', 'Wraith Bolt|proj|p1.4 c1.6 pi2', 'Requiem Wave|nova|p1.3 r2.4 c2.6',
      'Shackles of Hades|beam|p0.5 R6 c11 pl3', "Death's Door|buff|crit v30 d8 c16", 'Banshee Wail|nova|p0.3 r3.5 c12 sil2', 'Soul Feast|heal|v20 c15',
      'Ectoplasm Shroud|shield|v35 d4 c15', 'Phase Walk|blink|p1.2 R5 c9', 'Final Hour|ground|p8 r4 c55 st1.5 u']),
    C('demon', 'Demon Lord', 'ปีศาจ', 'melee', 'Wrath', true, 'infernal', 'demonclaw', ['#5a1010', '#ff6a1a'], '#1a0606', [
      'Hellclaw|slash|p1.2 c0.55 r1.8', 'Brimstone Spit|proj|p1.2 c1 r1', 'Infernal Charge|dash|p1.4 R4.5 c2.5 kb1', 'Ravage|barrage|p0.35 n6 c2.5 R2',
      'Hellfire Eruption|nova|p1.4 r2.3 c2.6', 'Pit Maw|ground|p2 r1.7 c2.8 R5', 'Chain of Torment|chain|p0.9 n3 c2.2', 'Wing Buffet|thrust|p1.3 R3 c2 kb2',
      'Terror Gaze|beam|p0.4 R6 c12 st1', 'Demonic Frenzy|buff|aspd v35 d6 c15', 'Soul Furnace|zone|p0.4 r2.4 d4 c4', 'Devour|heal|v20 c15',
      'Hellhide|shield|v40 d4 c15', 'Shadow Wings|leap|p1 R6 r1.8 c9', 'Avatar of Ruin|nova|p8.5 r6 c55 kb2 u']),
    C('deity', 'Deity', 'พระเจ้า', 'caster', 'Divinity', false, 'divine', 'scepter', ['#fffbe8', '#a0d8ff'], '#ffffff', [
      'Word of Creation|proj|p1.1 c0.5', 'Starfall Decree|ground|p0.7 r2.2 n5 c2.5 R8', 'Divine Ray|beam|p1.8 R8 c1.8', 'Genesis Nova|nova|p1.4 r2.4 c2.5',
      'Wrath Bolt|chain|p1 n5 c2.2', 'Pillar of Heaven|ground|p2.3 r1.7 c2.8 R8', 'Time Halt|zone|p0.2 r2.6 d4 c12 sl1', 'Celestial Orbs|proj|p0.55 n5 c2.4 pi1',
      'Smite the Wicked|ground|p0.6 r1.6 c12 R8 st1.5', 'Omnipotence|buff|atk v35 d8 c18', 'Creation Ward|trap|p0.8 r1.7 c10', 'Blessing of Life|heal|v20 r6 c14',
      'Divine Barrier|shield|v45 d4 c16', 'Omnipresence|blink|R7 c9', 'Apocalypse|ground|p1.8 r5 n12 c60 st1 u']),
    C('jester', 'Jester', 'ตัวตลก', 'ranged', 'Mischief', false, 'jester', 'jesterstick', ['#ff4ab0', '#ffd84a'], '#4ad6ff', [
      'Juggle Toss|proj|p1 c0.5', 'Knife Throw|proj|p0.55 n4 c1.4', 'Confetti Bomb|ground|p1.6 r1.6 c2.4 R5', 'Pie in the Face|proj|p1.2 c2 st0.6',
      'Spring Trap|trap|p1.2 r1.5 c3 kb2', 'Balloon Barrage|barrage|p0.35 n7 c2.8 R5', 'Jack-in-the-Box|summon|n1 d10 c12 p0.9', 'Cartwheel|dash|p1 R4.5 c2.5',
      'Laughing Gas|zone|p0.3 r2.4 d4 c12 sl1', 'Showtime|buff|crit v30 d8 c16', 'Smoke & Mirrors|stealth|d2.5 c14', 'Rubber Ball Shield|shield|v32 d4 c14',
      'Card Trick|chain|p0.8 n5 c2.2', 'Pratfall|nova|p0.5 r2.6 c11 st1', 'Grand Finale|ground|p1.2 r5 n14 c55 u']),
    C('loki', 'Loki', 'เทพกลลวง', 'caster', 'Guile', false, 'chaos', 'trickstaff', ['#1f6a3a', '#e8c04a'], '#14140e', [
      'Serpent Bolt|proj|p1 c0.5', 'Mischief Daggers|barrage|p0.45 n5 c1.6 R6', 'Mistletoe Dart|proj|p1.5 c2.4 pi1', 'Venom Drip|ground|p1.5 r1.7 c2.8 R6',
      'Chaos Rune|beam|p1.3 c3.6', 'Wolfshape Lunge|dash|p1.4 R5 c4', 'Jormungandr Coil|zone|p0.35 r2.6 d4 c10 rt0.8', 'Silver Tongue|chain|p0.8 n4 c3 sil1',
      'Illusory Doubles|summon|n2 d8 c12 p0.7', 'Trickster Swap|blink|R6 c6', 'Hall of Mirrors|trap|p1.1 r1.8 c7 st0.8', 'Ragnarok Omen|buff|atk v25 d8 c18',
      'Glamour Veil|stealth|d3 c14', "Liar's Ward|shield|v30 d4 c14", 'Twilight of the Gods|ground|p1.3 r5 n12 c55 u'])
  ];
  // attack reach per class (tiles): melee 1.2-2.4, mid 3-6, long 7-10
  const RNG = { blademaster: 1.7, guardian: 1.4, berserker: 1.9, paladin: 1.6, pyromancer: 7, cryomancer: 6.5, stormcaller: 7.5, necromancer: 6, cleric: 6, druid: 6.5, assassin: 1.3, shadowdancer: 1.5, ranger: 9, marksman: 10, engineer: 5.5, monk: 1.2, spellblade: 2.4, beastmaster: 3.2, chronomancer: 7, warlock: 6.5, starhunter: 8.5, darkknight: 1.9, lightbringer: 7.5, shadowmancer: 4.5, seraph: 6, reaper: 2.6, demon: 2, deity: 8, jester: 4, loki: 6.5 };
  D.CLASSES.forEach(c => c.rng = RNG[c.id]);

  function parseSkill(str, idx, cls) {
    const [name, arch, opt = ''] = str.split('|');
    const A = D.ARCH[arch];
    const s = { id: cls.id + '_' + idx, idx, name, arch, p: 0, c: 1, m: 0, r: A.r || 0, R: A.R || 0, n: A.n || 1, d: A.d || 0, v: 0, pi: 0, cc: {}, flags: {}, elem: cls.elem, cls: cls.id };
    opt.split(' ').filter(Boolean).forEach(tok => {
      const mm = tok.match(/^([a-zA-Z]+)([\d.]+)$/);
      if (mm) { const k = mm[1], val = +mm[2]; if (D.CC_TH[k]) s.cc[k] = val; else s[k] = val; }
      else s.flags[tok] = true;
    });
    const rg = cls.rng || 6; const longC = rg >= 4;
    if (arch === 'proj') s.R = rg * (1 + (idx % 3) * 0.08);
    else if (longC && ['beam', 'chain', 'ground', 'zone'].includes(arch)) s.R = Math.round(s.R * rg / 7 * 10) / 10;
    else if (longC && arch === 'barrage' && s.R > 3) s.R = rg;
    else if (!longC && ['slash', 'spin', 'thrust', 'nova'].includes(arch) && !opt.includes('r' + s.r) === false) { }
    if (!longC) { const k = rg / 1.6; if (arch === 'slash' || arch === 'spin') s.r = Math.round(s.r * k * 10) / 10; if (arch === 'thrust' || (arch === 'barrage' && s.R < 3)) s.R = Math.round(s.R * k * 10) / 10; }
    if (arch === 'buff') s.buff = D.BUFF_TYPES.find(b => s.flags[b]) || 'atk';
    s.ls = !!(s.flags.ls && arch !== 'buff');
    s.ult = !!s.flags.u;
    if (!s.m) s.m = idx < 8 ? 3 + idx : idx < 12 ? 12 : idx < 14 ? 10 : 35;
    s.unlock = D.UNLOCK[idx];
    s.dmg = !!A.dmg && s.p > 0;
    s.base = JSON.parse(JSON.stringify({ p: s.p, c: s.c, r: s.r, R: s.R, n: s.n, d: s.d, v: s.v, cc: s.cc }));
    return s;
  }
  D.parseSkill = parseSkill;
  D.CLASSES.forEach((cls, ci) => { cls.idx = ci; cls.rng = cls.rng || 6; cls.skills = cls.specs.map((sp, i) => parseSkill(sp, i, cls)); });
  D.CLS = {}; D.CLASSES.forEach(c => (D.CLS[c.id] = c));

  // skill rune variants (3 per skill => 45 per class)
  D.VARIANTS = [null, { k: 'split', th: 'แยก', en: 'Split' }, { k: 'heavy', th: 'หนัก', en: 'Heavy' }, { k: 'rapid', th: 'เร็ว', en: 'Rapid' }];
  const COUNT_ARCH = { proj: 1, barrage: 1, chain: 1, summon: 1, spin: 1 };
  D.applyVariant = (s, v) => {
    if (!v) return s;
    const o = Object.assign({}, s, { cc: Object.assign({}, s.cc), variant: v });
    const support = !s.dmg;
    if (v === 1) {
      if (support) { o.v = s.v * 0.85; o.allies = true; if (s.arch === 'summon') o.n = s.n + 1; }
      else if (COUNT_ARCH[s.arch] || (s.arch === 'ground' && s.n > 1)) { o.n = s.n + 2; o.p = s.p * 0.65; }
      else { o.repeat = 3; o.p = s.p * 0.45; }
    } else if (v === 2) {
      if (support) { o.v = s.v * 1.5; o.d = s.d * 1.3; o.c = s.c * 1.4; }
      else { o.p = s.p * 1.6; o.c = s.c * 1.5; o.r = (s.r || 1) * 1.4; o.scale = 1.5; }
    } else if (v === 3) {
      if (support) { o.c = s.c * 0.6; o.v = s.v * 0.75; }
      else { o.c = Math.max(0.3, s.c * 0.5); o.p = s.p * 0.75; o.rapid = true; }
    }
    return o;
  };

  const f1 = x => (Math.round(x * 10) / 10).toString();
  D.descSkill = (s) => {
    const e = D.ELEM[s.elem].th; const P = Math.round(s.p * 100);
    let t = '';
    switch (s.arch) {
      case 'slash': t = `ฟันเป็นวงโค้งด้านหน้า รัศมี ${f1(s.r)} ช่อง`; break;
      case 'spin': t = `หมุนตัวโจมตีรอบตัว ${s.n} ครั้ง รัศมี ${f1(s.r)} ช่อง`; break;
      case 'thrust': t = `ปล่อยพลังเป็นแนวตรงยาว ${f1(s.R)} ช่อง โดนทุกเป้าในแนว`; break;
      case 'proj': t = (s.n > 1 ? `ยิงกระสุน ${s.n} ลูกแบบกระจาย` : 'ยิงกระสุนพลัง 1 ลูก') + (s.pi ? ` ทะลุได้ ${s.pi} เป้า` : '') + (s.r ? ` ระเบิดรัศมี ${f1(s.r)} ช่องเมื่อโดน` : ''); break;
      case 'nova': t = `ระเบิดพลังรอบตัว รัศมี ${f1(s.r)} ช่อง`; break;
      case 'ground': t = s.n > 1 ? `เรียก ${s.n} ลูกตกลงในพื้นที่รัศมี ${f1(s.r)} ช่อง (ระยะ ${f1(s.R)})` : `ถล่มจากฟ้าลงพื้นที่เป้าหมาย รัศมี ${f1(s.r)} ช่อง หน่วง 0.5 วิ (ระยะ ${f1(s.R)})`; break;
      case 'zone': t = `สร้างพื้นที่ทำดาเมจต่อเนื่องรัศมี ${f1(s.r)} ช่อง นาน ${f1(s.d)} วิ (ทุก 0.5 วิ)`; break;
      case 'beam': t = `ยิงลำแสงทะลุทุกเป้าในแนวตรงยาว ${f1(s.R)} ช่อง`; break;
      case 'chain': t = `ปล่อยพลังกระโดดต่อกันไปยังศัตรู ${s.n} เป้า`; break;
      case 'dash': t = `พุ่งไปข้างหน้า ${f1(s.R)} ช่อง โจมตีทุกเป้าที่พุ่งผ่าน`; break;
      case 'leap': t = `กระโดดไปยังเป้าหมาย (ระยะ ${f1(s.R)}) กระแทกพื้นรัศมี ${f1(s.r)} ช่อง`; break;
      case 'barrage': t = `โจมตีรัว ${s.n} ครั้งใส่เป้าหมาย (ระยะ ${f1(s.R)} ช่อง)`; break;
      case 'summon': t = `อัญเชิญตัวช่วยสู้ ${s.n} ตัว นาน ${f1(s.d)} วิ (พลัง ${P}% ของผู้ใช้)`; break;
      case 'turret': t = `วางป้อมยิงอัตโนมัติ นาน ${f1(s.d)} วิ (ดาเมจ ${P}% ATK ต่อนัด)`; break;
      case 'trap': t = `วางกับดักที่เท้า ระเบิดเมื่อศัตรูเหยียบ รัศมี ${f1(s.r)} ช่อง`; break;
      case 'buff': t = `เพิ่ม${D.BUFF_TH[s.buff]} ${Math.round(s.v)}% นาน ${f1(s.d)} วิ`; break;
      case 'shield': t = `สร้างโล่ดูดซับดาเมจ ${Math.round(s.v)}% ของ HP สูงสุด นาน ${f1(s.d)} วิ`; break;
      case 'heal': t = s.r > 0 ? `ฟื้นฟู HP ${Math.round(s.v)}% ให้ตัวเองและพันธมิตรในรัศมี ${f1(s.r)} ช่อง` : `ฟื้นฟู HP ตัวเอง ${Math.round(s.v)}%`; break;
      case 'blink': t = `วาร์ปไปข้างหน้า ${f1(s.R)} ช่อง` + (s.p ? ' แล้วโจมตีเป้าหมายตรงจุดที่ไปถึง' : ' หลุดจากการตรึง/ชะลอ'); break;
      case 'stealth': t = `ล่องหน ${f1(s.d)} วิ ศัตรูมองไม่เห็น การโจมตีครั้งถัดไปคริติคอลแน่นอน`; break;
    }
    const parts = [t];
    if (s.p > 0 && s.arch !== 'summon' && s.arch !== 'turret') parts.push(`ดาเมจ ${P}% ATK${s.arch === 'zone' ? ' ต่อจังหวะ' : (s.n > 1 && s.arch !== 'chain') || s.arch === 'spin' ? ' ต่อครั้ง' : ''} (ธาตุ${e})`);
    const cc = Object.keys(s.cc).map(k => k === 'kb' || k === 'pl' ? `${D.CC_TH[k]} ${f1(s.cc[k])} ช่อง` : k === 'sl' ? `${D.CC_TH[k]} ${f1(s.cc[k])} วิ` : `${D.CC_TH[k]} ${f1(s.cc[k])} วิ`);
    if (cc.length) parts.push(cc.join(' · '));
    if (s.ls) parts.push('ดูดเลือด 30% ของดาเมจที่ทำได้');
    if (s.repeat) parts.push(`ทำซ้ำ ${s.repeat} ครั้งติดกัน`);
    if (s.allies) parts.push('มีผลกับพันธมิตรรอบตัว 4 ช่องด้วย');
    return parts.join(' · ');
  };

  // ---------- stats ----------
  D.STAT_TH = {
    atk: 'ATK', def: 'DEF', hp: 'HP', crit: 'คริ%', critDmg: 'แรงคริ%', aspd: 'ความเร็ว%', cdr: 'ลดคูลดาวน์%', spd: 'ความเร็ววิ่ง%',
    ls: 'ดูดเลือด%', dr: 'ลดดาเมจ%', ccRes: 'ต้าน CC%', pvpDmg: 'ดาเมจ PvP%', pvpDef: 'ลดดาเมจ PvP%', elem: 'ดาเมจธาตุ%',
    atkP: 'ATK%', defP: 'DEF%', hpP: 'HP%', regen: 'ฟื้นทรัพยากร%', drop: 'อัตราดรอป%', xp: 'EXP%', gold: 'ทอง%'
  };
  D.PCT = { crit: 1, critDmg: 1, aspd: 1, cdr: 1, spd: 1, ls: 1, dr: 1, ccRes: 1, pvpDmg: 1, pvpDef: 1, elem: 1, atkP: 1, defP: 1, hpP: 1, regen: 1, drop: 1, xp: 1, gold: 1 };
  D.statBase = (stat, ilv) => ({
    atk: 10 + ilv * 2.6, def: 8 + ilv * 2.0, hp: 60 + ilv * 22, crit: 1 + ilv * 0.05, critDmg: 2 + ilv * 0.12, aspd: 1 + ilv * 0.06, cdr: 1 + ilv * 0.04,
    spd: 1 + ilv * 0.05, ls: 0.5 + ilv * 0.02, dr: 0.5 + ilv * 0.03, ccRes: 1 + ilv * 0.05, pvpDmg: 1 + ilv * 0.05, pvpDef: 1 + ilv * 0.05, elem: 2 + ilv * 0.1,
    atkP: 1 + ilv * 0.04, defP: 1 + ilv * 0.04, hpP: 1 + ilv * 0.04, regen: 2 + ilv * 0.1, drop: 1 + ilv * 0.03, xp: 1 + ilv * 0.04, gold: 1 + ilv * 0.05
  }[stat] || 1);
  D.CAPS = { crit: 75, cdr: 50, aspd: 100, dr: 60, ccRes: 60, ls: 30 };
  D.PVP_CAPS = { dr: 50, ccRes: 40, ls: 15 };

  // ---------- equipment ----------
  D.GEAR_SLOTS = [
    { k: 'weapon', th: 'อาวุธหลัก', main: ['atk'] }, { k: 'offhand', th: 'มือรอง', main: ['def', 'atk'] }, { k: 'head', th: 'หมวก', main: ['hp'] },
    { k: 'chest', th: 'เสื้อ', main: ['def'] }, { k: 'gloves', th: 'ถุงมือ', main: ['atk'] }, { k: 'legs', th: 'กางเกง', main: ['hp'] }, { k: 'boots', th: 'รองเท้า', main: ['def'] }
  ];
  D.ACC_SLOTS = [
    { k: 'necklace', th: 'สร้อยคอ', main: ['atk'], unlock: 0 }, { k: 'earring1', th: 'ต่างหู 1', main: ['crit'], unlock: 10 }, { k: 'earring2', th: 'ต่างหู 2', main: ['crit'], unlock: 20 },
    { k: 'ring1', th: 'แหวน 1', main: ['atk', 'def', 'hp', 'crit', 'critDmg'], unlock: 0 }, { k: 'ring2', th: 'แหวน 2', main: ['atk', 'def', 'hp', 'crit', 'critDmg'], unlock: 10 },
    { k: 'bracelet', th: 'กำไล', main: ['aspd'], unlock: 20 }, { k: 'belt', th: 'เข็มขัด', main: ['hp'], unlock: 0 }, { k: 'talisman', th: 'เครื่องราง', main: ['elem'], unlock: 30 },
    { k: 'brooch', th: 'เข็มกลัด', main: ['pvpDmg', 'pvpDef'], unlock: 40 }, { k: 'cloak', th: 'ผ้าคลุม', main: ['cdr', 'spd'], unlock: 50 }
  ];
  D.RELIC_SLOT = { k: 'relic', th: 'Relic' };
  D.ALL_SLOTS = [...D.GEAR_SLOTS, ...D.ACC_SLOTS, D.RELIC_SLOT];
  D.SLOT = {}; D.ALL_SLOTS.forEach(s => (D.SLOT[s.k] = s));
  D.SUB_POOL = ['atk', 'def', 'hp', 'crit', 'critDmg', 'aspd', 'cdr', 'spd', 'ls', 'dr', 'ccRes', 'atkP', 'defP', 'hpP', 'elem', 'regen'];
  D.WEAPON_TH = { sword: 'ดาบ', mace: 'กระบองและโล่', axe: 'ขวาน', hammer: 'ค้อน', staff: 'ไม้เท้า', orb: 'ลูกแก้ว', scythe: 'เคียว', book: 'คัมภีร์', daggers: 'มีดคู่', blades: 'ดาบคู่', bow: 'ธนู', rifle: 'ปืนยาว', wrench: 'ประแจกล', fists: 'สนับมือ', spear: 'หอก', hourglass: 'นาฬิกาทราย', tome: 'ตำราอสูร', starbow: 'ธนูดารา', greatsword: 'ดาบใหญ่ห้วงลึก', prism: 'คทาปริซึม', lurerod: 'คันเบ็ดเงา', halospear: 'หอกรัศมี', demonclaw: 'กรงเล็บปีศาจ', scepter: 'คทาเทพ', jesterstick: 'ไม้ตัวตลก', trickstaff: 'คทากลลวง' };
  D.SLOT_NAMES = { offhand: 'Guard', head: 'Helm', chest: 'Armor', gloves: 'Gauntlets', legs: 'Greaves', boots: 'Boots', necklace: 'Pendant', earring1: 'Earring', earring2: 'Earring', ring1: 'Ring', ring2: 'Ring', bracelet: 'Bracelet', belt: 'Belt', talisman: 'Talisman', brooch: 'Brooch', cloak: 'Cloak' };
  D.TIER_PREFIX = ['Worn', 'Sturdy', 'Azure', 'Vortex', 'Blazing', 'Crimson', 'Elder', 'Seraphic', 'Starforged', 'Genesis'];
  D.GEAR_SETS = [
    { k: 'warlord_g', n: 'Warlord', b3: { atkP: 8 }, b6: { atkP: 12, crit: 8 } }, { k: 'bulwark', n: 'Bulwark', b3: { defP: 12 }, b6: { hpP: 15, dr: 6 } },
    { k: 'tempest', n: 'Tempest', b3: { aspd: 10 }, b6: { cdr: 10, aspd: 10 } }, { k: 'sanguine', n: 'Sanguine', b3: { ls: 4 }, b6: { ls: 6, atkP: 8 } },
    { k: 'arcanist', n: 'Arcanist', b3: { elem: 10 }, b6: { elem: 15, critDmg: 20 } }, { k: 'gladiator', n: 'Gladiator', b3: { pvpDmg: 5 }, b6: { pvpDef: 8, pvpDmg: 5 } }
  ];
  D.ACC_SETS = [
    { k: 'storm', n: 'Storm Chain', b2: { aspd: 8 }, b4: { fx: 'freecast' }, b6: { fx: 'autobolt' }, th: ['ความเร็วร่าย +8%', 'สกิลมีโอกาส 15% ไม่ใช้ทรัพยากร', 'สแปมครบ 5 สกิล ปล่อยสายฟ้าอัตโนมัติ'] },
    { k: 'blood', n: 'Blood Oath', b2: { ls: 4 }, b4: { fx: 'lowhp' }, b6: { fx: 'killheal' }, th: ['ดูดเลือด +4%', 'HP < 30% ได้ ATK +20%', 'ฆ่าผู้เล่นได้ ฟื้น HP 25%'] },
    { k: 'iron', n: 'Iron Bastion', b2: { dr: 6 }, b4: { fx: 'ccshield' }, b6: { fx: 'ccimmune' }, th: ['ลดดาเมจ +6%', 'โดน CC ได้โล่ 10% HP', 'ต้าน CC ครั้งแรกทุก 20 วิ'] },
    { k: 'phantom', n: 'Phantom Step', b2: { spd: 10 }, b4: { fx: 'blinkstealth' }, b6: { fx: 'stealthcrit' }, th: ['ความเร็ววิ่ง +10%', 'หลบ/วาร์ปแล้วล่องหน 1 วิ', 'ออกจากล่องหน คริแน่นอน'] },
    { k: 'warlord', n: 'Warlord Crest', b2: { pvpDmg: 5 }, b4: { fx: 'siegebuff' }, b6: { fx: 'capture' }, th: ['ดาเมจในกิลด์วอร์ +5%', 'ใกล้ธงกิลด์ ATK/DEF +10%', 'ยึดธงเร็วขึ้น 25%'] },
    { k: 'crown', n: 'Elemental Crown', b2: { elem: 8 }, b4: { elem: 10 }, b6: { elem: 15, critDmg: 15 }, th: ['ดาเมจธาตุ +8%', 'ดาเมจธาตุ +10%', 'ดาเมจธาตุ +15% แรงคริ +15%'] }
  ];
  D.RELICS = [
    { k: 'phoenix', n: 'Phoenix Feather', th: 'ตายแล้วฟื้นคืนชีพ 30% HP (คูลดาวน์ 120 วิ)' },
    { k: 'fang', n: 'Dodge Fang', th: 'หลบ/วาร์ปสำเร็จ สกิลถัดไปคริแน่นอน' },
    { k: 'echo', n: 'Echo Bell', th: 'มีโอกาส {v}% ที่สกิลจะร่ายซ้ำอัตโนมัติ', v: [6, 7, 8, 9, 10, 11, 12, 13, 14, 16] },
    { k: 'chalice', n: 'Vampire Chalice', th: 'ดูดเลือด +{v}%', v: [2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 7], stat: 'ls' },
    { k: 'titan', n: 'Titan Heart', th: 'HP +{v}%', v: [5, 6, 7, 8, 9, 10, 11, 12, 14, 16], stat: 'hpP' },
    { k: 'stormeye', n: 'Storm Eye', th: 'ร่ายครบ 8 สกิล ปล่อยฟ้าผ่าใส่ศัตรูใกล้สุด' },
    { k: 'gear', n: 'Time Gear', th: 'ลดคูลดาวน์ +{v}%', v: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12], stat: 'cdr' },
    { k: 'banner', n: 'Warlord Banner', th: 'ดาเมจ PvP +{v}%', v: [2, 3, 4, 5, 6, 7, 8, 9, 10, 12], stat: 'pvpDmg' }
  ];
  D.T10_AFFIX = [
    { k: 'nocd', th: 'ใช้สกิลครบ 10 ครั้งใน 5 วิ สกิลถัดไปไม่มีคูลดาวน์' },
    { k: 'nova', th: 'คริติคอลมีโอกาส 10% ปล่อยคลื่นระเบิดรอบตัว 200% ATK' },
    { k: 'guard', n: '', th: 'HP ต่ำกว่า 20% ได้โล่ 30% HP (ทุก 30 วิ)' }
  ];

  // ---------- runes ----------
  D.RUNE_COLORS = { red: { th: 'แดง (โจมตี)', c: '#ff5a5a', main: ['atk', 'crit', 'critDmg', 'atkP'] }, blue: { th: 'น้ำเงิน (ป้องกัน)', c: '#5aa0ff', main: ['hp', 'def', 'dr', 'ccRes', 'hpP'] }, green: { th: 'เขียว (เทคนิค)', c: '#5ad070', main: ['cdr', 'aspd', 'spd', 'regen'] }, core: { th: 'แกน (พิเศษ)', c: '#ffd84a', main: [] } };
  D.RUNE_BOARD = [{ c: 'red', lv: 10 }, { c: 'red', lv: 30 }, { c: 'blue', lv: 50 }, { c: 'blue', lv: 70 }, { c: 'green', lv: 90 }, { c: 'green', lv: 110 }, { c: 'core', lv: 150 }];
  D.RUNE_SETS = [
    { k: 'bloodlust', n: 'Bloodlust', b2: { ls: 3 }, b4: { ls: 8 } }, { k: 'fury', n: 'Fury', b2: { atkP: 6 }, b4: { crit: 12 } },
    { k: 'bastion', n: 'Bastion', b2: { defP: 10 }, b4: { dr: 8 } }, { k: 'swift', n: 'Swift', b2: { spd: 8 }, b4: { aspd: 15 } },
    { k: 'arcane', n: 'Arcane', b2: { cdr: 5 }, b4: { cdr: 10 } }, { k: 'warlord_r', n: 'Warlord (PvP)', b2: { pvpDmg: 5 }, b4: { pvpDef: 8 }, pvp: true }
  ];
  D.CORE_RUNES = [
    { k: 'reaper', n: 'Reaper Core', th: 'ฆ่าศัตรูแล้วรีเซ็ตคูลดาวน์ทุกสกิล (ทุก 10 วิ)' },
    { k: 'overload', n: 'Overload Core', th: 'ทุกสกิลที่ 5 ไม่มีคูลดาวน์' },
    { k: 'vampire', n: 'Vampire Core', th: 'ดูดเลือด +10%' },
    { k: 'berserk', n: 'Berserk Core', th: 'ATK +1% ต่อ HP ที่หายไป 1%' },
    { k: 'echo', n: 'Echo Core', th: 'สกิลมีโอกาส 20% ร่ายซ้ำ' },
    { k: 'aegis', n: 'Aegis Core', th: 'ขณะมีโล่ รับดาเมจลดลง 15%' }
  ];
  D.GEMS = [
    { k: 'ruby', n: 'Ruby', th: 'ทับทิม', stat: 'atk', c: '#ff4a5a' }, { k: 'sapphire', n: 'Sapphire', th: 'ไพลิน', stat: 'def', c: '#4a7aff' },
    { k: 'emerald', n: 'Emerald', th: 'มรกต', stat: 'hp', c: '#4ad070' }, { k: 'topaz', n: 'Topaz', th: 'บุษราคัม', stat: 'crit', c: '#ffd04a' },
    { k: 'amethyst', n: 'Amethyst', th: 'อเมทิสต์', stat: 'aspd', c: '#b04aff' }, { k: 'diamond', n: 'Diamond', th: 'เพชร', stat: 'atkP', c: '#e0f8ff' }
  ];

  // ---------- fashion ----------
  D.FASHION_SLOTS = [
    { k: 'f_head', th: 'หมวก/ผม' }, { k: 'f_body', th: 'ชุด' }, { k: 'f_weapon', th: 'สกินอาวุธ' }, { k: 'f_wings', th: 'ปีก' }, { k: 'f_aura', th: 'ออร่า' },
    { k: 'f_crown', th: 'ที่คาดผม/มงกุฎ' }, { k: 'f_mask', th: 'หน้ากาก/แว่น' }, { k: 'f_back', th: 'ของติดหลัง' }, { k: 'f_float', th: 'ของลอยข้างตัว' },
    { k: 'f_trail', th: 'รอยเท้าตอนเดิน' }, { k: 'f_frame', th: 'กรอบชื่อ' }
  ];
  D.FASHION_THEMES = [
    { n: 'Dragon Knight', th: 'อัศวินมังกร', c: ['#b0303a', '#e8b04a'] }, { n: 'Samurai', th: 'ซามูไร', c: ['#2a3a6a', '#e04a4a'] },
    { n: 'Demon Lord', th: 'เจ้าปีศาจ', c: ['#3a1030', '#ff4ad0'] }, { n: 'Ice Queen', th: 'ราชินีน้ำแข็ง', c: ['#bff4ff', '#4a8aff'] },
    { n: 'Celestial', th: 'สวรรค์', c: ['#fff6d0', '#8ad8ff'] }, { n: 'Pirate', th: 'โจรสลัด', c: ['#5a3a20', '#e8d08a'] },
    { n: 'Neon Runner', th: 'นีออน', c: ['#1a1a2a', '#4affd8'] }, { n: 'Sakura', th: 'ซากุระ', c: ['#ffd0e0', '#ff7ab0'] },
    { n: 'Pharaoh', th: 'ฟาโรห์', c: ['#f0e0a0', '#2a8ab0'] }, { n: 'Void Walker', th: 'ผู้เดินในความว่าง', c: ['#20103a', '#9a4aff'] }
  ];
  D.DYES = ['#e8e4d8', '#2a2a32', '#b0303a', '#ff7a3a', '#e8c04a', '#5fd068', '#2a8a5a', '#4ad6c8', '#4a8aff', '#2a3a8a', '#b06cff', '#ff7ab0', '#8a5a3a', '#a0a8c0', '#ffd84a', '#9ff4ff'];

  // pets & mounts
  D.PETS = [
    { k: 'slime', n: 'Pudding Slime', th: 'สไลม์พุดดิ้ง', bonus: { drop: 3 }, c: '#7fd36a', body: 'slime' },
    { k: 'fox', n: 'Ember Fox', th: 'จิ้งจอกถ่าน', bonus: { gold: 5 }, c: '#ff8a3a', body: 'beast' },
    { k: 'owl', n: 'Sage Owl', th: 'นกฮูกปราชญ์', bonus: { xp: 5 }, c: '#c8b08a', body: 'bat' },
    { k: 'drake', n: 'Baby Drake', th: 'มังกรน้อย', bonus: { atkP: 3 }, c: '#b04aff', body: 'dragon' }
  ];
  D.MOUNTS = [
    { k: 'horse', n: 'Warhorse', th: 'ม้าศึก', spd: 40, c: '#8a5a3a' }, { k: 'wolf', n: 'Dire Wolf', th: 'หมาป่ายักษ์', spd: 50, c: '#6a6a7a' },
    { k: 'griffin', n: 'Griffin', th: 'กริฟฟิน', spd: 60, c: '#e8c04a' }, { k: 'warmount', n: 'War Rhino', th: 'แรดศึก (War Mount)', spd: 45, c: '#7a7a6a', war: true }
  ];

  // ---------- monsters / farm maps ----------
  D.GRADES = {
    normal: { th: 'ปกติ', hp: 1, atk: 1, sc: 1, col: '#f0ece0', drop: 0.08, bonus: 0, xp: 1 },
    elite: { th: 'Elite', hp: 5, atk: 1.5, sc: 1.15, col: '#ffe04a', drop: 0.30, bonus: 1, xp: 4 },
    champion: { th: 'Champion', hp: 15, atk: 2, sc: 1.45, col: '#ff9a2e', drop: 1, n: 1, bonus: 2, xp: 12 },
    rare: { th: 'Rare Spawn', hp: 20, atk: 2.2, sc: 1.35, col: '#c07aff', drop: 1, n: 2, bonus: 2, xp: 15 },
    boss: { th: 'Map Boss', hp: 60, atk: 3, sc: 2.1, col: '#ff4d4d', drop: 1, n: 3, bonus: 3, xp: 50, boss: true },
    world: { th: 'World Boss', hp: 320, atk: 4, sc: 3.2, col: '#ff4af0', drop: 1, n: 4, bonus: 4, xp: 250, boss: true }
  };
  const M = (n, body, c, c2, ranged) => ({ n, body, c, c2: c2 || U_sh(c), ranged: !!ranged });
  function U_sh(c) { return G.U.shade(c, -0.35); }
  D.MAX_LV = 250;
  D.FARM_MAPS = [
    { id: 'meadow', n: 'Meadow', th: 'ทุ่งหญ้าเมโดว์', lv: [1, 12], B: 1, g: ['#5f9e4a', '#6aab52'], acc: '#3e7a32', block: 'water', props: ['tree', 'flower', 'rock', 'bush'],
      mobs: [M('Slime', 'slime', '#7fd36a'), M('Wild Boar', 'beast', '#9a6a4a'), M('Bumble Bat', 'bat', '#e8c04a')], champ: M('King Slime', 'slime', '#4ad0a0'), rare: M('Golden Rabbit', 'beast', '#ffd84a'), boss: M('Meadow Treant', 'plant', '#6a8a3a'), world: M('Slime Emperor', 'slime', '#ff7ab0') },
    { id: 'dunes', n: 'Dune Wastes', th: 'ทะเลทรายดูน', lv: [13, 25], B: 1, g: ['#d9b56a', '#e3c27a'], acc: '#b08a4a', block: 'none', props: ['cactus', 'rock', 'bones', 'pillar'],
      mobs: [M('Sand Scorpion', 'beast', '#c08a3a'), M('Dust Imp', 'imp', '#d0a060', 0, 1), M('Mummy', 'skeleton', '#e0d0a8')], champ: M('Sand Golem', 'golem', '#c8a060'), rare: M('Desert Djinn', 'elemental', '#4ad6c8', 0, 1), boss: M('Pharaoh Lich', 'skeleton', '#e8c04a', 0, 1), world: M('Colossal Sandworm', 'dragon', '#b08050') },
    { id: 'forest', n: 'Whispering Forest', th: 'ป่ากระซิบ', lv: [26, 37], B: 2, g: ['#2f6b3a', '#377a43'], acc: '#1d4a26', block: 'water', props: ['pine', 'mushroom', 'bush', 'tree'],
      mobs: [M('Thorn Sprite', 'plant', '#5ab84a', 0, 1), M('Dire Wolf', 'beast', '#6a6a7a'), M('Forest Bat', 'bat', '#4a3a5a')], champ: M('Elder Ent', 'plant', '#3a6a2a'), rare: M('Moon Stag', 'beast', '#d8e8ff'), boss: M('Witch of Thorns', 'imp', '#7a3a8a', 0, 1), world: M('Forest Wyrm', 'dragon', '#3a8a3a') },
    { id: 'swamp', n: 'Rust Swamp', th: 'หนองสนิม', lv: [38, 50], B: 2, g: ['#4a5a3a', '#55673f'], acc: '#3a4a2a', block: 'water', props: ['deadtree', 'mushroom', 'rock', 'bones'],
      mobs: [M('Bog Slime', 'slime', '#7a8a3a'), M('Rust Golem', 'golem', '#a05a3a'), M('Swamp Ghoul', 'skeleton', '#8aa07a')], champ: M('Mire Hydra', 'dragon', '#5a7a4a'), rare: M('Toxic Toad', 'slime', '#b8ff4a'), boss: M('Rusted Colossus', 'golem', '#8a4a2a'), world: M('Plague Dragon', 'dragon', '#6a8a2a') },
    { id: 'tundra', n: 'Frost Tundra', th: 'ทุ่งน้ำแข็ง', lv: [51, 62], B: 2, g: ['#cfe3ee', '#dcedf6'], acc: '#9ac0d8', block: 'water', props: ['icespike', 'pine', 'rock', 'crystal'],
      mobs: [M('Frost Wolf', 'beast', '#c8e0f0'), M('Ice Elemental', 'elemental', '#8ad8ff', 0, 1), M('Yeti', 'golem', '#f0f0f8')], champ: M('Frost Giant', 'golem', '#8ab0d8'), rare: M('Crystal Fox', 'beast', '#bff4ff'), boss: M('Ice Queen', 'knight', '#9ad8ff', 0, 1), world: M('Glacial Wyrm', 'dragon', '#8ad0ff') },
    { id: 'volcano', n: 'Ash Volcano', th: 'ภูเขาไฟเถ้าถ่าน', lv: [63, 75], B: 3, g: ['#4a3030', '#563838'], acc: '#2a1a1a', block: 'lava', props: ['lavarock', 'deadtree', 'rock', 'crystal'],
      mobs: [M('Magma Slime', 'slime', '#ff6a2a'), M('Fire Imp', 'imp', '#ff4a2a', 0, 1), M('Lava Golem', 'golem', '#8a3a2a')], champ: M('Inferno Knight', 'knight', '#c03a1a'), rare: M('Phoenix Chick', 'bat', '#ffb347'), boss: M('Magma Lord', 'golem', '#ff5a1f'), world: M('Volcanic Dragon', 'dragon', '#c02a1a') },
    { id: 'ruins', n: 'Sunken Ruins', th: 'ซากเมืองจมน้ำ', lv: [76, 87], B: 3, g: ['#3a6a7a', '#457888'], acc: '#2a4a5a', block: 'water', props: ['pillar', 'coral', 'rock', 'bones'],
      mobs: [M('Drowned Skeleton', 'skeleton', '#9ac0c0'), M('Coral Golem', 'golem', '#ff8a8a'), M('Siren Bat', 'bat', '#4ad6c8')], champ: M('Kraken Spawn', 'dragon', '#5a4a8a'), rare: M('Pearl Elemental', 'elemental', '#f0f0ff', 0, 1), boss: M('Leviathan Knight', 'knight', '#2a8ab0'), world: M('Abyssal Kraken', 'dragon', '#3a2a6a') },
    { id: 'sky', n: 'Sky Islands', th: 'เกาะลอยฟ้า', lv: [88, 100], B: 3, g: ['#9ad08a', '#a8dc96'], acc: '#e8f6ff', block: 'void', props: ['cloud', 'tree', 'crystal', 'pillar'],
      mobs: [M('Wind Sprite', 'elemental', '#d0fff0', 0, 1), M('Harpy', 'bat', '#c8a8e0'), M('Sky Knight', 'knight', '#e8e8f8')], champ: M('Storm Griffin', 'beast', '#e8c04a'), rare: M('Cloud Whale', 'slime', '#e8f6ff'), boss: M('Tempest Lord', 'elemental', '#9ad7ff', 0, 1), world: M('Sky Dragon', 'dragon', '#8ad8ff') },
    { id: 'void', n: 'Shattered Void', th: 'ความว่างแตกสลาย', lv: [101, 112], B: 4, g: ['#2a2040', '#33284d'], acc: '#140c24', block: 'void', props: ['crystal', 'pillar', 'rock', 'bones'],
      mobs: [M('Void Wraith', 'skeleton', '#9a7aff'), M('Void Imp', 'imp', '#6a4aff', 0, 1), M('Shard Golem', 'golem', '#7a5aaa')], champ: M('Void Reaver', 'knight', '#4a2a8a'), rare: M('Star Eater', 'elemental', '#ffd8ff', 0, 1), boss: M('Void Archon', 'knight', '#b04aff', 0, 1), world: M('Void Leviathan', 'dragon', '#5a2aaa') },
    { id: 'abyss', n: 'Abyssal Rift', th: 'รอยแยกนรก', lv: [113, 125], B: 4, g: ['#2a141c', '#341a24'], acc: '#0e0608', block: 'lava', props: ['lavarock', 'bones', 'pillar', 'crystal'],
      mobs: [M('Abyss Demon', 'imp', '#c02a3a'), M('Bone Dragonling', 'dragon', '#e0d8c8'), M('Abyss Knight', 'knight', '#5a1a2a')], champ: M('Rift Titan', 'golem', '#5a2a3a'), rare: M('Abyss Phoenix', 'bat', '#ff4a2a'), boss: M('Rift Overlord', 'knight', '#ff2a4a', 0, 1), world: M('Primordial Dragon', 'dragon', '#ff4af0') },
    { id: 'jade', n: 'Jade Highlands', th: 'ที่ราบสูงหยก', lv: [126, 137], B: 5, g: ['#5aa880', '#66b48c'], acc: '#3a7a5a', block: 'water', props: ['pine', 'crystal', 'rock', 'flower'],
      mobs: [M('Jade Golem', 'golem', '#4ac88a'), M('Crane Spirit', 'bat', '#e8f0f0'), M('Bamboo Panda', 'beast', '#f0f0f0')], champ: M('Jade Dragon', 'dragon', '#2aa86a'), rare: M('Lucky Koi', 'slime', '#ff9a4a'), boss: M('Celestial Monk', 'knight', '#e8c04a'), world: M('Jade Emperor Wyrm', 'dragon', '#4affb0') },
    { id: 'canyon', n: 'Crimson Canyon', th: 'หุบเขาสีเลือด', lv: [138, 150], B: 5, g: ['#8a3a2a', '#9a4532'], acc: '#5a2418', block: 'none', props: ['rock', 'cactus', 'bones', 'pillar'],
      mobs: [M('Blood Hound', 'beast', '#a02a2a'), M('Canyon Harpy', 'bat', '#c86a4a'), M('Red Golem', 'golem', '#b03a2a')], champ: M('Canyon Behemoth', 'golem', '#7a2a1a'), rare: M('Ruby Lizard', 'beast', '#ff4a6a'), boss: M('Bloodfang Warlord', 'knight', '#c02a2a'), world: M('Crimson Wyvern', 'dragon', '#e02a3a') },
    { id: 'mirror', n: 'Mirror Lake', th: 'ทะเลสาบกระจก', lv: [151, 162], B: 5, g: ['#7aa8c8', '#86b4d4'], acc: '#4a7898', block: 'water', props: ['crystal', 'tree', 'rock', 'coral'],
      mobs: [M('Mirror Slime', 'slime', '#c8e8ff'), M('Lake Wisp', 'elemental', '#9ae8ff', 0, 1), M('Reflection Knight', 'knight', '#d0e0f0')], champ: M('Twin Mirror Golem', 'golem', '#a8c8e8'), rare: M('Silver Swan', 'bat', '#ffffff'), boss: M('Lady of the Lake', 'knight', '#8ad8ff', 0, 1), world: M('Mirror Leviathan', 'dragon', '#b8e8ff') },
    { id: 'clockwork', n: 'Clockwork City', th: 'นครจักรกล', lv: [163, 175], B: 6, g: ['#6a6058', '#766c62'], acc: '#4a4038', block: 'none', props: ['pillar', 'rock', 'crystal', 'bones'],
      mobs: [M('Cog Golem', 'golem', '#b0905a'), M('Brass Bat', 'bat', '#d8a850'), M('Steam Imp', 'imp', '#c8a070', 0, 1)], champ: M('Gear Titan', 'golem', '#8a7050'), rare: M('Golden Automaton', 'knight', '#ffd84a'), boss: M('Chrono Engine', 'golem', '#4ae0ff', 0, 1), world: M('Mecha Dragon', 'dragon', '#a8a8b8') },
    { id: 'fungal', n: 'Fungal Depths', th: 'ถ้ำเห็ดลึก', lv: [176, 187], B: 6, g: ['#3a2a4a', '#45345a'], acc: '#24182e', block: 'water', props: ['mushroom', 'rock', 'crystal', 'bones'],
      mobs: [M('Spore Slime', 'slime', '#c86aff'), M('Myconid', 'plant', '#e86ab0'), M('Cave Bat', 'bat', '#5a4a6a')], champ: M('Fungal Colossus', 'plant', '#9a4ac8'), rare: M('Glowcap Sprite', 'elemental', '#7affd8', 0, 1), boss: M('Mother Spore', 'plant', '#ff6ad8', 0, 1), world: M('Mycelium Wyrm', 'dragon', '#b84aff') },
    { id: 'thunder', n: 'Thunder Peaks', th: 'ยอดเขาสายฟ้า', lv: [188, 200], B: 7, g: ['#5a6a7a', '#667686'], acc: '#3a4a5a', block: 'void', props: ['rock', 'icespike', 'pillar', 'crystal'],
      mobs: [M('Storm Elemental', 'elemental', '#e8f04a', 0, 1), M('Thunder Hawk', 'bat', '#6a8aff'), M('Rock Giant', 'golem', '#7a8090')], champ: M('Thunder Roc', 'beast', '#ffe04a'), rare: M('Spark Ferret', 'beast', '#fff8a0'), boss: M('Storm Titan', 'knight', '#4a8aff', 0, 1), world: M('Thunder Dragon', 'dragon', '#ffe84a') },
    { id: 'bonedesert', n: 'Bone Desert', th: 'ทะเลทรายกระดูก', lv: [201, 212], B: 7, g: ['#c8b890', '#d4c49c'], acc: '#a08a68', block: 'none', props: ['bones', 'cactus', 'rock', 'pillar'],
      mobs: [M('Bone Hound', 'beast', '#e8e0c8'), M('Desert Lich', 'skeleton', '#c8b8a0', 0, 1), M('Scarab Swarm', 'imp', '#3a6a8a')], champ: M('Bone Colossus', 'golem', '#e0d8c0'), rare: M('Golden Scarab', 'imp', '#ffd84a'), boss: M('Sand King', 'skeleton', '#e8c04a', 0, 1), world: M('Skeletal Wyrm', 'dragon', '#f0e8d8') },
    { id: 'gardens', n: 'Celestial Gardens', th: 'สวนสวรรค์', lv: [213, 225], B: 8, g: ['#a8d8a0', '#b4e4ac'], acc: '#7ab070', block: 'water', props: ['flower', 'tree', 'cloud', 'crystal'],
      mobs: [M('Seraph Sprite', 'elemental', '#fff6c0', 0, 1), M('Halo Hound', 'beast', '#f0f0ff'), M('Garden Guardian', 'knight', '#e8d8a0')], champ: M('Archon', 'golem', '#fff0b0'), rare: M('Rainbow Moth', 'bat', '#ff9ae8'), boss: M('Celestial Warden', 'knight', '#ffe680', 0, 1), world: M('Heavenly Qilin', 'dragon', '#ffd8a0') },
    { id: 'nightmare', n: 'Nightmare Realm', th: 'ดินแดนฝันร้าย', lv: [226, 237], B: 8, g: ['#2a1a2a', '#341f34'], acc: '#160c16', block: 'void', props: ['deadtree', 'bones', 'crystal', 'pillar'],
      mobs: [M('Nightmare Imp', 'imp', '#ff4ab0', 0, 1), M('Shade Hound', 'beast', '#3a2a4a'), M('Dread Knight', 'knight', '#4a1a3a')], champ: M('Nightmare Titan', 'golem', '#3a1a3a'), rare: M('Dream Eater', 'slime', '#c8a0ff'), boss: M('Lord of Nightmares', 'knight', '#ff2ad8', 0, 1), world: M('Nightmare Dragon', 'dragon', '#8a2aff') },
    { id: 'creation', n: 'Edge of Creation', th: 'ขอบแห่งการสร้าง', lv: [238, 250], B: 8, g: ['#1a1a3a', '#22224a'], acc: '#0c0c24', block: 'void', props: ['crystal', 'cloud', 'pillar', 'rock'],
      mobs: [M('Genesis Wisp', 'elemental', '#ffffff', 0, 1), M('Starborn Beast', 'beast', '#9ad8ff'), M('Primordial Golem', 'golem', '#e8d8ff')], champ: M('Cosmic Titan', 'golem', '#6a4aff'), rare: M('Star Whale', 'slime', '#a8e8ff'), boss: M('Architect of Worlds', 'knight', '#ffe9a0', 0, 1), world: M('World Serpent', 'dragon', '#ff9ae8') }
  ];
  D.SPAWN_T = { champion: 600, rare: [1800, 3600], boss: 7200 }; // seconds (design values; GM can speed up)
  D.FIRST_SPAWN = { champion: 45, rare: 180, boss: 360 };

  D.TOWNS = [
    { id: 'aurelion', n: 'Aurelion', th: 'นครออเรเลียน (เมืองหลัก)', main: true },
    { id: 'haven', n: 'Haven', th: 'หมู่บ้านเฮเวน (เมืองผู้เล่นใหม่)', main: false }
  ];
  D.NPCS = {
    aurelion: [
      { role: 'quest', n: 'Commander Ilya', th: 'ภารกิจ' }, { role: 'shop', n: 'Merchant Pim', th: 'ร้านค้า' }, { role: 'smith', n: 'Blacksmith Dorn', th: 'ช่างตีเหล็ก' },
      { role: 'jeweler', n: 'Jeweler Mira', th: 'ช่างอัญมณี' }, { role: 'runesmith', n: 'Runesmith Kael', th: 'ช่างรูน' }, { role: 'tailor', n: 'Tailor Lumi', th: 'ช่างตัดเย็บ' },
      { role: 'market', n: 'Auctioneer Bo', th: 'ตลาดประมูล' }, { role: 'merc', n: 'Captain Rhea', th: 'ค่ายทหารรับจ้าง' }, { role: 'arena', n: 'Arena Master Gon', th: 'สนาม PvP' },
      { role: 'guild', n: 'Guild Herald Sol', th: 'กิลด์/ยึดปราสาท' }, { role: 'dungeon', n: 'Gatekeeper Vex', th: 'ดันเจี้ยน' }, { role: 'teleport', n: 'Waygate', th: 'วาร์ป' },
      { role: 'codex', n: 'Archivist Nel', th: 'สมุดสะสม' }, { role: 'stable', n: 'Stablemaster Tor', th: 'สัตว์เลี้ยง/พาหนะ' }
    ],
    haven: [
      { role: 'quest', n: 'Elder Wen', th: 'ภารกิจ' }, { role: 'shop', n: 'Trader Nok', th: 'ร้านค้า' }, { role: 'trainer', n: 'Trainer Ari', th: 'ครูฝึก (สนามซ้อม VFX)' },
      { role: 'teleport', n: 'Waygate', th: 'วาร์ป' }, { role: 'dungeon', n: 'Gatekeeper Ro', th: 'ดันเจี้ยน' }
    ]
  };

  // ---------- dungeons (5 x 100 floors) ----------
  D.DUNGEONS = [
    { id: 'armory', n: 'Armory Depths', th: 'ดันเจี้ยนเกียร์', drop: 'gear', c: '#c8a050', desc: 'อาวุธ มือรอง หมวก เสื้อ ถุงมือ กางเกง รองเท้า (ดรอปตามคลาส)' },
    { id: 'sanctum', n: 'Rune Sanctum', th: 'ดันเจี้ยนรูน', drop: 'rune', c: '#b06cff', desc: 'รูนแผง รูนแกน รูนสกิล และ Rune Dust' },
    { id: 'vault', n: 'Treasure Vault', th: 'ดันเจี้ยนไอเทม', drop: 'item', c: '#ffd84a', desc: 'ยา สกรอล เจม หินตีบวก วัตถุดิบ' },
    { id: 'jewel', n: 'Jewel Abyss', th: 'ดันเจี้ยนของสวมใส่', drop: 'jewel', c: '#4ad6c8', desc: 'เครื่องประดับ 10 ช่อง และ Relic (ที่นี่ที่เดียว)' }
  ];
  D.DUNGEON_DAILY_FULL = 5;

  // ---------- PvP ----------
  D.PVP_MODES = [
    { id: 'tdm', n: 'Team Deathmatch', th: 'ทีมเดธแมตช์', sizes: [3, 5, 10, 15], desc: 'ทีมแรกที่ฆ่าครบเป้าชนะ', maps: [0, 6] },
    { id: 'elim', n: 'Elimination', th: 'คัดออก', sizes: [1, 3, 5], desc: 'ไม่มีเกิดใหม่ ชนะ 3 ใน 5 รอบ', maps: [0, 5] },
    { id: 'dom', n: 'Domination', th: 'ยึดจุด', sizes: [10, 15], desc: 'ยึด 3 จุด สะสมแต้มครบ 1,000 ก่อน', maps: [2, 9] },
    { id: 'ctf', n: 'Capture the Flag', th: 'แย่งธง', sizes: [5, 10, 15], desc: 'ขโมยธงศัตรูกลับฐาน 3 ครั้ง', maps: [1] },
    { id: 'koth', n: 'King of the Hill', th: 'ราชาแห่งเนิน', sizes: [5, 10, 15], desc: 'ยืนยึดเนินกลางสะสมครบ 3 นาที', maps: [4] },
    { id: 'escort', n: 'Escort', th: 'คุ้มกันเรือ', sizes: [10, 15], desc: 'คุ้มกันเรือไปถึงท่า แล้วสลับฝั่ง', maps: [3] },
    { id: 'boss', n: 'Boss Clash', th: 'ชิงบอส', sizes: [10, 15], desc: 'ทีมที่ปิดบอสได้รับบัฟจนจบเกม + ฆ่าครบเป้า', maps: [8] },
    { id: 'war', n: 'Total War', th: 'สงครามเต็มรูปแบบ', sizes: [15], desc: 'ยึดจุด + บอส + ทำลายป้อม ถึงแต้มก่อนชนะ', maps: [9] }
  ];
  D.PVP_MAPS = [
    { id: 'colosseum', n: 'Colosseum of Ash', th: 'โคลอสเซียมเถ้าถ่าน', size: 'เล็ก', max: 5, mech: 'หนามโผล่จากพื้นทุก 30 วิ', g: ['#6a5a4a', '#75644f'] },
    { id: 'bridges', n: 'Twin Bridges', th: 'สะพานคู่', size: 'กลาง', max: 15, mech: 'ผลักศัตรูตกเหว = ตายทันที', g: ['#5a6a5a', '#647462'] },
    { id: 'valley', n: 'Crystal Valley', th: 'หุบเขาคริสตัล', size: 'ใหญ่', max: 15, mech: 'ผลึกที่จุดยึดให้บัฟผู้ครอง', g: ['#4a6a8a', '#527494'] },
    { id: 'harbor', n: 'Sunken Harbor', th: 'ท่าเรือจม', size: 'ใหญ่', max: 15, mech: 'ลังสินค้าใช้บังกระสุน', g: ['#6a5a3a', '#756442'] },
    { id: 'spire', n: 'Frost Spire', th: 'หอน้ำแข็ง', size: 'กลาง', max: 15, mech: 'พื้นน้ำแข็งลื่น วิ่งไถล', g: ['#cfe3ee', '#dcedf6'] },
    { id: 'jungle', n: 'Jungle Temple', th: 'วิหารป่าดิบ', size: 'กลาง', max: 15, mech: 'หมอกจำกัดการมองเห็น พุ่มไม้ซ่อนตัว', g: ['#2f5a2a', '#376630'] },
    { id: 'skyarena', n: 'Sky Arena', th: 'สนามลอยฟ้า', size: 'กลาง', max: 15, mech: 'แพลตฟอร์มสลับตำแหน่งทุก 60 วิ', g: ['#8a9ab8', '#95a5c2'] },
    { id: 'rift', n: 'Volcanic Rift', th: 'รอยแยกภูเขาไฟ', size: 'กลาง', max: 15, mech: 'ลาวาขึ้น พื้นที่ปลอดภัยหดลง', g: ['#4a3030', '#563838'] },
    { id: 'graveyard', n: "Dragon's Graveyard", th: 'สุสานมังกร', size: 'ใหญ่', max: 15, mech: 'มังกรกระดูกเกิดกลางแผนที่นาทีที่ 3', g: ['#5a5048', '#655a50'] },
    { id: 'grand', n: 'Grand Battlefield', th: 'สมรภูมิใหญ่', size: 'ใหญ่มาก', max: 15, mech: '3 เลน จุดยึด ป้อม บอส อาวุธปิดล้อม', g: ['#557a3a', '#5f8642'] }
  ];
  D.DIFFS = [
    { th: 'ง่าย', cp: 0.8, react: 0.8, dodge: 0.10, smart: 0, team: 0, reward: 0.5, pct: 0.30, chest: 0 },
    { th: 'ปกติ', cp: 1.0, react: 0.5, dodge: 0.25, smart: 1, team: 1, reward: 0.8, pct: 0.40, chest: 0 },
    { th: 'ยาก', cp: 1.15, react: 0.35, dodge: 0.40, smart: 2, team: 2, reward: 1.0, pct: 0.50, chest: 0 },
    { th: 'นรก', cp: 1.3, react: 0.25, dodge: 0.55, smart: 3, team: 3, reward: 1.3, pct: 0.55, chest: 6 },
    { th: 'ตำนาน', cp: 1.5, react: 0.15, dodge: 0.70, smart: 4, team: 4, reward: 1.6, pct: 0.60, chest: 7 }
  ];
  D.MERC_RANKS = [
    { th: 'Recruit', need: 0, ai: 1 }, { th: 'Veteran', need: 20, ai: 2 }, { th: 'Elite', need: 60, ai: 3 }, { th: 'Legend', need: 150, ai: 4 }
  ];
  D.PERSONAS = [{ k: 'bold', th: 'บ้าบิ่น' }, { k: 'careful', th: 'รอบคอบ' }, { k: 'guard', th: 'ผู้พิทักษ์' }];
  D.COMMANDS = [{ k: 'follow', th: 'ตามฉัน' }, { k: 'attack', th: 'บุก' }, { k: 'defend', th: 'ตั้งรับ' }, { k: 'focus', th: 'โฟกัสเป้า' }, { k: 'rally', th: 'รวมพล' }, { k: 'free', th: 'อิสระ' }];

  // ---------- Guild siege ----------
  D.CASTLES = [
    { n: 'Border Fort', th: 'ป้อมชายแดน', perk: { spd: 5 }, perkTh: 'ความเร็ววิ่ง +5%', g: ['#6a8a4a', '#759652'] },
    { n: 'Canyon Keep', th: 'ปราสาทหุบเขา', perk: { siege: 20 }, perkTh: 'อาวุธปิดล้อมถูกลง 20%', g: ['#8a6a4a', '#957452'] },
    { n: 'Lake Citadel', th: 'ป้อมทะเลสาบ', perk: { regen: 30 }, perkTh: 'ฟื้น HP นอกการต่อสู้เร็วขึ้น', g: ['#4a7a8a', '#528694'] },
    { n: 'Volcanic Bastion', th: 'ป้อมภูเขาไฟ', perk: { atkP: 5 }, perkTh: 'ดาเมจ +5%', g: ['#5a3a30', '#664238'] },
    { n: 'Royal Palace', th: 'พระราชวัง', perk: {}, perkTh: 'ยึดได้ = ชนะทั้งศึก', g: ['#7a7a8a', '#858596'] }
  ];
  D.LEAGUES = [
    { n: 'Bronze', min: 0, L: 4, c: '#c08050' }, { n: 'Silver', min: 1100, L: 5, c: '#c8d0d8' }, { n: 'Gold', min: 1250, L: 6, c: '#ffd84a' },
    { n: 'Platinum', min: 1400, L: 7, c: '#7ae8d8' }, { n: 'Diamond', min: 1550, L: 8, c: '#8ac8ff' }, { n: 'Master', min: 1700, L: 9, c: '#d08aff' }, { n: 'Grandmaster', min: 1850, L: 9, c: '#ff7a7a', gm: true }
  ];
  D.leagueOf = r => { let l = D.LEAGUES[0]; for (const x of D.LEAGUES) if (r >= x.min) l = x; return l; };
  D.SIEGE_ITEMS = {
    atk: [{ k: 'ram', th: 'Battering Ram', cost: 60, d: 'พังประตูเร็ว' }, { k: 'catapult', th: 'Catapult', cost: 90, d: 'ยิงประตู/หอคอยจากระยะไกล' }, { k: 'totem', th: 'War Totem', cost: 50, d: 'บัฟ ATK/DEF +10% ในพื้นที่' }],
    def: [{ k: 'repair', th: 'ซ่อมประตู', cost: 50, d: 'ประตูฟื้น 30%' }, { k: 'ballista', th: 'Ballista', cost: 80, d: 'หอคอยยิงเพิ่ม 1 ป้อม' }, { k: 'totem', th: 'War Totem', cost: 50, d: 'บัฟ ATK/DEF +10% ในพื้นที่' }]
  };

  // ---------- names ----------
  D.NAMES = ['Kaito', 'Lunara', 'Draven', 'Mook', 'Sora', 'Pang', 'Elric', 'Yuna', 'Ragnar', 'Fah', 'Zed', 'Nami', 'Thorne', 'Bam', 'Kira', 'Orin', 'Tonkla', 'Vex', 'Ploy', 'Ash',
    'Nova', 'Bank', 'Rin', 'Garrick', 'Mint', 'Jinx', 'Arthit', 'Selene', 'Pete', 'Kuro', 'Ivy', 'Boss', 'Mew', 'Lyra', 'Ton', 'Hikaru', 'Grim', 'Prim', 'Ozzy', 'Fern',
    'Aiko', 'Brutus', 'Kwan', 'Nyx', 'Jet', 'Saber', 'Ice', 'Golf', 'Toto', 'Raven'];
  D.GUILD_NAMES = ['Crimson Oath', 'Night Lotus', 'Iron Wolves', 'Sky Reapers', 'Moonfang', 'Ashborn', 'Golden Tide', 'Void Pact', 'Storm Crows', 'Sakura Blade', 'Black Sun', 'Frost Crown'];
  D.CHAT = ['ใครไปดันชั้น 50 บ้าง', 'ขาย Epic แหวน iLv40 ทักมา', 'กิลด์ Crimson Oath รับสมาชิก!', 'World Boss เกิดยังครับ', 'เพิ่งได้ Mythic ชั้น 47 ดีใจมาก', 'หาตี้ Jewel Abyss 3 คน',
    'Pyro สแปมมันสุดในเกมนี้แล้ว', 'ยึดปราสาทคืนนี้สามทุ่ม เตรียมตัว', 'ใครมีรูน Split ของ Fireball ขายไหม', 'ตีบวก +10 แตกอีกแล้ว 555', 'Chronomancer หยุดเวลาโกงมาก', 'ชุดซากุระน่ารักมาก'];

  // quests
  D.MAIN_QUESTS = [];
  D.FARM_MAPS.forEach((m, i) => {
    D.MAIN_QUESTS.push({ id: 'm' + i + 'a', th: `ล่ามอนสเตอร์ใน ${m.th} 20 ตัว`, type: 'kill', map: m.id, n: 20, xp: 1, lv: m.lv[0] });
    D.MAIN_QUESTS.push({ id: 'm' + i + 'b', th: `ล่า Elite ใน ${m.th} 3 ตัว`, type: 'elite', map: m.id, n: 3, xp: 2, lv: m.lv[0] + 5 });
    D.MAIN_QUESTS.push({ id: 'm' + i + 'c', th: `ไปถึงชั้น ${Math.min(100, (i + 1) * 5)} ของดันเจี้ยนใดก็ได้`, type: 'floor', n: Math.min(100, (i + 1) * 5), xp: 3, lv: m.lv[0] + 10 });
  });
  D.DAILY_QUESTS = [
    { id: 'd1', th: 'ล่ามอนสเตอร์ 100 ตัว', type: 'kill', n: 100, gold: 3000 },
    { id: 'd2', th: 'ชนะ PvP 3 แมตช์', type: 'pvpwin', n: 3, honor: 150 },
    { id: 'd3', th: 'ผ่านดันเจี้ยนรวม 10 ชั้น', type: 'floors', n: 10, gold: 2500 },
    { id: 'd4', th: 'ปราบบอส (Champion ขึ้นไป) 1 ตัว', type: 'boss', n: 1, gold: 2000 },
    { id: 'd5', th: 'ลงศึกยึดปราสาท 1 ครั้ง', type: 'siege', n: 1, war: 100 },
    { id: 'd6', th: 'ค่าหัว: กำจัดผู้เล่นชื่อแดง 1 คน', type: 'bounty', n: 1, honor: 120 }
  ];
  D.ACHIEVEMENTS = [
    { id: 'lv50', th: 'เลเวล 50', bonus: { atkP: 1 } }, { id: 'lv100', th: 'เลเวล 100', bonus: { hpP: 1 } }, { id: 'lv250', th: 'เลเวล 250', bonus: { atkP: 3 }, title: 'ผู้ข้ามขีดจำกัด' }, { id: 'lv200', th: 'เลเวล 200', bonus: { atkP: 2 }, title: 'ผู้ไปถึงจุดสูงสุด' },
    { id: 'f100', th: 'เคลียร์ชั้น 100', bonus: { atkP: 1 }, title: 'ราชาดันเจี้ยน' }, { id: 'pvp10', th: 'ชนะ PvP 10 ครั้ง', bonus: { pvpDmg: 1 }, title: 'นักสู้สนาม' },
    { id: 'siege1', th: 'ชนะศึกยึดปราสาท', bonus: { defP: 1 }, title: 'ผู้พิชิตปราสาท' }, { id: 'flawless', th: 'ชนะ Flawless 5-0', bonus: { atkP: 1 }, title: 'ผู้พิชิตไร้พ่าย' },
    { id: 'streak10', th: 'Kill Streak 10', bonus: { crit: 1 }, title: 'Godlike' }, { id: 'codex20', th: 'Codex ครบ 20 ชนิด', bonus: { drop: 2 }, title: 'นักสะสม' }
  ];
});
