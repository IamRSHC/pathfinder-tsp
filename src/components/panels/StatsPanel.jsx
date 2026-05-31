import { useGameStore } from '../../stores/gameStore'
import { formatDist, computeGapPercent, formatTime } from '../../utils/tspUtils'
import { useEffect } from 'react'

export default function StatsPanel({ className = '' }) {
  const {
    pathLength, optimalBound, timeElapsed,
    moveHistory, humanEdges, nodes, difficulty,
    tickTime, undoLastMove, gamePhase, completeGame,
  } = useGameStore()

  const gap = computeGapPercent(pathLength, optimalBound)

  // Timer
  useEffect(() => {
    if (gamePhase !== 'routing') return
    const id = setInterval(tickTime, 1000)
    return () => clearInterval(id)
  }, [gamePhase])

  // Auto-complete when all nodes connected
  useEffect(() => {
    if (!nodes.length) return
    const connectedNodes = new Set()
    humanEdges.forEach(e => { connectedNodes.add(e.from); connectedNodes.add(e.to) })
    if (connectedNodes.size === nodes.length && humanEdges.length >= nodes.length) {
      completeGame()
    }
  }, [humanEdges, nodes])

  const gapColor =
    gap <= 10  ? 'text-game-green' :
    gap <= 25  ? 'text-game-amber' : 'text-game-red'

  return (
    <div className={`flex flex-col h-full bg-game-surface border-r border-game-border ${className}`}>
      {/* Header */}
      <div className="px-3 py-3 border-b border-game-border">
        <span className="font-display font-semibold text-sm text-game-text tracking-wider">
          STATISTICS
        </span>
      </div>

      {/* Core Stats */}
      <div className="px-3 py-3 space-y-4 border-b border-game-border">
        <StatItem label="PATH LENGTH"   value={formatDist(pathLength) || '—'} color="text-game-cyan" />
        <StatItem label="OPTIMAL BOUND" value={formatDist(optimalBound) || '—'} color="text-game-muted" />
        <div>
          <span className="stat-label block mb-1">GAP TO OPTIMAL</span>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-game-bg rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(gap, 100)}%`,
                  background: gap <= 10
                    ? '#00e676'
                    : gap <= 25
                    ? '#ffab00'
                    : '#ff1744',
                }}
              />
            </div>
            <span className={`font-mono font-bold text-sm ${gapColor}`}>{gap}%</span>
          </div>
        </div>
        <StatItem label="TIME"      value={formatTime(timeElapsed)} color="text-game-text"  />
        <StatItem label="NODES"     value={difficulty}             color="text-game-text"  />
        <StatItem label="EDGES SET" value={humanEdges.length}      color="text-game-amber" />
      </div>

      {/* Move History */}
      <div className="flex-1 overflow-hidden flex flex-col px-3 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="stat-label">MOVE HISTORY</span>
          <button
            onClick={undoLastMove}
            disabled={!humanEdges.length}
            className="text-game-muted hover:text-game-red font-mono text-xs
              disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ↩ UNDO
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {moveHistory.length === 0 ? (
            <p className="text-game-muted font-mono text-xs">No moves yet</p>
          ) : (
            moveHistory.slice(0, 8).map((move, i) => (
              <div
                key={i}
                className="flex items-center gap-2 font-mono text-xs py-1
                  border-b border-game-border/50"
              >
                <span className={
                  move.type === 'human' ? 'text-game-cyan' : 'text-game-amber'
                }>
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
  const config = {
    solo:    { label: 'SOLO RUN',    color: 'text-game-green',  border: 'border-game-green/40'  },
    copilot: { label: 'CO-PILOT',    color: 'text-game-cyan',   border: 'border-game-cyan/40'   },
    vs:      { label: 'VS AI',       color: 'text-game-amber',  border: 'border-game-amber/40'  },
  }[mode] || { label: 'UNKNOWN', color: 'text-game-muted', border: 'border-game-border' }
  return (
    <div className={`flex items-center justify-center py-1 rounded border ${config.border}`}>
      <span className={`font-mono font-bold text-xs ${config.color}`}>{config.label}</span>
    </div>
  )
}