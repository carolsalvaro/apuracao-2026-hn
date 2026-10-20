import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createResultsHandler} from '../netlify/lib/results-api.mjs';
import {collect} from '../netlify/lib/collector.mjs';
import {validateConfig,digest,parseResult} from '../netlify/lib/tse.mjs';
import {MemoryStore,settings,target,payload,now} from './tse-fixtures.mjs';
import {acceptItem,votePercent,leaderColor,candidate} from '../public/result-view.js';
const json=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const config=json('../config/tse.json'),bootstrap=json('../netlify/data/tse-bootstrap.json');
test('official deployment data covers every displayed state/city and matches the verified configuration',()=>{
  assert(validateConfig(config));assert.equal(bootstrap.revision,digest(config));
  const catalogue=json('../public/localities.json'),mapping=json('../config/locality-mapping.json');
  assert.equal(catalogue.southCities.length,45);
  for(const c of catalogue.cities){const t=config.targets.find(t=>t.ibge===c.id);assert(t,c.name);assert.equal(t.uf,c.uf.toLowerCase());assert(mapping.municipalities.some(m=>m.ibge===c.id&&m.tse===t.area&&m.uf===t.uf));}
  assert.equal(config.targets.filter(t=>t.kind==='state').length,27);
  for(const t of config.targets){const r=bootstrap.records[t.id]?.result;assert(r,t.id);assert.equal(r.area,t.area);assert.equal(r.election,t.election);assert.equal(r.round,'2');assert.deepEqual(r.candidates.map(c=>c.number).sort(),t.candidates.slice().sort());assert(acceptItem({id:t.id,kind:t.kind,result:r}));}
});
test('candidate identity survives reversed source order; zero and missing never imply a lead',()=>{
  const item={id:'president-br',kind:'president',result:structuredClone(bootstrap.records['president-br'].result)};
  assert.equal(candidate(item,'13').name,'LULA');
  assert.equal(votePercent(item,'13'),'—');assert.equal(leaderColor(item),'#c9d4dd');
  assert.equal(votePercent(undefined,'22'),'—');
  item.result.phase='counting';item.result.validVotes=100;
  candidate(item,'13').votes=40;candidate(item,'13').percent=40;candidate(item,'22').votes=60;candidate(item,'22').percent=60;
  assert.equal(votePercent(item,'13'),'40,0%');assert.equal(leaderColor(item),'#246db5');
  candidate(item,'22').number='99';assert.equal(acceptItem(item),false);
});
test('durable-storage outage returns only verified dated bootstrap, never a simulated replacement',async()=>{
  const handler=createResultsHandler({config,getStore:()=>{throw Error('storage offline');},seedRecords:bootstrap.records,now:()=>now});
  const response=await handler(new Request('https://test/api/resultados?kind=president'));
  const body=await response.json();assert.equal(response.status,200);assert.equal(body.demo,false);assert.equal(body.status,'partial');assert.equal(body.storage,'unavailable');assert.equal(body.items[0].source,'verified_snapshot');assert.equal(body.items[0].status,'stale');assert.deepEqual(body.items[0].result,bootstrap.records['president-br'].result);
});
test('municipality batch validation rejects arbitrary targets and limits collection to fixed requested sources',async()=>{
  const store=new MemoryStore(),seen=[];
  const handler=createResultsHandler({config,getStore:()=>store,seedRecords:bootstrap.records,refresh:async({ids})=>{seen.push(ids);}});
  let response=await handler(new Request('https://test/api/resultados?ids=municipality-4204608,municipality-4218707'));
  assert.equal(response.status,200);assert.equal((await response.json()).items.length,2);assert.equal(seen.length,1);
  for(const query of ['ids=https://evil.test','ids=president-br','ids=municipality-4204608,municipality-4204608','ids=municipality-4204608&id=president-br','ids='+Array.from({length:51},(_,i)=>'municipality-'+(4200000+i)).join(',')]){
    response=await handler(new Request('https://test/api/resultados?'+query));assert.equal(response.status,400);}
  assert.equal(seen.length,1);
});
test('a single shared overview includes all national/state/governor results without exposing a municipal bulk response',async()=>{
  const handler=createResultsHandler({config,getStore:()=>new MemoryStore(),seedRecords:bootstrap.records});
  const response=await handler(new Request('https://test/api/resultados?kind=overview'));const body=await response.json();
  assert.equal(response.status,200);assert.equal(body.items.length,34);
  assert.equal(body.items.filter(i=>i.kind==='president').length,1);assert.equal(body.items.filter(i=>i.kind==='state').length,27);assert.equal(body.items.filter(i=>i.kind==='governor').length,6);
  assert(!body.items.some(i=>i.kind==='municipality'));
});
test('an operational cached-only read cannot trigger refresh or return a CDN-cached observation',async()=>{
  let calls=0;const handler=createResultsHandler({config,getStore:()=>new MemoryStore(),seedRecords:bootstrap.records,refresh:async()=>{calls++;}});
  const response=await handler(new Request('https://test/api/resultados?kind=president&cached=1'));
  assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(calls,0);
  assert.equal((await handler(new Request('https://test/api/resultados?kind=president&cached=0'))).status,400);
});
test('read-through refresh shares its lease between concurrent readers and enforces per-target interval',async()=>{
  const store=new MemoryStore();let calls=0;
  const seed={result:parseResult(payload(),target,settings,now),checkedAt:new Date(now).toISOString(),nextAttemptAt:0};
  const refresh=()=>collect({config:settings,store,seedRecords:{[target.id]:seed},priorityIds:[target.id],now:()=>now,fetcher:async()=>{calls++;return Response.json(payload());}});
  const handler=createResultsHandler({config:settings,getStore:()=>store,seedRecords:{[target.id]:seed},refresh,now:()=>now});
  const responses=await Promise.all(Array.from({length:20},()=>handler(new Request('https://test/api/resultados?kind=president'))));
  assert(responses.every(r=>r.status===200));assert.equal(calls,1);
  await handler(new Request('https://test/api/resultados?kind=president'));assert.equal(calls,1);
});
test('a request blocked by the shared lease still queues its locality for the next collection',async()=>{
  const second={...target,id:'state-sp',kind:'state',scope:'uf',area:'sp',uf:'sp',name:'SP',url:target.url.replace('/br/','/sp/').replace('/br-c','/sp-c')};
  const c={...settings,targets:[target,second]},store=new MemoryStore();let clock=now;const seen=[];
  const run=ids=>collect({config:c,store,priorityIds:ids,now:()=>clock,fetcher:async url=>{const t=url===target.url?target:second;seen.push(t.id);return Response.json(payload(t));}});
  await run([target.id]);assert.deepEqual(seen,[target.id]);
  assert.equal((await run([second.id])).status,'busy');
  clock+=60000;await run([target.id]);assert.deepEqual(seen,[target.id,second.id]);
});

test('public API permits short background CDN revalidation while operational reads remain uncached',async()=>{
  const handler=createResultsHandler({config,getStore:()=>new MemoryStore(),seedRecords:bootstrap.records});
  const publicRead=await handler(new Request('https://test/api/resultados?kind=overview'));
  assert.equal(publicRead.headers.get('Cache-Control'),'public, max-age=10');
  assert.equal(publicRead.headers.get('Netlify-CDN-Cache-Control'),'public, s-maxage=30, stale-while-revalidate=15');
  const operationalRead=await handler(new Request('https://test/api/resultados?kind=overview&cached=1'));
  assert.equal(operationalRead.headers.get('Cache-Control'),'no-store');
  assert.equal(operationalRead.headers.get('Netlify-CDN-Cache-Control'),null);
});
