'use strict';
/* Training dummies: rooted, unkillable, always full HP — plus a damage report (DPS meter) that appears when you stop attacking. */
(function (G) {
  const U = G.U, D = G.D, E = G.E, W = G.W, S = G.S, UI = G.UI; const $ = s => document.querySelector(s); const esc = UI.esc;
  let ses = null, shown = null;
  const install = () => { if (E._dm) return; E._dm = true;
    const h0 = E.hit; E.hit = (src, t, pow, s, o) => { if (!t || !t.dummy) return h0(src, t, pow, s, o); E.lastCrit = false; const r = h0(src, t, pow, s, o); const dmg = typeof r === 'number' ? r : 0; const crit = !!E.lastCrit; t.hp = t.maxhp; t.dead = false; t.shield = 0;
      const own = src && (src.owner || src); const P = W.player; if (P && dmg > 0 && (own === P || (own && own.owner === P))) log(src, own, s, dmg, crit); return r; };
    const k0 = E.kill; E.kill = (t, k) => { if (t && t.dummy) { t.hp = t.maxhp; t.dead = false; return; } return k0(t, k); };
    const c0 = E.applyCC; E.applyCC = (src, t, cc) => { if (t && t.dummy && cc && (cc.kb || cc.pl)) { cc = Object.assign({}, cc); delete cc.kb; delete cc.pl; } return c0(src, t, cc); };
    const u0 = E.updateUnit; E.updateUnit = (u, dt) => { if (u.dummy) { if (u.hx == null) { u.hx = u.x; u.hy = u.y; } u.kb = null; u.moving = false; u.hp = u.maxhp; u.dead = false; u.x = u.hx; u.y = u.hy; } return u0(u, dt); };
  };
  document.addEventListener('DOMContentLoaded', install); setTimeout(install, 0);
  const log = (src, own, s, dmg, crit) => { const now = W.time; if (!ses || now - ses.last > 3) { ses = { t0: now, last: now, dmg: 0, hits: 0, crits: 0, max: 0, by: {}, targets: new Set() }; shown = null; }
    ses.last = now; ses.dmg += dmg; ses.hits++; if (crit) ses.crits++; if (dmg > ses.max) ses.max = dmg;
    const key = own !== src && src.kind ? 'สัตว์อัญเชิญ / ป้อม' : s && s.name ? s.name : 'โจมตีปกติ'; const b = ses.by[key] || (ses.by[key] = { dmg: 0, hits: 0, crits: 0, icon: s && s.id ? s : null }); b.dmg += dmg; b.hits++; if (crit) b.crits++; };
  const fmt = n => U.fmt(Math.round(n));
  const render = (final) => { const p = W.player; const dur = Math.max(1, (final ? ses.last : W.time) - ses.t0 + (final ? 0.5 : 0)); const dps = ses.dmg / dur; const st = p.st;
    const rows = Object.entries(ses.by).sort((a, b) => b[1].dmg - a[1].dmg).slice(0, final ? 10 : 3);
    return `<div class="dp-h"><b>${final ? 'สรุปการทดสอบดาเมจ' : 'กำลังทดสอบดาเมจ'}</b><span>${dur.toFixed(1)} วิ</span>${final ? '<button class="dp-x" data-act="dps-x">✕</button>' : ''}</div>
      <div class="dp-big"><div><small>DPS</small><b>${fmt(dps)}</b></div><div><small>ดาเมจรวม</small><b>${fmt(ses.dmg)}</b></div></div>
      ${final ? `<div class="dp-grid"><span>จำนวนครั้ง</span><b>${ses.hits}</b><span>คริติคอล</span><b>${Math.round(ses.crits / ses.hits * 100)}%</b><span>ดาเมจสูงสุด</span><b>${fmt(ses.max)}</b><span>เฉลี่ย/ครั้ง</span><b>${fmt(ses.dmg / ses.hits)}</b></div>
      <div class="dp-sk">${rows.map(([n, b]) => `<div class="dp-r">${b.icon ? `<img src="${UI.skillIcon(b.icon)}" alt="">` : '<i></i>'}<span>${esc(n)}</span><em><u style="width:${Math.round(b.dmg / ses.dmg * 100)}%"></u></em><b>${fmt(b.dmg)}</b><small>${Math.round(b.dmg / ses.dmg * 100)}% · ${b.hits} ครั้ง</small></div>`).join('')}</div>
      <div class="dp-st"><b>ค่าพลังตอนทดสอบ</b><span>OP ${fmt(p.cpv || (E.cp ? E.cp(st) : 0))}</span><span>ATK ${fmt(st.atk)}</span><span>คริ ${Math.round(st.crit || 0)}%</span><span>แรงคริ +${Math.round(st.critDmg || 0)}%</span><span>ความเร็วโจมตี +${Math.round(st.aspd || 0)}%</span><span>ลดคูลดาวน์ ${Math.round(st.cdr || 0)}%</span><span>ธาตุ ${D.ELEM[D.CLS[p.cls].elem].th}</span></div>
      <p class="muted">หยุดตี 3 วิ = จบรอบ · ตีใหม่เพื่อเริ่มรอบถัดไป</p>` : rows.map(([n, b]) => `<div class="dp-mini"><span>${esc(n)}</span><b>${fmt(b.dmg)}</b></div>`).join('')}`; };
  setInterval(() => { try { let box = $('#dpsrep'); if (!ses || !W.player || !W.mode || W.mode.kind !== 'gallery') { if (box) box.hidden = true; if (!W.mode || W.mode.kind !== 'gallery') ses = null; return; } if (!box) { box = document.createElement('div'); box.id = 'dpsrep'; (document.getElementById('hud') || document.body).appendChild(box); }
      const idle = W.time - ses.last; if (idle > 2.5) { if (shown !== ses) { shown = ses; box.innerHTML = render(true); box.className = 'final'; box.hidden = false; } } else { box.innerHTML = render(false); box.className = 'live'; box.hidden = false; } } catch (e) { } }, 250);
  const a0 = UI.act; UI.act = (el, e) => { if (el.dataset.act === 'dps-x') { const b = $('#dpsrep'); if (b) b.hidden = true; ses = null; return; } return a0(el, e); };
  const css = document.createElement('style'); css.textContent = `
  #dpsrep{position:absolute;left:50%;transform:translateX(-50%);top:calc(70px + env(safe-area-inset-top,0px));z-index:6;background:linear-gradient(180deg,rgba(30,24,40,.95),rgba(14,11,20,.94));border:1px solid #6a5a3a;border-radius:10px;padding:8px 12px;color:#eee;font-size:12px;min-width:220px;box-shadow:0 8px 24px rgba(0,0,0,.5);pointer-events:auto}
  #dpsrep.final{width:min(380px,92vw)}#dpsrep .dp-h{display:flex;gap:8px;align-items:center;justify-content:space-between;margin-bottom:4px}#dpsrep .dp-h b{color:#ffd84a}
  #dpsrep .dp-x{background:none;border:none;color:#ccc;cursor:pointer;font-size:14px}
  #dpsrep .dp-big{display:flex;gap:16px;justify-content:space-around;text-align:center}#dpsrep .dp-big b{display:block;font-size:20px;color:#fff;font-family:var(--f-px,monospace)}#dpsrep .dp-big small{color:#b8aed0}
  #dpsrep .dp-grid{display:grid;grid-template-columns:1fr auto 1fr auto;gap:2px 8px;margin:6px 0;color:#cfc6e0}#dpsrep .dp-grid b{color:#fff;text-align:right}
  #dpsrep .dp-r{display:grid;grid-template-columns:20px 1fr 70px auto;grid-template-rows:auto auto;gap:0 6px;align-items:center;margin:3px 0}#dpsrep .dp-r img,#dpsrep .dp-r i{width:20px;height:20px;grid-row:span 2;image-rendering:pixelated;background:#2a2236;border-radius:3px}
  #dpsrep .dp-r em{height:6px;background:#2a2236;border-radius:3px;overflow:hidden}#dpsrep .dp-r em u{display:block;height:100%;background:linear-gradient(90deg,#ffd84a,#ff7a3a)}
  #dpsrep .dp-r small{grid-column:2/5;color:#9a90b0;font-size:10px}#dpsrep .dp-st{display:flex;flex-wrap:wrap;gap:3px 8px;margin-top:6px;padding-top:6px;border-top:1px solid #3a3048;color:#cfc6e0}#dpsrep .dp-st b{width:100%;color:#ffd84a}
  #dpsrep .dp-mini{display:flex;justify-content:space-between;gap:10px;color:#cfc6e0}#dpsrep .muted{margin:4px 0 0;font-size:10px}`;
  document.head.appendChild(css);
})(window.G);
