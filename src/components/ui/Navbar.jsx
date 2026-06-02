import { Link, useLocation } from 'react-router-dom'
import { useUiStore } from '../../stores/uiStore'

export default function Navbar() {
  const { pathname } = useLocation()
  const { theme, toggleTheme } = useUiStore()
  const isSerene = theme === 'serene'

  const links = [
    { to: '/',       label: isSerene ? 'Lobby'  : 'LOBBY'  },
    { to: '/arena',  label: isSerene ? 'Arena'  : 'ARENA'  },
    { to: '/global', label: isSerene ? 'Global' : 'GLOBAL' },
  ]

  return (
    <nav
      className="flex items-center justify-between px-6 py-3 shrink-0"
      style={{
        background:   'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2">
        <span
          className={`font-bold text-lg tracking-widest t-display ${
            isSerene ? 'text-[#2D6A4F]' : 'text-game-cyan glow-cyan'
          }`}
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {isSerene ? 'Pathfinder' : 'PATHFINDER'}
        </span>
        <span
          className="hidden sm:block text-xs"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}
        >
          {isSerene ? 'TSP · Human × AI' : 'TSP // HUMAN × AI'}
        </span>
      </Link>

      {/* Nav links + toggle */}
      <div className="flex items-center gap-1 sm:gap-2">
        {links.map(l => (
          <Link
            key={l.to}
            to={l.to}
            className="px-3 py-1.5 rounded transition-colors duration-150"
            style={{
              fontFamily:  'var(--font-mono)',
              fontSize:    '0.72rem',
              fontWeight:  700,
              letterSpacing: isSerene ? '0.01em' : '0.08em',
              color: pathname === l.to
                ? 'var(--color-primary)'
                : 'var(--color-muted)',
              background: pathname === l.to
                ? isSerene
                  ? 'rgba(45,106,79,0.08)'
                  : 'rgba(0,229,255,0.08)'
                : 'transparent',
              borderBottom: pathname === l.to && isSerene
                ? '2px solid var(--color-primary)'
                : 'none',
            }}
          >
            {l.label}
          </Link>
        ))}

        {/* ── Theme Toggle ── */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="relative ml-3 flex items-center rounded-full p-0.5 transition-all duration-300"
          style={{
            background:   isSerene ? '#EFF6F2' : '#1a2540',
            border:       isSerene
              ? '1px solid rgba(45,106,79,0.25)'
              : '1px solid rgba(0,229,255,0.25)',
            width:  '88px',
            height: '30px',
          }}
        >
          {/* Sliding pill */}
          <span
            className="absolute rounded-full transition-all duration-300 ease-in-out"
            style={{
              width:      '38px',
              height:     '22px',
              top:        '3px',
              left:       isSerene ? '45px' : '3px',
              background: isSerene
                ? 'linear-gradient(135deg, #2D6A4F, #3A7D5B)'
                : 'linear-gradient(135deg, #00e5ff, #0099bb)',
              boxShadow:  isSerene
                ? '0 1px 6px rgba(45,106,79,0.35)'
                : '0 1px 8px rgba(0,229,255,0.45)',
            }}
          />

          {/* Left label — CYBER */}
          <span
            className="relative z-10 flex-1 text-center transition-all duration-200"
            style={{
              fontFamily:  "'JetBrains Mono', monospace",
              fontSize:    '0.55rem',
              fontWeight:  700,
              letterSpacing: '0.04em',
              color: !isSerene ? '#090d14' : 'var(--color-muted)',
              userSelect: 'none',
            }}
          >
            CYBER
          </span>

          {/* Right label — Serene */}
          <span
            className="relative z-10 flex-1 text-center transition-all duration-200"
            style={{
              fontFamily:  "'Fraunces', serif",
              fontSize:    '0.6rem',
              fontWeight:  isSerene ? 600 : 400,
              color: isSerene ? '#FAFAF8' : 'var(--color-muted)',
              userSelect: 'none',
            }}
          >
            Serene
          </span>
        </button>
      </div>
    </nav>
  )
}