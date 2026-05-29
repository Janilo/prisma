import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listRuns } from "@/lib/mmm.functions";

export const Route = createFileRoute("/_authenticated/runs/")({
  component: RunsPage,
});

function RunsPage() {
  const fn = useServerFn(listRuns);
  const navigate = useNavigate();
  const { data } = useSuspenseQuery(
    queryOptions({ queryKey: ["runs"], queryFn: () => fn() }),
  );
  const [selected, setSelected] = useState<string[]>([]);

  const selectedDataset = useMemo(() => {
    if (selected.length === 0) return null;
    const r = data.runs.find((x) => x.id === selected[0]);
    return r?.dataset_id ?? null;
  }, [selected, data.runs]);

  const toggle = (id: string, datasetId: string | null) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      // Same-dataset constraint
      if (selectedDataset && datasetId !== selectedDataset) return prev;
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const compare = () => {
    if (selected.length !== 2) return;
    navigate({ to: "/compare", search: { a: selected[0], b: selected[1] } });
  };

  return (
    <div className="p-12 max-w-5xl">
      <p className="eyebrow">Histórico</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-brand-navy">
        Modelos rodados
      </h1>

      {data.runs.length === 0 ? (
        <div className="mt-12 border hairline-strong bg-white p-12 text-center">
          <p className="text-sm text-brand-navy/70">Nenhum modelo rodado ainda.</p>
          <Link to="/upload" className="mt-6 inline-block bg-brand-navy text-white px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-brand-purple">
            Começar
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 flex items-center justify-between gap-4">
            <p className="text-xs text-brand-navy/60">
              Marque dois runs do mesmo dataset para comparar lado a lado.
              {selected.length > 0 && (
                <span className="ml-2 font-mono">({selected.length}/2 selecionados)</span>
              )}
            </p>
            <button
              onClick={compare}
              disabled={selected.length !== 2}
              className="text-xs uppercase tracking-widest bg-brand-navy text-white px-4 py-2 disabled:bg-brand-navy/20 disabled:cursor-not-allowed hover:bg-brand-purple"
            >
              Comparar selecionados
            </button>
          </div>

          <table className="mt-4 w-full text-sm border-collapse [&_th]:px-4 [&_td]:px-4 [&_th:first-child]:pl-0 [&_td:first-child]:pl-0 [&_th:last-child]:pr-0 [&_td:last-child]:pr-0">
            <thead>
              <tr className="border-b hairline-strong">
                <th className="w-8"></th>
                <th className="text-left py-3 eyebrow">Nome</th>
                <th className="text-left py-3 eyebrow">Alvo</th>
                <th className="text-right py-3 eyebrow">R²</th>
                <th className="text-right py-3 eyebrow">MAPE</th>
                <th className="text-left py-3 eyebrow pl-4">Quando</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.runs.map((r) => {
                const m = (r.metrics_json as { r2?: number; mape?: number }) ?? {};
                const isSelected = selected.includes(r.id);
                const disabled = !isSelected && selectedDataset !== null && r.dataset_id !== selectedDataset;
                return (
                  <tr key={r.id} className={`border-b hairline ${disabled ? "opacity-30" : "hover:bg-brand-creme/50"}`}>
                    <td className="py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={disabled}
                        onChange={() => toggle(r.id, r.dataset_id)}
                        className="accent-brand-purple"
                      />
                    </td>
                    <td className="py-4 font-medium text-brand-navy">{r.name}</td>
                    <td className="py-4 text-brand-navy/70">{r.dep_variable}</td>
                    <td className="py-4 text-right font-mono text-xs">{m.r2 !== undefined ? (m.r2 * 100).toFixed(1) + "%" : "—"}</td>
                    <td className="py-4 text-right font-mono text-xs">{m.mape !== undefined ? (m.mape * 100).toFixed(1) + "%" : "—"}</td>
                    <td className="py-4 pl-4 text-xs text-brand-navy/70 font-mono">
                      {new Date(r.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="py-4 text-right">
                      <Link to="/runs/$id" params={{ id: r.id }} className="text-xs uppercase tracking-widest border-b border-brand-mustard pb-0.5 text-brand-navy hover:text-brand-purple">
                        Ver
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
