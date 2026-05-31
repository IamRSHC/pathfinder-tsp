import { useNavigate }       from 'react-router-dom'
import Navbar                from '../components/ui/Navbar'
import RouteReplay           from '../components/results/RouteReplay'
import CollaborationScore    from '../components/results/CollaborationScore'
import ConvergenceGraph      from '../components/results/ConvergenceGraph'
import { useGameStore }      from '../stores/gameStore'
import { useAiStore }        from '../stores/aiStore'
import { nearestNeighborTour, formatDist, computeGapPercent, formatTime } from '../utils/tspUtils'

export default function ResultsScreen() {
  const navigate = useNavigate()
  const { nodes, humanEdges, pathLength, optimalBound, timeElapsed, mode, difficulty } = useGameStore()
  const { aiPathLength } = useAiStore()

  const aiTour    = nearestNeighborTour(nodes)
  const aiLen     = aiTour.length
  const gap       = computeGapPercent(pathLength, optimalBound)
  const userWon   = pathLength <= aiLen || !aiLen

  const handleShare = () => {
    const text = `PATHFINDER TSP — ${difficulty} nodes, gap ${gap}%, ${formatTime(timeElapsed)} | pathfinder-tsp.vercel.app`
    navigator.clipboard?.writeText(text)
  }

  return (
    <div className="flex flex-col min-h-screen bg-game-bg">
      <Navbar />

      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto w-full space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-3xl text-game-cyan glow-cyan tracking-wider">
              DEBRIEF
            </h1>
            <p className="font-mono text-xs text-game-muted mt-1">
              {difficulty} nodes · {['SOLO RUN','CO-PILOT','VS AI'][['solo','copilot','vs'].indexOf(mode)] || mode}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleShare}
              className="px-4 py-2 font-mono text-xs font-bold rounded border
                border-game-border text-game-muted hover:text-game-text
                hover:border-game-text/40 transition-colors"
            >
              ↗ SHARE
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 font-mono text-xs font-bold rounded
                bg-game-cyan/10 border border-game-cyan/40 text-game-cyan
                hover:bg-game-cyan/20 transition-colors"
            >
              PLAY AGAIN
            </button>
          </div>
        </div>

        {/* Score cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ScoreCard label="YOUR PATH"     value={formatDist(pathLength) || '—'} color="text-game-cyan"  />
          <ScoreCard label="AI-ONLY PATH"  value={formatDist(aiLen)  || '—'}     color="text-game-amber" />
          <ScoreCard label="GAP TO OPTIMAL" value={`${gap}%`}                    color={gap<=10?'text-game-green':gap<=25?'text-game-amber':'text-game-red'} />
          <ScoreCard label="TIME"          value={formatTime(timeElapsed)}        color="text-game-text"  />
        </div>

        {/* Winner banner */}
        {mode === 'vs' && (
          <div className={`flex items-center gap-3 p-4 rounded-lg border
            ${userWon
              ? 'border-game-green/40 bg-game-green/5 text-game-green'
              : 'border-game-amber/40 bg-game-amber/5 text-game-amber'
            }`}>
            <span className="text-2xl">{userWon ? '🏆' : '🤖'}</span>
            <div>
              <p className="font-display font-bold text-lg tracking-wider">
                {userWon ? 'HUMAN WINS' : 'AI WINS'}
              </p>
              <p className="font-mono text-xs opacity-70">
                {userWon
                  ? `Your path was ${formatDist(aiLen - pathLength)} units shorter.`
                  : `AI path was ${formatDist(pathLength - aiLen)} units shorter.`
                }
              </p>
            </div>
          </div>
        )}

        {/* Side-by-side path comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-game-surface border border-game-cyan/30 rounded-lg p-4">
            <span className="stat-label block mb-2">YOUR PATH</span>
            <span className="font-mono font-bold text-2xl text-game-cyan">{formatDist(pathLength) || '—'}</span>
            <p className="font-mono text-xs text-game-muted mt-1">{humanEdges.length} edges placed</p>
          </div>
          <div className="bg-game-surface border border-game-amber/30 rounded-lg p-4">
            <span className="stat-label block mb-2">AI-ONLY PATH</span>
            <span className="font-mono font-bold text-2xl text-game-amber">{formatDist(aiLen) || '—'}</span>
            <p className="font-mono text-xs text-game-muted mt-1">Nearest-neighbor heuristic</p>
          </div>
        </div>

        {/* Route replay */}
        <RouteReplay />

        {/* Collaboration breakdown */}
        <CollaborationScore />

        {/* Convergence graph */}
        <ConvergenceGraph />

        {/* Application layer */}
        <div className="bg-game-surface border border-game-border rounded-lg p-5">
          <h3 className="font-display font-semibold text-game-text tracking-wider mb-3">
            WHAT THIS SOLVES IN THE REAL WORLD
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon:'💊', title:'Drug Discovery',    desc:'Protein docking path optimization'  },
              { icon:'🧬', title:'Genome Sequencing', desc:'Fragment assembly ordering'          },
              { icon:'💻', title:'SoC Routing',       desc:'Chip wire-length minimization'       },
              { icon:'🚚', title:'Last-Mile Logistics',desc:'Delivery route optimization'        },
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