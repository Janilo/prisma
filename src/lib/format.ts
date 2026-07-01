// Shared report formatters. Previously copy-pasted into RunReport, demo and
// compare (the compare copy literally noted it was "mirrored from RunReport") —
// one source of truth now so they can't drift.

/** Compact currency-ish number: 2.50B / 8.40M / 760.0k / 42.0, "—" if non-finite. */
export function fmt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return n.toFixed(1);
}

/** Qualitative confidence label from a p-value; the Base series has none. */
export function pConfidence(p: number, name: string): string {
  if (name.startsWith("Base")) return "—";
  if (p < 0.01) return "Muito alta (★★★)";
  if (p < 0.05) return "Alta (★★)";
  if (p < 0.1) return "Moderada (★)";
  return "Baixa";
}
