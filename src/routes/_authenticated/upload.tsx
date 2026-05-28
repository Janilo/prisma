import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type ChangeEvent } from "react";
import Papa from "papaparse";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  parseFile,
  analyzeColumns,
  guessDependentVariable,
  guessIndependentVariables,
  detectDateColumn,
  detectGranularity,
} from "@/lib/parse";

export const Route = createFileRoute("/_authenticated/upload")({
  component: UploadPage,
});

function UploadPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setStatus("Lendo arquivo...");
    try {
      const parsed = await parseFile(file);
      if (parsed.rows.length < 8) throw new Error("Planilha precisa ter ao menos 8 linhas.");
      setStatus("Analisando colunas...");
      const cols = analyzeColumns(parsed.rows, parsed.columns);
      const dateCol = detectDateColumn(cols);
      const dep = guessDependentVariable(cols);
      const indep = guessIndependentVariables(cols, dep);
      const granularity = detectGranularity(parsed.rows, dateCol);

      // Coerce dates to ISO strings for CSV serialization
      const rowsForCsv = parsed.rows.map((r) => {
        const out: Record<string, unknown> = {};
        for (const k of parsed.columns) {
          const v = r[k];
          if (v instanceof Date) out[k] = v.toISOString().slice(0, 10);
          else out[k] = v;
        }
        return out;
      });

      setStatus("Enviando para o backend...");
      const csv = Papa.unparse(rowsForCsv, { columns: parsed.columns });
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user!.id;
      const storagePath = `${uid}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}.csv`;
      const { error: upErr } = await supabase.storage
        .from("datasets")
        .upload(storagePath, new Blob([csv], { type: "text/csv" }), { upsert: false });
      if (upErr) throw upErr;

      const periods = dateCol
        ? rowsForCsv.map((r) => String(r[dateCol] ?? "")).filter(Boolean).sort()
        : [];

      const { data: ds, error: insErr } = await supabase
        .from("datasets")
        .insert({
          user_id: uid,
          name: file.name.replace(/\.[^.]+$/, ""),
          original_filename: file.name,
          storage_path: storagePath,
          n_rows: parsed.rows.length,
          n_cols: parsed.columns.length,
          columns_json: cols as unknown as never,
          period_start: periods[0] ?? null,
          period_end: periods[periods.length - 1] ?? null,
          granularity,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;

      toast.success("Dataset carregado.");
      navigate({
        to: "/datasets/$id",
        params: { id: ds.id },
        search: {
          dep: dep ?? undefined,
          indep: indep.join(",") || undefined,
          date: dateCol ?? undefined,
        },
      });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Falha ao processar o arquivo.");
      setBusy(false);
      setStatus("");
    }
  };

  return (
    <div className="p-12 max-w-3xl">
      <p className="eyebrow">01 — Dados</p>
      <h1 className="mt-2 font-display text-4xl font-light italic text-brand-navy">
        Suba sua planilha de vendas e gastos
      </h1>
      <p className="mt-4 text-sm text-brand-navy/70 max-w-xl">
        Aceita CSV ou XLSX. Cada linha = um período (semana ou mês). Cada coluna = uma variável
        (vendas, gasto em TV, gasto em Google, preço, promoção etc.). Prisma detecta data,
        variável dependente e candidatos a variáveis explicativas automaticamente.
      </p>

      <label className="mt-12 block border hairline-strong border-dashed bg-white p-12 cursor-pointer hover:bg-brand-creme transition-colors">
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={onFile}
          disabled={busy}
        />
        <div className="text-center space-y-2">
          <p className="font-display text-2xl text-brand-navy">
            {busy ? status || "Processando..." : "Selecionar arquivo"}
          </p>
          <p className="text-xs text-brand-gray uppercase tracking-widest">
            CSV ou XLSX · até 10 MB
          </p>
        </div>
      </label>

      <div className="mt-12 grid grid-cols-3 gap-px bg-brand-navy/10 border hairline">
        {[
          { n: "1", t: "Suba", d: "Planilha com data, vendas e gastos por canal." },
          { n: "2", t: "Diagnostique", d: "Veja colunas detectadas, missings e outliers." },
          { n: "3", t: "Rode", d: "Ridge + adstock + Hill. ROI por canal sai do outro lado." },
        ].map((s) => (
          <div key={s.n} className="bg-brand-creme p-6">
            <p className="font-display text-xs text-brand-mustard">{s.n}</p>
            <p className="font-display text-lg text-brand-navy mt-1">{s.t}</p>
            <p className="text-xs text-brand-navy/60 mt-2 leading-relaxed">{s.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
