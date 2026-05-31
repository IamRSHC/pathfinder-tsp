import { useState } from 'react'
import Navbar from '../components/ui/Navbar'
import ConvergenceGraph from '../components/results/ConvergenceGraph'
import { MOCK_LEADERBOARD, MOCK_GLOBAL_SEEDS } from '../utils/mockAI'

const APP_LAYERS = ['CITIES', 'DRUG MOLECULES', 'SoC ROUTING', 'GENOME SEQUENCES']
const APP_COLORS = ['text-game-cyan', 'text-game-green', 'text-game-amber', 'text-game-purple']
const APP_DESC   = [
  'Classical TSP: optimize delivery / logistics routing',
  'Drug discovery: ligand binding path optimization',
  'Chip design: minimize wire length on silicon',
  'Bioinformatics: fragment assembly sequence ordering',
]

export default function GlobalScreen() {
  const [activeLayer, setActiveLayer] = useState(0)
  const [activeSeed,  setActiveSeed]  = useState('ALPHA-7')

  return (
    <div className="flex flex-col min-h-screen bg-game-bg">
      <Navbar />

      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto w-full space-y-6">

        {/* Header */}
        <div>
          <h1 className="font-display font-bold text-3xl text-game-cyan glow-cyan tracking-wider">
            GLOBAL BOARD
          </h1>
          <p className="font-mono text-xs text-game-muted mt-1">
            Collective human × AI intelligence across all active sessions
          </p>
        </div>

        {/* Application Layer Toggle */}
        <div className="bg-game-surface border border-game-border rounded-lg p-5">
          <span className="stat-label block mb-3">APPLICATION LAYER</span>
          <div className="flex flex-wrap gap-2 mb-4">
            {APP_LAYERS.map((layer, i) => (
              <button
                key={layer}
                onClick={() => setActiveLayer(i)}
                className={`px-3 py-2 rounded border font-mono text-xs font-bold transition-all
                  ${activeLayer === i
                    ? `${APP_COLORS[i]} border-current bg-current/10`
                    : 'text-game-muted border-game-border hover:border-game-text/30'
                  }`}
              >
                {layer}
              </button>
            ))}
          </div>
          <div className={`font-mono text-sm ${APP_COLORS[activeLayer]} p-3 bg-game-bg rounded border border-current/20`}>
            {APP_DESC[activeLayer]}
          </div>
        </div>

        {/* Seed selector + leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Seeds */}
          <div className="space-y-3">
            <span className="stat-label block">ACTIVE MAP SEEDS</span>
            {MOCK_GLOBAL_SEEDS.map(seed => (
              <button
                key={seed.seed}
                onClick={() => setActiveSeed(seed.seed)}
                className={`w-full text-left p-4 rounded-lg border transition-all
                  ${activeSeed === seed.seed
                    ? 'border-game-cyan/50 bg-game-cyan/5'
                    : 'border-game-border bg-game-surface hover:border-game-border/60'
                  }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-sm text-game-text">{seed.seed}</span>
                  <span className="font-mono text-xs text-game-green">{seed.improvement} improved</span>
                </div>
                <div className="flex items-center gap-3 font-mono text-xs text-game-muted">
                  <span>{seed.players.toLocaleString()} players</span>
                  <span>Best: {seed.best}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Leaderboard */}
          <div className="lg:col-span-2 bg-game-surface border border-game-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="font-display font-semibold text-game-text tracking-wider">
                TOP SOLUTIONS — {activeSeed}
              </span>
              <span className="font-mono text-xs text-game-muted">Live</span>
            </div>
            <div className="space-y-2">
              {MOCK_LEADERBOARD.map(entry => (
                <div
                  key={entry.rank}
                  className="flex items-center gap-3 p-3 rounded-lg bg-game-bg border border-game-border
                    font-mono text-sm"
                >
                  <span className={`w-6 font-bold text-center ${
                    entry.rank === 1 ? 'text-game-amber' :
                    entry.rank === 2 ? 'text-game-text/70' :
                    entry.rank === 3 ? 'text-game-amber/50' : 'text-game-muted'
                  }`}>
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                  </span>
                  <span className="flex-1 text-game-text">{entry.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded border ${
                    entry.mode === 'Co-Pilot'
                      ? 'text-game-cyan border-game-cyan/30 bg-game-cyan/5'
                      : entry.mode === 'Solo'
                      ? 'text-game-green border-game-green/30 bg-game-green/5'
                      : 'text-game-amber border-game-amber/30 bg-game-amber/5'
                  }`}>
                    {entry.mode}
                  </span>
                  <span className="text-game-muted">{entry.score}</span>
                  <span className="text-game-green font-bold text-xs">{entry.gap}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Convergence chart */}
        <ConvergenceGraph />

        {/* Research note */}
        <div className="bg-game-surface border border-game-purple/30 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔬</span>
            <div>
              <p className="font-display font-semibold text-game-text tracking-wider mb-1">
                RESEARCH INSIGHT
              </p>
              {/* TODO: INTEGRATE AI MODEL — generate dynamic insight from session data */}
              <p className="font-mono text-xs text-game-muted leading-relaxed">
                Across 1,842 sessions on seed ALPHA-7, human players consistently outperform
                AI-only nearest-neighbor on node clusters under 15 nodes by an average of 11.3%.
                AI recovers its advantage at macro-scale (150+ nodes) where spatial memory becomes
                a bottleneck. Collaborative sessions are tracking 34% better than either alone.
                This mirrors protein-folding human intuition patterns observed in Foldit (Baker et al., 2008).
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}