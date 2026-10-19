"""Bounded read-only throughput check. Defaults to a plan; --run executes it.
Fixed PR #1 host; no cache-busting, collector routes, production or direct TSE.
Tests API polling volume, not full browsers, a two-hour peak, or all cache keys.
"""
import argparse,concurrent.futures,datetime,gzip,json,pathlib,threading,time,urllib.request,urllib.parse,http.client,ssl
BASE='https://deploy-preview-1--stupendous-muffin-2438f0.netlify.app'
ROOT=pathlib.Path(__file__).resolve().parent.parent
cat=json.loads((ROOT/'public/localities.json').read_text())
def municipalities(ids):return '/api/resultados?ids='+','.join('municipality-'+id for id in sorted(set(ids)))
default=[c['id'] for c in cat['southCities']]+[c['id'] for c in cat['cities'][:6]]
paths=['/api/resultados?kind=overview',municipalities(default),municipalities(['4204608','4218707']),municipalities([c['id'] for c in cat['cities'][:6]]),'/api/politica']
PLAN={'stages':[{'visitors':500,'seconds':10},{'visitors':2500,'seconds':10},{'visitors':5000,'seconds':70}], 'readsPerVisitorPerMinute':2.2,'maxRequests':14000,'maxWireBytes':80000000,'maxWorkers':80,'timeoutSeconds':8,'abortOn':'first request error, >5s latency, queue saturation or transfer/request limit','scope':'API polling only: 5/11 overview, 5/11 municipal across three fixed selections, 1/11 news. Not full page openings or a two-hour endurance test.'}
parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--run',action='store_true')
if not parser.parse_args().run:
    print(json.dumps(PLAN,indent=2));raise SystemExit(0)
proxy=urllib.parse.urlsplit(urllib.request.getproxies().get('https',''))
if proxy.scheme!='http' or not proxy.hostname or proxy.username:raise SystemExit('Managed HTTPS proxy configuration unavailable for persistent test transport')
transport=threading.local();tls=ssl.create_default_context()
def connection():
    if not getattr(transport,'connection',None):
        conn=http.client.HTTPSConnection(proxy.hostname,proxy.port or 80,timeout=PLAN['timeoutSeconds'],context=tls)
        conn.set_tunnel(urllib.parse.urlsplit(BASE).hostname,443);transport.connection=conn
    return transport.connection
lock=threading.Lock();stop=threading.Event();stats={'requests':0,'wireBytes':0,'failures':[],'cacheHits':0,'gzipResponses':0};rows=[]
def stop_with(reason):
    with lock:
        stats['failures'].append(reason);stop.set()
def request(path):
    if stop.is_set():return None
    with lock:
        if stats['requests']>=PLAN['maxRequests'] or stats['wireBytes']>=PLAN['maxWireBytes']:
            stats['failures'].append('request_or_byte_limit');stop.set();return None
        stats['requests']+=1
    started=time.monotonic()
    try:
        conn=connection();conn.request('GET',path,headers={'Accept':'application/json','Accept-Encoding':'gzip','User-Agent':'HN-preview-capacity-check/1.0'})
        with conn.getresponse() as response:
            wire=response.read(100001)
            with lock:
                stats['wireBytes']+=len(wire)
                if 'hit' in response.headers.get('Cache-Status',''):stats['cacheHits']+=1
                if response.headers.get('Content-Encoding')=='gzip':stats['gzipResponses']+=1
            if len(wire)>100000:raise ValueError('response_size_limit')
            body=gzip.decompress(wire) if response.headers.get('Content-Encoding')=='gzip' else wire
            if len(body)>2000000:raise ValueError('decoded_size_limit')
            data=json.loads(body)
            if response.status!=200:raise ValueError('http_status')
            if path=='/api/politica':
                if len(data.get('items',[]))!=3:raise ValueError('news_response')
            elif data.get('demo') is not False or data.get('storage')!='ready' or not data.get('items') or not all(i.get('result') for i in data['items']):raise ValueError('result_response')
        ms=round((time.monotonic()-started)*1000)
        if ms>5000:stop_with('latency_over_5s')
        return ms
    except Exception as e:
        if getattr(transport,'connection',None):transport.connection.close();transport.connection=None
        stop_with(type(e).__name__);return None
# Warm fixed keys once, then measure steady polling over more than one cache TTL.
for path in paths:
    if request(path) is None:break
sequence=0
with concurrent.futures.ThreadPoolExecutor(max_workers=PLAN['maxWorkers']) as pool:
    for stage in PLAN['stages']:
        if stop.is_set():break
        rate=stage['visitors']*PLAN['readsPerVisitorPerMinute']/60
        count=round(rate*stage['seconds']);started=time.monotonic();pending=set();latencies=[];submitted=0
        for index in range(count):
            if stop.is_set():break
            wait=started+index/rate-time.monotonic()
            if wait>0:stop.wait(wait)
            done={f for f in pending if f.done()}
            for future in done:
                value=future.result()
                if value is not None:latencies.append(value)
            pending-=done
            if len(pending)>=PLAN['maxWorkers']*2:stop_with('generator_queue_saturated');break
            if stop.is_set():break
            slot=sequence%11;path=paths[0] if slot<5 else paths[1+(sequence%3)] if slot<10 else paths[4]
            pending.add(pool.submit(request,path));submitted+=1;sequence+=1
        for future in concurrent.futures.as_completed(pending):
            value=future.result()
            if value is not None:latencies.append(value)
        elapsed=time.monotonic()-started;latencies.sort()
        row={'pollingEquivalentVisitors':stage['visitors'],'plannedSeconds':stage['seconds'],'submitted':submitted,'successful':len(latencies),'elapsedSeconds':round(elapsed,2),'achievedRequestsPerSecond':round(len(latencies)/elapsed,2),'p95Ms':latencies[min(len(latencies)-1,int(len(latencies)*.95))] if latencies else None}
        rows.append(row);print(json.dumps(row),flush=True)
report={'transport':'Persistent HTTP/1.1 connections via inherited HTTPS proxy, system CA and target SNI', 'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'plan':PLAN,'stats':stats,'stages':rows,'passed':not stop.is_set() and len(rows)==3,'limitation':'Single generator through managed proxy, fixed API keys, no cold-browser asset burst, no geographic/device diversity, no two-hour endurance, no TSE with progressing votes. Request/wire caps do not cap function compute billing. Not a measured invoice or maximum simultaneous-user guarantee.'}
folder=ROOT/'artifacts/operations';folder.mkdir(parents=True,exist_ok=True);(folder/'preview-throughput.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
if not report['passed']:raise SystemExit(1)
