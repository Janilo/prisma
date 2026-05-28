import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { MethodSection } from "@/components/marketing/MethodSection";

const OG_IMAGE = "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/47fc7d9a-9d0b-4fdd-b478-43819dd6f0fb/id-preview-024b0073--08173dd6-2e41-4abf-a10f-3a3bb04241da.lovable.app-1779934609120.png";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar · Prisma" },
      { name: "description", content: "Acesse o Prisma para rodar Marketing Mix Modeling: suba sua planilha de vendas e gastos e veja contribuição, ROI por canal e decomposição base vs. incremental." },
      { property: "og:title", content: "Acesse sua conta no Prisma" },
      { property: "og:description", content: "Entre no Prisma e rode MMM com Ridge, adstock e saturação a partir da sua planilha." },
      { property: "og:url", content: "https://prisma.pereirasaraiva.com/login" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:title", content: "Acesse sua conta no Prisma" },
      { name: "twitter:description", content: "Entre no Prisma e rode MMM com Ridge, adstock e saturação." },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [
      { rel: "canonical", href: "https://prisma.pereirasaraiva.com/login" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // If already signed in, bounce to /upload
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/upload", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) navigate({ to: "/upload", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Conta criada. Entrando.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não consegui te autenticar.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Falha no login com Google.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-offwhite flex flex-col">
      <SiteHeader />
      <main className="flex-1 flex">
      {/* Left: brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-brand-creme p-16 border-r hairline">
        <div>
          <p className="eyebrow">Marketing Mix Modeling</p>
          <h2 className="mt-3 font-display text-2xl italic text-brand-navy">Prisma</h2>
        </div>
        <div className="max-w-md space-y-6">
          <h1 className="font-display text-4xl font-light italic text-brand-navy leading-tight">
            Decomponha suas vendas no canal que realmente moveu o ponteiro.
          </h1>
          <p className="text-sm text-brand-navy/70 leading-relaxed">
            Você sobe uma planilha de gastos e vendas. Prisma roda Ridge com adstock e saturação,
            mostra contribuição em R$, ROI por canal e o quanto é base versus incremental.
          </p>
          <div className="grid grid-cols-3 gap-px bg-brand-navy/10 border hairline">
            <div className="bg-brand-creme p-4">
              <p className="font-display text-2xl text-brand-navy">R²</p>
              <p className="text-[10px] text-brand-gray uppercase tracking-widest">Ajuste</p>
            </div>
            <div className="bg-brand-creme p-4">
              <p className="font-display text-2xl text-brand-navy">ROI</p>
              <p className="text-[10px] text-brand-gray uppercase tracking-widest">Por canal</p>
            </div>
            <div className="bg-brand-creme p-4">
              <p className="font-display text-2xl text-brand-mustard">★</p>
              <p className="text-[10px] text-brand-gray uppercase tracking-widest">Significância</p>
            </div>
          </div>
        </div>
        <p className="text-[10px] text-brand-gray uppercase tracking-widest">Prisma · 2026</p>
      </div>

      {/* Right: auth form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <span className="font-display text-2xl font-black italic tracking-tighter text-brand-purple lg:hidden">
            Prisma
          </span>
          <p className="eyebrow mt-8">
            {mode === "signin" ? "Acessar conta" : "Criar conta"}
          </p>
          <h2 className="mt-2 font-display text-2xl text-brand-navy">
            {mode === "signin" ? "Entre no Prisma" : "Comece a rodar modelos"}
          </h2>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="mt-8 w-full flex items-center justify-center gap-3 border border-brand-navy/20 bg-white py-2.5 text-sm font-medium text-brand-navy hover:bg-brand-creme disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"/><path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/><path fill="#fbbc04" d="M5.84 14.09a6.5 6.5 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84Z"/><path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"/></svg>
            Continuar com Google
          </button>

          <div className="my-6 flex items-center gap-4 text-[10px] text-brand-gray uppercase tracking-widest">
            <div className="flex-1 h-px bg-brand-navy/10" />
            ou e-mail
            <div className="flex-1 h-px bg-brand-navy/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="eyebrow block mb-2">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-brand-navy/20 bg-white px-3 py-2 text-sm focus:outline-none focus:border-brand-navy"
              />
            </div>
            <div>
              <label className="eyebrow block mb-2">Senha</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-brand-navy/20 bg-white px-3 py-2 text-sm focus:outline-none focus:border-brand-navy"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-navy text-white py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-brand-purple disabled:opacity-50"
            >
              {loading ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-6 text-xs text-brand-gray hover:text-brand-navy"
          >
            {mode === "signin"
              ? "Ainda não tem conta? Criar agora."
              : "Já tenho conta. Entrar."}
          </button>
        </div>
      </div>
      </main>
      <MethodSection />
      <SiteFooter />
    </div>
  );
}
