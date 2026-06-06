import { useEffect, useRef, useCallback } from 'react'
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
import { generateNodes, scaleNodesToCanvas, STANDARD_SETS, parseCustomNodes } from '../utils/tspUtils'

// ── Canvas ref shared between ArenaScreen (spawner) and the canvas hooks ──
// ArenaScreen owns the canvasContainerRef so it can read real dimensions.
// It passes setNodes() the correctly-scaled node array.
export const canvasContainerRef = { current: null }

export default function ArenaScreen() {
  const navigate     = useNavigate()
  const isMounted    = useRef(true)
  const canvasRef    = useRef(null)   // ref to the center canvas wrapper div

  const {
    gamePhase, resetGame, nodes,
    startNode, humanEdges,
    nodeSource, standardSize, customRaw, difficulty,
    setNodes,
  } = useGameStore()
  const { mobileDrawerOpen, openDrawer, notification, showNotification } = useUiStore()
  const { reset: resetAi } = useAiStore()
  const t = useTheme()

  // ── Spawn helper — single source of truth for node creation ─────────────
  const spawnNodes = useCallback(() => {
    const el = canvasRef.current
    if (!el) return
    const W = el.offsetWidth  || el.clientWidth  || 800
    const H = el.offsetHeight || el.clientHeight || 600

    const state = useGameStore.getState()
    let newNodes = []

    if (state.nodeSource === 'standard') {
      const set = STANDARD_SETS[state.standardSize] || STANDARD_SETS.M
      newNodes = scaleNodesToCanvas(set.nodes, W, H)
    } else if (state.nodeSource === 'custom') {
      const { nodes: parsed, errors } = parseCustomNodes(state.customRaw)
      if (parsed.length < 3) {
        showNotification(
          errors.length ? `Parse error: ${errors[0]}` : 'Need at least 3 valid nodes',
          'warn'
        )
        return
      }
      newNodes = scaleNodesToCanvas(parsed, W, H)
    } else {
      newNodes = generateNodes(state.difficulty, W, H)
    }

    setNodes(newNodes)
    // Message guides player to the NEXT step (pick start node), not 'start routing'
    showNotification(
      `${newNodes.length} nodes ready — ${t.is ? 'tap' : 'click'} one to set your start node`,
      'success'
    )
  }, [t.is]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mount: reset state, spawn nodes once canvas has rendered ────────────
  useEffect(() => {
    isMounted.current = true
    resetGame()
    resetAi()
    useUiStore.setState({ viewMode: '2d' })

    // Wait one frame so canvasRef.current has real dimensions
    const timer = requestAnimationFrame(() => {
      if (isMounted.current) spawnNodes()
    })

    return () => {
      isMounted.current = false
      cancelAnimationFrame(timer)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigate to results on completion ───────────────────────────────────
  useEffect(() => {
    if (gamePhase === 'complete') {
      const timer = setTimeout(() => {
        if (isMounted.current) navigate('/results')
      }, 1600)
      return () => clearTimeout(timer)
    }
  }, [gamePhase, navigate])

  // ── Notification colour ──────────────────────────────────────────────────
  const notifCls = notification
    ? notification.type === 'success'
      ? `${t.success.bg} ${t.success.border} ${t.success.text}`
      : notification.type === 'warn'
      ? `${t.secondary.bg} ${t.secondary.border} ${t.secondary.text}`
      : `${t.primary.bg} ${t.primary.border} ${t.primary.text}`
    : ''

  // ── Edges remaining (for close-tour hint) ───────────────────────────────
  const rem = gamePhase === 'routing' && nodes.length
    ? edgesRemaining(humanEdges.length, nodes.length)
    : null

  return (
    <div
      className="flex flex-col bg-game-bg overflow-hidden"
      style={{ height: '100%', position: 'relative' }}
    >
      <Navbar />

      {/* ── Three-panel layout ──────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Stats — left, desktop only */}
        <div className="hidden lg:flex w-44 xl:w-52 shrink-0 flex-col overflow-y-auto">
          <StatsPanel />
        </div>

        {/* Canvas — center */}
        <div ref={canvasRef} className="flex-1 relative min-w-0">
          <GameCanvas className="w-full h-full" />

          {/* ── Phase banner: PLACING — inside canvas panel, above canvas ── */}
          {gamePhase === 'placing' && (
            <div
              className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
              style={{ whiteSpace: 'nowrap' }}
            >
              <div className={`px-4 py-2 rounded border font-mono text-xs
                font-bold shadow-lg backdrop-blur-sm
                ${t.primary.bg} ${t.primary.border} ${t.primary.text}`}>
                {t.is
                  ? '★ Tap a node to set your Start node'
                  : '★ CLICK A NODE TO SET YOUR START NODE'}
              </div>
            </div>
          )}

          {/* ── Close-tour hint: appears when 1 edge remains ── */}
          {rem === 1 && (
            <div
              className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
              style={{ whiteSpace: 'nowrap' }}
            >
              <div className={`px-4 py-2 rounded border font-mono text-xs
                font-bold shadow-lg backdrop-blur-sm
                ${t.secondary.bg} ${t.secondary.border} ${t.secondary.text}`}>
                {t.is
                  ? `★ Connect back to Node ${startNode ?? 0} to complete the tour!`
                  : `★ CONNECT BACK TO NODE ${startNode ?? 0} TO CLOSE THE TOUR!`}
              </div>
            </div>
          )}

          {/* Mobile bottom bar */}
          <div className="absolute bottom-0 left-0 right-0 lg:hidden
            flex items-center justify-between
            bg-game-surface/95 border-t border-game-border px-4 py-2 backdrop-blur-sm">
            <button
              onClick={() => openDrawer('stats')}
              className="flex items-center gap-2 font-mono text-xs text-game-muted
                hover:text-game-cyan transition-colors"
            >
              📊 {t.is ? 'Stats' : 'STATS'}
            </button>
            <div className="font-mono text-xs text-game-muted">
              {nodes.length || difficulty} {t.is ? 'nodes' : 'NODES'}
            </div>
            <button
              onClick={() => openDrawer('ai')}
              className="flex items-center gap-2 font-mono text-xs text-game-muted
                hover:text-game-amber transition-colors"
            >
              🤖 {t.is ? 'AI' : 'AI'}
              <span className="w-2 h-2 rounded-full bg-game-green inline-block ml-1" />
            </button>
          </div>
        </div>

        {/* AI panel — right, desktop only */}
        <div className="hidden lg:flex w-64 xl:w-72 shrink-0 flex-col overflow-y-auto">
          <AIPanel />
        </div>
      </div>

      {/* Mobile drawer */}
      <MobileDrawer />

      {/* Notification toast — fixed so it doesn't inherit canvas stacking */}
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
        <div className="absolute inset-0 bg-game-bg/80 flex items-center
          justify-center z-50 backdrop-blur-sm">
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
