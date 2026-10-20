// Rebuild the social card locally from the approved page's existing logos.
// No external resources, election results or candidate images are requested.
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const logos=[...html.matchAll(/<img\b[^>]*>/g)].map(m=>m[0]);
const logo=alt=>{const tag=logos.find(t=>t.includes(`alt="${alt}"`));if(!tag)throw Error(`Missing logo: ${alt}`);return tag.match(/src="([^"]+)"/)[1];};
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try {
 const page=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
 await page.route('**/*',r=>r.abort());
 await page.setContent(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><style>
 *{box-sizing:border-box}body{margin:0;background:#102f50;color:#fff;font-family:Arial,sans-serif}
 header{height:135px;background:#f3f8fc;display:flex;align-items:center;gap:36px;padding:0 66px;border-bottom:5px solid #d5b462}
 header img:first-child{width:310px;height:auto}header img:nth-of-type(2){width:180px;height:auto;max-height:80px;object-fit:contain}
 .edition{margin-left:auto;color:#183951;font-size:25px;font-weight:700}
 main{padding:48px 66px}.round{color:#f0cd73;font-weight:800;font-size:25px;letter-spacing:5px;margin:0 0 19px}
 h1{font-size:76px;line-height:1;margin:0 0 15px;letter-spacing:-2px}h2{font-size:47px;margin:0 0 26px;font-weight:500}
 .description{font-size:25px;line-height:1.5;color:#d3e3ee;margin:0}.rule{width:70px;height:4px;background:#d5b462;margin:28px 0 20px}
 footer{font-size:21px;color:#d3e3ee}
 </style><header><img src="${logo('HN Notícias')}" alt="HN Notícias"><img src="${logo('Vertical FM')}" alt="Vertical FM"><div class="edition">ELEIÇÕES 2026</div></header>
 <main><p class="round">2º TURNO · PRESIDENTE</p><h1>Apuração 2026</h1><h2>O Brasil decide. Acompanhe aqui.</h2><p class="description">Resultados do TSE e cobertura do HN Notícias e da Vertical FM.</p><div class="rule"></div><footer>Brasil · Santa Catarina · Sua cidade</footer></main></html>`,{waitUntil:'load'});
 await page.screenshot({path:new URL('../public/compartilhar-2-turno-2026.jpg',import.meta.url).pathname,type:'jpeg',quality:90});
}finally{await browser.close();}
