import { useRef } from 'react'
import { usePixiGame }  from './usePixiGame'
import { useThreeGame } from './useThreeGame'
import { useGameStore } from '../../stores/gameStore'
import { useUiStore }   from '../../stores/uiStore'
import { useTheme }     from '../../hooks/useTheme'
import GameCanvas3D     from './GameCanvas3D'
import ViewToggle       from '../ui/ViewToggle'

// ── 2D canvas — pure renderer, NO spawn logic ─────────────────────────────
// Spawn is handled exclusively by ArenaScreen to avoid the dual-canvas race.
function GameCanvas2D({ className = '' }) {
  const containerRef = useRef(null)
  const { resetView } = usePixiGame(containerRef)  // hook renders reactively from store state
  const { gamePhase, nodes } = useGameStore()
  const { difficulty } = useGameStore()
  const t = useTheme()

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
    ? `text-game-purple ${t.special?.bg ?? ''} ${t.special?.border ?? ''}`
    : `${t.primary.text} ${t.primary.bg} ${t.primary.border}`

  return (
    <div
      className={`relative w-full h-full scanlines ${className}`}
      style={{ touchAction: 'none' }}
    >
      <div ref={containerRef} className="w-full h-full" />

      {/* ── Fit-all-nodes button — Google Maps style reset ── */}
      {/* Visible whenever nodes exist; double-tap canvas also triggers this */}
      {nodes.length > 0 && (
        <button
          onClick={resetView}
          title={t.is ? 'Fit all nodes in view (or double-tap canvas)' : 'FIT ALL NODES (double-tap canvas)'}
          className={`absolute top-3 right-3 z-10 w-7 h-7
            flex items-center justify-center
            rounded border font-mono
            bg-game-surface/80 border-game-border text-game-muted
            hover:text-game-cyan hover:border-game-cyan
            active:scale-95 transition-all backdrop-blur-sm
            lg:right-16`}
          style={{ fontSize: '1rem' }}
        >
          ⊙
        </button>
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
// Both canvas hooks stay alive (visibility swap, not unmount/remount).
// This avoids destroying/recreating GL contexts on each toggle.
// IMPORTANT: Neither canvas spawns nodes. ArenaScreen owns that responsibility.
export default function GameCanvas({ className = '' }) {
  const { viewMode } = useUiStore()
  const is2d = viewMode === '2d'

  return (
    <div className={`relative w-full h-full ${className}`}>

      {/* 2D canvas */}
      <div style={{
        position:      'absolute',
        inset:         0,
        visibility:    is2d ? 'visible' : 'hidden',
        pointerEvents: is2d ? 'auto'    : 'none',
        zIndex:        is2d ? 1 : 0,
      }}>
        <GameCanvas2D className="w-full h-full" />
      </div>

      {/* 3D canvas */}
      <div style={{
        position:      'absolute',
        inset:         0,
        visibility:    !is2d ? 'visible' : 'hidden',
        pointerEvents: !is2d ? 'auto'    : 'none',
        zIndex:        !is2d ? 1 : 0,
      }}>
        <GameCanvas3D className="w-full h-full" />
      </div>

      {/* 2D/3D toggle — always on top */}
      <div style={{ position: 'absolute', bottom: '0.85rem', right: '0.85rem', zIndex: 10 }}>
        <ViewToggle />
      </div>
    </div>
  )
}
