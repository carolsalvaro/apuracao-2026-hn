# Integração TSE — validação oficial em andamento

Branch: `feat/integracao-tse`. Projeto informado: `stupendous-muffin-2438f0.netlify.app`. Prévia separada criada pela PR em rascunho #1. Não houve alteração no Sul na Urna, publicação de produção, merge ou remoção do noindex.


## Faixa de compartilhamento pelo WhatsApp — 20/10/2026

Correção após relato de toque sem ação: o runtime legado do widget interceptava todos os links externos com `preventDefault` e encaminhava ao host, inexistente quando o site está aberto diretamente. Agora essa interceptação não ocorre na página independente, preservando a navegação normal do navegador. O teste anterior verificava apenas href/mensagem e não detectava a falha; substituído por abertura efetiva de popup via toque no ícone e Enter, com destino atendido localmente, sem contato com WhatsApp/envio. A conferência da prévia inclui o mesmo toque com popup local.

A pedido da responsável, rodapé fixo próprio com “COMPARTILHE” e símbolo SVG do WhatsApp, em azul da página e verde. Abre `https://wa.me/?text=…` com mensagem e endereço atual sem query/hash, permitindo escolher destinatário e confirmar envio no WhatsApp. Não envia mensagens automaticamente nem carrega scripts externos. Espaço final e safe-area reservados; foco por teclado visível. Compartilhamento nativo e cópia existentes mantidos. Testes locais verificam cinco larguras, ausência de overflow, posição e reserva de espaço, conteúdo do link e ausência de pageview adicional, sem abrir WhatsApp nem enviar mensagens. Conferência visual local em viewport móvel realizada. Somente PR #1; noindex, main e produção preservados.

## Correção da faixa fixa na prévia móvel — 20/10/2026

A Netlify injeta após o build um contêiner `div[data-netlify-site-id][data-netlify-deploy-id]` e o script `/.netlify/scripts/cdp`. Esse script cria o iframe externo “Netlify Drawer”, fixo no rodapé com 48px. A CSP existente (`frame-src 'none'`) bloqueia esse iframe e o Chrome mostra uma faixa com ícone de documento quebrado, reproduzida localmente com o script real da prévia. CSS oculta exclusivamente esse contêiner da ferramenta de revisão; CSP, noindex e layout permanecem preservados. O teste local cobre a injeção com estilos inline nas cinco larguras; a conferência da prévia também verifica o contêiner pós-build. Nenhuma alteração na produção ou teste de carga.

## Continuidade enquanto se aguarda o suporte — 20/10/2026

A responsável encaminhou a resposta da Netlify: permissão escrita prévia é obrigatória para carga/benchmark. Pedido de autorização pendente; scripts remotos passam a imprimir plano por padrão e a bloquear --run antes da rede enquanto não houver aprovação escrita revisada, referência e validade registradas. O arquivo atual mantém approved=false. Não houve nova rodada de carga remota nesta etapa.

Notícias agora consultam novamente a API ao voltar a uma aba visível, mantendo a pausa em segundo plano e o intervalo normal de cinco minutos. A alteração preserva fotos/layout, texto de falha e últimas chamadas quando a API falha. A página não dispara pageview adicional por esse retorno ou pela atualização.

Testes de contrato passaram. Chromium local passou nas cinco larguras e nos cenários adicionais: notícias ao retornar à aba, manutenção das chamadas em falha, pausa em segundo plano, remoção de imagem com falha, compartilhamento nativo, cópia por clipboard e campo manual, cancelamento sem cópia e URL sem query/hash. Isso não é validação em Android/iOS físico nem confirmação de recebimento no painel GA4. Validações desta etapa são locais, com servidor simulado e bloqueio de tráfego externo no Chromium. Nenhuma simulação é incluída no conteúdo publicado. Main, domínio final, produção e noindex preservados.

## Evidências recebidas da responsável e diagnóstico pequeno — 19/10/2026

Log da função fornecido pela responsável, 15h56–16h18 de Brasília: 174 execuções, 11 rodadas, 854 verificações de fontes, status ok e zero falhas nessas rodadas. Sem marcadores ERROR/403/429/timeout/armazenamento no arquivo. Durações 86–5.491ms e memória observada até 165 MB. Isso confirma execuções observadas, não todos os acessos, margem de memória contratada ou capacidade do evento.

A imagem de Web security mostra WAF desativado e nenhuma regra ativa de firewall/rate limiting. Total blocked “---” não é zero comprovado e o escopo da imagem não prova ausência de proteção da plataforma/proxy.

Diagnóstico limitado posterior: 40 leituras de /analytics.js e 40 de /api/resultados?kind=overview, com até 40 simultâneas, todas HTTP 200; 403 não reproduzido. Metadados e respostas locais em artifacts/operations/403-diagnostic/report.json. Não foi repetida a carga maior. A origem da recusa anterior continua indeterminada e o cenário de 5.000 não foi aprovado.

Cliente de ensaio agora usa fail-with-body e retém até 8 KB do corpo de erro, URL, servidor e ID, interrompendo na primeira falha. Comportamento de 403 validado com servidor local controlado, sem Netlify/TSE. Texto para análise do fornecedor preparado em CHAMADO-NETLIFY-403.md; não foi enviado a terceiros. Não solicitar desligamento de segurança como solução presumida.

## Saldo reforçado e diagnóstico de capacidade — 19/10/2026

A responsável confirmou compra de 2.000 créditos e saldo de **2.485**. Esse é o saldo informado, não uma consulta autenticada de faturamento. Estimador atualizado; registros anteriores de 485/1.985 abaixo são histórico.

A API foi ajustada para CDN `s-maxage=30, stale-while-revalidate=15`, sem alterar browser max-age=10, timestamps, votos ou leitura operacional no-store. O objetivo é servir a cópia existente enquanto a CDN revalida. Pode acrescentar até 15s de idade da cópia; primeiro acesso sem cópia ainda pode esperar. Teste de contrato cobre os cabeçalhos e a leitura operacional. Fonte técnica: https://docs.netlify.com/build/caching/caching-overview/.

A comparação individual mediu overview com revalidação em 5.373ms, overview seguinte em 482ms e leitura sem coleta em 347ms. Gerador HTTP/1.1 persistente recebeu 2.061 respostas válidas, mas saturou sua fila. Gerador HTTP/2 foi corrigido para tolerar ausência do cabeçalho de cache e distribuir partidas uniformemente, sem rajadas de lotes.

Rodada HTTP/2 ritmada: 183/916 consultas completadas nos dois primeiros patamares, com p95 de 265/242ms. Ao iniciar o patamar de 5.000, uma resposta 403 interrompeu o ensaio. No total: 1.137 respostas, sendo 1.136 HTTP 200 e uma 403; 1,62 MB comprimidos, 1.101 hits. Os 12.833 pedidos previstos para a etapa maior não foram executados por completo. **Ensaio não aprovado; capacidade de 5.000 ainda pendente.** Ainda não identificado se 403 veio da Netlify ou infraestrutura do teste; não atribuir causa sem evidência. Consultas individuais posteriores a catálogo/resultados/notícias voltaram 200. Não repetir carga maior até esclarecer o bloqueio. Script agora registra URL, servidor e ID da requisição em futuras recusas, sem credenciais.

Relatórios locais em artifacts/operations; scripts e limites em OPERACAO.md. Sem main, DNS, produção ou acesso ao Sul na Urna. Sem compra/recarga configurada pelo agente.

## Saldo e ensaio limitado — 19/10/2026

Saldo confirmado pela responsável: 485, sem compra adicional. Estimador atualizado com comparação hipotética a 1.985 (485 + 1.500); não há compra ou acesso autenticado ao faturamento.

Ensaio de polling da prévia preparado em scripts/load-preview.py, com execução explícita --run, host fixo, limites de partidas/transferência/concorrência, parada em falha/lentidão e dados de teste fora do conteúdo público. Primeira rodada: 1.259 respostas válidas, zero erros de API, 2,03 MB, interrompida por saturação do gerador ao subir o volume. Transporte persistente pelo proxy manteve TLS verificado; duas preparações posteriores foram interrompidas em leitura fria acima de 5s antes das etapas de volume. Não houve ensaio completo de 5.000 visitantes; não interpretar interrupção do gerador como limite comprovado da Netlify nem ocultar a latência fria. Procedimentos, limiares e limitações registrados em OPERACAO.md. Sem alteração funcional, domínio, main ou produção nesta rodada.

## Revisão para liberação — 19/10/2026

Domínio final confirmado: `apuracao.hnnoticias.com.br`. Nenhum DNS ou deploy de produção alterado. Checklist atual consolidado em PRODUCAO.md; seções abaixo são histórico e podem registrar versões anteriores.

- Inicialização recebeu timeout de 10s e retentativa automática em 15s; botão Atualizar e retorno à aba também permitem recuperar o carregamento. O relógio de consultas periódicas é instalado independentemente da primeira chamada. Flag de atualização é liberada por finally mesmo em falha de renderização.
- Teste Chromium ampliado para falha inicial do catálogo seguida de recuperação sem reload e retomada automática após erro da API. Layout preservado; metadados de descrição/compartilhamento preparados sem URL canônica inventada ou retirada do noindex.
- EA11, EA12 e dez EA20 reconsultados: 12 respostas 200. Disputas/candidaturas esperadas; hash do mapa oficial de municípios inalterado. Todos os EA20 consultados ainda aguardam apuração. Arquivos de evidência em artifacts/operations/official-validation.json (local/ignorado no Git). Não alterada a revisão do cache nem o bootstrap.
- Smoke da prévia sem avisos. Novo check-preview-burst.py limita o ensaio a 91 leituras, 30 simultâneas e 60s de início; interrompe novas ondas após falha/latência elevada. Rodada: 91 respostas válidas, zero erros, 1,91 MB, 8,7s, hits do Edge. Não é prova de capacidade de 5.000 visitantes nem orçamento final.
- Pendências concretas: ensaio representativo de capacidade, saldo real/renovação, painel GA4, dispositivos físicos, revisão editorial, plantão/alertas e autorização de publicação/domínio. Agendamento de produção só pode ser validado após publicação autorizada. Não declarar a cobertura pronta enquanto essas condições estiverem abertas.

## Atualização por minuto e encerramento municipal — estado atual

Esta seção substitui as frequências/limites das etapas históricas abaixo. A usuária informou 760 créditos e pico de quase 5.000 simultâneos por aproximadamente duas horas após as 17h de 25/10.

- Configuração e navegador ajustados de cinco para **um minuto** nos municípios em andamento. Parada automática após 100% das seções validado, com último resultado preservado, sem nova consulta TSE nem polling municipal na página. 99,999% não é arredondado para final; presidente/governadores continuam a política normal.
- Coleta compartilhada com até quatro fontes simultâneas, ritmo máximo de 20 inícios/segundo, lote máximo 400 (universo atual 337), orçamento de início de 30s na API e 18s no agendado, timeout de 8s e lease global de 60s. A elegibilidade saudável é ancorada no início da rodada, para a duração da coleta não empurrar os alvos ao segundo minuto; backoff/Retry-After continuam absolutos após a tentativa. ETag/304, backoff, rotação e prioridade presidente/SC preservados. Não equivale a uma consulta TSE por visitante. Em lentidão, o ciclo pode exigir rodadas adicionais; não prometer entrega instantânea ou em até 60s.
- Intervalo alterado na configuração; por ser parte da revisão, os registros ficam no novo prefixo. O bootstrap mantém os mesmos resultados oficiais e horários, com a nova revisão. Ainda não existem votos reais neste ensaio de prévia. Não usar esse procedimento durante votação para descartar dados recentes; mudanças operacionais futuras exigem migração revisada.
- Modelo de duas horas: 264 créditos de requisições + 153 de transferência gzip estimada = 417 parciais. 760 é o saldo informado, não autorização de gastos ou compra. Exclui compute, notícias/arquivos extras, novos acessos/recargas, uso fora do pico e outros projetos. Compressão real confirmada em amostras da prévia. O ganho de cessar municípios finalizados não foi usado para reduzir a projeção. Detalhes em OPERACAO.md.
- 53 testes locais passaram. Os novos casos verificam: 337 fontes simuladas numa rodada, máximo quatro simultâneas, espaçamento de partidas, limite de duração em origem lenta, 99,999% vs 100%, parada por registro durável/bootstrap e status final sem falso atraso. Teste de navegador avança o relógio e verifica ausência de novas leituras municipais após totalização. Nenhum ensaio de carga no TSE.
- Deploy de código 535be1b confirmado pronto. Checagem de página/noindex/APIs/notícias passou; a primeira leitura municipal usou bootstrap durante aquecimento, e a rodada seguinte retornou cache durável com zero avisos operacionais. Chromium da prévia passou em cinco larguras, sem erros JS ou requisições falhas. O ensaio local de relógio confirmou leitura municipal após um minuto enquanto em andamento e ausência de nova leitura municipal depois de totalizar. Nenhuma simulação foi publicada como voto real; produção/main permanecem preservadas.

## Preparação operacional — revisão mais recente

Público informado: quase 5.000 simultâneos no primeiro turno. Ver [OPERAÇÃO](OPERACAO.md) para dimensionamento, comandos, cache, monitoramento, falhas, rollback e condições de liberação. As descrições históricas abaixo sobre cache por deploy e agendado com quatro alvos foram substituídas nesta revisão.

- Agendado e API usam limite máximo de 16 fontes/minuto e a mesma lease. Presidente/SC são priorizados, respeitando intervalo/backoff, para não esperar a passagem dos municípios.
- ETag/Last-Modified habilitados; 304 preserva corpo/recebimento, atualiza tentativa e não inventa votos. A fila de demanda não é regravada por cada leitor enquanto ainda está válida. Seleções equivalentes têm IDs ordenados para compartilhar cache CDN.
- Consultas gerais unificadas em overview a cada minuto; municípios a cada cinco minutos e em interações, reduzindo a estimativa padrão de requisições periódicas de 20 mil para cerca de 7 mil/minuto com 5 mil visitantes constantes. O modo operacional cached=1 lê sem disparar coleta.
- Namespace da prévia estável entre versões do PR, isolado da produção e com revisão da configuração nas chaves. Verificação real de continuidade entre versões concluída para o registro presidencial: o receivedAt de 2026-10-16T11:06:08.694Z e source=durable_cache foram preservados entre os deploys 0753052 e 656acf4. A leitura cached=1 não disparou coleta. Registro de evidência local em artifacts/operations/persistence-across-deploys.json. Isso comprova esse registro na prévia, sem extrapolar para produção ou todos os cenários de falha.
- 46 testes locais aprovados, incluindo 90 minutos acelerados para 337 alvos, interrupção da origem, recuperação e totalização. Não houve carga contra TSE. Carga local: dois cenários de 5.000 requisições, concorrência 100, zero erros; p95 de 35/29 ms nesta máquina, origem simulada consultada zero/uma vez e uma gravação de demanda por cenário. Esses números não comprovam 5.000 usuários simultâneos na Netlify.
- Chromium local nas cinco larguras passou. Arquivos atuais EA11, presidente e SC foram reconsultados com 200/fase oficial, sem seções apuradas. Usuária informou Personal. Taxas oficiais e estimativa de consumo estão em OPERACAO.md; saldo/recarga não são acessíveis pela API pública, e a capacidade Netlify ainda não está aprovada.

## Integração visual oficial — estado atual (15/10/2026)

Esta seção substitui as descrições históricas de integração desativada e componentes demonstrativos abaixo. Pedido da usuária: integrar e retirar os avisos de demonstração, mantendo main, noindex e produção preservados.

- `config/tse.json` habilitado apenas na branch/PR. 337 fontes EA20 oficiais consultadas e validadas: Brasil, 27 UFs, 303 municípios existentes no catálogo e seis governadores. Todos os arquivos retornaram 200 e passaram pelo parser. EA11 revalidado para excluir suplementares. EA12 fornece explicitamente os códigos TSE/IBGE, UF e nomes dos 303 municípios; todos os nomes correspondem ao catálogo. Nenhum código foi truncado ou adivinhado. As 45 cidades do mapa foram preservadas; a classificação regional existente ainda merece revisão editorial.
- `public/results-ui.js` liga presidente, corrida, mapas, SC, seleção municipal, favoritas e governadores à API. Identidade presidencial por número 13/22, independente da ordem do JSON. Percentuais, votos, progresso e cores fictícios foram removidos do HTML e dos catálogos. Antes de receber dados, o estado é indisponível; com zero seções oficiais, aguardando apuração. Sem votos ou com empate, o mapa não atribui liderança. Fotos, geometria, classes de layout, patrocinadores, navegação, favoritos e CTA foram preservados. Avisos de demonstração retirados após eliminar os dados simulados. Noindex permanece.
- `netlify/data/tse-bootstrap.json` contém somente resultados oficiais normalizados nesta consulta, associados à revisão da configuração. Não é simulação nem exemplo. É uma cópia inicial datada para uma prévia recém-implantada ou falha do armazenamento; a API identifica `source=verified_snapshot`, `status=stale`, e a página informa origem, consulta e atualização pendente. Não apresenta essa cópia como sincronização ao vivo. Resultados duráveis mais recentes prevalecem. Uma revisão incompatível invalida a cópia inicial.
- **Mudança de arquitetura para atualizar também na prévia:** funções agendadas não executam em deploy-preview. A API agora pode disparar atualização central limitada, além de ler os registros. Antes da leitura, registra as localidades solicitadas numa fila compartilhada com validade de dez minutos. Uma lease global por revisão permite um lote por minuto. O coletor da API consulta até 16 fontes sequenciais por lote, com orçamento para iniciar chamadas de 12 segundos e timeout individual de oito segundos (máximo aproximado de 20 segundos de rede, além das operações Blobs). O intervalo mínimo por alvo continua cinco minutos, com backoff em falhas. O agendado mantém o lote padrão de quatro. Não há endpoint público de coleta arbitrária: IDs vêm da configuração fixa e o navegador nunca acessa TSE diretamente. A CSP permite scripts do próprio site e remove a conexão direta ao TSE.
- O navegador consulta a API a cada minuto enquanto visível; isso lê cache/fila e **não significa votos novos ou coleta por visitante**. A fila rotativa impede que consultas simultâneas de presidente impeçam mapas e governadores de atualizar. Até 50 municípios por resposta. O limite oficial de 100 requisições/IP/segundo foi reconfirmado na página técnica; o coletor sequencial fica muito abaixo dele. Não houve teste de carga no TSE. Cerca de 85 localidades visíveis precisam de ao menos seis lotes para revalidação completa, além de latência/falhas; não prometer atualização simultânea ou instantânea. Mais localidades ativas aumentam esse prazo. A escala de todo o Brasil ainda não está resolvida.
- Falha de armazenamento sem cópia oficial retorna indisponível; com cópia oficial mantém os valores com data e indicação de atualização pendente. Falha de origem conserva o último resultado válido. A leitura de `storage=ready` isoladamente não comprova uma gravação; verificar `source=durable_cache`, tentativa e recebimento na prévia antes de afirmar persistência real.
- Testes locais: 39 testes aprovados; Chromium em 320/375/390/768/1440 px verificou ausência de simulações, mapas neutros aguardando, 27 UFs/45 municípios/seis governadores, identidade mesmo com ordem invertida, navegação, seletor, favorita limpando busca, falha mantendo último resultado e ausência de overflow/erros JS. Percentuais de contagem usados pelo teste de recuperação são sintéticos e somente existem no servidor local de teste, nunca nos arquivos publicados. Inspeção visual da captura estreita realizada. Não equivale a Android/iOS físicos ou homologação eleitoral.

### Evidência do deploy de prévia cd136dc

- GitHub/Netlify confirmou o deploy-preview pronto. GET da página 200 com o novo módulo `/results-ui.js` e `X-Robots-Tag: noindex, nofollow`. GET de presidente, 27 estados, seis governadores e lote Criciúma/Tubarão: 200, `demo=false`, `storage=ready`. Respostas `partial/stale` são esperadas porque a origem ainda publica arquivos anteriores à votação; a página informa os horários.
- Presidente foi coletado no runtime da Netlify e gravado em Blobs: `source=durable_cache`, `checkedAt=2026-10-15T20:25:40.152Z`, `receivedAt=2026-10-15T20:25:40.294Z`, `error=null`. Uma segunda requisição recuperou o mesmo registro/horários do cache durável. Isso comprova a gravação e leitura desse registro no deploy real; não comprova restauração entre deploys, injeção de falhas no serviço real ou independência de todas as instâncias.
- `npm run test:preview` passou em 320/375/390/768/1440 px usando respostas HTTPS reais reproduzidas em Chromium: sem avisos de demonstração, 27 estados, 45 municípios, seis governadores, navegação e seletor funcionando, sem overflow, zero exceções JS e zero requisições falhas. As seis imagens verificadas carregaram. Inspeção visual da captura de 390 px realizada. O CTA foi preservado sem abrir Sul na Urna.
- As três funções foram empacotadas. Main/produção não foram alteradas. Nenhum merge. Verificação de persistência entre versões, escala, dispositivos físicos e dados oficiais com votos continuam pendentes; a aplicação ainda não deve ser divulgada como cobertura pronta.

Reprodução local: `npm test`, `npm run test:browser` (agora inicia servidor local próprio sem tráfego externo) e empacotamento das funções com Netlify CLI. `npm run test:preview` lê a URL fixa da prévia via HTTPS validado e reproduz respostas em Chromium, sem alterar a confiança em certificados. Os detalhes de transporte da rodada anterior continuam válidos.

## Histórico: retomada neste chat único — 15/10/2026

- A revisão 2 publicada do ambiente lista os nove hosts informados, incluindo o host exato da prévia. `observations_current=true`, ambiente conectado; o campo de estado da política ainda é `unknown`, portanto não é evidência de enforcement. O arquivo de política do executor inclui a prévia. Acesso efetivo confirmado com HTTPS 200, mantendo proxy e TLS, ao conceder rede à execução. Sem essa permissão de execução, curl falha ao conectar ao proxy; isso não é recusa do Netlify ou ausência do host na lista.
- Checkout atualizado por fast-forward de `8837a88` para `566b2e3`, a cabeça do PR #1 em rascunho. O status GitHub desse commit registra “Deploy Preview ready!”. Main não foi alterada.
- Prévia: GET `/` 200, `X-Robots-Tag` contém noindex; GET `/api/politica` 200 com três itens; GET `/api/resultados` e `?kind=governor` 503 com `status=unconfigured`, `demo=true`, sem dados inventados e `Cache-Control: no-store`. POST nas duas APIs retorna 405 com Allow GET. Não foi chamado o coletor.
- EA11 e oito EA20 consultados uma vez por arquivo, sem carga de teste: presidente Brasil, SC e governadores AC/AM/DF/ES/RN/TO. Todos HTTP 200, fase oficial, segundo turno, ordinários e zero seções apuradas. EA11 e capturas anteriores mantêm os mesmos SHA-256. Números de governador confirmados: AC 10/11, AM 22/55, DF 11/13, ES 10/15, RN 13/44, TO 44/45. As cinco UFs antes ausentes foram adicionadas às capturas com URL, horário e SHA-256. São fixtures de contrato, nunca fallback em produção.
- `npm ci` com cache gravável e proxy explícito concluído. `npm test`: 33 testes aprovados, incluindo integridade das capturas, candidaturas das seis UFs e rejeição de candidatura incompatível.
- Coleta permanece desativada em `config/tse.json`. HTTP 503 `unconfigured` não acessa Blobs: persistência real, condicionais e recuperação entre instâncias/deploys continuam sem comprovação. Não há credencial Netlify configurada no ambiente; nenhuma foi solicitada em chat. Municípios e migração visual para resultados oficiais continuam pendentes.

### Navegador e transporte

Chromium direto apresentou `ERR_CERT_AUTHORITY_INVALID` para o certificado do proxy. A revisão automática recusou adicionar a CA ao armazenamento NSS permanente por alterar confiança além da validação solicitada. Nenhuma mudança de confiança foi realizada e TLS não foi desabilitado.

O script `node scripts/preview-check.mjs` usa respostas HTTPS obtidas por Python com a CA do sistema e validação TLS, reproduzidas no Chromium por interceptação de requisições. Só permite o host fixo desta prévia, imagens do HN e os três scripts unpkg com versões fixas usados pela página; bloqueia demais destinos e o coletor. Não abre links do CTA Sul na Urna. Isso verifica renderização/interações com respostas reais capturadas, mas não comprova a conexão TLS nativa do navegador, dispositivos físicos, cache CDN ou Blobs. Capturas e relatório ficam em `artifacts/preview/` (não versionados). A rodada cobriu 320/375/390/768/1440 px: sem overflow horizontal ou exceções JavaScript, navegação presidencial, seleção municipal e aviso de demonstração aprovados; as seis imagens verificadas carregaram. Houve inspeção visual da captura de 320 px. O script auxiliar `/.netlify/scripts/cdp` injetado pela hospedagem foi bloqueado pela CSP existente; isso foi registrado sem afrouxar a CSP. Não equivale a QA completo de todos os controles ou navegadores. Reprodução: `npm run test:preview`, com permissão de rede na execução.

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

Os adaptadores têm testes sintéticos e capturas oficiais EA11/EA20 anteriores à apuração. Ainda falta observar dados oficiais com votos e validar todos os recortes municipais; essas capturas não comprovam o contrato inteiro. `config/tse.json` fica com `enabled: false`, sem alvos, até essa validação. Não basta preencher `verifiedAt` para tornar uma fonte oficial.

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

### Analytics — 17/10/2026

ID `G-VZYMP84YWY` confirmado pela responsável. Tag isolada em `/analytics.js`, carregamento assíncrono do Google, configuração sem pageview automático e um evento explícito por documento. URL enviada sem query/hash; favoritas não são enviadas. Consent Mode inicia analytics_storage/ad_storage/ad_user_data/ad_personalization negados; nenhuma concessão implícita ou cookies analíticos autorizados pelo código. Sem Google Signals/publicidade. A prévia também mede acessos, identificada por site_environment=preview. CSP libera somente hosts Google necessários. Não há acesso à propriedade GA4: recebimento real e opções de histórico da medição otimizada continuam pendentes; medição sem cookies tem limitações de relatórios/modelagem. Testes de navegador interceptam/bloqueiam Google para não gerar tráfego de QA. Main e produção preservadas.
