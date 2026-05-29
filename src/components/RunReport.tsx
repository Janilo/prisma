import { useMemo, useState } from "react";
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

export type RunTotals = {
  variable: string;
  contribution: number;
  share: number;
  pValue: number;
  zStat: number;
  isMedia: boolean;
  spend: number;
  roi: number | null;
  curve?: { spend: number; contribution: number }[];
  contribLow?: number;
  contribHigh?: number;
  roiLow?: number | null;
  roiHigh?: number | null;
};



export type RunDecomp = Record<string, number | string> & {
  period: string;
  base: number;
  actual: number;
  predicted: number;
};

export type RunReportData = {
  id: string;
  name: string;
  dep_variable: string;
  metrics_json: {
    r2: number; mape: number; rmse: number; n: number; p: number;
    holdoutPeriods?: number;
    train?: { r2: number; mape: number; rmse: number; n: number } | null;
    holdout?: { n: number; r2: number; mape: number; rmse: number } | null;
  };
  contributions_json: RunTotals[];
  roi_json: RunTotals[];
  decomposition_json: RunDecomp[];
  predicted_json: { labels: string[]; actual: number[]; predicted: number[] };
  params_json: {
    alpha: number;
    adstockDecay: number;
    adstockDecays?: Record<string, number> | null;
    saturationAlpha: number;
    mediaVariables: string[];
  };
  created_at: string;
};

const SERIES_COLORS = ["#0F2940", "#4A1942", "#2E5D4F", "#C9A227", "#7B5BA8", "#3C8C7A", "#A05E2B", "#5B7A99"];

export function RunReport({ run, header }: { run: RunReportData; header?: React.ReactNode }) {
  const totals = run.contributions_json ?? [];
  const variables = useMemo(
    () => totals.filter((t) => t.variable !== "Base (sazonalidade + intercepto)"),
    [totals],
  );
  const variableNames = useMemo(() => variables.map((t) => t.variable), [variables]);
  const ranked = useMemo(
    () => [...totals].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)),
    [totals],
  );
  const rois = useMemo(
    () => (run.roi_json ?? []).filter((r) => r.roi !== null).sort((a, b) => (b.roi! - a.roi!)),
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

  const residuals = useMemo(() => {
    const { labels, actual, predicted } = run.predicted_json;
    const raw = actual.map((a, i) => a - predicted[i]);
    const mean = raw.reduce((s, v) => s + v, 0) / (raw.length || 1);
    const variance = raw.reduce((s, v) => s + (v - mean) ** 2, 0) / (raw.length > 1 ? raw.length - 1 : 1);
    const sd = Math.sqrt(variance) || 1;
    return labels.map((l, i) => {
      const r = raw[i];
      const z = (r - mean) / sd;
      return {
        period: l,
        residual: r,
        z,
        actual: actual[i],
        predicted: predicted[i],
        outlier: Math.abs(z) >= 2.5,
      };
    });
  }, [run.predicted_json]);

  const outliers = useMemo(() => residuals.filter((r) => r.outlier), [residuals]);

  const metrics = run.metrics_json;


  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };

  return (
    <div className="p-12 max-w-7xl print-root">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Resultado</p>
          <h1 className="mt-2 font-display text-4xl font-light italic text-brand-navy">{run.name}</h1>
          <p className="mt-3 text-xs text-brand-navy/60 font-mono">
            Alvo: {run.dep_variable} · α={run.params_json.alpha} · saturação={run.params_json.saturationAlpha} · {new Date(run.created_at).toLocaleString("pt-BR")}
          </p>
          {run.params_json.adstockDecays && Object.keys(run.params_json.adstockDecays).length > 0 ? (
            <p className="mt-1 text-xs text-brand-navy/60 font-mono">
              Adstock por canal: {Object.entries(run.params_json.adstockDecays).map(([k, v]) => `${k}=${v}`).join(" · ")}
            </p>
          ) : (
            <p className="mt-1 text-xs text-brand-navy/60 font-mono">
              Adstock (global): {run.params_json.adstockDecay}
            </p>
          )}
        </div>
        <button
          onClick={handlePrint}
          className="no-print shrink-0 text-xs uppercase tracking-widest border border-brand-navy/30 px-4 py-2 hover:bg-brand-navy hover:text-white transition-colors"
          title="Abre o diálogo de impressão — escolha 'Salvar como PDF'"
        >
          Exportar PDF
        </button>
      </div>

      {header ? <div className="mt-6 no-print">{header}</div> : null}


      <section className="mt-12 grid grid-cols-4 gap-px bg-brand-navy/10 border hairline">
        <Metric label="R² (in-sample)" value={(metrics.r2 * 100).toFixed(1) + "%"} hint="Variação explicada no conjunto de treino completo. Sozinho pode esconder overfit." />
        <Metric label="MAPE (in-sample)" value={(metrics.mape * 100).toFixed(1) + "%"} hint="Erro percentual médio no treino." />
        <Metric label="RMSE (in-sample)" value={fmt(metrics.rmse)} hint="Erro absoluto típico no treino." />
        <Metric label="n / p" value={`${metrics.n} / ${metrics.p}`} hint="Períodos observados / variáveis no modelo." />
      </section>

      {metrics.holdout && metrics.train ? (
        <section className="mt-6">
          <p className="eyebrow">Validação out-of-sample (últimos {metrics.holdout.n} períodos)</p>
          <p className="text-xs text-brand-navy/60 mt-2 mb-3 max-w-xl">
            Modelo treinado nos primeiros {metrics.train.n} períodos e avaliado nos últimos {metrics.holdout.n}, que ele nunca viu.
            Se as métricas caem muito, o R² in-sample é otimismo (overfit). Se ficam próximas, o modelo generaliza bem.
          </p>
          <div className="grid grid-cols-3 gap-px bg-brand-navy/10 border hairline">
            <Metric label="R² (holdout)" value={(metrics.holdout.r2 * 100).toFixed(1) + "%"} hint={`Treino: ${(metrics.train.r2 * 100).toFixed(1)}%`} />
            <Metric label="MAPE (holdout)" value={(metrics.holdout.mape * 100).toFixed(1) + "%"} hint={`Treino: ${(metrics.train.mape * 100).toFixed(1)}%`} />
            <Metric label="RMSE (holdout)" value={fmt(metrics.holdout.rmse)} hint={`Treino: ${fmt(metrics.train.rmse)}`} />
          </div>
        </section>
      ) : null}

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

      <section className="mt-16">
        <p className="eyebrow">Diagnóstico de resíduos</p>
        <h2 className="font-display text-2xl text-brand-navy mt-2">Onde o modelo errou feio</h2>
        <p className="text-xs text-brand-navy/60 mt-2 max-w-xl">
          Resíduo = Real − Predito. Padronizamos pelo desvio padrão (z-score). Períodos com
          |z| ≥ 2,5 são marcados como <strong>outliers</strong>: provavelmente um evento
          externo (promoção atípica, ruptura, feriado deslocado) que o modelo não enxerga.
          Investigue antes de confiar no ROI desses períodos.
        </p>
        <div className="mt-6 border hairline-strong bg-white p-4 h-72">
          <ResponsiveContainer>
            <LineChart data={residuals}>
              <CartesianGrid stroke="#0F294015" />
              <XAxis dataKey="period" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} />
              <Tooltip
                formatter={(v: number, name: string) => name === "z" ? v.toFixed(2) : fmt(v)}
                contentStyle={{ fontSize: 12, border: "1px solid #0F294020", borderRadius: 0 }}
              />
              <Line
                type="monotone"
                dataKey="residual"
                stroke="#0F2940"
                strokeWidth={1.5}
                name="Resíduo"
                dot={(props: { cx?: number; cy?: number; payload?: { outlier?: boolean; period?: string } }) => {
                  const { cx, cy, payload } = props;
                  if (!payload?.outlier || cx == null || cy == null) {
                    return <g key={payload?.period ?? `${cx}-${cy}`} />;
                  }
                  return <circle key={payload.period} cx={cx} cy={cy} r={4} fill="#C9A227" stroke="#0F2940" strokeWidth={1} />;
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {outliers.length === 0 ? (
          <p className="mt-4 text-xs text-brand-navy/60">
            Nenhum período com |z| ≥ 2,5. Resíduos parecem bem comportados.
          </p>
        ) : (
          <div className="mt-6">
            <p className="text-xs text-brand-navy/70 mb-3">
              <strong>{outliers.length}</strong> período{outliers.length > 1 ? "s" : ""} fora do esperado:
            </p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b hairline-strong">
                  <th className="text-left py-2 eyebrow">Período</th>
                  <th className="text-right py-2 eyebrow">Real</th>
                  <th className="text-right py-2 eyebrow">Predito</th>
                  <th className="text-right py-2 eyebrow">Resíduo</th>
                  <th className="text-right py-2 eyebrow">z-score</th>
                  <th className="text-left py-2 pl-4 eyebrow">Direção</th>
                </tr>
              </thead>
              <tbody>
                {outliers
                  .slice()
                  .sort((a, b) => Math.abs(b.z) - Math.abs(a.z))
                  .map((o) => (
                    <tr key={o.period} className="border-b hairline">
                      <td className="py-3 font-medium">{o.period}</td>
                      <td className="py-3 text-right font-mono text-xs">{fmt(o.actual)}</td>
                      <td className="py-3 text-right font-mono text-xs">{fmt(o.predicted)}</td>
                      <td className="py-3 text-right font-mono text-xs">{fmt(o.residual)}</td>
                      <td className="py-3 text-right font-mono text-xs">{o.z.toFixed(2)}</td>
                      <td className="py-3 pl-4 text-xs">
                        {o.z > 0 ? "Real acima do esperado" : "Real abaixo do esperado"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>


      <section className="mt-16">
        <p className="eyebrow">Ranking de drivers</p>
        <h2 className="font-display text-2xl text-brand-navy mt-2">Quem mais explica {run.dep_variable}</h2>
        <table className="mt-6 w-full text-sm border-collapse">
          <thead>
            <tr className="border-b hairline-strong">
              <th className="text-left py-2 eyebrow">Variável</th>
              <th className="text-right py-2 eyebrow">Contribuição (IC 90%)</th>

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
                  <td className="py-3 text-right font-mono text-xs">
                    {fmt(t.contribution)}
                    {t.contribLow != null && t.contribHigh != null && !t.variable.startsWith("Base") && (
                      <div className="text-[10px] text-brand-navy/50 mt-0.5">
                        IC 90%: {fmt(t.contribLow)} — {fmt(t.contribHigh)}
                      </div>
                    )}
                  </td>

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
                    {r.roiLow != null && r.roiHigh != null && (
                      <div className="text-[10px] text-brand-navy/50 mt-0.5 font-mono">
                        IC 90%: {r.roiLow.toFixed(2)}× — {r.roiHigh.toFixed(2)}×
                      </div>
                    )}
                  </td>


                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <ResponseCurves channels={(run.contributions_json ?? []).filter((t) => t.isMedia && t.curve && t.curve.length > 0)} />

      {rois.length >= 2 && <BudgetSimulator rois={rois} depVariable={run.dep_variable} />}

    </div>
  );
}

function ResponseCurves({ channels }: { channels: RunTotals[] }) {
  if (channels.length === 0) return null;
  return (
    <section className="mt-16">
      <p className="eyebrow">Curva de resposta por canal</p>
      <h2 className="font-display text-2xl text-brand-navy mt-2">Quanto mais investir rende quanto?</h2>
      <p className="text-xs text-brand-navy/60 mt-2 max-w-2xl">
        Cada curva mostra a contribuição estimada do canal em função do total investido, mantendo
        adstock e saturação Hill do modelo. O ponto dourado marca o nível atual de gasto.
        A inclinação local é o <strong>ROI marginal</strong> — se a curva está achatando,
        cada real adicional rende menos (saturação); se ainda sobe forte, há espaço para investir mais.
      </p>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {channels.map((c, i) => {
          const color = SERIES_COLORS[i % SERIES_COLORS.length];
          const data = (c.curve ?? []).map((p) => ({
            spend: p.spend,
            Contribuição: p.contribution,
          }));
          return (
            <div key={c.variable} className="border hairline-strong bg-white p-4">
              <p className="eyebrow">{c.variable}</p>
              <p className="text-xs text-brand-navy/60 mt-1 font-mono">
                Hoje: {fmt(c.spend)} → {fmt(c.contribution)} · ROI {c.roi != null ? c.roi.toFixed(2) + "×" : "—"}
              </p>
              <div className="h-56 mt-3">
                <ResponsiveContainer>
                  <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="#0F294015" />
                    <XAxis
                      dataKey="spend"
                      type="number"
                      domain={[0, "dataMax"]}
                      tick={{ fontSize: 10 }}
                      tickFormatter={fmt}
                    />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} />
                    <Tooltip
                      formatter={(v: number) => fmt(v)}
                      labelFormatter={(v: number) => `Investimento: ${fmt(v)}`}
                      contentStyle={{ fontSize: 12, border: "1px solid #0F294020", borderRadius: 0 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Contribuição"
                      stroke={color}
                      strokeWidth={2}
                      dot={(props: { cx?: number; cy?: number; payload?: { spend: number } }) => {
                        const { cx, cy, payload } = props;
                        if (cx == null || cy == null || !payload) return <g key={`${cx}-${cy}`} />;
                        const isCurrent = Math.abs(payload.spend - c.spend) < c.spend * 0.06;
                        if (!isCurrent) return <g key={payload.spend} />;
                        return <circle key={payload.spend} cx={cx} cy={cy} r={5} fill="#C9A227" stroke="#0F2940" strokeWidth={1.5} />;
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[11px] text-brand-navy/60 max-w-3xl">
        Eixo X até 1,5× o gasto histórico do canal. A curva é uma <em>extrapolação</em> da forma
        funcional do modelo (adstock geométrico + Hill); fora do intervalo observado a incerteza
        cresce muito. Use como guia direcional, não como previsão exata.
      </p>
    </section>
  );
}


function BudgetSimulator({ rois, depVariable }: { rois: RunTotals[]; depVariable: string }) {
  const [deltas, setDeltas] = useState<Record<string, number>>({});
  const totalSpend = useMemo(() => rois.reduce((a, r) => a + r.spend, 0), [rois]);
  const totalContribution = useMemo(() => rois.reduce((a, r) => a + r.contribution, 0), [rois]);

  const sim = useMemo(() => {
    let newSpend = 0;
    let newContribution = 0;
    const rows = rois.map((r) => {
      const pct = deltas[r.variable] ?? 0;
      const ns = Math.max(0, r.spend * (1 + pct / 100));
      const nc = (r.roi ?? 0) * ns;
      newSpend += ns;
      newContribution += nc;
      return { ...r, pct, newSpend: ns, newContribution: nc, deltaContribution: nc - r.contribution };
    });
    return {
      rows,
      newSpend,
      newContribution,
      deltaContribution: newContribution - totalContribution,
      deltaSpend: newSpend - totalSpend,
    };
  }, [rois, deltas, totalSpend, totalContribution]);

  const reset = () => setDeltas({});

  return (
    <section className="mt-16">
      <p className="eyebrow">Simulador de realocação</p>
      <h2 className="font-display text-2xl text-brand-navy mt-2">E se eu mover budget entre canais?</h2>
      <p className="text-xs text-brand-navy/60 mt-2 max-w-2xl">
        Ajuste o gasto de cada canal em ±% para estimar o impacto em <strong>{depVariable}</strong>.
        A estimativa multiplica o novo gasto pelo ROI médio observado do canal.
      </p>

      <div className="mt-6 border hairline-strong bg-white">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b hairline-strong bg-brand-creme">
              <th className="text-left py-2 px-3 eyebrow">Canal</th>
              <th className="text-right py-2 px-3 eyebrow">Atual</th>
              <th className="text-center py-2 px-3 eyebrow w-72">Ajuste</th>
              <th className="text-right py-2 px-3 eyebrow">Novo gasto</th>
              <th className="text-right py-2 px-3 eyebrow">Δ contribuição</th>
            </tr>
          </thead>
          <tbody>
            {sim.rows.map((r) => (
              <tr key={r.variable} className="border-b hairline">
                <td className="py-3 px-3 font-medium">
                  {r.variable}
                  <span className="ml-2 font-mono text-[10px] text-brand-gray">
                    ROI {r.roi!.toFixed(2)}×
                  </span>
                </td>
                <td className="py-3 px-3 text-right font-mono text-xs">{fmt(r.spend)}</td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      step={5}
                      value={r.pct}
                      onChange={(e) =>
                        setDeltas((d) => ({ ...d, [r.variable]: parseFloat(e.target.value) }))
                      }
                      className="flex-1 accent-brand-purple"
                    />
                    <span
                      className={`font-mono text-xs w-14 text-right ${
                        r.pct > 0 ? "text-brand-purple" : r.pct < 0 ? "text-brand-navy/60" : ""
                      }`}
                    >
                      {r.pct > 0 ? "+" : ""}
                      {r.pct.toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="py-3 px-3 text-right font-mono text-xs">{fmt(r.newSpend)}</td>
                <td
                  className={`py-3 px-3 text-right font-mono text-xs ${
                    r.deltaContribution > 0
                      ? "text-emerald-700"
                      : r.deltaContribution < 0
                      ? "text-red-700"
                      : ""
                  }`}
                >
                  {r.deltaContribution > 0 ? "+" : ""}
                  {fmt(r.deltaContribution)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-brand-navy/30 bg-brand-creme">
              <td className="py-3 px-3 eyebrow">Total</td>
              <td className="py-3 px-3 text-right font-mono text-xs">{fmt(totalSpend)}</td>
              <td className="py-3 px-3 text-right font-mono text-xs">
                Δ gasto:{" "}
                <span className={sim.deltaSpend > 0 ? "text-brand-purple" : sim.deltaSpend < 0 ? "text-brand-navy/60" : ""}>
                  {sim.deltaSpend > 0 ? "+" : ""}
                  {fmt(sim.deltaSpend)}
                </span>
              </td>
              <td className="py-3 px-3 text-right font-mono text-xs">{fmt(sim.newSpend)}</td>
              <td
                className={`py-3 px-3 text-right font-display text-xl ${
                  sim.deltaContribution > 0
                    ? "text-emerald-700"
                    : sim.deltaContribution < 0
                    ? "text-red-700"
                    : "text-brand-navy"
                }`}
              >
                {sim.deltaContribution > 0 ? "+" : ""}
                {fmt(sim.deltaContribution)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={reset}
          className="text-xs uppercase tracking-widest text-brand-navy/60 hover:text-brand-navy"
        >
          Zerar ajustes
        </button>
        <p className="text-[11px] text-brand-navy/60 max-w-xl text-right">
          <strong className="text-brand-navy">Aviso.</strong> O modelo aplicou saturação de Hill no ajuste,
          então o ROI marginal cai conforme o canal cresce. Esta simulação usa ROI <em>médio</em> —
          é confiável para realocações pequenas (±15–25%) e otimista para aumentos grandes em um único canal.
        </p>
      </div>
    </section>
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
