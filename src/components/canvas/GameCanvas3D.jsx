import { useRef } from 'react'
import { useThreeGame } from './useThreeGame'
import { useGameStore } from '../../stores/gameStore'
import { useTheme }     from '../../hooks/useTheme'

// Pure renderer — no spawn logic. ArenaScreen owns node spawning.
export default function GameCanvas3D({ className = '' }) {
  const containerRef = useRef(null)
  useThreeGame(containerRef)
  const { gamePhase, nodes } = useGameStore()
  const t = useTheme()

  return (
    <div
      className={`relative w-full h-full ${className}`}
      style={{ touchAction: 'none', overflow: 'hidden' }}
    >
      <div ref={containerRef} className="w-full h-full" />

      {/* 3D badge */}
      <div style={{
        position: 'absolute', top: '0.75rem', right: '0.75rem',
        padding: '0.25rem 0.6rem',
        borderRadius: t.is ? '0.5rem' : '0.25rem',
        border: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        opacity: 0.85, pointerEvents: 'none',
        display: 'flex', alignItems: 'center', gap: '0.4rem',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700,
          color: 'var(--color-primary)', letterSpacing: t.is ? '0.02em' : '0.1em',
        }}>
          {t.is ? '3d view' : '3D VIEW'}
        </span>
      </div>


    </div>
  )
}
