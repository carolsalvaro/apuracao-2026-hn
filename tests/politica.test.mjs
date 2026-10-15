import test from 'node:test';
import assert from 'node:assert/strict';
import handler,{config} from '../netlify/functions/politica.mjs';
import {readFile} from 'node:fs/promises';
const request=()=>new Request('https://example.test/api/politica');
test('rota e resposta com foto, entidades e cache',async()=>{
 const previous=globalThis.fetch;
 globalThis.fetch=async url=>{assert(String(url).includes('categories=254'));return Response.json([{date:'2026-10-15T12:00:00',title:{rendered:'Título &amp; política'},link:'https://hnnoticias.com.br/politica/exemplo/',_embedded:{'wp:featuredmedia':[{source_url:'https://hnnoticias.com.br/wp-content/uploads/test.jpg'}]}}]);};
 try{assert.equal(config.path,'/api/politica');const response=await handler(request());assert.equal(response.status,200);assert(response.headers.get('Netlify-CDN-Cache-Control').includes('s-maxage=300'));const data=await response.json();assert.equal(data.items[0].title,'Título & política');assert(data.items[0].image.endsWith('test.jpg'));}finally{globalThis.fetch=previous;}
});
test('falha de origem não vira lista vazia válida',async()=>{const previous=globalThis.fetch;globalThis.fetch=async()=>{throw Error('offline')};try{const r=await handler(request());assert.equal(r.status,503);assert.equal(r.headers.get('Cache-Control'),'no-store');}finally{globalThis.fetch=previous;}});
test('rejeita schema inválido e links externos',async()=>{const previous=globalThis.fetch;try{for(const payload of [{invalid:true},[{date:'2026-10-15T12:00:00',title:{rendered:'x'},link:'https://example.org/'}]]){globalThis.fetch=async()=>Response.json(payload);assert.equal((await handler(request())).status,503);}}finally{globalThis.fetch=previous;}});
test('método de escrita rejeitado',async()=>{assert.equal((await handler(new Request('https://example.test/api/politica',{method:'POST'}))).status,405);});
test('HTML preserva salvaguardas de prévia e rota local',async()=>{const page=await readFile(new URL('../public/index.html',import.meta.url),'utf8');assert(page.includes('noindex,nofollow'));assert(page.includes("fetch('/api/politica'"));assert(page.includes('Presidente e mapas seguem em demonstração'));assert(page.includes('prefers-reduced-motion'));assert(page.includes('id="sn-president"'));});
