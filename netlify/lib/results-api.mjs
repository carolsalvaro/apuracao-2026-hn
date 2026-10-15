import {validateConfig,digest,view} from './tse.mjs';
export function createResultsHandler({config,getStore,now=()=>Date.now(),refresh=null,seedRecords={}}) {
  return async request => {
    const headers={'Cache-Control':'no-store'};
    const respond=(body,status=200)=>Response.json(body,{status,headers});
    if (request.method!=='GET') return new Response('Method not allowed',{status:405,headers:{...headers,Allow:'GET'}});
    try {
      if (!validateConfig(config)) return respond({status:'unconfigured',demo:true,items:[],message:'Fontes oficiais ainda não validadas.'},503);
      const url=new URL(request.url),id=url.searchParams.get('id'),kind=url.searchParams.get('kind'),ids=url.searchParams.get('ids')?.split(',');
      if ([...url.searchParams.keys()].some(k=>!['id','ids','kind'].includes(k)) || (kind&&!['president','state','municipality','governor'].includes(kind)) || (ids&&(id||ids.length>50||new Set(ids).size!==ids.length||ids.some(x=>!/^municipality-\d{7}$/.test(x))))) return respond({error:'invalid_query'},400);
      const targets=config.targets.filter(t=>(!id||t.id===id)&&(!ids||ids.includes(t.id))&&(!kind||t.kind===kind));
      if (!targets.length) return respond({error:'unknown_target'},404);
      if (targets.length>50) return respond({error:'select_id',message:'Selecione uma localidade.'},400);
      const revision=digest(config);
      let store,storageError=false,refreshError=false;
      try {store=getStore();if(refresh)await refresh({store,ids:targets.map(t=>t.id)});} catch {storageError=true;refreshError=true;}
      const items=await Promise.all(targets.map(async t=>{
        let record;
        try {if(store)record=await store.get(`${revision}/results/${t.id}`,{type:'json'});} catch {storageError=true;}
        const seeded=!record && !!seedRecords[t.id];
        record??=seedRecords[t.id];
        return {id:t.id,kind:t.kind,source:seeded?'verified_snapshot':'durable_cache',...view(record,config,now()),...(seeded?{status:'stale'}:{})};
      }));
      const unavailable=items.some(i=>i.status!=='current');
      if(storageError && items.every(i=>!i.result)) throw Error('storage_unavailable');
      headers['Cache-Control']='public, max-age=10';
      headers['Netlify-CDN-Cache-Control']='public, s-maxage=30';
      return respond({status:unavailable||storageError||refreshError?'partial':'current',demo:false,storage:storageError?'unavailable':'ready',generatedAt:new Date(now()).toISOString(),items});
    } catch { return respond({status:'unavailable',items:[],message:'Resultados temporariamente indisponíveis.'},503); }
  };
}
