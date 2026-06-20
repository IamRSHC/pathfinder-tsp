import { useRef, useState, useEffect, useCallback } from 'react'
import { gsap }     from 'gsap'
import { useTheme } from '../../hooks/useTheme'

const DRAG_THRESHOLD = 8    // px of movement before a tap becomes a drag
const SWIPE_THRESHOLD = 70  // px of drag before it commits to navigation

/**
 * CardDeck — a 3-card poker-style deck.
 * Fixed poker-card proportions (narrow + tall). One card fully visible at a
 * time; the other two peek out behind it, fanned to either side.
 * Navigate via a single pill (arrows folded in) or drag/swipe.
 *
 * props:
 *   cards: [{ id, labelC, labelS, content }]   exactly 3 entries
 */
export default function CardDeck({ cards }) {
  const t = useTheme()
  const n = cards.length

  const [active, setActive] = useState(0)
  const cardRefs   = useRef([])
  const dragState  = useRef({ pending: false, dragging: false, startX: 0, lastX: 0, pointerId: null })
  const animating  = useRef(false)

  // ── circular relative offset: -1 (left peek), 0 (active), 1 (right peek) ──
  const relOffset = (i, from = active) => {
    const raw = (i - from + n) % n
    return raw === n - 1 ? -1 : raw // 0,1 stay; n-1 becomes -1
  }

  const slot = (offset) => {
    if (offset === 0) {
      return { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, zIndex: 30, filter: 'brightness(1)' }
    }
    if (offset === 1) {
      return { x: 26, y: 18, rotate: 8, scale: 0.92, opacity: 0.5, zIndex: 20, filter: 'brightness(0.85)' }
    }
    return { x: -26, y: 18, rotate: -8, scale: 0.92, opacity: 0.5, zIndex: 20, filter: 'brightness(0.85)' }
  }

  // ── apply resting positions on mount ──────────────────────────────────────
  useEffect(() => {
    cardRefs.current.forEach((el, i) => {
      if (!el) return
      gsap.set(el, slot(relOffset(i)))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const goTo = useCallback((nextActive, dragRelease = false) => {
    if (animating.current || nextActive === active) return
    animating.current = true
    setActive(nextActive)

    cardRefs.current.forEach((el, i) => {
      if (!el) return
      const s = slot(relOffset(i, nextActive))
      gsap.to(el, {
        ...s,
        duration: dragRelease ? 0.45 : 0.5,
        ease:     'back.out(1.5)',
        onComplete: () => { animating.current = false },
      })
    })
  }, [active]) // eslint-disable-line react-hooks/exhaustive-deps

  const next = () => goTo((active + 1) % n)
  const prev = () => goTo((active - 1 + n) % n)

  // ── drag / swipe handling on the active card ──────────────────────────────
  // Pointer capture is deferred until real movement is detected, so a plain
  // click/tap on a button inside the card (Mode tile, pill, etc.) is never
  // hijacked — this is what was breaking selection on desktop.
  const onPointerDown = (e) => {
    if (animating.current) return
    dragState.current = {
      pending: true, dragging: false,
      startX: e.clientX, lastX: e.clientX,
      pointerId: e.pointerId,
    }
  }

  const onPointerMove = (e) => {
    const ds = dragState.current
    if (!ds.pending) return
    ds.lastX = e.clientX
    const dx = e.clientX - ds.startX

    if (!ds.dragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return
      ds.dragging = true
      e.currentTarget.setPointerCapture?.(ds.pointerId)
    }

    const activeEl = cardRefs.current[active]
    if (activeEl) {
      gsap.set(activeEl, {
        x: dx,
        rotate: dx / 18,
        scale: 1 - Math.min(Math.abs(dx) / 1400, 0.06),
      })
    }

    // preview-pull the destination peek card toward center
    const dir  = dx < 0 ? 1 : -1
    const pull = Math.min(Math.abs(dx) / 160, 1)
    cards.forEach((_, i) => {
      const off = relOffset(i)
      if (off !== dir) return
      const el = cardRefs.current[i]
      if (!el) return
      const base = slot(off)
      gsap.set(el, {
        x:       base.x - base.x * pull * 0.5,
        scale:   base.scale + (1 - base.scale) * pull * 0.5,
        opacity: base.opacity + (1 - base.opacity) * pull * 0.5,
      })
    })
  }

  const onPointerUp = () => {
    const ds = dragState.current
    if (!ds.pending) return
    const wasDragging = ds.dragging
    const dx = ds.lastX - ds.startX
    dragState.current.pending  = false
    dragState.current.dragging = false

    if (!wasDragging) return // plain tap/click — let it bubble to the inner button normally

    if (dx <= -SWIPE_THRESHOLD) { goTo((active + 1) % n, true); return }
    if (dx >= SWIPE_THRESHOLD)  { goTo((active - 1 + n) % n, true); return }

    cardRefs.current.forEach((el, i) => {
      if (!el) return
      gsap.to(el, { ...slot(relOffset(i)), duration: 0.35, ease: 'back.out(1.6)' })
    })
  }

  const pillBg     = t.is ? '#F0F5F2' : '#0d1f2d'
  const pillBorder = t.is ? '1.5px solid #2D6A4F' : '1.5px solid var(--color-primary)'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '0.75rem',
      width: 'clamp(240px, 82vw, 360px)', margin: '0 auto',
    }}>

      {/* ── Single pill: arrows folded in alongside the 3 tab labels ── */}
      <div
        style={{
          position:     'relative',
          display:      'flex',
          alignItems:   'stretch',
          height:       '36px',
          borderRadius: '999px',
          background:   pillBg,
          border:       pillBorder,
          boxShadow:    t.is ? 'none' : '0 0 8px rgba(0,229,255,0.2)',
          overflow:     'hidden',
          flexShrink:   0,
        }}
      >
        <button
          onClick={prev}
          aria-label="Previous card"
          style={pillArrowStyle(t)}
        >
          ‹
        </button>

        {cards.map((c, i) => (
          <button
            key={c.id}
            onClick={() => goTo(i)}
            style={{
              flex: 1, border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6rem',
              fontWeight: 700,
              letterSpacing: t.is ? '0.02em' : '0.06em',
              textTransform: t.is ? 'none' : 'uppercase',
              color: i === active ? (t.is ? '#FAFAF8' : '#090d14') : 'var(--color-muted)',
              background: i === active
                ? (t.is ? 'linear-gradient(135deg,#2D6A4F,#52B788)' : 'linear-gradient(135deg,#00b4d8,#00e5ff)')
                : 'transparent',
              transition: 'color 0.2s ease, background 0.2s ease',
            }}
          >
            {t.is ? c.labelS : c.labelC}
          </button>
        ))}

        <button
          onClick={next}
          aria-label="Next card"
          style={pillArrowStyle(t)}
        >
          ›
        </button>
      </div>

      {/* ── Deck stage — fixed poker-card proportions ── */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '5 / 7',
          perspective: '1400px',
        }}
      >
        {cards.map((c, i) => (
          <div
            key={c.id}
            ref={el => (cardRefs.current[i] = el)}
            onPointerDown={i === active ? onPointerDown : undefined}
            onPointerMove={i === active ? onPointerMove : undefined}
            onPointerUp={i === active ? onPointerUp : undefined}
            onPointerCancel={i === active ? onPointerUp : undefined}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: t.is ? '1.25rem' : '1rem',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: t.is
                ? '0 8px 24px rgba(0,0,0,0.10), 0 1px 0 rgba(0,0,0,0.04)'
                : '0 8px 30px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,229,255,0.05)',
              overflow: 'hidden',
              cursor: i === active ? 'grab' : 'default',
              touchAction: i === active ? 'pan-y' : 'auto',
              willChange: 'transform, opacity',
            }}
          >
            <div style={{
              height: '100%',
              boxSizing: 'border-box',
              padding: 'clamp(0.85rem, 4vw, 1.15rem)',
            }}>
              {c.content}
            </div>
          </div>
        ))}
      </div>

      {/* ── Step dots ── */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', flexShrink: 0 }}>
        {cards.map((c, i) => (
          <button
            key={c.id}
            onClick={() => goTo(i)}
            aria-label={`Go to ${c.labelC}`}
            style={{
              width: i === active ? '18px' : '6px',
              height: '6px',
              borderRadius: '999px',
              border: 'none',
              cursor: 'pointer',
              background: i === active ? 'var(--color-primary)' : 'var(--color-border)',
              transition: 'all 0.25s ease',
            }}
          />
        ))}
      </div>
    </div>
  )
}

function pillArrowStyle(t) {
  return {
    flexShrink: 0,
    width: '30px',
    border: 'none',
    background: 'transparent',
    color: 'var(--color-primary)',
    fontSize: '1.05rem',
    lineHeight: 1,
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
  }
}
