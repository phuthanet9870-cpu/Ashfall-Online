'use strict';
(function(G){
  const NET=window.ASHFALL_NET;if(!NET)return;const{UI,S,W}=G,esc=UI.esc;let trade=null;
  const send=(t,extra={})=>NET.send({t,trade:trade?.id,version:trade?.version,...extra});
  NET.on('online_trade',m=>{trade=m.trade;UI.onlineTrade=trade;if(trade.status==='invited'){if(trade.me===1)UI.modal(`<h2>คำขอเทรด</h2><p>${esc(trade.names[0])} ขอเทรดกับคุณ</p><button class="btn primary" data-act="ot-accept">ยอมรับ</button><button class="btn" data-act="ot-cancel">ปฏิเสธ</button>`);else UI.toast('ส่งคำขอเทรดแล้ว','info');}
    else if(trade.status==='open'){UI.closeModal();if(UI.panel?.id!=='trade')UI.openPanel('trade');else UI.renderPanel();}
    else {UI.toast(trade.status==='complete'?'เทรดสำเร็จ บันทึกของและทองทั้งสองฝ่ายแล้ว':'การเทรดสิ้นสุด: '+trade.status,trade.status==='complete'?'good':'info');trade=null;if(UI.panel?.id==='trade')UI.renderPanel();}});
  UI.PANELS.trade={title:'เทรดกับผู้เล่นออนไลน์',render(){
    if(!G.SHARED_WORLD?.ready)return '<p>กรุณาเชื่อมต่อโลกออนไลน์ก่อน</p>';
    if(!trade||trade.status!=='open')return `<p>เทรดกับผู้เล่นจริงในเมือง ข้อเสนอที่แก้ไขจะยกเลิกการล็อกและการยืนยันเดิม</p>${W.units.filter(u=>u.pid&&u.pid!==G.SHARED_WORLD.playerId).map(u=>`<div class="list"><b>${esc(u.name)}</b><button class="btn" data-act="ot-request" data-id="${esc(u.pid)}">ขอเทรด</button></div>`).join('')||'<p>ไม่มีผู้เล่นอื่นอยู่ใกล้</p>'}`;
    const me=trade.me,offer=trade.offers[me],other=trade.offers[1-me];
    const cards=(items,own)=>items.map(it=>`<button class="btn" ${own?`data-act="ot-remove" data-uid="${esc(it.uid)}"`:''}>${esc(it.name||it.kind)} T${it.tier||1}</button>`).join('');
    return `<div class="tradepage"><div><h3>${esc(trade.names[me])} (คุณ)</h3>${cards(offer.details||[],true)}<label>ทองที่เสนอ <input id="online-trade-gold" type="number" min="0" value="${offer.gold}" ${trade.locked[me]?'disabled':''}></label><button class="btn" data-act="ot-gold">แก้ไขทอง</button><p>มี ${S.save.gold} ทอง · ${trade.locked[me]?'ล็อกแล้ว':'ยังไม่ล็อก'}</p></div><div><h3>${esc(trade.names[1-me])}</h3>${cards(other.details||[],false)}<p>ทอง ${other.gold} · ${trade.locked[1-me]?'ล็อกแล้ว':'ยังไม่ล็อก'}</p></div></div><div class="list"><button class="btn" data-act="ot-lock">ล็อกข้อเสนอ</button><button class="btn primary" data-act="ot-confirm" ${trade.locked.every(Boolean)&&!trade.confirmed[me]?'':'disabled'}>${trade.confirmed[me]?'ยืนยันแล้ว รออีกฝ่าย':'ยืนยันเทรด'}</button><button class="btn" data-act="ot-cancel">ยกเลิก</button></div><h4>ของในกระเป๋าที่เสนอได้</h4>${S.save.inv.filter(it=>!it.lock&&!offer.items.includes(it.uid)).slice(0,300).map(it=>`<button class="btn" data-act="ot-add" data-uid="${esc(it.uid)}">${esc(it.name||it.kind)}</button>`).join('')}`;
  }};
  const oldStart=UI.startTrade;UI.startTrade=(u,...args)=>{if(G.SHARED_WORLD?.active){if(!u?.pid)return UI.toast('เลือกผู้เล่นออนไลน์จริง','bad');NET.send({t:'online_trade_request',target:u.pid});return;}return oldStart(u,...args);};
  const open=UI.openNpc;UI.openNpc=u=>{if(G.SHARED_WORLD?.active&&u?.pid){UI.modal(`<h2>${esc(u.name)}</h2><button class="btn" data-act="ot-request" data-id="${esc(u.pid)}">ขอเทรด</button>`);return;}return open(u);};
  const act=UI.act;UI.act=(el,e)=>{const a=el.dataset.act;if(!a?.startsWith('ot-'))return act(el,e);if(a==='ot-request'){NET.send({t:'online_trade_request',target:el.dataset.id});UI.closeModal();return;}if(!trade)return;
    if(a==='ot-cancel')return send('online_trade_cancel');if(a==='ot-accept')return send('online_trade_accept');if(a==='ot-lock')return send('online_trade_lock');if(a==='ot-confirm')return send('online_trade_confirm');
    const offer=trade.offers[trade.me];let items=[...offer.items],gold=offer.gold;
    if(a==='ot-add'&&items.length<8)items.push(el.dataset.uid);if(a==='ot-remove')items=items.filter(uid=>uid!==el.dataset.uid);if(a==='ot-gold')gold=Number(document.getElementById('online-trade-gold')?.value||0);
    send('online_trade_offer',{items,gold});
  };
})(window.G);
