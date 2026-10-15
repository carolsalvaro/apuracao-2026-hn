import {validateConfig,parseResult,assertForward,digest} from './tse.mjs';
const conditional = entry => entry ? {onlyIfMatch:entry.etag} : {onlyIfNew:true};
export async function collect({store,config,fetcher=fetch,now=()=>Date.now()}) {
  if (!validateConfig(config)) return {status:'disabled',checked:0};
  const revision=digest(config), prefix=`${revision}/`;
  const old=await store.getWithMetadata(`${prefix}lease`,{type:'json'});
  if (old?.data.until > now()) return {status:'busy',checked:0};
  const lease=await store.setJSON(`${prefix}lease`,{until:now()+55000},conditional(old));
  if (!lease.modified) return {status:'busy',checked:0};
  const cursor=await store.get(`${prefix}cursor`,{type:'json'})??0;
  let checked=0, failures=0, visited=0;
  // Rotate across configured targets; a single invocation never floods the origin.
  for (;visited<config.targets.length && checked<4;visited++) {
    const t=config.targets[(cursor+visited)%config.targets.length],key=`${prefix}results/${t.id}`;
    const entry=await store.getWithMetadata(key,{type:'json'}),oldRecord=entry?.data;
    if (oldRecord?.nextAttemptAt>now()) continue;
    const checkedAt=new Date(now()).toISOString();
    let record, retryAfterMs=0;
    try {
      const res=await fetcher(t.url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(8000),redirect:'error'});
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
      record={result,checkedAt,receivedAt:new Date(now()).toISOString(),failures:0,error:null,nextAttemptAt:now()+config.intervalSeconds*1000};
    } catch (error) {
      failures++;
      const count=(oldRecord?.failures??0)+1;
      const code=/^(upstream_\d{3}|wrong_[a-z_]+|invalid_[a-z_]+|inconsistent_totals|regression|response_too_large)$/.test(error.message)?error.message:'upstream_unavailable';
      record={...oldRecord,checkedAt,error:code,failures:count,nextAttemptAt:now()+Math.max(Number.isFinite(retryAfterMs)?retryAfterMs:0,Math.min(3600000,config.intervalSeconds*1000*2**Math.min(count-1,4)))};
    }
    const saved=await store.setJSON(key,record,conditional(entry));
    if (!saved.modified) throw new Error('concurrent_write');
    checked++;
  }
  await store.setJSON(`${prefix}cursor`,(cursor+visited)%config.targets.length);
  return {status:failures?'partial':'ok',checked,failures};
}
