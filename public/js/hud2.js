'use strict';
/* HUD layout v2 (outer frame only — panel contents unchanged):
   · bottom-right dock: 6 main buttons (bag, character, skills, fashion, map, dungeon) + "เมนู" (pop-up grid of every
     other window, labelled) + settings — replaces the 20-button icon wall
   · big round AUTO toggle with its own settings gear, right above the dock
   · currencies sit under the player frame; notifications move up to the right edge so nothing overlaps the dock */
(function (G) {
  const UI = G.UI, S = G.S; const $ = s => document.querySelector(s);
  const MAIN = [['inv', 'กระเป๋า', 'I'], ['char', 'ตัวละคร', 'C'], ['skills', 'สกิล', 'K'], ['fashion', 'แฟชั่น', 'N'], ['map', 'แผนที่', 'M'], ['dungeon', 'ดันเจี้ยน', 'L']];
  const icon = p => { try { return UI.menuIcon ? UI.menuIcon(p) : ''; } catch (e) { return ''; } };
  const apply = () => { const hud = $('#hud'); if (!hud) return; const menu = $('#menu');
    // dock
    let dock = $('#dock'); if (!dock) { dock = document.createElement('div'); dock.id = 'dock'; hud.appendChild(dock); }
    if (!dock.dataset.ok) { dock.dataset.ok = 1; dock.innerHTML = MAIN.map(([p, n, k]) => `<button data-act="panel" data-p="${p}" title="${n} [${k}]"><img src="${icon(p)}" alt=""><span>${n}</span><kbd>${k}</kbd></button>`).join('') + `<button id="dock-more" title="เมนูทั้งหมด"><b>☰</b><span>เมนู</span></button><button data-act="panel" data-p="settings" title="ตั้งค่า [O]"><img src="${icon('settings')}" alt=""><span>ตั้งค่า</span><kbd>O</kbd></button>`;
      dock.querySelector('#dock-more').addEventListener('click', e => { e.stopPropagation(); hud.classList.toggle('menu-open'); }); }
    // menu → labelled pop-up grid without the dock's buttons
    if (menu) { menu.classList.add('popmenu'); for (const b of menu.querySelectorAll('button[data-p]')) { const p = b.dataset.p; b.hidden = MAIN.some(m => m[0] === p) || p === 'settings' || p === 'quests'; if (!b.querySelector('img') && icon(p)) b.insertAdjacentHTML('afterbegin', `<img src="${icon(p)}" alt="">`); } }
    // auto controls
    let ad = $('#autodock'); if (!ad) { ad = document.createElement('div'); ad.id = 'autodock'; hud.appendChild(ad); }
    const ba = $('#btn-auto'); if (ba && ba.parentElement !== ad) { ad.appendChild(ba); ba.innerHTML = '<b>AUTO</b><small>ออโต้ [Z]</small>'; }
    const af = document.querySelector('.afbtn'); if (af && af.parentElement !== ad) { ad.appendChild(af); af.title = 'ตั้งค่าออโต้'; }
    if (ba) ba.classList.toggle('on', !!(S.auto && S.auto.on));
    // currencies under the player frame
    const cur = $('#curr'), tl = $('#hud-tl') || $('#uf'); if (cur && tl && cur.parentElement !== tl.parentElement) { cur.classList.add('curr2'); tl.insertAdjacentElement('afterend', cur); }
    const tb = $('.tr-btns'); if (tb) tb.classList.add('tr-empty'); };
  const bind0 = UI.bindHud; UI.bindHud = function () { const r = bind0.apply(this, arguments); try { const d = $('#dock'); if (d) d.dataset.ok = ''; apply(); } catch (e) { } return r; };
  setInterval(() => { try { apply(); } catch (e) { } }, 500);
  document.addEventListener('click', e => { const h = $('#hud'); if (!h || !h.classList.contains('menu-open')) return; if (e.target.closest('#dock-more')) return; if (e.target.closest('#menu button')) { h.classList.remove('menu-open'); return; } if (!e.target.closest('#menu')) h.classList.remove('menu-open'); });
  addEventListener('keydown', e => { if (e.key === 'Escape') { const h = $('#hud'); if (h) h.classList.remove('menu-open'); } });
  const css = document.createElement('style'); css.textContent = `
  #dock{position:absolute;right:max(12px,env(safe-area-inset-right,0px));bottom:calc(10px + env(safe-area-inset-bottom,0px));display:grid;grid-template-columns:repeat(4,50px);gap:4px;padding:6px;border-radius:14px;background:linear-gradient(180deg,rgba(34,29,24,.94),rgba(12,10,8,.96));border:1px solid #6a5428;box-shadow:0 0 0 1px #000,0 8px 24px rgba(0,0,0,.5);z-index:6}
  #dock button{position:relative;width:50px;height:50px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border-radius:10px;border:1px solid #3a2e1a;background:linear-gradient(180deg,#2a241c,#15110d);color:#e8dcc0;cursor:pointer;font:500 10.5px Kanit,sans-serif;padding:0}
  #dock button:hover{border-color:#f2d27a;background:linear-gradient(180deg,#3a3022,#1a150f)}#dock img{width:26px;height:26px;image-rendering:pixelated}#dock b{font-size:22px;line-height:26px;color:#f2d27a}
  #dock kbd{position:absolute;top:2px;right:4px;font:9px monospace;color:#8a7a5a}
  #menu.popmenu{display:none!important;position:absolute;right:max(12px,env(safe-area-inset-right,0px));bottom:calc(132px + env(safe-area-inset-bottom,0px));top:auto!important;left:auto!important;width:auto!important;grid-template-columns:repeat(4,96px)!important;gap:6px!important;padding:10px!important;border-radius:14px;background:linear-gradient(180deg,rgba(34,29,24,.97),rgba(12,10,8,.98))!important;border:1px solid #a8843a;box-shadow:0 0 0 1px #000,0 12px 30px rgba(0,0,0,.6);z-index:7}
  #hud.menu-open #menu.popmenu{display:grid!important}
  #menu.popmenu button{width:96px!important;height:62px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:3px;border-radius:10px!important;border:1px solid #3a2e1a!important;background:linear-gradient(180deg,#2a241c,#15110d)!important;position:relative}
  #menu.popmenu button[hidden]{display:none!important}#menu.popmenu button span{position:static!important;opacity:1!important;transform:none!important;background:none!important;border:0!important;padding:0!important;font:500 11.5px Kanit,sans-serif!important;color:#e8dcc0!important}
  #menu.popmenu button img{width:26px!important;height:26px!important}#menu.popmenu button kbd{position:absolute!important;top:3px!important;right:5px!important;left:auto!important;bottom:auto!important;width:auto!important;height:auto!important;padding:0!important;border:0!important;background:none!important;box-shadow:none!important;font-size:9px!important;color:#8a7a5a!important}#menu.popmenu button:hover{border-color:#f2d27a!important}
  #autodock{position:absolute;right:max(14px,env(safe-area-inset-right,0px));bottom:calc(136px + env(safe-area-inset-bottom,0px));display:flex;align-items:center;gap:6px;z-index:6}
  #hud.menu-open #autodock{visibility:hidden}
  #autodock #btn-auto{width:78px;height:78px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;border:2px solid #6a5428;background:radial-gradient(circle at 40% 35%,#3a3226,#120e0a);color:#c8bca0;cursor:pointer;box-shadow:0 0 0 1px #000,0 6px 16px rgba(0,0,0,.5);padding:0}
  #autodock #btn-auto b{font:800 18px Kanit,sans-serif;letter-spacing:1px}#autodock #btn-auto small{font:10px Kanit,sans-serif;opacity:.8}
  #autodock #btn-auto.on{border-color:#f2d27a;color:#1a1206;background:radial-gradient(circle at 40% 35%,#ffe9a8,#c8902a);box-shadow:0 0 0 1px #000,0 0 18px rgba(242,210,122,.7);animation:autoP 1.6s ease-in-out infinite}
  @keyframes autoP{50%{box-shadow:0 0 0 1px #000,0 0 28px rgba(242,210,122,.95)}}
  #autodock .afbtn{width:40px;height:40px;border-radius:50%;border:1px solid #6a5428;background:linear-gradient(180deg,#2a241c,#15110d);color:#f2d27a;font-size:18px;cursor:pointer;align-self:flex-end}
  .tr-btns.tr-empty{display:none!important}
  #curr.curr2{position:absolute!important;left:max(12px,env(safe-area-inset-left,0px));top:118px!important;right:auto!important;display:flex!important;gap:6px;flex-wrap:wrap;width:auto!important}
  #feed{right:max(12px,env(safe-area-inset-right,0px))!important;bottom:auto!important;top:240px!important;left:auto!important;max-height:calc(100vh - 470px);overflow:hidden}
  #onbadge{top:42px}
  #toasts{bottom:calc(230px + env(safe-area-inset-bottom,0px))!important;right:max(12px,env(safe-area-inset-right,0px))!important;top:auto!important}
  @media (min-width:761px) and (max-width:1340px){#bottom{transform:translateX(-50%) scale(.9)!important;transform-origin:bottom center}}
  @media (max-width:760px){#dock{left:8px;right:8px;display:flex;justify-content:space-between;overflow-x:auto}#dock button{width:44px;height:50px;flex:none}#dock kbd{display:none}#menu.popmenu{left:8px!important;right:8px!important;grid-template-columns:repeat(4,1fr)!important}#menu.popmenu button{width:auto!important}
    #autodock{bottom:calc(76px + env(safe-area-inset-bottom,0px))}#autodock #btn-auto{width:62px;height:62px}#curr.curr2{top:96px!important}}`;
  document.head.appendChild(css);
})(window.G);
