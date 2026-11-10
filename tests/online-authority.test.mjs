import test from 'node:test';
import assert from 'node:assert/strict';
import {createOnlineService} from '../server/online-service.mjs';
import {createWorldRuntime} from '../server/world-runtime.mjs';
import {createHeadless} from '../server/headless.mjs';
import {executeEconomy} from '../server/economy.mjs';
import {documents} from '../server/durable-docs.mjs';
function fixture(existing,options={}){const db=existing||new Map(),out=new Map();let clock=1000;
const storage={get:async k=>structuredClone(db.get(k)??null),put:async(k,v)=>{if(v===null)db.delete(k);else db.set(k,structuredClone(v));},transaction:async fn=>{const writes=new Map(),tx={get:async k=>structuredClone(writes.has(k)?writes.get(k):db.get(k)??null),put:async(k,v)=>writes.set(k,structuredClone(v))};const r=await fn(tx);for(const[k,v]of writes)if(v===null)db.delete(k);else db.set(k,v);return r;}};
const service=createOnlineService({storage,...options,send:(c,m)=>out.get(c)?.push(structuredClone(m)),now:()=>clock});
const client=pid=>{const c={pid,rooms:new Map()};out.set(c,[]);if(pid)db.set('p:'+pid,{name:pid,cls:'blademaster',lv:1,guild:null});return c;};
const send=(c,m)=>service.message(c,m),last=(c,t)=>out.get(c).filter(m=>m.t===t).at(-1);
const enter=(c,mode={kind:'town'},character='character-1')=>send(c,{t:'online_enter',server:'s1',mode,character,request:'request-1'});
return {db,storage,service,client,send,last,out,enter,async tick(n=1){for(let i=0;i<n;i++){clock+=100;await service.tick();}}};}

test('all six world modes initialize and advance using server rules',()=>{for(const mode of [{kind:'town'},{kind:'farm',id:'meadow'},{kind:'dungeon',id:'armory',floor:1},{kind:'wbarena'},{kind:'pvp',id:'tdm',map:0,size:1},{kind:'siege',size:1}]){const w=createWorldRuntime(mode);const r={id:'account:character-1',save:w.G.S.newSave('A','blademaster')};w.enter(r,{id:'guild-a'});for(let i=0;i<10;i++)w.tick();assert.equal(w.snapshot().kind,mode.kind);assert.ok(w.snapshot().units.some(u=>u.pid===r.id));}});

test('authoritative inventory survives disconnect and a new service; later client snapshots are ignored',async()=>{const f=fixture(),c=f.client('account-a');await f.enter(c);assert.ok(f.last(c,'online_ready'));const s=f.service.sessions.get(c);s.record.save.gold=4444;s.record.save.inv.push({uid:'owned-item',kind:'gem',tier:1,name:'owned'});await f.service.flush();await f.service.leave(c);
 const g=fixture(f.db),d=g.client('account-a');await g.send(d,{t:'online_enter',server:'s1',mode:{kind:'town'},character:'character-1',legacy:{gold:1e12,cls:'blademaster',name:'forged',inv:[]}});const record=g.service.sessions.get(d).record;assert.equal(record.save.gold,4444);assert.equal(record.save.inv[0].uid,'owned-item');assert.equal(record.save.name,'account-a');});

test('purchase is server priced, revision checked and idempotent',async()=>{const f=fixture(),c=f.client('account-a');await f.enter(c);const s=f.service.sessions.get(c),before=s.record.save.gold;const m={t:'online_command',id:'purchase-1',revision:s.record.revision,command:'buy',args:[0,2]};await f.send(c,m);assert.equal(s.record.save.gold,before-80);await f.send(c,m);assert.equal(s.record.save.gold,before-80);await f.send(c,{...m,id:'purchase-stale'});assert.equal(f.last(c,'online_error').error,'stale_character');});

test('forged item objects and negative purchases cannot mint currency or equipment',()=>{const G=createHeadless(),r={save:G.S.newSave('A','blademaster')};G.S.save=r.save;G.W.player=G.S.makePlayer(0,0);assert.throws(()=>executeEconomy(G,r,'equip',[{$item:'forged',main:{s:'atk',v:1e12}}]),/item_not_owned/);assert.throws(()=>executeEconomy(G,r,'buy',[0,-10]),/invalid_amount/);assert.equal(r.save.gold,3000);});

test('trade requires both locks and both confirmations, commits both players atomically, and cannot repeat',async()=>{const f=fixture(),a=f.client('account-a'),b=f.client('account-b');await f.enter(a);await f.enter(b);const sa=f.service.sessions.get(a),sb=f.service.sessions.get(b);sa.record.save.inv=[{uid:'sword-a',kind:'gear',name:'Sword A',tier:1}];sb.record.save.inv=[{uid:'gem-b',kind:'gem',name:'Gem B',tier:1}];await f.service.flush();
await f.send(a,{t:'online_trade_request',target:sb.record.id});let t=f.last(a,'online_trade').trade;await f.send(b,{t:'online_trade_accept',trade:t.id});t=f.last(a,'online_trade').trade;
await f.send(a,{t:'online_trade_offer',trade:t.id,version:t.version,items:['sword-a'],gold:100});t=f.last(a,'online_trade').trade;
await f.send(b,{t:'online_trade_offer',trade:t.id,version:t.version,items:['gem-b'],gold:0});t=f.last(a,'online_trade').trade;
for(const c of [a,b])await f.send(c,{t:'online_trade_lock',trade:t.id,version:t.version});await f.send(a,{t:'online_trade_confirm',trade:t.id,version:t.version});assert.equal(sa.record.save.inv[0].uid,'sword-a');await f.send(b,{t:'online_trade_confirm',trade:t.id,version:t.version});assert.equal(sa.record.save.inv[0].uid,'gem-b');assert.equal(sb.record.save.inv[0].uid,'sword-a');assert.equal(sa.record.save.gold,2900);assert.equal(sb.record.save.gold,3100);await f.send(b,{t:'online_trade_confirm',trade:t.id,version:t.version});assert.equal(sb.record.save.gold,3100);
const savedA=await f.service.characters.docs.read(f.service.characters.key(sa.record.id)),savedB=await f.service.characters.docs.read(f.service.characters.key(sb.record.id));assert.equal(savedA.save.inv[0].uid,'gem-b');assert.equal(savedB.save.gold,3100);});

test('PvP participants occupy opposing teams and share objective state',()=>{const w=createWorldRuntime({kind:'pvp',id:'tdm',map:0,size:1});const a={id:'a:character-1',save:w.G.S.newSave('A','blademaster')},b={id:'b:character-1',save:w.G.S.newSave('B','ranger')};const ua=w.enter(a),ub=w.enter(b);assert.notEqual(ua.team,ub.team);w.tick();assert.equal(w.snapshot().mode.waiting,false);w.G.W.mode.finish(1);assert.equal(w.snapshot().mode.winner,1);assert.equal(b.save.pvp.wins,1);});

test('world checkpoint restores monster HP, shared loot and revision after a restart',()=>{const w=createWorldRuntime({kind:'farm',id:'meadow'}),r={id:'a:character-1',save:w.G.S.newSave('A','blademaster')};w.enter(r);const mob=w.G.W.units.find(u=>u.kind==='mob');mob.hp=7;w.G.W.loots.push({id:'persisted-drop',x:10,y:10,item:{kind:'stone',tier:1},tier:1,created:0});w.tick();const cp=w.checkpoint(),restored=createWorldRuntime(cp.desc,{checkpoint:cp});assert.equal(restored.G.W.units.find(u=>u.id===mob.id).hp,mob.hp);assert.equal(restored.snapshot().loots[0].id,'persisted-drop');assert.equal(restored.snapshot().revision,cp.revision);});

test('account password login and session work from a different connection',async()=>{const f=fixture(),a=f.client(null),b=f.client(null);await f.send(a,{t:'account_register',username:'online-test',password:'correct-password',request:'register'});const registered=f.last(a,'account_ok');assert.ok(registered?.token);await f.send(b,{t:'account_login',username:'online-test',password:'wrong-password'});assert.equal(f.last(b,'online_error').error,'invalid_credentials');await f.send(b,{t:'account_login',username:'online-test',password:'correct-password'});assert.equal(f.last(b,'account_ok').pid,registered.pid);const c=f.client(null);await f.send(c,{t:'account_resume',token:f.last(b,'account_ok').token});assert.equal(f.last(c,'account_ok').pid,registered.pid);const old=f.client(null);await f.send(old,{t:'account_resume',token:registered.token});assert.equal(f.last(old,'online_error').error,'session_expired');});

test('large documents are chunked and rolled back if their transaction fails',async()=>{const f=fixture(),docs=documents(f.storage),data={text:'ไทย'.repeat(50000)};await docs.commit([['large',data]]);assert.deepEqual(await docs.read('large'),data);for(const value of f.db.values())assert.ok(Buffer.byteLength(JSON.stringify(value))<128*1024);const original=f.storage.transaction;f.storage.transaction=async()=>{throw new Error('disk unavailable');};await assert.rejects(docs.commit([['large',{text:'bad'}]]));f.storage.transaction=original;assert.deepEqual(await docs.read('large'),data);});


test('authorized one-time migration preserves level, items and currency and cannot overwrite later',async()=>{
 const f=fixture(null,{allowLegacyImport:true}),c=f.client('legacy-account'),legacy=f.service.characters.rules.S.newSave('Original Hero','ranger');legacy.lvl=87;legacy.gold=98234;legacy.inv=[{uid:'legacy-sword',kind:'gear',slot:'weapon',name:'Original Sword',tier:3,main:{s:'atk',v:100},subs:[],sockets:[]}];
 await f.send(c,{t:'online_enter',server:'s1',mode:{kind:'town'},character:'legacy-character',legacy});
 const r=f.service.sessions.get(c).record;assert.equal(r.save.lvl,87);assert.equal(r.save.gold,98234);assert.equal(r.save.inv[0].uid,'legacy-sword');assert.equal(r.legacyImported,true);
 await f.service.leave(c);await f.send(c,{t:'online_enter',server:'s1',mode:{kind:'town'},character:'legacy-character',legacy:{...legacy,lvl:250,gold:1e12}});assert.equal(r.save.lvl,87);assert.equal(r.save.gold,98234);
 assert.equal((await f.service.characters.docs.read('legacy-archive:legacy-account:legacy-character')).gold,98234);
});

test('a changed trade offer invalidates every lock and confirmation',async()=>{
 const f=fixture(),a=f.client('a-account'),b=f.client('b-account');await f.enter(a);await f.enter(b);const bId=f.service.sessions.get(b).record.id;
 await f.send(a,{t:'online_trade_request',target:bId});let t=f.last(a,'online_trade').trade;await f.send(b,{t:'online_trade_accept',trade:t.id});t=f.last(a,'online_trade').trade;
 for(const c of[a,b])await f.send(c,{t:'online_trade_lock',trade:t.id,version:t.version});await f.send(a,{t:'online_trade_confirm',trade:t.id,version:t.version});
 await f.send(b,{t:'online_trade_offer',trade:t.id,version:t.version,items:[],gold:1});const updated=f.last(a,'online_trade').trade;assert.deepEqual(updated.locked,[false,false]);assert.deepEqual(updated.confirmed,[false,false]);assert.ok(updated.version>t.version);
 await f.service.leave(a);assert.equal(f.service.trades.size,0);
});

test('real guilds share teams, separate matches and durable win results',async()=>{
 const f=fixture(),a=f.client('guild-a-account'),b=f.client('guild-b-account'),c=f.client('guild-c-account');
 for(const [client,id]of[[a,'ga'],[b,'gb'],[c,'gc']]){f.db.get('p:'+client.pid).guild=id;f.db.set('g:'+id,{id,name:id,tag:id,members:[{pid:client.pid}],rating:1000,wins:0,losses:0});}
 await f.enter(a,{kind:'siege',size:1});await f.enter(b,{kind:'siege',size:1});const sa=f.service.sessions.get(a),sb=f.service.sessions.get(b);assert.equal(sa.world,sb.world);assert.notEqual(sa.world.sim.members.get(sa.record.id).unit.team,sa.world.sim.members.get(sb.record.id).unit.team);
 await f.enter(c,{kind:'siege',size:1});assert.notEqual(f.service.sessions.get(c).world,sa.world);
 sa.world.sim.G.W.mode.endWar(0);await f.service.flush();assert.equal(f.db.get('g:ga').wins,1);assert.equal(f.db.get('g:gb').losses,1);assert.ok(sa.record.save.war>0);
});

test('world boss awards every participant from a shared server damage ranking',()=>{
 const w=createWorldRuntime({kind:'wbarena'});for(const id of['a','b'])w.enter({id:id+':character-1',save:w.G.S.newSave(id,'ranger')});
 w.G.W.mode.spawnBoss(w.G.D.WORLD_BOSSES[0]);const boss=w.G.W.mode.boss,a=w.members.get('a:character-1').unit,b=w.members.get('b:character-1').unit;boss.wbDmg=new Map([[a,200],[b,100]]);boss.hp=0;w.G.E.kill(boss,a);
 assert.ok(w.members.get(a.pid).record.save.inv.length>0);assert.ok(w.members.get(b.pid).record.save.inv.length>0);assert.ok(w.members.get(a.pid).record.save.honor>w.members.get(b.pid).record.save.honor);
});


test('public worlds allocate another channel at the configured player cap',async()=>{
 const f=fixture(null,{playerCap:2}),a=f.client('cap-a'),b=f.client('cap-b'),c=f.client('cap-c');await f.enter(a,{kind:'farm',id:'meadow'});await f.enter(b,{kind:'farm',id:'meadow'});await f.enter(c,{kind:'farm',id:'meadow'});
 assert.equal(f.service.sessions.get(a).world,f.service.sessions.get(b).world);assert.notEqual(f.service.sessions.get(c).world,f.service.sessions.get(a).world);assert.equal(f.last(c,'online_ready').channel,2);
});

test('all gacha boxes consume server tickets and honor the existing pity guarantee',()=>{
 const G=createHeadless(),r={save:G.S.newSave('A','ranger')};G.S.save=r.save;G.W.player=G.S.makePlayer(0,0);r.save.gacha={tix:10,pity:{fashion:29}};
 const legendary=executeEconomy(G,r,'gacha',['fashion',1]);assert.ok(legendary.rolls[0].r.t>=9);assert.equal(r.save.gacha.pity.fashion,0);
 for(const type of['pet','cset','wings','mc'])assert.equal(executeEconomy(G,r,'gacha',[type,1]).rolls.length,1);assert.equal(r.save.gacha.tix,5);
});

test('deleting and restoring a character changes the durable account slot list',async()=>{
 const f=fixture(),c=f.client('delete-account');await f.enter(c);await f.send(c,{t:'online_character_delete',character:'character-1',request:'delete'});assert.equal((await f.service.characters.list(c.pid)).length,0);await f.enter(c);assert.equal(f.last(c,'online_error').error,'character_deleted');await f.send(c,{t:'online_character_restore',character:'character-1',request:'restore'});assert.equal((await f.service.characters.list(c.pid)).length,1);await f.enter(c);assert.ok(f.service.sessions.has(c));
});

test('registering a guest preserves the migrated character and prevents claiming its legacy ID in another account',async()=>{
 const f=fixture(null,{allowLegacyImport:true}),c=f.client('guest-account');const legacy=f.service.characters.rules.S.newSave('Original','guardian');legacy.lvl=33;legacy.gold=12345;
 await f.send(c,{t:'online_enter',character:'guest-character',mode:{kind:'town'},legacy});const id=f.service.sessions.get(c).record.id;
 await f.send(c,{t:'account_register',username:'guest-owner',password:'password-for-test'});
 assert.equal(c.pid,'guest-account');assert.equal(f.db.get('account-locked:guest-account'),true);
 await f.send(c,{t:'online_enter',character:'guest-character',mode:{kind:'town'}});assert.equal(f.service.sessions.get(c).record.id,id);assert.equal(f.service.sessions.get(c).record.save.lvl,33);
 const other=f.client('other-account');await f.send(other,{t:'online_enter',character:'guest-character',mode:{kind:'town'},legacy});assert.equal(f.last(other,'online_error').error,'legacy_already_migrated');assert.equal(f.service.sessions.has(other),false);
});

test('unified authority gives a contested drop to the first collector and keeps inventory private',async()=>{
 const f=fixture(),a=f.client('collector-a'),b=f.client('collector-b');await f.enter(a,{kind:'farm',id:'meadow'});await f.enter(b,{kind:'farm',id:'meadow'});
 const sa=f.service.sessions.get(a),sb=f.service.sessions.get(b),w=sa.world.sim,ua=w.members.get(sa.record.id).unit,ub=w.members.get(sb.record.id).unit;ub.x=ua.x;ub.y=ua.y;
 w.context(sa.record.id,()=>w.G.S.dropLoot(ua.x,ua.y,{uid:'contested-item',kind:'gem',name:'Private gem',tier:1}));const drop=w.snapshot().loots[0];
 await Promise.all([f.send(a,{t:'online_pickup',id:drop.id}),f.send(b,{t:'online_pickup',id:drop.id})]);
 assert.equal(sa.record.save.inv.filter(it=>it.uid==='contested-item').length,1);assert.equal(sb.record.save.inv.filter(it=>it.uid==='contested-item').length,0);assert.equal(w.snapshot().loots.length,0);
 for(const message of f.out.get(b).filter(m=>m.t==='online_character'))assert.ok(!message.save.inv.some(it=>it.uid==='contested-item'));
 const restarted=fixture(f.db),restored=restarted.client('collector-a');await restarted.enter(restored,{kind:'farm',id:'meadow'});assert.equal(restarted.service.sessions.get(restored).record.save.inv.filter(it=>it.uid==='contested-item').length,1);
});

test('NPC market buys the exact server offer once and ignores forged prices',()=>{
 const G=createHeadless(),r={save:G.S.newSave('Shopper','guardian')};G.S.save=r.save;G.W.player=G.S.makePlayer(0,0);r.save.gold=1000000;
 executeEconomy(G,r,'marketRefresh');const listing=structuredClone(r.save._onlineMarket.items[0]),gold=r.save.gold;
 executeEconomy(G,r,'marketBuy',[listing.uid,1]);assert.equal(r.save.gold,gold-listing.price);const purchased=r.save.inv.find(it=>it.uid===listing.uid);assert.ok(purchased);delete listing.price;delete listing.seller;assert.deepEqual(purchased,listing);
 assert.throws(()=>executeEconomy(G,r,'marketBuy',[listing.uid]),/listing_not_found/);
});

test('failed trade storage rolls both inventories and balances back before retry',async()=>{
 const f=fixture(),a=f.client('rollback-a'),b=f.client('rollback-b');await f.enter(a);await f.enter(b);const sa=f.service.sessions.get(a),sb=f.service.sessions.get(b);
 sa.record.save.inv=[{uid:'rollback-item',kind:'gem',tier:1,name:'Gem'}];await f.service.flush();
 await f.send(a,{t:'online_trade_request',target:sb.record.id});let t=f.last(a,'online_trade').trade;await f.send(b,{t:'online_trade_accept',trade:t.id});t=f.last(a,'online_trade').trade;
 await f.send(a,{t:'online_trade_offer',trade:t.id,version:t.version,items:['rollback-item'],gold:100});t=f.last(a,'online_trade').trade;
 for(const c of[a,b])await f.send(c,{t:'online_trade_lock',trade:t.id,version:t.version});await f.send(a,{t:'online_trade_confirm',trade:t.id,version:t.version});
 const transaction=f.storage.transaction;f.storage.transaction=async()=>{throw new Error('storage unavailable');};await f.send(b,{t:'online_trade_confirm',trade:t.id,version:t.version});f.storage.transaction=transaction;
 assert.equal(sa.record.save.inv[0].uid,'rollback-item');assert.equal(sb.record.save.inv.length,0);assert.equal(sa.record.save.gold,3000);assert.equal(sb.record.save.gold,3000);
 for(const c of[a,b])await f.send(c,{t:'online_trade_confirm',trade:t.id,version:t.version});assert.equal(sb.record.save.inv[0].uid,'rollback-item');assert.equal(sa.record.save.gold,2900);assert.equal(sb.record.save.gold,3100);
});

test('guild castle skin purchase requires an officer and persists the shared guild with its cost',async()=>{
 const f=fixture(),c=f.client('skin-owner');f.db.get('p:'+c.pid).guild='skin-guild';f.db.set('g:skin-guild',{id:'skin-guild',leader:c.pid,name:'Guild',members:[{pid:c.pid,role:'leader'}]});await f.enter(c);const r=f.service.sessions.get(c).record;r.save.war=1000;
 await f.send(c,{t:'online_command',id:'skin-command',revision:r.revision,command:'buyFrom',args:['war',3]});assert.equal(r.save.war,200);assert.match(f.db.get('g:skin-guild').castleSkin,/^#[a-f0-9]{6}$/i);
});

test('password-linked guest keys cannot authenticate through the legacy social protocol',async()=>{
 const {createCore}=await import('../server/core.mjs'),f=fixture(),messages=[],core=createCore({storage:f.storage,hash:async key=>key});const c=core.connect({send:raw=>messages.push(JSON.parse(raw)),close(){}}),pid='0123456789abcdef',key='guest-key-for-auth-test-123456789';
 await core.message(c,JSON.stringify({t:'auth',pid,key,name:'Guest',cls:'guardian',lv:1}));assert.equal(c.pid,pid);
 await core.message(c,JSON.stringify({t:'account_register',username:'locked-guest',password:'password-for-test'}));assert.equal(messages.find(m=>m.t==='account_ok').pid,pid);
 const rejected=[],other=core.connect({send:raw=>rejected.push(JSON.parse(raw)),close(){}});await core.message(other,JSON.stringify({t:'auth',pid,key,name:'Guest',cls:'guardian',lv:1}));assert.equal(other.pid,null);assert.equal(rejected.at(-1).why,'account_login_required');
 await core.disconnect(c);await core.disconnect(other);
});

test('failed unified pickup restores the drop and live players, and restart never reuses loot IDs',async()=>{
 const f=fixture(),c=f.client('pickup-rollback');await f.enter(c,{kind:'farm',id:'meadow'});const session=f.service.sessions.get(c),w=session.world.sim,u=w.members.get(session.record.id).unit;
 w.context(session.record.id,()=>w.G.S.dropLoot(u.x,u.y,{uid:'retry-drop-item',kind:'gem',name:'Gem',tier:1}));const drop=w.snapshot().loots[0];
 const transaction=f.storage.transaction;f.storage.transaction=async()=>{throw new Error('disk unavailable');};await f.send(c,{t:'online_pickup',id:drop.id});f.storage.transaction=transaction;
 assert.equal(w.snapshot().loots.length,1);assert.ok(w.snapshot().units.some(unit=>unit.pid===session.record.id));assert.equal(session.record.save.inv.length,0);
 await f.send(c,{t:'online_pickup',id:drop.id});assert.equal(session.record.save.inv[0].uid,'retry-drop-item');assert.equal(w.snapshot().loots.length,0);
 const cp=w.checkpoint(),restored=createWorldRuntime(cp.desc,{checkpoint:cp});restored.enter(session.record);restored.context(session.record.id,()=>restored.G.S.dropLoot(u.x,u.y,{uid:'next-drop-item',kind:'gem',name:'Gem',tier:1}));assert.notEqual(restored.snapshot().loots[0].id,drop.id);
});

test('targeted casts reject remote targets before consuming resources or dealing damage',()=>{
 const w=createWorldRuntime({kind:'farm',id:'meadow'}),G=w.G,cls=G.D.CLASSES.find(c=>c.skills.some(s=>s.arch==='chain')),slot=cls.skills.findIndex(s=>s.arch==='chain'),record={id:'caster:character-1',save:G.S.newSave('Caster',cls.id)};record.save.lvl=250;const u=w.enter(record),mob=G.W.units.find(unit=>unit.kind==='mob');mob.x=u.x+25;mob.y=u.y;const hp=mob.hp,res=u.res;
 assert.equal(w.action(record.id,{action:'cast',slot,target:mob.id,x:mob.x,y:mob.y}),false);assert.equal(mob.hp,hp);assert.equal(u.res,res);assert.equal(u.cds[slot],0);
});

test('server GM requires an authenticated explicit unlock, persists grants once, and audits them',async()=>{
 const f=fixture(),a=f.client('gm-owner'),b=f.client('gm-viewer');await f.enter(a);await f.enter(b);const s=f.service.sessions.get(a);
 const command={t:'online_gm',id:'grant-test',command:'cur',input:{dataset:{k:'gold'},values:{gmamt:500}}};
 await f.send(a,command);assert.equal(f.last(a,'online_error').error,'gm_required');assert.equal(s.record.save.gold,3000);
 await f.send(a,{t:'online_gm_unlock',code:'wrong-code'});assert.equal(f.last(a,'online_error').error,'invalid_gm_code');
 await f.send(a,{t:'online_gm_unlock',code:'gmadmin2008'});await f.send(a,command);await f.send(a,command);assert.equal(s.record.save.gold,3500);
 assert.equal((await f.service.characters.docs.read('gm-audit:v1')).length,1);assert.equal(f.service.sessions.get(b).record.save.gold,3000);
 const saved=fixture(f.db),c=saved.client('gm-owner');await saved.enter(c);assert.equal(saved.service.sessions.get(c).record.save.gold,3500);await saved.send(c,{...command,id:'another'});assert.equal(saved.last(c,'online_error').error,'gm_required');
});

test('GM spawns, flags and world edits affect the shared simulation and survive durable world restore',async()=>{
 const f=fixture(),a=f.client('gm-world-owner'),b=f.client('gm-world-viewer');await f.enter(a,{kind:'farm',id:'meadow'});await f.enter(b,{kind:'farm',id:'meadow'});await f.send(a,{t:'online_gm_unlock',code:'gmadmin2008'});const s=f.service.sessions.get(a),w=s.world.sim,before=w.snapshot().units.filter(u=>u.kind==='mob').length;
 await f.send(a,{t:'online_gm',id:'spawn-1',command:'spawnMonster',input:{dataset:{i:'0'},values:{gmxlv:'10',gmxn:'2',gmxdm:true}}});assert.equal(w.snapshot().units.filter(u=>u.kind==='mob').length,before+2);
 await f.send(a,{t:'online_gm',id:'freeze-1',command:'mfreeze'});assert.equal(w.G.W.gm.freeze,true);await f.tick(2);assert.ok(f.out.get(b).filter(m=>m.t==='online_state').some(m=>m.state.units.some(u=>u.lvl===10)));
 await f.send(a,{t:'online_gm',id:'god-1',command:'flag',input:{dataset:{k:'god'},enabled:true}});const u=w.members.get(s.record.id).unit,mob=w.G.W.units.find(u=>u.kind==='mob');const hp=u.hp;w.G.E.hit(mob,u,100,{elem:'phys',cc:{}});assert.equal(u.hp,hp);
 const cp=w.checkpoint(),restored=createWorldRuntime(cp.desc,{checkpoint:cp});assert.equal(restored.G.W.gm.freeze,true);assert.ok(restored.G.W.units.some(u=>u._gmDummy));
 await f.send(a,{t:'online_gm_lock'});assert.equal(s.record.gmFlags.god,undefined);await f.send(a,{t:'online_gm',id:'denied-2',command:'mclear'});assert.equal(f.last(a,'online_error').error,'gm_required');
});

test('failed GM storage rolls back both shared world changes and item grants without writing an audit receipt',async()=>{
 const f=fixture(),a=f.client('gm-rollback-owner');await f.enter(a,{kind:'farm',id:'meadow'});await f.send(a,{t:'online_gm_unlock',code:'gmadmin2008'});const s=f.service.sessions.get(a),w=s.world.sim,count=w.snapshot().loots.length;
 const transaction=f.storage.transaction;f.storage.transaction=async()=>{throw new Error('unavailable');};await f.send(a,{t:'online_gm',id:'failed-gm',command:'dropground'});f.storage.transaction=transaction;
 assert.equal(w.snapshot().loots.length,count);assert.ok(w.snapshot().units.some(u=>u.pid===s.record.id));assert.equal(await f.service.characters.docs.read('gm-audit:v1'),null);
 await f.send(a,{t:'online_gm',id:'failed-gm',command:'dropground'});assert.equal(w.snapshot().loots.length,count+10);assert.equal((await f.service.characters.docs.read('gm-audit:v1')).length,1);
});

test('GM quick kit uses shared game item rules and the resulting equipment persists',async()=>{
 const f=fixture(),a=f.client('gm-kit-owner');await f.enter(a);await f.send(a,{t:'online_gm_unlock',code:'gmadmin2008'});const s=f.service.sessions.get(a);
 await f.send(a,{t:'online_gm',id:'kit-once',command:'kit2'});assert.ok(f.last(a,'online_gm_result'));assert.equal(s.record.save.eq.weapon.tier,10);assert.equal(s.record.save.eq.weapon.lv,10);assert.ok(s.world.sim.members.get(s.record.id).unit.st.atk>0);
 const saved=await f.service.characters.docs.read(f.service.characters.key(s.record.id));assert.equal(saved.save.eq.weapon.uid,s.record.save.eq.weapon.uid);
});

test('GM skill edits broadcast shared rules to every participant and persist through checkpoints',async()=>{
 const f=fixture(),a=f.client('gm-rule-owner'),b=f.client('gm-rule-viewer');await f.enter(a);await f.enter(b);await f.send(a,{t:'online_gm_unlock',code:'gmadmin2008'});const s=f.service.sessions.get(a),w=s.world.sim;
 await f.send(a,{t:'online_gm',id:'rules-1',command:'skset',input:{panel:{gc:'guardian',gs:0},values:{gsp:5,gsc:2,gsr:2,gsR:3,gsn:1,gsd:1,gsv:1,gscc:''}}});await f.tick();
 assert.equal(f.last(b,'online_rules').rules['guardian:0'].p,5);const cp=w.checkpoint(),restored=createWorldRuntime(cp.desc,{checkpoint:cp});assert.equal(restored.G.D.CLS.guardian.skills[0].p,5);
});

test('original trade controls can unlock and request an offer without inventing the other player inventory',async()=>{
 const f=fixture(),a=f.client('original-trade-a'),b=f.client('original-trade-b');await f.enter(a);await f.enter(b);const sb=f.service.sessions.get(b);await f.send(a,{t:'online_trade_request',target:sb.record.id});let t=f.last(a,'online_trade').trade;await f.send(b,{t:'online_trade_accept',trade:t.id});t=f.last(a,'online_trade').trade;
 assert.equal(t.profiles[1].cls,sb.record.save.cls);assert.equal(t.offers[1].details.length,0);assert.equal(t.profiles[1].gold,undefined);assert.equal(t.profiles[1].inv,undefined);
 for(const c of[a,b])await f.send(c,{t:'online_trade_lock',trade:t.id,version:t.version});await f.send(a,{t:'online_trade_unlock',trade:t.id,version:t.version,request:'unlock-req'});t=f.last(a,'online_trade').trade;assert.deepEqual(t.locked,[false,false]);assert.deepEqual(t.confirmed,[false,false]);assert.equal(f.last(a,'online_trade_command_result').request,'unlock-req');
 await f.send(a,{t:'online_trade_suggest',trade:t.id,version:t.version,request:'suggest-req'});assert.match(f.last(b,'online_trade').trade.message,/เสนอไอเทมหรือทอง/);assert.deepEqual(f.last(a,'online_trade').trade.offers.map(o=>o.items),[[],[]]);
});

test('fashion offered from the original trade bag transfers once and worn fashion cannot be offered',async()=>{
 const f=fixture(),a=f.client('fashion-trade-a'),b=f.client('fashion-trade-b');await f.enter(a);await f.enter(b);const sa=f.service.sessions.get(a),sb=f.service.sessions.get(b),fashion={uid:'fashion-original',kind:'fashion',slot:'f_head',tier:3,name:'Original Hat'},worn={uid:'fashion-worn',kind:'fashion',slot:'f_back',tier:4,name:'Worn Cape'};sa.record.save.fashion.owned=[fashion,worn];sa.record.save.fashion.eq={f_back:{...worn}};await f.service.flush();
 await f.send(a,{t:'online_trade_request',target:sb.record.id});let t=f.last(a,'online_trade').trade;await f.send(b,{t:'online_trade_accept',trade:t.id});t=f.last(a,'online_trade').trade;
 await f.send(a,{t:'online_trade_offer',trade:t.id,version:t.version,items:[worn.uid],gold:0});assert.equal(f.last(a,'online_error').error,'item_not_tradable');
 await f.send(a,{t:'online_trade_offer',trade:t.id,version:t.version,items:[fashion.uid],gold:0});t=f.last(a,'online_trade').trade;assert.equal(f.last(b,'online_trade').trade.offers[0].details[0].uid,fashion.uid);
 for(const c of[a,b])await f.send(c,{t:'online_trade_lock',trade:t.id,version:t.version});for(const c of[a,b])await f.send(c,{t:'online_trade_confirm',trade:t.id,version:t.version});assert.ok(!sa.record.save.fashion.owned.some(it=>it.uid===fashion.uid));assert.equal(sb.record.save.fashion.owned.filter(it=>it.uid===fashion.uid).length,1);assert.ok(!sb.record.save.inv.some(it=>it.uid===fashion.uid));assert.ok(sa.record.save.fashion.owned.some(it=>it.uid===worn.uid));
});

test('original dungeon result window receives its server reward model and only that player collected loot',async()=>{
 const f=fixture(),a=f.client('result-window-a'),b=f.client('result-window-b');await f.enter(a,{kind:'dungeon',id:'armory',floor:1});await f.enter(b,{kind:'dungeon',id:'armory',floor:1});const sa=f.service.sessions.get(a),sb=f.service.sessions.get(b),w=sa.world.sim;
 for(const[session,uid]of[[sa,'result-loot-a'],[sb,'result-loot-b']]){const u=w.members.get(session.record.id).unit;w.G.W.loots.push({id:uid,x:u.x,y:u.y,item:{uid,kind:'gem',tier:1,name:uid},created:0});assert.equal(w.take(session.record.id,uid),true);}
 w.G.W.mode.endRun('exit');
 for(const[c,uid,foreign]of[[a,'result-loot-a','result-loot-b'],[b,'result-loot-b','result-loot-a']]){const message=f.out.get(c).filter(m=>m.t==='online_event'&&m.event.t==='dungeon_result').at(-1);assert.equal(message.room,sa.world.key);const result=message.event;assert.equal(result.result.F,1);assert.ok(Array.isArray(result.result.dist));assert.ok(Array.isArray(result.result.items));assert.deepEqual(result.run.got.map(it=>it.uid),[uid]);assert.ok(!JSON.stringify(result).includes(foreign));assert.equal(result.run.got[0]._collector,undefined);}
});

test('original GM class-set and world-boss buttons grant durable private items through authority',async()=>{
 const f=fixture(),a=f.client('addon-gm'),b=f.client('addon-viewer');await f.enter(a);await f.enter(b);const s=f.service.sessions.get(a),other=f.service.sessions.get(b),D=s.world.sim.G.D;
 const run=async(command,input={},id=crypto.randomUUID())=>{await f.send(a,{t:'online_gm',id,command,input});assert.equal(f.last(a,'online_error')?.id===id?f.last(a,'online_error').error:f.last(a,'online_gm_result')?.result.ok,true,command);};
 await f.send(a,{t:'online_gm',id:'denied-addon',command:'gmcs-full',input:{panel:{gcs:'chronomancer',gt:10}}});assert.equal(f.last(a,'online_error').error,'gm_required');await f.send(a,{t:'online_gm_unlock',code:'gmadmin2008'});
 await run('gmcs-full',{panel:{gcs:'chronomancer',gt:10}},'full-once');assert.equal(s.record.save.inv.filter(it=>it.cset==='chronomancer').length,6);await run('gmcs-full',{panel:{gcs:'chronomancer',gt:10}},'full-once');assert.equal(s.record.save.inv.length,6);
 await run('gmcs-wear',{panel:{gcs:'chronomancer',gt:10}});assert.equal(s.record.save.cls,'chronomancer');assert.equal(Object.values(s.record.save.eq).filter(it=>it?.cset==='chronomancer').length,6);
 const tickets=s.record.save.gacha?.tix||0;await run('gmcs-tix');assert.equal(s.record.save.gacha.tix,tickets+50);await run('gmcs-pets');assert.deepEqual(s.record.save.pets,D.PETS.map(p=>p.k));
 await run('clearinv');await run('gmcs-all',{panel:{gt:10}});assert.equal(s.record.save.inv.length,D.CLASSES.length*6);assert.equal(new Set(s.record.save.inv.map(it=>it.cset)).size,D.CLASSES.length);
 await run('clearinv');await run('gmwb-give',{dataset:{b:D.WB_ITEMS[0].boss,p:D.WB_ITEMS[0].piece},panel:{gt:9}});assert.equal(s.record.save.inv[0].wb,D.WB_ITEMS[0].boss);await run('gmwb-all',{panel:{gt:10}});assert.equal(s.record.save.inv.length,D.WB_ITEMS.length+1);assert.equal(other.record.save.inv.length,0);
 const saved=await f.service.characters.docs.read(f.service.characters.key(s.record.id));assert.equal(saved.save.cls,'chronomancer');assert.equal(saved.save.inv.length,D.WB_ITEMS.length+1);
});
