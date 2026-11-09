import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function fixture(initial={}){
 const data=new Map(Object.entries(initial)),sockets=[],timers=[],timeouts=[];let now=100000;
 class Socket{constructor(){this.readyState=1;this.sent=[];sockets.push(this);}send(s){this.sent.push(JSON.parse(s));}receive(m){this.onmessage({data:JSON.stringify(m)});}}
 const context={console,crypto,location:{protocol:'https:',host:'game.test'},WebSocket:Socket,setInterval:f=>timers.push(f),Date:class extends Date{static now(){return now;}},setTimeout:f=>{timeouts.push(f);return timeouts.length;},clearTimeout(){},TextDecoder,ASHFALL_STORAGE:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},G:{S:{save:{name:'Legacy',cls:'ranger',lvl:9}}}};
 context.window=context;vm.runInNewContext(readFileSync('public/js/netshim.js','utf8'),context);context.claude.use('room');const socket=sockets[0];socket.onopen();return{net:context.ASHFALL_NET,socket,data,timers,timeouts,advance:ms=>now+=ms};
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
test('guest authentication finishes before a simultaneous account registration binds its identity',async()=>{
 const {createCore}=await import('../server/core.mjs');const values=new Map(),messages=[];let release,entered;
 const waiting=new Promise(r=>release=r),started=new Promise(r=>entered=r);const pid='0123456789abcdef';let blocked=true;
 const storage={async get(k){if(k==='account-locked:'+pid&&blocked){blocked=false;entered();await waiting;}return values.get(k)||null;},async put(k,v){values.set(k,v);},async transaction(fn){return fn({get:async k=>values.get(k)||null,put:async(k,v)=>values.set(k,v)});}};
 const core=createCore({storage,hash:async x=>x}),c=core.connect({send:s=>messages.push(JSON.parse(s)),close(){}});
 const auth=core.message(c,JSON.stringify({t:'auth',pid,key:'legacy-key-12345678901234567890',name:'Legacy',cls:'ranger',lv:9}));await started;
 const registration=core.message(c,JSON.stringify({t:'account_register',username:'race-account',password:'password123'}));release();await Promise.all([auth,registration]);
 assert.equal(c.pid,pid);assert.equal(messages.find(m=>m.t==='account_ok').pid,pid);
 await core.message(c,JSON.stringify({t:'auth',pid,key:'legacy-key-12345678901234567890'}));assert.equal(c.pid,pid);assert.equal(messages.at(-1).why,'account_login_required');
});
test('choosing guest after a revoked session logs out and authenticates before entering the game',async()=>{
 const f=fixture({ashfall_session:'a'.repeat(64)});f.socket.receive({t:'kicked'});const guest=f.net.enterGuest();const logout=f.socket.sent.at(-1);assert.equal(logout.t,'account_logout');
 f.socket.receive({t:'account_logged_out',request:logout.request});await Promise.resolve();await Promise.resolve();assert.equal(f.socket.sent.at(-1).t,'auth');assert.equal(f.net.signedOut,false);assert.equal(f.net.authed,false);
 f.socket.receive({t:'me'});await guest;assert.equal(f.net.authed,true);
});

test('lost initial authentication reply retries instead of keeping authPending forever',async()=>{
 const f=fixture();assert.equal(f.socket.sent.filter(m=>m.t==='auth').length,1);f.advance(6000);for(const tick of f.timers)tick();assert.equal(f.socket.sent.filter(m=>m.t==='auth').length,2);f.socket.receive({t:'me'});await f.net.enterGuest();assert.equal(f.net.authed,true);
});
test('guest auth timeout allows the next click to send a fresh authentication request',async()=>{
 const f=fixture(),failed=assert.rejects(f.net.enterGuest(),/auth_timeout/);f.timeouts.at(-1)();await failed;assert.equal(f.net.authPending,false);const next=f.net.enterGuest();assert.equal(f.socket.sent.filter(m=>m.t==='auth').length,2);f.socket.receive({t:'me'});await next;assert.equal(f.net.authed,true);
});
