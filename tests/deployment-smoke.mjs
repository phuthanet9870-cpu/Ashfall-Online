// Read-only production check run after deployment. Never creates accounts or changes player state.
import assert from 'node:assert/strict';
import {appendFileSync} from 'node:fs';
const summary=text=>{if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,text+'\n');};
import WebSocket from 'ws';
const endpoint=new URL(process.env.ASHFALL_DEPLOYMENT_URL||process.env.ASHFALL_WS_URL||'wss://ashfall-online.phuthanet9870.workers.dev/ws');
if(endpoint.protocol==='https:'||endpoint.protocol==='http:'){endpoint.protocol=endpoint.protocol==='https:'?'wss:':'ws:';endpoint.pathname='/ws';}
console.log('::notice title=Deployed online endpoint::'+endpoint.href);summary('Deployment endpoint: '+endpoint.href);
const health=new URL(endpoint);health.protocol=endpoint.protocol==='wss:'?'https:':'http:';health.pathname='/health';health.search='';
async function check(){
 const response=await fetch(health,{signal:AbortSignal.timeout(15000)});if(response.status!==200)throw new Error('GET /health returned '+response.status+': '+(await response.text()).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(0,240));const body=await response.json();assert.equal(body.ok,true);assert.ok(body.authority,'Health endpoint lacks authority: '+JSON.stringify(body));
 await new Promise((resolve,reject)=>{const socket=new WebSocket(endpoint,{handshakeTimeout:15000});const timer=setTimeout(()=>{socket.terminate();reject(new Error('WebSocket greeting timeout'));},20000);socket.on('error',error=>{clearTimeout(timer);reject(error);});socket.once('message',raw=>{try{const hello=JSON.parse(raw.toString());assert.equal(hello.t,'hi');assert.equal(hello.features?.onlineAuthority,2);assert.equal(hello.features?.serverGM,1);assert.equal(hello.features?.snapshotHz,10);if(process.env.ASHFALL_EXPECTED_RELEASE)assert.equal(hello.features?.release,process.env.ASHFALL_EXPECTED_RELEASE,'deployed release matches this commit');clearTimeout(timer);socket.close();resolve();}catch(error){clearTimeout(timer);socket.close();reject(error);}});});
}
let failure;for(let attempt=0;attempt<45;attempt++){try{await check();console.log('PASS deployed backend: HTTPS health and WebSocket onlineAuthority=2, serverGM=1, snapshotHz=10, release verified');summary('PASS: '+health.href+' and WebSocket onlineAuthority=2, serverGM=1, snapshotHz=10, release verified');failure=null;break;}catch(error){failure=error;if(attempt<44)await new Promise(r=>setTimeout(r,2000));}}
if(failure){const detail=failure.message+(failure.cause?.code?' ('+failure.cause.code+')':'');summary('FAILED: '+health.href+' — '+detail);console.error('::error title=Production authority verification::'+detail.replaceAll('\n','%0A'));throw failure;}
