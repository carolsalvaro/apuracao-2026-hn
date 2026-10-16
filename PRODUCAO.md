# Pendências antes de divulgar

Estado e evidências atuais: [integração](docs/INTEGRACAO-TSE.md). Procedimentos e liberação: [operação](docs/OPERACAO.md). Público de referência informado: quase 5.000 simultâneos. Os itens abaixo não são automaticamente resolvidos por testes locais.

- [ ] Validar documentação e arquivos oficiais atuais do TSE, eleições, turnos, cargos e localidades.
- [ ] Integrar presidente nacional, todas as UFs, SC e municípios; substituir dados demonstrativos integralmente.
- [ ] Confirmar os 45 municípios e regiões AMREC/AMESC/AMUREL; completar busca de municípios do Brasil (hoje é uma amostra).
- [ ] Tornar a lista de disputas de governador atualizável conforme configuração oficial.
- [ ] Implementar coleta central, cache compartilhado, armazenamento durável do último dado válido, retentativas limitadas e observabilidade.
- [ ] Definir com base no tráfego esperado a capacidade/limites/plano de Netlify e orçamento. Cache CDN não é armazenamento persistente.
- [ ] Separar atualização dos dados da animação e indicar quando não há novos dados.
- [ ] Testar rede lenta, timeouts, 404/429/5xx, JSON malformado, eleição errada, dados antigos, atualização parcial, zero votos e apuração finalizada.
- [ ] Verificar consistência com TSE e resultados em percentuais/votos/totalização sem inventar valores.
- [ ] Testar 320/375/390/768/1440px em navegadores reais, Android/iOS, cliques, favoritos, teclado, reduzido movimento e layout das imagens.
- [ ] Testar endpoint /api/politica implantado e tratamento de foto ausente/falha.
- [ ] Testar carga no nosso ambiente e cache sem gerar carga indevida ao TSE.
- [ ] Configurar domínio, HTTPS e compartilhamento com URL final; metadados de prévia social.
- [ ] Configurar GA4 do HN com consentimento aplicável e validar PV/clicks sem duplicação por hash, atualização ou animação.
- [ ] Preparar monitoramento, alertas, responsável de plantão, rollback e mensagem de indisponibilidade.
- [ ] Realizar ensaio ponta a ponta e aproveitar teste oficial do TSE se disponível e confirmado.
- [ ] Somente após remover simulações e concluir validação, retirar noindex do HTML e do netlify.toml e autorizar divulgação pública.

## Próxima tarefa sugerida ao Codex
Leia AGENTS.md, README.md e PRODUCAO.md. Inspecione o projeto sem alterar o layout. Execute os testes existentes. Proponha e implemente em etapas a integração oficial com TSE para Netlify, com cache e último resultado válido, estados de erro claros e testes relevantes. Comece verificando os dados e o ambiente; registre os pontos ainda não comprovados. Não trate a prévia como pronta nem publique dados simulados como reais.

## Verificação deste pacote
Adaptação de função e testes locais com respostas simuladas. Implantação no projeto Netlify do usuário, navegador real e carga ainda não realizados. A hospedagem anterior continua independente.
