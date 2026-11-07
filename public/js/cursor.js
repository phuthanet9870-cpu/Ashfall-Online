'use strict';
/* Stone cursor set (StoneCursorWenrexa): default arrow, green over clickable UI / NPCs / friends, red over enemies,
   coins over loot, "no" sign while dead. */
(function (G) {
  const W = G.W, E = G.E, UI = G.UI, U = G.U;
  const base = (() => { const s = [...document.scripts].find(x => /js\/cursor\.js/.test(x.src)); return s ? s.src.replace(/js\/cursor\.js.*$/, '') : ''; })();
  const C = k => `url("${base}assets/cursor/${k}.png") 2 2, auto`;
  const CUR = { def: C('c01'), ui: C('c02'), foe: C('c03'), loot: C('c08'), no: C('c07') };
  const css = document.createElement('style'); css.textContent = `html,body,canvas,#cv,#ov,#hud,#panel,#modal,#title-screen{cursor:${CUR.def}}body.aiming #cv{cursor:crosshair!important}button,a,[data-act],.icell,.chip,input[type=range],label,select{cursor:${CUR.ui}!important}input[type=text],input:not([type]),input[type=number],textarea{cursor:text}`; document.head.appendChild(css);
  let canvas = null; let last = 0;
  addEventListener('mousemove', e => { canvas = canvas || document.getElementById('cv'); if (!canvas || e.target !== canvas && e.target.id !== 'ov') return; const now = performance.now(); if (now - last < 60) return; last = now;
    const p = W.player; let c = CUR.def; if (!p) { canvas.style.cursor = c; return; } if (p.dead) c = CUR.no;
    else { const r = canvas.getBoundingClientRect(); const u = UI.unitAt ? UI.unitAt((e.clientX - r.left) / r.width * E.VW, (e.clientY - r.top) / r.height * E.VH) : null;
      if (u && !u.dead) c = E.isEnemy(p, u) && u.kind !== 'npc' ? CUR.foe : CUR.ui;
      else { const m = G.S.IN && G.S.IN.mouseW; if (m && W.loots.some(l => U.d2(l.x, l.y, m[0], m[1]) < 0.7)) c = CUR.loot; } }
    if (document.body.classList.contains('aiming')) c = 'crosshair'; canvas.style.cursor = c; }, { passive: true });
})(window.G);
