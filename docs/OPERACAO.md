# Operação e critérios para liberação

Estado: prévia do PR #1, sem autorização de produção. Este documento não autoriza merge, alteração de DNS, retirada de noindex ou deploy de produção.

## Público de referência e limites

A responsável informou quase **5.000 pessoas simultâneas no primeiro turno**. Esse é o público de referência para a capacidade da cobertura.

O navegador faz pelo menos quatro leituras de resultados por minuto enquanto visível (presidente, estados, governadores e municípios; pode haver mais lotes municipais) e notícias a cada cinco minutos. Com 5.000 navegadores, quatro leituras equivalem a cerca de **20.000 requisições por minuto na borda**, além das notícias, arquivos e lotes adicionais. Isso não é a quantidade de chamadas ao TSE nem necessariamente de execuções de função: consultas comuns podem ser atendidas pelo CDN. Favoritas e seleções diferentes criam chaves distintas. IDs municipais são ordenados para compartilhar a mesma chave entre seleções equivalentes.

A origem TSE fica limitada por lease global de um minuto, lote de até 16, timeout de oito segundos, orçamento para iniciar consultas de 12 segundos e intervalo mínimo de cinco minutos por localidade. Presidente nacional e SC são priorizados quando elegíveis; os demais alvos continuam em rotação. A coleta agendada de produção e a atualização por leitura agora usam o mesmo lote máximo e compartilham a lease. A fila só é regravada quando a demanda precisa ser criada/renovada, não por cada leitor.

O ensaio de 90 minutos usa relógio acelerado e respostas locais para os 337 alvos. Com origem rápida, a primeira passagem completa leva até 23 rodadas de minuto; presidente/SC respeitam ciclos de cinco minutos em condições saudáveis. Não prometer cinco minutos para cada uma das 303 cidades sob demanda máxima. Falhas/backoff aumentam o prazo. O limite de capacidade da cobertura continua sendo uma pendência real.

**Liberação para 5.000 simultâneos depende de confirmar plano, créditos/orçamento, banda, funções, concorrência e operações Blobs da conta Netlify.** A leitura pública da API do site não informa o plano. Testes locais não comprovam limites contratados ou disponibilidade da Netlify. Não executar carga de 5.000 visitantes na hospedagem sem conhecer esses limites e combinar o ensaio; nunca executar carga contra o TSE.

## Verificação técnica reproduzível

- `npm test`: contratos, falhas e recuperação; o ensaio de 90 minutos é acelerado/local, sem rede TSE.
- `npm run test:load`: dois cenários locais com 5.000 requisições cada, concorrência 100. Um usa cache já preenchido e outro inicia a coleta compartilhada. Registra p95, chamadas da origem simulada e gravações de demanda. Não representa 5.000 visitantes simultâneos reais nem capacidade Netlify.
- `npm run test:browser`: Chromium local, cinco larguras, candidaturas por identidade, seleção/favoritas e manutenção de valores em falha. Não é Android/iOS físico.
- `npm run test:preview`: a prévia fixa via respostas HTTPS validadas reproduzidas no Chromium; não abre o CTA Sul na Urna.
- `python scripts/check-preview.py`: página, noindex, presidente, SC, governadores, Criciúma/Tubarão e três notícias. Salva `artifacts/operations/preview-health.json`. Acesso de rede deve estar disponível. Essa leitura pode iniciar uma revalidação limitada do cache da prévia, não carga no TSE.

Dados sintéticos usados nos testes não são publicados como resultados da aplicação.

## Cache, falhas e atualização

O armazenamento do PR usa `hn-tse-preview-integracao-tse-pr-1`, estável entre seus deploys e separado de `hn-tse-production`. A revisão da configuração prefixa as chaves e isola eleições incompatíveis. Uma mudança de revisão exige validar a nova cópia inicial; não copiar registros de eleição diferente nem apagar histórico para contornar rejeições.

Com ETag da origem, o coletor envia If-None-Match; com Last-Modified, envia If-Modified-Since. Em 304 preserva corpo, votos e horário de recebimento do corpo, atualiza a tentativa e limpa o erro. Sem resultado anterior, 304 não vira resultado válido. 429 respeita Retry-After. Timeout, 404/5xx, schema, candidatura ou localidade errados e regressão preservam o último resultado válido.

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
