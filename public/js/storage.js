'use strict';
// Embedded browsers can deny localStorage even with allow-same-origin.
// Keep a session cache so online accounts still work; durable characters live on the server.
(function(){
  const memory=new Map();let native=null;
  try{native=globalThis.localStorage;const probe='ashfall_storage_probe';native.setItem(probe,'1');native.removeItem(probe);}catch{native=null;}
  const fail=()=>{native=null;};
  globalThis.ASHFALL_STORAGE={
    get persistent(){return !!native;},
    get length(){if(native)try{return native.length;}catch{fail();}return memory.size;},
    key(i){if(native)try{return native.key(i);}catch{fail();}return [...memory.keys()][i]??null;},
    getItem(key){key=String(key);if(native)try{return native.getItem(key);}catch{fail();}return memory.get(key)??null;},
    setItem(key,value){key=String(key);value=String(value);memory.set(key,value);if(native)try{native.setItem(key,value);}catch{fail();}},
    removeItem(key){key=String(key);memory.delete(key);if(native)try{native.removeItem(key);}catch{fail();}},
    clear(){memory.clear();if(native)try{native.clear();}catch{fail();}}
  };
})();
