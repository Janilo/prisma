import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listDatasets } from "@/lib/mmm.functions";

const datasetsQuery = (fn: ReturnType<typeof useServerFn<typeof listDatasets>>) =>
  queryOptions({ queryKey: ["datasets"], queryFn: () => fn() });

export const Route = createFileRoute("/_authenticated/datasets/")({
  component: DatasetsPage,
});

function DatasetsPage() {
  const fn = useServerFn(listDatasets);
  const { data } = useSuspenseQuery(datasetsQuery(fn));
  return (
    <div className="p-12 max-w-5xl">
      <p className="eyebrow">Datasets</p>
      <h1 className="mt-2 font-display text-4xl font-light italic text-brand-navy">
        Seus dados carregados
      </h1>

      {data.datasets.length === 0 ? (
        <div className="mt-12 border hairline-strong bg-white p-12 text-center">
          <p className="text-sm text-brand-navy/70">Nenhum dataset ainda.</p>
          <Link
            to="/upload"
            className="mt-6 inline-block bg-brand-navy text-white px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-brand-purple"
          >
            Subir planilha
          </Link>
        </div>
      ) : (
        <table className="mt-8 w-full text-sm border-collapse">
          <thead>
            <tr className="border-b hairline-strong">
              <th className="text-left py-3 eyebrow">Nome</th>
              <th className="text-left py-3 eyebrow">Granularidade</th>
              <th className="text-right py-3 eyebrow">Linhas</th>
              <th className="text-right py-3 eyebrow">Colunas</th>
              <th className="text-left py-3 eyebrow pl-4">Período</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.datasets.map((d) => (
              <tr key={d.id} className="border-b hairline hover:bg-brand-creme/50">
                <td className="py-4 font-display text-lg text-brand-navy">{d.name}</td>
                <td className="py-4 text-brand-navy/70">{d.granularity ?? "—"}</td>
                <td className="py-4 text-right font-mono text-xs">{d.n_rows}</td>
                <td className="py-4 text-right font-mono text-xs">{d.n_cols}</td>
                <td className="py-4 pl-4 text-xs text-brand-navy/70 font-mono">
                  {d.period_start ?? "?"} → {d.period_end ?? "?"}
                </td>
                <td className="py-4 text-right">
                  <Link
                    to="/datasets/$id"
                    params={{ id: d.id }}
                    className="text-xs uppercase tracking-widest border-b border-brand-mustard pb-0.5 text-brand-navy hover:text-brand-purple"
                  >
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
