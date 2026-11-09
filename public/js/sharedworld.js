'use strict';
/* Online authority adapter: browser input/rendering, server simulation and private character storage. */
(function(G){
  const NET=window.ASHFALL_NET;if(!NET)return;
  const {W,E,S,D,U,UI,VFX:V,SPR}=G;
  const SW=G.SHARED_WORLD={active:false,ready:false,room:'',playerId:'',revision:-1,characterRevision:0};
  const nativeEnter=S.enter,nativePersist=S.persist,nativeRefresh=S.refreshPlayer;
  let lastSettings='',settingsTimer=null,lastCache=0,lastGear='',lastPanel='';let wanted=null,request='',currentMap=null,currentCharacter='',currentServer='',nextJoin=0,intent=null,moving=false,lastIntent=0,lastPotion=0,applying=false,official=null,commandChain=Promise.resolve();
  const entities=new Map(),pickups=new Map(),pending=new Map();
  const send=o=>{if(NET.connected)NET.send(o);};
  function charId(){if(!S.save)return '';if(!S.save._worldCharacter){S.save._worldCharacter=crypto.randomUUID();nativePersist();}return S.save._worldCharacter;}
  function descriptor(mode){switch(mode.kind){case 'town':return{kind:'town',id:'aurelion'};case 'farm':return{kind:'farm',id:mode.def.id};case 'dungeon':return{kind:'dungeon',id:mode.dg.id,floor:mode.startFloor||mode.floor,instance:'public'};case 'wbarena':return{kind:'wbarena',id:'wbarena'};case 'pvp':return{kind:'pvp',id:mode.cfg.mode,map:mode.cfg.map,size:mode.cfg.size,normalized:mode.cfg.normalized};case 'siege':return{kind:'siege',size:mode.cfg.size};default:return null;}}
  function siegeView(mode){const team=W.player?.team||0,R=mode.R||mode.roles(),view={...mode};for(const key of ['pool','hold','tickets','kills'])if(mode[key])view[key]=team?[mode[key][1],mode[key][0]]:mode[key];view.line=team?-mode.line:mode.line;view.R={...R,att:R.att<0?R.att:R.att^team,def:R.def<0?R.def:R.def^team};view.roles=()=>view.R;return view;}
  const prepTick=UI.siegePrepTick;UI.siegePrepTick=mode=>prepTick(SW.active&&mode.kind==='siege'?siegeView(mode):mode);
  S.enter=mode=>{if(SW.ready)send({t:'online_leave'});wanted=descriptor(mode);SW.active=!!wanted;SW.ready=false;request=crypto.randomUUID();currentMap=null;
    if(!wanted)return nativeEnter(mode);
    if(mode.kind==='siege'){const hud=mode.hud;mode.hud=function(){return hud.call(siegeView(this));};}
    const init=mode.init;mode.init=()=>{const m=W.map;mode.portals=[];if(mode.kind==='siege')Object.assign(mode,{hold:[0,0],tickets:[0,0],R:mode.roles(),throne:0,structs:[],respawn:[]});if(mode.kind==='town')mode.portals=(m.warps||[]).map(w=>({x:w.x,y:w.y,step:true,use:()=>w.to==='wb'?S.goWorldBoss(false):w.to==='dg'?UI.openPanel('dungeon'):S.goFarm(w.to)}));else if(['farm','wbarena'].includes(mode.kind)&&m.portalPt)mode.portals=[{...m.portalPt,step:true,use:()=>S.goTown('aurelion')}];};
    try{return nativeEnter(mode);}finally{mode.init=init;}
  };
  function poll(){
    if(!W.map||!W.player||!wanted){if(SW.ready)send({t:'online_leave'});SW.active=SW.ready=false;return;}
    SW.active=true;const id=charId(),server=globalThis.ASHFALL_STORAGE.getItem('ashfall_server')||'s1';
    if(currentServer!==server){currentServer=server;if(SW.ready)send({t:'online_leave'});SW.ready=false;request=crypto.randomUUID();currentMap=null;nextJoin=0;}
    if(currentCharacter!==id){official=null;SW.characterRevision=0;}
    if(currentCharacter!==id||currentMap!==W.map&&SW.ready===false){currentMap=W.map;currentCharacter=id;entities.clear();pickups.clear();SW.revision=-1;SW._effects=new Set();nextJoin=0;W.units=W.units.filter(u=>u===W.player);W.loots=[];W.timers=[];}
    if(!NET.connected||!NET.authed){SW.ready=false;return;}
    if(NET.features?.onlineAuthority!==2)return;
    if(!SW.ready&&performance.now()>=nextJoin){nextJoin=performance.now()+3000;send({t:'online_enter',request,server,mode:wanted,character:id,legacy:official?undefined:S.save});}
  }
  NET.on('auth_lost',()=>{SW.ready=false;SW.revision=-1;nextJoin=0;});
  NET.on('login_required',()=>{SW.ready=false;G.ACC=null;G.BOOT?.login();const root=document.getElementById('boot2');if(root)root.hidden=false;});
  NET.on('close',()=>{SW.ready=false;SW.revision=-1;nextJoin=0;});
  NET.on('kicked',()=>{SW.ready=false;UI.toast('บัญชีนี้เข้าสู่ระบบจากที่อื่นแล้ว','bad');});
  NET.on('account_ok',m=>{if(!W.player&&G.BOOT)G.BOOT.enter(m.username);S.mergeOnlineSlots?.(m.characters);if(!W.player)UI.showTitle();});
  NET.on('online_characters',m=>{S.mergeOnlineSlots?.(m.characters);UI.showTitle();});
  NET.on('online_error',m=>{const p=pending.get(m.id);if(p){if(m.error==='stale_character'&&(p.retries||0)<3){p.retries=(p.retries||0)+1;p.resend();return;}clearTimeout(p.timer);pending.delete(m.id);p.reject(new Error(m.error));}UI.toast('ออนไลน์: '+m.error,'bad');});
  const decode=values=>{const a=[];for(let i=0;i<values.length;i+=2)for(let j=0;j<values[i+1];j++)a.push(values[i]);return Uint8Array.from(a);};
  function geometry(g){
    const m=W.map,oldProps=m.props||[];Object.assign(m,{id:g.id,kind:g.kind,w:g.w,h:g.h,k:g.k});
    for(const[k,v]of Object.entries(g))if(!['rle','props','walls','epoch'].includes(k))m[k]=v;
    for(const[k,v]of Object.entries(g.rle))m[k]=decode(v);
    m.props=g.props.map(p=>{const existing=oldProps.find(q=>q.kind===p.kind&&Math.abs(q.x-p.x)<.1&&Math.abs(q.y-p.y)<.1);if(existing)return existing;let spr;if(p.bt)spr=G.DECO_SPR?.(p.bt)||G.BLD_SPR?.(p.bt);return {...p,spr:spr||SPR.prop(p.kind,p.theme||{acc:m.acc})};});
    m.walls=g.walls.map(w=>({...w,x:w.tx+.5,y:w.ty+.5,img:SPR.wallBlock(w.color,18)}));
    m.chunks?.clear();E.renderMapCanvas(m);currentMap=m;
  }
  const ruleDefaults=new Map(),ruleKeys=new Set();
  function rules(values){for(const key of ruleKeys){const[cls,slot]=key.split(':');D.CLS[cls].skills[slot]=structuredClone(ruleDefaults.get(key));}ruleKeys.clear();for(const[key,value]of Object.entries(values||{})){const[cls,slot]=key.split(':');if(!D.CLS[cls]?.skills[slot])continue;if(!ruleDefaults.has(key))ruleDefaults.set(key,structuredClone(D.CLS[cls].skills[slot]));D.CLS[cls].skills[slot]=structuredClone(value);ruleKeys.add(key);}UI.refreshSkillIcons?.();}
  NET.on('online_rules',m=>{if(SW.ready&&m.room===SW.room)rules(m.rules);});
  NET.on('online_ready',m=>{if(!SW.active||m.request!==request||m.character!==currentCharacter)return;SW.room=m.room;SW.channel=m.channel||1;SW._siegePhase=null;SW.playerId=m.playerId;SW.ready=true;SW.revision=-1;SW._effects=new Set();SW._predict=false;rules(m.rules);if(m.mode.kind==='pvp')W.mode=S.PvPMode({mode:m.mode.id,map:m.mode.map,size:m.mode.size,diff:1,normalized:m.mode.normalized,mercs:false});geometry(m.geometry);apply(m);});
  NET.on('online_geometry',m=>{if(SW.ready&&m.room===SW.room)geometry(m.geometry);});
  NET.on('online_state',m=>{if(SW.ready&&m.room===SW.room)apply(m);});
  function apply(m){const state=m.state;if(!state||state.revision<SW.revision)return;SW.revision=state.revision;const seen=new Set();
    if(!state.delta)SW._unitStates=new Map();SW._unitStates ||= new Map();for(const patch of state.units)SW._unitStates.set(patch.id,{...SW._unitStates.get(patch.id),...patch});for(const id of state.removed||[])SW._unitStates.delete(id);
    for(const [i,tile,block,fall,pvp]of state.mapPatch||[]){W.map.tiles[i]=tile;W.map.block[i]=block;W.map.fall[i]=fall;W.map.pvp[i]=pvp;}
    for(const q of SW._unitStates.values()){const me=q.pid===SW.playerId;let u=me?W.player:entities.get(q.id);
      if(!u){if(q.kind==='mob')u=S.mkMob(q.md,q.lvl,q.grade,q.x,q.y,{elem:q.elem});else if(q.cls&&D.CLS[q.cls])u=E.heroUnit(q.cls,q.lvl,q.team,{x:q.x,y:q.y,name:q.name});else u=E.mkUnit({kind:q.kind,team:q.team,x:q.x,y:q.y,name:q.name,body:q.body,col:q.col,col2:q.col2,st:{},look:q.kind==='npc'?SPR.lookFor(q.look?.cls||'blademaster'):undefined});}
      const oldHp=u.hp,oldX=u.x,oldY=u.y;u._worldId=q.id;u._shared=true;seen.add(q.id);entities.set(q.id,u);
      for(const k of Object.keys(q))if(!['id','owner','anim','look','damage'].includes(k))u[k]=q[k];u.id=q.id;u.anim.at=q.anim?.at||0;u.anim.ct=q.anim?.ct||0;
      if(q.pid&&!me){u.online=q.pid.split(':')[0];NET.peerPid.set(u.online,u.online);}
      if(me){u._authX=q.x;u._authY=q.y;if(SW._predict&&oldHp>0&&!q.dead&&U.d2(oldX,oldY,q.x,q.y)<36){u.x=oldX;u.y=oldY;}SW._predict=true;}
      if(!me){u._tx=q.x;u._ty=q.y;if(U.d2(oldX,oldY,q.x,q.y)<64){u.x=oldX;u.y=oldY;}}
      if(q.kind==='struct'&&q.sub!=='turret'&&!u.propSpr)u.propSpr=SPR.prop(q.sub==='tower'?'tower':'portal',{c:q.team?'#aa4444':'#4488aa'});
      if(oldHp>q.hp&&!q.dead&&E.vis(q.x,q.y)){u.flash=.1;V.text(q.x,q.y,U.fmt(oldHp-q.hp),me?'#ff5a5a':'#ffffff',{size:8});}
      if(me&&m.self){if(m.self.gm)Object.assign(W.gm,m.self.gm,m.self.gmFlags);u.st=m.self.st;u.cds=Float32Array.from(m.self.cds);u.gcd=m.self.gcd;u.runes=m.self.runes;u.sets=m.self.sets;}
    }
    for(const id of entities.keys())if(!seen.has(id))entities.delete(id);W.units=[...entities.values()];if(['pvp','siege'].includes(state.kind))W.mode.team=[W.units.filter(u=>u.pid&&u.team===0),W.units.filter(u=>u.pid&&u.team===1)];
    for(const q of SW._unitStates.values())if(q.damage){const unit=entities.get(q.id);unit.wbDmg=new Map(q.damage.map(([id,n])=>[entities.get(id),n]).filter(([u])=>u));}
    if(state.kind==='pvp')W.mode.boss=entities.get(state.mode.bossId)||null;
    if(state.kind==='wbarena')W.mode.boss=W.units.find(u=>u.isWB&&!u.dead)||null;
    W.loots=state.loots.map(l=>({...l,_shared:true}));W.dangers=state.dangers;Object.assign(W.mode,state.mode);W.time=state.time;
    if(state.kind==='siege'){W.mode.gate=entities.get(state.mode.gateId)||null;W.mode.inner=entities.get(state.mode.innerId)||null;if(SW._siegePhase!==state.mode.phase){SW._siegePhase=state.mode.phase;UI.siegePrep?.(siegeView(W.mode),state.mode.phase==='prep');}}
    if(state.portals&&['dungeon'].includes(state.kind))W.mode.portals=state.portals.map((p,index)=>({...p,use:()=>send({t:'online_action',action:'portal',index})}));
    if(state.kind==='dungeon')W.mode.portal=W.mode.portals.find(p=>!p.exit)||null;
    W.projs=state.projs.map(p=>({...p,pal:p.pal||D.ELEM[p.elem||'phys'].pal,hist:[],trail:0,scale:1}));
    W.zones=state.zones.map(z=>({...z,s:{elem:z.elem||'phys'},pal:D.ELEM[z.elem||'phys'].pal}));
    if(G.TICK_FIELDS)G.TICK_FIELDS.splice(0,G.TICK_FIELDS.length,...(state.clockFields||[]).map(f=>({...f,u:entities.get(f.owner)})).filter(f=>f.u));
    SW._ultimateIds ||= new Set();for(const st of state.ultimates||[]){const id=st.owner+':'+Math.round(state.time-st.t);if(SW._ultimateIds.has(id))continue;SW._ultimateIds.add(id);const u=entities.get(st.owner);if(u){const active={...st,u,done:false};V.fx.push({k:'f6su',t:st.t,dur:st.dur,st:active,look:st.look,sh:st.sh,pal:D.ELEM[D.CLS[u.cls].elem].pal,x:st.x,y:st.y,ground:st.look==='zone'||st.look==='aura'});}}
    SW._effects ||= new Set();
    const resolve=v=>{if(!v||typeof v!=='object')return v;if(v.$unit!==undefined)return entities.get(v.$unit);if(Array.isArray(v))return v.map(resolve);const o={};for(const[k,x]of Object.entries(v))o[k]=resolve(x);return o;};
    for(const effect of state.effects||[]){if(SW._effects.has(effect.id))continue;SW._effects.add(effect.id);const oldRandom=Math.random;Math.random=U.seeded(effect.seed);try{const target=effect.kind==='fx'?G.FX:V;target[effect.method]?.(...resolve(effect.args));}catch(e){console.error('Online effect',effect.method,e.message);}finally{Math.random=oldRandom;}}
    if(SW._effects.size>2000)SW._effects=new Set((state.effects||[]).map(e=>e.id));
  }
  NET.on('online_character',m=>{if(m.character!==currentCharacter||!S.save)return;
    try{if(!official&&S.save._worldCharacter){const key='ashfall_legacy_backup_'+S.save._worldCharacter;if(!globalThis.ASHFALL_STORAGE.getItem(key))globalThis.ASHFALL_STORAGE.setItem(key,JSON.stringify(S.save));}}catch{}
    const settings={...S.save.settings};official=structuredClone(m.save);UI.market=structuredClone(m.save._onlineMarket?.items||[]);SW.characterRevision=m.revision;applying=true;
    try{S.save=structuredClone(m.save);S.save.settings={...S.save.settings,...settings};
      const gear=JSON.stringify([m.save.cls,m.save.lvl,m.save.eq,m.save.runeBoard,m.save.skillRunes,m.save.fashion,m.save.pet,m.save.mount]),panel=JSON.stringify([m.save.inv,m.save.bag,m.save.gold,m.save.honor,m.save.war,m.save.diamond,m.save.gacha,m.save.vault,m.save._onlineMarket]);
      const changed=gear!==lastGear||panel!==lastPanel;
      if(changed||performance.now()-lastCache>5000){nativePersist();lastCache=performance.now();}
      if(W.player&&gear!==lastGear){W.player.cls=S.save.cls;W.player.look=S.lookPlayer();S.applyFlags(W.player,{...S.calcPlayer()});}
      if(changed){UI.refreshHud?.(true);if(UI.panel?.id)UI.renderPanel();}lastGear=gear;lastPanel=panel;
    }finally{applying=false;}
  });
  NET.on('online_pickup_result',m=>pickups.delete(m.id));
  NET.on('online_event',m=>{const e=m.event;if((e.t==='match_result'||e.t==='dungeon_result')&&(!SW.ready||m.room&&m.room!==SW.room))return;if(e.t==='toast')UI.toast(...e.args);else if(e.t==='announce')UI.announce(...e.args);else if(e.t==='dungeon_result'&&e.result&&W.mode.kind==='dungeon'){Object.assign(W.mode,{ended:true,full:e.full,run:e.run});UI.dungeonResult(W.mode,e.result,e.reason);}
    else if(e.t==='match_result'&&e.result&&W.mode.kind===e.kind){
      const team=e.team,players=(e.stats||[]).map(data=>{const unit=entities.get(data.id)||W.units.find(u=>u.pid===data.pid);if(!unit)return null;Object.assign(unit,data);unit.ms={k:0,d:0,a:0,dmg:0,heal:0,obj:0,streak:0,...data.ms};return unit;}).filter(Boolean),teams=[players.filter(u=>u.team===team),players.filter(u=>u.team!==team)],best=(list,key)=>list.reduce((a,u)=>(u.ms[key]||0)>(a.ms[key]||0)?u:a,list[0]||W.player);
      const result={...e.result,mvp:{dmg:best(e.kind==='siege'?teams[0]:players,'dmg'),heal:best(e.kind==='siege'?teams[0]:players,'heal'),obj:best(e.kind==='siege'?teams[0]:players,'obj')},score:u=>u.ms.dmg/1000+u.ms.heal/800+u.ms.k*3+u.ms.obj*5-u.ms.d};W.mode.over=true;
      if(e.kind==='pvp')UI.pvpResult({...W.mode,online:true,team:teams},e.winner===team?0:1,result);
      else {UI.siegePrep(W.mode,false);const view=siegeView(W.mode);view.team=teams;view.cfg={...W.mode.cfg,rival:{...W.mode.cfg.rival,name:W.mode.teamNames?.[1-team]||W.mode.cfg.rival.name}};view.history=(e.history||[]).map(h=>({...h,w:h.w===team?0:1,line:team?-h.line:h.line,ci:h.ci??(h.round===1?0:Math.min(D.CASTLES.length,Math.abs(h.line-(h.w===0?1:-1))+1))}));const save=S.save;try{S.save={...save,guild:{...save.guild,rating:result.rating??save.guild.rating}};UI.siegeResult(view,result);}finally{S.save=save;}}
    }});
  NET.on('online_command_result',m=>{const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);p.resolve(m.result);}});
  SW.command=(command,args=[])=>{commandChain=commandChain.catch(()=>{}).then(()=>new Promise((resolve,reject)=>{if(!SW.ready)return reject(new Error('world_not_ready'));const id=crypto.randomUUID(),timer=setTimeout(()=>{pending.delete(id);reject(new Error('command_timeout'));},20000);const resend=()=>send({t:'online_command',id,revision:SW.characterRevision,command,args});pending.set(id,{resolve,reject,timer,resend,retries:0});resend();}));return commandChain;};
  const command=(name,args)=>{SW.command(name,args).then(r=>{if(name==='gacha'&&r?.rolls)UI.gachaReveal?.(r.rolls.map(row=>({...row,img:row.it?UI.itemIcon(row.it):row.petKey?UI.petIcon(row.petKey):''})),args[0]);if(r?.msg)UI.toast(r.msg,r.ok===false?'bad':'good');}).catch(e=>UI.toast(e.message,'bad'));};
  function wire(v){if(Array.isArray(v))return v.map(wire);if(v&&typeof v==='object'&&v.uid)return {$item:v.uid};return v;}
  const methods=['equip','unequip','sell','salvage','enchant','refine','reforge','socket','unsocket','fusion','runeUpgrade','runeEquip','runeRemove','setSkillRune','fashionEquip','fashionRemove','dye','craftFashion','useFood','changeClass','autoEquip','fashionBest','fashionWearTheme','wearSet','vaultBuy','drillSocket','rerollMain','rerollOptions','openPack','fashionSellDia','fashionDrop','buyDiamond','buyTicket'];
  for(const name of methods){const old=S[name];if(typeof old!=='function')continue;S[name]=(...args)=>{if(!SW.active||applying)return old(...args);let values=args.map(wire);if(name==='fusion')values=[args[0].map(it=>it.uid)];command(name,values);return ['sell','salvage','fashionSellDia'].includes(name)?0:true;};}
  const buy=S.buy;S.buy=(entry,n=1)=>{if(!SW.active)return buy(entry,n);const i=S.SHOP.findIndex(e=>e.key===entry.key&&e.stone===entry.stone&&e.cur===entry.cur);command('buy',[i,n]);return true;};
  const buyFrom=S.buyFrom;S.buyFrom=e=>{if(!SW.active)return buyFrom(e);const entries=e.cur==='honor'?S.honorShop():S.warShop();command('buyFrom',[e.cur,entries.findIndex(x=>x.th===e.th)]);return true;};
  for(const name of ['addItem','gainXp','dropLoot','quest','codexKill','ach','setLevel','importSave']){const old=S[name];if(typeof old==='function')S[name]=(...args)=>{if(SW.active&&!applying)return false;return old(...args);};}
  S.refreshPlayer=(...args)=>{if(SW.active&&!applying)return;return nativeRefresh(...args);};
  S.persist=()=>{if(applying||!SW.active)return nativePersist();if(SW.ready){const text=JSON.stringify(S.save.settings);if(text!==lastSettings){lastSettings=text;clearTimeout(settingsTimer);settingsTimer=setTimeout(()=>command('settings',[JSON.parse(text)]),400);}}if(official){const save=S.save;S.save=structuredClone(official);nativePersist();S.save=save;}};
  const update=E.update,walk=E.walkTo,move=E.move,hit=E.hit,cast=E.cast,heal=E.heal,kill=E.kill,potion=S.usePotion;
  E.update=dtReal=>{poll();if(!SW.active)return update(dtReal);const dt=Math.min(.05,dtReal),p=W.player;intent=null;for(let i=0;i<p.cds.length;i++)p.cds[i]=Math.max(0,p.cds[i]-dt);p.gcd=Math.max(0,p.gcd-dt);for(const k in p.cc)p.cc[k]=Math.max(0,p.cc[k]-dt);if(SW.ready&&!p.dead&&!W.mode.over&&!W.mode.ended)S.playerControl(p,dt);
    if(SW.ready&&performance.now()-lastIntent>90){lastIntent=performance.now();if(intent){send({t:'online_action',action:'move',...intent});moving=true;}else if(moving){send({t:'online_action',action:'move',x:p.x,y:p.y});moving=false;}}
    if(SW.ready&&p._authX!=null&&!p.dead&&!p.dashing&&!p.kb){const d=Math.hypot(p._authX-p.x,p._authY-p.y),tolerance=intent?Math.max(.35,(p.moveSpd||4)*.2):.02;if(d>tolerance){const k=Math.min(1,dt*8)*(d-tolerance)/Math.max(d,.001);move(p,(p._authX-p.x)*k,(p._authY-p.y)*k);}}
    for(const projectile of W.projs){projectile.x+=(projectile.vx||0)*dt;projectile.y+=(projectile.vy||0)*dt;}
    for(const u of W.units){u.anim.t+=dt;if(u!==p&&u._tx!=null){u.x+=(u._tx-u.x)*Math.min(1,dt*14);u.y+=(u._ty-u.y)*Math.min(1,dt*14);}if(u.flash>0)u.flash-=dt;}
    for(let i=W.timers.length-1;i>=0;i--){const t=W.timers[i];t.t-=dt;if(t.t<=0){W.timers.splice(i,1);t.fn();}}
    if(SW.ready&&!p.dead)for(const l of W.loots)if(U.d2(l.x,l.y,p.x,p.y)<=1.44&&performance.now()-(pickups.get(l.id)||-10000)>1500){pickups.set(l.id,performance.now());send({t:'online_pickup',id:l.id});}
    V.update(dt);return dt;};
  E.walkTo=(u,x,y,dt,stop=.15)=>{if(SW.active&&u===W.player){const destination={x,y},result=walk(u,x,y,dt,stop);intent=destination;return result;}return walk(u,x,y,dt,stop);};
  E.move=(u,dx,dy)=>{if(SW.active&&u===W.player){intent={x:U.clamp(u.x+dx*12,0,W.map.w-.1),y:U.clamp(u.y+dy*12,0,W.map.h-.1)};return move(u,dx,dy);}return move(u,dx,dy);};
  E.hit=(src,t,...args)=>{if(SW.active){if(SW.ready&&(src===W.player||src.owner===W.player)&&t?._worldId!=null)send({t:'online_action',action:'basic',target:t._worldId});return 0;}return hit(src,t,...args);};
  E.cast=(u,slot,aim)=>{if(!SW.active)return cast(u,slot,aim);if(!SW.ready||u!==W.player||!E.ready(u,slot))return false;const t=aim?aim.u:u.target;send({t:'online_action',action:'cast',slot,target:t?._worldId,x:aim?.x??t?.x??u.x,y:aim?.y??t?.y??u.y});u.gcd=.35;return true;};
  E.heal=(...args)=>{if(!SW.active)return heal(...args);};E.kill=(...args)=>{if(!SW.active)return kill(...args);};
  S.usePotion=(key,...args)=>{if(!SW.active)return potion(key,...args);if(SW.ready&&performance.now()-lastPotion>1000){lastPotion=performance.now();send({t:'online_action',action:'potion',key});}};
  const marketList=S.marketList,openNpc=UI.openNpc;
  S.marketList=()=>SW.active?structuredClone(S.save._onlineMarket?.items||[]):marketList();
  UI.openNpc=(npc,...args)=>{const result=openNpc(npc,...args);if(SW.active&&(npc.role||npc)==='market')SW.command('marketRefresh').then(()=>{if(UI.panel?.role==='market')UI.renderPanel();}).catch(e=>UI.toast(e.message,'bad'));return result;};
  const act=UI.act;
  UI.act=(el,e)=>{const action=el.dataset.act;if(NET.authed&&NET.features?.onlineAuthority===2&&['sl-delyes','sl-restore'].includes(action)){const slot=action==='sl-delyes'?UI._slAsk:UI._trash?.i,save=action==='sl-delyes'?S.slots()[slot]:UI._trash?.sv;if(save?._worldCharacter){NET.request({t:action==='sl-delyes'?'online_character_delete':'online_character_restore',character:save._worldCharacter}).then(()=>act(el,e)).catch(error=>UI.toast(error.message,'bad'));return;}}if(!SW.active)return act(el,e);const a=el.dataset.act,P=UI.panel||{},s=S.save,uid=el.dataset.uid||P.sel;
    if(a==='gm'||a?.startsWith('gm')||a==='wipe'||a==='sl-delyes'||a==='askwipe'){UI.toast('คำสั่งนี้ใช้ไม่ได้กับตัวละครออนไลน์','bad');return;}
    const direct={runepage:['page',[+el.dataset.i]],setpet:['pet',[el.dataset.k||null]],setmount:['mount',[el.dataset.k||null]],pk:['pk',[!s.pk]],'x-lock':['lock',[uid,!UI.findItem(uid)?.lock]],'vl-buy':['vaultBuy',[]],'vl-put':['vaultDeposit',[uid]],'vl-take':['vaultWithdraw',[uid]],'g2-buyd':['buyDiamond',[UI._g2q?.d||1]],'g2-buyt':['buyTicket',[UI._g2q?.t||1]],'g-pull':['gacha',[el.dataset.k,+el.dataset.n]],'g-mc':['gacha',['mc',+el.dataset.n]],stablebuy:['buyStable',[+el.dataset.i]],mbuy:['marketBuy',[uid]],msell:['marketSell',[uid]],siegebuy:['siegeBuy',[el.dataset.k]]};
    if(a==='vl-putall'||a==='vl-takeall'){const items=a==='vl-putall'?s.inv.filter(it=>!it.lock):(s.vault?.items||[]).slice(0,Math.max(0,S.invMax-s.inv.length));for(const item of items)command(a==='vl-putall'?'vaultDeposit':'vaultWithdraw',[item.uid]);return;}
    if(direct[a]){command(...direct[a]);return;}
    if(['x-sellsel','x-sellall','x-autosell','sellall'].includes(a)){const selected=s.inv.filter(it=>!it.lock&&(a==='x-sellall'||a==='x-autosell'||a==='sellall'?a!=='sellall'||it.tier<=2:(s.settings.sellT||[]).includes(it.tier)&&(s.settings.sellK||[]).includes(it.kind)));command('sellMany',[selected.map(it=>it.uid)]);return;}
    const result=act(el,e);if(a?.startsWith('set')||a==='x-autot'||a?.startsWith('so-'))command('settings',[s.settings]);return result;};
  setInterval(poll,500);
})(window.G);
