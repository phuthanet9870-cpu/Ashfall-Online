const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});try{
 const p=await b.newPage();let dropped=false;
 await p.routeWebSocket('**/ws',route=>{const server=route.connectToServer();server.onMessage(data=>{const m=JSON.parse(data);if(m.t==='me'&&!dropped){dropped=true;return;}route.send(data);});});
 await p.goto(process.env.ASHFALL_TEST_URL||'http://127.0.0.1:8080');await p.waitForFunction(()=>window.ASHFALL_NET?.connected);await p.evaluate(()=>G.BOOT.login());await p.click('[data-b2="guest"]');await p.waitForFunction(()=>G.ACC?.how==='guest'&&ASHFALL_NET.authed,{timeout:15000});assert.equal(dropped,true);await p.click('[data-act="sl-new"]');await p.click('[data-act="cc-start"]');await p.waitForFunction(()=>G.SHARED_WORLD.ready);console.log('PASS browser: dropped first auth reply, real guest button retries and enters server world');
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
