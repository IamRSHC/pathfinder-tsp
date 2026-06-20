import { Routes, Route, Navigate } from 'react-router-dom'
import LandingScreen              from './screens/LandingScreen'
import ArenaScreen                from './screens/ArenaScreen'
import ResultsScreen              from './screens/ResultsScreen'
import GlobalScreen               from './screens/GlobalScreen'
import TabletOrientationGuard     from './components/ui/TabletOrientationGuard'

export default function App() {
  return (
    // This wrapper gives every screen a stable, browser-height root that
    // never collapses during Zustand store flushes or React unmount cycles.
    // Each screen sets its own internal height (100dvh / 100vh fallback).
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