import { useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react'
import { gsap }     from 'gsap'
import { useTheme } from '../../hooks/useTheme'

const MIN_STAGE_HEIGHT = 320  // px floor so a thin card never looks cramped
const BORDER_EXTRA     = 2    // outer card's top+bottom border width

/**
 * CardDeck — a 3-card poker-style deck.
 * One card fully visible at a time; the other two peek out behind it,
 * fanned to either side. Navigate via tabs, chevrons, or drag/swipe.
 *
 * props:
 *   cards: [{ id, labelC, labelS, content }]   exactly 3 entries
 */
export default function CardDeck({ cards }) {
  const t = useTheme()
  const n = cards.length

  const [active, setActive] = useState(0)
  const cardRefs    = useRef([])  // outer clipped card shells (animated slots)
  const contentRefs = useRef([])  // inner natural-height content wrappers (measured)
  const stageRef     = useRef(null)
  const heightsRef    = useRef([0, 0, 0])
  const dragState  = useRef({ dragging: false, startX: 0, lastX: 0 })
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
      return { x: 34, y: 22, rotate: 9, scale: 0.91, opacity: 0.5, zIndex: 20, filter: 'brightness(0.85)' }
    }
    // offset === -1
    return { x: -34, y: 22, rotate: -9, scale: 0.91, opacity: 0.5, zIndex: 20, filter: 'brightness(0.85)' }
  }

  // ── apply resting positions on mount / theme change ──────────────────────
  useEffect(() => {
    cardRefs.current.forEach((el, i) => {
      if (!el) return
      const s = slot(relOffset(i))
      gsap.set(el, s)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── fixed-size deck: measure every card's natural content height and lock
  //    the stage to the tallest one. Navigating never resizes the deck —
  //    only an actual content change (e.g. typing custom nodes) does. ───────
  const applyStageHeight = useCallback((animate) => {
    const max = Math.max(MIN_STAGE_HEIGHT, ...heightsRef.current)
    const px  = Math.ceil(max) + BORDER_EXTRA
    const el  = stageRef.current
    if (!el) return
    if (animate) {
      gsap.to(el, { height: px, duration: 0.4, ease: 'power2.out' })
    } else {
      gsap.set(el, { height: px })
    }
  }, [])

  useLayoutEffect(() => {
    heightsRef.current = contentRefs.current.map(el => (el ? el.getBoundingClientRect().height : 0))
    applyStageHeight(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      let changed = false
      entries.forEach(entry => {
        const idx = contentRefs.current.indexOf(entry.target)
        if (idx === -1) return
        const h = entry.borderBoxSize?.[0]?.blockSize ?? entry.target.getBoundingClientRect().height
        if (Math.abs(heightsRef.current[idx] - h) > 1) {
          heightsRef.current[idx] = h
          changed = true
        }
      })
      if (changed) applyStageHeight(true)
    })
    contentRefs.current.forEach(el => el && observer.observe(el))
    return () => observer.disconnect()
  }, [applyStageHeight])

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
  const onPointerDown = (e) => {
    if (animating.current) return
    dragState.current = { dragging: true, startX: e.clientX, lastX: e.clientX }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e) => {
    const ds = dragState.current
    if (!ds.dragging) return
    ds.lastX = e.clientX
    const dx = e.clientX - ds.startX

    const activeEl = cardRefs.current[active]
    if (activeEl) {
      gsap.set(activeEl, {
        x: dx,
        rotate: dx / 18,
        scale: 1 - Math.min(Math.abs(dx) / 1400, 0.06),
      })
    }

    // preview-pull the destination peek card toward center
    const dir = dx < 0 ? 1 : -1 // dragging left → next card (offset 1) pulled in
    const pull = Math.min(Math.abs(dx) / 160, 1)
    cards.forEach((_, i) => {
      const off = relOffset(i)
      if (off !== dir) return
      const el = cardRefs.current[i]
      if (!el) return
      const base = slot(off)
      gsap.set(el, {
        x:       base.x - (base.x - 0) * pull * 0.5,
        scale:   base.scale + (1 - base.scale) * pull * 0.5,
        opacity: base.opacity + (1 - base.opacity) * pull * 0.5,
      })
    })
  }

  const onPointerUp = () => {
    const ds = dragState.current
    if (!ds.dragging) return
    const dx = ds.lastX - ds.startX
    dragState.current.dragging = false

    const THRESHOLD = 70
    if (dx <= -THRESHOLD) { goTo((active + 1) % n, true); return }
    if (dx >= THRESHOLD)  { goTo((active - 1 + n) % n, true); return }

    // snap back — reset everyone to resting slots
    cardRefs.current.forEach((el, i) => {
      if (!el) return
      gsap.to(el, { ...slot(relOffset(i)), duration: 0.35, ease: 'back.out(1.6)' })
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

      {/* ── Tab labels + chevrons ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
        <button
          onClick={prev}
          aria-label="Previous card"
          style={navBtnStyle(t)}
        >
          ‹
        </button>

        <div style={{
          flex: 1, display: 'flex', borderRadius: '0.5rem',
          border: '1px solid var(--color-border)', overflow: 'hidden',
          background: 'var(--color-surface)',
        }}>
          {cards.map((c, i) => (
            <button
              key={c.id}
              onClick={() => goTo(i)}
              style={{
                flex: 1, padding: '0.5rem 0.4rem', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.62rem',
                fontWeight: 700,
                letterSpacing: t.is ? '0.02em' : '0.07em',
                textTransform: t.is ? 'none' : 'uppercase',
                color: i === active ? 'var(--color-primary)' : 'var(--color-muted)',
                background: i === active
                  ? (t.is ? 'rgba(45,106,79,0.08)' : 'rgba(0,229,255,0.07)')
                  : 'transparent',
                borderRight: i < n - 1 ? '1px solid var(--color-border)' : 'none',
                boxShadow: i === active && t.is ? 'inset 0 -2px 0 var(--color-primary)' : 'none',
                transition: 'color 0.15s ease, background 0.15s ease',
              }}
            >
              {t.is ? c.labelS : c.labelC}
            </button>
          ))}
        </div>

        <button
          onClick={next}
          aria-label="Next card"
          style={navBtnStyle(t)}
        >
          ›
        </button>
      </div>

      {/* ── Deck stage — height is locked to the tallest card's content, measured live ── */}
      <div
        ref={stageRef}
        style={{
          position: 'relative',
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
              borderRadius: t.is ? '1rem' : '0.75rem',
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
            <div
              ref={el => (contentRefs.current[i] = el)}
              style={{ padding: 'clamp(0.9rem, 2vw, 1.25rem)' }}
            >
              {c.content}
            </div>
          </div>
        ))}
      </div>

      {/* ── Step dots (subtle, mobile-friendly secondary affordance) ── */}
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

function navBtnStyle(t) {
  return {
    flexShrink: 0,
    width: '34px',
    height: '34px',
    borderRadius: '0.5rem',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
    color: 'var(--color-primary)',
    fontSize: '1.1rem',
    lineHeight: 1,
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
    boxShadow: t.is ? 'none' : '0 0 10px rgba(0,229,255,0.08)',
  }
}
