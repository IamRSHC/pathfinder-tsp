import { useEffect, useRef } from 'react'
import { useNavigate }   from 'react-router-dom'
import { gsap }          from 'gsap'
import ModeCard          from '../components/ui/ModeCard'
import DifficultyDial    from '../components/ui/DifficultyDial'
import LeaderboardTeaser from '../components/ui/LeaderboardTeaser'
import { useGameStore }  from '../stores/gameStore'
import { useAiStore }    from '../stores/aiStore'
import { useUiStore }    from '../stores/uiStore'

export default function LandingScreen() {
  const navigate    = useNavigate()
  const heroRef     = useRef(null)
  const bgCanvasRef = useRef(null)

  const { mode, difficulty, setMode, setDifficulty, resetGame } = useGameStore()
  const { reset: resetAi } = useAiStore()
  const { theme } = useUiStore()

  // ── Hero entrance animation ──────────────────────────────────────────────
  useEffect(() => {
    if (!heroRef.current) return
    gsap.fromTo(
      heroRef.current,
      { y: 30, opacity: 0 },
      { y: 0,  opacity: 1, duration: 0.8, ease: 'power3.out' }
    )
  }, [])

  // ── Animated background canvas — theme aware ─────────────────────────────
  useEffect(() => {
    const canvas = bgCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf, t = 0

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const nodes = Array.from({ length: 12 }, (_, i) => ({
      x: 80 + (i % 4) * (canvas.width / 5) + Math.sin(i * 1.3) * 40,
      y: 80 + Math.floor(i / 4) * (canvas.height / 4) + Math.cos(i * 0.9) * 30,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      t += theme === 'serene' ? 0.005 : 0.008

      const lineColor   = theme === 'serene' ? '45,106,79' : '0,229,255'
      const lineOpacity = theme === 'serene' ? 0.08        : 0.12
      const dotColor    = theme === 'serene' ? '45,106,79' : '0,229,255'

      // Edges
      ctx.strokeStyle = `rgba(${lineColor}, ${lineOpacity})`
      ctx.lineWidth   = theme === 'serene' ? 1 : 1.5
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      nodes.forEach((n, i) => {
        const next = nodes[(i + 1) % nodes.length]
        ctx.moveTo(n.x, n.y)
        ctx.lineTo(next.x, next.y)
      })
      ctx.stroke()
      ctx.setLineDash([])

      // Nodes
      nodes.forEach((n, i) => {
        const pulse     = 0.5 + 0.5 * Math.sin(t * 2 + i * 0.7)
        const baseAlpha = theme === 'serene' ? 0.18 : 0.3

        ctx.beginPath()
        ctx.arc(n.x, n.y, (theme === 'serene' ? 4 : 5) + pulse * 2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${dotColor}, ${baseAlpha + pulse * (theme === 'serene' ? 0.2 : 0.4)})`
        ctx.fill()

        // Glow ring — cyber only
        if (theme !== 'serene') {
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
  }, [theme]) // re-runs on theme change

  // ── Start game ───────────────────────────────────────────────────────────
  const handleStart = () => {
    resetGame()
    resetAi()
    navigate('/arena')
  }

  const isSerene = theme === 'serene'

  return (
    <div className="relative min-h-screen grid-bg flex flex-col overflow-hidden">

      {/* Animated BG canvas */}
      <canvas
        ref={bgCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isSerene
            ? 'linear-gradient(to bottom, rgba(250,250,248,0.4) 0%, transparent 40%, rgba(250,250,248,0.7) 100%)'
            : 'linear-gradient(to bottom, rgba(9,13,20,0.5) 0%, transparent 40%, rgba(9,13,20,0.8) 100%)',
        }}
      />

      {/* Ambient glow — cyber only */}
      {!isSerene && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96
          bg-game-cyan/5 rounded-full blur-3xl pointer-events-none" />
      )}

      {/* Page content */}
      <div className="relative z-10 flex flex-col min-h-screen">

        {/* ── Top info bar ── */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: 'var(--color-primary)' }}
            />
            <span
              className="text-xs"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}
            >
              {isSerene ? 'NITT Summer Internship 2026' : 'NITT SUMMER INTERNSHIP 2026'}
            </span>
          </div>
          <span
            className="hidden sm:block text-xs"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}
          >
            {isSerene ? 'Human × AI · Collaborative NP-Hard Solving' : 'Human × AI Collaborative NP-Hard Solving'}
          </span>
        </div>

        {/* ── Hero ── */}
        <div
          ref={heroRef}
          className="flex flex-col items-center justify-center pt-16 pb-8 px-6 text-center"
        >
          {/* Badge */}
          <div className="mb-4">
            <span
              className="text-xs px-3 py-1 rounded"
              style={{
                fontFamily:    'var(--font-mono)',
                color:         'var(--color-primary)',
                border:        '1px solid var(--color-primary)',
                background:    isSerene ? 'rgba(45,106,79,0.06)' : 'rgba(0,229,255,0.05)',
                letterSpacing: isSerene ? '0.05em' : '0.12em',
                opacity:       0.9,
              }}
            >
              {isSerene ? 'TSP · Traveling Salesman Problem' : 'TSP // TRAVELING SALESMAN PROBLEM'}
            </span>
          </div>

          {/* Title */}
          <h1
            className="font-bold leading-none mb-4"
            style={{
              fontFamily:    'var(--font-display)',
              fontSize:      'clamp(3rem, 10vw, 6rem)',
              letterSpacing: isSerene ? '-0.02em' : '-0.01em',
              color:         isSerene ? 'var(--color-text)' : '#ffffff',
            }}
          >
            {isSerene ? 'Path' : 'PATH'}
            <span
              className="glow-cyan"
              style={{ color: 'var(--color-primary)' }}
            >
              {isSerene ? 'finder' : 'FINDER'}
            </span>
          </h1>

          {/* Tagline */}
          <p
            className="text-xl sm:text-2xl max-w-lg leading-relaxed"
            style={{
              fontFamily: 'var(--font-display)',
              color:      'var(--color-muted)',
            }}
          >
            {isSerene ? 'Can you outthink a machine?' : 'Can you outthink a machine?'}
          </p>

          <p
            className="text-xs mt-2 max-w-md"
            style={{
              fontFamily: 'var(--font-mono)',
              color:      'var(--color-muted)',
              opacity:    0.6,
            }}
          >
            Neither human nor AI solves it alone. The collaboration is the discovery.
          </p>
        </div>

        {/* ── Config panel ── */}
        <div className="flex-1 px-4 sm:px-6 lg:px-8 pb-8 max-w-6xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left col — mode + difficulty + start */}
            <div className="lg:col-span-2 space-y-4">
              <span className="stat-label block">
                {isSerene ? 'select mode' : 'SELECT MODE'}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {['solo', 'copilot', 'vs'].map(m => (
                  <ModeCard key={m} mode={m} selected={mode === m} onClick={setMode} />
                ))}
              </div>

              {/* Difficulty dial */}
              <div
                className="rounded-lg p-5"
                style={{
                  background: 'var(--color-surface)',
                  border:     '1px solid var(--color-border)',
                  boxShadow:  'var(--shadow-card)',
                }}
              >
                <DifficultyDial value={difficulty} onChange={setDifficulty} />
              </div>

              {/* Start button */}
              <button
                onClick={handleStart}
                className="w-full py-4 font-bold text-xl active:scale-95 transition-all duration-200"
                style={{
                  fontFamily:    'var(--font-display)',
                  letterSpacing: isSerene ? '0.04em' : '0.15em',
                  borderRadius:  'var(--radius-card)',
                  background:    'var(--color-primary)',
                  color:         isSerene ? '#FFFFFF' : '#090d14',
                  boxShadow:     isSerene
                    ? '0 2px 12px rgba(45,106,79,0.25)'
                    : '0 0 30px rgba(0,229,255,0.2)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {isSerene ? 'Begin Routing' : 'INITIATE ROUTING'}
              </button>
            </div>

            {/* Right col — leaderboard + apps */}
            <div className="space-y-4">
              <LeaderboardTeaser />

              {/* Real-world applications */}
              <div
                className="rounded-lg p-4"
                style={{
                  background: 'var(--color-surface)',
                  border:     '1px solid var(--color-border)',
                  boxShadow:  'var(--shadow-card)',
                }}
              >
                <span className="stat-label block mb-3">
                  {isSerene ? 'real-world applications' : 'REAL-WORLD APPLICATIONS'}
                </span>
                <div className="space-y-2">
                  {[
                    { icon: '💊', label: 'Drug Discovery',    cyber: 'text-game-green',  sereneColor: '#3A7D5B' },
                    { icon: '🔬', label: 'Genome Sequencing', cyber: 'text-game-cyan',   sereneColor: '#2D6A4F' },
                    { icon: '💻', label: 'SoC Routing',       cyber: 'text-game-amber',  sereneColor: '#B5838D' },
                    { icon: '🚚', label: 'Logistics Planning', cyber: 'text-game-purple', sereneColor: '#6D6875' },
                  ].map(a => (
                    <div
                      key={a.label}
                      className="flex items-center gap-2 text-xs"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      <span>{a.icon}</span>
                      <span style={{ color: isSerene ? a.sereneColor : undefined }}
                        className={isSerene ? '' : a.cyber}
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