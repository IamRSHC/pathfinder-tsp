import { useEffect }        from 'react'
import { useNavigate }      from 'react-router-dom'
import Navbar                from '../components/ui/Navbar'
import RouteReplay           from '../components/results/RouteReplay'
import CollaborationScore    from '../components/results/CollaborationScore'
import ConvergenceGraph      from '../components/results/ConvergenceGraph'
import { useGameStore }      from '../stores/gameStore'
import { useAiStore }        from '../stores/aiStore'
import { useTheme }          from '../hooks/useTheme'
import {
  nearestNeighborTour,
  formatDist,
  computeGapPercent,
  formatTime,
  computeScore,
  scoreGrade,
  SCORE_BASE,
} from '../utils/tspUtils'

export default function ResultsScreen() {
  const navigate = useNavigate()
  const {
    nodes, humanEdges, pathLength, optimalBound,
    timeElapsed, mode, difficulty,
    humanScore, aiScore, finalizeScore,
  } = useGameStore()
  const { aiPathLength } = useAiStore()
  const t = useTheme()

  // Compute AI tour via nearest-neighbour (same as before)
  const aiTour = nearestNeighborTour(nodes)
  const aiLen  = aiTour.length || aiPathLength || 0

  // Finalize scores once on mount
  useEffect(() => {
    if (aiLen > 0) finalizeScore(aiLen)
  }, [aiLen]) // eslint-disable-line react-hooks/exhaustive-deps

  const gap      = computeGapPercent(pathLength, optimalBound)
  const userWon  = pathLength <= aiLen || !aiLen

  // Grade the human score
  const hGrade = scoreGrade(humanScore)
  const aGrade = scoreGrade(aiScore)

  // Synergy bonus in Co-Pilot mode: human beat AI by >10%
  const synergyBonus = mode === 'copilot' && aiLen > 0 && pathLength < aiLen * 0.9
    ? Math.round((aiLen - pathLength) / aiLen * SCORE_BASE * 0.05)
    : 0

  const handleShare = () => {
    const text = `PATHFINDER TSP — ${difficulty} nodes · Score ${humanScore.toLocaleString()} · Grade ${hGrade.grade} · pathfinder-tsp.vercel.app`
    navigator.clipboard?.writeText(text)
  }

  const modeLabel = (m) => {
    const labels = { solo: 'Solo Run', copilot: 'Co-Pilot', vs: 'Vs AI' }
    return t.is ? labels[m] : (labels[m] || m).toUpperCase()
  }

  return (
    <div className="flex flex-col bg-game-bg overflow-y-auto" style={{ height: '100%' }}>
      <Navbar />

      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto w-full space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className={t.pageTitle}>{t.is ? 'Debrief' : 'DEBRIEF'}</h1>
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

        {/* ── SCORE HERO ── */}
        <ScoreHero
          mode={mode}
          humanScore={humanScore}
          aiScore={aiScore}
          hGrade={hGrade}
          aGrade={aGrade}
          synergyBonus={synergyBonus}
          userWon={userWon}
          t={t}
        />

        {/* ── Stats row ── */}
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

        {/* ── VS Winner banner ── */}
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
                  ? `Your score: ${humanScore.toLocaleString()} vs AI: ${aiScore.toLocaleString()}`
                  : `AI score: ${aiScore.toLocaleString()} vs Your score: ${humanScore.toLocaleString()}`}
              </p>
            </div>
          </div>
        )}

        {/* ── Path comparison ── */}
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

        {/* ── Application layer ── */}
        <div className={`${t.card} p-5`}>
          <h3 className={`${t.sectionTitle} mb-3`}>
            {t.is ? 'What this solves in the real world' : 'WHAT THIS SOLVES IN THE REAL WORLD'}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: '💊', title: 'Drug Discovery',     desc: 'Protein docking path optimization'  },
              { icon: '🧬', title: 'Genome Sequencing',  desc: 'Fragment assembly ordering'          },
              { icon: '💻', title: 'SoC Routing',        desc: 'Chip wire-length minimization'       },
              { icon: '🚚', title: 'Last-Mile Logistics', desc: 'Delivery route optimization'       },
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

// ── Score Hero component ───────────────────────────────────────────────────
function ScoreHero({ mode, humanScore, aiScore, hGrade, aGrade, synergyBonus, userWon, t }) {
  const borderColor = t.is ? 'border-green-800' : 'border-game-cyan/40'

  // SOLO: single centred score
  if (mode === 'solo') {
    return (
      <div className={`${t.card} p-6 text-center border ${borderColor}`}>
        <span className="stat-label block mb-3">{t.is ? 'your score' : 'YOUR SCORE'}</span>
        <div className="flex items-end justify-center gap-3 mb-2">
          <span className={`font-display font-bold text-6xl ${hGrade.color} tabular-nums`}>
            {humanScore.toLocaleString()}
          </span>
          <GradeBadge grade={hGrade} />
        </div>
        <p className="font-mono text-xs text-game-muted">{hGrade.label}</p>
      </div>
    )
  }

  // CO-PILOT: human score + AI score + optional synergy bonus
  if (mode === 'copilot') {
    const totalScore = humanScore + synergyBonus
    return (
      <div className={`${t.card} p-5 border ${borderColor}`}>
        <span className="stat-label block mb-4">{t.is ? 'collaboration scores' : 'COLLABORATION SCORES'}</span>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <span className="stat-label block mb-1">{t.is ? 'you' : 'YOU'}</span>
            <div className="flex items-end justify-center gap-2">
              <span className={`font-display font-bold text-4xl ${hGrade.color} tabular-nums`}>
                {humanScore.toLocaleString()}
              </span>
              <GradeBadge grade={hGrade} small />
            </div>
          </div>
          <div className="text-center">
            <span className="stat-label block mb-1">{t.is ? 'AI assist' : 'AI ASSIST'}</span>
            <div className="flex items-end justify-center gap-2">
              <span className={`font-display font-bold text-4xl ${aGrade.color} tabular-nums`}>
                {aiScore.toLocaleString()}
              </span>
              <GradeBadge grade={aGrade} small />
            </div>
          </div>
        </div>
        {synergyBonus > 0 && (
          <div className={`mt-2 p-3 rounded border ${t.success.border} ${t.success.bg} text-center`}>
            <span className="font-mono text-xs text-game-green font-bold">
              ⚡ {t.is ? 'Synergy Bonus' : 'SYNERGY BONUS'} +{synergyBonus.toLocaleString()}
            </span>
            <p className="font-mono text-xs text-game-muted mt-0.5">
              {t.is ? 'You beat the AI by over 10%' : 'YOU BEAT THE AI BY OVER 10%'}
            </p>
          </div>
        )}
        {synergyBonus > 0 && (
          <div className="mt-3 text-center">
            <span className="stat-label block mb-1">{t.is ? 'total score' : 'TOTAL SCORE'}</span>
            <span className={`font-display font-bold text-5xl ${hGrade.color} tabular-nums`}>
              {totalScore.toLocaleString()}
            </span>
          </div>
        )}
      </div>
    )
  }

  // VS AI: side-by-side duel
  return (
    <div className={`${t.card} p-5 border ${borderColor}`}>
      <span className="stat-label block mb-4 text-center">{t.is ? 'score duel' : 'SCORE DUEL'}</span>
      <div className="grid grid-cols-2 gap-0">
        {/* Human side */}
        <div className={`text-center p-4 rounded-l-lg border-r border-game-border
          ${userWon ? (t.is ? 'bg-green-900/20' : 'bg-game-cyan/5') : ''}`}>
          <span className="stat-label block mb-1">{t.is ? 'you' : 'YOU'}</span>
          <div className="flex items-end justify-center gap-2 mb-1">
            <span className={`font-display font-bold text-4xl ${hGrade.color} tabular-nums`}>
              {humanScore.toLocaleString()}
            </span>
          </div>
          <GradeBadge grade={hGrade} centered />
          {userWon && (
            <span className="font-mono text-xs text-game-green font-bold block mt-2">
              🏆 {t.is ? 'Winner' : 'WINNER'}
            </span>
          )}
        </div>
        {/* AI side */}
        <div className={`text-center p-4 rounded-r-lg
          ${!userWon ? (t.is ? 'bg-amber-900/20' : 'bg-game-amber/5') : ''}`}>
          <span className="stat-label block mb-1">{t.is ? 'AI' : 'AI'}</span>
          <div className="flex items-end justify-center gap-2 mb-1">
            <span className={`font-display font-bold text-4xl ${aGrade.color} tabular-nums`}>
              {aiScore.toLocaleString()}
            </span>
          </div>
          <GradeBadge grade={aGrade} centered />
          {!userWon && (
            <span className={`font-mono text-xs ${t.secondary.text} font-bold block mt-2`}>
              🤖 {t.is ? 'Winner' : 'WINNER'}
            </span>
          )}
        </div>
      </div>
      {/* Score gap bar */}
      <ScoreGapBar humanScore={humanScore} aiScore={aiScore} t={t} />
    </div>
  )
}

// ── Score gap visualiser (VS mode) ────────────────────────────────────────
function ScoreGapBar({ humanScore, aiScore, t }) {
  const total   = humanScore + aiScore || 1
  const hPct    = Math.round((humanScore / total) * 100)
  const diff    = Math.abs(humanScore - aiScore)
  const winner  = humanScore >= aiScore ? 'you' : 'AI'

  return (
    <div className="mt-4">
      <div className="flex justify-between font-mono text-xs text-game-muted mb-1">
        <span>{t.is ? 'you' : 'YOU'}</span>
        <span className="text-game-text font-bold">
          {diff > 0
            ? `${winner === 'you'
                ? (t.is ? 'You lead by ' : 'YOU LEAD BY ')
                : (t.is ? 'AI leads by ' : 'AI LEADS BY ')}${diff.toLocaleString()}`
            : (t.is ? 'Tied!' : 'TIED!')}
        </span>
        <span>{t.is ? 'AI' : 'AI'}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden flex bg-game-border">
        <div
          className={`h-full transition-all duration-700 ${t.is ? 'bg-green-600' : 'bg-game-cyan'}`}
          style={{ width: `${hPct}%` }}
        />
        <div
          className={`h-full transition-all duration-700 ${t.is ? 'bg-amber-700' : 'bg-game-amber'}`}
          style={{ width: `${100 - hPct}%` }}
        />
      </div>
    </div>
  )
}

// ── Grade badge ───────────────────────────────────────────────────────────
function GradeBadge({ grade, small = false, centered = false }) {
  const sizeCls  = small ? 'text-lg w-8 h-8' : 'text-2xl w-10 h-10'
  const alignCls = centered ? 'mx-auto' : ''
  return (
    <span className={`
      ${sizeCls} ${alignCls} ${grade.color}
      font-display font-bold rounded border border-current
      inline-flex items-center justify-center opacity-90
    `}>
      {grade.grade}
    </span>
  )
}

// ── Reusable stat card ────────────────────────────────────────────────────
function ScoreCard({ label, value, color }) {
  return (
    <div className="bg-game-surface border border-game-border rounded-lg p-4">
      <span className="stat-label block mb-1">{label}</span>
      <span className={`font-mono font-bold text-xl ${color}`}>{value}</span>
    </div>
  )
}
