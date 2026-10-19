# Apuração 2026 — HN Notícias + Vertical FM

**PRÉVIA EM VALIDAÇÃO. Integração oficial disponível na branch feat/integracao-tse; ainda não liberar para cobertura eleitoral.**
Endereço final informado: **apuracao.hnnoticias.com.br**, ainda sem vínculo de domínio ou publicação de produção neste trabalho.

Layout exportado em 15/10/2026. Mantém fotos, mapas, patrocinadores, favoritos, navegação fixa, compartilhamento, bonequinhos e últimas notícias com imagens.

## Importar no GitHub
1. Extraia o ZIP no computador.
2. Abra o repositório novo `apuracao-2026-hn`.
3. Use **Add file → Upload files** (ou GitHub Desktop).
4. Envie o CONTEÚDO da pasta extraída: `public`, `netlify`, `tests`, `netlify.toml`, `package.json`, `README.md`, `AGENTS.md` e `PRODUCAO.md`.
5. Os arquivos `netlify.toml` e `package.json` devem estar na RAIZ do repositório. Não envie apenas o ZIP, nem uma pasta adicional envolvendo tudo.
6. Confirme o commit. Se o GitHub pedir para substituir o README inicial, use o deste pacote.

## Importar no Netlify
Importe o repositório pelo fluxo de integração Git. A configuração está em `netlify.toml`:
- Base directory: vazia (raiz).
- Build command: vazio (sem compilação).
- Publish directory: `public`.
- Functions directory: `netlify/functions`.
- Node: 22.
Não é necessário cadastrar segredos para esta prévia.
As funções precisam ser implantadas pelo Git/Netlify; arrastar apenas `public` para o deploy manual não inclui a função de notícias.

## Conferência após o primeiro deploy
1. Abra o endereço `*.netlify.app` e confira as fotos, menu fixo e favoritos no celular.
2. Abra `/api/politica`: deve retornar JSON com três chamadas e campos `title`, `url`, `date`, `image`.
3. Confira se as notícias mostram “Atualizado às”; o fallback é uma cópia de 15/10/2026 e pode ficar antigo quando a API não responde.
4. Teste compartilhar/copiar, retorno ao quadro presidencial, reentrada dos bonequinhos ao rolar e botão atualizar.
5. Confira no painel Netlify os logs da função `politica`.

A função consulta a categoria Política (ID 254) do WordPress do HN e usa cache CDN de cinco minutos. O navegador consulta `/api/politica` a cada cinco minutos enquanto visível. A rota é fixa, não um proxy aberto.

## Resultados e atualização na branch de integração
- Presidente, 27 estados, SC, 303 municípios do catálogo, mapas, favoritas e seis governadores usam resultados oficiais do TSE pela API central. Zero seções significa “Aguardando apuração”; ausência de dados significa indisponível. Não há porcentagens fictícias como fallback.
- Municípios em andamento são consultados pela página a cada minuto. Ao atingir 100% das seções oficialmente validado, param as consultas automáticas à origem e o resultado final é preservado. Isso não garante entrega instantânea: origem/rede/cache podem acrescentar atraso.
- A página informa data/hora da origem e da consulta. Cópia inicial oficial datada é identificada como atualização pendente; não é apresentada como apuração ao vivo.
- A API usa fila, limite global de coleta e Netlify Blobs para preservar o último resultado válido. Os visitantes leem a API local; não consultam o TSE diretamente. A atualização central limitada também funciona na prévia, onde agendamentos Netlify não executam automaticamente.
- Notícias continuam via Netlify Function. Favoritas ficam no localStorage do navegador; não são sincronizadas entre aparelhos nem enviadas no compartilhamento.
- GA4 vinculado ao ID confirmado `G-VZYMP84YWY`, inclusive na prévia (`site_environment=preview`). Uma chamada explícita de page_view por abertura; atualização, rolagem e animação não chamam Analytics. Consent Mode inicia com armazenamento analítico e publicidade negados: somente medição sem cookies, sujeita às limitações de relatórios/modelagem do Google. Não há banner nem concessão implícita de consentimento. Recebimento na propriedade e opções de medição otimizada devem ser conferidos no GA4 antes da divulgação.
- A cobertura e a capacidade ainda estão em validação. Manter noindex e não publicar em produção sem concluir o checklist.

## Testes e desenvolvimento
Requer Node >=22.12. Execute `npm ci`, `npm test` e `npm run test:browser`.
Para simular as funções localmente, use Netlify CLI (`netlify dev`) se já disponível. Abrir o HTML pelo explorador de arquivos serve apenas para ver o layout e não executa a função de notícias.
Testes incluídos são unitários/de contrato, não substituem testes reais em navegador, de carga nem o primeiro deploy no Netlify.

## Arquivos
- `public/index.html`: página autossuficiente, CSS/JS e imagens incorporadas. Código ainda monolítico; refatorar sem mudar o layout aprovado.
- `netlify/functions/politica.mjs`: endpoint de notícias adaptado para Netlify (não depende de Cloudflare Workers).
- `netlify.toml`: configuração de deploy.
- `tests/`: testes sem dependências.
- `AGENTS.md`: contexto para o Codex.
- `PRODUCAO.md`: pendências antes da divulgação.

## Atenção
O noindex está ativo no HTML e no cabeçalho HTTP durante a validação da integração. Isso NÃO restringe acesso: uma URL de teste Netlify pode ser pública. Use controles de acesso do projeto, quando disponíveis, e não divulgue como apuração real.
O pacote não contém senhas, tokens, histórico Git nem identificação interna da hospedagem anterior. Não substitui nem altera o projeto Sul na Urna.

## Integração TSE em desenvolvimento

A branch `feat/integracao-tse` liga os componentes à API oficial, com cache, fila de atualização e cópia do último resultado válido. Consulte [o relatório de integração](docs/INTEGRACAO-TSE.md) para limites, fontes verificadas e verificações ainda pendentes. O endereço principal permanece na main; as alterações estão no deploy-preview do PR #1.
