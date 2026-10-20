// Local HTTP load only. The origin is injected; zero requests reach the TSE.
import {createServer} from 'node:http';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createResultsHandler} from '../netlify/lib/results-api.mjs';
import {collect} from '../netlify/lib/collector.mjs';
import {parseResult} from '../netlify/lib/tse.mjs';
import {settings,target,payload,MemoryStore,now} from '../tests/tse-fixtures.mjs';
const reports=[];
for(const scenario of ['warm_cache','cold_read_through']){
 const store=new MemoryStore();let upstreamCalls=0,demandWrites=0;
 const setJSON=store.setJSON.bind(store);store.setJSON=async(key,...args)=>{if(key.endsWith('/demand'))demandWrites++;return setJSON(key,...args);};
 const fetcher=async()=>{upstreamCalls++;await new Promise(r=>setTimeout(r,10));return Response.json(payload());};
 const seeds={[target.id]:{result:parseResult(payload(),target,settings,now),checkedAt:new Date(now).toISOString(),receivedAt:new Date(now).toISOString(),nextAttemptAt:0}};
 if(scenario==='warm_cache')await collect({store,config:settings,now:()=>now,fetcher});
 const before=upstreamCalls;
 const handler=createResultsHandler({config:settings,getStore:()=>store,seedRecords:seeds,now:()=>now,
  refresh:({ids})=>collect({store,config:settings,priorityIds:ids,seedRecords:seeds,now:()=>now,fetcher,batchSize:16})});
 const server=createServer(async(req,res)=>{const r=await handler(new Request(`http://localhost${req.url}`));res.writeHead(r.status,Object.fromEntries(r.headers));res.end(await r.text());});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const url=`http://127.0.0.1:${server.address().port}/api/resultados?kind=president`,durations=[];let count=0;const start=performance.now();
  await Promise.all(Array.from({length:100},async()=>{for(let i=0;i<50;i++){
   const a=performance.now(),r=await fetch(url);assert.equal(r.status,200);const d=await r.json();assert.equal(d.items[0].result.validVotes,100);assert.equal(d.demo,false);durations.push(performance.now()-a);count++;
  }}));
  assert.equal(upstreamCalls-before,scenario==='warm_cache'?0:1);assert.equal(demandWrites,1);
  durations.sort((a,b)=>a-b);reports.push({scenario,requests:count,concurrency:100,errors:0,elapsedMs:Math.round(performance.now()-start),p95Ms:Math.round(durations[Math.floor(durations.length*.95)]),simulatedOriginCalls:upstreamCalls-before,demandWrites,tseRequests:0});
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
console.log(JSON.stringify({scenarios:reports,limitation:'Local in-memory storage. 5000 requests with concurrency 100 is not proof of 5000 simultaneous visitors or Netlify capacity.'},null,2));
