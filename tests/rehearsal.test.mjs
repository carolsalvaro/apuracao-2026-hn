import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {collect} from '../netlify/lib/collector.mjs';
import {digest} from '../netlify/lib/tse.mjs';
import {MemoryStore,settings,target,payload,now} from './tse-fixtures.mjs';
import {storeName} from '../netlify/lib/store.mjs';
test('staging persists across deploys and never selects the production namespace implicitly',()=>{
  assert.equal(storeName('deploy-preview'),'hn-tse-preview-integracao-tse-pr-1');
  assert.equal(storeName(undefined),storeName('deploy-preview'));
  assert.notEqual(storeName('production'),storeName('deploy-preview'));
});
test('conditional 304 clears failure without inventing votes or changing body receipt time',async()=>{
  const store=new MemoryStore(),key=digest(settings)+'/results/'+target.id;
  await collect({store,config:settings,now:()=>now,fetcher:async()=>Response.json(payload(),{headers:{ETag:'"v1"'}})});
  const original=await store.get(key);
  await collect({store,config:settings,now:()=>now+300000,fetcher:async()=>new Response('',{status:500})});
  await collect({store,config:settings,now:()=>now+600000,fetcher:async(url,{headers})=>{assert.equal(headers['If-None-Match'],'"v1"');return new Response(null,{status:304});}});
  const recovered=await store.get(key);assert.deepEqual(recovered.result,original.result);assert.equal(recovered.receivedAt,original.receivedAt);assert.equal(recovered.error,null);assert.equal(recovered.checkedAt,new Date(now+600000).toISOString());
});
test('an unsolicited 304 without a previous result remains unavailable',async()=>{
  const store=new MemoryStore();await collect({store,config:settings,now:()=>now,fetcher:async()=>new Response(null,{status:304})});
  const r=await store.get(digest(settings)+'/results/'+target.id);assert.equal(r.result,undefined);assert.equal(r.error,'invalid_not_modified');
});
test('repeated readers do not rewrite a demand queue that is still fresh',async()=>{
  const store=new MemoryStore();let writes=0;
  const original=store.setJSON.bind(store);store.setJSON=async(key,...args)=>{if(key.endsWith('/demand'))writes++;return original(key,...args);};
  const args={store,config:settings,priorityIds:[target.id],now:()=>now,fetcher:async()=>Response.json(payload())};
  await collect(args);for(let i=0;i<100;i++)await collect(args);
  assert.equal(writes,1);
});
test('90 simulated minutes with all 337 targets preserve national/SC cadence and recover from outage',async()=>{
  const config=JSON.parse(readFileSync(new URL('../config/tse.json',import.meta.url))),store=new MemoryStore(),revision=digest(config);
  let clock=Date.parse('2026-10-25T20:00:00Z'),minute=0,calls=0;
  const byURL=new Map(config.targets.map(t=>[t.url,t])),checks=new Map(),firstChecked=new Map();
  const fetcher=async url=>{
    calls++;const t=byURL.get(url);assert(t);
    // Simulate a complete origin outage, without any traffic to the actual TSE.
    if(minute>=35&&minute<45)return new Response('',{status:503});
    const time=new Date(clock-10800000).toISOString().slice(11,19);
    const progress=minute<20?0:minute<70?50:100,votes=progress?100:0;
    return Response.json({ele:t.election,t:'2',f:'o',sup:'n',dv:'s',tpabr:t.scope,cdabr:t.area,dg:'25/10/2026',hg:time,
      s:{ts:'100',st:String(progress),pst:String(progress)},v:{vvc:String(votes)},carg:[{cd:t.office,agr:[{par:[{sg:'TESTE LOCAL',cand:t.candidates.map((n,i)=>({n,nmu:'Ensaio local '+n,vap:String(votes?(i?40:60):0),pvap:String(votes?(i?40:60):0)}))}]}]}]});
  };
  let previousCore;
  for(minute=0;minute<90;minute++,clock+=60000){
    const before=calls,outcome=await collect({store,config,now:()=>clock,fetcher,batchSize:16});
    assert(calls-before<=16);assert.equal(outcome.checked,calls-before);
    for(const t of config.targets){const record=await store.get(revision+'/results/'+t.id);if(record?.result){
      if(!firstChecked.has(t.id))firstChecked.set(t.id,minute);
      if(['president-br','state-sc'].includes(t.id)&&!record.error){const last=checks.get(t.id);if(last!==record.checkedAt){if(last&&!(minute>=35&&minute<=65))assert(Date.parse(record.checkedAt)-Date.parse(last)<=300000,t.id);checks.set(t.id,record.checkedAt);}}
    }}
    if(minute===34)previousCore=(await store.get(revision+'/results/president-br')).result;
    if(minute===44){const r=await store.get(revision+'/results/president-br');assert.deepEqual(r.result,previousCore);assert.equal(r.error,'upstream_503');}
  }
  assert.equal(firstChecked.size,337);
  for(const id of ['president-br','state-sc']){const r=await store.get(revision+'/results/'+id);assert.equal(r.error,null);assert.equal(r.result.phase,'totalized');}
  assert(Math.max(...firstChecked.values())<=23);
});
