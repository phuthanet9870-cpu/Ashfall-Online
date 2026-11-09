import {createHeadless,clone} from './headless.mjs';
import {documents} from './durable-docs.mjs';
const validId=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{8,64}$/.test(x);
export function createCharacters(storage) {
  const docs=documents(storage),cache=new Map(),rules=createHeadless();
  const key=id=>'character:v2:'+id;
  async function open(account,character,legacy,profile={}) {
    if(!validId(character))throw new Error('invalid_character');
    const id=account+':'+character;
    if(cache.has(id)){if(cache.get(id).deletedAt)throw new Error('character_deleted');return cache.get(id);}
    let record=await docs.read(key(id));
    if(record?.deletedAt)throw new Error('character_deleted');
    if(!record){
      const claim=await docs.read('migration-claim:'+character);if(legacy&&claim&&claim.account!==account)throw new Error('legacy_already_migrated');
      const base=rules.S.newSave(profile.name||'ผู้เล่น',rules.D.CLS[profile.cls]?profile.cls:'blademaster');
      let save=base;
      if(legacy){
        if(JSON.stringify(legacy).length>1500000)throw new Error('save_too_large');
        if(!rules.D.CLS[legacy.cls]||!Array.isArray(legacy.inv)||legacy.inv.length>1000)throw new Error('invalid_legacy_save');
        save={...base,...clone(legacy),bag:{...base.bag,...clone(legacy.bag||{})},settings:{...base.settings,...clone(legacy.settings||{})}};
        for(const k of ['gold','honor','war','runeDust','jewelDust','thread','xp'])if(!Number.isFinite(save[k])||save[k]<0||save[k]>1e12)throw new Error('invalid_legacy_currency');
        save.lvl=Math.max(1,Math.min(250,save.lvl|0));
      }
      save._worldCharacter=character;delete save._worldReceipts;delete save._onlineMarket;
      record={id,account,character,revision:1,save,commands:[],created:Date.now(),legacyImported:!!legacy};
      await docs.commit([[key(id),record],...(legacy?[['migration-claim:'+character,{account,character,at:Date.now()}]]:[])]);
    }
    cache.set(id,record);return record;
  }
  async function persist(records,extra=[]) {await docs.commit([...records.map(r=>[key(r.id),r]),...extra]);}
  async function list(account){const index=await docs.read('character-index:'+account)||[];const result=[];for(const id of index){const r=await docs.read(key(account+':'+id));if(r&&!r.deletedAt)result.push({character:id,name:r.save.name,cls:r.save.cls,lvl:r.save.lvl,revision:r.revision,save:r.save});}return result;}
  async function register(r){const k='character-index:'+r.account, ids=await docs.read(k)||[];if(!ids.includes(r.character)){if(ids.length>=6)throw new Error('character_slot_limit');ids.push(r.character);await docs.commit([[k,ids]]);}}
  return {open,persist,list,register,cache,docs,rules,key,validId};
}
