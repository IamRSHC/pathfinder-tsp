import { useRef, useEffect } from 'react'
import { usePixiGame }  from './usePixiGame'
import { useGameStore } from '../../stores/gameStore'
import { useUiStore }   from '../../stores/uiStore'
import { useTheme }     from '../../hooks/useTheme'

export default function GameCanvas({ className = '' }) {
  const containerRef = useRef(null)
  const { spawnNodes } = usePixiGame(containerRef)
  const { gamePhase, difficulty, nodes } = useGameStore()
  const { showNotification } = useUiStore()
  const t = useTheme()

  // Spawn when phase becomes idle (new game) OR when nodes are empty
  // but Pixi has already initialised (covers the "back to Arena" blank screen case)
  useEffect(() => {
    if (gamePhase === 'idle' && containerRef.current) {
      const timer = setTimeout(() => {
        spawnNodes()
        showNotification(`${difficulty} nodes generated. Start routing!`, 'success')
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [gamePhase])

  // Secondary guard: if we somehow end up with Pixi ready but no nodes, respawn
  useEffect(() => {
    if (nodes.length === 0 && gamePhase === 'idle' && containerRef.current) {
      const timer = setTimeout(() => spawnNodes(), 400)
      return () => clearTimeout(timer)
    }
  }, [nodes.length])

  const modeLabel = difficulty > 500
    ? (t.is ? 'Macro-Routing' : 'MACRO-ROUTING MODE')
    : difficulty > 150
    ? (t.is ? 'Heatmap Overlay' : 'HEATMAP OVERLAY')
    : difficulty > 50
    ? (t.is ? 'Cluster Mode' : 'CLUSTER MODE')
    : null

  const modeLabelColor = difficulty > 500
    ? `${t.secondary.text} ${t.secondary.bg} ${t.secondary.border}`
    : difficulty > 150
    ? `text-game-purple ${t.special.bg} ${t.special.border}`
    : `${t.primary.text} ${t.primary.bg} ${t.primary.border}`

  return (
    <div
      className={`relative w-full h-full scanlines ${className}`}
      style={{ touchAction: 'none' }}  /* prevent scroll hijack on touch devices */
    >
      {/* Canvas mount point */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Overlay: instructions */}
      {nodes.length > 0 && gamePhase === 'routing' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
          <p className={`font-mono text-xs text-center px-3 py-1.5 rounded border
            text-game-muted bg-game-surface/80 border-game-border`}>
            {t.is
              ? 'Tap a node to select · tap another to connect'
              : 'Click a node to select · click another to connect · Cyan = your path · Amber = AI path'}
          </p>
        </div>
      )}

      {/* Scale badge */}
      {modeLabel && (
        <div className={`absolute top-3 left-3 px-2 py-1 rounded border font-mono text-xs ${modeLabelColor}`}>
          {modeLabel}
        </div>
      )}
    </div>
  )
}
