'use strict';
/* RO-style page layouts: inventory (doll + grid), class select (list / pedestal / radar), gear+rune page, shop cards, enhance/refine page */
(function (G) {
  const U = G.U, D = G.D, S = G.S, UI = G.UI, W = G.W, SPR = G.SPR;
  const $ = s => document.querySelector(s), esc = UI.esc;
  const cell = (it, act, extra = '') => UI.itemCell(it, act, extra);
  const LEFT = ['weapon', 'offhand', 'head', 'chest', 'gloves', 'legs', 'boots'];
  const RIGHT = ['necklace', 'earring1', 'earring2', 'ring1', 'ring2', 'bracelet', 'belt'];
  const BOTTOM = ['talisman', 'brooch', 'cloak', 'relic'];
  const mult = it => it.kind === 'gear' ? 0.06 : it.kind === 'acc' ? 0.05 : it.kind === 'rune' ? 0.08 : 0;
  const fmtV = (s, v) => D.PCT[s] ? (Math.round(v * 10) / 10) + '%' : U.fmt(v);
  const findItem = uid => UI.findItem(uid);

  // ---------- shared: paper doll ----------
  const dollSlot = (k, P, act = 'seleq') => { const s = S.save, it = s.eq[k], sd = D.SLOT[k]; const lock = sd.unlock !== undefined && !S.accUnlocked(k);
    return `<div class="dslot ${lock ? 'lock' : ''} ${P.slot === k ? 'on' : ''}" title="${esc(sd.th)}${lock ? ' (ยังไม่เปิด)' : ''}">${it ? cell(it, act, `data-slot="${k}" ${P.sel === it.uid ? 'aria-pressed="true"' : ''}`) : `<button class="icell empty" data-act="x-slot" data-slot="${k}" ${lock ? 'disabled' : ''}><img src="${UI.itemIcon({ slot: k, tier: 1 })}" class="ghost" alt=""></button>`}${it && it.lv ? `<b class="dlv">+${it.lv}</b>` : ''}</div>`; };
  const fashSlot = (f, P) => { const it = S.save.fashion.eq[f.k]; return `<div class="dslot" title="${esc(f.th)}">${it ? cell(it, 'selfash', P.sel === it.uid ? 'aria-pressed="true"' : '') : `<button class="icell empty" disabled><img src="${UI.itemIcon({ kind: 'fashion', slot: f.k, colors: ['#c8d0dc', '#ffffff'] })}" class="ghost" alt=""></button>`}</div>`; };
  UI.doll = (P, act) => { const s = S.save, c = S.calcPlayer(); const fv = P.dview === 'fash'; const FS = D.FASHION_SLOTS;
    const L = fv ? FS.slice(0, 6).map(f => fashSlot(f, P)).join('') : LEFT.map(k => dollSlot(k, P, act)).join('');
    const Rr = fv ? FS.slice(6).map(f => fashSlot(f, P)).join('') : RIGHT.map(k => dollSlot(k, P, act)).join('');
    return `<div class="dview"><button class="chip ${fv ? '' : 'on'}" data-act="x-dview" data-v="eq">อุปกรณ์</button><button class="chip ${fv ? 'on' : ''}" data-act="x-dview" data-v="fash">แฟชั่น (Costume)</button></div><div class="doll"><div class="dcol">${L}</div>
      <div class="dmid"><div class="dpow">พลัง <b>${U.fmt(c.cp)}</b></div>${s.title ? `<div class="dtitle">«${esc(s.title)}»</div>` : ''}<div class="dname">${esc(s.name)} · Lv${s.lvl}</div><img class="dbody" src="${UI.bodyURL(s.cls, s.fashion.eq)}" alt=""><div class="dped"></div><div class="dcls">${esc(D.CLS[s.cls].name)}</div></div>
      <div class="dcol">${Rr}</div></div>${fv ? '' : `<div class="drow">${BOTTOM.map(k => dollSlot(k, P, act)).join('')}</div>`}`; };

  // ---------- 1) INVENTORY ----------
  const CATS = [['all', 'ทั้งหมด', () => UI.menuIcon('inv')], ['gear', 'อุปกรณ์', () => UI.itemIcon({ slot: 'chest', tier: 3 })], ['acc', 'เครื่องประดับ', () => UI.itemIcon({ slot: 'ring1', tier: 3 })], ['rune', 'รูน', () => UI.itemIcon({ kind: 'rune', color: 'red', tier: 3 })], ['gem', 'เจม', () => UI.itemIcon({ kind: 'gem', gem: 'ruby', tier: 3 })], ['bag', 'ของใช้', () => UI.bagIcon('hpPot')]];
  const bagCells = () => { const s = S.save, b = s.bag; const out = UI.BAGK.filter(([k]) => b[k] > 0).map(([k, n]) => `<button class="icell t3" data-act="x-bag" data-k="${k}" title="${esc(n)}"><img src="${UI.bagIcon(k)}" alt=""><span class="qty">${b[k]}</span></button>`);
    b.stones.forEach((q, i) => { if (q > 0) out.push(`<button class="icell t${i + 1}" data-act="x-bag" data-k="stone${i}" title="หินตีบวก T${i + 1}"><img src="${UI.bagIcon('stone', i)}" alt=""><span class="qty">${q}</span></button>`); }); return out.join(''); };
  const bagDetail = (k) => { const s = S.save; if (k.startsWith('stone')) { const i = +k.slice(5); return `<div class="idet"><div class="ih"><img src="${UI.bagIcon('stone', i)}" alt=""><div><b class="tc t${i + 1}">หินตีบวก T${i + 1}</b><small>วัสดุ · มี ${s.bag.stones[i]}</small></div></div><p class="muted">ใช้ตีบวกเกียร์ระดับ ${i + 1} ที่ช่างตีเหล็กหรือหน้าอุปกรณ์</p></div>`; }
    const e = UI.BAGK.find(x => x[0] === k); return `<div class="idet"><div class="ih"><img src="${UI.bagIcon(k)}" alt=""><div><b>${esc(e[1])}</b><small>ของใช้ · มี ${s.bag[k]}</small></div></div><p class="muted">${esc(e[2])}</p><div class="iact">${k.startsWith('food') ? `<button class="btn primary" data-act="food" data-k="${k}">ใช้</button>` : k === 'ret' ? '<button class="btn primary" data-act="ret">ใช้</button>' : ''}</div></div>`; };
  const itemActs = (sel) => { const s = S.save; let a = ''; if (!sel) return a; const inInv = s.inv.includes(sel); const eqSlot = Object.keys(s.eq).find(k => s.eq[k] === sel);
    if (inInv) { if (S.isEquip(sel)) a += '<button class="btn primary" data-act="equip">สวมใส่</button>'; if (sel.kind === 'rune') a += '<button class="btn primary" data-act="runeequip">ใส่ในแผงรูน</button>'; a += '<button class="btn" data-act="sell">ขาย</button><button class="btn" data-act="salvage">แยกชิ้นส่วน</button>'; }
    const ri = s.runeBoard[s.page].indexOf(sel); if (ri >= 0) a += `<button class="btn" data-act="runeremove" data-i="${ri}">ถอดรูน</button><button class="btn" data-act="x-goenh" data-uid="${sel.uid}">อัปเกรดรูน</button>`; if (sel.kind === 'fashion') a += '<button class="btn" data-act="panel" data-p="fashion">เปิดแผงแฟชั่น</button>';
    if (eqSlot) a += `<button class="btn" data-act="unequip" data-slot="${eqSlot}">ถอด</button><button class="btn" data-act="x-goenh" data-uid="${sel.uid}">ตีบวก/Refine</button>`; return a; };
  UI.PANELS.inv = { title: 'กระเป๋า', render(tab, P) {
    const s = S.save; P.cat = P.cat || 'all';
    const list = P.cat === 'bag' ? [] : s.inv.filter(i => P.cat === 'all' || i.kind === P.cat || (P.cat === 'acc' && i.kind === 'relic'));
    const sel = P.sel ? findItem(P.sel) : null;
    const grid = list.map(i => cell(i, 'selinv', P.sel === i.uid ? 'aria-pressed="true"' : '')).join('') + (P.cat === 'all' || P.cat === 'bag' ? bagCells() : '');
    const det = P.bagk ? bagDetail(P.bagk) : sel ? UI.itemDetail(sel, itemActs(sel)) : '';
    return `<div class="invpage"><div class="invl">${UI.doll(P, 'selinv')}${runeRow(P, 'selinv')}${det ? `<div class="ipop"><button class="ipx" data-act="x-unsel" aria-label="ปิด">✕</button>${det}</div>` : ''}</div>
      <div class="invr"><div class="icats">${CATS.map(([k, n, ic]) => `<button class="icat ${P.cat === k ? 'on' : ''}" data-act="x-cat" data-v="${k}"><img src="${ic()}" alt="">${n}</button>`).join('')}</div>
        ${P.sellOpen ? UI.sellBar() : ''}<div class="igrid invgrid">${grid || '<div class="muted">ว่าง</div>'}</div>
        <div class="ibot"><span class="icount"><img src="${UI.menuIcon('inv')}" alt="">${s.inv.length}/${S.invMax}</span><span class="rbtns"><button class="rbtn" data-act="sort"><img src="${UI.menuIcon('settings')}" alt="">เรียง</button><button class="rbtn ${P.sellOpen ? 'on' : ''}" data-act="x-sellopen"><img src="${UI.curIcon('gold')}" alt="">ขาย</button><button class="rbtn" data-act="x-auto"><img src="${UI.itemIcon({ slot: 'chest', tier: 8 })}" alt="">ออโต้สวม</button><button class="rbtn" data-act="x-sellall"><img src="${UI.bagIcon('stone', 6)}" alt="">ขายหมด</button></span></div></div></div>`;
  } };

  // ---------- 2) CLASS SELECT ----------
  const SUPPORT = { heal: 1, buff: 1, shield: 1 }, MOBI = { dash: 1, blink: 1, leap: 1, stealth: 1 };
  const radarVals = c => { const R = D.ROLES[c.role]; const cc = c.skills.filter(s => Object.keys(s.cc || {}).length).length; const sup = c.skills.filter(s => SUPPORT[s.arch]).length; const mob = c.skills.filter(s => MOBI[s.arch]).length;
    return [['โจมตี', U.clamp((R.atk - 0.8) / 0.5, 0.1, 1)], ['ทนทาน', U.clamp((R.hp + R.def - 1.5) / 1.5, 0.1, 1)], ['ระยะ', U.clamp(c.rng / 10, 0.1, 1)], ['คล่องตัว', U.clamp(mob / 4 + (c.role === 'assassin' ? 0.3 : 0), 0.1, 1)], ['ควบคุม', U.clamp(cc / 9, 0.1, 1)], ['สนับสนุน', U.clamp(sup / 5 + (c.role === 'healer' ? 0.3 : 0), 0.1, 1)]]; };
  const radar = c => { const V = radarVals(c), N = V.length, cx = 120, cy = 112, R = 82; const pt = (i, r) => [cx + Math.sin(i / N * 6.283) * r, cy - Math.cos(i / N * 6.283) * r]; const poly = r => V.map((_, i) => pt(i, r).join(',')).join(' ');
    return `<svg viewBox="0 0 240 226" class="radar" role="img" aria-label="ค่าพลังคลาส"><defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe2fb"/><stop offset="1" stop-color="#8eb4e8"/></linearGradient></defs>
      ${[1, 0.75, 0.5, 0.25].map((k, j) => `<polygon points="${poly(R * k)}" fill="${j % 2 ? '#e8f1fc' : 'url(#rg)'}" fill-opacity="${j ? 0.55 : 0.5}" stroke="#ffffff" stroke-width="1.2"/>`).join('')}
      ${V.map((_, i) => `<line x1="${cx}" y1="${cy}" x2="${pt(i, R)[0]}" y2="${pt(i, R)[1]}" stroke="#fff" stroke-width="1"/>`).join('')}
      <polygon points="${V.map(([, v], i) => pt(i, R * v).join(',')).join(' ')}" fill="#ffffff" fill-opacity=".85" stroke="#4f82d4" stroke-width="2"/>
      ${V.map(([n, v], i) => { const [x, y] = pt(i, R + 16); return `<circle cx="${pt(i, R)[0]}" cy="${pt(i, R)[1]}" r="3" fill="#4f82d4"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="12" font-weight="600" fill="#2c4a7a">${n}</text>`; }).join('')}</svg>`; };
  const clsDesc = c => `${c.name} (${c.th}) เป็นคลาสสาย${D.ROLES[c.role].th} ใช้${D.WEAPON_TH[c.weapon]}และพลังธาตุ${D.ELEM[c.elem].th} ระยะโจมตี ${c.rng} ช่อง (${c.rng < 2 ? 'ประชิดมาก' : c.rng < 3 ? 'ประชิด' : c.rng < 6 ? 'ระยะกลาง' : 'ระยะไกล'}) ใช้ทรัพยากร ${c.res}${c.build ? ' ที่สะสมเมื่อโจมตีโดน' : ''} · สกิล 15 ตัวมีความสามารถเฉพาะตัวทั้งหมด อัลติเมต: ${c.skills[14].name}`;
  UI.classPage = (cur, picked, mode) => { const c = D.CLS[picked]; const pk = UI._clsSk ?? 14; const sk = c.skills[pk];
    const recs = [0, 7, 15, 20].map(i => [i, c.skills[i]]);
    return `<div class="clspage"><div class="clslist">${D.CLASSES.map(k => `<button class="clsplate ${k.id === picked ? 'on' : ''} ${k.id === cur ? 'cur' : ''}" data-act="x-pickcls" data-cls="${k.id}" style="--ec:${D.ELEM[k.elem].pal[1]}"><span class="cemb"><img src="${UI.itemIcon({ slot: 'weapon', wpn: k.weapon, tier: 8 })}" alt=""></span><span><b>${esc(k.name)}</b><small>${esc(k.th)}</small></span>${k.id === cur ? '<i>ปัจจุบัน</i>' : ''}</button>`).join('')}</div>
      <div class="clsmid"><div class="clsstage"><span class="clstag"><img src="${UI.itemIcon({ slot: 'weapon', wpn: c.weapon, tier: 8 })}" alt="">${esc(c.name)}</span><canvas id="clsprev" width="120" height="160"></canvas><div class="clsped"></div></div>
        <div class="clsdesc"><h4>แนะนำอาชีพ</h4><p>${esc(clsDesc(c))}</p></div>
        ${mode === 'create' ? `<label class="fl">ชื่อตัวละคร<input id="cname" maxlength="14" value="${esc(UI.lastName || U.pick(D.NAMES))}"></label><button class="btn primary big" data-act="x-startgame">เริ่มเกมที่หมู่บ้านนอกนครออเรเลียน</button>` : `<button class="btn primary big" data-act="swapcls" data-cls="${c.id}" ${c.id === cur ? 'disabled' : ''}>${c.id === cur ? 'คลาสปัจจุบัน' : 'ยืนยันเปลี่ยนอาชีพ'}</button>`}</div>
      <div class="clsright">${radar(c)}<div class="clsrole"><b style="color:${D.ELEM[c.elem].pal[2]}">${D.ROLES[c.role].th}</b> · ธาตุ${D.ELEM[c.elem].th} · ${c.rng} ช่อง</div>
        <h4>แนะนำสกิล</h4><div class="recsk">${recs.map(([i, s]) => `<button class="rsk ${pk === i ? 'on' : ''}" data-act="x-clssk" data-i="${i}" title="${esc(s.name)}"><img src="${UI.skillIcon(s)}" alt=""></button>`).join('')}</div>
        <div class="skdesc"><b>${esc(sk.name)}</b> <small>[${D.KEYS[pk]}] Lv${sk.unlock} · ${D.ARCH[sk.arch].th}</small><p>${esc(D.descSkill(sk))}</p></div>
        <div class="allsk">${c.skills.map((s, i) => `<button class="msk ${pk === i ? 'on' : ''}" data-act="x-clssk" data-i="${i}" title="${esc(s.name)}"><img src="${UI.skillIcon(s)}" alt=""></button>`).join('')}</div></div></div>`; };
  const animPrev = (cls) => { const cv = $('#clsprev'); if (!cv) return; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; const sh = SPR.charSheet(SPR.lookFor(cls)); cancelAnimationFrame(UI._cpA2); let f = 0; const loop = () => { if (!document.body.contains(cv)) return; f++; x.clearRect(0, 0, 120, 160); const seq = ['idle', 'attack', 'cast', 'walk']; const an = seq[Math.floor(f / 100) % 4]; const n = (sh.n && sh.n[an]) || SPR.ANIMS.find(a => a[0] === an)[1]; const fr = Math.floor(f / 8) % n; x.drawImage(sh.sheet, fr * 24, sh.idx['front' + an] * 32, 24, 32, 12, 16, 96, 128); UI._cpA2 = requestAnimationFrame(loop); }; loop(); };
  UI.showCreate = () => { const t = $('#title-screen'); UI._pick = UI.selCls || 'pyromancer'; t.innerHTML = `<div class="create rocreate"><div class="rohead"><span class="pemb"><img src="${UI.menuIcon('char')}" alt=""></span><b>เลือกอาชีพ</b><small>${D.CLASSES.length} คลาส · คลาสละ 15 สกิล</small></div>${UI.classPage(null, UI._pick, 'create')}</div>`; animPrev(UI._pick); };
  const charR0 = UI.PANELS.char.render;
  UI.PANELS.char.render = function (tab, P) { if (tab === 'cls') { P.pick = P.pick || S.save.cls; return (W.mode && W.mode.pvp ? '<p class="bad">เปลี่ยนคลาสไม่ได้ระหว่างแมตช์ PvP/ยึดปราสาท</p>' : '') + UI.classPage(S.save.cls, P.pick, 'swap'); } if (tab === 'eq') return gearPage(P); return charR0.call(this, tab, P); };
  const charAfter0 = UI.PANELS.char.after; UI.PANELS.char.after = function (P) { if (charAfter0) charAfter0.call(this, P); if (P.tab === 'cls') animPrev(P.pick); };

  // ---------- 3) GEAR + RUNE page (enhancement layout) ----------
  const enhRight = (sel, P) => { const s = S.save;
    if (!sel) { const slot = P.slot; if (slot && slot.startsWith('rune')) { const i = +slot.slice(4), rb = D.RUNE_BOARD[i]; const c = s.inv.filter(r => r.kind === 'rune' && r.color === rb.c); return `<div class="enhcard"><div class="enhtip">ช่องรูน${D.RUNE_COLORS[rb.c].th}${S.runeSlotOpen(i) ? '' : ` · เปิดที่เลเวล ${rb.lv}`}</div><h4>รูนในกระเป๋าที่ใส่ได้ (${c.length})</h4><div class="igrid">${c.map(r => `<button class="icell t${r.tier}" data-act="x-runeput" data-i="${i}" data-uid="${r.uid}" title="${esc(r.name)}"><img src="${UI.itemIcon(r)}" alt=""></button>`).join('') || '<span class="muted">ไม่มี</span>'}</div></div>`; }
      if (slot) { const c = s.inv.filter(it => S.isEquip(it) && (it.slot === slot || (slot.startsWith('ring') && it.slot.startsWith('ring')) || (slot.startsWith('earring') && it.slot.startsWith('earring')))); return `<div class="enhcard"><div class="enhtip">${esc(D.SLOT[slot].th)} ว่าง</div><h4>ไอเทมในกระเป๋าที่ใส่ได้ (${c.length})</h4><div class="igrid">${c.map(it => `<button class="icell t${it.tier}" data-act="x-equip" data-slot="${slot}" data-uid="${it.uid}" title="${esc(it.name)}"><img src="${UI.itemIcon(it)}" alt=""></button>`).join('') || '<span class="muted">ไม่มี</span>'}</div><button class="btn primary" data-act="x-auto">⚡ ออโต้สวมใส่ทุกช่อง</button></div>`; }
      return `<div class="enhcard"><div class="enhtip">เลือกช่องอุปกรณ์หรือช่องรูนทางซ้าย</div><p class="muted">ตีบวกเกียร์ · Refine เครื่องประดับ · อัปเกรดรูน ได้ในหน้านี้ · ระดับตีบวกติดกับไอเทม</p><button class="btn primary" data-act="x-auto">⚡ ออโต้สวมใส่ทุกช่อง (คำนวณตามคลาส)</button></div>`; }
    return enhCard(sel, P, true);
  };
  const runeRow = (P, ract = 'x-selrune') => { const s = S.save, page = s.runeBoard[s.page]; return `<div class="runerow"><b>แผงรูน (หน้า ${s.page + 1})</b><div>${D.RUNE_BOARD.map((rb, i) => { const it = page[i]; const open = S.runeSlotOpen(i); return `<div class="dslot rs ${rb.c} ${open ? '' : 'lock'} ${P.slot === 'rune' + i ? 'on' : ''}">${it ? cell(it, ract, `data-i="${i}" ${P.sel === it.uid ? 'aria-pressed="true"' : ''}`) : `<button class="icell empty" data-act="x-slot" data-slot="rune${i}" ${open ? '' : 'disabled'}><img src="${UI.itemIcon({ kind: 'rune', color: rb.c, tier: 1 })}" class="ghost" alt=""></button>`}${open ? '' : `<small>Lv${rb.lv}</small>`}</div>`; }).join('')}</div></div>`; };
  const gearPage = (P) => `<div class="gearpage"><div class="gearl">${UI.doll(P, 'seleq')}${runeRow(P)}</div><div class="gearr">${enhRight(P.sel ? findItem(P.sel) : null, P)}</div></div>`;
  UI.PANELS.runes.render = function (tab, P) { return gearPage(P); };

  // ---------- 5) ENHANCE / REFINE card (shared) ----------
  function enhCard(sel, P, inGear) {
    const s = S.save; const m = mult(sel); const lv = sel.lv || 0; const kind = sel.kind;
    const max = kind === 'gear' ? 10 : kind === 'acc' ? 10 : kind === 'rune' && !sel.core ? 15 : 0;
    const main = sel.main; const cur = main ? main.v * (1 + m * lv) : 0, nxt = main ? main.v * (1 + m * (lv + 1)) : 0;
    let cost = '', btn = '', rate = 100, extra = '';
    if (kind === 'gear' && lv < max) { const c = S.enchantCost(sel); rate = S.enchantRate(lv); const st = Math.min(10, sel.tier); const have = s.bag.stones[st - 1];
      cost = `<div class="mat ${s.gold >= c.gold ? '' : 'no'}"><img src="${UI.curIcon('gold')}" alt=""><span>${U.fmt(s.gold)}/${U.fmt(c.gold)}</span></div><div class="mat ${have >= c.stones ? '' : 'no'}"><img src="${UI.bagIcon('stone', st - 1)}" alt=""><span>${have}/${c.stones}</span></div>`;
      btn = `<button class="btn primary big" data-act="enchant">ตีบวก +${lv + 1}</button><label class="chk"><input type="checkbox" data-act="x-prot" ${P.prot ? 'checked' : ''}> ใช้ Protect Scroll (มี ${s.bag.protect})</label>`; if (P.prot) btn = btn.replace('data-act="enchant"', 'data-act="enchantp"'); }
    if (kind === 'acc' && lv < max) { const c = Math.round(10 * sel.tier * (1 + lv)); cost = `<div class="mat ${s.jewelDust >= c ? '' : 'no'}"><img src="${UI.curIcon('jewelDust')}" alt=""><span>${s.jewelDust}/${c}</span></div>`; btn = `<button class="btn primary big" data-act="refine">Refine +${lv + 1}</button>`; }
    if (kind === 'rune' && !sel.core && lv < max) { const c = Math.round(8 * sel.tier * (1 + lv)); cost = `<div class="mat ${s.runeDust >= c ? '' : 'no'}"><img src="${UI.curIcon('runeDust')}" alt=""><span>${s.runeDust}/${c}</span></div>`; btn = `<button class="btn primary big" data-act="runeup">อัปเกรด +${lv + 1}</button>`; }
    if (max && lv >= max) btn = '<div class="good">ถึงระดับสูงสุดแล้ว</div>';
    if (kind === 'gear' && sel.subs && sel.subs.length) extra += `<details class="enhmore"><summary>Reforge ค่ารอง (Scroll ${s.bag.reforge} หรือ ${U.fmt(300 * sel.tier)} ทอง)</summary>${sel.subs.map((sb, i) => `<button class="mini-btn" data-act="reforge" data-i="${i}">สุ่ม ${D.STAT_TH[sb.s]} (${fmtV(sb.s, sb.v)})</button>`).join('')}</details>`;
    if (sel.sockets && sel.sockets.length) { const gems = s.inv.filter(i => i.kind === 'gem'); extra += `<details class="enhmore"><summary>ช่องเจม ${sel.sockets.filter(Boolean).length}/${sel.sockets.length}</summary>${sel.sockets.map((g, i) => g ? `<button class="mini-btn" data-act="unsocket" data-i="${i}">ถอด ${esc(g.name)}</button>` : '').join('')}${sel.sockets.includes(null) ? gems.slice(0, 12).map(g => `<button class="mini-btn" data-act="socket" data-g="${g.uid}">ใส่ ${esc(g.name)}</button>`).join('') : ''}</details>`; }
    const eqSlot = Object.keys(s.eq).find(k => s.eq[k] === sel); const page = s.runeBoard[s.page]; const ri = page.indexOf(sel);
    const acts = (eqSlot ? `<button class="mini-btn" data-act="unequip" data-slot="${eqSlot}">ถอด</button>` : '') + (ri >= 0 ? `<button class="mini-btn" data-act="runeremove" data-i="${ri}">ถอดรูน</button>` : '') + (inGear ? `<button class="mini-btn" data-act="x-detail" data-uid="${sel.uid}">รายละเอียดเต็ม</button>` : '');
    return `<div class="enhcard"><div class="enhtip">${esc(sel.name)}${lv ? ' +' + lv : ''} · <span class="tc t${sel.tier}">ระดับ ${sel.tier} ${D.TIERS[sel.tier - 1].n}</span></div>
      <div class="enhring"><div class="enhitem icell t${sel.tier}"><img src="${UI.itemIcon(sel)}" alt=""></div>${lv ? `<b class="enhlv">+${lv}</b>` : ''}</div>
      ${main && max ? `<div class="enhrows"><div><span>ระดับ</span><b>+${lv}</b><i>➜</i><b class="up">+${Math.min(max, lv + 1)}</b></div><div><span>${D.STAT_TH[main.s]}</span><b>${fmtV(main.s, cur)}</b><i>➜</i><b class="up">${fmtV(main.s, nxt)} ▲</b></div>${kind === 'gear' ? `<div><span>โอกาสสำเร็จ</span><b class="${rate < 50 ? 'bad' : 'good'}">${rate}%</b>${lv >= 9 ? '<small class="bad">ล้มเหลวลดระดับ</small>' : ''}</div>` : ''}</div>` : `<p class="muted">${main ? esc(D.STAT_TH[main.s]) + ' ' + fmtV(main.s, cur) : 'ไอเทมนี้ตีบวกไม่ได้'}</p>`}
      ${cost ? `<div class="enhcost"><span class="enhlab">วัสดุที่ใช้</span><div class="mats">${cost}</div></div>` : ''}<div class="enhbtn">${btn}</div><div class="enhacts">${acts}</div>${extra}<div id="npcmsg" class="npcmsg"></div></div>`;
  }
  // smith / jeweler NPC → refine layout
  const npc0 = UI.npcRender;
  UI.npcRender = (P) => {
    const s = S.save;
    if (P.role === 'shop') return shopPage(P, 'shop'); if (P.role === 'stable') return shopPage(P, 'stable');
    if (P.role !== 'smith' && P.role !== 'jeweler') return npc0(P);
    const okKind = P.role === 'smith' ? (i => i.kind === 'gear' || i.kind === 'relic') : (i => i.kind === 'acc');
    const eqd = Object.values(s.eq).filter(i => i && okKind(i)); const pool = P.onlyEq ? eqd : eqd.concat(s.inv.filter(okKind));
    if (!P.sel && pool[0]) P.sel = pool[0].uid; const sel = P.sel ? findItem(P.sel) : null;
    return `<div class="refpage"><div class="reflist"><label class="chk"><input type="checkbox" data-act="x-onlyeq" ${P.onlyEq ? 'checked' : ''}> แสดงเฉพาะที่สวมใส่</label>${pool.map(it => { const eq = eqd.includes(it); return `<button class="refrow ${P.sel === it.uid ? 'on' : ''}" data-act="npcsel" data-uid="${it.uid}"><span class="icell t${it.tier}"><img src="${UI.itemIcon(it)}" alt="">${it.lv ? `<i class="rlv">+${it.lv}</i>` : ''}</span><span><b>${esc(it.name)}</b><small>iLv ${it.ilv} · ${esc((D.SLOT[it.slot] || {}).th || '')}${eq ? ' · <em>สวมอยู่</em>' : ''}</small></span></button>`; }).join('') || '<p class="muted">ไม่มีไอเทม</p>'}</div>
      <div class="refmid"><div class="arch"><div class="archin">${sel ? `<div class="icell t${sel.tier} big"><img src="${UI.itemIcon(sel)}" alt="">${sel.lv ? `<i class="rlv">+${sel.lv}</i>` : ''}</div>` : ''}</div></div></div>
      <div class="refright">${sel ? enhCard(sel, P, false) : '<p class="muted">เลือกไอเทมทางซ้าย</p>'}${P.role === 'jeweler' && sel && sel.kind === 'acc' && s.inv.includes(sel) ? `<button class="btn" data-act="fusesel">${(P.fuse || []).includes(sel.uid) ? 'ยกเลิกเลือก Fusion' : 'เลือกเพื่อ Fusion'} (${(P.fuse || []).length}/3)</button>${P.fuse && P.fuse.length === 3 ? '<button class="btn primary" data-act="fusion">Fusion 3 ชิ้น</button>' : ''}` : ''}</div></div>`;
  };

  // ---------- 4) SHOP cards ----------
  function shopEntries(kind) { const s = S.save;
    if (kind === 'stable') return S.STABLE.map((e, i) => { const own = e.type === 'pet' ? s.pets.includes(e.k) : s.mounts.includes(e.k); return { i, n: e.th.split(' — ')[0], sub: e.th.split(' — ')[1] || '', img: e.type === 'pet' ? UI.petIcon(e.k) : UI.mountIcon(e.k), price: e.honor || e.price, cur: e.honor ? 'honor' : 'gold', act: 'stablebuy', sold: own, t: 5 }; });
    if (kind === 'war') return S.warShop().map((e, i) => ({ i, n: e.th, img: UI.curIcon('war'), price: e.cost, cur: 'war', act: 'warbuy', t: 8 }));
    return S.SHOP.map((e, i) => ({ i, n: e.th.replace(/\s*\(.*\)/, ''), sub: (e.th.match(/\((.*)\)/) || [])[1] || '', img: e.stone ? UI.bagIcon('stone', e.stone - 1) : e.cur ? UI.curIcon(e.cur) : UI.bagIcon(e.key), price: e.price, cur: 'gold', act: 'buy', t: e.stone ? e.stone : e.key === 'foodXp' || e.key === 'foodDrop' ? 4 : 3, pop: e.key === 'hpPot' || e.key === 'foodDrop', cat: e.stone || e.cur ? 'mat' : 'use' }));
  }
  function shopPage(P, kind) {
    P.scat = P.scat || 'all'; const s = S.save; let list = shopEntries(kind); if (kind === 'shop' && P.scat !== 'all') list = list.filter(e => e.cat === P.scat);
    const cats = kind === 'shop' ? [['all', 'ทั้งหมด'], ['use', 'ของใช้'], ['mat', 'วัสดุ']] : kind === 'stable' ? [['all', 'สัตว์เลี้ยงและพาหนะ']] : [['all', 'ร้านแต้มสงคราม']];
    return `<div class="shoppage"><div class="shopcats">${cats.map(([k, n]) => `<button class="scat ${P.scat === k ? 'on' : ''}" data-act="x-scat" data-v="${k}">${n}</button>`).join('')}${kind === 'shop' ? `<div class="sqty"><b>จำนวนต่อครั้ง</b>${[1, 10, 50].map(q => `<button class="chip ${(P.qty || 1) === q ? 'on' : ''}" data-act="x-qty" data-v="${q}">×${q}</button>`).join('')}</div>` : ''}</div>
      <div class="shopgrid">${list.map(e => { const afford = (s[e.cur] || 0) >= e.price * (kind === 'shop' ? P.qty || 1 : 1); return `<div class="scard ${e.sold ? 'sold' : ''}">${e.pop ? '<span class="spop">ขายดี</span>' : ''}<div class="sname">${esc(e.n)}${kind === 'shop' ? ' ×' + (P.qty || 1) : ''}</div><div class="simg icell t${e.t}"><img src="${e.img}" alt=""></div>${e.sub ? `<div class="ssub">${esc(e.sub)}</div>` : '<div class="ssub">ไม่จำกัดรายวัน</div>'}
        <button class="sprice ${afford ? '' : 'no'}" data-act="${e.act}" data-i="${e.i}" ${e.sold ? 'disabled' : ''}><img src="${UI.curIcon(e.cur)}" alt="">${e.sold ? 'มีแล้ว' : U.fmt(e.price * (kind === 'shop' ? P.qty || 1 : 1))}</button></div>`; }).join('')}</div><div id="npcmsg" class="npcmsg"></div></div>`;
  }
  const gR0 = UI.PANELS.guild.render; UI.PANELS.guild.render = function (tab, P) { if (S.save.guild && tab === 'shop') return shopPage(P, 'war'); return gR0.call(this, tab, P); };

  // ---------- actions ----------
  const act0 = UI.act;
  UI.act = (el, e) => {
    const a = el.dataset.act, P = UI.panel, s = S.save;
    switch (a) {
      case 'x-dview': P.dview = el.dataset.v; P.sel = null; break;
      case 'x-cat': P.cat = el.dataset.v; P.sel = null; P.bagk = null; break;
      case 'x-bag': P.bagk = el.dataset.k; P.sel = null; break;
      case 'x-unsel': P.sel = null; P.bagk = null; P.slot = null; break;
      case 'x-sellopen': P.sellOpen = !P.sellOpen; break;
      case 'x-slot': P.slot = el.dataset.slot; P.sel = null; if (UI.panel.id === 'inv') { const k = P.slot; P.cat = k.startsWith('rune') ? 'rune' : D.SLOT[k] && D.SLOT[k].unlock !== undefined || k === 'relic' ? 'acc' : 'gear'; } break;
      case 'x-equip': { const it = findItem(el.dataset.uid); if (it) { const r = S.equip(it); if (r !== true && r) UI.toast(r, 'bad'); P.sel = it.uid; P.slot = null; } break; }
      case 'x-selrune': P.sel = el.dataset.uid; P.slot = null; break;
      case 'x-runeput': { const it = findItem(el.dataset.uid); if (it) { const r = S.runeEquip(it, +el.dataset.i); if (r !== true) UI.toast(r, 'bad'); P.sel = it.uid; P.slot = null; } break; }
      case 'x-detail': P.detail = el.dataset.uid; UI.modal(`${UI.itemDetail(findItem(el.dataset.uid), '<button class="btn" data-act="x-close">ปิด</button>')}`); return;
      case 'x-goenh': UI.closePanel(); UI.openPanel('char', 'eq'); UI.panel.sel = el.dataset.uid; break;
      case 'x-prot': P.prot = !P.prot; break;
      case 'x-onlyeq': P.onlyEq = !P.onlyEq; P.sel = null; break;
      case 'x-scat': P.scat = el.dataset.v; break;
      case 'x-qty': P.qty = +el.dataset.v; break;
      case 'x-clssk': { UI._clsSk = +el.dataset.i; const t = $('#title-screen'); if (!t.hidden && t.querySelector('.rocreate')) { UI.lastName = ($('#cname') || {}).value || UI.lastName; const sc = t.querySelector('.clslist').scrollTop; t.querySelector('.rocreate').innerHTML = t.querySelector('.rohead').outerHTML + UI.classPage(null, UI._pick, 'create'); t.querySelector('.clslist').scrollTop = sc; animPrev(UI._pick); return; } break; }
      case 'x-pickcls': { const t = $('#title-screen'); UI._clsSk = 14; if (!t.hidden && t.querySelector('.rocreate')) { UI.lastName = ($('#cname') || {}).value || UI.lastName; UI._pick = UI.selCls = el.dataset.cls; const sc = t.querySelector('.clslist').scrollTop; t.querySelector('.rocreate').innerHTML = t.querySelector('.rohead').outerHTML + UI.classPage(null, UI._pick, 'create'); t.querySelector('.clslist').scrollTop = sc; animPrev(UI._pick); return; } P.pick = el.dataset.cls; break; }
      case 'x-startgame': UI.selCls = UI._pick; UI.lastName = ($('#cname') || {}).value; el.dataset.act = 'startgame'; return act0(el, e);
      default: return act0(el, e);
    }
    if (!P) return; const sc = $('#pbody') && ($('.clslist') || {}).scrollTop; UI.renderPanel(); if (sc && $('.clslist')) $('.clslist').scrollTop = sc;
  };
  // after a panel re-render for the class page keep list scroll + start preview
  const rp0 = UI.renderPanel; UI.renderPanel = () => { const L = $('#pbody .clslist'); const sc = L ? L.scrollTop : 0; rp0(); const L2 = $('#pbody .clslist'); if (L2 && sc) L2.scrollTop = sc; };
})(window.G);
