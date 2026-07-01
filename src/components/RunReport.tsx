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
import {
  CHANNEL_COLORS,
  CHART_GRID,
  BASELINE,
  INDIGO,
  VIOLET,
  CHANNEL_COLORS as C,
} from "@/lib/prisma-tokens";
import {
  PrismaButton,
  PrismaCard,
  PrismaKpi,
  PrismaSection,
  PrismaTable,
  PrismaTh,
  PrismaTd,
  PrismaBadge,
} from "@/components/prisma";
import { fmt, pConfidence } from "@/lib/format";

const SAT_AMBER = "#E0A21E"; // = CHANNEL_COLORS[4]; alias for outlier highlight

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

const SERIES_COLORS = [...CHANNEL_COLORS, BASELINE, VIOLET];

const tooltipStyle = {
  fontSize: 12,
  fontFamily: "Inter Tight",
  border: `1px solid ${CHART_GRID}`,
  borderRadius: 2,
  background: "var(--prisma-white)",
  color: "var(--prisma-ink)",
};

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
    <div
      className="prisma p-12 max-w-7xl print-root"
      style={{ background: "var(--prisma-paper)", color: "var(--prisma-ink)" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className="text-[11px] font-semibold uppercase"
            style={{ letterSpacing: "0.18em", color: "var(--prisma-mute)" }}
          >
            Resultado
          </p>
          <h1
            className="mt-2 text-4xl font-semibold"
            style={{ color: "var(--prisma-ink)", letterSpacing: "-0.02em" }}
          >
            {run.name}
          </h1>
          <p className="mt-3 text-xs font-mono" style={{ color: "var(--prisma-mute)" }}>
            Alvo: {run.dep_variable} · α={run.params_json.alpha} · saturação={run.params_json.saturationAlpha} · {new Date(run.created_at).toLocaleString("pt-BR")}
          </p>
          {run.params_json.adstockDecays && Object.keys(run.params_json.adstockDecays).length > 0 ? (
            <p className="mt-1 text-xs font-mono" style={{ color: "var(--prisma-mute)" }}>
              Adstock por canal: {Object.entries(run.params_json.adstockDecays).map(([k, v]) => `${k}=${v}`).join(" · ")}
            </p>
          ) : (
            <p className="mt-1 text-xs font-mono" style={{ color: "var(--prisma-mute)" }}>
              Adstock (global): {run.params_json.adstockDecay}
            </p>
          )}
        </div>
        <PrismaButton
          variant="secondary"
          size="sm"
          onClick={handlePrint}
          className="no-print shrink-0"
          title="Abre o diálogo de impressão — escolha 'Salvar como PDF'"
        >
          Exportar PDF
        </PrismaButton>
      </div>

      {header ? <div className="mt-6 no-print">{header}</div> : null}

      <section className="mt-12 grid grid-cols-4 gap-3">
        <PrismaKpi
          label="R² (in-sample)"
          value={(metrics.r2 * 100).toFixed(1) + "%"}
          hint="Variação explicada no treino. Sozinho esconde overfit."
          accent="brand"
        />
        <PrismaKpi
          label="MAPE (in-sample)"
          value={(metrics.mape * 100).toFixed(1) + "%"}
          hint="Erro percentual médio no treino."
        />
        <PrismaKpi
          label="RMSE (in-sample)"
          value={fmt(metrics.rmse)}
          hint="Erro absoluto típico no treino."
        />
        <PrismaKpi
          label="n / p"
          value={`${metrics.n} / ${metrics.p}`}
          hint="Períodos observados / variáveis no modelo."
        />
      </section>

      {metrics.holdout && metrics.train ? (
        <PrismaSection
          eyebrow={`Validação out-of-sample (últimos ${metrics.holdout.n} períodos)`}
          title="O modelo generaliza?"
          description={`Treinado nos primeiros ${metrics.train.n} períodos e avaliado nos últimos ${metrics.holdout.n}, que ele nunca viu. Se as métricas caem muito, o R² in-sample é otimismo (overfit).`}
        >
          <div className="grid grid-cols-3 gap-3">
            <PrismaKpi
              label="R² (holdout)"
              value={(metrics.holdout.r2 * 100).toFixed(1) + "%"}
              hint={`Treino: ${(metrics.train.r2 * 100).toFixed(1)}%`}
              accent="lift"
            />
            <PrismaKpi
              label="MAPE (holdout)"
              value={(metrics.holdout.mape * 100).toFixed(1) + "%"}
              hint={`Treino: ${(metrics.train.mape * 100).toFixed(1)}%`}
            />
            <PrismaKpi
              label="RMSE (holdout)"
              value={fmt(metrics.holdout.rmse)}
              hint={`Treino: ${fmt(metrics.train.rmse)}`}
            />
          </div>
        </PrismaSection>
      ) : null}

      <PrismaSection
        eyebrow="Decomposição no tempo"
        title="De onde vieram as vendas, semana a semana"
        description="Cada faixa colorida é a contribuição de uma variável em cada período. Base = o que aconteceria sem nenhuma das variáveis explicativas (sazonalidade + tendência)."
      >
        <PrismaCard className="h-96">
          <ResponsiveContainer>
            <AreaChart data={run.decomposition_json}>
              <CartesianGrid stroke={CHART_GRID} />
              <XAxis dataKey="period" tick={{ fontSize: 10, fontFamily: "Inter Tight" }} />
              <YAxis tick={{ fontSize: 10, fontFamily: "Inter Tight" }} tickFormatter={fmt} />
              <Tooltip formatter={(v: number) => fmt(v)} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: "Inter Tight" }} />
              <Area type="monotone" dataKey="base" stackId="1" stroke={BASELINE} fill={BASELINE} name="Base" fillOpacity={0.5} />
              {variableNames.map((name, i) => (
                <Area key={name} type="monotone" dataKey={name} stackId="1" stroke={SERIES_COLORS[i % SERIES_COLORS.length]} fill={SERIES_COLORS[i % SERIES_COLORS.length]} fillOpacity={0.7} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </PrismaCard>
      </PrismaSection>

      <PrismaSection eyebrow="Real vs predito" title="O modelo acompanha a realidade?">
        <PrismaCard className="h-80">
          <ResponsiveContainer>
            <LineChart data={predData}>
              <CartesianGrid stroke={CHART_GRID} />
              <XAxis dataKey="period" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} />
              <Tooltip formatter={(v: number) => fmt(v)} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Real" stroke={C[0]} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Predito" stroke={SAT_AMBER} strokeWidth={2} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </PrismaCard>
      </PrismaSection>

      <PrismaSection
        eyebrow="Diagnóstico de resíduos"
        title="Onde o modelo errou feio"
        description="Resíduo = Real − Predito, padronizado pelo desvio padrão (z-score). |z| ≥ 2,5 = outlier: provavelmente um evento externo que o modelo não enxerga."
      >
        <PrismaCard className="h-72">
          <ResponsiveContainer>
            <LineChart data={residuals}>
              <CartesianGrid stroke={CHART_GRID} />
              <XAxis dataKey="period" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} />
              <Tooltip
                formatter={(v: number, name: string) => name === "z" ? v.toFixed(2) : fmt(v)}
                contentStyle={tooltipStyle}
              />
              <Line
                type="monotone"
                dataKey="residual"
                stroke={C[0]}
                strokeWidth={1.5}
                name="Resíduo"
                dot={(props: { cx?: number; cy?: number; payload?: { outlier?: boolean; period?: string } }) => {
                  const { cx, cy, payload } = props;
                  if (!payload?.outlier || cx == null || cy == null) {
                    return <g key={payload?.period ?? `${cx}-${cy}`} />;
                  }
                  return <circle key={payload.period} cx={cx} cy={cy} r={4} fill={SAT_AMBER} stroke={C[0]} strokeWidth={1} />;
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </PrismaCard>

        {outliers.length === 0 ? (
          <p className="mt-4 text-xs" style={{ color: "var(--prisma-mute)" }}>
            Nenhum período com |z| ≥ 2,5. Resíduos parecem bem comportados.
          </p>
        ) : (
          <div className="mt-6">
            <p className="text-xs mb-3" style={{ color: "var(--prisma-slate)" }}>
              <strong>{outliers.length}</strong> período{outliers.length > 1 ? "s" : ""} fora do esperado:
            </p>
            <PrismaTable>
              <thead>
                <tr>
                  <PrismaTh>Período</PrismaTh>
                  <PrismaTh num>Real</PrismaTh>
                  <PrismaTh num>Predito</PrismaTh>
                  <PrismaTh num>Resíduo</PrismaTh>
                  <PrismaTh num>z-score</PrismaTh>
                  <PrismaTh>Direção</PrismaTh>
                </tr>
              </thead>
              <tbody>
                {outliers
                  .slice()
                  .sort((a, b) => Math.abs(b.z) - Math.abs(a.z))
                  .map((o) => (
                    <tr key={o.period}>
                      <PrismaTd>{o.period}</PrismaTd>
                      <PrismaTd num>{fmt(o.actual)}</PrismaTd>
                      <PrismaTd num>{fmt(o.predicted)}</PrismaTd>
                      <PrismaTd num tone={o.residual >= 0 ? "pos" : "neg"}>{fmt(o.residual)}</PrismaTd>
                      <PrismaTd num>{o.z.toFixed(2)}</PrismaTd>
                      <PrismaTd>{o.z > 0 ? "Real acima do esperado" : "Real abaixo do esperado"}</PrismaTd>
                    </tr>
                  ))}
              </tbody>
            </PrismaTable>
          </div>
        )}
      </PrismaSection>

      <PrismaSection eyebrow="Ranking de drivers" title={`Quem mais explica ${run.dep_variable}`}>
        <PrismaTable>
          <thead>
            <tr>
              <PrismaTh>Variável</PrismaTh>
              <PrismaTh num>Contribuição (IC 90%)</PrismaTh>
              <PrismaTh num>Participação</PrismaTh>
              <PrismaTh num>Significância (p)</PrismaTh>
              <PrismaTh>Confiança</PrismaTh>
            </tr>
          </thead>
          <tbody>
            {ranked.map((t, i) => {
              const conf = pConfidence(t.pValue, t.variable);
              const w = Math.min(100, Math.abs(t.share) * 100);
              const channelColor = t.isMedia
                ? CHANNEL_COLORS[i % CHANNEL_COLORS.length]
                : undefined;
              return (
                <tr key={t.variable}>
                  <PrismaTd channelColor={channelColor}>
                    <span style={{ fontWeight: 500 }}>{t.variable}</span>
                    {t.isMedia && (
                      <PrismaBadge tone="ai" className="ml-2">mídia</PrismaBadge>
                    )}
                  </PrismaTd>
                  <PrismaTd num>
                    {fmt(t.contribution)}
                    {t.contribLow != null && t.contribHigh != null && !t.variable.startsWith("Base") && (
                      <div className="text-[10px] mt-0.5" style={{ color: "var(--prisma-mute)" }}>
                        IC 90%: {fmt(t.contribLow)} — {fmt(t.contribHigh)}
                      </div>
                    )}
                  </PrismaTd>
                  <PrismaTd num>
                    <div className="inline-flex items-center gap-2">
                      <div
                        className="w-24 h-1 relative"
                        style={{ background: "var(--prisma-stone)" }}
                      >
                        <div
                          className="absolute inset-y-0 left-0"
                          style={{ width: `${w}%`, background: "var(--prisma-indigo)" }}
                        />
                      </div>
                      <span className="text-xs">{(t.share * 100).toFixed(1)}%</span>
                    </div>
                  </PrismaTd>
                  <PrismaTd num>{t.variable.startsWith("Base") ? "—" : t.pValue.toFixed(3)}</PrismaTd>
                  <PrismaTd>{conf}</PrismaTd>
                </tr>
              );
            })}
          </tbody>
        </PrismaTable>
        <p
          className="mt-4 text-[11px] leading-relaxed max-w-3xl"
          style={{ color: "var(--prisma-mute)" }}
        >
          <strong style={{ color: "var(--prisma-slate)" }}>Nota metodológica.</strong> Os p-values acima
          são <em>aproximações</em>. O Ridge encolhe coeficientes em direção a zero, o que
          enviesa a inferência clássica: usamos a variância residual do ajuste com a matriz
          (X′X + αI)⁻¹, prática comum mas que <em>subestima</em> a incerteza real. Trate as
          estrelas como um <em>ranking de robustez</em>, não como teste de hipótese formal.
          Para inferência rigorosa, rode o modelo novamente com <strong>α = 0</strong> (OLS
          puro, sem regularização) — os p-values dessa rodada são válidos no sentido clássico.
          Os <strong>intervalos de confiança a 90%</strong> vêm de <em>residual bootstrap</em>
          com 200 reamostragens: reembaralhamos os resíduos do ajuste, refazemos a Ridge e
          coletamos a distribuição de contribuição e ROI. Esses ICs <em>são</em> robustos à
          regularização e capturam a incerteza real do modelo.
        </p>
      </PrismaSection>

      {rois.length > 0 && (
        <PrismaSection eyebrow="ROI por canal de mídia" title="Cada R$ investido virou quanto?">
          <PrismaTable>
            <thead>
              <tr>
                <PrismaTh>Canal</PrismaTh>
                <PrismaTh num>Investido</PrismaTh>
                <PrismaTh num>Gerou</PrismaTh>
                <PrismaTh num>ROI</PrismaTh>
              </tr>
            </thead>
            <tbody>
              {rois.map((r, i) => (
                <tr key={r.variable}>
                  <PrismaTd channelColor={CHANNEL_COLORS[i % CHANNEL_COLORS.length]}>
                    <span style={{ fontWeight: 500 }}>{r.variable}</span>
                  </PrismaTd>
                  <PrismaTd num>{fmt(r.spend)}</PrismaTd>
                  <PrismaTd num>{fmt(r.contribution)}</PrismaTd>
                  <PrismaTd num>
                    <span
                      className="font-semibold text-lg"
                      style={{ color: "var(--prisma-indigo-deep)" }}
                    >
                      {r.roi!.toFixed(2)}×
                    </span>
                    {r.roiLow != null && r.roiHigh != null && (
                      <div className="text-[10px] mt-0.5" style={{ color: "var(--prisma-mute)" }}>
                        IC 90%: {r.roiLow.toFixed(2)}× — {r.roiHigh.toFixed(2)}×
                      </div>
                    )}
                  </PrismaTd>
                </tr>
              ))}
            </tbody>
          </PrismaTable>
        </PrismaSection>
      )}

      <ResponseCurves channels={(run.contributions_json ?? []).filter((t) => t.isMedia && t.curve && t.curve.length > 0)} />

      {rois.length >= 2 && <BudgetSimulator rois={rois} depVariable={run.dep_variable} />}
    </div>
  );
}

function ResponseCurves({ channels }: { channels: RunTotals[] }) {
  if (channels.length === 0) return null;
  return (
    <PrismaSection
      eyebrow="Curva de resposta por canal"
      title="Quanto mais investir rende quanto?"
      description="Cada curva mostra a contribuição estimada do canal em função do total investido. O ponto destacado marca o nível atual de gasto. Inclinação local = ROI marginal."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {channels.map((c, i) => {
          const color = SERIES_COLORS[i % SERIES_COLORS.length];
          const data = (c.curve ?? []).map((p) => ({
            spend: p.spend,
            Contribuição: p.contribution,
          }));
          return (
            <PrismaCard key={c.variable}>
              <p
                className="text-[11px] font-semibold uppercase"
                style={{ letterSpacing: "0.18em", color: "var(--prisma-mute)" }}
              >
                {c.variable}
              </p>
              <p className="text-xs font-mono" style={{ color: "var(--prisma-mute)" }}>
                Hoje: {fmt(c.spend)} → {fmt(c.contribution)} · ROI {c.roi != null ? c.roi.toFixed(2) + "×" : "—"}
              </p>
              <div className="h-56">
                <ResponsiveContainer>
                  <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke={CHART_GRID} />
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
                      contentStyle={tooltipStyle}
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
                        return <circle key={payload.spend} cx={cx} cy={cy} r={5} fill={SAT_AMBER} stroke={INDIGO} strokeWidth={1.5} />;
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </PrismaCard>
          );
        })}
      </div>
      <p
        className="mt-4 text-[11px] max-w-3xl"
        style={{ color: "var(--prisma-mute)" }}
      >
        Eixo X até 1,5× o gasto histórico do canal. A curva é uma <em>extrapolação</em> da forma
        funcional do modelo (adstock geométrico + Hill); fora do intervalo observado a incerteza
        cresce muito. Use como guia direcional, não como previsão exata.
      </p>
    </PrismaSection>
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
    <PrismaSection
      eyebrow="Simulador de realocação"
      title="E se eu mover budget entre canais?"
      description={`Ajuste o gasto de cada canal em ±% para estimar o impacto em ${depVariable}. A estimativa multiplica o novo gasto pelo ROI médio observado do canal.`}
    >
      <PrismaTable>
        <thead>
          <tr>
            <PrismaTh>Canal</PrismaTh>
            <PrismaTh num>Atual</PrismaTh>
            <PrismaTh>Ajuste</PrismaTh>
            <PrismaTh num>Novo gasto</PrismaTh>
            <PrismaTh num>Δ contribuição</PrismaTh>
          </tr>
        </thead>
        <tbody>
          {sim.rows.map((r, i) => (
            <tr key={r.variable}>
              <PrismaTd channelColor={CHANNEL_COLORS[i % CHANNEL_COLORS.length]}>
                <span style={{ fontWeight: 500 }}>{r.variable}</span>
                <span className="ml-2 font-mono text-[10px]" style={{ color: "var(--prisma-mute)" }}>
                  ROI {r.roi!.toFixed(2)}×
                </span>
              </PrismaTd>
              <PrismaTd num>{fmt(r.spend)}</PrismaTd>
              <PrismaTd>
                <div className="flex items-center gap-2 w-72">
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    step={5}
                    value={r.pct}
                    onChange={(e) =>
                      setDeltas((d) => ({ ...d, [r.variable]: parseFloat(e.target.value) }))
                    }
                    className="prisma-range flex-1"
                  />
                  <span
                    className="text-xs w-14 text-right tabular-nums"
                    style={{
                      color:
                        r.pct > 0
                          ? "var(--prisma-indigo-deep)"
                          : r.pct < 0
                          ? "var(--prisma-mute)"
                          : "var(--prisma-slate)",
                    }}
                  >
                    {r.pct > 0 ? "+" : ""}
                    {r.pct.toFixed(0)}%
                  </span>
                </div>
              </PrismaTd>
              <PrismaTd num>{fmt(r.newSpend)}</PrismaTd>
              <PrismaTd
                num
                tone={r.deltaContribution > 0 ? "pos" : r.deltaContribution < 0 ? "neg" : undefined}
              >
                {r.deltaContribution > 0 ? "+" : ""}
                {fmt(r.deltaContribution)}
              </PrismaTd>
            </tr>
          ))}
          <tr data-row="total">
            <PrismaTd>Total</PrismaTd>
            <PrismaTd num>{fmt(totalSpend)}</PrismaTd>
            <PrismaTd num>
              Δ gasto: {sim.deltaSpend > 0 ? "+" : ""}{fmt(sim.deltaSpend)}
            </PrismaTd>
            <PrismaTd num>{fmt(sim.newSpend)}</PrismaTd>
            <PrismaTd num>
              {sim.deltaContribution > 0 ? "+" : ""}
              {fmt(sim.deltaContribution)}
            </PrismaTd>
          </tr>
        </tbody>
      </PrismaTable>

      <div className="mt-4 flex items-center justify-between">
        <PrismaButton variant="ghost" size="sm" onClick={reset}>
          Zerar ajustes
        </PrismaButton>
        <p
          className="text-[11px] max-w-xl text-right"
          style={{ color: "var(--prisma-mute)" }}
        >
          <strong style={{ color: "var(--prisma-slate)" }}>Aviso.</strong> O modelo aplicou saturação de Hill no ajuste,
          então o ROI marginal cai conforme o canal cresce. Esta simulação usa ROI <em>médio</em> —
          é confiável para realocações pequenas (±15–25%) e otimista para aumentos grandes em um único canal.
        </p>
      </div>
    </PrismaSection>
  );
}

