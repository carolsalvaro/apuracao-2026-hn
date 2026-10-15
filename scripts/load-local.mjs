// Local HTTP load against synthetic stored data. Never contacts the TSE.
import {createServer} from 'node:http';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createResultsHandler} from '../netlify/lib/results-api.mjs';
import {collect} from '../netlify/lib/collector.mjs';
import {settings,payload,MemoryStore,now} from '../tests/tse-fixtures.mjs';
const store=new MemoryStore();let upstreamCalls=0;
await collect({store,config:settings,now:()=>now,fetcher:async()=>{upstreamCalls++;return Response.json(payload())}});
const handler=createResultsHandler({config:settings,getStore:()=>store,now:()=>now});
const server=createServer(async(req,res)=>{const r=await handler(new Request(`http://localhost${req.url}`));res.writeHead(r.status,Object.fromEntries(r.headers));res.end(await r.text());});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try {
  const url=`http://127.0.0.1:${server.address().port}/api/resultados`,durations=[];let count=0;
  const before=upstreamCalls,start=performance.now();
  await Promise.all(Array.from({length:25},async()=>{for(let i=0;i<40;i++){const a=performance.now(),r=await fetch(url);assert.equal(r.status,200);assert.equal((await r.json()).items[0].status,'current');durations.push(performance.now()-a);count++;}}));
  assert.equal(upstreamCalls,before);durations.sort((a,b)=>a-b);
  console.log(JSON.stringify({requests:count,concurrency:25,errors:0,elapsedMs:Math.round(performance.now()-start),p95Ms:Math.round(durations[Math.floor(durations.length*.95)]),tseRequests:0,storage:'in-memory test double; not Netlify capacity measurement'},null,2));
} finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
