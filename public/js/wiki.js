'use strict';
/* สมุดความรู้ (Game Knowledge Book): everything about how the game works, generated from live game data. */
(function (G) {
  const U = G.U, D = G.D, W = G.W, S = G.S, UI = G.UI; const esc = UI.esc; const $ = s => document.querySelector(s);
  const sec = (t, body) => `<h4>${t}</h4>${body}`;
  const li = a => `<ul class="wk">${a.map(x => `<li>${x}</li>`).join('')}</ul>`;
  const kbd = k => `<kbd>${k}</kbd>`;
  const TABS = [['start', 'เริ่มต้น & ปุ่ม'], ['skill', 'สกิล & แพสซีฟ'], ['elem', 'ธาตุ & แพ้ทาง'], ['combat', 'สถานะ & ความสามารถ'], ['content', 'เนื้อหาเกม'], ['items', 'ไอเทม & ชุดคลาส'], ['classes', 'คลาสทั้งหมด']];
  UI.PANELS.wiki = { title: 'สมุดความรู้', tabs: TABS, render(tab) {
    switch (tab) {
      case 'start': return sec('การควบคุม', li([`เดิน: ${kbd('W')}${kbd('A')}${kbd('S')}${kbd('D')} หรือคลิกพื้น · มือถือใช้จอยซ้ายล่าง`, `โจมตีปกติ: คลิกศัตรูเพื่อล็อกเป้า (วงแดงใต้ตัว) ตัวละครเดินเข้าไปตีเอง · ยกเลิกด้วยการเดิน/คลิกพื้น/${kbd('Esc')}`, `สลับเป้า: ${kbd('Tab')} · ซูม: ล้อเมาส์ หรือ ${kbd('+')} ${kbd('-')}`, `ยา: ${kbd('H')} HP · ${kbd('V')} ทรัพยากร · ออโต้ ${kbd('Z')} · ออโต้ภารกิจ ${kbd('X')}`, `เมนู: ${kbd('C')} ตัวละคร ${kbd('I')} กระเป๋า ${kbd('K')} สกิล ${kbd('M')} แผนที่ ${kbd('B')} Codex ${kbd('O')} ตั้งค่า`, 'ลากแถบชื่อหน้าต่างเพื่อย้ายตำแหน่ง · ดับเบิลคลิกเพื่อกลับกลางจอ']))
        + sec('ตัวละคร', li(['สร้างได้ 6 ช่อง แต่ละตัวมีเลเวล ไอเทม และความคืบหน้าแยกกัน', `เลเวลสูงสุด ${D.MAX_LV} · ทุกเลเวลเพิ่มค่าพลังพื้นฐานตามสายอาชีพ`, 'ค่าพลังรวม (CP/OP) ดูได้ใต้กรอบตัวละคร ยิ่งสูงยิ่งเก่ง', 'ในหน้าเลือกอาชีพ กด “ดูตัวอย่างสกิลนี้” เพื่อทดลองสกิลในสนามซ้อมก่อนเลือก']))
        + sec('สนามซ้อม', li(['ดัมมี่ไม่ขยับ ไม่ตาย และเลือดเต็มตลอด', 'หยุดตี 3 วินาทีจะแสดงสรุปผล: ดาเมจรวม, DPS, คริติคอล, ดาเมจสูงสุด, ดาเมจแยกตามสกิล และค่าพลังตอนทดสอบ']));
      case 'skill': return sec('แถบสกิล 25 ช่อง', `<table class="tbl"><tr><th>หมวด</th><th>ช่อง</th><th>ปุ่ม</th></tr><tr><td>โจมตี</td><td>15</td><td>1–0, Q E R T F</td></tr><tr><td>บัฟ</td><td>5</td><td>Shift + Q E R T F</td></tr><tr><td>อัลติเมต</td><td>4</td><td>Shift + 1–4</td></tr><tr><td>อัลติเมตชุดคลาส</td><td>1</td><td>Shift + 5 (ต้องใส่ชุดคลาสครบ 6 ชิ้น)</td></tr></table>`)
        + sec('ความสามารถเฉพาะของสกิล', li(['ทุกสกิลมีความสามารถเสริม (✦) ไม่ซ้ำกันภายในคลาส เช่น ทำซ้ำ, ดูดเข้าหา, ประหาร, ทิ้งพื้นที่ไฟ', 'สกิลอัลติเมตชุดคลาสเป็นท่าพิเศษเฉพาะคลาส เช่น ดวงอาทิตย์ทิ้งลูกไฟ, เมฆพายุตามตัว, หยุดเวลาเก็บดาเมจ', 'รูนสกิล: ทุกสกิลมี 3 แบบ (แยก / หนัก / เร็ว) ดรอปจาก Rune Sanctum']))
        + sec('แพสซีฟ (ไอคอนแนวตั้งด้านซ้ายจอ)', li([`ปลดล็อกที่เลเวล ${D.PASSIVE_LV.join(' / ')}`, '4 อันแรกตามสายอาชีพ (ค่าพลัง, ประหาร, ฟื้นเลือดเมื่อสังหาร, โล่เมื่อเลือดต่ำ, สะท้อนดาเมจ, หลบหลีก ฯลฯ)', 'อันที่ 5 แพสซีฟประจำคลาส: ทุกการโจมตีครั้งที่ 6 ระเบิดพลังธาตุพร้อมผลพิเศษ']))
        + sec('ตั้งค่าเอฟเฟค', li(['คุณภาพ VFX: ต่ำ / ปกติ / อลังการ', 'แสดงเอฟเฟคของ: ทุกคน / ตัวเอง+ปาตี้ / ตัวเองเท่านั้น', 'สั่นหน้าจอ: เปิด/ปิด']));
      case 'elem': { const F = D.ELEM_FAM || {}; const bd = e => UI.elemBadge ? UI.elemBadge(e) : e; const RT = r => D.ROLES[r].th;
        return sec('ระบบธาตุ', `<p>${bd('fire')} → ${bd('nature')} → ${bd('lightning')} → ${bd('ice')} → ${bd('fire')} &nbsp; ${bd('holy')} ⇄ ${bd('shadow')} &nbsp; ${bd('phys')} ไม่แพ้ไม่ชนะ</p>` + li(['ชนะทาง: ดาเมจ ×1.3 · แพ้ทาง: ×0.75 · ธาตุตระกูลเดียวกัน: ×0.85', 'ธาตุของการโจมตีมาจากสกิล ธาตุที่ใช้ป้องกันคือธาตุของคลาส (ผู้เล่น) หรือธาตุของมอนสเตอร์/แผนที่', 'กรอบเป้าหมายบอกธาตุของศัตรูและว่าคุณชนะหรือแพ้ทาง', 'ข้อความ WEAK! = ชนะทาง · RESIST = แพ้ทาง']))
          + `<table class="tbl"><tr><th>ตระกูล</th><th>ธาตุ</th><th>ชนะทาง</th></tr>${Object.entries(F).map(([k, f]) => `<tr><td>${bd(f.els[0])}</td><td>${f.els.map(e => D.ELEM[e] ? D.ELEM[e].th : e).join(' · ')}</td><td>${(D.ELEM_BEATS[k] || []).map(b => bd(F[b].els[0])).join(' ') || '-'}</td></tr>`).join('')}</table>`
          + sec('แพ้ทางคลาส (ผู้เล่นปะทะผู้เล่น)', `<p class="muted">สายที่ชนะทาง ดาเมจ ×1.15 · แพ้ทาง ×0.9</p><table class="tbl"><tr><th>สาย</th><th>ชนะทาง</th></tr>${Object.keys(D.ROLE_BEATS || {}).map(r => `<tr><td>${RT(r)}</td><td>${D.ROLE_BEATS[r].map(RT).join(' · ')}</td></tr>`).join('')}</table>`); }
      case 'combat': return sec('สถานะควบคุม (CC)', `<table class="tbl">${Object.entries(D.CC_TH).map(([k, v]) => `<tr><td><b>${esc(v)}</b></td><td>${{ st: 'ขยับ/โจมตี/ใช้สกิลไม่ได้', rt: 'เดินไม่ได้แต่โจมตีได้', sl: 'เดินช้าลง', fz: 'หยุดนิ่งทุกอย่าง', kb: 'กระเด็นออก', pl: 'ถูกดึงเข้าหา', sil: 'ใช้สกิลไม่ได้' }[k] || ''}</td></tr>`).join('')}</table><p class="muted">บอสต้านทาน CC ส่วนใหญ่ · การโดน CC ซ้ำจะสั้นลง</p>`)
        + sec('ความสามารถเสริมของสกิล (✦)', `<div class="wkgrid">${Object.entries((G.RD && G.RD.TH) || {}).map(([k, v]) => `<div><b>${esc(k)}</b><span>${esc(String(v).replace(/\{v\}/g, 'X'))}</span></div>`).join('')}</div>`);
      case 'content': return sec('แผนที่ฟาร์ม', `<p>${D.FARM_MAPS.length} แผนที่ เลเวล 1–${D.MAX_LV}: มอนสเตอร์ธรรมดา, Elite, Champion, Rare และบอสแผนที่ · เปิดออโต้ ${kbd('Z')} ตั้งค่าเลือกมอนที่จะตีได้</p>`)
        + sec('ดันเจี้ยน', li(['ลงลึกทีละชั้น ทุก 10 ชั้นมีบอส · ชั้น 100 Dungeon King', 'ยิ่งลึกยิ่งดรอปไอเทมระดับสูง']))
        + sec('บอสโลก', li(['เกิดตามเวลาที่ลานบอสโลก (ดูเวลาในแผนที่ M)', 'โหมด FFA มีบอท: ทุกคนเป็นศัตรูยกเว้นปาตี้ · โหมดไม่มีบอท: เข้าคนเดียว', 'รางวัลเฉพาะผู้ทำดาเมจ 10 อันดับแรก อันดับ 1 ได้ไอเทมบอสโลกแน่นอน', 'บอสโลกมี 3 เฟส อัลติเมต และคลั่งเมื่อสู้นานเกิน 5 นาที']))
        + sec('PvP & กิลด์', li(['อารีน่า, ศึกชิงบอส, ยึดปราสาท · ระบบแพ้ทางคลาสมีผลใน PvP', 'กิลด์: จัดอันดับ, รางวัลชนะศึก, เชิญบอทเข้ากิลด์']))
        + sec('สมุดมอนสเตอร์', '<p>ดูรูป ค่าพลัง สกิลบอส และไอเทมที่ดรอปของมอนสเตอร์ทุกตัว (เมนูสมุดมอนสเตอร์)</p>');
      case 'items': return sec('ระดับไอเทม', `<div class="chips">${D.TIERS.map((T, i) => `<span class="chip t${i + 1}">${i + 1}. ${esc(T.n)}</span>`).join('')}</div>`)
        + sec('การพัฒนา', li(['ตีบวก: ใช้หินตีบวกตามระดับ มีโอกาสพลาด · Protect Scroll กันของแตก', 'รูน: ใส่แผงรูนเพิ่มค่าพลัง · เจม: ใส่รูเจมในอุปกรณ์', 'ออโต้สวมใส่: เลือกของที่เหมาะกับอาชีพให้อัตโนมัติ']))
        + sec('ชุดคลาส', li(['ทุกคลาสมีชุดเฉพาะ 6 ชิ้น · ครบ 2 / 4 ชิ้นได้โบนัสค่าพลัง', 'ครบ 6 ชิ้น ปลดล็อกอัลติเมตชุดคลาส [Shift+5]', 'ดูและสวมทั้งชุดได้ที่หน้าตัวละคร > ชุดคลาส · สุ่มได้จากกล่องสุ่ม']))
        + sec('อื่น ๆ', li(['กล่องสุ่ม: ไข่สัตว์เลี้ยง, แฟชั่น, ชุดคลาส, ปีก', 'เทรด: แลกเปลี่ยนไอเทมกับผู้เล่นอื่น ล็อกและยืนยันทั้งสองฝ่าย', 'ขายของ: เลือกขายได้ทุกระดับ หรือกดขายทั้งหมด']));
      case 'classes': return `<table class="tbl wkcls"><tr><th>คลาส</th><th>สาย</th><th>ธาตุ</th><th>อาวุธ</th><th>อัลติเมตชุดคลาส</th></tr>${D.CLASSES.map(c => `<tr><td><b>${esc(c.name)}</b><small> ${esc(c.th)}</small></td><td>${D.ROLES[c.role].th}</td><td>${UI.elemBadge ? UI.elemBadge(c.elem) : D.ELEM[c.elem].th}</td><td>${esc(D.WEAPON_TH[c.weapon] || c.weapon)}</td><td>${c.setUlt ? esc(c.setUlt.name) : '-'}</td></tr>`).join('')}</table>`;
    }
    return ''; } };
  // menu button
  if (UI.ICONS && UI.ICONS.MENU) UI.ICONS.MENU.wiki = k => { k.R(6, 6, 20, 22, '#3a5a9a'); k.R(8, 8, 16, 18, '#f0e8d0'); k.R(15, 6, 2, 22, '#2a3a6a'); k.R(10, 11, 4, 1, '#6a5a4a'); k.R(10, 14, 4, 1, '#6a5a4a'); k.R(18, 11, 4, 1, '#6a5a4a'); k.R(18, 14, 4, 1, '#6a5a4a'); k.C(16, 22, 2, '#ffd84a'); };
  const bind0 = UI.bindHud; UI.bindHud = function () { const r = bind0.apply(this, arguments); const m = $('#menu'); if (m && !m.querySelector('[data-p=wiki]')) { const b = document.createElement('button'); b.dataset.act = 'panel'; b.dataset.p = 'wiki'; b.innerHTML = `<img src="${UI.menuIcon('wiki')}" alt=""><span>สมุดความรู้</span>`; m.insertBefore(b, m.querySelector('[data-p=settings]')); } return r; };
  const css = document.createElement('style'); css.textContent = `.wk{margin:4px 0 8px;padding-left:18px}.wk li{margin:3px 0}kbd{display:inline-block;min-width:16px;padding:0 4px;border:1px solid #93afd8;border-bottom-width:2px;border-radius:4px;background:#fff;color:#2c4a7a;font:600 11px monospace;text-align:center;margin:0 1px}
  .wkgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:4px 10px}.wkgrid div{display:flex;flex-direction:column;font-size:12px}.wkgrid b{color:#2c4a7a}.wkcls small{color:#7a8aa8}`;
  document.head.appendChild(css);
})(window.G);
