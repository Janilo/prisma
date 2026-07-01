// Single source of truth for the lightweight server-side CSV parser.
// Uploaded data round-trips as JSON in the dataset blob, so this is mostly a
// fallback if a raw CSV ends up in storage. Previously copy-pasted into
// mmm.functions.ts and describe.functions.ts.
export function parseCSV(text: string): { columns: string[]; rows: Record<string, unknown>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return { columns: [], rows: [] };
  const split = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (q && line[i + 1] === '"') {
          cur += '"';
          i++;
          continue;
        } // RFC-4180 escaped quote
        q = !q;
        continue;
      }
      if (ch === "," && !q) {
        out.push(cur);
        cur = "";
        continue;
      }
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
