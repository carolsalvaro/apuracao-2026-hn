import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {prepareSocial} from '../scripts/prepare-social.mjs';

test('sharing metadata is in initial HTML, with a real JPEG and environment-correct absolute URLs',async()=>{
 const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
 assert.match(html,/<title>Presidente: apuração do 2º turno de 2026/);
 assert.match(html,/<meta property="og:title" content="Presidente: apuração do 2º turno de 2026/);
 assert.match(html,/<meta property="og:image:width" content="1200">/);
 assert.match(html,/<meta property="og:image:height" content="630">/);
 const image=await readFile(new URL('../public/compartilhar-2-turno-2026.jpg',import.meta.url));
 assert.equal(image.readUInt16BE(0),0xffd8);
 for(const [env,host]of [[{CONTEXT:'deploy-preview',DEPLOY_PRIME_URL:'https://deploy-preview-1--stupendous-muffin-2438f0.netlify.app'},'deploy-preview-1--stupendous-muffin-2438f0.netlify.app'],[{CONTEXT:'production',DEPLOY_PRIME_URL:'https://stupendous-muffin-2438f0.netlify.app'},'apuracao.hnnoticias.com.br']]){
  const result=prepareSocial(html,env);
  for(const meta of ['property="og:image"','name="twitter:image"'])assert(result.includes(`${meta} content="https://${host}/compartilhar-2-turno-2026.jpg"`));
  assert.match(result,/<meta name="robots" content="noindex,nofollow"/);
 }
 assert.throws(()=>prepareSocial(html,{DEPLOY_PRIME_URL:'https://other.example'}),/Unexpected sharing image origin/);
});
