import { Link } from 'react-router-dom'

const LOGO = '/pbs-logo.png'

export function SiteHeader({ cta = true }: { cta?: boolean }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-pbs-navy/95 text-white backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Link to="/" className="flex items-center gap-3">
          <img src={LOGO} alt="PBS" className="h-12 w-12 rounded-full bg-white object-contain" />
          <span>
            <span className="block text-sm font-semibold tracking-wide">Proficient Business Service</span>
            <span className="block text-xs text-pbs-200">Total I.T. Care</span>
          </span>
        </Link>
        {cta && (
          <Link
            to="/assess"
            className="rounded-full bg-pbs-gold px-4 py-2 text-sm font-semibold text-pbs-900 hover:bg-white"
          >
            Start free assessment
          </Link>
        )}
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-pbs-line bg-pbs-navy px-5 py-8 text-sm text-pbs-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>Total I.T. Care™ by PBS. All rights reserved.</p>
        <p>#25 East Ave Centreville, Nassau, Bahamas · +1 242 397 3100 · info@pbshope.com</p>
      </div>
    </footer>
  )
}
