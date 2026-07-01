import { createFileRoute } from "@tanstack/react-router";
import { LatestRunReport } from "@/components/prisma/LatestRunReport";

export const Route = createFileRoute("/_authenticated/results/response")({
  head: () => ({ meta: [{ title: "Resultados — Prisma" }] }),
  component: LatestRunReport,
});
