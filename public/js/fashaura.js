'use strict';
/* Fashion set auras: the fashion box now gives a whole themed PACK (8 pieces of one theme). Clothing pieces no longer
   change the hero's look; wearing all 8 pieces of the same theme lights up that theme's own aura (the only thing on a
   hero that glows). Higher-tier sets get denser, brighter auras.
   0 Dragon Knight · twin flame ribbons spiralling up + embers      5 Pirate · orbiting gold coins + sea-foam ripples
   1 Samurai · rotating wind-blade crescents + slash sparks         6 Neon Runner · neon scan rings climbing + glitch bits
   2 Demon Lord · ground shadow-flames + dark orbiting orbs         7 Sakura · petal vortex + blossom ring at the feet
   3 Ice Queen · orbiting ice shards + frost ring + snow            8 Pharaoh · sand vortex + glyph ring + turquoise rays
   4 Celestial · light shaft from above + feather halo + sparkles   9 Void Walker · black-hole disc behind + stars pulled in */
(function (G) {
  const U = G.U, D = G.D, S = G.S, UI = G.UI, W = G.W, SPR = G.SPR; const esc = UI.esc; const TAU = Math.PI * 2;
  const SET_SLOTS = ['f_head', 'f_body', 'f_weapon', 'f_aura', 'f_crown', 'f_mask', 'f_back', 'f_float'];
  D.FASHION_SET_SLOTS = SET_SLOTS;
  const sh = (c, f) => (U.shade ? U.shade(c, f) : c);
  // ---------- set detection ----------
  S.fashionSet = (fa) => { if (!fa) return null; let th = null, tier = 10, n = 0; for (const k of SET_SLOTS) { const it = fa[k]; if (!it) continue; if (th === null) th = it.theme; if (it.theme !== th) return { theme: th, n: 0, full: false }; n++; tier = Math.min(tier, it.tier || 1); }
    return th === null ? null : { theme: th, n, full: n === SET_SLOTS.length, tier }; };
  // ---------- pack from the fashion box ----------
  const PACKN = th => `แพ็กชุดแฟชั่น ${D.FASHION_THEMES[th].th}`;
  // the box gives a PACK item into the bag; open it to get the 8 pieces
  S.fashionPack = (r) => { const th = U.ri(0, D.FASHION_THEMES.length - 1); const pk = { uid: U.uid(), kind: 'fpack', theme: th, tier: r.t, ilv: 1, name: PACKN(th) }; S.addItem(pk, true); return { r, img: UI.itemIcon(pk), n: PACKN(th) + ' (เข้ากระเป๋า)', it: pk }; };
  S.openPack = (pk) => { const s = S.save; const i = s.inv.indexOf(pk); if (i < 0) return 'ไม่พบแพ็กในกระเป๋า'; s.inv.splice(i, 1); const th = pk.theme;
    const items = SET_SLOTS.map(slot => { const it = S.genItem('fashion', pk.tier, 1, { slot, theme: th }); it.theme = th; it.colors = D.FASHION_THEMES[th].c.slice(); return it; }); s.fashion.owned.push(...items); S.persist && S.persist(); return { ok: true, msg: `เปิด${pk.name} ได้ชุดแฟชั่น ${items.length} ชิ้น (ไปที่หน้าแฟชั่น)` }; };
  const DIA = t => ((t || 1) >= 9 ? 2 : 1);
  S.fashionSellDia = (it) => { const s = S.save; const i = s.fashion.owned.indexOf(it); if (i < 0) return 0; if (Object.values(s.fashion.eq).includes(it)) return 0; s.fashion.owned.splice(i, 1); const d = DIA(it.tier); s.diamond = (s.diamond || 0) + d; return d; };
  S.fashionDrop = (it) => { const s = S.save; const i = s.fashion.owned.indexOf(it); if (i < 0 || Object.values(s.fashion.eq).includes(it)) return false; s.fashion.owned.splice(i, 1); return true; };
  // pack icon / detail
  const PI = new Map(); const ic0 = UI.itemIcon; UI.itemIcon = (it) => { if (!it || it.kind !== 'fpack') return ic0(it); const T = D.FASHION_THEMES[it.theme] || D.FASHION_THEMES[0]; const key = it.theme + '|' + it.tier; if (PI.has(key)) return PI.get(key);
    let url = ''; try { url = G.ICONS2 && G.ICONS2.chest ? G.ICONS2.chest(T.c[1], T.c[0]) : ic0({ kind: 'fashion', slot: 'f_body', colors: T.c }); } catch (e) { } PI.set(key, url); return url; };
  const det0 = UI.itemDetail; UI.itemDetail = (it, actions = '') => { if (!it || it.kind !== 'fpack') return det0(it, actions); const T = D.FASHION_THEMES[it.theme]; const inBag = S.save.inv.includes(it);
    return `<div class="idet"><div class="ih"><img src="${UI.itemIcon(it)}" class="t${it.tier}" alt=""><div><b class="tc t${it.tier}">${esc(it.name)}</b><small>ระดับ ${it.tier} · แพ็กชุดแฟชั่น</small></div></div>
      <p>เปิดแล้วได้ชุดแฟชั่นธีม <b>${esc(T.th)}</b> ครบ ${SET_SLOTS.length} ชิ้น: ${SET_SLOTS.map(k => esc((D.FASHION_SLOTS.find(f => f.k === k) || {}).th || k)).join(' · ')}</p><p class="muted">ใส่ครบ ${SET_SLOTS.length} ชิ้นเพื่อเปิดออร่าประจำชุด · แพ็กเทรดได้</p>
      <div class="iact">${inBag ? `<button class="btn primary" data-act="fp-open" data-uid="${it.uid}">🎁 เปิดแพ็ก</button>` : ''}${actions}</div></div>`; };
  // fashion piece detail: sell for diamonds / discard
  const det1 = UI.itemDetail; UI.itemDetail = (it, actions = '') => { let h = det1(it, actions); if (!it || it.kind !== 'fashion' || !S.save || !S.save.fashion.owned.includes(it)) return h; const worn = Object.values(S.save.fashion.eq).includes(it);
    const b = worn ? '<small class="muted">ถอดออกก่อนจึงขายหรือทิ้งได้</small>' : `<button class="btn" data-act="fp-sell" data-uid="${it.uid}">💎 ขาย ${DIA(it.tier)} เพชร</button><button class="btn danger" data-act="fp-drop" data-uid="${it.uid}">🗑 ทิ้ง</button><small class="muted">เทรดได้ที่หน้าต่างเทรด</small>`;
    return h.includes('<div class="iact">') ? h.replace('<div class="iact">', '<div class="iact">' + b) : h + `<div class="iact">${b}</div>`; };
  if (UI.GACHA_BOX && UI.GACHA_BOX.fashion) { UI.GACHA_BOX.fashion.n = 'กล่องแพ็กชุดแฟชั่น'; UI.GACHA_BOX.fashion.d = 'สุ่มได้ชุดแฟชั่นครบชุด 8 ชิ้น 1 ธีม (10 ธีม) · ใส่ครบชุดได้ออร่าประจำชุด'; }
  // ---------- aura renderers: soft light (device px; X,Y = feet; H = hero height) ----------
  const dot = (O, x, y, r, c, al) => { const g = O.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, '#ffffff' + Math.round(al * 255).toString(16).padStart(2, '0')); g.addColorStop(0.3, c + Math.round(al * 0.8 * 255).toString(16).padStart(2, '0')); g.addColorStop(1, c + '00'); O.fillStyle = g; O.beginPath(); O.arc(x, y, r, 0, TAU); O.fill(); };
  const haze = (O, x, y, rx, ry, c, al) => { O.save(); O.translate(x, y); O.scale(1, ry / rx); const g = O.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, c + Math.round(al * 255).toString(16).padStart(2, '0')); g.addColorStop(1, c + '00'); O.fillStyle = g; O.beginPath(); O.arc(0, 0, rx, 0, TAU); O.fill(); O.restore(); };
  const hx = (c) => (c && c.length === 7 ? c : '#ffffff');
  const rise = (O, X, Y, H, t, n, c, sp, spread, size, al) => { for (let i = 0; i < n; i++) { const ph = (t * sp + i * 0.618) % 1; const px = X + Math.sin(i * 2.7 + t * 0.6) * H * spread; const py = Y - ph * H * 1.15; dot(O, px, py, H * size * (0.6 + 0.4 * Math.sin(i)), c, al * Math.sin(ph * Math.PI)); } };
  // body glow colour + soft motif per theme
  const A = [
    { c: '#ffb04a', f(O, X, Y, H, t, q) { rise(O, X, Y, H, t, 6 + q * 3, '#ff8a3a', 0.35, 0.32, 0.03, 0.55); haze(O, X, Y - H * 0.05, H * 0.36, H * 0.1, '#ff7a2a', 0.18); } },
    { c: '#9ad8ff', f(O, X, Y, H, t, q) { O.lineCap = 'round'; for (let i = 0; i < 2 + q; i++) { const an = t * 1.6 + i * 2.1; O.save(); O.translate(X, Y - H * (0.35 + i * 0.22)); O.scale(1, 0.3); O.strokeStyle = '#d8f0ff'; O.globalAlpha = 0.28; O.lineWidth = H * 0.012; O.beginPath(); O.arc(0, 0, H * 0.42, an, an + 1.2); O.stroke(); O.restore(); } } },
    { c: '#d84aff', f(O, X, Y, H, t, q) { for (let i = 0; i < 5 + q * 2; i++) { const ph = (t * 0.25 + i * 0.29) % 1; haze(O, X + Math.sin(i * 1.9 + t) * H * 0.28, Y - ph * H * 1.0, H * 0.08, H * 0.12, '#8a2ad8', 0.22 * Math.sin(ph * Math.PI)); } } },
    { c: '#bff4ff', f(O, X, Y, H, t, q) { rise(O, X, Y, H, -t, 6 + q * 3, '#dff8ff', 0.22, 0.38, 0.022, 0.65); haze(O, X, Y, H * 0.4, H * 0.12, '#bfefff', 0.18); } },
    { c: '#fff0c0', f(O, X, Y, H, t, q) { const g = O.createLinearGradient(0, Y - H * 1.5, 0, Y); g.addColorStop(0, '#fff6d000'); g.addColorStop(0.55, '#fff6d02a'); g.addColorStop(1, '#fff6d000'); O.fillStyle = g; O.fillRect(X - H * 0.24, Y - H * 1.5, H * 0.48, H * 1.5); rise(O, X, Y, H, t, 5 + q * 3, '#fff2b0', 0.18, 0.36, 0.025, 0.6); } },
    { c: '#7fe0ff', f(O, X, Y, H, t, q) { O.save(); O.translate(X, Y); O.scale(1, 0.3); for (let i = 0; i < 2; i++) { const ph = (t * 0.4 + i / 2) % 1; O.strokeStyle = '#bfefff'; O.globalAlpha = 0.35 * (1 - ph); O.lineWidth = H * 0.012; O.beginPath(); O.arc(0, 0, H * (0.2 + ph * 0.35), 0, TAU); O.stroke(); } O.restore(); rise(O, X, Y, H, t, 3 + q * 2, '#ffd84a', 0.3, 0.34, 0.02, 0.6); } },
    { c: '#4affd8', f(O, X, Y, H, t, q) { const ph = (t * 0.45) % 1; O.save(); O.translate(X, Y - ph * H * 1.1); O.scale(1, 0.3); O.strokeStyle = '#7affe8'; O.globalAlpha = 0.35 * Math.sin(ph * Math.PI); O.lineWidth = H * 0.012; O.beginPath(); O.arc(0, 0, H * 0.38, 0, TAU); O.stroke(); O.restore(); rise(O, X, Y, H, t, 3 + q * 2, '#ff6ae0', 0.4, 0.35, 0.018, 0.55); } },
    { c: '#ffb8d8', f(O, X, Y, H, t, q) { for (let i = 0; i < 6 + q * 3; i++) { const k = (t * 0.18 + i * 0.137) % 1; const an = k * TAU * 1.5 + i; const px = X + Math.cos(an) * H * (0.28 + k * 0.15), py = Y - H * 1.15 + k * H * 1.15; O.save(); O.translate(px, py); O.rotate(t * 1.5 + i); O.fillStyle = '#ffc8dc'; O.globalAlpha = 0.6 * Math.sin(k * Math.PI); O.beginPath(); O.ellipse(0, 0, H * 0.024, H * 0.012, 0, 0, TAU); O.fill(); O.restore(); } } },
    { c: '#ffd88a', f(O, X, Y, H, t, q) { for (let i = 0; i < 8 + q * 4; i++) { const k = (t * 0.3 + i * 0.081) % 1; const an = k * TAU * 2 + i * 0.5; dot(O, X + Math.cos(an) * H * (0.2 + k * 0.22), Y - k * H, H * 0.016, '#ffe8a8', 0.55 * (1 - k)); } haze(O, X, Y, H * 0.36, H * 0.1, '#4ac8d8', 0.14); } },
    { c: '#b48aff', f(O, X, Y, H, t, q) { for (let i = 0; i < 7 + q * 3; i++) { const k = 1 - ((t * 0.3 + i * 0.137) % 1); const an = i * 2.39 + k * 2; dot(O, X + Math.cos(an) * H * 0.55 * k, Y - H * 0.55 + Math.sin(an) * H * 0.4 * k, H * 0.015, '#e0d0ff', 0.6 * (1 - k * 0.6)); } haze(O, X, Y - H * 0.55, H * 0.32, H * 0.32, '#1a0830', 0.25); } }
  ];
  // silhouette glow (cached per sprite frame + colour): tint the frame, blur it, add it as light around the body
  const SIL = new WeakMap();
  const silOf = (cv, col) => { let m = SIL.get(cv); if (!m) { m = new Map(); SIL.set(cv, m); } let g = m.get(col); if (g) return g; const p = Math.round(cv.height * 0.22); const [c, x] = SPR.mk(cv.width + p * 2, cv.height + p * 2); x.drawImage(cv, p, p); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
    const blur = G.FASHFX && G.FASHFX.glowOf ? G.FASHFX.glowOf(c, 0.1) : c; g = { cv: blur, p }; m.set(col, g); return g; };
  G.FASHAURA = {
    // inside the hero's local transform (feet at 0,0): soft body light behind the sprite
    body(O, u, fa, frameCv, ax, dw, dh, t) { const st = S.fashionSet(fa); if (!st || !st.full) return; const au = A[st.theme % A.length]; const g = silOf(frameCv, au.c); const sc = dw / frameCv.width; const pulse = 0.55 + 0.15 * Math.sin(t * 2.2) + (st.tier >= 8 ? 0.15 : 0);
      O.save(); O.globalCompositeOperation = 'lighter'; O.globalAlpha = pulse; const p = g.p * sc; O.drawImage(g.cv, -ax - p, -dh - p, dw + p * 2, dh + p * 2); O.globalAlpha = pulse * 0.6; const k = 1.08; O.drawImage(g.cv, -ax * k - p * k, -dh * k - p * k + dh * 0.04, (dw + p * 2) * k, (dh + p * 2) * k); O.restore(); },
    draw(which, O, u, fa, X, Y, H, t) { if (which !== 'front') return; const st = S.fashionSet(fa); if (!st || !st.full) return; const au = A[st.theme % A.length]; const q = st.tier >= 8 ? 2 : st.tier >= 5 ? 1 : 0;
      O.save(); O.globalCompositeOperation = 'lighter'; try { au.f(O, X, Y, H, t, q); } catch (e) { } O.restore(); }
  };
  // ---------- fashion window: set progress banner ----------
  const fr0 = UI.PANELS.fashion && UI.PANELS.fashion.render; if (fr0) UI.PANELS.fashion.render = function (tab, P) { const h = fr0.call(this, tab, P); if (tab && tab !== 'wear') return h; const s = S.save; const st = S.fashionSet(s.fashion.eq);
    const T = st ? D.FASHION_THEMES[st.theme] : null; const n = st ? st.n : 0;
    const ban = `<div class="fsetban ${st && st.full ? 'full' : ''}"><b>${st && st.full ? `✦ ชุด ${esc(T.th)} ครบ ${SET_SLOTS.length} ชิ้น — ออร่า${esc(T.th)} ทำงาน` : st ? `ชุด ${esc(T.th)} ${n}/${SET_SLOTS.length} ชิ้น` : 'ยังไม่ได้ใส่ชุดแฟชั่น'}</b><small>ใส่ชุดแฟชั่นธีมเดียวกันครบ ${SET_SLOTS.length} ช่อง (${SET_SLOTS.map(k => (D.FASHION_SLOTS.find(f => f.k === k) || {}).th).join(' · ')}) เพื่อเปิดออร่าประจำชุด · ชุดแฟชั่นไม่เปลี่ยนรูปลักษณ์ตัวละคร</small></div>`;
    return ban + h; };
  // wear a whole pack in one click
  S.fashionWearTheme = (th) => { const s = S.save; let n = 0; for (const k of SET_SLOTS) { const it = s.fashion.owned.filter(x => x.slot === k && x.theme === th).sort((a, b) => (b.tier || 0) - (a.tier || 0))[0]; if (it) { s.fashion.eq[k] = it; n++; } } S.refreshPlayer(); S.persist(); return n; };
  const findF = uid => S.save.fashion.owned.find(x => x.uid === uid); const findP = uid => S.save.inv.find(x => x.uid === uid);
  const ax0 = UI.act; UI.act = (el, e) => { const a = el.dataset.act;
    if (a === 'fp-open') { const pk = findP(el.dataset.uid); const r = pk ? S.openPack(pk) : 'ไม่พบแพ็ก'; UI.toast(typeof r === 'string' ? r : r.msg, typeof r === 'string' ? 'bad' : 'good'); if (UI.panel) UI.panel.sel = null; UI.closeModal && !document.querySelector('#modal').hidden && UI.closeModal(); UI.renderPanel(); return; }
    if (a === 'fp-sell') { const it = findF(el.dataset.uid); const d = it ? S.fashionSellDia(it) : 0; UI.toast(d ? `ขาย ${it.name} ได้ ${d} เพชร` : 'ขายไม่ได้ (ถอดออกก่อน)', d ? 'good' : 'bad'); S.persist(); UI.closeModal && UI.closeModal(); UI.renderPanel(); return; }
    if (a === 'fp-drop') { const it = findF(el.dataset.uid); const ok = it && S.fashionDrop(it); UI.toast(ok ? `ทิ้ง ${it.name} แล้ว` : 'ทิ้งไม่ได้ (ถอดออกก่อน)', ok ? 'info' : 'bad'); S.persist(); UI.closeModal && UI.closeModal(); UI.renderPanel(); return; }
    if (a === 'fp-sellall') { const P = UI.panel; const L = sellable(P); if (!L.length) { UI.toast('ไม่มีชุดที่ขายได้ (ชิ้นที่สวมอยู่ขายไม่ได้)', 'info'); return; }
      UI.modal(`<h2>ขายทั้งหมด?</h2><p>ขายชุดแฟชั่นที่ไม่ได้สวมใส่ ${L.length} ชิ้น${P.fcat && P.fcat !== 'all' ? ' (เฉพาะหมวดนี้)' : ''} ได้ <b>${L.reduce((a, it) => a + DIA(it.tier), 0)} เพชร</b></p><div class="list"><button class="btn primary" data-act="fp-sellall-ok">ยืนยันขาย</button><button class="btn" data-act="x-close">ยกเลิก</button></div>`); return; }
    if (a === 'fp-sellall-ok') { const L = sellable(UI.panel); let d = 0; for (const it of L) d += S.fashionSellDia(it); UI.panel.fpick = []; S.persist(); UI.closeModal && UI.closeModal(); UI.toast(`ขายชุดแฟชั่น ${L.length} ชิ้น ได้ ${d} เพชร`, 'good'); UI.renderPanel(); return; }
    if (a === 'fp-mode') { UI.panel.fman = !UI.panel.fman; UI.panel.fpick = []; UI.renderPanel(); return; }
    if (a === 'fp-pick') { const P = UI.panel; P.fpick = P.fpick || []; const i = P.fpick.indexOf(el.dataset.uid); if (i >= 0) P.fpick.splice(i, 1); else P.fpick.push(el.dataset.uid); UI.renderPanel(); return; }
    if (a === 'fp-sellsel' || a === 'fp-dropsel') { const P = UI.panel; let n = 0, d = 0; for (const uid of P.fpick || []) { const it = findF(uid); if (!it) continue; if (a === 'fp-sellsel') { const v = S.fashionSellDia(it); if (v) { d += v; n++; } } else if (S.fashionDrop(it)) n++; } P.fpick = []; S.persist(); UI.toast(a === 'fp-sellsel' ? `ขาย ${n} ชิ้น ได้ ${d} เพชร` : `ทิ้ง ${n} ชิ้น`, n ? 'good' : 'info'); UI.renderPanel(); return; }
    return ax0(el, e); };
  // wardrobe manage mode: select pieces to sell for diamonds / discard
  const sellable = (P) => { const s = S.save; const eqd = new Set(Object.values(s.fashion.eq).filter(Boolean)); return s.fashion.owned.filter(it => !eqd.has(it) && !it.lock && (!P || !P.fcat || P.fcat === 'all' || it.slot === P.fcat)); };
  const fr2 = UI.PANELS.fashion && UI.PANELS.fashion.render; if (fr2) UI.PANELS.fashion.render = function (tab, P) { let h = fr2.call(this, tab, P); if (tab && tab !== 'wear') return h; const s = S.save; const eqd = new Set(Object.values(s.fashion.eq).filter(Boolean)); P.fpick = P.fpick || [];
    const tgl = `<button class="btn ${P.fman ? 'primary' : ''}" data-act="fp-mode">${P.fman ? '✔ เสร็จ' : '💎 ขาย/ทิ้ง'}</button>`;
    h = h.replace(/(<div class="f2top">[\s\S]*?)(<\/div>)/, (m, x, y) => x + tgl + y);
    if (!P.fman) return h; const sel = P.fpick.map(findF).filter(Boolean); const dia = sel.reduce((a, it) => a + DIA(it.tier), 0);
    h = h.replace(/data-act="f2-wear" data-uid="([^"]+)"/g, (m, uid) => `data-act="fp-pick" data-uid="${uid}"${P.fpick.includes(uid) ? ' data-picked="1"' : ''}`);
    h = h.replace(/(<div class="chips f2cats">)/, `<div class="fpbar"><b>เลือก ${sel.length} ชิ้น</b><button class="btn primary" data-act="fp-sellsel" ${sel.length ? '' : 'disabled'}>💎 ขาย ${dia} เพชร</button><button class="btn danger" data-act="fp-dropsel" ${sel.length ? '' : 'disabled'}>🗑 ทิ้ง</button><button class="btn" data-act="fp-sellall">💰 ขายทั้งหมด${P.fcat && P.fcat !== 'all' ? 'ในหมวดนี้' : ''} (${sellable(P).length} ชิ้น · ${sellable(P).reduce((a, it) => a + DIA(it.tier), 0)} เพชร)</button><small class="muted">ชิ้นที่สวมอยู่ขาย/ทิ้งไม่ได้</small></div>$1`);
    return h; };
  const a0 = UI.act; UI.act = (el, e) => { if (el.dataset.act === 'fs-wear') { const n = S.fashionWearTheme(+el.dataset.v); UI.toast(`สวมชุด ${D.FASHION_THEMES[+el.dataset.v].th} ${n}/${SET_SLOTS.length} ชิ้น`, n === SET_SLOTS.length ? 'good' : 'info'); UI.renderPanel(); return; } return a0(el, e); };
  const fr1 = UI.PANELS.fashion && UI.PANELS.fashion.render; if (fr1) UI.PANELS.fashion.render = function (tab, P) { const h = fr1.call(this, tab, P); if (tab && tab !== 'wear') return h; const s = S.save;
    const own = D.FASHION_THEMES.map((T, i) => [i, T, new Set(s.fashion.owned.filter(x => x.theme === i && SET_SLOTS.includes(x.slot)).map(x => x.slot)).size]).filter(x => x[2] > 0);
    if (!own.length) return h; return h.replace('</small></div>', `</small><div class="fsets">${own.map(([i, T, c]) => `<button class="chip ${c === SET_SLOTS.length ? 'on' : ''}" data-act="fs-wear" data-v="${i}" style="--sc:${T.c[1]}">${esc(T.th)} ${c}/${SET_SLOTS.length}</button>`).join('')}</div></div>`); };

  // ---------- live preview in the fashion window: hero + wings + circles + set aura, animated ----------
  let pvRAF = 0; const PV = { view: 'front', walk: false };
  const pvLoop = () => { const cv = document.getElementById('fprev2'); if (!cv) { pvRAF = 0; return; } pvRAF = requestAnimationFrame(pvLoop); const HS = G.HEROSPR; const s = S.save; if (!HS || !s) return; const cls = s.cls; if (!HS.ready(cls)) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1); const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return; if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const O = cv.getContext('2d'); O.setTransform(1, 0, 0, 1, 0, 0); O.clearRect(0, 0, cv.width, cv.height); const t = performance.now() / 1000; const H = cv.height * 0.5; const X = cv.width / 2, Y = cv.height * 0.8; const fa = s.fashion.eq;
    const v = PV.view; const ab = Math.floor(t * 8) % 4; const nm = PV.walk ? (ab === 0 ? `walk_${v}_a` : ab === 2 ? `walk_${v}_b` : `idle_${v}`) : `idle_${v}`; const f = HS.FI[cls][nm] || HS.FI[cls].idle_front; const flip = false;
    const k = Math.max(1, Math.round(H / HS.HT * 4) / 4); const sp = HS.scaled(cls, f, k); const sc = H / (HS.HT * k); const dw = sp.w * sc, dh = sp.h * sc, ax = sp.ax * sc;
    O.save(); O.globalAlpha = 0.35; O.fillStyle = '#000'; O.beginPath(); O.ellipse(X, Y, H * 0.22, H * 0.06, 0, 0, Math.PI * 2); O.fill(); O.restore();
    try { G.FASHFX && G.FASHFX.behind(O, null, fa, X, Y, H, v, flip, t); } catch (e) { }
    O.save(); O.translate(X, Y); try { G.FASHAURA.body(O, null, fa, sp.cv, ax, dw, dh, t); } catch (e) { } O.globalCompositeOperation = 'source-over'; O.globalAlpha = 1; O.imageSmoothingEnabled = true; O.drawImage(sp.cv, -ax, -dh, dw, dh); O.restore();
    try { G.FASHFX && G.FASHFX.front(O, null, fa, X, Y, H, v, flip, t); G.FASHAURA.draw('front', O, null, fa, X, Y, H, t); } catch (e) { } };
  const fr3 = UI.PANELS.fashion && UI.PANELS.fashion.render; if (fr3) UI.PANELS.fashion.render = function (tab, P) { let h = fr3.call(this, tab, P); if (tab && tab !== 'wear') return h;
    const btn = (k, n) => `<button class="chip ${PV.view === k ? 'on' : ''}" data-act="fpv-view" data-v="${k}">${n}</button>`;
    h = h.replace(/<img class="dbody"[^>]*>/g, '').replace(/<div class="dped"><\/div>/, `<canvas id="fprev2" class="fprev"></canvas><div class="fpvb">${btn('front', 'หน้า')}${btn('left', 'ข้าง')}${btn('back', 'หลัง')}<button class="chip ${PV.walk ? 'on' : ''}" data-act="fpv-walk">${PV.walk ? 'เดิน' : 'ยืน'}</button></div>`);
    if (!pvRAF) setTimeout(() => { if (!pvRAF) pvLoop(); }, 0); return h; };
  const ax9 = UI.act; UI.act = (el, e) => { const a = el.dataset.act; if (a === 'fpv-view') { PV.view = el.dataset.v; UI.renderPanel(); return; } if (a === 'fpv-walk') { PV.walk = !PV.walk; UI.renderPanel(); return; } return ax9(el, e); };
  const css2 = document.createElement('style'); css2.textContent = `.f2page .dbody,.f2page .dped{display:none!important}.fprev{display:block;width:100%;max-width:260px;height:260px;margin:0 auto}.fpvb{display:flex;justify-content:center;gap:4px;margin-top:2px}.fpvb .chip{padding:2px 8px;font-size:11px}`; document.head.appendChild(css2);
  const css = document.createElement('style'); css.textContent = `.fsetban{margin:0 0 8px;padding:8px 10px;border:1px solid #4a3c22;border-radius:8px;background:linear-gradient(90deg,#1c160f,#110d09)}.fsetban b{display:block;color:#d8c8a0}.fsetban.full{border-color:#f2d27a;box-shadow:0 0 12px rgba(242,210,122,.3)}.fsetban.full b{color:#ffe9a8}.fsetban small{color:#9a8a6a;font-size:11px}.fsets{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}.fsets .chip{border-color:var(--sc)}.fpbar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:4px 0;padding:6px;border:1px dashed #a8843a;border-radius:8px}.f2r [data-picked]{box-shadow:0 0 0 2px #4affd8,0 0 10px rgba(74,255,216,.5)!important}`;
  document.head.appendChild(css);
})(window.G);
