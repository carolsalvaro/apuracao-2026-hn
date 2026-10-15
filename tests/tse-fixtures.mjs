// SYNTHETIC CONTRACT FIXTURES. Not captured from the TSE; never use as fallback.
export const now=Date.parse('2026-10-15T21:00:00Z');
export const target={id:'president-br',kind:'president',election:'9999',office:'1',scope:'br',area:'br',uf:'br',name:'Brasil sintético',candidates:['10','20'],url:'https://resultados.tse.jus.br/oficial/ele2026/9999/dados/br/br-c0001-e009999-u.json'};
export const settings={enabled:true,schema:'tse-agr-v1',year:2026,round:'2',verifiedAt:'2026-10-15T00:00:00Z',evidence:['https://www.tse.jus.br/exemplo-sintetico'],intervalSeconds:300,staleSeconds:900,targets:[target]};
export function payload(t=target){return {ele:t.election,t:'2',tpabr:t.scope,cdabr:t.area,dg:'15/10/2026',hg:'18:00:00',s:{ts:'100',st:'50',pst:'50,00'},v:{vvc:'100'},carg:[{cd:t.office,agr:[{par:[{sg:'TESTE',cand:[{n:'10',nmu:'Pessoa A',vap:'60',pvap:'60,00'},{n:'20',nmu:'Pessoa B',vap:'40',pvap:'40,00'}]}]}]}]};}
export class MemoryStore {
  records=new Map(); serial=0;
  async getWithMetadata(key){const r=this.records.get(key);return r?structuredClone(r):null;}
  async get(key){return (await this.getWithMetadata(key))?.data??null;}
  async setJSON(key,data,options={}){const r=this.records.get(key);if(options.onlyIfNew&&r || options.onlyIfMatch&&r?.etag!==options.onlyIfMatch)return {modified:false};const etag=String(++this.serial);this.records.set(key,{data:structuredClone(data),etag});return {modified:true,etag};}
}
