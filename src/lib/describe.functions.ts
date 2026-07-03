import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
// Cache writes below update datasets by an id already resolved through
// loadDatasetForUser (ownership verified) — no inline user_id filtering here.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createAiGatewayProvider } from "./ai-gateway.server";
import { compactForLlm, summarizeDataset, type DatasetSummary } from "./describe.server";
import { loadDatasetForUser, loadDatasetRows } from "./data.server";
import { AppError } from "./errors";

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

    const { rows, columns } = await loadDatasetRows(ds.storage_path);
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
    z
      .object({
        datasetId: z.string().uuid(),
        focusVariable: z.string().nullable().optional(),
        force: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(
    async ({ data, context }): Promise<{ insights: DatasetInsights; summary: DatasetSummary }> => {
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

      const { rows, columns } = await loadDatasetRows(ds.storage_path);
      const summary = summarizeDataset(rows, columns, {
        dateColumn: dateCol,
        focusVariable: focus,
        granularity: ds.granularity ?? null,
      });
      const compact = compactForLlm(summary);

      const apiKey = process.env.AI_API_KEY;
      if (!apiKey) {
        console.error("interpretDataset: AI_API_KEY não configurada.");
        throw new AppError("Análise por IA indisponível no momento.", 503);
      }
      const gateway = createAiGatewayProvider(apiKey);
      const model = gateway("gemini-2.5-flash");

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
    },
  );

// Compute cost-per-execution-unit (CPP) time series for each saved mapping
// { executionUnitColumn -> investmentColumn } on the dataset (unit_costs_json).
// CPP / unit_costs_json / spendBasis are defined in GLOSSARIO.md.
export const computeUnitCosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ datasetId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const ds = await loadDatasetForUser(data.datasetId, context.userId);
    const mappings = (ds.unit_costs_json ?? {}) as Record<string, string>;
    const entries = Object.entries(mappings);
    if (entries.length === 0)
      return {
        series: [] as Array<{
          unitColumn: string;
          costColumn: string;
          points: { period: string; cpp: number; units: number; cost: number }[];
          mean: number;
          min: number;
          max: number;
        }>,
      };

    const { rows } = await loadDatasetRows(ds.storage_path);
    const cols = (ds.columns_json ?? []) as Array<{ name: string; kind: string }>;
    const dateCol = cols.find((c) => c.kind === "date")?.name ?? null;

    const num = (v: unknown): number => {
      if (typeof v === "number") return Number.isFinite(v) ? v : 0;
      if (v == null || v === "") return 0;
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    const series = entries.map(([unitColumn, costColumn]) => {
      const points: { period: string; cpp: number; units: number; cost: number }[] = [];
      const cpps: number[] = [];
      rows.forEach((r, i) => {
        const units = num(r[unitColumn]);
        const cost = num(r[costColumn]);
        const cpp = units > 0 ? cost / units : 0;
        const period = dateCol
          ? (() => {
              const d = new Date(String(r[dateCol]));
              return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : `t${i + 1}`;
            })()
          : `t${i + 1}`;
        points.push({ period, cpp, units, cost });
        if (units > 0) cpps.push(cpp);
      });
      const mean = cpps.length ? cpps.reduce((a, b) => a + b, 0) / cpps.length : 0;
      const min = cpps.length ? Math.min(...cpps) : 0;
      const max = cpps.length ? Math.max(...cpps) : 0;
      return { unitColumn, costColumn, points, mean, min, max };
    });
    return { series };
  });
