## Objetivo

Estabelecer consistência visual entre `pereirasaraiva.com` (pai) e o Prisma (filho), começando pelo cabeçalho e rodapé das **páginas de entrada** — `/` e `/login`. As internas autenticadas mantêm o sidebar atual de operação.

## Referência (capturada de pereirasaraiva.com)

**Cabeçalho** — barra horizontal sobre fundo creme (`brand-offwhite`):
- Esquerda: wordmark serif "J P Saraiva" (Fraunces, peso regular, cor `brand-purple`).
- Centro/direita: links em caixa-alta, tracking largo, sans — SERVIÇOS · CASES · BLOG · NEWSLETTER · SOBRE · CONTATO.
- Extrema direita: botão sólido `brand-purple` com texto branco caixa-alta — "AGENDAR →".
- Hairline inferior dividindo do conteúdo.

**Rodapé** — não exposto na home capturada; será desenhado dentro do mesmo design system (creme, tipografia editorial, hairlines).

## Mudanças no Prisma

### 1. Novo componente `src/components/marketing/SiteHeader.tsx`
Réplica fiel do cabeçalho do pai, adaptada à hierarquia:
- Wordmark "J P Saraiva" (link para `https://pereirasaraiva.com`) seguido de separador fino e label "· Prisma" em sans/cinza para sinalizar produto-filho.
- Nav de produtos irmãos linkando para fora: Cascata (`https://cascata.pereirasaraiva.com`), Lente (`https://lente.pereirasaraiva.com`), Prisma (ativo, sem link).
- Links institucionais do pai (SOBRE, CONTATO) abrindo em `pereirasaraiva.com/sobre` e `/contato`.
- CTA "AGENDAR →" em `brand-purple` apontando para `pereirasaraiva.com/contato`.
- Sticky no topo, com hairline inferior.
- Responsivo: nav vira menu hambúrguer < md.

### 2. Novo componente `src/components/marketing/SiteFooter.tsx`
Rodapé editorial mínimo coerente com o design system:
- Faixa superior em três colunas: wordmark + tagline curta · "Outros produtos" (links Cascata, Lente) · "Pereira Saraiva" (links Site, Sobre, Contato).
- Faixa inferior hairline: "© 2026 Pereira Saraiva · Consultoria independente" à esquerda; "Prisma · Marketing Mix Modeling" à direita.
- Tipografia: eyebrow para labels, sans para links, `text-brand-gray` para metadados.

### 3. Aplicação
- **`src/routes/login.tsx`**: envolver com `<SiteHeader />` no topo e `<SiteFooter />` no rodapé; o painel atual "brand panel" esquerdo continua, mas a wordmark "Prisma" sai dele (passa a viver no header global).
- **`src/routes/index.tsx`**: continua só redirecionando — não precisa de header (não é página visível).
- Páginas autenticadas (`_authenticated.tsx` + `AppShell`): **fora de escopo** desta rodada, conforme o pedido "pelo menos na entrada". Mantêm sidebar.

### 4. Sem mudanças no design system
Tokens (`brand-purple`, `brand-offwhite`, `brand-creme`, Fraunces, Inter Tight, eyebrow, hairline) já existem em `src/styles.css` e batem com o pai — basta usar.

## Fora de escopo

- Replicar o cabeçalho dentro das telas autenticadas (`/upload`, `/datasets`, `/runs`). Posso fazer numa segunda rodada se quiser.
- Mudanças no Cascata e no Lente — eles têm seus próprios repos.
- SSO real entre os 4 domínios (links cruzados são navegação simples).

## Pontos a confirmar

1. **Wordmark do header**: prefere "J P Saraiva · Prisma" (assinatura do pai + produto) ou só "Prisma" com um link discreto "← Pereira Saraiva"?
2. **CTA do header**: aponta para `pereirasaraiva.com/contato` (AGENDAR) ou para `/login` interno do Prisma (ENTRAR)?
3. **Rodapé**: incluo os 3 produtos irmãos como navegação cruzada explícita ou só o link para o site-mãe?
