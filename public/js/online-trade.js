'use strict';
// Transport adapter for the original trade window in trade.js. It does not replace its panels or markup.
(function(G){
 const NET=window.ASHFALL_NET;if(!NET)return;const{UI,S,W}=G;let trade=null,invitation=null,queue=Promise.resolve();
 const nativeStart=UI.startTrade,nativeRequest=UI.tradeRequest,nativeAct=UI.act;
 const ownItems=()=>S.save.inv.concat(S.save.fashion?.owned||[]);
 const peer=(state,index)=>{const profile=state.profiles?.[index]||{},unit=W.units.find(u=>u.pid===state.players[index]);return unit||{pid:state.players[index],name:state.names[index],cls:profile.cls||'blademaster',lvl:profile.lvl||1};};
 function project(){
  if(!trade||trade.status!=='open')return;const me=trade.me,other=1-me,u=peer(trade,other),T=S.traderOf(u),offer=trade.offers[me];
  const mine=offer.items.map(uid=>ownItems().find(it=>it.uid===uid)||offer.details?.find(it=>it.uid===uid)).filter(Boolean);
  const X=UI.trade?.online&&UI.trade.id===trade.id?UI.trade:{};
  Object.assign(X,{online:true,id:trade.id,u,T,me:{items:mine,gold:offer.gold},them:{items:trade.offers[other].details||[],gold:trade.offers[other].gold},myLock:trade.locked[me],theirLock:trade.locked[other],myConfirmed:trade.confirmed[me],log:[]});
  X.msg=trade.message||(X.myConfirmed?'ยืนยันแล้ว กำลังรออีกฝ่าย':X.myLock&&X.theirLock?'ทั้งสองฝ่ายล็อกแล้ว กดยืนยันได้เลย':X.myLock?'ล็อกแล้ว กำลังรออีกฝ่าย':'เลือกไอเทมหรือทองที่คุณต้องการเสนอ');UI.trade=X;
 }
 function render(){if(UI.panel?.id!=='trade')return;const gold=document.activeElement?.id==='tgme'?document.activeElement.value:null;UI.renderPanel();if(gold!==null){const input=document.getElementById('tgme');if(input&&!input.disabled){input.value=gold;input.focus();}}}
 NET.on('online_trade',m=>{
  trade=m.trade;UI.onlineTrade=trade;
  if(trade.status==='invited'){if(trade.me===1){invitation=trade;nativeRequest(peer(trade,0),true);}else UI.toast('ส่งคำขอเทรดแล้ว','info');return;}
  if(trade.status==='open'){invitation=null;UI.closeModal();project();if(UI.panel?.id!=='trade')UI.openPanel('trade','deal');else render();return;}
  const completed=trade.status==='complete',name=trade.names?.[1-trade.me]||UI.trade?.T?.name||'ผู้เล่น';trade=null;invitation=null;UI.onlineTrade=null;UI.trade=null;UI.closeModal();UI.toast(completed?`เทรดกับ ${name} สำเร็จ`:'ยกเลิกการเทรดแล้ว',completed?'good':'info');if(UI.panel?.id==='trade'){UI.panel.tab=completed?'hist':'near';UI.renderPanel();}
 });
 NET.on('close',()=>{if(invitation)UI.closeModal();if(UI.trade?.online&&UI.panel?.id==='trade')UI.closePanel();trade=null;invitation=null;UI.trade=null;UI.onlineTrade=null;queue=Promise.resolve();});
 NET.on('online_character',()=>{if(trade?.status==='open'){project();render();}});
 const command=(t,change)=>{const expected=trade?.id;queue=queue.catch(()=>{}).then(async()=>{if(!trade||trade.id!==expected||trade.status!=='open')return;const extra=change?change(trade.offers[trade.me]):{};if(extra===null)return;return NET.request({t,trade:trade.id,version:trade.version,...extra});}).catch(e=>UI.toast(e.message,'bad'));return queue;};
 UI.onlineTradeAfter=()=>{const input=document.getElementById('tgme');if(input)input.onchange=()=>{const gold=Math.max(0,Math.min(S.save.gold,Math.floor(Number(input.value)||0)));command('online_trade_offer',offer=>({items:[...offer.items],gold}));};};
 UI.startTrade=(u,...args)=>{if(!G.SHARED_WORLD?.active)return nativeStart(u,...args);if(!G.SHARED_WORLD.ready||W.mode?.kind!=='town')return UI.toast('เทรดได้เฉพาะในเมือง','bad');if(!u?.pid)return UI.toast('เลือกผู้เล่นที่อยู่ในเมืองเดียวกัน','bad');NET.send({t:'online_trade_request',target:u.pid});};
 UI.act=(el,e)=>{
  const a=el.dataset.act;if(!G.SHARED_WORLD?.active||!a?.startsWith('t-'))return nativeAct(el,e);
  if(a==='t-open'){const u=W.units.find(u=>u.id===+el.dataset.id);if(u)UI.startTrade(u);return;}
  if(a==='t-reqyes'){UI.closeModal();if(invitation)NET.send({t:'online_trade_accept',trade:invitation.id});else if(UI._treq)UI.startTrade(UI._treq);return;}
  if(a==='t-reqno'){UI.closeModal();if(invitation)NET.send({t:'online_trade_cancel',trade:invitation.id});invitation=null;return;}
  if(a==='t-cancel'){if(trade)NET.send({t:'online_trade_cancel',trade:trade.id});UI.closePanel();return;}
  if(!trade||trade.status!=='open')return;
  if(a==='t-lock'){if(!trade.offers.some(offer=>offer.items.length||offer.gold)){UI.trade.msg='ยังไม่มีข้อเสนอเลย';UI.renderPanel();return;}return command('online_trade_lock');}if(a==='t-unlock')return command('online_trade_unlock');if(a==='t-confirm')return command('online_trade_confirm');if(a==='t-ask')return command('online_trade_suggest');
  if(a==='t-add'||a==='t-rm'){
   if(el.dataset.who!=='me')return UI.toast('อีกฝ่ายเป็นผู้แก้ข้อเสนอของตนเอง','info');
   const remove=a==='t-rm',uid=remove?UI.trade.me.items[+el.dataset.i]?.uid:el.dataset.uid;
   return command('online_trade_offer',offer=>{if(trade.locked[trade.me])return null;const items=remove?offer.items.filter(id=>id!==uid):[...new Set([...offer.items,uid])];if(items.length>8){UI.toast('ใส่ได้สูงสุด 8 ชิ้น','bad');return null;}return {items,gold:offer.gold};});
  }
 };
})(window.G);
