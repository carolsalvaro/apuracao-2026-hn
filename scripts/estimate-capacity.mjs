// Planning scenario, not a quote or a Netlify load test. No network access.
import {gzipSync} from 'node:zlib';
import {readFileSync} from 'node:fs';
import settings from '../config/tse.json' with {type:'json'};
import bootstrap from '../netlify/data/tse-bootstrap.json' with {type:'json'};
import catalogue from '../public/localities.json' with {type:'json'};
import {createResultsHandler} from '../netlify/lib/results-api.mjs';
import {MemoryStore} from '../tests/tse-fixtures.mjs';
const handler=createResultsHandler({config:settings,getStore:()=>new MemoryStore(),seedRecords:bootstrap.records});
const ids=[...new Set([...catalogue.southCities.map(c=>c.id),...catalogue.cities.slice(0,6).map(c=>c.id)])].sort();
const overview=Buffer.from(await(await handler(new Request('https://test/api/resultados?kind=overview'))).text());
const municipal=Buffer.from(await(await handler(new Request('https://test/api/resultados?ids='+ids.map(id=>'municipality-'+id).join(',')))).text());
const html=readFileSync(new URL('../public/index.html',import.meta.url));
const visitors=5000,hours=2,requestCount=visitors*hours*(60+60+12);
const sizes={html:{raw:html.length,gzip:gzipSync(html).length},overview:{raw:overview.length,gzip:gzipSync(overview).length},municipal:{raw:municipal.length,gzip:gzipSync(municipal).length}};
const scenario=key=>{
 const bytes=visitors*(sizes.html[key]+hours*(60*sizes.overview[key]+60*sizes.municipal[key]));
 return {gb:Math.round(bytes/1e9*100)/100,bandwidthCredits:Math.ceil(bytes/1e9*20)};
};
console.log(JSON.stringify({assumptions:{visitors,hours,overviewReadsPerHour:60,municipalReadsPerHour:60,newsReadsPerHour:12,oneInitialHTMLPerVisitor:true,municipalIds:ids.length,requestCreditsPer10000:2,bandwidthCreditsPerGB:20,personalMonthlyCredits:1000,availableCredits:760,pricingSource:'https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/'},requests:requestCount,requestCredits:requestCount/10000*2,payloadBytes:sizes,rawTransfer:scenario('raw'),hypotheticalGzipTransfer:scenario('gzip'),excludes:['news bodies','JS/catalogue/assets','reloads and audience turnover','compute and storage','existing account usage and other projects'],limitation:'Illustrative two-hour sustained peak after 17:00 on 25/10, with all municipalities still counting, not actual usage or an invoice. Gzip sizes are local estimates, not Netlify billing observations.'},null,2));
