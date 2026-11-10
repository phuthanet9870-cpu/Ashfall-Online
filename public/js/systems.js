'use strict';
/* Systems: save/profile, items, stats, loot, economy, quests, codex, mercs, guild data, player control */
(function (init) {
  (globalThis.ASHFALL_SIM_FACTORIES ||= {})['systems'] = init;
  if (typeof window !== 'undefined') init(window.G ||= {});
})(function (G) {
  const U = G.U, D = G.D, E = G.E, W = G.W, V = G.VFX, SPR = G.SPR;
  const S = G.S = {};
  const KEY = 'ashfall_save_v1';
  S.save = null;
  S.IN = { keys: new Set(), mouse: null, mouseW: null, clickMove: null, queue: -1, manualT: 0 };
  S.auto = { on: false, quest: false };

  // ---------------- save ----------------
  S.newSave = (name, cls) => ({
    v: 1, name, cls, lvl: 1, xp: 0, gold: 3000, honor: 0, war: 0, runeDust: 0, jewelDust: 0, thread: 0,
    bag: { hpPot: 10, mpPot: 5, ret: 3, foodXp: 0, foodDrop: 0, protect: 0, reforge: 0, stones: Array(10).fill(0) },
    inv: [], eq: {}, runeBoard: [Array(7).fill(null), Array(7).fill(null), Array(7).fill(null)], page: 0,
    skillRunes: {}, ownedSR: {}, fashion: { eq: {}, owned: [] }, pet: null, mount: null, pets: [], mounts: [],
    dungeons: {}, quests: { main: 0, prog: 0, daily: { date: '', prog: {}, done: {} } }, codex: {}, ach: {}, title: null,
    guild: null, rivals: [], mercs: {}, mercPresets: [[], [], []], pvp: { wins: 0, losses: 0, mmr: 1000 }, infamy: 0,
    settings: { ps: 0, quality: 1, autoPot: true, autoSell: false, autoLoot: true }, stats: { kills: 0, floors: 0, deaths: 0 }, foods: {}, created: Date.now(), lastTown: 'haven'
  });
  S.load = () => { try { const s = globalThis.ASHFALL_STORAGE.getItem(KEY); if (s) return JSON.parse(s); } catch (e) { } return null; };
  S.persist = () => { if (!S.save) return; try { globalThis.ASHFALL_STORAGE.setItem(KEY, JSON.stringify(S.save)); } catch (e) { } };
  S.wipe = () => { try { globalThis.ASHFALL_STORAGE.removeItem(KEY); } catch (e) { } };
  S.exportSave = () => JSON.stringify(S.save);
  S.importSave = (txt) => { const o = JSON.parse(txt); if (!o || !o.cls) throw new Error('bad'); S.save = o; S.persist(); };

  // ---------------- xp ----------------
  S.xpNeed = L => Math.floor(60 * Math.pow(L, 1.85) + 100);
  S.gainXp = (n) => {
    const s = S.save; if (s.lvl >= D.MAX_LV) return; const st = W.player ? W.player.st : {};
    n *= (1 + (st.xp || 0) / 100) * W.gm.xp * (S.foodActive('foodXp') ? 1.5 : 1);
    s.xp += n; let up = false;
    while (s.lvl < D.MAX_LV && s.xp >= S.xpNeed(s.lvl)) { s.xp -= S.xpNeed(s.lvl); s.lvl++; up = true; S.onLevel(s.lvl); }
    if (s.lvl >= D.MAX_LV) s.xp = 0;
    if (up) S.refreshPlayer(true);
  };
  S.setLevel = (L) => { S.save.lvl = U.clamp(L | 0, 1, D.MAX_LV); S.save.xp = 0; for (const a of [50, 100, 200, 250]) if (S.save.lvl >= a) S.ach('lv' + a); S.refreshPlayer(true); };
  S.onLevel = (L) => {
    const p = W.player; if (p) { V.pillar(p.x, p.y, '#ffd84a', 120, 1.2, 14); V.ring(p.x, p.y, 2.5, D.ELEM.holy.pal, 0.8, { w: 4 }); V.burst(p.x, p.y, 10, D.ELEM.holy.pal, 40, 4, 1, 3); }
    G.UI.announce('LEVEL UP!', `เลเวล ${L}`); G.UI.log(`เลเวลอัปเป็น ${L}`, 'sys');
    D.UNLOCK.forEach((u, i) => { if (u === L) G.UI.toast(`ปลดล็อกสกิลใหม่: ${D.CLS[S.save.cls].skills[i].name} [${D.KEYS[i]}]`, 'good'); });
    D.RUNE_BOARD.forEach((r, i) => { if (r.lv === L) G.UI.toast(`เปิดช่องรูนใหม่ (${D.RUNE_COLORS[r.c].th})`, 'good'); });
    for (const a of [50, 100, 200, 250]) if (L >= a) S.ach('lv' + a);
  };

  // ---------------- foods ----------------
  S.foodActive = k => (S.save.foods[k] || 0) > Date.now();
  S.useFood = k => { if (S.save.bag[k] <= 0) return G.UI.toast('ไม่มีไอเทมนี้', 'bad'); S.save.bag[k]--; S.save.foods[k] = Math.max(Date.now(), S.save.foods[k] || 0) + 30 * 60e3; G.UI.toast(k === 'foodXp' ? 'บัฟ EXP +50% 30 นาที' : 'บัฟดรอป +30% 30 นาที', 'good'); };

  // ---------------- items ----------------
  const pickDistinct = (pool, n, excl) => { const p = pool.filter(x => x !== excl); const out = []; while (out.length < n && p.length) out.push(p.splice(Math.floor(Math.random() * p.length), 1)[0]); return out; };
  S.statVal = (stat, ilv, tier, f = 1) => { const v = D.statBase(stat, ilv) * D.TIER_MULT[tier - 1] * f; return D.PCT[stat] ? Math.round(v * 10) / 10 : Math.round(v); };
  S.weaponName = cls => ({ sword: 'Sword', mace: 'Mace', axe: 'Axe', hammer: 'Warhammer', staff: 'Staff', orb: 'Orb', scythe: 'Scythe', book: 'Codex', daggers: 'Daggers', blades: 'Twin Blades', bow: 'Bow', rifle: 'Rifle', wrench: 'Wrench', fists: 'Knuckles', spear: 'Spear', hourglass: 'Hourglass', tome: 'Grimoire', starbow: 'Star Bow', greatsword: 'Abyss Blade', prism: 'Prism Staff', lurerod: 'Lure Rod', halospear: 'Halo Spear', demonclaw: 'Hellclaws', scepter: 'Scepter', jesterstick: 'Jester Stick', trickstaff: 'Trickster Staff' }[D.CLS[cls].weapon]);
  S.genItem = (kind, tier, ilv, o = {}) => {
    tier = U.clamp(tier | 0, 1, 10); ilv = U.clamp(Math.round(ilv), 1, 100);
    const it = { uid: U.uid(), kind, tier, ilv };
    if (kind === 'gear' || kind === 'acc') {
      const slots = kind === 'gear' ? D.GEAR_SLOTS : D.ACC_SLOTS; let sl = o.slot ? D.SLOT[o.slot] : U.pick(slots);
      if (kind === 'acc' && (sl.k === 'earring2')) sl = D.SLOT.earring1; if (kind === 'acc' && sl.k === 'ring2') sl = D.SLOT.ring1;
      it.slot = sl.k; const ms = U.pick(sl.main); it.main = { s: ms, v: S.statVal(ms, ilv, tier) };
      it.subs = pickDistinct(D.SUB_POOL, D.SUBS[tier - 1], ms).map(s => ({ s, v: S.statVal(s, ilv, tier, 0.35 * U.rf(0.6, 1)) }));
      it.sockets = Array(D.SOCKETS[tier - 1]).fill(null); it.lv = 0;
      if (tier >= 4 && (Math.random() < 0.35 || o.set)) { const pool = kind === 'gear' ? D.GEAR_SETS : D.ACC_SETS; const st = o.set ? pool.find(x => x.k === o.set) || U.pick(pool) : U.pick(pool.filter(x => o.pvp || x.k !== 'warlord' && x.k !== 'gladiator')); it.set = st.k; }
      if (tier === 10) it.affix = U.pick(D.T10_AFFIX).k;
      const cls = o.cls || (S.save && S.save.cls) || 'blademaster';
      const setN = it.set ? (kind === 'gear' ? D.GEAR_SETS : D.ACC_SETS).find(x => x.k === it.set).n : D.TIER_PREFIX[tier - 1];
      it.name = setN + ' ' + (it.slot === 'weapon' ? S.weaponName(cls) : D.SLOT_NAMES[it.slot]); if (it.slot === 'weapon') it.wpn = D.CLS[cls].weapon;
    } else if (kind === 'relic') {
      const r = o.relic ? D.RELICS.find(x => x.k === o.relic) : U.pick(D.RELICS); it.slot = 'relic'; it.relic = r.k; it.name = r.n; if (r.v) it.rv = r.v[tier - 1];
      it.main = r.stat ? { s: r.stat, v: r.v[tier - 1] } : null; it.subs = pickDistinct(D.SUB_POOL, Math.max(1, D.SUBS[tier - 1] - 1), null).map(s => ({ s, v: S.statVal(s, ilv, tier, 0.3 * U.rf(0.6, 1)) })); it.sockets = []; it.lv = 0;
    } else if (kind === 'rune') {
      const color = o.color || (Math.random() < 0.08 ? 'core' : U.pick(['red', 'blue', 'green'])); it.color = color; it.lv = 0;
      if (color === 'core') { const c = o.core ? D.CORE_RUNES.find(x => x.k === o.core) : U.pick(D.CORE_RUNES); it.core = c.k; it.name = c.n; it.subs = []; it.main = null; }
      else { const ms = U.pick(D.RUNE_COLORS[color].main); it.main = { s: ms, v: S.statVal(ms, ilv, tier, 0.6) }; it.subs = pickDistinct(D.SUB_POOL, D.SUBS[tier - 1], ms).map(s => ({ s, v: S.statVal(s, ilv, tier, 0.22 * U.rf(0.6, 1)) }));
        const pool = D.RUNE_SETS.filter(x => o.pvp ? x.pvp : !x.pvp); const st = U.pick(pool); it.set = st.k; it.name = st.n + ' Rune'; }
    } else if (kind === 'gem') {
      const g = o.gem ? D.GEMS.find(x => x.k === o.gem) : U.pick(D.GEMS); it.gem = g.k; it.main = { s: g.stat, v: S.statVal(g.stat, ilv, tier, 0.5) }; it.name = g.n + ' T' + tier;
    } else if (kind === 'fashion') {
      const sl = o.slot ? D.FASHION_SLOTS.find(x => x.k === o.slot) : U.pick(D.FASHION_SLOTS); const th = o.theme ?? Math.floor(Math.random() * D.FASHION_THEMES.length);
      it.slot = sl.k; it.theme = th; it.colors = D.FASHION_THEMES[th].c.slice(); it.name = D.FASHION_THEMES[th].n + ' ' + sl.th;
    }
    return it;
  };
  S.itemPrice = it => Math.round(15 * Math.pow(it.tier, 2.3) * (1 + (it.ilv || 1) / 15));
  S.isEquip = it => it.kind === 'gear' || it.kind === 'acc' || it.kind === 'relic';
  S.invMax = 300;
  S.addItem = (it, quiet) => {
    const s = S.save;
    if (it.kind === 'stone') { s.bag.stones[it.tier - 1] += it.n || 1; if (!quiet) G.UI.toast(`ได้รับ หินตีบวก T${it.tier} x${it.n || 1}`, 'item', it.tier); return true; }
    if (it.kind === 'cur') { s[it.cur] += it.n; if (!quiet) G.UI.toast(`ได้รับ ${it.label} +${U.fmt(it.n)}`, 'item', it.tier || 1); return true; }
    if (it.kind === 'cons') { s.bag[it.key] = (s.bag[it.key] || 0) + (it.n || 1); if (!quiet) G.UI.toast(`ได้รับ ${it.label} x${it.n || 1}`, 'item', it.tier || 1); return true; }
    if (it.kind === 'srune') {
      const key = it.cls + '_' + it.idx + '_' + it.v; if (s.ownedSR[key]) { s.runeDust += 20 * it.tier; if (!quiet) G.UI.toast(`รูนสกิลซ้ำ → Rune Dust +${20 * it.tier}`, 'item', 3); return true; }
      s.ownedSR[key] = true; if (!quiet) G.UI.toast(`ปลดล็อกรูนสกิล: ${D.CLS[it.cls].skills[it.idx].name} (${D.VARIANTS[it.v].th})`, 'item', 6); return true;
    }
    if (it.kind === 'fashion') { s.fashion.owned.push(it); if (!quiet) G.UI.toast(`ได้รับชุดแฟชั่น: ${it.name}`, 'item', it.tier); return true; }
    if (s.inv.length >= S.invMax) {
      if (s.settings.autoSell) { s.gold += S.itemPrice(it); return true; }
      G.UI.toast('กระเป๋าเต็ม! ขายหรือแยกชิ้นส่วนไอเทมก่อน', 'bad'); return false;
    }
    if (s.settings.autoSell && it.tier <= 2 && S.isEquip(it)) { s.gold += S.itemPrice(it); return true; }
    s.inv.push(it); if (!quiet) G.UI.toast(`ได้รับ ${it.name} (iLv ${it.ilv})`, 'item', it.tier);
    return true;
  };

  // dungeon / farm reward item by drop type
  S.rollDrop = (dropType, tier, ilv) => {
    const cls = S.save.cls;
    switch (dropType) {
      case 'gear': return Math.random() < 0.12 ? S.genItem('gem', tier, ilv) : S.genItem('gear', tier, ilv, { cls, slot: Math.random() < 0.3 ? 'weapon' : null });
      case 'rune': return Math.random() < 0.22 ? { kind: 'srune', cls, idx: U.ri(0, 14), v: U.ri(1, 3), tier } : Math.random() < 0.15 ? { kind: 'cur', cur: 'runeDust', n: 30 * tier, label: 'Rune Dust', tier } : S.genItem('rune', tier, ilv);
      case 'item': return U.wpick([[() => ({ kind: 'stone', tier, n: U.ri(1, 3) }), 4], [() => S.genItem('gem', tier, ilv), 3], [() => ({ kind: 'cons', key: 'protect', n: 1, label: 'Protect Scroll', tier }), 1], [() => ({ kind: 'cons', key: 'reforge', n: 1, label: 'Reforge Scroll', tier }), 1.2], [() => ({ kind: 'cons', key: 'hpPot', n: U.ri(3, 8), label: 'HP Potion', tier: 1 }), 1.5], [() => ({ kind: 'cur', cur: 'gold', n: Math.round(80 * tier * tier * (1 + ilv / 20)), label: 'ทอง', tier }), 1.5]])();
      case 'fashion': return Math.random() < 0.15 ? { kind: 'cur', cur: 'thread', n: 5 * tier, label: 'ด้ายแฟชั่น', tier } : Object.assign(S.genItem('fashion', tier, ilv), {});
      case 'jewel': return Math.random() < 0.12 ? S.genItem('relic', tier, ilv) : Math.random() < 0.1 ? { kind: 'cur', cur: 'jewelDust', n: 25 * tier, label: 'Jewel Dust', tier } : S.genItem('acc', tier, ilv, { cls });
      case 'farm': return U.wpick([[() => S.genItem('gear', tier, ilv, { cls }), 45], [() => S.genItem('acc', tier, ilv, { cls }), 20], [() => S.genItem('gem', tier, ilv), 8], [() => ({ kind: 'cur', cur: 'runeDust', n: 8 * tier, label: 'Rune Dust', tier }), 9], [() => ({ kind: 'cur', cur: 'jewelDust', n: 6 * tier, label: 'Jewel Dust', tier }), 8], [() => ({ kind: 'stone', tier, n: 1 }), 10]])();
    }
  };
  S.rollTier = dist => { let r = Math.random(); for (const [t, p] of dist) { r -= p; if (r <= 0) return t; } return dist[dist.length - 1][0]; };

  // ---------------- player stats ----------------
  S.accUnlocked = (slotK) => { const sl = D.SLOT[slotK]; if (!sl || sl.unlock === undefined) return true; const best = (S.save.dungeons.jewel || {}).best || 0; return best >= sl.unlock || W.gm.allSlots; };
  S.runeSlotOpen = i => S.save.lvl >= D.RUNE_BOARD[i].lv || W.gm.allSlots;
  S.calcPlayer = () => {
    const s = S.save; const st = E.baseStats(s.cls, s.lvl); const sets = {}; const flags = {};
    const add = (k, v) => { if (k in st) st[k] += v; };
    for (const k in s.eq) {
      const it = s.eq[k]; if (!it) continue; if (it.kind === 'acc' && !S.accUnlocked(k)) continue;
      const mult = it.kind === 'gear' ? 1 + 0.06 * (it.lv || 0) : 1 + 0.05 * (it.lv || 0);
      if (it.main) add(it.main.s, it.main.v * mult);
      for (const sb of it.subs || []) add(sb.s, sb.v);
      for (const g of it.sockets || []) if (g) add(g.main.s, g.main.v);
      if (it.set) sets[it.set] = (sets[it.set] || 0) + 1;
      if (it.relic) { flags.relic = it.relic; flags.relicV = it.rv; }
      if (it.affix) flags.affix = it.affix;
    }
    const fx = {};
    for (const gs of D.GEAR_SETS) { const n = sets[gs.k] || 0; if (n >= 3) E.addStats(st, gs.b3); if (n >= 6) E.addStats(st, gs.b6); }
    for (const as of D.ACC_SETS) { const n = sets[as.k] || 0; [['b2', 2], ['b4', 4], ['b6', 6]].forEach(([b, req]) => { if (n >= req) { const bb = as[b]; if (bb.fx) fx[bb.fx] = true; else E.addStats(st, bb); } }); }
    // runes
    const page = s.runeBoard[s.page] || []; const rs = {};
    page.forEach((r, i) => { if (!r || !S.runeSlotOpen(i)) return; if (r.core) { flags.core = r.core; return; } const m = 1 + 0.08 * (r.lv || 0); if (r.main) add(r.main.s, r.main.v * m); (r.subs || []).forEach(sb => add(sb.s, sb.v)); if (r.set) rs[r.set] = (rs[r.set] || 0) + 1; });
    for (const set of D.RUNE_SETS) { const n = rs[set.k] || 0; if (n >= 2) E.addStats(st, set.b2); if (n >= 4) E.addStats(st, set.b4); }
    if (flags.core === 'vampire') st.ls += 10;
    // achievements & codex
    for (const a of D.ACHIEVEMENTS) if (s.ach[a.id]) E.addStats(st, a.bonus);
    const cdx = Object.values(s.codex).filter(n => n >= 50).length; st.atkP += Math.min(5, cdx * 0.25);
    if (s.pet) { const p = D.PETS.find(x => x.k === s.pet); if (p) E.addStats(st, p.bonus); }
    if (S.foodActive('foodDrop')) st.drop += 30;
    if (S.guildTop3()) st.drop += 10;
    E.finalize(st);
    return { st, flags, fx, sets, cp: E.cp(st) };
  };
  S.lookPlayer = () => SPR.lookFor(S.save.cls, S.fashionMap());
  S.fashionMap = () => S.save.fashion.eq;
  S.makePlayer = (x, y) => {
    const s = S.save; const c = S.calcPlayer();
    const u = E.heroUnit(s.cls, s.lvl, 0, { x, y, name: s.name, stats: c.st, look: S.lookPlayer() });
    S.applyFlags(u, c); u.isPlayer = true; u.home = { x, y };
    W.player = u; E.spawn(u); S.setupPet(u); return u;
  };
  S.applyMount=(u,key)=>{
    const mt = D.MOUNTS.find(m => m.k === key); u.mountDef = mt || null; u.mountSpr = mt ? SPR.petSprite(mt.k === 'griffin' ? 'beast' : mt.k === 'warmount' ? 'golem' : 'beast', mt.c) : null;
    if (mt) { const full = SPR.monSheet(mt.k === 'warmount' ? 'golem' : 'beast', mt.c, U.shade(mt.c, -0.35)); u.mountSpr = full; }
  };
  S.applyFlags = (u, c) => {
    u.relic = c.flags.relic; u.relicV = c.flags.relicV; u.core = c.flags.core; u.affix = c.flags.affix; u.sets = c.fx;
    const s = S.save; const sr = s.skillRunes[s.cls] || {}; u.runes = []; for (let i = 0; i < D.NSK; i++) u.runes[i] = sr[i] || 0;
    u.fashion = s.fashion.eq; const fr = s.fashion.eq.f_frame; u.frame = fr ? fr.colors[1] : null; u.title = s.title; u.guildTag = s.guild ? s.guild.tag : null;
    S.applyMount(u,s.mount);
    u.cpv = c.cp; u.pk = s.pk;
  };
  S.refreshPlayer = (heal) => {
    const u = W.player; if (!u) return; const s = S.save; const c = S.calcPlayer();
    if (W.mode && W.mode.normalized) { c.st = E.normalizedStats(s.cls); c.cp = E.cp(c.st); }
    if (u.cls !== s.cls) { u.cls = s.cls; u.build = D.CLS[s.cls].build; u.cds.fill(0); u.gcd = 0; u.pending = null; u.res = u.build ? 50 : u.resMax; }
    u.lvl = s.lvl; u.st0 = c.st; u.look = S.lookPlayer(); S.applyFlags(u, c); E.recalc(u); if (E.cp) { const b0 = E.cp(c.st), n0 = E.cp(u.st); if (b0 > 0) u.cpv = Math.round(c.cp * Math.max(1, n0 / b0)); } if (heal) { u.hp = u.maxhp; u.res = u.resMax; }
    if (W.pet) S.setupPet(u);
    G.UI && G.UI.refreshHud && G.UI.refreshHud(true);
  };
  S.changeClass = (cls) => {
    const s = S.save; if (!D.CLS[cls] || s.cls === cls) return false; s.cls = cls; S.refreshPlayer(true);
    const u = W.player; if (u) { const pal = D.ELEM[D.CLS[cls].elem].pal; V.pillar(u.x, u.y, pal[1], 150, 1, 16); V.ring(u.x, u.y, 2.4, pal, 0.7, { w: 4, fill: true }); V.burst(u.x, u.y, 12, pal, 40, 4, 0.9, 3); if (V.circleTex) V.circleTex(u.x, u.y, D.CLS[cls].elem, 2.2, 1.2, { spin: 2 }); }
    G.UI.buildSkillbar(); G.UI.refreshHud(true); G.UI.toast(`เปลี่ยนเป็น ${D.CLS[cls].name} (${D.CLS[cls].th}) — สกิลทั้ง 15 เปลี่ยนแล้ว`, 'good'); S.persist(); return true;
  };
  S.setupPet = (u) => { const s = S.save; const p = D.PETS.find(x => x.k === s.pet); if (!p || (W.mode && W.mode.noPet)) { W.pet = null; return; } W.pet = { x: u.x - 0.8, y: u.y + 0.5, spr: SPR.petSprite(p.body, p.c), def: p, flip: false, moving: false }; };

  // ---------------- loot on ground ----------------
  S.dropLoot = (x, y, item) => {
    const tier = item.tier || 1; const a = Math.random() * 6.28, r = U.rf(0.3, 1.2);
    let lx = x + Math.cos(a) * r, ly = y + Math.sin(a) * r; if (E.blocked(lx, ly)) { lx = x; ly = y; }
    W.loots.push({ x: lx, y: ly, item, tier, t: 0 });
    if (E.vis(lx, ly)) { V.pillar(lx, ly, D.tierColor(tier), 20 + tier * 8, 0.8, 4); if (tier >= 7) { V.burst(lx, ly, 6, [D.tierColor(tier), '#ffffff', D.tierColor(tier)], 20, 3, 0.8, 2); V.text(lx, ly, D.TIERS[tier - 1].n + '!', D.tierColor(tier), { size: 10, dur: 1.6 }); } }
  };
  S.updateLoot = (dt) => {
    const p = W.player; if (!p) return; const pet = W.pet;
    for (let i = W.loots.length - 1; i >= 0; i--) {
      const l = W.loots[i]; l.t += dt; if (l.t > 120) { W.loots.splice(i, 1); continue; }
      const dP = U.d2(l.x, l.y, p.x, p.y); const petR = pet && S.save.settings.autoLoot ? 36 : 0;
      if (!p.dead && (dP < 0.8 || dP < petR && l.t > 0.6 || W.mode && W.mode.kind === 'dungeon' && dP < 16 && l.t > 0.4)) { if (S.addItem(l.item)) { W.loots.splice(i, 1); if (W.mode && W.mode.onPickup) W.mode.onPickup(l.item); if (E.vis(l.x, l.y)) V.burst(p.x, p.y, 14, [D.tierColor(l.tier), '#ffffff', '#ffffff'], 6, 1.5, 0.3, 2); } }
    }
    if (pet) { const tx = p.x - p.fx * 0.9 + 0.3, ty = p.y - p.fy * 0.9 - 0.3; const d = Math.hypot(tx - pet.x, ty - pet.y); pet.moving = d > 0.3; if (d > 8) { pet.x = tx; pet.y = ty; } else if (pet.moving) { const sp = Math.min(d, (p.moveSpd + 0.5) * dt * (d > 2 ? 2 : 1)); pet.flip = (tx - pet.x) < 0; pet.x += (tx - pet.x) / d * sp; pet.y += (ty - pet.y) / d * sp; } }
  };

  // ---------------- economy actions ----------------
  S.enchantCost = it => ({ gold: Math.round(200 * it.tier * (1 + it.lv) * (1 + it.ilv / 25)), stones: 1 + Math.floor(it.lv / 3) });
  S.enchantRate = lv => [100, 100, 100, 100, 100, 70, 60, 50, 40, 30, 25, 20, 15, 10, 5][lv] || 0;
  S.enchant = (it, useProtect) => {
    const s = S.save; if (it.kind !== 'gear') return 'ตีบวกได้เฉพาะเกียร์';
    if (it.lv >= 15) return 'ตีบวกสูงสุดแล้ว (+15)';
    const c = S.enchantCost(it); const minT = it.tier >= 7 ? 7 : 1;
    let si = -1; for (let t = minT; t <= 10; t++) if (s.bag.stones[t - 1] >= c.stones) { si = t; break; }
    if (si < 0) return it.tier >= 7 ? `ต้องใช้หินตีบวก T7 ขึ้นไป x${c.stones} (ดรอปจาก Treasure Vault ชั้น 54+)` : `ต้องใช้หินตีบวก x${c.stones}`;
    if (s.gold < c.gold) return `ทองไม่พอ (ต้องการ ${U.fmt(c.gold)})`;
    if (useProtect && s.bag.protect <= 0) return 'ไม่มี Protect Scroll';
    s.gold -= c.gold; s.bag.stones[si - 1] -= c.stones; if (useProtect) s.bag.protect--;
    if (Math.random() * 100 < S.enchantRate(it.lv)) { it.lv++; S.refreshPlayer(); return { ok: true, msg: `ตีบวกสำเร็จ! +${it.lv}` }; }
    if (it.lv >= 10 && !useProtect) { it.lv--; S.refreshPlayer(); return { ok: false, msg: `ล้มเหลว! ระดับลดลงเป็น +${it.lv}` }; }
    return { ok: false, msg: 'ล้มเหลว ระดับคงเดิม' };
  };
  S.refine = (it) => {
    const s = S.save; if (it.kind !== 'acc') return 'Refine ได้เฉพาะเครื่องประดับ'; if (it.lv >= 10) return 'Refine สูงสุดแล้ว (+10)';
    const cost = Math.round(10 * it.tier * (1 + it.lv)); if (s.jewelDust < cost) return `Jewel Dust ไม่พอ (ต้องการ ${cost})`;
    s.jewelDust -= cost; it.lv++; if ([3, 6, 10].includes(it.lv)) { const ns = pickDistinct(D.SUB_POOL, 1, it.main.s)[0]; it.subs.push({ s: ns, v: S.statVal(ns, it.ilv, it.tier, 0.3) }); }
    S.refreshPlayer(); return { ok: true, msg: `Refine สำเร็จ +${it.lv}` + ([3, 6, 10].includes(it.lv) ? ' (ได้ substat ใหม่!)' : '') };
  };
  S.fusion = (items) => {
    if (items.length !== 3) return 'ต้องเลือกเครื่องประดับ 3 ชิ้น'; const t = items[0].tier;
    if (!items.every(i => i.kind === 'acc' && i.tier === t)) return 'ต้องเป็นเครื่องประดับระดับเดียวกันทั้ง 3 ชิ้น'; if (t >= 6) return 'Fusion ได้สูงสุดถึงระดับ 6 (ระดับ 7–10 ได้จากดันเจี้ยนเท่านั้น)';
    const s = S.save; const cost = 500 * t * t; if (s.gold < cost) return `ทองไม่พอ (${U.fmt(cost)})`;
    s.gold -= cost; for (const i of items) s.inv.splice(s.inv.indexOf(i), 1);
    const ilv = Math.round(items.reduce((a, b) => a + b.ilv, 0) / 3); const n = S.genItem('acc', t + 1, ilv, { slot: items[0].slot }); s.inv.push(n);
    return { ok: true, msg: `Fusion สำเร็จ: ${n.name} (ระดับ ${t + 1})`, item: n };
  };
  S.reforge = (it, subIdx) => {
    const s = S.save; if (!it.subs || !it.subs[subIdx]) return 'เลือก substat ที่ต้องการสุ่มใหม่'; const cost = 300 * it.tier;
    if (s.bag.reforge > 0) s.bag.reforge--; else if (s.gold >= cost) s.gold -= cost; else return `ต้องใช้ Reforge Scroll หรือทอง ${U.fmt(cost)}`;
    const used = it.subs.map(x => x.s).concat(it.main ? [it.main.s] : []); const pool = D.SUB_POOL.filter(x => !used.includes(x) || x === it.subs[subIdx].s);
    const ns = U.pick(pool); it.subs[subIdx] = { s: ns, v: S.statVal(ns, it.ilv, it.tier, 0.35 * U.rf(0.6, 1)) }; S.refreshPlayer(); return { ok: true, msg: `สุ่มใหม่ได้ ${D.STAT_TH[ns]} +${it.subs[subIdx].v}` };
  };
  S.socket = (it, gem) => { const i = (it.sockets || []).indexOf(null); if (i < 0) return 'ไม่มีช่องเจมว่าง'; it.sockets[i] = gem; S.save.inv.splice(S.save.inv.indexOf(gem), 1); S.refreshPlayer(); return { ok: true, msg: `ใส่ ${gem.name} แล้ว` }; };
  S.unsocket = (it, i) => { const g = it.sockets[i]; if (!g) return; const cost = 100 * g.tier; if (S.save.gold < cost) return `ถอดเจมต้องใช้ทอง ${cost}`; S.save.gold -= cost; it.sockets[i] = null; S.save.inv.push(g); S.refreshPlayer(); return { ok: true, msg: 'ถอดเจมแล้ว' }; };
  S.salvage = (it) => { const s = S.save; const i = s.inv.indexOf(it); if (i < 0) return; s.inv.splice(i, 1); if (it.kind === 'acc' || it.kind === 'relic') s.jewelDust += 4 * it.tier; else if (it.kind === 'rune') s.runeDust += 6 * it.tier; else { s.bag.stones[Math.max(0, it.tier - 2)]++; } s.gold += Math.round(S.itemPrice(it) * 0.3); };
  S.sell = (it, market) => { const s = S.save; const i = s.inv.indexOf(it); if (i < 0) return 0; s.inv.splice(i, 1); const p = Math.round(S.itemPrice(it) * (market ? 1.2 * 0.95 : 1)); s.gold += p; return p; };
  S.equip = (it) => {
    const s = S.save; let slot = it.slot;
    if (slot === 'ring1' || slot === 'ring2') slot = !s.eq.ring1 ? 'ring1' : !s.eq.ring2 && S.accUnlocked('ring2') ? 'ring2' : 'ring1';
    if (slot === 'earring1' || slot === 'earring2') slot = !s.eq.earring1 && S.accUnlocked('earring1') ? 'earring1' : !s.eq.earring2 && S.accUnlocked('earring2') ? 'earring2' : 'earring1';
    if (it.kind === 'acc' && !S.accUnlocked(slot)) return `ช่องนี้ยังไม่เปิด (เคลียร์ Jewel Abyss ชั้น ${D.SLOT[slot].unlock})`;
    const i = s.inv.indexOf(it); if (i >= 0) s.inv.splice(i, 1); if (s.eq[slot]) s.inv.push(s.eq[slot]); s.eq[slot] = it; S.refreshPlayer(); return true;
  };
  S.unequip = slot => { const s = S.save; if (!s.eq[slot]) return; if (s.inv.length >= S.invMax) return 'กระเป๋าเต็ม'; s.inv.push(s.eq[slot]); delete s.eq[slot]; S.refreshPlayer(); };
  S.runeUpgrade = (r) => { const s = S.save; if (r.core) return 'รูนแกนอัปเกรดไม่ได้'; if (r.lv >= 15) return 'สูงสุดแล้ว (+15)'; const c = Math.round(8 * r.tier * (1 + r.lv)); if (s.runeDust < c) return `Rune Dust ไม่พอ (ต้องการ ${c})`; s.runeDust -= c; r.lv++; if ([5, 10, 15].includes(r.lv)) { const ns = pickDistinct(D.SUB_POOL, 1, r.main && r.main.s)[0]; r.subs.push({ s: ns, v: S.statVal(ns, r.ilv, r.tier, 0.22) }); } S.refreshPlayer(); return { ok: true, msg: `อัปเกรดรูน +${r.lv}` }; };
  S.runeEquip = (r, slotI) => { const s = S.save; const sl = D.RUNE_BOARD[slotI]; if (!S.runeSlotOpen(slotI)) return `ช่องนี้เปิดที่เลเวล ${sl.lv}`; if (sl.c !== r.color) return `ช่องนี้ใส่ได้เฉพาะรูน${D.RUNE_COLORS[sl.c].th}`; const page = s.runeBoard[s.page]; const i = s.inv.indexOf(r); if (i >= 0) s.inv.splice(i, 1); if (page[slotI]) s.inv.push(page[slotI]); page[slotI] = r; S.refreshPlayer(); return true; };
  S.runeRemove = (slotI) => { const s = S.save; const page = s.runeBoard[s.page]; if (!page[slotI]) return; s.inv.push(page[slotI]); page[slotI] = null; S.refreshPlayer(); };
  S.setSkillRune = (idx, v) => { const s = S.save; if (v && !s.ownedSR[s.cls + '_' + idx + '_' + v] && !W.gm.allRunes) return 'ยังไม่มีรูนสกิลนี้ (ดรอปจาก Rune Sanctum)'; (s.skillRunes[s.cls] = s.skillRunes[s.cls] || {})[idx] = v; S.refreshPlayer(); return true; };
  S.fashionEquip = (it) => { const s = S.save; s.fashion.eq[it.slot] = it; S.refreshPlayer(); };
  S.fashionRemove = slot => { delete S.save.fashion.eq[slot]; S.refreshPlayer(); };
  S.dye = (it, color) => { const s = S.save; if (s.thread < 3) return 'ต้องใช้ด้ายแฟชั่น 3 ชิ้น'; s.thread -= 3; it.dye = color; S.refreshPlayer(); return true; };
  S.craftFashion = () => { const s = S.save; if (s.thread < 30) return 'ต้องใช้ด้ายแฟชั่น 30 ชิ้น'; s.thread -= 30; const t = U.clamp(Math.ceil(s.lvl / 20) + U.ri(-1, 1), 1, 9); const it = S.genItem('fashion', t, 1); S.addItem(it); return { ok: true, msg: `ตัดเย็บได้ ${it.name}`, item: it }; };
  S.fashionSetCount = () => { const eq = S.save.fashion.eq; const c = {}; for (const k in eq) { const t = eq[k].theme; c[t] = (c[t] || 0) + 1; } let best = null; for (const t in c) if (c[t] >= 3) best = +t; return best; };

  // ---------------- shop ----------------
  S.SHOP = [
    { key: 'hpPot', th: 'ยา HP (ฟื้น 35%)', price: 40 }, { key: 'mpPot', th: 'ยาทรัพยากร (ฟื้น 50%)', price: 40 }, { key: 'ret', th: 'สกรอลวาร์ปกลับเมือง', price: 60 },
    { key: 'foodXp', th: 'อาหาร EXP +50% (30 นาที)', price: 1200 }, { key: 'foodDrop', th: 'อาหารดรอป +30% (30 นาที)', price: 1500 }, { key: 'reforge', th: 'Reforge Scroll', price: 2500 },
    { stone: 1, th: 'หินตีบวก T1', price: 150 }, { stone: 2, th: 'หินตีบวก T2', price: 400 }, { stone: 3, th: 'หินตีบวก T3', price: 900 }, { cur: 'thread', n: 5, th: 'ด้ายแฟชั่น x5', price: 1500 }
  ];
  S.buy = (e, qty = 1) => { const s = S.save; const cost = e.price * qty; if (s.gold < cost) return 'ทองไม่พอ'; s.gold -= cost; if (e.stone) s.bag.stones[e.stone - 1] += qty; else if (e.cur) s[e.cur] += e.n * qty; else s.bag[e.key] += qty; return true; };
  S.marketList = () => { const s = S.save; const seed = Math.floor(Date.now() / 600000); const R = U.seeded(seed + U.hash(s.name)); const base = U.clamp(Math.ceil(s.lvl / 25), 1, 7); const out = [];
    for (let i = 0; i < 10; i++) { const kind = R() < 0.6 ? 'gear' : R() < 0.7 ? 'acc' : 'gem'; const t = U.clamp(base + Math.floor(R() * 3) - 1, 1, 8); const save = Math.random; Math.random = R; const it = S.genItem(kind, t, U.clamp(s.lvl / 2 + R() * 10, 1, 100)); Math.random = save; it.price = Math.round(S.itemPrice(it) * 3.5); it.seller = D.NAMES[Math.floor(R() * D.NAMES.length)]; out.push(it); }
    return out; };
  S.honorShop = () => [
    { th: 'รูน PvP (Warlord) สุ่มสี ระดับตามเลเวล', cost: 400, cur: 'honor', make: () => S.genItem('rune', U.clamp(Math.ceil(S.save.lvl / 22), 2, 9), S.save.lvl / 2, { pvp: true, color: U.pick(['red', 'blue', 'green']) }) },
    { th: 'เข็มกลัด PvP', cost: 600, cur: 'honor', make: () => S.genItem('acc', U.clamp(Math.ceil(S.save.lvl / 22), 2, 9), S.save.lvl / 2, { slot: 'brooch', pvp: true }) },
    { th: 'ชิ้นเซ็ต Warlord Crest (สุ่มช่อง)', cost: 900, cur: 'honor', make: () => S.genItem('acc', U.clamp(Math.ceil(S.save.lvl / 22), 4, 9), S.save.lvl / 2, { set: 'warlord', pvp: true }) },
    { th: 'ชุดแฟชั่น Siege Lord (สุ่มช่อง)', cost: 1200, cur: 'honor', make: () => Object.assign(S.genItem('fashion', 7, 1, { theme: 0 }), { name: 'Siege Lord ' + U.pick(['Armor', 'Helm', 'Cape']) }) }
  ];
  S.warShop = () => [
    { th: 'เข็มกลัด PvP ระดับสูง', cost: 300, cur: 'war', make: () => S.genItem('acc', U.clamp(Math.ceil(S.save.lvl / 20) + 1, 4, 10), S.save.lvl / 2, { slot: 'brooch', pvp: true }) },
    { th: 'ชิ้นเซ็ต Warlord Crest ระดับสูง', cost: 450, cur: 'war', make: () => S.genItem('acc', U.clamp(Math.ceil(S.save.lvl / 20) + 1, 5, 10), S.save.lvl / 2, { set: 'warlord', pvp: true }) },
    { th: 'ผ้าคลุมธงกิลด์ (แฟชั่น)', cost: 250, cur: 'war', make: () => Object.assign(S.genItem('fashion', 8, 1, { slot: 'f_back', theme: 1 }), { name: 'Guild Banner Cape' }) },
    { th: 'สกินปราสาทกิลด์', cost: 800, cur: 'war', make: () => { S.save.guild && (S.save.guild.castleSkin = U.pick(['#c8a050', '#b04aff', '#4ad6c8', '#ff5a5a'])); return null; } }
  ];
  S.buyFrom = (e) => { const s = S.save; if (s[e.cur] < e.cost) return `${e.cur === 'honor' ? 'Honor' : 'แต้มสงคราม'} ไม่พอ`; s[e.cur] -= e.cost; const it = e.make(); if (it) S.addItem(it); return true; };
  S.STABLE = [...D.PETS.map(p => ({ type: 'pet', k: p.k, th: p.th + ' — ' + Object.entries(p.bonus).map(([a, b]) => `${D.STAT_TH[a]} +${b}`).join(', '), price: 3000 })), ...D.MOUNTS.map(m => ({ type: 'mount', k: m.k, th: m.th + ` — ความเร็ว +${m.spd}%` + (m.war ? ' (ใช้ชนแนวกิลด์วอร์)' : ''), price: m.war ? 0 : 5000, honor: m.war ? 1500 : 0 }))];

  // ---------------- quests ----------------
  S.dailyCheck = () => { const s = S.save; const d = U.today(); if (s.quests.daily.date !== d) s.quests.daily = { date: d, prog: {}, done: {} }; };
  S.quest = (type, n = 1, data = {}) => {
    const s = S.save; S.dailyCheck();
    const mq = D.MAIN_QUESTS[s.quests.main];
    if (mq && mq.type === type && (!mq.map || mq.map === data.map)) { if (type === 'floor') s.quests.prog = Math.max(s.quests.prog, data.floor || 0); else s.quests.prog += n; if (s.quests.prog >= mq.n) S.completeMain(); }
    for (const q of D.DAILY_QUESTS) { if (q.type !== type || s.quests.daily.done[q.id]) continue; s.quests.daily.prog[q.id] = (s.quests.daily.prog[q.id] || 0) + n; if (s.quests.daily.prog[q.id] >= q.n) { s.quests.daily.done[q.id] = true; if (q.gold) s.gold += q.gold; if (q.honor) s.honor += q.honor; if (q.war) s.war += q.war; G.UI.toast(`ภารกิจรายวันสำเร็จ: ${q.th}`, 'good'); } }
    if (type === 'floor') { /* floor quest uses max */ }
  };
  S.completeMain = () => {
    const s = S.save; const q = D.MAIN_QUESTS[s.quests.main]; const xp = S.xpNeed(Math.max(s.lvl, q.lv)) * 0.6 * q.xp; const gold = Math.round(100 * (s.quests.main + 1) * q.xp);
    s.gold += gold; S.gainXp(xp); G.UI.toast(`ภารกิจหลักสำเร็จ: ${q.th} (+${U.fmt(xp)} EXP, +${U.fmt(gold)} ทอง)`, 'good'); G.UI.log('ภารกิจสำเร็จ: ' + q.th, 'sys');
    s.quests.main++; s.quests.prog = 0; const nq = D.MAIN_QUESTS[s.quests.main];
    if (nq && nq.type === 'floor') { const best = Math.max(0, ...Object.values(s.dungeons).map(d => d.best || 0)); s.quests.prog = best; if (best >= nq.n) setTimeout(S.completeMain, 50); }
  };
  S.questText = () => { const s = S.save; const q = D.MAIN_QUESTS[s.quests.main]; if (!q) return 'ภารกิจหลักทั้งหมดสำเร็จแล้ว'; return `${q.th} (${Math.min(s.quests.prog, q.n)}/${q.n})`; };

  // ---------------- codex & achievements ----------------
  S.codexKill = name => { const s = S.save; s.codex[name] = (s.codex[name] || 0) + 1; if (s.codex[name] === 50) { G.UI.toast(`Codex: ${name} ครบ 50 ตัว (ATK +0.25%)`, 'good'); S.refreshPlayer(); } if (Object.values(s.codex).filter(n => n >= 50).length >= 20) S.ach('codex20'); };
  S.ach = id => { const s = S.save; if (s.ach[id]) return; const a = D.ACHIEVEMENTS.find(x => x.id === id); if (!a) return; s.ach[id] = Date.now(); G.UI.toast(`ความสำเร็จ: ${a.th}` + (a.title ? ` (ฉายา «${a.title}»)` : ''), 'good'); S.refreshPlayer(); };

  // ---------------- kill streak / pvp hooks ----------------
  S.onHeroKill = (k, t, shut) => {
    if (!W.mode || !W.mode.pvp) { if (k === W.player && t.team === 4) S.worldPvpKill(t); return; }
    const st = k.ms.streak; const call = { 3: 'KILLING SPREE', 5: 'RAMPAGE', 7: 'UNSTOPPABLE', 10: 'GODLIKE', 15: 'LEGENDARY' }[st];
    if (call) { G.UI.feed(`${k.name}: ${call}!`, k.team === 0 ? 'good' : 'bad', true); if (k === W.player && st >= 10) S.ach('streak10'); if (E.vis(k.x, k.y)) { V.pillar(k.x, k.y, k.team === 0 ? '#4ad6c8' : '#ff5a5a', 70, 0.8, 8); } }
    if (shut >= 3) G.UI.feed(`${k.name} SHUTDOWN ${t.name} (สตรีค ${shut})`, 'gold');
    G.UI.feed(`${k.name} ⚔ ${t.name}`, k.team === 0 ? 'good' : 'bad');
    if (W.mode.onHeroKillScore) W.mode.onHeroKillScore(k, t, shut);
  };
  S.worldPvpKill = (t) => { const s = S.save; if (t.red) { s.honor += 30; S.quest('bounty'); G.UI.toast('กำจัดผู้เล่นชื่อแดง! ได้รับค่าหัว +30 Honor', 'good'); } else { s.infamy++; G.UI.toast(`Infamy +1 (ตอนนี้ ${s.infamy}) ${s.infamy >= 3 ? '— ชื่อคุณเป็นสีแดงแล้ว!' : ''}`, 'bad'); if (W.player) W.player.red = s.infamy >= 3; } };

  // ---------------- mercs ----------------
  S.merc = cls => { const s = S.save; if (!s.mercs[cls]) s.mercs[cls] = { m: 0, persona: U.pick(D.PERSONAS).k, contract: null }; return s.mercs[cls]; };
  S.mercRank = cls => { const m = S.merc(cls); let r = D.MERC_RANKS[0]; for (const x of D.MERC_RANKS) if (m.m >= x.need) r = x; return r; };
  S.mercCost = (diffI = 1) => Math.round((10 + S.save.lvl * 0.8) * (1 + diffI * 0.25));
  S.hireContract = (cls, type) => { const s = S.save; const base = S.mercCost(1); const cost = type === 'match' ? base : type === 'ten' ? base * 8 : base * 15; if (s.gold < cost) return 'ทองไม่พอ'; s.gold -= cost; const m = S.merc(cls); m.contract = type === 'match' ? { type, left: 1 } : type === 'ten' ? { type, left: 10 } : { type, until: Date.now() + 864e5 }; return true; };
  S.mercUse = (cls, diffI) => { const m = S.merc(cls); const c = m.contract; if (c && (c.type === 'day' ? c.until > Date.now() : c.left > 0)) { if (c.type !== 'day') { c.left--; if (c.left <= 0) m.contract = null; } return true; } const cost = S.mercCost(diffI); if (S.save.gold < cost) return false; S.save.gold -= cost; return true; };

  // ---------------- guild ----------------
  S.createGuild = (name, tag) => {
    const s = S.save; const members = []; for (let i = 0; i < 19; i++) members.push({ name: U.pick(D.NAMES) + U.ri(1, 99), cls: U.pick(D.CLASSES).id, lvl: U.clamp(s.lvl + U.ri(-10, 10), 1, D.MAX_LV) });
    s.guild = { name, tag: tag.toUpperCase().slice(0, 4), lvl: 1, xp: 0, rating: 1000, wins: 0, losses: 0, members, declines: { week: S.weekNo(), n: 0 }, history: [], season: S.seasonNo(), castleSkin: null };
    s.rivals = D.GUILD_NAMES.map((n, i) => ({ name: n, tag: n.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase(), rating: 900 + Math.round(i * 85 + Math.random() * 60) }));
    S.refreshPlayer();
  };
  S.weekNo = () => Math.floor((Date.now() - Date.UTC(2026, 0, 5)) / (7 * 864e5));
  S.seasonNo = () => Math.floor(S.weekNo() / 8) + 1;
  S.seasonLeft = () => { const start = Date.UTC(2026, 0, 5) + (S.seasonNo() - 1) * 56 * 864e5; return Math.max(0, start + 56 * 864e5 - Date.now()); };
  S.leaderboard = () => { const s = S.save; const list = s.rivals.map(r => ({ name: r.name, tag: r.tag, rating: r.rating, me: false })); if (s.guild) list.push({ name: s.guild.name, tag: s.guild.tag, rating: s.guild.rating, me: true }); return list.sort((a, b) => b.rating - a.rating); };
  S.guildTop3 = () => { const s = S.save; if (!s.guild) return false; return S.leaderboard().slice(0, 3).some(x => x.me); };
  S.guildXp = n => { const g = S.save.guild; if (!g) return; g.xp += n; while (g.xp >= 1000 * g.lvl) { g.xp -= 1000 * g.lvl; g.lvl++; G.UI.toast(`กิลด์เลเวลอัปเป็น ${g.lvl}`, 'good'); } };

  // ---------------- player control ----------------
  S.playerControl = (u, dt) => {
    const IN = S.IN; IN.manualT -= dt;
    // movement input
    let mx = 0, my = 0; const k = IN.keys;
    if (k.has('w') || k.has('arrowup')) my -= 1; if (k.has('s') || k.has('arrowdown')) my += 1;
    if (k.has('a') || k.has('arrowleft')) mx -= 1; if (k.has('d') || k.has('arrowright')) mx += 1;
    if (IN.joy) { mx += IN.joy.x; my += IN.joy.y; }
    const manualMove = mx || my;
    if (manualMove) { IN.clickMove = null; IN.manualT = 0.8; u.pending = null; }
    if (u.mounted === undefined) u.mounted = 0;
    // mount
    const canMount = u.mountDef && (!W.mode || W.mode.allowMount) && u.combatT > 3;
    if (canMount && (manualMove || IN.clickMove)) u.mounted = u.mountDef.spd; else if (!canMount) u.mounted = 0;
    // potions
    if (S.save.settings.autoPot && u.hp / u.maxhp < 0.4 && !u.dead) S.usePotion('hpPot', true);
    // queued skill
    if (IN.queue >= 0) { const i = IN.queue; if (S.tryCast(u, i)) IN.queue = -1; else if (!E.unlocked(u, i)) IN.queue = -1; else if (u.cds[i] > 0.4) IN.queue = -1; }
    if (u.pending) { const p = u.pending; if (!p.t || p.t.dead) u.pending = null; else { const s = E.skillOf(u, p.i); const d = Math.hypot(p.t.x - u.x, p.t.y - u.y); if (d <= E.skillRange(s) + 0.2) { E.cast(u, p.i, { x: p.t.x, y: p.t.y, u: p.t }); u.pending = null; } else E.walkTo(u, p.t.x, p.t.y, dt, E.skillRange(s) * 0.9); } }
    if (manualMove && E.canMove(u)) {
      const l = Math.hypot(mx, my); const sp = u.moveSpd * (u.cc.sl > 0 ? 0.6 : 1) * (1 + (u.mounted || 0) / 100);
      E.face(u, u.x + mx, u.y + my); E.move(u, mx / l * sp * dt, my / l * sp * dt); u.moving = true;
    } else if (IN.clickMove) {
      const c = IN.clickMove; if (c.npc) { if (U.d2(u.x, u.y, c.npc.x, c.npc.y) < 2.2) { IN.clickMove = null; G.UI.openNpc(c.npc); } else E.walkTo(u, c.npc.x, c.npc.y, dt, 1); }
      else if (c.portal) { if (U.d2(u.x, u.y, c.portal.x, c.portal.y) < 1.2) { IN.clickMove = null; c.portal.use(); } else E.walkTo(u, c.portal.x, c.portal.y, dt, 0.6); }
      else if (E.walkTo(u, c.x, c.y, dt, 0.2)) IN.clickMove = null;
    } else if (S.auto.on && IN.manualT <= 0 && !u.pending) S.autoBrain(u, dt);
    // portals stepping
    if (W.mode && W.mode.portals) for (const p of W.mode.portals) if (p.step && U.d2(u.x, u.y, p.x, p.y) < 0.5) p.use();
  };
  S.tryCast = (u, i) => {
    if (!E.unlocked(u, i)) { G.UI.toast(`สกิลนี้ปลดล็อกที่เลเวล ${D.UNLOCK[i]}`, 'bad'); return false; }
    if (!E.ready(u, i)) return false;
    const s = E.skillOf(u, i); let t = u.target && !u.target.dead && E.isEnemy(u, u.target) ? u.target : null;
    if (!t && s.dmg) { t = E.nearestEnemy(u, 9); if (t) { S.select(t); } }
    if (s.dmg && t) {
      const d = Math.hypot(t.x - u.x, t.y - u.y); const rng = E.skillRange(s);
      if (d > rng + 0.3 && !['dash', 'leap', 'blink', 'proj', 'beam', 'thrust'].includes(s.arch)) { u.pending = { i, t }; return true; }
      return E.cast(u, i, { x: t.x, y: t.y, u: t });
    }
    const mw = S.IN.mouseW; if (mw && s.dmg) return E.cast(u, i, { x: mw[0], y: mw[1] });
    // no target and no cursor: still fire — area / ground skills land in front of the character
    if (s.dmg || ['ground', 'zone', 'trap', 'leap', 'turret'].includes(s.arch)) { const L = Math.hypot(u.fx || 0, u.fy || 0) || 1; const dx = (u.fx || 1) / L, dy = (u.fy || 0) / L; const R = Math.min(E.skillRange(s) || 3, 3.5); return E.cast(u, i, { x: u.x + dx * R, y: u.y + dy * R }) || E.cast(u, i, null); }
    return E.cast(u, i, null);
  };
  S.select = (t) => { for (const x of W.units) x.selected = false; if (t) t.selected = true; if (W.player) W.player.target = t; };
  S.usePotion = (k, auto) => {
    const u = W.player; const s = S.save; if (!u || u.dead) return; const cdk = k === 'hpPot' ? 'potHp' : 'potMp'; const cd = W.mode && W.mode.pvp ? 15 : 8;
    if ((u.fxCd[cdk] || -99) + cd > W.time) { if (!auto) G.UI.toast('ยายังติดคูลดาวน์', 'bad'); return; }
    if (W.mode && W.mode.noPotion) { if (!auto) G.UI.toast('อารีน่าแรงก์ห้ามใช้ยา', 'bad'); return; }
    if ((s.bag[k] || 0) <= 0) { if (!auto) G.UI.toast('ยาหมด! ซื้อได้ที่ร้านค้า', 'bad'); return; }
    s.bag[k]--; u.fxCd[cdk] = W.time;
    if (k === 'hpPot') E.heal(u, u, u.maxhp * 0.35); else u.res = Math.min(u.resMax, u.res + u.resMax * 0.5);
    V.burst(u.x, u.y, 10, k === 'hpPot' ? ['#ffd0d0', '#ff5a5a', '#c02a3a'] : ['#d0e8ff', '#5aa0ff', '#2a5ad0'], 12, 1.5, 0.5, 2);
  };

  // auto brain (farm / quest / dungeon / pvp)
  S.autoBrain = (u, dt) => {
    u.ai.diff = D.DIFFS[3]; u.ai.persona = 'bold';
    const ctl = W.mode && W.mode.autoCtl ? W.mode.autoCtl(u) : {};
    // loot first
    if (S.save.settings.autoLoot && W.loots.length && !(W.mode && W.mode.kind === 'dungeon') && !(u.target && !u.target.dead && U.d2(u.x, u.y, u.target.x, u.target.y) < 9)) {
      let best = null, bd = 100; for (const l of W.loots) { const d = U.d2(u.x, u.y, l.x, l.y); if (d < bd) { bd = d; best = l; } }
      if (best) { E.walkTo(u, best.x, best.y, dt, 0.3); return; }
    }
    E.heroAI(u, dt, ctl);
    if (u.target) S.select(u.target);
  };
});
