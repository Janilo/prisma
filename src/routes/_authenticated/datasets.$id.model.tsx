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

export const Route = createFileRoute("/_authenticated/datasets/$id/model")({
  head: () => ({
    meta: [
      { title: "Modelo · Prisma" },
      { name: "description", content: "Configure o modelo Marketing Mix Modeling: dependente, explicativas, mídia, adstock e saturação." },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s) => search.parse(s),
  component: ModelPage,
});

function ModelPage() {
  const { id } = Route.useParams();
  const sp = Route.useSearch();
  const navigate = useNavigate();
  const getFn = useServerFn(getDataset);
  const runFn = useServerFn(runMmm);

  const { data } = useSuspenseQuery(
    queryOptions({ queryKey: ["dataset", id], queryFn: () => getFn({ data: { id } }) }),
  );
  const ds = data.dataset as unknown as {
    columns_json: ColumnInfo[];
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
  const [decays, setDecays] = useState<Record<string, number>>({});
  const [satAlpha, setSatAlpha] = useState(1);
  const [holdout, setHoldout] = useState(0);
  const [runName, setRunName] = useState(`Modelo · ${new Date().toLocaleDateString("pt-BR")}`);

  // Suggest a sensible default per channel based on its name (heuristic).
  const suggestDecay = (name: string): number => {
    const n = name.toLowerCase();
    if (/\btv\b|televis|ooh|out.?of.?home|radio|r[aá]dio|print|jornal|revista/.test(n)) return 0.7;
    if (/google|search|sem|adwords|youtube|yt\b/.test(n)) return 0.1;
    if (/meta|facebook|insta|tiktok|social|paid.?social/.test(n)) return 0.3;
    return 0.5;
  };
  const decayFor = (name: string) => decays[name] ?? suggestDecay(name);

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
          adstockDecay: 0.5,
          adstockDecays: Object.fromEntries(media.map((m) => [m, decayFor(m)])),
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
    <section className="mt-12 grid grid-cols-2 gap-12">
      <div className="space-y-6">
        <h2 className="eyebrow">Configurar modelo</h2>

        <div>
          <label htmlFor="run-name" className="eyebrow block mb-2">Nome do modelo</label>
          <input
            id="run-name"
            value={runName}
            onChange={(e) => setRunName(e.target.value)}
            className="w-full border border-brand-navy/20 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="dep-select" className="eyebrow block mb-2">Variável dependente (o que explicar)</label>
          <select
            id="dep-select"
            value={dep}
            onChange={(e) => setDep(e.target.value)}
            className="w-full border border-brand-navy/20 bg-white px-3 py-2 text-sm"
          >
            {numericCols.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="date-select" className="eyebrow block mb-2">Coluna de data (opcional)</label>
          <select
            id="date-select"
            value={dateCol}
            onChange={(e) => setDateCol(e.target.value)}
            className="w-full border border-brand-navy/20 bg-white px-3 py-2 text-sm"
          >
            <option value="">— sem data —</option>
            {dateCols.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Slider label="Regularização (α)" value={alpha} min={0} max={50} step={0.5} onChange={setAlpha} hint="Maior = mais estável, menos preciso" />
          <Slider label="Saturação (Hill α)" value={satAlpha} min={0.5} max={3} step={0.1} onChange={setSatAlpha} hint="Curva de retorno" />
        </div>

        {media.length > 0 && (
          <div>
            <p className="eyebrow mb-2">Adstock por canal (carryover)</p>
            <p className="text-[10px] text-brand-gray mb-3">
              Cada canal tem memória diferente. TV/OOH costuma ficar em 0,6–0,8 (efeito dura semanas).
              Google paid em 0,0–0,2 (efeito quase imediato). Meta/social em 0,2–0,4.
              Valores iniciais são sugeridos pelo nome — ajuste conforme seu conhecimento do canal.
            </p>
            <div className="space-y-3 border hairline-strong bg-white p-3">
              {media.map((m) => (
                <div key={m} className="flex items-center gap-3">
                  <span className="text-xs flex-1 truncate" title={m}>{m}</span>
                  <input
                    type="range"
                    min={0}
                    max={0.9}
                    step={0.05}
                    value={decayFor(m)}
                    onChange={(e) =>
                      setDecays((d) => ({ ...d, [m]: parseFloat(e.target.value) }))
                    }
                    className="flex-1 accent-brand-purple"
                  />
                  <span className="font-mono text-xs w-10 text-right">{decayFor(m).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}


        <button
          disabled={mut.isPending || !dep || indep.length === 0}
          onClick={() => mut.mutate()}
          className="w-full bg-brand-navy text-white py-3 text-xs font-bold uppercase tracking-widest hover:bg-brand-purple disabled:opacity-40"
        >
          {mut.isPending ? "Rodando modelo..." : "Rodar modelo"}
        </button>
      </div>

      <div>
        <h2 className="eyebrow">Variáveis explicativas</h2>
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
