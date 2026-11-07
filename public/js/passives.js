'use strict';
/* Passive skills: 5 per class (Lv 1 / 30 / 80 / 150 / 220). Real effects for players and bots alike,
   shown as a vertical icon column on the left side of the screen. */
(function (G) {
  const U = G.U, D = G.D, E = G.E, W = G.W, S = G.S, V = G.VFX, UI = G.UI, FX = G.FX;
  D.PASSIVE_LV = [1, 30, 80, 150, 220];
  const TH = { blademaster: ['Steel', 'Iaido', 'Sakura', 'Heaven', 'Sword Saint'], guardian: ['Bastion', 'Aegis', 'Granite', 'Oath', 'Citadel'], berserker: ['Blood', 'Savage', 'Bone', 'Warlord', 'Carnage'],
    paladin: ['Dawn', 'Sacred', 'Radiant', 'Crusader', 'Seraphic'], pyromancer: ['Ember', 'Inferno', 'Cinder', 'Phoenix', 'Solar Flare'], cryomancer: ['Frost', 'Glacier', 'Crystal', 'Rime', 'Absolute'],
    stormcaller: ['Thunder', 'Volt', 'Tempest', 'Static', 'Ragnarok'], necromancer: ['Grave', 'Bone', 'Soul', 'Plague', 'Lich'], cleric: ['Holy', 'Halo', 'Mercy', 'Psalm', 'Angelic'],
    druid: ['Thorn', 'Grove', 'Moon', 'Wild', 'Gaia'], assassin: ['Venom', 'Shade', 'Silent', 'Viper', 'Death Lotus'], shadowdancer: ['Umbral', 'Dusk', 'Phantom', 'Lunar', 'Eclipse'],
    ranger: ['Hawk', 'Wind', 'Forest', 'Falcon', 'Gale'], marksman: ['Bullet', 'Sniper', 'Tracer', 'Powder', 'Deadeye'], engineer: ['Gear', 'Turbo', 'Piston', 'Tesla', 'Overdrive'],
    monk: ['Chi', 'Lotus', 'Dragon', 'Tiger', 'Enlightened'], spellblade: ['Rune', 'Arcane', 'Glyph', 'Mystic', 'Sigil'], beastmaster: ['Fang', 'Pack', 'Claw', 'Primal', 'Alpha'],
    chronomancer: ['Chrono', 'Epoch', 'Hour', 'Paradox', 'Eternity'], warlock: ['Fel', 'Hex', 'Doom', 'Infernal', 'Abyssal'], starhunter: ['Star', 'Comet', 'Nova', 'Nebula', 'Galaxy'],
    darkknight: ['Void', 'Abyss', 'Neon', 'Rift', 'Oblivion'], lightbringer: ['Prism', 'Solar', 'Halo', 'Corona', 'Zenith'], shadowmancer: ['Ink', 'Maw', 'Hunger', 'Lure', 'Devourer'],
    seraph: ['Celestial', 'Wing', 'Choir', 'Aureole', 'Empyrean'], reaper: ['Death', 'Scythe', 'Wraith', 'Tomb', 'Requiem'], demon: ['Hell', 'Wrath', 'Brimstone', 'Horn', 'Pandemonium'],
    deity: ['Divine', 'Genesis', 'Eden', 'Halo', 'Omnipotent'], jester: ['Prank', 'Confetti', 'Joker', 'Circus', 'Grand Finale'], loki: ['Trickster', 'Serpent', 'Mischief', 'Illusion', 'Ragnarok'] };
  const ROLE = {
    melee: [['stat', { atkP: 10 }], ['execute', 25], ['stat', { crit: 8, critDmg: 20 }], ['killHeal', 6]],
    tank: [['stat', { hpP: 15, defP: 10 }], ['lowShield', 25], ['thorns', 10], ['regen', 1]],
    caster: [['stat', { atkP: 12 }], ['castCdr', 25], ['stat', { cdr: 8, crit: 5 }], ['first', 30]],
    healer: [['stat', { hpP: 10, defP: 6 }], ['castHeal', 2], ['regen', 0.8], ['lowShield', 20]],
    ranged: [['stat', { atkP: 8, crit: 5 }], ['first', 30], ['stat', { aspd: 12 }], ['dodge', 8]],
    assassin: [['stat', { crit: 10 }], ['execute', 30], ['stat', { critDmg: 30 }], ['dodge', 10]],
    hybrid: [['stat', { atkP: 8, defP: 8 }], ['killHeal', 5], ['stat', { ls: 5, hpP: 6 }], ['lowShield', 20]],
    summoner: [['stat', { atkP: 10 }], ['castCdr', 20], ['stat', { hpP: 12, cdr: 5 }], ['regen', 0.8]]
  };
  // signature (5th) passive: every 6th hit releases a class burst with an element-matched effect
  const SIGCC = { phys: { kb: 1.2 }, blood: { sl: 1.5 }, holy: { st: 0.5 }, fire: { burn: 1 }, ice: { fz: 0.8 }, lightning: { st: 0.6 }, shadow: { sil: 1.2 }, nature: { rt: 1 }, poison: { sl: 2 }, wind: { kb: 1.5 },
    tech: { st: 0.5 }, chi: { kb: 1.2 }, arcane: { sil: 1 }, time: { sl: 2.5 }, fel: { burn: 1 }, star: { st: 0.5 }, dark: { pl: 1.5 }, light: { st: 0.5 }, umbra: { rt: 1 }, celestial: { heal: 1 }, death: { sl: 2 },
    infernal: { burn: 1 }, divine: { heal: 1 }, jester: { st: 0.6 }, chaos: { sil: 1 } };
  const NAME = { stat: ['Mastery', 'Discipline'], execute: 'Executioner', first: 'Opening Strike', killHeal: 'Bloodfeast', lowShield: 'Last Stand', thorns: 'Retaliation', regen: 'Second Wind', dodge: 'Evasion', castCdr: 'Momentum', castHeal: 'Blessed Cast', sig: 'Resonance' };
  const STH = { atkP: 'ATK', defP: 'DEF', hpP: 'HP สูงสุด', crit: 'คริติคอล', critDmg: 'แรงคริ', aspd: 'ความเร็วโจมตี', cdr: 'ลดคูลดาวน์', ls: 'ดูดเลือด', spd: 'ความเร็ววิ่ง' };
  const CCTH = { kb: 'ผลักกระเด็น', sl: 'ชะลอ', st: 'สตัน', burn: 'เผาไหม้ต่อเนื่อง', fz: 'แช่แข็ง', sil: 'ใบ้', rt: 'ตรึง', pl: 'ดึงเข้าหา', heal: 'ฟื้น HP ตัวเอง 3%' };
  const desc = (p, cls) => { const v = p.v; switch (p.k) {
    case 'stat': return 'เพิ่ม ' + Object.entries(v).map(([k, x]) => `${STH[k] || k} +${x}%`).join(' · ');
    case 'execute': return `ทำดาเมจ +${v}% ใส่ศัตรูที่ HP ต่ำกว่า 30%`; case 'first': return `ทำดาเมจ +${v}% ใส่ศัตรูที่ HP มากกว่า 90%`;
    case 'killHeal': return `สังหารศัตรูแล้วฟื้น HP ${v}%`; case 'lowShield': return `เมื่อ HP ต่ำกว่า 30% ได้โล่ ${v}% ของ HP สูงสุด (คูลดาวน์ 30 วิ)`;
    case 'thorns': return `สะท้อนดาเมจที่ได้รับ ${v}% กลับใส่ผู้โจมตี`; case 'regen': return `ฟื้น HP ${v}% ต่อวินาทีขณะต่อสู้`; case 'dodge': return `มีโอกาส ${v}% หลบการโจมตี`;
    case 'castCdr': return `ใช้สกิลแล้วมีโอกาส ${v}% ลดคูลดาวน์สกิลอื่น 1 วิ`; case 'castHeal': return `ใช้สกิลทุกครั้งฟื้น HP ${v}%`;
    case 'sig': { const cc = SIGCC[D.CLS[cls].elem] || { kb: 1 }; const k = Object.keys(cc)[0]; return `ทุกการโจมตีครั้งที่ 6 ปลดปล่อยพลัง${D.ELEM[D.CLS[cls].elem].th}ระเบิดรอบเป้า ${v}% ATK + ${CCTH[k]}`; } } return ''; };
  for (const c of D.CLASSES) { const T = TH[c.id] || ['Ancient', 'Prime', 'Royal', 'Mystic', 'Eternal']; const tpl = ROLE[c.role] || ROLE.melee; const tw = c.idx % 3;
    c.passives = tpl.map(([k, v], i) => { let vv = v; if (typeof v === 'number') vv = Math.round((v + tw * (v >= 10 ? 2 : 0.2)) * 10) / 10; else { vv = {}; for (const [a, b] of Object.entries(v)) vv[a] = b + tw * (b >= 10 ? 2 : 1); }
      const nm = k === 'stat' ? `${T[i]} ${NAME.stat[i === 0 ? 0 : 1]}` : `${T[i]} ${NAME[k]}`; return { id: c.id + '_p' + i, k, v: vv, name: nm, lv: D.PASSIVE_LV[i], i }; });
    c.passives.push({ id: c.id + '_p4', k: 'sig', v: 120 + tw * 20, name: `${T[4]} ${NAME.sig}`, lv: D.PASSIVE_LV[4], i: 4 });
    c.passives.forEach(p => p.th = desc(p, c.id)); }
  const act = (u) => (u && u.kind === 'hero' && D.CLS[u.cls] && D.CLS[u.cls].passives) ? D.CLS[u.cls].passives.filter(p => (u.lvl || 1) >= p.lv) : [];
  const has = (u, k) => { const L = act(u); return L.find(p => p.k === k); };
  S.passivesOf = act;

  // ---------- stats ----------
  E.passiveStats = (u, s) => { for (const p of act(u)) { if (p.k !== 'stat') continue; for (const [k, v] of Object.entries(p.v)) { if (k === 'atkP') s.atk *= 1 + v / 100; else if (k === 'defP') s.def *= 1 + v / 100; else if (k === 'hpP') s.hp *= 1 + v / 100; else s[k] = (s[k] || 0) + v; } } };

  // ---------- triggers ----------
  const install = () => { if (E._pv) return; E._pv = true;
    const hit0 = E.hit; E.hit = (src, t, pow, s, o) => {
      const own = src && (src.owner || src); const a = own && own.kind === 'hero' ? own : null;
      if (t && t.kind === 'hero' && !t.dead) { const dg = has(t, 'dodge'); if (dg && Math.random() * 100 < dg.v) { if (G.E.vis(t.x, t.y)) V.text(t.x, t.y, 'DODGE', '#d0fff0', { size: 8, z: 32 }); return 0; } }
      if (a && t) { const ex = has(a, 'execute'); if (ex && t.hp < t.maxhp * 0.3) pow *= 1 + ex.v / 100; const fs = has(a, 'first'); if (fs && t.hp > t.maxhp * 0.9) pow *= 1 + fs.v / 100; }
      const hp0 = t ? t.hp : 0; const r = hit0(src, t, pow, s, o); const dealt = t ? Math.max(0, hp0 - Math.max(0, t.hp)) : 0;
      if (t && t.kind === 'hero' && dealt > 0 && own && own !== t && !own.dead) { const th = has(t, 'thorns'); if (th) { own.hp -= dealt * th.v / 100; own.flash = 0.06; if (own.hp <= 0) E.kill(own, t); } }
      if (a && t && !t.dead && dealt > 0 && !(o && o.pv)) { const sg = has(a, 'sig'); if (sg) { a._pvN = (a._pvN || 0) + 1; if (a._pvN >= 6) { a._pvN = 0; sigBurst(a, t, sg.v); } } }
      return r; };
    const k0 = E.kill; E.kill = (t, k) => { const was = t && !t.dead; const r = k0(t, k); const kk = k && (k.owner || k); if (was && t.dead && kk && kk.kind === 'hero' && !kk.dead) { const kh = has(kk, 'killHeal'); if (kh) { E.heal ? E.heal(kk, kk, kk.maxhp * kh.v / 100) : (kk.hp = Math.min(kk.maxhp, kk.hp + kk.maxhp * kh.v / 100)); } } return r; };
    const x0 = E.exec; E.exec = (u, s, A) => { const r = x0(u, s, A); if (u && u.kind === 'hero') { const cc = has(u, 'castCdr'); if (cc && Math.random() * 100 < cc.v) for (let i = 0; i < D.NSK; i++) if (i !== s.idx && u.cds[i] > 0) u.cds[i] = Math.max(0, u.cds[i] - 1);
        const ch = has(u, 'castHeal'); if (ch) u.hp = Math.min(u.maxhp, u.hp + u.maxhp * ch.v / 100); } return r; };
    const up0 = E.updateUnit; if (up0) E.updateUnit = (u, dt) => { const r = up0(u, dt); if (u.kind === 'hero' && !u.dead) { u._pvT = (u._pvT || 0) + dt; if (u._pvT >= 0.5) { const tt = u._pvT; u._pvT = 0;
        const rg = has(u, 'regen'); if (rg && u.combatT < 5) u.hp = Math.min(u.maxhp, u.hp + u.maxhp * rg.v / 100 * tt);
        const ls = has(u, 'lowShield'); if (ls && u.hp < u.maxhp * 0.3 && W.time - (u._pvLS || -99) > 30) { u._pvLS = W.time; u.shield = Math.max(u.shield || 0, u.maxhp * ls.v / 100); u.shieldT = 6; if (E.vis(u.x, u.y)) { V.text(u.x, u.y, 'LAST STAND', '#ffd84a', { size: 9, z: 40 }); if (G.FX6) G.FX6.mini(u, u.x, u.y, 0, 1); } } } } return r; };
  };
  const sigBurst = (a, t, v) => { const cls = D.CLS[a.cls]; const cc = Object.assign({}, SIGCC[cls.elem] || { kb: 1 }); const s = { elem: cls.elem, cc: {} };
    for (const e of E.enemiesNear(a, t.x, t.y, 1.8)) { E.hit(a, e, v / 100, s, { pv: 1 }); if (cc.burn) { E.hit(a, e, 0.25, s, { pv: 1 }); } else if (!cc.heal) E.applyCC(a, e, cc); }
    if (cc.heal) a.hp = Math.min(a.maxhp, a.hp + a.maxhp * 0.03);
    if (E.vis(t.x, t.y) && G.FX6) { G.FX6.mini(a, t.x, t.y, 0, 1); V.ring && V.ring(t.x, t.y, 1.8, (G.FX6.PAL[a.cls] || D.ELEM[cls.elem].pal), 0.4, { w: 3 }); } };
  document.addEventListener('DOMContentLoaded', install); setTimeout(install, 0);

  // ---------- icons + HUD column ----------
  const PSH = { stat: 'rune', execute: 'skull', first: 'eye', killHeal: 'drop', lowShield: 'shield', thorns: 'thorn', regen: 'heart', dodge: 'feather', castCdr: 'clock', castHeal: 'cross' };
  const cache = new Map();
  UI.passiveIcon = (cid, p) => { const key = cid + p.i; if (cache.has(key)) return cache.get(key); const N = 26; const [cv, x] = G.SPR.mk(N, N); const pal = (G.FX6 && G.FX6.PAL[cid]) || D.ELEM[D.CLS[cid].elem].pal;
    const g = x.createRadialGradient(N / 2, N / 2, 1, N / 2, N / 2, N * 0.72); g.addColorStop(0, pal[2]); g.addColorStop(0.6, pal[3]); g.addColorStop(1, '#050408'); x.fillStyle = g; x.fillRect(0, 0, N, N);
    x.save(); x.translate(N / 2, N / 2); x.rotate(Math.PI / 4); x.strokeStyle = pal[1]; x.globalAlpha = 0.5; x.lineWidth = 1; x.strokeRect(-8, -8, 16, 16); x.restore(); x.globalAlpha = 1;
    const sh = p.k === 'sig' ? ((G.FX6 && G.FX6.iconShapes(cid, 0) || ['star'])[0]) : (PSH[p.k] || 'star');
    x.save(); x.translate(N / 2, N / 2); x.globalAlpha = 0.55; FX.drawShape(x, sh, 8.5, pal[1], pal[3], 0.4); x.globalAlpha = 1; FX.drawShape(x, sh, 7, pal[0], pal[2], 0.4); x.restore();
    x.fillStyle = p.k === 'sig' ? '#ffd84a' : '#8a7aa8'; x.fillRect(0, 0, N, 1); x.fillRect(0, N - 1, N, 1); x.fillRect(0, 0, 1, N); x.fillRect(N - 1, 0, 1, N);
    const url = cv.toDataURL(); cache.set(key, url); return url; };
  const css = document.createElement('style'); css.textContent = `
  #passives{position:absolute;left:max(12px,env(safe-area-inset-left,0px));top:calc(50% - 110px);display:flex;flex-direction:column;gap:5px;z-index:5;pointer-events:auto}
  #passives .pv{position:relative;width:36px;height:36px;border:2px solid #4a3e5a;background:#0b0910;padding:0;cursor:help;border-radius:6px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,.5)}
  #passives .pv img{width:100%;height:100%;image-rendering:pixelated;display:block}
  #passives .pv.sig{border-color:#ffd84a}#passives .pv.off img{filter:grayscale(1) brightness(.35)}#passives .pv.off::after{content:attr(data-lv);position:absolute;inset:auto 0 0 0;font:9px var(--f-px,monospace);color:#cfc6e0;text-align:center;background:rgba(0,0,0,.55)}
  #passives .pv.fire{animation:pvf .5s ease-out}@keyframes pvf{0%{box-shadow:0 0 0 0 #ffd84a}100%{box-shadow:0 0 0 10px rgba(255,216,74,0)}}
  #pvtip{position:fixed;z-index:60;max-width:240px;background:rgba(14,11,20,.96);border:1px solid #6a5a3a;border-radius:8px;padding:7px 9px;color:#eee;font-size:12px;pointer-events:none}
  #pvtip b{color:#ffd84a}
  #skillbar2{display:flex;gap:4px;justify-content:center;margin-bottom:4px}#skillbar2 .sk{width:42px;height:42px}#skillbar2 .gap{width:12px}
  #skillbar2 .sk.bf{border-color:#4ad6c8}#skillbar2 .sk.ult{border-color:var(--gold,#ffd84a)}
  @media (max-width:700px){#passives{top:calc(50% - 80px);gap:3px}#passives .pv{width:26px;height:26px}#skillbar2 .sk{width:32px;height:32px}#skillbar2 .gap{width:4px}}`;
  document.head.appendChild(css);
  let tip = null; const showTip = (el, p) => { if (!tip) { tip = document.createElement('div'); tip.id = 'pvtip'; document.body.appendChild(tip); } const r = el.getBoundingClientRect(); tip.innerHTML = `<b>${UI.esc(p.name)}</b> <small>Lv${p.lv}${p.k === 'sig' ? ' · แพสซีฟประจำคลาส' : ''}</small><div>${UI.esc(p.th)}</div>`; tip.style.left = (r.right + 8) + 'px'; tip.style.top = r.top + 'px'; tip.hidden = false; };
  UI.renderPassives = () => { const p = W.player; const hud = document.getElementById('hud'); if (!p || !hud) return; let box = document.getElementById('passives'); if (!box) { box = document.createElement('div'); box.id = 'passives'; hud.appendChild(box); }
    const L = D.CLS[p.cls].passives; const key = p.cls + '|' + L.map(x => p.lvl >= x.lv ? 1 : 0).join(''); if (box.dataset.k === key) return; box.dataset.k = key;
    box.innerHTML = L.map((x, i) => `<button class="pv ${x.k === 'sig' ? 'sig' : ''} ${p.lvl >= x.lv ? '' : 'off'}" data-pv="${i}" data-lv="Lv${x.lv}" aria-label="${UI.esc(x.name)}"><img src="${UI.passiveIcon(p.cls, x)}" alt=""></button>`).join('');
    box.querySelectorAll('.pv').forEach(b => { const x = L[+b.dataset.pv]; b.onmouseenter = () => showTip(b, x); b.onmouseleave = () => { if (tip) tip.hidden = true; }; b.onclick = () => { showTip(b, x); setTimeout(() => { if (tip) tip.hidden = true; }, 2500); }; }); };
  const rh0 = UI.refreshHud; UI.refreshHud = function (full) { const r = rh0.apply(this, arguments); try { UI.renderPassives(); } catch (e) { } return r; };
  // two-row skill bar: attacks below, buffs + ultimates above
  const bsb0 = UI.buildSkillbar; UI.buildSkillbar = () => { bsb0(); const sb = document.getElementById('skillbar'); if (!sb) return; let sb2 = document.getElementById('skillbar2'); if (!sb2) { sb2 = document.createElement('div'); sb2.id = 'skillbar2'; const row = sb.closest('.ab-row') || sb; row.parentNode.insertBefore(sb2, row); }
    const btn = [...sb.children]; sb2.innerHTML = ''; btn.slice(D.BUFF0).forEach((b, j) => { if (j === 5) { const g = document.createElement('span'); g.className = 'gap'; sb2.appendChild(g); } sb2.appendChild(b); }); UI.skEls = btn; UI.refreshSkillIcons(); };
  // skills panel: passive section
  if (UI.PANELS && UI.PANELS.skills) { const r0 = UI.PANELS.skills.render; UI.PANELS.skills.render = function (tab, P) { const h = r0.call(this, tab, P); const p = W.player; if (!p) return h; const L = D.CLS[p.cls].passives;
    return `<h4>แพสซีฟ (${L.filter(x => p.lvl >= x.lv).length}/5)</h4><div class="skrows">${L.map(x => `<div class="skrow ${p.lvl >= x.lv ? '' : 'locked'}"><img src="${UI.passiveIcon(p.cls, x)}" alt=""><div class="skinfo"><b>${UI.esc(x.name)}</b> <small>แพสซีฟ · Lv${x.lv}</small><p>${UI.esc(x.th)}</p></div></div>`).join('')}</div>` + h; }; }
})(window.G);
// keep the squad command bar just above the (now two-row) action bar
(function (G) { const fit = () => { const ab = document.getElementById('actionbar'), cb = document.getElementById('cmdbar'); if (!ab || !cb) return; const r = ab.getBoundingClientRect(); if (!r.height) return; const b = Math.round(innerHeight - r.top + 6); if (cb._b !== b) { cb._b = b; cb.style.bottom = b + 'px'; } };
  const rh = G.UI.refreshHud; G.UI.refreshHud = function () { const r = rh.apply(this, arguments); fit(); return r; }; addEventListener('resize', () => setTimeout(fit, 50)); })(window.G);
