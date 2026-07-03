# Glossário de domínio — investimento, custo e unidades

> Lugar canônico dos termos (auditoria P-06). O mesmo conceito de negócio —
> "quanto custou o canal" — atravessa upload → Explore → Model → ROI, e cada
> etapa precisa usar **estes** nomes. Código novo não cria sinônimo
> (`investimento`, `verba`, `custoCanal`…) para nenhum deles.

## Os 4 termos

**`spend`** — o investimento em **R$** de um canal num período. É a base do
ROI: `roi = contribuição / spend`. Quando a coluna do canal já está em R$, o
spend é a soma da própria coluna; quando o canal é medido em **unidade de
execução** (ex.: GRPs de TV, inserções), o spend vem da coluna de investimento
apontada pelo `spendBasis`.

**`spendBasis`** — mapa `canal → coluna-de-investimento` passado como
**parâmetro de um run** (`RunInput.spendBasis`, persistido em
`runs.params_json.spendBasis`). Diz ao motor: "para o ROI deste canal, some
esta coluna (R$), não os valores de execução". A tela Model pré-preenche o
`spendBasis` a partir do `unit_costs_json` do dataset e o usuário ajusta por
canal de mídia.

**`unit_costs_json`** — a **persistência no dataset** do mapa
`coluna-de-unidade-de-execução → coluna-de-investimento`
(`datasets.unit_costs_json`). Editado na tela Explore (`updateUnitCosts`),
consumido em dois lugares: vira o default do `spendBasis` no Model e alimenta a
série de CPP no Explore (`computeUnitCosts`).

**`CPP`** — *cost per point/unit*: custo por unidade de execução num período,
`cpp = spend ÷ unidades` (`computeUnitCosts` em `describe.functions.ts`).
Diagnóstico de eficiência de compra; não entra no modelo — o modelo usa as
unidades como variável e o `spendBasis` para converter ROI em R$.

## Como se conectam

```
Explore: usuário mapeia unidade→investimento ──► datasets.unit_costs_json
                                                    │              │
                              Model (default do spendBasis)   Explore (série de CPP)
                                                    │
                                run: params_json.spendBasis ──► ROI usa spend em R$
```
