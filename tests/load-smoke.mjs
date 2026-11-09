import assert from 'node:assert/strict';
import {GameClient} from './transport.mjs';
const n=Number(process.env.ASHFALL_LOAD_CLIENTS||30),seconds=Number(process.env.ASHFALL_LOAD_SECONDS||8),url=process.env.ASHFALL_WS_URL||'ws://127.0.0.1:8095/ws';
const clients=[];let frameIntervals=[];
try{
 const start=performance.now();
 for(let i=0;i<n;i++){const c=await new GameClient(url).connect();clients.push(c);await c.auth('Load'+i);await c.enter({kind:'farm',id:'meadow'},'load-character');}
 await Promise.all(clients.map(c=>c.condition(()=>[...c.units.values()].filter(u=>u.pid).length===n)));
 const received=clients.reduce((a,c)=>a+c.bytes,0),sampleStart=performance.now();
 const original=clients[0].ws.listeners('message')[0];let last=Date.now();clients[0].ws.on('message',data=>{const m=JSON.parse(data);if(m.t==='online_state'){frameIntervals.push(Date.now()-last);last=Date.now();}});
 for(let tick=0;tick<seconds*10;tick++){for(let i=0;i<clients.length;i++){const c=clients[i],p=[...c.units.values()].find(u=>u.pid===c.ready.playerId);if(p&&tick%4===0)c.send({t:'online_action',action:'move',x:c.ready.geometry.spawn.x+((tick+i)%4),y:c.ready.geometry.spawn.y+((tick+i)%3)});}await new Promise(r=>setTimeout(r,100));}
 for(const c of clients){assert.equal([...c.units.values()].filter(u=>u.pid).length,n);assert.equal(c.ws.readyState,1);assert.equal(c.messages.filter(m=>m.t==='online_error').length,0);}
 frameIntervals=frameIntervals.slice(1).sort((a,b)=>a-b);const bytes=clients.reduce((a,c)=>a+c.bytes,0)-received,elapsed=(performance.now()-sampleStart)/1000;
 console.log(JSON.stringify({clients:n,sampleSeconds:+elapsed.toFixed(2),totalSeconds:+((performance.now()-start)/1000).toFixed(2),receivedKiBPerSecond:+(bytes/1024/elapsed).toFixed(1),p95SnapshotMs:frameIntervals[Math.floor(frameIntervals.length*.95)],frames:frameIntervals.length,allConnected:true}));
 assert.ok(frameIntervals.length>=seconds*2,'sustained server snapshots');
}finally{for(const c of clients)c.close();}
