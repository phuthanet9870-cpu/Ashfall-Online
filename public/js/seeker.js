'use strict';
/* Seeker-style heroes: soft coloured back-glow behind each hero (brighter while casting) */
(function (G) {
  const D = G.D, E = G.E, W = G.W;
  const FLOAT = { reaper: 2, seraph: 1.5, deity: 1.5 };
  const du0 = E.drawUnit;
  E.drawUnit = (ctx, u) => {
    if (u.kind === 'hero' && !u.dead && u.cls && D.CLS[u.cls] && W.cam && !(u.stealth > 0 && u.team !== 0)) {
      const [sx, sy] = W.cam.w2s(u.x, u.y); const c = D.ELEM[D.CLS[u.cls].elem].pal[1]; const cast = u.anim && (u.anim.s === 'cast' || u.anim.s === 'attack');
      const r = cast ? 17 : 13, a = cast ? 0.32 : 0.16 + 0.04 * Math.sin(W.time * 2 + u.id);
      const g = ctx.createRadialGradient(sx, sy - 14, 1, sx, sy - 14, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fillRect(sx - r, sy - 14 - r, r * 2, r * 2); ctx.restore();
    }
    const fl = u.kind === 'hero' && !u.dead && FLOAT[u.cls]; if (fl) { const j0 = u.jz || 0; u.jz = j0 + 1.5 + Math.sin(W.time * 2.4 + u.id) * fl; const r = du0(ctx, u); u.jz = j0; return r; }
    return du0(ctx, u);
  };
})(window.G);
