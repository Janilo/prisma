import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/upload", label: "Upload" },
  { to: "/explore", label: "Análise descritiva" },
  { to: "/runs", label: "Resultados" },
  { to: "/methodology", label: "Metodologia" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { location } = useRouterState();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(to + "/");

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className="min-h-screen bg-brand-offwhite font-sans text-brand-navy flex">
      <nav className="w-56 border-r hairline flex flex-col p-6 shrink-0 sticky top-0 h-screen">
        <Link to="/upload" className="mb-12 block">
          <span className="font-display text-2xl font-black italic tracking-tighter text-brand-purple">
            Prisma
          </span>
        </Link>
        <div className="space-y-2">
          <span className="eyebrow block mb-2">Operação</span>
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={
                "block text-sm font-medium py-1 transition-opacity " +
                (isActive(item.to)
                  ? "border-b border-brand-mustard w-fit"
                  : "opacity-40 hover:opacity-100")
              }
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="mt-auto pt-6 border-t hairline space-y-3">
          <p className="text-[10px] text-brand-gray font-mono truncate">{email}</p>
          <button
            onClick={handleSignOut}
            className="text-xs text-brand-gray hover:text-brand-navy uppercase tracking-widest"
          >
            Sair
          </button>
        </div>
      </nav>
      <main className="flex-1 flex flex-col min-w-0">{children}</main>
    </div>
  );
}
