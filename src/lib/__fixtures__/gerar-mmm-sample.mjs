#!/usr/bin/env node
/**
 * Gera o mmm-sample.xlsx usado por src/lib/parse.test.ts.
 *
 *     node src/lib/__fixtures__/gerar-mmm-sample.mjs
 *
 * O fixture é binário: sem este script, mexer nele (acrescentar uma coluna,
 * mais uma semana, outro buraco) obriga a engenharia reversa do .xlsx.
 *
 * ⚠️ As datas são MEIA-NOITE LOCAL de propósito. Célula de data em xlsx guarda
 * serial de relógio de parede, sem fuso, e o SheetJS reconstrói no fuso de quem
 * lê. A 1ª versão deste gerador usava Date.UTC numa máquina UTC-3: o serial
 * saiu deslocado, o teste passava local e QUEBRAVA no CI, que roda em UTC.
 * Se mudar isto, rode a suíte sob vários fusos antes de commitar:
 *
 *     for tz in UTC America/Sao_Paulo Asia/Tokyo; do
 *       TZ=$tz pnpm vitest run src/lib/parse.test.ts
 *     done
 */
import * as XLSX from "xlsx";
import { writeFileSync } from "node:fs";

const d = (mes, dia) => new Date(2024, mes, dia);

// 8 semanas. Cada peculiaridade existe para um caso de teste:
//   data_semana    -> cellDates e detectGranularity ("semanal")
//   vendas_r$      -> guessDependentVariable (bate com a dica "venda")
//   tv_grps        -> guessIndependentVariables (bate com "tv") e o zero na
//                     linha 3, que não pode ser confundido com célula vazia
//   paid_search_r$ -> buraco na linha 5, para defval/missing/mean
//   regiao         -> coluna de texto, para a classificação de kind
const linhas = [
  {
    data_semana: d(0, 1),
    vendas_r$: 100000,
    tv_grps: 120,
    paid_search_r$: 5000,
    regiao: "sudeste",
  },
  {
    data_semana: d(0, 8),
    vendas_r$: 112000,
    tv_grps: 140,
    paid_search_r$: 5400,
    regiao: "sudeste",
  },
  { data_semana: d(0, 15), vendas_r$: 98000, tv_grps: 0, paid_search_r$: 4800, regiao: "sudeste" },
  { data_semana: d(0, 22), vendas_r$: 121000, tv_grps: 180, paid_search_r$: 6100, regiao: "norte" },
  { data_semana: d(0, 29), vendas_r$: 105000, tv_grps: 90, paid_search_r$: null, regiao: "norte" },
  { data_semana: d(1, 5), vendas_r$: 133000, tv_grps: 210, paid_search_r$: 7000, regiao: "norte" },
  { data_semana: d(1, 12), vendas_r$: 118000, tv_grps: 150, paid_search_r$: 5900, regiao: "sul" },
  // 990000 é outlier de propósito, para o teste de IQR
  { data_semana: d(1, 19), vendas_r$: 990000, tv_grps: 160, paid_search_r$: 6200, regiao: "sul" },
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.json_to_sheet(linhas, {
    header: ["data_semana", "vendas_r$", "tv_grps", "paid_search_r$", "regiao"],
  }),
  "Dados",
);
// 2ª aba: parseFile lê só SheetNames[0], e um teste cobra exatamente isso.
XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet([
    ["variavel", "descricao"],
    ["vendas_r$", "receita bruta semanal"],
  ]),
  "Dicionario",
);

const destino = new URL("./mmm-sample.xlsx", import.meta.url);
writeFileSync(destino, XLSX.write(wb, { type: "buffer", bookType: "xlsx", cellDates: true }));
console.log("gravado:", destino.pathname);
