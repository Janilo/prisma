const PARENT = "https://pereirasaraiva.com";

export function SiteFooter() {
  return (
    <footer className="border-t hairline bg-paper">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-14 grid gap-12 md:grid-cols-2">

        <div>
          <p className="eyebrow mb-4">Outros produtos</p>
          <ul className="space-y-2 text-sm">
            <li>
              <a
                href="https://cascata.pereirasaraiva.com"
                className="text-abyss hover:text-indigo transition-colors"
              >
                Cascata <span className="text-mute">· Price Waterfall</span>
              </a>
            </li>
            <li>
              <a
                href="https://lente.pereirasaraiva.com"
                className="text-abyss hover:text-indigo transition-colors"
              >
                Lente <span className="text-mute">· Pesquisa Qualitativa</span>
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="eyebrow mb-4">Pereira Saraiva</p>
          <ul className="space-y-2 text-sm">
            <li>
              <a href={PARENT} className="text-abyss hover:text-indigo transition-colors">
                Site
              </a>
            </li>
            <li>
              <a href={`${PARENT}/sobre`} className="text-abyss hover:text-indigo transition-colors">
                Sobre
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t hairline">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[10px] uppercase tracking-[0.18em] text-mute">
          <span>Prisma · 2026</span>
          <span>Marketing Mix Modeling</span>
        </div>
      </div>
    </footer>
  );
}
