'use strict';
/* Hover-and-hold tooltips (≈0.25 s) for everything on the combat HUD: every skill slot in both rows (attacks, buffs,
   ultimates, class-set ultimate), passives, and the buff/debuff icons on the player and target frames. */
(function (G) {
  const U = G.U, D = G.D, S = G.S, UI = G.UI, E = G.E, W = G.W; const esc = UI.esc;
  const tip = document.createElement('div'); tip.id = 'sktip2'; tip.hidden = true; document.body.appendChild(tip);
  const ST = {
    burn: ['ไหม้', 'เสียเลือดต่อเนื่องจากไฟ', 0], bleed: ['เลือดออก', 'เสียเลือดต่อเนื่อง', 0], toxin: ['พิษ', 'เสียเลือดต่อเนื่องจากพิษ ซ้อนได้', 0], chill: ['หนาวเย็น', 'ช้าลง ซ้อนครบจะถูกแช่แข็ง', 0],
    frozen: ['แช่แข็ง', 'ขยับ/ใช้สกิลไม่ได้', 0], mark: ['ถูกหมายหัว', 'รับดาเมจเพิ่มขึ้น', 0], sunder: ['เกราะแตก', 'DEF ลดลง', 0], weaken: ['อ่อนแรง', 'ทำดาเมจลดลง', 0], blind: ['ตาบอด', 'โจมตีพลาดง่าย', 0],
    fear: ['หวาดกลัว', 'วิ่งหนี ควบคุมตัวไม่ได้', 0], taunt: ['ถูกยั่วยุ', 'ถูกบังคับให้โจมตีผู้ยั่วยุ', 0], stun: ['มึนงง', 'ขยับ/โจมตี/ใช้สกิลไม่ได้', 0], root: ['ตรึง', 'เดินไม่ได้ แต่ยังโจมตีได้', 0],
    slow: ['ช้าลง', 'ความเร็วเดินลดลง', 0], silence: ['ใบ้', 'ใช้สกิลไม่ได้', 0], timeLock: ['ล็อกเวลา', 'ถูกหยุดเวลา', 0], starMark: ['ตราดาว', 'สะสมครบจะระเบิด', 0],
    shield: ['โล่', 'ดูดซับดาเมจ', 1], stack: ['สะสมพลัง', 'สะสมแต้มเพิ่มพลังโจมตี', 1], empower: ['เสริมพลัง', 'สกิลถัดไปแรงขึ้น', 1], imbue: ['อาวุธธาตุ', 'การโจมตีติดธาตุเพิ่ม', 1],
    reflect: ['สะท้อน', 'สะท้อนดาเมจกลับผู้โจมตี', 1], thorns: ['หนาม', 'ผู้โจมตีระยะประชิดเสียเลือด', 1], regen: ['ฟื้นฟู', 'ฟื้นเลือดต่อเนื่อง', 1], immune: ['ต้านทาน CC', 'ไม่ติดสถานะควบคุม', 1],
    invuln: ['อมตะ', 'ไม่รับดาเมจ', 1], lastStand: ['ยืนหยัด', 'เลือดไม่ลดต่ำกว่า 1', 1], stealth: ['ล่องหน', 'ศัตรูมองไม่เห็น', 1],
    atk: ['ATK', 'พลังโจมตี', 1], def: ['DEF', 'พลังป้องกัน', 1], aspd: ['ความเร็วโจมตี', 'ความเร็วโจมตี', 1], crit: ['คริติคอล', 'โอกาสคริติคอล', 1], spd: ['ความเร็วเดิน', 'ความเร็วเดิน', 1], ls: ['ดูดเลือด', 'ฟื้นเลือดตามดาเมจที่ทำ', 1], cdr: ['ลดคูลดาวน์', 'คูลดาวน์สกิลเร็วขึ้น', 1]
  };
  const KIND = { atk: ['โจมตี', '#e8dcc0'], buff: ['บัฟ', '#4ad6c8'], ult: ['อัลติเมต', '#ffd84a'], set: ['อัลติเมตชุดคลาส', '#ff8ad8'] };
  const kindOf = i => (D.SLOT_KIND ? D.SLOT_KIND(i) : i < 15 ? 'atk' : i < 20 ? 'buff' : i < 24 ? 'ult' : 'set');
  const skillHtml = (i) => { const p = W.player; if (!p) return ''; const sk = E.skillOf(p, i); if (!sk) return ''; const c = D.CLS[S.save.cls]; const kd = KIND[kindOf(i)] || KIND.atk;
    const arch = D.ARCH[sk.arch] || {}; const el = D.ELEM[sk.elem] || {}; const cd = p.cds && p.cds[i] > 0 ? p.cds[i] : 0; const lock = sk.unlock && S.save.lvl < sk.unlock && !W.gm.allSkills;
    const desc = esc(D.descSkill(sk) || '').replace(/ · ✦ /g, '</p><p class="r">✦ ');
    const atk = p.st && p.st.atk ? p.st.atk : 0; const dmg = sk.dmg !== false && sk.p > 0 && atk ? Math.round(sk.p * atk) : 0;
    const cc = sk.cc ? Object.entries(sk.cc).filter(([k]) => D.CC_TH && D.CC_TH[k]).map(([k, v]) => `${D.CC_TH[k]} ${v}`) : [];
    const facts = [sk.R ? `ระยะ ${sk.R}` : '', sk.r ? `รัศมี ${sk.r}` : '', sk.n > 1 ? `${sk.n} ครั้ง` : '', sk.d ? `นาน ${sk.d} วิ` : '', dmg ? `ดาเมจ ≈ ${U.fmt(dmg)} (${sk.p}×ATK)` : '', ...cc].filter(Boolean);
    return `<div class="h"><img src="${UI.skillIcon(sk)}" alt=""><div><b>${esc(sk.name)}</b><small><span class="k" style="color:${kd[1]};border-color:${kd[1]}">${kd[0]}</span> [${esc(D.KEYS[i] || '')}] ${esc(arch.th || '')}${el.th ? ' · ธาตุ' + esc(el.th) : ''}${sk.variant && D.VARIANTS[sk.variant] ? ' · รูน' + esc(D.VARIANTS[sk.variant].th) : ''}</small></div></div>
      <p>${desc}</p>${facts.length ? `<div class="fx">${facts.map(f => `<span>${esc(f)}</span>`).join('')}</div>` : ''}
      <div class="f"><span>⏱ คูลดาวน์ ${(+sk.c || 0).toFixed(1)} วิ</span>${sk.m ? `<span>💧 ${sk.m} ${esc(c.res || '')}</span>` : ''}${sk.unlock ? `<span>Lv${sk.unlock}</span>` : ''}${cd ? `<span class="cdn">เหลือ ${cd.toFixed(1)} วิ</span>` : ''}${lock ? '<span class="cdn">ยังไม่ปลดล็อก</span>' : ''}</div>`; };
  const passiveHtml = (x, icon) => `<div class="h">${icon ? `<img src="${icon}" alt="">` : ''}<div><b>${esc(x.name)}</b><small><span class="k" style="color:#c07aff;border-color:#c07aff">${x.k === 'sig' ? 'แพสซีฟประจำคลาส' : 'แพสซีฟ'}</span> ปลดล็อก Lv${x.lv}${W.player && W.player.lvl < x.lv ? ' · <span class="cdn">ยังไม่ปลดล็อก</span>' : ' · ทำงานตลอด'}</small></div></div><p>${esc(x.th)}</p>`;
  const statusHtml = (k, el) => { const d = ST[k] || [k, '', 1]; const ic = UI.statusIcon(k); const left = el && el.querySelector('i') ? el.querySelector('i').textContent : ''; const n = el && el.querySelector('b') ? el.querySelector('b').textContent : '';
    const good = ic ? ic.good : d[2]; return `<div class="h"><img src="${ic ? ic.url : ''}" alt=""><div><b>${esc(d[0])}${n ? ' ×' + esc(n) : ''}</b><small><span class="k" style="color:${good ? '#4ad6c8' : '#ff6a5a'};border-color:${good ? '#4ad6c8' : '#ff6a5a'}">${good ? 'บัฟ' : 'ดีบัฟ'}</span>${left ? ' · เหลือ ' + esc(left) + ' วิ' : ''}</small></div></div>${d[1] ? `<p>${esc(d[1])}</p>` : ''}`; };
  // ---------- hover-and-hold ----------
  let cur = null, timer = 0;
  const place = (el) => { const r = el.getBoundingClientRect(); const w = tip.offsetWidth, h = tip.offsetHeight; let x = r.left + r.width / 2 - w / 2, y = r.top - h - 10; if (y < 8) y = r.bottom + 10; if (el.closest('#passives')) { x = r.right + 10; y = r.top; } tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, x)) + 'px'; tip.style.top = Math.max(8, Math.min(innerHeight - h - 8, y)) + 'px'; };
  const contentFor = (el) => {
    if (el.matches('[data-sk]')) return skillHtml(+el.dataset.sk);
    if (el.matches('#passives [data-pv]') && W.player) { const x = D.CLS[W.player.cls].passives[+el.dataset.pv]; const im = el.querySelector('img'); return x ? passiveHtml(x, im && im.src) : ''; }
    if (el.matches('#buffs .sti')) { const k = el.getAttribute('title') || el.dataset.k; if (k) { el.dataset.k = k; el.removeAttribute('title'); } return k ? statusHtml(el.dataset.k, el) : ''; }
    if (el.matches('#tdebuffs img')) return statusHtml(el.getAttribute('alt'), null);
    return ''; };
  const SEL = '[data-sk], #passives [data-pv], #buffs .sti, #tdebuffs img';
  const show = (el) => { const h = contentFor(el); if (!h) return; tip.innerHTML = h; tip.hidden = false; place(el); };
  document.addEventListener('mouseover', e => { const el = e.target.closest && e.target.closest(SEL); if (el === cur) return; cur = el; clearTimeout(timer); if (!el) { tip.hidden = true; return; } if (!tip.hidden) show(el); else timer = setTimeout(() => { if (cur === el && el.isConnected) show(el); }, 250); });
  document.addEventListener('mouseout', e => { if (cur && (!e.relatedTarget || !cur.contains(e.relatedTarget))) { cur = null; clearTimeout(timer); tip.hidden = true; } });
  document.addEventListener('mousedown', () => { tip.hidden = true; });
  // keep the live cooldown ticking while it's open
  setInterval(() => { if (!tip.hidden && cur && cur.isConnected && cur.matches('[data-sk]')) { tip.innerHTML = contentFor(cur); } else if (!tip.hidden && cur && !cur.isConnected) tip.hidden = true; }, 300);
  // touch: long-press shows it
  let lp = 0; document.addEventListener('touchstart', e => { const el = e.target.closest && e.target.closest(SEL); clearTimeout(lp); if (!el) return; lp = setTimeout(() => { cur = el; show(el); setTimeout(() => { tip.hidden = true; }, 3000); }, 450); }, { passive: true });
  document.addEventListener('touchend', () => clearTimeout(lp), { passive: true });
  const css = document.createElement('style'); css.textContent = `#sktip,#pvtip{display:none!important}
    #sktip2{position:fixed;z-index:9600;pointer-events:none;width:min(330px,92vw);background:linear-gradient(180deg,#1e1a16,#0e0c0a);border:1px solid #a8843a;border-radius:10px;padding:9px 11px;color:#e8dcc0;font-size:12.5px;line-height:1.45;box-shadow:0 8px 28px rgba(0,0,0,.7),inset 0 0 0 1px rgba(255,216,120,.08)}
    #sktip2 .h{display:flex;gap:9px;align-items:center;margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid #3a2f1c}
    #sktip2 .h img{width:42px;height:42px;border:1px solid #6a5530;border-radius:6px;image-rendering:pixelated;flex:none}
    #sktip2 .h b{display:block;color:#f2d27a;font-size:14.5px}#sktip2 .h small{color:#b8a888;font-size:11px}
    #sktip2 .k{display:inline-block;border:1px solid;border-radius:4px;padding:0 4px;margin-right:4px;font-size:10.5px;font-weight:700}
    #sktip2 p{margin:4px 0}#sktip2 p.r{color:#9fe8ff}
    #sktip2 .fx,#sktip2 .f{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}#sktip2 .fx span,#sktip2 .f span{background:#241d14;border:1px solid #3e321e;border-radius:4px;padding:1px 6px;font-size:11px}
    #sktip2 .cdn{color:#ff8a7a!important}`;
  document.head.appendChild(css);
})(window.G);
