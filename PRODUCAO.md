# Liberação da apuração — revisão de 19/10/2026

Domínio final informado pela responsável: **apuracao.hnnoticias.com.br**. Ainda não foi vinculado/configurado neste trabalho. Versão somente na branch `feat/integracao-tse`, PR #1 em rascunho. Sem merge, DNS, deploy de produção ou acesso ao Sul na Urna. Noindex permanece até autorização separada.

## Implementado e verificado

- [x] Presidente, 27 UFs, SC, 303 cidades do catálogo e seis governadores ligados à API central, sem resultados fictícios. Cobertura da busca é de 303 cidades, não todos os municípios brasileiros.
- [x] Coleta limitada, lease, cache durável, validação de eleição/localidade/candidatura, retentativas e último resultado válido. Simulados locais cobrem falha/recuperação, regressão, zero e totalização.
- [x] Municípios em andamento consultados pela página a cada minuto; parada em 100% validado, sem arredondar 99,999% para final.
- [x] Inicialização com timeout e nova tentativa automática após falha; atualização não fica permanentemente bloqueada se ocorrer erro de renderização.
- [x] Chromium local em 320/375/390/768/1440px: navegação, favoritas, mapas, votos, ausência de overflow/erros JS. Teste inclui falha inicial do catálogo e recuperação sem recarregar a página, além de retomada após erro da API.
- [x] GA4 confirmado `G-VZYMP84YWY`, evento explícito único por documento, Consent Mode sem cookies/publicidade. Recebimento nos relatórios ainda não confirmado.

## Conferência oficial e ambiente de prévia em 19/10

- EA11 reconferido: disputas ordinárias esperadas. EA12 mantém o mesmo SHA-256 da validação de 303 códigos municipais. Presidente, SC, Criciúma, Tubarão e seis governadores retornaram 200 e passaram no parser com identidades esperadas. Todos aguardam apuração. Não foram reconsultados os 337 EA20 nesta rodada.
- Página/API/notícias da prévia passaram no smoke check, com cache durável e sem avisos de saúde. Datas de origem antigas e zero seções antes da eleição são distintas de consulta falha.
- Ensaio real limitado de 91 requisições (uma inicial + três ondas de 30), máximo 30 simultâneas: zero erros, cerca de 1,91 MB lidos e cache Edge confirmado. p95 das ondas: 476/148/347 ms através do proxy deste ambiente. **Não comprova 5.000 visitantes simultâneos, carga prolongada, localidades diversas nem limite do plano.**

## Ainda necessário antes de divulgar

- [ ] Esclarecer a resposta 403 recebida no ensaio HTTP/2 antes de repetir a etapa maior; ainda sem atribuição de origem (Netlify ou infraestrutura de teste). Diagnóstico posterior com 80 consultas (até 40 simultâneas) retornou 200 em todas; log fornecido pela responsável não registra a recusa. Ensaio representativo de 5.000 ainda não aprovado. Texto para suporte em docs/CHAMADO-NETLIFY-403.md, não enviado.
- [ ] Confirmar saldo comprado/disponível e renovação, uso dos demais projetos e política de recarga; não há autorização para compra automática. Compra de 2.000 confirmada pela responsável; saldo informado em 19/10: 2.485. Confirmar renovação e uso de outros projetos; cenários e limites do ensaio em docs/OPERACAO.md.
- [ ] Confirmar recebimento real no GA4 e opções de pageview por histórico da medição otimizada; conferir limites de medição sem cookies e consentimento aplicável.
- [ ] Revisão no Android/iOS físico, compartilhamento e classificação editorial dos 45 municípios AMREC/AMESC/AMUREL.
- [ ] Definir responsável pelo plantão e canal de alerta. Scripts/logs disponíveis não equivalem a monitor externo com notificações.
- [ ] Autorizar produção/merge e vínculo de apuracao.hnnoticias.com.br; verificar domínio/HTTPS, URLs de compartilhamento, metadados e coleta agendada real após a publicação. Não prometer validar agendamento em deploy-preview: Netlify o executa na produção.
- [ ] Conferência final TSE, dados com votos ou simulado oficial se disponível; não existe nova data de simulado confirmada neste trabalho.
- [ ] Remover noindex somente na liberação pública autorizada. Manter referência de rollback e preservar Blobs.

Operação e recuperação: [docs/OPERACAO.md](docs/OPERACAO.md). Evidências e histórico: [docs/INTEGRACAO-TSE.md](docs/INTEGRACAO-TSE.md).
