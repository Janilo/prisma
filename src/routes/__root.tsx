import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";

import { supabase } from "@/integrations/supabase/client";
import { userMessageFrom } from "@/lib/errors";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center">
      <div className="max-w-md">
        <p className="mb-6 text-[10px] font-bold uppercase tracking-[0.22em] text-gold">404</p>
        <h1 className="font-display text-[44px] font-light italic leading-tight text-abyss">
          Página não encontrada.
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-abyss/60">
          O link pode estar desatualizado ou a página foi movida.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            to="/login"
            className="inline-flex items-center bg-indigo px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-white transition-opacity hover:opacity-85"
          >
            Entrar
          </Link>
          <a
            href="https://pereirasaraiva.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center border border-abyss/20 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-abyss transition-opacity hover:opacity-85"
          >
            J P Saraiva
          </a>
          <Link
            to="/"
            className="inline-flex items-center text-[11px] font-semibold uppercase tracking-[0.22em] text-abyss/50 hover:text-abyss"
          >
            Ir para o início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  // Only AppError messages are written for users; anything else (infra,
  // Supabase, bug) stays in the console and renders as a generic line.
  const message = userMessageFrom(error) ?? "Algo deu errado do nosso lado. Tente novamente.";
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="max-w-md text-center">
        <p className="eyebrow">Erro</p>
        <h1 className="mt-3 font-display text-2xl text-abyss">Essa página falhou ao carregar</h1>
        <p className="mt-3 text-sm text-abyss/70">{message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="bg-abyss px-6 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-indigo"
          >
            Tentar de novo
          </button>
          <a
            href="/"
            className="border border-abyss/20 bg-white px-6 py-2 text-xs font-bold uppercase tracking-widest text-abyss hover:bg-indigo-soft"
          >
            Início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Prisma · O que move suas vendas, por canal" },
      {
        name: "description",
        content:
          "Marketing Mix Modeling sem código. Suba uma planilha e veja quanto cada canal contribuiu para suas vendas — atribuição, elasticidade e ROI.",
      },
      { property: "og:title", content: "Prisma · O que move suas vendas, por canal" },
      {
        property: "og:description",
        content:
          "Marketing Mix Modeling sem código. Suba uma planilha e veja quanto cada canal contribuiu para suas vendas — atribuição, elasticidade e ROI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Prisma · O que move suas vendas, por canal" },
      {
        name: "twitter:description",
        content:
          "Marketing Mix Modeling sem código. Suba uma planilha e veja quanto cada canal contribuiu para suas vendas — atribuição, elasticidade e ROI.",
      },
      { property: "og:image", content: "https://prisma.pereirasaraiva.com/og-social.png" },
      { name: "twitter:image", content: "https://prisma.pereirasaraiva.com/og-social.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "google-site-verification", content: "kbiLQWHuF0-ziT6y9mGuE2Cj7PqUFiphcc9AbbG12bE" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "canonical", href: "https://prisma.pereirasaraiva.com/" },
      {
        rel: "preload",
        href: "/fonts/Fraunces-VariableFont_SOFT_WONK_opsz_wght.ttf",
        as: "font",
        type: "font/ttf",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        href: "/fonts/InterTight-VariableFont_wght.ttf",
        as: "font",
        type: "font/ttf",
        crossOrigin: "anonymous",
      },
    ],
    scripts: [
      {
        src: "https://www.googletagmanager.com/gtag/js?id=G-QDHKZ82GE0",
        async: true,
      },
      {
        children:
          "window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-QDHKZ82GE0');",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AuthListener() {
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
      queryClient.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [router, queryClient]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthListener />
      <Outlet />
      <Toaster position="bottom-right" />
    </QueryClientProvider>
  );
}
