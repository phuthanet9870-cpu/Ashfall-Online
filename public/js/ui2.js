'use strict';
/* RO-style window shell, icon-based bag, full-body class grids, categorized GM spawner */
(function (G) {
  const U = G.U, D = G.D, S = G.S, UI = G.UI, W = G.W;
  const $ = s => document.querySelector(s), esc = UI.esc;
  const fmt = n => n >= 1e6 ? (Math.floor(n / 1e5) / 10) + 'M' : n >= 1e4 ? (Math.floor(n / 100) / 10) + 'K' : String(Math.floor(n));

  // ---------- window shell ----------
  const pill = (k, v, t) => `<span class="cpill" title="${t}"><img src="${UI.curIcon(k)}" alt="">${fmt(v)}</span>`;
  UI.curPills = () => { const s = S.save; if (!s) return ''; return pill('gold', s.gold, 'ทอง') + pill('honor', s.honor, 'Honor') + pill('war', s.war, 'แต้มสงคราม'); };
  const bodyFix = (root) => root && root.querySelectorAll('.ccard[data-cls] img').forEach(img => { const c = img.closest('.ccard').dataset.cls; img.src = UI.bodyURL(c); });
  const render0 = UI.renderPanel;
  UI.renderPanel = () => {
    render0(); if (!UI.panel) return; const P = UI.PANELS[UI.panel.id];
    const win = $('#panel .pwin'); win.classList.toggle('has-tabs', !!P.tabs); win.dataset.p = UI.panel.id;
    const c = $('#pcur'); if (c) c.innerHTML = UI.curPills();
    const ic = $('#picon'); if (ic) ic.src = UI.menuIcon(UI.panel.id === 'npc' ? 'shop' : UI.panel.id);
    bodyFix($('#pbody'));
  };
  const create0 = UI.showCreate; UI.showCreate = () => { create0(); bodyFix($('#title-screen')); };
  const det0 = UI.renderCreateDetail; UI.renderCreateDetail = () => { det0(); bodyFix($('#title-screen')); };

  // ---------- HUD currency with icons (only rewrite when changed) ----------
  const hud0 = UI.refreshHud;
  UI.refreshHud = (full) => { hud0(full); const s = S.save; const el = $('#curr'); if (!s || !el) return; const k = s.gold + '|' + s.honor + '|' + s.war; if (el._k === k && !full) { if (!el.querySelector('img')) el._k = ''; else return; } el._k = k; el.innerHTML = `<span title="ทอง"><img src="${UI.curIcon('gold')}" alt="">${U.fmt(s.gold)}</span><span title="Honor"><img src="${UI.curIcon('honor')}" alt="">${U.fmt(s.honor)}</span><span title="แต้มสงคราม"><img src="${UI.curIcon('war')}" alt="">${U.fmt(s.war)}</span>`; };

  // ---------- bag tab with icons ----------
  const BAGK = [['hpPot', 'ยา HP', 'ฟื้น HP ทันที [H]'], ['mpPot', 'ยาทรัพยากร', 'ฟื้นทรัพยากร [V]'], ['ret', 'ปีกวาร์ป', 'กลับเมืองหลัก'], ['foodXp', 'เค้ก EXP', 'EXP +50% 30 นาที'], ['foodDrop', 'เนื้อย่างนำโชค', 'อัตราดรอป +30% 30 นาที'], ['protect', 'Protect Scroll', 'กันของแตกเมื่อตีบวกพลาด'], ['reforge', 'Reforge Scroll', 'สุ่มค่ารองใหม่']];
  const CURK = [['gold', 'ทอง'], ['honor', 'Honor'], ['war', 'แต้มสงคราม'], ['runeDust', 'Rune Dust'], ['jewelDust', 'Jewel Dust'], ['thread', 'ด้ายแฟชั่น']];
  UI.BAGK = BAGK; UI.CURK = CURK;
  const card = (img, n, name, t = 1, extra = '', tip = '') => `<div class="bcard t${t}" title="${esc(tip || name)}"><div class="icell t${t}"><img src="${img}" alt=""><span class="qty">${n}</span></div><span>${esc(name)}</span>${extra}</div>`;
  const inv0 = UI.PANELS.inv.render;
  UI.PANELS.inv.render = function (tab, P) {
    if (tab !== 'bag') return inv0.call(this, tab, P);
    const s = S.save, b = s.bag;
    return `<h4>ของใช้</h4><div class="bgrid">${BAGK.map(([k, n, tip]) => card(UI.bagIcon(k), b[k] || 0, n, 3, k.startsWith('food') ? `<button class="mini-btn" data-act="food" data-k="${k}">ใช้</button>` : k === 'ret' ? '<button class="mini-btn" data-act="ret">ใช้</button>' : '', tip)).join('')}</div>
      <h4>หินตีบวก</h4><div class="bgrid">${b.stones.map((n, i) => card(UI.bagIcon('stone', i), n, `หินตีบวก T${i + 1}`, i + 1)).join('')}</div>
      <h4>วัสดุและสกุลเงิน</h4><div class="bgrid">${CURK.map(([k, n]) => card(UI.curIcon(k), fmt(s[k] || 0), n, k === 'gold' ? 8 : k === 'honor' ? 5 : 4)).join('')}</div>
      <h4>สัตว์เลี้ยงและพาหนะ</h4><div class="bgrid">${D.PETS.map(p => card(UI.petIcon(p.k), s.pets && s.pets.includes(p.k) ? '✓' : '—', p.th, s.pets && s.pets.includes(p.k) ? 4 : 1)).join('')}${D.MOUNTS.map(p => card(UI.mountIcon(p.k), s.mounts && s.mounts.includes(p.k) ? '✓' : '—', p.th, s.mounts && s.mounts.includes(p.k) ? 5 : 1)).join('')}</div>`;
  };

  // ---------- GM: categorized spawner + class portrait grid ----------
  const WEAPONS = [...new Set(D.CLASSES.map(c => c.weapon))].map(w => ({ w, cls: D.CLASSES.find(c => c.weapon === w).id }));
  const CATS = [
    ['weapon', 'อาวุธ', () => UI.itemIcon({ slot: 'weapon', wpn: 'sword', tier: 8 })],
    ['armor', 'เกราะ', () => UI.itemIcon({ slot: 'chest', tier: 8 })],
    ['acc', 'เครื่องประดับ', () => UI.itemIcon({ slot: 'ring1', tier: 8 })],
    ['relic', 'Relic', () => UI.itemIcon({ slot: 'relic', tier: 9 })],
    ['rune', 'รูน', () => UI.itemIcon({ kind: 'rune', color: 'red', tier: 6 })],
    ['gem', 'เจม', () => UI.itemIcon({ kind: 'gem', gem: 'ruby', tier: 6 })],
    ['fashion', 'แฟชั่น', () => UI.itemIcon({ kind: 'fashion', slot: 'f_wings', colors: ['#bff4ff', '#4a8aff'] })],
    ['cons', 'ของใช้', () => UI.bagIcon('hpPot')],
    ['stone', 'หินตีบวก', () => UI.bagIcon('stone', 7)],
    ['cur', 'สกุลเงิน', () => UI.curIcon('gold')],
    ['pet', 'สัตว์เลี้ยง', () => UI.petIcon('fox')],
    ['mount', 'พาหนะ', () => UI.mountIcon('griffin')],
    ['srune', 'รูนสกิล', () => UI.bagIcon('srune')]
  ];
  const CUR_AMT = { gold: 100000, honor: 1000, war: 1000, runeDust: 500, jewelDust: 500, thread: 100 };
  const entries = (cat, P) => {
    const t = P.gt, s = S.save;
    switch (cat) {
      case 'weapon': return WEAPONS.map(({ w, cls }) => ({ k: w, n: D.WEAPON_TH[w], img: UI.itemIcon({ slot: 'weapon', wpn: w, tier: t }), t, give: () => { const it = S.genItem('gear', t, P.gilv, { slot: 'weapon', cls, set: P.gset || null, pvp: true }); it.wpn = w; return it; } }));
      case 'armor': return D.GEAR_SLOTS.filter(x => x.k !== 'weapon').map(x => ({ k: x.k, n: x.th, img: UI.itemIcon({ slot: x.k, tier: t }), t, give: () => S.genItem('gear', t, P.gilv, { slot: x.k, set: P.gset || null, pvp: true }) }));
      case 'acc': return D.ACC_SLOTS.filter(x => x.k !== 'earring2' && x.k !== 'ring2').map(x => ({ k: x.k, n: x.th.replace(' 1', ''), img: UI.itemIcon({ slot: x.k, tier: t }), t, give: () => S.genItem('acc', t, P.gilv, { slot: x.k, pvp: true }) }));
      case 'relic': return D.RELICS.map(r => ({ k: r.k, n: r.n, img: UI.itemIcon({ slot: 'relic', relic: r.k, tier: t }), t, give: () => S.genItem('relic', t, P.gilv, { relic: r.k }) }));
      case 'rune': return [...['red', 'blue', 'green'].map(c => ({ k: c, n: 'รูน' + D.RUNE_COLORS[c].th, img: UI.itemIcon({ kind: 'rune', color: c, tier: t }), t, give: () => S.genItem('rune', t, P.gilv, { color: c, pvp: Math.random() < 0.5 }) })), ...D.CORE_RUNES.map(c => ({ k: c.k, n: c.n, img: UI.itemIcon({ kind: 'rune', color: 'core', tier: t }), t, give: () => S.genItem('rune', t, P.gilv, { color: 'core', core: c.k }) }))];
      case 'gem': return D.GEMS.map(g => ({ k: g.k, n: g.th, img: UI.itemIcon({ kind: 'gem', gem: g.k, tier: t }), t, give: () => S.genItem('gem', t, P.gilv, { gem: g.k }) }));
      case 'fashion': { const th = D.FASHION_THEMES[P.gth]; return D.FASHION_SLOTS.map(f => ({ k: f.k, n: f.th, img: UI.itemIcon({ kind: 'fashion', slot: f.k, colors: th.c }), t: 10, give: () => S.genItem('fashion', 10, 1, { slot: f.k, theme: P.gth }) })); }
      case 'cons': return BAGK.map(([k, n]) => ({ k, n, img: UI.bagIcon(k), t: 3, qty: s.bag[k] || 0, bag: true }));
      case 'stone': return s.bag.stones.map((q, i) => ({ k: i, n: `หิน T${i + 1}`, img: UI.bagIcon('stone', i), t: i + 1, qty: q, stone: true }));
      case 'cur': return CURK.map(([k, n]) => ({ k, n: `${n} +${fmt(CUR_AMT[k] * P.gn)}`, img: UI.curIcon(k), t: 8, qty: fmt(s[k] || 0), cur: true }));
      case 'pet': return D.PETS.map(p => ({ k: p.k, n: p.th, img: UI.petIcon(p.k), t: (s.pets || []).includes(p.k) ? 5 : 1, qty: (s.pets || []).includes(p.k) ? '✓' : '', pet: true }));
      case 'mount': return D.MOUNTS.map(p => ({ k: p.k, n: p.th, img: UI.mountIcon(p.k), t: (s.mounts || []).includes(p.k) ? 5 : 1, qty: (s.mounts || []).includes(p.k) ? '✓' : '', mount: true }));
      case 'srune': { const cls = D.CLS[s.cls]; const out = []; cls.skills.forEach((sk, i) => [1, 2, 3].forEach(v => { const own = s.ownedSR[s.cls + '_' + i + '_' + v]; out.push({ k: i + '_' + v, n: `${sk.name} · ${D.VARIANTS[v].th}`, img: UI.skillIcon(D.applyVariant(sk, v)), t: own ? 6 : 2, qty: own ? '✓' : '', sr: true }); })); return out; }
    }
    return [];
  };
  const gmItem = (P) => {
    P.gcat = P.gcat || 'weapon'; P.gt = P.gt || 10; P.gilv = P.gilv || 100; P.gn = P.gn || 1; P.gth = P.gth ?? 0;
    const list = entries(P.gcat, P);
    const tierRow = ['weapon', 'armor', 'acc', 'relic', 'rune', 'gem'].includes(P.gcat) ? `<div class="gmrow"><b>ระดับ</b>${D.TIERS.map((T, i) => `<button class="tchip t${i + 1} ${P.gt === i + 1 ? 'on' : ''}" data-act="gm" data-c="gmset" data-f="gt" data-v="${i + 1}" title="${esc(T.n)}">${i + 1}</button>`).join('')}<label class="ilvl">iLv <input type="number" id="gmilv2" value="${P.gilv}" min="1" max="100"></label></div>` : '';
    const setRow = ['weapon', 'armor'].includes(P.gcat) ? `<div class="gmrow"><b>เซ็ต</b><button class="chip ${!P.gset ? 'on' : ''}" data-act="gm" data-c="gmset" data-f="gset" data-v="">สุ่ม</button>${D.GEAR_SETS.map(x => `<button class="chip ${P.gset === x.k ? 'on' : ''}" data-act="gm" data-c="gmset" data-f="gset" data-v="${x.k}">${esc(x.n)}</button>`).join('')}</div>` : '';
    const themeRow = P.gcat === 'fashion' ? `<div class="gmrow"><b>ธีม</b>${D.FASHION_THEMES.map((T, i) => `<button class="chip ${P.gth === i ? 'on' : ''}" data-act="gm" data-c="gmset" data-f="gth" data-v="${i}"><i class="sw" style="background:linear-gradient(90deg,${T.c[0]} 50%,${T.c[1]} 50%)"></i>${esc(T.th)}</button>`).join('')}</div>` : '';
    const qtyRow = ['pet', 'mount', 'srune'].includes(P.gcat) ? '' : `<div class="gmrow"><b>จำนวน</b>${[1, 5, 10, 50].map(n => `<button class="chip ${P.gn === n ? 'on' : ''}" data-act="gm" data-c="gmset" data-f="gn" data-v="${n}">×${n}</button>`).join('')}</div>`;
    return `<div class="gmspawn"><div class="gmcats">${CATS.map(([k, n, ic]) => `<button class="gcat ${P.gcat === k ? 'on' : ''}" data-act="gm" data-c="gmset" data-f="gcat" data-v="${k}"><img src="${ic()}" alt="">${n}</button>`).join('')}</div>
      <div class="gmmain">${tierRow}${setRow}${themeRow}${qtyRow}
        <p class="muted">คลิกไอคอนเพื่อเสกเข้ากระเป๋าทันที${['pet', 'mount', 'srune'].includes(P.gcat) ? ' (ปลดล็อก)' : ''}${P.gcat === 'srune' ? ` · รูนสกิลของคลาส ${D.CLS[S.save.cls].name}` : ''}</p>
        <div class="gmgrid">${list.map(e => `<button class="gcell" data-act="gm" data-c="gmgive" data-k="${e.k}"><div class="icell t${e.t}"><img src="${e.img}" alt="">${e.qty !== undefined && e.qty !== '' ? `<span class="qty">${e.qty}</span>` : ''}</div><span>${esc(e.n)}</span></button>`).join('')}</div>
        ${P.gcat === 'srune' ? '<button class="btn" data-act="gm" data-c="gmsrall">ปลดล็อกรูนสกิลทั้ง 72 ของคลาสนี้</button>' : ''}
        <h4>ชุดด่วน</h4><div class="list"><button class="btn" data-act="gm" data-c="kit">ชุดเต็ม 18 ช่อง (ระดับ ${P.gt})</button><button class="btn" data-act="gm" data-c="runekit">รูนเต็มแผง</button><button class="btn" data-act="gm" data-c="fashkit">แฟชั่นทุกช่อง</button><button class="btn" data-act="gm" data-c="dropground">ทิ้งไอเทมทุกระดับลงพื้น</button><button class="btn danger" data-act="gm" data-c="clearinv">ล้างกระเป๋า</button></div>
        <input type="hidden" id="gmtier" value="${P.gt}"><input type="hidden" id="gmilv" value="${P.gilv}"></div></div>`;
  };
  const gmClassGrid = () => { const s = S.save; return `<h4>เปลี่ยนคลาส — คลิกที่ตัวละคร (${D.CLASSES.length} คลาส)</h4><div class="cgrid gmcls">${D.CLASSES.map(k => `<button class="ccard ${k.id === s.cls ? 'sel' : ''}" data-cls="${k.id}" data-act="gm" data-c="gmcls"><img src="${UI.bodyURL(k.id)}" alt=""><b>${k.name}</b><small>${k.th}</small><i style="color:${D.ELEM[k.elem].pal[1]}">${D.ROLES[k.role].th} · ${k.rng} ช่อง</i></button>`).join('')}</div>`; };
  const gm0 = UI.gmRender;
  UI.gmRender = (tab, P) => {
    if (tab === 'item') return gmItem(P);
    let h = gm0(tab, P);
    if (tab === 'player') h = h.replace(/<label class="fl">เปลี่ยนคลาส<select id="gmcls">[\s\S]*?<\/select><\/label><button class="btn" data-act="gm" data-c="setcls">เปลี่ยนคลาส<\/button>/, '') + gmClassGrid();
    return h;
  };
  const cmd0 = UI.gmCmd;
  UI.gmCmd = (c, el) => {
    const P = UI.panel, s = S.save;
    if (c === 'gmset') { const f = el.dataset.f, v = el.dataset.v; const iv = $('#gmilv2'); if (iv) P.gilv = U.clamp(+iv.value || 100, 1, 100); P[f] = f === 'gcat' || f === 'gset' ? v : +v; UI.renderPanel(); return; }
    if (c === 'gmcls') { S.changeClass(el.dataset.cls); UI.toast(`เปลี่ยนเป็น ${D.CLS[el.dataset.cls].name}`, 'good'); UI.renderPanel(); return; }
    if (c === 'gmsrall') { for (let i = 0; i < D.NSK - 1; i++) for (let v = 1; v <= 3; v++) s.ownedSR[s.cls + '_' + i + '_' + v] = true; UI.toast('ปลดล็อกรูนสกิลทั้งหมดแล้ว', 'good'); UI.renderPanel(); return; }
    if (c === 'gmgive') {
      const iv = $('#gmilv2'); if (iv) P.gilv = U.clamp(+iv.value || 100, 1, 100);
      const e = entries(P.gcat, P).find(x => String(x.k) === el.dataset.k); if (!e) return; const n = P.gn || 1;
      if (e.give) { let last; for (let i = 0; i < n; i++) { last = e.give(); S.addItem(last, true); } UI.toast(`GM: ได้รับ ${last.name}${n > 1 ? ' ×' + n : ''}`, 'item', last.tier); }
      else if (e.bag) { s.bag[e.k] = (s.bag[e.k] || 0) + n * 10; UI.toast(`GM: ${e.n} +${n * 10}`, 'good'); }
      else if (e.stone) { s.bag.stones[e.k] += n * 10; UI.toast(`GM: ${e.n} +${n * 10}`, 'good'); }
      else if (e.cur) { s[e.k] = (s[e.k] || 0) + CUR_AMT[e.k] * n; UI.toast(`GM: ${e.n}`, 'good'); }
      else if (e.pet) { s.pets = s.pets || []; if (!s.pets.includes(e.k)) s.pets.push(e.k); UI.toast(`GM: ได้รับสัตว์เลี้ยง ${e.n}`, 'good'); }
      else if (e.mount) { s.mounts = s.mounts || []; if (!s.mounts.includes(e.k)) s.mounts.push(e.k); UI.toast(`GM: ได้รับพาหนะ ${e.n}`, 'good'); }
      else if (e.sr) { s.ownedSR[s.cls + '_' + e.k] = true; UI.toast(`GM: ปลดล็อกรูนสกิล ${e.n}`, 'good'); }
      if (S.refreshPlayer) try { S.refreshPlayer(); } catch (er) { }
      UI.renderPanel(); return;
    }
    return cmd0(c, el);
  };
})(window.G);
