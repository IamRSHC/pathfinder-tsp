import { useRef, useEffect } from 'react'
import { usePixiGame }  from './usePixiGame'
import { useGameStore } from '../../stores/gameStore'
import { useUiStore }   from '../../stores/uiStore'
import { useTheme }     from '../../hooks/useTheme'

export default function GameCanvas({ className = '' }) {
  const containerRef   = useRef(null)
  const hasSpawnedRef  = useRef(false)           // ← tracks if THIS mount has spawned
  const { spawnNodes } = usePixiGame(containerRef)
  const { gamePhase, difficulty, nodes } = useGameStore()
  const { showNotification } = useUiStore()
  const t = useTheme()

  // ── BUG FIX: spawn whenever Pixi is freshly mounted (hasSpawnedRef guards
  //    against double-spawn in StrictMode).  We no longer gate on 'idle' only —
  //    because after the ArenaScreen unmount-reset the phase IS idle now, but
  //    this explicit per-mount ref is a safer guard. ─────────────────────────
  useEffect(() => {
    if (hasSpawnedRef.current) return
    const timer = setTimeout(() => {
      spawnNodes()
      showNotification(`${difficulty} nodes generated. Start routing!`, 'success')
      hasSpawnedRef.current = true
    }, 300)
    return () => clearTimeout(timer)
  }, [spawnNodes]) // spawnNodes is stable (useCallback with [])

  return (
    <div
      className={`relative w-full h-full scanlines ${className}`}
      // ── MOBILE FIX: prevent browser from intercepting touch-scroll on canvas
      style={{ touchAction: 'none' }}
    >
      {/* Canvas mount point */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Overlay: instructions — responsive copy */}
      {nodes.length > 0 && gamePhase === 'routing' && (
        <div className="absolute bottom-14 lg:bottom-4 left-1/2 -translate-x-1/2 pointer-events-none w-max max-w-[90vw]">
          <p className="text-game-muted font-mono text-xs text-center px-3 py-1.5
            bg-game-surface/80 rounded border border-game-border">
            <span className="hidden sm:inline">
              Click a node to select · Click another to connect ·&nbsp;
            </span>
            <span className="sm:hidden">Tap a node · Tap another to connect ·&nbsp;</span>
            <span style={{ color: 'var(--color-primary)' }}>
              {t.is ? 'green' : 'cyan'}
            </span>
            {' '}= you ·{' '}
            <span style={{ color: 'var(--color-secondary)' }}>
              {t.is ? 'rose' : 'amber'}
            </span>
            {' '}= AI
          </p>
        </div>
      )}

      {/* Scale mode badges — theme-aware */}
      {difficulty > 500 && (
        <div className={`absolute top-3 left-3 px-2 py-1 rounded font-mono text-xs
          ${t.secondary.bg} ${t.secondary.border} ${t.secondary.text}`}>
          {t.is ? 'Macro-Routing Mode' : 'MACRO-ROUTING MODE'}
        </div>
      )}
      {difficulty > 150 && difficulty <= 500 && (
        <div className={`absolute top-3 left-3 px-2 py-1 rounded font-mono text-xs
          ${t.special.bg} ${t.special.border} ${t.special.text}`}>
          {t.is ? 'Heatmap Overlay' : 'HEATMAP OVERLAY'}
        </div>
      )}
      {difficulty > 50 && difficulty <= 150 && (
        <div className={`absolute top-3 left-3 px-2 py-1 rounded font-mono text-xs
          ${t.primary.bg} ${t.primary.border} ${t.primary.text}`}>
          {t.is ? 'Cluster Mode' : 'CLUSTER MODE'}
        </div>
      )}
    </div>
  )
}
