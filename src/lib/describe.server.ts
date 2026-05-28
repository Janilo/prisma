// Pure descriptive stats for an uploaded dataset.
// Runs server-side; no AI calls here.

export type RawRow = Record<string, unknown>;

export interface ColumnStat {
  name: string;
  kind: "number" | "date" | "string";
  count: number;
  missingPct: number;
  uniqueCount: number;
  // numeric
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  std?: number;
  zeroPct?: number;
  skew?: number;
  outliers?: number;
  sparkline?: number[];
}

export interface Correlation {
  variable: string;
  r: number;
}

export interface SeasonalityBucket {
  label: string;
  mean: number;
  count: number;
}

export interface DatasetSummary {
  overview: {
    nRows: number;
    nCols: number;
    granularity: string | null;
    periodStart: string | null;
    periodEnd: string | null;
    dateColumn: string | null;
    focusVariable: string | null;
  };
  columns: ColumnStat[];
  timeSeries: { period: string; value: number; movingAvg: number | null }[];
  trend: { slopePerPeriod: number; pctChangeOverWindow: number } | null;
  correlations: Correlation[];
  seasonality: { kind: "month" | "weekday" | null; buckets: SeasonalityBucket[] };
}

function toNum(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const v = arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(v);
}
function skewness(arr: number[]): number {
  if (arr.length < 3) return 0;
  const m = mean(arr);
  const s = std(arr) || 1;
  const n = arr.length;
  return (n / ((n - 1) * (n - 2))) * arr.reduce((a, b) => a + ((b - m) / s) ** 3, 0);
}
function pearson(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;
  const mx = mean(x);
  const my = mean(y);
  let num = 0,
    dx = 0,
    dy = 0;
  for (let i = 0; i < n; i++) {
    const a = x[i] - mx;
    const b = y[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
}

function detectKind(values: unknown[]): "number" | "date" | "string" {
  let nums = 0;
  let dates = 0;
  let nonNull = 0;
  for (const v of values) {
    if (v === null || v === undefined || v === "") continue;
    nonNull++;
    if (typeof v === "number" && Number.isFinite(v)) nums++;
    else {
      const n = Number(v);
      if (Number.isFinite(n) && String(v).trim() !== "") nums++;
      else if (!isNaN(new Date(String(v)).getTime()) && /\d{2,4}[-/]\d{1,2}/.test(String(v)))
        dates++;
    }
  }
  if (nonNull === 0) return "string";
  if (nums / nonNull > 0.8) return "number";
  if (dates / nonNull > 0.8) return "date";
  return "string";
}

function sparkline(arr: number[], buckets = 20): number[] {
  if (arr.length <= buckets) return arr;
  const out: number[] = [];
  const size = arr.length / buckets;
  for (let i = 0; i < buckets; i++) {
    const s = Math.floor(i * size);
    const e = Math.floor((i + 1) * size);
    out.push(mean(arr.slice(s, e)));
  }
  return out;
}

export function summarizeDataset(
  rows: RawRow[],
  columnNames: string[],
  opts: {
    dateColumn?: string | null;
    focusVariable?: string | null;
    granularity?: string | null;
  } = {},
): DatasetSummary {
  const n = rows.length;
  const columns: ColumnStat[] = [];
  const numericData: Record<string, number[]> = {};

  for (const name of columnNames) {
    const raw = rows.map((r) => r[name]);
    const kind = detectKind(raw);
    const missing = raw.filter((v) => v === null || v === undefined || v === "").length;
    const uniq = new Set(raw.map((v) => String(v))).size;

    if (kind === "number") {
      const arr = raw.map(toNum).filter((v): v is number => v !== null);
      numericData[name] = arr;
      const m = mean(arr);
      const s = std(arr);
      const zeros = arr.filter((v) => v === 0).length;
      // IQR outliers
      const sorted = [...arr].sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length * 0.25)] ?? 0;
      const q3 = sorted[Math.floor(sorted.length * 0.75)] ?? 0;
      const iqr = q3 - q1;
      const lo = q1 - 1.5 * iqr;
      const hi = q3 + 1.5 * iqr;
      const outliers = arr.filter((v) => v < lo || v > hi).length;

      columns.push({
        name,
        kind,
        count: arr.length,
        missingPct: n ? missing / n : 0,
        uniqueCount: uniq,
        min: arr.length ? Math.min(...arr) : 0,
        max: arr.length ? Math.max(...arr) : 0,
        mean: m,
        median: median(arr),
        std: s,
        zeroPct: arr.length ? zeros / arr.length : 0,
        skew: skewness(arr),
        outliers,
        sparkline: sparkline(arr),
      });
    } else {
      columns.push({
        name,
        kind,
        count: n - missing,
        missingPct: n ? missing / n : 0,
        uniqueCount: uniq,
      });
    }
  }

  // Time series for focus var
  const dateCol = opts.dateColumn ?? null;
  const focus = opts.focusVariable ?? null;
  let labels: string[] = [];
  if (dateCol) {
    labels = rows.map((r) => {
      const v = r[dateCol];
      const d = new Date(String(v));
      return isNaN(d.getTime()) ? String(v ?? "") : d.toISOString().slice(0, 10);
    });
  } else {
    labels = rows.map((_, i) => `t${i + 1}`);
  }

  const timeSeries: { period: string; value: number; movingAvg: number | null }[] = [];
  if (focus && numericData[focus]) {
    const arr = numericData[focus];
    const win = 4;
    for (let i = 0; i < arr.length; i++) {
      const slice = arr.slice(Math.max(0, i - win + 1), i + 1);
      timeSeries.push({
        period: labels[i] ?? `t${i + 1}`,
        value: arr[i],
        movingAvg: slice.length === win ? mean(slice) : null,
      });
    }
  }

  // Trend (simple linear regression on focus)
  let trend: DatasetSummary["trend"] = null;
  if (focus && numericData[focus] && numericData[focus].length >= 4) {
    const y = numericData[focus];
    const xs = y.map((_, i) => i);
    const mx = mean(xs);
    const my = mean(y);
    let num = 0,
      den = 0;
    for (let i = 0; i < y.length; i++) {
      num += (xs[i] - mx) * (y[i] - my);
      den += (xs[i] - mx) ** 2;
    }
    const slope = den === 0 ? 0 : num / den;
    const first = y[0] || 1;
    const last = y[y.length - 1];
    trend = { slopePerPeriod: slope, pctChangeOverWindow: (last - first) / Math.abs(first) };
  }

  // Correlations
  const correlations: Correlation[] = [];
  if (focus && numericData[focus]) {
    const y = numericData[focus];
    for (const name of Object.keys(numericData)) {
      if (name === focus) continue;
      const r = pearson(numericData[name], y);
      if (Number.isFinite(r)) correlations.push({ variable: name, r });
    }
    correlations.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  }

  // Seasonality
  let seasonality: DatasetSummary["seasonality"] = { kind: null, buckets: [] };
  if (focus && dateCol && numericData[focus]) {
    const y = numericData[focus];
    const granularity = opts.granularity ?? null;
    const kind: "month" | "weekday" | null =
      granularity === "monthly" ? "month" : granularity === "weekly" || granularity === "daily" ? "weekday" : "month";
    const bucketsMap: Record<string, number[]> = {};
    for (let i = 0; i < rows.length; i++) {
      const d = new Date(labels[i]);
      if (isNaN(d.getTime())) continue;
      const key =
        kind === "month"
          ? ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][d.getUTCMonth()]
          : ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"][d.getUTCDay()];
      bucketsMap[key] = bucketsMap[key] ?? [];
      if (y[i] !== undefined) bucketsMap[key].push(y[i]);
    }
    const order =
      kind === "month"
        ? ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
        : ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
    const buckets = order
      .filter((k) => bucketsMap[k]?.length)
      .map((k) => ({ label: k, mean: mean(bucketsMap[k]), count: bucketsMap[k].length }));
    seasonality = { kind, buckets };
  }

  return {
    overview: {
      nRows: n,
      nCols: columnNames.length,
      granularity: opts.granularity ?? null,
      periodStart: labels[0] ?? null,
      periodEnd: labels[labels.length - 1] ?? null,
      dateColumn: dateCol,
      focusVariable: focus,
    },
    columns,
    timeSeries,
    trend,
    correlations,
    seasonality,
  };
}

// Compact JSON for sending to the LLM (no sparklines, no full series).
export function compactForLlm(s: DatasetSummary) {
  return {
    overview: s.overview,
    columns: s.columns.map((c) => ({
      name: c.name,
      kind: c.kind,
      missingPct: round(c.missingPct, 3),
      uniqueCount: c.uniqueCount,
      min: c.min !== undefined ? round(c.min) : undefined,
      max: c.max !== undefined ? round(c.max) : undefined,
      mean: c.mean !== undefined ? round(c.mean) : undefined,
      median: c.median !== undefined ? round(c.median) : undefined,
      std: c.std !== undefined ? round(c.std) : undefined,
      zeroPct: c.zeroPct !== undefined ? round(c.zeroPct, 3) : undefined,
      skew: c.skew !== undefined ? round(c.skew, 2) : undefined,
      outliers: c.outliers,
    })),
    trend: s.trend && {
      slopePerPeriod: round(s.trend.slopePerPeriod),
      pctChangeOverWindow: round(s.trend.pctChangeOverWindow, 3),
    },
    correlations: s.correlations.slice(0, 12).map((c) => ({ variable: c.variable, r: round(c.r, 3) })),
    seasonality: s.seasonality,
  };
}

function round(n: number, d = 2): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
