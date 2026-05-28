## Objetivo

Após o upload, oferecer uma página `/datasets/$id/explore` com análise descritiva visual + interpretação em linguagem natural feita pela Lovable AI, antes de o usuário rodar o modelo.

## Fluxo

1. Upload (já existe) → ao concluir, redireciona para `/datasets/$id/explore` (em vez de ir direto para configuração do modelo).
2. Tela "Explorar dados" mostra gráficos + texto da LLM.
3. Botão "Configurar modelo →" leva para `/datasets/$id` (configuração já existente).

## Backend

**`src/lib/describe.server.ts`** — estatísticas puras em TS:
- Para cada coluna numérica: min, max, média, mediana, desvio, % nulos, % zeros, skew, top 3 outliers.
- Série temporal (se houver coluna de data): tendência (slope de regressão linear simples), sazonalidade simples (média por mês/dow), variação MoM.
- Correlação de Pearson entre a variável dependente candidata e cada independente (matriz de correlação).
- Auxiliar `summarizeDataset(rows, columns)` → objeto JSON compacto (sem mandar o CSV inteiro para a LLM).

**`src/lib/describe.functions.ts`** — server fns:
- `describeDataset({ datasetId, depVariable? })`:
  - lê CSV do storage (mesma rota do `runMmm`), roda `summarizeDataset`, devolve JSON com:
    - `overview` (linhas, colunas, granularidade, período)
    - `columns[]` (stats por coluna)
    - `timeSeries` (série da variável escolhida, MoM, trend)
    - `correlations[]` (top correlações com `depVariable`)
- `interpretDataset({ datasetId, depVariable? })`:
  - chama `describeDataset` internamente
  - usa AI SDK + Lovable AI Gateway (`google/gemini-3-flash-preview`) com `Output.object` (Zod) para retornar:
    - `headline` (1 frase, "aha")
    - `keyFindings[]` (3–5 bullets em PT-BR, baseados nos números)
    - `dataQualityWarnings[]` (nulos, outliers, baixa variância, séries muito curtas)
    - `suggestedDependent`, `suggestedDrivers[]`, `suggestedMedia[]`
    - `nextStep` (frase curta)
  - cache: salva o resultado em `datasets.insights_json` (nova coluna) para não regerar a cada visita.
- Helper de gateway em `src/lib/ai-gateway.server.ts` (criar se não existir, conforme `ai-sdk-lovable-gateway`).

**Migração:**
- `alter table public.datasets add column insights_json jsonb;`
- `alter table public.datasets add column summary_json jsonb;` (cache das estatísticas)

## Frontend

**`src/routes/_authenticated/datasets.$id.explore.tsx`** (nova rota irmã, layout editorial):
- Header: nome do dataset, granularidade, período, nº linhas/colunas.
- Seletor de "Variável de interesse" (default: primeira numérica) — controla o que é destacado.
- Seção **Resumo IA** (card com hairline): `headline` em Fraunces grande + `keyFindings` em bullets + warnings em accent mostarda. Botão "Reanalisar" chama `interpretDataset` de novo.
- Seção **Série temporal** (recharts LineChart): variável de interesse no tempo, com média móvel 4 períodos.
- Seção **Distribuição & qualidade** (tabela): por coluna — média, mediana, min/max, % nulos, % zeros, outliers, sparkline.
- Seção **Correlações**: barra horizontal das top correlações (|r|) com a variável de interesse, cores: positiva marinho, negativa mostarda.
- Seção **Sazonalidade** (se granularidade mensal/semanal): barras por mês ou dia-da-semana.
- CTA inferior: "Configurar modelo MMM →" linka para `/datasets/$id` já preenchendo `?dep=...&indep=...&date=...` com as sugestões da LLM.

**Sidebar (`AppShell`)**: adicionar item "Explorar" quando estiver dentro de um dataset (ou apenas atualizar o link de "Datasets" para abrir `explore`).

**Upload (`upload.tsx`)**: trocar o `navigate` pós-upload para `/datasets/$id/explore`.

## Segurança & limites

- `describeDataset` e `interpretDataset` usam `requireSupabaseAuth` + `supabaseAdmin` (mesma maneira que `runMmm`); validação de ownership via `user_id`.
- Resumo enviado à LLM é JSON compacto (sem PII bruta, sem o CSV inteiro). Limitar a ~6 KB.
- Tratar erros do gateway (`402`, `429`) e mostrar toast claro.
- `Output.object` com Zod garante schema válido.

## Fora de escopo

- Edição/limpeza interativa dos dados.
- Geração de PDF do relatório.
- Comparação entre datasets.

## Ordem de implementação

1. Migração `insights_json` + `summary_json`.
2. `ai-gateway.server.ts` + `describe.server.ts` (puro TS, testável).
3. `describe.functions.ts` com as duas server fns.
4. Rota `datasets.$id.explore.tsx` com gráficos.
5. Ajustar upload para redirecionar.
6. Polir copy PT-BR e o item de navegação.
