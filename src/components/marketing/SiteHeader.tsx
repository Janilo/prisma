import { Link } from "@tanstack/react-router";

const PARENT = "https://pereirasaraiva.com";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-paper/80 backdrop-blur supports-[backdrop-filter]:bg-paper/70 border-b hairline h-[var(--header-height)]">
      <div className="mx-auto max-w-6xl px-8 h-full flex items-center justify-between">
        {/* Wordmark */}
        <div className="flex items-center gap-3 h-8">
          <Link to="/" className="group" aria-label="Prisma — início">
            <img
              src="/prisma-assets/wordmark-prisma.svg"
              alt="Prisma"
              className="h-[22px] w-auto block group-hover:opacity-80 transition-opacity"
            />
          </Link>
          <a
            href={PARENT}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline text-[13px] font-normal text-mute tracking-normal normal-case hover:opacity-70 transition-opacity"
          >
            por J P Saraiva
          </a>
        </div>

        {/* Right actions */}
        <nav className="flex items-center gap-6 sm:gap-8">
          <Link
            to="/methodology"
            className="hidden sm:inline text-xs font-semibold uppercase tracking-[0.18em] text-foreground/70 hover:text-foreground transition-colors"
          >
            Metodologia
          </Link>
          <Link
            to="/login"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/70 hover:text-foreground transition-colors"
          >
            Entrar
          </Link>
          <Link
            to="/login"
            search={{ mode: "signup" }}
            className="inline-flex items-center gap-2 bg-abyss text-white px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] hover:opacity-90 transition-opacity"
          >
            Criar conta <span aria-hidden>→</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
