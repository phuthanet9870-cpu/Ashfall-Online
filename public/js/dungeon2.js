'use strict';
/* 1000-floor dungeons: drops scale with the floor (ilv mapped to the 1–100 item scale, then a floor power multiplier
   up to ×3.5 at floor 1000), deeper floors can drop already-enhanced gear (+1 … +10), monsters hit harder the deeper you go. */
(function (G) {
  const U = G.U, D = G.D, S = G.S, W = G.W;
  const floorMul = F => 1 + Math.max(0, F - 1) / 400;
  const scaleItem = (it, F) => { if (!it || !(it.kind === 'gear' || it.kind === 'acc' || it.kind === 'rune' || it.kind === 'relic' || it.kind === 'gem')) return it; const m = floorMul(F);
    const sc = o => { if (!o) return; o.v = D.PCT[o.s] ? Math.round(o.v * m * 10) / 10 : Math.round(o.v * m); };
    sc(it.main); (it.subs || []).forEach(sc); it.floor = F;
    if ((it.kind === 'gear' || it.kind === 'acc') && Math.random() < 0.06 + F / 1600) { const max = Math.min(10, 1 + Math.floor(F / 100)); it.lv = Math.max(it.lv || 0, U.ri(1, max)); if (S.applyEnhOptions) S.applyEnhOptions(it); }
    return it; };
  const rd0 = S.rollDrop; S.rollDrop = (type, tier, ilv) => { const m = W.mode; if (!m || m.kind !== 'dungeon') return rd0(type, tier, ilv); const F = m.floor || 1; return scaleItem(rd0(type, tier, Math.max(1, Math.min(100, Math.ceil(ilv / 10)))), F); };
  const dm0 = S.DungeonMode; S.DungeonMode = function () { const M = dm0.apply(this, arguments); const sf = M.setupFloor; M.setupFloor = function () { const r = sf.apply(this, arguments); const F = this.floor; const am = 1 + F / 180, dm = 1 + F / 300;
      for (const u of W.units) if (u.kind === 'mob' && !u._dgScaled) { u._dgScaled = true; u.st.atk = Math.round(u.st.atk * am); u.st.def = Math.round(u.st.def * dm); if (F > 200) { u.st.crit = Math.min(60, 5 + F / 25); u.moveSpd *= 1 + Math.min(0.5, F / 2000); } } return r; }; return M; };
})(window.G);
