# Integração TSE — etapa 1, bloqueada para ativação

Branch: `feat/integracao-tse`. Projeto informado: `stupendous-muffin-2438f0.netlify.app`. Não houve alteração no Sul na Urna, implantação, merge ou remoção do noindex.

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

## Evidência e bloqueios externos

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
