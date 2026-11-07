'use strict';
/* Map loading: warping to another map shows a loading screen first, the previous map's big caches (terrain chunks,
   full-map canvas, prop/tile buffers) are released before the new map is built, so only one map lives in memory.
   The first enter after choosing a character stays instant (no overlay). */
(function (G) {
  const S = G.S, W = G.W, E = G.E, D = G.D;
  const ov = document.createElement('div'); ov.id = 'mapload'; ov.hidden = true; ov.innerHTML = `<div class="ml-in"><div class="ml-ring"></div><b class="ml-t">กำลังโหลดแผนที่…</b><div class="ml-bar"><i></i></div><small class="ml-tip"></small></div>`; document.body.appendChild(ov);
  const TIPS = ['แตะจุดเซฟเพื่อฟื้นคืนชีพที่นั่น', 'ดันเจี้ยนมี 1000 ชั้น ยิ่งลึกของยิ่งดี', 'กระเป๋าเต็มของจะเข้าคลังอัตโนมัติ', 'ชี้เมาส์ที่ไอเทมเพื่อดูค่าพลัง', 'แลกเพชรแล้วซื้อตั๋วสุ่มที่ NPC หน้าน้ำพุ', 'ตั้งระยะออโต้ได้ถึงทั้งแมพ'];
  const free = (m) => { if (!m) return; try { if (m.chunks && m.chunks.clear) m.chunks.clear(); for (const k of ['canvas', 'chunks', 'tilesC', 'propC', 'fog', 'mini']) if (m[k] && m[k].width !== undefined) { m[k].width = m[k].height = 0; } m.canvas = null; m.props && (m.props.length = 0); } catch (e) { } };
  const nameOf = mode => (mode && (mode.name || (mode.def && (mode.def.th || mode.def.n)) || (mode.dg && mode.dg.n))) || '';
  const en0 = S.enter; let busy = false;
  S.enter = (mode) => {
    const first = !W.map || !W.player; if (first || busy || (mode && (mode.kind === 'gallery' || mode.kind === 'pvp' || mode.kind === 'siege' || mode.kind === 'wbarena'))) return en0(mode);
    busy = true; const old = W.map; const t0 = performance.now();
    ov.querySelector('.ml-t').textContent = `กำลังโหลด ${nameOf(mode) || 'แผนที่'}…`; ov.querySelector('.ml-tip').textContent = 'เคล็ดลับ: ' + TIPS[Math.floor(Math.random() * TIPS.length)];
    ov.hidden = false; ov.classList.remove('done'); requestAnimationFrame(() => ov.classList.add('go'));
    const prevMode = W.mode; if (prevMode && prevMode.leave) { try { prevMode.leave(); } catch (e) { } prevMode.leave = null; }
    W.units.length = 0; const frozen = { update() { }, autoCtl() { return {}; } }; W.mode = Object.assign(Object.create(prevMode || {}), frozen, { kind: 'loading' });
    setTimeout(() => { let ok = false; for (let t = 0; t < 2 && !ok; t++) { try { en0(mode); ok = true; } catch (e) { console.error(e); } } if (old && old !== W.map) free(old); const wait = Math.max(0, 450 - (performance.now() - t0));
      setTimeout(() => { ov.classList.add('done'); setTimeout(() => { ov.hidden = true; ov.classList.remove('go', 'done'); busy = false; }, 260); }, wait); }, 60); };
  const css = document.createElement('style'); css.textContent = `#mapload{position:fixed;inset:0;z-index:8500;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 45%,#221c14,#07060a 70%);transition:opacity .25s;font-family:Kanit,sans-serif}#mapload[hidden]{display:none}#mapload.done{opacity:0}
  .ml-in{display:flex;flex-direction:column;align-items:center;gap:12px;color:#f2e6c8}.ml-ring{width:64px;height:64px;border-radius:50%;border:3px solid rgba(242,210,122,.15);border-top-color:#f2d27a;animation:mlspin .8s linear infinite;box-shadow:0 0 24px rgba(242,210,122,.25)}@keyframes mlspin{to{transform:rotate(360deg)}}
  .ml-t{font-size:20px;color:#f2d27a;text-shadow:0 2px 0 #000}.ml-bar{width:min(360px,70vw);height:8px;border-radius:4px;background:#14110c;border:1px solid #5a4628;overflow:hidden}.ml-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#a8843a,#f2d27a);transition:width .45s ease-out}#mapload.go .ml-bar i{width:100%}.ml-tip{color:#a89c84;font-size:13px}`; document.head.appendChild(css);
})(window.G);
