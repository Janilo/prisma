import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listRuns } from "@/lib/mmm.functions";

export const Route = createFileRoute("/_authenticated/runs/")({
  component: RunsPage,
});

function RunsPage() {
  const fn = useServerFn(listRuns);
  const { data } = useSuspenseQuery(
    queryOptions({ queryKey: ["runs"], queryFn: () => fn() }),
  );

  return (
    <div className="p-12 max-w-5xl">
      <p className="eyebrow">Histórico</p>
      <h1 className="mt-2 font-display text-4xl font-light italic text-brand-navy">
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
        <table className="mt-8 w-full text-sm border-collapse">
          <thead>
            <tr className="border-b hairline-strong">
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
              return (
                <tr key={r.id} className="border-b hairline hover:bg-brand-creme/50">
                  <td className="py-4 font-display text-lg text-brand-navy">{r.name}</td>
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
      )}
    </div>
  );
}
