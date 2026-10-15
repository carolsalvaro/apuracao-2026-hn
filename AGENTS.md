# Instruções para continuidade no Codex

## Objetivo
Levar a página aprovada de apuração do segundo turno de 2026 do HN Notícias/Vertical FM para produção em um subdomínio próprio, com código no GitHub e hospedagem Netlify. Preservar o Sul na Urna, que é outro projeto.

## Ponto de partida
Leia README.md e PRODUCAO.md. Execute npm test. Não confunda esta base com aplicação pronta. Preserve o layout: cabeçalho claro; navegação fixa compacta; fotos iguais; Lula vermelho, Flávio azul; faixas de seção escuras e títulos centralizados; dois espaços de patrocinadores; CTA Sul na Urna; três notícias de Política ao final com fotos.
A ordem atual é presidente, mapa Brasil, SC, mapa Sul de SC, cidades favoritas, governadores, CTA Sul na Urna, últimas notícias. O botão Presidente retorna ao quadro nacional, não ao mapa.

## Comportamentos aprovados
- Navegação por clique direta, sem animação longa que faça os botões piscarem.
- Seção ativa acompanha rolagem manual, respeitando a ordem física das seções.
- Favoritar uma cidade limpa a busca e prioriza favoritas.
- Seletor e mapa municipal ficam sincronizados.
- Bonequinhos iguais nas duas barras, movimento curto ao reaparecer e ao atualizar; respeitar prefers-reduced-motion.
- Não alterar votos para simular avanço nem representar animação como novos votos.
- Compartilhar usa navigator.share com fallback de cópia.

## Integrações
Notícias em /api/politica via Netlify Function. A branch feat/integracao-tse/PR #1 agora liga presidente, mapas, SC, 303 cidades do catálogo e governadores à API central /api/resultados. Não há números fictícios na página; ausência de dado é indisponível, zero seções oficial é aguardando apuração. Noindex preservado. Leia a seção de estado atual em docs/INTEGRACAO-TSE.md antes de trabalhar; as etapas históricas abaixo dela descrevem o estado anterior. A API pode revalidar localidades por fila/lease compartilhada na prévia (até 16 fontes/minuto e intervalo mínimo de cinco minutos por alvo); não reintroduzir consultas diretas do navegador ao TSE. Bootstrap contém apenas cópia oficial datada, rotulada como atualização pendente, nunca simulação. IDs/candidaturas foram revalidados em 15/10/2026 e continuam sujeitos a nova validação oficial.

## Desenvolvimento de produção
Centralizar consultas oficiais com cache compartilhado e cópia persistente do último dado válido. Validar ano/turno/cargo/localidade/candidaturas, votos e percentuais; distinguir dado ausente, zero real, atrasado e final. Não manter simulações como fallback em produção. Usar limites, intervalos e cache oficiais do TSE. Planejar recuperação e monitoramento, não prometer ausência absoluta de falhas.
Não enviar senhas/tokens em arquivos ou logs. Não habilitar Analytics sem ID confirmado. Não contar atualização de dados, rolagem ou replay de animação como pageview artificial.
Priorizar testes significativos de falha, recuperação, integração, celulares, carga e acessibilidade. Não declarar QA visual quando só houver testes de DOM.

## Estado técnico
HTML monolítico com CSS acumulado: cuidado com ordem/especificidade; houve bugs anteriores de espaçamento, cor do primeiro menu e borda/padding apenas no segundo candidato. Refatorar e testar antes de adicionar novas sobrescritas. CSP no HTML limita origens de imagens/conexões; revisar conscientemente ao integrar Analytics ou APIs.
