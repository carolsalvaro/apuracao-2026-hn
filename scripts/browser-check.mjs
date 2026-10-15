// Requires a local Netlify server. External requests are blocked to avoid loading TSE.
import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
const baselineHTML=execFileSync('git',['show','3225218:public/index.html'],{maxBuffer:10_000_000}).toString();
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
await mkdir('artifacts/browser',{recursive:true});
const results=[];
try {
  for(const width of [320,375,390,768,1440]){
    const context=await browser.newContext({viewport:{width,height:900},isMobile:width<768,hasTouch:width<768,reducedMotion:'reduce'});
    const errors=[],page=await context.newPage();
    const geometry=()=>page.evaluate(()=>Object.fromEntries(['.sn-header','.sn-nav','#sn-president','#sn-brazil','#sn-sponsor-top','#sn-sponsor-mid'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [s,{x:r.x,y:r.y+scrollY,width:r.width,height:r.height}]})));
    let baseline=true;
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',route=>{const url=new URL(route.request().url());if(baseline && route.request().isNavigationRequest())return route.fulfill({contentType:'text/html',body:baselineHTML});return ['localhost','127.0.0.1'].includes(url.hostname)||['data:','blob:'].includes(url.protocol)?route.continue():route.abort();});
    await page.goto('http://localhost:8888/',{waitUntil:'networkidle'});
    const before=await geometry();
    baseline=false;errors.length=0;
    await page.reload({waitUntil:'networkidle'});
    assert.deepEqual(await geometry(),before,`approved layout changed at ${width}`);
    assert.equal(await page.locator('#sn-president').count(),1);
    const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert(dimensions.scroll<=dimensions.width+1,`horizontal overflow at ${width}: ${JSON.stringify(dimensions)}`);
    const president=page.locator('.sn-nav a[href="#sn-president"]');
    await president.click();assert.equal(await president.getAttribute('aria-current'),'location');
    await page.locator('#sn-city-select').selectOption({index:1});
    const selected=await page.locator('#sn-city-select').inputValue();
    assert((await page.locator('#sn-detail').textContent()).includes(selected));
    await page.locator('#sn-update-results').click();
    await page.waitForFunction(()=>!document.querySelector('#sn-update-results').disabled);
    assert((await page.locator('#sn-update-status').textContent()).includes('demonstração'));
    assert.equal((await page.request.get('http://localhost:8888/api/resultados')).status(),503);
    await page.screenshot({path:`artifacts/browser/${width}.png`,fullPage:true,animations:'disabled'});
    assert.deepEqual(errors,[]);
    results.push({width,mobileEmulation:width<768,overflow:false,approvedLayoutGeometry:true,selectMapSync:true,presidentNavigation:true,demonstrationWarning:true,pageErrors:errors});
    await context.close();
  }
  await writeFile('artifacts/browser/results.json',JSON.stringify(results,null,2));
  console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}
