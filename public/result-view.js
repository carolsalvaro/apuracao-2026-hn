export const numbers=['13','22'];
export const percentage=n=>Number.isFinite(n)?n.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%':'—';
export function acceptItem(item) {
  const r=item?.result;
  if(!r)return false;
  const expected=r.kind==='governor'?null:numbers;
  return r.id===item.id && r.kind===item.kind && r.round==='2' &&
    Array.isArray(r.candidates) && r.candidates.length===2 && new Set(r.candidates.map(c=>c.number)).size===2 &&
    r.candidates.every(c=>(!expected||expected.includes(c.number))&&Number.isSafeInteger(c.votes)&&c.votes>=0&&Number.isFinite(c.percent)&&c.percent>=0&&c.percent<=100) &&
    Number.isFinite(r.sections?.percent)&&r.sections.percent>=0&&r.sections.percent<=100 &&
    ['awaiting','counting','totalized'].includes(r.phase) && Number.isFinite(Date.parse(r.publishedAt));
}
export function candidate(item,number) {return item?.result?.candidates.find(c=>c.number===number);}
export function votePercent(item,number) {
  if(!item?.result||item.result.phase==='awaiting'||item.result.validVotes===0)return '—';
  return percentage(candidate(item,number)?.percent);
}
export function leaderColor(item) {
  if(!item?.result||item.result.phase==='awaiting'||!item.result.validVotes)return '#c9d4dd';
  const a=candidate(item,'13'),b=candidate(item,'22');
  return a.votes===b.votes?'#c9d4dd':a.votes>b.votes?'#d52b36':'#246db5';
}
export function phaseText(item) {
  if(!item?.result)return 'Dados indisponíveis';
  if(item.result.phase==='awaiting')return 'Aguardando apuração';
  return item.result.phase==='totalized'?'Seções 100% totalizadas':'Totalização em andamento';
}
