type Tone = 'ok' | 'warn' | 'crit' | 'muted'

const toneClasses: Record<Tone, string> = {
  ok: 'text-[var(--color-emerald)] border-[rgba(52,211,153,0.32)] bg-[rgba(52,211,153,0.07)]',
  warn: 'text-[var(--color-amber)] border-[rgba(245,158,11,0.32)] bg-[rgba(245,158,11,0.07)]',
  crit: 'text-[var(--color-coral)] border-[rgba(248,113,113,0.32)] bg-[rgba(248,113,113,0.07)]',
  muted: 'text-[var(--color-muted)] border-[var(--color-border)] bg-transparent',
}

export default function Pill({ children, tone = 'muted' }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center font-mono text-[10.5px] px-2 py-[3px] rounded-[3px] border whitespace-nowrap ${toneClasses[tone]}`}
    >
      {children}
    </span>
  )
}
