import { createHash } from 'node:crypto';
const fail = code => { throw new Error(code); };
const integer = x => typeof x === 'string' && /^\d+$/.test(x) && Number.isSafeInteger(Number(x)) ? Number(x) : fail('invalid_integer');
const percent = x => typeof x === 'string' && /^\d+(?:[,.]\d+)?$/.test(x) && Number(x.replace(',', '.')) <= 100 ? Number(x.replace(',', '.')) : fail('invalid_percent');
export const digest = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
export function validateConfig(c) {
  if (!c.enabled) return false;
  if (c.schema !== 'tse-agr-v1' || c.year !== 2026 || !['1','2'].includes(c.round) || !Number.isFinite(Date.parse(c.verifiedAt)) || !c.evidence?.length || c.evidence.some(url => { try { const u = new URL(url); return u.protocol !== 'https:' || !(u.hostname === 'tse.jus.br' || u.hostname.endsWith('.tse.jus.br')); } catch { return true; } }) || !Number.isInteger(c.intervalSeconds) || c.intervalSeconds < 300 || !Number.isInteger(c.staleSeconds) || c.staleSeconds < c.intervalSeconds || !c.targets?.length || c.targets.length > 6000) fail('unverified_configuration');
  const ids = new Set();
  const ufs=new Set('ac al ap am ba ce df es go ma mt ms mg pa pb pr pe pi rj rn rs ro rr sc sp se to'.split(' '));
  for (const t of c.targets) {
    if (!/^[a-z0-9-]{1,70}$/.test(t.id) || ids.has(t.id) || !['president','state','municipality','governor'].includes(t.kind) || !/^\d+$/.test(t.election) || t.office !== (t.kind === 'governor' ? '3' : '1') || !['br','uf','mu'].includes(t.scope) || !/^[a-z0-9]{2,7}$/.test(t.area) || !/^[a-z]{2}$/.test(t.uf) || typeof t.name !== 'string' || !t.name.trim() || !Array.isArray(t.candidates) || t.candidates.length < 2 || new Set(t.candidates).size !== t.candidates.length || t.candidates.some(n => !/^\d+$/.test(n))) fail('invalid_target');
    if ((t.kind === 'president' && (t.scope !== 'br' || t.area !== 'br' || t.uf !== 'br')) || (['state','governor'].includes(t.kind) && (t.scope !== 'uf' || t.area !== t.uf)) || (t.kind === 'municipality' && (t.scope !== 'mu' || !/^\d{5}$/.test(t.area) || !/^\d{7}$/.test(t.ibge)))) fail('invalid_locality');
    const u = new URL(t.url);
    if (u.origin !== 'https://resultados.tse.jus.br' || u.username || u.password || u.search || u.hash || !u.pathname.startsWith('/oficial/ele2026/') || !u.pathname.endsWith('.json')) fail('invalid_source');
    if (t.kind !== 'president' && !ufs.has(t.uf)) fail('invalid_uf');
    ids.add(t.id);
  }
  return true;
}
export function parseResult(d, t, config, now = Date.now()) {
  // EA20: official ordinary elections only; withheld presidential votes are not zero results.
  if (d.f !== 'o' || d.sup !== 'n') fail('wrong_election_phase');
  if (t.office === '1' && d.dv !== 's') fail('invalid_vote_disclosure');
  if (d.ele !== t.election || d.t !== config.round || d.tpabr !== t.scope || d.cdabr !== t.area) fail('wrong_election_or_area');
  // EA20 (2026-07-10): vap/pvap use votes to competing candidates (vvc).
  const cargo = d.carg?.find(c => c.cd === t.office);
  if (!cargo || !Array.isArray(cargo.agr)) fail('wrong_office');
  const candidates = cargo.agr.flatMap(a => a.par.flatMap(p => p.cand.map(c => ({number:c.n, name:c.nmu, party:p.sg, votes:integer(c.vap), percent:percent(c.pvap)}))));
  if (candidates.length !== t.candidates.length || new Set(candidates.map(c => c.number)).size !== candidates.length || candidates.some(c => !t.candidates.includes(c.number) || typeof c.name !== 'string' || !c.name.trim() || typeof c.party !== 'string')) fail('wrong_candidates');
  const total = integer(d.s?.ts), counted = integer(d.s?.st), progress = percent(d.s?.pst), validVotes = integer(d.v?.vvc);
  if (!total || counted > total || Math.abs(progress - counted / total * 100) > .02 || candidates.reduce((n,c) => n+c.votes,0) !== validVotes || candidates.some(c => Math.abs(c.percent - (validVotes ? c.votes / validVotes * 100 : 0)) > .02) || (counted === 0 && validVotes !== 0)) fail('inconsistent_totals');
  if (!/^\d{2}\/\d{2}\/2026$/.test(d.dg) || !/^\d{2}:\d{2}:\d{2}$/.test(d.hg)) fail('invalid_timestamp');
  const [day,month,year] = d.dg.split('/');
  // Brasília is UTC-03:00. Reject rollover dates, invalid times and future timestamps.
  const publishedAt = `${year}-${month}-${day}T${d.hg}-03:00`;
  const stamp = Date.parse(publishedAt);
  if (!Number.isFinite(stamp) || new Date(stamp - 10800000).toISOString().slice(0,19) !== `${year}-${month}-${day}T${d.hg}` || stamp > now + 120000) fail('invalid_timestamp');
  return {id:t.id,kind:t.kind,name:t.name,uf:t.uf,area:t.area,ibge:t.ibge??null,election:t.election,round:config.round,office:t.office,candidates,sections:{total,counted,percent:progress},validVotes,publishedAt,phase:counted===0?'awaiting':counted===total?'totalized':'counting'};
}
export function assertForward(previous, next) {
  if (!previous) return;
  if (Date.parse(next.publishedAt) < Date.parse(previous.publishedAt) || (next.publishedAt === previous.publishedAt && digest(next) !== digest(previous)) || next.sections.counted < previous.sections.counted || (previous.phase === 'totalized' && next.phase !== 'totalized')) fail('regression');
}
export function view(record, c, now = Date.now()) {
  if (!record?.result) return {status:'missing',result:null,checkedAt:record?.checkedAt??null,error:record?.error??null};
  const age = Math.max(0,now-Date.parse(record.result.publishedAt));
  return {status:record.error?'unavailable':age>c.staleSeconds*1000?'stale':'current',result:record.result,checkedAt:record.checkedAt,receivedAt:record.receivedAt,ageSeconds:Math.floor(age/1000),error:record.error??null};
}
