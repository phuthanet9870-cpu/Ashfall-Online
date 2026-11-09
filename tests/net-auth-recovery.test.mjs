import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function fixture(initial={}){
 const data=new Map(Object.entries(initial)),sockets=[],timers=[];
 class Socket{constructor(){this.readyState=1;this.sent=[];sockets.push(this);}send(s){this.sent.push(JSON.parse(s));}receive(m){this.onmessage({data:JSON.stringify(m)});}}
 const context={console,crypto,location:{protocol:'https:',host:'game.test'},WebSocket:Socket,setInterval:f=>timers.push(f),setTimeout:()=>1,clearTimeout(){},TextDecoder,ASHFALL_STORAGE:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},G:{S:{save:{name:'Legacy',cls:'ranger',lvl:9}}}};
 context.window=context;vm.runInNewContext(readFileSync('public/js/netshim.js','utf8'),context);context.claude.use('room');const socket=sockets[0];socket.onopen();return{net:context.ASHFALL_NET,socket,data,timers};
}
test('auth_required reauthenticates instead of leaving a green frozen client',()=>{
 const f=fixture();f.socket.receive({t:'me'});assert.equal(f.net.authed,true);let lost=0;f.net.on('auth_lost',()=>lost++);
 f.socket.receive({t:'online_error',error:'auth_required'});assert.equal(f.net.authed,false);assert.equal(lost,1);assert.equal(f.socket.sent.at(-1).t,'auth');f.socket.receive({t:'me'});assert.equal(f.net.authed,true);
});
test('account-locked legacy guest identity is replaced without changing legacy save',()=>{
 const id='0123456789abcdef',f=fixture({ashfall_pid:id,ashfall_key:'a'.repeat(32)});f.socket.receive({t:'auth_fail',why:'account_login_required'});assert.notEqual(f.net.pid,id);assert.equal(f.socket.sent.at(-1).pid,f.net.pid);f.socket.receive({t:'me'});assert.equal(f.net.authed,true);
});
test('session resume is sent once while pending and expiry requests login',()=>{
 const f=fixture({ashfall_session:'a'.repeat(64)});for(const tick of f.timers)tick();assert.equal(f.socket.sent.filter(m=>m.t==='account_resume').length,1);let login=0;f.net.on('login_required',()=>login++);f.socket.receive({t:'online_error',error:'session_expired'});assert.equal(login,1);assert.equal(f.net.authed,false);assert.equal(f.net.signedOut,true);assert.equal(f.data.get('ashfall_session'),'');
});
