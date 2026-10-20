import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {collect} from '../netlify/lib/collector.mjs';
import {liveCollection} from '../netlify/lib/collection-policy.mjs';
import {validateConfig,digest,view} from '../netlify/lib/tse.mjs';
import {createResultsHandler} from '../netlify/lib/results-api.mjs';
import {MemoryStore,settings,target,payload,now} from './tse-fixtures.mjs';
import {sectionPercent} from '../public/result-view.js';
const municipal={...target,id:'municipality-4204608',kind:'municipality',area:'80896',scope:'mu',uf:'sc',ibge:'4204608',url:target.url.replace('/br/br-','/sc/sc80896-')};
test('one-minute configuration is allowed but shorter unverified intervals are rejected',()=>{
  assert(validateConfig({...settings,intervalSeconds:60}));assert.throws(()=>validateConfig({...settings,intervalSeconds:59}));
});
test('only an exactly totalized municipality stops origin collection; its final result never becomes stale',async()=>{
  const config={...settings,intervalSeconds:60,targets:[municipal]},store=new MemoryStore(),key=digest(config)+'/results/'+municipal.id;
  let clock=now,calls=0,finish=false;
  const fetcher=async()=>{calls++;const p=payload(municipal);if(finish)p.hg='18:01:00';p.s={ts:'100000',st:finish?'100000':'99999',pst:finish?'100':'99.999'};return Response.json(p);};
  const run=()=>collect({store,config,now:()=>clock,fetcher});
  await run();assert.equal((await store.get(key)).result.phase,'counting');assert.equal(sectionPercent({result:(await store.get(key)).result}),'<100%');
  clock+=60000;finish=true;await run();assert.equal(calls,2);
  const final=await store.get(key);assert.equal(final.result.phase,'totalized');
  assert.equal(sectionPercent(final),'100,0%');
  for(const extra of [60000,3600000,86400000]){clock+=extra;assert.equal((await run()).checked,0);}
  assert.equal(calls,2);assert.deepEqual(await store.get(key),final);assert.equal(view(final,config,clock).status,'totalized');
  const handler=createResultsHandler({config,getStore:()=>store,now:()=>clock,refresh:run});
  const body=await(await handler(new Request('https://test/api/resultados?ids=municipality-4204608'))).json();
  assert.equal(body.status,'current');assert.equal(body.items[0].status,'totalized');assert.equal(calls,2);
});
test('an official totalized bootstrap also prevents further municipal origin queries',async()=>{
  const config={...settings,targets:[municipal]},store=new MemoryStore(),p=payload(municipal);p.s.st='100';p.s.pst='100';
  const {parseResult}=await import('../netlify/lib/tse.mjs');
  const seeds={[municipal.id]:{result:parseResult(p,municipal,config,now),checkedAt:new Date(now).toISOString(),nextAttemptAt:0}};
  const outcome=await collect({store,config,seedRecords:seeds,now:()=>now,fetcher:()=>{throw Error('must not query');}});
  assert.equal(outcome.checked,0);
});
test('all 337 fast mocked sources fit one live round, share one lease, and never exceed four concurrent queries',async()=>{
  const config=JSON.parse(readFileSync(new URL('../config/tse.json',import.meta.url))),store=new MemoryStore(),byURL=new Map(config.targets.map(t=>[t.url,t]));
  let calls=0,active=0,maxActive=0;
  const fetcher=async url=>{calls++;active++;maxActive=Math.max(maxActive,active);await new Promise(r=>setTimeout(r,1));active--;const t=byURL.get(url),p=payload(t);p.carg[0].agr[0].par[0].cand.forEach((c,i)=>c.n=t.candidates[i]);return Response.json(p);};
  const args={store,config,now:()=>now,fetcher,...liveCollection,maxStartsPerSecond:0};
  const outcomes=await Promise.all(Array.from({length:20},()=>collect(args)));
  assert.equal(calls,337);assert(maxActive<=4&&maxActive>1);assert.equal(outcomes.filter(o=>o.checked===337).length,1);
});
test('real pacing spaces origin starts even when the mocked origin responds quickly',async()=>{
  const targets=Array.from({length:12},(_,i)=>({...target,id:'paced-'+i})),config={...settings,targets},store=new MemoryStore(),starts=[];
  await collect({store,config,now:()=>now,...liveCollection,fetcher:async()=>{starts.push(performance.now());return Response.json(payload());}});
  assert.equal(starts.length,12);for(let i=1;i<starts.length;i++)assert(starts[i]-starts[i-1]>=40,JSON.stringify(starts));
});
test('a slow mocked origin respects the time budget instead of launching the entire batch',async()=>{
  const config={...settings,targets:Array.from({length:20},(_,i)=>({...target,id:'slow-'+i}))},store=new MemoryStore();let calls=0;
  const outcome=await collect({store,config,now:()=>now,batchSize:400,concurrency:4,startBudgetMs:10,fetcher:async()=>{calls++;await new Promise(r=>setTimeout(r,25));return Response.json(payload());}});
  assert(calls<=4);assert.equal(outcome.checked,calls);
});
test('healthy sources are eligible in the next minute even if the preceding round took time to complete',async()=>{
  const targets=[{...target,id:'round-1'},{...target,id:'round-2'}],config={...settings,intervalSeconds:60,targets},store=new MemoryStore();let clock=now,calls=0;
  const fetcher=async()=>{calls++;clock+=10000;return Response.json(payload());};
  await collect({store,config,now:()=>clock,fetcher});assert.equal(calls,2);
  clock=now+60000;await collect({store,config,now:()=>clock,fetcher});assert.equal(calls,4);
});
