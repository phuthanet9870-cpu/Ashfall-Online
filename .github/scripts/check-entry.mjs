import {GameClient} from '../../tests/transport.mjs';
import {createHeadless} from '../../server/headless.mjs';
const endpoint='wss://ashfall-online.phuthanet9870.workers.dev/ws',clients=[];
try{
 const health=await (await fetch('https://ashfall-online.phuthanet9870.workers.dev/health')).json();console.log('::notice title=Authority health::'+JSON.stringify(health.authority));
 for(let i=0;i<2;i++){
  const c=await new GameClient(endpoint).connect();clients.push(c);console.log('::notice::WebSocket release '+c.messages.find(m=>m.t==='hi').features.release);
  c.send({t:'auth',pid:c.pid,key:c.key,name:'Entry probe '+i,cls:'guardian',lv:1});const auth=await c.wait(m=>['me','auth_fail','note'].includes(m.t));if(auth.t!=='me')throw new Error('Authentication rejected: '+JSON.stringify(auth));console.log('::notice::PASS production guest authentication '+i);
  const request=crypto.randomUUID();c.testAccount={username:'entry-'+Date.now().toString(36)+'-'+i+'-'+crypto.randomUUID().slice(0,6),password:crypto.randomUUID()+crypto.randomUUID()};c.send({t:'account_register',request,...c.testAccount});const account=await c.wait(m=>m.request===request&&['account_ok','online_error'].includes(m.t));if(account.t!=='account_ok')throw new Error('Production account registration: '+account.error);c.pid=account.pid;console.log('::notice::PASS production account registration '+i);
  const G=createHeadless();await c.enter({kind:'town'},c.characterId,G.S.newSave('Entry probe '+i,'guardian'));console.log('::notice::PASS production authoritative world entry '+i);
 }
 await Promise.all(clients.map(c=>c.condition(()=>[...c.units.values()].filter(u=>u.pid).length>=2)));
 console.log('::notice::PASS two authenticated production players share a world');
 const [a,b]=clients,unit=c=>[...c.units.values()].find(u=>u.pid===a.ready.playerId),start={x:unit(a).x,y:unit(a).y};a.send({t:'online_action',action:'move',x:start.x+1.5,y:start.y});await Promise.all(clients.map(c=>c.condition(()=>unit(c)&&Math.hypot(unit(c).x-start.x,unit(c).y-start.y)>.5,10000)));console.log('::notice::PASS production movement is visible to both players');
 const otherGold=b.character.save.gold,before=a.character.save.gold;await a.command('buy',[0,1]);if(a.character.save.gold!==before-40||b.character.save.gold!==otherGold)throw new Error('Private purchase balance mismatch');console.log('::notice::PASS production private durable purchase');
 const restored=await new GameClient(endpoint).connect();clients.push(restored);const request=crypto.randomUUID();restored.send({t:'account_login',request,...a.testAccount});const login=await restored.wait(m=>m.request===request&&['account_ok','online_error'].includes(m.t));if(login.t!=='account_ok')throw new Error('Production account restore: '+login.error);restored.pid=login.pid;await restored.enter({kind:'town'},a.characterId);await restored.condition(()=>restored.character?.save.gold===before-40);console.log('::notice::PASS production account login on a new connection restores durable inventory');

}catch(e){
 const detail=e.message+'; replies='+JSON.stringify(clients.map(c=>c.messages.slice(-8).map(m=>({t:m.t,why:m.why,error:m.error,detail:m.detail,msg:m.msg}))));console.log('::error title=Production entry failure::'+detail);process.exitCode=1;
}finally{for(const c of clients)c.close();}
