type Tone = 'ok' | 'warn' | 'crit' | 'muted'

const toneClasses: Record<Tone, string> = {
  ok: 'text-[var(--color-emerald)] border-[rgba(52,211,153,0.3)] bg-[rgba(52,211,153,0.08)]',
  warn: 'text-[var(--color-amber)] border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.08)]',
  crit: 'text-[var(--color-coral)] border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.08)]',
  muted: 'text-[var(--color-muted)] border-[var(--color-border)] bg-transparent',
}

export default function Pill({ children, tone = 'muted' }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full border ${toneClasses[tone]}`}>
      {children}
    </span>
  )
}
