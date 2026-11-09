const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});try{
 const context=await browser.newContext(),page=await context.newPage(),url=process.env.ASHFALL_TEST_URL||'http://127.0.0.1:8099';await page.goto(url);await page.waitForFunction(()=>window.ASHFALL_NET?.authed);
 const identity=await page.evaluate(()=>({ashfall_pid:ASHFALL_STORAGE.getItem('ashfall_pid'),ashfall_key:ASHFALL_STORAGE.getItem('ashfall_key')}));
 const duplicate=await browser.newContext();await duplicate.addInitScript(identity=>{for(const[k,v]of Object.entries(identity))localStorage.setItem(k,v);},identity);const second=await duplicate.newPage();await second.goto(url);await second.waitForFunction(()=>window.ASHFALL_NET?.authed);await page.waitForFunction(()=>ASHFALL_NET.signedOut===true);
 await page.evaluate(()=>G.BOOT.login());await page.click('[data-b2="guest"]');await page.waitForFunction(()=>ASHFALL_NET.authed&&!ASHFALL_NET.signedOut&&G.ACC?.how==='guest');assert.notEqual(await page.evaluate(()=>ASHFALL_NET.pid),identity.ashfall_pid);
 await page.click('[data-act="sl-new"]');await page.click('[data-act="cc-start"]');await page.waitForFunction(()=>G.SHARED_WORLD.ready);
 const start=await page.evaluate(()=>({x:G.W.player.x,y:G.W.player.y}));await page.keyboard.down('d');await page.waitForFunction(s=>Math.hypot(G.W.player.x-s.x,G.W.player.y-s.y)>1,start);await page.keyboard.up('d');console.log('PASS revoked guest: actual guest button reauthenticates, creates character, enters authority and moves');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
