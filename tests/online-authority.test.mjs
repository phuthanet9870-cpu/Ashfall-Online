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
