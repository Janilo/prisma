import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminFetchData } from "@/lib/admin.functions";

const ADMIN_EMAIL = "janilo@pereirasaraiva.com";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin · Prisma" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user || data.user.email !== ADMIN_EMAIL) throw redirect({ to: "/upload" });
  },
  component: AdminPage,
});

type Profile = { id: string; display_name: string | null; email: string | null; created_at: string };
type Dataset = { id: string; user_id: string; name: string; n_rows: number; n_cols: number; created_at: string; original_filename: string };
type Run = { id: string; dataset_id: string; created_at: string };

function AdminPage() {
  const navigate = useNavigate();
  const fetch = useServerFn(adminFetchData);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user || data.user.email !== ADMIN_EMAIL) navigate({ to: "/upload", replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: sessionData }) => {
      if (!sessionData.session) return;
      try {
        const result = await fetch({
          headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
        } as never);
        setProfiles(result.profiles as Profile[]);
        setDatasets(result.datasets as Dataset[]);
        setRuns(result.runs as Run[]);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Erro ao carregar dados.");
      } finally {
        setLoading(false);
      }
    });
  }, [fetch]);

  const datasetsByUser = new Map<string, Dataset[]>();
  for (const d of datasets) {
    const list = datasetsByUser.get(d.user_id) ?? [];
    list.push(d);
    datasetsByUser.set(d.user_id, list);
  }

  const datasetIds = new Set(datasets.map(d => d.id));
  const runsByDataset = new Map<string, Run[]>();
  for (const r of runs) {
    if (!datasetIds.has(r.dataset_id)) continue;
    const list = runsByDataset.get(r.dataset_id) ?? [];
    list.push(r);
    runsByDataset.set(r.dataset_id, list);
  }

  const runCountByUser = new Map<string, number>();
  for (const p of profiles) {
    const userDatasets = datasetsByUser.get(p.id) ?? [];
    let count = 0;
    for (const d of userDatasets) count += (runsByDataset.get(d.id) ?? []).length;
    runCountByUser.set(p.id, count);
  }

  const fmt = (dt: string) => new Date(dt).toLocaleDateString("pt-BR");

  return (
    <div className="p-10 space-y-10">
      <div>
        <p className="eyebrow text-xs uppercase tracking-widest text-brand-gray">Admin</p>
        <h1 className="mt-2 font-display text-2xl text-brand-navy">Painel de administração</h1>
        <p className="mt-1 text-sm text-brand-gray">Visão geral da plataforma. Apenas para janilo@pereirasaraiva.com.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Usuários", value: profiles.length },
          { label: "Datasets", value: datasets.length },
          { label: "Rodadas", value: runs.length },
        ].map(s => (
          <div key={s.label} className="border border-brand-navy/20 bg-white p-5">
            <p className="text-xs uppercase tracking-widest text-brand-gray">{s.label}</p>
            <p className="mt-1 font-display text-3xl text-brand-navy">{loading ? "—" : s.value}</p>
          </div>
        ))}
      </div>

      {err && <p className="text-sm text-red-600 border border-red-200 bg-red-50 px-4 py-3">{err}</p>}

      {/* Users table */}
      <div>
        <p className="eyebrow text-xs uppercase tracking-widest text-brand-gray mb-3">Usuários</p>
        <div className="border border-brand-navy/20 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brand-navy/5 text-xs uppercase tracking-widest text-brand-gray">
              <tr>
                <th className="text-left px-5 py-3">Nome</th>
                <th className="text-left px-5 py-3">Email</th>
                <th className="text-left px-5 py-3">Desde</th>
                <th className="text-right px-5 py-3">Datasets</th>
                <th className="text-right px-5 py-3">Rodadas</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-brand-gray">Carregando…</td></tr>
              )}
              {!loading && profiles.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-brand-gray">Nenhum usuário ainda.</td></tr>
              )}
              {!loading && profiles.map(p => {
                const userDatasets = datasetsByUser.get(p.id) ?? [];
                const runCount = runCountByUser.get(p.id) ?? 0;
                return (
                  <tr key={p.id} className="border-t border-brand-navy/10">
                    <td className="px-5 py-3 font-medium text-brand-navy">{p.display_name || "—"}</td>
                    <td className="px-5 py-3 text-brand-gray">{p.email || p.id.slice(0, 8) + "…"}</td>
                    <td className="px-5 py-3 text-brand-gray">{fmt(p.created_at)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{userDatasets.length}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{runCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent datasets */}
      {!loading && datasets.length > 0 && (
        <div>
          <p className="eyebrow text-xs uppercase tracking-widest text-brand-gray mb-3">Datasets recentes</p>
          <div className="border border-brand-navy/20 bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-navy/5 text-xs uppercase tracking-widest text-brand-gray">
                <tr>
                  <th className="text-left px-5 py-3">Nome</th>
                  <th className="text-left px-5 py-3">Arquivo original</th>
                  <th className="text-left px-5 py-3">Usuário</th>
                  <th className="text-right px-5 py-3">Linhas</th>
                  <th className="text-right px-5 py-3">Colunas</th>
                  <th className="text-right px-5 py-3">Rodadas</th>
                  <th className="text-right px-5 py-3">Data</th>
                </tr>
              </thead>
              <tbody>
                {datasets.slice(0, 50).map(d => {
                  const owner = profiles.find(p => p.id === d.user_id);
                  const rCount = (runsByDataset.get(d.id) ?? []).length;
                  return (
                    <tr key={d.id} className="border-t border-brand-navy/10">
                      <td className="px-5 py-3 font-medium text-brand-navy">{d.name}</td>
                      <td className="px-5 py-3 text-brand-gray text-xs font-mono">{d.original_filename}</td>
                      <td className="px-5 py-3 text-brand-gray">{owner?.email || owner?.display_name || d.user_id.slice(0, 8) + "…"}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{d.n_rows.toLocaleString("pt-BR")}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{d.n_cols}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{rCount}</td>
                      <td className="px-5 py-3 text-right text-brand-gray">{fmt(d.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
