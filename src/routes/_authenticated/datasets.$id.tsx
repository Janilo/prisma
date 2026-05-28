import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, queryOptions, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { getDataset, runMmm } from "@/lib/mmm.functions";
import type { ColumnInfo } from "@/lib/parse";

const search = z.object({
  dep: z.string().optional(),
  indep: z.string().optional(),
  date: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/datasets/$id")({
  validateSearch: (s) => search.parse(s),
  component: DatasetPage,
});

function DatasetPage() {
  const { id } = Route.useParams();
  const sp = Route.useSearch();
  const navigate = useNavigate();
  const getFn = useServerFn(getDataset);
  const runFn = useServerFn(runMmm);

  const { data } = useSuspenseQuery(
    queryOptions({ queryKey: ["dataset", id], queryFn: () => getFn({ data: { id } }) }),
  );
  const ds = data.dataset as unknown as {
    id: string;
    name: string;
    columns_json: ColumnInfo[];
    granularity: string | null;
    period_start: string | null;
    period_end: string | null;
    n_rows: number;
    n_cols: number;
  };


  const cols = ds.columns_json ?? [];
  const numericCols = cols.filter((c) => c.kind === "number").map((c) => c.name);
  const dateCols = cols.filter((c) => c.kind === "date").map((c) => c.name);

  const initialIndep = useMemo(
    () => (sp.indep ? sp.indep.split(",").filter(Boolean) : []),
    [sp.indep],
  );

  const [dep, setDep] = useState<string>(sp.dep ?? numericCols[0] ?? "");
  const [dateCol, setDateCol] = useState<string>(sp.date ?? dateCols[0] ?? "");
  const [indep, setIndep] = useState<string[]>(initialIndep);
  const [media, setMedia] = useState<string[]>(initialIndep.filter((n: string) => /gasto|spend|media|tv|google|meta|invest/i.test(n)));
  const [alpha, setAlpha] = useState(1);
  const [decay, setDecay] = useState(0.5);
  const [satAlpha, setSatAlpha] = useState(1);
  const [runName, setRunName] = useState(`Modelo · ${new Date().toLocaleDateString("pt-BR")}`);

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const mut = useMutation({
    mutationFn: () =>
      runFn({
        data: {
          datasetId: id,
          name: runName,
          depVariable: dep,
          indepVariables: indep,
          mediaVariables: media,
          dateColumn: dateCol || null,
          alpha,
          adstockDecay: decay,
          saturationAlpha: satAlpha,
        },
      }),
    onSuccess: (r) => {
      toast.success("Modelo rodado.");
      navigate({ to: "/runs/$id", params: { id: r.runId } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao rodar."),
  });

  return (
    <div className="p-12 max-w-6xl">
      <p className="eyebrow">02 — Diagnóstico</p>
      <h1 className="mt-2 font-display text-4xl font-light italic text-brand-navy">{ds.name}</h1>
      <div className="mt-4 flex gap-8 text-xs text-brand-navy/60 font-mono">
        <span>{ds.n_rows} linhas</span>
        <span>{ds.n_cols} colunas</span>
        <span>Granularidade: {ds.granularity ?? "—"}</span>
        <span>{ds.period_start} → {ds.period_end}</span>
      </div>

      {/* Columns diagnostic table */}
      <section className="mt-12">
        <p className="eyebrow">Colunas detectadas</p>
        <table className="mt-3 w-full text-sm border-collapse">
          <thead>
            <tr className="border-b hairline-strong">
              <th className="text-left py-2 eyebrow">Coluna</th>
              <th className="text-left py-2 eyebrow">Tipo</th>
              <th className="text-right py-2 eyebrow">Missings</th>
              <th className="text-right py-2 eyebrow">Únicos</th>
              <th className="text-right py-2 eyebrow">Min</th>
              <th className="text-right py-2 eyebrow">Média</th>
              <th className="text-right py-2 eyebrow">Max</th>
              <th className="text-right py-2 eyebrow">Outliers</th>
            </tr>
          </thead>
          <tbody>
            {cols.map((c) => (
              <tr key={c.name} className="border-b hairline">
                <td className="py-2 font-medium">{c.name}</td>
                <td className="py-2">
                  <span className={
                    "text-[10px] uppercase tracking-widest px-2 py-0.5 border hairline-strong " +
                    (c.kind === "number" ? "text-brand-green" : c.kind === "date" ? "text-brand-purple" : "text-brand-gray")
                  }>{c.kind}</span>
                </td>
                <td className="py-2 text-right font-mono text-xs">{c.missing}</td>
                <td className="py-2 text-right font-mono text-xs">{c.unique}</td>
                <td className="py-2 text-right font-mono text-xs">{c.min !== undefined ? fmt(c.min) : "—"}</td>
                <td className="py-2 text-right font-mono text-xs">{c.mean !== undefined ? fmt(c.mean) : "—"}</td>
                <td className="py-2 text-right font-mono text-xs">{c.max !== undefined ? fmt(c.max) : "—"}</td>
                <td className="py-2 text-right font-mono text-xs">{c.outliers ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Model config */}
      <section className="mt-16 grid grid-cols-2 gap-12">
        <div className="space-y-6">
          <p className="eyebrow">03 — Configurar modelo</p>

          <div>
            <label className="eyebrow block mb-2">Nome do modelo</label>
            <input
              value={runName}
              onChange={(e) => setRunName(e.target.value)}
              className="w-full border border-brand-navy/20 bg-white px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="eyebrow block mb-2">Variável dependente (o que explicar)</label>
            <select
              value={dep}
              onChange={(e) => setDep(e.target.value)}
              className="w-full border border-brand-navy/20 bg-white px-3 py-2 text-sm"
            >
              {numericCols.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div>
            <label className="eyebrow block mb-2">Coluna de data (opcional)</label>
            <select
              value={dateCol}
              onChange={(e) => setDateCol(e.target.value)}
              className="w-full border border-brand-navy/20 bg-white px-3 py-2 text-sm"
            >
              <option value="">— sem data —</option>
              {dateCols.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Slider label="Regularização (α)" value={alpha} min={0} max={50} step={0.5} onChange={setAlpha} hint="Maior = mais estável, menos preciso" />
            <Slider label="Adstock (decay)" value={decay} min={0} max={0.9} step={0.05} onChange={setDecay} hint="Memória da mídia" />
            <Slider label="Saturação (Hill α)" value={satAlpha} min={0.5} max={3} step={0.1} onChange={setSatAlpha} hint="Curva de retorno" />
          </div>

          <button
            disabled={mut.isPending || !dep || indep.length === 0}
            onClick={() => mut.mutate()}
            className="w-full bg-brand-navy text-white py-3 text-xs font-bold uppercase tracking-widest hover:bg-brand-purple disabled:opacity-40"
          >
            {mut.isPending ? "Rodando modelo..." : "Rodar modelo"}
          </button>
        </div>

        <div>
          <p className="eyebrow">Variáveis explicativas</p>
          <p className="text-xs text-brand-navy/60 mt-2 mb-4">
            Marque as colunas que devem explicar a dependente. Marque também as que são <em>mídia</em>{" "}
            (recebem adstock + saturação).
          </p>
          <div className="border hairline-strong divide-y bg-white">
            {numericCols.filter((n) => n !== dep).map((n) => {
              const on = indep.includes(n);
              const isMedia = media.includes(n);
              return (
                <div key={n} className="flex items-center justify-between px-3 py-2 text-sm">
                  <label className="flex items-center gap-2 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => {
                        setIndep((arr) => toggle(arr, n));
                        if (on) setMedia((arr) => arr.filter((x) => x !== n));
                      }}
                    />
                    <span>{n}</span>
                  </label>
                  <label className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-brand-gray cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isMedia}
                      disabled={!on}
                      onChange={() => setMedia((arr) => toggle(arr, n))}
                    />
                    Mídia
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange, hint }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; hint?: string;
}) {
  return (
    <div>
      <label className="eyebrow block mb-2">{label}</label>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full accent-brand-purple" />
      <p className="font-mono text-xs mt-1">{value}</p>
      {hint && <p className="text-[10px] text-brand-gray mt-1">{hint}</p>}
    </div>
  );
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "k";
  if (Math.abs(n) < 1 && n !== 0) return n.toFixed(3);
  return n.toFixed(1);
}
