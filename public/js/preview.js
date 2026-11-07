'use strict';
/* Skill preview from the class / character-select screen: opens a temporary training ground with a max-level test
   character of that class and replays the chosen skill on a dummy. Nothing is saved; "กลับ" returns to where you were. */
(function (G) {
  const U = G.U, D = G.D, E = G.E, W = G.W, S = G.S, UI = G.UI; const $ = s => document.querySelector(s); const esc = UI.esc;
  const p0 = S.persist; S.persist = function () { if (S._pv) return; return p0.apply(this, arguments); };
  let iv = null;
  const bar = () => { let b = $('#pvbar'); if (!b) { b = document.createElement('div'); b.id = 'pvbar'; document.body.appendChild(b); } const pv = S._pv; if (!pv) { b.hidden = true; return; } const c = D.CLS[pv.cls]; const s = c.skills[pv.i] || c.setUlt;
    b.hidden = false; b.innerHTML = `<b>ตัวอย่างสกิล · ${esc(c.name)}</b><span class="pvs"><img src="${UI.skillIcon(s)}" alt=""><span>${esc(s.name)}<small>${esc(D.SLOT_TH(pv.i))} · [${D.KEYS[pv.i]}]</small></span></span>
      <button class="btn" data-act="pv-step" data-v="-1">◀</button><button class="btn" data-act="pv-step" data-v="1">▶</button><button class="btn primary" data-act="pv-exit">กลับไปเลือกตัวละคร</button><p>${esc(D.descSkill(s))}</p>`; };
  const castOnce = () => { const pv = S._pv, p = W.player; if (!pv || !p) return; const t = W.units.filter(u => u.dummy && !u.dead).sort((a, b) => U.d2(a.x, a.y, p.x, p.y) - U.d2(b.x, b.y, p.x, p.y))[0]; if (!t) return;
    p.allSkills = true; p.sets = p.sets || {}; p.sets.setult = true; p.cds.fill(0); p.gcd = 0; p.res = p.resMax || 1e6; p.cc.st = p.cc.sil = 0; S.select(t); try { E.cast(p, pv.i, { x: t.x, y: t.y, u: t }); } catch (e) { console.error(e); } };
  S.previewSkill = (cls, i) => { if (!S._pv) S._pv = { back: S.save, inGame: !!(W.player && W.map), pick: UI._pick, clsSk: UI._clsSk }; S._pv.cls = cls; S._pv.i = i;
    UI.closePanel && UI.closePanel(); S.save = S.newSave('ตัวอย่าง', cls); S.setLevel(250); if (S._pv.back && S._pv.back.settings) S.save.settings = Object.assign({}, S._pv.back.settings);
    S.goGallery(); G.setZoomPct(140, true); setTimeout(() => { const p = W.player, d = W.units.find(u => u.dummy); if (p && d) { p.x = d.x - 3; p.y = d.y + 2; } }, 50);
    clearInterval(iv); setTimeout(castOnce, 700); iv = setInterval(castOnce, 2800); bar(); };
  const exit = () => { const pv = S._pv; if (!pv) return; clearInterval(iv); iv = null; S._pv = null; bar(); S.save = pv.back;
    if (pv.inGame && S.save) { S.goTown(S.save.lastTown || 'haven'); return; }
    W.map = null; W.player = null; W.units.length = 0; $('#hud').hidden = true; const t = $('#title-screen'); t.hidden = false; UI._pick = pv.pick || pv.cls; UI.selCls = UI._pick; UI._clsSk = pv.clsSk; UI.showCreate(); };
  const a0 = UI.act; UI.act = (el, e) => { const a = el.dataset.act;
    if (a === 'pv-try') { S.previewSkill(el.dataset.cls, +el.dataset.i); return; }
    if (a === 'pv-step') { const pv = S._pv; if (!pv) return; const n = D.NSK; pv.i = (pv.i + (+el.dataset.v) + n) % n; bar(); castOnce(); return; }
    if (a === 'pv-exit') { exit(); return; }
    return a0(el, e); };
  addEventListener('keydown', e => { if (S._pv && e.key === 'Escape') exit(); });
  // button on the class page (character creation and in-game class change)
  const cp0 = UI.classPage; if (cp0) UI.classPage = function (cur, picked, mode) { const h = cp0.apply(this, arguments); const pk = UI._clsSk ?? 14;
    return h.replace('<div class="allsk">', `<button class="btn pvtry" data-act="pv-try" data-cls="${picked}" data-i="${pk}">▶ ดูตัวอย่างสกิลนี้</button><div class="allsk">`); };
  const css = document.createElement('style'); css.textContent = `
  #pvbar{position:fixed;left:50%;transform:translateX(-50%);top:calc(56px + env(safe-area-inset-top,0px));z-index:40;display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;justify-content:center;max-width:min(720px,94vw);background:linear-gradient(180deg,rgba(30,24,40,.96),rgba(14,11,20,.95));border:1px solid #c8a050;border-radius:12px;padding:8px 12px;color:#eee;box-shadow:0 8px 24px rgba(0,0,0,.5)}
  #pvbar b{color:#ffd84a}#pvbar .pvs{display:flex;gap:6px;align-items:center}#pvbar .pvs img{width:30px;height:30px;image-rendering:pixelated}#pvbar .pvs small{display:block;color:#b8aed0;font-size:10px}
  #pvbar p{flex-basis:100%;margin:0;font-size:11.5px;color:#cfc6e0;text-align:center}#pvbar .btn{padding:4px 10px}.pvtry{margin:6px 0;width:100%}`;
  document.head.appendChild(css);
})(window.G);
