'use strict';
/* Procedural pixel-art sprite sheets: characters (20 classes, 2 views x 6 anims), monsters (10 bodies), props, tiles */
(function (G) {
  const U = G.U, D = G.D;
  const SPR = G.SPR = {};
  const OUT = '#120e18';
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; };
  SPR.mk = mk;

  function outline(cv) {
    const x = cv.getContext('2d'); const w = cv.width, h = cv.height;
    const id = x.getImageData(0, 0, w, h); const d = id.data; const src = new Uint8ClampedArray(d);
    const a = (i, j) => (i < 0 || j < 0 || i >= w || j >= h) ? 0 : src[(j * w + i) * 4 + 3];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const k = (j * w + i) * 4; if (src[k + 3] > 0) continue;
      if (a(i - 1, j) > 100 || a(i + 1, j) > 100 || a(i, j - 1) > 100 || a(i, j + 1) > 100) { d[k] = 18; d[k + 1] = 14; d[k + 2] = 24; d[k + 3] = 255; }
    }
    x.putImageData(id, 0, 0);
  }
  function crisp(cv) {
    const x = cv.getContext('2d'); const id = x.getImageData(0, 0, cv.width, cv.height); const d = id.data;
    for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 110 ? 255 : 0;
    x.putImageData(id, 0, 0);
  }
  SPR.crisp = crisp;

  // ---------- primitive pixel painter ----------
  function painter(ctx, ox, oy, flipW) {
    const P = (x, y, w, h, c) => { if (!c) return; ctx.fillStyle = c; ctx.fillRect(ox + x, oy + y, w, h); };
    P.line = (x0, y0, x1, y1, c, t = 1) => {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
      for (let g = 0; g < 64; g++) { P(x0 - (t > 1 ? 0 : 0), y0, t, t, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
    };
    P.ell = (cx, cy, rx, ry, c) => {
      for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx + 0.3) + (y * y) / (ry * ry + 0.3) <= 1) P(cx + x, cy + y, 1, 1, c);
    };
    return P;
  }

  // ---------- characters ----------
  const ROBE = { caster: 1, healer: 1, summoner: 1 };
  const HELM = { tank: 1, hybrid: 1 };
  SPR.lookFor = (cls, fashion, opts = {}) => {
    const c = D.CLS[cls];
    const L = { cls, skin: opts.skin || '#f0c8a0', hair: c.hair, c1: c.col[0], c2: c.col[1], weapon: c.weapon, role: c.role, elem: c.elem, robe: !!ROBE[c.role], helm: !!HELM[c.role], hstyle: c.idx % 4 };
    if (fashion) {
      const fb = fashion.f_body, fh = fashion.f_head, fc = fashion.f_crown, fm = fashion.f_mask, fbk = fashion.f_back, fw = fashion.f_weapon;
      if (fb) { L.c1 = fb.dye || fb.colors[0]; L.c2 = fb.colors[1]; L.fashionTier = fb.tier; }
      if (fh) { L.hat = fh.theme % 4; L.hatC = fh.dye || fh.colors[0]; L.hatC2 = fh.colors[1]; L.helm = false; }
      if (fc) { L.crown = fc.colors[1]; }
      if (fm) { L.mask = fm.colors[0]; }
      if (fbk) { L.back = fbk.colors; }
      if (fw) { L.wcol = fw.colors[1]; }
    }
    if (opts.mob) Object.assign(L, opts.mob); else { L.seeker = true; L.sig = SIG[cls]; }
    L.key = JSON.stringify([L.seeker ? 'sk4' : 'old', L.cls, L.c1, L.c2, L.hair, L.hat, L.hatC, L.crown, L.mask, L.back, L.wcol, L.skin, L.bones, L.dark]);
    return L;
  };

  function drawWeapon(P, L, view, pose, hx, hy) {
    const w = L.weapon, wc = L.wcol || '#dfe6f2', pal = D.ELEM[L.elem].pal;
    const back = view === 'back';
    let ang = pose === 'up' ? -1.9 : pose === 'strike' ? 0.25 : 0.9; // radians (screen), 0 = right
    if (back) ang = pose === 'up' ? -2.2 : pose === 'strike' ? -0.6 : -1.2;
    const dir = (len) => [hx + Math.cos(ang) * len, hy + Math.sin(ang) * len];
    const shaft = (len, c, t = 1) => { const [x, y] = dir(len); P.line(hx, hy, x, y, c, t); return [x, y]; };
    switch (w) {
      case 'sword': { shaft(2, '#6a4a2a'); const [gx, gy] = dir(2); P(gx - 1, gy - 1, 3, 2, L.c2); const [x, y] = dir(11); P.line(gx, gy, x, y, wc); P.line(gx + 1, gy, x + 1, y, U.shade(wc, -0.25)); break; }
      case 'axe': { const [x, y] = shaft(9, '#6a4a2a'); P(x - 2, y - 2, 4, 5, '#c8d0dc'); P(x - 2, y - 2, 1, 5, '#ffffff'); break; }
      case 'mace': { const [x, y] = shaft(7, '#7a5a3a'); P(x - 1, y - 1, 3, 3, '#b8c0cc'); P(x - 2, y, 1, 1, '#b8c0cc'); P(x + 2, y, 1, 1, '#b8c0cc'); break; }
      case 'hammer': { const [x, y] = shaft(8, '#7a5a3a'); P(x - 2, y - 1, 5, 3, '#e8d8a0'); P(x - 2, y - 1, 5, 1, '#fff6c2'); break; }
      case 'staff': case 'hourglass': { const a0 = ang; ang = pose === 'strike' ? -0.7 : pose === 'up' ? -1.57 : -1.35; const [x, y] = shaft(13, '#7a5232'); ang = a0;
        if (w === 'staff') { P(x - 1, y - 2, 3, 3, pal[2]); P(x, y - 1, 1, 1, pal[0]); } else { P(x - 1, y - 3, 3, 1, '#e8d08a'); P(x - 1, y - 2, 3, 1, pal[1]); P(x, y - 1, 1, 1, pal[2]); P(x - 1, y, 3, 1, pal[1]); P(x - 1, y + 1, 3, 1, '#e8d08a'); }
        break; }
      case 'orb': { const ox = hx + 2, oy = hy - 6 + (pose === 'up' ? -3 : 0); P.ell(ox, oy, 2, 2, pal[2]); P(ox - 1, oy - 1, 1, 1, pal[0]); break; }
      case 'scythe': { ang = pose === 'strike' ? 0 : -1.3; const [x, y] = shaft(13, '#3a2a3a'); P.line(x, y, x + 6, y + 2, '#d8d8f0'); P.line(x, y + 1, x + 5, y + 3, '#a8a8c8'); break; }
      case 'book': case 'tome': { const bc = w === 'book' ? '#4a8ad0' : '#2a5a2a'; P(hx - 1, hy - 3, 4, 5, bc); P(hx, hy - 2, 2, 3, '#f0ead8'); if (pose === 'up') P(hx, hy - 6, 2, 2, pal[1]); break; }
      case 'daggers': { shaft(5, wc); P(hx - 12, hy - 1, 1, 1, wc); P.line(hx - 11, hy, hx - 14, hy + (pose === 'strike' ? -2 : 3), wc); break; }
      case 'blades': { shaft(7, pal[1]); P.line(hx - 11, hy, hx - 15, hy + (pose === 'strike' ? -3 : 4), pal[1]); break; }
      case 'bow': { const bx = hx + 1, by = hy - 5; for (let i = -5; i <= 5; i++) P(bx + Math.round(2 - (i * i) / 10), by + i, 1, 1, '#8a5a2a'); P.line(bx, by - 5, bx, by + 5, '#e8e8e8'); if (pose !== 'rest') P.line(bx - 6, by, bx + 3, by, '#d8c8a0'); break; }
      case 'rifle': { const a0 = ang; ang = pose === 'strike' ? -0.05 : 0.2; const [x, y] = shaft(11, '#3a3a40', 2); P(hx - 3, hy, 4, 2, '#6a4a2a'); P(x, y, 1, 1, '#e8b04a'); ang = a0; break; }
      case 'wrench': { const [x, y] = shaft(7, '#a0a8b8'); P(x - 1, y - 2, 3, 2, '#c8d0dc'); P(x, y - 2, 1, 1, '#120e18'); break; }
      case 'fists': { P(hx - 1, hy - 1, 3, 3, L.c2); P(hx - 11, hy - 1, 3, 3, L.c2); break; }
      case 'greatsword': { const a0 = ang; const [gx, gy] = dir(2); P.line(hx, hy, gx, gy, '#3a2a2a', 2); P(gx - 2, gy - 1, 5, 2, '#c0304a'); const [x, y] = dir(15); P.line(gx, gy, x, y, '#2a1a22', 3); P.line(gx, gy, x, y, '#5a3a4a', 1); P(x - 1, y - 1, 2, 2, '#e0305a'); ang = a0; break; }
      case 'prism': { ang = pose === 'strike' ? -0.7 : pose === 'up' ? -1.57 : -1.35; const [x, y] = shaft(13, '#e8d8a0'); P(x - 2, y - 4, 5, 2, '#ffffff'); P(x - 1, y - 6, 3, 2, '#bff4ff'); P(x - 2, y - 2, 1, 1, '#ff7ab0'); P(x + 2, y - 2, 1, 1, '#7ae8ff'); P(x, y - 7, 1, 1, '#ffe680'); break; }
      case 'halospear': { ang = pose === 'strike' ? 0.1 : pose === 'up' ? -1.2 : -0.9; const [x, y] = shaft(14, '#e8e0c8'); const tx = x + Math.cos(ang) * 3, ty = y + Math.sin(ang) * 3; P.line(x, y, tx, ty, '#ffffff'); P.ell(Math.round(x), Math.round(y), 2, 1, '#ffd84a'); P(Math.round(x), Math.round(y), 1, 1, '#ffffff'); break; }
      case 'demonclaw': { for (const dx of [0, -11]) { P(hx - 1 + dx, hy - 1, 3, 3, '#5a1010'); P.line(hx + 1 + dx, hy - 1, hx + 4 + dx, hy - 4, '#ff6a1a'); P.line(hx + 2 + dx, hy, hx + 5 + dx, hy - 2, '#ffb060'); P.line(hx + 1 + dx, hy + 1, hx + 4 + dx, hy + 1, '#ff6a1a'); } break; }
      case 'scepter': { ang = pose === 'strike' ? -0.7 : pose === 'up' ? -1.57 : -1.35; const [x, y] = shaft(12, '#ffd84a'); P.ell(Math.round(x), Math.round(y - 2), 2, 2, '#ffffff'); P(Math.round(x) - 3, Math.round(y) - 2, 1, 1, '#a0d8ff'); P(Math.round(x) + 3, Math.round(y) - 2, 1, 1, '#a0d8ff'); P(Math.round(x), Math.round(y) - 6, 1, 2, '#ffe9a0'); break; }
      case 'trickstaff': { ang = pose === 'strike' ? -0.6 : pose === 'up' ? -1.5 : -1.25; const [x, y] = shaft(13, '#2a1a10'); const rx = Math.round(x), ry = Math.round(y); P.line(rx, ry, rx - 3, ry - 4, '#e8c04a'); P.line(rx - 3, ry - 4, rx - 4, ry - 2, '#e8c04a'); P.line(rx, ry, rx + 3, ry - 4, '#e8c04a'); P.line(rx + 3, ry - 4, rx + 4, ry - 2, '#e8c04a'); P(rx - 1, ry - 2, 2, 2, '#a8ff3a'); P(rx, ry - 2, 1, 1, '#f6ffd8'); break; }
      case 'jesterstick': { ang = pose === 'strike' ? -0.3 : pose === 'up' ? -1.3 : -1; const [x, y] = shaft(9, '#ff4ab0'); P(Math.round(x) - 2, Math.round(y) - 3, 5, 3, '#ffd84a'); P(Math.round(x) - 3, Math.round(y) - 4, 2, 2, '#4ad6ff'); P(Math.round(x) + 2, Math.round(y) - 4, 2, 2, '#ff4ab0'); P(Math.round(x) - 3, Math.round(y) - 2, 1, 1, '#ffffff'); P(Math.round(x) + 3, Math.round(y) - 2, 1, 1, '#ffffff'); break; }
      case 'lurerod': { ang = pose === 'strike' ? -0.4 : pose === 'up' ? -1.4 : -1.1; const [x, y] = shaft(12, '#2a2640'); P.line(x, y, x + 4, y + 2, '#2a2640'); P.line(x + 4, y + 2, x + 4, y + 6, '#6a6080'); P.ell(x + 4, y + 7, 1, 1, '#e8d8ff'); P(x + 3, y + 8, 3, 1, '#a06aff'); break; }
      case 'starbow': { const bx = hx + 1, by = hy - 5; for (let i = -6; i <= 6; i++) P(bx + Math.round(2.4 - (i * i) / 12), by + i, 1, 1, i % 3 ? '#e8c04a' : '#fff2a8'); P.line(bx, by - 6, bx, by + 6, '#c8b8ff'); P(bx + 2, by - 8, 1, 3, '#ffffff'); P(bx + 1, by - 7, 3, 1, '#ffffff'); if (pose !== 'rest') { P.line(bx - 7, by, bx + 3, by, '#fff2a8'); P(bx + 3, by - 1, 2, 3, '#ffffff'); } break; }
      case 'spear': { ang = pose === 'strike' ? 0.1 : pose === 'up' ? -1.2 : -0.9; const [x, y] = shaft(14, '#7a5a3a'); const [tx, ty] = [x + Math.cos(ang) * 3, y + Math.sin(ang) * 3]; P.line(x, y, tx, ty, '#e8eef8'); P(x - 1, y, 1, 1, '#c8102e'); break; }
    }
  }

  function drawChar(P, L, view, anim, f) {
    const back = view === 'back';
    const bob = anim === 'idle' ? (f % 2) : anim === 'walk' ? (f % 2) : 0;
    const y0 = bob; // body offset
    const skin = L.skin, c1 = L.c1, c2 = L.c2, dk = U.shade(c1, -0.3), lt = U.shade(c1, 0.22);
    const bone = L.bones;
    // back attachments (wings drawn by renderer) / cape
    if (L.back && !back) { P(17, 13 + y0, 2, 12, L.back[0]); P(18, 11 + y0, 2, 3, L.back[1]); }
    if (back && L.back) { P(9, 15 + y0, 6, 11, L.back[0]); P(10, 14 + y0, 4, 2, L.back[1]); }
    // legs
    let lL = 0, lR = 0, xl = 0, xr = 0;
    if (anim === 'walk') { if (f === 0) { lL = 1; xl = -1; } if (f === 2) { lR = 1; xr = 1; } }
    if (anim === 'attack' && f === 1) { xl = -1; xr = 1; }
    const legC = bone ? '#e8e0d0' : U.shade(c1, -0.45), bootC = bone ? '#c8c0b0' : '#3a2a22';
    P(9 + xl, 24, 2, 6 - lL, legC); P(9 + xl, 29 - lL, 3, 2, bootC);
    P(13 + xr, 24, 2, 6 - lR, legC); P(13 + xr, 29 - lR, 3, 2, bootC);
    // torso
    const ty = 15 + y0;
    if (L.robe) { P(7, ty + 6, 10, 6 - y0, dk); P(8, ty + 6, 8, 5, c1); P(8, ty + 11 - y0, 8, 1, c2); }
    P(8, ty, 8, 9, bone ? '#d8d0c0' : c1); P(8, ty, 1, 9, bone ? '#f0ead8' : lt); P(15, ty, 1, 9, bone ? '#a8a090' : dk);
    if (bone) { P(9, ty + 2, 6, 1, '#7a7060'); P(9, ty + 4, 6, 1, '#7a7060'); }
    else { P(8, ty + 6, 8, 1, c2); P(11, ty + 6, 2, 1, '#ffe08a'); if (!back) { P(11, ty, 2, 3, c2); } if (L.role === 'tank' || L.role === 'hybrid') { P(7, ty, 3, 3, c2); P(14, ty, 3, 3, c2); } }
    // arms
    let aLy = ty + 1, aRy = ty + 1, aLx = 6, aRx = 16;
    const castUp = anim === 'cast';
    const pose = anim === 'attack' ? (f === 0 ? 'up' : f === 1 ? 'strike' : 'rest') : castUp ? 'up' : 'rest';
    const armC = bone ? '#e8e0d0' : c1, hand = bone ? '#e8e0d0' : skin;
    if (castUp) { P(aLx, ty - 4, 2, 6, armC); P(aLx, ty - 5, 2, 2, hand); P(aRx, ty - 4, 2, 6, armC); P(aRx, ty - 5, 2, 2, hand); }
    else {
      P(aLx, aLy, 2, 6, U.shade(armC, -0.1)); P(aLx, aLy + 6, 2, 2, hand);
      if (pose === 'up') { P(aRx, ty - 3, 2, 5, armC); P(aRx, ty - 4, 2, 2, hand); }
      else if (pose === 'strike') { P(aRx, ty + 1, 4, 2, armC); P(aRx + 3, ty + 1, 2, 2, hand); }
      else { P(aRx, aRy, 2, 6, armC); P(aRx, aRy + 6, 2, 2, hand); }
    }
    // shield for mace/hammer users
    if (L.weapon === 'mace' || L.weapon === 'hammer') { const sx = back ? 15 : 4, sy = ty + 1; P(sx, sy, 5, 7, c2); P(sx + 1, sy + 1, 3, 5, c1); P(sx + 2, sy + 2, 1, 3, c2); }
    // head
    const hy = 6 + y0;
    const sk = bone ? '#f0ead8' : skin;
    P(8, hy, 8, 9, sk); P(8, hy + 8, 8, 1, U.shade(sk, -0.15));
    if (!back) {
      if (bone) { P(9, hy + 3, 2, 2, '#120e18'); P(13, hy + 3, 2, 2, '#120e18'); P(10, hy + 6, 4, 1, '#7a7060'); if (L.eyes) { P(9, hy + 3, 1, 1, L.eyes); P(13, hy + 3, 1, 1, L.eyes); } }
      else { P(10, hy + 4, 1, 2, '#1a1420'); P(13, hy + 4, 1, 2, '#1a1420'); P(9, hy + 6, 1, 1, '#f0a090'); P(14, hy + 6, 1, 1, '#f0a090'); }
      if (L.mask) { P(8, hy + 3, 8, 3, L.mask); P(10, hy + 4, 1, 1, '#ffffff'); P(13, hy + 4, 1, 1, '#ffffff'); }
    }
    // hair / helm / hat
    const hc = L.hair, hd = U.shade(L.hair, -0.3);
    if (!bone) {
      if (L.helm) {
        P(7, hy - 1, 10, 4, c2); P(7, hy - 1, 10, 1, U.shade(c2, 0.3)); P(7, hy + 3, 1, 4, c2); P(16, hy + 3, 1, 4, c2);
        if (back) P(8, hy + 2, 8, 6, U.shade(c2, -0.15)); else P(11, hy + 3, 2, 2, c2);
      } else {
        P(7, hy - 1, 10, 3, hc); P(8, hy - 2, 7, 1, hc); P(7, hy + 2, 1, 4 + (L.hstyle === 1 ? 4 : 0), hc); P(16, hy + 2, 1, 4 + (L.hstyle === 1 ? 4 : 0), hd);
        if (!back) { P(9, hy + 2, 3, 1, hc); if (L.hstyle === 2) P(12, hy + 2, 3, 2, hc); }
        else { P(8, hy + 2, 8, 6, hc); P(8, hy + 7, 8, 1, hd); if (L.hstyle === 3) P(11, hy + 8, 2, 5, hc); }
        P(9, hy - 1, 2, 1, U.shade(hc, 0.35));
      }
    }
    if (L.hat !== undefined) {
      const a = L.hatC, b = L.hatC2;
      if (L.hat === 0) { P(6, hy, 12, 2, a); P(9, hy - 4, 6, 4, a); P(9, hy - 1, 6, 1, b); } // wide hat
      else if (L.hat === 1) { P(8, hy - 5, 8, 6, a); P(7, hy, 10, 1, b); P(11, hy - 7, 2, 2, b); } // tall helm
      else if (L.hat === 2) { P(7, hy - 2, 10, 4, a); P(6, hy - 5, 2, 4, b); P(16, hy - 5, 2, 4, b); } // horns
      else { P(7, hy - 1, 10, 3, a); P(8, hy - 3, 8, 2, a); P(15, hy - 2, 3, 6, b); } // hood w/ ribbon
    }
    if (L.crown) { P(9, hy - 3, 6, 2, L.crown); P(9, hy - 4, 1, 1, L.crown); P(11, hy - 5, 2, 2, L.crown); P(14, hy - 4, 1, 1, L.crown); }
    // weapon (front draws over, back draws behind would be nicer; keep simple)
    const hxp = pose === 'strike' ? 20 : 17, hyp = pose === 'up' ? ty - 4 : pose === 'strike' ? ty + 2 : ty + 7;
    drawWeapon(P, L, view, pose, hxp, hyp);
    if (anim === 'hurt') { /* tint applied by renderer */ }
  }


  // ---------- Seeker-style hooded hero v2 (heroes only): 6-tone cloth, mantle, lining, clasp, tattered hem, rich animation ----------
  const lumH = h => { const n = parseInt(h.slice(1), 16); return (((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) / 255; };

  // ---------- per-class signature looks for the hooded hero ----------
  const SIG = {
    blademaster: { head: ['headband'], behind: ['sheath'], face: 'slit' }, guardian: { head: ['helmcrest'], face: 'visor', body: ['bigpaul'] },
    berserker: { head: ['horns'], face: 'angry', body: ['fur'] }, paladin: { head: ['circlet'], body: ['tabard'] },
    pyromancer: { head: ['flametip'], float: ['embers'] }, cryomancer: { head: ['icespikes'], body: ['frost'], float: ['snow'] },
    stormcaller: { head: ['bolt'], float: ['sparks'] }, necromancer: { face: 'skull', float: ['wisp'] },
    cleric: { head: ['halo'], body: ['beads'] }, druid: { head: ['antlers'], body: ['leaves'] },
    assassin: { face: 'halfmask', body: ['scarf'] }, shadowdancer: { head: ['ribbons'], face: 'crescent' },
    ranger: { head: ['feather'] }, marksman: { head: ['brim'], face: 'monocle' },
    engineer: { head: ['goggles'], behind: ['backpack'] }, monk: { head: ['headband2'], body: ['beads'] },
    spellblade: { head: ['circletrune'], body: ['runes'] }, beastmaster: { head: ['ears'], body: ['fur'] },
    chronomancer: { behind: ['gearhalo'] }, warlock: { head: ['smallhorns'], float: ['grimoire'] },
    starhunter: { head: ['startip'], body: ['stars'] }, darkknight: { head: ['spikes'], face: 'visor', body: ['cracks'] },
    lightbringer: { behind: ['sunrays'], head: ['circlet'] }, shadowmancer: { body: ['ink'], face: 'crescent' },
    seraph: { behind: ['wings'], head: ['halo'] }, reaper: { face: 'skull', hover: true, body: ['tatter'] },
    demon: { head: ['horns'], behind: ['tail'], face: 'angry' }, deity: { head: ['crown'], float: ['orbs'] },
    jester: { head: ['jesterhat'], face: 'diamond' }, loki: { head: ['lokihorns'], body: ['scarfgold'] }
  };
  SPR.SIG = SIG;
  function sigDraw(P, phase, g) {
    const S = g.sig; if (!S) return; const { X, hy, by, MY, R0, f, anim, sway, back, T, TR, TRh, GOLD, pal, ec } = g; const fr = (anim === 'walk' ? f : f) | 0;
    const list = S[phase] || []; const bone = '#ece2c8', boneD = '#b0a488', gold = GOLD, goldD = '#9a6a1a';
    for (const k of list) switch (k) {
      // ---- behind ----
      case 'wings': { const up = fr % 2 ? -1 : 0; for (const sd of [-1, 1]) { const bx = sd < 0 ? X(5) : X(18); const ox = sd < 0 ? -1 : 1; P(bx, 14 + by + up, 2, 6, '#ffffff'); P(bx + ox * 2, 12 + by + up, 2, 7, '#eef4ff'); P(bx + ox * 4, 13 + by + up * 2, 1, 5, '#d8e4ff'); P(bx + ox * 3, 11 + by + up * 2, 1, 2, '#ffffff'); } break; }
      case 'sunrays': { const rot = fr % 2; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283 + rot * 0.39; const cx = X(12), cy = hy + 5; P(Math.round(cx + Math.cos(a) * 9), Math.round(cy + Math.sin(a) * 8), 1, 1, i % 2 ? '#fff2a0' : '#ffd040'); P(Math.round(cx + Math.cos(a) * 8), Math.round(cy + Math.sin(a) * 7), 1, 1, '#ffe680'); } break; }
      case 'gearhalo': { const cx = X(12), cy = hy + 5, rot = fr * 0.4; for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283 + rot; P(Math.round(cx + Math.cos(a) * 8), Math.round(cy + Math.sin(a) * 7), 1, 1, i % 2 ? '#e8c04a' : '#5ff0c8'); } for (let i = 0; i < 4; i++) { const a = i / 4 * 6.283 + rot * 2; P(Math.round(cx + Math.cos(a) * 9), Math.round(cy + Math.sin(a) * 8), 1, 1, '#ffffff'); } break; }
      case 'tail': { const sw = [0, 1, 1, 0, -1, -1][fr % 6] || 0; P(X(16), R0 + 9, 2, 1, '#7a1a1a'); P(X(18), R0 + 8 + sw, 1, 2, '#7a1a1a'); P(X(19), R0 + 6 + sw, 1, 2, '#9a2222'); P(X(19), R0 + 4 + sw, 2, 2, '#ff5a2a'); P(X(20), R0 + 4 + sw, 1, 1, '#ffb060'); break; }
      case 'sheath': { P.line(X(5), 13 + by, X(18), 27 + by, '#3a2a22'); P(X(4), 12 + by, 2, 2, gold); break; }
      case 'backpack': { P(X(6), 16 + by, 12, 8, '#6a5a44'); P(X(6), 16 + by, 12, 1, '#8a7a5a'); P(X(16), 13 + by, 2, 4, '#9a9aa8'); P(X(15), 12 + by, 4, 1, '#c8c8d8'); break; }
      // ---- body ----
      case 'tabard': if (!back) { P(X(10), R0 + 1, 4, 9, '#f0ead8'); P(X(11), R0 + 2, 2, 6, '#c83a3a'); P(X(10), R0 + 4, 4, 2, '#c83a3a'); } break;
      case 'beads': for (let i = 0; i < 7; i++) P(X(8 + i * (8 / 6)), MY + 3 + (i === 3 ? 2 : Math.abs(3 - i) < 2 ? 1 : 0), 1, 1, i % 2 ? '#a0703a' : '#e8c890'); break;
      case 'fur': { for (let i = 0; i < 12; i++) P(X(6 + i), MY - (i % 3 === 1 ? 1 : 0), 1, 2, i % 2 ? '#e8d8b0' : '#b09870'); break; }
      case 'runes': { const on = fr % 2; for (const [rx, ry] of [[8, R0 + 4], [15, R0 + 7], [9, R0 + 9]]) { P(X(rx), ry, 1, 1, on ? pal[0] : pal[1]); P(X(rx), ry + 1, 1, 1, pal[2]); } break; }
      case 'stars': { for (let i = 0; i < 5; i++) { const tw = (i + fr) % 3 === 0; const sx = X([8, 15, 9, 14, 11][i]), sy = R0 + [3, 5, 8, 9, 11][i]; P(sx, sy, 1, 1, tw ? '#ffffff' : '#fff2a8'); if (tw) { P(sx - 1, sy, 1, 1, '#9a7aff'); P(sx + 1, sy, 1, 1, '#9a7aff'); } } break; }
      case 'cracks': { const gl = fr % 2 ? '#ff7af5' : '#ff4af0'; P(X(9), R0 + 3, 1, 3, gl); P(X(10), R0 + 6, 1, 2, gl); P(X(14), R0 + 5, 1, 4, gl); P(X(13), R0 + 9, 1, 2, gl); break; }
      case 'leaves': { for (const [lx, ly] of [[6, MY + 1], [9, MY + 3], [15, MY + 2], [17, MY]]) { P(X(lx), ly, 2, 1, '#5ac84a'); P(X(lx), ly, 1, 1, '#9ae070'); } break; }
      case 'frost': { if (g.hem) for (let k2 = g.hem.x0; k2 < g.hem.x1; k2 += 2) P(k2, g.hem.y, 1, 1, '#e8f8ff'); P(X(7), MY + 1, 1, 1, '#ffffff'); P(X(16), MY + 2, 1, 1, '#ffffff'); break; }
      case 'ink': { if (g.hem) { for (let i = 0; i < 4; i++) { const dx = g.hem.x0 + 1 + i * 3, len = 1 + ((i + fr) % 3); P(dx, g.hem.y + 1, 1, Math.min(len, 31 - g.hem.y - 1), '#1a1430'); if ((i + fr) % 3 === 2) P(dx, Math.min(30, g.hem.y + len + 1), 1, 1, '#a06aff'); } } break; }
      case 'tatter': { if (g.hem) for (let k2 = g.hem.x0; k2 < g.hem.x1; k2++) if ((k2 + fr) % 2 === 0) P(k2, g.hem.y + 1, 1, 1 + ((k2 + fr) % 3 === 0 ? 1 : 0), T.D2); break; }
      case 'scarf': case 'scarfgold': { const c = k === 'scarfgold' ? gold : TR; const w = anim === 'walk' ? fr % 3 : (fr % 2); P(X(8), MY, 8, 2, c); P(X(8), MY, 8, 1, U.shade(c, 0.3)); P(X(5) - w, MY + 1, 3, 2, c); P(X(3) - w, MY + 2 + (w ? 0 : 1), 2, 2, U.shade(c, -0.2)); P(X(2) - w, MY + 4, 1, 1, U.shade(c, -0.35)); break; }
      case 'bigpaul': { for (const sx of [X(4), X(16)]) { P(sx, MY - 2, 5, 4, TR); P(sx, MY - 2, 5, 1, TRh); P(sx + 2, MY - 1, 1, 1, gold); P(sx, MY + 1, 5, 1, U.shade(TR, -0.3)); } break; }
      // ---- head ----
      case 'headband': case 'headband2': { const c = k === 'headband' ? '#d83a3a' : '#e8a030'; P(X(7), hy + 3, 10, 1, c); if (!back) P(X(11), hy + 3, 2, 1, gold); const t = (fr % 2) + (anim === 'walk' ? 1 : 0); P(X(5), hy + 4, 2, 1, c); P(X(3) - t, hy + 5, 3, 1, c); P(X(2) - t, hy + 6 + (t > 1 ? 1 : 0), 2, 1, U.shade(c, -0.25)); break; }
      case 'helmcrest': { P(X(11), hy - 3, 2, 4, TR); P(X(11), hy - 3, 1, 4, TRh); P(X(10), hy - 2, 1, 2, TR); break; }
      case 'horns': case 'smallhorns': { const big = k === 'horns'; const hc = big ? bone : '#3a2a3a', hd = big ? boneD : '#1a1020'; P(X(4), hy + 3, 2, 2, hc); P(X(3), hy + 1, 2, 2, hc); if (big) { P(X(3), hy - 1, 1, 2, hd); P(X(4), hy - 2, 1, 1, hd); } P(X(18), hy + 3, 2, 2, hc); P(X(19), hy + 1, 2, 2, hc); if (big) { P(X(20), hy - 1, 1, 2, hd); P(X(19), hy - 2, 1, 1, hd); } break; }
      case 'lokihorns': { for (const sd of [-1, 1]) { const bx = sd < 0 ? X(6) : X(17); P(bx, hy + 2, 2, 2, gold); P(bx + sd, hy, 2, 2, gold); P(bx + sd * 2, hy - 2, 1, 2, gold); P(bx + sd, hy - 4, 1, 2, '#ffe680'); P(bx + sd * 1, hy - 5, 1, 1, '#fff6c0'); P(bx, hy + 3, 2, 1, goldD); } break; }
      case 'antlers': { for (const sd of [-1, 1]) { const bx = sd < 0 ? X(7) : X(16); P(bx, hy - 1, 1, 3, '#8a5a34'); P(bx + sd, hy - 3, 1, 2, '#8a5a34'); P(bx + sd * 2, hy - 4, 1, 2, '#a87a4a'); P(bx - sd, hy - 3, 1, 1, '#a87a4a'); P(bx + sd * 2, hy - 5, 1, 1, '#5ac84a'); } break; }
      case 'ears': { for (const sx of [X(6), X(16)]) { P(sx, hy - 1, 2, 3, '#8a7a6a'); P(sx, hy - 2, 1, 1, '#8a7a6a'); P(sx + (sx < X(12) ? 1 : 0), hy, 1, 1, '#e8a0a0'); } break; }
      case 'halo': { const b = fr % 2; P(X(8), hy - 4 + b, 8, 1, '#ffe680'); P(X(7), hy - 3 + b, 1, 1, '#ffd040'); P(X(16), hy - 3 + b, 1, 1, '#ffd040'); P(X(9), hy - 2 + b, 6, 1, '#fff6c0'); break; }
      case 'crown': { P(X(8), hy - 1, 8, 2, gold); P(X(8), hy - 3, 1, 2, gold); P(X(11), hy - 5, 2, 4, gold); P(X(15), hy - 3, 1, 2, gold); P(X(11), hy - 1, 2, 1, '#6a4aff'); P(X(11), hy - 5, 1, 1, '#ffffff'); break; }
      case 'circlet': case 'circletrune': { P(X(8), hy + 3, 8, 1, gold); if (!back) { const gem = k === 'circletrune' ? (fr % 2 ? pal[0] : pal[1]) : '#ffffff'; P(X(11), hy + 2, 2, 2, gem); if (k === 'circlet') { P(X(11), hy + 1, 2, 1, gold); } } break; }
      case 'feather': { P.line(X(15), hy + 2, X(19), hy - 3 + (fr % 2), '#e8e4d8'); P(X(19), hy - 4 + (fr % 2), 1, 2, '#c83a3a'); P(X(18), hy - 2 + (fr % 2), 1, 1, '#ffffff'); break; }
      case 'brim': { P(X(4), hy + 3, 16, 1, '#3a2a1a'); P(X(5), hy + 2, 14, 1, '#5a4028'); P(X(8), hy - 1, 8, 3, '#4a3420'); P(X(8), hy + 1, 8, 1, TR); break; }
      case 'goggles': { P(X(7), hy + 2, 10, 1, '#5a4a3a'); for (const gx of [X(8), X(13)]) { P(gx, hy + 1, 3, 3, '#c8a050'); P(gx + 1, hy + 2, 1, 1, fr % 2 ? '#bff4ff' : '#7ad8ff'); } break; }
      case 'flametip': { const fl = [[0, -1], [1, -2], [0, -3]][fr % 3]; const px = X(back ? 16 : 5), py = hy - 2; P(px, py, 2, 2, '#ff6a1a'); P(px + fl[0], py - 1, 2, 1, '#ffb040'); P(px + fl[0], py + fl[1], 1, 2, '#ffe680'); P(px + 1, py + fl[1] - 1, 1, 1, '#ffffff'); break; }
      case 'icespikes': { for (const [sx, h] of [[8, 3], [11, 5], [14, 3]]) { P(X(sx), hy + 1 - h, 1, h, '#bff4ff'); P(X(sx) + 1, hy + 2 - h, 1, h - 1, '#7ac8f0'); P(X(sx), hy + 1 - h, 1, 1, '#ffffff'); } break; }
      case 'bolt': { const c = fr % 2 ? '#ffffff' : '#ffe84a'; P(X(16), hy + 1, 2, 1, c); P(X(15), hy + 2, 2, 1, c); P(X(16), hy + 3, 2, 1, c); P(X(15), hy + 4, 1, 2, c); break; }
      case 'startip': { const px = X(back ? 16 : 5), py = hy - 3; const tw = fr % 2; P(px, py, 1, 1, '#ffffff'); P(px - 1, py, 1, 1, '#fff2a8'); P(px + 1, py, 1, 1, '#fff2a8'); P(px, py - 1, 1, 1, '#fff2a8'); P(px, py + 1, 1, 1, '#fff2a8'); if (tw) { P(px - 2, py, 1, 1, '#9a7aff'); P(px + 2, py, 1, 1, '#9a7aff'); P(px, py - 2, 1, 1, '#9a7aff'); } break; }
      case 'spikes': { for (const [sx, h] of [[7, 2], [9, 3], [12, 4], [15, 2]]) { P(X(sx), hy + 1 - h, 1, h, T.D2); P(X(sx), hy + 1 - h, 1, 1, '#ff4af0'); } break; }
      case 'ribbons': { const t = fr % 3; P(X(6), hy + 4, 2, 1, TR); P(X(4) - t, hy + 5, 2, 1, TR); P(X(3) - t, hy + 6, 1, 3, TR); P(X(16), hy + 4, 2, 1, TR); P(X(18) + t, hy + 6, 1, 4, U.shade(TR, -0.2)); break; }
      case 'jesterhat': { const t = fr % 2; P(X(5), hy - 1, 4, 2, '#ff4a6a'); P(X(3), hy - 2 + t, 2, 2, '#ff4a6a'); P(X(2), hy - 1 + t, 2, 2, '#ffd84a'); P(X(15), hy - 1, 4, 2, '#4a9aff'); P(X(19), hy - 2 - t, 2, 2, '#4a9aff'); P(X(20), hy - 1 - t, 2, 2, '#ffd84a'); P(X(8), hy, 8, 1, '#ffd84a'); break; }
      // ---- floating companions ----
      case 'embers': for (let i = 0; i < 3; i++) { const yy = 20 - ((fr * 3 + i * 5) % 18), xx = [4, 19, 7][i] + ((fr + i) % 2); P(X(xx), yy + by, 1, 1, i % 2 ? '#ffb040' : '#ff6a1a'); } break;
      case 'snow': for (let i = 0; i < 3; i++) { const yy = 4 + ((fr * 3 + i * 7) % 22), xx = [3, 20, 6][i]; P(X(xx), yy, 1, 1, '#ffffff'); } break;
      case 'sparks': { const pts = [[[4, 12], [20, 18]], [[5, 20], [19, 9]], [[3, 8], [21, 14]], [[6, 16], [18, 6]]][fr % 4]; for (const [sx, sy] of pts) { P(X(sx), sy + by, 1, 1, '#ffffff'); P(X(sx) + 1, sy + by + 1, 1, 1, '#ffe84a'); } break; }
      case 'wisp': { const b = [0, -1, -1, 0, 1, 1][fr % 6] || 0; const wx = X(19), wy = 9 + by + b; P(wx, wy, 2, 2, '#6affc8'); P(wx, wy - 1, 1, 1, '#c8ffe8'); P(wx + 1, wy + 2, 1, 1, '#1a8a6a'); break; }
      case 'grimoire': { const b = [0, -1, -1, 0, 1, 1][fr % 6] || 0; const gx = X(1), gy = 13 + by + b; P(gx, gy, 4, 3, '#3a1a3a'); P(gx + 1, gy, 2, 3, '#e8d8c0'); P(gx + 2, gy + 1, 1, 1, '#7aff4a'); break; }
      case 'orbs': { const a = fr * 1.05; for (let i = 0; i < 2; i++) { const t = a + i * Math.PI; const ox = Math.round(X(12) + Math.cos(t) * 9), oy = Math.round(16 + by + Math.sin(t) * 3); P(ox, oy, 2, 2, i ? '#a0d8ff' : '#ffe9a0'); P(ox, oy, 1, 1, '#ffffff'); } break; }
    }
  }
  function sigFace(P, g) {
    const { X, hy, ec, eyes } = g; const ey = hy + 6; const S = g.sig; if (!S || !S.face) return false; const glow = U.shade(ec, -0.5), core = U.shade(ec, 0.6);
    switch (S.face) {
      case 'skull': P(X(9), hy + 4, 6, 5, '#ece2c8'); P(X(10), hy + 9, 4, 1, '#d0c4a8'); P(X(9), ey, 2, 2, '#120d18'); P(X(13), ey, 2, 2, '#120d18'); P(X(9), ey, 1, 1, ec); P(X(13), ey, 1, 1, ec); P(X(11), hy + 8, 2, 1, '#8a7e64'); P(X(10), hy + 9, 1, 1, '#120d18'); P(X(13), hy + 9, 1, 1, '#120d18'); return true;
      case 'visor': P(X(8), ey, 8, 2, glow); P(X(9), ey, 6, 1, eyes === 'blink' ? glow : ec); P(X(10), ey, 1, 1, core); P(X(13), ey, 1, 1, core); return true;
      case 'halfmask': P(X(8), ey + 1, 8, 3, g.TR); P(X(8), ey + 1, 8, 1, U.shade(g.TR, 0.3)); if (eyes !== 'blink') { P(X(9), ey, 2, 1, ec); P(X(13), ey, 2, 1, ec); P(X(9), ey, 1, 1, core); } return true;
      case 'slit': case 'angry': if (eyes === 'blink') { P(X(9), ey + 1, 2, 1, glow); P(X(13), ey + 1, 2, 1, glow); return true; } P(X(9), ey + (S.face === 'angry' ? 0 : 1), 2, 1, ec); P(X(13), ey + (S.face === 'angry' ? 0 : 1), 2, 1, ec); P(X(10), ey + 1, 1, 1, ec); P(X(13), ey + 1, 1, 1, ec); P(X(9), ey + 2, 2, 1, glow); P(X(13), ey + 2, 2, 1, glow); return true;
      case 'crescent': P(X(9), ey + 1, 2, 1, ec); P(X(8), ey, 1, 1, ec); P(X(13), ey + 1, 2, 1, ec); P(X(15), ey, 1, 1, ec); P(X(9), ey + 2, 2, 1, glow); P(X(13), ey + 2, 2, 1, glow); return true;
      case 'monocle': P(X(9), ey, 2, 2, ec); P(X(9), ey, 1, 1, core); P(X(12), ey - 1, 4, 4, '#c8a050'); P(X(13), ey, 2, 2, eyes === 'blink' ? glow : '#ffffff'); P(X(13), ey, 1, 1, ec); return true;
      case 'diamond': for (const ex of [X(10), X(14)]) { P(ex, ey - 1, 1, 1, ec); P(ex - 1, ey, 3, 1, ec); P(ex, ey + 1, 1, 1, ec); P(ex, ey, 1, 1, core); } P(X(10), ey + 3, 5, 1, '#ff4a6a'); P(X(9), ey + 2, 1, 1, '#ff4a6a'); P(X(15), ey + 2, 1, 1, '#ff4a6a'); return true;
    }
    return false;
  }
  function drawSeeker(P, L, view, anim, f) {
    const back = view === 'back';
    let c1 = L.c1; const c2 = L.c2, pal = D.ELEM[L.elem].pal;
    if (lumH(c1) < 0.17) { c1 = lumH(pal[2]) < 0.12 ? U.shade(pal[2], 0.25) : U.shade(pal[2], -0.12); for (let k = 0; k < 4 && lumH(c1) > 0.3; k++) c1 = U.shade(c1, -0.22); }
    const H2 = U.shade(c1, 0.48), H1 = U.shade(c1, 0.24), C = c1, D1 = U.shade(c1, -0.22), D2 = U.shade(c1, -0.42), D3 = U.shade(c1, -0.6);
    const Ln = U.shade(c2, -0.5), TR = c2, TRh = U.shade(c2, 0.35), GOLD = '#f0c850', GOLDd = '#9a6a1a';
    const VOID = '#0d0913', VOID2 = '#1a1424', TUN = '#231d2d', LEG = '#2e2838', LEGh = '#463c52', BOOT = '#1b1723', BOOTh = '#3c3446', GLV = '#2a2433', GLVh = '#4a4058';
    const ec0 = L.eyeC || pal[1];
    // ---- animation parameters ----
    let by = 0, lean = 0, br = 0, sway = 0, flare = 0, hem = f, armF = 'rest', armB = 'rest', eyes = 'open', spark = 0;
    let lgL = [0, 0], lgR = [0, 0];
    if (anim === 'idle') { by = [0, 0, 1, 1][f]; br = [0, 1, 1, 0][f]; sway = [0, -1, 0, 1][f] * 0; hem = f; eyes = f === 3 ? 'blink' : 'open'; }
    else if (anim === 'walk') { const ph = f / 6 * Math.PI * 2; const dx = Math.round(Math.cos(ph) * 2); lgL = [dx, Math.sin(ph) > 0.35 ? 1 : 0]; lgR = [-dx, Math.sin(ph) < -0.35 ? 1 : 0]; by = f % 3 === 0 ? 0 : 1; sway = -Math.round(Math.cos(ph)); armB = Math.sin(ph) > 0 ? 'fwd' : 'rest'; hem = f; }
    else if (anim === 'attack') { lean = [-1, 2, 2, 0][f]; by = [0, 0, 1, 0][f]; armF = ['raise', 'swing', 'extend', 'rest'][f]; flare = [0, 1, 2, 1][f]; sway = [1, -1, -2, 0][f]; lgL = [[0, 0], [-1, 0], [-2, 0], [0, 0]][f]; lgR = [[0, 0], [1, 0], [2, 0], [0, 0]][f]; }
    else if (anim === 'cast') { by = [0, -1, -2, -2][f]; armF = armB = f === 0 ? 'half' : 'up'; eyes = f ? 'bright' : 'open'; spark = f; flare = f >= 2 ? 1 : 0; hem = f; }
    else if (anim === 'hurt') { lean = [-2, -1][f]; eyes = 'white'; sway = 2 - f; armF = 'rest'; }
    const X = x => x + lean;
    const legY = 26;
    const g = { sig: L.sig, X, hy: 3 + by, by, MY: 14 + by - br, R0: 15 + by, f, anim, sway, back, T: { H2, H1, C, D1, D2, D3 }, TR, TRh, GOLD, pal, ec: ec0, eyes };
    sigDraw(P, 'behind', g);
    // ---- back cape (fashion) ----
    if (L.back) { if (back) { P(X(7), 15 + by, 10, 13, L.back[0]); P(X(8), 14 + by, 8, 2, L.back[1]); } else { P(X(17), 16 + by, 2, 11, L.back[0]); P(X(17), 15 + by, 2, 2, L.back[1]); } }
    // ---- legs ----
    const leg = (x, dx, lift) => { const xx = x + dx; P(xx, legY - lift, 2, 3, LEG); P(xx, legY - lift, 1, 2, LEGh); P(xx - (dx < 0 ? 1 : 0), 29 - lift, 3, 2, BOOT); P(xx, 29 - lift, 1, 1, BOOTh); };
    if (L.sig && L.sig.hover) { const w = [0, 1, 0, -1][f % 4] || 0; P(X(10) + w, 27, 4, 2, D2); P(X(11) + w, 29, 2, 1, D3); P(X(11) - w, 30, 1, 1, D3); } else { leg(9, lgL[0], lgL[1]); leg(13, lgR[0], lgR[1]); }
    // ---- cloak body ----
    const robe = L.robe ? 1 : 0; const R0 = 15 + by, RN = 12 + robe;
    let hemRow = null;
    for (let r = 0; r <= RN; r++) {
      const y = R0 + r; if (y > 29) break;
      const w = Math.min(15, 9 + Math.round(r * 0.45) + (r > 8 ? flare : 0)); const sh = r > 5 ? sway * Math.min(1, (r - 5) / 6) : 0;
      const x0 = Math.round(X(12 - w / 2 + sh)), x1 = x0 + w;
      P(x0, y, w, 1, C);
      if (back) { P(x0, y, 1, 1, D1); P(x1 - 2, y, 2, 1, D2); P(x0 + 2, y, 1, 1, H1); }
      else { P(x0, y, 1, 1, H1); P(x0 + 1, y, 1, 1, r < 6 ? H2 : C); P(x1 - 3, y, 1, 1, D1); P(x1 - 2, y, 2, 1, D2); }
      if (r > 3) { P(x0 + 3 + Math.round(sh * 0.3), y, 1, 1, D1); P(x1 - 5, y, 1, 1, (r + hem) % 3 ? D1 : C); } // folds
      if (r >= 7 && r <= 10) for (let k = x0 + 2; k < x0 + 5; k++) if ((k + y) % 2 === 0) P(k, y, 1, 1, D1); // cloth dither
      if (!back && r >= 2 && r < RN) { const cx = Math.round(X(11) + sh * 0.5); P(cx, y, 2, 1, TUN); P(cx - 1, y, 1, 1, r > 3 ? Ln : D1); P(cx + 2, y, 1, 1, r > 3 ? U.shade(Ln, -0.2) : D2); }
      if (back && r >= 1) P(Math.round(X(11) + sh * 0.5), y, 2, 1, r % 2 ? D1 : C); // back seam
      hemRow = { y, x0, x1 };
    }
    if (hemRow) { const { y, x0, x1 } = hemRow; for (let k = x0; k < x1; k++) { const tip = (k + hem) % 3 === 0; P(k, y, 1, 1, tip ? D2 : D1); if (tip && y < 30) P(k, y + 1, 1, 1, D3); } if (sway || flare) P(x0, y - 1, 2, 1, Ln); if (L.robe || L.role === 'healer') { P(x0 + 1, y - 1, x1 - x0 - 2, 1, TR); } }
    g.hem = hemRow;
    // belt + buckle
    if (!back) { const y = R0 + 6; P(X(9), y, 6, 1, '#3a2a20'); P(X(11), y, 2, 1, GOLD); P(X(11), y, 1, 1, '#fff0a0'); }
    // ---- back arm (left) ----
    const sleeve = (x, y, h, col, cuffY) => { P(x, y, 2, h, col); P(x, y, 1, h, U.shade(col, 0.12)); if (cuffY !== undefined) P(x, cuffY, 2, 1, TR); };
    if (armB === 'up') { sleeve(X(5), 11 + by, 6, C, 11 + by); P(X(5), 9 + by, 2, 2, GLV); P(X(5), 9 + by, 1, 1, GLVh); }
    else if (armB === 'half') { sleeve(X(5), 14 + by, 5, C, 14 + by); P(X(5), 12 + by, 2, 2, GLV); }
    else { const fw = armB === 'fwd' ? 1 : 0; sleeve(X(6) + fw, 17 + by, 5, D1, 21 + by); P(X(6) + fw, 22 + by, 2, 2, GLV); P(X(6) + fw, 22 + by, 1, 1, GLVh); }
    if (L.weapon === 'mace' || L.weapon === 'hammer') { const sx = back ? X(15) : X(3), sy = 17 + by; P(sx, sy, 5, 7, TR); P(sx, sy, 5, 1, TRh); P(sx + 1, sy + 1, 3, 5, c1); P(sx + 2, sy + 2, 1, 3, GOLD); }
    // ---- shoulder mantle ----
    const MY = 14 + by - br;
    [[11, H1], [12, C], [13, D1]].forEach(([w, col], r) => { const x0 = Math.round(X(12 - w / 2)); P(x0, MY + r, w, 1, col); P(x0, MY + r, 1, 1, back ? D1 : H2); P(x0 + w - 2, MY + r, 2, 1, D2); });
    { const x0 = Math.round(X(12 - 13 / 2)); for (let k = 0; k < 13; k++) P(x0 + k, MY + 3, 1, 1, k % 3 === 1 ? TR : D2); P(x0 + 1, MY + 4, 1, 1, D2); P(x0 + 11, MY + 4, 1, 1, D2); }
    // role details on the mantle
    if (L.role === 'tank' || L.role === 'hybrid') { for (const sx of [X(5), X(16)]) { P(sx, MY - 1, 4, 3, TR); P(sx, MY - 1, 4, 1, TRh); P(sx + 1, MY, 1, 1, GOLD); } }
    if (L.role === 'assassin') { P(X(8), MY, 8, 2, TR); P(X(8), MY, 8, 1, TRh); const t = anim === 'walk' ? (f % 3) : 0; P(X(5) - t, MY + 1, 3, 2, TR); P(X(4) - t, MY + 3, 2, 3 + (t ? 1 : 0), U.shade(TR, -0.2)); }
    if (L.role === 'ranged') { P.line(X(7), MY + 2, X(15), R0 + 9, TR); if (back) { P(X(13), 10 + by, 3, 9, '#5a3a22'); P(X(13), 9 + by, 1, 2, '#e8e4d8'); P(X(15), 9 + by, 1, 2, '#e8e4d8'); } }
    if (L.role === 'caster' || L.role === 'summoner') { if (!back) { P(X(11), R0 + 2, 2, 2, pal[2]); P(X(11), R0 + 2, 1, 1, pal[0]); } }
    if (L.role === 'healer' && !back) { P(X(11), R0 + 1, 2, 4, '#ffffff'); P(X(10), R0 + 2, 4, 2, '#ffffff'); P(X(11), R0 + 2, 2, 2, TR); }
    if (L.role === 'melee' && !back) { P(X(10), R0 + 2, 4, 3, D2); P(X(11), R0 + 3, 2, 1, TR); }
    sigDraw(P, 'body', g);
    // ---- hood ----
    const hy = 3 + by - (br ? 0 : 0);
    const HW = [4, 6, 8, 10, 11, 12, 12, 12, 12, 12, 11, 10, 9];
    HW.forEach((w, r) => {
      const y = hy + r; const tilt = r < 3 ? (back ? 1 : -1) * (3 - r) * 0.6 : 0; const x0 = Math.round(X(12 - w / 2 + tilt)), x1 = x0 + w;
      P(x0, y, w, 1, C);
      if (back) { P(x0, y, 1, 1, H1); if (r < 4) P(x0 + 1, y, 2, 1, H1); P(x1 - 2, y, 2, 1, D2); }
      else { P(x0, y, 1, 1, H1); if (r >= 1 && r <= 4) P(x0 + 1, y, r < 3 ? 2 : 1, 1, H2); P(x1 - 3, y, 1, 1, D1); P(x1 - 2, y, 2, 1, D2); if (r >= 6) P(x0 + 1, y, 1, 1, D1); }
      if (r >= 10) { P(x0, y, w, 1, D1); P(x0, y, 1, 1, C); }
    });
    // peak curling back
    if (back) { P(X(15), hy - 1, 2, 1, C); P(X(16), hy - 2, 2, 1, D1); P(X(17), hy - 2, 1, 1, D2); }
    else { P(X(7), hy - 1, 2, 1, C); P(X(6), hy - 2, 2, 1, H1); P(X(5), hy - 2, 1, 1, D1); P(X(5), hy - 1, 1, 1, D2); }
    if (!back) {
      // lining rim + void face
      const FO = [[4, 6], [5, 8], [6, 8], [7, 8], [8, 8], [9, 6]];
      for (const [r, w] of FO) { const x0 = Math.round(X(12 - w / 2)); P(x0 - 1, hy + r, 1, 1, D2); P(x0 + w, hy + r, 1, 1, D3); P(x0, hy + r, w, 1, r === 9 ? VOID2 : VOID); }
      P(X(9), hy + 3, 6, 1, D3); P(X(10), hy + 3, 4, 1, D2);
      if (L.mask) { P(X(9), hy + 5, 6, 2, L.mask); P(X(9), hy + 5, 6, 1, U.shade(L.mask, 0.25)); }
      // eyes (class signature faces override)
      g.eyes = eyes; g.ec = eyes === 'white' ? '#ffffff' : eyes === 'bright' ? U.shade(ec0, 0.25) : ec0;
      const ey = hy + 6; if (!sigFace(P, g)) { const ec = eyes === 'white' ? '#ffffff' : eyes === 'bright' ? U.shade(ec0, 0.25) : ec0; const core = U.shade(ec, 0.6), glow = U.shade(ec, -0.5);
      if (eyes === 'blink') { P(X(9), ey + 1, 2, 1, U.shade(ec, -0.15)); P(X(13), ey + 1, 2, 1, U.shade(ec, -0.15)); }
      else {
        P(X(8), ey, 1, 2, glow); P(X(15), ey, 1, 2, glow); P(X(9), ey + 2, 2, 1, glow); P(X(13), ey + 2, 2, 1, glow);
        P(X(9), ey, 2, 2, ec); P(X(13), ey, 2, 2, ec); P(X(9), ey, 1, 1, core); P(X(13), ey, 1, 1, core);
        if (eyes === 'bright') { P(X(9), ey - 1, 2, 1, glow); P(X(13), ey - 1, 2, 1, glow); P(X(10), ey, 1, 1, '#ffffff'); P(X(14), ey, 1, 1, '#ffffff'); }
      } }
    } else { P(X(11), hy + 2, 2, 9, D1); P(X(11), hy + 2, 1, 9, D2); }
    // neck clasp (front)
    if (!back) { P(X(10), MY, 4, 1, GOLDd); P(X(11), MY, 2, 1, GOLD); P(X(11), MY, 1, 1, pal[1]); }
    sigDraw(P, 'head', g);
    // ---- front arm (right) + weapon ----
    let wp = 'rest', hx = X(17), hyp = 23 + by;
    if (armF === 'raise' || armF === 'up') { sleeve(X(16), 11 + by, 6, C, 11 + by); P(X(16), 9 + by, 2, 2, GLV); P(X(16), 9 + by, 1, 1, GLVh); wp = 'up'; hx = X(17); hyp = 10 + by; }
    else if (armF === 'half') { sleeve(X(16), 14 + by, 5, C, 14 + by); P(X(16), 12 + by, 2, 2, GLV); wp = 'up'; hx = X(17); hyp = 13 + by; }
    else if (armF === 'swing') { P(X(16), 16 + by, 2, 2, C); P(X(17), 15 + by, 2, 2, H1); P(X(19), 14 + by, 1, 2, TR); P(X(20), 13 + by, 2, 2, GLV); wp = 'strike'; hx = X(21); hyp = 14 + by; }
    else if (armF === 'extend') { P(X(15), 19 + by, 5, 2, C); P(X(15), 19 + by, 5, 1, H1); P(X(20), 19 + by, 1, 2, TR); P(X(21), 19 + by, 2, 2, GLV); P(X(21), 19 + by, 1, 1, GLVh); wp = 'strike'; hx = X(22); hyp = 20 + by; }
    else { sleeve(X(16), 17 + by, 5, D1, 21 + by); P(X(16), 22 + by, 2, 2, GLV); P(X(16), 22 + by, 1, 1, GLVh); }
    // fashion headwear
    if (L.hat !== undefined) { const a = L.hatC, b2 = L.hatC2, y = hy + 1;
      if (L.hat === 0) { P(X(5), y + 1, 14, 2, a); P(X(5), y + 1, 14, 1, U.shade(a, 0.25)); P(X(8), y - 3, 8, 4, a); P(X(8), y, 8, 1, b2); }
      else if (L.hat === 1) { P(X(8), y - 4, 8, 5, a); P(X(8), y - 4, 2, 5, U.shade(a, 0.25)); P(X(7), y + 1, 10, 1, b2); P(X(11), y - 6, 2, 2, b2); }
      else if (L.hat === 2) { P(X(5), y - 3, 2, 4, b2); P(X(17), y - 3, 2, 4, b2); P(X(4), y - 5, 2, 2, b2); P(X(18), y - 5, 2, 2, b2); }
      else { P(X(14), y, 4, 2, b2); P(X(16), y + 2, 2, 5, b2); } }
    if (L.crown) { P(X(9), hy - 2, 6, 2, L.crown); P(X(9), hy - 3, 1, 1, L.crown); P(X(11), hy - 4, 2, 2, L.crown); P(X(14), hy - 3, 1, 1, L.crown); P(X(11), hy - 2, 2, 1, '#ffffff'); }
    drawWeapon(P, L, view, wp, hx, hyp);
    sigDraw(P, 'float', g);
    // cast sparkles
    if (spark) { const S = [[[4, 8], [20, 6]], [[3, 5], [21, 9], [12, 0]], [[5, 3], [19, 4], [2, 11], [22, 12]]][Math.min(2, spark - 1)]; for (const [sx, sy] of S) { P(sx, sy + by, 1, 1, '#ffffff'); P(sx - 1, sy + by, 1, 1, pal[1]); P(sx + 1, sy + by, 1, 1, pal[1]); P(sx, sy + by - 1, 1, 1, pal[1]); P(sx, sy + by + 1, 1, 1, pal[1]); } }
  }
  const ANIMS = [['idle', 2], ['walk', 4], ['attack', 3], ['cast', 2], ['hurt', 1], ['dead', 1]];
  SPR.ANIMS = ANIMS;
  const FW = 24, FH = 32;
  SPR.FW = FW; SPR.FH = FH;
  const cache = new Map();
  const ANIMS2 = [['idle', 4], ['walk', 6], ['attack', 4], ['cast', 4], ['hurt', 2], ['dead', 1]];
  SPR.ANIMS2 = ANIMS2;
  SPR.charSheet = (L) => {
    if (cache.has(L.key)) return cache.get(L.key);
    const AN = L.seeker ? ANIMS2 : ANIMS; const nmap = {}; AN.forEach(([a, n]) => nmap[a] = n);
    const [sheet, sx] = mk(FW * (L.seeker ? 6 : 4), FH * 12);
    let row = 0; const idx = {};
    for (const view of ['front', 'back']) {
      for (const [anim, n] of AN) {
        idx[view + anim] = row;
        for (let f = 0; f < n; f++) {
          const [fc, fx] = mk(FW, FH); const P = painter(fx, 0, 0);
          if (anim === 'dead') { const [tc, tx] = mk(FW, FH); (L.seeker ? drawSeeker : drawChar)(painter(tx, 0, 0), L, view, 'idle', 0); fx.save(); fx.translate(FW / 2, FH - 4); fx.rotate(Math.PI / 2); fx.drawImage(tc, -FW / 2 - 4, -FH + 6); fx.restore(); }
          else (L.seeker ? drawSeeker : drawChar)(P, L, view, anim, f);
          outline(fc); sx.drawImage(fc, f * FW, row * FH);
        }
        row++;
      }
    }
    const res = { sheet, idx, fw: FW, fh: FH, kind: 'char', n: nmap };
    cache.set(L.key, res); return res;
  };

  // ---------- monsters ----------
  const MON = {
    slime: [20, 16, (P, c, c2, f) => { const s = f === 1 ? 1 : 0, a = f === 2 ? 2 : 0; P.ell(10, 10 + s, 8 + a, 5 - s, c); P.ell(10, 8 + s, 6, 3, U.shade(c, 0.25)); P(6, 6 + s, 2, 2, '#ffffff'); P(7, 9 + s, 1, 2, '#120e18'); P(12, 9 + s, 1, 2, '#120e18'); P(9, 12 + s, 3, 1, c2); }],
    beast: [28, 20, (P, c, c2, f) => { const s = f % 2, a = f === 2 ? 3 : 0; P.ell(13, 11, 8, 5, c); P.ell(13, 9, 7, 3, U.shade(c, 0.2)); P.ell(22 + a, 8, 4, 4, c); P(24 + a, 7, 1, 1, '#120e18'); P(25 + a, 10, 3, 1, '#ffffff'); P(20 + a, 3, 2, 3, c2); P(23 + a, 3, 2, 3, c2);
      P(7, 15, 2, 4 - s, c2); P(11, 15, 2, 4 - (1 - s), c2); P(16, 15, 2, 4 - s, c2); P(19, 15, 2, 4 - (1 - s), c2); P.line(5, 9, 1, 6 + s, c2); }],
    golem: [30, 32, (P, c, c2, f) => { const s = f % 2, a = f === 2 ? 3 : 0; P(8, 10, 14, 13, c); P(8, 10, 14, 2, U.shade(c, 0.25)); P(10, 3, 10, 8, c); P(12, 6, 2, 2, '#ffd84a'); P(16, 6, 2, 2, '#ffd84a'); P(3, 11 - a, 5, 12, c2); P(22, 11 - a, 5, 12, c2);
      P(2, 22 - a, 6, 4, c); P(22, 22 - a, 6, 4, c); P(10, 23, 4, 7 - s, c2); P(16, 23, 4, 6 + s, c2); P(12, 14, 6, 3, U.shade(c, -0.3)); }],
    bat: [24, 18, (P, c, c2, f) => { const w = f % 2 ? -3 : 2, a = f === 2 ? 2 : 0; P.ell(12, 9 + a, 4, 4, c); P(10, 8 + a, 1, 1, '#ff4a4a'); P(13, 8 + a, 1, 1, '#ff4a4a'); P.line(8, 8 + a, 1, 4 + w, c2, 1); P.line(8, 9 + a, 2, 11 + w, c2); P.line(1, 4 + w, 2, 11 + w, c2);
      P.line(16, 8 + a, 23, 4 + w, c2); P.line(16, 9 + a, 22, 11 + w, c2); P.line(23, 4 + w, 22, 11 + w, c2); P(10, 4 + a, 1, 2, c); P(13, 4 + a, 1, 2, c); }],
    plant: [24, 30, (P, c, c2, f) => { const s = f % 2, a = f === 2 ? 2 : 0; P(10, 12, 5, 16, '#6a4a2a'); P(9, 26, 7, 3, '#5a3a1a'); P.ell(12, 9 - a, 9, 7, c); P.ell(10, 7 - a, 5, 3, U.shade(c, 0.25)); P(9, 9, 2, 2, '#ffe04a'); P(14, 9, 2, 2, '#ffe04a');
      P.line(10, 16, 2, 13 - s * 2 - a, '#6a4a2a'); P.line(15, 16, 22, 13 - (1 - s) * 2 - a, '#6a4a2a'); P(2, 11 - a, 3, 3, c2); P(20, 11 - a, 3, 3, c2); }],
    imp: [20, 26, (P, c, c2, f) => { const s = f % 2, a = f === 2 ? 2 : 0; P.ell(10, 9, 5, 5, c); P(6, 3, 2, 4, c2); P(13, 3, 2, 4, c2); P(8, 8, 1, 2, '#ffe04a'); P(12, 8, 1, 2, '#ffe04a'); P(8, 11, 5, 1, '#120e18');
      P(7, 14, 7, 6, c); P(5 - a, 14, 2, 5, c); P(14 + a, 13 - a, 2, 5, c); P(8, 20, 2, 5 - s, c2); P(12, 20, 2, 4 + s, c2); P.line(14, 19, 18, 22 - s, c2); P(1, 13 - s, 3, 3, U.shade(c, 0.3)); }],
    elemental: [22, 28, (P, c, c2, f) => { const s = f % 2, a = f === 2 ? 3 : 0; P.ell(11, 10 - s, 6 + a, 6 + a, c); P.ell(11, 9 - s, 4, 4, U.shade(c, 0.4)); P(9, 9 - s, 1, 2, '#ffffff'); P(13, 9 - s, 1, 2, '#ffffff');
      P.ell(11, 19 - s, 3, 3, c2); P.ell(11, 24 - s, 2, 2, U.shade(c2, -0.2)); P(3, 6 + s, 2, 2, c); P(18, 13 - s, 2, 2, c); P(4, 16, 1, 1, U.shade(c, 0.4)); }],
    dragon: [46, 36, (P, c, c2, f) => { const s = f % 2, a = f === 2 ? 3 : 0; const w = s ? -4 : 0; P.ell(20, 20, 11, 7, c); P.ell(20, 17, 9, 3, U.shade(c, 0.2)); P.ell(35 + a, 11 - a, 5, 4, c); P(38 + a, 10 - a, 2, 1, '#ffe04a'); P(37 + a, 14 - a, 6, 1, '#ffffff');
      P.line(30, 16, 34 + a, 13 - a, c, 1); P.line(30, 18, 34 + a, 14 - a, c); P(33 + a, 5 - a, 2, 4, c2); P(37 + a, 5 - a, 2, 4, c2);
      P.line(14, 14, 6, 2 + w, c2); P.line(6, 2 + w, 2, 12 + w, c2); P.line(2, 12 + w, 14, 15, c2); P.line(22, 13, 18, 1 + w, c2); P.line(18, 1 + w, 26, 12, c2);
      for (let i = 0; i < 8; i++) P(4 + i, 9 + w + i % 3, 1, 1, U.shade(c2, 0.2)); P.line(9, 22, 1, 27 - s, c); P(12, 26, 3, 6, c2); P(25, 26, 3, 6, c2); P(17, 26, 3, 5, U.shade(c2, -0.2)); }]
  };
  SPR.monSheet = (body, c, c2) => {
    const key = 'm|' + body + c + c2; if (cache.has(key)) return cache.get(key);
    if (body === 'skeleton' || body === 'knight') {
      const L = SPR.lookFor(body === 'skeleton' ? 'necromancer' : 'guardian', null, { mob: body === 'skeleton' ? { bones: true, eyes: c, c1: '#d8d0c0', c2: c, weapon: 'sword', helm: false } : { c1: c, c2: c2, weapon: 'sword', helm: true, skin: '#2a2a34' } });
      L.key = key + 'c'; const r = SPR.charSheet(L); cache.set(key, r); return r;
    }
    const [w, h, fn] = MON[body] || MON.slime;
    const [sheet, sx] = mk(w * 4, h);
    for (let f = 0; f < 4; f++) {
      const [fc, fx] = mk(w, h); const P = painter(fx, 0, 0);
      fn(P, c, c2, Math.min(f, 2));
      if (f === 3) { fx.globalCompositeOperation = 'source-atop'; fx.fillStyle = 'rgba(255,255,255,0.65)'; fx.fillRect(0, 0, w, h); }
      outline(fc); sx.drawImage(fc, f * w, 0);
    }
    const res = { sheet, fw: w, fh: h, kind: 'mon' }; cache.set(key, res); return res;
  };

  // pets (small)
  SPR.petSprite = (body, c) => {
    const key = 'pet|' + body + c; if (cache.has(key)) return cache.get(key);
    const full = SPR.monSheet(body, c, U.shade(c, -0.35));
    const sc = 0.55; const w = Math.round(full.fw * sc), h = Math.round(full.fh * sc);
    const [cv, x] = mk(w * 2, h);
    x.drawImage(full.sheet, 0, 0, full.fw * 2, full.fh, 0, 0, w * 2, h);
    crisp(cv); const r = { sheet: cv, fw: w, fh: h }; cache.set(key, r); return r;
  };

  // ---------- props ----------
  function prop(kind, theme) {
    const key = 'p|' + kind + '|' + (theme || ''); if (cache.has(key)) return cache.get(key);
    let w = 24, h = 32; const R = U.seeded(U.hash(key));
    const sizes = { tree: [26, 34], pine: [22, 36], deadtree: [24, 30], flower: [10, 8], rock: [16, 12], bush: [16, 12], cactus: [14, 22], bones: [14, 8], pillar: [12, 30], mushroom: [12, 12], icespike: [16, 22], crystal: [14, 22], lavarock: [18, 14], coral: [16, 18], cloud: [26, 14], house: [72, 70], stall: [36, 34], fountain: [40, 30], lamp: [8, 26], banner: [12, 30], crate: [16, 16], dummy: [16, 26], portal: [30, 40], tower: [30, 54], throne: [24, 28], flagpole: [14, 34], hill: [20, 10], chest: [14, 12] };
    if (sizes[kind]) [w, h] = sizes[kind];
    const [cv, x] = mk(w, h); const P = painter(x, 0, 0);
    const T = theme || {};
    const g1 = T.acc || '#3e7a32';
    switch (kind) {
      case 'tree': P(11, 22, 4, 11, '#6a4a2a'); P(11, 22, 1, 11, '#8a6a4a'); P.ell(13, 14, 11, 9, g1); P.ell(11, 11, 8, 6, U.shade(g1, 0.2)); P.ell(9, 8, 4, 3, U.shade(g1, 0.4)); break;
      case 'pine': P(10, 28, 3, 8, '#5a3a2a'); for (let i = 0; i < 4; i++) { const yy = 4 + i * 6, ww = 3 + i * 2.5; P.ell(11, yy + 3, Math.round(ww), 3, i % 2 ? U.shade(g1, -0.1) : g1); } P(10, 1, 3, 3, U.shade(g1, 0.3)); break;
      case 'deadtree': P(11, 12, 3, 18, '#4a3a32'); P.line(12, 14, 4, 5, '#4a3a32'); P.line(12, 16, 21, 6, '#4a3a32'); P.line(6, 8, 3, 2, '#4a3a32'); P.line(19, 8, 22, 3, '#4a3a32'); break;
      case 'flower': { const fc = U.pick(['#ff7ab0', '#ffe04a', '#ffffff', '#b06cff']); P(2, 4, 1, 4, '#3a7a2a'); P(7, 3, 1, 5, '#3a7a2a'); P(1, 2, 3, 3, fc); P(6, 1, 3, 3, fc); P(2, 3, 1, 1, '#ffe04a'); break; }
      case 'rock': P.ell(8, 7, 7, 4, '#7a7a84'); P.ell(7, 5, 5, 2, '#9a9aa4'); P(4, 4, 2, 1, '#c8c8d0'); break;
      case 'bush': P.ell(8, 7, 7, 4, U.shade(g1, -0.1)); P.ell(7, 5, 5, 3, g1); P(5, 4, 2, 1, U.shade(g1, 0.35)); break;
      case 'cactus': P(5, 4, 4, 18, '#3a8a3a'); P(5, 4, 1, 18, '#5aaa4a'); P(1, 9, 3, 2, '#3a8a3a'); P(1, 5, 2, 5, '#3a8a3a'); P(10, 11, 3, 2, '#3a8a3a'); P(11, 7, 2, 5, '#3a8a3a'); break;
      case 'bones': P(1, 4, 10, 2, '#e8e0d0'); P(0, 3, 2, 4, '#e8e0d0'); P(10, 3, 2, 4, '#e8e0d0'); P(5, 1, 4, 3, '#f0ead8'); P(6, 2, 1, 1, '#120e18'); break;
      case 'pillar': P(2, 2, 8, 3, '#b8b0a0'); P(3, 5, 6, 22, '#a8a090'); P(3, 5, 1, 22, '#c8c0b0'); P(2, 26, 8, 3, '#988f80'); if (R() < 0.5) { x.clearRect(0, 0, 12, 9); P(3, 8, 3, 2, '#a8a090'); } break;
      case 'mushroom': P(5, 6, 3, 6, '#f0e0c8'); P.ell(6, 5, 5, 3, '#d8303a'); P(4, 3, 1, 1, '#ffffff'); P(8, 4, 1, 1, '#ffffff'); break;
      case 'icespike': P.line(8, 1, 3, 21, '#bff4ff'); P.line(8, 1, 13, 21, '#5cc8ff'); for (let y = 2; y < 21; y++) { const hw = Math.floor(y / 4); P(8 - hw, y, hw * 2 + 1, 1, y < 10 ? '#e8fbff' : '#9ad8f0'); } break;
      case 'crystal': { const cc = T.crystal || '#b06cff'; for (let y = 0; y < 20; y++) { const hw = y < 6 ? Math.floor(y / 1.5) : Math.max(1, 4 - Math.floor((y - 6) / 4)); P(7 - hw, y + 1, hw * 2 + 1, 1, y < 8 ? U.shade(cc, 0.4) : cc); } P(6, 3, 1, 4, '#ffffff'); break; }
      case 'lavarock': P.ell(9, 8, 8, 5, '#2a1a1a'); P.ell(8, 6, 6, 3, '#3a2622'); P.line(4, 8, 9, 6, '#ff6a2a'); P.line(9, 6, 14, 9, '#ffb347'); break;
      case 'coral': P.line(8, 17, 8, 4, '#ff7a8a'); P.line(8, 10, 3, 4, '#ff7a8a'); P.line(8, 12, 13, 6, '#ff9aa8'); P(2, 3, 2, 2, '#ffb0c0'); P(12, 5, 2, 2, '#ffb0c0'); break;
      case 'cloud': P.ell(13, 9, 12, 4, '#ffffff'); P.ell(9, 6, 6, 4, '#ffffff'); P.ell(17, 6, 5, 3, '#f0f8ff'); P(4, 11, 18, 1, '#d8e8f8'); break;
      case 'house': {
        const wall = T.wall || '#d8c8a8', roof = T.roof || '#a8403a';
        P(6, 34, 60, 34, wall); P(6, 34, 2, 34, U.shade(wall, 0.15)); P(64, 34, 2, 34, U.shade(wall, -0.2)); P(6, 66, 60, 2, U.shade(wall, -0.3));
        for (let r = 0; r < 30; r++) { const hw = 14 + r; P(36 - hw, 6 + r, hw * 2, 1, r % 5 === 4 ? U.shade(roof, -0.25) : r < 3 ? U.shade(roof, 0.25) : roof); }
        P(2, 35, 68, 2, U.shade(roof, -0.4)); P(50, 2, 6, 12, '#7a5a4a'); P(49, 1, 8, 2, '#5a3a2a');
        P(31, 50, 10, 18, '#5a3a2a'); P(32, 51, 8, 16, '#6a4a32'); P(38, 59, 1, 2, '#ffd84a');
        for (const wx of [13, 49]) { P(wx, 43, 10, 9, '#3a2a22'); P(wx + 1, 44, 8, 7, '#ffe08a'); P(wx + 5, 44, 1, 7, '#3a2a22'); P(wx + 1, 47, 8, 1, '#3a2a22'); }
        break; }
      case 'stall': { const cc = T.c || '#e04a4a'; P(4, 14, 28, 14, '#a07a4a'); P(4, 14, 28, 2, '#c09a6a'); P(5, 28, 2, 6, '#6a4a2a'); P(29, 28, 2, 6, '#6a4a2a');
        for (let i = 0; i < 7; i++) P(2 + i * 5, 4, 5, 9, i % 2 ? '#f0ead8' : cc); P(2, 3, 34, 1, '#120e18'); P(8, 18, 4, 4, T.item || '#ffd84a'); P(18, 18, 5, 4, '#4aa3ff'); break; }
      case 'fountain': P.ell(20, 22, 18, 7, '#9a9aa4'); P.ell(20, 21, 15, 5, '#4a9ad8'); P.ell(20, 20, 10, 3, '#7ac8f0'); P(18, 6, 4, 14, '#b8b8c0'); P.ell(20, 6, 6, 2, '#b8b8c0'); P(19, 1, 2, 5, '#bff4ff'); break;
      case 'lamp': P(3, 6, 2, 20, '#3a3a40'); P(1, 2, 6, 5, '#3a3a40'); P(2, 3, 4, 3, '#ffe08a'); break;
      case 'banner': { const cc = T.c || '#b0303a'; P(1, 0, 2, 30, '#5a4a3a'); P(3, 2, 8, 16, cc); P(3, 18, 4, 3, cc); P(7, 18, 4, 2, cc); P(5, 6, 4, 4, T.c2 || '#ffd84a'); break; }
      case 'crate': P(1, 3, 14, 12, '#a0703a'); P(1, 3, 14, 2, '#c0905a'); P.line(2, 5, 14, 14, '#7a5028'); P.line(14, 5, 2, 14, '#7a5028'); break;
      case 'chest': P(1, 3, 12, 8, '#a0703a'); P(1, 3, 12, 3, '#c0905a'); P(6, 5, 2, 3, '#ffd84a'); P(0, 6, 14, 1, '#ffd84a'); break;
      case 'dummy': P(7, 10, 2, 15, '#6a4a2a'); P(3, 12, 10, 2, '#6a4a2a'); P.ell(8, 14, 4, 5, '#d8b878'); P.ell(8, 6, 3, 3, '#d8b878'); P(7, 13, 2, 2, '#c03a3a'); break;
      case 'portal': { const cc = T.c || '#7a5aff'; P.ell(15, 22, 12, 17, '#3a3a50'); P.ell(15, 22, 10, 15, cc); P.ell(15, 22, 6, 11, U.shade(cc, 0.4)); P.ell(15, 22, 3, 6, '#ffffff'); P(2, 36, 26, 4, '#5a5a6a'); break; }
      case 'tower': { const wc = T.c || '#8a8a96'; P(5, 12, 20, 40, wc); P(5, 12, 3, 40, U.shade(wc, 0.2)); P(22, 12, 3, 40, U.shade(wc, -0.3)); for (let i = 0; i < 5; i++) P(3 + i * 5, 6, 3, 6, wc); P(3, 10, 24, 3, U.shade(wc, -0.1)); P(13, 24, 4, 7, '#120e18'); P(13, 25, 4, 5, T.glow || '#ffb347'); P(12, 0, 2, 7, '#5a4a3a'); P(14, 0, 6, 4, T.flag || '#c03a3a'); break; }
      case 'throne': P(4, 2, 16, 18, '#7a2a3a'); P(4, 2, 16, 2, '#ffd84a'); P(2, 14, 20, 8, '#5a4a3a'); P(2, 20, 20, 6, '#ffd84a'); P(10, 6, 4, 4, '#ffd84a'); break;
      case 'flagpole': P(6, 2, 2, 32, '#5a4a3a'); P(8, 3, 6, 9, T.c || '#ffffff'); P(5, 0, 4, 2, '#ffd84a'); break;
      case 'hill': P.ell(10, 6, 9, 4, '#e8d08a'); break;
    }
    if (kind !== 'house') crisp(cv);
    outline(cv);
    const res = { img: cv, w, h }; cache.set(key, res); return res;
  }
  SPR.prop = prop;

  // top-down wall block: top face (TS x TS) + front face (TS x h)
  SPR.wallBlock = (c, h = 16, key = '') => {
    const TS = G.TS; const k = 'wb|' + c + h + key; if (cache.has(k)) return cache.get(k);
    const [cv, x] = mk(TS, TS + h);
    x.fillStyle = U.shade(c, 0.08); x.fillRect(0, 0, TS, TS);
    x.fillStyle = U.shade(c, 0.28); x.fillRect(0, 0, TS, 2); x.fillStyle = U.shade(c, -0.12); x.fillRect(0, TS - 2, TS, 2);
    for (let i = 0; i < 4; i++) { x.fillStyle = U.shade(c, 0.18); x.fillRect(3 + i * 5, 5 + (i % 2) * 7, 3, 2); }
    x.fillStyle = U.shade(c, -0.3); x.fillRect(0, TS, TS, h);
    x.fillStyle = U.shade(c, -0.45); for (let r = 0; r < h; r += 6) { x.fillRect(0, TS + r, TS, 1); const off = (r / 6) % 2 ? 6 : 0; for (let q = off; q < TS; q += 12) x.fillRect(q, TS + r, 1, 6); }
    x.fillStyle = U.shade(c, -0.6); x.fillRect(0, TS + h - 2, TS, 2);
    const r = { img: cv, w: TS, h: TS + h }; cache.set(k, r); return r;
  };

  // ---------- tiles (square, straight top-down) ----------
  SPR.tile = (type, c1, c2, variant) => {
    const TS = G.TS; const k = 't|' + type + c1 + c2 + variant; if (cache.has(k)) return cache.get(k);
    const [cv, x] = mk(TS, TS); const R = U.seeded(U.hash(k));
    let base = c1;
    if (type === 'water') base = '#2a6aa8'; if (type === 'lava') base = '#c8401a'; if (type === 'void') base = '#0a0814'; if (type === 'path') base = U.shade(c1, 0.14); if (type === 'ice') base = '#bfe6f6'; if (type === 'plaza') base = '#9a9088'; if (type === 'bush') base = U.shade(c1, -0.25);
    x.fillStyle = variant % 2 ? base : U.shade(base, -0.035); x.fillRect(0, 0, TS, TS);
    const dot = (c, n, w = 1, h = 1) => { x.fillStyle = c; for (let i = 0; i < n; i++) x.fillRect(Math.floor(R() * TS), Math.floor(R() * TS), w, h); };
    if (type === 'grass') { dot(U.shade(base, 0.16), 10); dot(U.shade(base, -0.18), 8); for (let i = 0; i < 4; i++) { const px = Math.floor(R() * (TS - 2)), py = Math.floor(R() * (TS - 3)); x.fillStyle = U.shade(base, 0.25); x.fillRect(px, py, 1, 2); x.fillRect(px + 2, py + 1, 1, 2); } if (c2) dot(c2, 3); }
    else if (type === 'water') { dot('#3a82c0', 10); x.fillStyle = '#8ac8f0'; const o = variant * 3 % TS; x.fillRect((o + 3) % (TS - 6), 6, 6, 1); x.fillRect((o + 12) % (TS - 5), 15, 5, 1); }
    else if (type === 'lava') { dot('#ff8a2a', 14, 2, 1); dot('#ffe08a', 5); x.fillStyle = '#8a2010'; x.fillRect(0, (variant * 5) % TS, TS, 1); }
    else if (type === 'void') { if (variant % 2) dot('#ffffff', 1); dot('#3a2a6a', 2); }
    else if (type === 'path' || type === 'plaza') { x.fillStyle = U.shade(base, -0.2); x.fillRect(0, TS - 1, TS, 1); x.fillRect(0, 11, TS, 1); x.fillRect(variant % 2 ? 7 : 15, 0, 1, 11); x.fillRect(variant % 2 ? 17 : 4, 12, 1, 11); dot(U.shade(base, 0.18), 6); dot(U.shade(base, -0.12), 6); }
    else if (type === 'ice') { dot('#ffffff', 8); x.fillStyle = '#e8fbff'; x.fillRect(4, 9, 10, 1); x.fillRect(12, 17, 7, 1); }
    else if (type === 'bush') { for (let i = 0; i < 6; i++) { x.fillStyle = i % 2 ? U.shade(base, 0.25) : U.shade(base, -0.15); const px = Math.floor(R() * (TS - 6)), py = Math.floor(R() * (TS - 5)); x.fillRect(px, py, 6, 4); x.fillRect(px + 1, py - 1, 4, 1); } }
    const r = { img: cv }; cache.set(k, r); return r;
  };

  // sprite sheet preview canvas (scaled) for GM / downloads
  SPR.sheetPreview = (sh, scale = 3) => {
    const [cv, x] = mk(sh.sheet.width * scale, sh.sheet.height * scale);
    x.imageSmoothingEnabled = false; x.drawImage(sh.sheet, 0, 0, cv.width, cv.height); return cv;
  };
})(window.G);
