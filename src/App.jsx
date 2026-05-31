import { Routes, Route, Navigate } from 'react-router-dom'
import LandingScreen  from './screens/LandingScreen'
import ArenaScreen    from './screens/ArenaScreen'
import ResultsScreen  from './screens/ResultsScreen'
import GlobalScreen   from './screens/GlobalScreen'

export default function App() {
  return (
    <Routes>
      <Route path="/"        element={<LandingScreen />} />
      <Route path="/arena"   element={<ArenaScreen />} />
      <Route path="/results" element={<ResultsScreen />} />
      <Route path="/global"  element={<GlobalScreen />} />
      <Route path="*"        element={<Navigate to="/" replace />} />
    </Routes>
  )
}