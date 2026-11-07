'use strict';
/* 6 character slots: slot-select title screen, per-slot saves, migration from the single old save */
(function (G) {
  const U = G.U, D = G.D, S = G.S, UI = G.UI, W = G.W;
  const $ = s => document.querySelector(s), esc = UI.esc;
  const OLD = 'ashfall_save_v1', BASE = 'ashfall_slots_v2', N = 6; let KEY = BASE;
  const migrateAcc = () => { try { if (KEY !== BASE) return; const cur = JSON.parse(localStorage.getItem(BASE) || 'null'); if (cur && Array.isArray(cur.slots) && cur.slots.some(Boolean)) return; let best = null, bn = 0; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!k || !k.startsWith(BASE + '@')) continue; const o = JSON.parse(localStorage.getItem(k) || 'null'); const n = o && Array.isArray(o.slots) ? o.slots.filter(Boolean).length : 0; if (n > bn) { bn = n; best = k; } } if (best) localStorage.setItem(BASE, localStorage.getItem(best)); } catch (e) { } };
  const read = () => { migrateAcc(); try { if (KEY !== BASE && !localStorage.getItem(KEY) && localStorage.getItem(BASE) && !localStorage.getItem('ashfall_legacy_claimed')) { localStorage.setItem(KEY, localStorage.getItem(BASE)); localStorage.setItem('ashfall_legacy_claimed', KEY); } } catch (e) { } try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && Array.isArray(o.slots)) { while (o.slots.length < N) o.slots.push(null); return o; } } catch (e) { } const o = { active: 0, slots: Array(N).fill(null) }; try { const old = JSON.parse(localStorage.getItem(OLD) || 'null'); if (KEY === BASE && old && old.cls) o.slots[0] = old; } catch (e) { } return o; };
  const write = o => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { UI.toast && UI.toast('บันทึกไม่สำเร็จ (พื้นที่เบราว์เซอร์เต็ม)', 'bad'); } };
  let ST = read(); write(ST);
  // per account + server character storage (login screen)
  S.useSlots = (k) => { KEY = k ? BASE + '@' + k : BASE; ST = read(); write(ST); SEL = null; };
  S.slots = () => ST.slots; S.activeSlot = () => ST.active;
  S.load = () => ST.slots[ST.active] || null;
  S.persist = () => { if (!S.save) return; S.save.lastPlayed = Date.now(); ST.slots[ST.active] = S.save; write(ST); };
  S.importSave = (txt) => { const o = JSON.parse(txt); if (!o || !o.cls) throw new Error('bad'); S.save = o; S.persist(); };

  const TOTAL = 15; let SEL = null;
  const mapName = sv => { const t = (D.TOWNS || []).find(x => x.id === sv.lastTown); return t ? t.n : 'Haven'; };
  const card = (i) => {
    const sv = i < N ? ST.slots[i] : null;
    if (i >= N) return `<div class="slot locked" aria-disabled="true"><span class="sllock">🔒</span><small>ยังไม่ปลดล็อก</small></div>`;
    if (!sv) return `<button class="slot empty" data-act="sl-new" data-i="${i}"><span class="sltag">สร้างตัวละคร</span><span class="slplus">＋</span><small>สล็อต ${i + 1}</small></button>`;
    const c = D.CLS[sv.cls] || D.CLASSES[0];
    return `<button class="slot char ${SEL === i ? 'on' : ''}" data-act="sl-sel" data-i="${i}"><img src="${UI.bodyURL(sv.cls, sv.fashion && sv.fashion.eq)}" alt=""><span class="slped"></span><b>${esc(sv.name)}</b><small>Lv ${sv.lvl} ${esc(c.name)}</small></button>`;
  };
  const info = () => {
    const sv = SEL !== null ? ST.slots[SEL] : null;
    if (!sv) return `<div class="slinfo"><p class="muted">เลือกตัวละครทางซ้าย หรือกด ＋ เพื่อสร้างใหม่</p>${UI._trash ? `<button class="btn" data-act="sl-restore">กู้คืนตัวละคร (${esc(UI._trash.sv.name)})</button>` : ''}</div>`;
    const c = D.CLS[sv.cls]; const st = G.E.finalize(G.E.baseStats(sv.cls, sv.lvl)); const need = S.xpNeed(sv.lvl);
    const rows = [['แผนที่', mapName(sv)], ['อาชีพ', c.name + ' · ' + c.th], ['เลเวล', sv.lvl], ['EXP', sv.lvl >= D.MAX_LV ? 'MAX' : (100 * sv.xp / need).toFixed(1) + '%'], ['HP', U.fmt(st.hp)], [c.res, c.build ? '0 (สะสม)' : '100'], ['ATK', U.fmt(st.atk)], ['DEF', U.fmt(st.def)], ['คริ', st.crit + '%'], ['ระยะ', c.rng + ' ช่อง'], ['บทบาท', D.ROLES[c.role].th], ['ทอง', U.fmt(sv.gold)], ['กิลด์', sv.guild ? sv.guild.name : '-']];
    return `<div class="slinfo"><table class="sltbl">${rows.map(([a, b]) => `<tr><th>${esc(a)}</th><td>${esc(String(b))}</td></tr>`).join('')}</table>
      <div class="slbtns">${UI._slAsk === SEL && ST.slots[SEL] ? `<div class="sldel"><b>ยืนยันลบ ${esc(ST.slots[SEL].name)}?</b><span>Lv ${ST.slots[SEL].lvl} ${esc(D.CLS[ST.slots[SEL].cls].name)} · สล็อต ${SEL + 1}<br>กู้คืนได้เฉพาะตัวล่าสุดที่ลบ ก่อนปิดเกม</span><div><button class="btn danger" data-act="sl-delyes">ลบเลย</button><button class="btn" data-act="sl-delno">ยกเลิก</button></div></div>` : `<button class="btn" data-act="sl-del" data-i="${SEL}">ลบตัวละคร</button>`}<button class="btn" data-act="sl-restore" ${UI._trash ? '' : 'disabled'}>กู้คืนตัวละคร</button></div>
      <button class="slstart" data-act="sl-play" data-i="${SEL}">เริ่มเกม</button></div>`;
  };
  UI.showTitle = () => {
    const t = $('#title-screen'); t.hidden = false; $('#hud').hidden = true; ST = read();
    if (SEL === null || !ST.slots[SEL]) { SEL = ST.slots[ST.active] ? ST.active : ST.slots.findIndex(Boolean); if (SEL < 0) SEL = null; }
    const used = ST.slots.filter(Boolean).length;
    t.innerHTML = `<div class="title-wrap slots-wrap"><div class="logo small"><span class="l1">ASHFALL</span><span class="l2">ONLINE</span></div>
      <div class="create rocreate slotwin"><div class="rohead"><span class="pemb"><img src="${UI.menuIcon('char')}" alt=""></span><b>เลือกตัวละคร</b><small>${used}/${N} ตัวละคร · ใช้ได้ ${N} สล็อต จาก ${TOTAL}</small></div>
      <div class="slotlay"><div class="slotgrid">${Array.from({ length: TOTAL }, (_, i) => card(i)).join('')}</div>${info()}</div>
      <p class="muted">เล่นออฟไลน์ในเบราว์เซอร์ · ผู้เล่นอื่นเป็น AI · แต่ละตัวละครมีเลเวล กระเป๋า กิลด์ และเซฟแยกกัน</p></div></div>`;
  };
  const sw0 = UI.showCreate; UI.showCreate = () => { sw0(); const h = $('#title-screen .rohead'); if (h && !h.querySelector('.slback')) h.insertAdjacentHTML('beforeend', `<button class="btn slback" data-act="sl-back">← กลับไปเลือกสล็อต (สร้างที่สล็อต ${ST.active + 1})</button>`); };
  const act0 = UI.act;
  UI.act = (el, e) => {
    const a = el.dataset.act; if (!a || !a.startsWith('sl-')) return act0(el, e); const i = +el.dataset.i;
    switch (a) {
      case 'sl-play': ST.active = i; write(ST); S.save = ST.slots[i]; S.goTown(S.save.lastTown || 'haven'); return;
      case 'sl-new': ST.active = i; write(ST); UI.showCreate(); return;
      case 'sl-back': UI.showTitle(); return;
      case 'sl-sel': SEL = i; UI.showTitle(); return;
      case 'sl-restore': { const T = UI._trash; if (!T) return; const k = ST.slots[T.i] ? ST.slots.findIndex(x => !x) : T.i; if (k < 0) { UI.toast('สล็อตเต็ม ลบตัวละครอื่นก่อน', 'bad'); return; } ST.slots[k] = T.sv; write(ST); UI._trash = null; SEL = k; UI.showTitle(); UI.toast(`กู้คืน ${T.sv.name} แล้ว`, 'good'); return; }
      case 'sl-del': { UI._slAsk = i; UI.showTitle(); return; }
      case 'sl-delyes': { const di = UI._slAsk; UI._slAsk = null; if (di == null || !ST.slots[di]) return; UI._trash = { i: di, sv: ST.slots[di] }; ST.slots[di] = null; } SEL = null; write(ST); UI.closeModal(); UI.showTitle(); UI.toast('ลบตัวละครแล้ว', 'info'); return;
      case 'sl-delno': UI._slAsk = null; UI.showTitle(); return;
      case 'sl-switch': S.persist(); UI.closePanel(); W.mode = null; W.map = null; W.player = null; S.save = null; UI.showTitle(); return;
    }
  };
  // settings: switch character
  const set0 = UI.PANELS.settings.render; UI.PANELS.settings.render = function (tab, P) { return set0.call(this, tab, P) + `<h4>ตัวละคร</h4><div class="list"><button class="btn" data-act="sl-switch">เปลี่ยนตัวละคร (กลับหน้าเลือกสล็อต ${N} ช่อง)</button></div>`; };
})(window.G);
(function () { const css = document.createElement('style'); css.textContent = `.sldel{border:1px solid #f0a0a8;background:linear-gradient(#fff5f6,#ffe4e7);border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:6px;color:#7a2a34;font-size:13px;text-align:center}
.sldel b{font-size:14px;color:#c0283c}.sldel span{font-size:11.5px;color:#8a5a60;line-height:1.4}.sldel>div{display:flex;gap:8px}.sldel .btn{flex:1}.sldel .btn.danger{background:linear-gradient(#ff7a8a,#e0485c);color:#fff;border-color:#c0283c}`; document.head.appendChild(css); })();
