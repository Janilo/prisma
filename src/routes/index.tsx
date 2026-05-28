import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { MethodSection } from "@/components/marketing/MethodSection";

const OG_IMAGE = "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/47fc7d9a-9d0b-4fdd-b478-43819dd6f0fb/id-preview-024b0073--08173dd6-2e41-4abf-a10f-3a3bb04241da.lovable.app-1779934609120.png";

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
      { name: "description", content: "Suba uma planilha de gastos e vendas. Prisma roda Ridge com adstock e saturação e mostra contribuição em R$, ROI por canal e base vs. incremental." },
      { property: "og:title", content: "Prisma · Marketing Mix Modeling" },
      { property: "og:description", content: "MMM com Ridge, adstock e saturação a partir da sua planilha." },
      { property: "og:url", content: "https://prisma.pereirasaraiva.com/" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:title", content: "Prisma · Marketing Mix Modeling" },
      { name: "twitter:description", content: "MMM com Ridge, adstock e saturação a partir da sua planilha." },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [
      { rel: "canonical", href: "https://prisma.pereirasaraiva.com/" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen bg-brand-offwhite flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="bg-brand-creme border-b hairline">
          <div className="mx-auto max-w-7xl px-6 lg:px-10 py-20 lg:py-28 grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <p className="eyebrow">Marketing Mix Modeling</p>
              <h1 className="font-display text-4xl lg:text-6xl font-light italic text-brand-navy leading-tight">
                Decomponha suas vendas no canal que realmente moveu o ponteiro.
              </h1>
              <p className="text-base text-brand-navy/70 leading-relaxed max-w-lg">
                Você sobe uma planilha de gastos e vendas. Prisma roda Ridge com adstock e saturação,
                mostra contribuição em R$, ROI por canal e o quanto é base versus incremental.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/login"
                  className="inline-flex items-center bg-brand-navy text-white px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-brand-purple"
                >
                  Entrar
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center border border-brand-navy/20 bg-white text-brand-navy px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-brand-creme"
                >
                  Criar conta
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-px bg-brand-navy/10 border hairline">
              <div className="bg-brand-creme p-6">
                <p className="font-display text-3xl text-brand-navy">R²</p>
                <p className="text-[10px] text-brand-gray uppercase tracking-widest mt-2">Ajuste</p>
              </div>
              <div className="bg-brand-creme p-6">
                <p className="font-display text-3xl text-brand-navy">ROI</p>
                <p className="text-[10px] text-brand-gray uppercase tracking-widest mt-2">Por canal</p>
              </div>
              <div className="bg-brand-creme p-6">
                <p className="font-display text-3xl text-brand-mustard">★</p>
                <p className="text-[10px] text-brand-gray uppercase tracking-widest mt-2">Significância</p>
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
