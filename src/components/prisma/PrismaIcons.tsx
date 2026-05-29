// Inline SVG <symbol> sprite from the design bundle. Mount once near the root.
export function PrismaIcons() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <symbol id="i-prism" viewBox="0 0 24 24"><path d="M3 13h5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M10 4 L18 18 H2 Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M12 11l9-4M12.4 12.5l8.6-1M12.4 14l8.6 2.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></symbol>
        <symbol id="i-decompose" viewBox="0 0 24 24"><path d="M3 18h18M3 18l3-5 4 2 3-6 4 3 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 18v-2M9 18v-3M15 18v-4M21 18v-5" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.45" strokeLinecap="round"/></symbol>
        <symbol id="i-curve" viewBox="0 0 24 24"><path d="M4 4v16h16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M4 19C9 19 9 8 20 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="12.5" cy="10.6" r="1.7" fill="currentColor"/></symbol>
        <symbol id="i-roi" viewBox="0 0 24 24"><path d="M4 14l5-5 4 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 5h4v4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 20h16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/></symbol>
        <symbol id="i-budget" viewBox="0 0 24 24"><path d="M5 6h14M5 12h14M5 18h14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="9" cy="6" r="2.4" fill="#1C1547" stroke="currentColor" strokeWidth="1.5"/><circle cx="15" cy="12" r="2.4" fill="#1C1547" stroke="currentColor" strokeWidth="1.5"/><circle cx="8" cy="18" r="2.4" fill="#1C1547" stroke="currentColor" strokeWidth="1.5"/></symbol>{/* fills mirror --prisma-abyss */}
        <symbol id="i-data" viewBox="0 0 24 24"><ellipse cx="12" cy="6" rx="7" ry="3" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M5 6v12c0 1.66 3.13 3 7 3s7-1.34 7-3V6" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M5 12c0 1.66 3.13 3 7 3s7-1.34 7-3" fill="none" stroke="currentColor" strokeWidth="1.5"/></symbol>
        <symbol id="i-model" viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/></symbol>
        <symbol id="i-target" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></symbol>
        <symbol id="i-chevron-r" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></symbol>
        <symbol id="i-chevron-u" viewBox="0 0 24 24"><path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></symbol>
        <symbol id="i-chevron-d" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></symbol>
        <symbol id="i-download" viewBox="0 0 24 24"><path d="M12 4v11M7 11l5 5 5-5M5 20h14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></symbol>
        <symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></symbol>
        <symbol id="i-spark" viewBox="0 0 24 24"><path d="M12 4l1.4 4 4 1.4-4 1.4L12 15l-1.4-4-4-1.4 4-1.4L12 4z" fill="currentColor"/><circle cx="18" cy="18" r="1.4" fill="currentColor"/></symbol>
        <symbol id="i-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M12 11v5M12 8.2v.1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></symbol>
        <symbol id="i-reset" viewBox="0 0 24 24"><path d="M4 12a8 8 0 108-8 8 8 0 00-6 2.7L4 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 4v5h5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></symbol>
        <symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3L4 7v5c0 4.4 3.4 8.5 8 9.5 4.6-1 8-5.1 8-9.5V7L12 3z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></symbol>
      </defs>
    </svg>
  );
}

export function Ico({ id, className, style }: { id: string; className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={`prisma-ico ${className ?? ""}`} style={style}>
      <use href={`#${id}`} />
    </svg>
  );
}
