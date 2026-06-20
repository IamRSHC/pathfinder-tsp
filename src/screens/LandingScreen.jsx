import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate }       from 'react-router-dom'
import { gsap }              from 'gsap'
import ModeCard              from '../components/ui/ModeCard'
import DifficultyDial        from '../components/ui/DifficultyDial'
import LeaderboardTeaser     from '../components/ui/LeaderboardTeaser'
import Navbar                from '../components/ui/Navbar'
import NodeSourcePicker      from '../components/ui/NodeSourcePicker'
import CardDeck              from '../components/ui/CardDeck'
import { useGameStore }      from '../stores/gameStore'
import { useAiStore }        from '../stores/aiStore'
import { useTheme }          from '../hooks/useTheme'
import { parseCustomNodes }  from '../utils/tspUtils'

export default function LandingScreen() {
  const navigate    = useNavigate()
  const heroRef     = useRef(null)
  const bgCanvasRef = useRef(null)
  const leftPanelRef  = useRef(null)
  const rightPanelRef = useRef(null)
  const centerRef     = useRef(null)
  const t = useTheme()

  // Track which cards the user has visited
  const [visitedCards, setVisitedCards] = useState(new Set([0]))
  const [sidePanelsShown, setSidePanelsShown] = useState(false)
  const sidePanelsShownRef = useRef(false)

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

  // ── Handle card visit — track all 3 visited, then expand panels ──────────
  const handleCardVisit = useCallback((index) => {
    setVisitedCards(prev => {
      const next = new Set(prev)
      next.add(index)
      if (next.size === 3 && !sidePanelsShownRef.current) {
        // Only animate on tablet/desktop
        const isWide = window.innerWidth >= 768
        if (isWide) {
          sidePanelsShownRef.current = true
          setSidePanelsShown(true)

          // Small delay so state flush + render happens first
          setTimeout(() => {
            const tl = gsap.timeline()
            if (leftPanelRef.current) {
              gsap.set(leftPanelRef.current, { x: -80, opacity: 0, display: 'flex' })
              tl.to(leftPanelRef.current, {
                x: 0, opacity: 1,
                duration: 0.65,
                ease: 'power3.out',
              }, 0)
            }
            if (rightPanelRef.current) {
              gsap.set(rightPanelRef.current, { x: 80, opacity: 0, display: 'flex' })
              tl.to(rightPanelRef.current, {
                x: 0, opacity: 1,
                duration: 0.65,
                ease: 'power3.out',
              }, 0.08)
            }
            if (centerRef.current) {
              tl.to(centerRef.current, {
                duration: 0.55,
                ease: 'power2.out',
              }, 0)
            }
          }, 60)
        }
      }
      return next
    })
  }, [])

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

  // ── Shared style helpers ─────────────────────────────────────────────────
  const sectionLabel = {
    fontFamily:    'var(--font-mono)',
    fontSize:      '0.6rem',
    letterSpacing: t.is ? '0.08em' : '0.15em',
    textTransform: 'uppercase',
    color:         'var(--color-primary)',
    opacity:       0.85,
    marginBottom:  '0.6rem',
    display:       'block',
  }

  const dividerStyle = {
    height:     '1px',
    background: 'var(--color-border)',
    opacity:    t.is ? 0.7 : 0.5,
    margin:     '0.75rem 0',
  }

  const panelText = {
    fontFamily:  'var(--font-mono)',
    fontSize:    '0.7rem',
    lineHeight:  1.8,
    color:       'var(--color-muted)',
  }

  const badgeStyle = {
    display:       'inline-block',
    fontFamily:    'var(--font-mono)',
    fontSize:      '0.58rem',
    padding:       '0.2rem 0.55rem',
    borderRadius:  '999px',
    border:        `1px solid var(--color-primary)`,
    color:         'var(--color-primary)',
    background:    t.is ? 'rgba(45,106,79,0.07)' : 'rgba(0,229,255,0.06)',
    letterSpacing: t.is ? '0.05em' : '0.12em',
    textTransform: 'uppercase',
  }

  const tagStyle = {
    display:       'inline-block',
    fontFamily:    'var(--font-mono)',
    fontSize:      '0.56rem',
    padding:       '0.15rem 0.45rem',
    borderRadius:  '0.25rem',
    border:        `1px solid var(--color-border)`,
    color:         'var(--color-muted)',
    background:    t.is ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)',
    letterSpacing: '0.05em',
    marginRight:   '0.3rem',
    marginBottom:  '0.3rem',
  }

  const highlightText = {
    color:      'var(--color-primary)',
    fontWeight: 600,
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

        {/* ── Main layout: side-panels + center ── */}
        <div
          style={{
            flex:           '1 1 0',
            minHeight:      0,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            position:       'relative',
            overflow:       'hidden',
          }}
        >

          {/* ══ LEFT PANEL — only visible on md+ after all 3 cards visited ══ */}
          <div
            ref={leftPanelRef}
            className="landing-side-panel landing-left-panel"
            style={{
              display:        sidePanelsShown ? 'flex' : 'none',
              flexDirection:  'column',
              justifyContent: 'center',
              width:          '280px',
              flexShrink:     0,
              padding:        '1.5rem 1.25rem 1.5rem 1.5rem',
              maxHeight:      '100%',
              overflowY:      'hidden',
              opacity:        0, // GSAP will animate this in
            }}
          >
            <span style={sectionLabel}>WHY THIS EXISTS</span>
            <div style={dividerStyle} />

            <p style={{ ...panelText, marginBottom: '0.75rem' }}>
              NP-hard problems don't have a fast exact solution. Not because nobody's tried — because no algorithm
              scales fast enough as the problem grows.
            </p>

            <p style={{ ...panelText, marginBottom: '0.75rem' }}>
              The Traveling Salesman Problem is the classic case. <span style={highlightText}>10 cities, trivial.</span>{' '}
              <span style={highlightText}>50 cities, computers struggle.</span> This isn't a CS101 exercise — it's
              the same math behind drug discovery, chip transistor placement, and delivery logistics.
            </p>

            <p style={{ ...panelText, marginBottom: '0.75rem' }}>
              For decades, two camps worked this separately: pure algorithms (fast, blind) and human intuition
              (slow, surprisingly sharp at seeing shortcuts machines miss).
            </p>

            <div style={dividerStyle} />

            <p style={{ ...panelText, fontStyle: 'italic', marginBottom: '1rem', color: 'var(--color-text)', opacity: 0.8 }}>
              "Neither human nor AI solves it alone. The collaboration is the discovery."
            </p>


          </div>

          {/* ══ CENTER — always visible ══ */}
          <div
            ref={centerRef}
            style={{
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              flex:           '0 0 auto',
              width:          'min(100%, 420px)',
              height:         '100%',
              justifyContent: 'center',
              padding:        '0.5rem 0.75rem',
            }}
          >
            {/* ── Hero (center-only) ── */}
            <div
              ref={heroRef}
              style={{
                textAlign:      'center',
                marginBottom:   '0.75rem',
                flexShrink:     0,
              }}
            >

              <h1
                className="font-bold leading-none"
                style={{
                  fontFamily:    'var(--font-display)',
                  fontSize:      'clamp(2.4rem, 7vw, 5rem)',
                  letterSpacing: t.is ? '-0.02em' : '-0.01em',
                  color:         t.is ? 'var(--color-text)' : '#ffffff',
                  marginBottom:  '0.35rem',
                }}
              >
                {t.is ? 'Path' : 'PATH'}
                <span className={t.primary.glow} style={{ color: 'var(--color-primary)' }}>
                  {t.is ? 'finder' : 'FINDER'}
                </span>
              </h1>

              <p className="text-base sm:text-lg leading-relaxed"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-muted)' }}>
                Can you outthink a machine?
              </p>

            </div>

            {/* ── Card deck ── */}
            <div style={{ flexShrink: 0, width: '100%', display: 'flex', justifyContent: 'center' }}>
              <CardDeck
                onCardVisit={handleCardVisit}
                cards={[
                  {
                    id: 'mode',
                    labelC: 'MODE',
                    labelS: 'Mode',
                    content: (
                      <div className="h-full flex flex-col gap-2.5">
                        <span className="stat-label block flex-shrink-0">
                          {t.is ? 'select mode' : 'SELECT MODE'}
                        </span>
                        <div className="flex-1 min-h-0 flex flex-col gap-2.5">
                          {['solo', 'copilot', 'vs'].map(m => (
                            <ModeCard key={m} mode={m} selected={mode === m} onClick={setMode} fill />
                          ))}
                        </div>
                      </div>
                    ),
                  },
                  {
                    id: 'config',
                    labelC: 'CONFIG',
                    labelS: 'Config',
                    content: (
                      <div className="h-full flex flex-col justify-center space-y-3">
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

                        {/* Conditional: Difficulty dial for RANDOM */}
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
                                padding:      '0.4rem 0.65rem',
                                borderRadius: '0.375rem',
                                border:       `1px solid ${ok ? 'var(--color-primary)' : '#ff555544'}`,
                                background:   ok
                                  ? (t.is ? 'rgba(45,106,79,0.06)' : 'rgba(0,229,255,0.04)')
                                  : (t.is ? '#FFF5F5' : '#1a0808'),
                                fontFamily:   'var(--font-mono)',
                                fontSize:     '0.62rem',
                                color:        ok ? 'var(--color-primary)' : '#ff5555',
                              }}
                            >
                              {ok
                                ? `✓ ${parsed.length} nodes ready for routing`
                                : `⚠ ${errors.length ? errors[0] : 'Need at least 3 valid coordinates'}`}
                            </div>
                          )
                        })()}

                        {/* Start button */}
                        <button
                          onClick={handleStart}
                          disabled={!canStart()}
                          className="w-full py-3 font-bold text-lg active:scale-95 transition-all duration-200
                            disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{
                            fontFamily:    'var(--font-display)',
                            letterSpacing: t.is ? '0.04em' : '0.15em',
                            borderRadius:  '0.5rem',
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
                    ),
                  },
                  {
                    id: 'leaderboard',
                    labelC: 'LEADERBOARD',
                    labelS: 'Leaderboard',
                    content: (
                      <div className="h-full flex flex-col justify-center space-y-3">
                        <LeaderboardTeaser />

                        <div>
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
                    ),
                  },
                ]}
              />
            </div>
          </div>

          {/* ══ RIGHT PANEL — only visible on md+ after all 3 cards visited ══ */}
          <div
            ref={rightPanelRef}
            className="landing-side-panel landing-right-panel"
            style={{
              display:        sidePanelsShown ? 'flex' : 'none',
              flexDirection:  'column',
              justifyContent: 'center',
              width:          '280px',
              flexShrink:     0,
              padding:        '1.5rem 1.5rem 1.5rem 1.25rem',
              maxHeight:      '100%',
              overflowY:      'auto',
              opacity:        0, // GSAP will animate this in
            }}
          >
            <span style={sectionLabel}>ABOUT THE DEV</span>
            <div style={dividerStyle} />

            {/* Name & bio */}
            <div style={{ marginBottom: '0.9rem' }}>
              <p style={{
                fontFamily:  'var(--font-display)',
                fontSize:    '1.05rem',
                fontWeight:  700,
                color:       'var(--color-text)',
                marginBottom:'0.15rem',
                letterSpacing: t.is ? '-0.01em' : '0.02em',
              }}>
                R S Hareecharan
              </p>
              <p style={{ ...panelText, fontSize: '0.65rem', opacity: 0.75 }}>
                B.Tech CSE, AI &amp; ML · SRM IST, Tiruchirappalli
              </p>
            </div>

            <p style={{ ...panelText, marginBottom: '0.75rem' }}>
              Built during <span style={highlightText}>Summer Internship 2026</span> at NIT Tiruchirappalli,
              under the guidance of <span style={highlightText}>Dr. Sathyanarayanan S</span>, Dept. of CSE.
            </p>

            <div style={dividerStyle} />

            {/* Stack */}
            <span style={{ ...sectionLabel, marginBottom: '0.5rem' }}>STACK</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {['React', 'Vite', 'GSAP', 'Zustand', 'Web Workers', 'NN + 2-Opt', 'ACO'].map(s => (
                <span key={s} style={tagStyle}>{s}</span>
              ))}
            </div>

            <div style={dividerStyle} />

            {/* Status */}
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: '#00e676', flexShrink: 0,
                  boxShadow: t.is ? 'none' : '0 0 6px #00e676',
                }} />
                <span style={{ ...sectionLabel, margin: 0, color: '#00e676' }}>DEPLOYED · VERCEL</span>
              </div>
              <p style={{ ...panelText, fontSize: '0.65rem' }}>
                Active development — bugs being squashed daily.
                Research prototype first, polished product second.
              </p>
            </div>

            <div style={dividerStyle} />

            {/* Links */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {[
                { label: 'GitHub', href: '#' },
                { label: 'Contact', href: '#' },
                { label: 'LinkedIn', href: '#' },
              ].map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  style={{
                    fontFamily:     'var(--font-mono)',
                    fontSize:       '0.6rem',
                    letterSpacing:  '0.06em',
                    textTransform:  'uppercase',
                    color:          'var(--color-primary)',
                    textDecoration: 'none',
                    padding:        '0.2rem 0.5rem',
                    border:         '1px solid var(--color-primary)',
                    borderRadius:   '0.25rem',
                    background:     t.is ? 'rgba(45,106,79,0.06)' : 'rgba(0,229,255,0.05)',
                    transition:     'background 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = t.is ? 'rgba(45,106,79,0.14)' : 'rgba(0,229,255,0.12)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = t.is ? 'rgba(45,106,79,0.06)' : 'rgba(0,229,255,0.05)'
                  }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

        </div>{/* end main layout */}
      </div>
    </div>
  )
}
