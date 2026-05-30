import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { ADMIN_EMAIL } from "./config";

function assertAdmin(claims: { email?: string } | undefined) {
  if ((claims?.email ?? "").toLowerCase() !== ADMIN_EMAIL) throw new Error("Acesso negado.");
}

export const adminFetchData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    assertAdmin(context.claims as { email?: string });

    const [profilesRes, datasetsRes, runsRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, display_name, created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("datasets")
        .select("id, user_id, name, n_rows, n_cols, created_at, original_filename")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("runs")
        .select("id, dataset_id, created_at")
        .order("created_at", { ascending: false }),
    ]);

    const emailMap: Record<string, string> = {};
    for (const p of profilesRes.data ?? []) {
      try {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(p.id);
        if (u?.user?.email) emailMap[p.id] = u.user.email;
      } catch { /* ignore */ }
    }

    return {
      profiles: (profilesRes.data ?? []).map(p => ({ ...p, email: emailMap[p.id] ?? null })),
      datasets: datasetsRes.data ?? [],
      runs: runsRes.data ?? [],
    };
  });
