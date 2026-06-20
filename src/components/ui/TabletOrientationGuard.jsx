import { useEffect, useState } from 'react'
import { useTheme } from '../../hooks/useTheme'

/**
 * TabletOrientationGuard
 * Shows a fullscreen blurred overlay ONLY for tablet users (768px–1199px)
 * in LANDSCAPE orientation. Disappears automatically when they rotate to portrait.
 * Not shown on mobile (<768px) or desktop (≥1200px).
 */
export default function TabletOrientationGuard() {
  const t = useTheme()
  const [show, setShow] = useState(false)

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      const isTablet   = w >= 768 && w <= 1199
      const isLandscape = w > h
      setShow(isTablet && isLandscape)
    }

    check()
    window.addEventListener('resize', check)
    window.addEventListener('orientationchange', check)
    return () => {
      window.removeEventListener('resize', check)
      window.removeEventListener('orientationchange', check)
    }
  }, [])

  if (!show) return null

  return (
    <div
      style={{
        position:        'fixed',
        inset:           0,
        zIndex:          9999,
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        gap:             '1.5rem',
        backdropFilter:  'blur(18px) saturate(0.4)',
        WebkitBackdropFilter: 'blur(18px) saturate(0.4)',
        background:      t.is
          ? 'rgba(250,250,248,0.55)'
          : 'rgba(9,13,20,0.75)',
      }}
    >
      {/* Rotating phone icon */}
      <div style={{ animation: 'tiltRotate 2.2s ease-in-out infinite' }}>
        <svg
          width="56" height="56"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Tablet outline */}
          <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
          {/* Rotation arrow */}
          <path
            d="M7.5 6.5 A6 6 0 0 1 16.5 6.5"
            stroke="var(--color-primary)"
            strokeWidth="1.4"
            fill="none"
            strokeDasharray="2 1"
            opacity="0.6"
          />
        </svg>
      </div>

      <div style={{ textAlign: 'center', maxWidth: '280px' }}>
        <p style={{
          fontFamily:    'var(--font-display)',
          fontWeight:    700,
          fontSize:      '1.15rem',
          color:         t.is ? 'var(--color-text)' : '#ffffff',
          letterSpacing: t.is ? '-0.01em' : '0.06em',
          marginBottom:  '0.5rem',
          lineHeight:    1.3,
        }}>
          {t.is ? 'Tilt your device' : 'TILT YOUR DEVICE'}
        </p>
        <p style={{
          fontFamily:  'var(--font-mono)',
          fontSize:    '0.68rem',
          color:       'var(--color-muted)',
          lineHeight:  1.7,
          letterSpacing: '0.02em',
        }}>
          Rotate to portrait for the<br />best Pathfinder experience.
        </p>
      </div>

      {/* Thin primary-coloured divider line */}
      <div style={{
        width:      '40px',
        height:     '1.5px',
        background: 'var(--color-primary)',
        borderRadius: '1px',
        opacity:    0.5,
      }} />

      <p style={{
        fontFamily:    'var(--font-mono)',
        fontSize:      '0.55rem',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color:         'var(--color-primary)',
        opacity:       0.55,
      }}>
        Pathfinder · TSP
      </p>

      {/* Keyframe injected inline so it works without modifying index.css */}
      <style>{`
        @keyframes tiltRotate {
          0%   { transform: rotate(0deg);   }
          25%  { transform: rotate(-15deg); }
          75%  { transform: rotate(15deg);  }
          100% { transform: rotate(0deg);   }
        }
      `}</style>
    </div>
  )
}
