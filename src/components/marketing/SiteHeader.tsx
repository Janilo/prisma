const PARENT = "https://pereirasaraiva.com";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-brand-offwhite border-b hairline">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 h-20 flex items-center justify-between">
        {/* Wordmark */}
        <div className="flex items-center gap-4">
          <a href="/" className="group">
            <img
              src="/prisma-assets/wordmark-prisma.svg"
              alt="Prisma"
              className="h-7 w-auto group-hover:opacity-80 transition-opacity"
            />
          </a>
          <a href={PARENT} target="_blank" rel="noopener noreferrer" className="hidden sm:inline font-sans text-[10px] uppercase tracking-[0.18em] text-brand-gray hover:opacity-70 transition-opacity">
            por J P Saraiva
          </a>
        </div>

        {/* Right actions */}
        <nav className="flex items-center gap-6">
          <a
            href="/methodology"
            className="text-xs font-bold uppercase tracking-[0.18em] text-brand-navy/70 hover:text-brand-navy transition-colors"
          >
            Metodologia
          </a>
          <a
            href="/login"
            className="text-xs font-bold uppercase tracking-[0.18em] text-brand-navy/70 hover:text-brand-navy transition-colors"
          >
            Entrar
          </a>
          <a
            href="/login?mode=signup"
            className="inline-flex items-center gap-2 bg-brand-purple text-white px-5 py-2.5 text-xs font-bold uppercase tracking-[0.18em] hover:opacity-90 transition-opacity"
          >
            Criar conta <span aria-hidden>→</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
