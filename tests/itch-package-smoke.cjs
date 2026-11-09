// Tests the actual extracted release inside a sandboxed cross-origin iframe, as used by itch.io.
// Only the configured production WebSocket is mapped to a local test backend.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {execFileSync}=require('node:child_process'),{chromium}=require('playwright');
(async()=>{
 const zip=path.resolve(process.env.ASHFALL_ITCH_ZIP||'dist/ashfall-itch.zip'),root=await fs.mkdtemp(path.join(os.tmpdir(),'ashfall-itch-')),errors=[],ws=process.env.ASHFALL_TEST_WS_URL||'ws://127.0.0.1:8080/ws';let server,browser;
 try{
  execFileSync('python3',['-m','zipfile','-e',zip,root]);assert.ok((await fs.stat(path.join(root,'index.html'))).isFile());
  server=http.createServer(async(req,res)=>{const url=new URL(req.url,'http://x');if(url.pathname==='/embed'){res.setHeader('Content-Type','text/html');res.end(`<iframe title="Ashfall Online" src="http://127.0.0.1:${server.address().port}/index.html" width="1280" height="720" sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms allow-downloads" allow="fullscreen; autoplay"></iframe>`);return;}
   try{const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep))throw Error('bad path');const data=await fs.readFile(file);res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.png':'image/png','.json':'application/json','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.statusCode=404;res.end();}});
  await new Promise(r=>server.listen(0,'0.0.0.0',r));browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const frames=[],suffix=Date.now().toString(36);
  for(let i=0;i<2;i++){
   const context=await browser.newContext({viewport:{width:1320,height:800}});await context.route('**/js/config.js*',route=>route.fulfill({contentType:'text/javascript',body:'window.ASHFALL_CFG='+JSON.stringify({ws,sharedWorld:true,noBots:true})+';'}));const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.url().includes('127.0.0.1')&&r.status()===404)errors.push('Missing packaged asset '+r.url());});
   await p.goto(`http://localhost:${server.address().port}/embed`);await p.waitForFunction(()=>document.querySelector('iframe'));let frame;for(let n=0;n<200;n++){frame=p.frames().find(f=>f.url().includes('/index.html'));if(frame)break;await new Promise(r=>setTimeout(r,50));}assert.ok(frame);
   await frame.waitForFunction(()=>window.ASHFALL_NET?.authed&&ASHFALL_NET.features.onlineAuthority===2);
   await frame.evaluate(async({suffix,i})=>{window.releaseErrors=[];ASHFALL_NET.on('online_error',m=>releaseErrors.push(m.error));await ASHFALL_NET.request({t:'account_register',username:'itch-'+suffix+'-'+i,password:'itch-release-test-password'});G.S.save=G.S.newSave('Itch '+i,'guardian');document.getElementById('boot2').hidden=true;document.getElementById('title-screen').hidden=true;G.S.goTown('aurelion');},{suffix,i});await frame.waitForFunction(()=>G.SHARED_WORLD.ready&&G.SHARED_WORLD.characterRevision>0).catch(async e=>{console.error('Iframe diagnostics',await frame.evaluate(()=>({connected:ASHFALL_NET.connected,authed:ASHFALL_NET.authed,error:ASHFALL_NET.error,active:G.SHARED_WORLD.active,ready:G.SHARED_WORLD.ready,rev:G.SHARED_WORLD.characterRevision,hasSave:!!G.S.save,hasPlayer:!!G.W.player,mode:G.W.mode?.kind,errors:window.releaseErrors})),errors);throw e;});frames.push(frame);
  }
  for(const frame of frames)await frame.waitForFunction(()=>G.W.units.filter(u=>u.pid).length===2);
  const gold=await frames[0].evaluate(()=>G.S.save.gold),otherBag=await frames[1].evaluate(()=>G.S.save.bag.hpPot);
  await frames[0].evaluate(()=>G.SHARED_WORLD.command('buy',[0,1]));assert.equal(await frames[0].evaluate(()=>G.S.save.gold),gold-40);assert.equal(await frames[1].evaluate(()=>G.S.save.bag.hpPot),otherBag);
  for(const frame of frames){await frame.evaluate(()=>G.S.goFarm(0));await frame.waitForFunction(()=>G.SHARED_WORLD.ready&&G.W.mode.kind==='farm');}
  for(const frame of frames)await frame.waitForFunction(()=>G.W.units.filter(u=>u.pid).length===2);
  const mobs=await Promise.all(frames.map(frame=>frame.evaluate(()=>G.W.units.filter(u=>u.kind==='mob').map(u=>u.id).sort((a,b)=>a-b))));assert.ok(mobs[0].length>0);assert.deepEqual(mobs[0],mobs[1]);assert.deepEqual(errors,[]);
  await frames[0].page().screenshot({path:'/tmp/ashfall-itch-release.png'});
  const reloadPage=frames[0].page();await reloadPage.reload();const reloaded=reloadPage.frames().find(f=>f.url().includes('/index.html'));assert.ok(reloaded);await reloaded.waitForFunction(()=>window.ASHFALL_NET?.connected&&ASHFALL_NET.features?.onlineAuthority===2);
  await reloaded.evaluate(async suffix=>{await ASHFALL_NET.request({t:'account_login',username:'itch-'+suffix+'-0',password:'itch-release-test-password'});},suffix);await reloaded.waitForFunction(()=>G.S.slots().some(s=>s?.name==='Itch 0'));assert.equal(await reloaded.evaluate(()=>G.S.slots().find(s=>s?.name==='Itch 0').gold),gold-40);
  console.log('PASS iframe account login restores durable inventory after reload without relying on browser storage');
  console.log('PASS extracted itch.io ZIP: sandbox iframe, packaged assets, two accounts, shared town/farm, private durable purchase');
  console.log('Production WebSocket was mapped to the local test backend; live deployment is not verified.');
 }finally{await browser?.close();if(server)await new Promise(r=>server.close(r));await fs.rm(root,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
