import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import {
  parseFile,
  analyzeColumns,
  detectDateColumn,
  detectGranularity,
  guessDependentVariable,
  guessIndependentVariables,
} from "./parse";

// Planilha real de 8 semanas em __fixtures__. Cobre de propósito: datas,
// números, uma coluna de texto, uma célula vazia e uma segunda aba.
const FIXTURE = new URL("./__fixtures__/mmm-sample.xlsx", import.meta.url);

function xlsxFile(): File {
  return new File([readFileSync(FIXTURE)], "mmm-sample.xlsx");
}

describe("parseFile — XLSX", () => {
  it("reads columns in sheet order", async () => {
    const { columns } = await parseFile(xlsxFile());
    expect(columns).toEqual(["data_semana", "vendas_r$", "tv_grps", "paid_search_r$", "regiao"]);
  });

  it("reads every data row", async () => {
    const { rows } = await parseFile(xlsxFile());
    expect(rows).toHaveLength(8);
  });

  // O motivo desta suíte existir: parse.ts depende de cellDates para que
  // detectGranularity receba Date e não string. Se a lib de XLSX for trocada
  // e perder esse comportamento, é aqui que quebra.
  //
  // Afirmamos as partes LOCAIS da data, nunca o ISO em UTC: célula de data em
  // xlsx guarda relógio de parede, sem fuso, e o SheetJS reconstrói no fuso de
  // quem lê. Comparar toISOString() faria o teste passar em UTC-3 e quebrar no
  // CI, que roda em UTC.
  it("materializes date cells as Date objects (cellDates), not strings", async () => {
    const { rows } = await parseFile(xlsxFile());
    const d = rows[0].data_semana;
    expect(d).toBeInstanceOf(Date);
    const date = d as Date;
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2024, 0, 1]);
  });

  it("maps empty cells to null (defval)", async () => {
    const { rows } = await parseFile(xlsxFile());
    expect(rows[4]["paid_search_r$"]).toBeNull();
  });

  it("keeps numeric cells numeric, including zero", async () => {
    const { rows } = await parseFile(xlsxFile());
    expect(rows[0]["vendas_r$"]).toBe(100000);
    expect(rows[2].tv_grps).toBe(0);
  });

  it("reads only the first sheet, ignoring the rest", async () => {
    const { columns } = await parseFile(xlsxFile());
    // A 2ª aba do fixture ("Dicionario") tem colunas variavel/descricao.
    expect(columns).not.toContain("variavel");
    expect(columns).not.toContain("descricao");
  });
});

describe("parseFile — CSV", () => {
  // Node não expõe FileReader, de que o papaparse depende para ler um File.
  // O shim cobre só readAsText, que é o caminho usado por parseFile.
  const original = globalThis.FileReader;

  beforeAll(() => {
    globalThis.FileReader = class {
      result: unknown;
      error: unknown;
      onload?: (ev: { target: { result: unknown } }) => void;
      onerror?: (err: unknown) => void;
      readAsText(blob: Blob) {
        Promise.resolve(blob.text()).then(
          (t) => {
            this.result = t;
            this.onload?.({ target: { result: t } });
          },
          (e) => {
            this.error = e;
            this.onerror?.(e);
          },
        );
      }
      abort() {}
    } as unknown as typeof FileReader;
  });

  afterAll(() => {
    globalThis.FileReader = original;
  });

  it("routes .csv by extension and coerces numbers", async () => {
    const f = new File(["data,vendas\n2024-01-01,100\n"], "x.csv");
    const { columns, rows } = await parseFile(f);
    expect(columns).toEqual(["data", "vendas"]);
    expect(rows[0].vendas).toBe(100);
  });

  it("routes by MIME type even when the extension is missing", async () => {
    const f = new File(["a,b\n1,2\n"], "sem-extensao", { type: "text/csv" });
    const { columns } = await parseFile(f);
    expect(columns).toEqual(["a", "b"]);
  });

  it("maps empty cells to null", async () => {
    const f = new File(["data,vendas\n2024-01-08,\n"], "x.csv");
    const { rows } = await parseFile(f);
    expect(rows[0].vendas).toBeNull();
  });

  // Este caso existe para prender o ROTEAMENTO, não o parsing. O SheetJS também
  // lê CSV, então quase todo input dá o mesmo resultado pelos dois caminhos e um
  // roteamento quebrado passaria despercebido. Data em ISO é onde eles divergem:
  // o papaparse mantém string; o SheetJS converte para Date interpretando no fuso
  // LOCAL, o que desloca a data. Se este teste falhar, o CSV está caindo no ramo
  // XLSX e as datas dos uploads estão andando em silêncio.
  it("keeps ISO dates as strings, proving CSV does not fall through to the XLSX branch", async () => {
    const f = new File(["d\n2024-01-01\n"], "x.csv");
    const { rows } = await parseFile(f);
    expect(rows[0].d).toBe("2024-01-01");
    expect(rows[0].d).not.toBeInstanceOf(Date);
  });
});

describe("analyzeColumns", () => {
  it("classifies date, number and string columns", async () => {
    const { columns, rows } = await parseFile(xlsxFile());
    const kinds = Object.fromEntries(analyzeColumns(rows, columns).map((c) => [c.name, c.kind]));
    expect(kinds).toEqual({
      data_semana: "date",
      vendas_r$: "number",
      tv_grps: "number",
      paid_search_r$: "number",
      regiao: "string",
    });
  });

  it("counts missing cells and unique values", async () => {
    const { columns, rows } = await parseFile(xlsxFile());
    const cols = analyzeColumns(rows, columns);
    const paid = cols.find((c) => c.name === "paid_search_r$")!;
    expect(paid.missing).toBe(1);
    expect(paid.unique).toBe(7);
    expect(cols.find((c) => c.name === "regiao")!.unique).toBe(3);
  });

  it("computes min/max/mean over present values only", async () => {
    const { columns, rows } = await parseFile(xlsxFile());
    const paid = analyzeColumns(rows, columns).find((c) => c.name === "paid_search_r$")!;
    expect(paid.min).toBe(4800);
    expect(paid.max).toBe(7000);
    // média sobre 7 valores, não 8 — a célula vazia não entra no denominador
    expect(paid.mean).toBeCloseTo(5771.43, 2);
  });

  it("flags IQR outliers", async () => {
    const { columns, rows } = await parseFile(xlsxFile());
    const vendas = analyzeColumns(rows, columns).find((c) => c.name === "vendas_r$")!;
    expect(vendas.max).toBe(990000);
    expect(vendas.outliers).toBe(1);
  });

  it("leaves numeric stats off string columns", async () => {
    const { columns, rows } = await parseFile(xlsxFile());
    const regiao = analyzeColumns(rows, columns).find((c) => c.name === "regiao")!;
    expect(regiao.mean).toBeUndefined();
    expect(regiao.outliers).toBeUndefined();
  });
});

describe("column detection heuristics", () => {
  it("finds the date column", async () => {
    const { columns, rows } = await parseFile(xlsxFile());
    expect(detectDateColumn(analyzeColumns(rows, columns))).toBe("data_semana");
  });

  it("reads 7-day spacing as weekly granularity", async () => {
    const { columns, rows } = await parseFile(xlsxFile());
    const cols = analyzeColumns(rows, columns);
    expect(detectGranularity(rows, detectDateColumn(cols))).toBe("semanal");
  });

  it("returns unknown granularity without a date column", () => {
    expect(detectGranularity([{ a: 1 }, { a: 2 }], null)).toBe("desconhecida");
  });

  it("picks the dependent variable by name hint", async () => {
    const { columns, rows } = await parseFile(xlsxFile());
    expect(guessDependentVariable(analyzeColumns(rows, columns))).toBe("vendas_r$");
  });

  it("falls back to the largest mean when no name matches", () => {
    const dep = guessDependentVariable([
      { name: "alpha", kind: "number", missing: 0, unique: 2, mean: 10 },
      { name: "beta", kind: "number", missing: 0, unique: 2, mean: 99 },
    ]);
    expect(dep).toBe("beta");
  });

  it("returns null when there is nothing numeric to pick", () => {
    expect(
      guessDependentVariable([{ name: "regiao", kind: "string", missing: 0, unique: 3 }]),
    ).toBeNull();
  });

  it("picks media drivers and never the dependent variable itself", async () => {
    const { columns, rows } = await parseFile(xlsxFile());
    const cols = analyzeColumns(rows, columns);
    const indep = guessIndependentVariables(cols, guessDependentVariable(cols));
    expect(indep).toContain("tv_grps");
    expect(indep).not.toContain("vendas_r$");
    // Só entra coluna numérica: "regiao" é texto e fica de fora.
    expect(indep).not.toContain("regiao");
  });
});
