'use strict';
/* Hero sprites v3 (artist sheets, assets/heroes/<class>.webp): every class has idle / walk A-B / attack frames for
   front, side and back. The side view uses the LEFT frames and is mirrored when facing right. Heroes are drawn on the
   crisp overlay (like the town NPCs) at the same height as an NPC (34 world px for the idle-front pose), pre-scaled
   once per zoom with high-quality filtering so they stay sharp. Walk = A → stand → B → stand. Attack/cast uses the
   attack-left / attack-right frame by facing. While a sheet is still loading the previous chibi sprite is used. */
(function (G) {
  const E = G.E, W = G.W, SPR = G.SPR, UI = G.UI, MAN = G.HERO_MAN; if (!E || !MAN) return;
  const HT = 34; // NPC height in world px
  const base = (() => { const s = [...document.scripts].find(x => /js\/herosprites\.js/.test(x.src)); return s ? s.src.replace(/js\/herosprites\.js.*$/, '') : ''; })();
  const IMG = {}; const img = cls => { if (!MAN[cls]) return null; if (IMG[cls]) return IMG[cls]; const im = new Image(); im.decoding = 'async'; im.src = base + 'assets/heroes/' + cls + '.webp'; IMG[cls] = im; return im; };
  const ready = cls => { const im = img(cls); return !!(im && im.complete && im.naturalWidth); };
  const FI = {}; for (const c in MAN) { FI[c] = {}; MAN[c].f.forEach((f, i) => { FI[c][f.n] = f; }); }
  // pre-scaled frame cache (per class, frame, device scale)
  const C = new Map();
  const scaled = (cls, f, k) => { const key = cls + f.n + '@' + k; let c = C.get(key); if (c) return c; const im = img(cls); const kk = HT * k / MAN[cls].h0; const w = Math.max(1, Math.round(f.w * kk)), h = Math.max(1, Math.round(f.h * kk));
    // two-step downscale for clean edges
    let src = im, sx = f.x, sy = f.y, sw = f.w, sh = f.h; if (sw > w * 2.2) { const [t, tx] = SPR.mk(Math.round(f.w / 2), Math.round(f.h / 2)); tx.imageSmoothingEnabled = true; tx.imageSmoothingQuality = 'high'; tx.drawImage(im, f.x, f.y, f.w, f.h, 0, 0, t.width, t.height); src = t; sx = 0; sy = 0; sw = t.width; sh = t.height; }
    const [cv, x] = SPR.mk(w, h); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(src, sx, sy, sw, sh, 0, 0, w, h);
    c = { cv, w, h, ax: f.ax * kk, kk }; C.set(key, c); if (C.size > 900) C.delete(C.keys().next().value); return c; };
  const clsOf = u => u.cls || (u.look && u.look.cls);
  const isHero = u => !!u && !u.propSpr && (u.kind === 'hero' || u.mirror || (u.kind === 'npc' && u.look && (u.sim || u.wanderBot))) && MAN[clsOf(u)] && !(u.look && (u.look.mob || u.look.bones));
  // facing → view + flip (side frames face LEFT)
  const viewOf = u => { const fx = u.fx || 0, fy = u.fy || 0; if (Math.abs(fy) > Math.abs(fx) * 1.15) return fy < 0 ? 'back' : 'front'; return 'left'; };
  const frameOf = (u) => { const cls = clsOf(u), F = FI[cls]; const v = viewOf(u); const right = (u.fx || 0) > 0.05;
    if (u.dead) return { f: F.idle_front, flip: false, dead: true };
    if ((u.anim && (u.anim.at > 0 || u.anim.ct > 0)) || u._hsAtk > W.time) return { f: right ? F.atk_right : F.atk_left, flip: false };
    if (u.moving) { const ph = Math.floor(((u.anim && u.anim.t) || W.time) * 8) % 4; const ab = ph === 0 ? 'a' : ph === 2 ? 'b' : null; const f = ab ? F['walk_' + v + '_' + ab] : F['idle_' + v]; return { f, flip: v === 'left' && right }; }
    return { f: F['idle_' + v], flip: v === 'left' && right }; };
  // the base renderer draws an invisible frame of the right size (so shadows, name, HP bar, wings, auras line up)
  const BLANK = SPR.mk(96, 96)[0];
  const si0 = E.spriteInfo; E.spriteInfo = (u) => { if (!isHero(u) || !ready(clsOf(u))) return si0(u); const fr = frameOf(u); const k = HT / MAN[clsOf(u)].h0; u._hs = fr; u._hsF = W.frame || (W.frame = 0);
    return { img: BLANK, sx: 0, sy: 0, w: Math.min(96, Math.round(fr.f.w * k)), h: Math.min(96, Math.round(fr.f.h * k)), flip: fr.flip, sc: 1 }; };
  // ---- character layer: heroes + NPCs are drawn here, NOT on the overlay the bloom pass reads (no haze on them) ----
  const LC = document.createElement('canvas'); const LX = LC.getContext('2d'); E.cctx = LX;
  const rn0 = E.render; E.render = function () { const O = E.octx; if (O) { const cv = O.canvas; if (LC.width !== cv.width || LC.height !== cv.height) { LC.width = cv.width; LC.height = cv.height; } LX.setTransform(1, 0, 0, 1, 0, 0); LX.clearRect(0, 0, LC.width, LC.height); }
    const r = rn0.apply(this, arguments); if (O) { O.save(); O.setTransform(1, 0, 0, 1, 0, 0); O.globalAlpha = 1; O.globalCompositeOperation = 'destination-over'; O.drawImage(LC, 0, 0); O.restore(); } return r; };
  const FX = () => G.FASHFX; const HIDE = ['f_mcf', 'f_mcb', 'f_mch', 'f_wings', 'f_aura', 'f_float', 'f_back'];
  const d0 = E.drawUnit; E.drawUnit = (ctx, u) => { u._hs = null; const fa = u.fashion; let hid = null;
    if (fa && FX() && isHero(u) && ready(clsOf(u)) && !u.dead && HIDE.some(k => fa[k])) { hid = fa; const c = Object.assign({}, fa); for (const k of HIDE) delete c[k]; u.fashion = c; }
    let r; try { r = d0(ctx, u); } finally { if (hid) u.fashion = hid; } const fr = u._hs; if (!fr) return r;
    const O = E.cctx || E.octx, cam = W.cam; if (!O || !cam || !cam.w2s) return r; const S2 = G.S2 || 2; const k = Math.max(1, Math.round(S2 * 4) / 4); const cls = clsOf(u); const s = scaled(cls, fr.f, k);
    const [sx0, sy0] = cam.w2s(u.x, u.y); const lift = (u.mounted ? (u._mountLift != null ? u._mountLift : 10) : 0) + (u.jz || 0); const sc = S2 / k;
    let a = (u.stealth > 0 ? (u.team === 0 ? 0.4 : 0.15) : 1) * (u.alpha || 1); if (u.dead) a *= Math.max(0, 1 - Math.max(0, (u.deadT || 0) - 2)); if (a <= 0) return r;
    const breath = !u.moving && !u.dead && !(u.anim && u.anim.at > 0) ? 1 + 0.012 * Math.sin(W.time * 2.4 + (u.id || 0)) : 1;
    const dw = s.w * sc, dh = s.h * sc * breath; const X = Math.round(sx0 * S2), Y = Math.round((sy0 - lift + 2) * S2);
    O.save(); O.setTransform(1, 0, 0, 1, 0, 0); O.globalAlpha = a; O.globalCompositeOperation = 'source-over'; O.imageSmoothingEnabled = sc !== 1; O.translate(X, Y);
    if (fr.dead) { const t = Math.min(1, (u.deadT || 0) / 0.35); O.rotate(-1.4 * t); }
    if (fr.flip) O.scale(-1, 1);
    const view = fr.f.n.includes('back') ? 'back' : fr.f.n.includes('left') || fr.f.n.startsWith('atk') ? 'left' : 'front'; const flipR = fr.flip || fr.f.n === 'atk_right'; const H0 = HT * S2; const tt = W.time + (u.id || 0) * 0.3;
    if (hid) { O.save(); O.setTransform(1, 0, 0, 1, 0, 0); O.globalAlpha = a; try { if (G.FASHAURA) G.FASHAURA.draw('back', O, u, hid, X, Y, H0, tt); FX().behind(O, u, hid, X, Y, H0, view, flipR, tt); } catch (e) { } O.restore(); }
    const ax = s.ax * sc; if (hid && G.FASHAURA && G.FASHAURA.body && !fr.dead) { try { G.FASHAURA.body(O, u, hid, s.cv, ax, dw, dh, tt); } catch (e) { } O.globalAlpha = a; O.globalCompositeOperation = 'source-over'; } O.drawImage(s.cv, Math.round(-ax), Math.round(-dh), Math.round(dw), Math.round(dh));
    if ((u.flash > 0 || (u.cc && u.cc.fz > 0)) && !u.dead) { O.globalCompositeOperation = 'lighter'; O.globalAlpha = a * (u.cc && u.cc.fz > 0 ? 0.35 : 0.55); O.drawImage(s.cv, Math.round(-ax), Math.round(-dh), Math.round(dw), Math.round(dh)); }
    O.restore(); if (hid) { O.save(); O.setTransform(1, 0, 0, 1, 0, 0); O.globalAlpha = a; try { FX().front(O, u, hid, X, Y, H0, view, flipR, tt); if (G.FASHAURA) G.FASHAURA.draw('front', O, u, hid, X, Y, H0, tt); } catch (e) { } O.restore(); } return r; };
  // keep the attack pose visible for a moment after a basic attack / skill
  const ex0 = E.exec; if (ex0) E.exec = function (u, s) { if (u && isHero(u)) u._hsAtk = W.time + 0.32; return ex0.apply(this, arguments); };
  // portraits / class bodies from the new art (fallback to the old sprite until the sheet has loaded)
  const PC = new Map(); const crop = (cls, top) => { const key = cls + (top ? 'p' : 'b'); if (PC.has(key)) return PC.get(key); if (!ready(cls)) return null; const f = FI[cls].idle_front; const im = img(cls);
    try { const hh = top ? Math.round(f.w * 0.95) : f.h; const S = top ? 64 : 0; const [cv, x] = top ? SPR.mk(S, S) : SPR.mk(Math.round(f.w * 0.6), Math.round(f.h * 0.6)); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
      if (top) { const side = Math.min(f.w, Math.round(f.h * 0.55)); const cx = f.x + Math.max(0, Math.min(f.w - side, Math.round(f.ax - side / 2))); x.drawImage(im, cx, f.y, side, side, 0, 0, S, S); } else x.drawImage(im, f.x, f.y, f.w, f.h, 0, 0, cv.width, cv.height);
      const url = cv.toDataURL(); PC.set(key, url); return url; } catch (e) { PC.set(key, null); return null; } };
  const p0 = UI.portraitURL; UI.portraitURL = (cls, fashion) => crop(cls, true) || p0(cls, fashion);
  const b0 = UI.bodyURL; if (b0) UI.bodyURL = (cls, fashion) => crop(cls, false) || b0(cls, fashion);
  // warm the cache for every class so portraits are ready
  for (const c in MAN) img(c);
  G.HEROSPR = { ready, frameOf, isHero, scaled, FI, img, HT };
})(window.G);
