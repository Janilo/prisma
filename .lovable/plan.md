# Auditoria do Design System — Prisma

Análise dos três níveis: **primitivas** (`src/styles/prisma.css`), **bridge Tailwind/shadcn** (`src/styles.css`) e **consumo nas telas** (`src/routes`, `src/components`).

---

## 1. Estado geral

O que está **bem**:
- `prisma.css` é um DS completo e bem escrito: primitivas → role tokens → componentes `.prisma-*`. Paleta, espectro de 6 canais, baseline, lift/sat reservados, neutros frios. Documentação no próprio CSS.
- Rebind em `styles.css` agora aponta Tailwind v4 (`--color-brand-*`, `--color-viz-*`) e shadcn (`--primary`, `--secondary`, etc.) direto pros primitives `--prisma-*`. Mudar o DS propaga.
- Marketing público (`SiteHeader`, `SiteFooter`, `MethodSection`, `/methodology`, `/login`, `/`) já usa só tokens `brand-*` → herda a paleta Prisma corretamente.

O que **não está**:
- Existe um **DS fantasma** dentro do produto: hex hardcoded espalhado em `RunReport.tsx`, `demo.tsx`, `results.roi.tsx` e `PrismaShell.tsx`. São os mesmos valores dos tokens, mas escritos à mão.
- Dois shells coexistem: `AppShell` (legado, com tokens `brand-*`) e `PrismaShell` (novo, com tokens `prisma-*`). Telas autenticadas usam o novo via `_authenticated.tsx`, mas componentes internos (`RunReport`) ainda foram pensados pro velho.
- `shadcn/Button` mantém `rounded-md` e `shadow`, conflitando com a regra Prisma de `--radius: 2px` e visual sem sombra. Mesmo bug em `Card`, `Input`, etc. (não verifiquei um a um, mas o padrão é idêntico).
- Modo dark continua com `oklch(...)` aproximado, **não rebindado** aos primitives Prisma — é o último resquício do problema que já corrigimos no light.
- `.dark` define `--primary` como **branco**, o que zera a identidade da marca no modo escuro. Não há um espelho escuro do Prisma definido em `prisma.css`.
- Duplicidade de fonte: `@font-face` de Fraunces declarado em `styles.css` **e** em `prisma.css` (com src diferente). Pode haver dupla request ou shadowing.
- `--font-display` em `styles.css` aponta pra Fraunces, mas `prisma.css` rebinda `--jps-display` pra Inter Tight no produto. Resultado: `font-display` (Tailwind) e `var(--jps-display)` (CSS direto) divergem.
- Sub-pasta `prisma/` só tem `PrismaShell` e `PrismaIcons`. Faltam **wrappers React** dos componentes `.prisma-*` (Button, Card, KPI, Table, Chip, Badge, Tabs, Toast, EmptyState, DecompBar, SpectrumLegend). Hoje cada tela escreve `className="prisma-btn" data-variant="primary"` na mão.

---

## 2. Sugestões — priorizadas

### P0 — Correções de integridade do DS (alto impacto, baixo custo)

1. **Remover hex hardcoded duplicado em componentes de produto.**
   Substituir por `var(--prisma-*)` ou por classes utilitárias:
   - `RunReport.tsx` e `demo.tsx`: arrays `SERIES_COLORS` com 5–8 hex literais → consumir `--prisma-ch-1..6` via `getComputedStyle` ou exportar `CHANNEL_COLORS` de um módulo único (`src/lib/prisma-tokens.ts`).
   - Stroke `#D7D4E2`, `#94908a`, `#6B4FE0`, `#E0A21E`: trocar por `var(--prisma-stone)`, `var(--prisma-baseline)`, `var(--prisma-ch-1)`, `var(--prisma-ch-5)`.
   - `results.roi.tsx`: SVG inline com 8 hex → idem.
   - `PrismaShell.tsx`: paths do glifo com `#8A6CFF`, `#4D93F0`, `#2BB6C4`, `#6FC257`, `#F0B53A` → trocar por `var(--prisma-ch-1..5)` (são quase os mesmos).
   - `PrismaIcons.tsx`: `fill="#1C1547"` → `fill="var(--prisma-abyss)"`.

2. **Consolidar `@font-face` da Fraunces.** Manter só em `prisma.css` (versão variable com axes). Remover o bloco de `styles.css` (linhas 9–15) e o token `--font-display` lá vira `var(--jps-display)`.

3. **Modo dark do Prisma.** Hoje `.dark` em `styles.css` usa `oklch(...)` aproximado e zera a marca. Duas opções:
   - **a)** Definir `[data-theme="dark"]` em `prisma.css` rebindando todos os `--prisma-*` neutros (paper → abyss, ink → paper, stone/mist → variantes escuras) e manter `--prisma-indigo` como primary. Aí `.dark` em `styles.css` só faz `var(--prisma-*)`.
   - **b)** Se dark mode não é prioridade pro Prisma (produto analítico, dashboards quase sempre em light), **remover `.dark`** de `styles.css` e documentar que Prisma é light-only por enquanto.

4. **Alinhar shadcn aos tokens Prisma.** Editar `src/components/ui/button.tsx`:
   - `rounded-md` → `rounded-[var(--radius)]` (= 2px).
   - Remover `shadow` / `shadow-sm` das variantes (Prisma é flat com hairline).
   - Mesma passada em `card.tsx`, `input.tsx`, `select.tsx`, `dialog.tsx`. Ou: criar variantes `prisma` no `cva` e migrar gradativamente.

### P1 — Eliminar a inconsistência de shells

5. **Decidir o destino do `AppShell` legado.** Ele só é usado em `src/components/app/AppShell.tsx` e não é renderizado por nenhuma rota (todas as autenticadas passam por `PrismaShell` via `_authenticated.tsx`). Apagar `AppShell.tsx` se confirmado órfão.

6. **`RunReport` foi escrito pro shell antigo** (classes `text-brand-navy/60`, `text-brand-mustard`, hex inline). Decidir:
   - **a)** Reescrever usando `.prisma-card`, `.prisma-kpi`, `.prisma-table`, `prisma-spectrum-legend`.
   - **b)** Manter compat mas trocar todo hex por `var(--prisma-*)` (passada mecânica de ~30 ocorrências).
   Recomendo (a) — RunReport é a peça mais visível do produto e o `.prisma-*` já tem tudo pronto.

### P2 — Maturidade do DS como biblioteca

7. **Criar wrappers React dos componentes `.prisma-*`** em `src/components/prisma/`:
   - `Button.tsx` (`variant`, `tone`, `size` → mapeia para `data-*`)
   - `Card.tsx`, `KPI.tsx`, `Chip.tsx`, `Badge.tsx`, `Tabs.tsx`, `Table.tsx`, `Toast.tsx`, `EmptyState.tsx`
   - `SpectrumLegend.tsx`, `DecompBar.tsx` (componentes-assinatura do MMM)
   - `ChannelDot.tsx` (consome o índice de canal e devolve `--prisma-ch-N`)
   Vantagem: type-safety, autocomplete, e um único ponto de mudança quando o DS evoluir.

8. **`src/lib/prisma-tokens.ts`** — exportar arrays e mapas tipados pra consumo em Recharts:
   ```ts
   export const CHANNEL_COLORS = [
     'var(--prisma-ch-1)', ..., 'var(--prisma-ch-6)'
   ] as const;
   export const CHANNEL_NAMES = ['Brand/TV', 'Vídeo/Display', 'Search', 'Social', 'Promo', 'OOH'];
   export const BASELINE_COLOR = 'var(--prisma-baseline)';
   ```
   Mata os arrays hex duplicados em `RunReport` e `demo`.

9. **Documentar regras de uso no `prisma.css`** que ainda não estão lá:
   - "Lift verde só para delta incremental positivo; nunca decorativo."
   - "Espectro `ch-1..6` é ordenado e fixo por canal — não reordenar por share/ROI."
   - "Sat coral nunca em CTA; sempre em estado analítico."
   (Já existe a intenção em comentário, falta o "don't".)

### P3 — Polish

10. **`SiteHeader` brand-purple no CTA.** O botão "Criar conta" usa `bg-brand-purple` (= `--prisma-indigo`) com `rounded-none` implícito e `text-xs uppercase tracking-[0.18em]`. Bate com o resto do site. ✅ ok, só registrando que está coerente.

11. **`hairline` em `styles.css` ainda usa hex `#0f2940`** (legado Cascata marinho). Trocar por `color-mix(in oklab, var(--prisma-ink) 10%, transparent)`.

12. **`::selection` em `styles.css` usa `#4A37B5` literal.** Trocar por `var(--prisma-indigo)`.

---

## 3. Resumo executivo

| Prioridade | Mudança | Esforço |
|---|---|---|
| P0 | Hex hardcoded → tokens `--prisma-*` (RunReport, demo, results.roi, PrismaShell, PrismaIcons) | M |
| P0 | Consolidar Fraunces `@font-face` | XS |
| P0 | Decidir dark mode (rebindar ou remover) | S |
| P0 | shadcn `Button`/`Card`/`Input` → radius 2px, sem shadow | S |
| P1 | Apagar `AppShell` órfão | XS |
| P1 | Reescrever `RunReport` com `.prisma-*` | L |
| P2 | Wrappers React em `src/components/prisma/` | L |
| P2 | `lib/prisma-tokens.ts` | XS |
| P3 | `hairline` e `::selection` em tokens | XS |

**Recomendação:** começar pelos P0 numa única passada (≈ 1 turno) — eles destravam o resto. P1/P2 vêm depois como rounds dedicados.

Me diz qual prioridade você quer atacar primeiro (ou "todos os P0").
