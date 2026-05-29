import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
      { title: "Metodologia — Prisma" },
      { name: "description", content: "Decisões metodológicas do Prisma: Ridge vs OLS, adstock geométrico, saturação Hill e limites do modelo." },
      { property: "og:title", content: "Metodologia do Prisma" },
      { property: "og:description", content: "Ridge vs OLS, adstock geométrico, saturação Hill e os limites do MMM." },
    ],
    links: [{ rel: "canonical", href: "https://prisma.pereirasaraiva.com/methodology" }],
  }),
  component: MethodologyPage,
});

function MethodologyPage() {
  return (
    <div className="min-h-screen bg-brand-offwhite flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-6 lg:px-10 py-16">
          <p className="eyebrow">Documentação</p>
          <h1 className="mt-2 font-display text-4xl font-light italic text-brand-ink">
            Metodologia
          </h1>
          <p className="mt-4 text-sm text-brand-gray italic">
            Por que o Prisma faz as escolhas que faz — e onde elas falham.
          </p>

          <Section title="Ridge vs OLS">
            <p>
              O Prisma estima coeficientes por <strong>regressão Ridge</strong> (Tikhonov) por padrão.
              Em MMM, as variáveis de mídia tendem a ser <em>colineares</em>: campanhas sobem juntas
              em datas comerciais, e a separação dos efeitos individuais por OLS fica instável — pequenas
              mudanças nos dados produzem grandes mudanças nos coeficientes. Ridge adiciona uma
              penalização <span className="font-mono">α‖β‖²</span> que <em>encolhe</em> os coeficientes
              em direção a zero, trocando um pouco de viés por bastante redução de variância (Hoerl &
              Kennard, 1970). O custo é que a inferência clássica deixa de valer: os p-values exibidos
              são aproximações usando a variância residual e (X′X+αI)⁻¹, e <em>subestimam</em> a
              incerteza. Para inferência rigorosa, rode novamente com <span className="font-mono">α=0</span>{" "}
              (OLS puro) — quando a colinearidade permite — e use os p-values dessa rodada.
            </p>
          </Section>

          <Section title="Adstock geométrico">
            <p>
              Mídia tem efeito que persiste: um spot de TV impacta vendas por semanas. O Prisma modela
              esse carryover com <strong>adstock geométrico</strong>:{" "}
              <span className="font-mono">aₜ = xₜ + λ·aₜ₋₁</span>, com{" "}
              <span className="font-mono">λ ∈ [0,1)</span>. É a forma funcional original do MMM moderno
              (Broadbent, 1979) e continua sendo o baseline de praticamente toda a literatura —
              incluindo o framework Robyn (Meta, 2021) e o LightweightMMM (Google, 2022). Tem dois
              parâmetros conceituais (decay e meia-vida) que são equivalentes e interpretáveis. O
              Prisma permite <strong>λ por canal</strong>, porque TV tende a λ ≈ 0.5–0.8 (semanas de
              eco) enquanto search paid tende a λ ≈ 0 (consumo imediato). Usar um λ global achata
              esses contrastes e enviesa a atribuição.
            </p>
          </Section>

          <Section title="Saturação Hill">
            <p>
              Investir o dobro em um canal raramente entrega o dobro de vendas — há rendimentos
              decrescentes. O Prisma aplica a função de <strong>Hill</strong>:{" "}
              <span className="font-mono">f(x) = xᵏ / (xᵏ + x₅₀ᵏ)</span>, em que{" "}
              <span className="font-mono">x₅₀</span> é o ponto de meio-efeito e{" "}
              <span className="font-mono">k</span> controla a inclinação. É uma curva-S flexível
              (Jin et al., 2017; Robyn docs) que cobre desde quase-linear até saturação acentuada
              com poucos parâmetros. Sob Hill, o ROI marginal cai conforme o canal cresce, então as
              recomendações do simulador de realocação são confiáveis para movimentos pequenos
              (±15–25%) e progressivamente otimistas para grandes aumentos em um único canal.
            </p>
          </Section>

          <Section title="Limites do modelo">
            <p>
              MMM observacional não é experimento. Não controlamos as decisões de mídia, então não
              há identificação causal estrita: o que sai é a melhor <em>associação condicional</em>{" "}
              dado o que foi observado. Quatro limites práticos: (1) <strong>colinearidade</strong>{" "}
              residual após Ridge — canais que sempre sobem juntos têm atribuição instável; use VIF
              no <em>explore</em> para diagnosticar; (2) <strong>variáveis omitidas</strong>{" "}
              (concorrência, distribuição, preço) entram na base ou poluem coeficientes;
              (3) <strong>poucos pontos</strong> — semanas &lt; 2× variáveis é overfit garantido,
              mesmo com R² alto; valide com holdout out-of-sample; (4) <strong>regime</strong>{" "}
              — o modelo aprende a relação histórica; mudanças estruturais (pandemia, novo canal,
              rebrand) quebram a extrapolação.
            </p>
          </Section>

          <Section title="Referências">
            <ul className="text-xs space-y-2 font-mono text-brand-gray leading-relaxed">
              <li>Hoerl, A. E., &amp; Kennard, R. W. (1970). Ridge regression: Biased estimation for nonorthogonal problems. <em>Technometrics</em>, 12(1), 55–67.</li>
              <li>Broadbent, S. (1979). One way TV advertisements work. <em>Journal of the Market Research Society</em>, 21(3), 139–166.</li>
              <li>Jin, Y., Wang, Y., Sun, Y., Chan, D., &amp; Koehler, J. (2017). Bayesian methods for media mix modeling with carryover and shape effects. <em>Google Research</em>.</li>
              <li>Chan, D., &amp; Perry, M. (2017). Challenges and opportunities in media mix modeling. <em>Google Research</em>.</li>
              <li>Meta Open Source (2021). <em>Robyn: Automated Marketing Mix Modeling</em>. facebookexperimental.github.io/Robyn.</li>
              <li>Google (2022). <em>LightweightMMM</em>. github.com/google/lightweight_mmm.</li>
            </ul>
          </Section>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl text-brand-ink border-b hairline-strong pb-2">{title}</h2>
      <div className="mt-4 text-sm leading-relaxed text-brand-ink/85 [&_strong]:text-brand-ink">
        {children}
      </div>
    </section>
  );
}
