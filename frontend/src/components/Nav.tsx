import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'

const links = [
  { to: '/investigation', label: 'Investigation' },
  { to: '/counterfactual', label: 'Counterfactual engine' },
  { to: '/datasets', label: 'Datasets' },
]

export default function Nav() {
  const { pathname } = useLocation()
  return (
    <div className="flex items-center justify-between px-6 md:px-10 py-4 border-b border-[var(--color-border)] relative z-20 bg-[var(--color-bg)]/80 backdrop-blur-md sticky top-0">
      <Link to="/" className="flex items-center gap-2.5 font-extrabold text-[15px]">
        <motion.div
          initial={{ rotate: -8 }}
          animate={{ rotate: 0 }}
          className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-[var(--color-emerald)] to-[var(--color-teal)] flex items-center justify-center text-[#06130D] font-black text-xs"
        >
          P
        </motion.div>
        PRISM
      </Link>
      <div className="hidden md:flex items-center gap-7 text-[13.5px] text-[var(--color-muted)]">
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className={`transition-colors hover:text-[var(--color-ink)] ${pathname === l.to ? 'text-[var(--color-emerald)] font-semibold' : ''}`}
          >
            {l.label}
          </Link>
        ))}
      </div>
      <Link
        to="/investigation"
        className="text-[13px] font-semibold px-4 py-2 rounded-lg bg-gradient-to-br from-[var(--color-emerald-dim)] to-[var(--color-teal)] text-[#06130D] hover:brightness-110 transition"
      >
        Launch investigation
      </Link>
    </div>
  )
}
