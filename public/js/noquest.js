'use strict';
(function (init) {
  (globalThis.ASHFALL_SIM_FACTORIES ||= {})['noquest'] = init;
  if (typeof window !== 'undefined') init(window.G);
})(function (G) {
  const document = G.headless ? G.platform.document : globalThis.document;
  const window = G.headless ? G.platform.window : globalThis.window;
  const Image = G.headless ? G.platform.Image : globalThis.Image;
  const localStorage = G.headless ? G.platform.localStorage : globalThis.ASHFALL_STORAGE;
  const setTimeout = G.headless ? G.platform.setTimeout : globalThis.setTimeout;
  const setInterval = G.headless ? G.platform.setInterval : globalThis.setInterval;
  const addEventListener = G.headless ? (() => {}) : globalThis.addEventListener;
'use strict';
/* Quest system removed: no main/daily quest chain, no quest tracker, quest arrow, quest panel, quest-giver NPCs or auto-quest.
   (Tutorial, save points, world boss, dungeons and everything else stay.) */
(function (G) {
  const D = G.D, S = G.S, UI = G.UI, W = G.W;
  D.MAIN_QUESTS.length = 0;
  S.questText = () => '';
  if (S.auto) S.auto.quest = false;
  S.autoQuestStep = () => { };
  if (UI.PANELS) delete UI.PANELS.quests;
  const op0 = UI.openPanel; UI.openPanel = function (id) { if (id === 'quests') return; return op0.apply(this, arguments); };
  const strip = () => { document.querySelectorAll('[data-p=quests], [data-act=questmin]').forEach(b => { const el = b.closest('button') || b; if (el.id !== 'quest-track') el.remove(); });
    for (const u of W.units) if (u.role === 'quest' && u.kind === 'npc' && !u.dead) { u.dead = true; u.hidden = true; } for (let i = W.units.length - 1; i >= 0; i--) if (W.units[i].role === 'quest' && W.units[i].dead && W.units[i].kind === 'npc') W.units.splice(i, 1); };
  setInterval(() => { try { strip(); } catch (e) { } }, 600);
  const css = document.createElement('style'); css.textContent = '#quest-track,#btn-autoq{display:none!important}'; document.head.appendChild(css);
})(G);

});
