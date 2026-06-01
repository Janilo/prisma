## Mudanças

### 1. Botões "Criar conta" → cor abyss (escura)

Hoje usam `bg-primary` (#4A37B5 indigo). Trocar pelo tom escuro do "Ver demo" no hover: `bg-abyss text-white` com `hover:bg-indigo-deep` (ou `hover:opacity-90`).

- `src/routes/index.tsx` L63 — botão hero "Criar conta"
- `src/components/marketing/SiteHeader.tsx` L40 — botão header "Criar conta"

### 2. Hero: novo texto bicolor

Substituir o `<h1>` atual por:
- "A receita entra inteira." em `text-abyss`
- "Sai decomposta em canais." em `text-violet` (#7A5CF0)

Ambos no mesmo `<h1>` Fraunces italic light (mantém `font-display font-light italic`). Quebra natural entre as duas frases via `<span>` separados — sem `<br>` forçado, deixa o flow tipográfico.

O parágrafo descritivo abaixo do h1 continua como está.

### Fora de escopo

- Botão "Ver demo" e "Entrar" (sem mudança).
- Tamanho/escala do h1 (mantém `text-7xl lg:text-6xl`).
- Eyebrow "Marketing Mix Modeling" continua.
