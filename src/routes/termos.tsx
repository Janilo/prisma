import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso · Prisma" },
      { name: "description", content: "Termos e condições de uso do Prisma." },
      { property: "og:title", content: "Termos de Uso · Prisma" },
      { name: "robots", content: "noindex" },
      { property: "og:url", content: "https://prisma.pereirasaraiva.com/termos" },
    ],
    links: [{ rel: "canonical", href: "https://prisma.pereirasaraiva.com/termos" }],
  }),
  component: TermosPage,
});

function TermosPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20 md:px-10">
      <p className="eyebrow mb-6">Legal</p>
      <h1 className="font-display text-[36px] font-light italic leading-tight text-abyss mb-2">
        Termos de Uso
      </h1>
      <p className="text-sm text-mute mb-12">Última atualização: maio de 2026</p>

      <div className="space-y-10 text-[15px] leading-relaxed text-abyss/80">
        <Section title="1. Aceitação">
          <p>
            Ao criar uma conta ou usar o Prisma, você concorda com estes Termos. Se não concordar,
            não utilize o serviço.
          </p>
        </Section>

        <Section title="2. Sobre o serviço">
          <p>
            Prisma é uma ferramenta de Marketing Mix Modeling desenvolvida por Janilo Pereira
            Saraiva (J P Saraiva), sediado em São Paulo — SP. O serviço permite modelar a
            contribuição de canais de marketing a partir de planilhas de gastos e vendas.
          </p>
        </Section>

        <Section title="3. Uso aceitável">
          <p>Ao usar o Prisma, você concorda em não:</p>
          <ul className="mt-3 space-y-1">
            <li>Enviar planilhas com dados de terceiros sem autorização</li>
            <li>Compartilhar suas credenciais de acesso</li>
            <li>Tentar acessar dados de outros usuários ou contornar mecanismos de segurança</li>
            <li>Usar os resultados para fins fraudulentos ou enganosos</li>
          </ul>
        </Section>

        <Section title="4. Propriedade dos dados">
          <p>
            Você retém a propriedade das planilhas enviadas. Ao usar o serviço, concede licença
            limitada para processar esses dados exclusivamente para execução do modelo.
          </p>
        </Section>

        <Section title="5. Limitação de responsabilidade">
          <p>
            O serviço é fornecido &ldquo;como está&rdquo;. J P Saraiva não se responsabiliza por
            decisões comerciais ou de investimento tomadas com base nos resultados gerados pelo
            Prisma.
          </p>
        </Section>

        <Section title="6. Privacidade">
          <p>
            O tratamento de dados pessoais é descrito em nossa{" "}
            <Link
              to="/privacidade"
              className="underline underline-offset-4 hover:text-indigo transition-colors"
            >
              Política de Privacidade
            </Link>
            , que integra estes Termos por referência.
          </p>
        </Section>

        <Section title="7. Foro">
          <p>
            Estes Termos são regidos pelas leis brasileiras. Foro eleito: Comarca de São Paulo — SP.
          </p>
        </Section>

        <div className="border-t hairline pt-8">
          <Link
            to="/"
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mute hover:text-abyss transition-colors"
          >
            ← Voltar para o início
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 font-display text-[20px] font-medium text-abyss">{title}</h2>
      {children}
    </section>
  );
}
