import {createCharacters} from './characters.mjs';
import {createWorldRuntime,normalizeMode} from './world-runtime.mjs';
import {executeEconomy,allItems} from './economy.mjs';
import {clone} from './headless.mjs';
import {executeGM} from './gm.mjs';

const bytes=n=>[...crypto.getRandomValues(new Uint8Array(n))].map(x=>x.toString(16).padStart(2,'0')).join('');
const passwordHash=async(password,salt)=>{const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const hash=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256);return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');};
const sha=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('');
export function createOnlineService({storage,send,now=Date.now,allowLegacyImport=false,playerCap=60,guildChanged=()=>{},identityChanged=()=>{},profileChanged=()=>{}}) {
  const chars=createCharacters(storage),worlds=new Map(),sessions=new Map(),trades=new Map(),dirty=new Set(),failedLogins=new Map(),guildResults=new Map(),savedTexts=new Map();let worldCatalog=null,lastSimulationMs=0,lastFlushMs=0;
  let broadcastAt=0,savedCatalogText='',retryStorageAt=0,storageFailures=0;const worldCheckpointMs=60000;let storageBlocked=false;let chain=Promise.resolve(),lastTick=now(),accumulator=0,lastFlush=0;
  const enqueue=fn=>{const p=chain.then(fn);chain=p.catch(e=>console.error('Online authority:',e.message));return p;};
  async function catalog(){if(!worldCatalog)worldCatalog=new Map((await chars.docs.read('world-catalog:v2')||[]).map(row=>[row.key,row]));return worldCatalog;}
  const notify=(pid,event)=>{for(const[c,s]of sessions)if(!pid||s.record.id===pid)send(c,{t:'online_event',room:s.world.key,event});};
  function characterMessage(c,record){send(c,{t:'online_character',character:record.character,revision:record.revision,save:record.save});}
  async function flush(force=false,additional=[],affected=null){
    if(!force&&now()-lastFlush<1000)return;
    if(!force&&!dirty.size&&!guildResults.size&&![...worlds.values()].some(w=>w.sim.size&&now()-(w.savedAt??0)>=worldCheckpointMs))return;
    const fingerprint=r=>JSON.stringify({save:r.save,commands:r.commands,gmFlags:r.gmFlags});
    const records=[...dirty].filter(r=>savedTexts.get(r.id)!==fingerprint(r));const extra=[...additional],updatedGuilds=[];
    const catalogText=worldCatalog?JSON.stringify([...worldCatalog.values()]):'';if(worldCatalog&&catalogText!==savedCatalogText)extra.push(['world-catalog:v2',[...worldCatalog.values()]]);
    for(const result of guildResults.values())for(let i=0;i<result.guilds.length;i++){const id=result.guilds[i],g=await storage.get('g:'+id);if(!g)continue;g.wins=(g.wins||0)+(i===result.winner?1:0);g.losses=(g.losses||0)+(i!==result.winner?1:0);g.rating=Math.max(0,(g.rating||1000)+(i===result.winner?20:-15));g.lvl ||= 1;g.xp=(g.xp||0)+(i===result.winner?800+(result.bonusXp||0):200);while(g.xp>=1000*g.lvl){g.xp-=1000*g.lvl;g.lvl++;}extra.push(['g:'+id,g,true]);updatedGuilds.push([id,g]);}
    const checkpointed=[];for(const[key,w]of worlds)if(force?(!affected||affected.has(key)):(w.sim.size&&now()-(w.savedAt??0)>=worldCheckpointMs)){extra.push(['world:v2:'+key,w.sim.checkpoint()]);checkpointed.push(w);}
    if(!records.length&&!extra.length){dirty.clear();lastFlush=now();return;}
    for(const r of records)r.revision++;
    const flushStart=performance.now();try{await chars.persist(records,extra);lastFlushMs=performance.now()-flushStart;for(const r of records)savedTexts.set(r.id,fingerprint(r));}catch(e){storageBlocked=true;retryStorageAt=now()+Math.min(60000,1000*2**Math.min(6,storageFailures++));for(const r of records)r.revision--;throw e;}
    for(const w of checkpointed)w.savedAt=now();savedCatalogText=catalogText;storageFailures=0;retryStorageAt=0;
    for(const r of records)profileChanged(r.account,r.save);for(const[id,g]of updatedGuilds)guildChanged(id,g);guildResults.clear();storageBlocked=false;dirty.clear();lastFlush=now();
    for(const[c,s]of sessions)if(records.includes(s.record))characterMessage(c,s.record);
  }
  function cancelTrade(id,reason='cancelled'){
    const t=trades.get(id);if(!t)return;trades.delete(id);for(const[c,s]of sessions)if(t.players.includes(s.record.id))send(c,{t:'online_trade',trade:{id,status:reason}});
  }
  async function leave(c){const s=sessions.get(c);if(!s)return;for(const[id,t]of trades)if(t.players.includes(s.record.id))cancelTrade(id,'left_world');s.world.sim.leave(s.record.id);s.world.idleAt=now();sessions.delete(c);dirty.add(s.record);await flush(true,[],new Set([s.world.key]));}
  const tradeItems=record=>{const equipped=new Set([...Object.values(record.save.eq||{}),...Object.values(record.save.fashion?.eq||{})].filter(Boolean).map(it=>it.uid));return record.save.inv.concat(record.save.fashion?.owned||[]).filter(it=>!equipped.has(it.uid));};
  function tradeView(t,pid){return {id:t.id,version:t.version,status:t.status,players:t.players,names:t.names,profiles:t.players.map(id=>{const r=sessionById(id)?.record;return {cls:r?.save.cls,lvl:r?.save.lvl};}),message:t.messages?.[t.players.indexOf(pid)],offers:t.offers.map((o,i)=>({...o,details:o.items.map(uid=>tradeItems(sessionById(t.players[i]).record).find(it=>it.uid===uid)).filter(Boolean)})),locked:t.locked,confirmed:t.confirmed,me:t.players.indexOf(pid)};}
  function publishTrade(t){for(const[c,s]of sessions)if(t.players.includes(s.record.id))send(c,{t:'online_trade',trade:tradeView(t,s.record.id)});}
  const sessionById=id=>[...sessions.values()].find(s=>s.record.id===id);
  function tradeValidate(t){
    const a=sessionById(t.players[0]),b=sessionById(t.players[1]);if(!a||!b||a.world!==b.world||a.world.sim.desc.kind!=='town')throw new Error('trade_not_together');
    const ua=a.world.sim.members.get(a.record.id)?.unit,ub=b.world.sim.members.get(b.record.id)?.unit;
    if(!ua||!ub||Math.hypot(ua.x-ub.x,ua.y-ub.y)>8)throw new Error('trade_too_far');
    for(let i=0;i<2;i++){
      const record=i?b.record:a.record,offer=t.offers[i];
      if(!Number.isSafeInteger(offer.gold)||offer.gold<0||offer.gold>record.save.gold)throw new Error('insufficient_gold');
      if(new Set(offer.items).size!==offer.items.length||offer.items.length>8)throw new Error('invalid_offer');
      for(const uid of offer.items){const item=tradeItems(record).find(it=>it.uid===uid);if(!item||item.lock||!chars.rules.S.isEquip(item)&&!['rune','gem','fpack','fashion'].includes(item.kind))throw new Error('item_not_tradable');}
      if(record.save.inv.length-offer.items.filter(uid=>record.save.inv.some(it=>it.uid===uid)).length+t.offers[1-i].items.filter(uid=>tradeItems((i?a:b).record).find(it=>it.uid===uid)?.kind!=='fashion').length>300)throw new Error('inventory_full');
    }return[a,b];
  }
  async function guildState(g,viewer){if(!g)return null;const members=[];for(const m of g.members||[]){if(m.pid===viewer)continue;const p=await storage.get('p:'+m.pid)||{};members.push({...m,name:p.name||m.name||m.pid,cls:chars.rules.D.CLS[p.cls]?p.cls:'guardian',lvl:p.lv||1});}return {...clone(g),oid:g.id,lvl:g.lvl||1,xp:g.xp||0,rating:g.rating||1000,wins:g.wins||0,losses:g.losses||0,history:g.history||[],declines:g.declines||{week:chars.rules.S.weekNo(),n:0},season:g.season||chars.rules.S.seasonNo(),members};}
  async function handle(c,m){
    if(m.t.startsWith('account_')){
      if(m.t==='account_logout'){await leave(c);if(c.sessionKey)await chars.docs.commit([['login-session:'+c.sessionKey,null]]);identityChanged(c,c.pid,null);c.pid=null;c.accountName=null;c.gmPID=null;send(c,{t:'account_logged_out',request:m.request});return;}
      let account,token;
      if(m.t==='account_resume'){
        if(typeof m.token!=='string'||m.token.length!==64)throw new Error('invalid_session');
        const session=await chars.docs.read('login-session:'+await sha(m.token));if(!session||session.expires<now())throw new Error('session_expired');account=await chars.docs.read('account:'+session.username);if(!account||session.version!==(account.sessionVersion||0))throw new Error('session_expired');token=m.token;
      }else{
        const username=String(m.username||'').trim().toLowerCase();
        if(!/^[\p{L}\p{N}_-]{3,32}$/u.test(username)||typeof m.password!=='string'||m.password.length<8||m.password.length>128)throw new Error('invalid_credentials_format');
        const failures=failedLogins.get(username)||{count:0,until:0};if(failures.count>=8&&failures.until>now())throw new Error('login_rate_limited');
        account=await chars.docs.read('account:'+username);
        if(m.t==='account_register'){
          if(account)throw new Error('account_exists');const guest=c.pid&&!c.accountName&&!await storage.get('account-locked:'+c.pid)?c.pid:null;account={id:guest||bytes(8),username,salt:bytes(16),created:now()};account.password=await passwordHash(m.password,account.salt);await chars.docs.commit([['account:'+username,account],['account-locked:'+account.id,true,true]]);
        }else if(m.t==='account_login'){
          if(!account||await passwordHash(m.password,account.salt)!==account.password){failedLogins.set(username,{count:failures.count+1,until:now()+300000});throw new Error('invalid_credentials');}
        }else throw new Error('invalid_auth_command');
        failedLogins.delete(username);token=bytes(32);account.sessionVersion=(account.sessionVersion||0)+1;await chars.docs.commit([['account:'+username,account],['login-session:'+await sha(token),{username,version:account.sessionVersion,expires:now()+30*86400000}]]);
      }
      if(!account)throw new Error('invalid_session');await leave(c);
      for(const[other,s]of sessions)if(other!==c&&s.record.account===account.id){await leave(other);send(other,{t:'kicked',why:'login_elsewhere'});other.pid=null;}
      identityChanged(c,c.pid,account.id);c.pid=account.id;c.accountName=account.username;c.sessionKey=await sha(token);
      // Social identity contains no password or login token.
      if(!await storage.get('p:'+c.pid))await storage.put('p:'+c.pid,{pid:c.pid,name:account.username,cls:'blademaster',lv:1,friends:[],inc:[],guild:null});
      send(c,{t:'account_ok',request:m.request,pid:account.id,username:account.username,token,characters:await chars.list(account.id)});send(c,{t:'me',pid:c.pid});return;
    }
    if(!c.pid)throw new Error('auth_required');
    if(m.t==='online_gm_unlock'){
      if(m.code!=='gmadmin2008')throw new Error('invalid_gm_code');c.gmPID=c.pid;send(c,{t:'online_gm_unlocked',request:m.request,gm:true});return;
    }
    if(m.t==='online_character_delete'||m.t==='online_character_restore'){
      if(!chars.validId(m.character))throw new Error('invalid_character');const id=c.pid+':'+m.character;
      let record=clone(chars.cache.get(id)||await chars.docs.read(chars.key(id)));if(!record)throw new Error('character_not_found');
      if(sessions.get(c)?.record.id===id){await leave(c);record=clone(chars.cache.get(id)||record);}
      const indexKey='character-index:'+c.pid,ids=await chars.docs.read(indexKey)||[];
      if(m.t==='online_character_delete'){record.deletedAt=now();record.revision++;await chars.docs.commit([[chars.key(id),record],[indexKey,ids.filter(x=>x!==m.character)],['character-trash:'+c.pid,m.character]]);}
      else {if(ids.length>=6&&!ids.includes(m.character))throw new Error('character_slot_limit');record.deletedAt=null;record.revision++;if(!ids.includes(m.character))ids.push(m.character);await chars.docs.commit([[chars.key(id),record],[indexKey,ids]]);}
      chars.cache.set(id,record);send(c,{t:'online_character_updated',request:m.request,characters:await chars.list(c.pid)});return;
    }
    if(m.t==='online_characters'){send(c,{t:'online_characters',characters:await chars.list(c.pid)});return;}
    if(m.t==='online_enter'){
      if(!chars.validId(m.character))throw new Error('invalid_character');
      const ids=await chars.docs.read('character-index:'+c.pid)||[];if(!ids.includes(m.character)&&ids.length>=6)throw new Error('character_slot_limit');
      const profile=await storage.get('p:'+c.pid)||{};
      let legacy=allowLegacyImport?m.legacy:null;
      // Preserve unverified old data separately; it is never an ongoing source of inventory truth.
      if(m.legacy&&!await chars.docs.read('legacy-archive:'+c.pid+':'+m.character))await chars.docs.commit([['legacy-archive:'+c.pid+':'+m.character,m.legacy]]);
      const record=await chars.open(c.pid,m.character,legacy,{...profile,name:String(m.legacy?.name||profile.name||'ผู้เล่น').slice(0,20),cls:chars.rules.D.CLS[m.legacy?.cls]?m.legacy.cls:profile.cls});await chars.register(record);
      await catalog();const desc=normalizeMode(m.mode,chars.rules.D),server=/^s[1-4]$/.test(m.server)?m.server:'s1';
      if(desc.kind==='dungeon'&&desc.floor>(record.save.dungeons[desc.id]?.cp||0)+1)throw new Error('checkpoint_locked');
      const guild=profile.guild?await storage.get('g:'+profile.guild):null;
      if(desc.kind==='siege'&&!guild)throw new Error('guild_required');
      if(desc.kind==='siege'){desc.pair=[];const target=m.mode.rival;if(target){const rival=await storage.get('g:'+target);if(!rival||target===guild.id)throw new Error('invalid_rival_guild');desc.pair=[guild.id,target].sort();}}
      record.save.guild=await guildState(guild,c.pid);
      let modeKey=JSON.stringify(desc),baseKey=server+':'+modeKey,key=baseKey,channel=1;
      if(['town','farm','wbarena'].includes(desc.kind)){const available=[...worlds.values()].find(w=>(w.baseKey||w.key)===baseKey&&(w.sim.members.has(record.id)||w.sim.size<playerCap));if(available){key=available.key;channel=available.channel||1;}else{while(worlds.get(key)?.sim.size>=playerCap){channel++;key=baseKey+':channel:'+channel;}}}
      if(desc.kind==='siege'){const candidates=[...worlds.values()].filter(w=>w.key.startsWith(server+':')&&w.sim.desc.kind==='siege'&&JSON.stringify(w.sim.desc)===JSON.stringify(desc)&&!w.sim.snapshot().mode.over&&(w.sim.guilds.includes(guild.id)||w.sim.size>0&&w.sim.guilds.length<2));let existing=candidates[0];let savedKey=null;if(!existing){for(const row of worldCatalog.values())if(row.server===server&&row.desc.kind==='siege'&&JSON.stringify(row.desc)===JSON.stringify(desc)){const cp=await chars.docs.read('world:v2:'+row.key);if(cp&&!cp.mode.over&&(cp.guildTeams.includes(guild.id))){savedKey=row.key;break;}}}key=existing?.key||savedKey||(server+':siege:'+crypto.randomUUID());}
      if(desc.kind==='pvp'&&worlds.get(key)?.sim.snapshot().mode.over&&!worlds.get(key).sim.size)worlds.delete(key);
      let world=worlds.get(key);
      if(!world){if(worlds.size>=64){const idle=[...worlds.values()].find(w=>!w.sim.size);if(idle)worlds.delete(idle.key);else throw new Error('world_capacity');}let cp=await chars.docs.read('world:v2:'+key);if(cp?.mode?.over)cp=null;world={key,baseKey,channel,sim:createWorldRuntime(desc,{checkpoint:cp,changed:r=>dirty.add(r),event:(pid,e)=>{notify(pid,e);if(e.t==='match_result'&&e.kind==='siege'&&desc.type!=='friendly'&&!guildResults.has(key))guildResults.set(key,{winner:e.winner,guilds:world.sim.guilds,bonusXp:world.sim.G.D.GUILD_WIN_REWARD.guildXp});}}),idleAt:now()};worlds.set(key,world);worldCatalog.set(key,{key,baseKey,channel,server,desc});}
      if(world.sim.size>=playerCap&&!world.sim.members.has(record.id))throw new Error('world_full');
      const current=sessions.get(c);
      if(current?.record.id!==record.id||current?.world!==world){await leave(c);for(const[other,s]of sessions)if(s.record.id===record.id){await leave(other);send(other,{t:'kicked',why:'character_in_use'});}if(c.gmPID!==c.pid)record.gmFlags={};if(record.save._siegeEscrow&&record.save._siegeEscrow.world!==world.sim.worldId){record.save.gold+=record.save._siegeEscrow.gold;delete record.save._siegeEscrow;dirty.add(record);}world.sim.enter(record,guild,{mercs:desc.kind==='dungeon'?Math.max(0,Math.min(4,m.mode.mercs|0)):desc.kind==='pvp'&&m.mode.mercs?desc.size-1:desc.kind==='wbarena'&&desc.bots?Math.max(0,Math.min(4,m.mode.party|0)):0,preset:Math.max(0,Math.min(2,m.mode.preset|0)),diff:Math.max(0,Math.min(3,m.mode.diff|0||1))});sessions.set(c,{record,world,server,geometryEpoch:world.sim.epoch});}
      const s=sessions.get(c);c.onlineRoom=key;
      await flush(true,[],new Set([s.world.key]));
      send(c,{t:'online_ready',request:m.request,character:record.character,playerId:record.id,room:key,channel:world.channel||1,gm:c.gmPID===c.pid,mode:desc,rules:world.sim.G.W.gm.skillOverrides||{},geometry:world.sim.geometry(),state:world.sim.snapshot(),self:world.sim.self(record.id)});characterMessage(c,record);
      return;
    }
    const s=sessions.get(c);if(!s||s.record.account!==c.pid)throw new Error('character_not_active');
    if(m.t==='online_gm_lock'){c.gmPID=null;s.record.gmFlags={};s.world.sim.sync(s.record.id);dirty.add(s.record);await flush(true,[],new Set([s.world.key]));send(c,{t:'online_gm_locked',request:m.request});return;}
    if(m.t==='online_gm'){
      if(c.gmPID!==c.pid)throw new Error('gm_required');if(typeof m.id!=='string'||m.id.length>80)throw new Error('invalid_command_id');
      const id='gm:'+m.id,previous=s.record.commands.find(x=>x.id===id);if(previous){send(c,{t:'online_gm_result',request:m.request,result:previous.result});return;}
      const records=[...s.world.sim.members.values()].map(a=>a.record),before=records.map(r=>clone(r)),checkpoint=s.world.sim.checkpoint(),priorResults=new Map(guildResults);
      try{
        for(const[tradeId,t]of trades)if(t.players.includes(s.record.id))cancelTrade(tradeId,'gm_changed_inventory');
        const result=clone(s.world.sim.context(s.record.id,()=>executeGM(s.world.sim,s.record,m.command,m.input)));
        s.record.commands.push({id,result});if(s.record.commands.length>200)s.record.commands.shift();for(const r of records)dirty.add(r);
        const audit=await chars.docs.read('gm-audit:v1')||[];audit.push({id,at:now(),actor:c.pid,username:c.accountName||null,character:s.record.character,room:s.world.key,command:m.command});
        const extras=[['gm-audit:v1',audit.slice(-200)]];let updatedGuild;if(['rating','gwtest'].includes(m.command)&&s.record.save.guild?.oid){const id=s.record.save.guild.oid,g=await storage.get('g:'+id);if(g){if(m.command==='rating')g.rating=s.record.save.guild.rating;else{g.xp=s.record.save.guild.xp;g.lvl=s.record.save.guild.lvl;}extras.push(['g:'+id,g,true]);updatedGuild=g;}}await flush(true,extras,new Set([s.world.key]));if(updatedGuild)guildChanged(updatedGuild.id,updatedGuild);send(c,{t:'online_gm_result',request:m.request,result});
      }catch(e){records.forEach((r,i)=>Object.assign(r,before[i]));s.world.sim.restore(checkpoint);guildResults.clear();for(const[k,v]of priorResults)guildResults.set(k,v);throw e;}return;
    }
    if(m.t==='online_leave'){await leave(c);return;}
    if(m.t==='online_action'){s.world.sim.action(s.record.id,m);if(m.action==='potion'||m.action==='portal')await flush(true,[],new Set([s.world.key]));return;}
    if(m.t==='online_pickup'){
      const before=s.world.sim.checkpoint(),save=clone(s.record.save);
      const ok=s.world.sim.take(s.record.id,m.id);
      if(ok){try{await flush(true,[],new Set([s.world.key]));}catch(e){s.record.save=save;s.world.sim.restore(before);throw e;}}
      send(c,{t:'online_pickup_result',id:m.id,ok});return;
    }
    if(m.t==='online_command'){
      if(typeof m.id!=='string'||m.id.length>80)throw new Error('invalid_command_id');
      const previous=s.record.commands.find(x=>x.id===m.id);
      if(previous){send(c,{t:'online_command_result',id:m.id,result:previous.result});characterMessage(c,s.record);return;}
      if(m.revision!==s.record.revision){characterMessage(c,s.record);throw new Error('stale_character');}
      for(const[id,t]of trades)if(t.players.includes(s.record.id))cancelTrade(id,'inventory_changed');
      const before=clone(s.record.save);
      try{
        let skinGuild=null;
        if(m.command==='buyFrom'&&m.args?.[0]==='war'&&m.args?.[1]===3){const p=await storage.get('p:'+c.pid);skinGuild=p?.guild?await storage.get('g:'+p.guild):null;if(!skinGuild||skinGuild.leader!==c.pid&&!skinGuild.members.some(member=>member.pid===c.pid&&member.role==='officer'))throw new Error('guild_officer_required');s.record.save.guild=clone(skinGuild);}
        let result;if(m.command==='guildSync'){const p=await storage.get('p:'+c.pid);s.record.save.guild=await guildState(p?.guild?await storage.get('g:'+p.guild):null,c.pid);const ids=await storage.get('gidx')||[];s.record.save.rivals=[];for(const id of ids)if(id!==p?.guild){const g=await storage.get('g:'+id);if(g)s.record.save.rivals.push(await guildState(g));}result=true;}else result=s.world.sim.context(s.record.id,()=>executeEconomy(s.world.sim.G,s.record,m.command,m.args));
        s.record.commands.push({id:m.id,result});if(s.record.commands.length>200)s.record.commands.shift();dirty.add(s.record);s.world.sim.sync(s.record.id);const extras=[];if(skinGuild){skinGuild.castleSkin=s.record.save.guild.castleSkin;extras.push(['g:'+skinGuild.id,skinGuild,true]);}await flush(true,extras,new Set([s.world.key]));if(skinGuild)guildChanged(skinGuild.id,skinGuild);
        send(c,{t:'online_command_result',id:m.id,result});
      }catch(e){s.record.save=before;s.record.commands=s.record.commands.filter(x=>x.id!==m.id);s.world.sim.sync(s.record.id);throw e;}return;
    }
    if(m.t==='online_trade_request'){
      if(s.world.sim.desc.kind!=='town')throw new Error('trade_requires_town');const other=sessionById(m.target);if(!other||other.world!==s.world||other.record.id===s.record.id)throw new Error('invalid_trade_target');
      for(const t of trades.values())if(t.players.some(id=>[s.record.id,other.record.id].includes(id)))throw new Error('already_trading');
      const t={id:crypto.randomUUID(),players:[s.record.id,other.record.id],names:[s.record.save.name,other.record.save.name],version:1,status:'invited',offers:[{items:[],gold:0},{items:[],gold:0}],locked:[false,false],confirmed:[false,false],expires:now()+120000};tradeValidate(t);trades.set(t.id,t);publishTrade(t);return;
    }
    if(m.t.startsWith('online_trade_')){
      const t=trades.get(m.trade);if(!t||!t.players.includes(s.record.id))throw new Error('trade_not_found');const i=t.players.indexOf(s.record.id);
      if(m.t==='online_trade_cancel'){cancelTrade(t.id);return;}
      if(m.t==='online_trade_accept'){if(i!==1||t.status!=='invited')throw new Error('invalid_trade_state');t.status='open';t.version++;publishTrade(t);return;}
      if(t.status!=='open'||m.version!==t.version)throw new Error('stale_trade');
      t.messages=null;
      if(m.t==='online_trade_unlock'){t.locked=[false,false];t.confirmed=[false,false];t.version++;}
      else if(m.t==='online_trade_suggest'){t.messages=[];t.messages[i]='ส่งคำขอให้อีกฝ่ายเสนอแล้ว';t.messages[1-i]=t.names[i]+' ขอให้คุณเสนอไอเทมหรือทอง';}
      else if(m.t==='online_trade_offer'){
        if(!Array.isArray(m.items)||m.items.length>8||!m.items.every(x=>typeof x==='string'))throw new Error('invalid_offer');const before=clone(t.offers[i]);t.offers[i]={items:[...m.items],gold:m.gold};try{tradeValidate(t);}catch(e){t.offers[i]=before;throw e;}t.locked=[false,false];t.confirmed=[false,false];t.version++;
      }else if(m.t==='online_trade_lock'){tradeValidate(t);t.locked[i]=true;}
      else if(m.t==='online_trade_confirm'){
        if(!t.locked.every(Boolean))throw new Error('trade_not_locked');tradeValidate(t);t.confirmed[i]=true;
        if(t.confirmed.every(Boolean)){
          const[a,b]=tradeValidate(t),before=[clone(a.record.save),clone(b.record.save)];
          try{
            const records=[a.record,b.record],transfers=t.offers.map((offer,i)=>offer.items.map(uid=>tradeItems(records[i]).find(it=>it.uid===uid)));
            for(let n=0;n<2;n++){const save=records[n].save;save.inv=save.inv.filter(it=>!t.offers[n].items.includes(it.uid));if(save.fashion)save.fashion.owned=save.fashion.owned.filter(it=>!t.offers[n].items.includes(it.uid));for(const it of transfers[1-n]){if(it.kind==='fashion'){save.fashion ||= {owned:[],eq:{}};save.fashion.owned.push(it);}else save.inv.push(it);}save.gold+=t.offers[1-n].gold-t.offers[n].gold;save.tradeLog ||= [];save.tradeLog.unshift({id:t.id,t:now(),who:t.names[1-n],gave:transfers[n].map(it=>it.name),got:transfers[1-n].map(it=>it.name),gg:t.offers[n].gold,tg:t.offers[1-n].gold});save.tradeLog=save.tradeLog.slice(0,100);records[n].revision++;}
            await chars.persist(records,[['trade-committed:'+t.id,{players:t.players,version:t.version,at:now()}]]);
            for(const[c2,s2]of sessions)if(records.includes(s2.record))characterMessage(c2,s2.record);
            t.status='complete';publishTrade(t);trades.delete(t.id);if(m.request)send(c,{t:'online_trade_command_result',request:m.request});return;
          }catch(e){a.record.save=before[0];b.record.save=before[1];a.record.revision--;b.record.revision--;t.confirmed=[false,false];throw e;}
        }
      }else throw new Error('unsupported_trade_command');publishTrade(t);if(m.request)send(c,{t:'online_trade_command_result',request:m.request,version:t.version});return;
    }
    throw new Error('unsupported_online_message');
  }
  return {message(c,m){return enqueue(async()=>{try{await handle(c,m);}catch(e){send(c,{t:'online_error',id:m.id,request:m.request,error:e.message});}});},
    leave(c){return enqueue(()=>leave(c));},
    tick(){const t=now(),elapsed=Math.min(250,Math.max(0,t-lastTick));lastTick=t;return enqueue(async()=>{
      if(storageBlocked){if(now()>=retryStorageAt)await flush(true);return;}
      const simStart=performance.now();accumulator+=elapsed;while(accumulator>=50){for(const w of worlds.values())if(w.sim.size)w.sim.tick(.05);accumulator-=50;}
      lastSimulationMs=performance.now()-simStart;
      if(t-broadcastAt>=100){broadcastAt=t;const samples=new Map();
      for(const[c,s]of sessions){if(c.pid!==s.record.account){await leave(c);continue;}const w=s.world;
        const ruleVersion=w.sim.G.W.gm.rulesVersion||0;if(s.rulesVersion!==ruleVersion){s.rulesVersion=ruleVersion;send(c,{t:'online_rules',room:w.key,rules:w.sim.G.W.gm.skillOverrides||{}});}
        if(s.geometryEpoch!==w.sim.epoch){s.geometryEpoch=w.sim.epoch;send(c,{t:'online_geometry',room:w.key,geometry:w.sim.geometry()});}
        if(!samples.has(w)){
          const full=w.sim.snapshot(),encoded=new Map(),updates=[],removed=[];
          for(const u of full.units){const fields=new Map(),patch={id:u.id};let changed=false;const prior=w.encoded?.get(u.id);
            for(const[k,v]of Object.entries(u)){const text=JSON.stringify(v);fields.set(k,text);if(!prior||prior.get(k)!==text){patch[k]=v;changed=true;}}
            encoded.set(u.id,fields);if(changed)updates.push(patch);
          }
          for(const id of w.encoded?.keys()||[])if(!encoded.has(id))removed.push(id);
          const state=w.encoded&&w.lastEpoch===w.sim.epoch?{...full,delta:true,units:updates,removed}:full;
          w.encoded=encoded;w.lastEpoch=w.sim.epoch;
          const grids=w.sim.G.W.map;state.mapPatch=[];
          if(w.grids&&w.gridEpoch===w.sim.epoch)for(let i=0;i<grids.block.length;i++)if((w.grids.block[i]!==grids.block[i]||w.grids.fall[i]!==grids.fall[i]||w.grids.tiles[i]!==grids.tiles[i]||w.grids.pvp[i]!==grids.pvp[i]))state.mapPatch.push([i,grids.tiles[i],grids.block[i],grids.fall[i],grids.pvp[i]]);
          w.grids={};for(const k of ['block','fall','tiles','pvp'])w.grids[k]=Uint8Array.from(grids[k]);w.gridEpoch=w.sim.epoch;
          samples.set(w,state);
        }
        send(c,{t:'online_state',room:w.key,state:samples.get(w),self:w.sim.self(s.record.id)});
      }}
      await flush();
      for(const[id,t]of trades)if(t.expires<now())cancelTrade(id,'expired');
      for(const[key,w]of worlds)if(!w.sim.size&&now()-w.idleAt>300000)worlds.delete(key);
    });},stats:()=>({worlds:worlds.size,characters:sessions.size,trades:trades.size,storageBlocked,lastSimulationMs,lastFlushMs}),flush:()=>enqueue(()=>flush(true)),worlds,sessions,characters:chars,trades};
}
