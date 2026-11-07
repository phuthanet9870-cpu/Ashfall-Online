'use strict';
/* HUD v2: status icons, ability visuals on units, redesigned skill icons, party/target frames, tooltips, radial cooldowns */
(function (G) {
  const U = G.U, D = G.D, E = G.E, W = G.W, V = G.VFX, SPR = G.SPR, S = G.S, UI = G.UI, FX = G.FX;
  const $ = s => document.querySelector(s);
  const T = () => W.time;

  // ---------------- status icons ----------------
  const ST = {
    burn: ['flame', '#ff9a3a', 0], bleed: ['drop', '#ff4d4d', 0], toxin: ['drop', '#9be34a', 0], chill: ['snow', '#9ad8ff', 0], frozen: ['hex', '#bff4ff', 0], mark: ['rune', '#ff5a5a', 0],
    sunder: ['shield', '#c87a5a', 0], weaken: ['fang', '#d06a6a', 0], blind: ['eye', '#e8e4d8', 0], fear: ['skull', '#c07aff', 0], taunt: ['demon', '#ff6a5a', 0], stun: ['star4', '#ffe04a', 0],
    root: ['chainlink', '#6be07a', 0], slow: ['snow', '#7aa0ff', 0], silence: ['xslash', '#b06cff', 0], timeLock: ['clock', '#5ff0c8', 0], starMark: ['star5', '#fff2a8', 0],
    shield: ['shield', '#e8f6ff', 1], stack: ['flame', '#ffb347', 1], empower: ['fist', '#ffd84a', 1], imbue: ['rune', '#d08aff', 1], reflect: ['hex', '#4ad6c8', 1], thorns: ['thorn', '#6be07a', 1],
    regen: ['cross', '#6be07a', 1], immune: ['shield', '#ffd84a', 1], invuln: ['star4', '#ffffff', 1], lastStand: ['wing', '#ffd84a', 1], stealth: ['moon', '#9aa0c8', 1],
    atk: ['sword', '#ff9a5a', 1], def: ['shield', '#7ab8ff', 1], aspd: ['bolt', '#ffe04a', 1], crit: ['star4', '#ffd84a', 1], spd: ['feather', '#7ae8c8', 1], ls: ['drop', '#ff7a8a', 1], cdr: ['hourglass', '#c8b8ff', 1]
  };
  const iconCache = {};
  UI.statusIcon = (k) => {
    if (iconCache[k]) return iconCache[k]; const d = ST[k] || ['orb', '#ffffff', 1];
    const [cv, x] = SPR.mk(16, 16);
    x.fillStyle = d[2] ? '#16222a' : '#2a1418'; x.fillRect(1, 1, 14, 14); x.fillStyle = d[1]; x.globalAlpha = 0.35; x.fillRect(1, 1, 14, 2); x.globalAlpha = 1;
    x.save(); x.translate(8, 8.5); x.globalCompositeOperation = 'source-over'; FX.drawShape(x, d[0], 4.6, d[1], '#120e18', 0.6); x.restore(); x.globalCompositeOperation = 'source-over';
    SPR.crisp(cv); x.strokeStyle = d[2] ? '#4ad6c8' : '#ff6a5a'; x.lineWidth = 1; x.strokeRect(0.5, 0.5, 15, 15);
    iconCache[k] = { cv, url: cv.toDataURL(), good: !!d[2] }; return iconCache[k];
  };
  UI.statuses = (u) => {
    const out = []; const t = T(); const P = (k, n, left) => out.push({ k, n, left });
    if (u.dots) { const c = {}; for (const d of u.dots) { c[d.kind] = c[d.kind] || { n: 0, t: 0 }; c[d.kind].n++; c[d.kind].t = Math.max(c[d.kind].t, d.t); } for (const k in c) P(k, c[k].n > 1 ? c[k].n : 0, c[k].t); }
    if (u.chillN) P('chill', u.chillN, 0); if (u.cc) { if (u.cc.fz > 0) P('frozen', 0, u.cc.fz); else if (u.cc.st > 0) P('stun', 0, u.cc.st); if (u.cc.rt > 0) P('root', 0, u.cc.rt); if (u.cc.sl > 0) P('slow', 0, u.cc.sl); if (u.cc.sil > 0) P('silence', 0, u.cc.sil); }
    if (u.markS && u.markS.t > t) P('mark', 0, u.markS.t - t); if (u.sunderS && u.sunderS.t > t) P('sunder', 0, u.sunderS.t - t); if (u.weakS && u.weakS.t > t) P('weaken', 0, u.weakS.t - t);
    if (u.blindS && u.blindS.t > t) P('blind', 0, u.blindS.t - t); if (u.fearT > t) P('fear', 0, u.fearT - t); if (u.tauntT > t) P('taunt', 0, u.tauntT - t); if (u.starN) P('starMark', u.starN, 0);
    if (u.shield > 0) P('shield', 0, u.shieldT); if (u.stackS && u.stackS.t > t) P('stack', u.stackS.n, u.stackS.t - t); if (u.empowerS && u.empowerS.n > 0) P('empower', u.empowerS.n, 0);
    if (u.imbue && u.imbue.n > 0 && u.imbue.t > t) P('imbue', u.imbue.n, u.imbue.t - t); if (u.reflectS && u.reflectS.t > t) P('reflect', 0, u.reflectS.t - t); if (u.thornsS && u.thornsS.t > t) P('thorns', 0, u.thornsS.t - t);
    if (u.regenS && u.regenS.t > t) P('regen', 0, u.regenS.t - t); if (u.ccImmT > t) P('immune', 0, u.ccImmT - t); if (u.invulnT > t) P('invuln', 0, u.invulnT - t); if (u.lastStandT > t) P('lastStand', 0, u.lastStandT - t); if (u.stealth > 0) P('stealth', 0, u.stealth);
    for (const b of u.buffs || []) if (ST[b.type]) P(b.type, 0, b.t);
    return out;
  };

  // ---------------- ability visuals on units (drawn in world space) ----------------
  const baseDraw = E.drawUnit;
  E.drawUnit = (ctx, u) => {
    baseDraw(ctx, u); if (u.dead || u.kind === 'npc' || u.propSpr) return;
    const [sx, sy] = W.cam.w2s(u.x, u.y); const t = T(); const h = 30 * (u.sc || 1);
    if (u.markS && u.markS.t > t) { ctx.save(); ctx.translate(sx, sy); ctx.rotate(t * 2); ctx.strokeStyle = '#ff4a4a'; ctx.lineWidth = 1; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(0, 0, 10 * u.sc, 0, 7); ctx.stroke(); for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.fillStyle = '#ff4a4a'; ctx.fillRect(9 * u.sc, -1, 4, 2); } ctx.restore(); }
    if (u.dots && u.dots.some(d => d.kind === 'burn')) { const img = G.TX.get('fire').flame[Math.floor(t * 14 + u.id) % 8]; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.85; ctx.drawImage(img, Math.round(sx - 8), Math.round(sy - img.height - 2)); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    if (u.dots && u.dots.some(d => d.kind === 'toxin')) { ctx.fillStyle = '#9be34a'; for (let i = 0; i < 3; i++) { const a = t * 3 + i * 2.1; ctx.fillRect(Math.round(sx + Math.cos(a) * 6), Math.round(sy - h * 0.5 + Math.sin(a * 1.3) * 6 - ((t * 20 + i * 7) % 12)), 2, 2); } }
    if (u.dots && u.dots.some(d => d.kind === 'bleed')) { ctx.fillStyle = '#ff3a4a'; for (let i = 0; i < 2; i++) ctx.fillRect(Math.round(sx - 3 + i * 5), Math.round(sy - h * 0.6 + ((t * 30 + i * 9) % 16)), 1, 2); }
    if (u.chillN) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.12 * u.chillN; ctx.fillStyle = '#9ad8ff'; ctx.beginPath(); ctx.ellipse(sx, sy - h * 0.5, 9 * u.sc, h * 0.55, 0, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    if (u.ccImmT > t || u.invulnT > t) { const c = u.invulnT > t ? '#ffffff' : '#ffd84a'; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 10); ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(sx, sy - h * 0.5, 11 * u.sc, h * 0.62, 0, 0, 7); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    if (u.stackS && u.stackS.t > t) for (let i = 0; i < u.stackS.n; i++) { const a = t * 4 + i / u.stackS.n * 6.28; ctx.fillStyle = i % 2 ? '#ffb347' : '#ffe08a'; ctx.fillRect(Math.round(sx + Math.cos(a) * 11) - 1, Math.round(sy - 6 + Math.sin(a) * 4) - 1, 3, 3); }
    if (u.starN) for (let i = 0; i < u.starN; i++) { ctx.save(); ctx.translate(Math.round(sx - (u.starN - 1) * 4 + i * 8), Math.round(sy - h - 14)); ctx.rotate(t * 3); ctx.globalCompositeOperation = 'lighter'; FX.drawShape(ctx, 'star5', 3, '#fff2a8'); ctx.restore(); ctx.globalCompositeOperation = 'source-over'; }
    if ((u.imbue && u.imbue.n > 0 && u.imbue.t > t) || (u.empowerS && u.empowerS.n > 0)) { const pal = D.ELEM[(D.CLS[u.cls] || {}).elem || 'arcane'].pal; ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 4; i++) { const a = -t * 5 + i * 1.57; ctx.fillStyle = pal[i % 2]; ctx.fillRect(Math.round(sx + 8 + Math.cos(a) * 4), Math.round(sy - h * 0.45 + Math.sin(a) * 4), 2, 2); } ctx.globalCompositeOperation = 'source-over'; }
    if (u.reflectS && u.reflectS.t > t) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; ctx.save(); ctx.translate(sx, sy - h * 0.5); ctx.rotate(t); FX.drawShape(ctx, 'hex', 13 * u.sc, '#4ad6c8'); ctx.restore(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
  };
  // overhead status icons on the crisp overlay
  const baseUI = E.drawUnitUI;
  E.drawUnitUI = (ctx, u) => {
    baseUI(ctx, u); if (u.dead || u.kind === 'npc' || u.kind === 'struct' || u._sx === undefined) return; const p = W.player; if (!p) return;
    const near = U.d2(u.x, u.y, p.x, p.y); if (!(u === p || u.selected || (u.boss && near < 200) || near < 30)) return;
    const st = UI.statuses(u).filter(s => (u === p || u.team === p.team) ? !ST[s.k][2] : true).slice(0, 5); if (!st.length) return;
    const O = E.octx, F = G.PXS || 2; const sz = 14, gap = 2; const tot = st.length * (sz + gap) - gap; let X = u._sx * F - tot / 2, Y = (u._sy - 4) * F - 34;
    O.imageSmoothingEnabled = false;
    for (const s of st) { O.drawImage(UI.statusIcon(s.k).cv, Math.round(X), Math.round(Y), sz, sz); if (s.n) { O.font = '700 9px "Pixelify Sans", monospace'; O.textAlign = 'right'; O.lineWidth = 2; O.strokeStyle = '#120e18'; O.strokeText(s.n, X + sz + 1, Y + sz); O.fillStyle = '#ffffff'; O.fillText(s.n, X + sz + 1, Y + sz); } X += sz + gap; }
  };

  // ---------------- redesigned skill icons ----------------
  const ICON = { crescent: 'blade', xcross: 'xslash', uppercut: 'blade', afterimage: 'wing', rays: 'star4', whirl: 'shuriken', shard: 'shard', flurry: 'xslash', shatter: 'hex', warcry: 'halo', rage: 'flame', eye: 'eye', slashline: 'sword', claw: 'claw', shield: 'shield', smoke: 'moon', sword: 'sword', judgment: 'cross', crack: 'bolt', dust: 'orb', quake: 'fist', hammer: 'hammer', hexwall: 'hex', roar: 'halo', halo: 'halo', heal: 'cross', wing: 'wing', blood: 'drop', bloodstorm: 'drop', curse: 'chainlink', cross: 'cross', rune: 'rune', bolt: 'bolt', feather: 'feather', ember: 'flame', flame: 'flame', explosion: 'star5', firering: 'flame', meteor: 'fireball', phoenix: 'wing', snow: 'snow', frostspike: 'lance', freeze: 'snow', blizzard: 'snow', arc: 'bolt', orb: 'orb', laser: 'lance', storm: 'bolt', void: 'moon', bone: 'bone', skull: 'skull', souls: 'skull', plague: 'skull', hands: 'hand', hexagram: 'hexagram', bloom: 'lotus', moon: 'moon', leaves: 'leaf', tornado: 'tornado', poison: 'drop', shuriken: 'shuriken', lotus: 'lotus', shadow: 'moon', arrow: 'arrow', bullet: 'bullet', gear: 'gear', rocket: 'rocket', drone: 'drone', fist: 'fist', chi: 'chi', dragon: 'chi', arcane: 'star4', beast: 'paw', clock: 'clock', rewind: 'clock', hourglass: 'hourglass', fel: 'flame', chaos: 'chaos', demon: 'demon', star: 'star5', stardust: 'star4', comet: 'comet', constellation: 'hexagram', orbit: 'shuriken', nebula: 'chaos', blackhole: 'moon', galaxy: 'tornado', supernova: 'star5', vines: 'thorn', spark: 'star4', voidslash: 'blade', neoncrack: 'zig', greysmoke: 'smokecurl', neonclaw: 'claw', abysstreak: 'lance', silhouette: 'wing', smokewhirl: 'tornado', abysspillar: 'lance', neonbolt: 'zig', smokering: 'ringthick', neonstorm: 'bolt', smokeaura: 'smokecurl', stormdome: 'hexagram', blackholering: 'ringthick', sunspark: 'star4', prismray: 'shard', solarbeam: 'lance', corona: 'star5', solarpillar: 'cross', radiantdome: 'halo', aurora: 'feather', eclipsering: 'ringthick', inkpool: 'drop', lure: 'lure', inksplash: 'drop', inktendril: 'tendril', inkwave: 'inkwave', inkspikes: 'spikes', maw: 'maw', launch: 'inkwave', holyglint: 'star4', seraphbeam: 'lance', featherstorm: 'feather', halodisk: 'halo', heavengate: 'cross', choir: 'note', sanctum: 'halo', descent: 'wing', wingaura: 'wing', scythearc: 'scythe2', ghostfire: 'ghost', tombstone: 'tombstone', wail: 'ghost', clockdoom: 'clock', hellclaw: 'claw', hellfire: 'flame', demonwing: 'batwing', pitmaw: 'maw', brimstone: 'fireball', godray: 'lance', creation: 'star5', worldsigil: 'eye', juggle: 'orb', confetti: 'star4', cards: 'card', pie: 'pie', spring: 'spring', balloon: 'balloon', jackbox: 'box', laugh: 'note', fireworks: 'star5' };
  Object.assign(ICON, FX.ICONX || {});
  const SLOTC = i => i >= 20 ? ['#ffd84a', '#8a5a10'] : i >= 15 ? ['#4ad6c8', '#1a4a46'] : ['#d09a5a', '#5a3a1a'];
  const skCache = new Map();
  UI.skillIcon = (s) => {
    const k = s.id + '|' + (s.variant || 0); if (skCache.has(k)) return skCache.get(k);
    const N = 26; const [cv, x] = SPR.mk(N, N); const pal = D.ELEM[s.elem].pal; const sg = FX.sig(s); const GEN = { star4: 1, star5: 1, orb: 1 }; const cand = sg.motifs.map(m => ICON[m] || 'star4'); const shape = sg.proj && !GEN[sg.proj] ? sg.proj : (cand.find(c => !GEN[c]) || cand[0] || 'star4');
    const g = x.createRadialGradient(N / 2, N / 2, 2, N / 2, N / 2, N * 0.75); g.addColorStop(0, pal[2]); g.addColorStop(0.55, pal[3]); g.addColorStop(1, '#07050c'); x.fillStyle = g; x.fillRect(0, 0, N, N);
    const orb = G.TX.get(s.elem).orb[U.hash(s.id) % 8]; x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.45; x.drawImage(orb, -4, -4, N + 8, N + 8); x.globalAlpha = 1;
    x.save(); x.translate(N / 2, N / 2 + 0.5); x.rotate(['sword', 'lance', 'arrow', 'bullet', 'spear', 'rocket', 'blade', 'shard'].includes(shape) ? -0.78 : 0);
    x.globalAlpha = 0.5; FX.drawShape(x, shape, 9.2, pal[1], pal[3], 0.4); x.globalAlpha = 1; FX.drawShape(x, shape, 7.6, pal[0], pal[3], 0.4); x.restore();
    x.globalCompositeOperation = 'source-over'; SPR.crisp(cv);
    // re-fill transparent pixels with background so the icon stays square
    const bg = x.getImageData(0, 0, N, N); const [b2, bx] = SPR.mk(N, N); bx.fillStyle = g; bx.fillRect(0, 0, N, N); bx.globalCompositeOperation = 'lighter'; bx.globalAlpha = 0.35; bx.drawImage(orb, -4, -4, N + 8, N + 8); bx.globalAlpha = 1; bx.globalCompositeOperation = 'source-over'; bx.drawImage(cv, 0, 0);
    const [c1, c2] = SLOTC(s.idx); bx.fillStyle = c2; bx.fillRect(0, 0, N, 1); bx.fillRect(0, N - 1, N, 1); bx.fillRect(0, 0, 1, N); bx.fillRect(N - 1, 0, 1, N); bx.fillStyle = c1; bx.fillRect(1, 1, N - 2, 1); bx.fillRect(1, 1, 1, N - 2); bx.fillStyle = c1; bx.fillRect(0, 0, 3, 1); bx.fillRect(0, 0, 1, 3); bx.fillRect(N - 3, N - 1, 3, 1); bx.fillRect(N - 1, N - 3, 1, 3);
    if (s.ult) { bx.fillStyle = '#ffd84a'; for (let i = 0; i < N; i += 4) { bx.fillRect(i, 0, 2, 1); bx.fillRect(i, N - 1, 2, 1); } }
    if (s.variant) { const vc = ['', '#4ad6c8', '#ff7a3a', '#ffe04a'][s.variant]; bx.fillStyle = '#120e18'; bx.fillRect(N - 8, N - 8, 7, 7); bx.fillStyle = vc; bx.fillRect(N - 7, N - 7, 5, 5); bx.fillStyle = '#120e18'; bx.fillRect(N - 5, N - 5, 1, 1); }
    const url = b2.toDataURL(); skCache.set(k, url); return url;
  };

  // ---------------- HUD extras ----------------
  const menuIcons = { char: 'shield', inv: 'orb', skills: 'star5', runes: 'rune', fashion: 'wing', dungeon: 'skull', pvp: 'xslash', guild: 'hexagram', mercs: 'fist', quests: 'feather', map: 'moon', codex: 'eye', settings: 'gear', gm: 'chaos' };
  UI.menuIcon = (k) => { const [cv, x] = SPR.mk(18, 18); x.translate(9, 9); x.globalCompositeOperation = 'source-over'; FX.drawShape(x, menuIcons[k] || 'star4', 6.2, k === 'gm' ? '#e0b0ff' : '#f0d8a0', '#120e18', 0.3); SPR.crisp(cv); return cv.toDataURL(); };
  const ghost = { p: 1, t: 1 }; let lastCd = []; let prevT = null;
  const baseRefresh = UI.refreshHud;
  UI.refreshHud = (full) => {
    baseRefresh(full); const p = W.player, s = S.save; if (!p || !s) return;
    const hpP = p.hp / p.maxhp; ghost.p = Math.max(hpP, ghost.p - 0.012); $('#hpghost').style.width = (ghost.p * 100) + '%';
    $('#uf-lv').textContent = s.lvl; const c = D.CLS[s.cls]; $('#pclass').textContent = c.name + ' · ' + c.th;
    $('#resfill').style.background = `linear-gradient(90deg, ${D.ELEM[c.elem].pal[3]}, ${D.ELEM[c.elem].pal[2]} 60%, ${D.ELEM[c.elem].pal[1]})`;
    $('#uf').classList.toggle('low', hpP < 0.3);
    // radial cooldowns + ready flash
    if (UI.skEls) UI.skEls.forEach((el, i) => { const sk = E.skillOf(p, i); const max = Math.max(sk.c * (1 - (p.st.cdr || 0) / 100) / (i < D.ATK_N ? 1 + (p.st.aspd || 0) / 100 : 1), 0.3); const pct = p.cds[i] > 0 ? Math.min(1, p.cds[i] / max) : 0; el.style.setProperty('--p', (pct * 100).toFixed(1)); if (lastCd[i] > 0.15 && p.cds[i] <= 0) { el.classList.remove('ready'); void el.offsetWidth; el.classList.add('ready'); } lastCd[i] = p.cds[i]; });
    // buffs as icons
    const bh = UI.statuses(p).map(st => `<span class="sti ${UI.statusIcon(st.k).good ? 'good' : 'bad'}" title="${st.k}"><img src="${UI.statusIcon(st.k).url}" alt="">${st.n ? `<b>${st.n}</b>` : ''}${st.left ? `<i>${Math.ceil(st.left)}</i>` : ''}</span>`).join('') + (S.foodActive('foodXp') ? '<span class="sti txt">EXP+</span>' : '') + (S.foodActive('foodDrop') ? '<span class="sti txt">DROP+</span>' : '') + (p.red ? '<span class="sti txt red">PK</span>' : '');
    const bf = $('#buffs'); if (bf.dataset.h !== bh) { bf.dataset.h = bh; bf.innerHTML = bh; }
    // target frame
    const t = p.target;
    if (t && !t.dead && t.kind !== 'npc') {
      if (prevT !== t) { prevT = t; ghost.t = t.hp / t.maxhp; const img = $('#tport'); if (t.kind === 'hero' || t.mirror) img.src = UI.portraitURL(t.cls, t.fashion); else if (t.propSpr) img.src = t.propSpr.img.toDataURL(); else { const si = E.spriteInfo(t); const [cv, x] = SPR.mk(28, 28); const sc = Math.min(28 / si.w, 28 / si.h); x.drawImage(si.img, si.sx, si.sy, si.w, si.h, (28 - si.w * sc) / 2, 28 - si.h * sc, si.w * sc, si.h * sc); try { img.src = cv.toDataURL(); } catch (er) { img.removeAttribute('src'); } } $('#target').dataset.grade = t.grade || (t.kind === 'hero' ? 'hero' : 'normal'); }
      ghost.t = Math.max(t.hp / t.maxhp, ghost.t - 0.012); $('#thpghost').style.width = (ghost.t * 100) + '%';
      const dh = UI.statuses(t).slice(0, 8).map(st => `<img src="${UI.statusIcon(st.k).url}" alt="${st.k}">`).join(''); const td = $('#tdebuffs'); if (td.dataset.h !== dh) { td.dataset.h = dh; td.innerHTML = dh; }
    } else prevT = null;
    // party frames
    const allies = W.units.filter(u => u.team === 0 && u !== p && u.kind === 'hero').slice(0, 6);
    const ph = allies.map(a => `<button class="pm ${a.dead ? 'dead' : ''}" data-act="selally" data-id="${a.id}"><img src="${UI.portraitURL(a.cls, a.fashion)}" alt=""><span><b>${UI.esc(a.name.length > 14 ? a.name.slice(0, 13) + '…' : a.name)}</b><i style="width:${Math.max(0, 100 * a.hp / a.maxhp)}%"></i></span></button>`).join('');
    const pe = $('#party'); if (pe.dataset.h !== ph) { pe.dataset.h = ph; pe.innerHTML = ph; }
    const zl = $('#zoomlv'); if (zl) zl.textContent = Math.round(G.zTarget) + '%';
  };
  // skill tooltip card
  UI.bindHud = () => {
    const tip = $('#sktip');
    $('#skillbar').addEventListener('mouseover', e => { const el = e.target.closest('[data-sk]'); if (!el || !W.player) return; const i = +el.dataset.sk; const sk = E.skillOf(W.player, i); const c = D.CLS[S.save.cls];
      tip.innerHTML = `<div class="tt-h"><img src="${UI.skillIcon(sk)}" alt=""><div><b>${UI.esc(sk.name)}</b><small>[${D.KEYS[i]}] ${D.SLOT_TH(i)} · ${D.ARCH[sk.arch].th} · ธาตุ${D.ELEM[sk.elem].th}</small></div></div><p>${UI.esc(D.descSkill(sk)).replace(/ · ✦ /g, '</p><p class="tt-r">✦ ')}</p><div class="tt-f"><span>คูลดาวน์ ${sk.c.toFixed(1)} วิ</span><span>ใช้ ${sk.m} ${c.res}</span><span>ปลดล็อก Lv${sk.unlock}</span>${sk.variant ? `<span>รูน${D.VARIANTS[sk.variant].th}</span>` : ''}</div>`;
      tip.hidden = false; const r = el.getBoundingClientRect(); tip.style.left = Math.min(innerWidth - tip.offsetWidth - 8, Math.max(8, r.left + r.width / 2 - tip.offsetWidth / 2)) + 'px'; tip.style.top = (r.top - tip.offsetHeight - 10) + 'px'; });
    $('#skillbar').addEventListener('mouseleave', () => { tip.hidden = true; });
    document.querySelectorAll('#menu button[data-p]').forEach(b => { const img = document.createElement('img'); img.src = UI.menuIcon(b.dataset.p); img.alt = ''; b.prepend(img); });
  };
})(window.G);
