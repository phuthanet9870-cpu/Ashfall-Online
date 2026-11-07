'use strict';
/* Chibi heroes v2: every class gets its own hand-built pixel character (36×48 frames, big head, shaded hair, eyes with
   highlights, class outfit, headgear, weapon, wings/tail/cape where it fits) — gender as on the class poster.
   Same sheet contract as SPR.charSheet (front/back × idle 4, walk 6, attack 4, cast 4, hurt 2, dead 1). */
(function (G) {
  const SPR = G.SPR, D = G.D, U = G.U, UI = G.UI; if (!SPR || !SPR.charSheet) return;
  const FW = 36, FH = 48, AN = [['idle', 4], ['walk', 6], ['attack', 4], ['cast', 4], ['hurt', 2], ['dead', 1]];
  const sh = (c, f) => U.shade ? U.shade(c, f) : c;
  // gender, hair [color, style], eyes, outfit [type, main, second, trim], head, extras
  const C = {
    blademaster: ['m', '#dfe3ea', 'spiky', '#e04040', 'armor', '#c8ccd6', '#b02a2a', '#e8c060', null, ['cape:#a02020']],
    guardian: ['m', '#8a8ad8', 'short', '#4a7aff', 'armor', '#3a5ab8', '#d8b84a', '#f2d27a', null, ['shield']],
    berserker: ['m', '#f0f0f0', 'wild', '#ff4a2a', 'tunic', '#8a2a1a', '#3a2a22', '#d8a040', 'band:#c02020', ['scar']],
    paladin: ['f', '#ffe08a', 'long', '#4a8aff', 'armordress', '#f4f0e8', '#e0b040', '#ffe9a0', 'tiara:#ffd84a', ['cape:#f4f0e8']],
    pyromancer: ['f', '#e8402a', 'long', '#ffb020', 'dress', '#2a1a22', '#c8281e', '#ffb040', 'witch:#2a1a22:#c8281e', []],
    cryomancer: ['f', '#d8d0f8', 'long', '#7ad8ff', 'robe', '#eaf4ff', '#5aa8f0', '#bfe8ff', 'icecrown', []],
    stormcaller: ['m', '#22263a', 'short', '#ffe24a', 'coat', '#1e2a5a', '#4a6ad8', '#ffe24a', null, ['bolt']],
    necromancer: ['f', '#c8b0f0', 'long', '#c84aff', 'robe', '#2a1a3a', '#6a2a9a', '#d8c8a0', 'witch:#2a1a3a:#8a3ac8', ['skull']],
    cleric: ['f', '#ffe7a0', 'long', '#5a9aff', 'robe', '#fbfaf4', '#e8c860', '#ffe9a0', 'hood:#f4f2ea', []],
    druid: ['f', '#e8d890', 'long', '#3ad070', 'dress', '#3a7a3a', '#8ac850', '#d8c070', 'antlers', ['leaves']],
    assassin: ['m', '#1a1a22', 'short', '#ff3a3a', 'leather', '#22222a', '#3a3a46', '#c02020', 'hood:#1a1a22', ['scarf:#c02020']],
    shadowdancer: ['f', '#c8b8f0', 'long', '#b06aff', 'leather', '#2a1a3a', '#6a3ab0', '#d8c0ff', 'mask', ['ribbon:#8a4ad8']],
    ranger: ['f', '#f0d878', 'pony', '#4ad070', 'tunic', '#3a7a2a', '#7a5a2a', '#d8c070', null, ['elf', 'quiver']],
    marksman: ['m', '#d0d4dc', 'short', '#4aa0ff', 'coat', '#3a3a40', '#6a4a2a', '#c8a050', null, ['bandolier']],
    engineer: ['m', '#7a4a2a', 'messy', '#ffb040', 'overalls', '#7a5a2a', '#c8903a', '#e8c070', 'goggles', ['gear']],
    monk: ['m', '#f4f4f4', 'spiky', '#ffb030', 'gi', '#e88a20', '#5a3a1a', '#ffd040', null, ['beads']],
    spellblade: ['f', '#b8a0f0', 'long', '#c07aff', 'armordress', '#2a1e3a', '#7a4ad0', '#e0c8ff', null, ['runes']],
    beastmaster: ['m', '#e8c060', 'wild', '#c8a040', 'fur', '#6a4a2a', '#c8b090', '#a87a3a', null, ['fang']],
    chronomancer: ['f', '#5a7aff', 'long', '#7adfff', 'robe', '#f2f4ff', '#3a5ad8', '#ffd84a', 'clockpin', []],
    warlock: ['f', '#c03ad0', 'long', '#ff4ad8', 'dress', '#2a102a', '#8a1a7a', '#ff7af0', 'horns:#3a2a3a', []],
    starhunter: ['f', '#d8d0f8', 'long', '#8ac8ff', 'coat', '#1e2448', '#f2f0ff', '#ffe28a', 'star', ['stars']],
    darkknight: ['m', '#eef0f4', 'spiky', '#ff2a3a', 'armor', '#2a1a22', '#a01a2a', '#ff4a5a', null, ['cape:#5a0a14']],
    lightbringer: ['f', '#ffe9a0', 'long', '#ffb020', 'armordress', '#fff6e0', '#e8b030', '#fff2a8', 'sun', ['cape:#ffe9a0']],
    shadowmancer: ['f', '#6a3aa8', 'long', '#d8a0ff', 'robe', '#1a1226', '#4a2a7a', '#b07aff', 'hood:#22163a', ['glow']],
    seraph: ['f', '#ffe9a8', 'long', '#7ab8ff', 'dress', '#fbfbff', '#e8d8a0', '#ffe28a', 'halo', ['wings:#ffffff']],
    reaper: ['f', '#d8d8e8', 'long', '#a0ffd8', 'robe', '#1a1a22', '#3a3a48', '#8affd0', 'hood:#22222c', []],
    demon: ['m', '#3a0a14', 'spiky', '#ff4a1a', 'armor', '#2a0a10', '#b01a1a', '#ff8a3a', 'horns:#2a1a1a', ['bat:#5a1020', 'tail:#8a1a2a']],
    deity: ['f', '#ffe7a0', 'long', '#ffd04a', 'dress', '#fffaf0', '#e8c060', '#fff2a8', 'crown', ['aura']],
    jester: ['f', '#ff8ac8', 'twin', '#ffd84a', 'harlequin', '#7a2a9a', '#e83a5a', '#ffd84a', 'jester', []],
    loki: ['m', '#1a1a26', 'short', '#7aff6a', 'suit', '#1e1a2a', '#5a2a8a', '#e8c050', 'horns:#e8c050', ['cape:#f0ece4']]
  };
  // ---------- pixel helpers ----------
  const mkP = (x) => { const R = (a, b, w, h, c) => { if (!c || w <= 0 || h <= 0) return; x.fillStyle = c; x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h)); }; return R; };
  const outline = (cv, x, col) => { const w = cv.width, h = cv.height; const d = x.getImageData(0, 0, w, h), a = d.data, o = new Uint8ClampedArray(a); const r = parseInt(col.slice(1, 3), 16), g = parseInt(col.slice(3, 5), 16), b = parseInt(col.slice(5, 7), 16);
    for (let y = 0; y < h; y++) for (let X = 0; X < w; X++) { const i = (y * w + X) * 4; if (a[i + 3] > 40) continue; let n = false; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = X + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; if (a[((yy * w + xx) * 4) + 3] > 120) { n = true; break; } } if (n) { o[i] = r; o[i + 1] = g; o[i + 2] = b; o[i + 3] = 255; } }
    x.putImageData(new ImageData(o, w, h), 0, 0); };
  // ---------- weapons (drawn pointing up from the hand at 0,0) ----------
  const WEAP = (R, k, c) => { const M = '#d8dce8', Md = '#8a90a0', W = '#8a5a30', G = '#e8c050', E = c || '#7ad8ff';
    switch (k) {
      case 'sword': R(-1, -15, 3, 13, M); R(0, -15, 1, 13, '#ffffff'); R(-1, -16, 2, 1, M); R(-3, -2, 7, 2, G); R(-1, 0, 2, 3, W); break;
      case 'greatsword': R(-2, -20, 5, 18, M); R(-1, -20, 1, 18, '#ffffff'); R(1, -20, 1, 18, Md); R(-4, -2, 9, 2, G); R(-1, 0, 2, 4, W); break;
      case 'daggers': R(-1, -8, 2, 7, M); R(0, -8, 1, 6, '#ffffff'); R(-2, -1, 4, 1, G); R(-1, 0, 2, 2, W); break;
      case 'blades': R(-1, -12, 2, 10, M); R(1, -12, 1, 4, '#ffffff'); R(-3, -2, 6, 1, E); R(-1, -1, 2, 3, '#2a2a30'); break;
      case 'axe': R(0, -16, 2, 18, W); R(2, -16, 5, 6, M); R(2, -16, 5, 1, '#ffffff'); R(-3, -15, 3, 4, Md); break;
      case 'hammer': R(0, -14, 2, 16, W); R(-3, -18, 8, 5, Md); R(-3, -18, 8, 1, M); break;
      case 'mace': R(0, -12, 2, 14, W); R(-2, -17, 6, 6, Md); R(-1, -16, 4, 4, M); R(-3, -15, 1, 2, Md); R(4, -15, 1, 2, Md); break;
      case 'spear': case 'halospear': R(0, -20, 1, 22, W); R(-1, -24, 3, 5, M); R(0, -26, 1, 2, M); if (k === 'halospear') { R(-3, -27, 7, 1, G); R(-4, -26, 1, 1, G); R(4, -26, 1, 1, G); } break;
      case 'scythe': R(0, -20, 2, 24, '#3a2a22'); R(-10, -21, 12, 2, M); R(-10, -19, 3, 2, M); R(-11, -18, 2, 2, Md); R(-9, -21, 10, 1, '#ffffff'); break;
      case 'staff': case 'scepter': case 'trickstaff': case 'lurerod': R(0, -16, 2, 20, W); R(-2, -21, 6, 6, E); R(-1, -20, 2, 2, '#ffffff'); R(-3, -16, 8, 1, G); break;
      case 'orb': case 'prism': R(-3, -7, 7, 7, E); R(-2, -6, 2, 2, '#ffffff'); break;
      case 'book': case 'tome': R(-4, -6, 8, 7, k === 'tome' ? '#5a2a8a' : '#8a3a2a'); R(-3, -5, 6, 5, '#f4ead0'); R(-1, -5, 1, 5, G); break;
      case 'hourglass': R(-3, -8, 7, 1, G); R(-3, 0, 7, 1, G); R(-2, -7, 5, 3, '#bfe8ff'); R(-1, -4, 3, 1, E); R(-2, -3, 5, 3, '#bfe8ff'); R(-1, -2, 3, 2, G); break;
      case 'bow': case 'starbow': R(1, -14, 1, 2, W); R(2, -12, 1, 9, W); R(1, -3, 1, 2, W); R(0, -13, 1, 11, '#f4f4f4'); if (k === 'starbow') { R(1, -15, 3, 1, G); R(2, -16, 1, 3, G); } break;
      case 'rifle': R(-1, -16, 2, 13, '#5a5a62'); R(-2, -4, 4, 6, W); R(1, -10, 2, 3, '#3a3a40'); R(-1, -16, 1, 13, '#8a8a92'); break;
      case 'wrench': R(0, -12, 2, 14, Md); R(-2, -15, 6, 3, Md); R(-1, -16, 1, 2, Md); R(2, -16, 1, 2, Md); break;
      case 'fists': case 'demonclaw': R(-2, -3, 5, 4, k === 'demonclaw' ? '#5a1a2a' : G); if (k === 'demonclaw') { R(-2, -6, 1, 3, '#f0e8d8'); R(0, -7, 1, 4, '#f0e8d8'); R(2, -6, 1, 3, '#f0e8d8'); } break;
      case 'jesterstick': R(0, -14, 1, 16, W); R(-2, -18, 5, 4, '#f4e4d0'); R(-3, -20, 2, 2, '#e83a4a'); R(2, -20, 2, 2, '#3a6aff'); break;
      default: R(0, -14, 2, 16, M);
    } };
  // ---------- one frame ----------
  const frame = (x, cls, view, anim, f) => { const R = mkP(x); const d = C[cls] || C.blademaster; const [gen, hair, hst, eye, otype, c1, c2, trim, head, ex] = d; const back = view === 'back'; const E = (D.ELEM && D.CLS[cls] && D.ELEM[D.CLS[cls].elem]) ? D.ELEM[D.CLS[cls].elem].pal[1] : eye;
    const has = k => ex.some(e => e.split(':')[0] === k); const exC = k => { const e = ex.find(e => e.split(':')[0] === k); return e ? e.split(':')[1] : null; };
    const skin = '#f6d2b4', skinD = '#e0aa8c', hD = sh(hair, -0.3), hL = sh(hair, 0.25), c1D = sh(c1, -0.3), c1L = sh(c1, 0.22), c2D = sh(c2, -0.3);
    // animation offsets
    let bob = 0, lean = 0, legA = 0, legB = 0, armR = 0, armL = 0, wRot = 0, raise = 0;
    if (anim === 'idle') bob = f % 2 ? 1 : 0;
    if (anim === 'walk') { const s = Math.sin(f / 6 * Math.PI * 2); legA = Math.round(s * 2); legB = -legA; bob = Math.abs(s) > 0.5 ? -1 : 0; armR = -legA; armL = legA; }
    if (anim === 'attack') { wRot = [-1.6, -0.6, 0.9, 1.5][f]; lean = f >= 2 ? 1 : 0; }
    if (anim === 'cast') { raise = 1; bob = f % 2 ? -1 : 0; }
    if (anim === 'hurt') { lean = -1; bob = 1; }
    const cx = 18 + lean, base = 46; const by = bob; // feet at base
    const headY = 5 + by, bodyY = 22 + by, legY = 34 + by;
    const female = gen === 'f';
    // ---------- back layer: wings, cape, tail, long hair back ----------
    if (has('wings')) { const wc = exC('wings'); for (const s of [-1, 1]) for (let i = 0; i < 5; i++) { R(cx + s * (6 + i * 2) - (s < 0 ? 2 : 0), bodyY - 6 + i * 2 - (anim === 'walk' ? (f % 2) : 0), 3, 8 - i, i % 2 ? sh(wc, -0.1) : wc); } R(cx - 13, bodyY - 7, 2, 2, '#ffffff'); R(cx + 11, bodyY - 7, 2, 2, '#ffffff'); }
    if (has('bat')) { const wc = exC('bat'); const fl = anim === 'walk' ? (f % 2) : 0; for (const s of [-1, 1]) { for (let i = 0; i < 5; i++) { const px = cx + s * (6 + i * 2) - (s < 0 ? 2 : 0); R(px, bodyY - 1 - i - fl, 2, 8 - i + (i % 2 ? -2 : 0), i % 2 ? sh(wc, -0.15) : wc); } R(cx + s * 6 - (s < 0 ? 10 : 0), bodyY - 2 - fl, 10, 1, sh(wc, -0.4)); R(cx + s * 15 - (s < 0 ? 1 : 0), bodyY - 7 - fl, 1, 2, '#f0e8d8'); } }
    if (has('cape') && !back) { const cc = exC('cape'); R(cx - 7, bodyY, 14, 13, sh(cc, -0.35)); }
    if (has('cape') && back) { const cc = exC('cape'); R(cx - 7, bodyY, 14, 14, cc); R(cx - 7, bodyY, 14, 2, sh(cc, 0.2)); R(cx - 3, bodyY + 4, 1, 9, sh(cc, -0.2)); R(cx + 3, bodyY + 4, 1, 9, sh(cc, -0.2)); }
    if (has('tail')) { const tc = exC('tail'); R(cx + 5, bodyY + 10, 3, 2, tc); R(cx + 7, bodyY + 7, 2, 4, tc); R(cx + 8, bodyY + 4, 3, 3, tc); R(cx + 10, bodyY + 3, 2, 2, '#2a0a0a'); }
    if (hst === 'long' || hst === 'pony' || hst === 'twin') { if (hst === 'long') R(cx - 8, headY + 6, 16, female ? 22 : 12, hD); if (hst === 'twin') { R(cx - 11, headY + 6, 4, 16, hair); R(cx + 7, headY + 6, 4, 16, hair); R(cx - 11, headY + 6, 1, 16, hD); R(cx + 10, headY + 6, 1, 16, hD); } if (hst === 'pony') R(cx + 5, headY + 4, 4, 14, hair); }
    if (has('quiver') && !back) R(cx + 5, bodyY - 3, 3, 10, '#7a5a2a');
    // ---------- legs ----------
    const longRobe = otype === 'robe' || otype === 'dress';
    const legCol = otype === 'gi' ? '#5a3a1a' : otype === 'overalls' ? c1 : otype === 'harlequin' ? c2 : sh(c1, -0.45); const boot = otype === 'armor' || otype === 'armordress' ? c1D : '#3a2a22';
    if (!longRobe) { R(cx - 5, legY + legA, 4, 9 - legA, legCol); R(cx + 1, legY + legB, 4, 9 - legB, otype === 'harlequin' ? c1 : legCol); R(cx - 5, legY + 7, 4, 4, boot); R(cx + 1, legY + 7, 4, 4, boot); if (otype === 'armor') { R(cx - 5, legY + 2 + legA, 4, 2, c1L); R(cx + 1, legY + 2 + legB, 4, 2, c1L); } }
    else { R(cx - 4, base - 3, 3, 3, '#3a2a22'); R(cx + 1, base - 3, 3, 3, '#3a2a22'); }
    // ---------- torso ----------
    const tw = female ? 12 : 14, tx = cx - tw / 2;
    if (longRobe) { const bottom = base - 2; R(tx - 1, bodyY, tw + 2, bottom - bodyY, c1); R(tx - 2, bottom - 4, tw + 4, 4, c1); R(tx - 2, bottom - 1, tw + 4, 1, trim); R(cx - 1, bodyY + 1, 2, bottom - bodyY - 2, c2); R(tx - 1, bodyY, 2, bottom - bodyY, c1L); R(tx + tw - 1, bodyY, 2, bottom - bodyY, c1D); if (anim === 'walk') R(tx - 2 + (f % 2) * (tw + 2), bottom - 4, 2, 4, c1D); }
    else { R(tx, bodyY, tw, 12, c1); R(tx, bodyY, 2, 12, c1L); R(tx + tw - 2, bodyY, 2, 12, c1D); }
    if (otype === 'armor' || otype === 'armordress') { R(tx + 1, bodyY + 1, tw - 2, 5, c1L); R(tx + 2, bodyY + 2, tw - 4, 1, '#ffffff'); R(cx - 2, bodyY + 3, 4, 3, c2); R(tx - 2, bodyY - 1, 4, 4, c1L); R(tx + tw - 2, bodyY - 1, 4, 4, c1L); R(tx - 2, bodyY - 1, 4, 1, trim); R(tx + tw - 2, bodyY - 1, 4, 1, trim); }
    if (otype === 'coat' || otype === 'suit') { R(cx - 1, bodyY, 2, 12, c2); R(cx - 4, bodyY, 3, 4, c2); R(cx + 1, bodyY, 3, 4, c2); R(tx, bodyY + 10, tw, 2, c1D); for (let i = 0; i < 3; i++) R(cx + 2, bodyY + 3 + i * 3, 1, 1, trim); }
    if (otype === 'gi') { R(cx - 3, bodyY, 6, 6, skin); R(cx - 1, bodyY + 2, 2, 4, skinD); R(tx, bodyY + 7, tw, 2, c2); }
    if (otype === 'tunic' || otype === 'leather' || otype === 'fur') { R(tx, bodyY + 7, tw, 2, c2); R(cx - 1, bodyY + 7, 2, 2, trim); }
    if (otype === 'fur') { R(tx - 2, bodyY - 2, tw + 4, 5, c2); for (let i = 0; i < tw + 4; i += 2) R(tx - 2 + i, bodyY + 3, 1, 1, sh(c2, -0.2)); }
    if (otype === 'overalls') { R(cx - 4, bodyY, 2, 6, c2); R(cx + 2, bodyY, 2, 6, c2); R(cx - 4, bodyY + 5, 8, 6, c2); R(cx - 1, bodyY + 7, 2, 2, trim); }
    if (otype === 'harlequin') { for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2) R(tx + 1 + i * 4, bodyY + 1 + j * 4, 4, 4, c2); R(tx - 1, bodyY - 1, tw + 2, 2, trim); }
    if (otype === 'dress' || otype === 'robe') { R(tx, bodyY + 6, tw, 1, trim); R(cx - 3, bodyY, 6, 2, trim); }
    if (has('scarf')) { const sc = exC('scarf'); R(cx - 6, bodyY - 1, 12, 3, sc); R(cx + 3, bodyY + 1, 3, 6, sc); }
    if (has('bandolier')) for (let i = 0; i < 6; i++) R(tx + 1 + i * 2, bodyY + 1 + i * 2, 2, 2, '#6a4a2a');
    if (has('beads') && !back) for (let i = 0; i < 7; i++) R(cx - 6 + i * 2, bodyY + (i < 4 ? i : 6 - i) + 1, 2, 2, '#3a2a1a');
    if (has('skull') && !back) { R(cx - 2, bodyY + 2, 4, 3, '#ece4cc'); R(cx - 1, bodyY + 3, 1, 1, '#2a1a22'); R(cx + 1, bodyY + 3, 1, 1, '#2a1a22'); }
    if (has('bolt') && !back) { R(cx + 2, bodyY + 2, 2, 3, '#ffe24a'); R(cx + 1, bodyY + 4, 2, 3, '#ffe24a'); }
    if (has('gear') && !back) { R(cx - 6, bodyY + 8, 3, 3, '#c8903a'); R(cx - 5, bodyY + 9, 1, 1, '#3a2a1a'); }
    if (has('leaves')) for (let i = 0; i < 5; i++) R(tx + i * 3, bodyY + 11 + (i % 2), 3, 2, '#8ac850');
    if (has('runes') && !back) { R(tx + 2, bodyY + 8, 1, 1, '#e0c8ff'); R(tx + tw - 3, bodyY + 9, 1, 1, '#e0c8ff'); }
    if (has('stars') && !back) { R(tx + 2, bodyY + 3, 1, 1, '#ffe28a'); R(tx + tw - 4, bodyY + 6, 1, 1, '#ffe28a'); R(cx, bodyY + 9, 1, 1, '#ffffff'); }
    // ---------- arms & hands (left arm behind, right arm holds the weapon) ----------
    const sleeve = otype === 'gi' ? c1 : otype === 'armor' || otype === 'armordress' ? c1L : c1;
    const aRy = bodyY + 1 + armR - (raise ? 4 : 0), aLy = bodyY + 1 + armL - (raise ? 4 : 0);
    R(tx - 3, aLy, 3, 9, sh(sleeve, -0.15)); R(tx - 3, aLy + 9, 3, 2, skin);
    R(tx + tw, aRy, 3, 9, sleeve); R(tx + tw, aRy + 9, 3, 2, skin);
    if (has('shield') && !back) { R(tx - 7, bodyY + 1, 7, 10, '#3a5ab8'); R(tx - 6, bodyY + 2, 5, 8, '#d8b84a'); R(tx - 5, bodyY + 3, 3, 6, '#3a5ab8'); R(tx - 4, bodyY + 4, 1, 4, '#f2d27a'); }
    // ---------- head ----------
    const hx = cx - 8, hw = 16, hh = 15;
    R(hx + 1, headY + 2, hw - 2, hh - 2, skin); R(hx, headY + 4, hw, hh - 6, skin); R(hx + 1, headY + hh - 3, hw - 2, 1, skinD);
    if (has('elf')) { R(hx - 2, headY + 7, 2, 2, skin); R(hx + hw, headY + 7, 2, 2, skin); R(hx - 3, headY + 6, 1, 1, skin); R(hx + hw + 2, headY + 6, 1, 1, skin); }
    if (!back) { // face
      const ey = headY + 8; const eyeH = female ? 4 : 3;
      for (const ex0 of [hx + 3, hx + hw - 6]) { R(ex0, ey, 3, eyeH, '#1a1222'); R(ex0, ey + 1, 3, eyeH - 1, eye); R(ex0, ey + eyeH - 1, 3, 1, sh(eye, -0.35)); R(ex0, ey, 1, 1, '#ffffff'); if (female) R(ex0 - 1, ey - 1, 4, 1, '#1a1222'); }
      if (head === 'mask') { R(hx + 2, ey - 1, hw - 4, 4, '#2a1a3a'); R(hx + 3, ey, 3, 2, eye); R(hx + hw - 6, ey, 3, 2, eye); }
      if (female) { R(hx + 2, ey + eyeH, 2, 1, '#f4a0a0'); R(hx + hw - 4, ey + eyeH, 2, 1, '#f4a0a0'); }
      R(cx - 1, headY + 13, 2, 1, female ? '#d0606a' : '#a06a5a');
      if (has('scar')) { R(hx + hw - 5, headY + 6, 1, 5, '#c04a4a'); }
      if (has('fang')) { R(cx + 1, headY + 14, 1, 1, '#ffffff'); }
      if (has('glow')) { R(hx + 3, ey + 1, 3, 1, '#ffffff'); R(hx + hw - 6, ey + 1, 3, 1, '#ffffff'); }
    }
    // ---------- hair ----------
    const hood = head && head.startsWith('hood');
    if (!hood) {
      R(hx - 1, headY - 1, hw + 2, 6, hair); R(hx, headY - 2, hw, 2, hair); R(hx + 2, headY - 3, hw - 4, 1, hair); R(hx + 3, headY - 2, 5, 1, hL); R(hx + 2, headY, 6, 1, hL);
      if (back) { R(hx - 1, headY, hw + 2, hh - 2, hair); R(hx + 2, headY + 2, 2, hh - 5, hL); R(hx + hw - 4, headY + 2, 2, hh - 5, hD); }
      else { // bangs + sides
        for (let i = 0; i < 5; i++) R(hx + 1 + i * 3, headY + 4, 3, 2 + (i % 2) * 2, i % 2 ? hD : hair); R(hx - 1, headY + 4, 2, female || hst === 'long' ? 11 : 7, hair); R(hx + hw - 1, headY + 4, 2, female || hst === 'long' ? 11 : 7, hD); }
      if (hst === 'spiky' || hst === 'wild') { for (let i = 0; i < 5; i++) R(hx + i * 3 + 1, headY - 4 - (i % 2) * 2, 2, 3, i % 2 ? hL : hair); if (hst === 'wild') { R(hx - 2, headY + 1, 2, 3, hair); R(hx + hw, headY + 1, 2, 3, hair); } }
      if (hst === 'messy') { R(hx + 4, headY - 4, 3, 2, hair); R(hx + 9, headY - 5, 3, 3, hD); }
      if (hst === 'twin') { R(hx - 2, headY + 3, 3, 3, trim); R(hx + hw - 1, headY + 3, 3, 3, trim); }
    }
    // ---------- headgear ----------
    if (head) { const [hk, a1, a2] = head.split(':');
      if (hk === 'hood') { R(hx - 2, headY - 3, hw + 4, 9, a1); R(hx - 2, headY + 4, 3, hh - 2, a1); R(hx + hw - 1, headY + 4, 3, hh - 2, a1); R(hx, headY - 2, hw, 1, sh(a1, 0.25)); if (back) R(hx - 1, headY, hw + 2, hh, a1); R(hx + 1, headY + 5, hw - 2, 1, sh(a1, -0.3)); }
      if (hk === 'witch') { R(hx - 4, headY - 1, hw + 8, 3, a1); R(hx + 2, headY - 6, hw - 4, 5, a1); R(hx + 5, headY - 11, hw - 10, 5, a1); R(hx + 9, headY - 14, 4, 3, a1); R(hx + 2, headY - 2, hw - 4, 2, a2); }
      if (hk === 'tiara') { R(hx + 3, headY - 2, hw - 6, 1, a1); R(cx - 1, headY - 4, 2, 2, a1); R(cx - 1, headY - 3, 2, 1, '#ff6aa0'); }
      if (hk === 'icecrown') { for (let i = 0; i < 5; i++) R(hx + 2 + i * 3, headY - 4 - (i === 2 ? 3 : i % 2 ? 1 : 0), 2, 4 + (i === 2 ? 3 : 0), '#bfe8ff'); }
      if (hk === 'antlers') { for (const s of [-1, 1]) { const ax = s < 0 ? hx : hx + hw - 2; R(ax, headY - 6, 2, 5, '#8a6a3a'); R(ax + s * 2, headY - 8, 2, 3, '#8a6a3a'); R(ax - s * 2, headY - 9, 2, 3, '#8a6a3a'); } R(hx + 4, headY - 1, 2, 2, '#8ac850'); R(hx + hw - 6, headY - 1, 2, 2, '#ff8ac8'); }
      if (hk === 'horns') { for (const s of [-1, 1]) { const ax = s < 0 ? hx - 1 : hx + hw - 2; R(ax, headY - 3, 3, 3, a1); R(ax + s * 1, headY - 6, 2, 3, a1); R(ax + s * 2, headY - 8, 2, 2, sh(a1, 0.3)); } }
      if (hk === 'goggles' && !back) { R(hx, headY + 1, hw, 2, '#5a3a1a'); R(hx + 2, headY, 5, 4, '#c8903a'); R(hx + hw - 7, headY, 5, 4, '#c8903a'); R(hx + 3, headY + 1, 3, 2, '#7ad8ff'); R(hx + hw - 6, headY + 1, 3, 2, '#7ad8ff'); }
      if (hk === 'band') { R(hx - 1, headY + 3, hw + 2, 2, a1); R(hx + hw, headY + 4, 3, 4, a1); }
      if (hk === 'clockpin') { R(hx + hw - 5, headY - 1, 4, 4, '#ffd84a'); R(hx + hw - 4, headY, 2, 2, '#f2f4ff'); }
      if (hk === 'star') { R(hx + hw - 5, headY - 2, 3, 3, '#ffe28a'); R(hx + hw - 4, headY - 3, 1, 5, '#ffe28a'); R(hx + hw - 6, headY - 1, 5, 1, '#ffe28a'); }
      if (hk === 'sun') { for (let i = 0; i < 7; i++) R(hx + 1 + i * 2, headY - 4 - (i === 3 ? 3 : (i % 2) * 1), 2, 3 + (i === 3 ? 3 : 0), '#ffd04a'); R(cx - 1, headY - 2, 2, 2, '#ff7a3a'); }
      if (hk === 'halo') { R(hx + 2, headY - 7, hw - 4, 1, '#fff2a0'); R(hx + 1, headY - 6, 1, 1, '#fff2a0'); R(hx + hw - 2, headY - 6, 1, 1, '#fff2a0'); R(hx + 2, headY - 5, hw - 4, 1, '#fff2a0'); }
      if (hk === 'crown') { R(hx + 2, headY - 3, hw - 4, 3, '#e8c050'); for (let i = 0; i < 4; i++) R(hx + 2 + i * 4, headY - 6, 2, 3, '#e8c050'); R(cx - 1, headY - 2, 2, 2, '#ff4a6a'); }
      if (hk === 'jester') { R(hx - 1, headY - 3, hw + 2, 4, '#7a2a9a'); R(hx - 5, headY - 6, 7, 3, '#e83a5a'); R(hx + hw - 2, headY - 6, 7, 3, '#7a2a9a'); R(hx - 6, headY - 4, 2, 2, '#ffd84a'); R(hx + hw + 4, headY - 4, 2, 2, '#ffd84a'); R(hx - 1, headY, hw + 2, 1, '#ffd84a'); }
      if (hk === 'mask' && back) R(hx - 1, headY + 7, hw + 2, 1, '#2a1a3a'); }
    if (has('aura') && !back) { R(cx - 12, headY - 4, 1, 1, '#fff2a0'); R(cx + 12, headY + 2, 1, 1, '#fff2a0'); }
    // ---------- weapon ----------
    const wk = (D.CLS[cls] && D.CLS[cls].weapon) || 'sword'; const hxR = tx + tw + 1, hyR = aRy + 10;
    if (!(wk === 'bow' || wk === 'starbow') || !back) { x.save(); x.translate(hxR, hyR); x.rotate(anim === 'attack' ? wRot : raise ? -0.25 : 0.12); if (back) x.globalAlpha = 0.9; WEAP(R, wk, E); x.restore(); }
    if (anim === 'cast') { for (let i = 0; i < 4; i++) { const a = f * 0.8 + i * 1.57; R(hxR + Math.cos(a) * 5, hyR - 10 + Math.sin(a) * 3, 2, 2, i % 2 ? '#ffffff' : E); } }
    if (anim === 'hurt') { x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(255,90,90,.35)'; x.fillRect(0, 0, FW, FH); x.globalCompositeOperation = 'source-over'; }
  };
  const cache = new Map();
  const sheetFor = (L) => { const cls = L.cls; const tint = L.c1 && D.CLS[cls] && L.c1 !== D.CLS[cls].col[0] ? L.c1 : ''; const key = 'chibi2|' + cls + '|' + tint; if (cache.has(key)) return cache.get(key);
    const rows = AN.length * 2; const [sheet, sx] = SPR.mk(FW * 6, FH * rows); let row = 0; const idx = {}, n = {};
    for (const view of ['front', 'back']) for (const [anim, cnt] of AN) { idx[view + anim] = row; n[anim] = cnt;
      for (let f = 0; f < cnt; f++) { const [fc, fx] = SPR.mk(FW, FH);
        if (anim === 'dead') { const [tc, tx] = SPR.mk(FW, FH); frame(tx, cls, view, 'idle', 0); outline(tc, tx, '#140c10'); fx.save(); fx.translate(FW / 2, FH - 6); fx.rotate(Math.PI / 2); fx.drawImage(tc, -FW / 2 - 6, -FH + 8); fx.restore(); }
        else { frame(fx, cls, view, anim, f); outline(fc, fx, '#140c10'); }
        sx.drawImage(fc, f * FW, row * FH); } row++; }
    const res = { sheet, idx, fw: FW, fh: FH, kind: 'char', n }; cache.set(key, res); return res; };
  const cs0 = SPR.charSheet; SPR.charSheet = (L) => (L && L.cls && C[L.cls] && !L.mob && !L.bones) ? sheetFor(L) : cs0(L);
  // portraits / previews that assumed 24×32 frames
  const crop = (cls, fashion, w, h, y0) => { const s = SPR.charSheet(SPR.lookFor(cls, fashion)); const [cv, x] = SPR.mk(w, h); x.imageSmoothingEnabled = false; x.drawImage(s.sheet, 0, (s.idx.frontidle || 0) * s.fh + (y0 || 0), s.fw, h === s.fh ? s.fh : h, 0, 0, w, h); return cv.toDataURL(); };
  const bodyC = new Map(); UI.bodyURL = (cls, fashion) => { const k = cls + (fashion ? Object.keys(fashion).join() : ''); if (bodyC.has(k)) return bodyC.get(k); const u = crop(cls, fashion, FW, FH, 0); bodyC.set(k, u); return u; };
  UI.portraitURL = (cls, fashion) => crop(cls, fashion, FW, 30, 0);
  G.CHIBI = { C, sheetFor, FW, FH };
})(window.G);
