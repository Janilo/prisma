import { Link } from "@tanstack/react-router";

const PARENT = "https://pereirasaraiva.com";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b hairline bg-paper/80 backdrop-blur supports-[backdrop-filter]:bg-paper/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-5">
        <div className="inline-flex items-center gap-3">
          <Link to="/" aria-label="Prisma — início" className="inline-flex items-center hover:opacity-80 transition-opacity">
            <img
              src="/prisma-assets/wordmark-prisma.svg"
              alt="Prisma"
              className="h-6 w-auto md:h-7"
            />
          </Link>
          <a
            href={PARENT}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline text-[11px] font-semibold uppercase tracking-[0.18em] text-mute hover:opacity-70 transition-opacity"
          >
            por J P Saraiva
          </a>
        </div>
        <nav className="flex items-center gap-6 sm:gap-8">
          <Link
            to="/methodology"
            className="hidden sm:inline text-[11px] font-semibold uppercase tracking-[0.18em] text-abyss transition-opacity hover:opacity-70"
          >
            Metodologia
          </Link>
          <Link
            to="/login"
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-abyss transition-opacity hover:opacity-70"
          >
            Entrar
          </Link>
          <Link
            to="/login"
            search={{ mode: "signup" }}
            className="inline-flex items-center gap-2 bg-indigo text-white px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] hover:opacity-90 transition-opacity"
          >
            Criar conta <span aria-hidden>→</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
