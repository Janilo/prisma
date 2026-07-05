# Auditoria de Arquitetura — Prisma

> Base: Janilo/prisma (branch atual). Stack: TanStack Start · React 19 · Vite · Cloudflare Workers · Supabase · Zod · Tailwind 4 · shadcn.
> Referência: Matt Pocock, "Software Fundamentals Matter More Than Ever" (https://www.youtube.com/watch?v=v4F1gFy-hqg).
> Escopo: arquitetura (módulos, fatias, interfaces, testes) — não design visual.

> **⚠️ Status (jul/2026) — este doc é um snapshot e alguns achados já foram resolvidos.** Verificados como resolvidos:
> - **P-04** (authz à mão sobre `supabaseAdmin`) — a leitura owner-scoped vive em `src/lib/data.server.ts` (força `.eq("user_id", userId)`); o dashboard admin está atrás de `assertAdmin`.
> - **P-05** (erros tipados) — `errors.ts` agora é o módulo canônico, idêntico aos repos irmãos.
>
> Padronização cross-repo (P1): `errors.ts` canônico + `client.server.ts` lançando `ConfigError`. Config: `ADMIN_EMAIL` movido p/ `config.ts` e o stub `config.server.ts` + `api/example.functions.ts` removidos. Os demais achados abaixo **não foram re-auditados** nesta passada.

## Sumário executivo

| Princípio | Nota | Veredito (1 linha) |
|---|---|---|
| 1 — Linguagem ubíqua (DDD) | ✅ | Vocabulário MMM (dataset, run, dep/indep, contribution, roi, decomposition, adstock, hill, spend) é preciso e consistente do SQL ao componente. |
| 2 — Fatias verticais | 🟡 | As fatias `datasets`/`run`/`describe`/`demo`/`admin` são limpas; o seam `.server.ts`/`.functions.ts` não vaza — mas **`/results/*` é uma fatia fantasma** (UI estática sem backend). |
| 3 — TDD | 🔴 | Zero testes, zero test runner. A matemática pura do MMM — o núcleo do produto — roda sem nenhuma verificação. |
| 4 — Módulos profundos | 🟡 | `mmm.server.ts` e `ai-gateway.server.ts` são módulos profundos exemplares. Mas o "resultado" **não é um módulo** — a lógica de view está copiada em 4 telas e re-derivada em rota estática. |
| 5 — Ocultação de informação & design de sistema | 🟡 | `README.md` de rotas + scaffold `example.functions.ts` mostram consciência de design; RLS correta. Mas `supabaseAdmin` (bypass de RLS) espalhado em 22 pontos e 31 `throw new Error("string")` sem módulo de erro tipado. |

**Tese.** Pocock: código não é barato, e a IA é um programador *tático* brilhante que precisa de um *estrategista*. O Prisma é a prova viva disso. O **núcleo tático** — o motor de MMM (`ridgeFit`, `adstock`, `hill`, bootstrap de IC, decomposição, curvas de resposta) — é sofisticado, coeso e escondido atrás de uma interface simples: um módulo profundo de verdade. Onde falta o estrategista é na **fronteira do sistema**: (a) existem **duas superfícies de resultado paralelas** — o `RunReport` real, alimentado pelo motor, e as rotas `/results/*` que são *mockups estáticos com números cravados* servidos como a navegação principal pós-login; (b) o corpo do relatório foi **copiado 4 vezes** (`RunReport`, `demo`, `compare`, e parcialmente as rotas estáticas) em vez de virar um módulo; (c) **nenhum teste** cobre a matemática que decide para onde o cliente vai mover milhões em verba. A IA gerou telas plausíveis rápido; ninguém garantiu que elas fossem a *mesma verdade* nem que a verdade estivesse *certa*.

---

## A arquitetura em uma tela

Estrutura real (resumida):

```
src/
├─ lib/
│  ├─ mmm.server.ts        ← MÓDULO PROFUNDO: álgebra + ridge + adstock + hill + métricas (puro, sem I/O)
│  ├─ mmm.functions.ts     ← serverFns: runMmm/getRun/listRuns/… (orquestra motor + Supabase + Zod)
│  ├─ describe.server.ts   ← estatística descritiva pura (VIF, correlação, sazonalidade)
│  ├─ describe.functions.ts← serverFns: describeDataset/interpretDataset (chama LLM) + computeUnitCosts
│  ├─ ai-gateway.server.ts ← ADAPTER PROFUNDO: provider OpenAI-compat trocável por env
│  ├─ demo.functions.ts    ← getDemoRun (gera dataset sintético + roda motor real)
│  ├─ parse.ts             ← parse client-side CSV/XLSX + heurísticas de detecção de coluna
│  ├─ admin.{server,functions}.ts, config.server.ts, prisma-tokens.ts
│  └─ api/example.functions.ts  ← scaffold documentado (convenção viva)
├─ components/RunReport.tsx ← VIEW PROFUNDA do resultado (decomp, ROI, curvas, resíduos, simulador)
├─ routes/
│  ├─ _authenticated/
│  │  ├─ datasets.$id.{explore,model}.tsx  ← fatia real: config → runMmm
│  │  ├─ runs.$id.tsx / compare.tsx        ← consomem getRun (dados reais)
│  │  └─ results.{decomp,roi,response,optimizer}.tsx  ← ⚠️ MOCKUPS ESTÁTICOS (números cravados)
│  ├─ share.runs.$id.tsx   ← getPublicRun (read-only, UUID = token)
│  └─ demo.tsx             ← consome getDemoRun (dados reais, mas re-renderiza tudo à mão)
└─ integrations/supabase/
   ├─ client.ts (anon+RLS) · client.server.ts (service-role, BYPASS RLS) · auth-middleware.ts
```

Camadas — o caminho feliz vs. o caminho fantasma:

```
        ┌─────────────────────────── CAMINHO REAL (dados de verdade) ───────────────────────────┐
upload → datasets/$id/explore → datasets/$id/model → runMmm ──► mmm.server.ts (motor)
                                                        │                 │
                                                        ▼                 ▼
                                                   runs table ◄──── decomposition/roi/contrib/curve
                                                        │
                              runs/$id ─┐               │
                              compare ──┼──► getRun ────┘──► RunReport.tsx  (view profunda, correta)
                              share ────┘
                              demo ──────► getDemoRun ─────► (RE-RENDERIZA tudo à mão, cópia do RunReport)

        ┌────────────────── CAMINHO FANTASMA (navegação principal pós-login) ──────────────────┐
PrismaShell nav → /results/decomp · /results/roi · /results/response · /results/optimizer
                       │
                       ▼
                 SVG e <table> com números CRAVADOS ("R$ 8,4M", "ROI 2,9", "Search 4,12")
                 NÃO chama getRun · NÃO conhece nenhum run · NÃO toca o motor
```

O motor existe e é bom. O problema é que a **porta de entrada do usuário para "ver resultados" leva ao caminho fantasma**, e o caminho real está duplicado em 4 arquivos.

---

## 1 — Linguagem ubíqua

**Nota: ✅**

O vocabulário de MMM é preciso e atravessa todas as camadas sem tradução ad hoc. Os mesmos substantivos de domínio aparecem no schema, no serviço, no tipo compartilhado e na rota:

- **Schema** (`supabase/migrations/20260528012953_…sql`): `datasets`, `runs`, `dep_variable`, `indep_variables_json`, `params_json`, `metrics_json`, `contributions_json`, `roi_json`, `decomposition_json`, `predicted_json`.
- **Serviço** (`mmm.functions.ts:18-39`): o `RunInput` fala a mesma língua — `depVariable`, `indepVariables`, `mediaVariables`, `adstockDecay`, `adstockDecays`, `saturationAlpha`, `holdoutPeriods`, `spendBasis`.
- **Motor** (`mmm.server.ts`): `adstock`, `hill`, `ridgeFit`, `contributions`, `r2/mape/rmse` — nomes canônicos da literatura de MMM, não inventados.
- **Tipo compartilhado** (`RunReport.tsx:35-80`): `RunTotals`/`RunDecomp`/`RunReportData` espelham 1-para-1 as colunas `*_json`.

Termos de negócio bem traduzidos para o PT-BR do cliente sem perder o termo técnico: "Base (sazonalidade + intercepto)" (`mmm.functions.ts:282`), "Curva de resposta", "ROI marginal", "Validação out-of-sample". A nota metodológica sobre viés do Ridge (`RunReport.tsx:409-424`) usa a linguagem certa (encolhimento, `(X′X + αI)⁻¹`, residual bootstrap).

**Ponto de atenção (não é bug):** o conceito **"spend / investimento"** tem três nomes conforme o ângulo — `spend`/`spendBasis` (motor/ROI), `unit_costs_json` (coluna do dataset, `migration …45d6f764`), `costColumn`/`CPP` (custo-por-unidade em `describe.functions.ts:200`). É rastreável (a migração até documenta o mapeamento no `COMMENT ON COLUMN`), mas um glossário de 5 linhas evitaria que a IA introduza um quarto sinônimo no próximo prompt.

**Contradição pequena:** o demo grava `dateColumn: "data"` (`demo.functions.ts:169`) mas gera decomposição com labels ISO — inofensivo, mas é a linguagem escorregando (a coluna real chamada "data" nem existe no payload sintético).

---

## 2 — Fatias verticais

**Nota: 🟡**

O split explícito **`*.server.ts` (puro/segredo) vs `*.functions.ts` (serverFn/orquestração)** é um bom seam e **não vaza**. Verifiquei repo-wide: nenhum `.server.ts` é importado por código de cliente como valor — os únicos consumidores são `.functions.ts` (server) e um `import type { DatasetSummary } from "@/lib/describe.server"` em `datasets.$id.explore.tsx:27` (tipo é apagado na compilação, seguro). O tree-shaking do `.server.ts` funciona como anunciado.

Fatias que **são** verticais limpas (schema → serviço → API → front):

- **Modelar:** `runs` (schema) → `ridgeFit` (`mmm.server.ts`) → `runMmm` (`mmm.functions.ts:379`) → `datasets.$id.model.tsx` (config) → `runs.$id.tsx` (view). Coesa.
- **Descrever:** `summary_json`/`insights_json` (migration `…0d9acb3a`) → `summarizeDataset` (`describe.server.ts`) → `describeDataset`/`interpretDataset` (`describe.functions.ts`) → `datasets.$id.explore.tsx`. Coesa, com cache no dataset (`describe.functions.ts:122-127`).
- **Compartilhar/Demo:** `getPublicRun` (`mmm.functions.ts:486`, sem auth, strip de `user_id`) → `share.runs.$id.tsx`; `getDemoRun` → `demo.tsx`. Fluxos reais e bem pensados.

**O furo (P0):** a capacidade **"Resultados"** (`/results/decomp|roi|response|optimizer`) **não é uma fatia** — é só a ponta de UI, sem serviço nem dado por baixo. Ex.: `results.roi.tsx:21-54` desenha um `<svg>` e uma `<table>` com "Search 4,1 / Social 3,2 / … / Total 2,9" **cravados no JSX**; nunca importa `getRun`, nunca lê `roi_json`. Idem `results.decomp.tsx` ("R$ 8,4M · R² 0,91"), `results.response.tsx` (paths SVG fixos) e `results.optimizer.tsx` (array `CH` hard-coded, `mroi` inventado, linha 12-18). Pior: **é essa a navegação principal** — `PrismaShell.tsx:9-12` manda o usuário logado exatamente para essas 4 telas, com títulos "· 2026 H1" fixos (`PrismaShell.tsx:22-25`). O motor calcula `curve` (`mmm.functions.ts:293-305`) e IC de ROI (`:228-230`) que **nenhuma** dessas telas consome.

Efeito Pocock: a IA entregou 4 telas que *parecem* o produto; como fatia vertical, são um fundo falso. Um cliente que loga e clica "ROI por canal" vê números que não são dele.

---

## 3 — TDD

**Nota: 🔴**

Fato objetivo: **`package.json` não tem test runner** (sem `vitest`/`jest` nas deps, sem script `test`, `scripts` tem só `dev/build/preview/lint/format` — `package.json:6-13`) e **zero arquivos `*.test.ts`/`*.spec.ts`** no repo. O produto inteiro — cujo valor é *um número em que o cliente confia para realocar verba* — não tem uma única asserção automatizada.

Isto é exatamente o risco desproporcional que Pocock aponta: lógica numérica pura é a mais barata de testar e a mais cara de errar em silêncio. A matemática está isolada em funções puras (`mmm.server.ts`, `describe.server.ts`, `parse.ts`) — **prontas para teste, sem mocks**. O que testar primeiro, por ordem de alavancagem:

1. **`ridgeFit` (`mmm.server.ts:183`)** — dado um `X` com relação linear conhecida (`y = 2·x1 + 3·x2 + 5`), `beta` deve recuperar ~[2,3] e `intercept` ~5. Testar também: `alpha` maior encolhe `beta` na direção de 0; matriz singular cai no `throw` de Cholesky (`:50`), não em NaN.
2. **Decomposição soma o total (`mmm.functions.ts:264-270, 287-322`)** — invariante central do MMM: `base + Σ contribuições_do_período ≈ predicted` do período (tolerância). Se isso quebrar, todo gráfico de decomposição e todo share mentem. Hoje nada garante.
3. **ROI (`mmm.functions.ts:315` e `channelSpendTotal:150`)** — `roi = contribuição / spend`; com `spendBasis` mapeado, o denominador tem que ser a soma da coluna de investimento, não da coluna de execução (GRP). É a regra de negócio mais sutil do app e a mais fácil de regredir.
4. **`adstock`/`hill` (`mmm.server.ts:110-127`)** — `adstock(x, 0)` = `x`; carryover geométrico com `decay` conhecido; `hill` monotônica em [0,1] e satura. Casos de borda: série toda-zero, `k=0`.
5. **`parseCSV` (`mmm.functions.ts:48`)** — aspas RFC-4180 escapadas (`""`), vírgula dentro de aspas, célula vazia → `null`, número vs string. Há 3 cópias deste parser (ver Achado P-01); um teste força a consolidação.

Sem TDD aqui, cada refactor do motor (ou cada "melhoria" sugerida por IA) é uma aposta cega.

---

## 4 — Módulos profundos (Ousterhout)

**Nota: 🟡**

**Os módulos profundos existem e são bons — o resultado não é um deles.**

Profundos de verdade (interface pequena, implementação poderosa):

- **`mmm.server.ts`** — a superfície pública é essencialmente `ridgeFit({X,y,alpha,featureNames})` e `adstock/hill`; por baixo esconde transpose/matmul, Cholesky solve *e* inverse, padronização/des-padronização, erros-padrão via `(X′X+αI)⁻¹`, aproximação de p-valor (Abramowitz-Stegun, `:152`). O chamador não sabe nada disso. Exemplar.
- **`ai-gateway.server.ts`** — 13 linhas, uma função `createAiGatewayProvider(apiKey)`; troca de provider (Google/OpenAI/OpenRouter) é só env, sem tocar código. Adapter profundo canônico.
- **`RunReport.tsx`** *como componente* — recebe um `run` e produz decomposição, real-vs-predito, diagnóstico de resíduos (z-score, outliers `:119-139`), ranking com IC, ROI, curvas de resposta e simulador de budget. Muita capacidade atrás de `<RunReport run={…}/>`.

**O módulo raso/ausente (P0/P1):** não existe um módulo "resultado". A lógica de apresentar um run está:
- **Reimplementada estaticamente** nas 4 rotas `/results/*` (Achado P-00);
- **Copiada quase inteira** em `demo.tsx:64-305` — decomp AreaChart, pred LineChart, tabela de drivers, `pConfidence` (`:317`), `fmt` (`:325`) são cópia de `RunReport.tsx` (`:672`, `:680`);
- **Re-derivada** em `compare.tsx` — `DecompChart` (`:212`), `PredChart` (`:253`), `SERIES_COLORS` (`:32`) e `fmt` (`:341`) são cópia; o próprio código admite: *"Local helpers (mirrored from RunReport to avoid exporting internals)"* (`compare.tsx:340`).

Ou seja: as sub-views do `RunReport` (`ResponseCurves`, `BudgetSimulator`, `DecompChart`, `fmt`) são **privadas do arquivo**, então toda outra tela que precisa do mesmo gráfico **copia**. É o oposto de módulo profundo: a interface não expõe o poder, então o poder é reescrito. Um gráfico de decomposição existe em 4 lugares e pode divergir em 4 lugares.

**Utilitários:** `parse.ts` é razoavelmente profundo (esconde Papa/XLSX + heurísticas de tipo/data/granularidade atrás de `parseFile`/`analyzeColumns`). `prisma-tokens.ts` é um mirror de tokens honesto e bem comentado (`:8` avisa que precisa espelhar `prisma.css`) — raso por natureza, e tudo bem.

---

## 5 — Ocultação de informação & consciência de design de sistema

**Nota: 🟡**

**Créditos reais (positivos Pocock de "mapa vivo do sistema"):**

- **`src/routes/README.md`** documenta a convenção de file-based routing e o que *não* fazer (nada de `src/pages/`, `app/layout.tsx`) — evita exatamente o tipo de deriva que IA introduz. E a realidade bate: não há `pages/`, o único shell é `__root.tsx`.
- **`src/lib/api/example.functions.ts`** é um scaffold documentado do padrão `createServerFn` (quando usar `.server.ts` vs inline, `:6-12`) — convenção executável.
- **`config.server.ts`** ensina o gotcha de env em Cloudflare Workers (bind por request, ler dentro da função) num comentário de 10 linhas — conhecimento de sistema preservado no lugar certo.
- **RLS correta e ocultação real de segredo:** todas as tabelas têm policies por dono (`…_select_own`/`insert_own`/…, migration `…e45ee20d`), bucket `datasets` privado com policy por prefixo `user_id/`, e `client.server.ts` (service-role) tem o comentário de segurança certo (`:33-35`). O seam de segredo (`SUPABASE_SERVICE_ROLE_KEY` nunca chega ao cliente) está bem guardado.

**Onde a ocultação vaza (P1/P2):**

- **`supabaseAdmin` (bypass total de RLS) espalhado em 22 usos / 4 arquivos** (`mmm.functions.ts` 7×, `admin.functions.ts` 5×, `describe.functions.ts` 5×, `client.server.ts` 5×). Cada uso re-implementa a autorização à mão com `.eq("user_id", userId)` (ex. `mmm.functions.ts:118-120`, `describe.functions.ts:50-52`). Isso funciona, mas **move a fronteira de segurança do banco (RLS) para o código de aplicação** e a espalha. Um único `getRunOwned(id, userId)`/`loadDatasetForUser` centralizado (o padrão já existe pela metade em `describe.functions.ts:46`) reduziria a superfície onde "esqueci o `.eq(user_id)`" vira vazamento entre inquilinos.
- **31 `throw new Error("string em PT-BR")` em 9 arquivos**, sem módulo de erro tipado. As mensagens são boas para humano ("Dataset não encontrado.", "Matriz não positiva definida; aumente alpha.") mas: (a) o cliente as distingue por `err.message` de string (`model.tsx:105`, `runs.$id.tsx:56`) — frágil; (b) não há distinção entre erro de *validação/negócio* (mostrar ao usuário) e erro *interno* (logar, mostrar genérico) — o `ErrorComponent` do root imprime `error.message` cru na tela (`__root.tsx:62`), então uma falha de infra pode expor detalhe. Um `AppError`/`NotFoundError`/`ValidationError` tipado resolveria os dois.
- **`describe.functions.ts` e `mmm.functions.ts` carregam CADA um seu próprio `parseCSV`** — o código até admite: *"Minimal CSV parser (matches mmm.functions.ts)"* (`describe.functions.ts:10`). Segredo de implementação (como um CSV vira linhas) duplicado = duas fontes da verdade para o formato de dados (ver Achado P-01).
- **Divergência doc×realidade (menor):** o schema tem `runs.status`/`error_message` para modelar falha, mas `executeMmm` sempre insere `status: "done"` (`mmm.functions.ts:344`) e nunca grava `error_message`. O "mapa" (schema) promete uma máquina de estados que o código não usa.

---

## Achados priorizados

### P-00 · `/results/*` são mockups estáticos servidos como a navegação principal (P0)
- **Arquivo:** `src/routes/_authenticated/results.roi.tsx:21-54`, `results.decomp.tsx:25-92`, `results.response.tsx:21-72`, `results.optimizer.tsx:12-18`; navegação em `src/components/prisma/PrismaShell.tsx:9-12`.
- **Sintoma:** as 4 telas de resultado desenham SVG/tabelas com números cravados (`Total 2,9`, `R$ 8,4M`, `Search 4,12`, `mroi: 2.1`). Não importam `getRun`, não têm `runId`, não tocam o motor. O `PrismaShell` (nav principal pós-login) aponta para elas. Um cliente vê números que não são dele e não muda nada ao rodar um modelo.
- **Princípio ferido:** 2 (fatia vertical — só a ponta existe) e 4 (módulo raso — re-deriva a view).
- **Correção (passos):**
  1. Fazer `/results/*` receber um `run` real. Ou por seleção (`/results/decomp?run=<uuid>` via `validateSearch`, como `compare.tsx:22`) ou "último run do usuário" (novo serverFn `getLatestRun`).
  2. Extrair as sub-views do `RunReport` para um barrel `components/report/` (ver P-02) e montar cada `/results/*` como **view fina** sobre esses componentes + `getRun`.
  3. Se as telas forem só marketing/preview, movê-las para fora de `_authenticated` e rotulá-las "exemplo" — nunca sob a nav de dados reais.
- **Aceite:** logar → clicar "ROI por canal" → ver os canais/ROIs do *meu* run mais recente; rodar um novo modelo muda a tela; `grep -n "4,12\|8,4M\|R\$ 760k" src/routes/_authenticated/results.*` retorna zero.

### P-01 · `parseCSV` triplicado — três fontes da verdade para o formato de dados (P0)
- **Arquivo:** `src/lib/mmm.functions.ts:48-83`, `src/lib/describe.functions.ts:11-44` (comentário `:10` "matches mmm.functions.ts"), e um terceiro gerador/parser de dataset em `src/routes/_authenticated/upload.tsx:37-70` + `demo.functions.ts:23-78` (mesma seed 42, mesmas fórmulas google/meta/tv).
- **Sintoma:** o mesmo parser CSV existe copiado em 2 serverFns; o mesmo dataset sintético existe copiado em 2 lugares. Corrigir um bug de parsing (ex. novo delimitador, BOM) exige lembrar de 2-3 arquivos.
- **Princípio ferido:** 5 (ocultação — implementação do formato duplicada) e 3 (impossível testar uma vez só).
- **Correção (diff):**
```diff
// novo: src/lib/csv.server.ts
+ export function parseCSV(text: string): { columns: string[]; rows: Record<string, unknown>[] } { /* a única cópia */ }
// mmm.functions.ts
- function parseCSV(text: string) { …23 linhas… }
+ import { parseCSV } from "./csv.server";
// describe.functions.ts
- function parseCSV(text: string) { …cópia… }
+ import { parseCSV } from "./csv.server";
```
  E extrair `buildSampleDataset()` para um único módulo compartilhado entre `demo.functions.ts` e `upload.tsx`.
- **Aceite:** `grep -rn "function parseCSV" src/` retorna 1; um teste de `parseCSV` (P-03) cobre o único caminho; o dataset de exemplo tem uma definição só.

### P-02 · Corpo do relatório copiado em 4 telas (P1)
- **Arquivo:** fonte `src/components/RunReport.tsx`; cópias em `demo.tsx:64-331` (decomp/pred/drivers/`fmt`/`pConfidence`) e `compare.tsx:212-347` (`DecompChart`/`PredChart`/`SERIES_COLORS`/`fmt`, admitido em `:340`).
- **Sintoma:** gráfico de decomposição, real-vs-predito e formatador de moeda existem em 4 lugares e podem divergir. Já divergem: `compare.tsx:230` usa `fill="#94908a"` para a base, `RunReport.tsx:256` usa `BASELINE` (#B8B4D8) — cores de "Base" diferentes na mesma feature.
- **Princípio ferido:** 4 (módulo profundo — sub-views privadas forçam cópia) e 1 (a mesma "Base" com duas cores).
- **Correção (passos):** criar `components/report/` exportando `DecompChart`, `PredVsActualChart`, `DriversTable`, `RoiTable`, `ResponseCurves`, `BudgetSimulator`, e `lib/format.ts` com `fmt`/`pConfidence`. `RunReport`, `demo`, `compare` e `/results/*` passam a **compor** esses blocos. Deletar as cópias.
- **Aceite:** `fmt`/`pConfidence` definidos 1× cada (`grep -rn "function fmt" src/` → 1); trocar a cor da série "Base" num lugar muda em todas as telas; `demo`/`compare`/`results` importam de `components/report/`.

### P-03 · Motor de MMM sem nenhum teste (P0)
- **Arquivo:** `src/lib/mmm.server.ts` (todo), `src/lib/mmm.functions.ts:264-322` (decomp/ROI), `src/lib/parse.ts`; `package.json:6-13` (sem runner).
- **Sintoma:** zero testes, zero test runner. A lógica que produz o número de negócio roda sem verificação; qualquer regressão passa silenciosa (o próprio motivo pelo qual bugs de HSL passaram no repo irmão `cascata`).
- **Princípio ferido:** 3 (TDD).
- **Correção (passos):**
  1. `pnpm add -D vitest` + `"test": "vitest"` em scripts.
  2. `mmm.server.test.ts`: `ridgeFit` recupera coeficientes conhecidos; `alpha` encolhe; Cholesky lança em matriz singular; `adstock(x,0)===x`; `hill` monotônica/saturante.
  3. `mmm.decomp.test.ts`: invariante `base + Σ contrib ≈ predicted` por período; `roi = contrib/spend`; `spendBasis` usa a coluna de investimento no denominador.
  4. `parse.test.ts`: RFC-4180 (aspas escapadas), vírgula em aspas, vazio→null.
- **Aceite:** `pnpm test` roda verde no CI; cobre `ridgeFit`, decomposição-soma-total, ROI-com-spendBasis e `parseCSV`; um `beta` propositalmente quebrado faz o teste falhar.

### P-04 · Autorização à mão sobre `supabaseAdmin` espalhada (P1)
- **Arquivo:** `src/lib/mmm.functions.ts` (7 usos; ex. `:115-121`, `:339-375`, `:489-496`), `describe.functions.ts` (5; `:46-55`), `admin.functions.ts` (5).
- **Sintoma:** 22 usos de `supabaseAdmin` (bypass de RLS); cada um refaz `.eq("user_id", userId)` na mão. A fronteira de isolamento entre inquilinos deixou o banco e virou convenção espalhada — esquecer um `.eq` num futuro serverFn vaza dados de outro usuário.
- **Princípio ferido:** 5 (ocultação de informação / superfície de segurança) e 4 (padrão de acesso deveria ser 1 módulo).
- **Correção (diff):**
```diff
// novo: src/lib/data.server.ts — único ponto que combina admin + checagem de dono
+ export async function getRunOwned(id: string, userId: string) {
+   const { data, error } = await supabaseAdmin.from("runs").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
+   if (error || !data) throw new NotFoundError("Run não encontrado.");
+   return data;
+ }
+ export async function loadDatasetForUser(id, userId) { /* mover a versão de describe.functions.ts:46 pra cá */ }
```
  serverFns passam a chamar esses helpers em vez de montar a query. Preferir o client com RLS (`context.supabase`, já usado em `listRuns`/`getRun` `:454`,`:468`) quando não precisa de bypass.
- **Aceite:** nenhum serverFn monta `supabaseAdmin.from("runs"/"datasets").eq("user_id", …)` inline; o acesso por dono passa por 1-2 helpers; teste: pedir run de outro user retorna `NotFoundError`.

### P-05 · `throw new Error("string")` sem erros tipados; mensagem crua vaza na tela (P1)
- **Arquivo:** 31 ocorrências em 9 arquivos (`mmm.functions.ts` 13×, `auth-middleware.ts` 7×, `describe.functions.ts` 3×, …); consumo por string em `model.tsx:105`, `runs.$id.tsx:56`; render cru em `__root.tsx:62`.
- **Sintoma:** sem tipo de erro, o front distingue casos por `err.message` (string PT-BR) e o `ErrorComponent` imprime `error.message` direto — um erro interno (ex. infra Supabase, `client.server.ts:17`) aparece cru para o usuário.
- **Princípio ferido:** 5 (fronteira de erro não modelada).
- **Correção (passos):** criar `src/lib/errors.ts` com `AppError` (tem `userMessage` seguro + `httpStatus`) e subtipos `NotFoundError`/`ValidationError`/`AuthError`. Trocar os `throw new Error(...)` de negócio por eles; no `ErrorComponent`, mostrar `userMessage` se `err instanceof AppError`, senão texto genérico + `console.error`.
- **Aceite:** erros de negócio são `instanceof AppError`; a tela nunca mostra stack/detalhe de infra; `auth-middleware` usa `AuthError`.

### P-06 · Glossário de domínio ausente para "spend/investimento/CPP" (P2)
- **Arquivo:** `mmm.functions.ts:37` (`spendBasis`), migration `…45d6f764` (`unit_costs_json`), `describe.functions.ts:200` (`costColumn`/CPP), `datasets.$id.explore.tsx:49` (`inferUnit`).
- **Sintoma:** o mesmo conceito de negócio ("quanto custou o canal") tem 4 nomes conforme o arquivo. Rastreável hoje, mas é o ponto onde a IA mais provavelmente cria um 5º sinônimo.
- **Princípio ferido:** 1 (linguagem ubíqua sob leve erosão).
- **Correção:** um bloco de ~8 linhas no topo de `mmm.server.ts` (ou um `GLOSSARIO.md`) fixando: `spend` = investimento em R$; `spendBasis` = mapa canal→coluna-de-investimento; `unit_costs_json` = a persistência desse mapa; `CPP` = custo por unidade de execução. Não muda código.
- **Aceite:** existe um lugar canônico que define os 4 termos; novo código referencia esses nomes.

### P-07 · `runs.status`/`error_message` prometidos no schema mas nunca usados (P2)
- **Arquivo:** schema `…e45ee20d.sql` (`status DEFAULT 'pending'`, `error_message`); `mmm.functions.ts:344` sempre grava `status: "done"`.
- **Sintoma:** o motor roda síncrono e só persiste em sucesso; falha vira `throw` e nenhum run é gravado. As colunas `status`/`finished_at`/`error_message` sugerem uma máquina de estados (pending→running→done/error) que não existe. Mapa (schema) mente sobre o comportamento.
- **Princípio ferido:** 5 (doc/schema divergindo da realidade).
- **Correção:** decidir e alinhar — ou (a) remover `status`/`error_message` se runs são sempre síncronos e só-sucesso; ou (b) se o objetivo é rodar em background (datasets grandes já degradam: `mmm.functions.ts:185` reduz bootstrap por custo), gravar `pending` antes e atualizar para `done`/`error`. Documentar a escolha.
- **Aceite:** o schema reflete o ciclo de vida real; nenhuma coluna existe "só por existir".

---

## O que já está certo (não regredir)

- **Motor MMM é um módulo profundo de referência** (`mmm.server.ts`): álgebra + Cholesky + ridge padronizado + IC por residual bootstrap (`mmm.functions.ts:181-230`) atrás de uma interface mínima. Não diluir essa lógica dentro de rotas.
- **Fronteira serverFn validada por Zod:** todo `createServerFn` público valida entrada (`RunInput` `mmm.functions.ts:18`, `DescribeInput` `:64`, etc.). Manter todo serverFn novo com `.inputValidator`.
- **Seam `.server.ts` vs `.functions.ts` limpo e sem vazamento** de segredo para o cliente (verificado repo-wide). Segredo (`SUPABASE_SERVICE_ROLE_KEY`) fica só no server.
- **RLS por dono + storage privado por prefixo** (migrations `…e45ee20d`) — a base de segurança está correta no banco; o objetivo do P-04 é *voltar* a confiar mais nela.
- **Fluxos de share e demo** bem desenhados: `getPublicRun` faz strip de `user_id` e usa o UUID como token não-enumerável (`mmm.functions.ts:483-498`); demo roda o **motor real** sobre dado sintético (sem fingir números).
- **Consciência de design documentada:** `routes/README.md`, `api/example.functions.ts`, comentários de `config.server.ts`/`client.server.ts`. Manter o hábito de deixar a convenção escrita ao lado do código.
- **Versionamento de dataset** (parent/version, `mmm.functions.ts:89-110` + `rerunOnLatestVersion`) e **comparação de runs** (`compare.tsx`) são capacidades reais e coesas.
- **`ai-gateway.server.ts`** trocável por env — não acoplar o app a um provider específico.

---

## Checklist de verificação

- [ ] `grep -rn "4,12\|R\$ 8,4M\|R\$ 760k\|mroi:" src/routes/_authenticated/results.*` → **zero** (nenhum número de resultado cravado).
- [ ] Logar → "ROI por canal"/"Decomposição" mostra dados de um run real do usuário; rodar novo modelo muda a tela.
- [ ] `grep -rn "function parseCSV" src/` → **1**; dataset de exemplo definido 1× só.
- [ ] `grep -rn "function fmt" src/` → **1**; `DecompChart`/`PredChart` importados de `components/report/`, não copiados.
- [ ] Cor da série "Base" idêntica em RunReport, compare, demo e results (uma constante só).
- [ ] `pnpm test` existe e roda verde: `ridgeFit` recupera coeficientes; `base + Σ contrib ≈ predicted`; `roi` com `spendBasis`; `parseCSV` RFC-4180.
- [x] Nenhum serverFn monta `supabaseAdmin.from(...).eq("user_id", …)` inline — acesso por dono via `data.server.ts` (`getRunOwned`/`loadDatasetForUser`/`listDatasetVersionsOwned`).
- [x] Erros de negócio são `instanceof AppError` (`errors.ts`; client usa `userMessageFrom`, que atravessa o boundary); `ErrorComponent` nunca renderiza mensagem de erro interno cru.
- [x] Glossário de `spend`/`spendBasis`/`unit_costs_json`/`CPP` existe em 1 lugar canônico (`GLOSSARIO.md`; pontos de definição no código apontam para ele).
- [x] `runs.status`/`error_message`: **removidos** (decisão: runs são síncronos — a linha só existe completa; migration `20260704020000_runs_drop_phantom_lifecycle.sql` documenta a escolha e o caminho de volta se um dia houver execução em background). `finished_at` fica: é gravado no insert.
