import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { userMessageFrom } from "@/lib/errors";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getDataset, updateUnitCosts } from "@/lib/mmm.functions";
import { computeUnitCosts } from "@/lib/describe.functions";

import { describeDataset, interpretDataset, type DatasetInsights } from "@/lib/describe.functions";
import type { DatasetSummary } from "@/lib/describe.server";
import type { ColumnInfo } from "@/lib/parse";

export const Route = createFileRoute("/_authenticated/datasets/$id/explore")({
  head: ({ params }) => ({
    meta: [
      { title: "Análise descritiva · Prisma" },
      {
        name: "description",
        content:
          "Diagnóstico do dataset: série temporal, correlações, sazonalidade e qualidade de dados antes de rodar o modelo MMM.",
      },
      { property: "og:title", content: "Análise descritiva no Prisma" },
      {
        property: "og:description",
        content:
          "Veja diagnóstico das colunas, série temporal, correlações e sazonalidade do seu dataset.",
      },
      {
        property: "og:url",
        content: `https://prisma.pereirasaraiva.com/datasets/${params.id}/explore`,
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ExplorePage,
});

const fmt = (n: number | undefined, d = 2) =>
  n === undefined || !Number.isFinite(n)
    ? "—"
    : new Intl.NumberFormat("pt-BR", { maximumFractionDigits: d }).format(n);
const pct = (n: number | undefined, d = 1) =>
  n === undefined || !Number.isFinite(n) ? "—" : `${(n * 100).toFixed(d)}%`;

function inferUnit(name: string): string {
  const n = name.toLowerCase();
  if (
    /(r\$|brl|reais|gasto|spend|invest|revenue|receita|faturamento|preco|preço|cpm|cpc|cpa)/.test(n)
  )
    return "R$";
  if (/grp/.test(n)) return "GRP";
  if (/(impress|impressões|impressao)/.test(n)) return "impressões";
  if (/(click|clique)/.test(n)) return "cliques";
  if (/(view|visualiza)/.test(n)) return "views";
  if (/(temp|temperatura)/.test(n)) return "°C";
  if (/(email|disparo|envio|sms)/.test(n)) return "envios";
  if (/(unid|qtd|quantidade|vendas|volume|pedido)/.test(n)) return "unidades";
  if (/(%|pct|taxa|share|conversao|conversão)/.test(n)) return "%";
  if (/(dia|semana|mes|mês|periodo|período|data)/.test(n)) return "data";
  return "—";
}

function ExplorePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(getDataset);
  const describeFn = useServerFn(describeDataset);
  const interpretFn = useServerFn(interpretDataset);
  const cppFn = useServerFn(computeUnitCosts);
  const updateCostsFn = useServerFn(updateUnitCosts);

  const dsQuery = useQuery({
    queryKey: ["dataset", id],
    queryFn: () => getFn({ data: { id } }),
  });
  const ds = dsQuery.data?.dataset as
    | {
        id: string;
        name: string;
        columns_json: ColumnInfo[];
        granularity: string | null;
        period_start: string | null;
        period_end: string | null;
        n_rows: number;
        n_cols: number;
        summary_json: DatasetSummary | null;
        insights_json: DatasetInsights | null;
        unit_costs_json?: Record<string, string> | null;
      }
    | undefined;

  const numericCols = useMemo(
    () => (ds?.columns_json ?? []).filter((c) => c.kind === "number").map((c) => c.name),
    [ds],
  );
  const [focus, setFocus] = useState<string>("");
  const activeFocus = focus || numericCols[0] || "";

  const summaryQuery = useQuery({
    queryKey: ["dataset-summary", id, activeFocus],
    queryFn: () => describeFn({ data: { datasetId: id, focusVariable: activeFocus || null } }),
    enabled: Boolean(ds && activeFocus),
  });
  const insightsQuery = useQuery({
    queryKey: ["dataset-insights", id],
    queryFn: () => interpretFn({ data: { datasetId: id, focusVariable: activeFocus || null } }),
    enabled: Boolean(ds),
    staleTime: Infinity,
  });

  const regen = useMutation({
    mutationFn: () =>
      interpretFn({ data: { datasetId: id, focusVariable: activeFocus || null, force: true } }),
    onSuccess: (r) => {
      qc.setQueryData(["dataset-insights", id], r);
      toast.success("Análise atualizada.");
    },
    onError: (e) => toast.error(userMessageFrom(e) ?? "Falha ao reanalisar."),
  });

  const summary = summaryQuery.data?.summary;
  const insights = insightsQuery.data?.insights;

  const cppQuery = useQuery({
    queryKey: ["dataset-cpp", id, ds?.unit_costs_json],
    queryFn: () => cppFn({ data: { datasetId: id } }),
    enabled: Boolean(ds && ds.unit_costs_json && Object.keys(ds.unit_costs_json).length > 0),
  });

  const [newUnit, setNewUnit] = useState("");
  const [newCost, setNewCost] = useState("");
  const saveMappings = useMutation({
    mutationFn: (mappings: Record<string, string>) => updateCostsFn({ data: { id, mappings } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dataset", id] });
      qc.invalidateQueries({ queryKey: ["dataset-cpp", id] });
      toast.success("Mapeamento salvo.");
    },
    onError: (e) => toast.error(userMessageFrom(e) ?? "Falha ao salvar."),
  });
  const currentMappings = ds?.unit_costs_json ?? {};
  const removeMapping = (unit: string) => {
    const next = { ...currentMappings };
    delete next[unit];
    saveMappings.mutate(next);
  };
  const addMapping = () => {
    if (!newUnit || !newCost || newUnit === newCost) return;
    saveMappings.mutate({ ...currentMappings, [newUnit]: newCost });
    setNewUnit("");
    setNewCost("");
  };

  if (dsQuery.isLoading || !ds) {
    return <div className="mt-12 text-sm text-abyss/60">Carregando dataset...</div>;
  }

  const goToModel = () => {
    const dep = insights?.suggestedDependent || activeFocus;
    const indep = insights?.suggestedDrivers ?? [];
    navigate({
      to: "/datasets/$id/model",
      params: { id },
      search: {
        dep: dep || undefined,
        indep: indep.length ? indep.join(",") : undefined,
        date: summary?.overview.dateColumn ?? undefined,
      },
    });
  };

  return (
    <div className="space-y-12 pt-12">
      {/* Diagnostic table */}
      <section>
        <p className="eyebrow">Diagnóstico das colunas</p>
        <div className="mt-4 border hairline bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-widest text-mute border-b hairline">
              <tr>
                <th className="text-left p-3">Coluna</th>
                <th className="text-left p-3">Tipo</th>
                <th className="text-left p-3">Unidade</th>
                <th className="text-right p-3">Missings</th>
                <th className="text-right p-3">Únicos</th>
                <th className="text-right p-3">Min</th>
                <th className="text-right p-3">Média</th>
                <th className="text-right p-3">Max</th>
                <th className="text-right p-3">Outliers</th>
              </tr>
            </thead>
            <tbody>
              {(ds.columns_json ?? []).map((c) => (
                <tr key={c.name} className="border-b hairline last:border-0">
                  <td className="p-3 font-medium text-abyss">{c.name}</td>
                  <td className="p-3">
                    <span
                      className={
                        "text-[10px] uppercase tracking-widest px-2 py-0.5 border hairline-strong " +
                        (c.kind === "number"
                          ? "text-success"
                          : c.kind === "date"
                            ? "text-indigo"
                            : "text-mute")
                      }
                    >
                      {c.kind}
                    </span>
                  </td>
                  <td className="p-3 text-abyss/70 font-mono text-xs">
                    {c.kind === "date" ? "data" : c.kind === "number" ? inferUnit(c.name) : "—"}
                  </td>
                  <td className="p-3 text-right font-mono text-xs">{c.missing}</td>
                  <td className="p-3 text-right font-mono text-xs">{c.unique}</td>
                  <td className="p-3 text-right font-mono text-xs">
                    {c.min !== undefined ? fmt(c.min) : "—"}
                  </td>
                  <td className="p-3 text-right font-mono text-xs">
                    {c.mean !== undefined ? fmt(c.mean) : "—"}
                  </td>
                  <td className="p-3 text-right font-mono text-xs">
                    {c.max !== undefined ? fmt(c.max) : "—"}
                  </td>
                  <td className="p-3 text-right font-mono text-xs">{c.outliers ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Dynamic chart: select variable to visualize over the period */}
      <section>
        <div className="flex items-end justify-between gap-6 border-b hairline pb-4">
          <div>
            <label htmlFor="focus-select" className="text-xs uppercase tracking-widest text-mute">
              Variável para visualizar no período
            </label>
            <select
              id="focus-select"
              value={activeFocus}
              onChange={(e) => setFocus(e.target.value)}
              className="mt-2 bg-transparent border-b hairline-strong text-2xl font-semibold text-abyss focus:outline-none pr-4"
            >
              {numericCols.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={goToModel}
            className="px-6 py-3 bg-abyss text-indigo-soft text-sm uppercase tracking-widest hover:bg-abyss/90 transition"
          >
            Ir para Modelo →
          </button>
        </div>

        {summary && summary.timeSeries.length > 0 ? (
          <>
            {summary.trend && (
              <p className="mt-4 text-sm text-abyss/70">
                Variação no período: <strong>{pct(summary.trend.pctChangeOverWindow)}</strong> ·
                inclinação por período: {fmt(summary.trend.slopePerPeriod)}
              </p>
            )}
            <div className="mt-6 border hairline bg-white p-6 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={summary.timeSeries}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#D7D4E2" />
                  <XAxis dataKey="period" tick={{ fontSize: 10, fill: "#6B4FE0" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#6B4FE0" }} />
                  <Tooltip
                    contentStyle={{
                      background: "#FFFFFF",
                      border: "1px solid #D7D4E2",
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#6B4FE0"
                    strokeWidth={1.5}
                    dot={false}
                    name={activeFocus}
                  />
                  <Line
                    type="monotone"
                    dataKey="movingAvg"
                    stroke="#E0A21E"
                    strokeWidth={1.5}
                    dot={false}
                    name="Média móvel 4p"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <p className="mt-6 text-sm text-abyss/60">
            {summaryQuery.isLoading ? "Calculando série..." : "Sem série temporal disponível."}
          </p>
        )}
      </section>

      {/* AI Summary */}
      <section className="border hairline-strong bg-white p-10">
        <div className="flex items-start justify-between gap-6">
          <p className="eyebrow">Leitura da IA</p>
          <button
            onClick={() => regen.mutate()}
            disabled={regen.isPending || insightsQuery.isLoading}
            className="text-xs uppercase tracking-widest text-abyss/70 hover:text-abyss disabled:opacity-50"
          >
            {regen.isPending ? "Analisando..." : "Reanalisar"}
          </button>
        </div>
        {insightsQuery.isLoading && !insights ? (
          <p className="mt-6 text-sm text-abyss/60">A IA está lendo seus dados...</p>
        ) : insights ? (
          <>
            <h2 className="mt-4 text-xl font-semibold tracking-tight text-abyss leading-tight">
              {insights.headline}
            </h2>
            <ul className="mt-8 space-y-3">
              {insights.keyFindings.map((f, i) => (
                <li key={i} className="flex gap-4 text-sm text-abyss leading-relaxed">
                  <span className="font-mono font-bold text-violet">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            {insights.dataQualityWarnings.length > 0 && (
              <div className="mt-8 border-t hairline pt-6">
                <p className="eyebrow text-violet">Alertas de qualidade</p>
                <ul className="mt-3 space-y-2 text-sm text-abyss/80">
                  {insights.dataQualityWarnings.map((w, i) => (
                    <li key={i}>· {w}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-8 border-t hairline pt-6 text-sm text-abyss/80">
              <span className="eyebrow text-abyss">Próximo passo</span>
              <p className="mt-2">{insights.nextStep}</p>
            </div>
          </>
        ) : (
          <p className="mt-6 text-sm text-abyss/60">
            {userMessageFrom(insightsQuery.error) ?? "Não foi possível gerar a leitura."}
          </p>
        )}
      </section>

      {/* Cost per execution unit (CPP) */}
      <section>
        <p className="eyebrow">Custo por unidade de execução</p>
        <p className="mt-2 text-sm text-abyss/70 max-w-2xl">
          Quando um canal está em unidades de execução (GRP, impressões, cliques), aponte qual
          coluna carrega o investimento (R$). O custo por unidade (CPP) entra na análise
          exploratória e o ROI dos modelos passa a usar o investimento real.
        </p>

        <div className="mt-6 border hairline bg-white p-4 space-y-3">
          {Object.entries(currentMappings).length === 0 && (
            <p className="text-xs text-abyss/60">Nenhum mapeamento configurado.</p>
          )}
          {Object.entries(currentMappings).map(([unit, cost]) => (
            <div key={unit} className="flex items-center gap-3 text-sm">
              <span className="font-mono">{unit}</span>
              <span className="text-mute text-xs">→</span>
              <span className="font-mono">{cost}</span>
              <button
                onClick={() => removeMapping(unit)}
                className="ml-auto text-[10px] uppercase tracking-widest text-abyss/60 hover:text-abyss"
              >
                Remover
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-3 border-t hairline">
            <select
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              className="flex-1 border border-abyss/20 bg-white px-2 py-1 text-xs"
            >
              <option value="">— coluna em unidades de execução —</option>
              {numericCols
                .filter((n) => !currentMappings[n])
                .map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
            </select>
            <span className="text-mute text-xs">→</span>
            <select
              value={newCost}
              onChange={(e) => setNewCost(e.target.value)}
              className="flex-1 border border-abyss/20 bg-white px-2 py-1 text-xs"
            >
              <option value="">— coluna de investimento (R$) —</option>
              {numericCols
                .filter((n) => n !== newUnit)
                .map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
            </select>
            <button
              onClick={addMapping}
              disabled={!newUnit || !newCost || saveMappings.isPending}
              className="px-3 py-1 text-[10px] uppercase tracking-widest bg-abyss text-white disabled:opacity-40"
            >
              Adicionar
            </button>
          </div>
        </div>

        {cppQuery.data && cppQuery.data.series.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {cppQuery.data.series.map((s) => (
              <div key={s.unitColumn} className="border hairline bg-white p-4">
                <p className="eyebrow">CPP · {s.unitColumn}</p>
                <p className="text-xs text-abyss/60 mt-1 font-mono">
                  Base: {s.costColumn} · médio {fmt(s.mean)} · min {fmt(s.min)} · max {fmt(s.max)}
                </p>
                <div className="h-56 mt-3">
                  <ResponsiveContainer>
                    <LineChart data={s.points}>
                      <CartesianGrid strokeDasharray="2 4" stroke="#D7D4E2" />
                      <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          background: "#FFFFFF",
                          border: "1px solid #D7D4E2",
                          fontSize: 12,
                        }}
                        formatter={(v: number) => fmt(v)}
                      />
                      <Line
                        type="monotone"
                        dataKey="cpp"
                        stroke="#6B4FE0"
                        strokeWidth={1.5}
                        dot={false}
                        name="CPP"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Correlations */}

      {summary && summary.correlations.length > 0 && (
        <section>
          <p className="eyebrow">Correlações com {activeFocus}</p>
          <p className="mt-2 text-sm text-abyss/70">
            Pearson · marinho indica relação positiva, mostarda indica relação negativa.
          </p>
          <div className="mt-6 border hairline bg-white p-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={summary.correlations.slice(0, 10)}
                layout="vertical"
                margin={{ left: 80 }}
              >
                <CartesianGrid strokeDasharray="2 4" stroke="#D7D4E2" />
                <XAxis type="number" domain={[-1, 1]} tick={{ fontSize: 10, fill: "#6B4FE0" }} />
                <YAxis
                  type="category"
                  dataKey="variable"
                  width={140}
                  tick={{ fontSize: 11, fill: "#6B4FE0" }}
                />
                <Tooltip
                  contentStyle={{
                    background: "#FFFFFF",
                    border: "1px solid #D7D4E2",
                    fontSize: 12,
                  }}
                  formatter={(v: number) => fmt(v, 3)}
                />
                <Bar dataKey="r">
                  {summary.correlations.slice(0, 10).map((c, i) => (
                    <Cell key={i} fill={c.r >= 0 ? "#6B4FE0" : "#E0A21E"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* VIF - multicollinearity between independent variables */}
      {summary && summary.vif && summary.vif.length >= 2 && (
        <section>
          <p className="eyebrow">Colinearidade entre variáveis (VIF)</p>
          <p className="mt-2 text-sm text-abyss/70 max-w-3xl">
            VIF mede o quanto cada variável é explicada pelas <em>outras</em> variáveis
            independentes. Quando duas variáveis se movem juntas (ex.: Google e Meta crescem na
            mesma campanha), o modelo tem dificuldade de atribuir crédito separadamente e os
            coeficientes individuais ficam instáveis. <strong>VIF &lt; 5</strong> é saudável,{" "}
            <strong>5–10</strong> pede atenção,
            <strong> &gt; 10</strong> indica colinearidade severa — considere remover uma das
            variáveis, combiná-las, ou aumentar a regularização (α) no modelo.
          </p>
          <div className="mt-6 border hairline bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-widest text-mute border-b hairline">
                <tr>
                  <th className="text-left p-3">Variável</th>
                  <th className="text-right p-3">VIF</th>
                  <th className="text-left p-3 pl-6">Diagnóstico</th>
                </tr>
              </thead>
              <tbody>
                {[...summary.vif]
                  .sort((a, b) => b.vif - a.vif)
                  .map((v) => {
                    const color =
                      v.severity === "high"
                        ? "text-violet"
                        : v.severity === "moderate"
                          ? "text-indigo"
                          : "text-success";
                    const label =
                      v.severity === "high"
                        ? "Colinearidade severa · atribuição instável"
                        : v.severity === "moderate"
                          ? "Colinearidade moderada · interpretar com cautela"
                          : "Independente o suficiente";
                    return (
                      <tr key={v.variable} className="border-b hairline last:border-0">
                        <td className="p-3 font-medium text-abyss">{v.variable}</td>
                        <td className="p-3 text-right font-mono text-xs">
                          {v.vif >= 999 ? "∞" : v.vif.toFixed(2)}
                        </td>
                        <td className={"p-3 pl-6 text-xs " + color}>{label}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Seasonality */}
      {summary && summary.seasonality.buckets.length > 1 && (
        <section>
          <p className="eyebrow">
            Sazonalidade {summary.seasonality.kind === "month" ? "mensal" : "semanal"}
          </p>
          <div className="mt-6 border hairline bg-white p-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.seasonality.buckets}>
                <CartesianGrid strokeDasharray="2 4" stroke="#D7D4E2" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6B4FE0" }} />
                <YAxis tick={{ fontSize: 10, fill: "#6B4FE0" }} />
                <Tooltip
                  contentStyle={{
                    background: "#FFFFFF",
                    border: "1px solid #D7D4E2",
                    fontSize: 12,
                  }}
                  formatter={(v: number) => fmt(v)}
                />
                <Bar dataKey="mean" fill="#6B4FE0" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Bottom CTA */}
      <div className="border-t hairline pt-8 flex justify-end">
        <button
          onClick={goToModel}
          className="px-8 py-4 bg-abyss text-indigo-soft text-sm uppercase tracking-widest hover:bg-abyss/90 transition"
        >
          Configurar modelo MMM →
        </button>
      </div>
    </div>
  );
}
