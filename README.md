# prisma

Ferramenta de **Marketing Mix Modeling (MMM)**: sobe um dataset (CSV/XLSX), a IA descreve os dados e sugere variáveis, roda um modelo (adstock → saturação → contribuições) e explora os resultados — **decomposição** por variável, **ROI** por canal de mídia, otimizador e curva de resposta. Deploy em `prisma.pereirasaraiva.com`.

> Glossário do domínio (investimento, custo, unidades, CPP) e achados de arquitetura: [`GLOSSARIO.md`](./GLOSSARIO.md) · [`AUDITORIA-ARQUITETURA.md`](./AUDITORIA-ARQUITETURA.md).

## Stack

- **App**: TanStack Start (React 19) + Vite, rodando em **Cloudflare Workers** (nitro). Entry do Worker: `src/server.ts`.
- **Dados**: Supabase (Postgres + RLS + Storage). Service-role só no servidor (`supabaseAdmin`), com a leitura **owner-scoped** concentrada em `src/lib/data.server.ts`.
- **IA**: provider OpenAI-compatível (Google AI Studio / Gemini) — interpretação do dataset e sugestão de variáveis. Adapters em `src/lib/*.server.ts`.
- **Dados/planilha**: papaparse + xlsx (upload). O motor MMM **puro** vive em `src/lib/mmm.server.ts`.
- **Qualidade**: vitest (`pnpm run test`), eslint + prettier (`pnpm run lint`) — rodam no CI.

## Comandos

```sh
pnpm dev          # dev server
pnpm run test     # vitest (unidade)
pnpm run lint     # eslint + prettier
pnpm build        # build de produção (regenera src/routeTree.gen.ts)
```

CI (`.github/workflows/ci.yml`): lint + test em todo PR e push na `main`. Deploy (`.github/workflows/deploy.yml`): build + publish no Cloudflare. Variáveis de ambiente: ver `.env.example`.

## Mapa do código (resumo)

```
src/
  routes/
    _authenticated/        app (upload, datasets.$id.*, runs.$id, results.*, explore, compare, admin)
    share.runs.$id.tsx     visualização pública de um run (o UUID do link é o token)
  lib/
    *.functions.ts         fatias verticais: data · describe · mmm · admin · demo
    mmm.server.ts          motor MMM puro (adstock, saturação, decomposição, ROI)
    data.server.ts         leitura owner-scoped sobre supabaseAdmin (força .eq("user_id"))
    ai-gateway.server.ts   adapter do provider de IA
    errors.ts · config.ts · admin.server.ts (isAdminEmail) · format.ts
  integrations/supabase/   client (RLS) · client.server (service-role) · auth-middleware
```
