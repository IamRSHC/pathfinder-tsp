/**
 * IntroScreen.jsx
 * ───────────────────────────────────────────────────────────────────
 * Cinematic game intro for Pathfinder TSP.
 *
 * Phase timeline:
 *   0.0s  — Black screen
 *   0.5s  — INITIALIZING... typewriter (top-left)
 *   1.5s  — Tron grid fades in
 *   2.5s  — Nodes materialise (staggered)
 *   3.5s  — Edges draw between nodes
 *   4.5s  — TSP path glows and traces a tour
 *   5.0s  — Algorithm names appear & cycle-highlight
 *   6.0s  — PATHFINDER letters slam in one-by-one
 *   7.1s  — "Traveling Salesman Simulator" subtitle
 *   8.0s  — Camera begins slow ambient pan
 *   9.0s  — "Click to Enter / Press Enter" blinking prompt
 *   user  — Click / Enter / Space / Escape → fade out → onComplete()
 *
 * Compatible with both "cyber" (dark neon) and "serene" (light minimal) themes.
 * ───────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState, useCallback } from 'react'

// ─── Graph topology ─────────────────────────────────────────────────────────
// Nodes live on the PERIMETER only — top strip, bottom strip, and thin left/right
// rails — so every edge stays well away from the centre where the title lives.
//
//   0──1──2──3──4──5
//   │               │
//  15               6
//   │               │
//  14               7
//   │               │
//  13──12──11──10──9──8
//
const NODE_LAYOUT = [
  // Top strip  (y ≈ 0.06–0.12, left → right)
  [0.07, 0.09],   // 0
  [0.22, 0.06],   // 1
  [0.40, 0.10],   // 2
  [0.60, 0.06],   // 3
  [0.78, 0.10],   // 4
  [0.93, 0.09],   // 5
  // Right rail  (x ≈ 0.94–0.97, top → bottom)
  [0.96, 0.34],   // 6
  [0.96, 0.57],   // 7
  // Bottom strip  (y ≈ 0.88–0.95, right → left)
  [0.93, 0.91],   // 8
  [0.78, 0.94],   // 9
  [0.60, 0.90],   // 10
  [0.40, 0.94],   // 11
  [0.22, 0.90],   // 12
  [0.07, 0.91],   // 13
  // Left rail  (x ≈ 0.03–0.06, bottom → top)
  [0.04, 0.57],   // 14
  [0.04, 0.34],   // 15
]

// Clockwise perimeter tour — stays on the frame, never crosses centre
const TSP_PATH = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0]

// ─── Text content ────────────────────────────────────────────────────────────
// Only the algorithms actually implemented in this codebase
const ALGORITHMS = ['NN + 2-OPT', 'ACO']
const TITLE_WORD  = 'PATHFINDER'
const SUBTITLE    = 'Traveling Salesman Simulator'
const INIT_TEXT   = 'INITIALIZING PATHFINDER...'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function buildEdges(nodes) {
  const edges = []
  const seen  = new Set()
  for (let i = 0; i < nodes.length; i++) {
    nodes
      .map((n, j) => ({ j, d: Math.hypot(nodes[i].rx - n.rx, nodes[i].ry - n.ry) }))
      .filter(x => x.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 3)
      .forEach(({ j }) => {
        const key = `${Math.min(i, j)}-${Math.max(i, j)}`
        if (!seen.has(key)) { seen.add(key); edges.push({ a: i, b: j }) }
      })
  }
  return edges
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function IntroScreen({ onComplete }) {
  const canvasRef  = useRef(null)
  const rafRef     = useRef(null)
  const startRef   = useRef(null)
  const gRef       = useRef({ nodes: [], edges: [], particles: [], W: 0, H: 0 })
  const leavingRef = useRef(false)

  // Read theme once at mount (avoids Zustand subscription overhead during intro)
  const theme    = document.documentElement.getAttribute('data-theme') || 'cyber'
  const isCyber  = theme !== 'serene'

  // ─── Theme-derived colour tokens ─────────────────────────────────────────
  const C = isCyber
    ? {
        bg:          '#090d14',
        // primary (cyan) RGB components for canvas
        pr: 0, pg: 229, pb: 255,
        // secondary (amber) RGB components for algo highlight
        sr: 255, sg: 171, sb: 0,
        textColor:   '#c9d4e8',
        mutedColor:  '#4a5568',
        dimColor:    '#1a2540',
        titleColor:  '#00e5ff',
        initColor:   '#00e5ff',
        algoHL:      '#ffab00',
        algoHLbg:    'rgba(255,171,0,0.07)',
        promptBorder:'rgba(0,229,255,0.28)',
        promptBg:    'rgba(0,229,255,0.04)',
        titleGlow:   '0 0 40px rgba(0,229,255,0.35), 0 0 90px rgba(0,229,255,0.12)',
        fontDisplay: "'Rajdhani', sans-serif",
        fontMono:    "'JetBrains Mono', monospace",
      }
    : {
        bg:          '#FAFAF8',
        pr: 45, pg: 106, pb: 79,
        sr: 181, sg: 131, sb: 141,
        textColor:   '#1A1A2E',
        mutedColor:  '#9A9A9A',
        dimColor:    '#E8E4DF',
        titleColor:  '#2D6A4F',
        initColor:   '#2D6A4F',
        algoHL:      '#B5838D',
        algoHLbg:    'rgba(181,131,141,0.07)',
        promptBorder:'rgba(45,106,79,0.28)',
        promptBg:    'rgba(45,106,79,0.04)',
        titleGlow:   'none',
        fontDisplay: "'Fraunces', serif",
        fontMono:    "'DM Mono', monospace",
      }

  // ─── UI state (text / overlay phases) ────────────────────────────────────
  const [typedText,    setTypedText]    = useState('')
  const [showInit,     setShowInit]     = useState(false)
  const [initFaded,    setInitFaded]    = useState(false)   // ← fades init text out
  const [showAlgos,    setShowAlgos]    = useState(false)
  const [activeAlgo,   setActiveAlgo]   = useState(-1)
  const [titleVisible, setTitleVisible] = useState(0) // number of title letters shown
  const [showSubtitle, setShowSubtitle] = useState(false)
  const [showPrompt,   setShowPrompt]   = useState(false)
  const [leaving,      setLeaving]      = useState(false)

  // ─── Proceed / exit ───────────────────────────────────────────────────────
  const proceed = useCallback(() => {
    if (leavingRef.current) return
    leavingRef.current = true
    setLeaving(true)
    setTimeout(onComplete, 680)
  }, [onComplete])

  // ─── Timeline (setTimeout cascade) ───────────────────────────────────────
  useEffect(() => {
    const T = []
    const at = (ms, fn) => T.push(setTimeout(fn, ms))

    // Phase 1: INITIALIZING... typewriter (0.5 s)
    at(500, () => setShowInit(true))
    let charDelay = 620
    INIT_TEXT.split('').forEach((_, i) => {
      at(charDelay, () => setTypedText(INIT_TEXT.slice(0, i + 1)))
      charDelay += 36
    })

    // Fade INITIALIZING text out once it's done its job (typing finishes ~1.5 s)
    at(4000, () => setInitFaded(true))

    // Phase 5: Algorithm names — each gets a real dwell (5.0 s)
    at(5000, () => setShowAlgos(true))
    at(5200, () => setActiveAlgo(0))   // NN + 2-OPT spotlight
    at(5700, () => setActiveAlgo(1))   // ACO spotlight
    at(6300, () => setActiveAlgo(ALGORITHMS.length)) // both dim

    // Phase 6: PATHFINDER letters (6.0 s)
    TITLE_WORD.split('').forEach((_, i) =>
      at(6000 + i * 72, () => setTitleVisible(i + 1))
    )

    // Phase 7: Subtitle (7.1 s)
    at(7100, () => setShowSubtitle(true))

    // Phase 9: Prompt (9.0 s)
    at(9000, () => setShowPrompt(true))

    return () => T.forEach(clearTimeout)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Keyboard / click input ───────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (['Enter', ' ', 'Escape'].includes(e.key)) proceed()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [proceed])

  // ─── Canvas animation loop ────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx  = canvas.getContext('2d')
    const { pr, pg, pb, bg } = C

    // Grid spacing (matches existing .grid-bg in index.css)
    const GRID_SP   = 44
    // Node reveal timing
    const N_START   = 2500   // ms
    const N_STAGGER = 75     // ms between each node appearing
    // Edge reveal
    const E_START   = 3500   // ms
    const E_DUR     = 1400   // ms
    // TSP path trace
    const P_START   = 4500   // ms
    const P_DUR     = 2300   // ms (takes entire tour)

    // ── Setup / resize ───────────────────────────────────────────────────
    const setup = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      const W = canvas.width
      const H = canvas.height

      const nodes = NODE_LAYOUT.map(([rx, ry]) => ({
        rx, ry,
        x: rx * W + (Math.random() - 0.5) * W * 0.022,
        y: ry * H + (Math.random() - 0.5) * H * 0.022,
        pulse: Math.random() * Math.PI * 2, // phase offset for pulse animation
      }))

      const edges = buildEdges(nodes)

      const particles = Array.from({ length: 42 }, () => ({
        x:  Math.random() * W,
        y:  Math.random() * H,
        vx: (Math.random() - 0.5) * 0.11,
        vy: (Math.random() - 0.5) * 0.11,
        r:  Math.random() * 1.5 + 0.4,
        a:  Math.random() * 0.32 + 0.10,
      }))

      gRef.current = { nodes, edges, particles, W, H }
    }

    setup()
    window.addEventListener('resize', setup)
    startRef.current = performance.now()

    // ── Draw loop ────────────────────────────────────────────────────────
    const loop = () => {
      const { nodes, edges, particles, W, H } = gRef.current
      if (!W) { rafRef.current = requestAnimationFrame(loop); return }

      const el = performance.now() - startRef.current // elapsed ms

      // ── Background clear ────────────────────────────────────────────
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      // ── Slow ambient camera pan (after 8 s) ─────────────────────────
      let panning = el > 8000
      if (panning) {
        const t = (el - 8000) / 24000
        ctx.save()
        ctx.translate(
          Math.sin(t * Math.PI * 2)       * 18,
          Math.cos(t * Math.PI * 1.55)    * 10,
        )
      }

      // ── Tron grid (1.5 s) ───────────────────────────────────────────
      if (el > 1500) {
        const fadeIn = Math.min(1, (el - 1500) / 720)
        const alpha  = fadeIn * (isCyber ? 0.055 : 0.036)
        ctx.strokeStyle = `rgba(${pr},${pg},${pb},${alpha})`
        ctx.lineWidth   = 0.5
        ctx.setLineDash([])
        for (let x = 0; x <= W + GRID_SP; x += GRID_SP) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
        }
        for (let y = 0; y <= H + GRID_SP; y += GRID_SP) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
        }
      }

      // ── Ambient particles (1 s) ─────────────────────────────────────
      if (el > 1000) {
        const pf = Math.min(1, (el - 1000) / 1600)
        particles.forEach(p => {
          p.x = ((p.x + p.vx) % W + W) % W
          p.y = ((p.y + p.vy) % H + H) % H
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${pr},${pg},${pb},${p.a * pf * 0.48})`
          ctx.fill()
        })
      }

      // ── Edges draw in (3.5 s) ───────────────────────────────────────
      if (el > E_START) {
        const ep  = Math.min(1, (el - E_START) / E_DUR)
        const vis = Math.floor(edges.length * ep)
        ctx.setLineDash([3, 6])
        ctx.lineWidth = 0.7
        for (let i = 0; i < vis; i++) {
          const na = nodes[edges[i].a], nb = nodes[edges[i].b]
          ctx.strokeStyle = `rgba(${pr},${pg},${pb},0.13)`
          ctx.beginPath(); ctx.moveTo(na.x, na.y); ctx.lineTo(nb.x, nb.y); ctx.stroke()
        }
        ctx.setLineDash([])
      }

      // ── TSP path glow traces tour (4.5 s) ───────────────────────────
      if (el > P_START) {
        const pp       = Math.min(1, (el - P_START) / P_DUR)
        const totalSeg = TSP_PATH.length - 1
        const segsF    = pp * totalSeg

        ctx.lineWidth = isCyber ? 2.3 : 1.9
        ctx.lineCap   = 'round'
        ctx.setLineDash([])

        if (isCyber) {
          ctx.shadowColor = `rgba(${pr},${pg},${pb},0.7)`
          ctx.shadowBlur  = 10
        }

        // Full completed segments
        for (let i = 0; i < Math.min(Math.floor(segsF), totalSeg); i++) {
          const na = nodes[TSP_PATH[i]], nb = nodes[TSP_PATH[i + 1]]
          if (!na || !nb) continue
          ctx.strokeStyle = `rgba(${pr},${pg},${pb},0.84)`
          ctx.beginPath(); ctx.moveTo(na.x, na.y); ctx.lineTo(nb.x, nb.y); ctx.stroke()
        }

        // Partial segment + leading "ant" head
        const segIdx = Math.floor(segsF)
        if (segIdx < totalSeg) {
          const frac = segsF - segIdx
          const na   = nodes[TSP_PATH[segIdx]]
          const nb   = nodes[TSP_PATH[segIdx + 1]]
          if (na && nb) {
            const hx = na.x + (nb.x - na.x) * frac
            const hy = na.y + (nb.y - na.y) * frac

            // Partial segment
            ctx.strokeStyle = `rgba(${pr},${pg},${pb},0.84)`
            ctx.beginPath(); ctx.moveTo(na.x, na.y); ctx.lineTo(hx, hy); ctx.stroke()

            // Leading dot (brighter)
            if (isCyber) { ctx.shadowBlur = 18; ctx.shadowColor = `rgba(${pr},${pg},${pb},0.9)` }
            ctx.beginPath(); ctx.arc(hx, hy, 4.5, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(${pr},${pg},${pb},1)`
            ctx.fill()
          }
        }

        ctx.shadowBlur = 0
        ctx.lineCap    = 'butt'
      }

      // ── Nodes materialise (2.5 s, staggered) ────────────────────────
      if (el > N_START) {
        nodes.forEach((n, i) => {
          const revealAt = N_START + i * N_STAGGER
          if (el < revealAt) return

          const rp    = Math.min(1, (el - revealAt) / 340) // reveal [0→1]
          const pulse = Math.sin(el * 0.0018 + n.pulse) * 0.35 + 0.65

          // Outer pulse halo
          ctx.beginPath()
          ctx.arc(n.x, n.y, (15 + pulse * 5) * rp, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${pr},${pg},${pb},${0.052 * rp})`
          ctx.fill()

          // Core dot (with glow in cyber)
          if (isCyber) { ctx.shadowColor = `rgba(${pr},${pg},${pb},0.5)`; ctx.shadowBlur = 7 }
          ctx.beginPath()
          ctx.arc(n.x, n.y, 4.5 * rp, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${pr},${pg},${pb},${0.92 * rp})`
          ctx.fill()
          ctx.shadowBlur = 0

          // Thin outer ring
          ctx.beginPath()
          ctx.arc(n.x, n.y, 9.5 * rp, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(${pr},${pg},${pb},${0.22 * rp})`
          ctx.lineWidth   = 0.5
          ctx.stroke()
        })
      }

      if (panning) ctx.restore()

      rafRef.current = requestAnimationFrame(loop)
    }

    loop()

    return () => {
      window.removeEventListener('resize', setup)
      cancelAnimationFrame(rafRef.current)
    }
  }, []) // colours captured in closure — intentionally no dep array

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position:   'fixed',
        inset:       0,
        background:  C.bg,
        overflow:   'hidden',
        zIndex:      9999,
        opacity:     leaving ? 0 : 1,
        transform:   leaving ? 'scale(1.02)' : 'scale(1)',
        transition: 'opacity 0.68s ease, transform 0.68s ease',
      }}
    >
      {/* ── Canvas (graph animation) ──────────────────────────────────── */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />

      {/* ── Scanlines overlay (cyber only) ──────────────────────────── */}
      {isCyber && (
        <div style={{
          position:  'absolute', inset: 0,
          background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px)',
          pointerEvents: 'none',
          zIndex: 1,
        }} />
      )}

      {/* ── INITIALIZING... (top-left terminal) ─────────────────────── */}
      <div style={{
        position:    'absolute',
        top:          36,
        left:         44,
        fontFamily:   C.fontMono,
        fontSize:     11,
        letterSpacing:'0.14em',
        color:        C.initColor,
        // Fade IN when showInit fires, fade OUT + drift up when initFaded fires
        opacity:      showInit && !initFaded ? 1 : 0,
        transform:    showInit && !initFaded ? 'translateY(0)' : 'translateY(-8px)',
        transition:   initFaded
                        ? 'opacity 0.8s ease, transform 0.8s ease'   // slow fade out
                        : 'opacity 0.4s ease, transform 0.4s ease',  // fast fade in
        zIndex:       10,
        userSelect:  'none',
      }}>
        <span style={{ opacity: 0.4 }}>{'> '}</span>
        <span>{typedText}</span>
        {/* Blinking block cursor */}
        <span style={{
          display:        'inline-block',
          width:           6,
          height:          11,
          background:      C.initColor,
          opacity:         0.65,
          marginLeft:      2,
          verticalAlign:  'middle',
          animation:      'pf-cursor 0.85s step-end infinite',
        }} />
      </div>

      {/* ── Center content column (algos + title + subtitle) ─────────── */}
      <div style={{
        position:      'absolute',
        inset:          0,
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        justifyContent:'center',
        gap:            22,
        zIndex:         10,
        pointerEvents: 'none',
      }}>

        {/* Algorithm race row */}
        <div style={{
          display:   'flex',
          gap:        9,
          flexWrap:  'wrap',
          justifyContent: 'center',
          opacity:    showAlgos ? 1 : 0,
          transform:  showAlgos ? 'translateY(0)' : 'translateY(14px)',
          transition:'opacity 0.5s ease, transform 0.5s ease',
        }}>
          {ALGORITHMS.map((alg, i) => {
            const active = activeAlgo === i
            return (
              <div
                key={alg}
                style={{
                  fontFamily:    C.fontMono,
                  fontSize:       10,
                  letterSpacing: '0.1em',
                  padding:       '4px 11px',
                  border:        `1px solid ${active ? C.algoHL : C.dimColor}`,
                  borderRadius:   3,
                  color:          active ? C.algoHL : C.mutedColor,
                  background:     active ? C.algoHLbg : 'transparent',
                  transform:      active ? 'scale(1.1)' : 'scale(1)',
                  textShadow:     isCyber && active ? `0 0 14px ${C.algoHL}` : 'none',
                  transition:    'all 0.16s ease',
                  whiteSpace:    'nowrap',
                }}
              >
                {alg}
              </div>
            )
          })}
        </div>

        {/* PATHFINDER — one letter per render tick */}
        <h1 style={{
          fontFamily:    C.fontDisplay,
          fontSize:      'clamp(58px, 10.5vw, 118px)',
          fontWeight:     700,
          letterSpacing:  isCyber ? '0.14em' : '0.04em',
          textTransform: 'uppercase',
          margin:         0,
          lineHeight:     1,
          color:          C.titleColor,
          textShadow:     C.titleGlow,
          display:       'flex',
        }}>
          {TITLE_WORD.split('').map((ch, i) => (
            <span
              key={i}
              style={{
                display:    'inline-block',
                opacity:     i < titleVisible ? 1 : 0,
                transform:   i < titleVisible
                               ? 'translateY(0) scaleY(1)'
                               : 'translateY(26px) scaleY(0.75)',
                transition: 'opacity 0.42s cubic-bezier(0.2,0.8,0.2,1), transform 0.42s cubic-bezier(0.2,0.8,0.2,1)',
              }}
            >
              {ch}
            </span>
          ))}
        </h1>

        {/* Subtitle */}
        <p style={{
          fontFamily:    C.fontMono,
          fontSize:      'clamp(9px, 1.25vw, 12.5px)',
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color:          C.mutedColor,
          margin:         0,
          opacity:        showSubtitle ? 1 : 0,
          transform:      showSubtitle ? 'translateY(0)' : 'translateY(12px)',
          transition:    'opacity 0.9s ease, transform 0.9s ease',
        }}>
          {SUBTITLE}
        </p>
      </div>

      {/* ── CLICK TO ENTER ───────────────────────────────────────────────
           Positioned at 73 % of viewport height — sits in the clean gap
           between the subtitle (~58 %) and the bottom node strip (~88 %).
           Entrance: pill border wipes in left-to-right via clip-path,
           then the ongoing pulse picks up once the wipe finishes.        */}
      <div
        onClick={proceed}
        style={{
          position:      'absolute',
          top:           '73%',
          left:          '50%',
          transform:     'translateX(-50%)',
          fontFamily:     C.fontMono,
          fontSize:       10.5,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color:          C.mutedColor,
          padding:       '10px 30px',
          border:        `1px solid ${C.promptBorder}`,
          borderRadius:   999,
          background:     C.promptBg,
          cursor:         showPrompt ? 'pointer' : 'default',
          pointerEvents:  showPrompt ? 'auto' : 'none',
          // Hidden until showPrompt fires; animation owns the reveal after that
          opacity:        showPrompt ? 1 : 0,
          animation:      showPrompt
            ? 'pf-pill-wipe 0.7s cubic-bezier(0.4,0,0.2,1) both, pf-pulse-prompt 2.4s ease-in-out 0.7s infinite'
            : 'none',
          zIndex:         10,
          userSelect:    'none',
          whiteSpace:    'nowrap',
        }}
      >
        Click to Enter&nbsp;&nbsp;/&nbsp;&nbsp;Press Enter
      </div>

      {/* ── ESC to skip (top-right, always visible) ─────────────────── */}
      <div
        onClick={proceed}
        style={{
          position:      'absolute',
          top:            36,
          right:          42,
          fontFamily:     C.fontMono,
          fontSize:        9,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color:          C.mutedColor,
          opacity:         0.35,
          cursor:         'pointer',
          zIndex:          10,
          userSelect:     'none',
          transition:     'opacity 0.2s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '0.75' }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '0.35' }}
      >
        ESC to skip
      </div>

      {/* ── CSS keyframes (scoped to this component) ─────────────────── */}
      <style>{`
        @keyframes pf-cursor {
          0%, 100% { opacity: 0.7; }
          50%       { opacity: 0;   }
        }

        /* Pill wipes in left → right, respecting the pill's rounded corners */
        @keyframes pf-pill-wipe {
          from { clip-path: inset(0 100% 0 0 round 999px); opacity: 0.9; }
          to   { clip-path: inset(0 0%   0 0 round 999px); opacity: 1;   }
        }

        /* Ongoing gentle pulse once the pill is fully drawn */
        @keyframes pf-pulse-prompt {
          0%, 100% { opacity: 0.45; }
          50%       { opacity: 1;   }
        }
      `}</style>
    </div>
  )
}
