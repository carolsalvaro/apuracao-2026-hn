import {numbers,percentage as pct,acceptItem,candidate,votePercent,leaderColor,phaseText} from './result-view.js';
const root=document.getElementById('snu-preview'),q=s=>root.querySelector(s);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number.isFinite(n)?n.toLocaleString('pt-BR'):'—';
const date=s=>new Date(s).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});
const items=new Map();let catalogue;
let region='Todas',mode='progress',selected='4204608',active='42',only=false,limit=6,busy=false,pending=false;
let favorites=new Set();
try{favorites=new Set(JSON.parse(localStorage.getItem('snu-demo-favorites')||'[]').filter(x=>/^\d{7}$/.test(x)));}catch{}
const cityItem=id=>items.get('municipality-'+id);
function stamp(item) {
  if(!item?.result)return 'Não foi possível obter o resultado desta localidade.';
  const origin='Arquivo TSE: '+date(item.result.publishedAt)+' (Brasília).';
  const checked=item.checkedAt?' Consulta: '+date(item.checkedAt)+'.':'';
  const status=item.source==='verified_snapshot'?' Último arquivo oficial verificado; atualização pendente.':item.status==='current'?'':item.status==='stale'?' Arquivo anterior; confira o horário.':' Consulta indisponível; último resultado válido mantido.';
  return origin+checked+status;
}
function bars(item) {
  return `<p class="sn-small">${phaseText(item)}</p><div class="sn-progress-label"><span>Seções totalizadas</span><strong>${pct(item?.result?.sections.percent)}</strong></div><div class="sn-track"><span style="width:${item?.result?.sections.percent??0}%"></span></div><div style="margin-top:20px">${numbers.map((n,i)=>`<div class="sn-local-result"><span>${i===0?'Lula':'Flávio Bolsonaro'}<small>${fmt(candidate(item,n)?.votes)} votos</small></span><strong>${votePercent(item,n)}</strong></div>`).join('')}</div><p class="sn-help">${escape(stamp(item))}</p>`;
}
function national() {
  const item=items.get('president-br');
  q('.sn-national-top span').textContent=item?.result?pct(item.result.sections.percent)+' das seções totalizadas':'Dados indisponíveis';
  q('.sn-status').textContent=phaseText(item);
  [...root.querySelectorAll('.sn-candidate')].forEach((el,i)=>{
    el.querySelector('small').textContent=fmt(candidate(item,numbers[i])?.votes)+' votos';
    el.querySelector('.sn-score').textContent=votePercent(item,numbers[i]);
  });
  [...root.querySelectorAll('.sn-race-row')].forEach((el,i)=>{
    el.style.setProperty('--race-pct',(item?.result?.phase==='awaiting'?0:candidate(item,numbers[i])?.percent??0)+'%');
    el.querySelector('strong').textContent=votePercent(item,numbers[i]);
  });
  q('.sn-nat-foot').replaceChildren();
  const label=document.createElement('span'),time=document.createElement('span');
  label.textContent='Fonte: TSE · '+phaseText(item);time.textContent=stamp(item);q('.sn-nat-foot').append(label,time);
  const sc=items.get('state-sc');
  q('#sn-sc p').textContent=phaseText(sc)+' · '+stamp(sc);
  [...q('#sn-sc').querySelectorAll('strong')].forEach((el,i)=>el.textContent=i===0?pct(sc?.result?.sections.percent):votePercent(sc,numbers[i-1]));
}
function cityDetail() {
  const d=catalogue.southCities.find(c=>c.id===selected),item=cityItem(d.id);
  q('#sn-detail').innerHTML=`<div class="sn-kicker">${escape(d.region)} · PRESIDENTE</div><h3>${escape(d.name)}</h3>${bars(item)}`;
  const visible=catalogue.southCities.filter(d=>region==='Todas'||d.region===region).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
  q('#sn-city-select').innerHTML=visible.map(d=>`<option value="${d.id}">${escape(d.name)} · ${d.region}</option>`).join('');
  q('#sn-city-select').value=selected;
}
function southMap() {
  if(!catalogue)return;
  const el=q('#sn-map-svg'),w=Math.max(240,el.parentElement.clientWidth-36),h=350;
  const cities=catalogue.southCities.filter(c=>region==='Todas'||c.region===region),ids=new Set(cities.map(c=>c.id));
  const geo={type:'FeatureCollection',features:catalogue.southGeometry.features.filter(f=>ids.has(String(f.properties.codarea)))};
  const path=d3.geoPath(d3.geoMercator().fitExtent([[16,32],[w-16,h-20]],geo)),svg=d3.select(el).attr('viewBox',`0 0 ${w} ${h}`);
  svg.selectAll('*').remove();
  const color=item=>{
    if(mode==='leader')return leaderColor(item);
    if(!item?.result||item.result.phase==='awaiting')return '#c9d4dd';
    const p=item.result.sections.percent;return p===100?'#11815d':p>=75?'#1e6fb8':p>=50?'#72a7d1':'#c9dded';
  };
  svg.selectAll('path').data(geo.features).join('path').attr('d',path).attr('fill',f=>color(cityItem(String(f.properties.codarea)))).attr('stroke-width',f=>String(f.properties.codarea)===selected?3:1)
    .attr('data-tooltip',f=>{const id=String(f.properties.codarea),c=cities.find(c=>c.id===id);return c.name+': '+phaseText(cityItem(id));})
    .on('click',(e,f)=>{selected=String(f.properties.codarea);cityDetail();southMap();requestRefresh();});
  const feature=geo.features.find(f=>String(f.properties.codarea)===selected);
  if(feature){const c=path.centroid(feature);svg.append('circle').attr('cx',c[0]).attr('cy',c[1]).attr('r',4).attr('fill','#0e2d4f').attr('stroke','white').attr('stroke-width',2);
    svg.append('text').attr('x',c[0]).attr('y',c[1]-12).attr('text-anchor','middle').attr('font-size',12).attr('font-weight',750).attr('fill','#0e2d4f').attr('paint-order','stroke').attr('stroke','white').attr('stroke-width',4).text(cities.find(c=>c.id===selected).name);}
  const legend=mode==='progress'?[['#c9d4dd','Aguardando / indisponível'],['#c9dded','Até 49%'],['#72a7d1','50–74%'],['#1e6fb8','75–99%'],['#11815d','100%']]:[['#c9d4dd','Sem liderança'],['#d52b36','Lula'],['#246db5','Flávio Bolsonaro']];
  q('#sn-legend').innerHTML=legend.map(([c,t])=>`<span><i style="background:${c}"></i>${t}</span>`).join('');
}
function stateDetail() {
  const d=catalogue.states.find(s=>s.id===active),item=items.get('state-'+d.uf.toLowerCase());
  q('#sn-br-state').value=active;
  q('#sn-br-detail').innerHTML=`<div class="sn-kicker">PRESIDENTE · ${d.uf}</div><h3>${escape(d.name)}</h3>${bars(item)}`;
  d3.select(q('#sn-br-svg')).selectAll('path').attr('opacity',f=>String(f.properties.codarea)===active?1:.83).attr('stroke-width',f=>String(f.properties.codarea)===active?2.6:1);
}
function brazilMap() {
  if(!catalogue)return;
  const el=q('#sn-br-svg'),w=Math.max(240,el.parentElement.clientWidth-32),h=410;
  const path=d3.geoPath(d3.geoMercator().fitExtent([[12,14],[w-12,h-14]],catalogue.brazilGeometry)),svg=d3.select(el).attr('viewBox',`0 0 ${w} ${h}`);
  svg.selectAll('*').remove();
  const state=f=>catalogue.states.find(s=>s.id===String(f.properties.codarea));
  svg.selectAll('path').data(catalogue.brazilGeometry.features).join('path').attr('d',path).attr('fill',f=>leaderColor(items.get('state-'+state(f).uf.toLowerCase())))
    .attr('data-tooltip',f=>state(f).name+' · '+phaseText(items.get('state-'+state(f).uf.toLowerCase())))
    .on('pointerenter',(e,f)=>{if(e.pointerType!=='touch'){active=String(f.properties.codarea);stateDetail();}})
    .on('click',(e,f)=>{active=String(f.properties.codarea);stateDetail();requestRefresh();});
  svg.selectAll('text').data(catalogue.brazilGeometry.features.filter(f=>!['53','28','27','25','24','32','33'].includes(String(f.properties.codarea)))).join('text')
    .attr('x',f=>path.centroid(f)[0]).attr('y',f=>path.centroid(f)[1]).attr('text-anchor','middle').attr('font-size',11).attr('font-weight',700).attr('fill','#0e2d4f').attr('pointer-events','none').text(f=>state(f).uf);
  stateDetail();
}
const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function favoriteRows() {
  const term=normalize(q('#sn-fav-search').value),area=q('#sn-fav-region').value;
  return catalogue.cities.filter(d=>(area==='Brasil'||area==='SC'&&d.uf==='SC'||area==='Sul'&&d.sul)&&normalize(d.name+' '+d.uf).includes(term)&&(!only||favorites.has(d.id)))
    .sort((a,b)=>Number(favorites.has(b.id))-Number(favorites.has(a.id))).slice(0,limit);
}
function renderFavs() {
  const rows=favoriteRows();
  q('#sn-fav-count').textContent=`${favorites.size} favorita${favorites.size===1?'':'s'}`;
  q('#sn-fav-more').hidden=rows.length<limit;
  q('#sn-fav-cards').innerHTML=rows.map(d=>{
    const item=cityItem(d.id);
    return `<article class="sn-fav-card"><div class="sn-fav-top"><div><h3>${escape(d.name)}</h3><span class="sn-small">${d.uf} · Presidente</span></div><button class="sn-star" data-fav="${d.id}" aria-pressed="${favorites.has(d.id)}" aria-label="${favorites.has(d.id)?'Desfavoritar':'Favoritar'} ${escape(d.name)}">${favorites.has(d.id)?'★':'☆'}</button></div><div class="sn-progress-label"><span>${phaseText(item)}</span><strong>${pct(item?.result?.sections.percent)}</strong></div><div class="sn-track"><span style="width:${item?.result?.sections.percent??0}%"></span></div><div class="sn-local-result"><span>Lula</span><strong>${votePercent(item,'13')}</strong></div><div class="sn-local-result"><span>Flávio Bolsonaro</span><strong>${votePercent(item,'22')}</strong></div><p class="sn-help">${escape(stamp(item))}</p></article>`;
  }).join('')||'<div class="sn-empty">Nenhuma cidade nesta seleção. Desative “Só favoritas” para escolher cidades.</div>';
  root.querySelectorAll('[data-fav]').forEach(b=>b.onclick=()=>{
    const id=b.dataset.fav,adding=!favorites.has(id);adding?favorites.add(id):favorites.delete(id);
    if(adding){q('#sn-fav-search').value='';limit=6;}
    try{localStorage.setItem('snu-demo-favorites',JSON.stringify([...favorites]));}catch{q('#sn-fav-note').textContent='Favoritas salvas apenas durante esta sessão.';}
    renderFavs();requestRefresh();
  });
}
function governors() {
  const records=[...items.values()].filter(i=>i.kind==='governor'&&i.result);
  q('#sn-gov-cards').innerHTML=records.map(item=>{
    const d=item.result;
    return `<article class="sn-gov"><div class="sn-gov-top"><h3>${escape(d.name)}</h3><span class="sn-uf">${d.uf.toUpperCase()}</span></div>${d.candidates.map(c=>`<div class="sn-local-result"><span>${escape(c.name)}<small>${escape(c.party)} · ${fmt(c.votes)} votos</small></span><strong>${d.phase==='awaiting'?'—':pct(c.percent)}</strong></div>`).join('')}<div class="sn-progress-label"><span>${phaseText(item)}</span><strong>${pct(d.sections.percent)}</strong></div><div class="sn-track"><span style="width:${d.sections.percent}%"></span></div><p class="sn-gov-status">${escape(stamp(item))}</p></article>`;
  }).join('')||'<p class="sn-help">Resultados de governadores indisponíveis. Tentaremos novamente.</p>';
}
function render(){national();cityDetail();southMap();brazilMap();renderFavs();governors();}
let debounce;
function requestRefresh(){clearTimeout(debounce);debounce=setTimeout(refresh,250);}
async function load(query) {
  const response=await fetch('/api/resultados?'+query,{signal:AbortSignal.timeout(45000)});
  if(!response.ok)throw Error('unavailable');
  const data=await response.json();if(data.demo||!Array.isArray(data.items))throw Error('invalid_response');
  for(const item of data.items) {
    if(acceptItem(item)) {
      const previous=items.get(item.id);
      if(!previous?.result||Date.parse(item.result.publishedAt)>=Date.parse(previous.result.publishedAt))items.set(item.id,item);
    }else if(items.has(item.id))items.set(item.id,{...items.get(item.id),status:'unavailable'});
  }
  return data;
}
async function refresh() {
  if(busy){pending=true;return;}if(document.hidden||!catalogue)return;
  busy=true;q('#sn-update-results').disabled=true;q('#sn-update-status').textContent='Consultando resultados oficiais…';
  const municipalityIds=[...new Set([selected,...favoriteRows().map(c=>c.id),...catalogue.southCities.filter(c=>region==='Todas'||c.region===region).map(c=>c.id)])].sort();
  const queries=['kind=president','kind=state','kind=governor'];
  for(let i=0;i<municipalityIds.length;i+=50)queries.push('ids='+municipalityIds.slice(i,i+50).map(id=>'municipality-'+id).join(','));
  const results=await Promise.allSettled(queries.map(async query=>{const response=await load(query);render();return response;}));
  const failed=results.some(r=>r.status==='rejected'),partial=results.some(r=>r.status==='fulfilled'&&r.value.status!=='current');
  if(failed)for(const [id,item] of items)items.set(id,{...item,status:'unavailable'});
  render();q('#sn-update-status').textContent=failed?'Consulta indisponível ou parcial. Últimos resultados oficiais mantidos; confira os horários.':partial?'Arquivos oficiais carregados. Alguns dados são anteriores; confira o horário em cada quadro.':'Consulta concluída. Fonte: TSE.';
  busy=false;q('#sn-update-results').disabled=false;
  if(pending){pending=false;requestRefresh();}
}
q('#sn-update-results').onclick=refresh;
try {
  const response=await fetch('/localities.json');if(!response.ok)throw Error('catalogue');catalogue=await response.json();
  q('#sn-br-state').innerHTML=catalogue.states.slice().sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).map(d=>`<option value="${d.id}">${escape(d.name)} · ${d.uf}</option>`).join('');
  q('#sn-br-state').onchange=e=>{active=e.target.value;stateDetail();requestRefresh();};
  q('#sn-city-select').onchange=e=>{selected=e.target.value;cityDetail();southMap();requestRefresh();};
  root.querySelectorAll('[data-region]').forEach(b=>b.onclick=()=>{region=b.dataset.region;root.querySelectorAll('[data-region]').forEach(x=>x.setAttribute('aria-pressed',x===b));if(!catalogue.southCities.some(c=>c.id===selected&&(region==='Todas'||c.region===region)))selected=catalogue.southCities.find(c=>c.region===region).id;cityDetail();southMap();requestRefresh();});
  root.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;root.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',x===b));southMap();});
  q('#sn-fav-search').oninput=()=>{limit=6;renderFavs();requestRefresh();};q('#sn-fav-region').onchange=()=>{limit=6;renderFavs();requestRefresh();};
  q('#sn-only-favs').onclick=e=>{only=!only;e.target.setAttribute('aria-pressed',only);limit=6;renderFavs();requestRefresh();};q('#sn-fav-more').onclick=()=>{limit+=12;renderFavs();requestRefresh();};
  render();new ResizeObserver(southMap).observe(q('#sn-map-svg').parentElement);new ResizeObserver(brazilMap).observe(q('#sn-br-svg').parentElement);
  await refresh();setInterval(refresh,60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
}catch {q('#sn-update-status').textContent='Não foi possível carregar os resultados. Tente novamente em instantes.';}
