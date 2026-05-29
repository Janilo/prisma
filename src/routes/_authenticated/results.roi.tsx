import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/results/roi")({
  head: () => ({ meta: [{ title: "ROI por canal — Prisma" }] }),
  component: RoiView,
});

function RoiView() {
  return (
    <section className="view" data-active="true" style={{ display: "grid", gap: 20, alignContent: "start" }}>
      <div className="panel-head">
        <div>
          <h1>ROI por canal</h1>
          <div className="sub">Retorno por real investido. Abaixo de 1,0 a verba marginal está sendo desperdiçada.</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="prisma-card">
          <div className="type-sample-h3">Retorno por real · break-even 1,0</div>
          <svg viewBox="0 0 300 210" style={{ width: "100%", height: "auto", fontFamily: "'Inter Tight',sans-serif" }}>
            <line x1="118" y1="8" x2="118" y2="196" stroke="#726E89" strokeWidth="1" strokeDasharray="3 3" />
            <text x="118" y="6" fontSize="8.5" fill="#726E89" textAnchor="middle">1,0</text>
            <g fontSize="10" fill="#1C1A2B">
              <rect x="80" y="16" width="157" height="16" fill="#0E97A8" /><text x="74" y="28" textAnchor="end" fill="#44415A">Search</text><text x="241" y="28" fontWeight="600">4,1</text>
              <rect x="80" y="44" width="121" height="16" fill="#4FA23E" /><text x="74" y="56" textAnchor="end" fill="#44415A">Social</text><text x="205" y="56" fontWeight="600">3,2</text>
              <rect x="80" y="72" width="68" height="16" fill="#2D7BE0" /><text x="74" y="84" textAnchor="end" fill="#44415A">Vídeo</text><text x="152" y="84" fontWeight="600">1,8</text>
              <rect x="80" y="100" width="67" height="16" fill="#6B4FE0" /><text x="74" y="112" textAnchor="end" fill="#44415A">Brand</text><text x="151" y="112" fontWeight="600">1,8</text>
              <rect x="80" y="128" width="49" height="16" fill="#C2562F" /><text x="74" y="140" textAnchor="end" fill="#44415A">OOH</text><text x="133" y="140" fontWeight="600">1,3</text>
              <rect x="80" y="156" width="34" height="16" fill="#DB5A45" /><text x="74" y="168" textAnchor="end" fill="#44415A">Promo</text><text x="118" y="168" fontWeight="600" fill="#A8371F">0,9</text>
            </g>
          </svg>
          <div style={{ fontSize: 11, color: "var(--prisma-mute)", display: "flex", alignItems: "center", gap: 6, borderTop: "1px solid var(--prisma-stone-soft)", paddingTop: 10 }}>
            <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: "var(--prisma-sat)" }} />
            Promo abaixo do break-even: corte a verba marginal.
          </div>
        </div>

        <div className="prisma-card">
          <div className="type-sample-h3">Contribuição por canal</div>
          <table className="prisma-table">
            <thead>
              <tr><th>Canal</th><th className="num">Invest.</th><th className="num">Contrib.</th><th className="num">ROI</th></tr>
            </thead>
            <tbody>
              <tr><td className="ch" style={{ ["--ch" as never]: "var(--prisma-ch-1)" }}><strong>Brand / TV</strong></td><td className="num">R$ 760k</td><td className="num">R$ 1,34M</td><td className="num pos">1,76</td></tr>
              <tr><td className="ch" style={{ ["--ch" as never]: "var(--prisma-ch-3)" }}><strong>Search</strong></td><td className="num">R$ 265k</td><td className="num">R$ 1,09M</td><td className="num pos">4,12</td></tr>
              <tr><td className="ch" style={{ ["--ch" as never]: "var(--prisma-ch-4)" }}><strong>Social</strong></td><td className="num">R$ 290k</td><td className="num">R$ 924k</td><td className="num pos">3,19</td></tr>
              <tr><td className="ch" style={{ ["--ch" as never]: "var(--prisma-ch-2)" }}><strong>Vídeo</strong></td><td className="num">R$ 420k</td><td className="num">R$ 756k</td><td className="num">1,80</td></tr>
              <tr><td className="ch" style={{ ["--ch" as never]: "var(--prisma-ch-5)" }}><strong>Promo</strong></td><td className="num">R$ 480k</td><td className="num">R$ 672k</td><td className="num neg">0,90</td></tr>
              <tr data-row="total"><td>Total</td><td className="num">R$ 2,22M</td><td className="num">R$ 5,18M</td><td className="num">2,9</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
