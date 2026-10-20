import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {discoverRunoffs} from '../netlify/lib/tse-discovery.mjs';
import {parseResult} from '../netlify/lib/tse.mjs';
import {payload,target,settings,now} from './tse-fixtures.mjs';
const captured = name => JSON.parse(readFileSync(new URL(`./fixtures/tse-official-2026-10-15/${name}`,import.meta.url)));
test('official captures retain their recorded source integrity',()=>{
  for(const file of captured('provenance.json').files) {
    const bytes=readFileSync(new URL(`./fixtures/tse-official-2026-10-15/${file.file}`,import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256,file.file);
  }
});
test('all six discovered governor runoffs accept their official candidate identities',()=>{
  const expected={ac:['10','11'],am:['22','55'],df:['11','13'],es:['10','15'],rn:['13','44'],to:['44','45']};
  for(const t of discoverRunoffs(captured('ele-c.json')).filter(t=>t.kind==='governor')) {
    const data=captured(new URL(t.url).pathname.split('/').pop());
    const configured={...t,name:t.id,candidates:expected[t.uf]};
    const result=parseResult(data,configured,settings,now);
    assert.equal(result.phase,'awaiting');
    assert.equal(result.validVotes,0);
    assert.deepEqual(result.candidates.map(c=>c.number).sort(),expected[t.uf]);
    const wrong=structuredClone(data);
    wrong.carg[0].agr[0].par[0].cand[0].n='99';
    assert.throws(()=>parseResult(wrong,configured,settings,now),/wrong_candidates/);
  }
});
test('official EA11 discovers ordinary runoffs without including supplementary elections',()=>{
  const targets=discoverRunoffs(captured('ele-c.json'));
  assert.equal(targets.length,7);
  assert.equal(targets.find(t=>t.kind==='president').election,'6258');
  assert.deepEqual(targets.filter(t=>t.kind==='governor').map(t=>t.uf).sort(),['ac','am','df','es','rn','to']);
  assert(targets.filter(t=>t.kind==='governor').every(t=>t.election==='6260'));
  const c=captured('ele-c.json');c.f='s';assert.throws(()=>discoverRunoffs(c));
  c.f='o';c.pl.push(structuredClone(c.pl.find(p=>p.cd==='3221')));assert.throws(()=>discoverRunoffs(c),/ambiguous/);
});
test('captured official EA20 is awaiting with candidate identities independent of position',()=>{
  const targets=discoverRunoffs(captured('ele-c.json'));
  for(const [name,t,numbers] of [
    ['br-c0001-e006258-u.json',targets.find(t=>t.kind==='president'),['13','22']],
    ['ac-c0003-e006260-u.json',targets.find(t=>t.uf==='ac'),['10','11']],
    ['sc-c0001-e006258-u.json',{...targets.find(t=>t.kind==='president'),id:'state-sc',kind:'state',uf:'sc',scope:'uf',area:'sc'},['13','22']]
  ]) {
    const result=parseResult(captured(name),{...t,name:t.id,candidates:numbers},settings,now);
    assert.equal(result.phase,'awaiting');assert.equal(result.sections.counted,0);
    assert.deepEqual(result.candidates.map(c=>c.number).sort(),numbers);
    assert(result.candidates.every(c=>c.votes===0 && c.percent===0));
  }
});
test('simulation, missing phase, supplementary elections and withheld presidential votes are rejected',()=>{
  for(const edit of [p=>p.f='s',p=>delete p.f,p=>p.sup='s',p=>delete p.sup,p=>p.dv='n',p=>delete p.dv]) {
    const p=payload();edit(p);assert.throws(()=>parseResult(p,target,settings,now));
  }
});
