import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade · Prisma" },
      {
        name: "description",
        content: "Como coletamos, usamos e protegemos seus dados pessoais de acordo com a LGPD.",
      },
      { property: "og:title", content: "Política de Privacidade · Prisma" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://prisma.pereirasaraiva.com/privacidade" }],
  }),
  component: PrivacidadePage,
});

function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20 md:px-10">
      <p className="eyebrow mb-6">Legal</p>
      <h1 className="font-display text-[36px] font-light italic leading-tight text-abyss mb-2">
        Política de Privacidade
      </h1>
      <p className="text-sm text-mute mb-12">Última atualização: maio de 2026</p>

      <div className="space-y-10 text-[15px] leading-relaxed text-abyss/80">
        <Section title="1. Quem somos">
          <p>
            Prisma é um produto desenvolvido e operado por Janilo Pereira Saraiva (J P Saraiva),
            consultoria independente sediada em São Paulo — SP. Atuamos como{" "}
            <strong>controlador</strong> dos dados pessoais tratados neste aplicativo.
          </p>
          <p className="mt-3">
            Dúvidas:{" "}
            <a
              href="mailto:janilo@pereirasaraiva.com"
              className="underline underline-offset-4 hover:text-indigo transition-colors"
            >
              janilo@pereirasaraiva.com
            </a>
          </p>
        </Section>

        <Section title="2. Dados coletados">
          <table className="mt-3 w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b hairline text-left">
                <th className="pb-2 font-semibold text-mute">Origem</th>
                <th className="pb-2 font-semibold text-mute">Dado</th>
                <th className="pb-2 font-semibold text-mute">Finalidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone">
              <tr>
                <td className="py-3 pr-4">Cadastro</td>
                <td className="py-3 pr-4">E-mail, senha</td>
                <td className="py-3">Autenticação e acesso ao app</td>
              </tr>
              <tr>
                <td className="py-3 pr-4">Planilhas enviadas</td>
                <td className="py-3 pr-4">Dados de gastos e vendas</td>
                <td className="py-3">Execução do modelo MMM</td>
              </tr>
              <tr>
                <td className="py-3 pr-4">Uso do app</td>
                <td className="py-3 pr-4">Logs de sessão</td>
                <td className="py-3">Diagnóstico e melhoria do serviço</td>
              </tr>
            </tbody>
          </table>
        </Section>

        <Section title="3. Base legal (LGPD)">
          <ul className="mt-2 space-y-2">
            <li>
              <strong>Autenticação e execução do modelo</strong> — execução de contrato (art. 7º, V
              da Lei 13.709/2018).
            </li>
            <li>
              <strong>Logs e melhoria</strong> — legítimo interesse (art. 7º, IX).
            </li>
          </ul>
        </Section>

        <Section title="4. Compartilhamento">
          <p>Seus dados são processados pelos seguintes fornecedores de infraestrutura:</p>
          <ul className="mt-3 space-y-1">
            <li>Supabase (banco de dados e autenticação)</li>
            <li>Cloudflare (hospedagem e CDN)</li>
          </ul>
          <p className="mt-3">
            Não vendemos nem cedemos dados pessoais a terceiros para fins de marketing.
          </p>
        </Section>

        <Section title="5. Retenção">
          <p>
            Dados de conta e planilhas mantidos enquanto a conta estiver ativa. Excluídos em até 30
            dias após solicitação de encerramento.
          </p>
        </Section>

        <Section title="6. Seus direitos">
          <p>
            Nos termos do art. 18 da LGPD, você pode solicitar acesso, correção, exclusão e
            portabilidade dos seus dados. Envie para{" "}
            <a
              href="mailto:janilo@pereirasaraiva.com"
              className="underline underline-offset-4 hover:text-indigo transition-colors"
            >
              janilo@pereirasaraiva.com
            </a>
            . Responderemos em até 15 dias úteis.
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
