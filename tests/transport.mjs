import WebSocket from 'ws';
import {randomBytes} from 'node:crypto';
export class GameClient {
 constructor(url){this.url=url;this.messages=[];this.units=new Map();this.bytes=0;this.pid=randomBytes(8).toString('hex');this.key=randomBytes(16).toString('hex');this.characterId=randomBytes(16).toString('hex');}
 async connect(){this.ws=new WebSocket(this.url);this.ws.on('message',data=>{this.bytes+=data.length;const m=JSON.parse(data);this.messages.push(m);if(this.messages.length>1500)this.messages.shift();if(m.t==='online_character')this.character=m;if(m.t==='online_ready'){this.ready=m;this.units=new Map(m.state.units.map(u=>[u.id,u]));}if(m.t==='online_state'){if(!m.state.delta)this.units.clear();for(const q of m.state.units)this.units.set(q.id,{...this.units.get(q.id),...q});for(const id of m.state.removed||[])this.units.delete(id);this.state=m.state;}});await this.wait(m=>m.t==='hi');return this;}
 send(m){this.ws.send(JSON.stringify(m));}
 async wait(predicate,timeout=20000){const end=Date.now()+timeout;while(Date.now()<end){const value=this.messages.find(predicate);if(value)return value;await new Promise(r=>setTimeout(r,20));}throw new Error('Game message timeout; last types: '+this.messages.slice(-8).map(m=>m.t).join(','));}
 async condition(predicate,timeout=20000){const end=Date.now()+timeout;while(Date.now()<end){if(predicate())return;await new Promise(r=>setTimeout(r,25));}throw new Error('Game condition timeout');}
 async auth(name='Tester'){this.send({t:'auth',pid:this.pid,key:this.key,name,cls:'guardian',lv:5});await this.wait(m=>m.t==='me');}
 async enter(mode,character=this.characterId,legacy){const request=randomBytes(8).toString('hex');this.send({t:'online_enter',request,server:'s1',mode,character,legacy});return this.wait(m=>m.t==='online_ready'&&m.request===request);}
 async command(command,args){const id=randomBytes(8).toString('hex');for(let i=0;i<4;i++){const start=this.messages.length;this.send({t:'online_command',id,command,args,revision:this.character.revision});await this.condition(()=>this.messages.slice(start).some(m=>m.id===id&&['online_command_result','online_error'].includes(m.t)));const response=this.messages.slice(start).find(m=>m.id===id&&['online_command_result','online_error'].includes(m.t));if(response.t==='online_command_result')return response;if(response.error!=='stale_character')throw new Error(response.error);}throw new Error('Too many stale revisions');}
 close(){this.ws?.close();}
}
