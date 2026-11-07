'use strict';
/* VFX quality levels that actually change what is drawn: 0 = ต่ำ, 1 = ปกติ, 2 = อลังการ */
(function (G) {
  const U = G.U, V = G.VFX, FX = G.FX, TX = G.TX;
  V.LEVELS = [
    { th: 'ต่ำ', q: 0.4, fxCap: 260, pCap: 500, shake: 0.5, flash: 0.5, desc: 'ปิดแสงเรือง · เอฟเฟกต์หลักชั้นเดียว · ไม่มีแสงพื้น/ละออง/รอยพื้น · อนุภาค 40%' },
    { th: 'ปกติ', q: 1, fxCap: 600, pCap: 1500, shake: 1, flash: 1, desc: 'เอฟเฟกต์ครบทุกชั้น · แสงเรือง 1 ชั้น' },
    { th: 'อลังการ', q: 1.6, fxCap: 1000, pCap: 2600, shake: 1.35, flash: 1.2, desc: 'แสงเรือง 2 ชั้น · อนุภาค 160% · ประกายและระเบิดเสริม · ละอองค้างนานขึ้น' }
  ];
  V.level = 1;
  V.setLevel = (i) => { V.level = U.clamp(i | 0, 0, 2); V.quality = V.LEVELS[V.level].q; if (G.S && G.S.save) G.S.save.settings.quality = V.quality; };
  V.levelFromQuality = (q) => q <= 0.5 ? 0 : q >= 1.3 ? 2 : 1;

  // gate every effect object: low drops decorative layers and caps the total
  const DECOR = { gglow: 1, decal: 1, rain: 1, glow: 1, sigil: 1, links: 1, rays: 1, columns: 1, orbit: 1, spiral: 1 };
  const push0 = Array.prototype.push;
  V.fx.push = function (o) {
    const L = V.LEVELS[V.level];
    if (V.level === 0 && !V._ult && o && (DECOR[o.k] || (o.k === 'tex' && o.kind === 'spark') || (o.k === 'circleTex' && !o.follow && o.r < 2.5) || (o.k === 'shape' && Math.random() < 0.45))) return this.length;
    if (o && typeof o.x === 'number' && !o.follow && G.W && G.W.cam) { const c = G.W.cam, mx = (G.E.VW || 400) / G.TS * 0.5 + 6, my = (G.E.VH || 300) / G.TS * 0.5 + 6; if (Math.abs(o.x - c.x) > mx || Math.abs(o.y - c.y) > my) return this.length; }
    if (this.length >= L.fxCap && o && o.k !== 'tele' && o.k !== 'vig') return this.length;
    return push0.call(this, o);
  };
  const shake0 = V.shake; V.shake = (a, d) => shake0(a * V.LEVELS[V.level].shake, d);
  const flash0 = V.flash; V.flash = (c, d = 0.2) => { if (V.level === 0 && d < 0.2) return; flash0(c, d * V.LEVELS[V.level].flash); };

  // per-skill flourish scaling
  const at0 = FX.at;
  FX.at = (u, s, x, y, ang, o = {}) => {
    if (V.level === 0) { if (s && s.ult) { V._ult = true; try { at0(u, s, x, y, ang, o); } finally { V._ult = false; } return; } return at0(u, s, x, y, ang, Object.assign({}, o, { light: true })); }
    at0(u, s, x, y, ang, o);
    if (V.level === 2 && s && s.id && !o.light && !(G.FX6 && G.FX6.REC[s.cls]) && G.E.vis(x, y)) {
      const el = s.elem;
      TX.sparks(x, y, el, 8, 3.5, 14);
      V.tex(x, y, el, 'burst', { sc: 0.6, dur: 0.5, z: 22, delay: 0.08 });
      for (let i = 0; i < 4; i++) V.tex(x + U.rf(-1.2, 1.2), y + U.rf(-0.8, 0.8), el, 'spark', { vz: U.rf(5, 15), z: U.rf(10, 40), dur: U.rf(1.6, 2.4), once: false, fps: 5, alpha: 0.9 });
      if (s.c >= 2 || s.ult) V.ring(x, y, (o.r || s.r || 1.5) * 1.3, G.D.ELEM[el].pal, 0.55, { w: 2 });
    }
  };
  const cast0 = FX.cast;
  FX.cast = (u, s, A) => { if (V.level === 0 && !s.ult) return; V._ult = !!s.ult; try { cast0(u, s, A); } finally { V._ult = false; } if (V.level === 2 && s.id && !(G.FX6 && G.FX6.REC[s.cls]) && G.E.vis(u.x, u.y)) TX.sparks(u.x, u.y, s.elem, 6, 2, 20); };
})(window.G);
