import { useEffect } from 'react'
import { useNavigate }    from 'react-router-dom'
import GameCanvas         from '../components/canvas/GameCanvas'
import AIPanel            from '../components/panels/AIPanel'
import StatsPanel         from '../components/panels/StatsPanel'
import MobileDrawer       from '../components/panels/MobileDrawer'
import Navbar             from '../components/ui/Navbar'
import { useGameStore }   from '../stores/gameStore'
import { useUiStore }     from '../stores/uiStore'
import { useAiStore }     from '../stores/aiStore'
import { useTheme }       from '../hooks/useTheme'

export default function ArenaScreen() {
  const navigate = useNavigate()
  const { gamePhase, resetGame, difficulty } = useGameStore()
  const { reset: resetAi } = useAiStore()
  const { mobileDrawerOpen, openDrawer, notification } = useUiStore()
  const t = useTheme()

  // ── BUG FIX: reset game state when ArenaScreen unmounts so that if
  //    the user navigates back (Lobby → Arena again) the canvas re-spawns
  //    cleanly from 'idle' rather than finding stale 'routing' state. ──────
  useEffect(() => {
    return () => {
      resetGame()
      resetAi()
    }
  }, [])

  // Navigate to results when game completes
  useEffect(() => {
    if (gamePhase === 'complete') {
      setTimeout(() => navigate('/results'), 800)
    }
  }, [gamePhase])

  // Notification colour sets
  const notifCls = notification
    ? notification.type === 'success'
      ? `${t.success.bg} ${t.success.border} ${t.success.text}`
      : notification.type === 'warn'
      ? `${t.secondary.bg} ${t.secondary.border} ${t.secondary.text}`
      : `${t.primary.bg} ${t.primary.border} ${t.primary.text}`
    : ''

  return (
    <div className="flex flex-col h-screen bg-game-bg overflow-hidden">
      <Navbar />

      {/* Main arena — desktop 3-panel / mobile stacked */}
      <div className="flex flex-1 overflow-hidden">

        {/* Panel C: Stats — left, desktop only */}
        <div className="hidden lg:flex w-44 xl:w-52 shrink-0 flex-col overflow-y-auto">
          <StatsPanel />
        </div>

        {/* Panel A: Canvas — center, always visible */}
        <div className="flex-1 relative min-w-0">
          <GameCanvas className="w-full h-full" />

          {/* Mobile bottom bar */}
          <div className="absolute bottom-0 left-0 right-0 lg:hidden
            flex items-center justify-between
            bg-game-surface/95 border-t border-game-border px-4 py-2 backdrop-blur-sm">
            <button
              onClick={() => openDrawer('stats')}
              className="flex items-center gap-2 font-mono text-xs text-game-muted
                hover:text-game-cyan transition-colors min-h-[44px] px-3"
            >
              📊 {t.is ? 'Stats' : 'STATS'}
            </button>
            <div className="font-mono text-xs text-game-muted">
              {difficulty} {t.is ? 'nodes' : 'NODES'}
            </div>
            <button
              onClick={() => openDrawer('ai')}
              className="flex items-center gap-2 font-mono text-xs text-game-muted
                hover:text-game-amber transition-colors min-h-[44px] px-3"
            >
              🤖 {t.is ? 'AI' : 'AI'}{' '}
              <span className="w-2 h-2 rounded-full bg-game-green inline-block ml-1" />
            </button>
          </div>
        </div>

        {/* Panel B: AI — right, desktop only */}
        <div className="hidden lg:flex w-64 xl:w-72 shrink-0 flex-col overflow-y-auto">
          <AIPanel />
        </div>
      </div>

      {/* Mobile drawer */}
      <MobileDrawer />

      {/* Notification toast */}
      {notification && (
        <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-50
          px-4 py-2 rounded border font-mono text-xs font-bold
          animate-slide-up shadow-lg ${notifCls}`}
        >
          {notification.msg}
        </div>
      )}

      {/* Complete overlay */}
      {gamePhase === 'complete' && (
        <div className="absolute inset-0 bg-game-bg/80 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="text-center animate-fade-in">
            <div className="text-5xl mb-4">✓</div>
            <h2 className={`font-display font-bold text-3xl mb-2
              ${t.primary.text} ${t.primary.glow}
              ${t.is ? '' : 'tracking-wider'}`}>
              {t.is ? 'Route Complete' : 'ROUTE COMPLETE'}
            </h2>
            <p className="font-mono text-game-muted text-sm">
              {t.is ? 'Analysing results…' : 'Analyzing results...'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
