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
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-offwhite px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-light italic text-brand-navy">404</h1>
        <p className="eyebrow mt-6">Página não encontrada</p>
        <p className="mt-4 text-sm text-brand-navy/70">
          A rota que você procurou não existe nesse projeto.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center bg-brand-navy px-6 py-2 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-brand-purple"
          >
            Voltar
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-offwhite px-4">
      <div className="max-w-md text-center">
        <p className="eyebrow">Erro</p>
        <h1 className="mt-3 font-display text-2xl text-brand-navy">Essa página falhou ao carregar</h1>
        <p className="mt-3 text-sm text-brand-navy/70">{error.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="bg-brand-navy px-6 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-brand-purple"
          >
            Tentar de novo
          </button>
          <a
            href="/"
            className="border border-brand-navy/20 bg-white px-6 py-2 text-xs font-bold uppercase tracking-widest text-brand-navy hover:bg-brand-creme"
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
      { title: "Prisma · Marketing Mix Modeling" },
      { name: "description", content: "Suba uma planilha e veja o que de fato move suas vendas. MMM com Ridge, decomposição no tempo e ROI por canal." },
      { property: "og:title", content: "Prisma · Marketing Mix Modeling" },
      { property: "og:description", content: "Decomponha vendas por canal, com confiança estatística." },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&family=Inter+Tight:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
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
