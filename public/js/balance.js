'use strict';
/* Global balance pass.
   · DEF uses the attacker's level: dmg × K/(K+DEF), K = max(650, 200 + 45·level) — armor no longer makes high-level
     heroes immortal, and a level gap matters (a Lv300 boss shreds armor, a Lv250 hero barely dents a Lv300 boss's).
   · Crit damage is soft-capped: full value up to +120 %, 40 % of the excess above that, hard cap +250 % (×4.0 crit).
   · Monster ATK follows the expected hero HP/DEF curve (a same-level normal mob takes ~3.5 % HP per hit after armor);
     monster HP is raised by exactly the armor change so kill speed stays the same and grows a little past Lv100.
   · Per-class damage multipliers (D.CLS_DMG) bring every class to the same damage band (tanks a bit lower). */
(function (G) {
  const U = G.U, D = G.D, E = G.E, S = G.S, W = G.W;
  const K = lv => Math.max(650, 200 + 45 * (lv || 1));
  E.defK = (src) => K(src && (src.lvl || (src.owner && src.owner.lvl)));
  D.CAPS.critDmg = 250;
  E.softStats = (s) => { if (s.critDmg > 120) s.critDmg = Math.min(250, 120 + (s.critDmg - 120) * 0.4); };
  // expected hero curves (measured with level-appropriate random gear across classes)
  const T = (tab, L) => { const ks = Object.keys(tab).map(Number); if (L <= ks[0]) return tab[ks[0]] * L / ks[0]; for (let i = 1; i < ks.length; i++) if (L <= ks[i]) { const a = ks[i - 1], b = ks[i]; const f = (L - a) / (b - a); return Math.exp(Math.log(tab[a]) * (1 - f) + Math.log(tab[b]) * f); } const a = ks[ks.length - 2], b = ks[ks.length - 1]; return tab[b] * Math.pow(tab[b] / tab[a], (L - b) / (b - a)); };
  const EHP = { 10: 1360, 50: 5300, 100: 12900, 150: 25800, 200: 51000, 250: 103000 };
  const EDEF = { 10: 90, 50: 430, 100: 990, 150: 2140, 200: 4250, 250: 9000 };
  D.BAL = { K, EHP: L => T(EHP, L), EDEF: L => T(EDEF, L) };
  const atkF = L => { const want = 0.035 * T(EHP, L) * (K(L) + T(EDEF, L)) / K(L); return Math.max(1, want / (8 + L * 4.2)); };
  const hpF = L => { const d = L * 3.5; const old = 650 / (650 + d), now = K(L) / (K(L) + d); return (now / old) * (L > 100 ? 1 + (L - 100) / 300 : 1); };
  D.BAL.atkF = atkF; D.BAL.hpF = hpF;
  const mk0 = S.mkMob; S.mkMob = function (md, lvl, grade, x, y, o) { const u = mk0.apply(this, arguments); if (!u || !u.st) return u; const L = Math.max(1, lvl | 0);
    const fa = atkF(L), fh = hpF(L); for (const st of [u.st, u.st0, u.st0b]) if (st) { st.atk = Math.round(st.atk * fa); st.hp = Math.round(st.hp * fh); }
    u.maxhp = Math.round(u.maxhp * fh); u.hp = u.maxhp; return u; };
  // ---------- per-class damage normalization ----------
  // measured: 30 classes, Lv250, best kit, auto rotation 12 s vs a Lv300 target → factor to the median (tank/healer 75 %), softened ^0.8
  const RAW = {"blademaster":1.71,"guardian":1.79,"berserker":0.88,"paladin":1.33,"pyromancer":0.83,"cryomancer":0.52,"stormcaller":0.59,"necromancer":0.73,"cleric":1.17,"druid":1.71,"assassin":1.05,"shadowdancer":1.24,"ranger":1.72,"marksman":1.8,"engineer":1,"monk":1.3,"spellblade":1.12,"beastmaster":0.83,"chronomancer":1.48,"warlock":0.61,"starhunter":0.57,"darkknight":0.75,"lightbringer":0.68,"shadowmancer":1.19,"seraph":1.36,"reaper":0.91,"demon":0.81,"deity":0.77,"jester":1.24,"loki":0.54};
  D.CLS_DMG = Object.assign({}, D.CLS_DMG || {}); for (const k in RAW) D.CLS_DMG[k] = Math.round(Math.pow(RAW[k], 0.8) * 100) / 100;
  const h0 = E.hit; E.hit = (src, t, pow, s, o) => { const own = src && (src.owner || src); const m = own && own.kind === 'hero' && own.cls ? (D.CLS_DMG[own.cls] || 1) : 1; return h0(src, t, m === 1 ? pow : pow * m, s, o); };
})(window.G);
