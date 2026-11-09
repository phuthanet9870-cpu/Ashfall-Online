// Optional: Playwright + Chromium; run the Node server first with legacy migration enabled.
const assert=require('node:assert/strict');const{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const pages=[],errors=[],url=process.env.ASHFALL_TEST_URL||'http://127.0.0.1:8080',suffix=Date.now().toString(36);
 async function page(){const context=await browser.newContext(),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!m.text().startsWith('Failed to load resource:'))errors.push(m.text());});await p.goto(url);await p.waitForFunction(()=>ASHFALL_NET.connected&&ASHFALL_NET.features?.onlineAuthority===2);return p;}
 try{
  for(let i=0;i<2;i++){const p=await page();pages.push(p);await p.evaluate(async({i,suffix})=>{await ASHFALL_NET.request({t:'account_register',username:'smoke-'+suffix+'-'+i,password:'smoke-password-123'});const{S}=G;S.save=S.newSave('Browser'+i,'ranger');S.save.lvl=17;S.save.gold=10000;const item=S.genItem('gem',1,1);item.uid='browser-'+i+'-'+suffix;S.save.inv.push(item);document.getElementById('boot2').hidden=true;document.getElementById('title-screen').hidden=true;S.goTown('aurelion');window.testStates=new Map();ASHFALL_NET.on('online_state',m=>testStates.set(m.state.revision,JSON.stringify(m.state)));}, {i,suffix});await p.waitForFunction(()=>G.SHARED_WORLD.ready&&G.SHARED_WORLD.characterRevision>0,{timeout:30000});}
  for(const p of pages)await p.waitForFunction(()=>G.W.units.filter(u=>u.pid).length===2&&testStates.size>=2);
  assert.equal(await pages[0].evaluate(()=>G.S.save.lvl),17);
  await pages[0].evaluate(()=>G.SHARED_WORLD.command('buy',[0,1]));assert.equal(await pages[0].evaluate(()=>G.S.save.gold),9960);
  const target=await pages[1].evaluate(()=>G.SHARED_WORLD.playerId);
  await pages[0].evaluate(target=>ASHFALL_NET.send({t:'online_trade_request',target}),target);
  await pages[1].waitForSelector('[data-act="t-reqyes"]');await pages[1].click('[data-act="t-reqyes"]');
  for(const p of pages)await p.waitForSelector('[data-act="t-add"][data-who="me"]');
  await pages[0].click(`[data-act="t-add"][data-uid="browser-0-${suffix}"]`);
  await pages[1].waitForFunction(uid=>G.UI.onlineTrade?.offers[0].items.includes(uid),'browser-0-'+suffix);
  await pages[1].click(`[data-act="t-add"][data-uid="browser-1-${suffix}"]`);
  await pages[0].waitForFunction(uid=>G.UI.onlineTrade?.offers[1].items.includes(uid),'browser-1-'+suffix);
  await pages[0].fill('#tgme','100');await pages[0].press('#tgme','Tab');await pages[1].waitForFunction(()=>G.UI.onlineTrade.offers[0].gold===100);await pages[0].fill('#tgme','0');await pages[0].press('#tgme','Tab');await pages[1].waitForFunction(()=>G.UI.onlineTrade.offers[0].gold===0);
  for(const p of pages){assert.deepEqual(await p.evaluate(()=>G.UI.PANELS.trade.tabs.map(t=>t[0])),['deal','near','hist']);assert.equal(await p.locator('.tside').count(),2);assert.equal(await p.locator('.tslots .icell').count(),16);assert.equal(await p.locator('#authority-status,[data-p="multiplayer"]').count(),0);}
  await pages[0].screenshot({path:'/tmp/ashfall-restored-trade.png'});
  await pages[0].click('[data-act="t-lock"]');await pages[0].waitForSelector('[data-act="t-unlock"]');await pages[0].click('[data-act="t-unlock"]');await pages[0].waitForFunction(()=>G.UI.onlineTrade.locked.every(x=>!x));
  await pages[0].click('[data-act="t-lock"]');await pages[1].click('[data-act="t-lock"]');
  for(const p of pages)await p.waitForFunction(()=>{const button=document.querySelector('[data-act="t-confirm"]');return button&&!button.disabled;});
  await pages[0].click('[data-act="t-confirm"]');await pages[1].click('[data-act="t-confirm"]');
  await pages[0].waitForFunction(uid=>G.S.save.inv.some(it=>it.uid===uid),'browser-1-'+suffix);await pages[1].waitForFunction(uid=>G.S.save.inv.some(it=>it.uid===uid),'browser-0-'+suffix);
  console.log('PASS browser: one-time migration, purchase, real two-party trade UI');
  for(const mode of ['farm','dungeon','wbarena','pvp']){
    for(const p of pages){await p.evaluate(mode=>{G.UI.closePanel();if(mode==='farm')G.S.goFarm(0);if(mode==='dungeon')G.S.goDungeon('armory',1,0);if(mode==='wbarena')G.S.goWorldBoss(false);if(mode==='pvp')G.S.goPvP({mode:'tdm',map:0,size:1,diff:1,mercs:false,normalized:true});},mode);await p.waitForFunction(mode=>G.SHARED_WORLD.ready&&G.W.mode.kind===mode,mode,{timeout:30000});}
    for(const p of pages)await p.waitForFunction(()=>G.W.units.filter(u=>u.pid).length===2);
    if(mode==='farm'){await pages[0].evaluate(()=>G.E.cast(G.W.player,0,{x:G.W.player.x+1,y:G.W.player.y}));await pages[0].waitForFunction(()=>G.W.player.cds[0]>0);}
    console.log('PASS browser world:',mode);
  }
  // Create real guild identities through the existing social protocol, then join a common siege.
  for(let i=0;i<2;i++){const p=pages[i];await p.evaluate(({i,suffix})=>{ASHFALL_NET.send({t:'g_create',name:'Guild'+suffix+i,tag:crypto.randomUUID().replaceAll('-','').slice(0,4)});window.guildSeen=false;ASHFALL_NET.on('g_info',m=>{if(m.guild)window.guildSeen=true;});},{i,suffix});await p.waitForFunction(()=>guildSeen);await p.evaluate(()=>G.S.goSiege({size:1,type:'ranked',rival:{name:'Opponent',tag:'OP',rating:1000}}));await p.waitForFunction(()=>G.SHARED_WORLD.ready&&G.W.mode.kind==='siege',{timeout:30000});}
  for(const p of pages)await p.waitForFunction(()=>G.W.units.filter(u=>u.pid).length===2);
  const team=await Promise.all(pages.map(p=>p.evaluate(()=>G.W.player.team)));assert.notEqual(team[0],team[1]);console.log('PASS browser world: real guild siege');
  await pages[0].reload();await pages[0].waitForFunction(()=>ASHFALL_NET.authed&&G.S.slots().some(Boolean));await pages[0].evaluate(()=>{G.S.save=G.S.slots().find(s=>s?.name==='Browser0');document.getElementById('boot2').hidden=true;document.getElementById('title-screen').hidden=true;G.S.goTown('aurelion');});await pages[0].waitForFunction(()=>G.SHARED_WORLD.ready);
  assert.equal(await pages[0].evaluate(()=>G.S.save.gold),9960);assert.ok(await pages[0].evaluate(uid=>G.S.save.inv.some(it=>it.uid===uid),'browser-1-'+suffix));
  const third=await page();await third.evaluate(async suffix=>{await ASHFALL_NET.request({t:'account_login',username:'smoke-'+suffix+'-0',password:'smoke-password-123'});},suffix);await third.waitForFunction(()=>G.S.slots().some(s=>s?.name==='Browser0'));assert.ok(await third.evaluate(uid=>G.S.slots().some(s=>s?.inv?.some(it=>it.uid===uid)),'browser-1-'+suffix));
  await third.evaluate(()=>{G.S.save=G.S.slots().find(s=>s?.name==='Browser0');document.getElementById('boot2').hidden=true;document.getElementById('title-screen').hidden=true;G.S.goTown('aurelion');});await third.waitForFunction(()=>G.SHARED_WORLD.ready);
  await third.evaluate(()=>G.UI.openNpc({role:'market',name:'NPC Market'}));await third.waitForFunction(()=>G.S.save._onlineMarket?.items.length===10);
  const offer=await third.evaluate(()=>G.S.save._onlineMarket.items.find(it=>it.price<G.S.save.gold));assert.ok(offer,'affordable authoritative market listing');
  const before=await third.evaluate(()=>G.S.save.gold);await third.click(`[data-act="npcsel"][data-uid="${offer.uid}"]`);await third.click('[data-act="mbuy"]');await third.waitForFunction(uid=>G.S.save.inv.some(it=>it.uid===uid),offer.uid);assert.equal(await third.evaluate(()=>G.S.save.gold),before-offer.price);
  await third.screenshot({path:'/tmp/ashfall-online-market.png'});console.log('PASS browser: exact authoritative NPC market purchase');
  console.log('PASS browser: reload persistence and cross-device account login');assert.deepEqual([...new Set(errors)],[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
