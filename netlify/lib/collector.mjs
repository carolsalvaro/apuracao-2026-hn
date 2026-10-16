import {validateConfig,parseResult,assertForward,digest} from './tse.mjs';
const conditional = entry => entry ? {onlyIfMatch:entry.etag} : {onlyIfNew:true};
export async function collect({store,config,fetcher=fetch,now=()=>Date.now(),priorityIds=null,seedRecords={},batchSize=4,concurrency=1,startBudgetMs=12000,maxStartsPerSecond=0,delay=ms=>new Promise(resolve=>setTimeout(resolve,ms))}) {
  if (!validateConfig(config)) return {status:'disabled',checked:0};
  if(!Number.isInteger(batchSize)||batchSize<1||batchSize>400||!Number.isInteger(concurrency)||concurrency<1||concurrency>4||!Number.isInteger(startBudgetMs)||startBudgetMs<1||startBudgetMs>30000||!Number.isInteger(maxStartsPerSecond)||maxStartsPerSecond<0||maxStartsPerSecond>20)throw Error('invalid_batch');
  const revision=digest(config), prefix=`${revision}/`;
  // Register demand before the global lease check. Concurrent state/map requests
  // therefore join the same rotating queue instead of starving behind president.
  let demanded=null;
  if(priorityIds){
    const valid=new Set(config.targets.map(t=>t.id));
    for(let attempt=0;attempt<3;attempt++){
      const entry=await store.getWithMetadata(`${prefix}demand`,{type:'json'});
      const demand=Object.fromEntries(Object.entries(entry?.data??{}).filter(([id,until])=>valid.has(id)&&until>now()));
      let changed=Object.keys(demand).length!==Object.keys(entry?.data??{}).length;
      for(const id of priorityIds)if(valid.has(id)&&!(demand[id]>now()+300000)){demand[id]=now()+600000;changed=true;}
      demanded=new Set(Object.keys(demand));
      if(!changed)break;
      if((await store.setJSON(`${prefix}demand`,demand,conditional(entry))).modified)break;
    }
  }
  const old=await store.getWithMetadata(`${prefix}lease`,{type:'json'});
  if (old?.data.until > now()) return {status:'busy',checked:0};
  const lease=await store.setJSON(`${prefix}lease`,{until:now()+60000},conditional(old));
  if (!lease.modified) return {status:'busy',checked:0};
  const cursor=await store.get(`${prefix}cursor`,{type:'json'})??0;
  // Reload after acquiring the lease so demand registered by other readers is included.
  if(priorityIds)demanded=new Set(Object.entries(await store.get(`${prefix}demand`,{type:'json'})??{}).filter(([,until])=>until>now()).map(([id])=>id));
  const targets=config.targets,started=Date.now();
  // National president and SC must not wait a full municipal sweep. They still
  // respect the same lease, batch budget, backoff and per-target interval.
  const critical=targets.map((t,i)=>['president-br','state-sc'].includes(t.id)?i:-1).filter(i=>i>=0);
  const order=[...critical,...Array.from({length:targets.length},(_,i)=>(cursor+i)%targets.length).filter(i=>!critical.includes(i))];
  let nextCursor=cursor;
  let checked=0,failures=0,visited=0,reserved=0,nextStart=0,gate=Promise.resolve();
  const pace=()=>{
    if(!maxStartsPerSecond)return Promise.resolve();
    gate=gate.then(async()=>{
      const wait=Math.max(0,nextStart-Date.now());if(wait)await delay(wait);
      nextStart=Date.now()+1000/maxStartsPerSecond;
    });return gate;
  };
  // Rotate across configured targets; a single invocation never floods the origin.
  const worker=async()=>{for (;;) {
    if(visited>=targets.length||reserved>=batchSize||Date.now()-started>=startBudgetMs)return;
    const index=order[visited++],t=targets[index],key=`${prefix}results/${t.id}`;
    if(!critical.includes(index))nextCursor=(index+1)%targets.length;
    if(demanded&&!demanded.has(t.id)&&!critical.includes(index))continue;
    const entry=await store.getWithMetadata(key,{type:'json'}),oldRecord=entry?.data??seedRecords[t.id];
    // Stop only municipalities whose validated official sections reached 100%.
    if(t.kind==='municipality'&&oldRecord?.result?.phase==='totalized')continue;
    if (oldRecord?.nextAttemptAt>now()) continue;
    if(reserved>=batchSize)return;
    reserved++;await pace();
    if(Date.now()-started>=startBudgetMs)return;
    checked++;
    const checkedAt=new Date(now()).toISOString();
    let record, retryAfterMs=0;
    try {
      const headers={Accept:'application/json'};
      if(oldRecord?.etag)headers['If-None-Match']=oldRecord.etag;
      else if(oldRecord?.lastModified)headers['If-Modified-Since']=oldRecord.lastModified;
      const res=await fetcher(t.url,{headers,signal:AbortSignal.timeout(8000),redirect:'error'});
      if(res.status===304){
        if(!oldRecord?.result)throw Error('invalid_not_modified');
        record={...oldRecord,checkedAt,failures:0,error:null,nextAttemptAt:now()+config.intervalSeconds*1000};
      }else{
      if (!res.ok) {
        const retry=res.headers.get('Retry-After');
        if (retry) retryAfterMs=/^\d+$/.test(retry)?Number(retry)*1000:Math.max(0,Date.parse(retry)-now());
        throw new Error(`upstream_${res.status}`);
      }
      const reader=res.body?.getReader();
      if (!reader) throw new Error('invalid_body');
      const chunks=[];let bytes=0;
      try { for (;;) {const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>2000000)throw new Error('response_too_large');chunks.push(value);} }
      finally {await reader.cancel().catch(()=>{});}
      const text=Buffer.concat(chunks).toString('utf8');
      const result=parseResult(JSON.parse(text),t,config,now());
      assertForward(oldRecord?.result,result);
      const etag=res.headers.get('ETag'),lastModified=res.headers.get('Last-Modified');
      record={result,checkedAt,receivedAt:new Date(now()).toISOString(),failures:0,error:null,nextAttemptAt:now()+config.intervalSeconds*1000,
        ...(etag&&etag.length<500?{etag}:{}),...(lastModified&&lastModified.length<500?{lastModified}:{})};
      }
    } catch (error) {
      failures++;
      const count=(oldRecord?.failures??0)+1;
      const code=/^(upstream_\d{3}|wrong_[a-z_]+|invalid_[a-z_]+|inconsistent_totals|regression|response_too_large)$/.test(error.message)?error.message:'upstream_unavailable';
      record={...oldRecord,checkedAt,error:code,failures:count,nextAttemptAt:now()+Math.max(Number.isFinite(retryAfterMs)?retryAfterMs:0,Math.min(3600000,config.intervalSeconds*1000*2**Math.min(count-1,4)))};
    }
    const saved=await store.setJSON(key,record,conditional(entry));
    if (!saved.modified) throw new Error('concurrent_write');
  }};
  const outcomes=await Promise.allSettled(Array.from({length:concurrency},worker));
  const rejected=outcomes.find(o=>o.status==='rejected');if(rejected)throw rejected.reason;
  await store.setJSON(`${prefix}cursor`,nextCursor);
  return {status:failures?'partial':'ok',checked,failures};
}
