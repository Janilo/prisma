// Public demo: builds a synthetic dataset, runs the real MMM math, and returns
// a "run"-shaped payload. No auth — safe to expose, no DB writes.
import { createServerFn } from "@tanstack/react-start";
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

function seededRand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function buildSampleDataset() {
  const N = 50;
  const rand = seededRand(42);
  const startDate = new Date("2024-01-01");
  const labels: string[] = [];
  const dates: string[] = [];
  for (let i = 0; i < N; i++) {
    const d = new Date(startDate.getTime() + i * 7 * 86400000);
    const iso = d.toISOString().slice(0, 10);
    dates.push(iso);
    labels.push(iso);
  }

  // Three media channels with realistic patterns
  const google: number[] = [];
  const meta: number[] = [];
  const tv: number[] = [];
  for (let i = 0; i < N; i++) {
    const season = 1 + 0.25 * Math.sin((i / N) * Math.PI * 2);
    google.push(Math.round((12000 + 4000 * Math.sin(i / 6) + (rand() - 0.5) * 3000) * season));
    meta.push(Math.round((8000 + 3000 * Math.cos(i / 5) + (rand() - 0.5) * 2500) * season));
    // TV runs in bursts (4-week flights)
    const burst = Math.floor(i / 4) % 3 === 0 ? 1 : 0.15;
    tv.push(Math.round((30000 * burst + (rand() - 0.5) * 4000) * season));
  }

  // True revenue = base + saturated/adstocked media contributions + noise + weekly seasonality
  const adGoogle = adstock(google, 0.4);
  const adMeta = adstock(meta, 0.3);
  const adTv = adstock(tv, 0.7);
  const satGoogle = hill(adGoogle, 1.2, median(adGoogle));
  const satMeta = hill(adMeta, 1.0, median(adMeta));
  const satTv = hill(adTv, 1.5, median(adTv));

  const revenue: number[] = [];
  for (let i = 0; i < N; i++) {
    const base = 180000;
    const trend = i * 400;
    const season = 20000 * Math.sin((i / N) * Math.PI * 4);
    const mediaY =
      120000 * satGoogle[i] + 80000 * satMeta[i] + 200000 * satTv[i];
    const noise = (rand() - 0.5) * 12000;
    revenue.push(Math.max(0, Math.round(base + trend + season + mediaY + noise)));
  }

  return {
    dates,
    labels,
    revenue,
    channels: {
      "Google Ads": google,
      "Meta Ads": meta,
      "TV Aberta": tv,
    } as Record<string, number[]>,
  };
}

export const getDemoRun = createServerFn({ method: "GET" }).handler(async () => {
  const ds = buildSampleDataset();
  const featureNames = Object.keys(ds.channels);
  const rawColumns = featureNames.map((n) => ds.channels[n]);

  // Transform media: adstock + hill saturation
  const transformed = rawColumns.map((arr) => {
    const ad = adstock(arr, 0.5);
    const med = median(ad) || 1;
    return hill(ad, 1.2, med);
  });

  const n = ds.revenue.length;
  const p = transformed.length;
  const X: Matrix = Array.from({ length: n }, (_, i) =>
    transformed.map((col) => col[i]),
  );
  const fit = ridgeFit({ X, y: ds.revenue, alpha: 1, featureNames });

  const decomposition = ds.labels.map((label, i) => {
    const entry: Record<string, number | string> = { period: label, base: fit.intercept };
    for (let j = 0; j < p; j++) entry[featureNames[j]] = fit.contributions[i][j];
    entry.actual = ds.revenue[i];
    entry.predicted = fit.yPred[i];
    return entry;
  });

  const sumPredicted = fit.yPred.reduce((a, b) => a + b, 0) || 1;
  const baseTotal = fit.intercept * n;
  const totals: {
    variable: string;
    contribution: number;
    share: number;
    pValue: number;
    zStat: number;
    isMedia: boolean;
    spend: number;
    roi: number | null;
  }[] = [];
  totals.push({
    variable: "Base (sazonalidade + intercepto)",
    contribution: baseTotal,
    share: baseTotal / sumPredicted,
    pValue: 0,
    zStat: 0,
    isMedia: false,
    spend: 0,
    roi: null,
  });
  for (let j = 0; j < p; j++) {
    const name = featureNames[j];
    const contrib = fit.contributions.reduce((a, row) => a + row[j], 0);
    const spend = rawColumns[j].reduce((a, b) => a + b, 0);
    totals.push({
      variable: name,
      contribution: contrib,
      share: contrib / sumPredicted,
      pValue: fit.pValues[j],
      zStat: fit.zStats[j],
      isMedia: true,
      spend,
      roi: spend > 0 ? contrib / spend : null,
    });
  }

  const metrics = {
    r2: r2(ds.revenue, fit.yPred),
    mape: mape(ds.revenue, fit.yPred),
    rmse: rmse(ds.revenue, fit.yPred),
    n,
    p,
  };

  return {
    run: {
      id: "demo",
      name: "Demo · 50 semanas · 3 canais",
      dep_variable: "Receita",
      metrics_json: metrics,
      contributions_json: totals,
      roi_json: totals.filter((t) => t.isMedia),
      decomposition_json: decomposition,
      predicted_json: { labels: ds.labels, actual: ds.revenue, predicted: fit.yPred },
      params_json: {
        alpha: 1,
        adstockDecay: 0.5,
        saturationAlpha: 1.2,
        mediaVariables: featureNames,
        dateColumn: "data",
      },
      created_at: new Date().toISOString(),
    },
  };
});
