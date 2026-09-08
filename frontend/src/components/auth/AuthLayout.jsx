import { ShieldHalf } from 'lucide-react'
import Badge from '../ui/Badge.jsx'

const CAPABILITIES = ['CDR', 'IPDR', 'FINANCIAL', 'OSINT', 'DEVICE', 'STATEMENTS']

/*
 * Shared shell for public authentication pages (Login, Request Access).
 * Left column is the FORENSIGHT brand panel; the right slot carries the
 * form. Dark command-center aesthetic, fully responsive — the brand
 * column collapses on small screens.
 */
const AuthLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen flex-col bg-ink-950 text-slate-200">
      <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-12 px-6 py-12 lg:grid-cols-2 lg:items-center">
        {/* Left: branding */}
        <div className="hidden flex-col lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-brand/30 to-cyan-brand/10 text-cyan-brand ring-1 ring-cyan-brand/30">
              <ShieldHalf className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="leading-tight">
              <p className="text-lg font-bold tracking-widest text-slate-100">
                FORENSIGHT
              </p>
              <p className="text-[11px] font-medium uppercase tracking-wider text-cyan-brand/80">
                Multi-Source Investigative Analytics
              </p>
            </div>
          </div>

          <p className="mt-8 max-w-sm text-sm leading-relaxed text-slate-400">
            Transform fragmented digital evidence into connected investigative
            intelligence.
          </p>

          <div className="mt-8">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Capabilities
            </p>
            <div className="flex max-w-sm flex-wrap gap-2">
              {CAPABILITIES.map((c) => (
                <span
                  key={c}
                  className="rounded border border-ink-600 bg-ink-800 px-2.5 py-1 font-mono text-[11px] text-cyan-100"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-10 max-w-sm space-y-2">
            <Badge variant="warning" dot>
              DEMONSTRATION ENVIRONMENT
            </Badge>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Synthetic / Sanitized data · Prototype for authorized demonstration
              purposes.
            </p>
          </div>
        </div>

        {/* Right: form slot */}
        <div className="w-full justify-self-center lg:pl-8">{children}</div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-600">
        FORENSIGHT — Authorized personnel only. Access and activity may be logged.
      </footer>
    </div>
  )
}

export default AuthLayout