// Explicit server GM commands. Authorization is checked by the service before entering this module.
export function executeGM(world,record,command,input={}) {
 const {G}=world,{S,E,W,D,U}=G,p=world.members.get(record.id).unit,s=record.save,v=input.values||{},d=input.dataset||{},P=input.panel||{};
 const number=(value,min,max,fallback=min)=>{const n=Number(value??fallback);if(!Number.isFinite(n)||n<min||n>max)throw new Error('invalid_gm_value');return n;};
 const n=(key,min,max,fallback)=>number(v[key],min,max,fallback),tier=()=>n('gmtier',1,10,P.gt||10),ilv=()=>n('gmilv',1,100,v.gmilv2||P.gilv||100),count=()=>Math.floor(n('gmcount',1,50,P.gn||1));
 const add=it=>{if(!it||!S.addItem(it,true))throw new Error('inventory_full');};
 const mobs=()=>W.units.filter(u=>u.kind==='mob'&&!u.dead);
 const setClass=cls=>{if(!D.CLS[cls])throw new Error('invalid_class');S.changeClass(cls);};
 const currency=(key,amount)=>{if(!['gold','honor','war','runeDust','jewelDust','thread','diamond'].includes(key))throw new Error('invalid_currency');s[key]=number((s[key]||0)+amount,0,1e12);};
 const flags=record.gmFlags ||= {};
 switch(command){
  case 'flag':{const key=d.k;if(!['god','oneHit','noCd','allSkills','allRunes','allSlots','invis','ai','freeze','debug'].includes(key)||typeof input.enabled!=='boolean')throw new Error('invalid_gm_flag');if(['ai','freeze','debug'].includes(key))W.gm[key]=input.enabled;else flags[key]=input.enabled;if(key==='noCd'&&input.enabled){p.cds.fill(0);p.gcd=0;}break;}
  case 'setlv':S.setLevel(Math.floor(n('gmlv',1,D.MAX_LV,1)));break;
  case 'maxlv':S.setLevel(D.MAX_LV);break;
  case 'setcls':setClass(v.gmcls);break;
  case 'gmcls':setClass(d.cls);break;
  case 'cur':currency(d.k,n('gmamt',-1e9,1e9,0));break;
  case 'dia':currency('diamond',1000);break;
  case 'tix':s.gacha.tix=number((s.gacha.tix||0)+100,0,1e9);break;
  case 'reroll':s.bag.reroll=(s.bag.reroll||0)+50;break;
  case 'stones':s.bag.stones=s.bag.stones.map(q=>q+50);break;
  case 'cons':for(const key of ['hpPot','mpPot','ret','foodXp','foodDrop','protect','reforge'])s.bag[key]=(s.bag[key]||0)+50;break;
  case 'pets':s.pets=D.PETS.map(x=>x.k);s.mounts=D.MOUNTS.map(x=>x.k);break;
  case 'ach':for(const a of D.ACHIEVEMENTS)S.ach(a.id);break;
  case 'infamy0':s.infamy=0;p.red=false;break;
  case 'heal':p.hp=p.maxhp;p.res=p.resMax;p.cds.fill(0);p.gcd=0;p.dead=false;p.deadT=0;break;
  case 'tp':{const x=number(input.point?.[0],0,W.map.w-.01),y=number(input.point?.[1],0,W.map.h-.01);if(E.blocked(x,y))throw new Error('blocked_destination');p.x=x;p.y=y;world.members.get(record.id).move=null;break;}
  case 'pspd':flags.pspd=n('gmxps',.2,5,1);break;
  case 'give':{if(!['gear','acc','relic','rune','gem','fashion'].includes(v.gmkind))throw new Error('invalid_item_kind');for(let i=0;i<count();i++)add(S.genItem(v.gmkind,tier(),ilv(),{slot:v.gmslot||undefined,set:v.gmset||undefined,pvp:true}));break;}
  case 'gmcat':for(let i=0;i<count();i++)add(S.genCatalog(String(d.k),tier(),ilv(),{pvp:true,theme:number(P.gth,0,D.FASHION_THEMES.length-1,0)}));break;
  case 'gmgive':{
   const key=String(d.k),cat=P.gcat,t=Math.floor(number(P.gt,1,10,10)),level=ilv(),qty=count();
   if(cat==='cur'){const amount={gold:1e6,honor:1e4,war:1e4,runeDust:1e4,jewelDust:1e4,thread:1e4,diamond:1000};if(!amount[key])throw new Error('invalid_currency');currency(key,amount[key]*qty);break;}
   if(cat==='cons'){if(!Object.hasOwn(s.bag,key)||typeof s.bag[key]!=='number')throw new Error('invalid_consumable');s.bag[key]+=qty*10;break;}
   if(cat==='stone'){const i=Math.floor(number(key,0,s.bag.stones.length-1));s.bag.stones[i]+=qty*10;break;}
   if(cat==='pet'||cat==='mount'){const catalogue=cat==='pet'?D.PETS:D.MOUNTS;if(!catalogue.some(x=>x.k===key))throw new Error('invalid_companion');const owned=cat==='pet'?s.pets:s.mounts;if(!owned.includes(key))owned.push(key);break;}
   if(cat==='srune'){if(!/^\d+_[123]$/.test(key)||+key.split('_')[0]>=D.NSK-1)throw new Error('invalid_skill_rune');s.ownedSR[s.cls+'_'+key]=true;break;}
   for(let i=0;i<qty;i++){
    let item;if(cat==='weapon'){const cls=D.CLASSES.find(c=>c.weapon===key);if(!cls)throw new Error('invalid_weapon');item=S.genItem('gear',t,level,{slot:'weapon',cls:cls.id,pvp:true});item.wpn=key;}
    else if(cat==='armor'||cat==='acc'){const slots=cat==='armor'?D.GEAR_SLOTS:D.ACC_SLOTS;if(!slots.some(x=>x.k===key))throw new Error('invalid_slot');item=S.genItem(cat==='armor'?'gear':'acc',t,level,{slot:key,pvp:true});}
    else if(cat==='relic'){if(!D.RELICS.some(x=>x.k===key))throw new Error('invalid_relic');item=S.genItem('relic',t,level,{relic:key});}
    else if(cat==='gem'){if(!D.GEMS.some(x=>x.k===key))throw new Error('invalid_gem');item=S.genItem('gem',t,level,{gem:key});}
    else if(cat==='rune'){if(!['red','blue','green',...D.CORE_RUNES.map(x=>x.k)].includes(key))throw new Error('invalid_rune');item=S.genItem('rune',t,level,{color:['red','blue','green'].includes(key)?key:'core',core:key,pvp:true});}
    else if(cat==='fashion'){if(!D.FASHION_SLOTS.some(x=>x.k===key))throw new Error('invalid_slot');item=S.genItem('fashion',10,1,{slot:key,theme:number(P.gth,0,D.FASHION_THEMES.length-1,0)});}
    else throw new Error('invalid_catalogue');add(item);
   }break;
  }
  case 'kit':case 'kit2':case 'allmax':{
   if(s.inv.length+new Set(Object.values(s.eq).filter(Boolean).map(it=>it.uid)).size>S.invMax)throw new Error('inventory_full');
   if(command==='allmax'){S.setLevel(D.MAX_LV);currency('gold',1e8);currency('diamond',1e5);}
   S.gmBestKit(command==='kit2'?12:8);
   break;
  }
  case 'autons':S.gmAutoNoSet();break;
  case 'runekit':s.runeBoard[s.page]=D.RUNE_BOARD.map(r=>S.genItem('rune',tier(),100,{color:r.c}));break;
  case 'fashkit':for(const f of D.FASHION_SLOTS){const it=S.genItem('fashion',10,1,{slot:f.k,theme:0});s.fashion.owned.push(it);s.fashion.eq[f.k]=it;}break;
  case 'gmsrall':for(let i=0;i<D.NSK-1;i++)for(let variant=1;variant<=3;variant++)s.ownedSR[s.cls+'_'+i+'_'+variant]=true;break;
  case 'gems':for(const gem of D.GEMS)add(S.genItem('gem',tier(),ilv(),{gem:gem.k}));break;
  case 'clearinv':s.inv=[];break;
  case 'dropground':for(let t=1;t<=10;t++)S.dropLoot(p.x+Math.cos(t)*2,p.y+Math.sin(t)*2,S.genItem('gear',t,t*10));break;
  case 'spawn':{if(!W.mode.spawnGrade)throw new Error('farm_required');if(!['normal','elite','champion','rare','boss','world'].includes(d.g))throw new Error('invalid_monster_grade');if(d.g==='normal'||d.g==='elite')E.spawn(S.mkMob(U.pick(W.mode.def.mobs),W.mode.lvlFor(d.g),d.g,p.x+2,p.y,{}));else W.mode.spawnGrade(d.g,{x:p.x+3,y:p.y});break;}
  case 'spawnMonster':{
   const catalogue=[],seen=new Set(),push=(md,grade)=>{if(!md||seen.has(md.n+'|'+grade))return;seen.add(md.n+'|'+grade);catalogue.push({md,grade});};
   for(const map of D.FARM_MAPS){for(const md of map.mobs)push(md,'normal');for(const key of ['champ','rare','boss','world'])push(map[key],key==='champ'?'champion':key);}
   for(const id of D.WORLD_BOSSES||[])push(D.BOSS_MD(id),'world');const entry=catalogue[Math.floor(number(d.i,0,catalogue.length-1))],qty=Math.floor(n('gmxn',1,30,1)),level=Math.floor(n('gmxlv',1,D.MAX_LV,s.lvl));
   if(mobs().length+qty>600)throw new Error('monster_capacity');for(let i=0;i<qty;i++){const point=S.freePt(W.map,p.x+Math.cos(i*2.4)*3,p.y+Math.sin(i*2.4)*3);const u=E.spawn(S.mkMob(entry.md,level,entry.grade==='normal'&&v.gmxel?'elite':entry.grade,point.x,point.y,{leash:40}));u._gmDummy=!!v.gmxdm;if(v.gmxal){u.team=p.team;u.owner=p;u.isMerc=true;} }break;
  }
  case 'mfreeze':W.gm.freeze=!W.gm.freeze;break;
  case 'mheal':for(const u of mobs())u.hp=u.maxhp;break;
  case 'mpull':for(const u of mobs()){const point=S.freePt(W.map,p.x+U.rf(-3,3),p.y+U.rf(-3,3));u.x=point.x;u.y=point.y;}break;
  case 'mclear':for(const u of mobs())u.dead=true;W.units=W.units.filter(u=>u.kind!=='mob');break;
  case 'mkill':case 'dgclear':for(const u of mobs())if(E.isEnemy(p,u)){u.hp=0;E.kill(u,p);}break;
  case 'killall':for(const u of [...W.units])if(!u.dead&&u.kind!=='npc'&&E.isEnemy(p,u)){u.hp=0;E.kill(u,p);}break;
  case 'rates':W.gm.speed=n('gmspeed',.1,3,1);W.gm.time=n('gmtime',.1,10,1);W.gm.drop=n('gmdrop',0,100,1);W.gm.xp=n('gmxp',0,100,1);break;
  case 'announce':G.UI.announce('ประกาศจาก GM',String(v.gmmsg||'').slice(0,200));break;
  case 'wbnow':{if(W.mode.kind!=='wbarena')throw new Error('world_boss_arena_required');const id=v.wbsel||D.WORLD_BOSSES[0];if(!D.WORLD_BOSSES.includes(id))throw new Error('invalid_boss');if(W.mode.boss){W.mode.boss.dead=true;W.mode.boss.hp=0;}W.mode.spawnBoss(id);break;}
  case 'dgunlock':for(const dg of D.DUNGEONS){const state=s.dungeons[dg.id] ||= {best:0,cp:0,daily:{date:'',runs:0}};state.best=100;state.cp=90;}break;
  case 'dgdaily':for(const state of Object.values(s.dungeons))state.daily={date:'',runs:0};break;
  case 'pvpwin':case 'pvplose':{const winner=command==='pvpwin'?p.team:1-p.team;if(W.mode.kind==='pvp')W.mode.finish(winner);else if(W.mode.kind==='siege')W.mode.endWar(winner);else throw new Error('match_required');break;}
  case 'score':if(W.mode.score)W.mode.score[p.team]+=10;else throw new Error('match_required');break;
  case 'prep':if(W.mode.kind!=='siege')throw new Error('siege_required');W.mode.prepT=0;break;
  case 'skset':case 'skreset':{const cls=D.CLS[P.gc],slot=Math.floor(number(P.gs,0,D.NSK-2,0));if(!cls)throw new Error('invalid_class');const skill=cls.skills[slot];if(command==='skreset')Object.assign(skill,structuredClone(skill.base));else{for(const key of ['p','c','r','R','n','d','v'])skill[key]=n('gs'+key,0,key==='p'?1000:100,skill[key]||0);skill.n=Math.max(1,Math.floor(skill.n));skill.cc={};for(const token of String(v.gscc||'').slice(0,100).split(/\s+/)){const match=token.match(/^([a-z]+)([\d.]+)$/);if(match&&D.CC_TH[match[1]])skill.cc[match[1]]=number(match[2],0,60);}skill.dmg=!!D.ARCH[skill.arch].dmg&&skill.p>0;}W.gm.skillOverrides ||= {};W.gm.skillOverrides[P.gc+':'+slot]=structuredClone(skill);W.gm.rulesVersion=(W.gm.rulesVersion||0)+1;break;}
  default:throw new Error('unsupported_server_gm_command');
 }
 world.sync(record.id);return {ok:true,msg:'GM: บันทึกคำสั่งบนเซิร์ฟเวอร์แล้ว',gm:Object.fromEntries(Object.entries(W.gm).filter(([,value])=>typeof value==='boolean'||typeof value==='number')),flags};
}
