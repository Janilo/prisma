const STEPS = [
  {
    n: "01",
    title: "Suba sua planilha",
    body: "Vendas por período e gastos por canal de mídia. CSV ou XLSX. Prisma valida colunas e datas antes de rodar.",
  },
  {
    n: "02",
    title: "Ridge com adstock e saturação",
    body: "Ajustamos efeito carry-over por canal e curva de retornos decrescentes. Sem overfitting, sem caixa-preta.",
  },
  {
    n: "03",
    title: "Contribuição, ROI e base vs. incremental",
    body: "Decomposição em R$ por canal, ROI marginal e a parcela do faturamento que é base — o que viria sem mídia.",
  },
] as const;

export function MethodSection() {
  return (
    <section className="border-t hairline bg-paper">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <p className="eyebrow mb-10">Método</p>
        <div className="grid gap-px bg-abyss/10 md:grid-cols-3 border hairline">
          {STEPS.map((s) => (
            <div key={s.n} className="bg-paper p-8">
              <p className="font-display text-3xl text-violet">{s.n}</p>
              <h3 className="mt-6 font-display text-lg text-abyss">{s.title}</h3>
              <p className="mt-3 text-sm text-abyss/70 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
