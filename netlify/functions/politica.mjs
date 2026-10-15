const NEWS_URL='https://hnnoticias.com.br/wp-json/wp/v2/posts?categories=254&per_page=3&orderby=date&order=desc&_embed=wp:featuredmedia&_fields=id,date,title,link,_embedded,_links';
const decode=value=>String(value).replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n))).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
function newsImage(post){const media=post._embedded?.['wp:featuredmedia']?.[0];const sizes=media?.media_details?.sizes;const value=sizes?.medium_large?.source_url||sizes?.medium?.source_url||media?.source_url;try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='hnnoticias.com.br'?u.href:null}catch{return null}}
export default async function handler(request){
 if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers:{Allow:'GET'}});
  try{
   const upstream=await fetch(NEWS_URL,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(9000)});
   if(!upstream.ok)throw Error('upstream');const raw=await upstream.json();
   if(!Array.isArray(raw))throw Error('schema');
   const items=raw.slice(0,3).filter(p=>p.title?.rendered&&p.link&&/^\d{4}-\d{2}-\d{2}T/.test(p.date)).map(p=>({title:decode(p.title.rendered.replace(/<[^>]*>/g,'')),url:p.link,date:p.date,image:newsImage(p)})).filter(p=>{try{const u=new URL(p.url);return u.protocol==='https:'&&u.hostname==='hnnoticias.com.br'}catch{return false}});
   if(!items.length)throw Error('empty');
   const response=Response.json({items},{headers:{'Cache-Control':'public, max-age=60','Netlify-CDN-Cache-Control':'public, s-maxage=300, stale-while-revalidate=300'}});
   return response;
  }catch{return Response.json({error:'Notícias temporariamente indisponíveis'},{status:503,headers:{'Cache-Control':'no-store'}})}
};
export const config={path:'/api/politica'};
