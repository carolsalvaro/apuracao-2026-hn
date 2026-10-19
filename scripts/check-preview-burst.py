"""Bounded CDN smoke burst of this project's fixed preview; not 5,000-user proof.
No arbitrary targets, cache-busting URLs, direct TSE traffic or production calls.
At most 91 requests, 30 concurrent, 8 MB read, and 60 seconds of new starts.
"""
import concurrent.futures,datetime,json,pathlib,threading,time,urllib.request
URL='https://deploy-preview-1--stupendous-muffin-2438f0.netlify.app/api/resultados?kind=overview'
lock=threading.Lock();used=0;started=time.monotonic();stop=threading.Event()
def read(_):
    global used
    if stop.is_set() or time.monotonic()-started>60:return {'skipped':True}
    begin=time.monotonic()
    try:
        with urllib.request.urlopen(URL,timeout=15) as r:
            body=r.read(100001)
            with lock:
                used+=len(body)
                if used>8000000:stop.set()
            data=json.loads(body)
            if r.status!=200 or data.get('demo') is not False or len(data.get('items',[]))!=34:raise ValueError('invalid_response')
            return {'status':r.status,'ms':round((time.monotonic()-begin)*1000),'bytes':len(body),'cache':r.headers.get('Cache-Status',''),'storage':data.get('storage')}
    except Exception as e:
        stop.set();return {'error':type(e).__name__,'ms':round((time.monotonic()-begin)*1000)}
warm=read(0);waves=[]
if 'error' not in warm:
    for concurrency in [1,10,30]:
        with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as pool:rows=list(pool.map(read,range(30)))
        complete=[r for r in rows if not r.get('skipped')];latencies=sorted(r['ms'] for r in complete)
        wave={'concurrency':concurrency,'completed':len(complete),'errors':sum('error' in r for r in complete),'p95Ms':latencies[min(len(latencies)-1,int(len(latencies)*.95))] if latencies else None,'cacheStatuses':sorted(set(r.get('cache','') for r in complete)),'storage':sorted(set(r.get('storage','unknown') for r in complete))}
        waves.append(wave)
        if stop.is_set() or wave['p95Ms'] is None or wave['p95Ms']>5000:break
report={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'url':URL,'warmup':warm,'waves':waves,'bytesRead':used,'elapsedSeconds':round(time.monotonic()-started,2),'limitation':'Bounded single-region smoke burst through managed proxy. Not 5,000 concurrent users, not proof of Netlify capacity or a billing measurement. Does not test every municipal cache key.'}
out=pathlib.Path('artifacts/operations');out.mkdir(parents=True,exist_ok=True);(out/'preview-burst.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
if stop.is_set():raise SystemExit(1)
