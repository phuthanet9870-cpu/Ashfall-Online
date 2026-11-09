import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../worker/index.mjs';
const storage={get:async()=>null,put:async()=>{},delete:async()=>{},transaction:async fn=>fn(storage)};
test('retained old deployment actor flushes durable state before requesting eviction',async()=>{
 const order=[],world=new World({storage,abort:()=>order.push('evict')},{});world.core={stats:()=>({release:'previous-build'}),flush:async()=>{await Promise.resolve();order.push('persisted');}};
 const response=await world.fetch(new Request('https://game.invalid/health'));assert.deepEqual(order,['persisted','evict']);assert.equal(response.status,503);
});
test('a failed persistence operation prevents old deployment actor eviction',async()=>{
 let evicted=false;const world=new World({storage,abort:()=>{evicted=true;}},{});world.core={stats:()=>({release:'previous-build'}),flush:async()=>{throw new Error('storage unavailable');}};
 await assert.rejects(world.fetch(new Request('https://game.invalid/health')),/storage unavailable/);assert.equal(evicted,false);
});
