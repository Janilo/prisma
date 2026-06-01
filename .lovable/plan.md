## Auditoria — Landing × Prisma DS

A landing já consome a maior parte do DS (`bg-paper`, `bg-indigo-soft`, `text-abyss`, `text-violet`, `text-mute`, `eyebrow`, `hairline`, `font-display`, `bg-primary`). As opacidades `text-abyss/70`, `border-violet/40`, etc. **são válidas** — Tailwind v4 deriva alpha a partir dos color tokens. Não são hardcode.

### Violações reais encontradas

1. `src/routes/index.tsx:75` — `text-[#5F5B55]` (cinza do JPS antigo, fora da paleta Prisma).
2. `src/components/marketing/SiteHeader.tsx:18` — mesmo `text-[#5F5B55]`.

Esses dois pontos contornam o token system com cor literal de outra marca (J P Saraiva core). Em Prisma o equivalente é `--prisma-mute` (#726E89) → utilitário `text-mute`.

### Inconsistência de tracking (eyebrow scale)

O DS define `--jps-tracking-eyebrow: 0.18em` e o Header já usa `tracking-[0.18em]` nos uppercase labels. No Hero (`index.tsx`) os botões "Criar conta", "Ver demo", "Entrar" usam `tracking-widest` (Tailwind = 0.1em), quebrando o ritmo tipográfico contra o Header.

### Mudanças

**`src/routes/index.tsx`**
- L63, L70, L81: `tracking-widest` → `tracking-[0.18em]` (alinha com Header / eyebrow scale do DS).
- L75: `text-[11px] text-[#5F5B55] leading-[1.7]` → `text-[11px] text-mute leading-[1.7]`.

**`src/components/marketing/SiteHeader.tsx`**
- L18: `text-[#5F5B55]` → `text-mute`.

### Fora de escopo (não tocar)

- Estrutura, hierarquia, copy.
- Tamanho/peso do `<h1>` do hero (já ajustado em turnos anteriores).
- Classes `*/<alpha>` (abyss/70, indigo/40, etc.) — são derivações válidas de tokens.
- `bg-white` — `--color-white: var(--prisma-white)` está mapeado.
- `border-[1.5px]` — espessura, não cor.
- Hero, Method, Footer, demais componentes do produto.

### Verificação

Após aplicar: rodar `rg "#[0-9A-Fa-f]{3,8}" src/routes/index.tsx src/components/marketing/` e confirmar zero hits.
