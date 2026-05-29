import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Ico } from "@/components/prisma/PrismaIcons";

export const Route = createFileRoute("/_authenticated/results/optimizer")({
  head: () => ({ meta: [{ title: "Otimizador — Prisma" }] }),
  component: OptimizerView,
});

type Channel = { key: string; name: string; base: number; min: number; max: number; mroi: number };

const CH: Channel[] = [
  { key: "ch-3", name: "Search", base: 102, min: 40, max: 220, mroi: 2.1 },
  { key: "ch-4", name: "Social", base: 112, min: 40, max: 200, mroi: 1.4 },
  { key: "ch-1", name: "Brand / TV", base: 146, min: 60, max: 260, mroi: 1.2 },
  { key: "ch-2", name: "Vídeo", base: 81, min: 30, max: 160, mroi: 0.9 },
  { key: "ch-5", name: "Promo", base: 114, min: 0, max: 200, mroi: 0.4 },
];
const BASE_TOTAL = CH.reduce((s, c) => s + c.base, 0);

function fmtSigned(v: number) {
  return (v >= 0 ? "+" : "−") + "R$ " + Math.abs(Math.round(v)) + "k";
}

function OptimizerView() {
  const [state, setState] = useState<number[]>(CH.map((c) => c.base));

  const { total, revDelta, budgetNote, msg } = useMemo(() => {
    const total = state.reduce((s, v) => s + v, 0);
    const revDelta = CH.reduce((acc, c, i) => acc + (state[i] - c.base) * c.mroi, 0);
    const d = total - BASE_TOTAL;
    const budgetNote = Math.abs(d) < 1 ? "igual ao plano atual" : fmtSigned(d) + " vs. plano atual";
    let msg = "Ajuste os canais à esquerda. A projeção usa o ROI marginal de cada curva de saturação.";
    if (revDelta > 30 && Math.abs(d) < 30) msg = "Boa realocação: mais receita com o mesmo budget. Search e Social ainda têm folga na curva.";
    else if (revDelta < -10) msg = "Esse remanejo perde receita — você tirou verba de um canal com ROI marginal maior.";
    return { total, revDelta, budgetNote, msg };
  }, [state]);

  const reset = () => setState(CH.map((c) => c.base));
  const setIdx = (i: number, v: number) =>
    setState((s) => s.map((x, j) => (j === i ? v : x)));

  return (
    <section className="view" data-active="true" style={{ display: "grid", gap: 20, alignContent: "start" }}>
      <div className="panel-head">
        <div>
          <h1>Otimizador de budget</h1>
          <div className="sub">Mesmo budget total. Mova a verba do platô para a folga e veja a receita projetada.</div>
        </div>
        <button className="prisma-btn" data-variant="ghost" data-size="sm" onClick={reset}>
          <Ico id="i-reset" />Resetar
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" }}>
        <div className="prisma-card" style={{ gap: 0 }}>
          <div className="type-sample-h3" style={{ marginBottom: 6 }}>Investimento por canal · semanal</div>
          {CH.map((c, i) => (
            <div className="opt-row" key={c.key}>
              <div className="top">
                <span className="name">
                  <i style={{ background: `var(--prisma-${c.key})` }} />
                  {c.name}
                </span>
                <span className="spend">R$ {state[i]}k</span>
              </div>
              <input
                className="prisma-range"
                type="range"
                min={c.min}
                max={c.max}
                value={state[i]}
                onChange={(e) => setIdx(i, +e.target.value)}
                aria-label={c.name}
              />
            </div>
          ))}
        </div>

        <div className="prisma-card" style={{ alignContent: "start", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Ico id="i-spark" style={{ color: "var(--prisma-indigo)" }} />
            <div className="type-sample-h3" style={{ margin: 0 }}>Resultado do cenário</div>
          </div>
          <div className="prisma-kpi" data-accent="brand" style={{ border: 0, padding: 0 }}>
            <div className="label">Budget total / semana</div>
            <div className="value" style={{ fontSize: 26 }}>R$ {Math.round(total)}k</div>
            <div className="delta">{budgetNote}</div>
          </div>
          <div style={{ borderTop: "1px solid var(--prisma-stone)", paddingTop: 14, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "var(--prisma-mute)" }}>Receita projetada / semana</span>
            <span className="prisma-num" style={{ fontSize: 22, fontWeight: 600, color: revDelta >= 0 ? "var(--prisma-lift)" : "var(--prisma-sat)" }}>
              {fmtSigned(revDelta)}
            </span>
          </div>
          <p style={{ fontSize: 12, color: "var(--prisma-mute)", margin: 0, lineHeight: 1.5 }}>{msg}</p>
          <button className="prisma-btn" data-variant="primary" data-size="sm" style={{ width: "100%" }}>
            <Ico id="i-check" />Aplicar cenário
          </button>
        </div>
      </div>
    </section>
  );
}
