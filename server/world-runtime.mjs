import {createHeadless,clone,noop} from './headless.mjs';

export function normalizeMode(input, D) {
  const kind=input?.kind;
  if(kind==='town')return {kind,id:'aurelion'};
  if(kind==='farm'&&D.FARM_MAPS.some(m=>m.id===input.id))return {kind,id:input.id};
  if(kind==='wbarena')return {kind,id:'wbarena',bots:!!input.bots};
  if(kind==='dungeon'&&D.DUNGEONS.some(d=>d.id===input.id))return {kind,id:input.id,floor:Math.max(1,Math.min(1000,input.floor|0||1)),instance:typeof input.instance==='string'&&/^[a-zA-Z0-9_-]{1,40}$/.test(input.instance)?input.instance:'public'};
  if(kind==='pvp'){
    const id=D.PVP_MODES.some(m=>m.id===input.id)?input.id:'tdm';
    let map=Math.max(0,Math.min(D.PVP_MAPS.length-1,input.map|0));
    const compatible={dom:2,war:9,koth:4,escort:3,ctf:1};
    // Some map-specific objectives need geometry absent on other maps.
    if(compatible[id]!==undefined)map=compatible[id];
    return {kind,id,map,size:Math.max(1,Math.min(15,input.size|0||5)),normalized:input.normalized!==false};
  }
  if(kind==='siege')return {kind,id:'siege',size:Math.max(1,Math.min(15,input.size|0||5)),type:['ranked','friendly','wager'].includes(input.type)?input.type:'ranked',stake:input.type==='wager'?Math.max(1000,Math.min(1e9,Math.floor(input.stake)||1000)):0,pair:Array.isArray(input.pair)?input.pair.slice(0,2).map(String).sort():[]};
  throw new Error('unsupported_mode');
}
const rle=a=>{const out=[];for(let i=0;i<a.length;){let j=i+1;while(j<a.length&&a[j]===a[i])j++;out.push(a[i],j-i);i=j;}return out;};
export const unrle=a=>{const out=[];for(let i=0;i<a.length;i+=2)for(let j=0;j<a[i+1];j++)out.push(a[i]);return out;};
export function createWorldRuntime(descriptor,{changed=noop,event=noop,checkpoint=null}={}) {
  const G=createHeadless(),{S,E,W,D,U}=G,desc=normalizeMode(descriptor,D),members=new Map(),restoredPlayers=new Map(),restoredMercs=new Map();
  let revision=0,epoch=1,lastMap=null,lootSeq=0,effectSeq=0;const effects=[];const worldId=checkpoint?.worldId||crypto.randomUUID();
  const base=S.newSave('World','blademaster');base.guild={id:'waiting',name:'กิลด์ฝ่ายแรก',tag:'A',rating:1000,members:[],wins:0,losses:0,lvl:1,xp:0,history:[]};
  S.save=base;W.gm.wbMin=15;
  if(G.WB){G.WB.interval=()=>(W.gm.wbMin||15)*60000;G.WB.state=()=>base.wb ||= {done:{},ann:{}};G.WB.bossFor=slot=>D.WORLD_BOSSES[((slot%D.WORLD_BOSSES.length)+D.WORLD_BOSSES.length)%D.WORLD_BOSSES.length];}
  const fake=S.makePlayer(0,0);fake.cpv=E.cp(fake.st);fake.allSkills=false;
  let mode;
  if(desc.kind==='farm')mode=S.FarmMode(D.FARM_MAPS.findIndex(m=>m.id===desc.id));
  if(desc.kind==='town')mode=S.TownMode(desc.id);
  if(desc.kind==='dungeon')mode=S.DungeonMode(desc.id,desc.floor,0);
  if(desc.kind==='wbarena')mode=S.WorldBossMode({bots:false});
  if(desc.kind==='pvp')mode=S.PvPMode({mode:desc.id,map:desc.map,size:desc.size,diff:1,mercs:false,normalized:desc.normalized});
  if(desc.kind==='siege')mode=S.SiegeMode({size:desc.size,type:desc.type,stake:desc.stake,rival:{id:'waiting-b',name:'รอกิลด์คู่ต่อสู้',tag:'B',rating:1000,members:[],history:[],wins:0,losses:0}});
  W.mode=mode;W.map=mode.build();const spawn=mode.playerSpawn?.()||W.map.spawn||W.map.spawnAtt;Object.assign(fake,spawn);W.player=fake;
  const randomClasses=S.randomClasses;S.randomClasses=()=>[];
  if(mode.spawnWanderer)mode.spawnWanderer=noop;
  mode.init?.();S.randomClasses=randomClasses;if(desc.kind==='wbarena')mode.bots=desc.bots;
  W.units=W.units.filter(u=>u!==fake&&!u.sim&&!u.wanderBot&&!u.wanderer);
  if(mode.team)mode.team=[[],[]];
  W.player=null;lastMap=W.map;
  if(desc.kind==='town'&&W.map.plazaC){for(const[k,dx]of [['pet',-6],['fashion',-3],['cset',0],['wings',3],['mc',6]]){const pt=S.freePt(W.map,W.map.plazaC.x+dx,W.map.plazaC.y+5);E.spawn(E.mkUnit({kind:'npc',team:9,...pt,name:'กล่องสุ่ม '+k,role:'gacha',gk:k,look:G.SPR.lookFor('cleric'),st:{def:0}}));}}
  S.persist=noop;
  function serial(value,depth=0){if(depth>6)return null;if(value===null||typeof value!=='object')return typeof value==='function'?null:value;if(W.units.includes(value))return {$unit:value.id};if(Array.isArray(value))return value.slice(0,100).map(v=>serial(v,depth+1));const out={};for(const[k,v]of Object.entries(value))if(!['img','sheet','canvas','look'].includes(k))out[k]=serial(v,depth+1);return out;}
  function effect(kind,method,args){effects.push({id:++effectSeq,time:W.time,seed:Math.floor(Math.random()*0xffffffff),kind,method,args:serial(args)});if(effects.length>256)effects.shift();}
  for(const method of ['cast','at'])G.FX[method]=(...args)=>effect('fx',method,args);
  for(const method of ['ring','telegraph','bolt','burst','pillar','line','arc','fall','shape','text'])G.VFX[method]=(...args)=>effect('vfx',method,args);

  const originalRefresh=S.refreshPlayer;
  S.refreshPlayer=heal=>{if(W.player?.pid){const a=members.get(W.player.pid);if(a){originalRefresh(heal);changed(a.record);}}};
  S.onLevel=noop;
  const notify=(t,...args)=>{if(W.player?.pid)event(W.player.pid,{t,args:args.filter(x=>typeof x==='string'||typeof x==='number')});};
  G.UI.toast=(...args)=>notify('toast',...args);G.UI.announce=(...args)=>event(null,{t:'announce',args});
  const rawDrop=S.dropLoot;
  S.dropLoot=(x,y,item)=>{if(!item)return;rawDrop(x,y,item);const l=W.loots.at(-1);l.id=`${worldId}-${++lootSeq}`;l.created=W.time;};
  S.updateLoot=noop;
  const context=(pid,fn)=>{const a=members.get(pid);if(!a)return;const s=S.save,p=W.player,slots=W.gm.allSlots,runes=W.gm.allRunes;S.save=a.record.save;W.player=a.unit;W.gm.allSlots=!!a.record.gmFlags?.allSlots;W.gm.allRunes=!!a.record.gmFlags?.allRunes;try{return fn(a);}finally{a.record.save=S.save;S.save=s;W.player=p;W.gm.allSlots=slots;W.gm.allRunes=runes;}};
  const addItem=S.addItem;S.addItem=(it,...args)=>{const result=addItem(it,...args),a=members.get(W.player?.pid);if(result!==false&&a&&a.record.save.settings.autoEquip&&it&&(S.isEquip(it)||['rune','gem'].includes(it.kind)))a.autoEquipAt=W.time+.6;return result;};
  const rawUpdate=E.updateUnit;
  E.updateUnit=(u,dt)=>{if(u.kind==='mob'&&(W.gm.freeze||u._gmDummy)){u.cc.st=Math.max(u.cc.st,dt+.1);}return u.pid?context(u.pid,()=>rawUpdate(u,dt)):u.isMerc&&u.owner?.pid?(members.has(u.owner.pid)?context(u.owner.pid,()=>rawUpdate(u,dt)):undefined):rawUpdate(u,dt);};
  const recalc=E.recalc;E.recalc=u=>{const result=recalc(u),flags=members.get(u.pid)?.record.gmFlags;if(flags?.pspd)u.moveSpd*=flags.pspd;return result;};
  const targetable=E.targetable;E.targetable=(src,target)=>src?.kind==='mob'&&members.get(target?.pid)?.record.gmFlags?.invis?false:targetable(src,target);
  const rawEnemy=E.isEnemy;E.isEnemy=(a,b)=>{const x=a?.owner||a,y=b?.owner||b;if(desc.kind==='farm'&&x?.pid&&y?.pid&&x!==y){const m=W.map;return !!(m.pvp[E.idx(m,x.x,x.y)]&&m.pvp[E.idx(m,y.x,y.y)]&&(x.pk||y.pk||x.red||y.red));}return rawEnemy(a,b);};
  const rawKill=E.kill;
  E.kill=(t,k)=>{const owner=k&&(k.owner||k),id=owner?.pid||t?.pid,victim=members.get(t?.pid),wasAlive=t&&!t.dead,beforeDeaths=victim?.record.save.stats.deaths;
    if(id&&members.has(id))return context(id,a=>{const result=rawKill(t,k);if(wasAlive&&t.dead&&victim&&victim.record.save.stats.deaths===beforeDeaths){victim.record.save.stats.deaths++;changed(victim.record);}if(wasAlive&&t.dead&&desc.kind==='farm'&&owner?.pid&&t.pid&&owner.pid!==t.pid)S.worldPvpKill(t);changed(a.record);return result;});
    return rawKill(t,k);
  };
  const rawHit=E.hit;
  E.hit=(source,target,...args)=>{const attacker=source?.owner||source;if(members.get(target?.pid)?.record.gmFlags?.god)return 0;if(members.get(attacker?.pid)?.record.gmFlags?.oneHit&&target&&E.isEnemy(attacker,target)){target.shield=0;target.hp=Math.min(1,target.hp);}if(!target?.isWB)return rawHit(source,target,...args);target._deferBossDeath=true;try{return rawHit(source,target,...args);}finally{target._deferBossDeath=false;if(target._pendingBossKiller&&target.hp<=0){const killer=target._pendingBossKiller;delete target._pendingBossKiller;E.kill(target,killer);}}};
  const finalizedKill=E.kill;
  E.kill=(target,killer)=>{if(target?._deferBossDeath){target._pendingBossKiller=killer;return;}return finalizedKill(target,killer);};
  S.playerControl=(u,dt)=>{const a=members.get(u.pid);u.mounted=u.mountDef&&mode.allowMount&&u.combatT>3&&a?.move?u.mountDef.spd:0;if(a?.move&&!u.dead&&E.walkTo(u,a.move.x,a.move.y,dt)){a.move=null;u.moving=false;}};
  const realTeams=()=>mode.team?.map(team=>team.filter(u=>u.pid&&members.has(u.pid)))||[[],[]];
  const guildTeams=[];
  function finish(winner) {
    if(mode.over)return;mode.over=true;mode.winner=winner;const ranked=desc.type!=='friendly',winners=[...members.values()].filter(a=>a.unit.team===winner),escrow=[...members.values()].reduce((n,a)=>n+(a.record.save._siegeEscrow?.world===worldId?a.record.save._siegeEscrow.gold:0),0),payout=winners.length?Math.floor(escrow*.9/winners.length):0;
    for(const a of members.values())context(a.record.id,()=>{
      const s=S.save,won=a.unit.team===winner,gold=desc.kind==='siege'&&ranked?(won?5000:1250)*desc.size/5:0;
      if(desc.kind==='pvp'){s.honor+=won?100:35;s.pvp[won?'wins':'losses']++;s.pvp.mmr=Math.max(0,(s.pvp.mmr||1000)+(won?20:-15));}
      else if(ranked){s.war+=won?300:100;s.gold+=gold;if(won)S.ach('siege1');}if(desc.kind==='siege'&&s._siegeEscrow?.world===worldId){if(won)s.gold+=payout;delete s._siegeEscrow;}
      const bonus=desc.kind==='siege'&&ranked&&won?S.guildWinBonus({}):null,victory=[];if(desc.kind==='siege'&&ranked&&won){const it=S.rollDrop(U.pick(['gear','jewel']),Math.min(10,D.leagueOf(s.guild?.rating||1000).L+1),s.lvl/2);S.addItem(it,true);victory.push(it);}const bossLoot=desc.kind==='pvp'&&won?S.bossClashLoot?.(mode,winner):null;changed(a.record);event(a.record.id,{t:'match_result',winner,team:a.unit.team,kind:desc.kind,result:desc.kind==='pvp'?{honor:won?100:35,active:true,afk:false,chest:null,bossLoot}:{w:won?0:1,ranked,delta:ranked?(won?20:-15):0,war:ranked?(won?300:100):0,gold,wager:desc.type==='wager'?(won?payout:-desc.stake):0,rating:(s.guild?.rating||1000)+(ranked?(won?20:-15):0),victory,bonus},stats:[...members.values()].map(({unit:u})=>({id:u.id,pid:u.pid,team:u.team,name:u.name,cls:u.cls,lvl:u.lvl,ms:clone(u.ms)})),history:clone(mode.history||[])});
    });
  }
  if(desc.kind==='pvp')mode.finish=finish;
  if(desc.kind==='siege'){mode.endWar=finish;mode.enemyBuys=noop;}
  if(desc.kind==='siege'){
    // Round objectives and castle transitions remain the shared game rules; rewards are per participant.
    mode.endRound=function(w){if(this.phase!=='fight')return;this.phase='between';this.line+=w===0?1:-1;this.history.push({round:this.round,w,line:this.line,ci:(this.R||this.roles()).ci});if(Math.abs(this.line)>=5||this.round>=11)return finish(this.line>0?0:this.line<0?1:w);E.later(2.5,()=>this.setupRound());};
  }
  if(desc.kind==='dungeon'){
    const pickup=mode.onPickup;mode.onPickup=function(item){item._collector=W.player?.pid;pickup?.call(this,item);};
    mode.vacuum=noop; // Shared ground drops never auto-transfer to the first participant.
    const clear=mode.floorClear;
    mode.floorClear=function(){
      const before=this.floor,leading=W.player?.pid;clear.call(this);
      for(const a of members.values())context(a.record.id,()=>{const d=S.save.dungeons[desc.id] ||= {best:0,cp:0,daily:{}};d.best=Math.max(d.best||0,before);if(a.record.id!==leading)S.save.stats.floors++;if(before%10===0)d.cp=Math.max(d.cp||0,before);changed(a.record);});
    };
    mode.endRun=function(reason){if(this.ended)return;this.ended=true;for(const a of members.values())context(a.record.id,()=>{const full=this.full;this.full=(S.save.dungeons[desc.id]?.daily?.runs||0)<=D.DUNGEON_DAILY_FULL;const reward=S.dungeonRewards(this,reason);this.full=full;for(const item of reward.items)S.addItem(item,true);changed(a.record);event(a.record.id,{t:'dungeon_result',floor:this.floor,reason,result:clone(reward),full:(S.save.dungeons[desc.id]?.daily?.runs||0)<=D.DUNGEON_DAILY_FULL,run:{cleared:this.run.cleared,bosses:clone(this.run.bosses),king:this.run.king,got:this.run.got.filter(it=>it._collector===a.record.id).map(it=>{const copy=clone(it);delete copy._collector;return copy;})}});});};
  }
  if(desc.kind==='wbarena'){
    const onKill=mode.onKill;
    mode.onKill=function(t,k){if(!t.isWB)return onKill.call(this,t,k);
      // Evaluate the boss ranking once with each participant's private save and perspective.
      for(const a of members.values())context(a.record.id,()=>{onKill.call(this,t,k);changed(a.record);});
    };
  }
  const update=mode.update;
  mode.update=dt=>{
    if((desc.kind==='pvp'||desc.kind==='siege')&&(!realTeams()[0].length||!realTeams()[1].length)){mode.waiting=true;return;}
    mode.waiting=false;update?.call(mode,dt);
    for(const a of members.values())if(!W.units.includes(a.unit))W.units.push(a.unit);
    if(W.map!==lastMap){lastMap=W.map;epoch++;for(const a of members.values()){const sp=spawnFor(a.unit.team);Object.assign(a.unit,sp);a.move=null;}}
  };
  function spawnFor(team){const m=W.map;if(desc.kind==='siege'){const r=mode.R||mode.roles();return r.ci===0?(team===0?m.spawnAtt:m.spawnDef):(team===r.att?m.spawnAtt:m.spawnDef);}return (team===1?m.spawnB:m.spawnA)||m.spawn||m.spawnAtt;}
  function sync(a,heal=false){return context(a.record.id,()=>{const s=S.save,u=a.unit;u.cls=s.cls;u.petId=s.pet;u.mountId=s.mount;u.lvl=s.lvl;u.name=s.name;u.build=D.CLS[s.cls].build;
    const c=S.calcPlayer();if(mode.normalized)c.st=E.normalizedStats(s.cls);u.st0=c.st;S.applyFlags(u,c);E.recalc(u);if(heal)u.hp=u.maxhp;u.cpv=E.cp(u.st);u.red=s.infamy>=3;u.allSkills=!!a.record.gmFlags?.allSkills;});}
  function mercBrain(u){if(desc.kind==='wbarena'){u.brain=(b,dt)=>E.heroAI(b,dt,mode.ctlFor(b));return;}u.brain=(b,dt)=>E.heroAI(b,dt,{vision:24,goal:()=>b.ai.cmd==='attack'||b.ai.cmd==='defend'?b.ai.cmdPt:mode.kind==='dungeon'&&mode.portal&&mode.cleared?mode.portal:b.owner||b.home});}
  function addMercs(a,options){const saved=restoredMercs.get(a.record.id);if(saved){for(const u of saved){u.owner=a.unit;mercBrain(u);W.units.push(u);mode.team?.[u.team]?.push(u);if(mode.mercs&&!mode.mercs.includes(u))mode.mercs.push(u);}restoredMercs.delete(a.record.id);return;}
    const wanted=options.mercs||0;if(desc.kind==='wbarena'){context(a.record.id,()=>{if(desc.bots&&!W.units.some(u=>u._worldNPC&&!u.owner)){for(let team=100;team<105;team++)for(let i=0;i<(team<102?3:team<104?2:1);i++){const npc=mode.mkFighter(team,'NPC '+team);npc.name+=' (NPC)';npc._worldNPC=true;}}if(desc.bots)for(let i=0;i<wanted;i++){const npc=mode.mkFighter(a.unit.team,'party');npc.name+=' (NPC ปาตี้)';npc.owner=a.unit;npc.isMerc=true;npc.wbFocus='boss';npc._worldNPC=true;}});return;}if(!wanted||!['dungeon','pvp'].includes(desc.kind))return;context(a.record.id,()=>{const preset=S.save.mercPresets[options.preset||0]||[],pool=preset.length?preset:S.randomClasses(wanted);for(let i=0;i<wanted;i++){if(desc.kind==='pvp'&&W.units.filter(u=>u.kind==='hero'&&u.team===a.unit.team&&!u.dead).length>=desc.size)break;const cls=pool[i%pool.length]||U.pick(D.CLASSES).id;if(!S.mercUse(cls,options.diff||1)){G.UI.toast('ทองไม่พอจ้างทหารรับจ้างเพิ่ม','bad');break;}const rank=S.mercRank(cls),point=S.freePt(W.map,a.unit.x+U.rf(-1,1),a.unit.y+.8),u=S.makeBot(cls,a.unit.team,a.unit.cpv,rank.ai,{...point,merc:true,name:D.CLS[cls].name+' (รับจ้าง)',normalized:mode.normalized});u.owner=a.unit;u._mercOwner=a.record.id;mercBrain(u);E.spawn(u);mode.team?.[u.team]?.push(u);mode.mercs?.push(u);S.merc(cls).m++;}});
  }
  function enter(record,guild,options={}){
    if(members.has(record.id))return members.get(record.id).unit;
    if(desc.kind==='dungeon'&&desc.floor>(record.save.dungeons[desc.id]?.cp||0)+1)throw new Error('checkpoint_locked');
    let team=desc.kind==='wbarena'?20+members.size:0;
    if(mode.team){
      if(desc.kind==='siege'){
        if(!guild?.id)throw new Error('guild_required');
        let i=guildTeams.indexOf(guild.id);if(i<0){if(guildTeams.length>=2)throw new Error('different_guild_match');guildTeams.push(guild.id);i=guildTeams.length-1;mode.teamNames ||= [];mode.teamNames[i]=guild.name||guild.id;}team=i;
      }else{const t=realTeams();team=t[0].length<=t[1].length?0:1;}
      if(realTeams()[team].length>=desc.size)throw new Error('team_full');
    }
    const s=record.save,restored=restoredPlayers.get(record.id),u=restored||E.heroUnit(s.cls,s.lvl,team,{...spawnFor(team),name:s.name,pid:record.id,isPlayer:true});if(restored){restoredPlayers.delete(record.id);u.removeMe=false;team=u.team;}
    if(desc.kind==='siege'&&mode.phase==='prep')u.rooted=true;
    if(desc.kind==='pvp')while(W.units.filter(x=>x.kind==='hero'&&x.team===team&&!x.dead).length>=desc.size){const merc=W.units.find(x=>x.isMerc&&x.team===team);if(!merc)break;W.units=W.units.filter(x=>x!==merc);mode.team[team]=mode.team[team].filter(x=>x!==merc);}
    const a={record,unit:u,move:null};members.set(record.id,a);W.units.push(u);mode.team?.[team].push(u);sync(a,!restored);
    if(desc.kind==='dungeon'){const d=s.dungeons[desc.id] ||= {best:0,cp:0,daily:{}};if(d.runId!==worldId){if(d.daily?.date!==U.today())d.daily={date:U.today(),runs:0};d.daily.runs++;d.runId=worldId;}}
    if(desc.kind==='siege'&&desc.type==='wager'&&s._siegeEscrow?.world!==worldId){if(s.gold<desc.stake){members.delete(record.id);W.units=W.units.filter(x=>x!==u);mode.team[team]=mode.team[team].filter(x=>x!==u);throw new Error('insufficient_gold');}s.gold-=desc.stake;s._siegeEscrow={world:worldId,gold:desc.stake};}addMercs(a,options);changed(record);return u;
  }
  function action(pid,m){return context(pid,a=>{
    const u=a.unit;if(u.dead||mode.over||mode.ended)return false;
    if(m.action==='order'){if(!['attack','defend','follow','focus','retreat'].includes(m.command))return false;const point=Array.isArray(m.point)&&m.point.every(Number.isFinite)&&E.inside(W.map,...m.point)?{x:m.point[0],y:m.point[1],r:1.5}:{x:u.x,y:u.y,r:1.5};for(const merc of W.units.filter(x=>x.isMerc&&x.owner===u)){merc.ai.cmd=m.command;merc.ai.cmdPt=point;merc.ai.focus=W.units.find(x=>x.id===m.target)||null;}return true;}
    if(m.action==='move'){if(!Number.isFinite(m.x)||!Number.isFinite(m.y)||!E.inside(W.map,m.x,m.y))return false;a.move={x:m.x,y:m.y};return true;}
    if(m.action==='portal'){if(desc.kind!=='dungeon')return false;
      const portal=mode.portals?.[m.index|0];if(!portal||U.dist(u,portal)>2)return false;portal.use?.();return true;
    }
    if(m.action==='potion'&&['hpPot','mpPot'].includes(m.key)){S.usePotion(m.key);changed(a.record);return true;}
    if(mode.waiting||desc.kind==='siege'&&mode.phase!=='fight')return false;
    const target=W.units.find(t=>t.id===m.target&&!t.dead);
    if(m.action==='basic'){
      if(!target||!E.isEnemy(u,target)||!E.targetable(u,target)||!E.canAct(u))return false;
      const c=D.CLS[u.cls],r=['melee','tank','assassin','hybrid'].includes(c.role)?1.7:Math.max(4.5,c.rng||6);
      if(U.dist(u,target)>r+.35||!E.clearLine(u.x,u.y,target.x,target.y)||(u.basicAt||0)>W.time)return false;
      u.basicAt=W.time+.85/(1+(u.st.aspd||0)/100);u.anim.at=.3;E.face(u,target.x,target.y);E.hit(u,target,1,{elem:c.elem,cc:{}});return true;
    }
    if(m.action==='cast'){
      if(!Number.isInteger(m.slot)||m.slot<0||m.slot>=D.NSK||!Number.isFinite(m.x)||!Number.isFinite(m.y)||!E.inside(W.map,m.x,m.y))return false;
      const skill=E.skillOf(u,m.slot);if(!skill)return false;const range=E.skillRange(skill);if(target&&target!==u&&U.dist(u,target)>range+.35)return false;
      const dx=m.x-u.x,dy=m.y-u.y,d=Math.hypot(dx,dy),k=d>range?range/d:1;
      const old=W.player,noCd=W.gm.noCd;W.player=a.record.gmFlags?.noCd?u:null;W.gm.noCd=!!a.record.gmFlags?.noCd;try{return E.cast(u,m.slot,{x:u.x+dx*k,y:u.y+dy*k,u:target});}finally{W.player=old;W.gm.noCd=noCd;}
    }return false;
  });}
  function tick(dt=.05){const first=[...members.values()].find(a=>!a.unit.dead)||members.values().next().value;if(!first)return;S.save=first.record.save;W.player=first.unit;
    E.update(Math.min(.05,Math.max(0,dt)));
    for(const a of members.values())if(a.autoEquipAt!=null&&W.time>=a.autoEquipAt){delete a.autoEquipAt;if(!mode.pvp)context(a.record.id,()=>{S.autoEquip();changed(a.record);});}
    if(!mode.pvp)for(const a of members.values())if(a.unit.dead&&a.unit.deadT>5){const u=a.unit;if(desc.kind==='wbarena'&&mode.respawn){mode.respawn(u);a.move=null;continue;}Object.assign(u,{dead:false,deadT:0,hp:u.maxhp*.6,...spawnFor(u.team),kb:null,dashTo:null,dashing:false});a.move=null;}
    W.loots=W.loots.filter(l=>W.time-(l.created??W.time)<120);revision++;
    for(const a of members.values())changed(a.record);
  }
  function geometry(){const m=W.map;const out={epoch,id:m.id,kind:m.kind,w:m.w,h:m.h,k:m.k,spawn:m.spawn,spawnA:m.spawnA,spawnB:m.spawnB,spawnAtt:m.spawnAtt,spawnDef:m.spawnDef,rle:{}};
    for(const k of ['tiles','block','fall','pvp'])out.rle[k]=rle(m[k]);
    out.props=m.props.map(p=>({x:p.x,y:p.y,kind:p.kind,bt:p.bt||p.spr?.bt,theme:p.spr?.args?.[1]}));
    out.walls=m.walls.map(w=>({tx:w.tx,ty:w.ty,color:w.img?.args?.[0]||'#777777'}));
    for(const k of ['g','acc','bg','portalPt','exitPt','bossPt','bossSpot','center','plazaC','saves','warps','flag','throne','points','hill','path','ice','rift','sky','c','VR','vill'])if(m[k]!==undefined)out[k]=clone(m[k]);return out;
  }
  function snapshot(){const keys=['id','pid','look','kind','cls','team','name','lvl','x','y','fx','fy','sc','hp','maxhp','res','resMax','moveSpd','rooted','dashing','kb','shield','dead','deadT','moving','grade','boss','col','col2','body','elem','md','fashion','title','guildTag','isMerc','mercCls','petId','mountId','mounted','cc','buffs','stealth','jz','red','pk','role','roleTh','label','vk','gk','sub','isWB','wbId','wbPh','wbEnr','ms'];
    const meta={};for(const k of ['floor','full','cleared','ended','over','winner','waiting','score','t','limit','target','round','roundWins','phase','prepT','roundT','line','hold','throne','tickets','pool','kills','R','safeR','half','history','timers','teamNames'])if(mode[k]!==undefined)meta[k]=clone(mode[k]);
    if(desc.kind==='pvp')meta.bossId=mode.boss?.id;
    if(desc.kind==='siege'){meta.gateId=mode.gate?.id;meta.innerId=mode.inner?.id;}
    if(mode.run)meta.run={cleared:mode.run.cleared,bosses:clone(mode.run.bosses),king:mode.run.king,got:[]};
    if(mode.points)meta.points=clone(mode.points);if(mode.hill)meta.hill=clone(mode.hill);if(mode.payload)meta.payload=clone(mode.payload);
    if(mode.flags)meta.flags=mode.flags.map(f=>({...f,carrier:f.carrier?.id||null}));
    return {clockFields:(G.TICK_FIELDS||[]).map(f=>({owner:f.u.id,s:f.s,x:f.x,y:f.y,t0:f.t0,next:f.next})),ultimates:(G.SU_STATES||[]).map(st=>({owner:st.u.id,x:st.x,y:st.y,r:st.r,t:st.t,dur:st.dur,look:st.d.look,sh:st.d.sh})),effects:effects.filter(e=>W.time-e.time<1),portals:(mode.portals||[]).map(p=>({x:p.x,y:p.y,step:p.step,exit:p.exit})),revision,epoch,time:W.time,map:W.map.id,kind:desc.kind,mode:meta,
      units:W.units.filter(u=>!u.removeMe&&(!u.dead||u.deadT<4||u.pid)).map(u=>{const o={};for(const k of keys)if(u[k]!==undefined)o[k]=u[k];if(u.wbDmg)o.damage=[...u.wbDmg].map(([actor,n])=>[actor.id,n]);o.owner=u.owner?.id;o.anim={at:u.anim.at,ct:u.anim.ct};return o;}),
      loots:W.loots.map(l=>({id:l.id,x:l.x,y:l.y,item:l.item,tier:l.tier,t:W.time-l.created})),dangers:W.dangers.map(d=>({x:d.x,y:d.y,r:d.r,t:d.t,team:d.team})),
      projs:W.projs.map(p=>({x:p.x,y:p.y,vx:p.vx,vy:p.vy,z:p.z,elem:p.elem,size:p.size,pal:p.pal})),zones:W.zones.map(z=>({x:z.x,y:z.y,r:z.r,t:z.t,dur:z.dur,elem:z.s?.elem}))};}
  function take(pid,id){return context(pid,a=>{const l=W.loots.find(l=>l.id===id);if(!l||a.unit.dead)return false;const age=W.time-l.created,r=desc.kind==='dungeon'&&age>.4?4:a.record.save.pet&&a.record.save.settings.autoLoot&&age>.6?6:1.2;if(U.dist(a.unit,l)>r||!S.addItem(clone(l.item),true))return false;W.loots.splice(W.loots.indexOf(l),1);mode.onPickup?.(l.item);changed(a.record);return true;});}
  // Persist unit references explicitly rather than serializing renderer objects or closures.
  function saveCheckpoint(){
    const unitSet=new Set(W.units),seen=new Set();
    function encode(v,depth=0){if(v===null||typeof v!=='object')return typeof v==='function'?undefined:v;if(depth>16)return undefined;if(unitSet.has(v))return {$unit:v.id};if(v instanceof Set)return {$set:[...v].map(x=>encode(x,depth+1))};if(v instanceof Map)return {$map:[...v].map(([k,val])=>[encode(k,depth+1),encode(val,depth+1)])};if(ArrayBuffer.isView(v))return Array.from(v);if(seen.has(v))return undefined;seen.add(v);const out=Array.isArray(v)?[]:{};for(const k of Object.keys(v))if(!['look','sheet','spr','propSpr','img','canvas','brain','update','renderGround','renderTop','hud','portals'].includes(k)){const x=encode(v[k],depth+1);if(x!==undefined)out[k]=x;}seen.delete(v);return out;}
    const units=W.units.map(u=>{unitSet.delete(u);const result=encode(u);unitSet.add(u);return result;});
    return {format:2,worldId,desc,gm:clone(W.gm),revision,epoch,lootSeq,effectSeq,time:W.time,geometry:geometry(),units,loots:encode(W.loots),projs:encode(W.projs),zones:encode(W.zones),traps:encode(W.traps),mode:encode(mode),ultimates:encode(G.SU_STATES||[]),clockFields:encode(G.TICK_FIELDS||[]),base:encode(base),guildTeams:[...guildTeams],savedAt:Date.now()};
  }
  function restore(cp){
    if(cp?.format!==2)return;const byId=new Map();W.units=[];restoredPlayers.clear();guildTeams.length=0;effects.length=0;lootSeq=Math.max(lootSeq,cp.lootSeq||0,...(cp.loots||[]).map(l=>Number(String(l.id).split('-').at(-1))||0));effectSeq=Math.max(effectSeq,cp.effectSeq||0);
    for(const q of cp.units){const u=q.kind==='mob'?S.mkMob(q.md,q.lvl,q.grade,q.x,q.y,{elem:q.elem}):q.cls&&D.CLS[q.cls]?E.heroUnit(q.cls,q.lvl,q.team,{x:q.x,y:q.y}):E.mkUnit({kind:q.kind,team:q.team,x:q.x,y:q.y,st:q.st||{}});byId.set(q.id,u);W.units.push(u);}
    const decode=v=>{if(v===null||typeof v!=='object')return v;if(v.$unit!==undefined)return byId.get(v.$unit)||null;if(v.$set)return new Set(v.$set.map(decode));if(v.$map)return new Map(v.$map.map(([k,val])=>[decode(k),decode(val)]));if(Array.isArray(v))return v.map(decode);const o={};for(const[k,x]of Object.entries(v))o[k]=decode(x);return o;};
    for(const q of cp.units){const u=byId.get(q.id);Object.assign(u,decode(q));u.cds=Float32Array.from(q.cds||[]);if(u.pid)restoredPlayers.set(u.pid,u);if(u._worldNPC&&desc.kind==='wbarena')mercBrain(u);}
    restoredMercs.clear();for(const u of W.units)if(u.isMerc&&u.owner?.pid){const list=restoredMercs.get(u.owner.pid)||[];list.push(u);restoredMercs.set(u.owner.pid,list);mercBrain(u);}W.units=W.units.filter(u=>!u.pid&&!(u.isMerc&&u.owner?.pid));W.idc=Math.max(1,...cp.units.map(u=>u.id+1));
    const g=cp.geometry,m=W.map;for(const[k,v]of Object.entries(g))if(v!==undefined&&!['rle','props','walls','epoch'].includes(k))m[k]=clone(v);m.props=g.props.map(p=>({...p,spr:{img:null,w:24,h:24,bt:p.bt}}));m.walls=g.walls.map(w=>({...w,x:w.tx+.5,y:w.ty+.5,img:{args:[w.color]}}));for(const k of ['tiles','block','fall','pvp'])m[k]=Uint8Array.from(unrle(g.rle[k]));
    for(const[k,v]of Object.entries(decode(cp.mode)||{}))if(typeof mode[k]!=='function'&&k!=='team')mode[k]=v;
    if(mode.team)mode.team=[[],[]];W.time=cp.time;revision=cp.revision;epoch=cp.epoch;W.loots=decode(cp.loots)||[];W.projs=decode(cp.projs)||[];W.zones=decode(cp.zones)||[];W.traps=decode(cp.traps)||[];W.timers=[];
    for(const q of cp.units)if(q.kind==='struct'&&q.sub==='tower'&&mode.mkTower){const temp=mode.mkTower(q.x,q.y,q.team,q.st?.atk||10);byId.get(q.id).update=temp.update;W.units=W.units.filter(u=>u!==temp);}
    if(G.SU_STATES){G.SU_STATES.splice(0,G.SU_STATES.length,...(decode(cp.ultimates)||[]));for(const st of G.SU_STATES)st.d=G.SETULT2[st.u.cls];}
    if(G.TICK_FIELDS)G.TICK_FIELDS.splice(0,G.TICK_FIELDS.length,...(decode(cp.clockFields)||[]));
    if(cp.gm){Object.assign(W.gm,cp.gm);if(cp.gm.guildWin)Object.assign(D.GUILD_WIN_REWARD,cp.gm.guildWin);if(cp.gm.bossRates)Object.assign(D.BOSS_CLASH_RATES,cp.gm.bossRates);for(const[key,skill]of Object.entries(cp.gm.skillOverrides||{})){const[cls,slot]=key.split(':');if(D.CLS[cls]?.skills[slot])Object.assign(D.CLS[cls].skills[slot],skill);}}
    Object.assign(base,decode(cp.base)||{});guildTeams.push(...(cp.guildTeams||[]));lastMap=W.map;
    // A rollback restores live connections as well as entities; process startup has no members yet.
    for(const[pid,a]of members){const u=restoredPlayers.get(pid);if(!u)continue;a.unit=u;restoredPlayers.delete(pid);W.units.push(u);mode.team?.[u.team]?.push(u);}
    W.player=members.values().next().value?.unit||null;
  }
  if(checkpoint)restore(checkpoint);
  return {G,desc,worldId,members,context,enter,action,tick,take,sync:pid=>{const a=members.get(pid);if(a)sync(a);},geometry,snapshot,checkpoint:saveCheckpoint,restore,
    self(pid){return context(pid,a=>({st:a.unit.st,gmConfig:{bossRates:D.BOSS_CLASH_RATES,guildWin:D.GUILD_WIN_REWARD},gm:Object.fromEntries(Object.entries(W.gm).filter(([,v])=>typeof v==='boolean'||typeof v==='number')),gmFlags:a.record.gmFlags||{},cds:Array.from(a.unit.cds),gcd:a.unit.gcd,runes:a.unit.runes,sets:a.unit.sets}));},
    leave(pid){const a=members.get(pid);if(!a)return;if(a.record.save._siegeEscrow?.world===worldId){a.record.save.gold+=a.record.save._siegeEscrow.gold;delete a.record.save._siegeEscrow;changed(a.record);}a.unit.dead=true;W.units=W.units.filter(u=>u!==a.unit&&u.owner!==a.unit);for(let i=0;i<(mode.team||[]).length;i++)mode.team[i]=mode.team[i].filter(u=>u!==a.unit&&u.owner!==a.unit);if(mode.mercs)mode.mercs=mode.mercs.filter(u=>u.owner!==a.unit);members.delete(pid);},get guilds(){return [...guildTeams];},get size(){return members.size;},get epoch(){return epoch;}};
}
