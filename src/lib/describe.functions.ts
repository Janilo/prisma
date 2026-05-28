import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { compactForLlm, summarizeDataset, type DatasetSummary } from "./describe.server";

// Minimal CSV parser (matches mmm.functions.ts)
function parseCSV(text: string): { columns: string[]; rows: Record<string, unknown>[] } {
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

async function loadDatasetForUser(datasetId: string, userId: string) {
  const { data: ds, error } = await supabaseAdmin
    .from("datasets")
    .select("*")
    .eq("id", datasetId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !ds) throw new Error("Dataset não encontrado.");
  return ds;
}

async function loadRows(storagePath: string) {
  const { data: blob, error } = await supabaseAdmin.storage.from("datasets").download(storagePath);
  if (error || !blob) throw new Error("Não consegui ler o arquivo do dataset.");
  const text = await blob.text();
  return parseCSV(text);
}

const DescribeInput = z.object({
  datasetId: z.string().uuid(),
  focusVariable: z.string().nullable().optional(),
});

export const describeDataset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DescribeInput.parse(input))
  .handler(async ({ data, context }): Promise<{ summary: DatasetSummary }> => {
    const { userId } = context;
    const ds = await loadDatasetForUser(data.datasetId, userId);

    // Pick date column and focus
    const cols = (ds.columns_json as Array<{ name: string; kind: string }>) ?? [];
    const dateCol = cols.find((c) => c.kind === "date")?.name ?? null;
    const numericNames = cols.filter((c) => c.kind === "number").map((c) => c.name);
    const focus = data.focusVariable ?? numericNames[0] ?? null;

    const { rows, columns } = await loadRows(ds.storage_path);
    const summary = summarizeDataset(rows, columns, {
      dateColumn: dateCol,
      focusVariable: focus,
      granularity: ds.granularity ?? null,
    });

    await supabaseAdmin
      .from("datasets")
      .update({ summary_json: summary as unknown as never })
      .eq("id", ds.id);

    return { summary };
  });

const InsightSchema = z.object({
  headline: z.string().min(1).max(240),
  keyFindings: z.array(z.string().min(1).max(400)).min(2).max(6),
  dataQualityWarnings: z.array(z.string().min(1).max(400)).max(6),
  suggestedDependent: z.string().min(1).max(120),
  suggestedDrivers: z.array(z.string().min(1).max(120)).max(15),
  suggestedMedia: z.array(z.string().min(1).max(120)).max(15),
  nextStep: z.string().min(1).max(240),
});
export type DatasetInsights = z.infer<typeof InsightSchema>;

export const interpretDataset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      datasetId: z.string().uuid(),
      focusVariable: z.string().nullable().optional(),
      force: z.boolean().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ insights: DatasetInsights; summary: DatasetSummary }> => {
    const { userId } = context;
    const ds = await loadDatasetForUser(data.datasetId, userId);

    // Reuse cached insights when available and not forced
    if (!data.force && ds.insights_json && ds.summary_json) {
      return {
        insights: ds.insights_json as unknown as DatasetInsights,
        summary: ds.summary_json as unknown as DatasetSummary,
      };
    }

    const cols = (ds.columns_json as Array<{ name: string; kind: string }>) ?? [];
    const dateCol = cols.find((c) => c.kind === "date")?.name ?? null;
    const numericNames = cols.filter((c) => c.kind === "number").map((c) => c.name);
    const focus = data.focusVariable ?? numericNames[0] ?? null;

    const { rows, columns } = await loadRows(ds.storage_path);
    const summary = summarizeDataset(rows, columns, {
      dateColumn: dateCol,
      focusVariable: focus,
      granularity: ds.granularity ?? null,
    });
    const compact = compactForLlm(summary);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada.");
    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-3-flash-preview");

    const system =
      "Você é um analista sênior de Marketing Mix Modeling. Escreva sempre em português do Brasil, com tom direto, executivo e específico. Cite NÚMEROS reais (médias, % de variação, correlações) ao tirar conclusões. Nunca invente colunas ou números que não estão no JSON. Quando sugerir variáveis de mídia, escolha colunas cujo nome remeta a gasto, investimento, impressões ou canais (TV, Google, Meta, etc.).";

    const prompt = `Aqui está o resumo estatístico de um dataset que o usuário acabou de subir para rodar um MMM. A variável de foco atual é "${focus}".\n\nJSON do resumo:\n\n${JSON.stringify(compact)}\n\nDevolva: headline (uma frase de impacto sobre o que os dados mostram), keyFindings (3 a 5 bullets baseados nos números — tendência, sazonalidade, correlações fortes, anomalias), dataQualityWarnings (problemas como missings altos, baixa variância, série curta, outliers), suggestedDependent (qual coluna parece ser vendas/receita), suggestedDrivers (variáveis explicativas relevantes), suggestedMedia (subconjunto dos drivers que parecem ser gasto de mídia), nextStep (próxima ação concreta no Prisma).`;

    const { experimental_output: output } = await generateText({
      model,
      system,
      prompt,
      experimental_output: Output.object({ schema: InsightSchema }),
    });

    const insights = output;

    await supabaseAdmin
      .from("datasets")
      .update({
        summary_json: summary as unknown as never,
        insights_json: insights as unknown as never,
      })
      .eq("id", ds.id);

    return { insights, summary };
  });
