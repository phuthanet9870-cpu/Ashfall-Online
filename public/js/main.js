'use strict';
/* Boot + main loop */
(function (G) {
  const U = G.U, D = G.D, E = G.E, W = G.W, V = G.VFX, S = G.S, UI = G.UI;
  const cv = document.getElementById('cv'); const ctx = cv.getContext('2d');
  const ov = document.getElementById('ov'); const octx = ov.getContext('2d'); E.octx = octx;
  // smooth percentage zoom: 100% = default scale for this screen; range 40%–300%
  G.ZMIN = 40; G.ZMAX = 300;
  G.baseZoom = () => innerWidth < 700 ? 1.5 : innerWidth >= 1700 ? 3 : 2; // CSS px per game px at 100%
  G.zTarget = 100; G.zCur = 100;
  const world = document.createElement('canvas'); const wctx = world.getContext('2d'); G.world = world;
  G.applyZoom = () => {
    const dpr = G.DPR || 1; G.zKick = (G.zKick || 0) * 0.9; const z = G.baseZoom() * G.zCur / 100 * (1 + (G.zKick || 0)); const S2 = z * dpr;
    const bw = Math.ceil(cv.width / S2), bh = Math.ceil(cv.height / S2);
    if (world.width !== bw || world.height !== bh) { world.width = bw; world.height = bh; const [fc, fx] = G.SPR.mk(bw, bh); const [bc, bx] = G.SPR.mk(Math.max(1, Math.ceil(bw / 3)), Math.max(1, Math.ceil(bh / 3))); E.bloom = { fc, fx, bc, bx }; }
    E.VW = bw; E.VH = bh; G.PXS = z; G.zoom = z; G.S2 = S2;
    wctx.setTransform(1, 0, 0, 1, 0, 0); wctx.imageSmoothingEnabled = false;
  };
  G.blit = () => { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = (W.map && W.map.bg) || '#0b0a12'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.imageSmoothingEnabled = false; ctx.drawImage(world, 0, 0, world.width * G.S2, world.height * G.S2); };
  G.resize = () => {
    const dpr = window.devicePixelRatio || 1; const w = innerWidth, h = innerHeight; G.DPR = dpr;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px';
    ov.width = Math.round(w * dpr); ov.height = Math.round(h * dpr); ov.style.width = w + 'px'; ov.style.height = h + 'px';
    octx.setTransform(dpr, 0, 0, dpr, 0, 0); octx.imageSmoothingEnabled = false;
    world.width = 0;
    if (S.save && S.save.settings.zoomPct) { G.zTarget = S.save.settings.zoomPct; }
    G.applyZoom();
  };
  G.setZoomPct = (p, instant) => { G.zTarget = U.clamp(Math.round(p), G.ZMIN, G.ZMAX); if (instant) G.zCur = G.zTarget; if (S.save) S.save.settings.zoomPct = G.zTarget; const zl = document.getElementById('zoomlv'); if (zl) zl.textContent = G.zTarget + '%'; };
  G.setZoom = (dir) => G.setZoomPct(G.zTarget + dir * 10);
  window.addEventListener('resize', () => G.resize()); G.resize();
  UI.bindInput(cv); UI.bindHud && UI.bindHud();

  let last = performance.now(), hudT = 0, miniT = 0, saveT = 0, aqT = 0, fps = 60, modalT = 0;
  const autoQuest = (dt) => {
    if (S.autoQuestStep) { aqT -= dt; if (aqT > 0 || !S.auto.quest || !S.save) return; aqT = 1.5; return S.autoQuestStep(1.5); }
    aqT -= dt; if (aqT > 0 || !S.auto.quest || !S.save) return; aqT = 2;
    const modalOpen = !document.getElementById('modal').hidden;
    if (modalOpen) { modalT += 2; if (modalT >= 6) { modalT = 0; UI.closeModal(); S.goTown(S.save.lastTown); } return; } modalT = 0;
    const m = W.mode; if (!m || m.kind === 'pvp' || m.kind === 'siege') return;
    const q = D.MAIN_QUESTS[S.save.quests.main]; if (!q) return;
    if (q.map && (m.kind !== 'farm' || m.def.id !== q.map)) { if (m.kind === 'dungeon' && !m.ended) return; UI.toast('ออโต้ภารกิจ: เดินทางไป ' + D.FARM_MAPS.find(f => f.id === q.map).th, 'info'); S.goFarm(D.FARM_MAPS.findIndex(f => f.id === q.map)); return; }
    if (q.type === 'floor' && m.kind !== 'dungeon') { const best = Object.entries(S.save.dungeons).sort((a, b) => (b[1].cp || 0) - (a[1].cp || 0))[0]; const id = best ? best[0] : 'armory'; const cp = best ? best[1].cp || 0 : 0; UI.toast('ออโต้ภารกิจ: ลงดันเจี้ยน', 'info'); S.goDungeon(id, cp ? cp + 1 : 1, 0); }
  };
  const frame = (t) => {
    const dtReal = Math.min(0.1, (t - last) / 1000); last = t; fps = fps * 0.95 + (1 / Math.max(0.001, dtReal)) * 0.05;
    try {
      if (W.map && W.player) {
        if (Math.abs(G.zCur - G.zTarget) > 0.05) { G.zCur += (G.zTarget - G.zCur) * Math.min(1, dtReal * 9); if (Math.abs(G.zCur - G.zTarget) < 0.1) G.zCur = G.zTarget; } G.applyZoom();
        const dt = E.update(dtReal);
        const p = W.player; const focus = W.mode && W.mode.show && W.mode.focusPt ? W.mode.focusPt : p;
        const k = Math.min(1, dtReal * 7); W.cam.x += (focus.x - W.cam.x) * k; W.cam.y += (focus.y - W.cam.y) * k;
        { const m = W.map, hw = E.VW / G.TS / 2, hh = E.VH / G.TS / 2; W.cam.x = m.w > hw * 2 ? U.clamp(W.cam.x, hw, m.w - hw) : m.w / 2; W.cam.y = m.h + 0.5 > hh * 2 ? U.clamp(W.cam.y, hh, m.h + 0.5 - hh) : m.h / 2; }
        if (!Number.isFinite(W.cam.x) || !Number.isFinite(W.cam.y)) { W.cam.x = p.x; W.cam.y = p.y; }
        octx.setTransform(1, 0, 0, 1, 0, 0); octx.globalAlpha = 1; octx.globalCompositeOperation = 'source-over'; octx.clearRect(0, 0, ov.width, ov.height); octx.setTransform(G.DPR || 1, 0, 0, G.DPR || 1, 0, 0);
        wctx.globalAlpha = 1; wctx.globalCompositeOperation = 'source-over';
        E.render(wctx); G.blit();
        if (W.gm.debug) { octx.font = '12px monospace'; octx.fillStyle = '#ffffff'; octx.textAlign = 'left'; octx.fillText(`FPS ${fps.toFixed(0)} · units ${W.units.length} · fx ${V.parts.length} · proj ${W.projs.length} · ${p.x.toFixed(1)},${p.y.toFixed(1)}`, 8, innerHeight - 10); }
        hudT -= dtReal; if (hudT <= 0) { hudT = 0.1; UI.refreshHud(); }
        miniT -= dtReal; if (miniT <= 0) { miniT = 0.25; UI.drawMinimap(); }
        saveT -= dtReal; if (saveT <= 0) { saveT = 30; S.persist(); }
        autoQuest(dtReal);
      } else { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#0e0c14'; ctx.fillRect(0, 0, E.VW, E.VH); octx.clearRect(0, 0, innerWidth, innerHeight); }
    } catch (err) { console.error(err); }
    requestAnimationFrame(frame);
  };
  UI.showTitle();
  requestAnimationFrame(frame);
  window.addEventListener('beforeunload', () => S.persist());
  // title backdrop: animated parade of classes
  const bg = () => { if (W.map) return; const tl = document.getElementById('title-screen'); if (tl.hidden) return; };
  bg();
})(window.G);
