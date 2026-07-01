/**
 * Prisma DS — token mirror for runtime consumption (Recharts, inline SVG).
 *
 * SVG presentation attributes (stroke/fill) and Recharts props don't resolve
 * `var(--prisma-*)`, so we mirror the primitives from `src/styles/prisma.css`
 * here as the single source of truth for JS-side rendering.
 *
 * ⚠️ Any change here MUST mirror a change in `src/styles/prisma.css`
 *    (or vice versa). Don't fork these values inline in components.
 */

// Espectro de canais — ordem fixa cool→warm (ch-1..ch-6)
export const CHANNEL_COLORS = [
  "#6B4FE0", // ch-1 violeta   — Brand / TV
  "#2D7BE0", // ch-2 azul      — Vídeo / Display
  "#0E97A8", // ch-3 ciano     — Search
  "#4FA23E", // ch-4 verde     — Social / Influencer
  "#E0A21E", // ch-5 âmbar     — Promo / Trade
  "#C2562F", // ch-6 terracota — OOH / Outros
] as const;

// Reservadas — estados analíticos do MMM
export const LIFT = "#2E9E5E"; // contribuição incremental, "bom"
export const SAT = "#DB5A45"; // saturação / retorno decrescente
export const SAT_DEEP = "#A8371F"; // texto sobre claro

// Baseline — demanda orgânica (fora do espectro)
export const BASELINE = "#B8B4D8";

// Brand
export const INDIGO = "#4A37B5";
export const INDIGO_DEEP = "#33268C";
export const VIOLET = "#7A5CF0";
export const ABYSS = "#1C1547";

// Neutros
export const INK = "#1C1A2B";
export const SLATE = "#44415A";
export const MUTE = "#726E89";
export const STONE = "#D7D4E2";

// Aliases para charts
export const CHART_GRID = STONE;
export const CHART_AXIS = MUTE;
