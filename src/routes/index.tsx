import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { MethodSection } from "@/components/marketing/MethodSection";

const OG_IMAGE =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/47fc7d9a-9d0b-4fdd-b478-43819dd6f0fb/id-preview-024b0073--08173dd6-2e41-4abf-a10f-3a3bb04241da.lovable.app-1779934609120.png";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      throw redirect({ to: "/upload" });
    }
  },
  head: () => ({
    meta: [
      { title: "Prisma · Marketing Mix Modeling" },
      {
        name: "description",
        content:
          "Suba uma planilha de gastos e vendas. Prisma roda Ridge com adstock e saturação e mostra contribuição em R$, ROI por canal e base vs. incremental.",
      },
      { property: "og:title", content: "Prisma · Marketing Mix Modeling" },
      { property: "og:description", content: "MMM com Ridge, adstock e saturação a partir da sua planilha." },
      { property: "og:url", content: "https://prisma.pereirasaraiva.com/" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:title", content: "Prisma · Marketing Mix Modeling" },
      { name: "twitter:description", content: "MMM com Ridge, adstock e saturação a partir da sua planilha." },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: "https://prisma.pereirasaraiva.com/" }],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <SiteHeader />
      <main className="flex-1">

        {/* Hero */}
        <section className="bg-paper border-b hairline">

          <div className="mx-auto max-w-5xl px-6 pt-24 pb-16">
            <div className="max-w-3xl space-y-8">
              <p className="eyebrow">Marketing Mix Modeling</p>
              <h1 className="font-display lg:text-6xl font-light italic text-abyss leading-tight text-7xl">
                Decomponha suas vendas no canal que realmente moveu o ponteiro.
              </h1>
              <p className="text-base text-abyss/70 leading-relaxed max-w-lg">
                Você sobe uma planilha de gastos e vendas. Prisma roda Ridge com adstock e saturação,
                mostra contribuição em R$, ROI por canal e o quanto é base versus incremental.
              </p>
              <div className="flex flex-wrap items-start gap-3">
                <Link
                  to="/login"
                  search={{ mode: "signup" }}
                  className="inline-flex items-center justify-center gap-2 h-10 px-8 text-xs font-bold uppercase tracking-widest bg-abyss text-white hover:bg-indigo transition-colors"
                >
                  Criar conta
                </Link>
                <div className="inline-flex flex-col gap-1.5">
                  <Link
                    to="/demo"
                    className="inline-flex items-center justify-center gap-2 h-10 px-8 text-xs font-bold uppercase tracking-widest border-[1.5px] border-abyss text-abyss hover:bg-abyss hover:text-white transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Ver demo
                  </Link>
                  <p className="text-[11px] text-[#5F5B55] leading-[1.7]">
                    Dados fictícios<br />
                    sem cadastro<br />
                    roda em segundos
                  </p>
                </div>
                <Link
                  to="/login"
                  className="inline-flex items-center self-start mt-3 text-xs font-bold uppercase tracking-widest text-abyss/60 hover:text-abyss transition-colors"
                >
                  Entrar
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* O que você recebe */}
        <section className="bg-indigo-soft border-b hairline">

          <div className="mx-auto max-w-5xl px-6 py-20">
            <div className="flex items-end justify-between gap-8 mb-10">
              <div>
                <p className="eyebrow">O que você recebe</p>
                <h2 className="font-display text-4xl lg:text-5xl font-light italic text-abyss mt-4 leading-tight max-w-2xl">
                  ROI por canal, decomposição no tempo e base vs. incremental.
                </h2>
              </div>
              <p className="hidden lg:block text-sm text-abyss/60 max-w-xs">
                Cada canal de mídia com sua contribuição em R$, ROI e ranking de robustez — exportável como relatório.
              </p>
            </div>

            <figure className="border hairline bg-indigo-soft p-6 lg:p-8 mb-6">
              <figcaption className="flex items-baseline justify-between mb-6">
                <p className="eyebrow">Contribuição por canal</p>
                <p className="text-[10px] text-mute uppercase tracking-widest">R$ · últimos 12 meses</p>
              </figcaption>
              {(() => {
                const data = [
                  { label: "Base",   value: 58, color: "var(--prisma-baseline)" },
                  { label: "Google", value: 14, color: "var(--prisma-ch-3)" },
                  { label: "Meta",   value: 11, color: "var(--prisma-ch-4)" },
                  { label: "TV",     value:  8, color: "var(--prisma-ch-1)" },
                  { label: "OOH",    value:  5, color: "var(--prisma-ch-6)" },
                  { label: "Promo",  value:  4, color: "var(--prisma-ch-5)" },
                ];
                const max = Math.max(...data.map((d) => d.value));
                return (
                  <div className="space-y-3">
                    {data.map((d) => (
                      <div key={d.label} className="flex items-center gap-4">
                        <span className="w-16 text-[11px] uppercase tracking-widest text-abyss/70">{d.label}</span>
                        <div className="flex-1 h-6 bg-abyss/5 relative">
                          <div
                            className="h-full"
                            style={{ width: `${(d.value / max) * 100}%`, background: d.color }}
                          />
                        </div>
                        <span className="w-10 text-right font-display text-sm text-abyss tabular-nums">{d.value}%</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
              <div className="mt-6 pt-4 border-t hairline grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="font-display text-lg text-abyss">0.91</p>
                  <p className="text-[10px] text-mute uppercase tracking-widest mt-1">R²</p>
                </div>
                <div>
                  <p className="font-display text-lg text-abyss">3.2x</p>
                  <p className="text-[10px] text-mute uppercase tracking-widest mt-1">ROI médio</p>
                </div>
                <div>
                  <p className="font-display text-lg text-violet">42%</p>
                  <p className="text-[10px] text-mute uppercase tracking-widest mt-1">Incremental</p>
                </div>
              </div>
            </figure>

            <div className="border hairline bg-white overflow-hidden">
              <div className="px-6 py-3 border-b hairline bg-indigo-soft flex items-center justify-between">
                <p className="eyebrow">ROI por canal · último modelo</p>
                <p className="text-[10px] text-mute uppercase tracking-widest">50 semanas · dataset de exemplo</p>
              </div>
              <div className="divide-y hairline">
                {[
                  { canal: "Google", investido: "R$ 245k", gerou: "R$ 782k", roi: "3.19×", conf: "★★★" },
                  { canal: "Meta",   investido: "R$ 198k", gerou: "R$ 494k", roi: "2.49×", conf: "★★"  },
                  { canal: "TV",     investido: "R$ 420k", gerou: "R$ 672k", roi: "1.60×", conf: "★★"  },
                  { canal: "OOH",    investido: "R$ 85k",  gerou: "R$ 102k", roi: "1.20×", conf: "★"   },
                ].map((row) => (
                  <div key={row.canal} className="flex items-center gap-6 px-6 py-4">
                    <span className="w-20 text-sm font-medium text-abyss">{row.canal}</span>
                    <span className="w-28 text-xs font-mono text-abyss/50">{row.investido}</span>
                    <span className="flex-1 text-xs font-mono text-abyss/50">{row.gerou}</span>
                    <span className="font-display text-xl text-abyss">{row.roi}</span>
                    <span className="text-xs text-violet w-12 text-right">{row.conf}</span>
                  </div>
                ))}
              </div>
              <div className="px-6 py-3 border-t hairline bg-indigo-soft/50">
                <p className="text-[10px] text-mute">Base (sazonalidade + intercepto): 58% da receita · R² = 0.91 · 3 canais de mídia</p>
              </div>
            </div>
          </div>
        </section>

        {/* Antes / depois */}
        <section className="border-b hairline">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <p className="eyebrow">Antes / depois</p>
            <h2 className="font-display text-4xl lg:text-5xl font-light italic text-abyss mt-4 leading-tight max-w-3xl">
              Do chute ao número: contribuição por canal com base estatística.
            </h2>

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <div className="border hairline bg-indigo-soft p-6">
                <p className="eyebrow text-abyss/40">Antes — atribuição por último clique</p>
                <div className="mt-4 space-y-2 text-sm text-abyss/60 font-mono leading-relaxed">
                  <p>Google: 100% da conversão (último clique)</p>
                  <p>Meta: 0% (não converteu diretamente)</p>
                  <p>TV: 0% (sem tracking de clique)</p>
                  <p>OOH: 0% (sem tracking de clique)</p>
                  <p className="text-abyss/30">… verba migra para o canal que clicou por último</p>
                  <p className="text-abyss/30">… TV e OOH invisíveis no modelo</p>
                </div>
              </div>

              <div className="border border-violet/40 bg-white p-6">
                <p className="eyebrow text-violet">Depois — MMM com adstock e saturação</p>
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs font-mono text-mute">CONTRIBUIÇÃO REAL</p>
                    <p className="mt-1 text-base text-abyss leading-snug">Google: 14% · Meta: 11% · TV: 8% · OOH: 5% · Base: 58%</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-mute">EFEITO DEFASADO</p>
                    <p className="mt-1 text-base text-abyss leading-snug">TV e OOH contribuem nas semanas seguintes à veiculação (adstock).</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-mute">SATURAÇÃO</p>
                    <p className="mt-1 text-base text-abyss leading-snug">Google atinge retorno decrescente acima de R$ 60k/semana.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <MethodSection />
      </main>
      <SiteFooter />
    </div>
  );
}
