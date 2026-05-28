const PARENT = "https://pereirasaraiva.com";

export function SiteFooter() {
  return (
    <footer className="border-t hairline bg-brand-offwhite">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-14 grid gap-12 md:grid-cols-3">
        <div>
          <a href={PARENT} className="font-display text-xl text-brand-purple">
            J P Saraiva
          </a>
          <p className="mt-3 text-sm text-brand-navy/70 leading-relaxed max-w-xs">
            Consultoria independente em pricing, growth e analytics.
          </p>
        </div>

        <div>
          <p className="eyebrow mb-4">Outros produtos</p>
          <ul className="space-y-2 text-sm">
            <li>
              <a
                href="https://cascata.pereirasaraiva.com"
                className="text-brand-navy hover:text-brand-purple transition-colors"
              >
                Cascata <span className="text-brand-gray">· Price Waterfall</span>
              </a>
            </li>
            <li>
              <a
                href="https://lente.pereirasaraiva.com"
                className="text-brand-navy hover:text-brand-purple transition-colors"
              >
                Lente <span className="text-brand-gray">· Pesquisa Qualitativa</span>
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="eyebrow mb-4">Pereira Saraiva</p>
          <ul className="space-y-2 text-sm">
            <li>
              <a href={PARENT} className="text-brand-navy hover:text-brand-purple transition-colors">
                Site
              </a>
            </li>
            <li>
              <a href={`${PARENT}/sobre`} className="text-brand-navy hover:text-brand-purple transition-colors">
                Sobre
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t hairline">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[10px] uppercase tracking-[0.18em] text-brand-gray">
          <span>Prisma · 2026</span>
          <span>Marketing Mix Modeling · IA · Ridge + Adstock</span>
        </div>
      </div>
    </footer>
  );
}
