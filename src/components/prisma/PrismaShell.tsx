import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PrismaIcons, Ico } from "./PrismaIcons";
import { getIsAdmin } from "@/lib/admin.functions";

const VIEWS = [
  { to: "/results/decomp", label: "Decomposição", icon: "i-decompose" },
  { to: "/results/response", label: "Curvas de resposta", icon: "i-curve" },
  { to: "/results/roi", label: "ROI por canal", icon: "i-roi" },
  { to: "/results/optimizer", label: "Otimizador", icon: "i-budget" },
] as const;

const MODEL = [
  { to: "/upload", label: "Dados & fontes", icon: "i-data" },
  { to: "/explore", label: "Especificação", icon: "i-model" },
  { to: "/runs", label: "Diagnóstico", icon: "i-target" },
] as const;

const CRUMB: Record<string, string> = {
  "/results/decomp": "Decomposição · 2026 H1",
  "/results/response": "Curvas de resposta · 2026 H1",
  "/results/roi": "ROI por canal · 2026 H1",
  "/results/optimizer": "Otimizador · 2026 H1",
};

export function PrismaShell({ children }: { children: React.ReactNode }) {
  const { location } = useRouterState();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(to + "/");

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  const initials = (email ?? "?").slice(0, 2).toUpperCase();
  const crumb = CRUMB[location.pathname];

  return (
    <div className="prisma-shell prisma jps" style={{ height: "100vh" }}>
      <PrismaIcons />

      <aside className="prisma-sidebar">
        <div className="brand">
          <svg viewBox="0 0 210 44" style={{ height: 18, width: "auto", color: "var(--prisma-white)" }}>
            <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round">
              <path d="M3 22 H17" />
              <path d="M26 7 L44 38 H8 Z" />
            </g>
            <g strokeWidth="2.4" strokeLinecap="round">
              <path d="M35 22 L64 10" stroke="#6B4FE0" /> {/* ch-1 */}
              <path d="M35.5 22 L66 16" stroke="#2D7BE0" /> {/* ch-2 */}
              <path d="M36 22 L67 22" stroke="#0E97A8" /> {/* ch-3 */}
              <path d="M35.5 22 L66 28" stroke="#4FA23E" /> {/* ch-4 */}
              <path d="M35 22 L64 34" stroke="#E0A21E" /> {/* ch-5 */}
            </g>
            <text x="78" y="31" fontFamily="Inter Tight, sans-serif" fontWeight="700" fontSize="25" letterSpacing="-0.02em" fill="currentColor">
              prisma
            </text>
          </svg>
        </div>
        <nav>
          {VIEWS.map((v) => (
            <Link
              key={v.to}
              to={v.to}
              aria-current={isActive(v.to) ? "page" : undefined}
            >
              <Ico id={v.icon} />
              {v.label}
            </Link>
          ))}
          <div className="group-label">Modelo</div>
          {MODEL.map((v) => (
            <Link
              key={v.to}
              to={v.to}
              aria-current={isActive(v.to) ? "page" : undefined}
            >
              <Ico id={v.icon} />
              {v.label}
            </Link>
          ))}
          {email === ADMIN_EMAIL && (
            <>
              <div className="group-label">Sistema</div>
              <Link to="/admin" aria-current={isActive("/admin") ? "page" : undefined}>
                <Ico id="i-shield" />
                Admin
              </Link>
            </>
          )}
        </nav>
        <div className="footer">
          <div className="who">{initials}</div>
          <div style={{ display: "grid", lineHeight: 1.2, minWidth: 0, flex: 1 }}>
            <span className="name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {email ?? "—"}
            </span>
            <button
              onClick={handleSignOut}
              className="role"
              style={{ background: "transparent", border: 0, padding: 0, textAlign: "left", cursor: "pointer" }}
            >
              Sair
            </button>
          </div>
        </div>
      </aside>

      <div className="prisma-main">
        <div className="prisma-topbar">
          <div className="crumbs">
            Conta Acme
            <Ico id="i-chevron-r" style={{ width: 13, height: 13, color: "var(--prisma-mute)" }} />
            <strong>MMM Brasil</strong>
            {crumb && (
              <>
                <Ico id="i-chevron-r" style={{ width: 13, height: 13, color: "var(--prisma-mute)" }} />
                <span style={{ color: "var(--prisma-mute)" }}>{crumb}</span>
              </>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="prisma-badge" data-tone="success">
              <span className="dot"></span>Convergiu · R² 0,91
            </span>
            <button className="prisma-btn" data-variant="secondary" data-size="sm">
              <Ico id="i-download" />Exportar
            </button>
            <button className="prisma-btn" data-variant="primary" data-size="sm">
              <Ico id="i-model" />Rodar modelo
            </button>
          </div>
        </div>
        <div className="prisma-content">{children}</div>
      </div>
    </div>
  );
}
