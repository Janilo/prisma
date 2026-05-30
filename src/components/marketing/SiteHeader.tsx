const PARENT = "https://pereirasaraiva.com";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-paper/80 backdrop-blur supports-[backdrop-filter]:bg-paper/70 border-b hairline">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-5 flex items-center justify-between">
        {/* Wordmark */}
        <div className="flex items-center gap-4">
          <a href="/" className="group">
            <img
              src="/prisma-assets/wordmark-prisma.svg"
              alt="Prisma"
              className="h-6 w-auto md:h-7 group-hover:opacity-80 transition-opacity"
            />
          </a>
          <a href={PARENT} target="_blank" rel="noopener noreferrer" className="hidden sm:inline font-sans text-[10px] uppercase tracking-[0.18em] text-mute hover:opacity-70 transition-opacity">
            por J P Saraiva
          </a>
        </div>

        {/* Right actions */}
        <nav className="flex items-center gap-6">
          <a
            href="/methodology"
            className="text-xs font-bold uppercase tracking-[0.18em] text-abyss/70 hover:text-abyss transition-colors"
          >
            Metodologia
          </a>
          <a
            href="/login"
            className="text-xs font-bold uppercase tracking-[0.18em] text-abyss/70 hover:text-abyss transition-colors"
          >
            Entrar
          </a>
          <a
            href="/login?mode=signup"
            className="inline-flex items-center gap-2 bg-indigo text-white px-5 py-2.5 text-xs font-bold uppercase tracking-[0.18em] hover:opacity-90 transition-opacity"
          >
            Criar conta <span aria-hidden>→</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
