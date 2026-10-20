// Local integration checks with captured official records; no external requests.
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import config from '../config/tse.json' with {type:'json'};
import bootstrap from '../netlify/data/tse-bootstrap.json' with {type:'json'};
import {createResultsHandler} from '../netlify/lib/results-api.mjs';
import {MemoryStore} from '../tests/tse-fixtures.mjs';
const handler=createResultsHandler({config,getStore:()=>new MemoryStore(),seedRecords:bootstrap.records});
let mode='awaiting',catalogueFailures=0,newsMode='empty',newsRevision=1;
const server=createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/resultados') {
    if(mode==='offline'){res.writeHead(503,{'content-type':'application/json'});res.end('{}');return;}
    const response=await handler(new Request(url)),body=await response.json();
    if(['counting','totalized'].includes(mode))for(const item of body.items){if(!item.result)continue;item.status='current';item.source='durable_cache';const r=item.result;r.phase=mode==='totalized'?'totalized':'counting';r.sections={total:100,counted:mode==='totalized'?100:50,percent:mode==='totalized'?100:50};r.validVotes=100;r.publishedAt=mode==='totalized'?'2026-10-25T18:01:00-03:00':'2026-10-25T18:00:00-03:00';r.candidates.forEach(c=>{c.votes=c.number==='13'?40:60;c.percent=c.votes;});}
    res.writeHead(response.status,{'content-type':'application/json'});res.end(JSON.stringify(body));return;
  }
  if(url.pathname==='/api/politica'){
    if(newsMode==='offline'){res.writeHead(503);res.end();return;}
    res.writeHead(200,{'content-type':'application/json'});
    res.end(JSON.stringify({items:newsMode==='empty'?[]:Array.from({length:3},(_,i)=>({title:`Notícia local ${newsRevision}-${i}`,url:`https://hnnoticias.com.br/politica/noticia-local-${i}/`,date:'2026-10-20T10:00:00',image:'https://hnnoticias.com.br/imagem-indisponivel-teste.jpg'}))}));return;
  }
  if(url.pathname==='/localities.json'&&catalogueFailures>0){catalogueFailures--;res.writeHead(503);res.end();return;}
  const path=url.pathname==='/'?'index.html':url.pathname.slice(1);
  if(!['index.html','localities.json','results-ui.js','result-view.js','analytics.js'].includes(path)){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'content-type':path.endsWith('.js')?'text/javascript':path.endsWith('.json')?'application/json':'text/html'});res.end(await readFile(new URL('../public/'+path,import.meta.url)));
 }catch(e){res.writeHead(500);res.end(String(e));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
await mkdir('artifacts/browser',{recursive:true});const results=[];
try {
 for(const width of [320,375,390,768,1440]){
  mode='awaiting';const context=await browser.newContext({viewport:{width,height:900},isMobile:width<768,hasTouch:width<768,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  if(width===390)await page.clock.install();
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  if(width===390)catalogueFailures=1;
  await page.goto(origin,{waitUntil:'networkidle'});
  if(width===390){await page.waitForFunction(()=>document.querySelector('#sn-update-status').textContent.includes('15 segundos'));await page.clock.fastForward(16000);}
  await page.waitForFunction(()=>document.querySelector('#sn-gov-cards .sn-gov'));
  // Reproduce Netlify's post-build drawer, including its inline fixed styles.
  // The external frame must stay blocked and its broken-frame strip invisible.
  await page.evaluate(()=>{
   const drawer=document.createElement('div');
   drawer.dataset.netlifySiteId='preview-test';drawer.dataset.netlifyDeployId='preview-test';
   drawer.style='position:fixed;bottom:0;z-index:2147483647;width:100vw';
   const frame=document.createElement('iframe');frame.title='Netlify Drawer';
   frame.src='https://app.netlify.com/cdp/';frame.style='display:block!important;width:100vw;height:48px;border:0';
   drawer.append(frame);document.body.append(drawer);
  });
  assert.equal(await page.locator('body > div[data-netlify-site-id][data-netlify-deploy-id]').evaluate(e=>getComputedStyle(e).display),'none');
  assert.match(await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content'),/frame-src 'none'/);
  assert.equal(await page.locator('#sn-map-svg path').count(),45);
  assert.equal(await page.locator('#sn-br-svg path').count(),27);
  assert.equal(await page.locator('#sn-gov-cards .sn-gov').count(),6);
  assert.equal(await page.locator('.sn-candidate .sn-score').first().textContent(),'—');
  assert.equal(await page.locator('#sn-map-svg path').first().getAttribute('fill'),'#c9d4dd');
  assert.equal(await page.locator('#sn-br-svg path').first().getAttribute('fill'),'#c9d4dd');
  assert(!(await page.locator('body').innerText()).match(/demonstração|fictícios|simulação|45\.850\.000|52,4%/i));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.locator('.sn-nav a[href="#sn-president"]').click();
  assert.equal(await page.locator('.sn-nav a[href="#sn-president"]').getAttribute('aria-current'),'location');
  await page.locator('#sn-city-select').selectOption({index:1});
  const text=await page.locator('#sn-city-select option:checked').textContent();
  assert((await page.locator('#sn-detail h3').textContent()).includes(text.split(' · ')[0]));
  await page.locator('#sn-fav-search').fill('Tubarão');await page.locator('[data-fav="4218707"]').click();
  assert.equal(await page.locator('#sn-fav-search').inputValue(),'');
  assert.equal(await page.locator('#sn-fav-cards .sn-fav-card h3').first().textContent(),'Tubarão');
  mode='counting';await page.locator('#sn-update-results').click();await page.waitForFunction(()=>!document.querySelector('#sn-update-results').disabled);
  assert.equal(await page.locator('.sn-candidate .sn-score').first().textContent(),'40,0%');
  assert.equal(await page.locator('.sn-candidate .sn-score').last().textContent(),'60,0%');
  assert.equal(await page.locator('#sn-br-svg path').first().getAttribute('fill'),'#246db5');
  if(width===390){
   let inProgressReads=0;const countRead=r=>{if(r.url().includes('/api/resultados?ids='))inProgressReads++;};page.on('response',countRead);
   const nextMunicipal=page.waitForResponse(r=>r.url().includes('/api/resultados?ids='));
   await page.clock.fastForward(61000);await nextMunicipal;await page.waitForFunction(()=>!document.querySelector('#sn-update-results').disabled);
   assert(inProgressReads>=1,'municipalities in progress must poll after one minute');page.off('response',countRead);
   mode='totalized';await page.locator('#sn-update-results').click();await page.waitForFunction(()=>!document.querySelector('#sn-update-results').disabled);
   assert.match(await page.locator('#sn-detail').textContent(),/acompanhamento automático encerrado/);
   let municipalReads=0;page.on('response',r=>{if(r.url().includes('/api/resultados?ids='))municipalReads++;});
   const overview=page.waitForResponse(r=>r.url().includes('kind=overview'));
   await page.clock.fastForward(61000);await overview;await page.waitForFunction(()=>!document.querySelector('#sn-update-results').disabled);
   assert.equal(municipalReads,0,'completed municipalities must leave automatic polling');
  }
  if(width===390){
   await page.evaluate(()=>{window.savedGeoPath=d3.geoPath;d3.geoPath=()=>{throw Error('local rendering fault');};});
   await page.locator('#sn-update-results').click();
   await page.waitForFunction(()=>!document.querySelector('#sn-update-results').disabled);
   assert.match(await page.locator('#sn-update-status').textContent(),/Nova tentativa automática/);
   await page.evaluate(()=>{d3.geoPath=window.savedGeoPath;delete window.savedGeoPath;});
   const recoveredRender=page.waitForResponse(r=>r.url().includes('kind=overview')&&r.status()===200);
   await page.clock.fastForward(61000);await recoveredRender;await page.waitForFunction(()=>!document.querySelector('#sn-update-results').disabled);
   assert(!await page.locator('#sn-update-status').textContent().then(t=>t.includes('Não foi possível')));
  }
  mode='offline';await page.locator('#sn-update-results').click();await page.waitForFunction(()=>!document.querySelector('#sn-update-results').disabled);
  assert.equal(await page.locator('.sn-candidate .sn-score').first().textContent(),'40,0%');
  await page.waitForFunction(()=>document.querySelector('#sn-update-status').textContent.includes('indisponível'));
  assert.match(await page.locator('#sn-update-status').textContent(),/indisponível/);
  assert.match(await page.locator('.sn-nat-foot').textContent(),/último resultado válido mantido/i);
  if(width===390){mode='counting';const recovered=page.waitForResponse(r=>r.url().includes('kind=overview')&&r.status()===200);await page.clock.fastForward(61000);await recovered;await page.waitForFunction(()=>!document.querySelector('#sn-update-results').disabled);assert(!await page.locator('#sn-update-status').textContent().then(t=>t.includes('indisponível')));}
  assert.equal(await page.evaluate(()=>window.dataLayer.filter(v=>v[0]==='event'&&v[1]==='page_view').length),1,'polling, navigation and animations must not send additional pageviews');
  mode='awaiting';await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelector('#sn-gov-cards .sn-gov'));
  await page.screenshot({path:`artifacts/browser/${width}.png`,fullPage:true,animations:'disabled'});
  const ga=await page.evaluate(()=>window.dataLayer.map(v=>Array.from(v)));assert.equal(ga.filter(v=>v[0]==='event'&&v[1]==='page_view').length,1);assert.equal(ga.find(v=>v[0]==='config')[1],'G-VZYMP84YWY');assert.equal(ga.find(v=>v[0]==='config')[2].send_page_view,false);assert.equal(ga.find(v=>v[0]==='consent')[2].analytics_storage,'denied');assert.deepEqual(errors,[]);results.push({width,officialAwaiting:true,identityOrdering:true,failurePreservesLastValid:true,mapSelection:true,favorites:true,noOverflow:true,pageErrors:errors});await context.close();
 }
 // Exercise news recovery locally; no HN/TSE/Google traffic is allowed.
 mode='awaiting';newsMode='live';newsRevision=1;
 const newsContext=await browser.newContext({viewport:{width:390,height:900}}),newsPage=await newsContext.newPage();
 await newsPage.clock.install();
 await newsPage.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 let newsReads=0;newsPage.on('response',r=>{if(r.url().endsWith('/api/politica'))newsReads++;});
 await newsPage.goto(origin,{waitUntil:'networkidle'});
 await newsPage.waitForFunction(()=>document.querySelector('#sn-news-status').textContent.includes('Categoria Política'));
 assert.equal(await newsPage.locator('#sn-news-cards .sn-news-card').count(),3);
 assert.match(await newsPage.locator('#sn-news-cards h3').first().textContent(),/Notícia local 1-0/);
 await newsPage.locator('#sn-news-cards').scrollIntoViewIfNeeded();
 await newsPage.waitForFunction(()=>document.querySelectorAll('#sn-news-cards img').length===0);
 newsMode='offline';await newsPage.clock.fastForward(301000);
 await newsPage.waitForFunction(()=>document.querySelector('#sn-news-status').textContent.includes('salvas'));
 assert.match(await newsPage.locator('#sn-news-cards h3').first().textContent(),/Notícia local 1-0/);
 await newsPage.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:true}));
 const readsBeforeHidden=newsReads;newsMode='live';newsRevision=2;
 await newsPage.clock.fastForward(301000);assert.equal(newsReads,readsBeforeHidden,'hidden tabs must not poll news');
 await newsPage.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
 await newsPage.waitForFunction(()=>document.querySelector('#sn-news-cards h3').textContent.includes('Notícia local 2-0'));
 assert.equal(newsReads,readsBeforeHidden+1,'returning to tab refreshes news immediately');
 assert.equal(await newsPage.evaluate(()=>window.dataLayer.filter(v=>v[0]==='event'&&v[1]==='page_view').length),1);
 results.push({scenario:'newsRecovery',automaticRefresh:true,failureRetainsHeadlines:true,missingImageRemoved:true,hiddenTabPaused:true,visibleTabRecoversImmediately:true});
 // Sharing excludes query/hash, supports native share and both copy fallbacks.
 await newsPage.evaluate(()=>{history.replaceState(null,'','/?test=private#sn-fav');Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.sharedData=data;}});});
 await newsPage.locator('#sn-share-button').click();
 assert.equal(await newsPage.evaluate(()=>window.sharedData.url),origin+'/');
 await newsPage.evaluate(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:undefined});Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copiedLink=text;}}});});
 await newsPage.locator('#sn-copy-link').click();
 assert.equal(await newsPage.evaluate(()=>window.copiedLink),origin+'/');
 assert.equal(await newsPage.locator('#sn-share-feedback').textContent(),'Link copiado!');
 await newsPage.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied');}}}));
 await newsPage.locator('#sn-copy-link').click();
 assert.equal(await newsPage.locator('#sn-share-link').inputValue(),origin+'/');
 assert(await newsPage.locator('#sn-share-link').isVisible());
 await newsPage.evaluate(()=>{window.copyCalls=0;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{window.copyCalls++;}}});Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('cancelled','AbortError');}});});
 await newsPage.locator('#sn-share-button').click();assert.equal(await newsPage.evaluate(()=>window.copyCalls),0);
 assert.equal(await newsPage.evaluate(()=>window.dataLayer.filter(v=>v[0]==='event'&&v[1]==='page_view').length),1);
 results.push({scenario:'sharing',nativeShare:true,clipboardFallback:true,manualCopyFallback:true,cancelDoesNotCopy:true,queryAndHashExcluded:true});
 await newsContext.close();
 await writeFile('artifacts/browser/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
