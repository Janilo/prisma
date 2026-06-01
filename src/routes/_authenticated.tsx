import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PrismaShell } from "@/components/prisma/PrismaShell";

function AuthenticatedLayout() {
  return (
    <PrismaShell>
      <Outlet />
    </PrismaShell>
  );
}

export const Route = createFileRoute("/_authenticated")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  beforeLoad: async ({ location }) => {
    // Auth uses localStorage — session is unavailable on the server.
    // The guard only runs client-side; server functions protect data via requireSupabaseAuth.
    if (typeof window === "undefined") return;
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: AuthenticatedLayout,
});
