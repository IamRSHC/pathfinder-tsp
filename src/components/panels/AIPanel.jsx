import { useAiStore }  from '../../stores/aiStore'
import { useGameStore } from '../../stores/gameStore'
import { useUiStore }   from '../../stores/uiStore'

export default function AIPanel({ className = '' }) {
  const {
    confidence, suggestion, overrideCount,
    isThinking, reasoningLog,
    acceptSuggestion, rejectSuggestion, handoffSegment,
  } = useAiStore()
  const { nodes, humanEdges, mode } = useGameStore()
  const { showNotification } = useUiStore()

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

  return (
    <div className={`flex flex-col h-full bg-game-surface border-l border-game-border ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-game-border">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isThinking ? 'bg-game-amber animate-pulse' : 'bg-game-green'}`} />
          <span className="font-display font-semibold text-sm text-game-text tracking-wider">
            AI CO-PILOT
          </span>
        </div>
        <span className="font-mono text-xs text-game-muted">
          {/* TODO: INTEGRATE AI MODEL — show model name */}
          MOCK ENGINE
        </span>
      </div>

      {/* Confidence Meter */}
      <div className="px-4 py-3 border-b border-game-border">
        <div className="flex justify-between items-center mb-1.5">
          <span className="stat-label">CONFIDENCE</span>
          <span className={`font-mono font-bold text-sm ${confidenceColor}`}>
            {confidence}%
          </span>
        </div>
        <div className="h-2 bg-game-bg rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${confidence}%`,
              background: confidence >= 70
                ? 'linear-gradient(90deg, #00e676, #00e5ff)'
                : confidence >= 40
                ? 'linear-gradient(90deg, #ffab00, #ff6d00)'
                : 'linear-gradient(90deg, #ff1744, #ff6d00)',
            }}
          />
        </div>
        {confidence < 40 && (
          <p className="text-game-amber font-mono text-xs mt-1.5">
            ⚠ Low confidence — your input needed
          </p>
        )}
      </div>

      {/* Current Suggestion */}
      <div className="px-4 py-3 border-b border-game-border">
        <span className="stat-label block mb-2">CURRENT SUGGESTION</span>
        {isThinking ? (
          <div className="flex items-center gap-2 text-game-amber font-mono text-xs animate-pulse">
            <span>●●●</span><span>Computing...</span>
          </div>
        ) : suggestion ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-mono text-sm">
              <span className="text-game-text">Node</span>
              <span className="text-game-cyan font-bold">{suggestion.from}</span>
              <span className="text-game-muted">→</span>
              <span className="text-game-amber font-bold">{suggestion.to}</span>
              <span className="text-game-green text-xs ml-auto">-{suggestion.saving}%</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAccept}
                className="flex-1 py-1.5 text-xs font-mono font-bold rounded
                  bg-game-cyan/10 border border-game-cyan/40 text-game-cyan
                  hover:bg-game-cyan/20 transition-colors"
              >
                ACCEPT
              </button>
              <button
                onClick={handleReject}
                className="flex-1 py-1.5 text-xs font-mono font-bold rounded
                  bg-game-red/10 border border-game-red/40 text-game-red
                  hover:bg-game-red/20 transition-colors"
              >
                OVERRIDE
              </button>
            </div>
          </div>
        ) : (
          <p className="text-game-muted font-mono text-xs">
            Connect nodes to receive suggestions
          </p>
        )}
      </div>

      {/* Override Counter */}
      <div className="px-4 py-2 border-b border-game-border flex items-center justify-between">
        <span className="stat-label">OVERRIDES</span>
        <div className="flex gap-1">
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
            <span className="text-game-amber font-mono text-xs ml-1">ADAPTED</span>
          )}
        </div>
      </div>

      {/* Handoff */}
      {mode === 'copilot' && (
        <div className="px-4 py-3 border-b border-game-border">
          <button
            onClick={handleHandoff}
            disabled={!nodes.length || isThinking}
            className="w-full py-2 font-mono text-xs font-bold rounded
              bg-game-amber/10 border border-game-amber/40 text-game-amber
              hover:bg-game-amber/20 disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors"
          >
            {isThinking ? '⟳ AI WORKING...' : '⤵ HANDOFF SEGMENT TO AI'}
          </button>
          <p className="text-game-muted font-mono text-xs mt-1.5 text-center">
            Surrender a sub-tour to the AI
          </p>
        </div>
      )}

      {/* Reasoning Log */}
      <div className="flex-1 overflow-hidden flex flex-col px-4 py-3">
        <span className="stat-label block mb-2">REASONING FEED</span>
        <div className="flex-1 overflow-y-auto space-y-1.5">
          {reasoningLog.map((entry, i) => (
            <div
              key={entry.id}
              className="flex items-start gap-2 font-mono text-xs animate-fade-in"
              style={{ opacity: 1 - i * 0.07 }}
            >
              <span className={
                entry.type === 'suggest' ? 'text-game-cyan' :
                entry.type === 'warn'    ? 'text-game-amber' :
                entry.type === 'success' ? 'text-game-green' : 'text-game-muted'
              }>
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