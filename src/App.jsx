import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Story from './components/Story'
import Roadmap from './components/Roadmap'
import Game from './components/Game'
import Vision from './components/Vision'
import About from './components/About'
import { useAuth } from './auth/AuthContext'
import SignIn from './pages/SignIn'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import LevelPage from './pages/LevelPage'
import Upgrade from './pages/Upgrade'
import ReportPage from './pages/ReportPage'

function Home() {
  return (
    <>
      <main>
        <Hero />
        <Story />
        <Roadmap />
        <Game />
        <Vision />
      </main>
      <About />
    </>
  )
}

export function Spinner() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-lime" aria-label="Loading" />
    </div>
  )
}

// Signed-in users only; optionally require a completed training profile.
function Protected({ children, profile = true }) {
  const { user, me, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <Spinner />
  if (!user) return <Navigate to={`/signin?next=${encodeURIComponent(loc.pathname)}`} replace />
  if (profile && me.needsOnboarding) return <Navigate to="/onboarding" replace />
  return children
}

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/profile" element={<Protected profile={false}><Profile /></Protected>} />
        <Route path="/level/:n" element={<Protected><LevelPage /></Protected>} />
        <Route path="/report/:id" element={<Protected><ReportPage /></Protected>} />
        <Route path="/upgrade" element={<Protected profile={false}><Upgrade /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
