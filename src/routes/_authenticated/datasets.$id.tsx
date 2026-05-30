import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";

import { getDataset } from "@/lib/mmm.functions";
import type { ColumnInfo } from "@/lib/parse";

export const Route = createFileRoute("/_authenticated/datasets/$id")({
  head: ({ params }) => ({
    meta: [
      { title: "Dataset · Prisma" },
      { name: "description", content: "Diagnóstico do dataset e configuração do modelo Marketing Mix Modeling." },
      { property: "og:url", content: `https://prisma.pereirasaraiva.com/datasets/${params.id}` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DatasetLayout,
});

function DatasetLayout() {
  const { id } = Route.useParams();
  const getFn = useServerFn(getDataset);
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

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isModel = pathname.endsWith("/model");

  return (
    <div className="p-12 max-w-7xl">
      <div>
        <p className="eyebrow">Dataset</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-abyss">{ds.name}</h1>
        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-xs uppercase tracking-widest text-abyss/60">
          <span>{ds.n_rows} linhas</span>
          <span>{ds.n_cols} colunas</span>
          {ds.granularity && <span>{ds.granularity}</span>}
          {ds.period_start && ds.period_end && (
            <span>{ds.period_start} → {ds.period_end}</span>
          )}
        </div>
      </div>

      <nav className="mt-8 flex gap-8 border-b hairline-strong">
        <Link
          to="/datasets/$id/explore"
          params={{ id }}
          className={
            "pb-3 text-sm uppercase tracking-widest transition " +
            (!isModel
              ? "text-abyss border-b-2 border-violet -mb-px"
              : "text-abyss/50 hover:text-abyss")
          }
        >
          Análise descritiva
        </Link>
        <Link
          to="/datasets/$id/model"
          params={{ id }}
          className={
            "pb-3 text-sm uppercase tracking-widest transition " +
            (isModel
              ? "text-abyss border-b-2 border-violet -mb-px"
              : "text-abyss/50 hover:text-abyss")
          }
        >
          Modelo
        </Link>
      </nav>

      <Outlet />
    </div>
  );
}
