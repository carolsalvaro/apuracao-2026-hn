import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

// Social crawlers require an absolute image URL in the initial HTML. Choose
// the build's own preview address; production is prepared for the agreed domain.
export function prepareSocial(html,env=process.env){
 const origin=env.CONTEXT==='production'?'https://apuracao.hnnoticias.com.br':
  (env.DEPLOY_PRIME_URL||'https://deploy-preview-1--stupendous-muffin-2438f0.netlify.app');
 const url=new URL(origin);
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash||
  !(url.hostname==='apuracao.hnnoticias.com.br'||url.hostname==='stupendous-muffin-2438f0.netlify.app'||url.hostname.endsWith('--stupendous-muffin-2438f0.netlify.app')))throw Error('Unexpected sharing image origin');
 const image=url.origin+'/compartilhar-2-turno-2026.jpg';
 return html.replace(/(<meta (?:property="og:image"|name="twitter:image") content=")[^"]+("\s*\/?>)/g,(_,prefix,suffix)=>prefix+image+suffix);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const path=new URL('../public/index.html',import.meta.url);
 await writeFile(path,prepareSocial(await readFile(path,'utf8')));
}
