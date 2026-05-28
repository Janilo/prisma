// Client-safe helpers for parsing CSV/XLSX in the browser.
import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface ParsedSheet {
  columns: string[];
  rows: Record<string, unknown>[];
}

export async function parseFile(file: File): Promise<ParsedSheet> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || file.type === "text/csv") {
    return await new Promise<ParsedSheet>((resolve, reject) => {
      Papa.parse<Record<string, unknown>>(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (res) => {
          const columns = (res.meta.fields ?? []).filter(Boolean);
          resolve({ columns, rows: res.data });
        },
        error: (err) => reject(err),
      });
    });
  }
  // XLSX
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const first = wb.SheetNames[0];
  const sheet = wb.Sheets[first];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { columns, rows };
}

export type ColumnKind = "date" | "number" | "string";

export interface ColumnInfo {
  name: string;
  kind: ColumnKind;
  missing: number;
  unique: number;
  min?: number;
  max?: number;
  mean?: number;
  outliers?: number;
}

function isLikelyDate(value: unknown): boolean {
  if (value instanceof Date) return !isNaN(value.getTime());
  if (typeof value !== "string") return false;
  if (value.length < 6) return false;
  const t = Date.parse(value);
  return !isNaN(t);
}

export function analyzeColumns(rows: Record<string, unknown>[], columns: string[]): ColumnInfo[] {
  return columns.map((col) => {
    let nNum = 0, nDate = 0, nStr = 0, missing = 0;
    const values: unknown[] = [];
    for (const row of rows) {
      const v = row[col];
      if (v === null || v === undefined || v === "") { missing++; continue; }
      values.push(v);
      if (typeof v === "number" && Number.isFinite(v)) nNum++;
      else if (isLikelyDate(v)) nDate++;
      else nStr++;
    }
    let kind: ColumnKind = "string";
    if (nDate >= Math.max(nNum, nStr)) kind = "date";
    else if (nNum >= Math.max(nDate, nStr)) kind = "number";

    const info: ColumnInfo = {
      name: col,
      kind,
      missing,
      unique: new Set(values.map(String)).size,
    };

    if (kind === "number") {
      const nums = values.map((v) => Number(v)).filter((v) => Number.isFinite(v));
      if (nums.length > 0) {
        info.min = Math.min(...nums);
        info.max = Math.max(...nums);
        info.mean = nums.reduce((a, b) => a + b, 0) / nums.length;
        // IQR outliers
        const sorted = [...nums].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        const lo = q1 - 1.5 * iqr;
        const hi = q3 + 1.5 * iqr;
        info.outliers = nums.filter((v) => v < lo || v > hi).length;
      }
    }
    return info;
  });
}

const DEP_HINTS = ["venda", "vendas", "revenue", "receita", "sales", "faturamento", "target"];
const INDEP_HINTS = ["gasto", "spend", "investimento", "invest", "impress", "click", "media", "tv", "meta", "google", "social", "ooh", "radio", "preco", "price", "discount", "promo"];

export function guessDependentVariable(cols: ColumnInfo[]): string | null {
  const numeric = cols.filter((c) => c.kind === "number");
  for (const c of numeric) {
    const n = c.name.toLowerCase();
    if (DEP_HINTS.some((h) => n.includes(h))) return c.name;
  }
  // Fallback: largest mean among numeric
  if (numeric.length === 0) return null;
  return [...numeric].sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0))[0].name;
}

export function guessIndependentVariables(cols: ColumnInfo[], dep: string | null): string[] {
  return cols
    .filter((c) => c.kind === "number" && c.name !== dep)
    .filter((c) => {
      const n = c.name.toLowerCase();
      return INDEP_HINTS.some((h) => n.includes(h));
    })
    .map((c) => c.name);
}

export function detectDateColumn(cols: ColumnInfo[]): string | null {
  return cols.find((c) => c.kind === "date")?.name ?? null;
}

export function detectGranularity(rows: Record<string, unknown>[], dateCol: string | null): "diária" | "semanal" | "mensal" | "desconhecida" {
  if (!dateCol || rows.length < 2) return "desconhecida";
  const ts: number[] = [];
  for (const r of rows) {
    const v = r[dateCol];
    const d = v instanceof Date ? v : new Date(String(v));
    if (!isNaN(d.getTime())) ts.push(d.getTime());
  }
  ts.sort((a, b) => a - b);
  if (ts.length < 2) return "desconhecida";
  const diffsDays = ts.slice(1).map((t, i) => (t - ts[i]) / 86400000);
  const med = diffsDays.slice().sort((a, b) => a - b)[Math.floor(diffsDays.length / 2)];
  if (med <= 2) return "diária";
  if (med <= 10) return "semanal";
  return "mensal";
}
