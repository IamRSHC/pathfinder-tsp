import { useState, useEffect } from 'react'
import { useAiStore }   from '../../stores/aiStore'
import { useGameStore } from '../../stores/gameStore'
import { useUiStore }   from '../../stores/uiStore'
import { useTheme }     from '../../hooks/useTheme'

export default function AIPanel({ className = '' }) {
  const {
    confidence, suggestion, overrideCount, isThinking,
    reasoningLog, acoPhase, acoIteration, acoMaxIter,
    aiPathLength, nnLength, pheromoneEdges,
    acceptSuggestion, rejectSuggestion, handoffSegment,
    revealedCount, aiStartNode,
  } = useAiStore()
  const { nodes, humanEdges, mode } = useGameStore()
  const { showNotification, theme } = useUiStore()
  const t = useTheme()

  const confidenceColor =
    confidence >= 70 ? 'text-game-green' :
    confidence >= 40 ? 'text-game-amber' : 'text-game-red'

  // ACO progress 0–1
  const acoProgress = acoMaxIter > 0 ? Math.min(1, acoIteration / acoMaxIter) : 0
  const acoPercent  = Math.round(acoProgress * 100)

  // Improvement over NN baseline (shown when ACO has improved)
  const improvementPct = nnLength > 0 && aiPathLength > 0 && aiPathLength < nnLength
    ? Math.round((1 - aiPathLength / nnLength) * 100)
    : 0

  // Pheromone summary
  const hotEdges    = pheromoneEdges.filter(p => p.strength >= 0.7).length
  const totalPhero  = pheromoneEdges.length

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

  // Phase label
  const phaseLabel =
    acoPhase === 'idle'    ? (t.is ? 'standby'         : 'STANDBY') :
    acoPhase === 'running' ? (t.is ? 'ACO optimising…' : 'ACO OPTIMISING…') :
                             (t.is ? 'ACO converged'   : 'ACO CONVERGED')

  const engineLabel = t.is ? 'NN + 2-Opt · ACO' : 'NN + 2-OPT · ACO'

  return (
    <div className={`flex flex-col h-full bg-game-surface border-l border-game-border ${className}`}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-game-border">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            acoPhase === 'running' ? 'bg-game-amber animate-pulse' :
            acoPhase === 'done'   ? 'bg-game-green' : 'bg-game-muted'
          }`} />
          <span className={t.header}>{t.is ? 'AI Co-Pilot' : 'AI CO-PILOT'}</span>
        </div>
        <span className="font-mono text-xs text-game-muted">{engineLabel}</span>
      </div>

      {/* ── ACO Phase + Progress ── */}
      <div className="px-4 py-3 border-b border-game-border space-y-2">
        {/* Phase row */}
        <div className="flex items-center justify-between">
          <span className="stat-label">{t.is ? 'phase' : 'PHASE'}</span>
          <span className={`font-mono text-xs font-bold ${
            acoPhase === 'running' ? 'text-game-amber' :
            acoPhase === 'done'   ? 'text-game-green' : 'text-game-muted'
          }`}>
            {phaseLabel}
          </span>
        </div>

        {/* ACO progress bar */}
        {acoPhase !== 'idle' && (
          <div>
            <div className="h-1.5 rounded-full overflow-hidden bg-game-border/30">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  acoPhase === 'done' ? 'bg-game-green' : 'bg-game-amber'
                }`}
                style={{ width: acoPhase === 'done' ? '100%' : `${Math.max(3, acoPercent)}%` }}
              />
            </div>
            {acoPhase === 'running' && (
              <div className="flex justify-between mt-1">
                <span className="font-mono text-game-muted" style={{ fontSize: '0.58rem' }}>
                  {t.is ? `iter ${acoIteration}` : `ITER ${acoIteration}`}
                </span>
                <span className="font-mono text-game-muted" style={{ fontSize: '0.58rem' }}>
                  {acoPercent}%
                </span>
              </div>
            )}
          </div>
        )}

        {/* AI moves revealed counter (copilot / VS modes only) — chess-style progress */}
        {mode !== 'solo' && (
          <div className="space-y-1">
            {aiStartNode >= 0 && (
              <div className="flex justify-between items-center">
                <span className="font-mono text-game-muted" style={{ fontSize: '0.6rem' }}>
                  {t.is ? 'ai start node' : 'AI START NODE'}
                </span>
                <span className="font-mono text-xs font-bold text-game-green">
                  ★ {aiStartNode} <span className="text-game-muted font-normal" style={{ fontSize: '0.6rem' }}>(same as you)</span>
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="font-mono text-game-muted" style={{ fontSize: '0.6rem' }}>
                {t.is ? 'ai moves revealed' : 'AI MOVES REVEALED'}
              </span>
              <span className={`font-mono text-xs font-bold ${revealedCount > 0 ? 'text-game-amber' : 'text-game-muted'}`}>
                {revealedCount}
              </span>
            </div>
          </div>
        )}

        {/* Path quality rows — hidden in Solo mode to prevent solution spoilers */}
        {nnLength > 0 && mode !== 'solo' && (
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-mono text-game-muted" style={{ fontSize: '0.6rem' }}>
                {t.is ? 'nn+2-opt baseline' : 'NN+2-OPT BASELINE'}
              </span>
              <span className="font-mono text-game-muted text-xs">{nnLength}</span>
            </div>
            {aiPathLength > 0 && aiPathLength !== nnLength && (
              <div className="flex justify-between items-center">
                <span className="font-mono" style={{ fontSize: '0.6rem', color: 'var(--color-primary)' }}>
                  {t.is ? 'aco best' : 'ACO BEST'}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-game-green text-xs font-bold">
                    {aiPathLength}
                  </span>
                  {improvementPct > 0 && (
                    <span className="font-mono text-game-green" style={{ fontSize: '0.6rem' }}>
                      −{improvementPct}%
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Confidence Meter ── */}
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
            ⚠ {t.is ? 'Low confidence — your input needed' : 'LOW CONFIDENCE — YOUR INPUT NEEDED'}
          </p>
        )}
      </div>

      {/* ── Pheromone Map Summary ── */}
      {totalPhero > 0 && (
        <div className="px-4 py-2.5 border-b border-game-border">
          <div className="flex justify-between items-center mb-1.5">
            <span className="stat-label">{t.is ? 'pheromone map' : 'PHEROMONE MAP'}</span>
            <span className="font-mono text-xs text-game-muted">{totalPhero} trails</span>
          </div>
          {/* Mini pheromone strength bar */}
          <div className="flex gap-0.5 h-2">
            {Array.from({ length: 20 }, (_, i) => {
              const threshold = 1 - (i / 20)
              const count = pheromoneEdges.filter(p => p.strength >= threshold).length
              const filled = count > 0
              return (
                <div
                  key={i}
                  className="flex-1 rounded-sm"
                  style={{
                    background: filled
                      ? (theme === 'serene'
                        ? `rgba(181,131,141,${0.3 + (1 - threshold) * 0.7})`
                        : `rgba(255,171,0,${0.3 + (1 - threshold) * 0.7})`)
                      : 'var(--color-border)',
                    opacity: filled ? 1 : 0.3,
                  }}
                />
              )
            })}
          </div>
          {hotEdges > 0 && (
            <p className="font-mono text-game-green mt-1" style={{ fontSize: '0.58rem' }}>
              {t.is ? `${hotEdges} high-confidence trails` : `${hotEdges} HIGH-CONFIDENCE TRAILS`}
            </p>
          )}
        </div>
      )}

      {/* ── Current Suggestion ── */}
      <div className="px-4 py-3 border-b border-game-border">
        <span className="stat-label block mb-2">{t.is ? 'current suggestion' : 'CURRENT SUGGESTION'}</span>
        {isThinking && !suggestion ? (
          <div className="flex items-center gap-2 text-game-amber font-mono text-xs animate-pulse">
            <span>●●●</span><span>{t.is ? 'Computing…' : 'Computing...'}</span>
          </div>
        ) : suggestion ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-mono text-sm">
              <span className="text-game-text">Node</span>
              <span className={`${t.primary.text} font-bold`}>{suggestion.from}</span>
              <span className="text-game-muted">→</span>
              <span className={`${t.secondary.text} font-bold`}>{suggestion.to}</span>
              <span className="text-game-green text-xs ml-auto">−{suggestion.saving}%</span>
            </div>
            {suggestion.reason === 'pheromone' && (
              <p className="font-mono text-xs" style={{ color: 'var(--color-primary)', opacity: 0.7 }}>
                {t.is ? '🐜 pheromone-guided' : '🐜 PHEROMONE-GUIDED'}
              </p>
            )}
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

      {/* ── Override Counter ── */}
      <div className="px-4 py-2 border-b border-game-border flex items-center justify-between">
        <span className="stat-label">{t.is ? 'overrides' : 'OVERRIDES'}</span>
        <div className="flex gap-1 items-center">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={`w-3 h-3 rounded-sm border ${
                i < overrideCount ? 'bg-game-red border-game-red' : 'bg-transparent border-game-border'
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

      {/* ── Handoff (co-pilot only) ── */}
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

      {/* ── Reasoning Log ── */}
      <div className="flex-1 overflow-hidden flex flex-col px-4 py-3">
        <span className="stat-label block mb-2">{t.is ? 'reasoning feed' : 'REASONING FEED'}</span>
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