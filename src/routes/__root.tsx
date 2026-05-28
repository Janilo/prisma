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
      { title: "Prisma · O que move suas vendas, por canal" },
      { name: "description", content: "Suba uma planilha e veja quanto cada canal contribuiu para suas vendas. Decomposição semanal, ROI por variável, modelo estatístico sem código." },
      { property: "og:title", content: "Prisma · O que move suas vendas, por canal" },
      { property: "og:description", content: "Suba uma planilha e veja quanto cada canal contribuiu para suas vendas. Decomposição semanal, ROI por variável, modelo estatístico sem código." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Prisma · O que move suas vendas, por canal" },
      { name: "twitter:description", content: "Suba uma planilha e veja quanto cada canal contribuiu para suas vendas. Decomposição semanal, ROI por variável, modelo estatístico sem código." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e60cc451-29fc-44ed-a682-76559e6a33fe/id-preview-c40cb67c--08173dd6-2e41-4abf-a10f-3a3bb04241da.lovable.app-1779935454083.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e60cc451-29fc-44ed-a682-76559e6a33fe/id-preview-c40cb67c--08173dd6-2e41-4abf-a10f-3a3bb04241da.lovable.app-1779935454083.png" },
      { name: "twitter:card", content: "summary_large_image" },
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
