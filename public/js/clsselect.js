'use strict';
/* Create-character class picker: 30 painted class posters in pages of 5 (◀ ▶), "เลือก" under each poster,
   bottom bar with name, class description, skills (+ live skill preview) and a round start button. */
(function (G) {
  const U = G.U, D = G.D, S = G.S, UI = G.UI; const $ = s => document.querySelector(s); const esc = UI.esc;
  const base = (() => { const s = [...document.scripts].find(x => /js\/clsselect\.js/.test(x.src)); return s ? s.src.replace(/js\/clsselect\.js.*$/, '') : ''; })();
  const PER = 5; const poster = id => base + 'assets/classes/' + id + '.webp?v=46';
  const pageOf = id => Math.max(0, Math.floor(D.CLASSES.findIndex(c => c.id === id) / PER));
  const NP = () => Math.ceil(D.CLASSES.length / PER);
  const rngTh = r => r < 2 ? 'ประชิดมาก' : r < 3 ? 'ประชิด' : r < 6 ? 'ระยะกลาง' : 'ระยะไกล';
  const desc = c => `${c.name} (${c.th}) คลาสสาย${D.ROLES[c.role].th} ใช้${(D.WEAPON_TH && D.WEAPON_TH[c.weapon]) || c.weapon}และพลังธาตุ${D.ELEM[c.elem].th} ระยะโจมตี ${c.rng} ช่อง (${rngTh(c.rng)}) ใช้ทรัพยากร ${c.res}${c.build ? ' ที่สะสมเมื่อโจมตีโดน' : ''} · สกิลโจมตี 15 บัฟ 5 อัลติเมต 4 และอัลติชุดไอเทม 1 พร้อมแพสซีฟ 5 ตัว`;
  const keyOf = i => (D.KEYS && D.KEYS[i]) || '';
  const cards = () => { const p = UI._ccPage; const list = D.CLASSES.slice(p * PER, p * PER + PER);
    return list.map(c => `<div class="cccard ${c.id === UI._pick ? 'on' : ''}" style="--ec:${D.ELEM[c.elem].pal[1]}"><button class="ccimg" data-act="cc-pick" data-cls="${c.id}" aria-label="${esc(c.name)}"><img src="${poster(c.id)}" alt="${esc(c.name)} · ${esc(c.th)}" loading="eager" draggable="false"></button><button class="ccsel" data-act="cc-pick" data-cls="${c.id}">${c.id === UI._pick ? '✓ เลือกแล้ว' : 'เลือก'}</button></div>`).join(''); };
  const dots = () => Array.from({ length: NP() }, (_, i) => `<button class="ccdot ${i === UI._ccPage ? 'on' : ''}" data-act="cc-page" data-p="${i}" aria-label="หน้า ${i + 1}"></button>`).join('');
  const bottom = () => { const c = D.CLS[UI._pick]; const pk = UI._ccSk ?? 0; const sk = c.skills[pk] || c.skills[0]; const el = D.ELEM[c.elem];
    const recs = [0, 1, 2, 7, 15, 20, 24].filter(i => c.skills[i]);
    return `<div class="ccbox ccname"><h4>ตั้งชื่อ</h4><input id="cname" maxlength="14" value="${esc(UI.lastName || U.pick(D.NAMES))}" aria-label="ชื่อตัวละคร">
        <div class="ccpick"><img src="${poster(c.id)}" alt=""><div><b>${esc(c.name)}</b><small>${esc(c.th)}</small><span class="cctags"><i style="--c:${el.pal[1]}">ธาตุ${esc(el.th)}</i><i>${esc(D.ROLES[c.role].th)}</i><i>${c.rng} ช่อง</i><i>${esc(c.res)}</i></span></div></div></div>
      <div class="ccbox ccdesc"><h4>อธิบายตัวละครและความสามารถ</h4><p>${esc(desc(c))}</p>${D.CLASS_MECH && D.CLASS_MECH[c.id] ? `<p class="ccmech"><b>กลไกประจำคลาส · ${esc(D.CLASS_MECH[c.id].n)}:</b> ${esc(D.CLASS_MECH[c.id].d)}</p>` : ''}</div>
      <div class="ccbox ccsk"><h4>สกิล</h4><div class="ccskrow">${recs.map(i => `<button class="ccski ${i === pk ? 'on' : ''}" data-act="cc-sk" data-i="${i}" title="${esc(c.skills[i].name)}"><img src="${UI.skillIcon(c.skills[i])}" alt=""><small>${esc(keyOf(i))}</small></button>`).join('')}</div>
        <div class="ccskd"><b>${esc(sk.name)}</b> <small>[${esc(keyOf(pk))}] Lv${sk.unlock}${D.ARCH && D.ARCH[sk.arch] ? ' · ' + esc(D.ARCH[sk.arch].th) : ''}</small><p>${esc(D.descSkill ? D.descSkill(sk) : '')}</p></div>
        ${S.previewSkill ? `<button class="btn ccpv" data-act="pv-try" data-cls="${c.id}" data-i="${pk}">▶ ดูตัวอย่างสกิลนี้</button>` : ''}</div>
      <button class="ccstart" data-act="cc-start"><span>เริ่มเกม</span></button>`; };
  const paint = (part) => { const t = $('#title-screen'); if (!t) return; const nm = $('#cname'); if (nm) UI.lastName = nm.value;
    if (!part || part === 'cards') { const r = t.querySelector('.cccards'); if (r) r.innerHTML = cards(); const d = t.querySelector('.ccdots'); if (d) d.innerHTML = dots(); const pg = t.querySelector('.ccpg'); if (pg) pg.textContent = `${UI._ccPage + 1}/${NP()}`; }
    if (!part || part === 'bottom') { const b = t.querySelector('.ccbottom'); if (b) b.innerHTML = bottom(); } };
  UI.showCreate = () => { const t = $('#title-screen'); t.hidden = false; const h = $('#hud'); if (h) h.hidden = true;
    UI._pick = UI.selCls || UI._pick || 'blademaster'; if (!D.CLS[UI._pick]) UI._pick = D.CLASSES[0].id; UI._ccPage = pageOf(UI._pick); if (UI._ccSk == null || UI._ccSk > 24) UI._ccSk = UI._clsSk != null && UI._clsSk <= 24 ? UI._clsSk : 0;
    const slot = S.activeSlot ? S.activeSlot() + 1 : 1;
    t.innerHTML = `<div class="ccwrap"><div class="cchead"><button class="btn ccback" data-act="sl-back">← กลับ</button><h2>สร้างตัวละคร · เลือกอาชีพ</h2><small>${D.CLASSES.length} อาชีพ · สล็อต ${slot}</small></div>
      <div class="ccstage"><button class="ccarrow l" data-act="cc-step" data-v="-1" aria-label="ย้อนกลับ"><span>◀</span><small>ย้อนกลับ</small></button><div class="cccards">${cards()}</div><button class="ccarrow r" data-act="cc-step" data-v="1" aria-label="หน้าถัดไป"><span>▶</span><small>หน้าถัดไป</small></button></div>
      <div class="ccnav"><div class="ccdots">${dots()}</div><span class="ccpg">${UI._ccPage + 1}/${NP()}</span></div>
      <div class="ccbottom">${bottom()}</div></div>`;
    // preload neighbouring pages
    [UI._ccPage - 1, UI._ccPage + 1].forEach(p => { if (p < 0 || p >= NP()) return; D.CLASSES.slice(p * PER, p * PER + PER).forEach(c => { const i = new Image(); i.src = poster(c.id); }); }); };
  const step = v => { UI._ccPage = (UI._ccPage + v + NP()) % NP(); paint('cards'); [UI._ccPage + v].forEach(p => { if (p < 0 || p >= NP()) return; D.CLASSES.slice(p * PER, p * PER + PER).forEach(c => { const i = new Image(); i.src = poster(c.id); }); }); };
  const a0 = UI.act; UI.act = (el, e) => { const a = el.dataset.act;
    switch (a) {
      case 'cc-pick': UI._pick = UI.selCls = el.dataset.cls; UI._ccSk = 0; paint(); return;
      case 'cc-step': step(+el.dataset.v); return;
      case 'cc-page': UI._ccPage = +el.dataset.p; paint('cards'); return;
      case 'cc-sk': UI._ccSk = UI._clsSk = +el.dataset.i; paint('bottom'); return;
      case 'cc-start': { UI.selCls = UI._pick; const nm = $('#cname'); UI.lastName = nm ? nm.value : UI.lastName; if (!UI.lastName || !UI.lastName.trim()) { UI.toast && UI.toast('ใส่ชื่อตัวละครก่อน', 'bad'); if (nm) nm.focus(); return; } el.dataset.act = 'startgame'; return a0(el, e); }
    }
    if (a === 'pv-try') { const nm = $('#cname'); if (nm) UI.lastName = nm.value; UI._clsSk = UI._ccSk; }
    return a0(el, e); };
  addEventListener('keydown', e => { const t = $('#title-screen'); if (!t || t.hidden || !t.querySelector('.ccwrap') || (e.target && e.target.tagName === 'INPUT')) return; if (e.key === 'ArrowLeft') step(-1); else if (e.key === 'ArrowRight') step(1); });
  const css = document.createElement('style'); css.textContent = `
  .ccwrap{position:relative;width:min(1240px,100%);margin:0 auto;padding:10px 14px 14px;box-sizing:border-box;display:flex;flex-direction:column;gap:8px;color:#e8e2f0;font-family:Kanit,sans-serif}
  .cchead{display:flex;align-items:center;justify-content:center;gap:12px;position:relative;min-height:40px}
  .cchead h2{margin:0;padding:6px 22px;font-size:20px;letter-spacing:.5px;color:#ffe7a8;background:linear-gradient(180deg,rgba(60,40,90,.92),rgba(24,16,40,.92));border:1px solid #c9a24a;border-radius:8px;box-shadow:0 0 18px rgba(255,200,90,.25)}
  .cchead small{color:#b8acd0;font-size:12px}.cchead .ccback{position:absolute;left:0;top:50%;transform:translateY(-50%)}
  .ccstage{display:flex;align-items:stretch;gap:6px}
  .cccards{flex:1;display:grid;grid-template-columns:repeat(5,1fr);gap:10px;min-width:0}
  .cccard{display:flex;flex-direction:column;align-items:center;gap:7px;min-width:0}
  .ccimg{display:block;height:clamp(200px,calc(100vh - 385px),600px);width:fit-content;max-width:100%;padding:0;border:2px solid #3a2f52;border-radius:10px;overflow:hidden;background:#120c1c;cursor:pointer;transition:transform .18s,box-shadow .18s,border-color .18s}
  .ccimg img{height:100%;width:auto;max-width:100%;object-fit:contain;display:block;pointer-events:none}
  .ccimg:hover{transform:translateY(-4px);border-color:#c9a24a;box-shadow:0 8px 24px rgba(0,0,0,.5)}
  .cccard.on .ccimg{border-color:#ffd46a;box-shadow:0 0 0 2px #ffd46a,0 0 26px var(--ec,#ffd46a),0 10px 30px rgba(0,0,0,.6);transform:translateY(-6px)}
  .ccsel{min-width:96px;padding:6px 18px;font:600 15px Kanit,sans-serif;color:#2c1d05;background:linear-gradient(#ffe9a8,#e0a93a);border:1px solid #8a6418;border-radius:8px;cursor:pointer;box-shadow:0 2px 0 #6a4a10}
  .ccsel:hover{filter:brightness(1.08)}.cccard.on .ccsel{background:linear-gradient(#b8f5c4,#4cc06a);border-color:#1f7a3a;color:#06301a}
  .ccarrow{flex:0 0 52px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;background:transparent;border:0;color:#ffe7a8;cursor:pointer;font-family:Kanit,sans-serif}
  .ccarrow span{width:42px;height:42px;display:grid;place-items:center;border-radius:50%;background:rgba(40,26,64,.85);border:1px solid #c9a24a;font-size:18px}.ccarrow small{font-size:11px;color:#cbbfe0}.ccarrow:hover span{background:#5a3c8a}
  .ccnav{display:flex;align-items:center;justify-content:center;gap:10px}.ccdots{display:flex;gap:6px}
  .ccdot{width:10px;height:10px;border-radius:50%;border:1px solid #c9a24a;background:transparent;padding:0;cursor:pointer}.ccdot.on{background:#ffd46a}.ccpg{font-size:12px;color:#b8acd0}
  .ccbottom{max-height:200px;display:grid;grid-template-columns:1.05fr 1.2fr 1.25fr 128px;gap:10px;align-items:stretch;background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(228,236,250,.96));border:1px solid #93afd8;border-radius:12px;padding:10px;color:#2a3550}
  .ccbox{border:1px solid #b9cbe8;border-radius:9px;background:#fff;padding:8px 10px;min-width:0;display:flex;flex-direction:column;gap:6px}
  .ccbox h4{margin:0;font-size:13px;color:#2c4a7a;border-left:3px solid #4f82d4;padding-left:7px}
  .ccname input{background:#fff;color:#22304e;font:500 15px Kanit,sans-serif;padding:7px 10px;border:1px solid #93afd8;border-radius:7px;outline:none}.ccname input:focus{border-color:#4f82d4;box-shadow:0 0 0 2px rgba(79,130,212,.2)}
  .ccpick{display:flex;gap:9px;align-items:center}.ccpick img{height:66px;width:auto;border-radius:5px;border:1px solid #c9a24a}
  .ccpick b{display:block;font-size:15px;color:#22304e}.ccpick small{display:block;color:#5a6a8a;font-size:12px}
  .cctags{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}.cctags i{font-style:normal;font-size:11px;padding:1px 7px;border-radius:9px;background:#eef3fb;border:1px solid #c8d6ee;color:#2c4a7a}.cctags i[style]{background:color-mix(in srgb,var(--c) 18%,#fff);border-color:var(--c)}
  .ccdesc p{margin:0;font-size:12.5px;line-height:1.55;color:#33405e}.ccdesc .ccmech{font-size:12px;color:#4a3a70}
  .ccskrow{display:flex;gap:5px;flex-wrap:wrap}.ccski{position:relative;width:38px;height:38px;padding:0;border-radius:50%;border:2px solid #c8d6ee;background:#1a1626;cursor:pointer;overflow:hidden}
  .ccski img{width:100%;height:100%;display:block}.ccski small{position:absolute;right:0;bottom:0;font-size:8.5px;background:rgba(0,0,0,.7);color:#fff;padding:0 3px;border-radius:4px}.ccski.on{border-color:#e0a93a;box-shadow:0 0 0 2px #ffd46a}
  .ccskd b{font-size:13px;color:#22304e}.ccskd small{font-size:11px;color:#6a7a9a}.ccskd p{margin:3px 0 0;font-size:12px;line-height:1.45;color:#33405e;max-height:4.4em;overflow:auto}
  .ccpv{align-self:flex-start;padding:4px 12px;font-size:12px;background:linear-gradient(#fff,#d8e6f8);color:#2c4a7a;border:1px solid #93afd8}
  .ccstart{align-self:center;justify-self:center;width:118px;height:118px;border-radius:50%;border:3px solid #fff;background:radial-gradient(circle at 35% 30%,#ffb3c8,#ff5a8a 55%,#d0306a);color:#fff;font:700 22px Kanit,sans-serif;cursor:pointer;box-shadow:0 0 0 2px #e0487a,0 8px 24px rgba(224,72,122,.45),inset 0 -6px 12px rgba(0,0,0,.15);text-shadow:0 2px 0 rgba(120,20,60,.5);transition:transform .15s}
  .ccstart:hover{transform:scale(1.05)}.ccstart:active{transform:scale(.97)}
  @media (max-width:900px){.cccards{grid-template-columns:repeat(5,minmax(108px,1fr));overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:4px}.cccard{scroll-snap-align:start}.ccarrow{flex-basis:34px}.ccarrow small{display:none}.ccarrow span{width:30px;height:30px}
    .ccbottom{grid-template-columns:1fr 1fr}.ccstart{grid-column:1/-1;width:100%;height:56px;border-radius:28px;font-size:20px}.ccimg{height:auto;width:100%;max-height:none}.ccimg img{width:100%;height:auto}.ccbottom{max-height:none}.cchead h2{font-size:16px;padding:5px 12px}.cchead small{display:none}}
  @media (max-width:560px){.ccbottom{grid-template-columns:1fr}.ccwrap{padding:8px}}`;
  document.head.appendChild(css);
})(window.G);
