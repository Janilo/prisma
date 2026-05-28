
# Prisma — Marketing Mix Modeling

App web para rodar MMM a partir de uma planilha de série temporal. Modelo Ridge com adstock e saturação, decomposição de vendas, ROI por canal, métricas de qualidade. Auth + histórico de runs por usuário.

## Stack e decisão de backend

- Frontend: TanStack Start + Tailwind v4, tokens do design system J P Saraiva (Fraunces + Inter Tight, marinho/roxo/verde/mostarda, hairlines, cantos quadrados).
- Backend: Lovable Cloud (Supabase) para auth, storage e persistência de runs.
- Modelagem: implementação Ridge em TypeScript dentro de um `createServerFn`. Solução fechada com inversão de matriz, sem dependência de Python. Para os volumes típicos de MMM (52 a 200 linhas, 5 a 20 variáveis), roda em menos de 1s no Worker.
- Gráficos: Recharts (já no padrão Lovable), customizado para seguir o spec do brand (linha 1.5px, eixo hairline, grid pontilhada, labels no fim da linha, paleta marinho → roxo → verde → mostarda).

## Modelo de dados (Lovable Cloud)

```text
profiles              id (= auth.users), display_name, created_at
datasets              id, user_id, name, original_filename, storage_path,
                      n_rows, n_cols, columns_json, period_start, period_end, created_at
runs                  id, user_id, dataset_id, name, status, dep_variable,
                      indep_variables_json, params_json (alpha, adstock decay, saturation),
                      metrics_json (r2, mape, rmse), contributions_json,
                      roi_json, decomposition_json, predicted_json, residuals_json,
                      created_at, finished_at
```

Storage bucket privado `datasets/` para CSV/XLSX originais. RLS: cada usuário só lê e escreve as próprias linhas em `datasets` e `runs`. `profiles` segue padrão Lovable.

## Estágios do app (rotas)

Layout `_authenticated` com sidebar fixa (Upload, Diagnóstico, Modelo, Resultados, Histórico), seguindo a composição da direção v3 (sidebar 56px, header 80px, conteúdo `max-w-7xl`).

1. `/_authenticated/upload` — drop de CSV/XLSX, parse no cliente (papaparse para CSV, SheetJS para XLSX), preview da tabela, salvar arquivo bruto no Storage e metadados em `datasets`.
2. `/_authenticated/datasets/$id/diagnose` — detecção automática:
   - tipos de coluna (data, numérica, categórica),
   - granularidade temporal (diária/semanal/mensal),
   - missings por coluna,
   - outliers via IQR,
   - sugestão de variável dependente (coluna numérica com "venda", "revenue", "sales" no nome ou maior variância),
   - candidatas a independentes (colunas numéricas com "gasto", "spend", "investimento", "imp", "clicks", "preco", etc.).
3. `/_authenticated/datasets/$id/model` — usuário confirma dep, independentes, alpha do Ridge (default 1.0), decaimento de adstock por canal (default 0.5), curva de saturação (Hill com k default), e roda o modelo via `runMmm` server fn.
4. `/_authenticated/runs/$id` — **dashboard de resultados**, layout exato da direção v3:
   - Header com nome do run, ID, seletor de período, Exportar PDF.
   - Seção "Qualidade do Ajuste": R² e MAPE em Fraunces grande com explicação em linguagem simples.
   - Seção "Decomposição de Vendas": área empilhada semana a semana (base + canais).
   - Seção "Real vs Predito": linha sólida marinho + linha tracejada roxo.
   - Seção "Eficiência por Canal (ROI)" + tabela "Contribuição Incremental" com %, valor absoluto e significância (★).
5. `/_authenticated/runs` — Histórico de runs do usuário, tabela com data, dataset, R², MAPE, ações.
6. `/login` — email/senha + Google (via broker Lovable, com `configure_social_auth`).

## Detalhes técnicos do modelo

Arquivo: `src/lib/mmm.server.ts` (helpers puros) + `src/lib/mmm.functions.ts` (server fns).

Pipeline dentro de `runMmm`:

1. Carregar dataset do Storage (admin) → parse → matriz X (n×p) e vetor y (n).
2. Para cada coluna de mídia, aplicar adstock geométrico: `x_t' = x_t + λ · x_{t-1}'`.
3. Aplicar saturação Hill: `f(x) = x^α / (x^α + k^α)` com k = mediana da coluna.
4. Padronizar X e y (z-score), guardar média/desvio.
5. Resolver Ridge fechado: `β = (XᵀX + αI)⁻¹ Xᵀy` com inversão por decomposição de Cholesky (implementação manual, sem deps pesadas).
6. Estimar erro-padrão de cada β via `σ² · diag((XᵀX + αI)⁻¹)`, derivar t-stat e p-valor aproximado (distribuição normal).
7. Calcular contribuição de cada variável em cada t: `c_{i,t} = β_i · x_{i,t}` (na escala original).
8. Base = intercepto + variáveis não-marketing (preço, sazonalidade, etc.).
9. ROI por canal = soma das contribuições / soma do gasto bruto.
10. Métricas: R², MAPE, RMSE.
11. Persistir tudo em `runs` como JSON serializável.

Sem retornar objetos vivos do server fn, só DTOs.

## Componentes-chave

- `SidebarNav` — replica da v3.
- `RunHeader` — nome do run, ID em mono, seletor de período, botão Exportar.
- `MetricCard` — eyebrow + número Fraunces grande + parágrafo explicativo (R², MAPE).
- `DecompositionChart` — Recharts AreaChart empilhado, paleta brand, labels no fim.
- `ActualVsPredictedChart` — Recharts LineChart, linha sólida + dashed.
- `RoiList` — cards horizontais com Fraunces no número, badge mostarda para underperformers.
- `DriversTable` — tabela editorial com hairlines, mono para números, ★ para significância.
- `UploadDropzone`, `ColumnPicker`, `DiagnosticsList`.

## Segurança

- RLS em todas as tabelas escopadas em `auth.uid()`.
- Bucket `datasets` privado, signed URLs só pelo server.
- `runMmm` usa `requireSupabaseAuth`, lê dataset com `supabaseAdmin` só após confirmar que pertence ao `userId`.
- `attachSupabaseAuth` registrado em `start.ts`.

## Fora deste plano (entrega futura)

- Painel/geo (só série temporal única, conforme você pediu).
- Bayesian MMM (PyMC). Se quiser depois, troca o solver no `runMmm` por uma chamada para um Modal endpoint, sem mexer no resto.
- Otimizador de mix ("Simular cenário").
- Export PDF (botão já no header, mas funcionalidade fica pra próxima rodada).

## Ordem de implementação

1. Habilitar Lovable Cloud, criar schema (profiles, datasets, runs, storage bucket, RLS, grants).
2. Auth: páginas `/login`, `/signup`, layout `_authenticated`, listener de `onAuthStateChange` no root.
3. Tokens do brand em `src/styles.css` (cores, Fraunces e Inter Tight via Google Fonts), sidebar + header.
4. Fluxo de upload + parse + storage + página de diagnóstico.
5. `src/lib/mmm.server.ts` (matriz, Cholesky, Ridge, adstock, saturação, métricas) com testes manuais contra valores conhecidos.
6. Página `/model` para configurar e disparar `runMmm`.
7. Dashboard `/runs/$id` com todos os componentes da v3.
8. Histórico de runs.
9. Polimento: copy PT-BR sem vocabulário banido, animações `fade-up` e `chart-line-draw` da v3.
