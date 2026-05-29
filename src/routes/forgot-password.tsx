import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Esqueci a senha · Prisma" }, { name: "robots", content: "noindex" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-brand-offwhite flex flex-col">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <p className="eyebrow">Recuperar acesso</p>
          <h1 className="mt-2 font-display text-2xl text-brand-navy">Esqueci a senha</h1>
          <p className="mt-2 text-sm text-brand-gray">
            Informe seu email e enviaremos um link para criar uma nova senha.
          </p>

          {sent ? (
            <div className="mt-8 border border-brand-navy/20 bg-white p-4 text-sm text-brand-navy">
              Se existir uma conta com <strong>{email}</strong>, você receberá em instantes um link para redefinir sua senha. Verifique também a caixa de spam.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label className="eyebrow block mb-2">E-mail</label>
                <input
                  type="email"
                  required
                  placeholder="email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-brand-navy/20 bg-white px-3 py-2 text-sm focus:outline-none focus:border-brand-navy"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full bg-brand-navy text-white py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-brand-purple disabled:opacity-50"
              >
                {busy ? "Enviando..." : "Enviar link"}
              </button>
            </form>
          )}

          <p className="mt-6 text-xs text-brand-gray">
            <Link to="/login" className="text-brand-navy underline underline-offset-4">Voltar para o login</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
