'use strict';
/* Uses the Raven Fantasy Icons pack for item, consumable and status icons wherever the pack has a match.
   No match (rifle, wrench, hourglass … · class-set / world-boss / fashion items) → the game's own icon is kept. */
(function (G) {
  const UI = G.UI, U = G.U, SPR = G.SPR, MAN = G.RAVEN_MAN; if (!MAN || !G.RAVEN_SRC) return;
  const IMG = new Image(); let ready = false; IMG.onload = () => { ready = true; }; IMG.src = G.RAVEN_SRC;
  const cache = new Map();
  const draw = (k, S = 64, o = {}) => { const key = k + '@' + S + (o.glow || '') + (o.frame || ''); if (cache.has(key)) return cache.get(key); if (!ready) return null;
    const [cv, x] = SPR.mk(S, S); x.imageSmoothingEnabled = false; const sx = (k % MAN.cols) * 32, sy = Math.floor(k / MAN.cols) * 32;
    if (o.frame) { x.fillStyle = o.frame === 'good' ? '#132420' : '#2a1416'; x.fillRect(0, 0, S, S); }
    if (o.glow) { x.save(); x.shadowColor = o.glow; x.shadowBlur = S * 0.16; x.drawImage(IMG, sx, sy, 32, 32, S * 0.06, S * 0.06, S * 0.88, S * 0.88); x.restore(); }
    x.drawImage(IMG, sx, sy, 32, 32, S * 0.06, S * 0.06, S * 0.88, S * 0.88);
    if (o.frame) { x.strokeStyle = o.frame === 'good' ? '#4ad6c8' : '#ff6a5a'; x.lineWidth = Math.max(1, S / 16); x.strokeRect(x.lineWidth / 2, x.lineWidth / 2, S - x.lineWidth, S - x.lineWidth); }
    let url = ''; try { url = cv.toDataURL(); } catch (e) { return null; } const r = { cv, url }; cache.set(key, r); return r; };
  const hashOf = (s) => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const pick = (list, id) => list && list.length ? list[hashOf(id) % list.length] : null;
  const keySlot = sl => sl === 'earring2' ? 'earring1' : sl === 'ring2' ? 'ring1' : sl;
  const RC = { red: '#ff5a4a', blue: '#4a9aff', green: '#5ad06a' };
  const iconFor = (it) => { if (!it || it.cset || it.wb || it.kind === 'fashion' || it.core || (it.slot && String(it.slot).startsWith('f_'))) return null;
    const id = it.cat || it.base || ((it.slot || '') + (it.name || '') + (it.relic || '') + (it.gem || '') + (it.color || ''));
    if (it.kind === 'rune' || (it.color && !it.slot)) { const k = pick(MAN.RUNE, id); return k == null ? null : { k, glow: RC[it.color] || '#d8c8ff' }; }
    if (it.kind === 'gem' || it.gem && !it.slot) { const k = pick(MAN.GEM[it.gem] || MAN.GEM.diamond, id); return k == null ? null : { k }; }
    if (it.slot === 'relic' || it.kind === 'relic') return { k: pick(MAN.REL[it.relic] || MAN.REL._, id) };
    if (it.slot === 'weapon') { const w = it.wpn || (G.S.save && G.D.CLS[G.S.save.cls] ? G.D.CLS[G.S.save.cls].weapon : null); const L = MAN.W[w]; return L ? { k: pick(L, id) } : null; }
    const L = MAN.A[keySlot(it.slot)]; return L ? { k: pick(L, id) } : null; };
  const icon0 = UI.itemIcon; UI.itemIcon = (it) => { const m = iconFor(it); if (m && m.k != null) { const r = draw(m.k, 64, { glow: m.glow }); if (r) return r.url; } return icon0(it); };
  const bag0 = UI.bagIcon; UI.bagIcon = (k, tier) => { const i = (k === 'stone' || k === 'stones') ? MAN.STONE[Math.max(0, Math.min(9, tier || 0))] : MAN.BAG[k]; if (i != null) { const r = draw(i, 64); if (r) return r.url; } return bag0(k, tier); };
  const st0 = UI.statusIcon; const good0 = k => { try { return st0(k).good; } catch (e) { return false; } };
  UI.statusIcon = (k) => { const i = MAN.STA[k]; if (i != null) { const g = good0(k); const r = draw(i, 32, { frame: g ? 'good' : 'bad' }); if (r) return { cv: r.cv, url: r.url, good: g }; } return st0(k); };
  G.RAVEN = { big: (n) => { const i = MAN.CHEST[n === 8 ? 1 : 0]; const r = draw(i, 128); return r ? r.url : ''; }, ready: () => ready };
  if (UI.PANELS && UI.PANELS.settings) { const r0 = UI.PANELS.settings.render; UI.PANELS.settings.render = function (tab, P) { return r0.call(this, tab, P) + '<p class="muted">Icons: Raven Fantasy Icons (Clockwork Raven Studios)</p>'; }; }
  // panels open before the atlas decoded: re-render once it is ready
  IMG.addEventListener('load', () => { try { if (UI.panel && UI.renderPanel) UI.renderPanel(); } catch (e) { } });
})(window.G);
