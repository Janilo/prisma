import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { getRun } from "@/lib/mmm.functions";
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

  return <RunReport run={run} header={<ShareButton runId={id} />} />;
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
        className="text-xs uppercase tracking-widest border border-brand-navy/30 px-4 py-2 hover:bg-brand-navy hover:text-white transition-colors"
      >
        {copied ? "Copiado ✓" : "Copiar link de compartilhamento"}
      </button>
      <input
        readOnly
        value={shareUrl}
        onFocus={(e) => e.currentTarget.select()}
        className="flex-1 min-w-64 max-w-xl border border-brand-navy/20 bg-white px-3 py-2 text-xs font-mono"
      />
      <p className="text-[10px] text-brand-gray basis-full">
        Read-only · sem login · qualquer pessoa com o link vê o resultado. O link é o próprio UUID
        da run (122 bits, não-enumerável). Para revogar, delete a run.
      </p>
    </div>
  );
}
