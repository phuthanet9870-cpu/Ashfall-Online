'use strict';
/* Bot guilds (GM managed), guild leaderboard, guild win/season rewards, Boss Clash loot for human party members */
(function (G) {
  const U = G.U, D = G.D, S = G.S, UI = G.UI, W = G.W, E = G.E;
  const $ = s => document.querySelector(s), esc = UI.esc;
  const tierSpan = (t, txt) => `<span class="tc t${t}">${txt}</span>`;

  // ---------- data ----------
  D.BOSS_CLASH_RATES = { 4: 40, 5: 25, 6: 15, 7: 10, 8: 6, 9: 3, 10: 1 };
  D.GUILD_WIN_REWARD = { gold: 3000, war: 150, guildXp: 300, items: 1, minTier: 5 };
  D.GUILD_RANK_REWARDS = [
    { r: [1, 1], th: 'อันดับ 1', gold: 200000, war: 5000, items: 3, tier: 10, title: 'ราชันแห่งปราสาท' },
    { r: [2, 2], th: 'อันดับ 2', gold: 120000, war: 3500, items: 3, tier: 9, title: 'ขุนพลปราสาท' },
    { r: [3, 3], th: 'อันดับ 3', gold: 80000, war: 2500, items: 2, tier: 9, title: 'ผู้พิทักษ์ปราสาท' },
    { r: [4, 10], th: 'อันดับ 4–10', gold: 40000, war: 1200, items: 2, tier: 8 },
    { r: [11, 999], th: 'อันดับ 11+', gold: 10000, war: 400, items: 1, tier: 6 }
  ];
  const BOT_TAGS = ['Iron', 'Crimson', 'Azure', 'Shadow', 'Golden', 'Storm', 'Ember', 'Frost', 'Void', 'Silver', 'Dawn', 'Night', 'Thunder', 'Jade', 'Obsidian', 'Phoenix', 'Dragon', 'Wolf', 'Raven', 'Lion'];
  const BOT_NOUNS = ['Legion', 'Order', 'Covenant', 'Vanguard', 'Brotherhood', 'Syndicate', 'Dominion', 'Knights', 'Clan', 'Alliance', 'Pact', 'Host'];
  const loadCfg = () => { const s = S.save; if (!s) return; s.gmCfg = s.gmCfg || {}; if (s.gmCfg.bossRates) Object.assign(D.BOSS_CLASH_RATES, s.gmCfg.bossRates); if (s.gmCfg.guildWin) Object.assign(D.GUILD_WIN_REWARD, s.gmCfg.guildWin); };
  const saveCfg = () => { const s = S.save; s.gmCfg = s.gmCfg || {}; s.gmCfg.bossRates = Object.assign({}, D.BOSS_CLASH_RATES); s.gmCfg.guildWin = Object.assign({}, D.GUILD_WIN_REWARD); S.persist(); };

  // normalize rivals into full bot guilds
  S.normRival = (r) => { if (r._n) return r; r._n = 1; r.bot = true; r.members = r.members || U.ri(12, 30); r.avgLv = r.avgLv || U.clamp(Math.round(40 + (r.rating - 800) / 12 + U.ri(-10, 10)), 1, D.MAX_LV); r.wins = r.wins || 0; r.losses = r.losses || 0; r.leader = r.leader || U.pick(D.NAMES) + U.ri(1, 99); r.cp = r.cp || Math.round(r.avgLv * r.avgLv * 9 + r.rating * 40); return r; };
  S.makeBotGuild = (o = {}) => { const name = o.name || `${U.pick(BOT_TAGS)} ${U.pick(BOT_NOUNS)}`; const tag = (o.tag || name.split(' ').map(w => w[0]).join('') + U.ri(1, 9)).toUpperCase().slice(0, 4); return S.normRival({ name, tag, rating: o.rating ?? U.ri(800, 2200), members: o.members, avgLv: o.avgLv, gm: true }); };
  S.leaderboard = () => {
    const s = S.save; (s.rivals || []).forEach(S.normRival);
    const list = (s.rivals || []).map(r => ({ name: r.name, tag: r.tag, rating: r.rating, me: false, wins: r.wins, losses: r.losses, members: r.members, avgLv: r.avgLv, cp: r.cp, leader: r.leader, bot: true }));
    if (s.guild) { const g = s.guild; list.push({ name: g.name, tag: g.tag, rating: g.rating, me: true, wins: g.wins, losses: g.losses, members: g.members.length + 1, avgLv: Math.round((g.members.reduce((a, m) => a + m.lvl, 0) + s.lvl) / (g.members.length + 1)), cp: (W.player && W.player.cpv) || 0, leader: s.name }); }
    return list.sort((a, b) => b.rating - a.rating);
  };
  S.myGuildRank = () => { const L = S.leaderboard(); const i = L.findIndex(x => x.me); return i < 0 ? 0 : i + 1; };
  S.rankReward = (rank) => D.GUILD_RANK_REWARDS.find(x => rank >= x.r[0] && rank <= x.r[1]);
  const rollKind = () => U.pick(['gear', 'gear', 'acc', 'rune', 'gem']);
  const grant = (tier, n, src) => { const s = S.save, out = []; for (let i = 0; i < n; i++) { const it = S.genItem(rollKind(), tier, Math.max(1, Math.min(100, Math.round(s.lvl / 2))), { pvp: true }); S.addItem(it, true); out.push(it); } return out; };

  // guild win bonus (called after a ranked siege victory)
  S.guildWinBonus = (res) => { const s = S.save, R = D.GUILD_WIN_REWARD; s.gold += R.gold; s.war += R.war; S.guildXp(R.guildXp); const its = grant(U.clamp(R.minTier + (Math.random() < 0.3 ? 1 : 0), 1, 10), R.items, 'win'); res.bonus = { gold: R.gold, war: R.war, xp: R.guildXp, items: its }; return res.bonus; };
  // season end: pay out by rank, reset ratings toward 1000
  S.endSeason = () => {
    const s = S.save; if (!s.guild) return null; const rank = S.myGuildRank(), R = S.rankReward(rank); s.gold += R.gold; s.war += R.war; const items = grant(R.tier, R.items, 'season');
    if (R.title) { s.titles = s.titles || []; if (!s.titles.includes(R.title)) s.titles.push(R.title); s.title = R.title; }
    s.guild.history.unshift({ vs: `จบซีซัน: อันดับ ${rank}`, w: rank <= 3 ? 0 : 1, line: 0, date: Date.now(), type: 'season' });
    for (const r of s.rivals) r.rating = Math.round(1000 + (r.rating - 1000) * 0.5); s.guild.rating = Math.round(1000 + (s.guild.rating - 1000) * 0.5);
    S.persist(); return { rank, R, items };
  };
  // bot guilds fight each other
  S.simGuildWars = (n = 10) => { const s = S.save; const L = s.rivals; if (L.length < 2) return 0; for (let i = 0; i < n; i++) { const a = U.pick(L), b = U.pick(L.filter(x => x !== a)); S.normRival(a); S.normRival(b); const pa = 1 / (1 + Math.pow(10, (b.rating - a.rating) / 400)); const aw = Math.random() < pa * 0.7 + (a.cp > b.cp ? 0.2 : 0.05); const d = Math.round(32 * ((aw ? 1 : 0) - pa)); a.rating += d; b.rating -= d; (aw ? a : b).wins++; (aw ? b : a).losses++; } return n; };

  // ---------- Boss Clash loot: tier 4+ weighted, every HUMAN in the winning party, bots excluded ----------
  S.isHuman = u => u === W.player || !!u.human;
  S.rollBossTier = () => { const R = D.BOSS_CLASH_RATES; const tot = Object.values(R).reduce((a, b) => a + b, 0); let x = Math.random() * tot; for (const [t, w] of Object.entries(R)) { x -= w; if (x <= 0) return +t; } return 4; };
  S.bossClashLoot = (m, w) => {
    if (!m.md || m.md.id !== 'boss' || !m.boss || !m.boss.dead || (w !== 0 && w !== 1)) return null;
    const party = m.team[w] || []; const humans = party.filter(S.isHuman); const bots = party.length - humans.length;
    const out = { humans: humans.length, bots, items: [] };
    for (const u of humans) { const n = 2 + (Math.random() < 0.35 ? 1 : 0); for (let i = 0; i < n; i++) { const t = S.rollBossTier(); const it = S.genItem(rollKind(), t, Math.max(1, Math.min(100, Math.round(S.save.lvl / 2 + t * 3))), { pvp: true }); if (u === W.player) { S.addItem(it, true); out.items.push(it); } } }
    if (out.items.length) G.UI.feed(`ของจากบอสแจกให้ผู้เล่นในปาร์ตี้ที่ชนะ ${humans.length} คน (บอท ${bots} ตัวไม่ได้รับ)`, 'gold', true);
    return out;
  };
  const pvpRes0 = UI.pvpResult;
  UI.pvpResult = (m, w, r) => {
    pvpRes0(m, w, r); const bl = r.bossLoot; const box = $('#mbody'); if (!box || !m.md || m.md.id !== 'boss') return;
    const h = !bl ? `<p class="muted">ของจากบอส: ${m.boss && m.boss.dead ? 'ทีมเราไม่ได้ชนะ จึงไม่ได้รับของจากบอส' : 'ไม่มีใครปิดบอสได้ จึงไม่มีของดรอป'}</p>` : `<h4>ของจากบอส (ระดับ 4 ขึ้นไป · แจกผู้เล่น ${bl.humans} คน · บอท ${bl.bots} ตัวไม่ได้รับ)</h4><div class="igrid">${bl.items.map(it => UI.itemCell(it, 'noop')).join('')}</div><p class="muted">${bl.items.map(it => tierSpan(it.tier, `${esc(it.name)} (ระดับ ${it.tier})`)).join(' · ')}</p>`;
    const list = box.querySelector('.list'); if (list) list.insertAdjacentHTML('beforebegin', h); else box.insertAdjacentHTML('beforeend', h);
  };

  // ---------- guild panel: richer ranking + rewards tab ----------
  const GP = UI.PANELS.guild; GP.tabs = [...GP.tabs.filter(t => t[0] !== 'rank'), ['rank', 'อันดับกิลด์'], ['reward', 'รางวัลกิลด์']];
  const rankTable = (gmMode) => { const L = S.leaderboard(); return `<table class="tbl"><tr><th>#</th><th>กิลด์</th><th>หัวหน้า</th><th>สมาชิก</th><th>Lv เฉลี่ย</th><th>Rating</th><th>ลีก</th><th>ชนะ/แพ้</th>${gmMode ? '<th>จัดการ</th>' : '<th>รางวัลซีซัน</th>'}</tr>${L.map((r, i) => { const lg = D.leagueOf(r.rating); const rr = S.rankReward(i + 1);
    return `<tr class="${r.me ? 'me' : ''}"><td><b class="rk rk${Math.min(i + 1, 4)}">${i + 1}</b></td><td>${esc(r.name)} <small>&lt;${esc(r.tag)}&gt;${r.me ? ' (กิลด์คุณ)' : ' · บอท'}</small></td><td>${esc(r.leader || '-')}</td><td>${r.members}</td><td>${r.avgLv}</td><td>${r.rating}</td><td style="color:${lg.c}">${lg.n}</td><td>${r.wins}/${r.losses}</td>${gmMode ? (r.me ? '<td>-</td>' : `<td class="nowrap"><button class="mini-btn" data-act="gm" data-c="gbr" data-n="${esc(r.name)}" data-d="100">+100</button><button class="mini-btn" data-act="gm" data-c="gbr" data-n="${esc(r.name)}" data-d="-100">−100</button><button class="mini-btn" data-act="gm" data-c="gbchal" data-n="${esc(r.name)}">ท้าเรา</button><button class="mini-btn" data-act="gm" data-c="gbdel" data-n="${esc(r.name)}">ลบ</button></td>`) : `<td><small>${U.fmt(rr.gold)} ทอง · ไอเทม T${rr.tier}×${rr.items}</small></td>`}</tr>`; }).join('')}</table>`; };
  UI.guildRankTable = rankTable;
  const rewardHtml = () => { const R = D.GUILD_WIN_REWARD; const rank = S.save.guild ? S.myGuildRank() : 0; return `<h4>รางวัลชนะศึกยึดปราสาท (Ranked)</h4><p>ทุกครั้งที่ชนะ: ทอง ${U.fmt(R.gold)} · แต้มสงคราม ${R.war} · EXP กิลด์ ${R.guildXp} · ไอเทมระดับ ${R.minTier}+ ×${R.items} (เพิ่มจากรางวัลปกติ)</p>
    <h4>รางวัลจบซีซันตามอันดับ${rank ? ` — ตอนนี้กิลด์คุณอันดับ ${rank}` : ''}</h4><table class="tbl"><tr><th>อันดับ</th><th>ทอง</th><th>แต้มสงคราม</th><th>ไอเทม</th><th>ฉายา</th></tr>${D.GUILD_RANK_REWARDS.map(x => `<tr class="${rank >= x.r[0] && rank <= x.r[1] ? 'me' : ''}"><td>${x.th}</td><td>${U.fmt(x.gold)}</td><td>${U.fmt(x.war)}</td><td>${tierSpan(x.tier, 'ระดับ ' + x.tier)} ×${x.items}</td><td>${x.title ? '«' + esc(x.title) + '»' : '-'}</td></tr>`).join('')}</table><p class="muted">ซีซันละ 8 สัปดาห์ · อันดับ 1–3 ครองปราสาทจริงในโลกเปิดและได้ดรอป +10%</p>`; };
  const gr0 = GP.render;
  GP.render = function (tab, P) { if (S.save.guild && tab === 'rank') return `<p class="muted">อันดับกิลด์ทั้งเซิร์ฟ (รวมกิลด์บอทที่ GM เพิ่ม) เรียงตาม Rating</p>` + rankTable(false); if (S.save.guild && tab === 'reward') return rewardHtml(); return gr0.call(this, tab, P); };


  // ---------- GM: invite bots into OUR guild with chosen level ----------
  const GMAX = 49;
  const memberAdmin = () => { const s = S.save, g = s.guild; if (!g) return '<h4>สมาชิกกิลด์ของเรา</h4><p class="muted">ยังไม่มีกิลด์ — กด "สร้างกิลด์ของเราด่วน" ก่อน</p>';
    const P = UI.panel; P.gbc = P.gbc || 'random'; const avg = Math.round(g.members.reduce((a, m) => a + m.lvl, 0) / Math.max(1, g.members.length));
    return `<h4>เชิญบอทเข้ากิลด์ ${esc(g.name)} (สมาชิก ${g.members.length + 1}/${GMAX + 1} · Lv เฉลี่ย ${avg})</h4>
      <div class="two"><div><div class="two"><label class="fl">เลเวลต่ำสุด<input type="number" id="gmlvmin" value="${P.glmin || s.lvl}" min="1" max="250"></label><label class="fl">เลเวลสูงสุด<input type="number" id="gmlvmax" value="${P.glmax || s.lvl}" min="1" max="250"></label><label class="fl">จำนวนบอท<input type="number" id="gmcnt" value="5" min="1" max="${GMAX}"></label><label class="fl">ความเก่ง AI (1–4)<input type="number" id="gmskill" value="${P.gsk || 3}" min="1" max="4"></label></div>
        <label class="fl">ชื่อ (เว้นว่าง = สุ่ม · ใช้ได้เมื่อเชิญทีละ 1)<input id="gmmname" maxlength="16"></label>
        <div class="gmrow"><b>คลาส</b><button class="chip ${P.gbc === 'random' ? 'on' : ''}" data-act="gm" data-c="gmbc" data-v="random">สุ่ม</button><button class="chip ${P.gbc === 'fill' ? 'on' : ''}" data-act="gm" data-c="gmbc" data-v="fill">เติมบทบาทที่ขาด</button></div>
        <div class="gmcls mini">${D.CLASSES.map(k => `<button class="ccard ${P.gbc === k.id ? 'sel' : ''}" data-act="gm" data-c="gmbc" data-v="${k.id}" title="${esc(k.name)}"><img src="${UI.bodyURL(k.id)}" alt=""><small>${esc(k.name)}</small></button>`).join('')}</div>
        <div class="list"><button class="btn primary" data-act="gm" data-c="gminv">เชิญบอทเข้ากิลด์</button><button class="btn" data-act="gm" data-c="gmlvall">ตั้งเลเวลทุกคนเป็นค่าต่ำสุด</button><button class="btn" data-act="gm" data-c="gmlvme">ทุกคนเลเวลเท่าเรา (${s.lvl})</button><button class="btn danger" data-act="gm" data-c="gmkickall">เตะบอทออกทั้งหมด</button></div></div>
      <div><table class="tbl small"><tr><th>ชื่อ</th><th>คลาส</th><th>Lv</th><th>AI</th><th></th></tr>${g.members.map((m, i) => `<tr><td>${esc(m.name)}</td><td>${esc(D.CLS[m.cls].name)}</td><td><input type="number" class="mlv" data-i="${i}" value="${m.lvl}" min="1" max="250" style="width:64px"></td><td>${m.skill || 2}</td><td class="nowrap"><button class="mini-btn" data-act="gm" data-c="gmmlv" data-i="${i}" data-d="10">+10</button><button class="mini-btn" data-act="gm" data-c="gmmlv" data-i="${i}" data-d="-10">−10</button><button class="mini-btn" data-act="gm" data-c="gmkick" data-i="${i}">เตะ</button></td></tr>`).join('')}</table><p class="muted">ในศึกยึดปราสาท สมาชิกเลเวลสูงสุดจะลงสนามก่อน · ความแรงของบอทขึ้นกับเลเวลเทียบกับเรา · แก้ตัวเลขในช่อง Lv แล้วกดออกจากช่องเพื่อบันทึก</p></div></div>`; };
  const fillRole = (g) => { const cnt = {}; for (const m of g.members) { const r = D.CLS[m.cls].role; cnt[r] = (cnt[r] || 0) + 1; } const roles = Object.keys(D.ROLES).sort((a, b) => (cnt[a] || 0) - (cnt[b] || 0)); return U.pick(D.CLASSES.filter(c => c.role === roles[0])).id; };

  // ---------- GM: guild tab ----------
  const GM = UI.PANELS.gm; if (!GM.tabs.find(t => t[0] === 'guild')) GM.tabs.splice(5, 0, ['guild', 'กิลด์บอท/อันดับ'], ['bossloot', 'ของศึกชิงบอส']);
  const gmR0 = UI.gmRender;
  UI.gmRender = (tab, P) => {
    loadCfg(); const s = S.save;
    if (tab === 'guild') { const R = D.GUILD_WIN_REWARD; return `<div class="two"><div><h4>เพิ่มกิลด์บอท</h4><label class="fl">ชื่อกิลด์ (เว้นว่าง = สุ่ม)<input id="gbname" maxlength="24"></label><label class="fl">แท็ก (2–4 ตัว)<input id="gbtag" maxlength="4"></label>
      <div class="two"><label class="fl">Rating<input type="number" id="gbrating" value="1200" min="0" max="3500"></label><label class="fl">จำนวนสมาชิก<input type="number" id="gbmem" value="20" min="5" max="50"></label></div><label class="fl">เลเวลเฉลี่ยสมาชิก<input type="number" id="gblv" value="${s.lvl}" min="1" max="250"></label>
      <div class="list"><button class="btn primary" data-act="gm" data-c="gbadd">เพิ่มกิลด์บอท</button><button class="btn" data-act="gm" data-c="gbadd5">สุ่มเพิ่ม 5 กิลด์</button><button class="btn" data-act="gm" data-c="gbsim">จำลองศึกระหว่างกิลด์บอท 20 ศึก</button>${s.guild ? '' : '<button class="btn" data-act="gm" data-c="mkguildq">สร้างกิลด์ของเราด่วน</button>'}</div></div>
      <div><h4>รางวัลชนะศึกกิลด์ (ปรับได้)</h4><div class="two"><label class="fl">ทอง<input type="number" id="gwgold" value="${R.gold}" min="0"></label><label class="fl">แต้มสงคราม<input type="number" id="gwwar" value="${R.war}" min="0"></label><label class="fl">EXP กิลด์<input type="number" id="gwxp" value="${R.guildXp}" min="0"></label><label class="fl">ระดับไอเทมขั้นต่ำ<input type="number" id="gwtier" value="${R.minTier}" min="1" max="10"></label><label class="fl">จำนวนไอเทม<input type="number" id="gwn" value="${R.items}" min="0" max="10"></label></div>
      <div class="list"><button class="btn primary" data-act="gm" data-c="gwsave">บันทึกรางวัล</button><button class="btn" data-act="gm" data-c="gwtest">รับรางวัลชนะ 1 ครั้ง (ทดสอบ)</button><button class="btn" data-act="gm" data-c="gbseason">จบซีซันตอนนี้ + แจกรางวัลตามอันดับ</button></div></div></div>
      ${memberAdmin()}
      <h4>ตารางอันดับกิลด์ (${S.leaderboard().length} กิลด์)</h4>${rankTable(true)}<div id="gmout" class="gmout"></div>`; }
    if (tab === 'bossloot') { const R = D.BOSS_CLASH_RATES; const tot = Object.values(R).reduce((a, b) => a + b, 0); return `<p class="muted">โหมด PvP <b>ชิงบอส</b>: ถ้ามีทีมปิดบอสได้ เมื่อจบแมตช์ ผู้เล่นจริงทุกคนในปาร์ตี้ที่ชนะจะได้รับไอเทมระดับ 4 ขึ้นไปคนละ 2–3 ชิ้น สุ่มตามน้ำหนักด้านล่าง · บอท ทหารรับจ้าง และผู้เล่นจำลองไม่ได้รับ</p>
      <table class="tbl"><tr><th>ระดับ</th><th>น้ำหนัก</th><th>โอกาส</th></tr>${Object.entries(R).map(([t, w]) => `<tr><td>${tierSpan(+t, `${t} ${D.TIERS[t - 1].n}`)}</td><td><input type="number" class="bwt" data-t="${t}" value="${w}" min="0" max="1000" style="width:90px"></td><td>${(w / tot * 100).toFixed(1)}%</td></tr>`).join('')}</table>
      <div class="list"><button class="btn primary" data-act="gm" data-c="bwsave">บันทึกเรท</button><button class="btn" data-act="gm" data-c="bwsim">จำลองสุ่ม 1,000 ครั้ง</button><button class="btn" data-act="gm" data-c="bwgo">เข้าแมตช์ชิงบอส 15v15</button></div><div id="gmout" class="gmout"></div>`; }
    return gmR0(tab, P);
  };
  const gmC0 = UI.gmCmd;
  UI.gmCmd = (c, el) => {
    const s = S.save; const v = id => ($('#' + id) || {}).value; const out = h => { const o = $('#gmout'); if (o) o.innerHTML = h; };
    const find = n => s.rivals.find(r => r.name === n);
    switch (c) {
      case 'gbadd': { if (s.rivals.some(r => r.name === v('gbname'))) return UI.toast('มีชื่อกิลด์นี้แล้ว', 'bad'); const r = S.makeBotGuild({ name: (v('gbname') || '').trim() || null, tag: (v('gbtag') || '').trim() || null, rating: +v('gbrating') || 1000, members: U.clamp(+v('gbmem') || 20, 5, 50), avgLv: U.clamp(+v('gblv') || 50, 1, D.MAX_LV) }); s.rivals.push(r); S.persist(); UI.toast(`เพิ่มกิลด์บอท ${r.name} <${r.tag}>`, 'good'); UI.renderPanel(); return; }
      case 'gbadd5': for (let i = 0; i < 5; i++) { let r; do r = S.makeBotGuild(); while (s.rivals.some(x => x.name === r.name)); s.rivals.push(r); } S.persist(); UI.toast('เพิ่มกิลด์บอท 5 กิลด์', 'good'); UI.renderPanel(); return;
      case 'gbsim': S.simGuildWars(20); S.persist(); UI.toast('จำลองศึกกิลด์บอท 20 ศึกแล้ว อันดับอัปเดต', 'good'); UI.renderPanel(); return;
      case 'gbr': { const r = find(el.dataset.n); if (r) r.rating = Math.max(0, r.rating + +el.dataset.d); S.persist(); UI.renderPanel(); return; }
      case 'gbdel': s.rivals = s.rivals.filter(r => r.name !== el.dataset.n); S.persist(); UI.renderPanel(); return;
      case 'gbchal': { if (!s.guild) return UI.toast('ต้องมีกิลด์ก่อน', 'bad'); const r = find(el.dataset.n); UI.closePanel(); UI.challengePopup(r); return; }
      case 'gmbc': UI.panel.gbc = el.dataset.v; UI.renderPanel(); return;
      case 'gminv': { const g = s.guild; if (!g) return UI.toast('ต้องมีกิลด์ก่อน', 'bad'); let lo = U.clamp(+v('gmlvmin') || 1, 1, D.MAX_LV), hi = U.clamp(+v('gmlvmax') || lo, 1, D.MAX_LV); if (hi < lo) [lo, hi] = [hi, lo]; const n = U.clamp(+v('gmcnt') || 1, 1, GMAX); const sk = U.clamp(+v('gmskill') || 2, 1, 4); const P = UI.panel; P.glmin = lo; P.glmax = hi; P.gsk = sk; let added = 0;
        for (let i = 0; i < n && g.members.length < GMAX; i++) { const cls = P.gbc === 'random' ? U.pick(D.CLASSES).id : P.gbc === 'fill' ? fillRole(g) : P.gbc; const nm = n === 1 && (v('gmmname') || '').trim() ? v('gmmname').trim().slice(0, 16) : U.pick(D.NAMES) + U.ri(1, 999); g.members.push({ name: nm, cls, lvl: U.ri(lo, hi), skill: sk, bot: true }); added++; }
        S.persist(); UI.toast(added ? `เชิญบอทเข้ากิลด์ ${added} คน (Lv ${lo}${hi !== lo ? '–' + hi : ''})` : `กิลด์เต็มแล้ว (${GMAX + 1} คน)`, added ? 'good' : 'bad'); UI.renderPanel(); return; }
      case 'gmmlv': { const m = s.guild && s.guild.members[+el.dataset.i]; if (m) m.lvl = U.clamp(m.lvl + +el.dataset.d, 1, D.MAX_LV); S.persist(); UI.renderPanel(); return; }
      case 'gmkick': if (s.guild) { const m = s.guild.members.splice(+el.dataset.i, 1)[0]; if (m) UI.toast(`เตะ ${m.name} ออกจากกิลด์`, 'info'); } S.persist(); UI.renderPanel(); return;
      case 'gmkickall': if (s.guild) s.guild.members = []; S.persist(); UI.renderPanel(); return;
      case 'gmlvall': if (s.guild) { const L = U.clamp(+v('gmlvmin') || 1, 1, D.MAX_LV); s.guild.members.forEach(m => m.lvl = L); } S.persist(); UI.renderPanel(); return;
      case 'gmlvme': if (s.guild) s.guild.members.forEach(m => m.lvl = s.lvl); S.persist(); UI.renderPanel(); return;
      case 'gwsave': Object.assign(D.GUILD_WIN_REWARD, { gold: Math.max(0, +v('gwgold') || 0), war: Math.max(0, +v('gwwar') || 0), guildXp: Math.max(0, +v('gwxp') || 0), minTier: U.clamp(+v('gwtier') || 5, 1, 10), items: U.clamp(+v('gwn') || 0, 0, 10) }); saveCfg(); UI.toast('บันทึกรางวัลชนะศึกกิลด์แล้ว', 'good'); return;
      case 'gwtest': { if (!s.guild) return UI.toast('ต้องมีกิลด์ก่อน', 'bad'); const b = S.guildWinBonus({}); out(`ได้รับ: ทอง ${U.fmt(b.gold)} · แต้มสงคราม ${b.war} · EXP กิลด์ ${b.xp} · ${b.items.map(it => tierSpan(it.tier, esc(it.name))).join(', ')}`); return; }
      case 'gbseason': { const r = S.endSeason(); if (!r) return UI.toast('ต้องมีกิลด์ก่อน', 'bad'); UI.renderPanel(); out(`จบซีซัน: กิลด์คุณอันดับ ${r.rank} → ทอง ${U.fmt(r.R.gold)} · แต้มสงคราม ${U.fmt(r.R.war)}${r.R.title ? ' · ฉายา «' + esc(r.R.title) + '»' : ''} · ${r.items.map(it => tierSpan(it.tier, esc(it.name))).join(', ')}`); return; }
      case 'bwsave': document.querySelectorAll('.bwt').forEach(i => D.BOSS_CLASH_RATES[i.dataset.t] = Math.max(0, +i.value || 0)); saveCfg(); UI.toast('บันทึกเรทดรอปศึกชิงบอสแล้ว', 'good'); UI.renderPanel(); return;
      case 'bwsim': { const cnt = {}; for (let i = 0; i < 1000; i++) { const t = S.rollBossTier(); cnt[t] = (cnt[t] || 0) + 1; } out(Object.keys(cnt).sort((a, b) => a - b).map(t => tierSpan(+t, `ระดับ ${t}: ${cnt[t]}`)).join(' · ')); return; }
      case 'bwgo': UI.closePanel(); S.goPvP({ mode: 'boss', map: 8, size: 15, diff: 2, mercs: true }); return;
    }
    return gmC0(c, el);
  };
  const sg0 = UI.siegeResult; UI.siegeResult = (m, res) => { sg0(m, res); const b = res.bonus, box = $('#mbody'); if (!b || !box) return; const h = `<h4>รางวัลชนะศึกกิลด์</h4><p>ทอง +${U.fmt(b.gold)} · แต้มสงคราม +${b.war} · EXP กิลด์ +${b.xp}</p><div class="igrid">${b.items.map(it => UI.itemCell(it, 'noop')).join('')}</div>`; const list = box.querySelector('.list'); if (list) list.insertAdjacentHTML('beforebegin', h); else box.insertAdjacentHTML('beforeend', h); };
  document.addEventListener('change', e => { const t = e.target; if (t.classList && t.classList.contains('mlv') && S.save.guild) { const m = S.save.guild.members[+t.dataset.i]; if (m) { m.lvl = U.clamp(+t.value || 1, 1, D.MAX_LV); S.persist(); } } });
  const enter0 = UI.onEnter; UI.onEnter = (m) => { loadCfg(); return enter0(m); };
})(window.G);
