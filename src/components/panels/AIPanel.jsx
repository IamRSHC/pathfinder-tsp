import { useState, useEffect } from 'react'
import { useAiStore }   from '../../stores/aiStore'
import { useGameStore } from '../../stores/gameStore'
import { useUiStore }   from '../../stores/uiStore'
import { useTheme }     from '../../hooks/useTheme'

export default function AIPanel({ className = '' }) {
  const {
    confidence, suggestion, overrideCount,
    isThinking, reasoningLog,
    acceptSuggestion, rejectSuggestion, handoffSegment,
  } = useAiStore()
  const { nodes, humanEdges, mode, nodeSource, customNodeNames, customRawCoords } = useGameStore()
  const { showNotification } = useUiStore()
  const t = useTheme()

  const confidenceColor =
    confidence >= 70 ? 'text-game-green' :
    confidence >= 40 ? 'text-game-amber' : 'text-game-red'

  const handleAccept = () => {
    if (!suggestion) return
    acceptSuggestion()
    showNotification('AI suggestion accepted', 'success')
  }
  const handleReject = () => {
    rejectSuggestion()
    showNotification('Override registered', 'warn')
  }
  const handleHandoff = () => {
    handoffSegment(nodes, humanEdges.length ? humanEdges[humanEdges.length - 1].to : 0)
    showNotification('Segment handed off to AI', 'info')
  }

  const logColor = (type) => {
    if (type === 'suggest') return t.primary.text
    if (type === 'warn')    return 'text-game-amber'
    if (type === 'success') return 'text-game-green'
    return 'text-game-muted'
  }

  return (
    <div className={`flex flex-col h-full bg-game-surface border-l border-game-border ${className}`}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-game-border">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isThinking ? 'bg-game-amber animate-pulse' : 'bg-game-green'}`} />
          <span className={t.header}>
            {t.is ? 'AI Co-Pilot' : 'AI CO-PILOT'}
          </span>
        </div>
        <span className="font-mono text-xs text-game-muted">
          {/* TODO: INTEGRATE AI MODEL — show model name */}
          {t.is ? 'mock engine' : 'MOCK ENGINE'}
        </span>
      </div>

      {/* Confidence Meter */}
      <div className="px-4 py-3 border-b border-game-border">
        <div className="flex justify-between items-center mb-1.5">
          <span className="stat-label">{t.is ? 'confidence' : 'CONFIDENCE'}</span>
          <span className={`font-mono font-bold text-sm ${confidenceColor}`}>{confidence}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden bg-game-border/30">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${confidence}%`, background: t.confidenceFill(confidence) }}
          />
        </div>
        {confidence < 40 && (
          <p className="text-game-amber font-mono text-xs mt-1.5">
            ⚠ {t.is ? 'Low confidence — your input needed' : 'Low confidence — your input needed'}
          </p>
        )}
      </div>

      {/* Current Suggestion */}
      <div className="px-4 py-3 border-b border-game-border">
        <span className="stat-label block mb-2">{t.is ? 'current suggestion' : 'CURRENT SUGGESTION'}</span>
        {isThinking ? (
          <div className="flex items-center gap-2 text-game-amber font-mono text-xs animate-pulse">
            <span>●●●</span><span>{t.is ? 'Computing…' : 'Computing...'}</span>
          </div>
        ) : suggestion ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-mono text-sm">
              <span className="text-game-text">{t.is ? 'Node' : 'Node'}</span>
              <span className={`${t.primary.text} font-bold`}>{suggestion.from}</span>
              <span className="text-game-muted">→</span>
              <span className={`${t.secondary.text} font-bold`}>{suggestion.to}</span>
              <span className="text-game-green text-xs ml-auto">-{suggestion.saving}%</span>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAccept} className={`flex-1 py-1.5 ${t.btn.primary}`}>
                {t.is ? 'Accept' : 'ACCEPT'}
              </button>
              <button onClick={handleReject} className={`flex-1 py-1.5 ${t.btn.danger}`}>
                {t.is ? 'Override' : 'OVERRIDE'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-game-muted font-mono text-xs">
            {t.is ? 'Connect nodes to receive suggestions' : 'Connect nodes to receive suggestions'}
          </p>
        )}
      </div>

      {/* Override Counter */}
      <div className="px-4 py-2 border-b border-game-border flex items-center justify-between">
        <span className="stat-label">{t.is ? 'overrides' : 'OVERRIDES'}</span>
        <div className="flex gap-1 items-center">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={`w-3 h-3 rounded-sm border ${
                i < overrideCount
                  ? 'bg-game-red border-game-red'
                  : 'bg-transparent border-game-border'
              }`}
            />
          ))}
          {overrideCount >= 3 && (
            <span className="text-game-amber font-mono text-xs ml-1">
              {t.is ? 'adapted' : 'ADAPTED'}
            </span>
          )}
        </div>
      </div>

      {/* Handoff */}
      {mode === 'copilot' && (
        <div className="px-4 py-3 border-b border-game-border">
          <button
            onClick={handleHandoff}
            disabled={!nodes.length || isThinking}
            className={`w-full py-2 ${t.btn.warn} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {isThinking
              ? (t.is ? '⟳ AI working…'           : '⟳ AI WORKING...')
              : (t.is ? '⤵ Handoff segment to AI' : '⤵ HANDOFF SEGMENT TO AI')}
          </button>
          <p className="text-game-muted font-mono text-xs mt-1.5 text-center">
            {t.is ? 'Surrender a sub-tour to the AI' : 'Surrender a sub-tour to the AI'}
          </p>
        </div>
      )}

      {/* Reasoning Log */}
      <div className="flex-1 overflow-hidden flex flex-col px-4 py-3">
        <span className="stat-label block mb-2">{t.is ? 'reasoning feed' : 'REASONING FEED'}</span>

        {/* ── Node Map Popup — custom source only ── */}
        {nodeSource === 'custom' && customNodeNames.length > 0 && (
          <NodeMapPopup
            names={customNodeNames}
            coords={customRawCoords}
            nodes={nodes}
            t={t}
          />
        )}

        <div className="flex-1 overflow-y-auto space-y-1.5">
          {reasoningLog.map((entry, i) => (
            <div
              key={entry.id}
              className="flex items-start gap-2 font-mono text-xs animate-fade-in"
              style={{ opacity: 1 - i * 0.07 }}
            >
              <span className={logColor(entry.type)}>
                {entry.type === 'suggest' ? '▶' : entry.type === 'warn' ? '⚠' : entry.type === 'success' ? '✓' : '·'}
              </span>
              <span className="text-game-text leading-relaxed">{entry.text}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

// ── NodeMapPopup ───────────────────────────────────────────────────────────
// Shows the auto-generated name → coordinate mapping for custom node sets.
// Dismissable via × button; re-opens automatically when a new game spawns.
function NodeMapPopup({ names, coords, nodes, t }) {
  const [dismissed, setDismissed] = useState(false)

  // Re-show whenever the node set changes (new game started)
  useEffect(() => {
    setDismissed(false)
  }, [nodes.length])

  if (dismissed) {
    return (
      <button
        onClick={() => setDismissed(false)}
        style={{
          display:       'flex',
          alignItems:    'center',
          gap:           '0.35rem',
          marginBottom:  '0.5rem',
          padding:       '0.25rem 0.6rem',
          borderRadius:  '0.375rem',
          border:        '1px solid var(--color-border)',
          background:    'transparent',
          color:         'var(--color-muted)',
          fontFamily:    'var(--font-mono)',
          fontSize:      '0.58rem',
          cursor:        'pointer',
          letterSpacing: t.is ? '0.02em' : '0.06em',
        }}
      >
        📋 {t.is ? `Show node map (${names.length} nodes)` : `SHOW NODE MAP (${names.length} NODES)`}
      </button>
    )
  }

  return (
    <div
      style={{
        marginBottom:  '0.75rem',
        borderRadius:  '0.5rem',
        border:        '1px solid var(--color-border)',
        background:    t.is
          ? 'rgba(45,106,79,0.06)'
          : 'rgba(0,229,255,0.04)',
        overflow:      'hidden',
        flexShrink:    0,
      }}
    >
      {/* Header */}
      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '0.4rem 0.65rem',
          borderBottom:   '1px solid var(--color-border)',
          background:     t.is
            ? 'rgba(45,106,79,0.10)'
            : 'rgba(0,229,255,0.06)',
        }}
      >
        <span
          style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      '0.6rem',
            fontWeight:    700,
            color:         'var(--color-primary)',
            letterSpacing: t.is ? '0.03em' : '0.1em',
          }}
        >
          {t.is ? `📋 Node map — ${names.length} custom nodes` : `📋 NODE MAP — ${names.length} CUSTOM NODES`}
        </span>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background:    'none',
            border:        'none',
            color:         'var(--color-muted)',
            cursor:        'pointer',
            fontSize:      '0.85rem',
            lineHeight:    1,
            padding:       '0 0.1rem',
            fontWeight:    700,
          }}
          title="Dismiss"
        >
          ×
        </button>
      </div>

      {/* Scrollable table */}
      <div
        style={{
          maxHeight:        '140px',
          overflowY:        'auto',
          padding:          '0.4rem 0.65rem',
          display:          'flex',
          flexDirection:    'column',
          gap:              '0.2rem',
        }}
      >
        {names.map((name, i) => (
          <div
            key={i}
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              fontFamily:     'var(--font-mono)',
              fontSize:       '0.62rem',
              lineHeight:     1.6,
              borderBottom:   i < names.length - 1
                ? '1px solid var(--color-border)'
                : 'none',
              paddingBottom:  i < names.length - 1 ? '0.15rem' : 0,
            }}
          >
            {/* Node badge */}
            <span
              style={{
                color:         'var(--color-primary)',
                fontWeight:    700,
                minWidth:      '2.8rem',
              }}
            >
              {name}
            </span>

            {/* Raw coords */}
            <span style={{ color: 'var(--color-muted)' }}>
              ({coords[i]?.x ?? '?'}, {coords[i]?.y ?? '?'})
            </span>

            {/* Arrow */}
            <span style={{ color: 'var(--color-border)', margin: '0 0.35rem' }}>→</span>

            {/* Node index label */}
            <span style={{ color: 'var(--color-text)', opacity: 0.7 }}>
              {t.is ? `node ${i}` : `NODE ${i}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
