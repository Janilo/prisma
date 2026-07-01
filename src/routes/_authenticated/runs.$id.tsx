import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  useSuspenseQuery,
  useQuery,
  useMutation,
  queryOptions,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { getRun, getLatestDatasetVersion, rerunOnLatestVersion } from "@/lib/mmm.functions";
import { RunReport, type RunReportData } from "@/components/RunReport";

export const Route = createFileRoute("/_authenticated/runs/$id")({
  component: RunPage,
});

function RunPage() {
  const { id } = Route.useParams();
  const fn = useServerFn(getRun);
  const { data } = useSuspenseQuery(
    queryOptions({ queryKey: ["run", id], queryFn: () => fn({ data: { id } }) }),
  );

  const run = data.run as unknown as RunReportData;
  const datasetId = (data.run as { dataset_id?: string }).dataset_id;

  return (
    <RunReport
      run={run}
      header={
        <div className="space-y-4">
          {datasetId && <RerunOnLatest runId={id} datasetId={datasetId} />}
          <ShareButton runId={id} />
        </div>
      }
    />
  );
}

function RerunOnLatest({ runId, datasetId }: { runId: string; datasetId: string }) {
  const latestFn = useServerFn(getLatestDatasetVersion);
  const rerunFn = useServerFn(rerunOnLatestVersion);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: latest } = useQuery({
    queryKey: ["latest-dataset", datasetId],
    queryFn: () => latestFn({ data: { datasetId } }),
  });

  const mutation = useMutation({
    mutationFn: () => rerunFn({ data: { runId } }),
    onSuccess: (res) => {
      toast.success("Run criado na versão mais nova do dataset.");
      void qc.invalidateQueries({ queryKey: ["runs"] });
      navigate({ to: "/runs/$id", params: { id: res.runId } });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Falha ao re-executar."),
  });

  if (!latest || latest.id === datasetId) return null;

  return (
    <div className="border hairline-strong bg-indigo-soft p-4 flex items-center justify-between gap-4 flex-wrap">
      <p className="text-xs text-abyss/80">
        Existe uma <strong>versão mais nova</strong> deste dataset (v{latest.version}). Re-execute o
        mesmo modelo nela para comparar como os resultados mudam com os dados atualizados.
      </p>
      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="text-xs uppercase tracking-widest bg-abyss text-white px-4 py-2 hover:bg-indigo disabled:opacity-50"
      >
        {mutation.isPending ? "Rodando..." : `Re-executar na v${latest.version}`}
      </button>
    </div>
  );
}

function ShareButton({ runId }: { runId: string }) {
  const [copied, setCopied] = useState(false);
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/share/runs/${runId}`
      : `/share/runs/${runId}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copiado. Qualquer pessoa com ele pode ver este modelo.");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Não consegui copiar — copie manualmente.");
    }
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={copy}
        className="text-xs uppercase tracking-widest border border-abyss/30 px-4 py-2 hover:bg-abyss hover:text-white transition-colors"
      >
        {copied ? "Copiado ✓" : "Copiar link de compartilhamento"}
      </button>
      <input
        readOnly
        value={shareUrl}
        onFocus={(e) => e.currentTarget.select()}
        className="flex-1 min-w-64 max-w-xl border border-abyss/20 bg-white px-3 py-2 text-xs font-mono"
      />
      <p className="text-[10px] text-mute basis-full">
        Read-only · sem login · qualquer pessoa com o link vê o resultado. O link é o próprio UUID
        da run (122 bits, não-enumerável). Para revogar, delete a run.
      </p>
    </div>
  );
}
