const { reset: resetAi } = useAiStore()
const { theme } = useUiStore()   // ← add this line
import { useEffect, useRef, useState } from 'react'
import { useNavigate }       from 'react-router-dom'
import { gsap }              from 'gsap'
import ModeCard              from '../components/ui/ModeCard'
import DifficultyDial        from '../components/ui/DifficultyDial'
import LeaderboardTeaser     from '../components/ui/LeaderboardTeaser'
import { useGameStore }      from '../stores/gameStore'
import { useAiStore }        from '../stores/aiStore'
import { useUiStore } from '../stores/uiStore'  // ← add this

export default function LandingScreen() {
  const navigate = useNavigate()
  const heroRef  = useRef(null)
  const bgCanvasRef = useRef(null)

  const { mode, difficulty, setMode, setDifficulty, resetGame } = useGameStore()
  const { reset: resetAi } = useAiStore()

  // Animate hero on mount
  useEffect(() => {
    if (!heroRef.current) return
    gsap.fromTo(heroRef.current,
      { y: 30, opacity: 0 },
      { y: 0,  opacity: 1, duration: 0.8, ease: 'power3.out' }
    )
  }, [])

// Animated background TSP path — theme aware
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

    // Pick colors based on theme
    const lineColor   = theme === 'serene' ? '45,106,79'   : '0,229,255'
    const lineOpacity = theme === 'serene' ? 0.08          : 0.12
    const dotColor    = theme === 'serene' ? '45,106,79'   : '0,229,255'

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
      const pulse = 0.5 + 0.5 * Math.sin(t * 2 + i * 0.7)
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
}, [theme]) // ← re-runs when theme changes

      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  const handleStart = () => {
    resetGame()
    resetAi()
    navigate('/arena')
  }

  return (
    <div className="relative min-h-screen grid-bg flex flex-col overflow-hidden">
      {/* Animated BG canvas */}
      <canvas
        ref={bgCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-game-bg/50 via-transparent to-game-bg/80 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96
        bg-game-cyan/5 rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-game-border/50">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-game-cyan animate-pulse" />
            <span className="font-mono text-xs text-game-muted">NITT SUMMER INTERNSHIP 2026</span>
          </div>
          <span className="font-mono text-xs text-game-muted hidden sm:block">
            Human × AI Collaborative NP-Hard Solving
          </span>
        </div>

        {/* Hero */}
        <div ref={heroRef} className="flex flex-col items-center justify-center pt-16 pb-8 px-6 text-center">
          <div className="mb-4">
            <span className="font-mono text-xs text-game-cyan border border-game-cyan/30
              px-3 py-1 rounded tracking-widest bg-game-cyan/5">
              TSP // TRAVELING SALESMAN PROBLEM
            </span>
          </div>
          <h1 className="font-display font-bold text-5xl sm:text-7xl md:text-8xl
            text-white tracking-tight leading-none mb-4">
            PATH
            <span className="text-game-cyan glow-cyan">FINDER</span>
          </h1>
          <p className="font-display text-xl sm:text-2xl text-game-muted max-w-lg leading-relaxed">
            Can you outthink a machine?
          </p>
          <p className="font-mono text-xs text-game-muted/60 mt-2 max-w-md">
            Neither human nor AI solves it alone. The collaboration is the discovery.
          </p>
        </div>

        {/* Main config panel */}
        <div className="flex-1 px-4 sm:px-6 lg:px-8 pb-8 max-w-6xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Mode selector */}
            <div className="lg:col-span-2 space-y-4">
              <span className="stat-label block">SELECT MODE</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {['solo', 'copilot', 'vs'].map(m => (
                  <ModeCard key={m} mode={m} selected={mode === m} onClick={setMode} />
                ))}
              </div>

              {/* Difficulty */}
              <div className="bg-game-surface border border-game-border rounded-lg p-5">
                <DifficultyDial value={difficulty} onChange={setDifficulty} />
              </div>

              {/* Start button */}
              <button
                onClick={handleStart}
                className="w-full py-4 font-display font-bold text-xl tracking-widest rounded-lg
                  bg-game-cyan text-game-bg hover:bg-game-cyan/90
                  shadow-[0_0_30px_#00e5ff33] hover:shadow-[0_0_50px_#00e5ff55]
                  transition-all duration-200 active:scale-95"
              >
                INITIATE ROUTING
              </button>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <LeaderboardTeaser />

              {/* Application contexts */}
              <div className="bg-game-surface border border-game-border rounded-lg p-4">
                <span className="stat-label block mb-3">REAL-WORLD APPLICATIONS</span>
                <div className="space-y-2">
                  {[
                    { icon: '💊', label: 'Drug Discovery',     color: 'text-game-green'  },
                    { icon: '🔬', label: 'Genome Sequencing',  color: 'text-game-cyan'   },
                    { icon: '💻', label: 'SoC Routing',        color: 'text-game-amber'  },
                    { icon: '🚚', label: 'Logistics Planning', color: 'text-game-purple' },
                  ].map(a => (
                    <div key={a.label} className="flex items-center gap-2 font-mono text-xs">
                      <span>{a.icon}</span>
                      <span className={a.color}>{a.label}</span>
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