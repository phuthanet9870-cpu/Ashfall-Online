'use strict';
(function (init) {
  (globalThis.ASHFALL_SIM_FACTORIES ||= {})['fash2'] = init;
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
/* Fashion v2: in the bag's Costume view the right side becomes the wardrobe (click to wear, hover for details),
   plus "wear best" which picks the highest-stat piece for every fashion slot. */
(function (G) {
  const U = G.U, D = G.D, S = G.S, UI = G.UI; const esc = UI.esc;
  const score = it => { if (!it) return -1; let v = 0; const FS = D.FASHION_STATS || {}; for (const [, b] of FS[it.slot] || []) v += b * (it.tier || 1); for (const [k, x] of it.fsub || []) v += D.PCT[k] ? x : x / 20; return v + (it.tier || 0) * 0.01; };
  S.fashionBest = () => { const s = S.save; const eq = s.fashion.eq; let n = 0; for (const f of D.FASHION_SLOTS) { let best = eq[f.k] || null; for (const it of s.fashion.owned) if (it.slot === f.k && score(it) > score(best)) best = it; if (best && best !== eq[f.k]) { eq[f.k] = best; n++; } } S.refreshPlayer(); S.persist(); return n; };
  const inv0 = UI.PANELS.inv.render; UI.PANELS.inv.render = function (tab, P) { let h = inv0.call(this, tab, P); if (P.dview !== 'fash') return h; const s = S.save;
    const own = s.fashion.owned.slice().sort((a, b) => (a.slot > b.slot ? 1 : a.slot < b.slot ? -1 : 0) || score(b) - score(a)); const eqd = new Set(Object.values(s.fashion.eq).filter(Boolean));
    const cells = own.map(it => `<button class="icell t${it.tier || 1} ${eqd.has(it) ? 'fwear' : ''}" data-act="f2-wear" data-uid="${it.uid}"><img src="${UI.itemIcon(it)}" alt="">${eqd.has(it) ? '<span class="ip">ใส่</span>' : ''}</button>`).join('');
    const right = `<div class="invr f2r"><div class="f2top"><b>ตู้เสื้อผ้า ${own.length} ชิ้น</b><button class="btn primary" data-act="f2-best">⚡ ใส่ชุดที่ดีที่สุดอัตโนมัติ</button></div><p class="muted">คลิกเพื่อสวมใส่ · ชี้เมาส์ดูค่าพลัง · ชิ้นที่กรอบทองคือที่ใส่อยู่</p><div class="igrid invgrid">${cells || '<span class="muted">ยังไม่มีชุดแฟชั่น — สุ่มได้ที่ NPC หน้าน้ำพุ</span>'}</div></div>`;
    const i = h.indexOf('<div class="invr">'); if (i < 0) return h; let d = 0, j = i; const re = /<div\b|<\/div>/g; re.lastIndex = i; let m; while ((m = re.exec(h))) { d += m[0] === '</div>' ? -1 : 1; if (d === 0) { j = re.lastIndex; break; } }
    return h.slice(0, i) + right + h.slice(j); };
  // fashion window ("wear" tab) uses the bag layout: costume doll left (fixed), wardrobe right (scrolls)
  const fr0 = UI.PANELS.fashion.render; UI.PANELS.fashion.render = function (tab, P) { if (tab && tab !== 'wear') return fr0.call(this, tab, P); const s = S.save; P.dview = 'fash';
    const own = s.fashion.owned.slice().sort((a, b) => (a.slot > b.slot ? 1 : a.slot < b.slot ? -1 : 0) || score(b) - score(a)); const eqd = new Set(Object.values(s.fashion.eq).filter(Boolean));
    const sel = P.sel ? Object.values(s.fashion.eq).find(x => x && x.uid === P.sel) : null;
    const cats = [['all', 'ทั้งหมด'], ...D.FASHION_SLOTS.map(f => [f.k, f.th])]; P.fcat = P.fcat || 'all'; const list = own.filter(it => P.fcat === 'all' || it.slot === P.fcat);
    const cells = list.map(it => `<button class="icell t${it.tier || 1} ${eqd.has(it) ? 'fwear' : ''}" data-act="f2-wear" data-uid="${it.uid}"><img src="${UI.itemIcon(it)}" alt="">${eqd.has(it) ? '<span class="ip">ใส่</span>' : ''}</button>`).join('');
    const selBar = sel ? `<div class="f2sel"><b>${esc(sel.name)}</b><button class="btn" data-act="fashremove" data-slot="${sel.slot}">ถอดออก</button><div class="dyes">${D.DYES.map(c => `<button class="dye" style="background:${c}" data-act="dye" data-c="${c}" aria-label="ย้อมสี"></button>`).join('')}</div><small class="muted">ย้อมใช้ด้าย 3 (มี ${s.thread})</small></div>` : '<p class="muted f2hint">คลิกชุดที่ใส่อยู่ทางซ้ายเพื่อถอดหรือย้อมสี</p>';
    return `<div class="invpage f2page"><div class="invl">${UI.doll(P, 'selfash').replace(/<div class="dview">[\s\S]*?<\/div>/, '')}${selBar}</div>
      <div class="invr f2r"><div class="f2top"><b>ตู้เสื้อผ้า ${own.length} ชิ้น</b><button class="btn primary" data-act="f2-best">⚡ ใส่ชุดที่ดีที่สุด</button></div>
      <div class="chips f2cats">${cats.map(([k, n]) => `<button class="chip ${P.fcat === k ? 'on' : ''}" data-act="f2-cat" data-v="${k}">${esc(n)}</button>`).join('')}</div>
      <div class="igrid invgrid">${cells || '<span class="muted">ไม่มีชุดในหมวดนี้ — สุ่มได้ที่ NPC หน้าน้ำพุ</span>'}</div></div></div>`; };
  const a0 = UI.act; UI.act = (el, e) => { const a = el.dataset.act;
    if (a === 'f2-cat') { UI.panel.fcat = el.dataset.v; UI.renderPanel(); return; }
    if (a === 'f2-best') { const n = S.fashionBest(); UI.toast(n ? `สวมชุดที่ดีที่สุด ${n} ช่อง` : 'ใส่ชุดที่ดีที่สุดอยู่แล้ว', n ? 'good' : 'info'); UI.renderPanel(); return; }
    if (a === 'f2-wear') { const it = S.save.fashion.owned.find(x => x.uid === el.dataset.uid); if (it) { S.fashionEquip(it); S.persist(); if (UI.panel) UI.panel.sel = it.uid; UI.renderPanel(); } return; }
    return a0(el, e); };
  const css = document.createElement('style'); css.textContent = `.f2top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px}.f2top b{font-size:15px;color:#f2d27a}.f2cats{margin:4px 0 6px;flex-wrap:wrap}.f2sel{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:8px;padding:8px;border:1px solid #4a3c22;border-radius:8px}.f2sel b{width:100%;color:#f2d27a}.f2hint{margin-top:8px;text-align:center}.f2r .icell.fwear{box-shadow:0 0 0 2px #f2d27a,0 0 10px rgba(242,210,122,.5)}`; document.head.appendChild(css);
})(G);

});
