import { useState }               from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import IntroScreen                 from './screens/IntroScreen'
import LandingScreen               from './screens/LandingScreen'
import ArenaScreen                 from './screens/ArenaScreen'
import ResultsScreen               from './screens/ResultsScreen'
import GlobalScreen                from './screens/GlobalScreen'
import TabletOrientationGuard      from './components/ui/TabletOrientationGuard'

export default function App() {
  // Show the cinematic intro once per page load.
  // Add ?skip_intro=1 to the URL to bypass during development.
  const skipParam    = new URLSearchParams(window.location.search).has('skip_intro')
  const [introComplete, setIntroComplete] = useState(skipParam)

  if (!introComplete) {
    return (
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
        <IntroScreen onComplete={() => setIntroComplete(true)} />
      </div>
    )
  }

  return (
    // Stable browser-height root — never collapses during store flushes or
    // React unmount cycles. Each screen sets its own internal height.
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      <TabletOrientationGuard />
      <Routes>
        <Route path="/"        element={<LandingScreen />} />
        <Route path="/arena"   element={<ArenaScreen />} />
        <Route path="/results" element={<ResultsScreen />} />
        <Route path="/global"  element={<GlobalScreen />} />
        <Route path="*"        element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
