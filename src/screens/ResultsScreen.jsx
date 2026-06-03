import { useNavigate }    from 'react-router-dom'
import Navbar             from '../components/ui/Navbar'
import RouteReplay        from '../components/results/RouteReplay'
import CollaborationScore from '../components/results/CollaborationScore'
import ConvergenceGraph   from '../components/results/ConvergenceGraph'
import { useGameStore }   from '../stores/gameStore'
import { useAiStore }     from '../stores/aiStore'
import { useTheme }       from '../hooks/useTheme'
import { nearestNeighborTour, formatDist, computeGapPercent, formatTime } from '../utils/tspUtils'

export default function ResultsScreen() {
  const navigate = useNavigate()
  const { nodes, humanEdges, pathLength, optimalBound, timeElapsed, mode, difficulty } = useGameStore()
  const { aiPathLength } = useAiStore()
  const t = useTheme()

  const aiTour  = nearestNeighborTour(nodes)
  const aiLen   = aiTour.length
  const gap     = computeGapPercent(pathLength, optimalBound)
  const userWon = pathLength <= aiLen || !aiLen

  const handleShare = () => {
    const text = `PATHFINDER TSP — ${difficulty} nodes, gap ${gap}%, ${formatTime(timeElapsed)} | pathfinder-tsp.vercel.app`
    navigator.clipboard?.writeText(text)
  }

  const modeLabel = (m) => {
    const C = ['SOLO RUN', 'CO-PILOT', 'VS AI']
    const S = ['Solo Run', 'Co-Pilot', 'Vs AI']
    const i = ['solo', 'copilot', 'vs'].indexOf(m)
    return i >= 0 ? (t.is ? S[i] : C[i]) : m
  }

  return (
    <div className="flex flex-col min-h-screen bg-game-bg">
      <Navbar />

      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto w-full space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className={t.pageTitle}>
              {t.is ? 'Debrief' : 'DEBRIEF'}
            </h1>
            <p className={t.pageSubtitle}>
              {difficulty} {t.is ? 'nodes' : 'nodes'} · {modeLabel(mode)}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleShare} className={`px-4 py-2 ${t.btn.ghost}`}>
              ↗ {t.is ? 'Share' : 'SHARE'}
            </button>
            <button onClick={() => navigate('/')} className={`px-4 py-2 ${t.btn.primary}`}>
              {t.is ? 'Play Again' : 'PLAY AGAIN'}
            </button>
          </div>
        </div>

        {/* Score cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ScoreCard label={t.is ? 'Your path'      : 'YOUR PATH'}      value={formatDist(pathLength) || '—'} color={t.primary.text}   />
          <ScoreCard label={t.is ? 'AI-only path'   : 'AI-ONLY PATH'}   value={formatDist(aiLen) || '—'}      color={t.secondary.text} />
          <ScoreCard
            label={t.is ? 'Gap to optimal' : 'GAP TO OPTIMAL'}
            value={`${gap}%`}
            color={gap <= 10 ? 'text-game-green' : gap <= 25 ? 'text-game-amber' : 'text-game-red'}
          />
          <ScoreCard label={t.is ? 'Time' : 'TIME'} value={formatTime(timeElapsed)} color="text-game-text" />
        </div>

        {/* Winner banner */}
        {mode === 'vs' && (
          <div className={`flex items-center gap-3 p-4 rounded-lg border
            ${userWon
              ? `${t.success.border} ${t.success.bg} text-game-green`
              : `${t.secondary.border} ${t.secondary.bg} ${t.secondary.text}`
            }`}>
            <span className="text-2xl">{userWon ? '🏆' : '🤖'}</span>
            <div>
              <p className={`font-display font-bold text-lg ${t.is ? '' : 'tracking-wider'}`}>
                {t.is
                  ? (userWon ? 'Human wins' : 'AI wins')
                  : (userWon ? 'HUMAN WINS' : 'AI WINS')}
              </p>
              <p className="font-mono text-xs opacity-70">
                {userWon
                  ? `Your path was ${formatDist(aiLen - pathLength)} units shorter.`
                  : `AI path was ${formatDist(pathLength - aiLen)} units shorter.`}
              </p>
            </div>
          </div>
        )}

        {/* Side-by-side path comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className={`${t.card} ${t.primary.border} p-4`}>
            <span className="stat-label block mb-2">{t.is ? 'your path' : 'YOUR PATH'}</span>
            <span className={`font-mono font-bold text-2xl ${t.primary.text}`}>{formatDist(pathLength) || '—'}</span>
            <p className="font-mono text-xs text-game-muted mt-1">{humanEdges.length} edges placed</p>
          </div>
          <div className={`${t.card} ${t.secondary.border} p-4`}>
            <span className="stat-label block mb-2">{t.is ? 'AI-only path' : 'AI-ONLY PATH'}</span>
            <span className={`font-mono font-bold text-2xl ${t.secondary.text}`}>{formatDist(aiLen) || '—'}</span>
            <p className="font-mono text-xs text-game-muted mt-1">
              {t.is ? 'Nearest-neighbour heuristic' : 'Nearest-neighbor heuristic'}
            </p>
          </div>
        </div>

        <RouteReplay />
        <CollaborationScore />
        <ConvergenceGraph />

        {/* Application layer */}
        <div className={`${t.card} p-5`}>
          <h3 className={`${t.sectionTitle} mb-3`}>
            {t.is ? 'What this solves in the real world' : 'WHAT THIS SOLVES IN THE REAL WORLD'}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: '💊', title: t.is ? 'Drug Discovery'     : 'Drug Discovery',    desc: 'Protein docking path optimization'  },
              { icon: '🧬', title: t.is ? 'Genome Sequencing'  : 'Genome Sequencing', desc: 'Fragment assembly ordering'          },
              { icon: '💻', title: t.is ? 'SoC Routing'        : 'SoC Routing',       desc: 'Chip wire-length minimization'       },
              { icon: '🚚', title: t.is ? 'Last-Mile Logistics' : 'Last-Mile Logistics', desc: 'Delivery route optimization'       },
            ].map(a => (
              <div key={a.title} className="p-3 bg-game-bg rounded border border-game-border">
                <span className="text-xl">{a.icon}</span>
                <p className="font-mono font-bold text-xs text-game-text mt-1">{a.title}</p>
                <p className="font-mono text-xs text-game-muted mt-0.5">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

function ScoreCard({ label, value, color }) {
  return (
    <div className="bg-game-surface border border-game-border rounded-lg p-4">
      <span className="stat-label block mb-1">{label}</span>
      <span className={`font-mono font-bold text-xl ${color}`}>{value}</span>
    </div>
  )
}
