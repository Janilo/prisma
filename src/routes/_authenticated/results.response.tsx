import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/results/response")({
  head: () => ({ meta: [{ title: "Curvas de resposta — Prisma" }] }),
  component: ResponseView,
});

function ResponseView() {
  return (
    <section className="view" data-active="true" style={{ display: "grid", gap: 20, alignContent: "start" }}>
      <div className="panel-head">
        <div>
          <h1>Curvas de resposta</h1>
          <div className="sub">Contribuição em função do investimento. O ponto marca onde cada canal opera hoje.</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" }}>
        <div className="prisma-card" style={{ gap: 8 }}>
          <div className="type-sample-h3">Retorno decrescente · ponto de operação</div>
          <svg viewBox="0 0 460 280" style={{ width: "100%", height: "auto", fontFamily: "'Inter Tight',sans-serif" }}>
            <g stroke="#D7D4E2" strokeWidth="0.5" strokeDasharray="3 4" opacity="0.7">
              <line x1="50" y1="70" x2="430" y2="70" /><line x1="50" y1="135" x2="430" y2="135" /><line x1="50" y1="200" x2="430" y2="200" />
            </g>
            <line x1="50" y1="240" x2="430" y2="240" stroke="#D7D4E2" strokeWidth="0.75" />
            <line x1="50" y1="30" x2="50" y2="240" stroke="#D7D4E2" strokeWidth="0.75" />
            <text x="50" y="258" fontSize="10" fill="#726E89">INVESTIMENTO →</text>
            <path d="M50,240 C120,150 200,118 430,98" fill="none" stroke="#0E97A8" strokeWidth="2" strokeLinecap="round" />
            <circle cx="250" cy="124" r="4.5" fill="#0E97A8" stroke="#fff" strokeWidth="1.5" />
            <circle cx="250" cy="124" r="9" fill="none" stroke="#2E9E5E" strokeWidth="1.5" />
            <text x="436" y="101" fontSize="10" fontWeight="600" fill="#0E97A8">Search</text>
            <path d="M50,240 C150,185 260,150 430,128" fill="none" stroke="#6B4FE0" strokeWidth="2" strokeLinecap="round" />
            <circle cx="210" cy="171" r="4.5" fill="#6B4FE0" stroke="#fff" strokeWidth="1.5" />
            <text x="436" y="131" fontSize="10" fontWeight="600" fill="#6B4FE0">Brand</text>
            <path d="M50,240 C90,150 130,128 430,120" fill="none" stroke="#E0A21E" strokeWidth="2" strokeLinecap="round" />
            <circle cx="360" cy="121" r="4.5" fill="#E0A21E" stroke="#fff" strokeWidth="1.5" />
            <circle cx="360" cy="121" r="9" fill="none" stroke="#DB5A45" strokeWidth="1.5" />
            <text x="436" y="123" fontSize="10" fontWeight="600" fill="#B5810F">Promo</text>
          </svg>
          <div style={{ display: "flex", gap: 18, fontSize: 11, color: "var(--prisma-mute)", borderTop: "1px solid var(--prisma-stone-soft)", paddingTop: 10 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 11, height: 11, borderRadius: 999, border: "1.5px solid var(--prisma-lift)" }} />
              Folga — pode subir verba
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 11, height: 11, borderRadius: 999, border: "1.5px solid var(--prisma-sat)" }} />
              Saturado — retorno marginal baixo
            </span>
          </div>
        </div>

        <div className="prisma-card" style={{ alignContent: "start" }}>
          <div className="type-sample-h3" style={{ marginBottom: 4 }}>Onde cada canal opera</div>
          {[
            { name: "Search", ch: "ch-3", st: "folga" },
            { name: "Brand / TV", ch: "ch-1", st: "folga" },
            { name: "Social", ch: "ch-4", st: "ponto" },
            { name: "Vídeo / Display", ch: "ch-2", st: "ponto" },
            { name: "OOH / Outros", ch: "ch-6", st: "ponto" },
            { name: "Promo / Trade", ch: "ch-5", st: "sat" },
          ].map((r) => (
            <div className="op-row" key={r.name}>
              <div className="ch-name">
                <i style={{ background: `var(--prisma-${r.ch})` }} />
                {r.name}
              </div>
              <span className={`status ${r.st}`}>
                {r.st === "folga" ? "folga" : r.st === "ponto" ? "no ponto" : "saturado"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
