import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import net from 'node:net';
import {once} from 'node:events';
import {createHeadless} from '../server/headless.mjs';
import {GameClient} from './transport.mjs';

async function port(){const s=net.createServer();s.listen(0,'127.0.0.1');await once(s,'listening');const p=s.address().port;await new Promise(r=>s.close(r));return p;}
test('real Node process persists trade, inventory and a damaged shared monster across SIGKILL', {timeout:90000},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'ashfall-restart-')),p=await port(),url=`ws://127.0.0.1:${p}/ws`,clients=[];let child;
 async function start(){let error='';child=spawn(process.execPath,['server/server.mjs'],{cwd:resolve('.'),env:{...process.env,PORT:String(p),ASHFALL_DATA_FILE:join(dir,'store.json'),ALLOW_LEGACY_IMPORT:'1'},stdio:['ignore','pipe','pipe']});child.stderr.on('data',d=>error+=d.toString());const end=Date.now()+15000;while(Date.now()<end){try{if((await fetch(`http://127.0.0.1:${p}/health`)).ok)return;}catch{}if(child.exitCode!==null)throw new Error(error);await new Promise(r=>setTimeout(r,50));}throw new Error('server startup timed out '+error);}
 try{
  await start();const G=createHeadless(),a=await new GameClient(url).connect(),b=await new GameClient(url).connect();clients.push(a,b);await a.auth('Persist A');await b.auth('Persist B');
  for(const[c,name,uid]of[[a,'Persist A','owned-a'],[b,'Persist B','owned-b']]){const legacy=G.S.newSave(name,'guardian');legacy.lvl=5;legacy.gold=10000;legacy.inv=[{uid,kind:'gem',tier:1,name:uid,main:{s:'atk',v:1}}];await c.enter({kind:'town'},c.characterId,legacy);}
  await a.command('buy',[0,1]);a.send({t:'online_trade_request',target:b.ready.playerId});let t=(await a.wait(m=>m.t==='online_trade'&&m.trade.status==='invited')).trade;
  b.send({t:'online_trade_accept',trade:t.id});t=(await a.wait(m=>m.t==='online_trade'&&m.trade.status==='open')).trade;
  a.send({t:'online_trade_offer',trade:t.id,version:t.version,items:['owned-a'],gold:100});t=(await a.wait(m=>m.t==='online_trade'&&m.trade.version>t.version)).trade;
  b.send({t:'online_trade_offer',trade:t.id,version:t.version,items:['owned-b'],gold:0});t=(await a.wait(m=>m.t==='online_trade'&&m.trade.version>t.version)).trade;
  for(const c of[a,b])c.send({t:'online_trade_lock',trade:t.id,version:t.version});await a.wait(m=>m.t==='online_trade'&&m.trade.locked?.every(Boolean));for(const c of[a,b])c.send({t:'online_trade_confirm',trade:t.id,version:t.version});await a.wait(m=>m.t==='online_trade'&&m.trade.status==='complete');
  assert.equal(a.character.save.gold,9860);assert.equal(b.character.save.gold,10100);assert.equal(a.character.save.inv[0].uid,'owned-b');
  const ready=await a.enter({kind:'farm',id:'meadow'}),player=a.units.get(ready.state.units.find(u=>u.pid===ready.playerId).id);
  const mob=[...a.units.values()].filter(u=>u.kind==='mob'&&u.grade==='normal'&&u.hp>200).sort((x,y)=>Math.hypot(x.x-player.x,x.y-player.y)-Math.hypot(y.x-player.x,y.y-player.y))[0];assert.ok(mob);
  a.send({t:'online_action',action:'move',x:mob.x,y:mob.y});await a.condition(()=>{const u=[...a.units.values()].find(u=>u.pid===ready.playerId),m=a.units.get(mob.id);return Math.hypot(u.x-m.x,u.y-m.y)<1.9;},30000);
  const hp=a.units.get(mob.id).hp;a.send({t:'online_action',action:'basic',target:mob.id});await a.condition(()=>a.units.get(mob.id)?.hp<hp);assert.ok(a.units.get(mob.id).hp>0);
  await a.command('settings',[{music:false}]);const savedHP=a.units.get(mob.id).hp,identity={pid:a.pid,key:a.key,characterId:a.characterId};
  const exited=once(child,'exit');child.kill('SIGKILL');await exited;await start();
  const restored=await new GameClient(url).connect();clients.push(restored);Object.assign(restored,identity);await restored.auth('Persist A');const entered=await restored.enter({kind:'farm',id:'meadow'});
  assert.equal(restored.character.save.gold,9860);assert.equal(restored.character.save.lvl,5);assert.equal(restored.character.save.inv[0].uid,'owned-b');assert.equal(entered.state.units.find(u=>u.id===mob.id).hp,savedHP);
 }finally{for(const c of clients)c.close();if(child?.exitCode===null){const exited=once(child,'exit');child.kill('SIGTERM');await exited;}await rm(dir,{recursive:true,force:true});}
});
