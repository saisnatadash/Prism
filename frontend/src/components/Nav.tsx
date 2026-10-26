import { Link, useLocation } from 'react-router-dom'

const links = [
  { to: '/investigation', label: 'Investigation' },
  { to: '/counterfactual', label: 'Counterfactual engine' },
  { to: '/datasets', label: 'Datasets' },
]

export default function Nav() {
  const { pathname } = useLocation()
  return (
    <div className="flex items-center justify-between px-6 md:px-10 py-3.5 border-b border-[var(--color-border)] relative z-20 bg-[var(--color-bg)]/85 backdrop-blur-md sticky top-0">
      <Link to="/" className="flex items-center gap-2.5">
        <img src="./prism-mark.png" alt="" className="w-8 h-8 object-contain" />
        <span className="font-display font-semibold text-[17px] tracking-tight">PRISM</span>
      </Link>
      <div className="hidden md:flex items-center gap-7 font-mono text-[12px] uppercase tracking-wide text-[var(--color-muted)]">
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className={`transition-colors hover:text-[var(--color-ink)] ${pathname === l.to ? 'text-[var(--color-emerald)]' : ''}`}
          >
            {l.label}
          </Link>
        ))}
      </div>
      <Link
        to="/investigation"
        className="text-[13px] font-semibold px-4 py-2 rounded-[4px] bg-[var(--color-emerald)] text-[#06130D] hover:bg-[var(--color-teal)] transition-colors"
      >
        Launch investigation
      </Link>
    </div>
  )
}
