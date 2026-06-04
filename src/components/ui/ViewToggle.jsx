import { useUiStore } from '../../stores/uiStore'
import { useTheme }   from '../../hooks/useTheme'

export default function ViewToggle() {
  const { viewMode, toggleViewMode } = useUiStore()
  const t = useTheme()
  const is3d = viewMode === '3d'

  const primary   = 'var(--color-primary)'
  const surface   = 'var(--color-surface)'
  const border    = 'var(--color-border)'
  const muted     = 'var(--color-muted)'

  // Pill colours mirror theme toggle: active side uses a gradient badge
  const pillBg   = t.is
    ? (is3d ? '#E8F5EE' : '#F0F0F0')
    : (is3d ? '#0d1f2d' : '#162032')

  const pillBorder = t.is
    ? '1.5px solid #2D6A4F'
    : `1.5px solid ${primary}`

  const pillShadow = t.is
    ? '0 0 0 0px transparent'
    : `0 0 8px rgba(0,229,255,0.25)`

  const sliderBg = t.is
    ? 'linear-gradient(135deg, #2D6A4F, #52B788)'
    : 'linear-gradient(135deg, #00b4d8, #00e5ff)'

  const sliderShadow = t.is
    ? '0 2px 8px rgba(45,106,79,0.5)'
    : '0 2px 10px rgba(0,229,255,0.6)'

  return (
    <div
      onClick={toggleViewMode}
      role="button"
      aria-label={`Switch to ${is3d ? '2D' : '3D'} view`}
      title={`Switch to ${is3d ? '2D flat' : '3D orbital'} view`}
      style={{
        position:     'relative',
        display:      'flex',
        alignItems:   'center',
        width:        '80px',
        height:       '28px',
        borderRadius: '999px',
        cursor:       'pointer',
        userSelect:   'none',
        background:   pillBg,
        border:       pillBorder,
        boxShadow:    pillShadow,
        flexShrink:   0,
        WebkitTapHighlightColor: 'transparent',
        touchAction:  'manipulation',
      }}
    >
      {/* Sliding indicator */}
      <div
        style={{
          position:     'absolute',
          top:          '3px',
          left:         is3d ? 'calc(100% - 3px - 36px)' : '3px',
          width:        '36px',
          height:       '18px',
          borderRadius: '999px',
          background:   sliderBg,
          boxShadow:    sliderShadow,
          transition:   'left 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex:       2,
        }}
      />

      {/* 2D label */}
      <span
        style={{
          position:      'relative',
          zIndex:        3,
          flex:          1,
          textAlign:     'center',
          fontFamily:    t.is ? "'DM Mono', monospace" : "'JetBrains Mono', monospace",
          fontSize:      '0.55rem',
          fontWeight:    700,
          letterSpacing: t.is ? '0.02em' : '0.08em',
          color:         !is3d ? (t.is ? '#FAFAF8' : '#090d14') : muted,
          transition:    'color 0.2s ease',
          pointerEvents: 'none',
        }}
      >
        2D
      </span>

      {/* 3D label */}
      <span
        style={{
          position:      'relative',
          zIndex:        3,
          flex:          1,
          textAlign:     'center',
          fontFamily:    t.is ? "'DM Mono', monospace" : "'JetBrains Mono', monospace",
          fontSize:      '0.55rem',
          fontWeight:    700,
          letterSpacing: t.is ? '0.02em' : '0.08em',
          color:         is3d ? (t.is ? '#FAFAF8' : '#090d14') : muted,
          transition:    'color 0.2s ease',
          pointerEvents: 'none',
        }}
      >
        3D
      </span>
    </div>
  )
}
