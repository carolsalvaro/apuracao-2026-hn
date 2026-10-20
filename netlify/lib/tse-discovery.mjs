// EA11 discovery only. Does not enable collection or infer candidacies/municipality codes.
export function discoverRunoffs(document) {
  if (document.f !== 'o' || !Array.isArray(document.pl)) throw Error('invalid_election_configuration');
  const template = document.arq?.find(a => a.tp === 'u')?.dir;
  if (template !== '<base>/<ambiente>/<ciclo>/<cd_eleicao>/dados/<uf>') throw Error('unsupported_result_directory');
  const targets = [], ids = new Set();
  const ufs = new Set('ac al ap am ba ce df es go ma mt ms mg pa pb pr pe pi rj rn rs ro rr sc sp se to'.split(' '));
  for (const pleito of document.pl) {
    if (pleito.c !== 'ele2026') continue;
    for (const election of pleito.e ?? []) {
      if (election.t !== '2' || !['1','8'].includes(election.tp)) continue;
      if (!/^\d{1,6}$/.test(election.cd) || !Array.isArray(election.abr)) throw Error('invalid_election');
      const presidential = election.tp === '8', office = presidential ? '1' : '3';
      for (const area of election.abr) {
        if (!(area.cp ?? []).some(c => c.cd === office)) continue;
        if (presidential ? area.cd !== 'br' : !ufs.has(area.cd)) throw Error('invalid_area');
        const id = presidential ? 'president-br' : `governor-${area.cd}`;
        if (ids.has(id)) throw Error('ambiguous_runoff');
        ids.add(id);
        const directory = template.replace('<base>', 'https://resultados.tse.jus.br').replace('<ambiente>', 'oficial').replace('<ciclo>', pleito.c).replace('<cd_eleicao>', election.cd).replace('<uf>', area.cd);
        targets.push({id, kind:presidential?'president':'governor', election:election.cd, office, scope:presidential?'br':'uf', area:area.cd, uf:area.cd,
          url:`${directory}/${area.cd}-c${office.padStart(4,'0')}-e${election.cd.padStart(6,'0')}-u.json`});
      }
    }
  }
  if (!targets.some(t => t.kind === 'president')) throw Error('missing_presidential_runoff');
  return targets;
}
