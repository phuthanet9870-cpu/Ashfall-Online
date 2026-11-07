'use strict';
/* Black · gold · gray UI theme: re-tints every stylesheet (including ones injected later) instead of rewriting each rule.
   Light / blue backgrounds → charcoal, blue accents → gold, dark text → warm light gray. Rarity / tier / element colours
   (reds, greens, purples, oranges) are left alone. Login art (#boot) is excluded. */
(function (G) {
  const hex = h => { h = h.replace('#', ''); if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join(''); const n = parseInt(h.slice(0, 6), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255, h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1]; };
  const toHsl = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s, l]; };
  const rgbS = (h, s, l, a) => { const f = n => { const k = (n + h / 30) % 12; const q = s * Math.min(l, 1 - l); return Math.round(255 * (l - q * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return a < 1 ? `rgba(${f(0)}, ${f(8)}, ${f(4)}, ${+a.toFixed(3)})` : `rgb(${f(0)}, ${f(8)}, ${f(4)})`; };
  const isBlue = (h, s) => h >= 185 && h <= 250 && s > 0.12;
  const map = (r, g, b, a, role) => { const [h, s, l] = toHsl(r, g, b); const blue = isBlue(h, s), grayish = s < 0.18;
    if (!blue && !grayish) return null; // keep rarity / element / warm colours
    if (role === 'text') { if (l > 0.82) return rgbS(42, 0.2, Math.max(l, 0.9), a); if (blue && l > 0.45) return rgbS(42, 0.75, 0.62, a); return rgbS(40, 0.18, 0.86 - l * 0.35, a); }
    if (role === 'shadow') { if (blue) return rgbS(40, 0.5, Math.min(0.5, l * 0.7), a); if (l > 0.8) return rgbS(40, 0.3, 0.5, a * 0.35); return null; }
    if (role === 'border') { if (l > 0.78) return rgbS(38, 0.35, 0.26 + (1 - l) * 0.4, a); if (blue) return rgbS(40, 0.55, Math.max(0.3, Math.min(0.55, l)), a); return null; }
    // backgrounds
    if (l > 0.72) return rgbS(250, 0.06, 0.07 + (1 - l) * 0.55, a);
    if (blue && l >= 0.42) return rgbS(40, 0.62, l * 0.82, a);
    if (blue) return rgbS(250, 0.08, 0.08 + l * 0.35, a);
    return null; };
  const RE = /#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d+(?:\.\d+)?\s*,\s*\d+(?:\.\d+)?\s*,\s*\d+(?:\.\d+)?(?:\s*,\s*[\d.]+)?\s*\)/g;
  const conv = (v, role) => v.replace(RE, m => { let r, g, b, a = 1; if (m[0] === '#') { if (![3, 4, 6, 8].includes(m.length - 1)) return m; [r, g, b, a] = hex(m); } else { const n = m.match(/[\d.]+/g).map(Number); [r, g, b] = n; a = n[3] ?? 1; } return map(r, g, b, a, role) || m; });
  const PROPS = [['color', 'text'], ['caret-color', 'text'], ['background-color', 'bg'], ['background-image', 'bg'], ['border-top-color', 'border'], ['border-right-color', 'border'], ['border-bottom-color', 'border'], ['border-left-color', 'border'], ['outline-color', 'border'], ['box-shadow', 'shadow'], ['text-shadow', 'shadow'], ['fill', 'bg'], ['stroke', 'border']];
  const fixRule = (st) => { for (const [p, role] of PROPS) { const v = st.getPropertyValue(p); if (!v || !RE.test(v)) { RE.lastIndex = 0; continue; } RE.lastIndex = 0; const nv = conv(v, role); if (nv !== v) st.setProperty(p, nv, st.getPropertyPriority(p)); }
    for (let i = 0; i < st.length; i++) { const p = st[i]; if (!p.startsWith('--') || /^--t\d/.test(p) || /gold|red|good|teal/.test(p)) continue; const v = st.getPropertyValue(p); const nv = conv(v, /text|muted|ink/.test(p) ? 'text' : /line/.test(p) ? 'border' : 'bg'); if (nv !== v) st.setProperty(p, nv); } };
  const walk = (rules) => { for (const r of rules) { if (r.cssRules && !r.selectorText) { walk(r.cssRules); continue; } if (!r.style || !r.selectorText || /#boot|\.bk-|\.cc(img|card|arrow|head|dot|pg|sel)\b/.test(r.selectorText)) continue; try { fixRule(r.style); } catch (e) { } } };
  const done = new WeakSet();
  const run = () => { for (const ss of document.styleSheets) { if (done.has(ss)) continue; let rules; try { rules = ss.cssRules; } catch (e) { continue; } done.add(ss); walk(rules); } };
  G.THEME = { run, conv };
  run(); new MutationObserver(() => run()).observe(document.head, { childList: true });
  // gold-trim finishing touches the re-tint can't infer
  const css = document.createElement('style'); css.id = 'theme-gold'; css.textContent = `
  .pwin,.mwin{border-color:#a8843a!important;box-shadow:0 0 0 1px #000,0 0 0 3px rgba(168,132,58,.35),0 24px 70px rgba(0,0,0,.7)!important}
  .phead{background:linear-gradient(180deg,#2a2622,#141210)!important;border-bottom:1px solid #6a5428!important}
  .phead b{color:#f2d27a!important;text-shadow:0 1px 0 #000,0 0 10px rgba(242,210,122,.25)}
  #ptabs .tab.on{color:#1a1206!important;background:linear-gradient(90deg,#f6dc8a,#c89a3a)!important;box-shadow:0 0 0 1px #8a6418,0 2px 10px rgba(220,170,60,.35)!important;text-shadow:none!important}
  #ptabs .tab.on::after{border-left-color:#c89a3a!important}
  #pclose{background:linear-gradient(#4a4036,#221d18)!important;border-color:#a8843a!important;color:#f2d27a!important}
  .icell{box-shadow:inset 0 0 0 1px rgba(168,132,58,.35)}
  ::-webkit-scrollbar-thumb{background:#5a4a2a}
  ${(G.D && G.D.TIERS || []).map((T, i) => { const sh = (c, f) => G.U && G.U.shade ? G.U.shade(c, f) : c; return `.icell.t${i + 1}{background:radial-gradient(circle at 50% 38%,${sh(T.c, -0.62)},#0c0a08 78%)!important;border-color:${sh(T.c, -0.15)}!important}`; }).join('')}
  .tchip{color:#fff!important;text-shadow:0 1px 2px #000,0 0 3px #000!important;font-weight:700}.tchip.on{box-shadow:0 0 0 2px #f2d27a,0 0 10px rgba(242,210,122,.5)!important}`;
  document.head.appendChild(css); done.add(css.sheet);
})(window.G);
