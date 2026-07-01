import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getLatestRun } from "@/lib/mmm.functions";
import { RunReport, type RunReportData } from "@/components/RunReport";

// Shared results view: renders the user's most recent *real* model run. Replaces the
// former static /results/* mockups, which showed fabricated numbers (R$ 8,4M, R² 0,91,
// Search 4,12…) as if they were the user's own data and never touched the engine.
// When there is no completed run yet, it points the user to upload + run.
export function LatestRunReport() {
  const fn = useServerFn(getLatestRun);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["latest-run"],
    queryFn: () => fn(),
  });

  if (isLoading) {
    return (
      <section className="prisma-view" data-active="true">
        <div className="prisma-panel-sub">Carregando sua rodada mais recente…</div>
      </section>
    );
  }

  const run = (data?.run ?? null) as RunReportData | null;

  // A completed run always carries predicted_json; guard against partial/failed rows.
  if (isError || !run || !run.predicted_json) {
    return <NoRunYet failed={isError} />;
  }

  return (
    <RunReport
      run={run}
      header={
        <div
          className="prisma-panel-sub"
          style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}
        >
          <span>
            Rodada mais recente: <strong>{run.name}</strong>
          </span>
          <Link to="/runs" style={{ color: "var(--prisma-indigo)" }}>
            Ver todas as rodadas
          </Link>
        </div>
      }
    />
  );
}

function NoRunYet({ failed }: { failed?: boolean }) {
  return (
    <section
      className="prisma-view"
      data-active="true"
      style={{ display: "grid", placeItems: "center", padding: "48px 0" }}
    >
      <div
        className="prisma-card"
        style={{ maxWidth: 520, textAlign: "center", display: "grid", gap: 12 }}
      >
        <div className="prisma-panel-h3">
          {failed ? "Não consegui carregar sua última rodada" : "Nenhuma rodada concluída ainda"}
        </div>
        <p style={{ fontSize: 13, color: "var(--prisma-slate)", margin: 0, lineHeight: 1.55 }}>
          {failed
            ? "Tente recarregar a página. Se o erro persistir, rode um modelo novamente."
            : "Suba seus dados e rode um modelo para ver seus resultados reais aqui — decomposição, ROI por canal e curvas de resposta calculados a partir da sua base."}
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <Link to="/upload" className="prisma-btn" data-variant="primary" data-size="sm">
            Subir dados
          </Link>
          <Link to="/runs" className="prisma-btn" data-variant="secondary" data-size="sm">
            Ver rodadas
          </Link>
        </div>
      </div>
    </section>
  );
}
