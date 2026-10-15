# Apuração 2026 — HN Notícias + Vertical FM

**BASE DE DESENVOLVIMENTO / PRÉVIA. Não está pronta para a cobertura eleitoral.**
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

## O que é real e o que é simulação
- Presidente, percentuais, votos, mapa do Brasil, recorte SC e municípios: **demonstrativos**.
- Governadores: consulta direta do navegador aos arquivos TSE do segundo turno, com seis UFs configuradas e cópia inicial. Precisa ser revalidada e migrada para a arquitetura de produção. Não há garantia de acesso CORS a partir do novo domínio.
- Atualizar resultados: anima os bonequinhos e solicita consulta de governadores. NÃO integra presidente/mapas e NÃO recarrega a página.
- Notícias: consulta real ao WordPress via Netlify Function.
- Favoritos: localStorage do navegador; não são sincronizados entre aparelhos.
- Compartilhamento: usa o domínio onde a página estiver aberta; a lista privada de favoritos não é enviada.
- Analytics/GA4: ainda não configurado. Nenhum clique é contabilizado automaticamente como novo pageview pelo código.

## Testes e desenvolvimento
Requer Node 22 ou superior. Execute `npm test` (sem instalar dependências).
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
O noindex está ativo no HTML e no cabeçalho HTTP enquanto houver dados simulados. Isso NÃO restringe acesso: uma URL de teste Netlify pode ser pública. Use controles de acesso do projeto, quando disponíveis, e não divulgue como apuração real.
O pacote não contém senhas, tokens, histórico Git nem identificação interna da hospedagem anterior. Não substitui nem altera o projeto Sul na Urna.
