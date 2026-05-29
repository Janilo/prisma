import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Ico } from "@/components/prisma/PrismaIcons";

export const Route = createFileRoute("/_authenticated/results/decomp")({
  head: () => ({ meta: [{ title: "Decomposição — Prisma" }] }),
  component: DecompView,
});

function DecompView() {
  const [mode, setMode] = useState<"rs" | "share">("rs");
  return (
    <section className="view" data-active="true" style={{ display: "grid", gap: 20, alignContent: "start" }}>
      <div className="panel-head">
        <div>
          <h1>Decomposição da receita</h1>
          <div className="sub">Onde a receita nasceu — baseline orgânico + 6 canais, 12 semanas.</div>
        </div>
        <div className="row" style={{ display: "flex", gap: 6 }}>
          <button className="prisma-chip" aria-pressed={mode === "rs"} onClick={() => setMode("rs")}>R$</button>
          <button className="prisma-chip" aria-pressed={mode === "share"} onClick={() => setMode("share")}>% share</button>
        </div>
      </div>

      <div className="demo-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        <div className="prisma-kpi" data-accent="spectrum"><div className="label">Receita modelada</div><div className="value indigo" style={{ fontSize: 26 }}>R$ 8,4M</div><div className="delta">R² 0,91 · MAPE 6,2%</div></div>
        <div className="prisma-kpi" data-accent="lift"><div className="label">Contrib. incremental</div><div className="value lift" style={{ fontSize: 26 }}>62%</div><div className="delta" data-tone="up"><Ico id="i-chevron-u" style={{ width: 12, height: 12 }} />da receita vem de mídia</div></div>
        <div className="prisma-kpi" data-accent="brand"><div className="label">ROI médio</div><div className="value" style={{ fontSize: 26 }}>2,9</div><div className="delta">por real investido</div></div>
        <div className="prisma-kpi" data-accent="sat"><div className="label">Canal saturado</div><div className="value" style={{ fontSize: 26, color: "var(--prisma-sat)" }}>Promo</div><div className="delta" data-tone="down">ROI marginal 0,6</div></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" }}>
        <div className="prisma-card" style={{ gap: 8 }}>
          <div className="type-sample-h3">Receita por semana · R$ milhões</div>
          <svg viewBox="0 0 760 300" style={{ width: "100%", height: "auto", fontFamily: "'Inter Tight',sans-serif" }}>
            <g stroke="#D7D4E2" strokeWidth="0.5" strokeDasharray="3 4" opacity="0.7">
              <line x1="50" y1="60" x2="660" y2="60" /><line x1="50" y1="120" x2="660" y2="120" /><line x1="50" y1="185" x2="660" y2="185" />
            </g>
            <g fontSize="10" fill="#726E89" textAnchor="end"><text x="42" y="64">1,8</text><text x="42" y="124">1,2</text><text x="42" y="189">0,6</text><text x="42" y="253">0</text></g>
            <line x1="50" y1="250" x2="660" y2="250" stroke="#D7D4E2" strokeWidth="0.75" />
            <polygon fill="#B8B4D8" points="50,180 172,178 294,179 416,177 538,178 660,176 660,250 50,250" />
            <polygon fill="#C2562F" points="50,170 172,167 294,170 416,165 538,168 660,165 660,176 538,178 416,177 294,179 172,178 50,180" />
            <polygon fill="#E0A21E" points="50,156 172,157 294,148 416,153 538,159 660,147 660,165 538,168 416,165 294,170 172,167 50,170" />
            <polygon fill="#4FA23E" points="50,140 172,139 294,131 416,133 538,137 660,126 660,147 538,159 416,153 294,148 172,157 50,156" />
            <polygon fill="#0E97A8" points="50,120 172,118 294,109 416,110 538,113 660,101 660,126 538,137 416,133 294,131 172,139 50,140" />
            <polygon fill="#2D7BE0" points="50,106 172,103 294,93 416,95 538,96 660,85 660,101 538,113 416,110 294,109 172,118 50,120" />
            <polygon fill="#6B4FE0" points="50,84 172,83 294,69 416,69 538,68 660,55 660,85 538,96 416,95 294,93 172,103 50,106" />
            <polyline fill="none" stroke="#1C1A2B" strokeWidth="1.5" strokeLinejoin="round" opacity="0.5" points="50,84 172,83 294,69 416,69 538,68 660,55" />
            <g fontSize="10" fontWeight="600">
              <text x="666" y="73" fill="#6B4FE0">Brand / TV</text><text x="666" y="96" fill="#2D7BE0">Vídeo</text>
              <text x="666" y="116" fill="#0E97A8">Search</text><text x="666" y="139" fill="#4FA23E">Social</text>
              <text x="666" y="160" fill="#B5810F">Promo</text><text x="666" y="173" fill="#C2562F">OOH</text>
              <text x="666" y="218" fill="#6E6A86">Baseline</text>
            </g>
            <g fontSize="9.5" fill="#726E89" textAnchor="middle">
              <text x="50" y="266">Sem 1</text><text x="172" y="266">Sem 3</text><text x="294" y="266">Sem 5</text><text x="416" y="266">Sem 7</text><text x="538" y="266">Sem 9</text><text x="660" y="266">Sem 11</text>
            </g>
          </svg>
          <div className="prisma-spectrum-legend" style={{ borderTop: "1px solid var(--prisma-stone-soft)", paddingTop: 12 }}>
            <span className="k"><i className="ch-1" />Brand</span>
            <span className="k"><i className="ch-2" />Vídeo</span>
            <span className="k"><i className="ch-3" />Search</span>
            <span className="k"><i className="ch-4" />Social</span>
            <span className="k"><i className="ch-5" />Promo</span>
            <span className="k"><i className="ch-6" />OOH</span>
            <span className="k"><i className="baseline" />Baseline</span>
          </div>
        </div>

        <div className="prisma-card" style={{ gap: 14, alignContent: "start" }}>
          <div className="type-sample-h3">Share da receita · 100%</div>
          <div className="prisma-decomp-bar" role="img" aria-label="Share por canal">
            <span style={{ width: "38%", background: "var(--prisma-baseline)" }} />
            <span style={{ width: "16%", background: "var(--prisma-ch-1)" }} />
            <span style={{ width: "13%", background: "var(--prisma-ch-3)" }} />
            <span style={{ width: "11%", background: "var(--prisma-ch-4)" }} />
            <span style={{ width: "9%", background: "var(--prisma-ch-2)" }} />
            <span style={{ width: "8%", background: "var(--prisma-ch-5)" }} />
            <span style={{ width: "5%", background: "var(--prisma-ch-6)" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--prisma-mute)" }}>
            <span><strong style={{ color: "var(--prisma-slate)" }}>38%</strong> orgânico</span>
            <span><strong style={{ color: "var(--prisma-slate)" }}>62%</strong> mídia</span>
          </div>
          <div style={{ borderTop: "1px solid var(--prisma-stone-soft)", paddingTop: 12, display: "grid", gap: 8 }}>
            <div className="type-sample-eyebrow">Leitura do modelo</div>
            <p style={{ fontSize: 13, color: "var(--prisma-slate)", margin: 0, lineHeight: 1.55 }}>
              Brand carrega 16% da receita com só 9% do gasto — o adstock de 6 semanas estende o efeito além do flight.{" "}
              <strong style={{ color: "var(--prisma-ink)" }}>Search</strong> tem o maior ROI e ainda há folga na curva.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
