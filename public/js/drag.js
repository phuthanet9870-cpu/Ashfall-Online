'use strict';
/* Movable windows: press-and-hold the title bar of any window (bag, skills, shop …) and drag it anywhere.
   Position is remembered per window; double-click the title bar to re-centre. A moved window stops dimming
   the game so you can keep playing behind it. */
(function (G) {
  const S = G.S, UI = G.UI;
  const store = () => { const st = S.save && S.save.settings; if (!st) return {}; return st.winPos || (st.winPos = {}); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const apply = () => { const panel = document.getElementById('panel'); const win = panel && panel.querySelector('.pwin'); if (!win || !UI.panel) return; const id = UI.panel.id; const p = store()[id];
    if (p && (p.x || p.y)) { win.style.transform = `translate(${p.x}px, ${p.y}px)`; panel.classList.add('moved'); } else { win.style.transform = ''; panel.classList.remove('moved'); } };
  const r0 = UI.renderPanel; UI.renderPanel = function () { const r = r0.apply(this, arguments); apply(); return r; };
  const o0 = UI.openPanel; UI.openPanel = function () { const r = o0.apply(this, arguments); apply(); return r; };
  const hook = () => { const panel = document.getElementById('panel'); if (!panel || panel._drag) return; panel._drag = true; const head = panel.querySelector('.phead'); const win = panel.querySelector('.pwin'); if (!head || !win) return;
    let drag = null;
    head.addEventListener('pointerdown', e => { if (e.button !== 0 || e.target.closest('button, input, select, a, [data-act]')) return; const id = UI.panel && UI.panel.id; if (!id) return; const p = store()[id] || { x: 0, y: 0 };
      drag = { id, sx: e.clientX, sy: e.clientY, x0: p.x || 0, y0: p.y || 0, r: win.getBoundingClientRect() }; head.setPointerCapture(e.pointerId); win.classList.add('dragging'); e.preventDefault(); });
    head.addEventListener('pointermove', e => { if (!drag) return; const r = drag.r; let dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      dx = clamp(dx, -r.left - r.width + 120, innerWidth - r.left - 120); dy = clamp(dy, -r.top, innerHeight - r.top - 48);
      const x = Math.round(drag.x0 + dx), y = Math.round(drag.y0 + dy); win.style.transform = `translate(${x}px, ${y}px)`; drag.x = x; drag.y = y; if (x || y) panel.classList.add('moved'); });
    const end = () => { if (!drag) return; if (drag.x !== undefined) { store()[drag.id] = { x: drag.x, y: drag.y }; if (S.persist) S.persist(); } drag = null; win.classList.remove('dragging'); };
    head.addEventListener('pointerup', end); head.addEventListener('pointercancel', end);
    head.addEventListener('dblclick', e => { if (e.target.closest('button')) return; const id = UI.panel && UI.panel.id; if (!id) return; delete store()[id]; apply(); if (S.persist) S.persist(); });
    head.title = 'กดค้างแล้วลากเพื่อย้ายหน้าต่าง · ดับเบิลคลิกเพื่อกลับตรงกลาง'; };
  document.addEventListener('DOMContentLoaded', hook); setTimeout(hook, 0);
  const css = document.createElement('style'); css.textContent = `
  #panel .phead{cursor:move;touch-action:none;user-select:none}#panel .phead button{cursor:pointer}
  #panel.moved{background:transparent;pointer-events:none}#panel.moved .pwin{pointer-events:auto;box-shadow:0 0 0 2px #08060c,0 18px 50px rgba(0,0,0,.55)}
  #panel .pwin.dragging{opacity:.92;transition:none}`;
  document.head.appendChild(css);
})(window.G);
// movable HUD boxes (damage report, quest tracker …): hold & drag, position remembered, double-click to reset
(function (G) {
  const S = G.S, W = G.W, D = G.D, UI = G.UI;
  const st = () => { const s = S.save && S.save.settings; if (!s) return {}; return s.hudPos || (s.hudPos = {}); };
  const make = (el, key) => { if (!el || el._mv) return; el._mv = true; el.style.touchAction = 'none'; el.classList.add('hudmv');
    const apply = () => { const p = st()[key]; if (p) { el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; el.style.right = 'auto'; el.style.bottom = 'auto'; el.style.transform = 'none'; } };
    el._apply = apply; apply(); let d = null;
    el.addEventListener('pointerdown', e => { if (e.button !== 0 || e.target.closest('button, input, a, [data-act]')) return; const r = el.getBoundingClientRect(); d = { dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false }; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', e => { if (!d) return; const x = Math.max(0, Math.min(innerWidth - 40, e.clientX - d.dx)), y = Math.max(0, Math.min(innerHeight - 30, e.clientY - d.dy)); if (!d.moved && Math.hypot(e.clientX - d.dx - el.getBoundingClientRect().left, 0) < 1 && false) return; d.moved = true; d.x = x; d.y = y; el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.right = 'auto'; el.style.bottom = 'auto'; el.style.transform = 'none'; });
    const end = () => { if (d && d.moved) { st()[key] = { x: Math.round(d.x), y: Math.round(d.y) }; S.persist && S.persist(); } d = null; };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.addEventListener('dblclick', e => { if (e.target.closest('button')) return; delete st()[key]; el.style.left = el.style.top = el.style.right = el.style.bottom = el.style.transform = ''; S.persist && S.persist(); }); };
  UI.makeMovable = make;
  setInterval(() => { try { make(document.getElementById('dpsrep'), 'dps'); make(document.getElementById('quest-track'), 'quest'); const q = document.getElementById('quest-track'); if (q && q._apply && !q._ap2) { q._ap2 = true; q._apply(); }
      // hide the quest tracker once every main quest is finished
      if (q && S.save && D.MAIN_QUESTS) { const done = S.save.quests && S.save.quests.main >= D.MAIN_QUESTS.length; q.style.display = done ? 'none' : ''; } } catch (e) { } }, 500);
  const css = document.createElement('style'); css.textContent = `.hudmv{cursor:move;user-select:none}.hudmv button{cursor:pointer}`; document.head.appendChild(css);
})(window.G);
// result windows (siege / PvP / dungeon summaries): smaller, with a collapse/expand toggle that is remembered
(function (G) {
  const S = G.S, UI = G.UI; const $ = s => document.querySelector(s);
  const m0 = UI.modal; UI.modal = (html) => { m0(html); const win = $('#modal .mwin'); if (!win) return; let b = win.querySelector('.mtoggle'); if (!b) { b = document.createElement('button'); b.className = 'mtoggle'; b.type = 'button'; win.insertBefore(b, win.firstChild); b.onclick = () => { const st = S.save && S.save.settings; const on = !win.classList.contains('mini'); win.classList.toggle('mini', on); if (st) { st.modalMini = on; S.persist && S.persist(); } b.textContent = on ? '▢ ขยาย' : '— ย่อ'; }; }
    const mini = !!(S.save && S.save.settings && S.save.settings.modalMini); win.classList.toggle('mini', mini); b.textContent = mini ? '▢ ขยาย' : '— ย่อ'; win.scrollTop = 0; };
  const css = document.createElement('style'); css.textContent = `
  #modal .mwin{width:min(600px,100%);max-height:min(86vh,100%);padding:12px 16px;font-size:12.5px;position:relative}
  #modal .mwin h2{font-size:22px;padding-right:70px}#modal .mwin h4{margin:8px 0 5px;font-size:12.5px;padding:3px 8px}#modal .mwin p{margin:4px 0}
  #modal .mwin .icell{width:34px;height:34px}#modal .mwin .icell img{width:28px;height:28px}#modal .mwin table td,#modal .mwin table th{padding:2px 6px}
  #modal .mtoggle{position:absolute;right:12px;top:12px;z-index:2;border:1px solid #93afd8;background:linear-gradient(#fff,#d8e6f8);color:#2c4a7a;border-radius:14px;padding:3px 10px;font-size:12px;cursor:pointer}
  #modal .mwin.mini{width:min(380px,100%)}#modal .mwin.mini > *:not(.mtoggle):not(h2):not(h3):not(.list):not(.mbtns):not(p:nth-of-type(-n+2)){display:none}`;
  document.head.appendChild(css);
})(window.G);
