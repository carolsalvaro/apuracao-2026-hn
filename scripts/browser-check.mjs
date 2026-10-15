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
let mode='awaiting';
const server=createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/resultados') {
    if(mode==='offline'){res.writeHead(503,{'content-type':'application/json'});res.end('{}');return;}
    const response=await handler(new Request(url)),body=await response.json();
    if(mode==='counting')for(const item of body.items){if(!item.result)continue;item.status='current';item.source='durable_cache';const r=item.result;r.phase='counting';r.sections={total:100,counted:50,percent:50};r.validVotes=100;r.publishedAt='2026-10-25T18:00:00-03:00';r.candidates.forEach(c=>{c.votes=c.number==='13'?40:60;c.percent=c.votes;});}
    res.writeHead(response.status,{'content-type':'application/json'});res.end(JSON.stringify(body));return;
  }
  if(url.pathname==='/api/politica'){res.writeHead(200,{'content-type':'application/json'});res.end('{"items":[]}');return;}
  const path=url.pathname==='/'?'index.html':url.pathname.slice(1);
  if(!['index.html','localities.json','results-ui.js','result-view.js'].includes(path)){res.writeHead(404);res.end();return;}
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
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await page.goto(origin,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('#sn-gov-cards .sn-gov'));
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
  mode='offline';await page.locator('#sn-update-results').click();await page.waitForFunction(()=>!document.querySelector('#sn-update-results').disabled);
  assert.equal(await page.locator('.sn-candidate .sn-score').first().textContent(),'40,0%');
  await page.waitForFunction(()=>document.querySelector('#sn-update-status').textContent.includes('indisponível'));
  assert.match(await page.locator('#sn-update-status').textContent(),/indisponível/);
  assert.match(await page.locator('.sn-nat-foot').textContent(),/último resultado válido mantido/i);
  mode='awaiting';await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelector('#sn-gov-cards .sn-gov'));
  await page.screenshot({path:`artifacts/browser/${width}.png`,fullPage:true,animations:'disabled'});
  assert.deepEqual(errors,[]);results.push({width,officialAwaiting:true,identityOrdering:true,failurePreservesLastValid:true,mapSelection:true,favorites:true,noOverflow:true,pageErrors:errors});await context.close();
 }
 await writeFile('artifacts/browser/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
