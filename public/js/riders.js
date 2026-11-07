'use strict';
/* Unique skill abilities: every skill gets its own special mechanic ("rider") on top of its attack pattern */
(function (G) {
  const U = G.U, D = G.D, W = G.W, V = G.VFX;
  const RD = G.RD = {};
  const SUPPORT_ARCH = { buff: 1, shield: 1, heal: 1, stealth: 1, summon: 1, turret: 1 };
  const SUPPORT_RIDER = { rally: 1, reflect: 1, resetMove: 1, thorns: 1, regen: 1, immune: 1, cleanse: 1, lastStand: 1, overheal: 1, haste: 1, empower: 1, invuln: 1, decoy: 1, trail: 1, explodeOnEnd: 1, spirit: 1, amp: 1 };

  // Thai text per mechanic
  RD.TH = {
    stack: 'โดนแต่ละครั้งเพิ่ม ATK ตัวเอง {v}% (ซ้อน 5 ชั้น 6 วิ)', echo: 'โจมตีซ้ำอัตโนมัติหลัง 0.4 วิ แรง {v}%', knockup: 'เหวี่ยงศัตรูลอยขึ้นฟ้า {v} วิ', swift: 'โดนแล้วได้ความเร็ววิ่ง +{v}% 2.5 วิ',
    backstab: 'โจมตีจากด้านหลังเป้า ดาเมจ +{v}%', splash: 'ดาเมจกระจาย {v}% ใส่ศัตรูรอบเป้า 1.5 ช่อง', pierceUp: 'ทะลุเป้าแต่ละตัว ดาเมจเพิ่ม +{v}%', critUp: 'สกิลนี้คริติคอล +{v}%',
    critDmg: 'แรงคริติคอลของสกิลนี้ +{v}%', sunder: 'ลด DEF เป้า {v}% 5 วิ', rally: 'แบ่งผลให้พันธมิตรรอบตัว 5 ช่อง ({v}% ของค่า)', bleed: 'เลือดไหล {v}% ATK ใน 4 วิ (x2 ถ้าเป้าเคลื่อนที่)',
    reflect: 'สะท้อนดาเมจ {v}% กลับไปหาผู้โจมตีระหว่างมีผล', resetMove: 'รีเซ็ตคูลดาวน์สกิลช่อง 1–2 ทันที', execute: 'เป้าที่ HP ต่ำกว่า 30% รับดาเมจ +{v}%', purge: 'ลบโล่และบัฟทั้งหมดของเป้า',
    crush: 'ดาเมจเพิ่ม {v}% ของ HP สูงสุดผู้ใช้', refund: 'คืนทรัพยากร {v} ต่อเป้าที่โดน', slowField: 'ทิ้งพื้นที่ชะลอ 40% ที่จุดโดน {v} วิ', guard: 'ได้โล่ {v}% ของดาเมจที่ทำ',
    shatter: 'เป้าที่ติดสตัน/แช่แข็ง/ตรึง รับดาเมจ +{v}%', mend: 'ฮีลพันธมิตรที่ HP ต่ำสุดรอบตัว {v}% ของดาเมจ', weaken: 'ลด ATK เป้า {v}% 5 วิ', taunt: 'ยั่วยุ บังคับเป้าให้โจมตีผู้ใช้ {v} วิ',
    thorns: 'ระหว่างมีผล ผู้โจมตีรับดาเมจย้อน {v}%', vortex: 'ดูดศัตรูในรัศมี {v} ช่องเข้าหาจุดโดน', regen: 'ฟื้น HP {v}% ต่อวินาที นาน 5 วิ', immune: 'ต้าน CC ทุกชนิด {v} วิ', cleanse: 'ล้างสถานะผิดปกติทั้งหมดทันที',
    lastStand: 'ภายใน {v} วิ ถ้าจะตาย จะรอดด้วย HP 1 (ครั้งเดียว)', fury: 'ดาเมจ +{v}% ต่อ HP ที่หายไปทุก 10%', detonate: 'ฆ่าเป้าได้ ศพระเบิด {v}% ATK รอบ 1.8 ช่อง', leech: 'ดูดเลือด {v}% ของดาเมจ',
    trueDmg: '{v}% ของดาเมจทะลุเกราะและการลดดาเมจ', fear: 'ทำให้เป้าหวาดกลัววิ่งหนี {v} วิ', overheal: 'ฮีลส่วนเกิน HP สูงสุดกลายเป็นโล่', haste: 'ลดคูลดาวน์ +{v}% นาน 6 วิ', steal: 'ขโมย ATK เป้า {v}% มาเป็นของตัวเอง 5 วิ',
    mark: 'ทำเครื่องหมาย เป้ารับดาเมจจากทุกแหล่ง +{v}% 4 วิ', amp: 'สกิลถัดไปของผู้ใช้แรงขึ้น +{v}%', burnField: 'ทิ้งเปลวไฟบนพื้น {v} วิ (25% ATK ทุก 0.5 วิ)', burn: 'เผาไหม้ {v}% ATK ใน 3 วิ',
    empower: '3 ครั้งถัดไปที่โจมตีแรงขึ้น +{v}%', trail: 'ทิ้งรอยพลังตามทางที่เคลื่อนที่ ทำดาเมจ {v}% ATK', invuln: 'อมตะ {v} วิ', chill: 'สะสมความหนาว ครบ {v} ชั้นแช่แข็ง 1.2 วิ', toxin: 'พิษสะสม {v}% ATK/วิ ซ้อน 5 ชั้น 5 วิ',
    blind: 'ตาพร่า การโจมตีของเป้าพลาด {v}% นาน 3 วิ', explodeOnEnd: 'เมื่อหมดเวลา ระเบิด {v}% ATK รอบตัว 2 ช่อง', spirit: 'ทุกครั้งที่ฆ่าศัตรูได้ อัญเชิญวิญญาณเพิ่ม 1 ตัว 8 วิ', decoy: 'ทิ้งร่างล่อให้ศัตรูโจมตี 4 วิ',
    far: 'ยิ่งเป้าไกล ดาเมจยิ่งเพิ่ม สูงสุด +{v}%', near: 'เป้าอยู่ใกล้ไม่เกิน 2 ช่อง ดาเมจ +{v}%', cdr: 'โดนแล้วลดคูลดาวน์สกิลอื่นทั้งหมด {v} วิ', timeLock: 'เพิ่มคูลดาวน์สกิลทั้งหมดของเป้า {v} วิ',
    starMark: 'ประทับดาวบนเป้า ครบ {v} ดวง ระเบิดแสงดาว 250% ATK', reset: 'ฆ่าเป้าได้ รีเซ็ตคูลดาวน์สกิลนี้'
  };
  // hand-assigned ability for all 21 classes x 15 skills
  RD.T = {
    blademaster: ['stack:4', 'echo:45', 'knockup:0.6', 'swift:35', 'backstab:60', 'splash:35', 'pierceUp:30', 'critUp:25', 'sunder:25', 'rally:60', 'critDmg:60', 'bleed:120', 'reflect:60', 'resetMove:1', 'execute:80'],
    guardian: ['purge:1', 'crush:6', 'refund:10', 'slowField:3', 'guard:35', 'shatter:60', 'mend:30', 'weaken:20', 'taunt:3', 'thorns:30', 'vortex:1.5', 'regen:3', 'immune:4', 'cleanse:1', 'lastStand:6'],
    berserker: ['fury:6', 'bleed:90', 'detonate:80', 'stack:5', 'leech:12', 'execute:100', 'knockup:0.5', 'trueDmg:30', 'fear:1.5', 'overheal:1', 'haste:20', 'steal:20', 'lastStand:3', 'sunder:30', 'crush:8'],
    paladin: ['mark:15', 'shatter:50', 'refund:12', 'mend:20', 'execute:60', 'guard:25', 'knockup:0.8', 'swift:30', 'blind:50', 'rally:50', 'cleanse:1', 'regen:2', 'invuln:1.5', 'resetMove:1', 'purge:1'],
    pyromancer: ['burn:40', 'splash:50', 'burnField:3', 'amp:30', 'detonate:100', 'weaken:15', 'refund:6', 'leech:8', 'sunder:20', 'empower:40', 'fear:1', 'thorns:40', 'trail:80', 'reflect:30', 'execute:50'],
    cryomancer: ['chill:3', 'pierceUp:35', 'weaken:20', 'shatter:50', 'guard:20', 'splash:40', 'critDmg:50', 'stack:3', 'execute:40', 'slowField:4', 'haste:25', 'invuln:2', 'swift:40', 'thorns:25', 'purge:1'],
    stormcaller: ['refund:5', 'echo:50', 'mark:10', 'knockup:0.7', 'cdr:0.3', 'stack:4', 'pierceUp:40', 'splash:30', 'shatter:40', 'empower:30', 'vortex:2', 'thorns:50', 'trail:60', 'critDmg:40', 'detonate:70'],
    necromancer: ['pierceUp:25', 'leech:15', 'detonate:120', 'weaken:25', 'toxin:20', 'guard:30', 'mend:40', 'slowField:2', 'explodeOnEnd:150', 'fear:2', 'execute:50', 'reflect:40', 'cleanse:1', 'steal:25', 'spirit:1'],
    cleric: ['mark:12', 'burn:30', 'mend:50', 'pierceUp:20', 'guard:40', 'blind:30', 'slowField:3', 'refund:8', 'overheal:1', 'cleanse:1', 'purge:1', 'immune:3', 'swift:45', 'regen:2', 'lastStand:5'],
    druid: ['bleed:60', 'amp:25', 'toxin:15', 'burn:35', 'weaken:15', 'crush:5', 'vortex:1.2', 'splash:30', 'knockup:0.6', 'regen:3', 'thorns:35', 'overheal:1', 'trail:50', 'cleanse:1', 'leech:10'],
    assassin: ['backstab:40', 'toxin:25', 'bleed:50', 'critUp:40', 'execute:120', 'stack:3', 'weaken:20', 'splash:25', 'sunder:30', 'cleanse:1', 'haste:30', 'invuln:1', 'blind:40', 'purge:1', 'reset:1'],
    shadowdancer: ['echo:35', 'swift:25', 'mark:15', 'backstab:50', 'bleed:80', 'blind:35', 'trueDmg:35', 'splash:30', 'fear:1.2', 'empower:50', 'decoy:1', 'reflect:50', 'resetMove:1', 'critDmg:50', 'leech:15'],
    ranger: ['far:40', 'pierceUp:40', 'mark:10', 'slowField:3', 'sunder:25', 'knockup:0.5', 'swift:30', 'stack:4', 'vortex:1', 'critDmg:40', 'weaken:25', 'empower:60', 'cleanse:1', 'rally:50', 'execute:40'],
    marksman: ['far:60', 'critUp:50', 'near:80', 'burnField:3', 'stack:3', 'trueDmg:40', 'burn:50', 'refund:6', 'blind:60', 'amp:40', 'sunder:20', 'weaken:30', 'resetMove:1', 'critDmg:80', 'shatter:60'],
    engineer: ['sunder:15', 'bleed:40', 'splash:45', 'burn:45', 'knockup:0.8', 'mark:10', 'burnField:4', 'stack:3', 'explodeOnEnd:200', 'purge:1', 'haste:30', 'reflect:35', 'trail:70', 'regen:2.5', 'detonate:90'],
    monk: ['stack:5', 'weaken:20', 'echo:30', 'mend:30', 'knockup:0.7', 'swift:40', 'bleed:70', 'splash:40', 'timeLock:2', 'empower:35', 'cleanse:1', 'thorns:40', 'resetMove:1', 'refund:15', 'trueDmg:30'],
    spellblade: ['refund:6', 'mark:15', 'pierceUp:30', 'backstab:40', 'amp:30', 'stack:3', 'guard:25', 'slowField:3', 'shatter:50', 'empower:45', 'steal:30', 'reflect:40', 'cleanse:1', 'haste:25', 'echo:50'],
    beastmaster: ['sunder:15', 'bleed:60', 'pierceUp:30', 'knockup:0.6', 'weaken:20', 'mark:15', 'explodeOnEnd:100', 'toxin:20', 'fear:1.5', 'rally:60', 'decoy:1', 'thorns:30', 'swift:35', 'regen:3', 'lastStand:4'],
    chronomancer: ['timeLock:0.5', 'echo:60', 'stack:3', 'weaken:15', 'execute:60', 'cdr:0.4', 'guard:20', 'refund:10', 'shatter:80', 'rally:50', 'mark:20', 'invuln:1.5', 'resetMove:1', 'empower:30', 'purge:1'],
    warlock: ['burn:35', 'toxin:30', 'weaken:15', 'steal:20', 'sunder:20', 'critDmg:70', 'fear:1', 'mark:20', 'blind:40', 'empower:50', 'explodeOnEnd:120', 'thorns:45', 'cleanse:1', 'overheal:1', 'detonate:150'],
    darkknight: ['leech:10', 'bleed:70', 'burn:40', 'knockup:0.5', 'stack:4', 'detonate:90', 'pierceUp:30', 'sunder:25', 'vortex:2', 'rally:40', 'fear:1.5', 'overheal:1', 'reflect:40', 'backstab:50', 'execute:70'],
    lightbringer: ['blind:25', 'splash:30', 'pierceUp:45', 'mark:12', 'guard:25', 'shatter:50', 'slowField:3', 'critUp:25', 'purge:1', 'haste:25', 'vortex:1', 'regen:2', 'invuln:1', 'resetMove:1', 'execute:60'],
    shadowmancer: ['echo:40', 'weaken:20', 'explodeOnEnd:120', 'sunder:20', 'fear:1', 'mark:15', 'blind:30', 'backstab:60', 'steal:20', 'empower:50', 'swift:40', 'thorns:30', 'toxin:20', 'trail:60', 'timeLock:1'],
    seraph: ['pierceUp:25', 'mark:12', 'splash:25', 'mend:30', 'shatter:40', 'guard:25', 'slowField:3', 'knockup:0.6', 'purge:1', 'rally:50', 'reflect:35', 'overheal:1', 'resetMove:1', 'haste:20', 'execute:50'],
    reaper: ['execute:60', 'leech:12', 'timeLock:1', 'backstab:50', 'stack:4', 'detonate:100', 'pierceUp:30', 'fear:1.2', 'vortex:2', 'critDmg:60', 'blind:30', 'overheal:1', 'reflect:30', 'trail:60', 'reset:1'],
    demon: ['bleed:60', 'burn:45', 'knockup:0.5', 'stack:5', 'splash:35', 'burnField:3', 'weaken:20', 'sunder:25', 'fear:1.5', 'haste:25', 'toxin:20', 'leech:15', 'thorns:40', 'swift:40', 'fury:8'],
    deity: ['mark:15', 'shatter:40', 'pierceUp:40', 'splash:30', 'echo:50', 'detonate:120', 'timeLock:1.5', 'refund:6', 'purge:1', 'rally:60', 'vortex:1.5', 'regen:2.5', 'invuln:1.5', 'cleanse:1', 'execute:80'],
    jester: ['echo:30', 'bleed:45', 'blind:40', 'weaken:25', 'knockup:0.8', 'stack:3', 'explodeOnEnd:150', 'swift:40', 'fear:1.2', 'empower:40', 'cleanse:1', 'reflect:40', 'refund:8', 'taunt:2', 'splash:40'],
    loki: ['toxin:20', 'echo:35', 'pierceUp:30', 'toxin:25', 'weaken:25', 'backstab:50', 'vortex:2', 'steal:25', 'explodeOnEnd:120', 'resetMove:1', 'fear:1.2', 'empower:45', 'swift:45', 'immune:1.5', 'timeLock:1.5'],
    starhunter: ['starMark:3', 'far:35', 'mark:15', 'knockup:0.6', 'blind:30', 'guard:20', 'pierceUp:35', 'splash:30', 'weaken:20', 'empower:40', 'vortex:1.5', 'cleanse:1', 'reflect:45', 'backstab:50', 'execute:70']
  };
  // 25-slot kits: reused skills keep their original mechanic; new skills get a mechanic no other skill in the class has
  const DEFV = {}; for (const row of Object.values(RD.T)) for (const e of row) { const [k, v] = e.split(':'); if (DEFV[k] === undefined) DEFV[k] = +v; }
  const ALLK = Object.keys(RD.TH).filter(k => DEFV[k] !== undefined);
  for (const c of D.CLASSES) { const used = new Set(); const row = RD.T[c.id] || [];
    c.skills.forEach(s => { if (s.src != null && row[s.src]) { const k = row[s.src].split(':')[0]; if (!used.has(k)) { used.add(k); const [kk, v] = row[s.src].split(':'); s.rider = { k: kk, v: +v }; } } });
    c.skills.forEach((s, i) => { if (s.rider) { s.base.rider = s.rider; return; } const sup = SUPPORT_ARCH[s.arch] || s.arch === 'blink'; const pool = ALLK.filter(k => !used.has(k) && (sup ? SUPPORT_RIDER[k] : !SUPPORT_RIDER[k]));
      const k = pool[(i * 7 + c.idx * 3) % Math.max(1, pool.length)] || (sup ? 'regen' : 'stack'); used.add(k); s.rider = { k, v: DEFV[k] ?? 1 }; s.base.rider = s.rider; }); }
  // second trait (element-themed) wherever an attack pattern + mechanic combination already exists, so every ability is distinct
  const DEF2 = { burn: 25, chill: 4, echo: 25, mark: 8, blind: 20, fear: 0.8, mend: 15, guard: 12, bleed: 40, sunder: 12, stack: 2, refund: 4, leech: 6, fury: 3, timeLock: 0.4, cdr: 0.2, toxin: 10, weaken: 10, splash: 20, burnField: 2, swift: 20, knockup: 0.3, starMark: 4, regen: 1.5, haste: 10, thorns: 15, reflect: 20, immune: 1.5, empower: 20, overheal: 1, invuln: 0.5, lastStand: 2, cleanse: 1 };
  const POOL = { fire: ['burn', 'burnField', 'splash'], ice: ['chill', 'sunder', 'weaken'], lightning: ['echo', 'mark', 'cdr'], shadow: ['blind', 'fear', 'leech'], holy: ['mend', 'guard', 'mark'], nature: ['bleed', 'toxin', 'leech'], phys: ['sunder', 'stack', 'bleed'], arcane: ['refund', 'echo', 'mark'], blood: ['leech', 'fury', 'bleed'], time: ['timeLock', 'cdr', 'echo'], poison: ['toxin', 'weaken', 'blind'], tech: ['splash', 'burnField', 'sunder'], wind: ['swift', 'knockup', 'mark'], chi: ['stack', 'mend', 'refund'], fel: ['burn', 'toxin', 'fear'], star: ['starMark', 'mark', 'blind'], dark: ['leech', 'fear', 'bleed'], light: ['blind', 'mark', 'guard'], umbra: ['weaken', 'blind', 'echo'], celestial: ['mend', 'guard', 'mark'], death: ['leech', 'fear', 'timeLock'], infernal: ['burn', 'bleed', 'burnField'], divine: ['mark', 'echo', 'blind'], jester: ['blind', 'swift', 'echo'], chaos: ['echo', 'weaken', 'fear'] };
  const SUPP2 = ['regen', 'haste', 'thorns', 'reflect', 'immune', 'empower', 'overheal', 'invuln', 'lastStand', 'cleanse'];
  const ALL_OFF = ['mark', 'sunder', 'weaken', 'bleed', 'burn', 'toxin', 'chill', 'splash', 'echo', 'leech', 'guard', 'refund', 'swift', 'stack', 'blind', 'knockup', 'fear', 'mend', 'fury', 'cdr', 'timeLock', 'burnField'];
  const seen = new Set();
  for (const c of D.CLASSES) c.skills.forEach(s => {
    const base = s.arch + '|' + s.rider.k + '|' + Object.keys(s.cc).sort().join(',');
    if (!seen.has(base)) { seen.add(base); return; }
    const sup = (SUPPORT_ARCH[s.arch] || (s.arch === 'blink' && !s.p));
    const cands = sup ? SUPP2 : [...(POOL[s.elem] || []), ...ALL_OFF];
    for (const k of cands) { if (k === s.rider.k) continue; const sig = base + '+' + k; if (seen.has(sig)) continue; seen.add(sig); s.rider2 = { k, v: DEF2[k] || 10 }; s.base.rider2 = s.rider2; break; }
  });

  // final global pass: the full ability signature (pattern + both mechanics + CC) is unique across all classes
  { const sig = s => s.arch + '|' + s.rider.k + '|' + (s.rider2 ? s.rider2.k : '') + '|' + Object.keys(s.cc).sort(); const all = new Set();
    for (const c of D.CLASSES) c.skills.forEach(s => { if (!all.has(sig(s))) { all.add(sig(s)); return; } const sup = (SUPPORT_ARCH[s.arch] || (s.arch === 'blink' && !s.p)); for (const k of (sup ? SUPP2 : ALL_OFF).concat(Object.keys(DEF2))) { if (k === s.rider.k) continue; s.rider2 = { k, v: DEF2[k] || 10 }; if (!all.has(sig(s))) { s.base.rider2 = s.rider2; all.add(sig(s)); break; } } }); }
  RD.isSupport = s => !!SUPPORT_ARCH[s.arch] || (s.arch === 'blink' && !s.p);
  RD.ridersList = (s) => [s.rider, s.rider2].filter(Boolean);
  RD.riderText = (r, s) => { const t = (RD.TH[r.k] || r.k).replace('{v}', r.v); return RD.isSupport(s) && !SUPPORT_RIDER[r.k] ? `อัญเชิญพลัง: 5 ครั้งถัดไปที่โจมตีโดน ${t}` : t; };
  const baseDesc = D.descSkill;
  D.descSkill = (s) => { const d = baseDesc(s); return s.rider ? d + RD.ridersList(s).map(r => ' · ✦ ' + RD.riderText(r, s)).join('') : d; };

  // ---------------- helpers ----------------
  const now = () => W.time;
  const act = (u, k) => u[k] && u[k].t > now();
  const tag = (u, txt, c) => { if (G.E.vis(u.x, u.y)) V.text(u.x, u.y, txt, c, { size: 7, z: 38 }); };
  RD.dot = (src, t, total, dur, color, kind) => { (t.dots = t.dots || []).push({ src, dps: total / dur, t: dur, tick: 0, color, kind }); };

  // modifies damage before it lands: returns { mul, critAdd, critDmgAdd, trueFrac, miss }
  RD.pre = (owner, t, s) => {
    const o = { mul: 1, critAdd: 0, critDmgAdd: 0, trueFrac: 0, miss: false };
    if (act(owner, 'blindS') && Math.random() * 100 < owner.blindS.v) { o.miss = true; return o; }
    if (act(t, 'markS')) o.mul *= 1 + t.markS.v / 100;
    if (act(owner, 'stackS')) o.mul *= 1 + owner.stackS.n * owner.stackS.v / 100;
    if (act(owner, 'stealS')) o.mul *= 1 + owner.stealS.v / 100;
    if (act(owner, 'weakS')) o.mul *= 1 - owner.weakS.v / 100;
    if (act(t, 'sunderS')) o.mul *= 1 + t.sunderS.v / 150;
    if (owner.empowerS && owner.empowerS.n > 0 && s && s.dmg) { o.mul *= 1 + owner.empowerS.v / 100; }
    if (owner.ampV && s && s.castId && owner.ampCast !== s.castId) { o.mul *= 1 + owner.ampV / 100; owner.ampUse = s.castId; }
    const d = Math.hypot(t.x - owner.x, t.y - owner.y);
    for (const r of RD.ridersOf(owner, s)) { const v = r.v;
    switch (r.k) {
      case 'execute': if (t.hp / t.maxhp < 0.3) o.mul *= 1 + v / 100; break;
      case 'crush': o.flat = owner.maxhp * v / 100; break;
      case 'fury': o.mul *= 1 + v / 100 * Math.floor((1 - owner.hp / owner.maxhp) * 10); break;
      case 'far': o.mul *= 1 + v / 100 * U.clamp(d / Math.max(2, (s.R || 7)), 0, 1); break;
      case 'near': if (d < 2) o.mul *= 1 + v / 100; break;
      case 'backstab': { const fx = t.fx || 0, fy = t.fy || 0; const dot = (owner.x - t.x) * fx + (owner.y - t.y) * fy; if (dot < 0) { o.mul *= 1 + v / 100; o.back = true; } break; }
      case 'shatter': if (t.cc && (t.cc.st > 0 || t.cc.fz > 0 || t.cc.rt > 0)) o.mul *= 1 + v / 100; break;
      case 'critUp': o.critAdd = v; break;
      case 'critDmg': o.critDmgAdd = v; break;
      case 'trueDmg': o.trueFrac = v / 100; break;
      case 'pierceUp': if (s._pierced) o.mul *= 1 + v / 100 * s._pierced; break;
    } }
    return o;
  };
  RD.ridersOf = (owner, s) => {
    if (s && s.rider && s.castId && !RD.isSupport(s)) return RD.ridersList(s);
    if (owner.imbue && owner.imbue.n > 0 && owner.imbue.t > now() && s && s.dmg) return [owner.imbue.r];
    return [];
  };
  // after damage lands
  RD.post = (owner, t, s, dmg, killed) => {
    if (owner.empowerS && owner.empowerS.n > 0 && s && s.dmg && s.castId && owner.empowerS.last !== s.castId) { owner.empowerS.last = s.castId; owner.empowerS.n--; }
    if (owner.ampUse && s && s.castId === owner.ampUse) { owner.ampV = 0; owner.ampUse = null; }
    // defender reactions
    if (act(t, 'reflectS') && owner !== t && !owner.dead && dmg > 0) { owner.hp -= dmg * t.reflectS.v / 100; owner.flash = 0.08; if (owner.hp <= 0) G.E.kill(owner, t); }
    if (act(t, 'thornsS') && owner !== t && !owner.dead && dmg > 0) { owner.hp -= dmg * t.thornsS.v / 100; if (owner.hp <= 0) G.E.kill(owner, t); }
    const rs = RD.ridersOf(owner, s); if (!rs.length) return;
    const fromImbue = !(s.rider && s.castId && !RD.isSupport(s)); if (fromImbue && owner.imbue && owner.imbue.last !== s.castId) { owner.imbue.last = s.castId; owner.imbue.n--; }
    for (const r of rs) RD.postOne(owner, t, s, dmg, killed, r);
  };
  RD.postOne = (owner, t, s, dmg, killed, r) => {
    const v = r.v; const E = G.E; const once = (key) => { const k = (s.castId || 0) + key; owner._once = owner._once || {}; if (owner._once[k]) return false; owner._once[k] = 1; return true; };
    switch (r.k) {
      case 'stack': if (once('st')) { const S = owner.stackS && owner.stackS.t > now() ? owner.stackS : (owner.stackS = { n: 0, v, t: 0 }); S.n = Math.min(5, S.n + 1); S.v = v; S.t = now() + 6; } break;
      case 'echo': if (!s._echo && !killed) E.later(0.4, () => { if (!t.dead && !owner.dead) { E.hit(owner, t, (s.p || 1) * v / 100, Object.assign({}, s, { _echo: true, cc: {} }), { fx: false }); if (E.vis(t.x, t.y)) G.FX.at(owner, s, t.x, t.y, 0, { light: true }); } }); break;
      case 'knockup': if (!t.ccImmune && !killed) { E.applyCC(owner, t, { st: v }); t.jz = 0; t.airT = v; tag(t, 'AIRBORNE', '#bff4ff'); } break;
      case 'swift': if (once('sw')) E.addBuff(owner, 'spd', v, 2.5, { src: 'rider', c: '#7ae8c8' }); break;
      case 'splash': if (!s._splash) for (const e of E.enemiesNear(owner, t.x, t.y, 1.5)) if (e !== t) E.hit(owner, e, (s.p || 1) * v / 100, Object.assign({}, s, { _splash: true, cc: {}, castId: s.castId }), { fx: false }); break;
      case 'sunder': t.sunderS = { v, t: now() + 5 }; break;
      case 'weaken': t.weakS = { v, t: now() + 5 }; break;
      case 'bleed': RD.dot(owner, t, owner.st.atk * v / 100, 4, '#ff4d4d', 'bleed'); break;
      case 'burn': RD.dot(owner, t, owner.st.atk * v / 100, 3, '#ff9a3a', 'burn'); break;
      case 'toxin': { const n = (t.dots || []).filter(d => d.kind === 'toxin' && d.src === owner).length; if (n < 5) RD.dot(owner, t, owner.st.atk * v / 100 * 5, 5, '#9be34a', 'toxin'); break; }
      case 'purge': if (!killed) { t.shield = 0; t.buffs = t.buffs.filter(b => b.src === 'mode'); if (t.st0) E.recalc(t); t.empowerS = null; t.reflectS = null; tag(t, 'PURGED', '#e9c8ff'); } break;
      case 'refund': owner.res = Math.min(owner.resMax, owner.res + v); break;
      case 'guard': owner.shield = Math.max(owner.shield, Math.min(owner.maxhp * 0.5, owner.shield + dmg * v / 100)); owner.shieldT = Math.max(owner.shieldT, 3); break;
      case 'mend': { let best = null; for (const a of E.alliesNear(owner, owner.x, owner.y, 6)) if (!best || a.hp / a.maxhp < best.hp / best.maxhp) best = a; if (best) E.heal(owner, best, dmg * v / 100); break; }
      case 'leech': E.heal(owner, owner, dmg * v / 100); break;
      case 'taunt': if (!killed) { t.tauntT = now() + v; t.tauntBy = owner; t.target = owner; tag(t, 'TAUNTED', '#ff9a9a'); } break;
      case 'fear': if (!killed && !t.ccImmune) { t.fearT = now() + v; t.fearFrom = owner; tag(t, 'FEAR', '#b06cff'); } break;
      case 'blind': if (!killed) { t.blindS = { v, t: now() + 3 }; tag(t, 'BLIND', '#fff6c2'); } break;
      case 'mark': t.markS = { v, t: now() + 4 }; break;
      case 'steal': if (once('stl')) { owner.stealS = { v, t: now() + 5 }; t.weakS = { v, t: now() + 5 }; } break;
      case 'chill': if (!killed) { t.chillN = (t.chillN || 0) + 1; if (t.chillN >= v) { t.chillN = 0; E.applyCC(owner, t, { fz: 1.2 }); tag(t, 'FROZEN', '#bff4ff'); } } break;
      case 'vortex': if (once('vx')) for (const e of E.enemiesNear(owner, t.x, t.y, v + 1)) if (!e.ccImmune && e !== t) { const dx = t.x - e.x, dy = t.y - e.y, l = Math.hypot(dx, dy) || 1; e.kb = { vx: dx / l * Math.min(l - 0.5, v) / 0.2, vy: dy / l * Math.min(l - 0.5, v) / 0.2, t: 0.2 }; } break;
      case 'slowField': if (once('sf')) W.zones.push({ x: t.x, y: t.y, r: 1.8, t: 0, dur: v, tick: 0, owner, s: { elem: s.elem, cc: { sl: 1 }, id: null }, pow: 0.05 }); if (once('sfv') && E.vis(t.x, t.y)) V.swirl(t.x, t.y, 1.8, D.ELEM.ice.pal, v); break;
      case 'burnField': if (once('bf')) { W.zones.push({ x: t.x, y: t.y, r: 1.6, t: 0, dur: v, tick: 0, owner, s: { elem: 'fire', cc: {}, id: null }, pow: 0.25 }); if (E.vis(t.x, t.y)) { V.swirl(t.x, t.y, 1.6, D.ELEM.fire.pal, v); V.columns(t.x, t.y, 1, 6, D.ELEM.fire.pal, v * 0.4, 30); } } break;
      case 'cdr': if (once('cd')) for (let i = 0; i < G.D.NSK; i++) if (i !== s.idx) owner.cds[i] = Math.max(0, owner.cds[i] - v); break;
      case 'timeLock': if (t.cds && !killed) { for (let i = 0; i < G.D.NSK; i++) if (t.cds[i] !== undefined) t.cds[i] += v; tag(t, 'TIME LOCK', '#5ff0c8'); } break;
      case 'starMark': if (!killed) { t.starN = (t.starN || 0) + 1; if (E.vis(t.x, t.y)) V.shape(t.x, t.y, 'star5', '#fff2a8', 4 + t.starN * 2, 0.6, { z: 36, spin: 4 }); if (t.starN >= v) { t.starN = 0; E.later(0.15, () => { if (t.dead) return; E.hit(owner, t, 2.5, Object.assign({}, s, { cc: {}, _echo: true }), { fx: false }); if (E.vis(t.x, t.y)) G.FX.M.supernova({ x: t.x, y: t.y, sx: t.x, sy: t.y, pal: D.ELEM.star.pal, sc: 0.45, ang: 0, r: 1.5 }); }); } } break;
    }
    if (killed) {
      if (r.k === 'detonate') { E.later(0.1, () => { for (const e of E.enemiesNear(owner, t.x, t.y, 1.8)) E.hit(owner, e, v / 100, Object.assign({}, s, { cc: {}, _splash: true }), { fx: false }); if (E.vis(t.x, t.y)) G.FX.M.explosion({ x: t.x, y: t.y, pal: D.ELEM[s.elem].pal, sc: 1, ang: 0 }); }); }
      if (r.k === 'reset') { owner.cds[s.idx] = 0; tag(owner, 'RESET', '#ffd84a'); }
    }
  };
  // spirit rider (summon class): kills by owner spawn a wisp
  RD.onKill = (t, k) => { if (!k || !k.cls) return; const sk = D.CLS[k.cls] && D.CLS[k.cls].skills.find(s => s.rider && s.rider.k === 'spirit'); if (sk && (k.fxCd.spirit || -9) + 1 < now() && W.units.some(u => u.owner === k && u.kind === 'summon')) { k.fxCd.spirit = now(); G.E.spawnSummon(k, Object.assign({}, sk, { p: 0.6, d: 8, ult: false }), t.x, t.y); } };

  // support skills: apply on cast
  RD.self = (u, s) => { if (!s.rider || !RD.isSupport(s) && !['blink', 'dash', 'trap'].includes(s.arch)) return; for (const r of RD.ridersList(s)) RD.selfOne(u, s, r); };
  RD.selfOne = (u, s, r) => {
    const v = r.v; const E = G.E; const T = now(); const d = s.d || 4; const pal = D.ELEM[s.elem].pal;
    if (!SUPPORT_RIDER[r.k]) { if (RD.isSupport(s)) { u.imbue = { r, n: 5, t: T + 10 }; tag(u, 'IMBUE', pal[1]); } return; }
    switch (r.k) {
      case 'rally': if (s.arch === 'buff') for (const a of E.alliesNear(u, u.x, u.y, 5)) if (a !== u) E.addBuff(a, s.buff, s.v * v / 100, s.d, { src: 'rally', c: pal[1] }); break;
      case 'reflect': u.reflectS = { v, t: T + d }; break;
      case 'thorns': u.thornsS = { v, t: T + Math.max(d, 4) }; break;
      case 'regen': u.regenS = { v, t: T + 5 }; break;
      case 'immune': u.ccImmT = T + v; u.cc = { st: 0, rt: 0, sl: 0, sil: 0, fz: 0 }; tag(u, 'UNSTOPPABLE', '#ffd84a'); break;
      case 'cleanse': u.cc = { st: 0, rt: 0, sl: 0, sil: 0, fz: 0 }; u.dots = []; u.blindS = null; u.weakS = null; u.sunderS = null; u.markS = null; u.fearT = 0; tag(u, 'CLEANSE', '#ffffff'); break;
      case 'lastStand': u.lastStandT = T + v; break;
      case 'overheal': u.overheal = T + 0.5; break;
      case 'haste': E.addBuff(u, 'cdr', v, 6, { src: 'rider', c: pal[0] }); break;
      case 'empower': u.empowerS = { v, n: 3 }; break;
      case 'invuln': u.invulnT = T + v; tag(u, 'INVULNERABLE', '#ffffff'); break;
      case 'amp': u.ampV = v; u.ampCast = s.castId; break;
      case 'resetMove': u.cds[0] = 0; u.cds[1] = 0; break;
      case 'decoy': { const dc = E.spawn(E.mkUnit({ kind: 'summon', team: u.team, x: u.x, y: u.y, owner: u, st: Object.assign({}, u.st, { atk: 0 }), hp: u.maxhp * 0.5, maxhp: u.maxhp * 0.5, life: 4, name: 'Decoy', mirror: true, look: u.look, cls: u.cls, alpha: 0.6, decoy: true, moveSpd: 0, atkCd: 99 })); for (const e of W.units) if (E.isEnemy(e, u) && U.d2(e.x, e.y, u.x, u.y) < 64) { e.target = dc; e.tauntT = T + 2; e.tauntBy = dc; } break; }
      case 'explodeOnEnd': u._explodeNext = { v, cast: s.castId }; break;
      case 'trail': u._trail = { v, s }; break;
    }
  };
  RD.trail = (u, s, x1, y1, x2, y2) => { if (!u._trail) return; const v = u._trail.v; u._trail = null; const E = G.E; const n = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 0.8);
    for (let i = 0; i <= n; i++) { const x = U.lerp(x1, x2, i / n), y = U.lerp(y1, y2, i / n); W.zones.push({ x, y, r: 0.8, t: 0, dur: 2, tick: 0.2, owner: u, s: Object.assign({}, s, { cc: {}, rider: null }), pow: v / 100 / 4 }); if (E.vis(x, y)) V.columns(x, y, 0.3, 3, D.ELEM[s.elem].pal, 1.4, 24); } };

  // per-frame upkeep
  RD.tick = (u, dt) => {
    const T = now(); const E = G.E;
    if (u.dots && u.dots.length) for (let i = u.dots.length - 1; i >= 0; i--) {
      const d = u.dots[i]; d.t -= dt; d.tick -= dt;
      if (d.tick <= 0) { d.tick = 0.5; let dm = d.dps * 0.5 * (d.kind === 'bleed' && u.moving ? 2 : 1); if (E.playerLike(u) && E.playerLike(d.src)) dm *= 0.55; dm = Math.max(1, Math.round(dm)); u.hp -= dm; if (d.src) d.src.ms.dmg += dm;
        if (E.vis(u.x, u.y)) { V.p(u.x + U.rf(-0.3, 0.3), u.y, 14, 0, 0, 20, 0.5, 2, d.color); if (d.src === W.player || u === W.player) V.text(u.x, u.y, U.fmt(dm), d.color, { size: 6 }); }
        if (u.hp <= 0) { E.kill(u, d.src); return; } }
      if (d.t <= 0) u.dots.splice(i, 1);
    }
    if (act(u, 'regenS')) E.heal(u, u, u.maxhp * u.regenS.v / 100 * dt);
    if (u.airT > 0) { u.airT -= dt; u.jz = Math.sin(Math.max(0, u.airT) * 3) * 14; }
  };
  RD.canFlee = (u, dt) => { if (!u.fearT || u.fearT < now() || !u.fearFrom) return false; const a = Math.atan2(u.y - u.fearFrom.y, u.x - u.fearFrom.x) + Math.sin(now() * 3 + u.id) * 0.5; G.E.walkTo(u, u.x + Math.cos(a) * 2, u.y + Math.sin(a) * 2, dt, 0.1); return true; };
  RD.taunted = (u) => { if (u.tauntT && u.tauntT > now() && u.tauntBy && !u.tauntBy.dead) { u.target = u.tauntBy; return true; } return false; };
})(window.G);
