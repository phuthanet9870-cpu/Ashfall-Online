import {GameClient} from '../../tests/transport.mjs';
import {createHeadless} from '../../server/headless.mjs';
const endpoint='wss://ashfall-online.phuthanet9870.workers.dev/ws',clients=[];
try{
 for(let i=0;i<2;i++){
  const c=await new GameClient(endpoint).connect();clients.push(c);console.log('::notice::WebSocket release '+c.messages.find(m=>m.t==='hi').features.release);
  await c.auth('Entry probe '+i);console.log('::notice::PASS production guest authentication '+i);
  const G=createHeadless();await c.enter({kind:'town'},c.characterId,G.S.newSave('Entry probe '+i,'guardian'));console.log('::notice::PASS production authoritative world entry '+i);
 }
 await Promise.all(clients.map(c=>c.condition(()=>[...c.units.values()].filter(u=>u.pid).length>=2)));
 console.log('::notice::PASS two authenticated production players share a world');
}catch(e){
 const detail=e.message+'; replies='+JSON.stringify(clients.map(c=>c.messages.slice(-8).map(m=>({t:m.t,why:m.why,error:m.error,msg:m.msg}))));console.log('::error title=Production entry failure::'+detail);process.exitCode=1;
}finally{for(const c of clients)c.close();}
