import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listDatasets } from "@/lib/mmm.functions";

const datasetsQuery = (fn: ReturnType<typeof useServerFn<typeof listDatasets>>) =>
  queryOptions({ queryKey: ["datasets"], queryFn: () => fn() });

export const Route = createFileRoute("/_authenticated/explore")({
  head: () => ({
    meta: [
      { title: "Análise descritiva — Prisma" },
      { name: "description", content: "Explore estatísticas descritivas dos seus datasets." },
    ],
  }),
  component: ExplorePage,
});

function ExplorePage() {
  const fn = useServerFn(listDatasets);
  const { data } = useSuspenseQuery(datasetsQuery(fn));

  return (
    <div className="p-12 max-w-5xl">
      <p className="eyebrow">Análise descritiva</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-brand-navy">
        Escolha um dataset para explorar
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
        <ul className="mt-8 divide-y hairline border-y hairline-strong">
          {data.datasets.map((d) => (
            <li key={d.id}>
              <Link
                to="/datasets/$id/explore"
                params={{ id: d.id }}
                className="flex items-center justify-between py-4 hover:bg-brand-creme/50 px-2"
              >
                <span className="font-medium text-brand-navy">{d.name}</span>
                <span className="text-xs text-brand-gray font-mono">
                  {d.n_rows} linhas · {d.n_cols} colunas
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
