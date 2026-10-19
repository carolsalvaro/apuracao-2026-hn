"""Paced curl/HTTP2 polling check of the fixed PR #1 preview. Dry-run by default.
At most 14,000 requests, 80 MB of compressed downloads (plus in-flight data),
40 sequential curl workers, an 8s request timeout, and three bounded stages.
Keeps inherited proxy and TLS trust; never invokes a collector or TSE directly.
"""
import argparse,concurrent.futures,datetime,json,math,pathlib,subprocess,threading,time
ROOT=pathlib.Path(__file__).resolve().parent.parent
BASE='https://deploy-preview-1--stupendous-muffin-2438f0.netlify.app'
cat=json.loads((ROOT/'public/localities.json').read_text())
def mu(ids):return '/api/resultados?ids='+','.join('municipality-'+v for v in sorted(set(ids)))
paths=['/api/resultados?kind=overview',mu([c['id'] for c in cat['southCities']]+[c['id'] for c in cat['cities'][:6]]),mu(['4204608','4218707']),mu([c['id'] for c in cat['cities'][:6]]),'/api/politica']
PLAN={'stages':[{'visitors':500,'seconds':10,'workers':4},{'visitors':2500,'seconds':10,'workers':20},{'visitors':5000,'seconds':70,'workers':40}],'readsPerVisitorPerMinute':2.2,'ratePerWorker':'275/m','maxRequests':14000,'maxWireBytes':80000000,'timeoutSeconds':8,'criteria':'all HTTP 200, stage p95 <2s, final throughput >=95% of target; stop on first transport/status error, resource or time limit','scope':'API polling on three municipal selections, not complete browsers, initial HTML burst, two-hour endurance or all municipal cache keys'}
parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--run',action='store_true')
if not parser.parse_args().run:print(json.dumps(PLAN,indent=2));raise SystemExit(0)
stop=threading.Event();lock=threading.Lock();stats={'completed':0,'wireBytes':0,'httpVersions':{},'httpStatuses':{},'cacheHits':0,'staleResponses':0,'failureResponses':[]};errors=[];stages=[];sequence=0
processes=set()
def fail(message):
    with lock:
        if message not in errors:errors.append(message)
        stop.set()
def worker(urls):
    config='\n'.join('url = '+json.dumps(BASE+path)+'\noutput = "/dev/null"' for path in urls)+'\n'
    cmd=['curl','--http2','--compressed','--silent','--show-error','--fail','--fail-early','--rate','275/m','--max-time','8','--config','-','--write-out','%{http_code}|%{time_total}|%{size_download}|%{http_version}|%{url_effective}|%header{server}|%header{x-nf-request-id}|%header{cache-status}\n']
    latencies=[]
    # Reading stdout during execution avoids pipe backpressure affecting rates.
    with subprocess.Popen(cmd,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True) as proc:
        with lock:processes.add(proc)
        try:
            proc.stdin.write(config);proc.stdin.close()
            for line in proc.stdout:
                values=line.rstrip('\n').split('|',7)
                if len(values)<8:fail('invalid_curl_metrics');break
                code=int(values[0]);ms=float(values[1])*1000;size=int(values[2]);version=values[3];url=values[4];server=values[5];request_id=values[6];cache=values[7]
                with lock:
                    stats['completed']+=1;stats['wireBytes']+=size
                    stats['httpStatuses'][str(code)]=stats['httpStatuses'].get(str(code),0)+1
                    stats['httpVersions'][version]=stats['httpVersions'].get(version,0)+1
                    stats['cacheHits']+=int('hit' in cache);stats['staleResponses']+=int('fwd=stale' in cache)
                    limit=stats['wireBytes']>PLAN['maxWireBytes']
                if code!=200:
                    with lock:stats['failureResponses'].append({'status':code,'url':url,'server':server,'requestId':request_id})
                    fail('http_'+str(code))
                if limit:fail('byte_limit')
                latencies.append(ms)
                if stop.is_set():proc.terminate();break
            code=proc.wait(timeout=10)
            if code and not stop.is_set():fail('curl_exit_'+str(code))
            if not stop.is_set() and len(latencies)!=len(urls):fail('incomplete_worker')
        finally:
            with lock:processes.discard(proc)
    return latencies
# Capture first-key costs explicitly; warmup is not counted in stage percentiles.
warmups=worker(paths)
for stage in PLAN['stages']:
    if stop.is_set():break
    workers=stage['workers'];target=stage['visitors']*2.2/60;count=math.floor(target*stage['seconds'])
    if stats['completed']+count>PLAN['maxRequests']:fail('request_limit');break
    requests=[[] for _ in range(workers)]
    for index in range(count):
        slot=sequence%11;requests[index%workers].append(paths[0] if slot<5 else paths[1+sequence%3] if slot<10 else paths[4]);sequence+=1
    started=time.monotonic();latencies=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
        futures=[pool.submit(worker,urls) for urls in requests]
        while not all(f.done() for f in futures):
            if time.monotonic()-started>stage['seconds']+10:fail('stage_time_limit')
            if stop.is_set():
                with lock:
                    for proc in list(processes):
                        if proc.poll() is None:proc.terminate()
            time.sleep(.1)
        for future in futures:
            try:latencies.extend(future.result())
            except Exception as e:fail(type(e).__name__)
    elapsed=time.monotonic()-started;latencies.sort();p95=latencies[min(len(latencies)-1,int(len(latencies)*.95))] if latencies else None
    row={'pollingEquivalentVisitors':stage['visitors'],'plannedSeconds':stage['seconds'],'submitted':count,'completed':len(latencies),'elapsedSeconds':round(elapsed,2),'achievedRequestsPerSecond':round(len(latencies)/elapsed,2),'p95Ms':round(p95) if p95 is not None else None,'maxMs':round(max(latencies)) if latencies else None}
    stages.append(row);print(json.dumps(row),flush=True)
    if p95 is None or p95>=2000:fail('stage_p95_over_2s')
if len(stages)==3 and stages[-1]['achievedRequestsPerSecond']<5000*2.2/60*.95:fail('target_rate_not_sustained')
report={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'plan':PLAN,'warmupMs':[round(v) for v in warmups],'stages':stages,'stats':stats,'errors':errors,'passed':not errors and len(stages)==3,'limitation':'Single-region API polling, three fixed municipal cache keys. Not 5,000 browsers, initial HTML burst, all city keys, progressing TSE votes, a two-hour endurance run or guaranteed maximum capacity. Caps do not cap compute billing.'}
folder=ROOT/'artifacts/operations';folder.mkdir(parents=True,exist_ok=True)
for name in ['preview-http2.json','preview-http2-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'.json']:(folder/name).write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
if not report['passed']:raise SystemExit(1)
