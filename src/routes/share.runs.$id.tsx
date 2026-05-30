import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";

import { getPublicRun } from "@/lib/mmm.functions";
import { RunReport, type RunReportData } from "@/components/RunReport";

export const Route = createFileRoute("/share/runs/$id")({
  head: () => ({
    meta: [
      { title: "Resultado compartilhado · Prisma" },
      { name: "description", content: "Resultado de modelo Marketing Mix Modeling compartilhado em modo leitura." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SharedRunPage,
});

function SharedRunPage() {
  const { id } = Route.useParams();
  const fn = useServerFn(getPublicRun);
  const { data } = useSuspenseQuery(
    queryOptions({ queryKey: ["public-run", id], queryFn: () => fn({ data: { id } }) }),
  );

  const run = data.run as unknown as RunReportData;

  return (
    <div className="min-h-screen bg-indigo-soft">
      <header className="border-b hairline-strong bg-white">
        <div className="max-w-7xl mx-auto px-12 py-4 flex items-center justify-between">
          <Link to="/" className="font-display text-xl text-abyss">Prisma</Link>
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-widest text-mute">
              Modo compartilhado · read-only
            </span>
            <Link
              to="/signup"
              className="text-xs uppercase tracking-widest border border-abyss/30 px-3 py-1.5 hover:bg-abyss hover:text-white transition-colors"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </header>

      <RunReport run={run} />
    </div>
  );
}
