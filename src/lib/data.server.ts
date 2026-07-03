// Owner-scoped data access over supabaseAdmin (P-04). supabaseAdmin bypasses
// RLS, so every read through it MUST re-impose the tenant boundary by hand —
// and "by hand" scattered across serverFns is exactly how a future .eq() gets
// forgotten. This module is the single place that combines admin + ownership
// check; serverFns call these helpers instead of building the query inline.
// (When bypass isn't needed, prefer the RLS-scoped `context.supabase`.)
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { parseCSV } from "./csv.server";
import { AppError, NotFoundError } from "./errors";

// Dataset by id, verified to belong to userId. Full row (select *).
export async function loadDatasetForUser(datasetId: string, userId: string) {
  const { data: ds, error } = await supabaseAdmin
    .from("datasets")
    .select("*")
    .eq("id", datasetId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !ds) throw new NotFoundError("Dataset não encontrado.");
  return ds;
}

// Run by id, verified to belong to userId. Full row (select *).
export async function getRunOwned(runId: string, userId: string) {
  const { data: run, error } = await supabaseAdmin
    .from("runs")
    .select("*")
    .eq("id", runId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !run) throw new NotFoundError("Run não encontrado.");
  return run;
}

// All dataset version rows of one user — input for the version-chain walk
// (findLatestVersionId). Keeps the only "list another table by user_id" query
// out of the serverFn files.
export async function listDatasetVersionsOwned(userId: string) {
  const { data } = await supabaseAdmin
    .from("datasets")
    .select("id, version, parent_dataset_id")
    .eq("user_id", userId);
  return data ?? [];
}

// Download a dataset's CSV from storage and parse it. Storage paths only ever
// come from a dataset row already resolved via loadDatasetForUser, so this
// carries no ownership check of its own.
export async function loadDatasetRows(storagePath: string) {
  const { data: blob, error } = await supabaseAdmin.storage.from("datasets").download(storagePath);
  if (error || !blob) throw new AppError("Não consegui ler o arquivo do dataset.");
  const text = await blob.text();
  return parseCSV(text);
}
