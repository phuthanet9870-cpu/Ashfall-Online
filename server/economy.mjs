import {clone} from './headless.mjs';
const integer=(n,min,max)=>{if(!Number.isSafeInteger(n)||n<min||n>max)throw new Error('invalid_amount');return n;};
export function allItems(s){return [...(s.inv||[]),...Object.values(s.eq||{}),...(s.runeBoard||[]).flat(),...(s.fashion?.owned||[]),...Object.values(s.fashion?.eq||{}),...(s.vault?.items||[])].filter(Boolean);}
export function executeEconomy(G,record,command,args=[]) {
  const {S,W,D}=G,s=record.save;
  if(command==='changeClass'&&W.mode?.pvp)throw new Error('class_change_in_match');S.save=s;
  if(!Array.isArray(args)||args.length>8)throw new Error('invalid_arguments');
  function item(token,where='owned'){
    const uid=typeof token==='string'?token:token?.$item;
    const pool=where==='inv'?s.inv:where==='fashion'?s.fashion.owned:allItems(s);
    const it=pool.find(it=>it.uid===uid);if(!it)throw new Error('item_not_owned');return it;
  }
  const ownedUnlocked=(token,where)=>{const it=item(token,where);if(it.lock)throw new Error('item_locked');return it;};
  const itemMethods=new Set(['enchant','refine','reforge','unsocket','runeUpgrade','dye','drillSocket','rerollMain','rerollOptions']);
  let result;
  if(itemMethods.has(command)){
    args=[item(args[0]),...args.slice(1)];if(command==='runeUpgrade'&&args[0].kind!=='rune')throw new Error('not_rune');if(['reforge','unsocket'].includes(command))integer(args[1],0,Math.max(0,(command==='unsocket'?args[0].sockets:args[0].subs)?.length-1));
    if(command==='dye'&&!/^#[a-f0-9]{6}$/i.test(args[1]))throw new Error('invalid_color');
    result=S[command](...args);
  }else switch(command){
    case 'equip':{const it=ownedUnlocked(args[0],'inv');if(!S.isEquip(it))throw new Error('not_equipment');result=S.equip(it);break;}
    case 'unequip':if(!Object.hasOwn(s.eq,args[0]))throw new Error('empty_slot');result=S.unequip(args[0]);break;
    case 'sell':case 'salvage':result=S[command](ownedUnlocked(args[0],'inv'),false);break;
    case 'sellMany':{if(!Array.isArray(args[0])||args[0].length>1000||new Set(args[0]).size!==args[0].length)throw new Error('invalid_items');for(const uid of args[0])S.sell(ownedUnlocked(uid,'inv'),false);result=true;break;}
    case 'lock':{const it=item(args[0]);it.lock=!!args[1];result=true;break;}
    case 'fusion':{if(!Array.isArray(args[0])||args[0].length!==3||new Set(args[0]).size!==3)throw new Error('invalid_items');result=S.fusion(args[0].map(uid=>ownedUnlocked(uid,'inv')));break;}
    case 'socket':{const target=item(args[0]),gem=ownedUnlocked(args[1],'inv');if(gem.kind!=='gem')throw new Error('not_gem');result=S.socket(target,gem);break;}
    case 'runeEquip':{const it=ownedUnlocked(args[0],'inv');if(it.kind!=='rune')throw new Error('not_rune');integer(args[1],0,D.RUNE_BOARD.length-1);result=S.runeEquip(it,args[1]);break;}
    case 'runeRemove':integer(args[0],0,D.RUNE_BOARD.length-1);result=S.runeRemove(args[0]);break;
    case 'setSkillRune':integer(args[0],0,D.NSK-1);integer(args[1],0,3);result=S.setSkillRune(...args);break;
    case 'fashionEquip':result=S.fashionEquip(item(args[0],'fashion'));break;
    case 'fashionRemove':if(!D.FASHION_SLOTS.some(x=>x.k===args[0]))throw new Error('invalid_slot');result=S.fashionRemove(args[0]);break;
    case 'fashionSellDia':case 'fashionDrop':result=S[command](ownedUnlocked(args[0],'fashion'));break;
    case 'openPack':{const it=ownedUnlocked(args[0],'inv');if(it.kind!=='fpack')throw new Error('not_pack');result=S.openPack(it);break;}
    case 'buy':{const entry=S.SHOP[integer(args[0],0,S.SHOP.length-1)],n=integer(args[1]??1,1,1000);result=S.buy(entry,n);break;}
    case 'buyFrom':{const entries=args[0]==='honor'?S.honorShop():args[0]==='war'?S.warShop():null;if(!entries)throw new Error('invalid_shop');result=S.buyFrom(entries[integer(args[1],0,entries.length-1)]);break;}
    case 'marketRefresh':{const period=Math.floor(Date.now()/600000);if(s._onlineMarket?.period!==period)s._onlineMarket={period,items:S.marketList()};result=true;break;}
    case 'marketBuy':{const market=s._onlineMarket;if(!market||market.period!==Math.floor(Date.now()/600000))throw new Error('market_expired');const index=market.items.findIndex(it=>it.uid===args[0]);if(index<0)throw new Error('listing_not_found');const listing=market.items[index],it=clone(listing);if(s.gold<listing.price)throw new Error('insufficient_gold');delete it.price;delete it.seller;if(!S.addItem(it,true))throw new Error('inventory_full');s.gold-=listing.price;market.items.splice(index,1);result=true;break;}
    case 'marketSell':result=S.sell(ownedUnlocked(args[0],'inv'),true);break;
    case 'buyStable':{const e=S.STABLE[integer(args[0],0,S.STABLE.length-1)];if(s.gold<(e.price||0)||s.honor<(e.honor||0))throw new Error('insufficient_currency');const owned=e.type==='pet'?s.pets:s.mounts;if(owned.includes(e.k))throw new Error('already_owned');s.gold-=e.price||0;s.honor-=e.honor||0;owned.push(e.k);result=true;break;}
    case 'pet':case 'mount':{const owned=command==='pet'?s.pets:s.mounts;if(args[0]!==null&&!owned.includes(args[0]))throw new Error('not_owned');s[command]=args[0];result=true;break;}
    case 'useFood':if(!['foodXp','foodDrop'].includes(args[0])||(s.bag[args[0]]||0)<1)throw new Error('not_owned');result=S.useFood(args[0]);break;
    case 'changeClass':if(!D.CLS[args[0]])throw new Error('invalid_class');result=S.changeClass(args[0]);break;
    case 'page':s.page=integer(args[0],0,s.runeBoard.length-1);result=true;break;
    case 'vaultDeposit':{const it=ownedUnlocked(args[0],'inv');s.vault ||= {cap:100,items:[]};if(s.vault.items.length>=s.vault.cap)throw new Error('vault_full');s.inv.splice(s.inv.indexOf(it),1);s.vault.items.push(it);result=true;break;}
    case 'vaultWithdraw':{s.vault ||= {cap:100,items:[]};const i=s.vault.items.findIndex(it=>it.uid===args[0]);if(i<0)throw new Error('item_not_owned');if(s.inv.length>=S.invMax)throw new Error('inventory_full');s.inv.push(s.vault.items.splice(i,1)[0]);result=true;break;}
    case 'buyDiamond':case 'buyTicket':integer(args[0],1,1000);result=S[command](args[0]);break;
    case 'gacha':{
      const kind=args[0],n=integer(args[1],1,10);s.gacha ||= {tix:0,pity:{}};if((s.gacha.tix||0)<n)throw new Error('insufficient_tickets');if(!['pet','fashion','cset','wings','mc'].includes(kind))throw new Error('invalid_box');
      s.gacha.tix-=n;const rolls=[];
      for(let i=0;i<n;i++){
        if(kind!=='mc'){rolls.push(S.pullGacha(kind));continue;}
        const pity=s.gacha.pity.mc=(s.gacha.pity.mc||0)+1,ri=S.rollGachaRarity(pity>=30?3:pity%10===0?2:0),r=S.GACHA_RAR[ri];if(ri>=3)s.gacha.pity.mc=0;
        const it=S.genItem('fashion',r.t,1,{slot:G.U.pick(['f_mcf','f_mch','f_mcb'])});S.addItem(it,true);rolls.push({r,n:it.name,it});
      }
      result={ok:true,msg:rolls.map(r=>r.n).join(', '),rolls};break;
    }
    case 'settings':{
      const values=args[0];if(!values||typeof values!=='object')throw new Error('invalid_settings');
      const safe=(v,depth=0)=>{if(depth>4)return undefined;if(typeof v==='boolean'||typeof v==='string'&&v.length<200||typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<1e7)return v;if(Array.isArray(v)&&v.length<=100)return v.map(x=>safe(x,depth+1)).filter(x=>x!==undefined);if(v&&typeof v==='object'){const o={};for(const[k,x]of Object.entries(v).slice(0,100))if(!/gm|god|cheat|oneHit|wbMin|wbBots|wbParty|wbForce|__proto__|constructor|prototype/i.test(k)){const value=safe(x,depth+1);if(value!==undefined)o[k]=value;}return o;}return undefined;};
      Object.assign(s.settings,safe(values));result=true;break;
    }
    case 'pk':s.pk=!!args[0];result=true;break;
    case 'fashionWearTheme':integer(args[0],0,D.FASHION_THEMES.length-1);result=S.fashionWearTheme(args[0]);break;
    case 'wearSet':{const key=String(args[0]||'');const candidates=s.inv.filter(it=>it.set===key&&(!it.clsOnly||it.clsOnly===s.cls));for(const slot of D.GEAR_SLOTS){const best=candidates.filter(it=>it.slot===slot.k).sort((a,b)=>b.tier-a.tier||b.ilv-a.ilv)[0];if(best)S.equip(best);}result=true;break;}
    case 'autoEquip':case 'fashionBest':case 'craftFashion':case 'vaultBuy':result=S[command]();break;
    default:throw new Error('unsupported_command');
  }
  if(typeof result==='string')throw new Error(result);
  for(const key of ['gold','honor','war','diamond','thread','jewelDust','runeDust'])if(s[key]!==undefined&&(!Number.isFinite(s[key])||s[key]<0))throw new Error('invalid_balance');
  return result===undefined?true:clone(result);
}
