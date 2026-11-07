'use strict';
/* Skill layout v2 for every class: 15 attack skills · 5 buff skills · 4 ultimates · 1 class-set ultimate (25 slots).
   Existing skills are kept (re-slotted by type) and every class gets new, themed skills to fill its kit. */
(function (G) {
  const D = G.D;
  D.NSK = 25; D.SET_IDX = 24; D.ATK_N = 15; D.BUFF0 = 15; D.ULT0 = 20;
  D.SLOT_KIND = i => i < 15 ? 'atk' : i < 20 ? 'buff' : i < 24 ? 'ult' : 'set';
  D.SLOT_TH = i => ({ atk: 'โจมตี', buff: 'บัฟ', ult: 'อัลติเมต', set: 'อัลติเมตชุดคลาส' })[D.SLOT_KIND(i)];
  D.UNLOCK = [1, 1, 2, 4, 7, 10, 14, 18, 24, 30, 38, 48, 60, 75, 90, 5, 12, 20, 35, 55, 100, 140, 185, 230, 1];
  D.KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'Q', 'E', 'R', 'T', 'F', '⇧Q', '⇧E', '⇧R', '⇧T', '⇧F', '⇧1', '⇧2', '⇧3', '⇧4', '⇧5'];
  D.SHIFT_KEYS = { KeyQ: 15, KeyE: 16, KeyR: 17, KeyT: 18, KeyF: 19, Digit1: 20, Digit2: 21, Digit3: 22, Digit4: 23, Digit5: 24 };

  // themed vocabulary per class (used to name the new skills)
  const TH = {
    blademaster: ['Steel', 'Sakura', 'Gale', 'Moonlit', 'Iron', 'Heaven'], guardian: ['Bastion', 'Aegis', 'Granite', 'Oath', 'Rampart', 'Citadel'],
    berserker: ['Blood', 'Savage', 'Bone', 'Warlord', 'Feral', 'Carnage'], paladin: ['Dawn', 'Sacred', 'Radiant', 'Crusader', 'Valor', 'Seraphic'],
    pyromancer: ['Ember', 'Inferno', 'Cinder', 'Phoenix', 'Magma', 'Solar'], cryomancer: ['Frost', 'Glacier', 'Crystal', 'Rime', 'Snow', 'Polar'],
    stormcaller: ['Thunder', 'Volt', 'Tempest', 'Static', 'Sky', 'Storm'], necromancer: ['Grave', 'Bone', 'Soul', 'Plague', 'Crypt', 'Lich'],
    cleric: ['Holy', 'Halo', 'Mercy', 'Psalm', 'Angel', 'Grace'], druid: ['Thorn', 'Grove', 'Moon', 'Wild', 'Briar', 'Gaia'],
    assassin: ['Venom', 'Shade', 'Silent', 'Viper', 'Night', 'Toxin'], shadowdancer: ['Umbral', 'Dusk', 'Phantom', 'Lunar', 'Veil', 'Eclipse'],
    ranger: ['Hawk', 'Wind', 'Forest', 'Falcon', 'Hunter', 'Gale'], marksman: ['Bullet', 'Sniper', 'Tracer', 'Powder', 'Rail', 'Deadeye'],
    engineer: ['Gear', 'Turbo', 'Piston', 'Tesla', 'Rocket', 'Steam'], monk: ['Chi', 'Lotus', 'Dragon', 'Tiger', 'Zen', 'Spirit'],
    spellblade: ['Rune', 'Arcane', 'Glyph', 'Mystic', 'Astral', 'Sigil'], beastmaster: ['Fang', 'Pack', 'Claw', 'Primal', 'Alpha', 'Wildhorn'],
    chronomancer: ['Chrono', 'Epoch', 'Hour', 'Paradox', 'Tick', 'Eternity'], warlock: ['Fel', 'Hex', 'Doom', 'Infernal', 'Curse', 'Abyss'],
    starhunter: ['Star', 'Comet', 'Nova', 'Nebula', 'Orbit', 'Galaxy'], darkknight: ['Void', 'Abyss', 'Neon', 'Rift', 'Null', 'Oblivion'],
    lightbringer: ['Prism', 'Solar', 'Halo', 'Corona', 'Lumen', 'Zenith'], shadowmancer: ['Ink', 'Maw', 'Hunger', 'Lure', 'Gloom', 'Devour'],
    seraph: ['Celestial', 'Wing', 'Choir', 'Aureole', 'Heaven', 'Empyrean'], reaper: ['Death', 'Scythe', 'Wraith', 'Tomb', 'Soul', 'Requiem'],
    demon: ['Hell', 'Wrath', 'Brimstone', 'Infernal', 'Horn', 'Pandemonium'], deity: ['Divine', 'Genesis', 'Eden', 'Halo', 'Creation', 'Omni'],
    jester: ['Prank', 'Confetti', 'Joker', 'Circus', 'Trick', 'Carnival'], loki: ['Trickster', 'Serpent', 'Mischief', 'Illusion', 'Chaos', 'Ragnarok']
  };
  const NOUN = { slash: ['Cleave', 'Edge', 'Sever', 'Crescent', 'Rend'], spin: ['Whirl', 'Cyclone', 'Vortex'], thrust: ['Pierce', 'Lance', 'Impale'], proj: ['Bolt', 'Shot', 'Missile', 'Orb', 'Spear'],
    nova: ['Nova', 'Burst', 'Pulse', 'Shockwave'], ground: ['Strike', 'Fall', 'Rain', 'Crash'], zone: ['Field', 'Domain', 'Mire'], beam: ['Beam', 'Ray', 'Laser'], chain: ['Chain', 'Arc', 'Link'],
    dash: ['Rush', 'Charge', 'Dash'], leap: ['Leap', 'Meteor Drop'], barrage: ['Flurry', 'Volley', 'Fury', 'Storm'], trap: ['Snare', 'Mine'] };
  const BUFFN = { atk: 'Might', aspd: 'Haste', crit: 'Focus', def: 'Bulwark', spd: 'Stride', ls: 'Thirst', cdr: 'Flow', shield: 'Ward', heal: 'Renewal' };
  const ULTN = ['Apocalypse', 'Cataclysm', 'Requiem', 'Judgment', 'Ascension', 'Eclipse', 'Genesis', 'Oblivion'];
  const POOL = {
    melee: ['slash', 'thrust', 'spin', 'dash', 'nova', 'barrage', 'leap', 'chain'], tank: ['slash', 'nova', 'thrust', 'leap', 'spin', 'chain', 'dash', 'ground'], assassin: ['barrage', 'slash', 'dash', 'thrust', 'spin', 'proj', 'nova', 'trap'],
    hybrid: ['slash', 'ground', 'thrust', 'nova', 'proj', 'beam', 'dash', 'chain'], caster: ['proj', 'ground', 'beam', 'zone', 'chain', 'nova', 'barrage', 'thrust'], healer: ['proj', 'ground', 'beam', 'chain', 'nova', 'zone', 'barrage', 'thrust'],
    ranged: ['proj', 'beam', 'ground', 'barrage', 'chain', 'trap', 'nova', 'thrust'], summoner: ['proj', 'ground', 'zone', 'chain', 'beam', 'nova', 'barrage', 'thrust']
  };
  const BASE = { slash: 'p1.4 c1.8 r1.7', spin: 'p0.5 n4 r2 c3', thrust: 'p1.7 R2.8 c2', proj: 'p1.4 c1.6', nova: 'p1.3 r2.2 c2.6', ground: 'p1.8 r1.6 c2.8 R6', zone: 'p0.4 r2.4 d4 c4',
    beam: 'p1.6 R6 c2.2', chain: 'p1 n4 c2.4', dash: 'p1.4 R4 c2.6', leap: 'p1.5 R5 r2 c4', barrage: 'p0.32 n7 c2.8 R1.8', trap: 'p1.2 r1.6 c3' };
  const CCBY = { melee: ['kb1.5', 'st0.6', 'sl2'], tank: ['st0.8', 'pl2', 'sl2'], assassin: ['sl2', 'sil1.5', 'st0.6'], hybrid: ['st0.6', 'sl2', 'kb1.5'], caster: ['sl2', 'rt1.5', 'kb1.5'], healer: ['sl2', 'st0.6', 'rt1.5'], ranged: ['kb1.5', 'sl2', 'rt1.5'], summoner: ['sl2', 'rt1.5', 'sil1.5'] };
  const ULTS = [['nova', 'p7 r5 c55 u'], ['ground', 'p1.6 r5 n10 c55 u'], ['beam', 'p6 R9 c55 u'], ['spin', 'p0.8 n12 r3.5 c55 u'], ['barrage', 'p0.5 n18 c55 R6 u'], ['summon', 'n6 d18 c60 p0.9 u']];
  const isBuff = a => ['buff', 'shield', 'heal', 'blink', 'stealth'].includes(a);
  const scaleP = (spec, k) => spec.replace(/\bp([\d.]+)/, (m, v) => 'p' + (Math.round(+v * (1 + k * 0.035) * 100) / 100));
  const melee = r => ['melee', 'tank', 'assassin', 'hybrid'].includes(r);

  for (const cls of D.CLASSES) {
    const old = cls.specs.slice(0, 15); const T = TH[cls.id] || ['Arcane', 'Mystic', 'Prime', 'Ancient', 'Royal', 'Eternal']; const used = new Set(old.map(s => s.split('|')[0]));
    const nm = (base) => { let n = base, k = 2; while (used.has(n)) n = base + ' ' + ['II', 'III', 'IV', 'V'][k++ - 2]; used.add(n); return n; };
    const atk = [], buf = [], ult = [];
    old.forEach((sp, i) => { const arch = sp.split('|')[1]; const o = { sp, src: i }; if (/\bu\b/.test(sp.split('|')[2] || '')) ult.push(o); else if (isBuff(arch)) buf.push(o); else atk.push(o); });
    // overflow buffs (e.g. three heals) keep their place as extra actives
    while (buf.length > 5) atk.push(buf.pop());
    // new attack skills
    const pool = POOL[cls.role] || POOL.caster; let g = 0;
    while (atk.length < 15) { const arch = pool[g % pool.length]; let spec = BASE[arch]; if (!melee(cls.role) && arch === 'barrage') spec = spec.replace('R1.8', 'R6'); if (g % 3 === 2) spec += ' ' + CCBY[cls.role][(g / 3 | 0) % 3];
      const noun = NOUN[arch][(g + cls.idx) % NOUN[arch].length]; atk.push({ sp: `${nm(T[(g + 1) % T.length] + ' ' + noun)}|${arch}|${scaleP(spec, atk.length)}`, src: null, gen: true }); g++; }
    while (atk.length > 15) buf.unshift(atk.pop());
    // new buffs (types not already present)
    const have = new Set(buf.map(b => { const p = b.sp.split('|'); return p[1] === 'buff' ? (p[2].match(/\b(atk|aspd|crit|def|spd|ls|cdr)\b/) || [])[1] : p[1]; }));
    const BT = melee(cls.role) ? ['atk', 'aspd', 'crit', 'ls', 'def', 'spd', 'cdr', 'shield'] : cls.role === 'healer' ? ['heal', 'cdr', 'def', 'atk', 'shield', 'spd', 'crit', 'aspd'] : ['crit', 'cdr', 'atk', 'aspd', 'spd', 'shield', 'def', 'ls'];
    for (const b of BT) { if (buf.length >= 5) break; if (have.has(b)) continue; have.add(b); const n = nm(T[(buf.length + 3) % T.length] + ' ' + BUFFN[b]);
      buf.push({ sp: b === 'shield' ? `${n}|shield|v35 d4 c16` : b === 'heal' ? `${n}|heal|v18 r4 c14` : `${n}|buff|${b} v${{ atk: 25, aspd: 30, crit: 22, def: 40, spd: 35, ls: 12, cdr: 18 }[b]} d8 c${15 + buf.length}`, src: null, gen: true }); }
    // ultimates: keep the original, add three new ones of different kinds
    const ua = new Set(ult.map(u => u.sp.split('|')[1])); let ui = 0;
    const ord = cls.role === 'summoner' ? [5, 1, 0, 2, 3, 4] : melee(cls.role) ? [3, 0, 4, 1, 2, 5] : [1, 2, 0, 4, 3, 5];
    for (const j of ord) { if (ult.length >= 4) break; const [arch, spec] = ULTS[j]; if (ua.has(arch)) continue; ua.add(arch); ult.push({ sp: `${nm(T[(ui + 4) % T.length] + ' ' + ULTN[(cls.idx + ui * 3) % ULTN.length])}|${arch}|${spec}`, src: null, gen: true }); ui++; }
    const all = [...atk.slice(0, 15), ...buf.slice(0, 5), ...ult.slice(0, 4)];
    cls.specs = all.map(o => o.sp); cls.srcIdx = all.map(o => o.src);
    cls.skills = all.map((o, i) => { const s = D.parseSkill(o.sp, i, cls); s.src = o.src; s.gen = !!o.gen; s.unlock = D.UNLOCK[i]; const kd = D.SLOT_KIND(i); s.m = kd === 'atk' ? 3 + Math.min(12, i) : kd === 'buff' ? 12 : 35; if (kd === 'ult') { s.ult = true; s.flags.u = true; } return s; });
  }
})(window.G);
