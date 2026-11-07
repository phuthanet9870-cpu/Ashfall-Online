'use strict';
/* VFX: pixel particles + shape effects in isometric world space */
(function (G) {
  const U = G.U, D = G.D;
  const V = G.VFX = { parts: [], fx: [], texts: [], shakeT: 0, shakeA: 0, flashC: null, flashT: 0, flashD: 0, max: 3500, quality: 1 };
  const RX = G.TS, RY = G.TS; // straight top-down: world radius 1 -> circle of TS px

  V.clear = () => { V.parts.length = 0; V.fx.length = 0; V.texts.length = 0; };

  // ---------- particles ----------
  V.p = (x, y, z, vx, vy, vz, life, size, color, o = {}) => {
    if (V.parts.length > (V.LEVELS ? V.LEVELS[V.level].pCap : V.max)) return;
    const c = G.W && G.W.cam; if (c && (Math.abs(x - c.x) > (G.E.VW || 400) / G.TS * 0.5 + 4 || Math.abs(y - c.y) > (G.E.VH || 300) / G.TS * 0.5 + 4)) return;
    V.parts.push({ x, y, z, vx, vy, vz, life, max: life, size, color, grav: o.grav ?? 0, add: o.add ?? true, kind: o.kind || 'px', drag: o.drag ?? 0.92, shrink: o.shrink ?? true });
  };
  V.burst = (x, y, z, pal, n, spd = 3, life = 0.5, size = 2, o = {}) => {
    n = Math.ceil(n * V.quality);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = spd * (0.3 + Math.random() * 0.7);
      V.p(x, y, z + (o.zr ? Math.random() * o.zr : 0), Math.cos(a) * s, Math.sin(a) * s, (o.up ?? 40) * (0.4 + Math.random()), life * (0.6 + Math.random() * 0.6), size * (0.6 + Math.random() * 0.8), pal[Math.floor(Math.random() * Math.min(3, pal.length))], o);
    }
  };
  V.elemFlavor = (x, y, elem, n = 6, z = 8) => {
    const E = D.ELEM[elem] || D.ELEM.phys, pal = E.pal; n = Math.ceil(n * V.quality);
    for (let i = 0; i < n; i++) {
      const ox = U.rf(-0.5, 0.5), oy = U.rf(-0.5, 0.5);
      switch (E.fx) {
        case 'ember': V.p(x + ox, y + oy, z, U.rf(-0.3, 0.3), U.rf(-0.3, 0.3), U.rf(30, 70), U.rf(0.5, 1), 2, U.pick(pal.slice(0, 3)), { grav: -10, drag: 0.97 }); break;
        case 'shard': V.p(x + ox, y + oy, z + 20, U.rf(-1, 1), U.rf(-1, 1), U.rf(-20, 20), U.rf(0.4, 0.8), 2, U.pick(pal), { grav: 120, kind: 'diamond' }); break;
        case 'spark': V.p(x + ox, y + oy, z, U.rf(-4, 4), U.rf(-4, 4), U.rf(20, 80), U.rf(0.15, 0.35), 1.5, U.pick(pal), { grav: 60, kind: 'streak' }); break;
        case 'smoke': V.p(x + ox, y + oy, z, U.rf(-0.3, 0.3), U.rf(-0.3, 0.3), U.rf(10, 30), U.rf(0.6, 1.2), 4, U.pick(pal.slice(1)), { grav: -5, add: false, drag: 0.95 }); break;
        case 'feather': V.p(x + ox, y + oy, z + 20, U.rf(-0.6, 0.6), U.rf(-0.6, 0.6), U.rf(-5, 15), U.rf(0.8, 1.4), 2, U.pick(pal), { grav: 8, kind: 'diamond' }); break;
        case 'leaf': V.p(x + ox, y + oy, z + 16, U.rf(-1, 1), U.rf(-1, 1), U.rf(-10, 20), U.rf(0.7, 1.2), 2, U.pick(pal.slice(1)), { grav: 20, add: false, kind: 'diamond' }); break;
        case 'dust': V.p(x + ox, y + oy, 2, U.rf(-1.5, 1.5), U.rf(-1.5, 1.5), U.rf(5, 20), U.rf(0.3, 0.6), 3, '#d8d0c0', { grav: 10, add: false }); break;
        case 'glyph': V.p(x + ox, y + oy, z, U.rf(-0.4, 0.4), U.rf(-0.4, 0.4), U.rf(20, 40), U.rf(0.5, 0.9), 3, U.pick(pal), { grav: -5, kind: 'cross' }); break;
        case 'drop': V.p(x + ox, y + oy, z + 10, U.rf(-2, 2), U.rf(-2, 2), U.rf(30, 60), U.rf(0.4, 0.7), 2, U.pick(pal.slice(1)), { grav: 160, add: false }); break;
        case 'tick': V.p(x + ox, y + oy, z, U.rf(-1, 1), U.rf(-1, 1), U.rf(10, 30), U.rf(0.5, 0.9), 2, U.pick(pal), { grav: 0, kind: 'cross' }); break;
        case 'bubble': V.p(x + ox, y + oy, z, U.rf(-0.3, 0.3), U.rf(-0.3, 0.3), U.rf(15, 35), U.rf(0.6, 1), 3, U.pick(pal), { grav: -8, kind: 'ringp' }); break;
        case 'swirl': V.p(x + ox, y + oy, z, U.rf(-3, 3), U.rf(-3, 3), U.rf(5, 25), U.rf(0.3, 0.6), 2, U.pick(pal), { kind: 'streak' }); break;
        case 'twinkle': V.p(x + ox, y + oy, z + U.rf(0, 14), U.rf(-0.5, 0.5), U.rf(-0.5, 0.5), U.rf(-10, 20), U.rf(0.4, 0.9), U.rf(2, 3), U.pick(pal), { kind: 'cross', grav: 0 }); break;
        case 'ringlet': V.p(x + ox, y + oy, z, U.rf(-1, 1), U.rf(-1, 1), U.rf(20, 40), U.rf(0.4, 0.8), 3, U.pick(pal), { kind: 'ringp', grav: -10 }); break;
      }
    }
  };

  // ---------- shape effects ----------
  const addFx = (o) => { o.t = 0; V.fx.push(o); return o; };
  V.ring = (x, y, r, pal, dur = 0.4, o = {}) => addFx({ k: 'ring', x, y, r, pal, dur, w: o.w || 3, ground: o.ground !== false, fill: o.fill, grow: o.grow !== false, z: o.z || 0 });
  V.arc = (x, y, ang, r, pal, dur = 0.22, o = {}) => addFx({ k: 'arc', x, y, ang, r, pal, dur, sweep: o.sweep || 2.2, w: o.w || 4 });
  V.line = (x1, y1, x2, y2, pal, dur = 0.25, o = {}) => addFx({ k: 'line', x1, y1, x2, y2, pal, dur, w: o.w || 4, z: o.z ?? 10 });
  V.bolt = (x1, y1, x2, y2, pal, dur = 0.25, o = {}) => {
    const pts = []; const n = o.segs || 7;
    for (let i = 0; i <= n; i++) { const t = i / n; pts.push([U.lerp(x1, x2, t) + (i && i < n ? U.rf(-0.35, 0.35) : 0), U.lerp(y1, y2, t) + (i && i < n ? U.rf(-0.35, 0.35) : 0), U.lerp(o.z1 ?? 14, o.z2 ?? 10, t)]); }
    return addFx({ k: 'bolt', pts, pal, dur, w: o.w || 2 });
  };
  V.telegraph = (x, y, r, dur, color = '#ff4a4a') => addFx({ k: 'tele', x, y, r, dur, color });
  V.fall = (x, y, pal, dur = 0.5, size = 5, o = {}) => addFx({ k: 'fall', x, y, pal, dur, size, h: o.h || 140, ang: o.ang ?? 0.5 });
  V.pillar = (x, y, color, h = 60, dur = 0.6, w = 6) => addFx({ k: 'pillar', x, y, color, h, dur, w });
  V.swirl = (x, y, r, pal, dur) => addFx({ k: 'swirl', x, y, r, pal, dur });
  V.runes = (x, y, r, pal, dur = 0.8) => addFx({ k: 'runes', x, y, r, pal, dur });
  V.slashMark = (x, y, ang, len, pal, dur = 0.18) => addFx({ k: 'slashmark', x, y, ang, len, pal, dur });
  V.dome = (unit, pal, dur) => addFx({ k: 'dome', u: unit, pal, dur });
  V.ghost = (x, y, sheetInfo, alpha = 0.5, dur = 0.3, tint) => addFx({ k: 'ghost', x, y, si: sheetInfo, a: alpha, dur, tint });
  V.text = (x, y, txt, color = '#ffffff', o = {}) => {
    V.texts.push({ x: x + U.rf(-0.2, 0.2), y: y + U.rf(-0.2, 0.2), z: o.z ?? 26, txt: String(txt), color, t: 0, dur: o.dur || 0.9, size: o.size || 8, crit: !!o.crit, vz: o.vz ?? 40 });
    if (V.texts.length > 160) V.texts.shift();
  };
  V.shake = (a, d = 0.2) => { V.shakeA = Math.max(V.shakeA, a); V.shakeT = Math.max(V.shakeT, d); };
  V.flash = (c, d = 0.2) => { V.flashC = c; V.flashT = d; V.flashD = d; };

  // composite: skill impact flourish by element
  V.impact = (x, y, elem, scale = 1, z = 10) => {
    const pal = (D.ELEM[elem] || D.ELEM.phys).pal; if (G.TX) G.TX.burst(x, y, elem, 0.5 * scale, { z });
    V.burst(x, y, z, pal, 10 * scale, 3.5 * scale, 0.35, 2.2 * scale, { up: 30 });
    V.ring(x, y, 0.5 * scale, pal, 0.25, { w: 2 });
    V.elemFlavor(x, y, elem, 4 * scale, z);
  };

  // ---------- update ----------
  V.update = (dt) => {
    for (let i = V.parts.length - 1; i >= 0; i--) {
      const p = V.parts[i]; p.life -= dt; if (p.life <= 0) { V.parts[i] = V.parts[V.parts.length - 1]; V.parts.pop(); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= p.grav * dt; const dr = Math.pow(p.drag, dt * 60); p.vx *= dr; p.vy *= dr;
      if (p.z < 0) { p.z = 0; p.vz *= -0.3; }
    }
    for (let i = V.fx.length - 1; i >= 0; i--) { const f = V.fx[i]; f.t += dt; if (f.t >= f.dur) V.fx.splice(i, 1); }
    for (let i = V.texts.length - 1; i >= 0; i--) { const t = V.texts[i]; t.t += dt; t.z += t.vz * dt; t.vz *= 0.9; if (t.t >= t.dur) V.texts.splice(i, 1); }
    if (V.shakeT > 0) { V.shakeT -= dt; if (V.shakeT <= 0) V.shakeA = 0; }
    if (V.flashT > 0) V.flashT -= dt;
  };

  // ---------- render ----------
  // cam.w2s(x,y) -> [sx, sy]
  function ellipse(ctx, sx, sy, rx, ry) { ctx.beginPath(); ctx.ellipse(sx, sy, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2); }
  V.renderGround = (ctx, cam) => {
    for (const f of V.fx) {
      const k = f.t / f.dur;
      if (f.k === 'tele') {
        const [sx, sy] = cam.w2s(f.x, f.y);
        const sf = f.soft ? 0.22 : 1; ctx.globalAlpha = (0.25 + 0.25 * Math.sin(f.t * 20)) * sf; ctx.fillStyle = f.color; ellipse(ctx, sx, sy, f.r * RX, f.r * RY); ctx.fill();
        ctx.globalAlpha = 0.9; ctx.strokeStyle = f.color; ctx.lineWidth = 1; ellipse(ctx, sx, sy, f.r * RX, f.r * RY); ctx.stroke();
        ctx.fillStyle = f.color; ctx.globalAlpha = 0.5 * sf; ellipse(ctx, sx, sy, f.r * RX * k, f.r * RY * k); ctx.fill();
      } else if (f.k === 'swirl') {
        const [sx, sy] = cam.w2s(f.x, f.y); const fade = Math.min(1, (f.dur - f.t) * 3, f.t * 6);
        ctx.globalAlpha = 0.28 * fade; ctx.fillStyle = f.pal[3]; ellipse(ctx, sx, sy, f.r * RX, f.r * RY); ctx.fill();
        ctx.globalAlpha = 0.7 * fade; ctx.strokeStyle = f.pal[2]; ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) { const a0 = f.t * 3 + i * 2.1; ctx.beginPath(); ctx.ellipse(sx, sy, f.r * RX * (0.4 + i * 0.25), f.r * RY * (0.4 + i * 0.25), 0, a0, a0 + 1.8); ctx.stroke(); }
        ctx.strokeStyle = f.pal[1]; ellipse(ctx, sx, sy, f.r * RX, f.r * RY); ctx.stroke();
      } else if (f.k === 'runes') {
        const [sx, sy] = cam.w2s(f.x, f.y); const fade = Math.min(1, (f.dur - f.t) * 4, f.t * 8);
        ctx.globalAlpha = fade; ctx.strokeStyle = f.pal[1]; ctx.lineWidth = 1;
        ellipse(ctx, sx, sy, f.r * RX, f.r * RY); ctx.stroke(); ellipse(ctx, sx, sy, f.r * RX * 0.7, f.r * RY * 0.7); ctx.stroke();
        ctx.fillStyle = f.pal[0];
        for (let i = 0; i < 8; i++) { const a = f.t * 2 + i * Math.PI / 4; ctx.fillRect(Math.round(sx + Math.cos(a) * f.r * RX * 0.85) - 1, Math.round(sy + Math.sin(a) * f.r * RY * 0.85) - 1, 3, 3); }
      } else if (V.X && V.X[f.k] && (V.X[f.k].ground || f.ground)) { ctx.globalCompositeOperation = 'lighter'; V.X[f.k].draw(ctx, cam, f, k); ctx.globalCompositeOperation = 'source-over';
      } else if (f.k === 'ring' && f.ground) {
        const [sx, sy] = cam.w2s(f.x, f.y); const rr = f.grow ? f.r * (0.3 + 0.7 * Math.sqrt(k)) : f.r;
        ctx.globalAlpha = 1 - k;
        if (f.fill) { ctx.fillStyle = f.pal[2]; ctx.globalAlpha = (1 - k) * 0.35; ellipse(ctx, sx, sy, rr * RX, rr * RY); ctx.fill(); ctx.globalAlpha = 1 - k; }
        ctx.strokeStyle = f.pal[1]; ctx.lineWidth = f.w * (1 - k * 0.6); ellipse(ctx, sx, sy, rr * RX, rr * RY); ctx.stroke();
        ctx.strokeStyle = f.pal[0]; ctx.lineWidth = 1; ellipse(ctx, sx, sy, rr * RX * 0.92, rr * RY * 0.92); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  };

  V.renderAir = (ctx, cam) => {
    ctx.globalCompositeOperation = 'lighter';
    for (const f of V.fx) {
      const k = f.t / f.dur;
      if (V.X && V.X[f.k] && !V.X[f.k].ground && !f.ground && !V.X[f.k].screen) { ctx.globalCompositeOperation = 'lighter'; V.X[f.k].draw(ctx, cam, f, k); ctx.globalCompositeOperation = 'lighter'; continue; }
      if (f.k === 'arc') {
        const steps = 14; const [cx, cy] = [f.x, f.y]; ctx.lineCap = 'round';
        for (let layer = 0; layer < 3; layer++) {
          ctx.beginPath(); const rr = f.r * (0.75 + layer * 0.12) * (0.8 + 0.2 * k);
          const a0 = f.ang - f.sweep / 2, prog = Math.min(1, k * 2.2);
          for (let i = 0; i <= steps; i++) { const a = a0 + f.sweep * prog * (i / steps); const [sx, sy] = cam.w2s(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); i ? ctx.lineTo(sx, sy - 10) : ctx.moveTo(sx, sy - 10); }
          ctx.strokeStyle = f.pal[layer]; ctx.globalAlpha = (1 - k) * (1 - layer * 0.25); ctx.lineWidth = Math.max(1, f.w - layer * 1.2); ctx.stroke();
        }
      } else if (f.k === 'line') {
        const [a, b] = cam.w2s(f.x1, f.y1), [c, d] = cam.w2s(f.x2, f.y2);
        ctx.lineCap = 'round';
        for (let layer = 0; layer < 3; layer++) { ctx.beginPath(); ctx.moveTo(a, b - f.z); ctx.lineTo(c, d - f.z); ctx.strokeStyle = f.pal[2 - layer]; ctx.globalAlpha = 1 - k; ctx.lineWidth = Math.max(1, f.w * (1 - k * 0.7) * (1 - layer * 0.3)); ctx.stroke(); }
      } else if (f.k === 'bolt') {
        ctx.beginPath(); f.pts.forEach((p, i) => { const [sx, sy] = cam.w2s(p[0], p[1]); i ? ctx.lineTo(sx, sy - p[2]) : ctx.moveTo(sx, sy - p[2]); });
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.pal[2]; ctx.lineWidth = f.w + 2; ctx.stroke(); ctx.strokeStyle = f.pal[0]; ctx.lineWidth = Math.max(1, f.w - 1); ctx.stroke();
      } else if (f.k === 'fall') {
        const [sx, sy] = cam.w2s(f.x, f.y); const h = f.h * (1 - k); const ox = h * f.ang;
        ctx.globalAlpha = 1; ctx.fillStyle = f.pal[1];
        for (let i = 0; i < 5; i++) { ctx.globalAlpha = 0.25 * (5 - i) / 5; ctx.beginPath(); ctx.arc(sx + ox + i * f.ang * 6, sy - h - i * 6, f.size * (1 - i * 0.12), 0, 7); ctx.fill(); }
        ctx.globalAlpha = 1; ctx.fillStyle = f.pal[0]; ctx.beginPath(); ctx.arc(sx + ox, sy - h, f.size * 0.6, 0, 7); ctx.fill();
        ctx.fillStyle = f.pal[2]; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(sx + ox, sy - h, f.size, 0, 7); ctx.fill();
      } else if (f.k === 'pillar') {
        const [sx, sy] = cam.w2s(f.x, f.y); const fade = f.dur > 50 ? 0.7 + 0.3 * Math.sin(f.t * 4) : (1 - k);
        const g = ctx.createLinearGradient(0, sy - f.h, 0, sy); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, f.color);
        ctx.globalAlpha = 0.55 * fade; ctx.fillStyle = g; ctx.fillRect(sx - f.w / 2, sy - f.h, f.w, f.h);
        ctx.globalAlpha = 0.9 * fade; ctx.fillRect(sx - 1, sy - f.h * 0.9, 2, f.h * 0.9);
      } else if (f.k === 'ring' && !f.ground) {
        const [sx, sy] = cam.w2s(f.x, f.y); const rr = f.r * (0.3 + 0.7 * k);
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.pal[1]; ctx.lineWidth = f.w; ellipse(ctx, sx, sy - f.z, rr * RX, rr * RX * 0.9); ctx.stroke();
      } else if (f.k === 'slashmark') {
        const dx = Math.cos(f.ang) * f.len / 2, dy = Math.sin(f.ang) * f.len / 2; const [a, b] = cam.w2s(f.x - dx, f.y - dy), [c, d] = cam.w2s(f.x + dx, f.y + dy);
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.pal[0]; ctx.lineWidth = 3 * (1 - k) + 1; ctx.beginPath(); ctx.moveTo(a, b - 12); ctx.lineTo(c, d - 12); ctx.stroke();
        ctx.strokeStyle = f.pal[2]; ctx.lineWidth = 1; ctx.stroke();
      } else if (f.k === 'dome') {
        if (!f.u || f.u.dead) { f.t = f.dur; continue; }
        const [sx, sy] = cam.w2s(f.u.x, f.u.y); const pulse = 1 + 0.05 * Math.sin(f.t * 10); const fade = Math.min(1, (f.dur - f.t) * 3);
        ctx.globalAlpha = 0.22 * fade; ctx.fillStyle = f.pal[2]; ctx.beginPath(); ctx.ellipse(sx, sy - 14, 15 * pulse, 18 * pulse, 0, 0, 7); ctx.fill();
        ctx.globalAlpha = 0.8 * fade; ctx.strokeStyle = f.pal[1]; ctx.lineWidth = 1; ctx.stroke();
        ctx.globalAlpha = 0.9 * fade; ctx.fillStyle = f.pal[0]; ctx.fillRect(Math.round(sx - 7), Math.round(sy - 26), 3, 2);
      }
    }
    // particles
    for (const p of V.parts) {
      const [sx, sy] = cam.w2s(p.x, p.y); const a = p.life / p.max; const s = p.shrink ? Math.max(1, p.size * (0.4 + 0.6 * a)) : p.size;
      if (!p.add) { ctx.globalCompositeOperation = 'source-over'; } else ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, a * 1.5); ctx.fillStyle = p.color; const X = Math.round(sx - s / 2), Y = Math.round(sy - p.z - s / 2);
      if (p.kind === 'streak') { ctx.strokeStyle = p.color; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx, sy - p.z); ctx.lineTo(sx - p.vx * 2.4, sy - p.z - (p.vy * 2.4 - p.vz * 0.06)); ctx.stroke(); }
      else if (p.kind === 'diamond') { ctx.fillRect(X + 1, Y, 1, 3); ctx.fillRect(X, Y + 1, 3, 1); }
      else if (p.kind === 'cross') { ctx.fillRect(X + 1, Y - 1, 1, 5); ctx.fillRect(X - 1, Y + 1, 5, 1); }
      else if (p.kind === 'ringp') { ctx.strokeStyle = p.color; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(sx, sy - p.z, s, 0, 7); ctx.stroke(); }
      else ctx.fillRect(X, Y, Math.ceil(s), Math.ceil(s));
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    // ghosts (non-additive)
    for (const f of V.fx) if (f.k === 'ghost' && f.si) {
      const [sx, sy] = cam.w2s(f.x, f.y); ctx.globalAlpha = f.a * (1 - f.t / f.dur);
      const s = f.si; ctx.save(); ctx.translate(Math.round(sx), Math.round(sy)); if (s.flip) ctx.scale(-1, 1);
      ctx.drawImage(s.img, s.sx, s.sy, s.w, s.h, -s.w * s.sc / 2, -s.h * s.sc + 2, s.w * s.sc, s.h * s.sc);
      if (f.tint) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(s.img, s.sx, s.sy, s.w, s.h, -s.w * s.sc / 2, -s.h * s.sc + 2, s.w * s.sc, s.h * s.sc); ctx.globalCompositeOperation = 'source-over'; }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };

  V.renderTexts = (ctx, cam, F = 2) => {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (const t of V.texts) {
      const [sx, sy] = cam.w2s(t.x, t.y); const k = t.t / t.dur;
      const pop = t.crit ? (k < 0.15 ? 1 + (0.15 - k) * 6 : 1) : 1;
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      ctx.font = `700 ${Math.round(t.size * 1.7 * pop)}px "Pixelify Sans", monospace`;
      const X = Math.round(sx * F), Y = Math.round((sy - t.z) * F);
      ctx.lineWidth = 4; ctx.strokeStyle = '#120e18'; ctx.strokeText(t.txt, X, Y); ctx.fillStyle = t.color; ctx.fillText(t.txt, X, Y);
    }
    ctx.globalAlpha = 1;
  };

  V.renderScreen = (ctx, W, H) => {
    for (const f of V.fx) if (V.X && V.X[f.k] && V.X[f.k].screen) V.X[f.k].draw(ctx, null, f, f.t / f.dur, W, H);
    ctx.globalAlpha = 1;
    if (V.flashT > 0 && V.flashC) { ctx.globalAlpha = 0.45 * (V.flashT / V.flashD); ctx.fillStyle = V.flashC; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  };
  V.shakeOffset = () => V.shakeT > 0 ? [Math.round(U.rf(-V.shakeA, V.shakeA)), Math.round(U.rf(-V.shakeA, V.shakeA))] : [0, 0];

  // projectile visuals
  V.drawProj = (ctx, cam, p) => {
    const [sx, sy] = cam.w2s(p.x, p.y); const pal = p.pal; const z = p.z ?? 12; const s = (p.size || 3) * (p.scale || 1);
    ctx.globalCompositeOperation = 'lighter';
    if (p.hist && p.hist.length >= 4) { const h = p.hist; const n = h.length / 2; ctx.lineCap = 'round'; for (let layer = 0; layer < 2; layer++) { for (let i = 1; i < n; i++) { const [ax, ay] = cam.w2s(h[(i - 1) * 2], h[(i - 1) * 2 + 1]), [bx, by] = cam.w2s(h[i * 2], h[i * 2 + 1]); const q = i / n; ctx.strokeStyle = layer ? pal[0] : pal[2]; ctx.globalAlpha = q * (layer ? 0.9 : 0.55); ctx.lineWidth = Math.max(1, s * (layer ? 0.6 : 1.6) * q); ctx.beginPath(); ctx.moveTo(ax, ay - z); ctx.lineTo(bx, by - z); ctx.stroke(); } } ctx.globalAlpha = 1; }
    if (G.TX) { const T = G.TX.get(p.elem || 'phys').orb; const img = T[Math.floor(performance.now() / 50 + p.x * 3) % 8]; const k = s / 7 * (p.shape ? 0.8 : 1.25); ctx.globalAlpha = 1; ctx.drawImage(img, Math.round(sx - img.width * k / 2), Math.round(sy - z - img.height * k / 2), img.width * k, img.height * k); if (!p.shape) { ctx.globalCompositeOperation = 'source-over'; return; } }
    if (p.shape && G.FX) { ctx.globalAlpha = 0.35; ctx.fillStyle = pal[2]; ctx.beginPath(); ctx.arc(sx, sy - z, s * 2.6, 0, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.save(); ctx.translate(sx, sy - z); const spinS = { shuriken: 1, shield: 1, axe: 1, star: 1, chaos: 1, clock: 1 }; ctx.rotate(spinS[p.shape] ? performance.now() / 60 : Math.atan2(p.vy, p.vx)); G.FX.drawShape(ctx, p.shape, s * 1.8, pal[0], pal[3], performance.now() / 1000); ctx.restore(); ctx.globalCompositeOperation = 'source-over'; return; }
    ctx.globalAlpha = 0.35; ctx.fillStyle = pal[2]; ctx.beginPath(); ctx.arc(sx, sy - z, s * 2, 0, 7); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = pal[1]; ctx.beginPath(); ctx.arc(sx, sy - z, s, 0, 7); ctx.fill();
    ctx.fillStyle = pal[0]; ctx.fillRect(Math.round(sx - s / 3), Math.round(sy - z - s / 3), Math.max(1, Math.round(s / 1.5)), Math.max(1, Math.round(s / 1.5)));
    ctx.globalCompositeOperation = 'source-over';
  };
})(window.G);
