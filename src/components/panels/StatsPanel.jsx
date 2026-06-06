import { useEffect }  from 'react'
import { useGameStore } from '../../stores/gameStore'
import { formatDist, computeGapPercent, formatTime } from '../../utils/tspUtils'
import { edgesRemaining } from '../../utils/tourValidator'
import { useTheme }  from '../../hooks/useTheme'

export default function StatsPanel({ className = '' }) {
  const {
    pathLength, optimalBound, timeElapsed,
    moveHistory, humanEdges, nodes, difficulty,
    tickTime, undoLastMove, gamePhase, startNode,
  } = useGameStore()
  const t   = useTheme()
  const gap = computeGapPercent(pathLength, optimalBound)

  // Timer — only runs during routing phase
  useEffect(() => {
    if (gamePhase !== 'routing') return
    const id = setInterval(tickTime, 1000)
    return () => clearInterval(id)
  }, [gamePhase])

  // ── NO auto-complete here. gameStore.addHumanEdge calls isTourComplete
  //    as the single source of truth. Removed the old conflicting useEffect.

  const gapColor =
    gap <= 10  ? 'text-game-green' :
    gap <= 25  ? 'text-game-amber' : 'text-game-red'

  return (
    <div className={`flex flex-col h-full bg-game-surface border-r border-game-border ${className}`}>

      {/* Header */}
      <div className="px-3 py-3 border-b border-game-border">
        <span className={t.header}>{t.is ? 'Statistics' : 'STATISTICS'}</span>
      </div>

      {/* Core Stats */}
      <div className="px-3 py-3 space-y-4 border-b border-game-border">
        <StatItem
          label={t.is ? 'path length'   : 'PATH LENGTH'}
          value={formatDist(pathLength) || '—'}
          color={t.primary.text}
        />
        <StatItem
          label={t.is ? 'optimal bound' : 'OPTIMAL BOUND'}
          value={formatDist(optimalBound) || '—'}
          color="text-game-muted"
        />
        <div>
          <span className="stat-label block mb-1">{t.is ? 'gap to optimal' : 'GAP TO OPTIMAL'}</span>
          <div className="flex items-center gap-2">
            <div className={`flex-1 h-1.5 ${t.track}`}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(gap, 100)}%`, background: t.gapFill(gap) }}
              />
            </div>
            <span className={`font-mono font-bold text-sm ${gapColor}`}>{gap}%</span>
          </div>
        </div>
        <StatItem label={t.is ? 'time'      : 'TIME'}      value={formatTime(timeElapsed)} color="text-game-text"  />
        <StatItem label={t.is ? 'nodes'     : 'NODES'}     value={nodes.length || difficulty} color="text-game-text"  />
        <StatItem label={t.is ? 'edges set' : 'EDGES SET'} value={humanEdges.length}       color={t.secondary.text} />

        {/* Edges remaining — routing phase only */}
        {gamePhase === 'routing' && nodes.length > 0 && (
          <StatItem
            label={t.is ? 'edges remaining' : 'EDGES REMAINING'}
            value={edgesRemaining(humanEdges.length, nodes.length)}
            color={edgesRemaining(humanEdges.length, nodes.length) <= 1 ? t.secondary.text : t.primary.text}
          />
        )}

        {/* Start node — shown once set */}
        {startNode !== null && gamePhase !== 'idle' && gamePhase !== 'placing' && (
          <StatItem
            label={t.is ? 'start / home node' : 'START / HOME NODE'}
            value={`★ ${startNode}`}
            color={t.primary.text}
          />
        )}
      </div>

      {/* Move History */}
      <div className="flex-1 overflow-hidden flex flex-col px-3 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="stat-label">{t.is ? 'move history' : 'MOVE HISTORY'}</span>
          <button
            onClick={undoLastMove}
            disabled={!humanEdges.length}
            className="text-game-muted hover:text-game-red font-mono text-xs
              disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {t.is ? '↩ undo' : '↩ UNDO'}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {moveHistory.length === 0 ? (
            <p className="text-game-muted font-mono text-xs">
              {t.is ? 'No moves yet' : 'No moves yet'}
            </p>
          ) : (
            moveHistory.slice(0, 8).map((move, i) => (
              <div
                key={i}
                className="flex items-center gap-2 font-mono text-xs py-1 border-b border-game-border/50"
              >
                <span className={move.type === 'human' ? t.primary.text : t.secondary.text}>
                  {move.type === 'human' ? '◈' : '◆'}
                </span>
                <span className="text-game-muted">{move.edge.from}→{move.edge.to}</span>
                <span className="text-game-text ml-auto">{formatDist(move.edge.dist)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Mode Badge */}
      <div className="px-3 py-2 border-t border-game-border">
        <ModeBadge />
      </div>
    </div>
  )
}

function StatItem({ label, value, color }) {
  return (
    <div>
      <span className="stat-label block mb-0.5">{label}</span>
      <span className={`stat-value ${color}`}>{value}</span>
    </div>
  )
}

function ModeBadge() {
  const { mode } = useGameStore()
  const t = useTheme()

  const config = {
    solo:    { labelC: 'SOLO RUN', labelS: 'Solo Run', color: 'text-game-green', border: t.success.border },
    copilot: { labelC: 'CO-PILOT', labelS: 'Co-Pilot', color: t.primary.text,   border: t.primary.border },
    vs:      { labelC: 'VS AI',    labelS: 'Vs AI',    color: t.secondary.text, border: t.secondary.border },
  }[mode] || { labelC: 'UNKNOWN', labelS: 'Unknown', color: 'text-game-muted', border: 'border-game-border' }

  return (
    <div className={`flex items-center justify-center py-1 rounded border ${config.border}`}>
      <span className={`font-mono font-bold text-xs ${config.color}`}>
        {t.is ? config.labelS : config.labelC}
      </span>
    </div>
  )
}
