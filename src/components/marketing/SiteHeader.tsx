import { useState } from "react";

const PARENT = "https://pereirasaraiva.com";

const SIBLINGS = [
  { label: "Cascata", href: "https://cascata.pereirasaraiva.com" },
  { label: "Lente", href: "https://lente.pereirasaraiva.com" },
] as const;

const INSTITUTIONAL = [
  { label: "Sobre", href: `${PARENT}/sobre` },
  { label: "Contato", href: `${PARENT}/contato` },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-brand-offwhite border-b hairline">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 h-20 flex items-center justify-between">
        {/* Wordmark */}
        <a href={PARENT} className="flex items-baseline gap-3 group">
          <span className="font-display text-2xl text-brand-purple group-hover:opacity-80 transition-opacity">
            J P Saraiva
          </span>
          <span className="hidden sm:inline text-brand-gray">·</span>
          <span className="hidden sm:inline font-sans text-xs uppercase tracking-[0.18em] text-brand-gray">
            Prisma
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {SIBLINGS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-xs font-bold uppercase tracking-[0.18em] text-brand-navy/70 hover:text-brand-navy transition-colors"
            >
              {item.label}
            </a>
          ))}
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-brand-navy border-b border-brand-mustard pb-0.5">
            Prisma
          </span>
          <span className="h-4 w-px bg-brand-navy/15" />
          {INSTITUTIONAL.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-xs font-bold uppercase tracking-[0.18em] text-brand-navy/70 hover:text-brand-navy transition-colors"
            >
              {item.label}
            </a>
          ))}
          <a
            href={`${PARENT}/contato`}
            className="ml-2 inline-flex items-center gap-2 bg-brand-purple text-white px-5 py-2.5 text-xs font-bold uppercase tracking-[0.18em] hover:opacity-90 transition-opacity"
          >
            Agendar <span aria-hidden>→</span>
          </a>
        </nav>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden text-xs font-bold uppercase tracking-[0.18em] text-brand-navy"
          aria-label="Abrir menu"
        >
          {open ? "Fechar" : "Menu"}
        </button>
      </div>

      {/* Mobile panel */}
      {open && (
        <div className="md:hidden border-t hairline bg-brand-offwhite">
          <div className="px-6 py-6 flex flex-col gap-4">
            {[...SIBLINGS, ...INSTITUTIONAL].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-xs font-bold uppercase tracking-[0.18em] text-brand-navy"
              >
                {item.label}
              </a>
            ))}
            <a
              href={`${PARENT}/contato`}
              className="inline-flex items-center justify-center gap-2 bg-brand-purple text-white px-5 py-3 text-xs font-bold uppercase tracking-[0.18em]"
            >
              Agendar <span aria-hidden>→</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
