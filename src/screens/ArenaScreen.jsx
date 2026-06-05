import { useEffect, useRef } from 'react'
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
import { edgesRemaining } from '../utils/tourValidator'

export default function ArenaScreen() {
  const navigate  = useNavigate()
  const isMounted = useRef(true)

  const { gamePhase, resetGame, difficulty, nodes, startNode, humanEdges } = useGameStore()
  const { mobileDrawerOpen, openDrawer, notification, viewMode } = useUiStore()
  const { reset: resetAi } = useAiStore()
  const t = useTheme()

  // ── Reset ONLY on mount ──────────────────────────────────────────────────
  // Zustand store persists across SPA navigation; PixiJS is destroyed on
  // unmount. Resetting here gives a clean slate every time Arena is entered.
  //
  // ⚠️  DO NOT reset in the cleanup (return fn). Calling resetGame() during
  // unmount triggers a Zustand flush mid-React-commit, which re-renders the
  // newly mounted screen (Lobby/Global) before its own layout is stable.
  // That is the EXACT cause of the blank-screen on navigation away from Arena.
  useEffect(() => {
    isMounted.current = true
    resetGame()
    resetAi()
    // Reset view to 2D on each new arena session (3D is opt-in per session)
    useUiStore.setState({ viewMode: '2d' })
    return () => {
      isMounted.current = false
      // No store resets here — intentional. See note above.
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Navigate to results when game completes — guarded so it never fires
  // after the component has unmounted (user navigated away mid-game)
  useEffect(() => {
    if (gamePhase === 'complete') {
      const timer = setTimeout(() => {
        if (isMounted.current) navigate('/results')
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [gamePhase, navigate])

  // Notification colour sets
  const notifCls = notification
    ? notification.type === 'success'
      ? `${t.success.bg} ${t.success.border} ${t.success.text}`
      : notification.type === 'warn'
      ? `${t.secondary.bg} ${t.secondary.border} ${t.secondary.text}`
      : `${t.primary.bg} ${t.primary.border} ${t.primary.text}`
    : ''

  return (
    <div className="flex flex-col bg-game-bg overflow-hidden" style={{ height: '100%' }}>
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
              className={`flex items-center gap-2 font-mono text-xs text-game-muted transition-colors
                ${t.is ? 'hover:text-game-cyan' : 'hover:text-game-cyan'}`}
            >
              📊 {t.is ? 'Stats' : 'STATS'}
            </button>
            <div className="font-mono text-xs text-game-muted">
              {difficulty} {t.is ? 'nodes' : 'NODES'}
            </div>
            <button
              onClick={() => openDrawer('ai')}
              className={`flex items-center gap-2 font-mono text-xs text-game-muted transition-colors
                ${t.is ? 'hover:text-game-amber' : 'hover:text-game-amber'}`}
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

      {/* ── Phase banner: PLACING — pick start node ── */}
      {gamePhase === 'placing' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
          style={{ minWidth: '260px' }}>
          <div className={`px-4 py-2 rounded border font-mono text-xs text-center font-bold shadow-lg
            ${t.primary.bg} ${t.primary.border} ${t.primary.text}`}>
            {t.is ? '★ Tap a node to set it as your Start node' : '★ CLICK A NODE TO SET YOUR START NODE'}
          </div>
        </div>
      )}

      {/* ── Routing hint: edges remaining + close-tour reminder ── */}
      {gamePhase === 'routing' && nodes.length > 0 && (() => {
        const rem = edgesRemaining(humanEdges.length, nodes.length)
        if (rem > 1) return null
        return (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
            style={{ minWidth: '280px' }}>
            <div className={`px-4 py-2 rounded border font-mono text-xs text-center font-bold shadow-lg
              ${t.secondary.bg} ${t.secondary.border} ${t.secondary.text}`}>
              {rem === 1
                ? (t.is
                  ? `★ Connect back to Node ${startNode ?? 0} to complete the tour!`
                  : `★ CONNECT BACK TO NODE ${startNode ?? 0} TO CLOSE THE TOUR!`)
                : null}
              {rem === 0 && (t.is ? 'Tour complete!' : 'TOUR COMPLETE!')}
            </div>
          </div>
        )
      })()}

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
