// Read-only checks of PR #1. Never invokes the collector or opens CTA destinations.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
// Python uses the managed system CA bundle. Chromium receives those verified
// responses via routing; no certificate bypass or trust-store changes are used.
const run=promisify(execFile),cache=new Map();
const verifiedResponse=url=>{
  if(!cache.has(url)) cache.set(url,run('python',['-c',`
import urllib.request,urllib.error,json,base64,sys
try: r=urllib.request.urlopen(sys.argv[1],timeout=55)
except urllib.error.HTTPError as e: r=e
headers={k.lower():v for k,v in r.headers.items() if k.lower() not in ['content-length','content-encoding','transfer-encoding','connection']}
print(json.dumps({'status':r.status,'headers':headers,'body':base64.b64encode(r.read()).decode()}))
`,url],{maxBuffer:10000000}).then(({stdout})=>{const r=JSON.parse(stdout);return {...r,body:Buffer.from(r.body,'base64')};}));
  return cache.get(url);
};
const origin='https://deploy-preview-1--stupendous-muffin-2438f0.netlify.app';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
await mkdir('artifacts/preview',{recursive:true});
const results=[];
try {
  for(const width of [320,375,390,768,1440]) {
    const context=await browser.newContext({viewport:{width,height:900},isMobile:width<768,hasTouch:width<768,reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[],failed=[];
    // Never contact WhatsApp: locally fulfill the popup navigation to verify
    // the deployed page actually opens it, rather than merely having an href.
    await context.route('https://wa.me/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Local sharing destination</title>'}));
    page.on('pageerror',e=>errors.push(e.message));
    page.on('requestfailed',r=>failed.push({url:r.url(),error:r.failure()?.errorText}));
    await page.route('**/*',async route=>{
      const u=new URL(route.request().url());
      // Do not send QA traffic to Google; validate initialization separately.
      if(u.hostname==='www.googletagmanager.com') return route.fulfill({status:200,contentType:'text/javascript',body:''});
      const samePreview=u.origin===origin && !u.pathname.includes('tse-collect');
      const image=route.request().resourceType()==='image' && u.hostname==='hnnoticias.com.br';
      const icons=[
        'https://unpkg.com/lucide@1.17.0/dist/umd/lucide.js',
        'https://unpkg.com/@floating-ui/core@1.7.3/dist/floating-ui.core.umd.min.js',
        'https://unpkg.com/@floating-ui/dom@1.7.4/dist/floating-ui.dom.umd.min.js'
      ].includes(u.href);
      if(samePreview||image||icons) return route.fulfill(await verifiedResponse(u.href));
      return ['data:','blob:'].includes(u.protocol)?route.continue():route.abort();
    });
    const response=await page.goto(origin,{waitUntil:'networkidle',timeout:90000});
    assert.equal(response.status(),200);
    assert.match((await response.allHeaders())['x-robots-tag'],/noindex/);
    assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/noindex/);
    // The real Netlify-injected drawer must not cover the page when its iframe
    // is refused by our CSP. Unlike source-only QA, this checks post-build HTML.
    const drawer=page.locator('body > div[data-netlify-site-id][data-netlify-deploy-id]');
    if(await drawer.count()) assert.equal(await drawer.evaluate(e=>getComputedStyle(e).display),'none');
    assert(await page.locator('#sn-whatsapp-link').isVisible());
    const whatsapp=new URL(await page.locator('#sn-whatsapp-link').getAttribute('href'));
    assert.equal(whatsapp.origin,'https://wa.me');
    assert(whatsapp.searchParams.get('text').endsWith(origin+'/'));
    if(width===390){
      const opened=page.waitForEvent('popup',{timeout:5000});
      await page.locator('#sn-whatsapp-link svg').tap();
      const popup=await opened;await popup.waitForURL('https://wa.me/**',{waitUntil:'domcontentloaded'});
      assert.equal(await popup.title(),'Local sharing destination');
      assert.equal(popup.url(),whatsapp.href);await popup.close();
    }
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const president=page.locator('.sn-nav a[href="#sn-president"]');
    await president.click();assert.equal(await president.getAttribute('aria-current'),'location');
    await page.waitForFunction(()=>document.querySelector('#sn-map-svg path'));
    await page.locator('#sn-city-select').selectOption({index:1});
    const selectedName=(await page.locator('#sn-city-select option:checked').textContent()).split(' · ')[0];
    assert((await page.locator('#sn-detail').textContent()).includes(selectedName));
    await page.locator('#sn-update-results').click();
    await page.waitForFunction(()=>!document.querySelector('#sn-update-results').disabled,{},{timeout:60000});
    assert(!/demonstração|fictícios|simulação/i.test(await page.locator('body').innerText()));
    assert.equal(await page.locator('#sn-br-svg path').count(),27);
    assert.equal(await page.locator('#sn-map-svg path').count(),45);
    assert.equal(await page.locator('#sn-gov-cards .sn-gov').count(),6);
    const images=await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>i.getBoundingClientRect().width>0).map(i=>({loaded:i.complete&&i.naturalWidth>0,alt:i.alt})));
    await page.screenshot({path:`artifacts/preview/${width}.png`,fullPage:true,animations:'disabled'});
    assert.deepEqual(errors,[]);
    results.push({width,transport:'TLS-verified Python responses replayed in Chromium',noindex:true,overflow:false,navigation:true,municipalSelection:true,officialResultsUI:true,images,errors,failed});
    await context.close();
  }
  await writeFile('artifacts/preview/results.json',JSON.stringify(results,null,2));
  console.log(JSON.stringify(results,null,2));
} finally {await browser.close();}
