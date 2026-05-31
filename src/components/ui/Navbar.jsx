import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const { pathname } = useLocation()

  const links = [
    { to: '/',       label: 'LOBBY'    },
    { to: '/arena',  label: 'ARENA'    },
    { to: '/global', label: 'GLOBAL'   },
  ]

  return (
    <nav className="flex items-center justify-between px-6 py-3
      bg-game-surface border-b border-game-border shrink-0">
      <Link to="/" className="flex items-center gap-2">
        <span className="font-display font-bold text-lg text-game-cyan glow-cyan tracking-widest">
          PATHFINDER
        </span>
        <span className="hidden sm:block font-mono text-xs text-game-muted">
          TSP // HUMAN × AI
        </span>
      </Link>
      <div className="flex items-center gap-1">
        {links.map(l => (
          <Link
            key={l.to}
            to={l.to}
            className={`px-3 py-1.5 rounded font-mono text-xs font-bold tracking-wider
              transition-colors duration-150
              ${pathname === l.to
                ? 'text-game-cyan bg-game-cyan/10 border border-game-cyan/30'
                : 'text-game-muted hover:text-game-text'
              }`}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}