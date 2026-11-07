'use strict';
/* Solid props + "behind" ghosting.
   · Every standing prop (market stalls, lamps, barrels, crates, signs, statues, wells, racks, trees …) gets a solid base
     footprint: about its width × the bottom third of its height. Bridges, arches/gates and flat ground decals stay
     walkable. Anyone left standing inside a new footprint is moved to the nearest free tile.
   · A hero standing behind a prop (prop drawn in front of him) is drawn as a faint see-through shadow. */
(function (G) {
  const E = G.E, W = G.W, S = G.S; if (!E) return;
  const NOBLK = /bridge|arch|rug|carpet|path|road|decal|flower_bed|puddle|grass|shadow|portal|plaza|mat\b/i;
  const TS = () => G.TS || 16;
  const box = (p) => { const s = p.spr; if (!s || !s.w || !s.h) return null; const wT = s.w / TS(), hT = s.h / TS(); return { wT, hT }; };
  const process = (m) => { if (!m || m._pblk || !m.props || !m.block) return; m._pblk = true; const grid = new Map(); m._pgrid = grid;
    for (const p of m.props) { if (!p || p.removed || !p.spr) continue; const b = box(p); if (!b) continue; const key = String(p.spr.bt || p.bt || p.kind || '');
      const gk = Math.floor(p.x / 4) + ',' + Math.floor(p.y / 4); (grid.get(gk) || grid.set(gk, []).get(gk)).push(p);
      if (NOBLK.test(key) || p.kind === 'portal' || (b.hT < 0.75 && b.wT < 0.9)) continue;
      const tree = p.spr.nat === 'trees'; const half = tree ? 0.35 : Math.max(0.35, b.wT * 0.42); const depth = tree ? 0.6 : Math.min(2.6, Math.max(0.6, b.hT * 0.3));
      for (let cy = Math.floor(p.y - depth); cy <= Math.floor(p.y - 0.05); cy++) for (let cx = Math.floor(p.x - half); cx <= Math.floor(p.x + half - 0.01); cx++) {
        if (cx < 0 || cy < 0 || cx >= m.w || cy >= m.h) continue; const i = cy * m.w + cx; if (m.block[i] === 0 && (cx + 0.5) >= p.x - half - 0.2 && (cx + 0.5) <= p.x + half + 0.2) m.block[i] = 2; } }
    // unstick anyone inside a new footprint
    for (const u of W.units || []) { if (!u || u.dead || u.kind === 'struct') continue; if (m.block[Math.floor(u.y) * m.w + Math.floor(u.x)]) { const pt = S.freePt ? S.freePt(m, u.x, u.y + 1) : null; if (pt) { u.x = pt.x; u.y = pt.y; } } } };
  const up0 = E.update; E.update = function () { try { if (W.map && !W.map._pblk) process(W.map); } catch (e) { } return up0.apply(this, arguments); };
  // is unit u behind a prop (the prop's sprite covers him and the prop stands in front)?
  G.PROPOCC = (u) => { const m = W.map; if (!m || !m._pgrid || !u) return false; const gx = Math.floor(u.x / 4), gy = Math.floor(u.y / 4);
    for (let dy = 0; dy <= 2; dy++) for (let dx = -1; dx <= 1; dx++) { const L = m._pgrid.get((gx + dx) + ',' + (gy + dy)); if (!L) continue;
      for (const p of L) { if (p.removed || p.y <= u.y + 0.15) continue; const b = box(p); if (!b || b.hT < 1.1) continue; if (Math.abs(p.x - u.x) < b.wT * 0.45 && u.y > p.y - b.hT * 0.92) return true; } }
    return false; };
})(window.G);
