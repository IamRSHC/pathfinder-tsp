import { useRef, useState } from 'react'
import { useGameStore }      from '../../stores/gameStore'
import { useTheme }          from '../../hooks/useTheme'
import { parseCustomNodes, STANDARD_SETS } from '../../utils/tspUtils'

const SOURCES = ['random', 'standard', 'custom']
const SOURCE_LABELS = {
  cyber:  { random: 'RANDOM', standard: 'STANDARD', custom: 'CUSTOM' },
  serene: { random: 'Random', standard: 'Standard', custom: 'Custom' },
}

export default function NodeSourcePicker() {
  const t = useTheme()
  const {
    nodeSource, setNodeSource,
    standardSize, setStandardSize,
    customRaw, setCustomRaw,
  } = useGameStore()

  const fileRef = useRef(null)
  const [parseResult, setParseResult] = useState(null) // { count, errors }

  const theme   = t.is ? 'serene' : 'cyber'
  const labels  = SOURCE_LABELS[theme]

  const primary   = 'var(--color-primary)'
  const surface   = 'var(--color-surface)'
  const border    = 'var(--color-border)'
  const muted     = 'var(--color-muted)'
  const text      = 'var(--color-text)'

  // Pill geometry — sliderLeft uses calc() so it scales with border-box correctly
  const pillW   = 216
  const pillH   = 30
  const sliderW = 68
  // Each of 3 equal segments = 33.333% of inner width
  // Slider is centred in its segment: offset = segmentIndex * (100%/3) + 2px inset
  const sliderLefts = {
    random:   'calc(0 * (100% / 3) + 2px)',
    standard: 'calc(1 * (100% / 3) + 2px)',
    custom:   'calc(2 * (100% / 3) + 2px)',
  }

  const sliderBg = t.is
    ? 'linear-gradient(135deg,#2D6A4F,#52B788)'
    : 'linear-gradient(135deg,#00b4d8,#00e5ff)'
  const sliderShadow = t.is
    ? '0 2px 8px rgba(45,106,79,0.5)'
    : '0 2px 10px rgba(0,229,255,0.6)'
  const pillBorder = t.is ? '1.5px solid #2D6A4F' : `1.5px solid ${primary}`
  const pillBg     = t.is ? '#F0F5F2' : '#0d1f2d'

  // ── Parse helper ──────────────────────────────────────────────────────────
  function handleTextChange(val) {
    setCustomRaw(val)
    if (!val.trim()) { setParseResult(null); return }
    const { nodes, errors } = parseCustomNodes(val)
    setParseResult({ count: nodes.length, errors })
  }

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target.result
      handleTextChange(text)
      setCustomRaw(text)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

      <span className="stat-label">
        {t.is ? 'node source' : 'NODE SOURCE'}
      </span>

      {/* ── 3-way pill ── */}
      <div
        style={{
          position:     'relative',
          display:      'flex',
          alignItems:   'center',
          width:        `${pillW}px`,
          height:       `${pillH}px`,
          borderRadius: '999px',
          background:   pillBg,
          border:       pillBorder,
          boxShadow:    t.is ? 'none' : '0 0 8px rgba(0,229,255,0.2)',
          userSelect:   'none',
          cursor:       'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {/* Sliding indicator */}
        <div
          style={{
            position:   'absolute',
            top:        '3px',
            left:       sliderLefts[nodeSource],
            width:      `${sliderW}px`,
            height:     `${pillH - 6}px`,
            borderRadius: '999px',
            background: sliderBg,
            boxShadow:  sliderShadow,
            transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)',
            zIndex:     2,
            pointerEvents: 'none',
          }}
        />

        {/* Labels */}
        {SOURCES.map(src => (
          <div
            key={src}
            onClick={() => setNodeSource(src)}
            style={{
              position:      'relative',
              zIndex:        3,
              flex:          1,
              textAlign:     'center',
              fontFamily:    t.is ? "'DM Mono',monospace" : "'JetBrains Mono',monospace",
              fontSize:      '0.58rem',
              fontWeight:    700,
              letterSpacing: t.is ? '0.02em' : '0.07em',
              color:         nodeSource === src
                ? (t.is ? '#FAFAF8' : '#090d14')
                : muted,
              transition:    'color 0.2s ease',
              cursor:        'pointer',
              padding:       '0.25rem 0',
            }}
          >
            {labels[src]}
          </div>
        ))}
      </div>

      {/* ── STANDARD size selector ── */}
      {nodeSource === 'standard' && (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {Object.entries(STANDARD_SETS).map(([key, set]) => (
            <button
              key={key}
              onClick={() => setStandardSize(key)}
              style={{
                flex:          1,
                padding:       '0.4rem 0',
                borderRadius:  '0.375rem',
                border:        standardSize === key
                  ? `1.5px solid ${primary}`
                  : `1px solid ${border}`,
                background:    standardSize === key
                  ? (t.is ? 'rgba(45,106,79,0.12)' : 'rgba(0,229,255,0.08)')
                  : surface,
                color:         standardSize === key ? primary : muted,
                fontFamily:    'var(--font-mono)',
                fontSize:      '0.65rem',
                fontWeight:    700,
                cursor:        'pointer',
                transition:    'all 0.15s ease',
                letterSpacing: t.is ? '0.02em' : '0.06em',
              }}
            >
              {set.label}
            </button>
          ))}
        </div>
      )}

      {/* ── CUSTOM input ── */}
      {nodeSource === 'custom' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

          {/* Format hint */}
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
            color: muted, lineHeight: 1.6, opacity: 0.8,
          }}>
            {t.is
              ? 'One coordinate per line: x,y  (e.g. 120,340)'
              : 'ONE COORD PER LINE: x,y  (e.g. 120,340)'}
          </p>

          {/* Textarea */}
          <textarea
            value={customRaw}
            onChange={e => handleTextChange(e.target.value)}
            placeholder={'120,340\n250,80\n480,200\n...'}
            rows={6}
            style={{
              width:         '100%',
              background:    surface,
              border:        `1px solid ${border}`,
              borderRadius:  '0.375rem',
              color:         text,
              fontFamily:    'var(--font-mono)',
              fontSize:      '0.7rem',
              padding:       '0.5rem 0.6rem',
              resize:        'vertical',
              outline:       'none',
              lineHeight:    1.7,
            }}
            onFocus={e => (e.target.style.borderColor = primary)}
            onBlur={e  => (e.target.style.borderColor = border)}
          />

          {/* Upload button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                padding:      '0.35rem 0.75rem',
                borderRadius: '0.375rem',
                border:       `1px solid ${border}`,
                background:   surface,
                color:        muted,
                fontFamily:   'var(--font-mono)',
                fontSize:     '0.62rem',
                fontWeight:   600,
                cursor:       'pointer',
                letterSpacing: t.is ? '0.02em' : '0.06em',
              }}
            >
              {t.is ? '↑ Upload .txt / .csv' : '↑ UPLOAD .TXT / .CSV'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.csv,.tsv"
              onChange={handleFile}
              style={{ display: 'none' }}
            />

            {/* Live parse feedback */}
            {parseResult && (
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize:   '0.62rem',
                color:      parseResult.errors.length
                  ? '#ff5555'
                  : primary,
                fontWeight: 600,
              }}>
                {parseResult.errors.length
                  ? `${parseResult.errors.length} error(s)`
                  : `✓ ${parseResult.count} nodes parsed`}
              </span>
            )}
          </div>

          {/* Error list */}
          {parseResult?.errors?.length > 0 && (
            <div style={{
              background:   t.is ? '#FFF5F5' : '#1a0808',
              border:       '1px solid #ff555544',
              borderRadius: '0.375rem',
              padding:      '0.4rem 0.6rem',
              maxHeight:    '80px',
              overflowY:    'auto',
            }}>
              {parseResult.errors.slice(0, 5).map((err, i) => (
                <p key={i} style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize:   '0.58rem',
                  color:      '#ff5555',
                  lineHeight: 1.5,
                }}>{err}</p>
              ))}
              {parseResult.errors.length > 5 && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#ff5555' }}>
                  …and {parseResult.errors.length - 5} more
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
