import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError, AppError } from "./errors";

// Stub do supabaseAdmin: uma corrente from().select().eq().eq() que é
// awaitable (then) e tem maybeSingle(), devolvendo o que o teste configurar.
const h = vi.hoisted(() => ({
  result: { data: null as unknown, error: null as unknown },
  download: { data: null as unknown, error: null as unknown },
}));

vi.mock("@/integrations/supabase/client.server", () => {
  const chain = () => {
    const c: Record<string, unknown> = {};
    c.select = () => c;
    c.eq = () => c;
    c.maybeSingle = async () => h.result;
    c.then = (resolve: (v: unknown) => unknown) => Promise.resolve(h.result).then(resolve);
    return c;
  };
  return {
    supabaseAdmin: {
      from: () => chain(),
      storage: { from: () => ({ download: async () => h.download }) },
    },
  };
});

import {
  getRunOwned,
  loadDatasetForUser,
  listDatasetVersionsOwned,
  loadDatasetRows,
} from "./data.server";

beforeEach(() => {
  h.result = { data: null, error: null };
  h.download = { data: null, error: null };
});

describe("acesso por dono (P-04)", () => {
  it("getRunOwned: run de outro usuário (miss no filtro de dono) → NotFoundError", async () => {
    h.result = { data: null, error: null };
    await expect(getRunOwned("r1", "user-a")).rejects.toBeInstanceOf(NotFoundError);
    await expect(getRunOwned("r1", "user-a")).rejects.toThrow("Run não encontrado.");
  });

  it("getRunOwned: run do próprio usuário → retorna a linha", async () => {
    h.result = { data: { id: "r1", user_id: "user-a" }, error: null };
    await expect(getRunOwned("r1", "user-a")).resolves.toEqual({ id: "r1", user_id: "user-a" });
  });

  it("loadDatasetForUser: dataset alheio ou inexistente → NotFoundError", async () => {
    await expect(loadDatasetForUser("d1", "user-a")).rejects.toBeInstanceOf(NotFoundError);
    await expect(loadDatasetForUser("d1", "user-a")).rejects.toThrow("Dataset não encontrado.");
  });

  it("listDatasetVersionsOwned: null do banco vira lista vazia", async () => {
    h.result = { data: null, error: null };
    await expect(listDatasetVersionsOwned("user-a")).resolves.toEqual([]);
  });
});

describe("loadDatasetRows", () => {
  it("falha de storage → AppError com mensagem segura", async () => {
    h.download = { data: null, error: { message: "bucket exploded (internal)" } };
    const p = loadDatasetRows("user-a/file.csv");
    await expect(p).rejects.toBeInstanceOf(AppError);
    await expect(loadDatasetRows("x")).rejects.toThrow("Não consegui ler o arquivo do dataset.");
  });

  it("blob válido → parseCSV real", async () => {
    h.download = { data: { text: async () => "col_a,col_b\n1,2\n" }, error: null };
    const parsed = await loadDatasetRows("user-a/file.csv");
    expect(parsed.rows.length).toBe(1);
    expect(parsed.rows[0]).toMatchObject({ col_a: 1, col_b: 2 });
  });
});
