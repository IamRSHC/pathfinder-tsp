import { useRef, useEffect } from 'react'
import { useThreeGame }  from './useThreeGame'
import { useGameStore }  from '../../stores/gameStore'
import { useUiStore }    from '../../stores/uiStore'
import { useTheme }      from '../../hooks/useTheme'

export default function GameCanvas3D({ className = '' }) {
  const containerRef = useRef(null)
  const { spawnNodes } = useThreeGame(containerRef)
  const { gamePhase, difficulty, nodes } = useGameStore()
  const { showNotification } = useUiStore()
  const t = useTheme()

  // Same spawn logic as 2D canvas
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

  return (
    <div
      className={`relative w-full h-full ${className}`}
      style={{ touchAction: 'none', overflow: 'hidden' }}
    >
      {/* Three.js canvas mount point */}
      <div ref={containerRef} className="w-full h-full" />

      {/* 3D mode hint badge */}
      <div
        style={{
          position:   'absolute',
          top:        '0.75rem',
          right:      '0.75rem',
          padding:    '0.25rem 0.6rem',
          borderRadius: t.is ? '0.5rem' : '0.25rem',
          border:     `1px solid var(--color-border)`,
          background: 'var(--color-surface)',
          opacity:    0.85,
          pointerEvents: 'none',
          display:    'flex',
          alignItems: 'center',
          gap:        '0.4rem',
        }}
      >
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize:   '0.6rem',
          fontWeight: 700,
          color:      'var(--color-primary)',
          letterSpacing: t.is ? '0.02em' : '0.1em',
        }}>
          {t.is ? '3d view' : '3D VIEW'}
        </span>
      </div>

      {/* Interaction instructions */}
      {nodes.length > 0 && gamePhase === 'routing' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
          <p className="font-mono text-xs text-center px-3 py-1.5 rounded border
            text-game-muted bg-game-surface/90 border-game-border"
            style={{ whiteSpace: 'nowrap' }}
          >
            {t.is
              ? 'Tap nodes to connect · drag to orbit · pinch to zoom'
              : 'Click nodes to connect · drag to orbit · scroll/pinch to zoom'}
          </p>
        </div>
      )}
    </div>
  )
}
