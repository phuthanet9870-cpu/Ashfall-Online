'use strict';
/* Procedural animated pixel-art VFX textures per element (orb, flame, burst, smoke, slash, beam, ring, decal, magic circle, sparkle) */
(function (G) {
  const U = G.U, D = G.D, V = G.VFX, SPR = G.SPR;
  const TX = G.TX = {};
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => v / 16 - 0.5);
  const hex = c => { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  // seamless value noise
  const mkNoise = (seed, per = 8) => { const R = U.seeded(seed); const g = []; for (let i = 0; i < per * per; i++) g.push(R());
    const at = (x, y) => g[((y % per + per) % per) * per + ((x % per + per) % per)];
    return (x, y) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy; const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      return U.lerp(U.lerp(at(ix, iy), at(ix + 1, iy), sx), U.lerp(at(ix, iy + 1), at(ix + 1, iy + 1), sx), sy); }; };
  const fbm = (n, x, y) => n(x, y) * 0.6 + n(x * 2.1 + 5, y * 2.1 + 3) * 0.3 + n(x * 4.3 + 9, y * 4.3 + 1) * 0.1;
  // paint intensity field with a 5-step palette ramp + ordered dithering (crisp pixel look)
  const paint = (w, h, pal, fn, alphaMul = 1) => {
    const [cv, x] = SPR.mk(w, h); const id = x.createImageData(w, h); const d = id.data;
    const ramp = [hex(pal[3]), hex(pal[2]), hex(pal[1]), hex(pal[0]), [255, 255, 255]];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      let I = fn(i, j); if (!(I > 0.04)) continue; I = Math.min(1, I);
      if (I <= 0.06) continue; const k = Math.min(4, Math.floor(I * 5)); const c = ramp[k]; const o = (j * w + i) * 4;
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = Math.min(255, (k === 0 ? 150 : 255) * alphaMul);
    }
    x.putImageData(id, 0, 0); return cv;
  };
  const cache = {};
  TX.get = (elem) => {
    elem = D.ELEM[elem] ? elem : 'phys'; if (cache[elem]) return cache[elem];
    const pal = D.ELEM[elem].pal; const seed = U.hash(elem); const n = mkNoise(seed, 8); const n2 = mkNoise(seed + 7, 6);
    const T = {};
    // swirling energy orb (8 frames)
    T.orb = []; for (let f = 0; f < 8; f++) { const S = 20, c = 9.5; T.orb.push(paint(S, S, pal, (i, j) => { const dx = i - c, dy = j - c, d = Math.hypot(dx, dy) / 9.5; if (d > 1) return 0; const a = Math.atan2(dy, dx); const sw = fbm(n, a * 1.27 + f * 0.75, d * 3 - f * 0.4); return Math.pow(1 - d, 1.4) * 0.85 + sw * 0.55 * (1 - d) + (d < 0.25 ? 0.4 : 0); })); }
    // flame tongue (8 frames, scrolls upward)
    T.flame = []; for (let f = 0; f < 8; f++) { const w = 16, h = 28; T.flame.push(paint(w, h, pal, (i, j) => { const y = 1 - j / h; const wid = Math.pow(1 - y, 0.75) * 0.95; const dx = Math.abs(i - w / 2 + 0.5) / (w / 2); if (dx > wid) return 0; const nn = fbm(n2, i * 0.28, j * 0.22 + f * 0.75); return (1 - dx / Math.max(0.05, wid)) * (1 - y * 0.55) * 0.9 + nn * 0.6 - 0.32 - y * 0.25; })); }
    // explosion burst (8 frames)
    T.burst = []; for (let f = 0; f < 8; f++) { const S = 40, c = 19.5, t = f / 7; T.burst.push(paint(S, S, pal, (i, j) => { const d = Math.hypot(i - c, j - c); const r = 3 + t * 15, th = 6 * (1 - t) + 1.5; const ring = Math.exp(-Math.pow((d - r) / th, 2)); const core = Math.pow(Math.max(0, 1 - t * 1.4), 2) * Math.max(0, 1 - d / 11); const nn = 0.55 + 0.7 * fbm(n, (i - c) * 0.18 + f, (j - c) * 0.18); return (ring * (1 - t * 0.55) + core) * nn; })); }
    // smoke puff (6 frames)
    T.smoke = []; for (let f = 0; f < 6; f++) { const S = 24, c = 11.5, t = f / 5; T.smoke.push(paint(S, S, ['#d8d4e0', '#8a8496', '#5a5468', '#2a2634'], (i, j) => { const d = Math.hypot(i - c, j - c) / (6 + t * 6); if (d > 1) return 0; return (Math.pow(1 - d, 0.9) * 0.9) * (0.5 + fbm(n2, i * 0.25 + f * 0.5, j * 0.25)) * (1 - t * 0.6); }, 0.75)); }
    // crescent slash
    T.slash = paint(48, 26, pal, (i, j) => { const cx = 8, cy = 13; const d = Math.hypot(i - cx, (j - cy) * 1.15); const a = Math.atan2(j - cy, i - cx); if (Math.abs(a) > 1.35) return 0; const edge = 1 - Math.abs(d - 30) / 7; const taper = Math.cos(a / 1.35 * Math.PI / 2); return edge * taper * (0.8 + 0.4 * n(i * 0.3, j * 0.3)) + (Math.abs(d - 33) < 1.2 ? 0.5 * taper : 0); });
    // tileable beam strip
    T.beam = paint(32, 10, pal, (i, j) => { const y = Math.abs(j - 4.5) / 4.5; return Math.pow(1 - y, 1.6) * 0.95 + fbm(mkNoise(seed + 3, 4), i / 8, j / 5) * 0.45 * (1 - y) - 0.08; });
    // noisy shock ring (4 frames)
    T.ring = []; for (let f = 0; f < 4; f++) { const S = 48, c = 23.5; T.ring.push(paint(S, S, pal, (i, j) => { const d = Math.hypot(i - c, j - c); const a = Math.atan2(j - c, i - c); const r = 21 + (n(a * 2.5 + f, 1) - 0.5) * 3; return Math.exp(-Math.pow((d - r) / 2.2, 2)) * (0.6 + 0.6 * n(a * 4 + f * 2, f)); })); }
    // ground decal
    T.decal = paint(40, 40, [U.shade(pal[3], -0.3), U.shade(pal[3], -0.1), pal[3], pal[2]], (i, j) => { const d = Math.hypot(i - 19.5, j - 19.5) / 19.5; if (d > 1) return 0; return (1 - d) * 0.8 * (0.4 + fbm(n2, i * 0.2, j * 0.2)) + (Math.abs(n(Math.atan2(j - 19.5, i - 19.5) * 3, d * 4) - 0.5) < 0.05 && d > 0.3 ? 0.6 : 0); }, 0.7);
    // magic circle with runes
    { const S = 64, c = 31.5; const [cv, x] = SPR.mk(S, S); const R = U.seeded(seed + 11);
      x.strokeStyle = pal[1]; x.lineWidth = 1; for (const r of [30, 26, 15]) { x.beginPath(); x.arc(c, c, r, 0, 7); x.stroke(); }
      x.fillStyle = pal[0]; for (let i = 0; i < 24; i++) { const a = i / 24 * 6.28; const px = c + Math.cos(a) * 28, py = c + Math.sin(a) * 28; const g = Math.floor(R() * 5); x.fillRect(Math.round(px) - 1, Math.round(py) - 1, g % 2 ? 3 : 1, g > 2 ? 3 : 2); if (g === 4) x.fillRect(Math.round(px), Math.round(py) - 2, 1, 5); }
      x.strokeStyle = pal[2]; const k = 5 + Math.floor(R() * 3); x.beginPath(); for (let i = 0; i <= k; i++) { const a = i * (6.28 / k) * 2 - Math.PI / 2; const px = c + Math.cos(a) * 25, py = c + Math.sin(a) * 25; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke();
      for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; x.fillStyle = pal[1]; x.fillRect(Math.round(c + Math.cos(a) * 15) - 1, Math.round(c + Math.sin(a) * 15) - 1, 2, 2); }
      SPR.crisp(cv); T.circle = cv; }
    // sparkle (4 frames)
    T.spark = []; for (let f = 0; f < 4; f++) { const S = 9, c = 4; T.spark.push(paint(S, S, pal, (i, j) => { const dx = Math.abs(i - c), dy = Math.abs(j - c); const L = [4, 3, 2, 3][f]; return (dx === 0 && dy <= L) || (dy === 0 && dx <= L) ? 1 - Math.max(dx, dy) / (L + 1) * 0.6 : (dx + dy <= 1 ? 0.8 : 0); })); }
    cache[elem] = T; return T;
  };

  // ---------------- renderable textured effects ----------------
  const add = (o) => { o.t = 0; V.fx.push(o); return o; };
  V.tex = (x, y, elem, kind, o = {}) => add({ k: 'tex', x, y, elem, kind, z: o.z ?? 12, sc: o.sc || 1, rot: o.rot || 0, spin: o.spin || 0, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, grow: o.grow || 0, dur: o.dur || 0.5, fps: o.fps || 16, alpha: o.alpha ?? 1, add: o.add !== false, ground: !!o.ground, delay: o.delay || 0, flat: o.flat || 1, once: o.once !== false });
  V.beamTex = (x1, y1, x2, y2, elem, dur = 0.35, w = 1, z = 12) => add({ k: 'beamTex', x1, y1, x2, y2, elem, dur, w, z });
  V.slashTex = (x, y, ang, r, elem, dur = 0.25, o = {}) => add({ k: 'slashTex', x, y, ang, r, elem, dur, flip: !!o.flip, w: o.w || 1 });
  V.decal = (x, y, elem, r, dur = 2.5) => add({ k: 'decal', x, y, elem, r, dur, ground: true });
  V.circleTex = (x, y, elem, r, dur = 1, o = {}) => add({ k: 'circleTex', x, y, elem, r, dur, spin: o.spin ?? 1, ground: true, follow: o.follow || null });
  V.fallTex = (x, y, elem, size, dur, o = {}) => add({ k: 'fallTex', x, y, elem, size, dur, h: o.h || 170, ang: o.ang ?? 0.5 });

  const frameOf = (arr, f) => arr[Math.min(arr.length - 1, f) % arr.length];
  V.X.tex = { draw(x, cam, f, k) {
    if (f.t < f.delay) return; const T = TX.get(f.elem)[f.kind]; if (!T) return; const arr = Array.isArray(T) ? T : [T];
    const tt = f.t - f.delay; const fi = f.once ? Math.min(arr.length - 1, Math.floor(tt / Math.max(0.01, f.dur - f.delay) * arr.length)) : Math.floor(tt * f.fps) % arr.length; const img = arr[fi];
    const [sx, sy] = cam.w2s(f.x + f.vx * tt, f.y + f.vy * tt); const s = f.sc * (1 + f.grow * (tt / f.dur));
    x.save(); x.translate(Math.round(sx), Math.round(sy - f.z - f.vz * tt)); if (f.rot || f.spin) x.rotate(f.rot + f.spin * tt); x.scale(s, s * f.flat);
    x.globalCompositeOperation = f.add ? 'lighter' : 'source-over'; x.globalAlpha = f.alpha * (f.once ? 1 : Math.min(1, (f.dur - f.t) * 4));
    x.drawImage(img, -img.width / 2, f.kind === 'flame' ? -img.height + 2 : -img.height / 2); x.restore(); x.globalCompositeOperation = 'lighter';
  } };
  V.X.beamTex = { draw(x, cam, f, k) {
    const T = TX.get(f.elem).beam; const [a, b] = cam.w2s(f.x1, f.y1), [c, d] = cam.w2s(f.x2, f.y2); const L = Math.hypot(c - a, d - b); const ang = Math.atan2(d - b, c - a);
    x.save(); x.translate(a, b - f.z); x.rotate(ang); const wv = (1 - k * 0.6) * f.w * (1 + Math.sin(f.t * 40) * 0.08); x.globalAlpha = 1 - k * k;
    const off = (f.t * 140) % T.width; x.translate(-off, 0); for (let p = 0; p < L + off; p += T.width) x.drawImage(T, p, -T.height * wv / 2, Math.min(T.width, L + off - p), T.height * wv); x.restore();
  } };
  V.X.slashTex = { draw(x, cam, f, k) {
    const T = TX.get(f.elem).slash; const [sx, sy] = cam.w2s(f.x, f.y); const s = f.r * G.TS / 30 * (0.85 + 0.25 * k);
    x.save(); x.translate(sx, sy - 10); x.rotate(f.ang + (k - 0.5) * 0.9); if (f.flip) x.scale(1, -1); x.scale(s, s * f.w); x.globalAlpha = (1 - k) * Math.min(1, f.t * 25); x.drawImage(T, -8, -13); x.restore();
  } };
  V.X.decal = { ground: true, draw(x, cam, f, k) { const T = TX.get(f.elem).decal; const [sx, sy] = cam.w2s(f.x, f.y); const R = f.r * G.TS; x.globalCompositeOperation = 'source-over'; x.globalAlpha = 0.75 * Math.min(1, f.t * 8) * (1 - Math.pow(k, 3)); x.drawImage(T, sx - R, sy - R, R * 2, R * 2); } };
  V.X.circleTex = { ground: true, draw(x, cam, f, k) { const T = TX.get(f.elem).circle; const px = f.follow ? f.follow.x : f.x, py = f.follow ? f.follow.y : f.y; const [sx, sy] = cam.w2s(px, py); const R = f.r * G.TS * (k < 0.15 ? 0.6 + k / 0.15 * 0.4 : 1);
    x.save(); x.translate(sx, sy); x.rotate(f.t * f.spin); x.globalCompositeOperation = 'lighter'; x.globalAlpha = Math.min(1, f.t * 6) * (1 - Math.pow(k, 4)); x.drawImage(T, -R, -R, R * 2, R * 2); x.rotate(-f.t * f.spin * 2.2); x.globalAlpha *= 0.5; x.drawImage(T, -R * 0.62, -R * 0.62, R * 1.24, R * 1.24); x.restore(); } };
  V.X.fallTex = { draw(x, cam, f, k) { const [sx, sy] = cam.w2s(f.x, f.y); const h = f.h * (1 - k); const T = TX.get(f.elem); const img = T.orb[Math.floor(f.t * 20) % 8]; const s = f.size / 10;
    for (let i = 4; i >= 0; i--) { x.globalAlpha = 0.18 * (5 - i); x.drawImage(img, sx + (h + i * 12) * f.ang - img.width * s * (1 - i * 0.12) / 2, sy - h - i * 12 - img.height * s * (1 - i * 0.12) / 2, img.width * s * (1 - i * 0.12), img.height * s * (1 - i * 0.12)); }
    x.globalAlpha = 1; x.drawImage(img, sx + h * f.ang - img.width * s / 2, sy - h - img.height * s / 2, img.width * s, img.height * s); } };

  // convenience composites used by the engine and motifs
  TX.burst = (x, y, elem, sc = 1, o = {}) => { V.tex(x, y, elem, 'burst', { sc: sc * 1.1, dur: o.dur || 0.42, z: o.z ?? 10 }); };
  TX.smoke = (x, y, n = 3, sc = 1) => { for (let i = 0; i < n; i++) V.tex(x + U.rf(-0.4, 0.4), y + U.rf(-0.3, 0.3), 'phys', 'smoke', { sc: sc * U.rf(0.8, 1.3), dur: U.rf(0.7, 1.1), z: U.rf(6, 16), vz: U.rf(8, 20), add: false, delay: i * 0.05 }); };
  TX.flames = (x, y, elem, n = 5, r = 0.7, sc = 1, dur = 0.7) => { for (let i = 0; i < n; i++) V.tex(x + U.rf(-r, r), y + U.rf(-r * 0.6, r * 0.6), elem, 'flame', { sc: sc * U.rf(0.7, 1.2), dur: dur * U.rf(0.8, 1.2), z: 0, once: false, fps: 14, delay: U.rf(0, 0.15), vz: U.rf(0, 10) }); };
  TX.sparks = (x, y, elem, n = 6, spd = 2, z = 12) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28; V.tex(x, y, elem, 'spark', { vx: Math.cos(a) * spd * U.rf(0.4, 1), vy: Math.sin(a) * spd * U.rf(0.4, 1), vz: U.rf(10, 40), z, dur: U.rf(0.3, 0.6), once: false, fps: 12, sc: U.rf(0.8, 1.3) }); } };
  TX.ring = (x, y, elem, r, dur = 0.4) => V.tex(x, y, elem, 'ring', { sc: r * G.TS / 21, grow: 0.5, dur, z: 2, flat: 1 });
})(window.G);
