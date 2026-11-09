'use strict';
(function (init) {
  (globalThis.ASHFALL_SIM_FACTORIES ||= {})['petart'] = init;
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
/* Pets & mounts from the artist sheets (assets/pets/<key>.webp): 12 pets (idle / walk / action) and 4 mounts
   (idle / walk / run). Drawn crisp on the character layer; pets follow the player, react with their action loop in
   combat; mounts carry the hero on the saddle and run while moving. Old procedural pets/mounts keep working. */
(function (G) {
  const U = G.U, D = G.D, S = G.S, UI = G.UI, W = G.W, E = G.E, SPR = G.SPR;
  const MAN = G.PET_MAN = {"m_wild_boar":{"n":"Wild Boar","th":"หมูป่า","mount":true,"w":231,"h":150,"feet":1.0,"cx":0.5,"face":1,"st":{"idle":[0,4,8],"walk":[1,6,8],"run":[2,6,12.5]}},"m_grey_wolf":{"n":"Grey Wolf","th":"หมาป่าสีเทา","mount":true,"w":227,"h":150,"feet":1.0,"cx":0.499,"face":1,"st":{"idle":[0,4,8],"walk":[1,6,8],"run":[2,6,12.5]}},"m_golden_griffin":{"n":"Golden Griffin","th":"กริฟฟอนทอง","mount":true,"w":182,"h":150,"feet":1.0,"cx":0.501,"face":1,"st":{"idle":[0,4,8],"walk":[1,6,8],"run":[2,6,12.5]}},"m_armored_golem":{"n":"Armored Golem","th":"สัตว์ศึกเกราะดำ","mount":true,"w":191,"h":150,"feet":1.0,"cx":0.493,"face":0,"st":{"idle":[0,4,8],"walk":[1,6,8],"run":[2,6,12.5]}},"p_green_talking_slime":{"n":"Green Talking Slime","th":"สไลม์พูดดัง","mount":false,"w":102,"h":84,"feet":1.0,"cx":0.502,"face":0,"st":{"idle":[0,4,8],"walk":[1,6,8],"action":[2,6,8]}},"p_fire_lizard":{"n":"Fire Lizard","th":"จิ้งจกไฟเบบี้","mount":false,"w":103,"h":84,"feet":1.0,"cx":0.5,"face":-1,"st":{"idle":[0,4,8],"walk":[1,6,8],"action":[2,6,8]}},"p_baby_chick":{"n":"Baby Chick","th":"ลูกไก่น้อย","mount":false,"w":86,"h":84,"feet":1.0,"cx":0.5,"face":0,"st":{"idle":[0,4,8],"walk":[1,6,8],"action":[2,6,8]}},"p_holy_coin_spirit":{"n":"Holy Coin Spirit","th":"วิญญาณเหรียญศักดิ์สิทธิ์","mount":false,"w":103,"h":84,"feet":1.0,"cx":0.508,"face":0,"st":{"idle":[0,4,8],"walk":[1,6,8],"action":[2,6,8]}},"p_stone_golem":{"n":"Stone Golem","th":"โกเล็มหินจิ๋ว","mount":false,"w":89,"h":84,"feet":1.0,"cx":0.502,"face":0,"st":{"idle":[0,4,8],"walk":[1,6,8],"action":[2,6,8]}},"p_treant_sapling":{"n":"Treant Sapling","th":"ทรีแอนท์ต้นอ่อน","mount":false,"w":87,"h":84,"feet":1.0,"cx":0.5,"face":0,"st":{"idle":[0,4,8],"walk":[1,6,8],"action":[2,6,8]}},"p_pink_ghost":{"n":"Pink Ghost","th":"ผีวุ้นชมพู","mount":false,"w":85,"h":84,"feet":1.0,"cx":0.504,"face":0,"st":{"idle":[0,4,8],"walk":[1,6,8],"action":[2,6,8]}},"p_star_spirit":{"n":"Star Spirit","th":"วิญญาณดาว","mount":false,"w":85,"h":84,"feet":1.0,"cx":0.508,"face":0,"st":{"idle":[0,4,8],"walk":[1,6,8],"action":[2,6,8]}},"p_ice_slime":{"n":"Ice Slime","th":"สไลม์น้ำแข็ง","mount":false,"w":105,"h":84,"feet":1.0,"cx":0.5,"face":0,"st":{"idle":[0,4,8],"walk":[1,6,8],"action":[2,6,8]}},"p_shadow_berry":{"n":"Shadow Berry","th":"วิญญาณเบอร์รี่เงา","mount":false,"w":103,"h":84,"feet":1.0,"cx":0.502,"face":0,"st":{"idle":[0,4,8],"walk":[1,6,8],"action":[2,6,8]}},"p_golden_caterpillar":{"n":"Golden Caterpillar","th":"หนอนทองคำ","mount":false,"w":108,"h":84,"feet":1.0,"cx":0.504,"face":1,"st":{"idle":[0,4,8],"walk":[1,6,8],"action":[2,6,8]}},"p_little_moon":{"n":"Little Moon","th":"ลูกจันทร์น้อย","mount":false,"w":94,"h":84,"feet":1.0,"cx":0.494,"face":0,"st":{"idle":[0,4,8],"walk":[1,6,8],"action":[2,6,8]}}};
  const BON = {"p_green_talking_slime": {"drop": 4}, "p_fire_lizard": {"atkP": 4}, "p_baby_chick": {"xp": 6}, "p_holy_coin_spirit": {"gold": 10}, "p_stone_golem": {"defP": 5}, "p_treant_sapling": {"hpP": 5}, "p_pink_ghost": {"crit": 3}, "p_star_spirit": {"xp": 10}, "p_ice_slime": {"cdr": 3}, "p_shadow_berry": {"critDmg": 8}, "p_golden_caterpillar": {"gold": 15}, "p_little_moon": {"drop": 7}}, MNT = {"m_wild_boar": [45, 8000, 0], "m_grey_wolf": [55, 20000, 0], "m_golden_griffin": [70, 60000, 0], "m_armored_golem": [50, 0, 2500]}, COL = {"p_green_talking_slime": "#7fd36a", "p_fire_lizard": "#ff7a3a", "p_baby_chick": "#ffe04a", "p_holy_coin_spirit": "#ffd84a", "p_stone_golem": "#9a9a9a", "p_treant_sapling": "#8a5a3a", "p_pink_ghost": "#ffa8d0", "p_star_spirit": "#ffe86a", "p_ice_slime": "#9ae0ff", "p_shadow_berry": "#6a3a9a", "p_golden_caterpillar": "#ffd84a", "p_little_moon": "#d8d0c0", "m_wild_boar": "#8a5a3a", "m_grey_wolf": "#8a8a9a", "m_golden_griffin": "#e8c04a", "m_armored_golem": "#3a3a44"};
  for (const k in MAN) { const a = MAN[k]; if (a.mount) { if (!D.MOUNTS.find(x => x.k === k)) D.MOUNTS.push({ k, n: a.n, th: a.th, spd: MNT[k][0], c: COL[k], art: k, war: !!MNT[k][2] }); }
    else if (!D.PETS.find(x => x.k === k)) D.PETS.push({ k, n: a.n, th: a.th, bonus: BON[k], c: COL[k], body: 'slime', art: k }); }
  if (S.STABLE) for (const k in MAN) { if (S.STABLE.find(e => e.k === k)) continue; const a = MAN[k];
    if (a.mount) S.STABLE.push({ type: 'mount', k, th: a.th + ` — ความเร็ว +${MNT[k][0]}%` + (MNT[k][2] ? ' (ใช้ชนแนวกิลด์วอร์)' : ''), price: MNT[k][1], honor: MNT[k][2] });
    else S.STABLE.push({ type: 'pet', k, th: a.th + ' — ' + Object.entries(BON[k]).map(([s, v]) => `${D.STAT_TH[s] || s} +${v}`).join(', '), price: 6000 }); }
  const base = (() => { const s = [...document.scripts].find(x => /js\/petart\.js/.test(x.src)); return s ? s.src.replace(/js\/petart\.js.*$/, '') : ''; })();
  const IMG = {}; const img = k => { if (IMG[k]) return IMG[k]; const im = new Image(); im.decoding = 'async'; im.src = base + 'assets/pets/' + k + '.webp'; IMG[k] = im; return im; };
  const ready = k => { const im = img(k); return im.complete && im.naturalWidth > 0; };
  const C = new Map(); const frame = (k, st, i, hh) => { const a = MAN[k]; const key = k + st + i + '@' + hh; let c = C.get(key); if (c) return c; const [row] = a.st[st]; const w = Math.round(a.w * hh / a.h);
    const [cv, x] = SPR.mk(w, hh); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(img(k), i * a.w, row * a.h, a.w, a.h, 0, 0, w, hh); c = { cv, w, h: hh }; C.set(key, c); if (C.size > 600) C.delete(C.keys().next().value); return c; };
  const pick = (a, st, t) => { const s = a.st[st] || a.st.idle; return Math.floor(t * s[2]) % s[1]; };
  // draw one creature on the char layer; feet at world (x,y); H = world height
  const drawArt = (k, wx, wy, H, st, t, faceRight, alpha = 1) => { const O = E.cctx || E.octx; const cam = W.cam; if (!O || !cam || !ready(k)) return false; const a = MAN[k]; const S2 = G.S2 || 2; const kk = Math.max(1, Math.round(S2 * 4) / 4); const hh = Math.round(H * kk);
    const sname = a.st[st] ? st : 'idle'; const f = frame(k, sname, pick(a, sname, t), hh); const [sx, sy] = cam.w2s(wx, wy); const sc = S2 / kk; const X = Math.round(sx * S2), Y = Math.round(sy * S2);
    let flip = false; if (a.face) flip = faceRight ? a.face < 0 : a.face > 0;
    O.save(); O.setTransform(1, 0, 0, 1, 0, 0); O.globalAlpha = alpha; O.imageSmoothingEnabled = sc !== 1; O.translate(X, Y); if (flip) O.scale(-1, 1); O.drawImage(f.cv, Math.round(-f.w * a.cx * sc), Math.round(-f.h * sc), Math.round(f.w * sc), Math.round(f.h * sc)); O.restore(); return true; };
  // ---- pet: blank the old sprite, draw the new art on the char layer before heroes ----
  const BL = { sheet: SPR.mk(1, 1)[0], fw: 1, fh: 1 };
  const sp0 = S.setupPet; S.setupPet = function (u) { const r = sp0.apply(this, arguments); const p = W.pet; if (p && p.def && p.def.art) { p.art = p.def.art; p.spr = BL; } return r; };
  const rn0 = E.render; E.render = function () { const p = W.pet; if (p && p.art && W.player) { const pl = W.player; const st = p.moving ? 'walk' : (pl.combatT < 1.5 && MAN[p.art].st.action ? 'action' : 'idle'); const right = p.moving ? !p.flip : (pl.fx || 0) > 0;
      const bob = MAN[p.art].n.match(/Ghost|Spirit|Moon|Coin/) ? Math.sin(W.time * 2.5) * 1.5 + 4 : 0; drawArt(p.art, p.x, p.y - bob / G.TS, 18, st, W.time, right); } return rn0.apply(this, arguments); };
  // ---- mount: hide the old mount sheet, draw the new one under the hero, lift the rider onto the saddle ----
  const MH = { m_wild_boar: 26, m_grey_wolf: 28, m_golden_griffin: 34, m_armored_golem: 30 };
  const du0 = E.drawUnit; E.drawUnit = (ctx, u) => { const md = u && u.mounted && u.mountDef && u.mountDef.art; if (!md || !ready(md)) { if (u) u._mountLift = null; return du0(ctx, u); }
    const keep = u.mountSpr; u.mountSpr = null; const H = MH[md] || 28; const st = u.moving ? 'run' : 'idle'; drawArt(md, u.x, u.y, H, st, W.time + (u.id || 0), (u.fx || 0) >= 0, u.stealth > 0 ? 0.4 : 1); u._mountLift = Math.round(H * 0.5);
    try { return du0(ctx, u); } finally { u.mountSpr = keep; } };
  // ---- icons ----
  const IC = new Map(); const icon = (k) => { if (IC.has(k)) return IC.get(k); if (!ready(k)) return null; const a = MAN[k]; const [cv, x] = SPR.mk(64, 64); const s = Math.min(60 / a.w, 60 / a.h); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(img(k), 0, 0, a.w, a.h, (64 - a.w * s) / 2, 64 - a.h * s - 2, a.w * s, a.h * s); let u = null; try { u = cv.toDataURL(); } catch (e) { } IC.set(k, u); return u; };
  const pi0 = UI.petIcon; UI.petIcon = k => (MAN[k] && icon(k)) || pi0(k); const mi0 = UI.mountIcon; UI.mountIcon = k => (MAN[k] && icon(k)) || mi0(k);
  // ---- remove the old procedural pets/mounts; owned ones convert to their new counterparts ----
  const MAP = { slime: 'p_green_talking_slime', fox: 'p_fire_lizard', owl: 'p_baby_chick', drake: 'p_holy_coin_spirit', sprout: 'p_treant_sapling', golemling: 'p_stone_golem', frostslime: 'p_ice_slime', imp: 'p_pink_ghost', shadowbat: 'p_shadow_berry', wisp: 'p_star_spirit', goldfox: 'p_golden_caterpillar', wyrmling: 'p_little_moon',
    horse: 'm_wild_boar', wolf: 'm_grey_wolf', griffin: 'm_golden_griffin', warmount: 'm_armored_golem' };
  const prune = (arr) => { for (let i = arr.length - 1; i >= 0; i--) if (!arr[i].art && !MAN[arr[i].k]) arr.splice(i, 1); };
  prune(D.PETS); prune(D.MOUNTS); if (S.STABLE) for (let i = S.STABLE.length - 1; i >= 0; i--) if (!MAN[S.STABLE[i].k]) S.STABLE.splice(i, 1);
  const migrate = () => { const s = S.save; if (!s || s._petv === 2) return; const mp = k => MAP[k] || k; s.pets = [...new Set((s.pets || []).map(mp))].filter(k => MAN[k]); s.mounts = [...new Set((s.mounts || []).map(mp))].filter(k => MAN[k]);
    if (s.pet) s.pet = MAN[mp(s.pet)] ? mp(s.pet) : null; if (s.mount) s.mount = MAN[mp(s.mount)] ? mp(s.mount) : null; s._petv = 2; };
  const af0 = S.applyFlags; if (af0) S.applyFlags = function () { migrate(); return af0.apply(this, arguments); };
  const sp1 = S.setupPet; S.setupPet = function () { migrate(); return sp1.apply(this, arguments); };
  for (const k in MAN) img(k);
  G.PETART = { ready, drawArt };
})(G);

});
