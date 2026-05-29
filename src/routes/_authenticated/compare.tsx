import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useMemo } from "react";
import { z } from "zod";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";

import { getRun } from "@/lib/mmm.functions";
import type { RunReportData } from "@/components/RunReport";

const searchSchema = z.object({
  a: z.string().uuid().optional(),
  b: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/compare")({
  validateSearch: (s) => searchSchema.parse(s),
  component: ComparePage,
});

const SERIES_COLORS = ["#6B4FE0", "#2D7BE0", "#0E97A8", "#E0A21E", "#4FA23E", "#C2562F", "#B8B4D8", "#7A5CF0"];

function ComparePage() {
  const { a, b } = Route.useSearch();

  if (!a || !b) {
    return (
      <div className="p-12 max-w-3xl">
        <p className="eyebrow">Comparativo</p>
        <h1 className="mt-2 font-display text-4xl font-light italic text-brand-navy">
          Selecione dois runs para comparar
        </h1>
        <p className="mt-4 text-sm text-brand-navy/70">
          Vá em <Link to="/runs" className="border-b border-brand-mustard">Modelos rodados</Link>,
          marque dois runs do mesmo dataset e clique em <strong>Comparar selecionados</strong>.
        </p>
      </div>
    );
  }

  return <CompareView aId={a} bId={b} />;
}

function CompareView({ aId, bId }: { aId: string; bId: string }) {
  const fn = useServerFn(getRun);
  const { data: A } = useSuspenseQuery(
    queryOptions({ queryKey: ["run", aId], queryFn: () => fn({ data: { id: aId } }) }),
  );
  const { data: B } = useSuspenseQuery(
    queryOptions({ queryKey: ["run", bId], queryFn: () => fn({ data: { id: bId } }) }),
  );

  const runA = A.run as unknown as RunReportData;
  const runB = B.run as unknown as RunReportData;

  const sameDataset = runA.dep_variable === runB.dep_variable;

  return (
    <div className="p-12 max-w-7xl">
      <p className="eyebrow">Comparativo de runs</p>
      <h1 className="mt-2 font-display text-4xl font-light italic text-brand-navy">
        {runA.name} <span className="text-brand-navy/40">vs</span> {runB.name}
      </h1>
      {!sameDataset && (
        <p className="mt-4 text-xs text-red-700 border border-red-700/30 bg-red-50 p-3">
          Atenção: variáveis-alvo diferentes ({runA.dep_variable} vs {runB.dep_variable}).
          A comparação direta pode não fazer sentido.
        </p>
      )}

      <ConfigCompare a={runA} b={runB} />
      <MetricsCompare a={runA} b={runB} />
      <DecompCompare a={runA} b={runB} />
      <PredCompare a={runA} b={runB} />
      <RoiCompare a={runA} b={runB} />

      <div className="mt-12 flex gap-4">
        <Link
          to="/runs/$id"
          params={{ id: aId }}
          className="text-xs uppercase tracking-widest border-b border-brand-mustard pb-0.5"
        >
          Ver {runA.name} completo
        </Link>
        <Link
          to="/runs/$id"
          params={{ id: bId }}
          className="text-xs uppercase tracking-widest border-b border-brand-mustard pb-0.5"
        >
          Ver {runB.name} completo
        </Link>
      </div>
    </div>
  );
}

function ConfigCompare({ a, b }: { a: RunReportData; b: RunReportData }) {
  const rows: Array<[string, string, string]> = [
    ["Alvo", a.dep_variable, b.dep_variable],
    ["α (ridge)", String(a.params_json.alpha), String(b.params_json.alpha)],
    ["Saturação (Hill)", String(a.params_json.saturationAlpha), String(b.params_json.saturationAlpha)],
    [
      "Adstock",
      a.params_json.adstockDecays && Object.keys(a.params_json.adstockDecays).length
        ? Object.entries(a.params_json.adstockDecays).map(([k, v]) => `${k}=${v}`).join(", ")
        : `global=${a.params_json.adstockDecay}`,
      b.params_json.adstockDecays && Object.keys(b.params_json.adstockDecays).length
        ? Object.entries(b.params_json.adstockDecays).map(([k, v]) => `${k}=${v}`).join(", ")
        : `global=${b.params_json.adstockDecay}`,
    ],
    ["Quando", new Date(a.created_at).toLocaleString("pt-BR"), new Date(b.created_at).toLocaleString("pt-BR")],
  ];

  return (
    <section className="mt-10">
      <p className="eyebrow">Configuração</p>
      <table className="mt-4 w-full text-sm border-collapse">
        <thead>
          <tr className="border-b hairline-strong">
            <th className="text-left py-2 eyebrow w-48"></th>
            <th className="text-left py-2 eyebrow">{a.name}</th>
            <th className="text-left py-2 eyebrow pl-4">{b.name}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, va, vb]) => (
            <tr key={label} className="border-b hairline">
              <td className="py-2 text-xs text-brand-navy/60 uppercase tracking-widest">{label}</td>
              <td className="py-2 font-mono text-xs">{va}</td>
              <td className="py-2 font-mono text-xs pl-4">{vb}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function MetricsCompare({ a, b }: { a: RunReportData; b: RunReportData }) {
  const m = (run: RunReportData) => run.metrics_json;
  const metric = (label: string, getter: (m: RunReportData["metrics_json"]) => number | undefined, formatter: (n: number) => string, higherIsBetter: boolean) => {
    const va = getter(m(a));
    const vb = getter(m(b));
    const winner = va !== undefined && vb !== undefined
      ? (higherIsBetter ? (va > vb ? "a" : va < vb ? "b" : "tie") : (va < vb ? "a" : va > vb ? "b" : "tie"))
      : "tie";
    return (
      <tr key={label} className="border-b hairline">
        <td className="py-2 text-xs uppercase tracking-widest text-brand-navy/60">{label}</td>
        <td className={`py-2 text-right font-mono text-sm ${winner === "a" ? "text-emerald-700 font-bold" : ""}`}>
          {va !== undefined ? formatter(va) : "—"}
        </td>
        <td className={`py-2 text-right font-mono text-sm pl-4 ${winner === "b" ? "text-emerald-700 font-bold" : ""}`}>
          {vb !== undefined ? formatter(vb) : "—"}
        </td>
      </tr>
    );
  };
  const pct = (n: number) => (n * 100).toFixed(1) + "%";

  return (
    <section className="mt-12">
      <p className="eyebrow">Métricas</p>
      <h2 className="font-display text-2xl text-brand-navy mt-2">Qual modelo ajusta melhor?</h2>
      <p className="mt-2 text-[11px] text-brand-navy/60">Verde = melhor desempenho.</p>
      <table className="mt-4 w-full text-sm border-collapse">
        <thead>
          <tr className="border-b hairline-strong">
            <th className="text-left py-2 eyebrow w-56"></th>
            <th className="text-right py-2 eyebrow">{a.name}</th>
            <th className="text-right py-2 eyebrow pl-4">{b.name}</th>
          </tr>
        </thead>
        <tbody>
          {metric("R² (in-sample)", (m) => m.r2, pct, true)}
          {metric("MAPE (in-sample)", (m) => m.mape, pct, false)}
          {metric("RMSE (in-sample)", (m) => m.rmse, fmt, false)}
          {metric("R² (holdout)", (m) => m.holdout?.r2, pct, true)}
          {metric("MAPE (holdout)", (m) => m.holdout?.mape, pct, false)}
          {metric("RMSE (holdout)", (m) => m.holdout?.rmse, fmt, false)}
          {metric("n períodos", (m) => m.n, (n) => String(n), true)}
          {metric("p variáveis", (m) => m.p, (n) => String(n), false)}
        </tbody>
      </table>
    </section>
  );
}

function DecompCompare({ a, b }: { a: RunReportData; b: RunReportData }) {
  return (
    <section className="mt-12">
      <p className="eyebrow">Decomposição no tempo</p>
      <div className="mt-4 grid grid-cols-2 gap-6">
        <DecompChart run={a} />
        <DecompChart run={b} />
      </div>
    </section>
  );
}

function DecompChart({ run }: { run: RunReportData }) {
  const variableNames = useMemo(
    () =>
      (run.contributions_json ?? [])
        .filter((t) => t.variable !== "Base (sazonalidade + intercepto)")
        .map((t) => t.variable),
    [run.contributions_json],
  );
  return (
    <div>
      <p className="text-xs font-bold text-brand-navy mb-2">{run.name}</p>
      <div className="border hairline-strong bg-white p-3 h-72">
        <ResponsiveContainer>
          <AreaChart data={run.decomposition_json}>
            <CartesianGrid stroke="#D7D4E2" />
            <XAxis dataKey="period" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} tickFormatter={fmt} />
            <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 11, border: "1px solid #D7D4E2", borderRadius: 0 }} />
            <Area type="monotone" dataKey="base" stackId="1" stroke="#94908a" fill="#94908a" name="Base" fillOpacity={0.5} />
            {variableNames.map((name, i) => (
              <Area key={name} type="monotone" dataKey={name} stackId="1" stroke={SERIES_COLORS[i % SERIES_COLORS.length]} fill={SERIES_COLORS[i % SERIES_COLORS.length]} fillOpacity={0.7} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function PredCompare({ a, b }: { a: RunReportData; b: RunReportData }) {
  return (
    <section className="mt-12">
      <p className="eyebrow">Real vs predito</p>
      <div className="mt-4 grid grid-cols-2 gap-6">
        <PredChart run={a} />
        <PredChart run={b} />
      </div>
    </section>
  );
}

function PredChart({ run }: { run: RunReportData }) {
  const data = useMemo(
    () =>
      run.predicted_json.labels.map((l, i) => ({
        period: l,
        Real: run.predicted_json.actual[i],
        Predito: run.predicted_json.predicted[i],
      })),
    [run.predicted_json],
  );
  return (
    <div>
      <p className="text-xs font-bold text-brand-navy mb-2">{run.name}</p>
      <div className="border hairline-strong bg-white p-3 h-64">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid stroke="#D7D4E2" />
            <XAxis dataKey="period" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} tickFormatter={fmt} />
            <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 11, border: "1px solid #D7D4E2", borderRadius: 0 }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Line type="monotone" dataKey="Real" stroke="#6B4FE0" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Predito" stroke="#E0A21E" strokeWidth={2} strokeDasharray="4 3" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RoiCompare({ a, b }: { a: RunReportData; b: RunReportData }) {
  const roisA = (a.roi_json ?? []).filter((r) => r.roi !== null);
  const roisB = (b.roi_json ?? []).filter((r) => r.roi !== null);
  if (roisA.length === 0 && roisB.length === 0) return null;

  const mapA = new Map(roisA.map((r) => [r.variable, r]));
  const mapB = new Map(roisB.map((r) => [r.variable, r]));
  const channels = Array.from(new Set([...mapA.keys(), ...mapB.keys()]));

  return (
    <section className="mt-12">
      <p className="eyebrow">ROI por canal</p>
      <h2 className="font-display text-2xl text-brand-navy mt-2">Como a configuração mudou a leitura de cada canal?</h2>
      <table className="mt-4 w-full text-sm border-collapse">
        <thead>
          <tr className="border-b hairline-strong">
            <th className="text-left py-2 eyebrow">Canal</th>
            <th className="text-right py-2 eyebrow">ROI ({a.name})</th>
            <th className="text-right py-2 eyebrow pl-4">ROI ({b.name})</th>
            <th className="text-right py-2 eyebrow pl-4">Δ</th>
          </tr>
        </thead>
        <tbody>
          {channels.map((ch) => {
            const ra = mapA.get(ch);
            const rb = mapB.get(ch);
            const delta = ra?.roi != null && rb?.roi != null ? rb.roi - ra.roi : null;
            return (
              <tr key={ch} className="border-b hairline">
                <td className="py-3 font-medium">{ch}</td>
                <td className="py-3 text-right font-display text-lg">
                  {ra?.roi != null ? ra.roi.toFixed(2) + "×" : "—"}
                </td>
                <td className="py-3 text-right font-display text-lg pl-4">
                  {rb?.roi != null ? rb.roi.toFixed(2) + "×" : "—"}
                </td>
                <td
                  className={`py-3 text-right font-mono text-xs pl-4 ${
                    delta == null ? "" : delta > 0 ? "text-emerald-700" : delta < 0 ? "text-red-700" : ""
                  }`}
                >
                  {delta == null ? "—" : (delta > 0 ? "+" : "") + delta.toFixed(2) + "×"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-[11px] text-brand-navy/60 max-w-2xl">
        Diferenças grandes de ROI para o mesmo canal entre runs indicam que a atribuição é
        sensível à configuração (α, adstock, saturação) — sinal de que os dados sozinhos não
        resolvem qual configuração é a “correta”. Use a validação out-of-sample para arbitrar.
      </p>
    </section>
  );
}

// Local helpers (mirrored from RunReport to avoid exporting internals)
function fmt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return n.toFixed(1);
}

