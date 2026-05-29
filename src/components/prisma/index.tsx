/**
 * Prisma DS — wrappers React tipados sobre as classes `.prisma-*` de
 * `src/styles/prisma.css`. Servem como API ergonômica para o produto
 * e como ponto único onde os estados (variant/tone/accent) ficam tipados.
 *
 * Regra: estes wrappers NÃO inventam estilo. Eles apenas mapeiam props
 * para as classes/data-attrs do DS. Para mudar visual, edite prisma.css.
 *
 * Don'ts:
 *  - não passe classes utilitárias de cor (text-white, bg-black, etc.)
 *    nas children — use as classes do DS (`.muted`, `.pos`, `.neg`) ou
 *    variáveis CSS (`var(--prisma-*)`).
 *  - não compose com `Button`/`Card` do shadcn no mesmo nó — escolha um.
 *  - botões secundários não usam sombra; o DS é flat por design.
 */
import { forwardRef } from "react";
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
  TableHTMLAttributes,
  ThHTMLAttributes,
  TdHTMLAttributes,
} from "react";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* ---------- Button ---------- */
export type PrismaButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};
export const PrismaButton = forwardRef<HTMLButtonElement, PrismaButtonProps>(
  ({ variant = "primary", size = "md", className, ...rest }, ref) => (
    <button
      ref={ref}
      className={cx("prisma-btn", className)}
      data-variant={variant}
      data-size={size === "md" ? undefined : size}
      {...rest}
    />
  ),
);
PrismaButton.displayName = "PrismaButton";

/* ---------- Badge ---------- */
export type PrismaBadgeTone = "neutral" | "brand" | "success" | "warning" | "danger" | "ai";
export function PrismaBadge({
  tone = "neutral",
  dot,
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: PrismaBadgeTone; dot?: boolean }) {
  return (
    <span
      className={cx("prisma-badge", className)}
      data-tone={tone === "neutral" ? undefined : tone}
      {...rest}
    >
      {dot ? <span className="dot" /> : null}
      {children}
    </span>
  );
}

/* ---------- Card ---------- */
export function PrismaCard({
  raised,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { raised?: boolean }) {
  return (
    <div
      className={cx("prisma-card", className)}
      data-elev={raised ? "raised" : undefined}
      {...rest}
    />
  );
}

/* ---------- KPI ---------- */
export type PrismaKpiAccent = "brand" | "lift" | "sat" | "spectrum";
export function PrismaKpi({
  label,
  value,
  hint,
  delta,
  deltaTone,
  accent,
  valueTone,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  delta?: ReactNode;
  deltaTone?: "up" | "down";
  accent?: PrismaKpiAccent;
  valueTone?: "lift" | "indigo";
  className?: string;
}) {
  return (
    <div className={cx("prisma-kpi", className)} data-accent={accent}>
      <p className="label">{label}</p>
      <p className={cx("value", valueTone)}>{value}</p>
      {delta != null ? (
        <span className="delta" data-tone={deltaTone}>
          {delta}
        </span>
      ) : null}
      {hint != null ? <p className="delta">{hint}</p> : null}
    </div>
  );
}

/* ---------- Table ---------- */
export function PrismaTable({
  className,
  ...rest
}: TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cx("prisma-table", className)} {...rest} />;
}
export function PrismaTh({
  num,
  className,
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement> & { num?: boolean }) {
  return <th className={cx(num && "num", className)} {...rest} />;
}
export function PrismaTd({
  num,
  channelColor,
  tone,
  className,
  style,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement> & {
  num?: boolean;
  channelColor?: string;
  tone?: "muted" | "pos" | "neg";
}) {
  const isCh = !!channelColor;
  return (
    <td
      className={cx(num && "num", tone, isCh && "ch", className)}
      style={isCh ? { ...(style ?? {}), ["--ch" as string]: channelColor } : style}
      {...rest}
    />
  );
}

/* ---------- Section eyebrow + title (padrão analítico) ---------- */
export function PrismaSection({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("mt-16", className)}>
      <p
        className="text-[11px] font-semibold uppercase"
        style={{ letterSpacing: "0.18em", color: "var(--prisma-mute)" }}
      >
        {eyebrow}
      </p>
      <h2
        className="mt-2 text-[22px] font-semibold"
        style={{ color: "var(--prisma-ink)", letterSpacing: "-0.015em" }}
      >
        {title}
      </h2>
      {description ? (
        <p
          className="mt-2 max-w-2xl text-xs"
          style={{ color: "var(--prisma-mute)" }}
        >
          {description}
        </p>
      ) : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}
