'use strict';
(function (init) {
  (globalThis.ASHFALL_SIM_FACTORIES ||= {})['botpower'] = init;
  if (typeof window !== 'undefined') init(window.G);
})(function (G) {
  const document = G.headless ? G.platform.document : globalThis.document;
  const window = G.headless ? G.platform.window : globalThis.window;
  const Image = G.headless ? G.platform.Image : globalThis.Image;
  const localStorage = G.headless ? G.platform.localStorage : globalThis.ASHFALL_STORAGE;
  const setTimeout = G.headless ? G.platform.setTimeout : globalThis.setTimeout;
  const setInterval = G.headless ? G.platform.setInterval : globalThis.setInterval;
  const addEventListener = G.headless ? (() => {}) : globalThis.addEventListener;
'use strict';
/* Bot power rules:
   PvP: every difficulty has the SAME power (player CP). Difficulty = intelligence only; easy bots hesitate (attack sometimes, idle sometimes) and aim sloppily.
   Everywhere else: bots carry gear they "farmed" like a player (same drop tables / tiers for their level), or exactly the player's CP (GM setting). */
(function (G) {
  const U = G.U, D = G.D, S = G.S, E = G.E, W = G.W, UI = G.UI;
  // intelligence-only difficulty (cp = 1 for all)
  const IDLE = [0.5, 0.22, 0.08, 0.03, 0], MISS = [1.4, 0.7, 0.3, 0.1, 0], REACTX = [1.6, 1.15, 1, 1, 1];
  D.DIFFS.forEach((d, i) => { d.cp = 1; d.idle = IDLE[i]; d.miss = MISS[i]; d.react = +(d.react * REACTX[i]).toFixed(2); });

  // ---------- simulated farmed gear ----------
  const mapFor = lvl => D.FARM_MAPS.find(m => lvl <= m.lv[1]) || D.FARM_MAPS[D.FARM_MAPS.length - 1];
  S.farmedLoadout = (cls, lvl, effort = 1) => {
    const B = mapFor(lvl).B; const rolls = 1 + Math.round(U.clamp(effort, 0.2, 2) * 4); const ilv = U.clamp(Math.round(lvl / 2), 1, 100);
    const tierRoll = () => { let best = 1; for (let i = 0; i < rolls; i++) { const elite = Math.random() < 0.25 ? 1 : 0; best = Math.max(best, S.rollTier(D.farmDist(B + elite, false))); } return best; };
    const enh = Math.round(U.clamp(effort, 0, 2) * Math.min(10, lvl / 14) * U.rf(0.6, 1));
    const out = [];
    for (const sl of D.GEAR_SLOTS) out.push(S.genItem('gear', tierRoll(), ilv, { slot: sl.k, cls, noBase: false }));
    const accN = U.clamp(3 + Math.floor(lvl / 35), 3, 10); for (const sl of D.ACC_SLOTS.slice(0, accN)) out.push(S.genItem('acc', tierRoll(), ilv, { slot: sl.k }));
    if (lvl >= 100) out.push(S.genItem('relic', tierRoll(), ilv));
    for (const it of out) it.lv = it.kind === 'gear' ? enh : it.kind === 'acc' ? Math.min(10, Math.round(enh * 0.6)) : 0;
    const runes = []; const rn = D.RUNE_BOARD.filter(r => lvl >= r.lv && r.c !== 'core').length; for (let i = 0; i < rn; i++) runes.push(S.genItem('rune', tierRoll(), ilv, { color: D.RUNE_BOARD[i].c }));
    return { gear: out, runes };
  };
  S.statsFromLoadout = (cls, lvl, L) => {
    const st = E.baseStats(cls, lvl); const add = (k, v) => { if (k in st) st[k] += v; };
    for (const it of L.gear) { const m = it.kind === 'gear' ? 1 + 0.06 * (it.lv || 0) : 1 + 0.05 * (it.lv || 0); if (it.main) add(it.main.s, it.main.v * m); for (const sb of it.subs || []) add(sb.s, sb.v); }
    for (const r of L.runes) { if (r.main) add(r.main.s, r.main.v); for (const sb of r.subs || []) add(sb.s, sb.v); }
    return E.finalize(st);
  };
  S.botPowerMode = () => (S.save && S.save.settings.botPower) || 'farm';
  // stats for a non-PvP bot: farmed gear, or the player's exact CP
  S.worldBotStats = (cls, lvl, effort) => {
    if (S.botPowerMode() === 'equal') { const st = E.finalize(E.baseStats(cls, lvl)); const k = (W.player ? W.player.cpv : E.cp(st)) / E.cp(st); st.atk = Math.round(st.atk * k); st.def = Math.round(st.def * k); st.hp = Math.round(st.hp * k); return { st, mode: 'equal' }; }
    const L = S.farmedLoadout(cls, lvl, effort); const st = S.statsFromLoadout(cls, lvl, L); return { st, L, mode: 'farm' };
  };

  // ---------- easy-bot hesitation (PvP only) ----------
  const ai0 = E.heroAI;
  E.heroAI = (u, dt, ctl) => {
    const ai = u.ai; const idle = ai && ai.idleP || 0;
    if (idle > 0 && !u.isPlayer) {
      ai.lazyRoll = (ai.lazyRoll ?? U.rf(0.5, 2)) - dt;
      if (ai.lazyRoll <= 0) { ai.lazyRoll = U.rf(1.2, 2.6); ai.lazy = Math.random() < idle ? U.rf(0.8, 2.2) : 0; if (ai.lazy) { const a = U.rf(0, 6.28); ai.lazyPt = { x: u.x + Math.cos(a) * U.rf(0.5, 2), y: u.y + Math.sin(a) * U.rf(0.5, 2) }; } }
      if (ai.lazy > 0) { ai.lazy -= dt; if (ai.lazyPt && U.d2(u.x, u.y, ai.lazyPt.x, ai.lazyPt.y) > 0.2 && Math.random() < 0.6) E.walkTo(u, ai.lazyPt.x, ai.lazyPt.y, dt, 0.2); if (u.target && !u.target.dead) E.face(u, u.target.x, u.target.y); return; }
    }
    return ai0(u, dt, ctl);
  };
  const cast0 = E.cast;
  E.cast = (u, i, aim) => { const m = u.ai && u.ai.missR; if (m && aim && !u.isPlayer && u !== W.player) aim = { x: aim.x + U.rf(-m, m), y: aim.y + U.rf(-m, m) }; return cast0(u, i, aim); };
  S.markPvpBrain = (u, diffI) => { const d = D.DIFFS[U.clamp(diffI, 0, 4)]; u.ai.idleP = d.idle; u.ai.missR = d.miss; return u; };

  // ---------- GM toggle ----------
  const gmR = UI.gmRender; UI.gmRender = (tab, P) => { let h = gmR(tab, P); if (tab === 'pvp') { const m = S.botPowerMode(); h = `<h4>พลังของบอท</h4><p class="muted">PvP: บอททุกระดับความยากมีพลัง (CP) เท่ากับผู้เล่น · ความยากเปลี่ยนแค่ความฉลาด ระดับง่ายจะตีบ้างไม่ตีบ้างและเล็งพลาด<br>นอก PvP (ยึดปราสาท สมาชิกกิลด์ ผู้เล่นในแผนที่ฟาร์ม):</p><div class="chips"><button class="chip ${m === 'farm' ? 'on' : ''}" data-act="gm" data-c="bpmode" data-v="farm">ใช้ของที่บอทฟาร์มมาเหมือนผู้เล่น</button><button class="chip ${m === 'equal' ? 'on' : ''}" data-act="gm" data-c="bpmode" data-v="equal">พลังเท่าผู้เล่นพอดี</button></div><table class="tbl small"><tr><th>ความยาก</th><th>พลัง</th><th>ช่วงลังเล/ไม่ตี</th><th>เล็งพลาด</th><th>ตอบสนอง</th></tr>${D.DIFFS.map(d => `<tr><td>${d.th}</td><td>×1.0</td><td>${Math.round(d.idle * 100)}%</td><td>±${d.miss} ช่อง</td><td>${d.react} วิ</td></tr>`).join('')}</table>` + h; } return h; };
  const gmC = UI.gmCmd; UI.gmCmd = (c, el) => { if (c === 'bpmode') { S.save.settings.botPower = el.dataset.v; S.persist(); UI.toast(el.dataset.v === 'farm' ? 'บอทนอก PvP ใช้ของที่ฟาร์มมา' : 'บอทนอก PvP พลังเท่าผู้เล่น', 'good'); UI.renderPanel(); return; } return gmC(c, el); };
})(G);

});
