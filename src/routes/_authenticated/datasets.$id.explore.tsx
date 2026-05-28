import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
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

import { getDataset } from "@/lib/mmm.functions";
import {
  describeDataset,
  interpretDataset,
  type DatasetInsights,
} from "@/lib/describe.functions";
import type { DatasetSummary } from "@/lib/describe.server";
import type { ColumnInfo } from "@/lib/parse";

export const Route = createFileRoute("/_authenticated/datasets/$id/explore")({
  head: ({ params }) => ({
    meta: [
      { title: "Exploração · Prisma" },
      { name: "description", content: "Leitura automática do dataset: série temporal, correlações, sazonalidade e qualidade de dados antes de rodar o modelo MMM." },
      { property: "og:title", content: "Exploração de dados no Prisma" },
      { property: "og:description", content: "Veja série temporal, correlações e sazonalidade do seu dataset antes de configurar o MMM." },
      { property: "og:url", content: `https://prisma.pereirasaraiva.com/datasets/${params.id}/explore` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ExplorePage,
});

const fmt = (n: number | undefined, d = 2) =>
  n === undefined || !Number.isFinite(n) ? "—" : new Intl.NumberFormat("pt-BR", { maximumFractionDigits: d }).format(n);
const pct = (n: number | undefined, d = 1) =>
  n === undefined || !Number.isFinite(n) ? "—" : `${(n * 100).toFixed(d)}%`;

function ExplorePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(getDataset);
  const describeFn = useServerFn(describeDataset);
  const interpretFn = useServerFn(interpretDataset);

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
    mutationFn: () => interpretFn({ data: { datasetId: id, focusVariable: activeFocus || null, force: true } }),
    onSuccess: (r) => {
      qc.setQueryData(["dataset-insights", id], r);
      toast.success("Análise atualizada.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao reanalisar."),
  });

  const summary = summaryQuery.data?.summary;
  const insights = insightsQuery.data?.insights;

  if (dsQuery.isLoading || !ds) {
    return <div className="p-12 text-sm text-brand-navy/60">Carregando dataset...</div>;
  }

  const goToModel = () => {
    const dep = insights?.suggestedDependent || activeFocus;
    const indep = insights?.suggestedDrivers ?? [];
    navigate({
      to: "/datasets/$id",
      params: { id },
      search: {
        dep: dep || undefined,
        indep: indep.length ? indep.join(",") : undefined,
        date: summary?.overview.dateColumn ?? undefined,
      },
    });
  };

  return (
    <div className="p-12 max-w-7xl space-y-12">
      {/* Header */}
      <div>
        <p className="eyebrow">02 — Exploração</p>
        <h1 className="mt-2 font-display text-4xl font-light italic text-brand-navy">
          {ds.name}
        </h1>
        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-xs uppercase tracking-widest text-brand-navy/60">
          <span>{ds.n_rows} linhas</span>
          <span>{ds.n_cols} colunas</span>
          {ds.granularity && <span>{ds.granularity}</span>}
          {ds.period_start && ds.period_end && (
            <span>
              {ds.period_start} → {ds.period_end}
            </span>
          )}
        </div>
      </div>

      {/* Focus selector */}
      <div className="flex items-end justify-between gap-6 border-b hairline pb-4">
        <div>
          <label htmlFor="focus-select" className="text-xs uppercase tracking-widest text-brand-gray">
            Variável de interesse
          </label>
          <select
            id="focus-select"
            value={activeFocus}
            onChange={(e) => setFocus(e.target.value)}
            className="mt-2 bg-transparent border-b hairline-strong text-2xl font-display text-brand-navy focus:outline-none pr-4"
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
          className="px-6 py-3 bg-brand-navy text-brand-creme text-sm uppercase tracking-widest hover:bg-brand-navy/90 transition"
        >
          Configurar modelo →
        </button>
      </div>

      {/* AI Summary */}
      <section className="border hairline-strong bg-white p-10">
        <div className="flex items-start justify-between gap-6">
          <p className="eyebrow">Leitura da IA</p>
          <button
            onClick={() => regen.mutate()}
            disabled={regen.isPending || insightsQuery.isLoading}
            className="text-xs uppercase tracking-widest text-brand-navy/70 hover:text-brand-navy disabled:opacity-50"
          >
            {regen.isPending ? "Analisando..." : "Reanalisar"}
          </button>
        </div>
        {insightsQuery.isLoading && !insights ? (
          <p className="mt-6 text-sm text-brand-navy/60">A IA está lendo seus dados...</p>
        ) : insights ? (
          <>
            <h2 className="mt-4 font-display text-3xl font-light italic text-brand-navy leading-tight">
              {insights.headline}
            </h2>
            <ul className="mt-8 space-y-3">
              {insights.keyFindings.map((f, i) => (
                <li key={i} className="flex gap-4 text-sm text-brand-navy leading-relaxed">
                  <span className="font-display text-brand-mustard">{String(i + 1).padStart(2, "0")}</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            {insights.dataQualityWarnings.length > 0 && (
              <div className="mt-8 border-t hairline pt-6">
                <p className="eyebrow text-brand-mustard">Alertas de qualidade</p>
                <ul className="mt-3 space-y-2 text-sm text-brand-navy/80">
                  {insights.dataQualityWarnings.map((w, i) => (
                    <li key={i}>· {w}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-8 border-t hairline pt-6 text-sm text-brand-navy/80">
              <span className="eyebrow text-brand-navy">Próximo passo</span>
              <p className="mt-2">{insights.nextStep}</p>
            </div>
          </>
        ) : (
          <p className="mt-6 text-sm text-brand-navy/60">
            {insightsQuery.error instanceof Error ? insightsQuery.error.message : "Não foi possível gerar a leitura."}
          </p>
        )}
      </section>

      {/* Time series */}
      {summary && summary.timeSeries.length > 0 && (
        <section>
          <p className="eyebrow">Série temporal · {activeFocus}</p>
          {summary.trend && (
            <p className="mt-2 text-sm text-brand-navy/70">
              Variação no período: <strong>{pct(summary.trend.pctChangeOverWindow)}</strong> · inclinação por período: {fmt(summary.trend.slopePerPeriod)}
            </p>
          )}
          <div className="mt-6 border hairline bg-white p-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summary.timeSeries}>
                <CartesianGrid strokeDasharray="2 4" stroke="#0a1f4420" />
                <XAxis dataKey="period" tick={{ fontSize: 10, fill: "#0a1f44" }} />
                <YAxis tick={{ fontSize: 10, fill: "#0a1f44" }} />
                <Tooltip contentStyle={{ background: "#fffdf7", border: "1px solid #0a1f4430", fontSize: 12 }} />
                <Line type="monotone" dataKey="value" stroke="#0a1f44" strokeWidth={1.5} dot={false} name={activeFocus} />
                <Line type="monotone" dataKey="movingAvg" stroke="#c89b3c" strokeWidth={1.5} dot={false} name="Média móvel 4p" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Correlations */}
      {summary && summary.correlations.length > 0 && (
        <section>
          <p className="eyebrow">Correlações com {activeFocus}</p>
          <p className="mt-2 text-sm text-brand-navy/70">
            Pearson · marinho indica relação positiva, mostarda indica relação negativa.
          </p>
          <div className="mt-6 border hairline bg-white p-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.correlations.slice(0, 10)} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#0a1f4420" />
                <XAxis type="number" domain={[-1, 1]} tick={{ fontSize: 10, fill: "#0a1f44" }} />
                <YAxis type="category" dataKey="variable" width={140} tick={{ fontSize: 11, fill: "#0a1f44" }} />
                <Tooltip
                  contentStyle={{ background: "#fffdf7", border: "1px solid #0a1f4430", fontSize: 12 }}
                  formatter={(v: number) => fmt(v, 3)}
                />
                <Bar dataKey="r">
                  {summary.correlations.slice(0, 10).map((c, i) => (
                    <Cell key={i} fill={c.r >= 0 ? "#0a1f44" : "#c89b3c"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
                <CartesianGrid strokeDasharray="2 4" stroke="#0a1f4420" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#0a1f44" }} />
                <YAxis tick={{ fontSize: 10, fill: "#0a1f44" }} />
                <Tooltip
                  contentStyle={{ background: "#fffdf7", border: "1px solid #0a1f4430", fontSize: 12 }}
                  formatter={(v: number) => fmt(v)}
                />
                <Bar dataKey="mean" fill="#0a1f44" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Columns table */}
      {summary && (
        <section>
          <p className="eyebrow">Qualidade e distribuição</p>
          <div className="mt-6 border hairline bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-widest text-brand-gray border-b hairline">
                <tr>
                  <th className="text-left p-3">Coluna</th>
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-right p-3">Média</th>
                  <th className="text-right p-3">Mediana</th>
                  <th className="text-right p-3">Min</th>
                  <th className="text-right p-3">Max</th>
                  <th className="text-right p-3">% nulos</th>
                  <th className="text-right p-3">% zeros</th>
                  <th className="text-right p-3">Outliers</th>
                </tr>
              </thead>
              <tbody>
                {summary.columns.map((c) => (
                  <tr key={c.name} className="border-b hairline last:border-0">
                    <td className="p-3 font-medium text-brand-navy">{c.name}</td>
                    <td className="p-3 text-brand-navy/70">{c.kind}</td>
                    <td className="p-3 text-right">{fmt(c.mean)}</td>
                    <td className="p-3 text-right">{fmt(c.median)}</td>
                    <td className="p-3 text-right">{fmt(c.min)}</td>
                    <td className="p-3 text-right">{fmt(c.max)}</td>
                    <td className="p-3 text-right">{pct(c.missingPct)}</td>
                    <td className="p-3 text-right">{pct(c.zeroPct)}</td>
                    <td className="p-3 text-right">{c.outliers ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Bottom CTA */}
      <div className="border-t hairline pt-8 flex justify-end">
        <button
          onClick={goToModel}
          className="px-8 py-4 bg-brand-navy text-brand-creme text-sm uppercase tracking-widest hover:bg-brand-navy/90 transition"
        >
          Configurar modelo MMM →
        </button>
      </div>
    </div>
  );
}
