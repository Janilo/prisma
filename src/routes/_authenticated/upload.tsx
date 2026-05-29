import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState, type ChangeEvent } from "react";

import Papa from "papaparse";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { listDatasets } from "@/lib/mmm.functions";
import {
  parseFile,
  analyzeColumns,
  guessDependentVariable,
  guessIndependentVariables,
  detectDateColumn,
  detectGranularity,
} from "@/lib/parse";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({
    meta: [
      { title: "Upload de dados · Prisma" },
      { name: "description", content: "Suba uma planilha CSV ou XLSX com vendas e gastos por canal. Prisma detecta data, dependente e variáveis explicativas automaticamente." },
      { property: "og:title", content: "Importação de dados MMM" },
      { property: "og:description", content: "Suba CSV ou XLSX no Prisma e rode Marketing Mix Modeling sem montar pipeline." },
      { property: "og:url", content: "https://prisma.pereirasaraiva.com/upload" },
      { name: "robots", content: "noindex" },
    ],
    links: [
      { rel: "canonical", href: "https://prisma.pereirasaraiva.com/upload" },
    ],
  }),
  component: UploadPage,
});

function buildSampleCsv(): { csv: string; filename: string; nRows: number; nCols: number; periodStart: string; periodEnd: string } {
  const N = 50;
  let s = 42 >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  const rows: Record<string, string | number>[] = [];
  const start = new Date("2024-01-01").getTime();
  for (let i = 0; i < N; i++) {
    const d = new Date(start + i * 7 * 86400000).toISOString().slice(0, 10);
    const season = 1 + 0.25 * Math.sin((i / N) * Math.PI * 2);
    const google = Math.round((12000 + 4000 * Math.sin(i / 6) + (rand() - 0.5) * 3000) * season);
    const meta = Math.round((8000 + 3000 * Math.cos(i / 5) + (rand() - 0.5) * 2500) * season);
    const burst = Math.floor(i / 4) % 3 === 0 ? 1 : 0.15;
    const tv = Math.round((30000 * burst + (rand() - 0.5) * 4000) * season);
    // revenue with adstock-like memory + saturation approximated
    const trend = i * 400;
    const seasonY = 20000 * Math.sin((i / N) * Math.PI * 4);
    const mediaY = 3.2 * google + 2.1 * meta + 1.4 * tv;
    const noise = (rand() - 0.5) * 12000;
    const revenue = Math.max(0, Math.round(180000 + trend + seasonY + mediaY + noise));
    rows.push({ data: d, receita: revenue, google_ads: google, meta_ads: meta, tv_aberta: tv });
  }
  const csv = Papa.unparse(rows, { columns: ["data", "receita", "google_ads", "meta_ads", "tv_aberta"] });
  return {
    csv,
    filename: "exemplo-mmm-50-semanas.csv",
    nRows: N,
    nCols: 5,
    periodStart: String(rows[0].data),
    periodEnd: String(rows[N - 1].data),
  };
}

function UploadPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [versionTarget, setVersionTarget] = useState<{ id: string; name: string; nextVersion: number } | null>(null);
  const listFn = useServerFn(listDatasets);
  const { data: dsList, refetch } = useQuery({
    queryKey: ["datasets"],
    queryFn: () => listFn(),
  });

  const ingestCsv = async (
    csv: string,
    filename: string,
    parent?: { id: string; nextVersion: number; name: string },
  ) => {
    setStatus("Analisando colunas...");
    const parsed = Papa.parse<Record<string, unknown>>(csv, { header: true, dynamicTyping: true, skipEmptyLines: true });
    const columns = parsed.meta.fields ?? [];
    const cols = analyzeColumns(parsed.data, columns);
    const dateCol = detectDateColumn(cols);
    const granularity = detectGranularity(parsed.data, dateCol);

    setStatus("Enviando para o backend...");
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user!.id;
    const storagePath = `${uid}/${Date.now()}-${filename.replace(/[^\w.-]/g, "_")}`;
    const { error: upErr } = await supabase.storage
      .from("datasets")
      .upload(storagePath, new Blob([csv], { type: "text/csv" }), { upsert: false });
    if (upErr) throw upErr;

    const periods = dateCol
      ? parsed.data.map((r) => String(r[dateCol] ?? "")).filter(Boolean).sort()
      : [];

    const datasetName = parent
      ? `${parent.name} · v${parent.nextVersion}`
      : filename.replace(/\.[^.]+$/, "");

    const { data: ds, error: insErr } = await supabase
      .from("datasets")
      .insert({
        user_id: uid,
        name: datasetName,
        original_filename: filename,
        storage_path: storagePath,
        n_rows: parsed.data.length,
        n_cols: columns.length,
        columns_json: cols as unknown as never,
        period_start: periods[0] ?? null,
        period_end: periods[periods.length - 1] ?? null,
        granularity,
        parent_dataset_id: parent?.id ?? null,
        version: parent?.nextVersion ?? 1,
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    void refetch();
    return ds.id as string;
  };

  const processFile = async (file: File, parent?: { id: string; nextVersion: number; name: string }) => {
    setBusy(true);
    setStatus("Lendo arquivo...");
    try {
      const parsed = await parseFile(file);
      if (parsed.rows.length < 8) throw new Error("Planilha precisa ter ao menos 8 linhas.");
      const rowsForCsv = parsed.rows.map((r) => {
        const out: Record<string, unknown> = {};
        for (const k of parsed.columns) {
          const v = r[k];
          if (v instanceof Date) out[k] = v.toISOString().slice(0, 10);
          else out[k] = v;
        }
        return out;
      });
      const csv = Papa.unparse(rowsForCsv, { columns: parsed.columns });
      const id = await ingestCsv(csv, file.name, parent);
      toast.success(parent ? `Nova versão (v${parent.nextVersion}) carregada.` : "Dataset carregado. Gerando análise...");
      navigate({ to: "/datasets/$id/explore", params: { id } });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Falha ao processar o arquivo.");
      setBusy(false);
      setStatus("");
      setVersionTarget(null);
    }
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const onVersionFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !versionTarget) return;
    const target = versionTarget;
    setVersionTarget(null);
    await processFile(file, target);
    e.target.value = "";
  };

  const onLoadExample = async () => {
    setBusy(true);
    setStatus("Gerando dataset de exemplo...");
    try {
      const sample = buildSampleCsv();
      const id = await ingestCsv(sample.csv, sample.filename);
      toast.success("Exemplo carregado. Explore os dados sintéticos.");
      navigate({ to: "/datasets/$id/explore", params: { id } });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Falha ao carregar exemplo.");
      setBusy(false);
      setStatus("");
    }
  };

  const datasets = dsList?.datasets ?? [];

  // Compute "latest version per family" — a dataset has a newer version
  // iff some other dataset has parent_dataset_id === this.id.
  const hasChildren = useMemo(() => {
    const s = new Set<string>();
    for (const d of datasets) {
      if (d.parent_dataset_id) s.add(d.parent_dataset_id);
    }
    return s;
  }, [datasets]);





  return (
    <div className="p-12 max-w-5xl">
      <p className="eyebrow">01 — Dados</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-brand-navy">
        Suba sua planilha de vendas e gastos
      </h1>
      <p className="mt-4 text-sm text-brand-navy/70 max-w-xl">
        Aceita CSV ou XLSX. Cada linha = um período (semana ou mês). Cada coluna = uma variável
        (vendas, gasto em TV, gasto em Google, preço, promoção etc.). Prisma detecta data,
        variável dependente e candidatos a variáveis explicativas automaticamente.
      </p>

      <section className="mt-12" aria-labelledby="suba-heading">
        <h2 id="suba-heading" className="eyebrow">Suba seus dados</h2>
        <label className="mt-3 block border hairline-strong border-dashed bg-white p-12 cursor-pointer hover:bg-brand-creme transition-colors">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={onFile}
            disabled={busy}
          />
          <div className="text-center space-y-2">
            <p className="text-xl font-semibold text-brand-navy">
              {busy ? status || "Processando..." : "Selecionar arquivo"}
            </p>
            <p className="text-xs text-brand-gray uppercase tracking-widest">
              CSV ou XLSX · até 10 MB
            </p>
          </div>
        </label>
        <div className="mt-4 flex items-center gap-3 text-xs text-brand-navy/70">
          <span>Sem CSV em mãos?</span>
          <button
            type="button"
            onClick={onLoadExample}
            disabled={busy}
            className="uppercase tracking-widest border border-brand-navy/30 px-3 py-1.5 hover:bg-brand-navy hover:text-white transition-colors disabled:opacity-40"
          >
            Carregar dataset de exemplo
          </button>
          <span className="text-brand-gray">50 semanas · 3 canais · sintético</span>
        </div>
      </section>


      <section className="mt-12" aria-labelledby="carregados-heading">
        <h2 id="carregados-heading" className="eyebrow">Seus dados carregados</h2>
        {datasets.length === 0 ? (
          <p className="mt-4 text-sm text-brand-navy/60">Nenhum dataset ainda.</p>
        ) : (
          <table className="mt-4 w-full text-sm border-collapse [&_th]:px-4 [&_td]:px-4 [&_th:first-child]:pl-0 [&_td:first-child]:pl-0 [&_th:last-child]:pr-0 [&_td:last-child]:pr-0">
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
              {datasets.map((d) => {
                const hasNewer = hasChildren.has(d.id);
                const baseName = d.name.replace(/ · v\d+$/, "");
                return (
                  <tr key={d.id} className="border-b hairline hover:bg-brand-creme/50">
                    <td className="py-4 font-semibold text-brand-navy">
                      {d.name}
                      {(d.version > 1 || hasNewer) && (
                        <span className="ml-2 text-[10px] font-mono uppercase tracking-widest text-brand-mustard align-middle">
                          v{d.version}
                          {hasNewer && <span className="ml-1 text-brand-gray">(superado)</span>}
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-brand-navy/70">{d.granularity ?? "—"}</td>
                    <td className="py-4 text-right font-mono text-xs">{d.n_rows}</td>
                    <td className="py-4 text-right font-mono text-xs">{d.n_cols}</td>
                    <td className="py-4 pl-4 text-xs text-brand-navy/70 font-mono">
                      {d.period_start ?? "?"} → {d.period_end ?? "?"}
                    </td>
                    <td className="py-4 text-right whitespace-nowrap">
                      {!hasNewer && (
                        <button
                          type="button"
                          onClick={() => setVersionTarget({ id: d.id, name: baseName, nextVersion: d.version + 1 })}
                          disabled={busy}
                          className="mr-4 text-[10px] uppercase tracking-widest text-brand-navy/60 hover:text-brand-purple disabled:opacity-40"
                          title="Subir uma planilha atualizada como nova versão"
                        >
                          Nova versão
                        </button>
                      )}
                      <Link
                        to="/datasets/$id/explore"
                        params={{ id: d.id }}
                        className="text-xs uppercase tracking-widest border-b border-brand-mustard pb-0.5 text-brand-navy hover:text-brand-purple"
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {versionTarget && (
          <div className="mt-4 border hairline-strong bg-brand-creme p-4 flex items-center justify-between gap-4">
            <p className="text-xs text-brand-navy/80">
              Nova versão de <strong>{versionTarget.name}</strong> — selecione a planilha atualizada (será salva como <span className="font-mono">v{versionTarget.nextVersion}</span>).
              Runs antigos ficam intactos; você poderá re-executá-los nesta versão.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <label className="text-xs uppercase tracking-widest border border-brand-navy/30 px-3 py-1.5 hover:bg-brand-navy hover:text-white transition-colors cursor-pointer">
                <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onVersionFile} disabled={busy} />
                Escolher arquivo
              </label>
              <button
                type="button"
                onClick={() => setVersionTarget(null)}
                className="text-[10px] uppercase tracking-widest text-brand-navy/60 hover:text-brand-navy"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>


      <section className="mt-12" aria-labelledby="como-heading">
        <h2 id="como-heading" className="eyebrow">Como funciona</h2>
        <div className="mt-3 grid grid-cols-3 gap-px bg-brand-navy/10 border hairline">
        {[
          { n: "1", t: "Suba", d: "Planilha com data, vendas e gastos por canal." },
          { n: "2", t: "Diagnostique", d: "Veja colunas detectadas, missings e outliers." },
          { n: "3", t: "Rode", d: "Ridge + adstock + Hill. ROI por canal sai do outro lado." },
        ].map((s) => (
          <div key={s.n} className="bg-brand-creme p-6">
            <p className="text-xs font-bold text-brand-mustard uppercase tracking-widest">{s.n}</p>
            <p className="text-base font-semibold text-brand-navy mt-1">{s.t}</p>
            <p className="text-xs text-brand-navy/60 mt-2 leading-relaxed">{s.d}</p>
          </div>
        ))}
        </div>
      </section>
    </div>
  );
}
