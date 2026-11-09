import assert from 'node:assert/strict';
import {GameClient} from './transport.mjs';
import {createHeadless} from '../server/headless.mjs';
const url=process.env.ASHFALL_WS_URL||'ws://127.0.0.1:8788/ws',clients=[];
try{
 const G=createHeadless();
 for(let i=0;i<2;i++){const c=await new GameClient(url).connect();clients.push(c);assert.equal((await c.wait(m=>m.t==='hi')).features.onlineAuthority,2);await c.auth('Worker'+i);const request='account-'+i;c.send({t:'account_register',request,username:'worker-'+Date.now().toString(36)+'-'+i,password:'Worker-password-123'});await c.wait(m=>m.t==='account_ok'&&m.request===request);const legacy=G.S.newSave('Worker'+i,'guardian');legacy.lvl=5;legacy.gold=10000;await c.enter({kind:'town'},c.characterId,legacy);await c.command('buy',[0,1]);assert.equal(c.character.save.gold,9960);}
 for(const mode of [{kind:'farm',id:'meadow'},{kind:'dungeon',id:'armory',floor:1},{kind:'wbarena'},{kind:'pvp',id:'tdm',map:0,size:1}]){for(const c of clients)await c.enter(mode,c.characterId);await Promise.all(clients.map(c=>c.condition(()=>[...c.units.values()].filter(u=>u.pid).length===2)));console.log('PASS Worker:',mode.kind);}
 for(let i=0;i<2;i++){const c=clients[i];c.send({t:'g_create',name:'WG'+Date.now()+i,tag:crypto.randomUUID().replaceAll('-','').slice(0,4)});await c.wait(m=>m.t==='g_info'&&m.guild);await c.enter({kind:'siege',size:1},c.characterId);}
 await Promise.all(clients.map(c=>c.condition(()=>[...c.units.values()].filter(u=>u.pid).length===2)));
 assert.notEqual([...clients[0].units.values()].find(u=>u.pid===clients[0].ready.playerId).team,[...clients[1].units.values()].find(u=>u.pid===clients[1].ready.playerId).team);
 console.log('PASS Worker: real guild siege, password account, migration and durable purchase');
 for(const c of clients)assert.equal(c.messages.filter(m=>m.t==='online_error').length,0);
}finally{for(const c of clients)c.close();}
