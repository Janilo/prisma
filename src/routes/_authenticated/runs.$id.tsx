import { createFileRoute } from "@tanstack/react-router";
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

import { getRun } from "@/lib/mmm.functions";

export const Route = createFileRoute("/_authenticated/runs/$id")({
  component: RunPage,
});

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

type Decomp = Record<string, number | string> & { period: string; base: number; actual: number; predicted: number };

const SERIES_COLORS = ["#0F2940", "#4A1942", "#2E5D4F", "#C9A227", "#7B5BA8", "#3C8C7A", "#A05E2B", "#5B7A99"];

function RunPage() {
  const { id } = Route.useParams();
  const fn = useServerFn(getRun);
  const { data } = useSuspenseQuery(
    queryOptions({ queryKey: ["run", id], queryFn: () => fn({ data: { id } }) }),
  );

  const run = data.run as unknown as {
    id: string;
    name: string;
    dep_variable: string;
    metrics_json: { r2: number; mape: number; rmse: number; n: number; p: number };
    contributions_json: Totals[];
    roi_json: Totals[];
    decomposition_json: Decomp[];
    predicted_json: { labels: string[]; actual: number[]; predicted: number[] };
    params_json: { alpha: number; adstockDecay: number; saturationAlpha: number; mediaVariables: string[] };
    created_at: string;
  };


  const totals = run.contributions_json ?? [];
  const variables = useMemo(() => totals.filter((t) => t.variable !== "Base (sazonalidade + intercepto)"), [totals]);
  const variableNames = useMemo(() => variables.map((t) => t.variable), [variables]);
  const ranked = useMemo(() => [...totals].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)), [totals]);
  const rois = useMemo(() => (run.roi_json ?? []).filter((r) => r.roi !== null).sort((a, b) => (b.roi! - a.roi!)), [run.roi_json]);

  const predData = useMemo(
    () => run.predicted_json.labels.map((l, i) => ({
      period: l,
      Real: run.predicted_json.actual[i],
      Predito: run.predicted_json.predicted[i],
    })),
    [run.predicted_json],
  );

  const metrics = run.metrics_json;

  return (
    <div className="p-12 max-w-7xl">
      <p className="eyebrow">Resultado</p>
      <h1 className="mt-2 font-display text-4xl font-light italic text-brand-navy">{run.name}</h1>
      <p className="mt-3 text-xs text-brand-navy/60 font-mono">
        Alvo: {run.dep_variable} · α={run.params_json.alpha} · adstock={run.params_json.adstockDecay} · saturação={run.params_json.saturationAlpha} · {new Date(run.created_at).toLocaleString("pt-BR")}
      </p>

      {/* Quality metrics */}
      <section className="mt-12 grid grid-cols-4 gap-px bg-brand-navy/10 border hairline">
        <Metric label="R²" value={(metrics.r2 * 100).toFixed(1) + "%"} hint="Quanto da variação foi explicada. Acima de 70% costuma ser bom." />
        <Metric label="MAPE" value={(metrics.mape * 100).toFixed(1) + "%"} hint="Erro percentual médio. Quanto menor, mais preciso. Abaixo de 15% é forte." />
        <Metric label="RMSE" value={fmt(metrics.rmse)} hint="Erro absoluto típico, na mesma unidade da variável." />
        <Metric label="n / p" value={`${metrics.n} / ${metrics.p}`} hint="Períodos observados / variáveis no modelo." />
      </section>

      {/* Decomposition over time */}
      <section className="mt-16">
        <p className="eyebrow">Decomposição no tempo</p>
        <h2 className="font-display text-2xl text-brand-navy mt-2">De onde vieram as vendas, semana a semana</h2>
        <p className="text-xs text-brand-navy/60 mt-2 max-w-xl">
          Cada faixa colorida é a contribuição de uma variável em cada período. Base = o que aconteceria
          sem nenhuma das variáveis explicativas (sazonalidade + tendência).
        </p>
        <div className="mt-6 border hairline-strong bg-white p-4 h-96">
          <ResponsiveContainer>
            <AreaChart data={run.decomposition_json}>
              <CartesianGrid stroke="#0F294015" />
              <XAxis dataKey="period" tick={{ fontSize: 10, fontFamily: "Inter Tight" }} />
              <YAxis tick={{ fontSize: 10, fontFamily: "Inter Tight" }} tickFormatter={fmt} />
              <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 12, fontFamily: "Inter Tight", border: "1px solid #0F294020", borderRadius: 0 }} />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: "Inter Tight" }} />
              <Area type="monotone" dataKey="base" stackId="1" stroke="#94908a" fill="#94908a" name="Base" fillOpacity={0.5} />
              {variableNames.map((name, i) => (
                <Area key={name} type="monotone" dataKey={name} stackId="1" stroke={SERIES_COLORS[i % SERIES_COLORS.length]} fill={SERIES_COLORS[i % SERIES_COLORS.length]} fillOpacity={0.7} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Actual vs predicted */}
      <section className="mt-16">
        <p className="eyebrow">Real vs predito</p>
        <h2 className="font-display text-2xl text-brand-navy mt-2">O modelo acompanha a realidade?</h2>
        <div className="mt-6 border hairline-strong bg-white p-4 h-80">
          <ResponsiveContainer>
            <LineChart data={predData}>
              <CartesianGrid stroke="#0F294015" />
              <XAxis dataKey="period" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} />
              <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 12, border: "1px solid #0F294020", borderRadius: 0 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Real" stroke="#0F2940" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Predito" stroke="#C9A227" strokeWidth={2} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Ranking */}
      <section className="mt-16">
        <p className="eyebrow">Ranking de drivers</p>
        <h2 className="font-display text-2xl text-brand-navy mt-2">Quem mais explica {run.dep_variable}</h2>
        <table className="mt-6 w-full text-sm border-collapse">
          <thead>
            <tr className="border-b hairline-strong">
              <th className="text-left py-2 eyebrow">Variável</th>
              <th className="text-right py-2 eyebrow">Contribuição</th>
              <th className="text-right py-2 eyebrow">Participação</th>
              <th className="text-right py-2 eyebrow">Significância (p)</th>
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
                    {t.isMedia && <span className="ml-2 text-[10px] uppercase tracking-widest text-brand-mustard">mídia</span>}
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
                  <td className="py-3 text-right font-mono text-xs">{t.variable.startsWith("Base") ? "—" : t.pValue.toFixed(3)}</td>
                  <td className="py-3 pl-4 text-xs">{conf}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-4 text-[11px] text-brand-navy/60 leading-relaxed max-w-3xl">
          <strong className="text-brand-navy">Nota metodológica.</strong> Os p-values acima
          são <em>aproximações</em>. O Ridge encolhe coeficientes em direção a zero, o que
          enviesa a inferência clássica: usamos a variância residual do ajuste com a matriz
          (X′X + αI)⁻¹, prática comum mas que <em>subestima</em> a incerteza real. Trate as
          estrelas como um <em>ranking de robustez</em>, não como teste de hipótese formal.
          Para inferência rigorosa, rode o modelo novamente com <strong>α = 0</strong> (OLS
          puro, sem regularização) — os p-values dessa rodada são válidos no sentido clássico.
        </p>
      </section>


      {/* ROI */}
      {rois.length > 0 && (
        <section className="mt-16">
          <p className="eyebrow">ROI por canal de mídia</p>
          <h2 className="font-display text-2xl text-brand-navy mt-2">Cada R$ investido virou quanto?</h2>
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
                    <span className="font-display text-xl text-brand-navy">{r.roi!.toFixed(2)}×</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
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
