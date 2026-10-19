# Operação e critérios para liberação

Estado: prévia do PR #1, sem autorização de produção. Este documento não autoriza merge, alteração de DNS, retirada de noindex ou deploy de produção.

## Estado mais recente — 19/10/2026

A responsável confirmou compra de **2.000 créditos** e saldo atual de **2.485**. Os saldos de 760/542/485 e a hipótese de compra de 1.500 abaixo são histórico. Estimador atualizado para 2.485, sem contratação ou recarga feita pelo agente. Cenários parciais de 430/538/754 deixam 2.055/1.947/1.731, antes das exclusões e uso dos demais projetos. Aumento de saldo não aumenta automaticamente concorrência ou garante disponibilidade.

Diagnóstico com quatro leituras: arquivo estático 506ms; overview com revalidação 5.373ms; overview seguinte 482ms; leitura operacional sem coleta 347ms. Esses valores medem um caminho de rede, não o tempo de todos os usuários. API agora permite CDN com `s-maxage=30, stale-while-revalidate=15`: depois de 30s, a borda pode entregar a cópia por até 15s enquanto revalida, preservando datas de origem/consulta no corpo. Leitura operacional `cached=1` segue no-store e não coleta. Primeiro acesso sem cópia ainda pode esperar. A janela pode adicionar até 15s de idade do cache além dos demais atrasos; não anunciar entrega instantânea ou em até um minuto. Fonte: [cache da Netlify](https://docs.netlify.com/build/caching/caching-overview/).

Ensaio HTTP/1.1 com conexões persistentes: 2.061 respostas válidas, 2.024 hits de cache, 3,32 MB; interrompido pela fila do gerador. Outro cliente, curl com HTTP/2 pelo mesmo proxy/TLS, está disponível em `scripts/load-preview-http2.py` (plano por padrão, --run para executar). Ele controla partidas por segundo em lotes, mede status/latência/banda/cache e não usa parâmetros aleatórios ou rota do coletor. Não confundir taxa de polling equivalente com 5.000 navegadores completos. Resultados de cada rodada devem ser preservados sem ocultar falhas de preparação. O cliente final usa curl HTTP/2 sequencial por trabalhador com taxa de 275/min, até 40 trabalhadores, timeout 8s e limite temporal por patamar. Padrão imprime plano; --run executa. Critério de p95 <2s e taxa final >=95% do alvo não foi aprovado: uma resposta 403 interrompeu a rodada após 1.137 respostas totais (1.136 de sucesso). 183/916 completadas nos patamares menores, p95 265/242ms. Não reproduzir carga maior até identificar a origem da recusa; acesso individual posterior 200 não explica o bloqueio sob carga. Preservar relatórios e solicitar logs/segurança da Netlify, com acesso da responsável, antes de atribuir causa. O coletor de métricas agora registra URL/servidor/ID em recusas futuras. Nenhum acesso autenticado ao painel disponível neste ambiente. Checagem leve posterior por HTTP/2: três respostas 200, em 4.966/565/103ms, com hit Edge na última. Não foi observado fwd=stale nessa checagem curta; a presença da configuração não é prova de homologação em produção.

## Público de referência e limites

A responsável informou quase **5.000 pessoas simultâneas no primeiro turno**. Esse é o público de referência para a capacidade da cobertura.

Parâmetros atualizados pela usuária: **760 créditos disponíveis**, pico após as **17h de 25/10**, com duração aproximada de **duas horas**. Não confundir duração do pico com encerramento da coleta às 19h: a apuração continua enquanto houver dados em andamento.

O navegador consulta o overview e os municípios ainda em apuração **a cada minuto**, além de mudanças de seleção/atualização manual. Notícias continuam a cada cinco minutos. IDs municipais ordenados permitem compartilhar chaves CDN entre seleções equivalentes. Com 5.000 navegadores constantes, o cenário padrão sem novas interações soma aproximadamente 11.000 leituras periódicas/minuto na borda; cache CDN não elimina cobrança de requisições/banda.

A coleta é central, por lease global de um minuto. API e agendado usam lote máximo de 400 fontes fixas, até quatro trabalhadores e ritmo de até 20 inícios de consulta por segundo, abaixo do [limite oficial de 100/IP/segundo do TSE](https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados). O universo configurado tem 337 alvos. Não é um lote por visitante. Rodadas de 60 segundos com ETag/Last-Modified: cada alvo entra no máximo uma vez por rodada. O próximo prazo saudável é ancorado no início da rodada, para não somar sua duração ao intervalo; a distância entre duas partidas de um alvo pode variar se sua posição mudar. Backoff e Retry-After em falhas são contados após a tentativa. API pode iniciar trabalho por até 30 segundos; agendado, por até 18 segundos, reservando tempo para o último timeout de oito segundos. São guardas de início/rede, não garantia sobre latência de Blobs. [Limites da Netlify](https://docs.netlify.com/build/functions/configuration/): síncrono 60s; agendado 30s.

Presidente/SC mantêm prioridade; o restante roda em fila. O ensaio com origem rápida simulada cobre os 337 em uma rodada, mas isso **não comprova latência de todas as fontes reais**. Em lentidão/backoff, o restante fica para o próximo ciclo. O período de um minuto do navegador também não garante exibição em até 60 segundos: publicação do TSE, coleta, CDN e rede podem acrescentar atraso. Não anunciar atualização instantânea.

### Municípios com 100% das seções

Quando o último registro validado de um município tem `phase=totalized` (seções contadas iguais ao total), o coletor deixa de consultar sua fonte e preserva o registro final. O navegador também retira esse município dos próximos lotes automáticos; numa nova visita, lê a cópia armazenada. Final municipal não envelhece para status stale só pelo tempo transcorrido, e a página informa que o acompanhamento automático terminou. 99,999% não é final: mostra menos de 100%, sem parar por arredondamento. Presidente e governadores não são incluídos nessa parada.

Essa política foi solicitada expressamente pela usuária. 100% de seções não afirma homologação jurídica. Uma retificação oficial posterior exigirá revisão operacional e revalidação controlada da localidade; a coleta automática encerrada não a descobrirá. Não apagar histórico ou desabilitar validação de regressão.

### Estimativa para 760 créditos no Personal

Fontes de taxas: [planos](https://www.netlify.com/pricing/) e [medição de créditos](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/). Personal inclui 1.000 créditos/mês; a usuária confirmou saldo atual de 760. Taxas consultadas: 2 créditos/10.000 requisições, 20 créditos/GB de banda e 10 créditos/GB-hora de compute.

`node scripts/estimate-capacity.mjs` considera 5.000 pessoas constantes por **duas horas**, uma visita inicial cada, todos os municípios ainda em andamento e nenhum ganho por totalização. Resultado parcial: 1.320.000 leituras periódicas = **264 créditos de requisições**; HTML/JSON gzip medidos localmente somam cerca de 7,62 GB = **153 créditos de banda**. Parcial: **417 créditos**, deixando 343 dos 760 para itens ainda não medidos. A compressão gzip foi confirmada por HTTPS na prévia para HTML, overview e um lote municipal, mas o tamanho projetado não é medição de fatura futura. Sem compressão, o mesmo modelo parcial passa de 760.

O modelo exclui corpos de notícias, módulos/catálogo, outros arquivos, recargas/rotatividade de público, compute/armazenamento, atividade fora do pico e uso de outros projetos. Payloads com votos podem comprimir de forma diferente das capturas antes da votação. Municípios finalizados reduzem consultas/transferência ao longo do período; esse ganho não foi descontado. **417 não é orçamento final ou garantia de que 760 bastam.** Acompanhar consumo real e manter margem operacional. Nenhum upgrade, compra de créditos ou ajuste de recarga foi feito.

Conforme a [documentação de recarga](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/configure-auto-recharge/), falta de créditos pode pausar os projetos da equipe. Confirmar política de gastos antes de produção. Não executar carga de 5.000 pessoas na hospedagem sem combinar limites; nunca executar carga contra o TSE.

### Saldo revisado: 542 créditos

Saldo informado posteriormente: 542, compartilhado com outros projetos conforme relato da responsável (consumo por projeto ainda não verificado). `estimate-capacity.mjs` agora inclui os cinco arquivos locais publicados, consultas iniciais e cenários de novas aberturas, mantendo 5.000 simultâneos por duas horas. Compressão é estimada localmente, sem teste de carga externo.

| Aberturas no período | Subtotal em créditos | Margem de 542 | Margem de 1.542 |
| --- | ---: | ---: | ---: |
| 5.000 | 430 | 112 | 1.112 |
| 10.000 | 538 | 4 | 1.004 |
| 20.000 | 754 | -212 | 788 |

São cenários, não previsão de audiência ou teto de gasto. Pressupõem download completo dos arquivos locais a cada abertura (cache de navegador pode reduzir) e não descontam municípios finalizados. Ainda excluem corpos de notícias, processamento/armazenamento, atualizações manuais, período fora do pico, outros projetos e mudanças de tamanho com votos. Fotos/notícias de terceiros não são banda da Netlify deste projeto. As taxas oficiais de requisições/banda foram reconfirmadas na documentação. 542 não oferece reserva confortável; 1.542 melhora a margem somente se o saldo continuar disponível. Não autoriza compra, recarga automática ou mudança de plano.

Próximo dado necessário: data de renovação e consumo recente por projeto no painel. Próxima verificação técnica: planejar ensaio progressivo na prévia, com duração, volume e limite de custo definidos, sem carga no TSE. Não executar 5.000 acessos contra a hospedagem apenas para demonstrar capacidade; os testes locais existentes não comprovam capacidade Netlify.

### Saldo confirmado em 19/10: 485 créditos

A responsável informou **485 disponíveis**, sem compra dos 1.500 adicionais. A simulação atual compara 485 com 1.985 somente como hipótese após compra; nenhum pagamento ou recarga foi configurado. Os subtotais de 430/538/754 para 5/10/20 mil aberturas deixam, respectivamente, 55/-53/-269 dos 485, antes de compute/armazenamento e demais exclusões. Não usar o saldo atual como margem suficiente para o evento.

`scripts/load-preview.py` apresenta o plano por padrão; `--run` executa somente na URL fixa do PR. Cenário: APIs de resultados e notícias, três seleções municipais fixas, progressão de volume correspondente a 500/2.500/5.000 visitantes consultando 2,2 vezes por minuto. Até 14.000 partidas, 80 trabalhadores, 80 MB observados antes de novas partidas, timeout individual 8s, parada em erro, latência acima de 5s ou fila saturada. Requisições já em voo podem acrescentar transferência ao limiar. Esses limites não são teto de faturamento de compute. Não inclui rajada inicial de HTML/imagens, seleções arbitrárias, dois horários/regiões ou duas horas de resistência.

A primeira rodada usou conexões novas e foi interrompida por saturação do gerador: 1.259 respostas válidas, zero falhas de API, 2,03 MB, 1.224 hits de cache. O patamar de 5.000 não foi sustentado. O transporte passou a reutilizar conexões HTTP/1.1 pelo mesmo proxy, mantendo CA/SNI; uma tentativa inicial desse transporte foi interrompida por latência acima de 5s em uma leitura sem hit de cache (resposta válida). Preservados relatórios locais dessas tentativas; não descartar essas limitações ao interpretar eventual rodada posterior. Origem/rede/coleta em leitura fria podem acrescentar atraso. Não são provas de capacidade máxima ou fatura.

## Verificação técnica reproduzível

- `npm test`: contratos, falhas e recuperação; o ensaio de 90 minutos é acelerado/local, sem rede TSE.
- `npm run test:load`: dois cenários locais com 5.000 requisições cada, concorrência 100. Um usa cache já preenchido e outro inicia a coleta compartilhada. Registra p95, chamadas da origem simulada e gravações de demanda. Não representa 5.000 visitantes simultâneos reais nem capacidade Netlify.
- `npm run test:browser`: Chromium local, cinco larguras, candidaturas por identidade, seleção/favoritas e manutenção de valores em falha. Não é Android/iOS físico.
- `node scripts/estimate-capacity.mjs`: cenário explícito de consumo, sem rede e sem inferir o saldo real.
- `npm run test:preview`: a prévia fixa via respostas HTTPS validadas reproduzidas no Chromium; não abre o CTA Sul na Urna.
- `python scripts/check-preview.py`: página, noindex, presidente, SC, governadores, Criciúma/Tubarão e três notícias. Salva `artifacts/operations/preview-health.json`. Acesso de rede deve estar disponível. Essa leitura pode iniciar uma revalidação limitada do cache da prévia, não carga no TSE.

Dados sintéticos usados nos testes não são publicados como resultados da aplicação.

## Cache, falhas e atualização

O armazenamento do PR usa `hn-tse-preview-integracao-tse-pr-1`, estável entre seus deploys e separado de `hn-tse-production`. A revisão da configuração prefixa as chaves e isola eleições incompatíveis. Uma mudança de revisão exige validar a nova cópia inicial; não copiar registros de eleição diferente nem apagar histórico para contornar rejeições.

Com ETag da origem, o coletor envia If-None-Match; com Last-Modified, envia If-Modified-Since. Em 304 preserva corpo, votos e horário de recebimento do corpo, atualiza a tentativa e limpa o erro. Sem resultado anterior, 304 não vira resultado válido. 429 respeita Retry-After. Timeout, 404/5xx, schema, candidatura ou localidade errados e regressão preservam o último resultado válido.

`/api/resultados?kind=president&cached=1` permite ler o registro sem disparar coleta e usa no-store para a observação não vir do CDN. Valores de cached diferentes de 1 são rejeitados.

`source=durable_cache` e tentativa recente demonstram leitura de registro do armazenamento. `source=verified_snapshot` é a cópia oficial datada empacotada, não uma atualização ao vivo. `storage=ready` isolado não prova gravação. Em indisponibilidade total não inventar zeros ou percentuais. `awaiting` com zero seções oficial é diferente de dado ausente. `totalized` indica seções totalizadas, sem afirmar homologação jurídica.

## Monitoramento e resposta

1. Conferir o resultado de `check-preview.py`, sobretudo `checkedAt`, `receivedAt`, `error`, `source` e o horário da origem. Antes da eleição, um arquivo antigo com zero seções pode continuar sendo a última fonte oficial; consulta antiga e origem antiga são problemas diferentes.
2. Nos logs das funções, procurar `tse_read_refresh` e `tse_collection`. Registram status, quantidades e falhas, sem credenciais ou dados dos visitantes. `storage_or_config_failure` requer verificar armazenamento/configuração. Ainda não há serviço externo de alertas configurado.
3. Em 429, respeitar a espera da origem. Em JSON incompatível ou regressão, conferir fonte oficial e configuração. Não desabilitar validação para fazer um número aparecer.
4. Em erro de armazenamento, preservar os registros. A cópia inicial será mostrada com data/atualização pendente; se não houver dado válido, manter mensagem de indisponibilidade.
5. Em falha de notícias, a página mantém as últimas chamadas conhecidas e indica a falha. Conferir as datas das matérias e o portal HN. Uma resposta 200 não garante que haverá matéria nova a cada cinco minutos.

## Retorno à versão anterior

Manter registrados SHA e URL do último deploy aprovado deste mesmo site. Antes de qualquer ação de produção, revisar a versão anterior e os registros que ela consegue ler. Um rollback de código não deve apagar Blobs nem permitir regressão de dados. Na prévia, pode-se restaurar uma versão por commit na mesma branch, com revisão do diff e deploy automático do PR. Para produção, solicitar autorização específica após apresentar a versão e o impacto; não executar aqui.

## Pendências para publicar

- Confirmar capacidade e orçamento da conta para o público informado; combinar ensaio de carga na hospedagem e critérios de latência/erro.
- Revisar prazo aceitável de atualização para cidades com a equipe editorial (a passagem de todos os alvos não é simultânea).
- Conferir Android/iOS físicos, teclado/leitor de tela e compartilhamento no domínio final.
- Conferir a classificação editorial das 45 cidades em AMREC/AMESC/AMUREL e a cobertura de busca (303 cidades, não Brasil inteiro).
- Acompanhar eventual ensaio oficial do TSE e fontes com votos; não publicar arquivos de simulação oficial como resultados reais.
- Definir responsável de plantão, canal de alerta e quem pode autorizar rollback. Os scripts/logs acima não substituem esse responsável.
- Autorizar separadamente domínio final/HTTPS, publicação, metadados e eventual Analytics. Manter noindex até a liberação.
