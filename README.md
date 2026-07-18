# Prisma

**Marketing Mix Modeling.** A receita entra inteira, sai decomposta em canais.

Você sobe uma planilha de gastos e vendas. Prisma roda Ridge com adstock e saturação, e
devolve contribuição em R$, ROI por canal, e quanto do faturamento é base versus
incremental. Sem caixa-preta.

**Ao vivo:** [prisma.pereirasaraiva.com](https://prisma.pereirasaraiva.com) · demo sem cadastro.

## O problema
Atribuição por último clique dá 100% ao canal que clicou por último e deixa TV e OOH
invisíveis. A verba migra para o lugar errado.

## Como funciona
1. **Suba a planilha:** vendas por período e gastos por canal (CSV/XLSX). Valida colunas e
   datas antes de rodar.
2. **Ridge com adstock e saturação:** efeito carry-over por canal e curva de retornos
   decrescentes, sem overfitting.
3. **Contribuição, ROI e base vs. incremental:** decomposição em R$ por canal, ROI marginal,
   e a parcela do faturamento que viria sem mídia.

## Stack
React · TanStack · Tailwind · Supabase · Cloudflare. IA para descrever o dataset e sugerir variáveis.

---
Construído por [J P Saraiva](https://pereirasaraiva.com) · Engenharia de Go-to-Market.
