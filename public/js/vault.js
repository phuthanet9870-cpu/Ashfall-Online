'use strict';
(function (init) {
  (globalThis.ASHFALL_SIM_FACTORIES ||= {})['vault'] = init;
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
/* Storage (คลังเก็บของ): when the bag is full, new items go to storage automatically. Starts with 500 slots;
   +100 slots for 10,000 gold (no upper limit). Open from the menu or the bag window; click an item to move it back. */
(function (G) {
  const U = G.U, D = G.D, S = G.S, UI = G.UI, W = G.W; const esc = UI.esc; const $ = s => document.querySelector(s);
  const ADD_COST = 10000, ADD_N = 100, START = 500;
  const V = () => { const s = S.save; s.vault = s.vault || { items: [], cap: START }; if (!s.vault.cap) s.vault.cap = START; return s.vault; };
  S.vaultBuy = () => { const s = S.save, v = V(); if (s.gold < ADD_COST) return `ทองไม่พอ (ต้องใช้ ${U.fmt(ADD_COST)})`; s.gold -= ADD_COST; v.cap += ADD_N; S.persist(); return { ok: true, msg: `ขยายคลังเป็น ${v.cap} ช่อง` }; };
  const stores = it => it && !['stone', 'cur', 'cons', 'srune', 'fashion', 'junk'].includes(it.kind);
  const add0 = S.addItem; S.addItem = (it, quiet) => { const s = S.save;
    if (s && stores(it) && s.inv.length >= S.invMax) { const v = V(); if (v.items.length < v.cap) { v.items.push(it); if (!quiet || !UI._vtT || Date.now() - UI._vtT > 4000) { UI._vtT = Date.now(); UI.toast(`กระเป๋าเต็ม — ย้าย ${it.name || 'ไอเทม'} ไปคลังเก็บของ (${v.items.length}/${v.cap})`, 'info'); } return true; }
      UI.toast(`กระเป๋าและคลังเต็ม (${v.cap} ช่อง) — ขยายคลังได้ที่หน้าคลัง`, 'bad'); }
    return add0(it, quiet); };
  const take = (uid) => { const s = S.save, v = V(); const i = v.items.findIndex(x => x.uid === uid); if (i < 0) return; if (s.inv.length >= S.invMax) return 'กระเป๋าเต็ม'; s.inv.push(v.items.splice(i, 1)[0]); return true; };
  const put = (uid) => { const s = S.save, v = V(); const i = s.inv.findIndex(x => x.uid === uid); if (i < 0) return; if (v.items.length >= v.cap) return 'คลังเต็ม'; v.items.push(s.inv.splice(i, 1)[0]); return true; };
  UI.PANELS.vault = { title: 'คลังเก็บของ', tabs: [['all', 'ทั้งหมด'], ['gear', 'อุปกรณ์'], ['acc', 'เครื่องประดับ'], ['rune', 'รูน'], ['gem', 'เจม']], render(tab, P) {
    const s = S.save, v = V(); const f = it => tab === 'all' || !tab || (tab === 'gear' ? it.kind === 'gear' : tab === 'acc' ? it.kind === 'acc' || it.kind === 'relic' : it.kind === tab);
    const list = v.items.filter(f).slice().sort((a, b) => (b.tier || 0) - (a.tier || 0) || (b.ilv || 0) - (a.ilv || 0)); const inv = s.inv.filter(f);
    const cell = (it, act) => `<button class="icell t${it.tier || 1}" data-act="${act}" data-uid="${it.uid}" title="${esc(it.name || '')}${it.lv ? ' +' + it.lv : ''}"><img src="${UI.itemIcon(it)}" alt="">${it.lv ? `<span class="qty">+${it.lv}</span>` : ''}</button>`;
    return `<div class="vlt"><div class="vlhead"><b>คลัง ${v.items.length}/${v.cap} ช่อง</b><div class="vlbar"><i style="width:${Math.min(100, v.items.length / v.cap * 100)}%"></i></div>
      <button class="btn primary" data-act="vl-buy">ขยาย +${ADD_N} ช่อง (${U.fmt(ADD_COST)} ทอง)</button><button class="btn" data-act="vl-putall">ย้ายของจากกระเป๋า (ไม่ล็อก) เข้าคลัง</button><button class="btn" data-act="vl-takeall">ดึงกลับเข้ากระเป๋าให้เต็ม</button></div>
      <p class="muted">กระเป๋าเต็มเมื่อไร ไอเทมใหม่จะเข้าคลังอัตโนมัติ · คลิกไอเทมในคลังเพื่อดึงกลับ · คลิกไอเทมในกระเป๋าเพื่อฝาก</p>
      <h4>ในคลัง (${list.length})</h4><div class="igrid vlgrid">${list.map(it => cell(it, 'vl-take')).join('') || '<span class="muted">ว่าง</span>'}</div>
      <h4>ในกระเป๋า ${s.inv.length}/${S.invMax}</h4><div class="igrid vlgrid">${inv.map(it => cell(it, 'vl-put')).join('') || '<span class="muted">ว่าง</span>'}</div></div>`; } };
  const act0 = UI.act; UI.act = (el, e) => { const a = el.dataset.act; if (!a || !a.startsWith('vl-')) { if (a === 'panel' && el.dataset.p === 'vault') { UI.openPanel('vault'); return; } return act0(el, e); }
    const s = S.save, v = V(); let r;
    switch (a) {
      case 'vl-buy': r = S.vaultBuy(); UI.toast(r.ok ? r.msg : r, r.ok ? 'good' : 'bad'); break;
      case 'vl-take': r = take(el.dataset.uid); if (r !== true && r) UI.toast(r, 'bad'); break;
      case 'vl-put': { const it = s.inv.find(x => x.uid === el.dataset.uid); if (it && it.lock) { UI.toast('ไอเทมนี้ล็อกอยู่', 'bad'); break; } r = put(el.dataset.uid); if (r !== true && r) UI.toast(r, 'bad'); break; }
      case 'vl-putall': { let n = 0; for (const it of s.inv.slice()) { if (it.lock || v.items.length >= v.cap) continue; if (put(it.uid) === true) n++; } UI.toast(`ฝาก ${n} ชิ้น`, 'good'); break; }
      case 'vl-takeall': { let n = 0; for (const it of v.items.slice()) { if (s.inv.length >= S.invMax) break; if (take(it.uid) === true) n++; } UI.toast(`ดึงกลับ ${n} ชิ้น`, 'good'); break; }
    }
    S.persist(); UI.renderPanel(); };
  // menu button + bag shortcut
  if (UI.ICONS && UI.ICONS.MENU) UI.ICONS.MENU.vault = k => { k.R(5, 9, 22, 18, '#8a5a34'); k.R(7, 11, 18, 14, '#b07a44'); k.R(5, 15, 22, 2, '#f2c84a'); k.R(13, 13, 6, 6, '#f2c84a'); k.R(15, 15, 2, 3, '#2a1a10'); k.R(5, 6, 22, 4, '#6a4424'); };
  const bind0 = UI.bindHud; UI.bindHud = function () { const r = bind0.apply(this, arguments); const m = $('#menu'); if (m && !m.querySelector('[data-p=vault]')) { const b = document.createElement('button'); b.dataset.act = 'panel'; b.dataset.p = 'vault'; b.innerHTML = `<img src="${UI.menuIcon('vault')}" alt=""><span>คลังเก็บของ</span>`; const ref = m.querySelector('[data-p=settings]'); ref ? m.insertBefore(b, ref) : m.appendChild(b); } return r; };
  const inv0 = UI.PANELS.inv.render; UI.PANELS.inv.render = function (tab, P) { const h = inv0.call(this, tab, P); const v = S.save ? V() : null; return v ? `<div class="vlbtn"><button class="btn" data-act="panel" data-p="vault">📦 คลังเก็บของ ${v.items.length}/${v.cap}</button></div>` + h : h; };
  const css = document.createElement('style'); css.textContent = `.vlhead{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.vlhead b{font-size:15px}.vlbar{flex:1;min-width:120px;height:10px;border-radius:5px;background:#0a0908;border:1px solid #4a3c22;overflow:hidden}.vlbar i{display:block;height:100%;background:linear-gradient(90deg,#a8843a,#f2d27a)}
  .vlgrid{max-height:34vh;overflow:auto}.vlbtn{display:flex;justify-content:flex-end;margin:-4px 0 6px}
  #pbody:has(> .invpage){overflow:hidden;display:flex;flex-direction:column}#pbody:has(> .invpage) > .invpage{flex:1;min-height:0;height:auto}
  #pbody:has(> .invpage) .invl{overflow-y:auto;overflow-x:hidden;min-height:0}#pbody:has(> .invpage) .invr{min-height:0;overflow:hidden}
  #pbody:has(> .invpage) .invgrid{overflow-y:auto;min-height:0;flex:1 1 0}`; document.head.appendChild(css);
})(G);

});
