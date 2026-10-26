import { motion, useScroll, useTransform } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useRef } from 'react'
import Nav from '../components/Nav'
import { ArrowRight, Database, GitBranch, ShieldCheck, Sparkles } from 'lucide-react'

const stats = [
  { n: '5', l: 'Indian open datasets wired in' },
  { n: '0', l: 'Unverified claims allowed through' },
  { n: '12', l: 'Connected investigation screens' },
  { n: '100%', l: 'Of claims traced to a source' },
]

const dots = [
  { left: '34%', top: '22%', delay: 0 },
  { left: '58%', top: '44%', delay: 0.3 },
  { left: '46%', top: '64%', delay: 0.6 },
  { left: '70%', top: '58%', delay: 0.9 },
  { left: '26%', top: '52%', delay: 1.2 },
]

const steps = [
  {
    icon: Database,
    title: 'Connect the evidence',
    body: 'CPCB readings, IMD rainfall, India-WRIS gauge levels — pulled into one signal-to-evidence graph instead of five separate tabs.',
  },
  {
    icon: GitBranch,
    title: 'Build competing hypotheses',
    body: 'PRISM drafts rival explanations for what the data might mean, each one weighed by what actually supports or contradicts it.',
  },
  {
    icon: ShieldCheck,
    title: 'Challenge before you act',
    body: 'The counterfactual engine asks what would change the conclusion, and tells you exactly what evidence is still missing.',
  },
]

function FeatureCard({ icon: Icon, title, body, i }: { icon: typeof Database; title: string; body: string; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-2xl p-7 flex-1 min-w-[260px] hover:border-[rgba(52,211,153,0.35)] transition-colors"
    >
      <div className="w-11 h-11 rounded-xl bg-[rgba(52,211,153,0.12)] border border-[rgba(52,211,153,0.3)] flex items-center justify-center mb-5">
        <Icon size={20} className="text-[var(--color-emerald)]" />
      </div>
      <div className="font-bold text-[17px] mb-2">{title}</div>
      <p className="text-[13.5px] text-[var(--color-muted)] leading-relaxed">{body}</p>
    </motion.div>
  )
}

export default function Landing() {
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const mapY = useTransform(scrollYProgress, [0, 1], [0, 80])
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.3])

  return (
    <div className="min-h-screen grain relative">
      <div className="pointer-events-none fixed inset-0 noise-grid opacity-40 z-0" />
      <Nav />

      <div ref={heroRef} className="relative overflow-hidden">
        {/* ambient drifting glows */}
        <div className="absolute -top-20 -left-20 w-[480px] h-[480px] rounded-full bg-[var(--color-emerald)]/10 blur-[100px] drift pointer-events-none" />
        <div className="absolute top-40 right-0 w-[420px] h-[420px] rounded-full bg-[var(--color-teal)]/10 blur-[100px] drift pointer-events-none" style={{ animationDelay: '3s' }} />

        <div className="max-w-[1180px] mx-auto px-6 md:px-10 pt-16 md:pt-24 pb-10 relative">
          <div className="grid lg:grid-cols-[1fr_440px] gap-10 items-start">
            <motion.div style={{ opacity: heroOpacity }}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 text-[12px] font-bold tracking-[0.14em] text-[var(--color-emerald)] mb-6"
              >
                <Sparkles size={13} />
                INDIA-FIRST ENVIRONMENTAL INTELLIGENCE
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="text-[40px] md:text-[54px] font-extrabold leading-[1.1] tracking-tight"
              >
                Environmental crises rarely begin with{' '}
                <span className="text-gradient">a complete picture.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.22 }}
                className="text-[16px] text-[var(--color-muted)] mt-6 max-w-[560px] leading-relaxed"
              >
                PRISM connects India's environmental evidence, builds competing explanations for
                what the data might mean, and shows exactly what still needs to be verified before
                anyone acts on it.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.34 }}
                className="flex flex-wrap gap-3.5 mt-9"
              >
                <Link
                  to="/investigation"
                  className="group flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-[14px] bg-gradient-to-br from-[var(--color-emerald-dim)] to-[var(--color-teal)] text-[#06130D] hover:brightness-110 transition shadow-[0_0_30px_rgba(52,211,153,0.25)]"
                >
                  Launch investigation
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/datasets"
                  className="px-5 py-3 rounded-xl font-semibold text-[14px] border border-[var(--color-border)] hover:bg-white/5 transition"
                >
                  Explore a live demonstration
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-14"
              >
                {stats.map((s, i) => (
                  <motion.div
                    key={s.l}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.55 + i * 0.08 }}
                    className="glass rounded-xl p-4"
                  >
                    <div className="text-[26px] font-extrabold text-[var(--color-emerald)] tabular-nums">{s.n}</div>
                    <div className="text-[11.5px] text-[var(--color-muted)] mt-1 leading-snug">{s.l}</div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            {/* animated map */}
            <motion.div
              style={{ y: mapY }}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative rounded-[22px] border border-[var(--color-border)] h-[380px] md:h-[440px] overflow-hidden hidden sm:block"
            >
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(circle at 60% 30%, rgba(52,211,153,0.2), transparent 45%), radial-gradient(circle at 30% 70%, rgba(45,212,191,0.16), transparent 45%), linear-gradient(135deg,#0B1D16,#081511)',
                }}
              />
              <div className="absolute top-4 left-5 text-[12px] text-[var(--color-muted)] font-medium">
                India Environmental Observatory
              </div>
              {dots.map((d, i) => (
                <div key={i} className="absolute" style={{ left: d.left, top: d.top }}>
                  <div
                    className="w-2.5 h-2.5 rounded-full bg-[var(--color-emerald)] glow-dot"
                    style={{ boxShadow: '0 0 16px rgba(52,211,153,0.9)', animationDelay: `${d.delay}s` }}
                  />
                </div>
              ))}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 420 440">
                <path d="M143 97 L243 194 L193 282 L294 256" fill="none" stroke="rgba(52,211,153,0.35)" strokeWidth="1.2" className="flow-line" />
              </svg>
              <div className="absolute bottom-4 right-5 text-[10.5px] text-[var(--color-muted)]">
                Demo coordinates — illustrative only
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* how it works */}
      <div className="max-w-[1180px] mx-auto px-6 md:px-10 py-20 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 max-w-[640px]"
        >
          <div className="text-[12px] font-bold tracking-[0.14em] text-[var(--color-emerald)] mb-3">HOW PRISM WORKS</div>
          <h2 className="text-[28px] md:text-[34px] font-extrabold leading-tight">
            From a raw signal to a defensible conclusion — in three steps.
          </h2>
        </motion.div>
        <div className="flex flex-col md:flex-row gap-5">
          {steps.map((s, i) => (
            <FeatureCard key={s.title} {...s} i={i} />
          ))}
        </div>
      </div>

      {/* closing cta */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-[1180px] mx-auto px-6 md:px-10 pb-24"
      >
        <div className="glass rounded-3xl p-10 md:p-14 text-center relative overflow-hidden">
          <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[var(--color-emerald)]/10 blur-[90px] rounded-full pointer-events-none" />
          <h3 className="text-[26px] md:text-[32px] font-extrabold max-w-[640px] mx-auto leading-tight relative">
            India doesn't need more environmental data. It needs a way to act on what it already has.
          </h3>
          <Link
            to="/investigation"
            className="inline-flex items-center gap-2 mt-8 px-6 py-3.5 rounded-xl font-semibold text-[14px] bg-gradient-to-br from-[var(--color-emerald-dim)] to-[var(--color-teal)] text-[#06130D] hover:brightness-110 transition relative"
          >
            Launch investigation <ArrowRight size={16} />
          </Link>
        </div>
      </motion.div>

      <footer className="border-t border-[var(--color-border)] py-8 text-center text-[12px] text-[var(--color-muted)]">
        PRISM &middot; Environmental Signal-to-Evidence Engine &middot; All investigation data on this preview is clearly labelled demo or live
      </footer>
    </div>
  )
}
