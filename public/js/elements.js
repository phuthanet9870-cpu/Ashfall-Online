'use strict';
/* Elemental affinity: 7 element families with a counter cycle.
   ไฟ → ธรรมชาติ → พายุ → น้ำแข็ง → ไฟ (each beats the next) · แสง ⇄ มืด (beat each other) · same family resists · กลาง neutral.
   Advantage ×1.3 · disadvantage ×0.75 · same family ×0.85. Applies to every hit: skills, basic attacks, monsters and bosses. */
(function (init) {
  (globalThis.ASHFALL_SIM_FACTORIES ||= {})['elements'] = init;
  if (typeof window !== 'undefined') init(window.G ||= {});
})(function (G) {
  const U = G.U, D = G.D, E = G.E, W = G.W, V = G.VFX, UI = G.UI;
  const FAM = {
    fire: { th: 'ไฟ', c: '#ff7a3a', icon: 'flame', els: ['fire', 'infernal', 'fel'] },
    nature: { th: 'ธรรมชาติ', c: '#7ad04a', icon: 'leaf', els: ['nature', 'poison', 'wind'] },
    storm: { th: 'พายุ', c: '#ffe04a', icon: 'bolt', els: ['lightning', 'tech', 'star'] },
    frost: { th: 'น้ำแข็ง', c: '#6ac8ff', icon: 'snow', els: ['ice', 'time'] },
    light: { th: 'แสง', c: '#fff2a8', icon: 'halo', els: ['holy', 'light', 'divine', 'celestial'] },
    dark: { th: 'มืด', c: '#b06aff', icon: 'skull', els: ['shadow', 'dark', 'umbra', 'death', 'blood', 'chaos'] },
    neutral: { th: 'กลาง', c: '#c8c8d0', icon: 'orb', els: ['phys', 'chi', 'arcane', 'jester'] }
  };
  const BEATS = { fire: ['nature'], nature: ['storm'], storm: ['frost'], frost: ['fire'], light: ['dark'], dark: ['light'], neutral: [] };
  const OF = {}; for (const [k, f] of Object.entries(FAM)) for (const e of f.els) OF[e] = k;
  D.ELEM_FAM = FAM; D.ELEM_BEATS = BEATS; D.famOf = e => OF[e] || 'neutral';
  D.elemMult = (atkEl, defEl) => { const a = D.famOf(atkEl), d = D.famOf(defEl); if (a === 'neutral' || d === 'neutral') return 1; if (BEATS[a].includes(d)) return 1.3; if (BEATS[d].includes(a)) return 0.75; if (a === d) return 0.85; return 1; };
  // element a unit defends with: heroes use their class element, monsters their own/the map's
  E.defElem = (u) => u.kind === 'hero' && D.CLS[u.cls] ? D.CLS[u.cls].elem : (u.elem || (u.md && u.md.elem) || 'phys');
  const atkElem = (src, s) => (s && s.elem) || (src && src.kind === 'hero' && D.CLS[src.cls] ? D.CLS[src.cls].elem : src && src.elem) || 'phys';
  // ---------- class counters (PvP): each role beats the next two in the cycle ----------
  const RC = ['melee', 'ranged', 'caster', 'tank', 'assassin', 'healer', 'hybrid', 'summoner'];
  D.ROLE_BEATS = {}; RC.forEach((r, i) => D.ROLE_BEATS[r] = [RC[(i + 1) % 8], RC[(i + 2) % 8]]);
  D.roleMult = (a, d) => D.ROLE_BEATS[a] && D.ROLE_BEATS[a].includes(d) ? 1.15 : D.ROLE_BEATS[d] && D.ROLE_BEATS[d].includes(a) ? 0.9 : 1;
  const install = () => { if (E._elm) return; E._elm = true;
    const h0 = E.hit; E.hit = (src, t, pow, s, o) => { if (!t || !src || t.dummy && !(W.mode && W.mode.kind === 'gallery')) return h0(src, t, pow, s, o); const own = src.owner || src; const m = D.elemMult(atkElem(own, s), E.defElem(t));
      if (own.kind === 'hero' && t.kind === 'hero' && D.CLS[own.cls] && D.CLS[t.cls]) pow *= D.roleMult(D.CLS[own.cls].role, D.CLS[t.cls].role);
      if (m !== 1) { pow *= m; if (E.vis(t.x, t.y) && (own === W.player || t === W.player) && W.time - (t._elT || -9) > 1.2) { t._elT = W.time; V.text(t.x, t.y, m > 1 ? 'WEAK!' : 'RESIST', m > 1 ? '#ffd84a' : '#9aa0b8', { size: m > 1 ? 9 : 7, z: 44 }); } }
      return h0(src, t, pow, s, o); }; };
  if (G.headless) { install(); return; }
  document.addEventListener('DOMContentLoaded', install); setTimeout(install, 0);
  // ---------- UI: target frame badge + element chart ----------
  const badge = (e) => { const f = FAM[D.famOf(e)]; return `<span class="elb" style="--c:${f.c}">${f.th}</span>`; };
  UI.elemBadge = badge;
  const rh0 = UI.refreshHud; UI.refreshHud = function () { const r = rh0.apply(this, arguments); try { const p = W.player, t = p && p.target; const el = document.getElementById('telem') || (() => { const tf = document.getElementById('target'); if (!tf) return null; const d = document.createElement('div'); d.id = 'telem'; tf.appendChild(d); return d; })(); if (!el) return r;
      if (!t || t.dead) { if (el.dataset.k !== '') { el.dataset.k = ''; el.innerHTML = ''; } return r; } const mine = D.CLS[p.cls].elem, te = E.defElem(t); const m = D.elemMult(mine, te), back = D.elemMult(te, mine); const k = te + m + back; if (el.dataset.k === k) return r; el.dataset.k = k;
      el.innerHTML = `${badge(te)}<small class="${m > 1 ? 'good' : m < 1 ? 'bad' : ''}">${m > 1 ? '▲ คุณชนะทาง ×1.3' : m < 1 ? `▼ คุณแพ้ทาง ×${m}` : 'สมดุล'}</small>`; } catch (e) { } return r; };
  // chart in codex
  if (UI.PANELS && UI.PANELS.codex) { const P = UI.PANELS.codex; P.tabs = (P.tabs || []).concat([['elem', 'ธาตุ & คลาส']]); const r0 = P.render; P.render = function (tab, Pn) { if (tab !== 'elem') return r0.call(this, tab, Pn); const me = W.player ? D.famOf(D.CLS[W.player.cls].elem) : null;
    const rows = Object.entries(FAM).map(([k, f]) => `<tr class="${k === me ? 'me' : ''}"><td>${badge(f.els[0])}</td><td>${f.els.map(e => D.ELEM[e] ? D.ELEM[e].th : e).join(' · ')}</td><td>${BEATS[k].map(b => badge(FAM[b].els[0])).join(' ') || '-'}</td><td>${Object.keys(FAM).filter(x => BEATS[x].includes(k)).map(b => badge(FAM[b].els[0])).join(' ') || '-'}</td></tr>`).join('');
    const cls = D.CLASSES.map(c => `<span class="chip">${UI.esc(c.name)} ${badge(c.elem)}</span>`).join('');
    const RT = r => D.ROLES[r].th; const roleRows = Object.keys(D.ROLE_BEATS).map(r => `<tr><td><b>${RT(r)}</b></td><td>${D.ROLE_BEATS[r].map(RT).join(' · ')}</td><td>${Object.keys(D.ROLE_BEATS).filter(x => D.ROLE_BEATS[x].includes(r)).map(RT).join(' · ')}</td></tr>`).join('');
    return `<p class="muted">โจมตีธาตุที่ชนะทาง ดาเมจ ×1.3 · แพ้ทาง ×0.75 · ธาตุตระกูลเดียวกัน ×0.85 · ธาตุกลางไม่แพ้ไม่ชนะ · มีผลกับทุกการโจมตี ทั้งผู้เล่น มอนสเตอร์ และบอส</p>
      <div class="elcycle">${badge('fire')} → ${badge('nature')} → ${badge('lightning')} → ${badge('ice')} → ${badge('fire')} &nbsp;&nbsp; ${badge('holy')} ⇄ ${badge('shadow')}</div>
      <table class="tbl"><tr><th>ตระกูล</th><th>ธาตุในตระกูล</th><th>ชนะทาง</th><th>แพ้ทาง</th></tr>${rows}</table><h4>ธาตุของแต่ละคลาส</h4><div class="chips">${cls}</div><h4>แพ้ทาง-ชนะทางคลาส (PvP)</h4><p class="muted">ผู้เล่นปะทะผู้เล่น: สายที่ชนะทางทำดาเมจ ×1.15 · สายที่แพ้ทาง ×0.9 (คำนวณร่วมกับธาตุ)</p><table class="tbl"><tr><th>สาย</th><th>ชนะทาง</th><th>แพ้ทาง</th></tr>${roleRows}</table>`; }; }
  const css = document.createElement('style'); css.textContent = `.elb{display:inline-block;padding:0 6px;border-radius:8px;font-size:11px;font-weight:700;color:#1a1424;background:var(--c);margin:0 2px;line-height:16px}
  #telem{display:flex;gap:6px;align-items:center;margin-top:2px;font-size:11px}#telem small.good{color:#ffd84a}#telem small.bad{color:#ff8a8a}.elcycle{margin:8px 0;font-size:13px}`;
  document.head.appendChild(css);
});
