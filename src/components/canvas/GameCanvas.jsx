import { useRef, useEffect } from 'react'
import { usePixiGame }  from './usePixiGame'
import { useGameStore } from '../../stores/gameStore'
import { useUiStore }   from '../../stores/uiStore'

export default function GameCanvas({ className = '' }) {
  const containerRef = useRef(null)
  const { spawnNodes } = usePixiGame(containerRef)
  const { gamePhase, difficulty, nodes } = useGameStore()
  const { showNotification } = useUiStore()

  // Auto-spawn when entering arena
  useEffect(() => {
    if (gamePhase === 'idle' && containerRef.current) {
      setTimeout(() => {
        spawnNodes()
        showNotification(`${difficulty} nodes generated. Start routing!`, 'success')
      }, 300)
    }
  }, [gamePhase])

  return (
    <div className={`relative w-full h-full scanlines ${className}`}>
      {/* Canvas mount point */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Overlay: instructions */}
      {nodes.length > 0 && gamePhase === 'routing' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
          <p className="text-game-muted font-mono text-xs text-center px-3 py-1.5 bg-game-surface/80 rounded border border-game-border">
            Click a node to select · Click another to connect · Cyan = your path · Amber = AI path
          </p>
        </div>
      )}

      {/* Scale badge */}
      {difficulty > 500 && (
        <div className="absolute top-3 left-3 px-2 py-1 bg-game-amber/20 border border-game-amber/40 rounded text-game-amber font-mono text-xs">
          MACRO-ROUTING MODE
        </div>
      )}
      {difficulty > 150 && difficulty <= 500 && (
        <div className="absolute top-3 left-3 px-2 py-1 bg-game-purple/20 border border-game-purple/40 rounded text-game-purple font-mono text-xs">
          HEATMAP OVERLAY
        </div>
      )}
      {difficulty > 50 && difficulty <= 150 && (
        <div className="absolute top-3 left-3 px-2 py-1 bg-game-cyan/20 border border-game-cyan/40 rounded text-game-cyan font-mono text-xs">
          CLUSTER MODE
        </div>
      )}
    </div>
  )
}