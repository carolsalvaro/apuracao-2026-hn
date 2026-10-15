import {validateConfig,digest,view} from './tse.mjs';
export function createResultsHandler({config,getStore,now=()=>Date.now()}) {
  return async request => {
    const headers={'Cache-Control':'no-store'};
    const respond=(body,status=200)=>Response.json(body,{status,headers});
    if (request.method!=='GET') return new Response('Method not allowed',{status:405,headers:{...headers,Allow:'GET'}});
    try {
      if (!validateConfig(config)) return respond({status:'unconfigured',demo:true,items:[],message:'Fontes oficiais ainda não validadas.'},503);
      const url=new URL(request.url),id=url.searchParams.get('id'),kind=url.searchParams.get('kind');
      if ([...url.searchParams.keys()].some(k=>!['id','kind'].includes(k)) || (kind&&!['president','state','municipality','governor'].includes(kind))) return respond({error:'invalid_query'},400);
      const targets=config.targets.filter(t=>(!id||t.id===id)&&(!kind||t.kind===kind));
      if (!targets.length) return respond({error:'unknown_target'},404);
      if (targets.length>50) return respond({error:'select_id',message:'Selecione uma localidade.'},400);
      const store=getStore(),revision=digest(config);
      const items=await Promise.all(targets.map(async t=>({id:t.id,kind:t.kind,...view(await store.get(`${revision}/results/${t.id}`,{type:'json'}),config,now())})));
      const unavailable=items.some(i=>i.status!=='current');
      headers['Cache-Control']='public, max-age=10';
      headers['Netlify-CDN-Cache-Control']='public, s-maxage=30';
      return respond({status:unavailable?'partial':'current',demo:false,generatedAt:new Date(now()).toISOString(),items});
    } catch { return respond({status:'unavailable',items:[],message:'Resultados temporariamente indisponíveis.'},503); }
  };
}
