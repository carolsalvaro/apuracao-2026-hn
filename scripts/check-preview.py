"""Read-only smoke check of this project's fixed preview; never calls TSE directly."""
import datetime,json,pathlib,urllib.request,urllib.error
BASE='https://deploy-preview-1--stupendous-muffin-2438f0.netlify.app'
report={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checks':[],'warnings':[]}
def read(path):
    try:r=urllib.request.urlopen(BASE+path,timeout=45)
    except urllib.error.HTTPError as e:r=e
    return r.status,dict(r.headers.items()),r.read()
status,headers,body=read('/')
assert status==200
assert 'noindex' in '\n'.join(v for k,v in headers.items() if k.lower()=='x-robots-tag')
assert b'/results-ui.js' in body
report['checks'].append({'path':'/','status':status,'noindex':True})
for query in ['kind=president','id=state-sc','kind=governor','ids=municipality-4204608,municipality-4218707']:
    path='/api/resultados?'+query;status,headers,body=read(path);data=json.loads(body)
    assert status==200 and data.get('demo') is False
    assert data.get('items') and all(i.get('result') for i in data['items'])
    summary=[]
    for i in data['items']:
        r=i['result'];assert r['round']=='2' and len(r['candidates'])==2
        summary.append({k:i.get(k) for k in ['id','source','status','checkedAt','receivedAt','error']})
        if i.get('error') or i.get('source')=='verified_snapshot':report['warnings'].append(i['id']+': conferir tentativa e cache')
        if i['id'] in ['president-br','state-sc'] and i.get('checkedAt'):
            age=(datetime.datetime.now(datetime.timezone.utc)-datetime.datetime.fromisoformat(i['checkedAt'].replace('Z','+00:00'))).total_seconds()
            if age>900:report['warnings'].append(i['id']+': consulta há mais de 15 minutos')
    report['checks'].append({'path':path,'status':status,'storage':data.get('storage'),'items':summary})
status,headers,body=read('/api/politica');news=json.loads(body)
assert status==200 and len(news.get('items',[]))==3
assert all(i.get('title') and i.get('url','').startswith('https://hnnoticias.com.br/') for i in news['items'])
report['checks'].append({'path':'/api/politica','status':status,'items':3,'dates':[i['date'] for i in news['items']]})
path=pathlib.Path('artifacts/operations');path.mkdir(parents=True,exist_ok=True)
(path/'preview-health.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
