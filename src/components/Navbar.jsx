import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const links = [
  { href: '/#problem', label: 'Problem' },
  { href: '/#how', label: 'How it works' },
  { href: '/#roadmap', label: 'Roadmap' },
  { href: '/#vision', label: 'Vision' },
  { href: '/#business', label: 'Business' },
  { href: '/#about', label: 'About' },
]

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet shadow-[0_0_24px_-4px] shadow-violet">
        <svg viewBox="0 0 32 32" className="h-6 w-6">
          <path d="M7 22l6-12 5 7 7-10" stroke="#D4FF3A" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="font-display text-lg font-bold tracking-tight">
        SalesQuest <span className="text-lime">AI</span>
      </span>
    </Link>
  )
}

export function Avatar({ user, size = 'h-9 w-9' }) {
  return user.picture ? (
    <img src={user.picture} alt="" referrerPolicy="no-referrer" className={`${size} rounded-full object-cover`} />
  ) : (
    <span className={`${size} grid place-items-center rounded-full bg-gradient-to-br from-lime to-violet font-bold text-ink`}>
      {(user.name || user.email)[0].toUpperCase()}
    </span>
  )
}

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { user, me, logout } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const onHome = pathname === '/'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setOpen(false)
    setMenu(false)
  }, [pathname])

  async function signOut() {
    await logout()
    navigate('/')
  }

  const solid = scrolled || open || !onHome

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all ${solid ? 'border-b border-line/70 bg-ink/85 backdrop-blur-lg' : 'bg-transparent'}`}>
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        {onHome && (
          <ul className="hidden items-center gap-7 text-sm text-muted lg:flex">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="transition hover:text-cream">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link to="/dashboard" className="hidden rounded-full bg-lime px-4 py-2 text-sm font-bold text-ink transition hover:-translate-y-0.5 sm:inline-block">
                My academy
              </Link>
              <div className="relative">
                <button onClick={() => setMenu((m) => !m)} className="flex items-center gap-2 rounded-full border border-line p-0.5 pr-2" aria-haspopup="menu" aria-expanded={menu}>
                  <Avatar user={user} size="h-8 w-8" />
                  {me?.tier === 'premium' && <span className="font-mono text-[10px] font-bold text-violet-soft">PRO</span>}
                  <span className="text-xs text-muted">▾</span>
                </button>
                {menu && (
                  <div role="menu" className="animate-pop absolute right-0 mt-2 w-60 rounded-2xl border border-line bg-ink-2 p-2 shadow-2xl">
                    <p className="truncate px-3 py-2 text-xs text-muted">{user.email}</p>
                    <Link role="menuitem" to="/dashboard" className="block rounded-lg px-3 py-2 text-sm hover:bg-ink-3">Dashboard</Link>
                    <Link role="menuitem" to="/profile" className="block rounded-lg px-3 py-2 text-sm hover:bg-ink-3">Training profiles</Link>
                    <Link role="menuitem" to="/upgrade" className="block rounded-lg px-3 py-2 text-sm hover:bg-ink-3">
                      {me?.tier === 'premium' ? 'Plan & demo orders' : 'Upgrade to Premium'}
                    </Link>
                    <button role="menuitem" onClick={signOut} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-coral hover:bg-ink-3">
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/signin" className="rounded-full border border-line px-4 py-2 text-sm font-bold transition hover:border-violet">
                Sign in
              </Link>
              <a href="/#play" className="hidden rounded-full bg-lime px-4 py-2 text-sm font-bold text-ink transition hover:-translate-y-0.5 sm:inline-block">
                ▶ Play Level 1
              </a>
            </>
          )}
          {onHome && (
            <button
              onClick={() => setOpen((o) => !o)}
              className="grid h-10 w-10 place-items-center rounded-lg border border-line lg:hidden"
              aria-label="Toggle menu"
              aria-expanded={open}
            >
              <span className="relative block h-3 w-5">
                <span className={`absolute left-0 h-0.5 w-5 bg-cream transition ${open ? 'top-1.5 rotate-45' : 'top-0'}`} />
                <span className={`absolute left-0 top-1.5 h-0.5 w-5 bg-cream transition ${open ? 'opacity-0' : ''}`} />
                <span className={`absolute left-0 h-0.5 w-5 bg-cream transition ${open ? 'top-1.5 -rotate-45' : 'top-3'}`} />
              </span>
            </button>
          )}
        </div>
      </nav>
      {open && onHome && (
        <ul className="animate-fade-up border-t border-line/70 px-4 pb-5 pt-2 lg:hidden">
          {[...links, { href: '/#play', label: '▶ Play Level 1' }].map((l) => (
            <li key={l.href}>
              <a href={l.href} onClick={() => setOpen(false)} className="block py-3 text-cream/90 hover:text-lime">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </header>
  )
}
