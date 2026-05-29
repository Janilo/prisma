import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart,
  Legend,
} from "recharts";

import { getDemoRun } from "@/lib/demo.functions";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Demo · Prisma" },
      {
        name: "description",
        content:
          "Veja o Prisma rodando com um dataset de exemplo: 50 semanas, 3 canais (Google, Meta, TV). Sem cadastro.",
      },
      { property: "og:title", content: "Prisma · Demo ao vivo" },
      {
        property: "og:description",
        content: "Dataset de exemplo já carregado: rode o MMM e veja contribuição, ROI e decomposição.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DemoPage,
});

import { CHANNEL_COLORS, BASELINE, CHART_GRID } from "@/lib/prisma-tokens";

const SERIES_COLORS = CHANNEL_COLORS.slice(0, 5);
const SAT_AMBER = CHANNEL_COLORS[4];

type Totals = {
  variable: string;
  contribution: number;
  share: number;
  pValue: number;
  zStat: number;
  isMedia: boolean;
  spend: number;
  roi: number | null;
};

function DemoPage() {
  const fn = useServerFn(getDemoRun);
  const { data } = useSuspenseQuery(
    queryOptions({ queryKey: ["demo-run"], queryFn: () => fn() }),
  );
  const run = data.run;

  const totals = run.contributions_json as Totals[];
  const variableNames = useMemo(
    () =>
      totals
        .filter((t) => t.variable !== "Base (sazonalidade + intercepto)")
        .map((t) => t.variable),
    [totals],
  );
  const ranked = useMemo(
    () => [...totals].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)),
    [totals],
  );
  const rois = useMemo(
    () =>
      (run.roi_json as Totals[])
        .filter((r) => r.roi !== null)
        .sort((a, b) => (b.roi! - a.roi!)),
    [run.roi_json],
  );

  const predData = useMemo(
    () =>
      run.predicted_json.labels.map((l, i) => ({
        period: l,
        Real: run.predicted_json.actual[i],
        Predito: run.predicted_json.predicted[i],
      })),
    [run.predicted_json],
  );

  const metrics = run.metrics_json;

  return (
    <div className="min-h-screen bg-brand-offwhite flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Demo banner */}
        <div className="border-b hairline bg-brand-mustard/10">
          <div className="mx-auto max-w-7xl px-6 lg:px-10 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 text-brand-navy">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-navy/60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-navy" />
              </span>
              <span className="font-mono uppercase tracking-wider">Demo-ready</span>
              <span className="text-brand-navy/60 hidden sm:inline">· dataset de exemplo: 50 semanas de receita + 3 canais (Google, Meta, TV)</span>
            </div>
            <Link
              to="/login"
              search={{ mode: "signup" }}
              className="rounded-sm border border-brand-navy/40 bg-transparent px-2.5 py-1 font-medium text-brand-navy hover:bg-brand-navy hover:text-brand-creme transition-colors"
            >
              Rodar com meus dados →
            </Link>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 lg:px-10 py-12">
          <p className="eyebrow">Resultado da Demo</p>
          <h1 className="mt-2 font-display text-4xl font-light italic text-brand-navy">
            {run.name}
          </h1>
          <p className="mt-3 text-xs text-brand-navy/60 font-mono">
            Alvo: {run.dep_variable} · α={run.params_json.alpha} · adstock=
            {run.params_json.adstockDecay} · saturação={run.params_json.saturationAlpha}
          </p>

          <section className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-px bg-brand-navy/10 border hairline">
            <Metric label="R²" value={(metrics.r2 * 100).toFixed(1) + "%"} hint="Quanto da variação foi explicada." />
            <Metric label="MAPE" value={(metrics.mape * 100).toFixed(1) + "%"} hint="Erro percentual médio." />
            <Metric label="RMSE" value={fmt(metrics.rmse)} hint="Erro absoluto típico." />
            <Metric label="n / p" value={`${metrics.n} / ${metrics.p}`} hint="Períodos / variáveis." />
          </section>

          <section className="mt-16">
            <p className="eyebrow">Decomposição no tempo</p>
            <h2 className="font-display text-2xl text-brand-navy mt-2">
              De onde vieram as vendas, semana a semana
            </h2>
            <div className="mt-6 border hairline-strong bg-white p-4 h-96">
              <ResponsiveContainer>
                <AreaChart data={run.decomposition_json}>
                  <CartesianGrid stroke={CHART_GRID} />
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 12, border: `1px solid ${CHART_GRID}`, borderRadius: 0 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="base" stackId="1" stroke={BASELINE} fill={BASELINE} name="Base" fillOpacity={0.5} />
                  {variableNames.map((name, i) => (
                    <Area key={name} type="monotone" dataKey={name} stackId="1" stroke={SERIES_COLORS[i % SERIES_COLORS.length]} fill={SERIES_COLORS[i % SERIES_COLORS.length]} fillOpacity={0.7} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="mt-16">
            <p className="eyebrow">Real vs predito</p>
            <h2 className="font-display text-2xl text-brand-navy mt-2">
              O modelo acompanha a realidade?
            </h2>
            <div className="mt-6 border hairline-strong bg-white p-4 h-80">
              <ResponsiveContainer>
                <LineChart data={predData}>
                  <CartesianGrid stroke={CHART_GRID} />
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 12, border: `1px solid ${CHART_GRID}`, borderRadius: 0 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="Real" stroke={CHANNEL_COLORS[0]} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Predito" stroke={SAT_AMBER} strokeWidth={2} strokeDasharray="4 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="mt-16">
            <p className="eyebrow">Ranking de drivers</p>
            <h2 className="font-display text-2xl text-brand-navy mt-2">
              Quem mais explica {run.dep_variable}
            </h2>
            <div className="overflow-x-auto">
              <table className="mt-6 w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b hairline-strong">
                    <th className="text-left py-2 eyebrow">Variável</th>
                    <th className="text-right py-2 eyebrow">Contribuição</th>
                    <th className="text-right py-2 eyebrow">Participação</th>
                    <th className="text-right py-2 eyebrow">p</th>
                    <th className="text-left py-2 pl-4 eyebrow">Confiança</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((t) => {
                    const conf = pConfidence(t.pValue, t.variable);
                    const w = Math.min(100, Math.abs(t.share) * 100);
                    return (
                      <tr key={t.variable} className="border-b hairline">
                        <td className="py-3 font-medium">
                          {t.variable}
                          {t.isMedia && (
                            <span className="ml-2 text-[10px] uppercase tracking-widest text-brand-mustard">
                              mídia
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right font-mono text-xs">{fmt(t.contribution)}</td>
                        <td className="py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <div className="w-24 h-1 bg-brand-navy/10 relative">
                              <div className="absolute inset-y-0 left-0 bg-brand-navy" style={{ width: `${w}%` }} />
                            </div>
                            <span className="font-mono text-xs">{(t.share * 100).toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="py-3 text-right font-mono text-xs">
                          {t.variable.startsWith("Base") ? "—" : t.pValue.toFixed(3)}
                        </td>
                        <td className="py-3 pl-4 text-xs">{conf}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-[11px] text-brand-navy/60 leading-relaxed max-w-3xl">
              <strong className="text-brand-navy">Nota metodológica.</strong> Os p-values são
              <em> aproximações</em>. O Ridge encolhe coeficientes em direção a zero, o que
              enviesa a inferência clássica: usamos a variância residual com a matriz
              (X′X + αI)⁻¹, prática comum mas que <em>subestima</em> a incerteza real. Trate
              as estrelas como <em>ranking de robustez</em>, não como teste formal. Para
              inferência rigorosa, rode com <strong>α = 0</strong> (OLS puro) — aí os
              p-values são válidos no sentido clássico.
            </p>
          </section>


          {rois.length > 0 && (
            <section className="mt-16">
              <p className="eyebrow">ROI por canal de mídia</p>
              <h2 className="font-display text-2xl text-brand-navy mt-2">
                Cada R$ investido virou quanto?
              </h2>
              <div className="overflow-x-auto">
                <table className="mt-6 w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b hairline-strong">
                      <th className="text-left py-2 eyebrow">Canal</th>
                      <th className="text-right py-2 eyebrow">Investido</th>
                      <th className="text-right py-2 eyebrow">Gerou</th>
                      <th className="text-right py-2 eyebrow">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rois.map((r) => (
                      <tr key={r.variable} className="border-b hairline">
                        <td className="py-3 font-medium">{r.variable}</td>
                        <td className="py-3 text-right font-mono text-xs">{fmt(r.spend)}</td>
                        <td className="py-3 text-right font-mono text-xs">{fmt(r.contribution)}</td>
                        <td className="py-3 text-right">
                          <span className="font-display text-xl text-brand-navy">
                            {r.roi!.toFixed(2)}×
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="mt-20 border-t hairline pt-10 flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="eyebrow">Gostou do que viu?</p>
              <p className="mt-2 font-display text-2xl text-brand-navy">
                Suba sua própria planilha e rode em minutos.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/login"
                search={{ mode: "signup" }}
                className="inline-flex items-center bg-brand-navy text-white px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-brand-purple"
              >
                Rodar com meus dados
              </Link>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bg-brand-creme p-6">
      <p className="eyebrow">{label}</p>
      <p className="font-display text-4xl text-brand-navy mt-2">{value}</p>
      <p className="text-[11px] text-brand-navy/60 mt-2 leading-snug">{hint}</p>
    </div>
  );
}

function pConfidence(p: number, name: string): string {
  if (name.startsWith("Base")) return "—";
  if (p < 0.01) return "Muito alta (★★★)";
  if (p < 0.05) return "Alta (★★)";
  if (p < 0.1) return "Moderada (★)";
  return "Baixa";
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return n.toFixed(1);
}
