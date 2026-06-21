import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from '../../hooks/useTheme'

// ─── localStorage key ─────────────────────────────────────────────────────────
const SEEN_KEY = 'pathfinder_hasSeenInfoPanel'

export default function FloatingInfoIcon() {
  const t = useTheme()

  // Has the user tapped before? (persisted across visits)
  const [hasSeen, setHasSeen]       = useState(() => !!localStorage.getItem(SEEN_KEY))
  const [sheetOpen, setSheetOpen]   = useState(false)

  // For swipe-to-dismiss
  const sheetRef       = useRef(null)
  const backdropRef    = useRef(null)
  const dragStartY     = useRef(null)
  const isDragging     = useRef(false)

  // ── Open the bottom sheet, mark as seen ─────────────────────────────────
  const handleOpen = useCallback(() => {
    setSheetOpen(true)
    if (!hasSeen) {
      setHasSeen(true)
      localStorage.setItem(SEEN_KEY, '1')
    }
  }, [hasSeen])

  // ── Close sheet ──────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    if (!sheetRef.current) return
    sheetRef.current.style.transition = 'transform 0.3s cubic-bezier(0.4,0,0.2,1)'
    sheetRef.current.style.transform  = 'translateY(100%)'
    setTimeout(() => setSheetOpen(false), 300)
  }, [])

  // ── Swipe-down to dismiss ────────────────────────────────────────────────
  const onTouchStart = useCallback((e) => {
    dragStartY.current = e.touches[0].clientY
    isDragging.current = false
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none'
    }
  }, [])

  const onTouchMove = useCallback((e) => {
    if (dragStartY.current === null) return
    const delta = e.touches[0].clientY - dragStartY.current
    if (delta < 0) return // prevent upward drag
    isDragging.current = true
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${delta}px)`
    }
  }, [])

  const onTouchEnd = useCallback((e) => {
    if (!isDragging.current) return
    const delta = e.changedTouches[0].clientY - dragStartY.current
    if (delta > 80) {
      handleClose()
    } else {
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'transform 0.3s cubic-bezier(0.4,0,0.2,1)'
        sheetRef.current.style.transform  = 'translateY(0)'
      }
    }
    dragStartY.current = null
    isDragging.current = false
  }, [handleClose])

  // ── Animate sheet in when opened ─────────────────────────────────────────
  useEffect(() => {
    if (sheetOpen && sheetRef.current) {
      // Start off-screen, then slide up
      sheetRef.current.style.transition = 'none'
      sheetRef.current.style.transform  = 'translateY(100%)'
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (sheetRef.current) {
            sheetRef.current.style.transition = 'transform 0.38s cubic-bezier(0.16,1,0.3,1)'
            sheetRef.current.style.transform  = 'translateY(0)'
          }
        })
      })
    }
  }, [sheetOpen])

  // ── Theme-aware colours ──────────────────────────────────────────────────
  const cyberBg     = 'rgba(9,13,20,0.92)'
  const sereneBg    = 'rgba(250,250,248,0.97)'
  const cyberBorder = '#00e5ff'
  const sereneBorder= '#2D6A4F'
  const bg     = t.is ? sereneBg  : cyberBg
  const border = t.is ? sereneBorder : cyberBorder

  const panelText = {
    fontFamily: 'var(--font-mono)',
    fontSize:   '0.78rem',
    lineHeight: 1.85,
    color:      'var(--color-muted)',
  }
  const hl = { color: 'var(--color-primary)', fontWeight: 600 }
  const sectionLabel = {
    fontFamily:    'var(--font-mono)',
    fontSize:      '0.6rem',
    letterSpacing: t.is ? '0.08em' : '0.15em',
    textTransform: 'uppercase',
    color:         'var(--color-primary)',
    opacity:       0.85,
    display:       'block',
  }
  const divider = {
    height:     '1px',
    background: 'var(--color-border)',
    opacity:    t.is ? 0.7 : 0.5,
    margin:     '0.75rem 0',
  }

  return (
    <>
      {/* ── Floating ⓘ button — mobile/tablet only (hidden on lg+) ── */}
      <button
        id="floating-info-icon"
        aria-label="Why this exists"
        onClick={handleOpen}
        className={hasSeen ? '' : 'info-icon-pulse'}
        style={{
          position:     'fixed',
          bottom:       '24px',
          right:        '24px',
          zIndex:       50,
          width:        '48px',
          height:       '48px',
          borderRadius: '50%',
          border:       `1.5px solid ${border}`,
          background:   t.is ? 'rgba(250,250,248,0.95)' : 'rgba(9,13,20,0.9)',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          cursor:       'pointer',
          // Static glow only when animation is off
          boxShadow: hasSeen
            ? (t.is
                ? `0 0 0 1.5px ${sereneBorder}22, 0 4px 16px rgba(45,106,79,0.15)`
                : `0 0 0 1.5px ${cyberBorder}22, 0 4px 16px rgba(0,229,255,0.10)`)
            : undefined,
          // Desktop: hidden
          // CSS handles hide at lg+ via media query on the class below
        }}
      >
        {/* Expanding ring — rendered only while animating */}
        {!hasSeen && (
          <span
            aria-hidden="true"
            className="info-icon-ring"
            style={{
              position:     'absolute',
              inset:        0,
              borderRadius: '50%',
              border:       `1.5px solid ${border}`,
              pointerEvents:'none',
            }}
          />
        )}

        {/* The ⓘ glyph */}
        <span
          style={{
            fontFamily:  'var(--font-mono)',
            fontSize:    '1.25rem',
            lineHeight:  1,
            color:       border,
            userSelect:  'none',
            fontWeight:  700,
            letterSpacing: 0,
            // remove any inherited text-shadow from serene override
            textShadow: 'none',
          }}
        >
          ⓘ
        </span>
      </button>

      {/* ── Bottom sheet backdrop ── */}
      {sheetOpen && (
        <div
          ref={backdropRef}
          onClick={handleClose}
          style={{
            position:   'fixed',
            inset:      0,
            zIndex:     998,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* ── Bottom sheet panel ── */}
      {sheetOpen && (
        <div
          ref={sheetRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{
            position:     'fixed',
            bottom:       0,
            left:         0,
            right:        0,
            zIndex:       999,
            background:   bg,
            borderTop:    `1.5px solid ${border}`,
            borderTopLeftRadius:  '1.25rem',
            borderTopRightRadius: '1.25rem',
            padding:      '0.75rem 1.5rem 2rem',
            maxHeight:    '80vh',
            overflowY:    'auto',
            // start translated off-screen, JS animates in
            transform:    'translateY(100%)',
            willChange:   'transform',
            boxShadow:    t.is
              ? '0 -4px 32px rgba(45,106,79,0.12)'
              : '0 -4px 32px rgba(0,229,255,0.10)',
          }}
        >
          {/* Drag handle */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <div
              style={{
                width:        '40px',
                height:       '4px',
                borderRadius: '2px',
                background:   'var(--color-border)',
              }}
            />
          </div>

          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
            <span style={sectionLabel}>WHY THIS EXISTS</span>
            <button
              onClick={handleClose}
              aria-label="Close"
              style={{
                background:   'none',
                border:       'none',
                cursor:       'pointer',
                color:        'var(--color-muted)',
                fontSize:     '1.1rem',
                lineHeight:   1,
                padding:      '0.1rem 0.3rem',
                borderRadius: '0.25rem',
              }}
            >
              ✕
            </button>
          </div>
          <div style={divider} />

          {/* Content — mirrors the desktop left panel */}
          <p style={{ ...panelText, marginBottom: '0.9rem' }}>
            NP-hard problems don't have a fast exact solution. Not because nobody's tried —
            because no algorithm scales fast enough as the problem grows.
          </p>

          <p style={{ ...panelText, marginBottom: '0.9rem' }}>
            The Traveling Salesman Problem is the classic case.{' '}
            <span style={hl}>10 cities, trivial.</span>{' '}
            <span style={hl}>50 cities, computers struggle.</span>{' '}
            This isn't a CS101 exercise — it's the same math behind drug discovery,
            chip transistor placement, and delivery logistics.
          </p>

          <p style={{ ...panelText, marginBottom: '0.9rem' }}>
            For decades, two camps worked this separately: pure algorithms (fast, blind) and
            human intuition (slow, surprisingly sharp at seeing shortcuts machines miss).
          </p>

          <div style={divider} />

          <p
            style={{
              ...panelText,
              fontStyle: 'italic',
              color:     'var(--color-text)',
              opacity:   0.85,
              fontSize:  '0.82rem',
            }}
          >
            "Neither human nor AI solves it alone. The collaboration is the discovery."
          </p>
        </div>
      )}
    </>
  )
}
