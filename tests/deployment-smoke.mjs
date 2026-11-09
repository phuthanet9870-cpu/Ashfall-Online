// Read-only production check run after deployment. Never creates accounts or changes player state.
import assert from 'node:assert/strict';
import WebSocket from 'ws';
const endpoint=new URL(process.env.ASHFALL_WS_URL||'wss://ashfall-online.phuthanet9870.workers.dev/ws');
const health=new URL(endpoint);health.protocol=endpoint.protocol==='wss:'?'https:':'http:';health.pathname='/health';health.search='';
async function check(){
 const response=await fetch(health,{signal:AbortSignal.timeout(15000)});assert.equal(response.status,200);const body=await response.json();assert.equal(body.ok,true);assert.ok(body.authority,'online authority health is present');
 await new Promise((resolve,reject)=>{const socket=new WebSocket(endpoint,{handshakeTimeout:15000});const timer=setTimeout(()=>{socket.terminate();reject(new Error('WebSocket greeting timeout'));},20000);socket.on('error',error=>{clearTimeout(timer);reject(error);});socket.once('message',raw=>{try{const hello=JSON.parse(raw.toString());assert.equal(hello.t,'hi');assert.equal(hello.features?.onlineAuthority,2);clearTimeout(timer);socket.close();resolve();}catch(error){clearTimeout(timer);socket.close();reject(error);}});});
}
let failure;for(let attempt=0;attempt<6;attempt++){try{await check();console.log('PASS deployed backend: HTTPS health and WebSocket onlineAuthority=2');failure=null;break;}catch(error){failure=error;if(attempt<5)await new Promise(r=>setTimeout(r,2000));}}
if(failure)throw failure;
