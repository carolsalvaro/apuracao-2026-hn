# Integração TSE — validação oficial em andamento

Branch: `feat/integracao-tse`. Projeto informado: `stupendous-muffin-2438f0.netlify.app`. Prévia separada criada pela PR em rascunho #1. Não houve alteração no Sul na Urna, publicação de produção, merge ou remoção do noindex.


## Retomada com a nova rede — 15/10/2026

A verificação anterior abaixo é histórica. Nesta retomada foi possível acessar HTTPS com a permissão de rede da execução, mantendo proxy e TLS. Não confundir uma falha `EPERM` do sandbox com recusa do servidor.

- Portal TSE, página técnica e quatro PDFs oficiais: HTTP 200. Configuração EA11 correta: `https://resultados.tse.jus.br/oficial/comum/config/ele-c.json` (sem o ciclo antes de `comum`). Tentativas iniciais com caminhos incorretos retornaram 404; não repetir nem tentar listar diretórios.
- EA11 confirmou o pleito 3221 de 25/10/2026, presidente 6258 (tipo 8, turno 2) e governadores 6260 (tipo 1, turno 2), UFs ac/am/df/es/rn/to. Eleições suplementares existentes no mesmo pleito devem ser excluídas da descoberta.
- EA20 nacional, SC presidencial e Acre governador: HTTP 200, fase oficial (`f=o`), eleição ordinária (`sup=n`), zero seções apuradas. Presidente: números 13/22; Acre: 10/11. A ordem do JSON presidencial começa por 22; nunca atribuir fotos/cores pela posição.
- EA12 presidencial: HTTP 200 (534.026 bytes). A documentação descreve `cdi` como cinco dígitos, mas os dados observados usam códigos IBGE completos de sete dígitos. Não truncar nem completar códigos; o mapeamento visual ainda precisa de validação individual.
- Site informado e API Netlify: HTTP 200. A API confirma o repositório correto e um único deploy publicado, contexto production/main, commit `3225218`. GET `/api/politica`: HTTP 200 com três notícias; GET `/api/resultados`: HTTP 404, pois a infraestrutura da branch ainda não está implantada. Isso não valida a nova função ou Blobs.
- Consulta direta ao WordPress HN: HTTP 403. O endpoint de notícias hospedado funciona; isso não demonstra acesso direto ao WordPress a partir deste ambiente nem confirma atualização futura.
- API GitHub autenticada disponível nesta retomada. Não há NETLIFY_AUTH_TOKEN/NETLIFY_SITE_ID no processo; a leitura pública da API Netlify não comprova permissão de deploy.

### Fontes efetivamente lidas

Página técnica: https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados

PDFs no diretório `https://www.tse.jus.br/eleicoes/eleicoes-2026-content/arquivos/divulgacao-de-resultados/`:

- `tse-instrucoes-para-download-dos-arquivos-da-divulgacao-2026`: versão 1.0, 25/05/2026.
- `tse-ea11-arquivo-de-configuracao-de-eleicoes`: 23/06/2026.
- `tse-ea12-arquivo-de-configuracao-de-municipios`: 22/05/2026.
- `tse-ea20-arquivo-de-resultado-unificado`: 10/07/2026.

A página técnica informa limite de **100 requisições por IP por segundo**, suporte a ETag/Last-Modified e contabilização de respostas 304 no limite. Não fixa um intervalo recomendado de polling. Mantido intervalo conservador de cinco minutos, lote de quatro e coleta desativada. Não gerar carga de teste contra o TSE. EA14/EA15 podem orientar consultas EA20, sem garantir sincronização simultânea.

### Mudanças desta retomada

`netlify/lib/tse-discovery.mjs` descobre apenas disputas ordinárias de segundo turno a partir de EA11 oficial e do template de diretório; rejeita fase simulada, diretório desconhecido e disputas ambíguas. É preparação isolada: não preenche configuração nem ativa coleta automaticamente. O parser EA20 agora exige fase oficial/ordinária e autorização `dv=s` para presidente; `dv=n` não pode ser interpretado como zero real.

Respostas oficiais capturadas, URLs, horário e SHA-256 estão em `tests/fixtures/tse-official-2026-10-15/`. Servem somente aos testes, nunca como fallback da página. Testes cobrem descoberta real, exclusão de suplementares, zero antes da apuração, identidades, simulado e divulgação retida. Os testes existentes e os novos passaram. Carga local: 1.000 requisições, concorrência 25, zero erros, p95 21 ms, sem chamadas ao TSE; não mede capacidade Netlify. As três funções foram empacotadas.

A configuração permanece desativada. Faltam validar todas as candidaturas/municípios, migrar componentes visuais e comprovar armazenamento/cache/recuperação em deploy de prévia. Layout, avisos de demonstração e noindex preservados.

### Deploy de prévia criado e bloqueio de validação

PR em rascunho: https://github.com/carolsalvaro/apuracao-2026-hn/pull/1 . A integração Git do Netlify criou o deploy `6ad1296f5d803df06a61d90c`, `state=ready`, `context=deploy-preview`, branch `feat/integracao-tse`, commit `65d659d`, no site confirmado `759f9585-92dc-4e18-9781-25eeff388f0e`.

Prévia: https://deploy-preview-1--stupendous-muffin-2438f0.netlify.app . O proxy do ambiente retorna CONNECT 403 para esse host (página, `/api/politica`, `/api/resultados`), que não está na lista permitida. A liberação apenas do domínio original não inclui subdomínios de deploy. É necessário adicionar este host exato e aplicar a configuração para validar HTTP/navegador/Blobs nesta prévia. Não substituir o deploy de produção para contornar o bloqueio e não chamar o coletor publicamente. O estado `ready` da API confirma conclusão de deploy, não funcionamento das funções ou QA visual. Nenhum teste de navegador desta retomada foi declarado como concluído.


## O que está implementado

- `/api/resultados`: leitura de resultados normalizados por `id` ou `kind` (president, state, municipality, governor), até 50 registros por resposta; rejeita proxy/URL arbitrária e métodos de escrita. Nunca consulta o TSE por requisição de visitante.
- Coletor agendado Netlify a cada minuto, desativado por padrão. Consulta até quatro alvos por execução, com rotação, timeout de oito segundos, limite de 2 MB, redirects desabilitados, intervalo mínimo de cinco minutos por alvo e backoff até uma hora (ou Retry-After maior).
- Netlify Blobs com consistência forte, lease condicional e gravação condicional por ETag. Mantém último resultado válido em falhas; não substitui por simulações ou listas vazias. Revisões de configuração isolam eleições incompatíveis. O armazenamento de produção é separado de cada deploy de prévia.
- Valida eleição, turno, cargo, abrangência, localidade, candidaturas, inteiros, percentuais, totais, data/hora e regressões. Distingue ausência, zero real, em contagem, seções totalizadas, atraso e indisponibilidade. “Seções totalizadas” não significa homologação jurídica final.
- Informa horários da origem (Brasília), recebimento e tentativa. Rejeita dados anteriores ao último válido e alterações conflitantes no mesmo horário. Correções oficiais que reduzam seções requerem investigação e migração controlada; não apagar o histórico para contornar uma rejeição.
- Governadores consultam o endpoint central; não há mais consultas diretas do navegador ao TSE. A lista retornada pela configuração pode acrescentar UFs e nomes. As seis cópias antigas continuam rotuladas como referência quando a integração está desabilitada.
- Corrigido um placeholder de estado JSON exportado que causava erro de JavaScript ao abrir a página fora do editor. CSS, fotos, navegação e conteúdo demonstrativo foram preservados.

## O que NÃO está concluído

Os adaptadores usam o formato observado nas cópias do repositório. Os testes são sintéticos, não evidência de compatibilidade com o contrato oficial atual. `config/tse.json` fica com `enabled: false`, sem alvos, até essa validação. Não basta preencher `verifiedAt` para tornar uma fonte oficial.

Presidente, mapa de estados, SC, municípios e favoritas continuam demonstrativos no HTML. A infraestrutura tem contratos para os quatro tipos, mas a ligação desses componentes visuais aos resultados reais NÃO foi concluída. Não misturar silenciosamente resultados oficiais com essas porcentagens fictícias. Devem ser migrados em etapas após confirmar o contrato e candidaturas oficiais; cores/fotos existentes não podem ser associadas pela posição do candidato no JSON.

O mapeamento município IBGE (sete dígitos, usado no mapa) para código eleitoral TSE (cinco dígitos neste adaptador) deve vir de fonte oficial verificada. Nunca cortar ou completar dígitos para inventar essa correspondência. A lista das 45 cidades e das disputas de governador ainda requer validação. IDs 6260 e as seis UFs atuais são referências, não descoberta oficial.

A função de notícias continua com cache CDN de cinco minutos. Seu acesso ao WordPress real está bloqueado neste ambiente; a cópia do navegador é datada e pode envelhecer. Um retorno tratado 503 comprova tratamento de falha, não notícias atualizadas.

## Histórico: evidência e bloqueios externos da etapa 1

Em 15/10/2026, tentativas HTTPS para `resultados.tse.jus.br`, `www.tse.jus.br`, `hnnoticias.com.br` e o domínio da prévia receberam CONNECT 403 do proxy. Isso impede consultar documentação, revalidar IDs, observar o schema atual e verificar a implantação existente. Domínios foram adicionados ao rascunho do ambiente; salvar o rascunho não aplica a política à máquina por si só.

Não foram encontrados NETLIFY_AUTH_TOKEN ou NETLIFY_SITE_ID no processo nem vínculo local com o site. Não foram solicitados valores de credenciais em chat. Git read via proxy funciona; o GitHub CLI informou autenticação inválida para API. Acesso Git não comprova acesso à API GitHub ou Netlify.

Não houve deploy de prévia: requer acesso/autenticação Netlify ou o deploy automático de uma PR pela integração Git já configurada. Somente o projeto específico informado pode ser usado; não executar deploy de produção. Uma URL fornecida pelo usuário não comprova o estado ou as permissões do projeto.

## Ativação e próximas etapas técnicas

1. Depois de aplicar a rede, pesquisar documentação oficial do TSE e registrar links, data, eleições, turnos, cargos, localidades, candidaturas, significados dos campos e limites oficiais. Ajustar o parser ao contrato confirmado; não considerar os fixtures uma fonte.
2. Preencher e revisar `config/tse.json`: evidências oficiais, verifiedAt, alvos com URL oficial exata, candidaturas por número, escopo e correspondência IBGE/TSE. Os intervalos mínimos locais são conservadores e provisórios; prevalece o limite oficial maior. Um campo `enabled` não substitui revisão técnica.
3. Verificar Netlify Blobs real, condicionais/consistência e restauração entre instâncias/deploys na prévia. Funções agendadas executam automaticamente apenas em deploys publicados de produção no Netlify; na prévia, usar a execução de teste autenticada pelo painel/CLI ou um ensaio controlado, sem expor um endpoint público de coleta.
4. Migrar presidente nacional, depois estados/SC, depois municípios/mapas/favoritas; adicionar testes de renderização por identidade de candidatura e ausência parcial. Governadores precisam da mesma validação de fonte e layout. Remover as simulações somente quando cada componente tiver resultados reais validados.
5. Validar na prévia o endpoint de notícias, funções, persistência, cache, falhas, recuperação e limites do plano. O atual lote de quatro alvos por minuto não atende atualização rápida de todos os municípios brasileiros: 5.570 alvos requereriam cerca de 23 horas por ciclo. Definir carga/cobertura com o plano Netlify e a estratégia oficial (agregados ou lotes, se documentados) antes de ampliar. Não aumentar concorrência sem verificar limites.
6. Validar Android/iOS reais, WebKit e Firefox, rede lenta, leitores de tela, ensaio oficial e tráfego esperado na hospedagem. Só então revisar uma PR e integrar à main. Não divulgar como cobertura real enquanto houver dados fictícios.

## Reproduzir verificações

Node >=22.12; ambiente testado com 24.19.0.

```sh
npm ci
npm test
npm run test:load
# Em outro terminal, servidor Netlify instalado fora do checkout:
XDG_CONFIG_HOME=/workspace/.netlify-config NETLIFY_TELEMETRY_DISABLED=1 /workspace/.tools/netlify/node_modules/.bin/netlify dev --offline --dir public --port 8888 --no-open --skip-gitignore --internal-disable-edge-functions
# Chromium do sistema; sobrescrever CHROMIUM_PATH se necessário:
npm run test:browser
/workspace/.tools/netlify/node_modules/.bin/netlify functions:build --src netlify/functions --functions .netlify/functions-build
```

`test:load` usa HTTP local com armazenamento simulado: não mede Blobs, CDN ou capacidade de produção. `test:browser` executa Chromium com emulação de toque/tela e movimento reduzido; bloqueia todas as origens externas para não consultar o TSE. Compara a geometria principal com o commit inicial, testa navegação e sincronização seletor/detalhe e captura telas em `artifacts/browser`. Não equivale a aparelhos físicos, carregamento real das imagens do portal nem validação eleitoral. Testes de falha usam respostas controladas (timeout simulado, 404/429/500, JSON inválido, eleição errada, dados antigos, resposta grande), recuperação e concorrência. Publicação, armazenamento Netlify real e fontes oficiais permanecem sem validação.

## Resultados locais desta etapa

- `npm ci` concluído usando o lockfile; 28 testes passaram, nenhum teste pulado ou falho.
- Empacotamento das três funções Netlify concluído (politica, resultados e tse-collect).
- Página via Netlify Dev: HTTP 200; POST `/api/politica`: 405; GET notícias: 503 por rede; GET `/api/resultados`: 503 explícito `unconfigured`, sem dados inventados.
- Chromium: 320/375/390/768/1440 px, sem overflow horizontal ou erros JavaScript após a correção do placeholder. Geometria de cabeçalho, menu, quadro presidencial, mapa Brasil e patrocinadores idêntica ao commit 3225218; navegação presidencial, seletor/detalhe municipal e aviso de demonstração passaram. Capturas geradas; inspeção visual da captura estreita realizada. Sem teste em aparelhos físicos ou outras engines.
- Ensaio HTTP local: 1.000 requisições, concorrência 25, zero erros, p95 de 19 ms nesta execução, zero requisições ao TSE. Não extrapolar esses números para produção.
