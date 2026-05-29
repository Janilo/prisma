// Server functions for datasets and MMM runs.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  adstock,
  hill,
  mape,
  median,
  r2,
  ridgeFit,
  rmse,
  type Matrix,
} from "./mmm.server";

const RunInput = z.object({
  datasetId: z.string().uuid(),
  name: z.string().min(1).max(120),
  depVariable: z.string().min(1).max(200),
  indepVariables: z.array(z.string().min(1).max(200)).min(1).max(30),
  mediaVariables: z.array(z.string()).max(30).default([]),
  dateColumn: z.string().nullable().optional(),
  alpha: z.number().min(0).max(1000).default(1),
  adstockDecay: z.number().min(0).max(0.95).default(0.5),
  // Per-channel adstock decay (overrides global adstockDecay for those keys).
  // TV ~0.6–0.8 (carryover de semanas), Google paid ~0.0–0.2, Meta ~0.2–0.4.
  adstockDecays: z.record(z.string(), z.number().min(0).max(0.95)).optional(),
  saturationAlpha: z.number().min(0.5).max(3).default(1),
});


function toNumber(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseCSV(text: string): { columns: string[]; rows: Record<string, unknown>[] } {
  // Lightweight CSV parser. We round-trip uploaded data via JSON in the dataset blob,
  // so this is mostly a fallback if a raw CSV ends up in storage.
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return { columns: [], rows: [] };
  const split = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { q = !q; continue; }
      if (ch === "," && !q) { out.push(cur); cur = ""; continue; }
      cur += ch;
    }
    out.push(cur);
    return out;
  };
  const columns = split(lines[0]);
  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = split(lines[i]);
    const row: Record<string, unknown> = {};
    columns.forEach((c, idx) => {
      const raw = parts[idx];
      const n = Number(raw);
      row[c] = raw === "" || raw === undefined ? null : Number.isFinite(n) && raw !== "" ? n : raw;
    });
    rows.push(row);
  }
  return { columns, rows };
}

export const runMmm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RunInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Fetch dataset (verify ownership)
    const { data: ds, error: dsErr } = await supabaseAdmin
      .from("datasets")
      .select("*")
      .eq("id", data.datasetId)
      .eq("user_id", userId)
      .maybeSingle();
    if (dsErr || !ds) throw new Error("Dataset não encontrado.");

    // Download CSV from storage
    const { data: blob, error: dlErr } = await supabaseAdmin.storage
      .from("datasets")
      .download(ds.storage_path);
    if (dlErr || !blob) throw new Error("Não consegui ler o arquivo do dataset.");
    const text = await blob.text();
    const { rows } = parseCSV(text);

    if (rows.length < 8) throw new Error("Poucas linhas para rodar o modelo (mínimo 8).");

    // Build y
    const y = rows.map((r) => toNumber(r[data.depVariable]));
    // Build raw X
    const featureNames: string[] = [];
    const rawColumns: number[][] = [];
    for (const col of data.indepVariables) {
      const arr = rows.map((r) => toNumber(r[col]));
      rawColumns.push(arr);
      featureNames.push(col);
    }

    const mediaSet = new Set(data.mediaVariables);

    // Apply adstock + saturation to media columns (per-channel decay when provided)
    const transformedColumns: number[][] = rawColumns.map((arr, idx) => {
      const name = featureNames[idx];
      if (!mediaSet.has(name)) return arr;
      const decay = data.adstockDecays?.[name] ?? data.adstockDecay;
      const ad = adstock(arr, decay);
      const med = median(ad) || 1;
      return hill(ad, data.saturationAlpha, med);
    });

    // Assemble X (n × p)
    const n = rows.length;
    const p = transformedColumns.length;
    const X: Matrix = Array.from({ length: n }, (_, i) =>
      transformedColumns.map((col) => col[i])
    );

    // Fit Ridge
    const fit = ridgeFit({ X, y, alpha: data.alpha, featureNames });

    // Build date/index labels
    let labels: string[] = [];
    if (data.dateColumn) {
      labels = rows.map((r) => {
        const v = r[data.dateColumn as string];
        const d = new Date(String(v));
        return isNaN(d.getTime()) ? String(v ?? "") : d.toISOString().slice(0, 10);
      });
    } else {
      labels = rows.map((_, i) => `t${i + 1}`);
    }

    // Decomposition: per-period stacked contributions { period, base, [feature]: value, total }
    const decomposition = labels.map((label, i) => {
      const entry: Record<string, number | string> = { period: label, base: fit.intercept };
      for (let j = 0; j < p; j++) {
        entry[featureNames[j]] = fit.contributions[i][j];
      }
      entry.actual = y[i];
      entry.predicted = fit.yPred[i];
      return entry;
    });

    // Total contribution per feature (and ROI for media)
    const totals: { variable: string; contribution: number; share: number; pValue: number; zStat: number; isMedia: boolean; spend: number; roi: number | null }[] = [];
    const sumPredicted = fit.yPred.reduce((a, b) => a + b, 0) || 1;
    const baseTotal = fit.intercept * n;
    totals.push({ variable: "Base (sazonalidade + intercepto)", contribution: baseTotal, share: baseTotal / sumPredicted, pValue: 0, zStat: 0, isMedia: false, spend: 0, roi: null });
    for (let j = 0; j < p; j++) {
      const name = featureNames[j];
      const contrib = fit.contributions.reduce((a, row) => a + row[j], 0);
      const spend = mediaSet.has(name) ? rawColumns[j].reduce((a, b) => a + b, 0) : 0;
      totals.push({
        variable: name,
        contribution: contrib,
        share: contrib / sumPredicted,
        pValue: fit.pValues[j],
        zStat: fit.zStats[j],
        isMedia: mediaSet.has(name),
        spend,
        roi: spend > 0 ? contrib / spend : null,
      });
    }

    const metrics = {
      r2: r2(y, fit.yPred),
      mape: mape(y, fit.yPred),
      rmse: rmse(y, fit.yPred),
      n,
      p,
    };

    // Persist run
    const { data: runRow, error: insErr } = await supabaseAdmin
      .from("runs")
      .insert({
        user_id: userId,
        dataset_id: data.datasetId,
        name: data.name,
        status: "done",
        dep_variable: data.depVariable,
        indep_variables_json: data.indepVariables,
        params_json: {
          alpha: data.alpha,
          adstockDecay: data.adstockDecay,
          saturationAlpha: data.saturationAlpha,
          mediaVariables: data.mediaVariables,
          dateColumn: data.dateColumn,
        },
        metrics_json: metrics,
        contributions_json: totals,
        roi_json: totals.filter((t) => t.isMedia),
        decomposition_json: decomposition,
        predicted_json: { labels, actual: y, predicted: fit.yPred },
        finished_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (insErr || !runRow) throw new Error(insErr?.message ?? "Falha ao salvar run.");

    return { runId: runRow.id as string };
  });

// List datasets for the current user
export const listDatasets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("datasets")
      .select("id, name, original_filename, n_rows, n_cols, granularity, period_start, period_end, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { datasets: data ?? [] };
  });

// List runs for the current user
export const listRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("runs")
      .select("id, name, status, dep_variable, metrics_json, created_at, dataset_id")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { runs: data ?? [] };
  });

// Get a single run
export const getRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: run, error } = await supabase
      .from("runs")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !run) throw new Error("Run não encontrado.");
    return { run };
  });

// Get a single dataset
export const getDataset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: ds, error } = await supabase
      .from("datasets")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !ds) throw new Error("Dataset não encontrado.");
    return { dataset: ds };
  });
