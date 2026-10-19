# Texto pronto para o suporte Netlify — não enviado

Assunto: HTTP 403 ocasional durante teste limitado de API em Deploy Preview

Projeto: stupendous-muffin-2438f0
Repositório/PR: https://github.com/carolsalvaro/apuracao-2026-hn/pull/1
Prévia: https://deploy-preview-1--stupendous-muffin-2438f0.netlify.app
Contexto: Deploy Preview #1, branch feat/integracao-tse; produção não foi alterada.

Em 19/10/2026, aproximadamente às 16h13 no horário de Brasília (19h13 UTC), um teste limitado de polling recebeu HTTP 403 ao iniciar o maior patamar. Interrompemos o teste na primeira recusa. O teste usa curl HTTP/2, proxy HTTPS do ambiente de desenvolvimento e TLS verificado. A origem do 403 ainda não foi identificada: pode ter vindo da Netlify ou da infraestrutura desse ambiente.

Antes da recusa, os dois patamares menores completaram 183 e 916 consultas, com p95 de 265 e 242ms. A rodada toda registrou 1.137 respostas: 1.136 HTTP 200 e uma HTTP 403, com cerca de 1,62 MB comprimidos. As APIs envolvidas são /api/resultados (overview e três seleções municipais fixas) e /api/politica. O plano maior era representar o polling de 5.000 visitantes, mas ele NÃO foi concluído. Não utilizamos parâmetros aleatórios de cache ou uma rota de coletor aberto.

A versão do coletor de métricas usada nessa tentativa não preservou a URL exata, o corpo nem o x-nf-request-id da resposta recusada. O coletor já foi corrigido para registrar esses dados numa eventual recusa futura. Não atribuímos a causa ao WAF sem evidência.

Evidências da conta/projeto:
- O painel Web security exibido pela proprietária mostra WAF desativado e nenhuma regra ativa de Firewall Traffic Rules ou Rate Limiting. Total blocked aparece como “---”, portanto não afirmamos zero bloqueios nem assumimos que o painel cobre todo o tráfego da prévia.
- O log da função resultados enviado pela proprietária cobre 15h56–16h18 de Brasília: 174 execuções e 11 rodadas de coleta, com 854 verificações de fontes, status ok e failures=0. Não há ERROR, 403, 429, timeout ou falha de armazenamento nesse arquivo. Isso não exclui recusa antes da função.
- Consultas individuais posteriores retornaram 200.
- Uma checagem pequena posterior fez 40 leituras de /analytics.js e 40 de /api/resultados?kind=overview, com até 40 simultâneas: todas retornaram 200. Não repetimos o ensaio grande após a recusa.

Vocês conseguem verificar se houve recusa da plataforma, proteção automática contra tráfego ou limite específico de Deploy Preview nesse período? Qual é o procedimento recomendado para validar esse volume de polling, com limites de requisições e transferência, sem comprometer a conta ou a origem dos dados?

O projeto usa coleta central limitada e cache; os visitantes não acessam diretamente o TSE. Queremos confirmar a causa antes de repetir carga maior ou publicar o domínio final.
