'use strict';
/* Class-exclusive item sets (30 sets × 6 pieces), set bonuses matched to the class role, 6-piece Set Ultimate (16th skill, key G),
   set codex (click → equip owned pieces), gacha (pet eggs / fashion / class set / wings), GM integration */
(function (G) {
  const U = G.U, D = G.D, S = G.S, UI = G.UI, W = G.W, E = G.E, V = G.VFX, FX = G.FX, TX = G.TX;
  const $ = s => document.querySelector(s), esc = UI.esc;
  const PIECES = ['weapon', 'head', 'chest', 'gloves', 'legs', 'boots'];
  const PIECE_N = { head: 'Crown', chest: 'Raiment', gloves: 'Grasp', legs: 'Tassets', boots: 'Stride' };
  const ROLE_SET = {
    melee: { suf: 'Warplate', b2: { atkP: 6, ls: 3 }, b4: { critDmg: 25, aspd: 8, atkP: 6 }, subs: ['atk', 'atkP', 'crit', 'critDmg', 'ls', 'aspd'], rider: 'execute:70' },
    tank: { suf: 'Bastion', b2: { defP: 10, hpP: 8 }, b4: { dr: 8, ccRes: 15, hpP: 8 }, subs: ['def', 'hp', 'defP', 'hpP', 'dr', 'ccRes'], rider: 'guard:30' },
    caster: { suf: 'Regalia', b2: { elem: 10, atkP: 5 }, b4: { cdr: 10, critDmg: 20, elem: 8 }, subs: ['atk', 'atkP', 'elem', 'cdr', 'critDmg', 'crit'], rider: 'detonate:140' },
    healer: { suf: 'Vestments', b2: { regen: 2, hpP: 8 }, b4: { cdr: 12, defP: 8, hpP: 6 }, subs: ['hp', 'hpP', 'cdr', 'regen', 'def', 'atkP'], rider: 'rally:60' },
    ranged: { suf: 'Huntgear', b2: { crit: 6, aspd: 8 }, b4: { critDmg: 30, atkP: 8 }, subs: ['atk', 'atkP', 'crit', 'critDmg', 'aspd', 'spd'], rider: 'pierceUp:45' },
    assassin: { suf: 'Shroud', b2: { crit: 8, atkP: 6 }, b4: { critDmg: 35, spd: 8, atkP: 4 }, subs: ['atk', 'crit', 'critDmg', 'spd', 'atkP', 'ls'], rider: 'backstab:80' },
    hybrid: { suf: 'Panoply', b2: { atkP: 5, defP: 6 }, b4: { hpP: 8, ls: 4, cdr: 6 }, subs: ['atk', 'def', 'hp', 'atkP', 'defP', 'ls'], rider: 'leech:15' },
    summoner: { suf: 'Vestige', b2: { elem: 8, hpP: 6 }, b4: { cdr: 12, atkP: 8 }, subs: ['atk', 'elem', 'cdr', 'hpP', 'atkP', 'regen'], rider: 'vortex:2' }
  };
  // set ultimates: one per class, own name/pattern
  const ULT = {
    blademaster: ['Thousand Edge Requiem', 'nova', 'p2.2 r3.6 c70 st1 u'], guardian: ['Bulwark of Ages', 'nova', 'p1.4 r4 c70 kb3 u'], berserker: ['Crimson Apocalypse', 'nova', 'p2.6 r3.2 c70 u'],
    paladin: ['Hammer of the Dawnfather', 'ground', 'p2.4 r3 c70 st1.2 u'], pyromancer: ['Sun Collapse', 'ground', 'p2.6 r4 c70 u'], cryomancer: ['Absolute Zero', 'zone', 'p0.6 r4.5 d5 c70 fz1.5 u'],
    stormcaller: ["Heaven's Wrath", 'ground', 'p1.2 r5 n10 c70 u'], necromancer: ['Legion of the Grave', 'summon', 'n5 d14 c70 p1 u'], cleric: ['Miracle of Light', 'heal', 'v60 r6 c70 u'],
    druid: ['World Tree Awakening', 'zone', 'p0.5 r5 d6 c70 rt1 u'], assassin: ['Death Lotus', 'nova', 'p3 r2.6 c70 u'], shadowdancer: ['Eclipse Waltz', 'barrage', 'p0.8 n10 c70 R5 u'],
    ranger: ['Arrowstorm of the Wild', 'ground', 'p1 r5 n14 c70 u'], marksman: ['Orbital Lance', 'beam', 'p4 c70 u'], engineer: ['Doomsday Engine', 'turret', 'n3 d12 c70 p1.2 u'],
    monk: ['Hundred Fist Nirvana', 'barrage', 'p0.6 n14 c70 R3 u'], spellblade: ['Runeblade Cataclysm', 'slash', 'p3.2 r3 c70 u'], beastmaster: ['Primal Stampede', 'summon', 'n4 d12 c70 p1.1 u'],
    chronomancer: ['End of Time', 'zone', 'p0.5 r5 d5 c70 st1 u'], warlock: ['Abyssal Covenant', 'ground', 'p2.4 r4 c70 sil1.5 u'], starhunter: ['Supernova Hunt', 'ground', 'p1.2 r5 n12 c70 u'],
    darkknight: ['Abyss Dominion', 'nova', 'p2.4 r4 c70 pl2 u'], lightbringer: ['Solar Judgment', 'beam', 'p3.6 c70 u'], shadowmancer: ['Ink Leviathan', 'ground', 'p2.6 r4.4 c70 rt1 u'],
    seraph: ['Archangel Descent', 'ground', 'p2.2 r4.5 c70 u'], reaper: ['Final Harvest', 'nova', 'p2.8 r4 c70 u'], demon: ['Inferno Throne', 'zone', 'p0.7 r4.5 d5 c70 u'],
    deity: ['Genesis Eternal', 'ground', 'p3 r5 c70 st1 u'], jester: ['Curtain Call', 'ground', 'p1.2 r5 n16 c70 u'], loki: ['Fimbulwinter Gambit', 'zone', 'p0.6 r5 d5 c70 sl1 u']
  };

  // ---------- build sets ----------
  D.CLASS_SETS = D.CLASSES.map(c => {
    const R = ROLE_SET[c.role] || ROLE_SET.melee; const k = 'cs_' + c.id; const n = `${c.name} ${R.suf}`;
    const u = ULT[c.id] || [c.name + ' Apex', 'ground', 'p2.2 r4 c70 u'];
    const ult = D.parseSkill(`${u[0]}|${u[1]}|${u[2]}`, D.SET_IDX, c); ult.ult = true; ult.flags.u = true; ult.setUlt = true; c.setUlt = ult;
    const fmt = b => Object.entries(b).map(([a, v]) => `${D.STAT_TH[a] || a} +${v}${D.PCT[a] ? '%' : ''}`).join(', ');
    const set = { k, n, cls: c.id, b2: R.b2, b4: R.b4, b6: { fx: 'setult' }, th: [fmt(R.b2), fmt(R.b4), `ปลดล็อกอัลติเมตชุดคลาส «${u[0]}» [G]`], subs: R.subs, cset: true };
    D.ACC_SETS.push(set); return set;
  });
  const CS = k => D.CLASS_SETS.find(x => x.k === k);
  // riders + vfx for set ultimates
  const RIDER_BY_ROLE = r => (ROLE_SET[r] || ROLE_SET.melee).rider;
  for (const c of D.CLASSES) { const [k, v] = RIDER_BY_ROLE(c.role).split(':'); c.setUlt.rider = { k, v: +v }; c.setUlt.base.rider = c.setUlt.rider; const used = new Set(D.CLASSES.map(x => FX.T[x.id][15]).filter(Boolean)); const cand = [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].flatMap(i => FX.T[c.id][i].replace(/@\w+/, '').trim().split(/\s+/)); const mo = cand.find(m => !used.has('apex ' + m)) || cand[0]; FX.T[c.id][15] = 'apex ' + mo; }

  // apex motif: the class weapon descends from the sky as a giant pixel avatar, then shatters into the class element
  const avatarCache = new Map();
  const avatarOf = (cls) => { if (avatarCache.has(cls)) return avatarCache.get(cls); const img = new Image(); img.src = UI.itemIcon({ slot: 'weapon', wpn: D.CLS[cls].weapon, tier: 10, kind: 'gear' }); avatarCache.set(cls, img); return img; };
  V.X = V.X || {};
  V.X.apexwpn = { draw(ctx, cam, f, t) { const img = f.img; if (!img || !img.complete) return; const [sx, sy] = cam.w2s(f.x, f.y); const fall = Math.min(1, t / 0.45); const z = (1 - fall * fall) * 220; const sz = 64 * (1 + (1 - fall) * 0.5); ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = t > 0.8 ? (1 - t) * 5 : 1; ctx.translate(Math.round(sx), Math.round(sy - z - 24)); ctx.rotate(-Math.PI / 4 + 0.785); ctx.drawImage(img, -sz / 2, -sz / 2, sz, sz); ctx.restore(); } };
  FX.M.apex = o => {
    const el = o.elem, pal = D.ELEM[el].pal, cls = o.u ? o.u.cls : 'blademaster', r = o.r || 4;
    V.vignette && V.vignette(pal[3], 1.2); V.circleTex(o.x, o.y, el, r * 1.1, 2.2, { spin: 0.6 }); V.shape(o.x, o.y, 'hexagram', pal[1], r * G.TS * 0.45, 2, { z: 0, spin: -0.5, grow: 0.05 });
    V.fx.push({ k: 'apexwpn', x: o.x, y: o.y, img: avatarOf(cls), t: 0, dur: 1.1 });
    G.E.later(0.45, () => { TX.burst(o.x, o.y, el, 2.2); V.ring(o.x, o.y, r, pal, 0.7, { w: 4, fill: true }); V.rays(o.x, o.y, 16, r * 1.2, pal[0], 0.6, { w: 3 }); V.cracks(o.x, o.y, r * 0.9, 10, pal[1], 1.2); V.shake(9, 0.5); V.flash(pal[0], 0.25); G.zKick = Math.max(G.zKick || 0, 0.08);
      for (let i = 0; i < 40; i++) { const a = U.rf(0, 6.28); V.p(o.x, o.y, 20, Math.cos(a) * U.rf(3, 8), Math.sin(a) * U.rf(3, 8), U.rf(40, 120), U.rf(0.6, 1.2), U.ri(2, 4), U.pick(pal), { grav: 80 }); }
      V.text(o.x, o.y, 'SET ULTIMATE', pal[0], { size: 11, z: 70, dur: 1.4 }); });
    G.E.later(0.8, () => { for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; TX.burst(o.x + Math.cos(a) * r * 0.7, o.y + Math.sin(a) * r * 0.5, el, 0.9); } });
  };
  if (FX.ICONX) FX.ICONX.apex = 'star5';

  // ---------- items ----------
  S.genClassItem = (cls, slot, tier, ilv) => {
    const c = D.CLS[cls], set = D.CLASS_SETS.find(x => x.cls === cls), R = ROLE_SET[c.role] || ROLE_SET.melee;
    const it = S.genItem('gear', tier, ilv, { slot, cls, noBase: true });
    it.set = set.k; it.cset = cls; it.clsOnly = cls; it.affix = tier === 10 ? it.affix : undefined;
    const ms = slot === 'weapon' ? 'atk' : U.pick(D.SLOT[slot].main); it.main = { s: ms, v: S.statVal(ms, it.ilv, it.tier) * 1.12 };
    it.subs = R.subs.slice().sort(() => Math.random() - 0.5).slice(0, Math.max(2, D.SUBS[tier - 1])).map(s => ({ s, v: S.statVal(s, it.ilv, it.tier, 0.4 * U.rf(0.75, 1)) }));
    it.name = slot === 'weapon' ? `${set.n} ${S.weaponName(cls)}` : `${set.n} ${PIECE_N[slot]}`; it.wpn = c.weapon; return it;
  };
  const gen0 = S.genItem; // random drops never roll a class set by accident
  S.genItem = (kind, tier, ilv, o = {}) => { const it = gen0(kind, tier, ilv, o); if (it.set && it.set.startsWith('cs_') && !o.cset) { const pool = D.ACC_SETS.filter(x => !x.cset); it.set = U.pick(pool).k; } return it; };
  const eq0 = S.equip; S.equip = (it) => { if (it && it.clsOnly && it.clsOnly !== S.save.cls) return `ใช้ได้เฉพาะคลาส ${D.CLS[it.clsOnly].name}`; return eq0(it); };
  const cc0 = S.changeClass; S.changeClass = (cls) => { const r = cc0(cls); const s = S.save; if (r) { let n = 0; for (const k of Object.keys(s.eq)) { const it = s.eq[k]; if (it && it.clsOnly && it.clsOnly !== s.cls) { s.inv.push(it); delete s.eq[k]; n++; } } if (n) { UI.toast(`ถอดชุดคลาสเดิม ${n} ชิ้นเก็บเข้ากระเป๋า`, 'info'); S.refreshPlayer(true); } } return r; };
  // icons: unique per class + slot
  const K = UI.ICONKIT, IC = UI.ICONS; const ic0 = UI.itemIcon;
  UI.itemIcon = (it) => {
    if (!it || !it.cset) return ic0(it); const c = D.CLS[it.cset], pal = D.ELEM[c.elem].pal; const m = U.shade(c.col[0], 0.35), a = pal[1]; const t = U.clamp((it.tier || 1) - 1, 0, 9);
    return K.make('CS' + it.cset + it.slot + (t >= 7 ? t : ''), k => {
      if (it.slot === 'weapon') (IC.W[c.weapon] || IC.W.sword)(k, m, a); else (IC.ARM[it.slot] || IC.ARM.chest)(k, m, a);
      k.P([[3, 2], [9, 2], [6, 8]], pal[0]); k.R(5, 3, 2, 2, c.col[1]); // class crest
      k.C(27, 27, 3, c.col[1]); k.R(26, 26, 2, 2, pal[0]);
    }, { spark: [[25, 6], [7, 26]].concat(t >= 8 ? [[16, 4]] : []) });
  };

  // ---------- set codex (character panel tab) + equip owned pieces ----------
  const owned = (k) => { const s = S.save; const all = [...s.inv, ...Object.values(s.eq)].filter(i => i && i.set === k); const by = {}; for (const it of all) { const cur = by[it.slot]; if (!cur || it.tier > cur.tier || (it.tier === cur.tier && it.ilv > cur.ilv)) by[it.slot] = it; } return by; };
  const setCard = (set, P) => { const s = S.save, c = D.CLS[set.cls], by = owned(set.k); const n = PIECES.filter(p => by[p]).length; const worn = PIECES.filter(p => s.eq[p] && s.eq[p].set === set.k).length; const mine = set.cls === s.cls;
    return `<div class="csc ${mine ? 'mine' : ''} ${P.cs === set.k ? 'on' : ''}" style="--ec:${D.ELEM[c.elem].pal[1]}"><button class="cshead" data-act="cs-open" data-k="${set.k}"><img src="${UI.bodyURL(c.id)}" alt=""><span><b>${esc(set.n)}</b><small>${esc(c.name)} · ${D.ROLES[c.role].th}</small></span><i>${n}/6</i></button>
      <div class="cspieces">${PIECES.map(p => { const it = by[p]; return `<span class="icell t${it ? it.tier : 1} ${it ? '' : 'miss'} ${s.eq[p] && s.eq[p].set === set.k ? 'worn' : ''}" title="${it ? esc(it.name) : 'ยังไม่มี'}"><img src="${UI.itemIcon(it || { cset: set.cls, slot: p, tier: 1 })}" alt=""></span>`; }).join('')}</div>
      ${P.cs === set.k ? `<div class="csbody"><div class="csb ${worn >= 2 ? 'act' : ''}"><b>2 ชิ้น</b> ${esc(set.th[0])}</div><div class="csb ${worn >= 4 ? 'act' : ''}"><b>4 ชิ้น</b> ${esc(set.th[1])}</div><div class="csb ult ${worn >= 6 ? 'act' : ''}"><b>6 ชิ้น</b> ${esc(set.th[2])}</div>
        <div class="csult"><img src="${UI.skillIcon(c.setUlt)}" alt=""><div><b>${esc(c.setUlt.name)}</b><small>อัลติเมตชุดคลาส · ปุ่ม G · CD ${c.setUlt.c} วิ</small><p>${esc(D.descSkill(c.setUlt))}</p></div></div>
        <div class="list">${mine ? `<button class="btn primary" data-act="cs-wear" data-k="${set.k}" ${n ? '' : 'disabled'}>สวมใส่ชุดนี้ (${n} ชิ้นที่มี)</button>` : `<button class="btn" data-act="cs-swapwear" data-k="${set.k}" ${n ? '' : 'disabled'}>เปลี่ยนเป็น ${esc(c.name)} แล้วสวมชุด</button>`}<button class="btn" data-act="cs-try" data-k="${set.k}">ดูเอฟเฟกต์อัลติเมต</button><button class="btn" data-act="panel" data-p="gacha">ไปสุ่มชุดคลาส</button></div></div>` : ''}</div>`; };
  const CP = UI.PANELS.char; if (!CP.tabs.find(t => t[0] === 'sets')) CP.tabs.splice(2, 0, ['sets', 'ชุดไอเทมคลาส']);
  const cr0 = CP.render; CP.render = function (tab, P) { if (tab !== 'sets') return cr0.call(this, tab, P); const s = S.save; P.cs = P.cs || 'cs_' + s.cls; const list = D.CLASS_SETS.slice().sort((a, b) => (b.cls === s.cls) - (a.cls === s.cls));
    return `<p class="muted">ชุดไอเทมเฉพาะคลาส ${D.CLASS_SETS.length} ชุด ชุดละ 6 ชิ้น (อาวุธ หมวก เสื้อ ถุงมือ กางเกง รองเท้า) · ใส่ได้เฉพาะคลาสนั้น · โบนัสเข้ากับบทบาทของอาชีพ · ครบ 6 ชิ้นได้อัลติเมตเพิ่มอีก 1 สกิล (ปุ่ม G) · คลิกชุดเพื่อดูและสวมใส่ทันที</p><div class="csgrid">${list.map(x => setCard(x, P)).join('')}</div>`; };
  S.wearSet = (k) => { const s = S.save, by = owned(k); let n = 0; for (const p of PIECES) { const it = by[p]; if (!it || s.eq[p] === it) continue; const i = s.inv.indexOf(it); if (i < 0) continue; s.inv.splice(i, 1); if (s.eq[p]) s.inv.push(s.eq[p]); s.eq[p] = it; n++; } S.refreshPlayer(true); UI.buildSkillbar && UI.buildSkillbar(); return n; };

  // ---------- skill bar: 16th button (set ultimate) ----------
  const rsi0 = UI.refreshSkillIcons; UI.refreshSkillIcons = () => { rsi0(); const p = W.player; const el = UI.skEls && UI.skEls[D.SET_IDX]; if (!el || !p) return; const on = E.unlocked(p, D.SET_IDX); el.hidden = !on; el.classList.add('setult'); };
  const hud0 = UI.refreshHud; let lastOn = null; UI.refreshHud = (full) => { hud0(full); const p = W.player; if (!p || !UI.skEls) return; const on = E.unlocked(p, D.SET_IDX); if (on !== lastOn) { lastOn = on; UI.refreshSkillIcons(); if (on && !full) UI.toast(`ชุดคลาสครบ 6 ชิ้น! ปลดล็อก ${D.CLS[p.cls].setUlt.name} [G]`, 'good'); } };

  // ---------- auto-equip understands class sets ----------
  if (S.classScore) { const cs0 = S.classScore; S.classScore = (st, cls) => cs0(st, cls); }

  // ---------- GACHA ----------
  const MORE_PETS = [
    { k: 'golemling', n: 'Pebble Golem', th: 'โกเล็มก้อนหิน', bonus: { def: 40 }, c: '#9a9080', body: 'golem' }, { k: 'sprout', n: 'Mandra Sprout', th: 'ต้นกล้าแมนดรา', bonus: { regen: 1 }, c: '#6ac85a', body: 'plant' },
    { k: 'imp', n: 'Mischief Imp', th: 'อิมป์ซุกซน', bonus: { crit: 2 }, c: '#c84a6a', body: 'imp' }, { k: 'wisp', n: 'Star Wisp', th: 'ภูตดวงดาว', bonus: { elem: 4 }, c: '#9ad8ff', body: 'elemental' },
    { k: 'frostslime', n: 'Frost Slime', th: 'สไลม์น้ำแข็ง', bonus: { hpP: 3 }, c: '#9ae0ff', body: 'slime' }, { k: 'shadowbat', n: 'Shadow Bat', th: 'ค้างคาวเงา', bonus: { ls: 2 }, c: '#5a4a7a', body: 'bat' },
    { k: 'goldfox', n: 'Golden Fox', th: 'จิ้งจอกทองคำ', bonus: { gold: 12 }, c: '#ffd84a', body: 'beast' }, { k: 'wyrmling', n: 'Void Wyrmling', th: 'มังกรว่างเปล่าน้อย', bonus: { atkP: 5 }, c: '#2a2440', body: 'dragon' }
  ];
  for (const p of MORE_PETS) if (!D.PETS.find(x => x.k === p.k)) D.PETS.push(p);
  const PET_R = { slime: 1, fox: 1, owl: 2, sprout: 1, golemling: 2, frostslime: 2, imp: 3, shadowbat: 3, wisp: 3, goldfox: 4, drake: 4, wyrmling: 5 };
  const RAR = [{ n: 'ธรรมดา', t: 6, w: 52, c: '#8a96a8' }, { n: 'หายาก', t: 7, w: 28, c: '#3a8aff' }, { n: 'มหากาพย์', t: 8, w: 13, c: '#a85cff' }, { n: 'ตำนาน', t: 9, w: 5.5, c: '#ff9a1e' }, { n: 'ปฐมกาล', t: 10, w: 1.5, c: '#ff5ae8' }];
  const rollR = (minR = 0) => { const L = RAR.slice(minR); const tot = L.reduce((a, r) => a + r.w, 0); let x = Math.random() * tot; for (let i = 0; i < L.length; i++) { x -= L[i].w; if (x <= 0) return i + minR; } return minR; };
  const BOX = {
    pet: { n: 'ไข่สัตว์เลี้ยง', d: 'สุ่มสัตว์เลี้ยง 12 แบบ · ตัวที่ซ้ำจะได้ทองคืน 30%', cost: 30000, icon: () => eggIcon('#ffe0b0', '#ff7a3a') },
    fashion: { n: 'กล่องแฟชั่น', d: 'สุ่มชุดแฟชั่นทุกช่อง 10 ธีม', cost: 20000, icon: () => UI.itemIcon({ kind: 'fashion', slot: 'f_body', colors: ['#ff7ab0', '#ffffff'] }) },
    cset: { n: 'กล่องชุดคลาส', d: 'สุ่มชิ้นส่วนชุดคลาสของคลาสปัจจุบัน ระดับ 6–10', cost: 60000, icon: () => UI.itemIcon({ cset: S.save ? S.save.cls : 'blademaster', slot: 'chest', tier: 9 }) },
    wings: { n: 'กล่องปีก', d: 'สุ่มปีกแฟชั่น 10 ธีม ระดับ 6–10', cost: 40000, icon: () => UI.itemIcon({ kind: 'fashion', slot: 'f_wings', colors: ['#bff4ff', '#4a8aff'] }) }
  };
  function eggIcon(c1, c2) { return K.make('egg' + c1 + c2, k => { k.E(16, 17, 10, 13, c1); k.L(8, 18, 24, 14, 2, c2); k.C(12, 11, 2, '#ffffff'); k.C(21, 23, 2, c2); }, { spark: [[25, 6]] }); }
  UI.gachaIcon = k => BOX[k].icon(); UI.GACHA_BOX = BOX; UI.GACHA_RAR = RAR;
  const pull = (k) => { const s = S.save; s.gacha = s.gacha || { pity: {}, tix: 0 }; const pity = s.gacha.pity[k] = (s.gacha.pity[k] || 0) + 1; let ri = rollR(pity >= 30 ? 3 : pity % 10 === 0 ? 2 : 0); if (ri >= 3) s.gacha.pity[k] = 0; const r = RAR[ri];
    if (k === 'pet') { const pool = D.PETS.filter(p => (PET_R[p.k] || 2) <= ri + 2 && (PET_R[p.k] || 2) >= Math.min(ri, 4)); const p = U.pick(pool.length ? pool : D.PETS); s.pets = s.pets || []; const dup = s.pets.includes(p.k); if (dup) s.gold += Math.round(BOX.pet.cost * 0.3); else s.pets.push(p.k); return { r, img: UI.petIcon(p.k), n: p.th + (dup ? ' (ซ้ำ +ทอง)' : ''), new: !dup }; }
    if (k === 'fashion' && S.fashionPack) return S.fashionPack(r);
    if (k === 'fashion' || k === 'wings') { const slot = k === 'wings' ? 'f_wings' : U.pick(D.FASHION_SLOTS).k; const it = S.genItem('fashion', r.t, 1, { slot }); s.fashion.owned.push(it); return { r, img: UI.itemIcon(it), n: it.name, it }; }
    const it = S.genClassItem(s.cls, U.pick(PIECES), r.t, Math.min(100, Math.max(20, Math.round(s.lvl / 2) + r.t * 3))); S.addItem(it, true); return { r, img: UI.itemIcon(it), n: it.name, it };
  };
  UI.PANELS.gacha = { title: 'สุ่มไข่ / กล่องสุ่ม', render(tab, P) { const s = S.save; s.gacha = s.gacha || { pity: {}, tix: 0 };
    return `<div class="gachapage"><div class="gboxes">${Object.entries(BOX).map(([k, b]) => `<div class="gbox"><div class="gimg"><img src="${b.icon()}" alt=""></div><b>${b.n}</b><small>${b.d}</small><small class="pity">การันตีมหากาพย์ทุก 10 ครั้ง · ตำนานภายใน 30 ครั้ง (นับ ${s.gacha.pity[k] || 0})</small>
      <div class="gbtns"><button class="sprice" data-act="g-pull" data-k="${k}" data-n="1"><img src="${UI.curIcon('gold')}" alt="">${U.fmt(b.cost)} ×1</button><button class="sprice" data-act="g-pull" data-k="${k}" data-n="10"><img src="${UI.curIcon('gold')}" alt="">${U.fmt(b.cost * 9)} ×10</button>${s.gacha.tix ? `<button class="sprice tix" data-act="g-pull" data-k="${k}" data-n="1" data-tix="1">ตั๋ว ×1 (มี ${s.gacha.tix})</button>` : ''}</div></div>`).join('')}</div>
      <h4>อัตราการออก</h4><div class="grates">${RAR.map(r => `<span style="--rc:${r.c}"><b>${r.n}</b> ระดับ ${r.t} · ${r.w}%</span>`).join('')}</div>
      ${P.res ? `<h4>ผลการสุ่ม</h4><div class="gres">${P.res.map((x, i) => `<div class="gcard" style="--rc:${x.r.c};animation-delay:${i * 0.07}s"><div class="icell t${x.r.t}"><img src="${x.img}" alt=""></div><b>${esc(x.n)}</b><small style="color:${x.r.c}">${x.r.n}</small></div>`).join('')}</div>` : ''}</div>`; } };
  const act0 = UI.act;
  UI.act = (el, e) => {
    const a = el.dataset.act; if (!a || !(a.startsWith('cs-') || a.startsWith('g-') || a.startsWith('gmcs'))) return act0(el, e);
    const s = S.save, P = UI.panel;
    switch (a) {
      case 'cs-open': P.cs = P.cs === el.dataset.k ? null : el.dataset.k; break;
      case 'cs-wear': { const n = S.wearSet(el.dataset.k); UI.toast(n ? `สวมชุด ${CS(el.dataset.k).n} เพิ่ม ${n} ชิ้น` : 'สวมชิ้นที่มีอยู่แล้ว', n ? 'good' : 'info'); break; }
      case 'cs-swapwear': { const set = CS(el.dataset.k); if (W.mode && W.mode.pvp) return UI.toast('เปลี่ยนคลาสไม่ได้ระหว่าง PvP', 'bad'); S.changeClass(set.cls); const n = S.wearSet(set.k); UI.toast(`เปลี่ยนเป็น ${D.CLS[set.cls].name} และสวมชุด ${n} ชิ้น`, 'good'); P.cs = set.k; break; }
      case 'cs-try': { const set = CS(el.dataset.k); UI.closePanel(); if (!W.mode || W.mode.kind !== 'gallery') S.goGallery(); setTimeout(() => { const p = W.player; if (s.cls !== set.cls) S.changeClass(set.cls); const sk = D.CLS[set.cls].setUlt; const t = E.nearestEnemy(p, 12) || { x: p.x + 3, y: p.y }; p.sets = Object.assign({}, p.sets, { setult: true }); p.cds[15] = 0; p.gcd = 0; p.res = p.resMax; E.cast(p, D.SET_IDX, { x: t.x, y: t.y, u: t.u || t }); UI.ultBanner(p, sk); }, 700); return; }
      case 'g-pull': { const k = el.dataset.k, n = +el.dataset.n; s.gacha = s.gacha || { pity: {}, tix: 0 }; if (el.dataset.tix) { if (s.gacha.tix < 1) return; s.gacha.tix--; } else { const cost = BOX[k].cost * (n === 10 ? 9 : 1); if (s.gold < cost) return UI.toast('ทองไม่พอ', 'bad'); s.gold -= cost; }
        P.res = []; for (let i = 0; i < n; i++) P.res.push(pull(k)); const best = P.res.reduce((m, x) => RAR.indexOf(x.r) > RAR.indexOf(m.r) ? x : m); if (RAR.indexOf(best.r) >= 3) { UI.announce(best.r.n + '!', best.n); W.player && V.pillar && V.pillar(W.player.x, W.player.y, best.r.c, 80, 0.8, 8); } S.persist(); S.refreshPlayer(); break; }
    }
    UI.renderPanel();
  };
  // menu button
  if (UI.ICONS) UI.ICONS.MENU.gacha = k => { k.E(16, 17, 10, 13, '#ffe0b0'); k.L(8, 18, 24, 14, 2, '#ff7a3a'); k.C(12, 11, 2, '#ffffff'); k.C(21, 23, 2, '#ff7a3a'); };
  const bind0 = UI.bindHud; UI.bindHud = function () { const r = bind0.apply(this, arguments); const m = $('#menu'); if (m && !m.querySelector('[data-p=gacha]')) { const b = document.createElement('button'); b.dataset.act = 'panel'; b.dataset.p = 'gacha'; b.innerHTML = `<img src="${UI.menuIcon('gacha')}" alt=""><span>สุ่มกล่อง</span>`; m.insertBefore(b, m.querySelector('[data-p=settings]')); } return r; };

  // ---------- GM: class sets + gacha tickets ----------
  const gmR = UI.gmRender;
  UI.gmRender = (tab, P) => {
    let h = gmR(tab, P); if (tab !== 'item') return h;
    h = h.replace('<div class="gmcats">', `<div class="gmcats"><button class="gcat ${P.gcat === 'cset' ? 'on' : ''}" data-act="gm" data-c="gmset" data-f="gcat" data-v="cset"><img src="${UI.itemIcon({ cset: 'seraph', slot: 'head', tier: 9 })}" alt="">ชุดคลาส ${D.CLASS_SETS.length}</button>`);
    if (P.gcat !== 'cset') return h; P.gcs = P.gcs || S.save.cls; const set = D.CLASS_SETS.find(x => x.cls === P.gcs); const t = P.gt || 10;
    const body = `<div class="gmrow"><b>ระดับ</b>${D.TIERS.map((T, i) => `<button class="tchip t${i + 1} ${t === i + 1 ? 'on' : ''}" data-act="gm" data-c="gmset" data-f="gt" data-v="${i + 1}">${i + 1}</button>`).join('')}</div>
      <div class="gmcls mini">${D.CLASSES.map(k => `<button class="ccard ${P.gcs === k.id ? 'sel' : ''}" data-act="gmcs-cls" data-v="${k.id}" title="${esc(k.name)}"><img src="${UI.bodyURL(k.id)}" alt=""><small>${esc(k.name)}</small></button>`).join('')}</div>
      <h4>${esc(set.n)} — คลิกชิ้นเพื่อเสก</h4><div class="gmgrid">${PIECES.map(p => `<button class="gcell" data-act="gmcs-give" data-v="${p}"><div class="icell t${t}"><img src="${UI.itemIcon({ cset: set.cls, slot: p, tier: t })}" alt=""></div><span>${esc(p === 'weapon' ? S.weaponName(set.cls) : PIECE_N[p])}</span></button>`).join('')}</div>
      <div class="list"><button class="btn primary" data-act="gmcs-full">เสกชุดเต็ม 6 ชิ้น ระดับ ${t}</button><button class="btn" data-act="gmcs-wear">เสกและสวมทันที (เปลี่ยนเป็นคลาสนี้)</button><button class="btn" data-act="gmcs-all">เสกชุดเต็มทุกคลาส (${D.CLASS_SETS.length * 6} ชิ้น)</button><button class="btn" data-act="gmcs-tix">ตั๋วสุ่ม +50</button><button class="btn" data-act="gmcs-pets">ปลดล็อกสัตว์เลี้ยง ${D.PETS.length} ตัว</button></div>
      <p class="muted">${esc(set.th.map((x, i) => `${[2, 4, 6][i]} ชิ้น: ${x}`).join(' · '))}</p>`;
    return h.replace(/<div class="gmmain">[\s\S]*$/, `<div class="gmmain">${body}</div></div>`);
  };
  const act1 = UI.act;
  UI.act = (el, e) => {
    const a = el.dataset.act; if (!a || !a.startsWith('gmcs')) return act1(el, e); const s = S.save, P = UI.panel; const t = P.gt || 10; const cls = P.gcs || s.cls; const ilv = Math.max(60, Math.round(s.lvl / 2));
    switch (a) {
      case 'gmcs-cls': P.gcs = el.dataset.v; break;
      case 'gmcs-give': { const it = S.genClassItem(cls, el.dataset.v, t, ilv); S.addItem(it, true); UI.toast(`GM: ได้รับ ${it.name}`, 'item', t); break; }
      case 'gmcs-full': for (const p of PIECES) S.addItem(S.genClassItem(cls, p, t, ilv), true); UI.toast(`GM: ได้รับชุด ${D.CLASS_SETS.find(x => x.cls === cls).n} ครบ 6 ชิ้น`, 'good'); break;
      case 'gmcs-wear': { if (s.cls !== cls) S.changeClass(cls); for (const p of PIECES) S.addItem(S.genClassItem(cls, p, t, ilv), true); const k = 'cs_' + cls; S.wearSet(k); UI.toast('สวมชุดคลาสครบ 6 ชิ้น · กด G ใช้อัลติเมตชุด', 'good'); break; }
      case 'gmcs-all': for (const c of D.CLASSES) for (const p of PIECES) S.addItem(S.genClassItem(c.id, p, t, ilv), true); UI.toast(`GM: เสกชุดคลาสครบทุกคลาสแล้ว`, 'good'); break;
      case 'gmcs-tix': s.gacha = s.gacha || { pity: {}, tix: 0 }; s.gacha.tix += 50; UI.toast('ตั๋วสุ่ม +50', 'good'); break;
      case 'gmcs-pets': s.pets = D.PETS.map(p => p.k); UI.toast('ปลดล็อกสัตว์เลี้ยงทั้งหมด', 'good'); break;
    }
    S.persist(); UI.renderPanel();
  };
})(window.G);
