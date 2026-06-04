import { useRef, useEffect } from 'react'
import { usePixiGame }   from './usePixiGame'
import { useGameStore }  from '../../stores/gameStore'
import { useUiStore }    from '../../stores/uiStore'
import { useTheme }      from '../../hooks/useTheme'
import GameCanvas3D      from './GameCanvas3D'
import ViewToggle        from '../ui/ViewToggle'

// ── 2D canvas (Pixi) ───────────────────────────────────────────────────────
function GameCanvas2D({ className = '' }) {
  const containerRef = useRef(null)
  const { spawnNodes } = usePixiGame(containerRef)
  const { gamePhase, difficulty, nodes } = useGameStore()
  const { showNotification } = useUiStore()
  const t = useTheme()

  useEffect(() => {
    if (gamePhase === 'idle' && containerRef.current) {
      const timer = setTimeout(() => {
        spawnNodes()
        showNotification(`${difficulty} nodes generated. Start routing!`, 'success')
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [gamePhase]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (nodes.length === 0 && gamePhase === 'idle' && containerRef.current) {
      const timer = setTimeout(() => spawnNodes(), 400)
      return () => clearTimeout(timer)
    }
  }, [nodes.length]) // eslint-disable-line react-hooks/exhaustive-deps

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
      style={{ touchAction: 'none' }}
    >
      <div ref={containerRef} className="w-full h-full" />

      {nodes.length > 0 && gamePhase === 'routing' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
          <p className="font-mono text-xs text-center px-3 py-1.5 rounded border
            text-game-muted bg-game-surface/80 border-game-border">
            {t.is
              ? 'Tap a node to select · tap another to connect'
              : 'Click a node to select · click another to connect · Cyan = your path · Amber = AI path'}
          </p>
        </div>
      )}

      {modeLabel && (
        <div className={`absolute top-3 left-3 px-2 py-1 rounded border font-mono text-xs ${modeLabelColor}`}>
          {modeLabel}
        </div>
      )}
    </div>
  )
}

// ── Unified canvas wrapper with 2D/3D toggle ──────────────────────────────
export default function GameCanvas({ className = '' }) {
  const { viewMode } = useUiStore()

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Render both canvases but only show the active one.
          We use visibility+pointer-events rather than unmounting to avoid
          destroying and recreating the GL context on every toggle.
          Both hooks stay alive; only the visible one receives interaction. */}

      {/* 2D canvas */}
      <div
        style={{
          position:      'absolute',
          inset:         0,
          visibility:    viewMode === '2d' ? 'visible' : 'hidden',
          pointerEvents: viewMode === '2d' ? 'auto'    : 'none',
          zIndex:        viewMode === '2d' ? 1 : 0,
        }}
      >
        <GameCanvas2D className="w-full h-full" />
      </div>

      {/* 3D canvas */}
      <div
        style={{
          position:      'absolute',
          inset:         0,
          visibility:    viewMode === '3d' ? 'visible' : 'hidden',
          pointerEvents: viewMode === '3d' ? 'auto'    : 'none',
          zIndex:        viewMode === '3d' ? 1 : 0,
        }}
      >
        <GameCanvas3D className="w-full h-full" />
      </div>

      {/* 2D/3D toggle pill — always visible in bottom-right */}
      <div
        style={{
          position:  'absolute',
          bottom:    '0.85rem',
          right:     '0.85rem',
          zIndex:    10,
        }}
      >
        <ViewToggle />
      </div>
    </div>
  )
}
