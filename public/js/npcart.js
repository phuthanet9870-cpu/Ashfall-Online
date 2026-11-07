'use strict';
/* Painted NPC art (assets/npc/npc.png): every service NPC in the game is drawn with a portrait sprite that fits its job
   (smith with hammer, tailor with scissors, stable keeper with pet …). Fake-player "sim" NPCs keep their hero sprites. */
(function (G) {
  const E = G.E, W = G.W, SPR = G.SPR, MAN = G.NPC_MAN; if (!MAN || !E) return;
  const base = (() => { const s = [...document.scripts].find(x => /js\/npcart\.js/.test(x.src)); return s ? s.src.replace(/js\/npcart\.js.*$/, '') : ''; })();
  const IMG = new Image(); IMG.decoding = 'async'; IMG.src = base + 'assets/npc/npc.png';
  const HT = 34; const C = {};
  // cached at the screen's real pixel density so the art stays sharp (drawn on the crisp overlay, not the low-res world canvas)
  const spr = (i, k) => { const key = i + '@' + k; if (C[key]) return C[key]; if (!(IMG.complete && IMG.naturalWidth)) return null; const r = MAN[i]; const h = Math.round(HT * k), w = Math.round(r[2] * HT * k / r[3]); const [cv, x] = SPR.mk(w, h);
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(IMG, r[0], r[1], r[2], r[3], 0, 0, w, h); return C[key] = { img: cv, w, h, ww: w / k, wh: HT }; };
  // 0 maid grocer · 1 blacksmith · 2 knight · 3 travelling merchant · 4 priestess · 5 archmage · 6 elder sage · 7 explorer · 8 lord
  // 9 legionnaire · 10 guild knight · 11 appraiser · 12 gift girl · 13 tailor · 14 ranger + pet · 15 dwarf smith · 16 banker · 17 balloon girl · 18 noble lady · 19 scholar
  const ROLE = { quest: 8, shop: 0, smith: 1, jeweler: 11, runesmith: 15, tailor: 13, market: 16, merc: 9, arena: 2, guild: 10, dungeon: 5, teleport: 7, codex: 19, stable: 14, trainer: 4, gacha: 12, event: 17, bank: 16, heal: 4 };
  const VROLE = { quest: 6, shop: 3, smith: 15, stable: 14 };
  const SPARE = [18, 12, 17, 4, 6];
  const artOf = (u) => { if (u._art != null) return u._art; let a; if (u.vk != null && VROLE[u.role] != null) a = VROLE[u.role]; else if (ROLE[u.role] != null) a = ROLE[u.role]; else { let h = 0; for (const ch of String(u.role || u.name || '')) h = (h * 31 + ch.charCodeAt(0)) | 0; a = SPARE[Math.abs(h) % SPARE.length]; } return u._art = a; };
  const isSvc = (u) => u.kind === 'npc' && !u.sim && !u.wanderBot && (u.role || u.roleTh);
  const d0 = E.drawUnit; E.drawUnit = (ctx, u) => {
    if (!isSvc(u)) return d0(ctx, u); const O = E.cctx || E.octx, cam = W.cam; const k = Math.max(1, Math.round((G.S2 || 2) * 4) / 4); const s = O && cam && cam.w2s ? spr(artOf(u), k) : null; if (!s) return d0(ctx, u);
    const [sx0, sy0] = cam.w2s(u.x, u.y); const sx = Math.round(sx0), sy = Math.round(sy0);
    ctx.globalAlpha = 0.35; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(sx0, sy0, 8, 3, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    const S2 = G.S2 || k; const br = Math.sin(W.time * 2.2 + (u.id || 0)) * 0.6; const flip = u.fx < -0.2;
    O.save(); O.setTransform(1, 0, 0, 1, 0, 0); O.globalAlpha = 1; O.globalCompositeOperation = 'source-over'; O.imageSmoothingEnabled = true; const dw = s.ww * S2, dh = s.wh * S2; const X = Math.round(sx0 * S2), Y = Math.round((sy0 + 1 - br * 0.3) * S2);
    if (flip) { O.translate(X, 0); O.scale(-1, 1); O.drawImage(s.img, Math.round(-dw / 2), Math.round(Y - dh), Math.round(dw), Math.round(dh)); } else O.drawImage(s.img, Math.round(X - dw / 2), Math.round(Y - dh), Math.round(dw), Math.round(dh)); O.restore();
    u._sx = sx; u._sy = sy - s.wh + 3; u._ph = s.wh; u._pw = s.ww; };
})(window.G);
