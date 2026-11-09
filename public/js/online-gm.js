'use strict';
(function(G){
 const {S,W,UI}=G,NET=window.ASHFALL_NET,SW=G.SHARED_WORLD;if(!NET||!SW||!G.GMX)return;
 const unlock=G.GMX.unlock,lock=G.GMX.lock,gmCmd=UI.gmCmd,act=UI.act;let queue=Promise.resolve();
 G.GMX.unlock=()=>{if(!SW.active)return unlock();return NET.request({t:'online_gm_unlock',code:'gmadmin2008'}).then(()=>{SW.gm=true;unlock();UI.toast('เปิด GM บนเซิร์ฟเวอร์แล้ว','good');}).catch(e=>UI.toast(e.message,'bad'));};
 NET.on('online_ready',m=>{SW.gm=!!m.gm;if(!SW.gm)lock();});NET.on('close',()=>{SW.gm=false;lock();});
 const capture=()=>{const values={};for(const el of document.querySelectorAll('input[id],select[id],textarea[id]'))if(/^(gm|gs|wb)/.test(el.id))values[el.id]=el.type==='checkbox'?el.checked:el.value;const P=UI.panel||{},panel={};for(const k of ['gt','gn','gilv','gcat','gset','gth','gc','gs'])if(P[k]!==undefined)panel[k]=P[k];return {values,panel,point:S.IN.lastClickW};};
 const send=(command,el,input={})=>{
  if(!SW.gm){UI.toast('พิมพ์ /gmadmin2008 เพื่อเปิด GM บนเซิร์ฟเวอร์ก่อน','bad');return;}
  const data={...capture(),dataset:{...el?.dataset},...input};queue=queue.catch(()=>{}).then(()=>NET.request({t:'online_gm',id:crypto.randomUUID(),command,input:data})).then(m=>{if(m.result){Object.assign(W.gm,m.result.gm,m.result.flags);UI.toast(m.result.msg,'good');if(UI.panel?.id==='gm')UI.renderPanel();}return m;}).catch(e=>UI.toast('GM: '+e.message,'bad'));return queue;
 };
 UI.gmCmd=(command,el)=>{
  if(!SW.active)return gmCmd(command,el);
  if(command==='gmset'||['export','dgsim'].includes(command))return gmCmd(command,el);
  if(command==='gmlock'){NET.request({t:'online_gm_lock'}).then(()=>{SW.gm=false;lock();UI.closePanel();}).catch(e=>UI.toast(e.message,'bad'));return;}
  if(['show','showv','showstop','sktry'].includes(command))return gmCmd(command,el);
  if(command==='dgenter'){send('dgunlock',el)?.then(m=>{if(m?.result)S.goDungeon(document.getElementById('gmdg').value,+document.getElementById('gmfloor').value||1,0);});return;}
  return send(command,el);
 };
 UI.act=(el,e)=>{if(!SW.active)return act(el,e);const a=el.dataset.act;
  if(a==='gm')return UI.gmCmd(el.dataset.c,el);
  if(a==='gmx-spawn')return send('spawnMonster',el);
  if(a==='gmx-cls')return send('gmcls',{dataset:{cls:el.dataset.v}});
  if(a==='gmx-g'||a==='gmx-m'){if(UI.panel){UI.panel[a==='gmx-g'?'mg':'mm']=el.dataset.v;UI.renderPanel();}return;}
  return act(el,e);
 };
 document.addEventListener('change',e=>{if(!SW.active||!e.target.dataset.gm)return;e.stopImmediatePropagation();const el=e.target,key=el.dataset.gm,enabled=el.checked;if(!SW.gm){el.checked=!enabled;UI.toast('พิมพ์ /gmadmin2008 ก่อน','bad');return;}send('flag',{dataset:{k:key}},{enabled});},true);
 const render=UI.gmRender,supported=new Set('setlv maxlv setcls gmcls cur dia tix reroll stones cons pets ach infamy0 heal tp pspd give gmcat gmgive kit kit2 allmax autons runekit fashkit gmsrall gems clearinv dropground spawn mkill dgclear killall mfreeze mheal mpull mclear rates announce wbnow dgunlock dgdaily pvpwin pvplose score prep skset skreset gmset export dgsim gmlock show showv showstop sktry dgenter'.split(' '));
 UI.gmRender=(tab,P)=>{const html=render(tab,P);if(!SW.active)return html;return '<p class="muted">GM ออนไลน์ · คำสั่งโลกมีผลกับทุกคนในแชนแนลนี้</p>'+html.replace(/<button\b[^>]*data-act="gm"[^>]*>/g,tag=>{const command=tag.match(/data-c="([^"]+)"/)?.[1];return command&&!supported.has(command)?tag.replace(/>$/,' disabled title="คำสั่งนี้ยังไม่รองรับในโลกออนไลน์">'):tag;});};
 SW.gmCommand=(command,input={})=>send(command,null,input);
})(window.G);
