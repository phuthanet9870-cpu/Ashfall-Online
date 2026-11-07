'use strict';
/* Monster book v2: every monster on every map shows its full drop list — grade, drop chance, item count, item tiers,
   the item types it can drop (with icons), the 100-design catalog items in its tier band, its own material (junk),
   gold/EXP — plus kill progress. Each species now drops its own fixed material. */
(function (G) {
  const U = G.U, D = G.D, S = G.S, UI = G.UI, E = G.E; const esc = UI.esc;
  const hashOf = s => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const junkOf = name => D.JUNK && D.JUNK.length ? D.JUNK[hashOf(name) % D.JUNK.length] : null;
  // fixed material per species
  const dl0 = S.dropLoot; S.dropLoot = (x, y, it) => { if (it && it.kind === 'junk' && !it._fix && G.W._lastKill && G.W._lastKill.md) { const j = junkOf(G.W._lastKill.md.n); if (j) { it.k = j[0]; it.name = j[1]; } it._fix = 1; } return dl0(x, y, it); };
  const ins = () => { if (E._cx2) return; E._cx2 = true; const k0 = E.kill; E.kill = (t, k) => { G.W._lastKill = t; try { return k0(t, k); } finally { G.W._lastKill = null; } }; }; setTimeout(ins, 0); document.addEventListener('DOMContentLoaded', ins);
  const GT = ['normal', 'elite', 'champion', 'rare', 'boss', 'world'];
  const tierRange = (M, boss) => { const d = D.farmDist ? D.farmDist(M, boss) : [[M, 1]]; const ts = d.map(x => x[0]); return [Math.min(...ts), Math.max(...ts), d]; };
  const ICONS = (t) => [['อาวุธ', UI.itemIcon({ kind: 'gear', slot: 'weapon', wpn: 'sword', tier: t, name: 'w' })], ['เกราะ', UI.itemIcon({ kind: 'gear', slot: 'chest', tier: t, name: 'a' })], ['เครื่องประดับ', UI.itemIcon({ kind: 'acc', slot: 'ring1', tier: t, name: 'r' })], ['เจม', UI.itemIcon({ kind: 'gem', gem: 'ruby', tier: t, name: 'g' })], ['หินตีบวก', UI.bagIcon('stone', t - 1)], ['Rune Dust', UI.bagIcon('runeDust')], ['Jewel Dust', UI.bagIcon('jewelDust')], ['หินสุ่มออปชั่น', UI.bagIcon('reroll')]];
  const pct = v => (v >= 1 ? '100' : (v * 100).toFixed(v < 0.1 ? 1 : 0)) + '%';
  const card = (map, md, grade) => { const s = S.save; const g = D.GRADES[grade]; const M = map.B + g.bonus; const [lo, hi, dist] = tierRange(M, g.boss); const n = s.codex[md.n] || 0; const j = junkOf(md.n);
    const cnt = g.drop >= 1 ? (grade === 'world' ? '3–5' : g.n || 1) : 1; const cats = (D.ITEM_CATALOG ? ['weapon', 'armor', 'acc'].flatMap(c => D.ITEM_CATALOG[c] || []) : []).filter(d => d.tmin <= hi && d.tmax >= lo);
    const pick = cats.filter((_, i) => i % Math.max(1, Math.floor(cats.length / 8)) === 0).slice(0, 8);
    return `<div class="cxm" style="--gc:${g.col}"><div class="cxh"><b>${esc(md.n)}</b><span class="cxg">${esc(g.th)}</span><small>${Math.min(50, n)}/50</small></div>
      <div class="cxr"><span>โอกาสดรอป <b>${pct(g.drop)}</b></span><span>จำนวน <b>${cnt}</b> ชิ้น</span><span>ระดับไอเทม <b style="color:${D.TIERS[lo - 1].c}">${lo}</b>–<b style="color:${D.TIERS[hi - 1].c}">${hi}</b></span></div>
      <div class="cxd">${dist.map(([t, w]) => `<i style="flex:${w};background:${D.TIERS[t - 1].c}" title="ระดับ ${t} ${D.TIERS[t - 1].th} ${(w * 100).toFixed(0)}%"></i>`).join('')}</div>
      <div class="cxi">${ICONS(hi).map(([l, src]) => `<span title="${l}"><img src="${src}" alt="">${l}</span>`).join('')}${j ? `<span title="วัตถุดิบเฉพาะตัว"><img src="${UI.junkIcon(j[0])}" alt="">${esc(j[1])} ${g.boss ? '3–6' : '32%'}</span>` : ''}</div>
      ${pick.length ? `<div class="cxc"><small>ตัวอย่างไอเทมดีไซน์ที่ดรอปได้:</small>${pick.map(d => `<img src="${UI.itemIcon({ cat: d.id, tier: hi, kind: d.cat === 'acc' ? 'acc' : 'gear', slot: d.slot, wpn: d.w, name: d.name })}" title="${esc(d.name)}" alt="">`).join('')}</div>` : ''}
      ${grade === 'world' ? '<p class="muted">ผู้ทำดาเมจ 10% ขึ้นไปได้ไอเทมเพิ่ม 1 ชิ้น</p>' : ''}</div>`; };
  const cx0 = UI.PANELS.codex.render; UI.PANELS.codex.render = function (tab, P) { const h = cx0.call(this, tab, P); if (tab !== 'mon') return h; const s = S.save; P.cxm = P.cxm ?? 0; const m = D.FARM_MAPS[P.cxm] || D.FARM_MAPS[0];
    const done = Object.values(s.codex).filter(n => n >= 50).length; const head = h.slice(0, h.indexOf('<p class="muted">ฆ่าครบ'));
    const list = [...m.mobs.map(x => [x, 'normal']), ...m.mobs.slice(0, 1).map(x => [x, 'elite']), [m.champ, 'champion'], [m.rare, 'rare'], [m.boss, 'boss'], [m.world, 'world']].filter(x => x[0]);
    return head + `<p class="muted">ฆ่าครบ 50 ตัวต่อชนิด ได้ ATK +0.25% (สูงสุด 5%) · ครบแล้ว ${done} ชนิด · ทุกไอเทมที่ดรอปจะสุ่มค่าพลังใหม่ทุกครั้ง</p>
      <div class="chips cxmaps">${D.FARM_MAPS.map((x, i) => `<button class="chip ${i === P.cxm ? 'on' : ''}" data-act="cx-map" data-i="${i}">${esc(x.th)} <small>Lv${x.lv[0]}–${x.lv[1]}</small></button>`).join('')}</div>
      <h4>${esc(m.th)} — ระดับดรอปพื้นฐาน B=${m.B}</h4><div class="cxgrid">${list.map(([md, g]) => card(m, md, g)).join('')}</div>`; };
  const a0 = UI.act; UI.act = (el, e) => { if (el.dataset.act === 'cx-map') { UI.panel.cxm = +el.dataset.i; UI.renderPanel(); return; } return a0(el, e); };
  const css = document.createElement('style'); css.textContent = `.cxmaps{margin:6px 0}.cxgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px}
  .cxm{border:1px solid #4a3c22;border-left:3px solid var(--gc);border-radius:9px;background:linear-gradient(180deg,#1c1915,#110f0c);padding:9px 11px;display:flex;flex-direction:column;gap:6px}
  .cxh{display:flex;align-items:center;gap:8px}.cxh b{font-size:14.5px;color:#f2e6c8}.cxg{font-size:11px;padding:1px 8px;border-radius:9px;border:1px solid var(--gc);color:var(--gc)}.cxh small{margin-left:auto;color:#a89c84}
  .cxr{display:flex;flex-wrap:wrap;gap:10px;font-size:12px;color:#c8bca0}.cxr b{color:#f2d27a}.cxd{display:flex;height:6px;border-radius:3px;overflow:hidden;background:#0a0908}
  .cxi{display:flex;flex-wrap:wrap;gap:5px}.cxi span{display:flex;align-items:center;gap:4px;font-size:11px;padding:2px 7px 2px 2px;border-radius:12px;background:#0c0a08;border:1px solid #3a2e1a;color:#d8ccb0}.cxi img{width:22px;height:22px}
  .cxc{display:flex;flex-wrap:wrap;align-items:center;gap:4px}.cxc small{width:100%;color:#a89c84}.cxc img{width:30px;height:30px;border-radius:5px;background:#0c0a08;border:1px solid #3a2e1a}`; document.head.appendChild(css);
})(window.G);
