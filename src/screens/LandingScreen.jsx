import { useEffect, useRef } from 'react'
import { useNavigate }       from 'react-router-dom'
import { gsap }              from 'gsap'
import ModeCard              from '../components/ui/ModeCard'
import DifficultyDial        from '../components/ui/DifficultyDial'
import LeaderboardTeaser     from '../components/ui/LeaderboardTeaser'
import Navbar                from '../components/ui/Navbar'
import NodeSourcePicker      from '../components/ui/NodeSourcePicker'
import { useGameStore }      from '../stores/gameStore'
import { useAiStore }        from '../stores/aiStore'
import { useTheme }          from '../hooks/useTheme'
import { parseCustomNodes }  from '../utils/tspUtils'

export default function LandingScreen() {
  const navigate    = useNavigate()
  const heroRef     = useRef(null)
  const bgCanvasRef = useRef(null)
  const t           = useTheme()

  const {
    mode, difficulty, nodeSource, customRaw, standardSize,
    setMode, setDifficulty, resetGame,
  } = useGameStore()
  const { reset: resetAi } = useAiStore()

  // ── Hero entrance animation ──────────────────────────────────────────────
  useEffect(() => {
    if (!heroRef.current) return
    gsap.fromTo(
      heroRef.current,
      { y: 24, opacity: 0 },
      { y: 0,  opacity: 1, duration: 0.7, ease: 'power3.out' }
    )
  }, [])

  // ── Animated background canvas ───────────────────────────────────────────
  useEffect(() => {
    const canvas = bgCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf, time = 0

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const nodes = Array.from({ length: 12 }, (_, i) => ({
      x: 80 + (i % 4) * (canvas.width / 5)  + Math.sin(i * 1.3) * 40,
      y: 80 + Math.floor(i / 4) * (canvas.height / 4) + Math.cos(i * 0.9) * 30,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      time += t.is ? 0.005 : 0.008

      const lineColor   = t.is ? '45,106,79' : '0,229,255'
      const lineOpacity = t.is ? 0.08        : 0.12
      const dotColor    = t.is ? '45,106,79' : '0,229,255'

      ctx.strokeStyle = `rgba(${lineColor}, ${lineOpacity})`
      ctx.lineWidth   = t.is ? 1 : 1.5
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      nodes.forEach((n, i) => {
        const next = nodes[(i + 1) % nodes.length]
        ctx.moveTo(n.x, n.y)
        ctx.lineTo(next.x, next.y)
      })
      ctx.stroke()
      ctx.setLineDash([])

      nodes.forEach((n, i) => {
        const pulse     = 0.5 + 0.5 * Math.sin(time * 2 + i * 0.7)
        const baseAlpha = t.is ? 0.18 : 0.3
        ctx.beginPath()
        ctx.arc(n.x, n.y, (t.is ? 4 : 5) + pulse * 2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${dotColor}, ${baseAlpha + pulse * (t.is ? 0.2 : 0.4)})`
        ctx.fill()
        if (!t.is) {
          ctx.beginPath()
          ctx.arc(n.x, n.y, 14 + pulse * 4, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(${dotColor}, ${0.05 + pulse * 0.08})`
          ctx.lineWidth   = 1
          ctx.stroke()
        }
      })
      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [t.is])

  // ── Validation before starting ──────────────────────────────────────────
  const canStart = () => {
    if (nodeSource === 'custom') {
      const { nodes } = parseCustomNodes(customRaw)
      return nodes.length >= 3
    }
    return true
  }

  const handleStart = () => {
    if (!canStart()) return
    resetGame()
    resetAi()
    navigate('/arena')
  }

  return (
    <div className="relative grid-bg flex flex-col overflow-hidden" style={{ height: '100%' }}>

      {/* Animated BG */}
      <canvas ref={bgCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: t.is
            ? 'linear-gradient(to bottom, rgba(250,250,248,0.4) 0%, transparent 40%, rgba(250,250,248,0.7) 100%)'
            : 'linear-gradient(to bottom, rgba(9,13,20,0.5) 0%, transparent 40%, rgba(9,13,20,0.8) 100%)',
        }}
      />
      {!t.is && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96
          bg-game-cyan/5 rounded-full blur-3xl pointer-events-none" />
      )}

      {/* Page content */}
      <div className="relative z-10 flex flex-col" style={{ flex: '1 1 0', minHeight: 0 }}>
        <Navbar />

        {/* ── Hero ── */}
        <div
          ref={heroRef}
          className="flex flex-col items-center justify-center pt-3 pb-2 px-4 text-center"
        >
          <div className="mb-3">
            <span
              className="text-xs px-3 py-1 rounded"
              style={{
                fontFamily:    'var(--font-mono)',
                color:         'var(--color-primary)',
                border:        '1px solid var(--color-primary)',
                background:    t.is ? 'rgba(45,106,79,0.06)' : 'rgba(0,229,255,0.05)',
                letterSpacing: t.is ? '0.05em' : '0.12em',
                opacity:       0.9,
              }}
            >
              {t.is ? 'TSP · Traveling Salesman Problem' : 'TSP // TRAVELING SALESMAN PROBLEM'}
            </span>
          </div>

          <h1
            className="font-bold leading-none mb-3"
            style={{
              fontFamily:    'var(--font-display)',
              fontSize:      'clamp(2.6rem, 8vw, 5.5rem)',
              letterSpacing: t.is ? '-0.02em' : '-0.01em',
              color:         t.is ? 'var(--color-text)' : '#ffffff',
            }}
          >
            {t.is ? 'Path' : 'PATH'}
            <span className={t.primary.glow} style={{ color: 'var(--color-primary)' }}>
              {t.is ? 'finder' : 'FINDER'}
            </span>
          </h1>

          <p className="text-base sm:text-xl max-w-lg leading-relaxed"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-muted)' }}>
            Can you outthink a machine?
          </p>
          <p className="text-xs mt-1 max-w-md"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', opacity: 0.6 }}>
            Neither human nor AI solves it alone. The collaboration is the discovery.
          </p>
        </div>

        {/* ── Config panel ── */}
        <div
          className="flex-1 min-h-0 px-3 sm:px-6 lg:px-8 pb-3 max-w-6xl mx-auto w-full overflow-y-auto"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* ── Left col: mode + game config + start ── */}
            <div className="lg:col-span-2 space-y-3">

              {/* Mode cards */}
              <span className="stat-label block">
                {t.is ? 'select mode' : 'SELECT MODE'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {['solo', 'copilot', 'vs'].map(m => (
                  <ModeCard key={m} mode={m} selected={mode === m} onClick={setMode} />
                ))}
              </div>

              {/* ── Unified Game Config card ── */}
              <div
                className="rounded-lg p-4 space-y-4"
                style={{
                  background: 'var(--color-surface)',
                  border:     '1px solid var(--color-border)',
                  boxShadow:  'var(--shadow-card)',
                }}
              >
                {/* Section label */}
                <div className="flex items-center gap-2">
                  <span className="stat-label">
                    {t.is ? 'game configuration' : 'GAME CONFIGURATION'}
                  </span>
                  <div
                    style={{
                      flex: 1, height: '1px',
                      background: 'var(--color-border)',
                      opacity: t.is ? 0.6 : 1,
                      minWidth: '20px',
                    }}
                  />
                </div>

                {/* Node source 3-way pill */}
                <NodeSourcePicker />

                {/* Conditional: Difficulty dial for RANDOM, nothing extra for STANDARD/CUSTOM */}
                {nodeSource === 'random' && (
                  <>
                    <div
                      style={{ height: '1px', background: 'var(--color-border)', opacity: 0.5 }}
                    />
                    <DifficultyDial value={difficulty} onChange={setDifficulty} />
                  </>
                )}

                {/* Custom: validation status summary */}
                {nodeSource === 'custom' && customRaw.trim() && (() => {
                  const { nodes: parsed, errors } = parseCustomNodes(customRaw)
                  const ok = parsed.length >= 3
                  return (
                    <div
                      style={{
                        padding:      '0.5rem 0.75rem',
                        borderRadius: '0.375rem',
                        border:       `1px solid ${ok ? 'var(--color-primary)' : '#ff555544'}`,
                        background:   ok
                          ? (t.is ? 'rgba(45,106,79,0.06)' : 'rgba(0,229,255,0.04)')
                          : (t.is ? '#FFF5F5' : '#1a0808'),
                        fontFamily:   'var(--font-mono)',
                        fontSize:     '0.65rem',
                        color:        ok ? 'var(--color-primary)' : '#ff5555',
                      }}
                    >
                      {ok
                        ? `✓ ${parsed.length} nodes ready for routing`
                        : `⚠ ${errors.length ? errors[0] : 'Need at least 3 valid coordinates'}`}
                    </div>
                  )
                })()}
              </div>

              {/* Start button */}
              <button
                onClick={handleStart}
                disabled={!canStart()}
                className="w-full py-4 font-bold text-xl active:scale-95 transition-all duration-200
                  disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  fontFamily:    'var(--font-display)',
                  letterSpacing: t.is ? '0.04em' : '0.15em',
                  borderRadius:  '0.5rem',  // matches mode cards in both themes
                  background:    'var(--color-primary)',
                  color:         t.is ? '#FFFFFF' : '#090d14',
                  boxShadow:     t.is
                    ? '0 2px 12px rgba(45,106,79,0.25)'
                    : '0 0 30px rgba(0,229,255,0.2)',
                  border:  'none',
                  cursor:  canStart() ? 'pointer' : 'not-allowed',
                }}
              >
                {t.is ? 'Begin Routing' : 'INITIATE ROUTING'}
              </button>
            </div>

            {/* ── Right col: leaderboard + apps ── */}
            <div className="space-y-3">
              <LeaderboardTeaser />

              <div
                className="rounded-lg p-4"
                style={{
                  background: 'var(--color-surface)',
                  border:     '1px solid var(--color-border)',
                  boxShadow:  'var(--shadow-card)',
                }}
              >
                <span className="stat-label block mb-3">
                  {t.is ? 'real-world applications' : 'REAL-WORLD APPLICATIONS'}
                </span>
                <div className="space-y-2">
                  {[
                    { icon: '💊', label: 'Drug Discovery',     cyberCls: 'text-game-green',  sereneColor: '#3A7D5B' },
                    { icon: '🔬', label: 'Genome Sequencing',  cyberCls: 'text-game-cyan',   sereneColor: '#2D6A4F' },
                    { icon: '💻', label: 'SoC Routing',        cyberCls: 'text-game-amber',  sereneColor: '#B5838D' },
                    { icon: '🚚', label: 'Logistics Planning', cyberCls: 'text-game-purple', sereneColor: '#6D6875' },
                  ].map(a => (
                    <div
                      key={a.label}
                      className="flex items-center gap-2 text-xs"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      <span>{a.icon}</span>
                      <span
                        style={{ color: t.is ? a.sereneColor : undefined }}
                        className={t.is ? '' : a.cyberCls}
                      >
                        {a.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
