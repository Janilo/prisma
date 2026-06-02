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
  // Out-of-sample holdout: number of last periods to reserve for validation.
  // 0 = no holdout (train on all data, only in-sample metrics).
  holdoutPeriods: z.number().int().min(0).max(200).default(0),
  // For channels measured in execution units (e.g. GRPs), map the channel column to the
  // column that holds the actual investment. When provided, ROI uses the investment sum
  // instead of summing the execution-unit values.
  spendBasis: z.record(z.string(), z.string()).optional(),

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
      if (ch === '"') {
        if (q && line[i + 1] === '"') { cur += '"'; i++; continue; } // RFC-4180 escaped quote
        q = !q;
        continue;
      }
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

type RunInputType = z.infer<typeof RunInput>;

// Walks the parent_dataset_id chain forward to find the newest version.
// Single query — fetches all user datasets and traverses in memory instead of N+1 round-trips.
async function findLatestVersionId(datasetId: string, userId: string): Promise<{ id: string; version: number }> {
  const { data: allDs } = await supabaseAdmin
    .from("datasets")
    .select("id, version, parent_dataset_id")
    .eq("user_id", userId);
  if (!allDs || allDs.length === 0) return { id: datasetId, version: 1 };
  const childOf = new Map<string, { id: string; version: number }>();
  for (const ds of allDs) {
    if (!ds.parent_dataset_id) continue;
    const prev = childOf.get(ds.parent_dataset_id);
    if (!prev || ds.version > prev.version) childOf.set(ds.parent_dataset_id, { id: ds.id, version: ds.version });
  }
  let cur = datasetId;
  let version = allDs.find((d) => d.id === datasetId)?.version ?? 1;
  for (let i = 0; i < 50; i++) {
    const next = childOf.get(cur);
    if (!next) break;
    cur = next.id;
    version = next.version;
  }
  return { id: cur, version };
}

// Core MMM execution — shared between runMmm and rerunOnLatestVersion.
async function executeMmm(data: RunInputType, userId: string): Promise<{ runId: string }> {
  // Fetch dataset (verify ownership)
  const { data: ds, error: dsErr } = await supabaseAdmin
    .from("datasets")
    .select("*")
    .eq("id", data.datasetId)
    .eq("user_id", userId)
    .maybeSingle();
  if (dsErr || !ds) throw new Error("Dataset não encontrado.");

  const { data: blob, error: dlErr } = await supabaseAdmin.storage
    .from("datasets")
    .download(ds.storage_path);
  if (dlErr || !blob) throw new Error("Não consegui ler o arquivo do dataset.");
  const text = await blob.text();
  const { rows } = parseCSV(text);

  if (rows.length < 8) throw new Error("Poucas linhas para rodar o modelo (mínimo 8).");

  if (rows.length > 0 && !(data.depVariable in rows[0])) {
    const available = Object.keys(rows[0]).join(", ");
    throw new Error(`Coluna dependente "${data.depVariable}" não encontrada. Colunas disponíveis: ${available}.`);
  }
  const y = rows.map((r) => toNumber(r[data.depVariable]));
  const featureNames: string[] = [];
  const rawColumns: number[][] = [];
  for (const col of data.indepVariables) {
    const arr = rows.map((r) => toNumber(r[col]));
    rawColumns.push(arr);
    featureNames.push(col);
  }

  const mediaSet = new Set(data.mediaVariables);
  const spendBasis = data.spendBasis ?? {};

  // Resolve real spend per media channel: use mapped investment column when present,
  // otherwise sum the channel column itself (channels already expressed in money).
  function channelSpendTotal(name: string, fallbackArr: number[]): number {
    const costCol = spendBasis[name];
    if (costCol) {
      return rows.reduce((acc, r) => acc + toNumber(r[costCol]), 0);
    }
    return fallbackArr.reduce((a, b) => a + b, 0);
  }


  // Cache per-channel transform metadata so we can later rebuild response curves.
  const channelMeta: Record<string, { decay: number; k: number; rawSeries: number[]; featureIdx: number }> = {};

  const transformedColumns: number[][] = rawColumns.map((arr, idx) => {
    const name = featureNames[idx];
    if (!mediaSet.has(name)) return arr;
    const decay = data.adstockDecays?.[name] ?? data.adstockDecay;
    const ad = adstock(arr, decay);
    const med = median(ad) || 1;
    channelMeta[name] = { decay, k: med, rawSeries: arr, featureIdx: idx };
    return hill(ad, data.saturationAlpha, med);
  });


  const n = rows.length;
  const p = transformedColumns.length;
  const X: Matrix = Array.from({ length: n }, (_, i) =>
    transformedColumns.map((col) => col[i])
  );

  const fit = ridgeFit({ X, y, alpha: data.alpha, featureNames });

  // ===== Residual bootstrap for confidence intervals (B=200) =====
  // Resample residuals with replacement, refit Ridge, collect contribution & ROI per feature.
  // Provides honest uncertainty bands; complements (and partially mitigates) Ridge's known
  // p-value underestimation.
  const B = n * p > 3000 ? 100 : 200;
  const residualsFit = y.map((v, i) => v - fit.yPred[i]);
  // Mulligan PRNG seeded so CI is reproducible for the same dataset/params.
  let seed = (data.alpha * 1e6 + n * 31 + p) >>> 0 || 1;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  const contribSamples: number[][] = Array.from({ length: p }, () => []);
  const roiSamples: number[][] = Array.from({ length: p }, () => []);
  const channelSpends = featureNames.map((name, j) =>
    mediaSet.has(name) ? channelSpendTotal(name, rawColumns[j]) : 0
  );
  for (let b = 0; b < B; b++) {
    const yb = new Array<number>(n);
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(rand() * n);
      yb[i] = fit.yPred[i] + residualsFit[idx];
    }
    try {
      const fb = ridgeFit({ X, y: yb, alpha: data.alpha, featureNames });
      for (let j = 0; j < p; j++) {
        let c = 0;
        for (let i = 0; i < n; i++) c += fb.contributions[i][j];
        contribSamples[j].push(c);
        if (channelSpends[j] > 0) roiSamples[j].push(c / channelSpends[j]);
      }
    } catch {
      // skip degenerate sample
    }
  }
  function percentile(arr: number[], q: number): number {
    if (arr.length === 0) return NaN;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = (sorted.length - 1) * q;
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  }
  const contribCI = contribSamples.map((s) => ({
    low: percentile(s, 0.05),
    high: percentile(s, 0.95),
  }));
  const roiCI = roiSamples.map((s) =>
    s.length > 0 ? { low: percentile(s, 0.05), high: percentile(s, 0.95) } : null
  );


  const k = Math.min(data.holdoutPeriods, Math.max(0, n - Math.max(8, p + 2)));
  let holdout: { n: number; r2: number; mape: number; rmse: number; labels: string[]; actual: number[]; predicted: number[] } | null = null;
  let trainMetrics: { r2: number; mape: number; rmse: number; n: number } | null = null;
  if (k > 0) {
    const nTrain = n - k;
    const Xtr = X.slice(0, nTrain);
    const ytr = y.slice(0, nTrain);
    const Xte = X.slice(nTrain);
    const yte = y.slice(nTrain);
    const fitTr = ridgeFit({ X: Xtr, y: ytr, alpha: data.alpha, featureNames });
    const yPredTr = fitTr.yPred;
    const yPredTe = Xte.map((row) => {
      let s = fitTr.intercept;
      for (let j = 0; j < p; j++) s += fitTr.beta[j] * row[j];
      return s;
    });
    trainMetrics = { r2: r2(ytr, yPredTr), mape: mape(ytr, yPredTr), rmse: rmse(ytr, yPredTr), n: nTrain };
    holdout = { n: k, r2: r2(yte, yPredTe), mape: mape(yte, yPredTe), rmse: rmse(yte, yPredTe), labels: [], actual: yte, predicted: yPredTe };
  }

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

  const decomposition = labels.map((label, i) => {
    const entry: Record<string, number | string> = { period: label, base: fit.intercept };
    for (let j = 0; j < p; j++) entry[featureNames[j]] = fit.contributions[i][j];
    entry.actual = y[i];
    entry.predicted = fit.yPred[i];
    return entry;
  });

  type CurvePoint = { spend: number; contribution: number };
  type Total = {
    variable: string; contribution: number; share: number; pValue: number; zStat: number;
    isMedia: boolean; spend: number; roi: number | null; curve?: CurvePoint[];
    contribLow?: number; contribHigh?: number;
    roiLow?: number | null; roiHigh?: number | null;
  };
  const totals: Total[] = [];
  const sumPredicted = fit.yPred.reduce((a, b) => a + b, 0) || 1;
  const baseTotal = fit.intercept * n;
  totals.push({ variable: "Base (sazonalidade + intercepto)", contribution: baseTotal, share: baseTotal / sumPredicted, pValue: 0, zStat: 0, isMedia: false, spend: 0, roi: null });

  // Response curve factors: 0 → 1.5× current spend, 16 points.
  const curveFactors = Array.from({ length: 16 }, (_, i) => (i / 10)); // 0, 0.1, ..., 1.5

  for (let j = 0; j < p; j++) {
    const name = featureNames[j];
    const contrib = fit.contributions.reduce((a, row) => a + row[j], 0);
    const isMedia = mediaSet.has(name);
    const spend = isMedia ? channelSpendTotal(name, rawColumns[j]) : 0;

    let curve: CurvePoint[] | undefined;
    if (isMedia && channelMeta[name]) {
      const { decay, k, rawSeries } = channelMeta[name];
      const beta = fit.beta[j];
      curve = curveFactors.map((f) => {
        const scaled = rawSeries.map((v) => v * f);
        const ad = adstock(scaled, decay);
        const hs = hill(ad, data.saturationAlpha, k);
        const c = hs.reduce((a, v) => a + v * beta, 0);
        const s = scaled.reduce((a, v) => a + v, 0);
        return { spend: s, contribution: c };
      });
    }

    totals.push({
      variable: name,
      contribution: contrib,
      share: contrib / sumPredicted,
      pValue: fit.pValues[j],
      zStat: fit.zStats[j],
      isMedia,
      spend,
      roi: spend > 0 ? contrib / spend : null,
      contribLow: contribCI[j].low,
      contribHigh: contribCI[j].high,
      roiLow: roiCI[j]?.low ?? null,
      roiHigh: roiCI[j]?.high ?? null,
      ...(curve ? { curve } : {}),
    });
  }



  if (holdout) holdout.labels = labels.slice(n - holdout.n);

  const metrics = {
    r2: r2(y, fit.yPred),
    mape: mape(y, fit.yPred),
    rmse: rmse(y, fit.yPred),
    n,
    p,
    holdoutPeriods: k,
    train: trainMetrics,
    holdout: holdout ? { n: holdout.n, r2: holdout.r2, mape: holdout.mape, rmse: holdout.rmse } : null,
  };

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
        adstockDecays: data.adstockDecays ?? null,
        spendBasis: data.spendBasis ?? null,

        saturationAlpha: data.saturationAlpha,
        mediaVariables: data.mediaVariables,
        dateColumn: data.dateColumn,
        holdoutPeriods: k,
      },
      metrics_json: metrics,
      contributions_json: totals,
      roi_json: totals.filter((t) => t.isMedia),
      decomposition_json: decomposition,
      predicted_json: {
        labels,
        actual: y,
        predicted: fit.yPred,
        holdout: holdout
          ? { labels: holdout.labels, actual: holdout.actual, predicted: holdout.predicted }
          : null,
      },
      finished_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (insErr || !runRow) { console.error("runMmm insert failed:", insErr); throw new Error("Falha ao salvar run. Tente novamente."); }
  return { runId: runRow.id as string };
}

export const runMmm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RunInput.parse(input))
  .handler(async ({ data, context }) => executeMmm(data, context.userId));

// Re-execute an existing run against the newest version of its dataset.
// Keeps the original run intact; creates a fresh run with the same parameters.
export const rerunOnLatestVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ runId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: run, error: runErr } = await supabaseAdmin
      .from("runs")
      .select("*")
      .eq("id", data.runId)
      .eq("user_id", userId)
      .maybeSingle();
    if (runErr || !run) throw new Error("Run não encontrado.");
    const latest = await findLatestVersionId(run.dataset_id, userId);
    if (latest.id === run.dataset_id) {
      throw new Error("Este run já está na versão mais nova do dataset.");
    }
    const params = (run.params_json ?? {}) as {
      alpha?: number;
      adstockDecay?: number;
      adstockDecays?: Record<string, number> | null;
      saturationAlpha?: number;
      mediaVariables?: string[];
      dateColumn?: string | null;
      holdoutPeriods?: number;
      spendBasis?: Record<string, string> | null;
    };
    const input: RunInputType = RunInput.parse({
      datasetId: latest.id,
      name: `${run.name} · v${latest.version}`,
      depVariable: run.dep_variable,
      indepVariables: run.indep_variables_json,
      mediaVariables: params.mediaVariables ?? [],
      dateColumn: params.dateColumn ?? null,
      alpha: params.alpha ?? 1,
      adstockDecay: params.adstockDecay ?? 0.5,
      adstockDecays: params.adstockDecays ?? undefined,
      saturationAlpha: params.saturationAlpha ?? 1,
      holdoutPeriods: params.holdoutPeriods ?? 0,
      spendBasis: params.spendBasis ?? undefined,
    });


    return executeMmm(input, userId);
  });

// Returns id + version of the latest dataset in a chain. Used by the Run page
// to show "Re-executar na versão mais nova" only when there IS a newer version.
export const getLatestDatasetVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ datasetId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    return findLatestVersionId(data.datasetId, context.userId);
  });

// List datasets for the current user
export const listDatasets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("datasets")
      .select("id, name, original_filename, n_rows, n_cols, granularity, period_start, period_end, created_at, parent_dataset_id, version")
      .order("created_at", { ascending: false });
    if (error) { console.error("listDatasets failed:", error); throw new Error("Falha ao carregar datasets."); }
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
    if (error) { console.error("listRuns failed:", error); throw new Error("Falha ao carregar rodadas."); }
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


// Public read-only access to a single run. The UUID itself is the access token —
// unguessable (122 bits of entropy) and the response strips user_id and ownership info.
// Anyone with the link can view the run; no login required.
export const getPublicRun = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: run, error } = await supabaseAdmin
      .from("runs")
      .select(
        "id, name, status, dep_variable, indep_variables_json, params_json, metrics_json, contributions_json, roi_json, decomposition_json, predicted_json, created_at, finished_at",
      )
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

// Save the dataset's "execution unit -> investment column" mapping.
// Used by Explore to compute CPP and by Model to derive ROI on real spend.
export const updateUnitCosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid(),
      mappings: z.record(z.string().min(1).max(200), z.string().min(1).max(200)),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("datasets")
      .update({ unit_costs_json: data.mappings })
      .eq("id", data.id);
    if (error) { console.error("updateUnitCosts failed:", error); throw new Error("Falha ao salvar. Tente novamente."); }
    return { ok: true };
  });

