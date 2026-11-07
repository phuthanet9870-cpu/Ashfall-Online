'use strict';
/* Hover tooltip: resting the mouse on any item (bag, equipment, storage, runes, fashion, shop …) shows its full detail card. */
(function (G) {
  const S = G.S, UI = G.UI;
  const tip = document.createElement('div'); tip.id = 'itip'; tip.hidden = true; document.body.appendChild(tip);
  const find = (uid) => { const s = S.save; if (!s || !uid) return null; const pools = [s.inv, Object.values(s.eq || {}), (s.vault && s.vault.items) || [], (s.fashion && s.fashion.owned) || [], Object.values((s.fashion && s.fashion.eq) || {}), ...((s.runeBoard || []).map(p => Object.values(p || {})))];
    for (const L of pools) for (const it of L || []) if (it && it.uid === uid) return it; if (UI.panel && UI.panel.res) for (const x of UI.panel.res) if (x.it && x.it.uid === uid) return x.it; return null; };
  let cur = null, timer = 0, mx = 0, my = 0;
  const place = () => { const r = tip.getBoundingClientRect(); let x = mx + 18, y = my + 14; if (x + r.width > innerWidth - 8) x = mx - r.width - 14; if (y + r.height > innerHeight - 8) y = Math.max(8, innerHeight - r.height - 8); tip.style.left = Math.max(8, x) + 'px'; tip.style.top = y + 'px'; };
  const show = (el, it) => { let h = ''; try { h = UI.itemDetail(it, ''); } catch (e) { return; } h = h.replace(/<div class="iact">[\s\S]*$/, '</div>'); tip.innerHTML = h; tip.hidden = false; place(); };
  const hide = () => { clearTimeout(timer); tip.hidden = true; if (cur && cur._t != null) { cur.title = cur._t; cur._t = null; } cur = null; };
  document.addEventListener('mouseover', e => { const el = e.target.closest && e.target.closest('[data-uid]'); if (el === cur) return; hide(); if (!el) return; const it = find(el.dataset.uid); if (!it) return; cur = el; if (el.title) { el._t = el.title; el.title = ''; } clearTimeout(timer); timer = setTimeout(() => { if (cur === el) show(el, it); }, 140); });
  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; if (!tip.hidden) place(); }, { passive: true });
  for (const ev of ['mousedown', 'wheel', 'keydown']) document.addEventListener(ev, () => { if (!tip.hidden) { tip.hidden = true; } }, { passive: true, capture: true });
  const css = document.createElement('style'); css.textContent = `#itip{position:fixed;z-index:9500;pointer-events:none;width:min(340px,92vw);max-height:80vh;overflow:hidden;background:linear-gradient(180deg,#1e1a16,#0e0c0a);border:1px solid #a8843a;border-radius:10px;padding:10px 12px;box-shadow:0 0 0 1px #000,0 12px 40px rgba(0,0,0,.7);color:#eee4cc;font-size:12.5px}#itip[hidden]{display:none}#itip .iact{display:none}#itip img{image-rendering:auto}`; document.head.appendChild(css);
})(window.G);
