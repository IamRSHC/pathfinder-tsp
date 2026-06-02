import { Link, useLocation } from 'react-router-dom'
import { useUiStore } from '../../stores/uiStore'

export default function Navbar() {
  const { pathname }             = useLocation()
  const { theme, toggleTheme }   = useUiStore()
  const isSerene                 = theme === 'serene'

  const links = [
    { to: '/',       label: isSerene ? 'Lobby'  : 'LOBBY'  },
    { to: '/arena',  label: isSerene ? 'Arena'  : 'ARENA'  },
    { to: '/global', label: isSerene ? 'Global' : 'GLOBAL' },
  ]

  return (
    <nav
      style={{
        display:       'flex',
        alignItems:    'center',
        justifyContent:'space-between',
        padding:       '0.625rem 1.5rem',
        background:    'var(--color-surface)',
        borderBottom:  '1px solid var(--color-border)',
        flexShrink:    0,
        position:      'relative',
        zIndex:        50,
      }}
    >
      {/* ── Logo ── */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
        <span style={{
          fontFamily:    'var(--font-display)',
          fontWeight:    700,
          fontSize:      '1.15rem',
          letterSpacing: isSerene ? '0.01em' : '0.15em',
          color:         'var(--color-primary)',
          textShadow:    isSerene ? 'none' : '0 0 10px var(--color-primary)',
        }}>
          {isSerene ? 'Pathfinder' : 'PATHFINDER'}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize:   '0.7rem',
          color:      'var(--color-muted)',
          display:    'none',
        }}
          className="sm:block"
        >
          {isSerene ? 'TSP · Human × AI' : 'TSP // HUMAN × AI'}
        </span>
      </Link>

      {/* ── Right side: nav links + toggle ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>

        {/* Nav links */}
        {links.map(l => (
          <Link
            key={l.to}
            to={l.to}
            style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      '0.72rem',
              fontWeight:    700,
              letterSpacing: isSerene ? '0.02em' : '0.08em',
              color:         pathname === l.to ? 'var(--color-primary)' : 'var(--color-muted)',
              background:    pathname === l.to
                ? isSerene ? 'rgba(45,106,79,0.08)' : 'rgba(0,229,255,0.08)'
                : 'transparent',
              padding:        '0.35rem 0.75rem',
              borderRadius:   '0.375rem',
              textDecoration: 'none',
              borderBottom:   pathname === l.to && isSerene ? '2px solid var(--color-primary)' : '2px solid transparent',
              transition:     'color 0.15s ease, background 0.15s ease',
            }}
          >
            {l.label}
          </Link>
        ))}

        {/* ── Theme Toggle Pill ── */}
        <div
          style={{
            marginLeft:    '0.75rem',
            position:      'relative',
            display:       'flex',
            alignItems:    'center',
            width:         '96px',
            height:        '32px',
            borderRadius:  '999px',
            cursor:        'pointer',
            userSelect:    'none',
            // High contrast background that's visible on BOTH themes
            background:    isSerene ? '#E8F5EE' : '#162032',
            border:        isSerene
              ? '1.5px solid #2D6A4F'
              : '1.5px solid #00e5ff',
            boxShadow:     isSerene
              ? '0 0 0 0px transparent'
              : '0 0 8px rgba(0,229,255,0.3)',
            flexShrink:    0,
          }}
          onClick={toggleTheme}
          role="button"
          aria-label="Toggle theme"
        >
          {/* Sliding pill indicator */}
          <div
            style={{
              position:   'absolute',
              top:        '3px',
              left:       isSerene ? 'calc(100% - 3px - 42px)' : '3px',
              width:      '42px',
              height:     '22px',
              borderRadius: '999px',
              background: isSerene
                ? 'linear-gradient(135deg, #2D6A4F, #52B788)'
                : 'linear-gradient(135deg, #00b4d8, #00e5ff)',
              boxShadow:  isSerene
                ? '0 2px 8px rgba(45,106,79,0.5)'
                : '0 2px 10px rgba(0,229,255,0.6)',
              transition: 'left 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
              zIndex:     2,
            }}
          />

          {/* CYBER label — left */}
          <span
            style={{
              position:      'relative',
              zIndex:        3,
              flex:          1,
              textAlign:     'center',
              fontFamily:    "'JetBrains Mono', monospace",
              fontSize:      '0.52rem',
              fontWeight:    700,
              letterSpacing: '0.06em',
              color:         !isSerene ? '#090d14' : 'var(--color-muted)',
              transition:    'color 0.2s ease',
              pointerEvents: 'none',
            }}
          >
            CYBER
          </span>

          {/* Serene label — right */}
          <span
            style={{
              position:      'relative',
              zIndex:        3,
              flex:          1,
              textAlign:     'center',
              fontFamily:    "'Fraunces', serif",
              fontSize:      '0.62rem',
              fontWeight:    isSerene ? 700 : 400,
              color:         isSerene ? '#FAFAF8' : 'var(--color-muted)',
              transition:    'color 0.2s ease',
              pointerEvents: 'none',
            }}
          >
            Serene
          </span>
        </div>

      </div>
    </nav>
  )
}