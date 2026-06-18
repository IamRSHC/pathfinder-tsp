import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useGameStore } from '../../stores/gameStore'
import { useAiStore }   from '../../stores/aiStore'
import { useTheme }     from '../../hooks/useTheme'

export default function CollaborationScore() {
  const { humanEdges, aiEdges, moveHistory, humanScore, aiScore, mode } = useGameStore()
  const { overrideCount } = useAiStore()
  const t = useTheme()

  const humanCount = humanEdges.length
  const aiCount    = aiEdges.length
  const total      = humanCount + aiCount || 1

  const humanColor = t.is ? '#2D6A4F' : '#00e5ff'
  const aiColor    = t.is ? '#B5838D' : '#ffab00'

  const data = [
    { name: 'Human', value: humanCount, color: humanColor },
    { name: 'AI',    value: aiCount,    color: aiColor    },
  ]

  const conflicts = overrideCount
  const handoffs  = moveHistory.filter(m => m.type === 'ai').length
  const humanPct  = Math.round((humanCount / total) * 100)

  // Score delta for co-pilot mode
  const scoreDelta = humanScore - aiScore

  return (
    <div className={`${t.card} p-5`}>
      <h3 className={`${t.sectionTitle} mb-4`}>
        {t.is ? 'Collaboration Breakdown' : 'COLLABORATION BREAKDOWN'}
      </h3>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="w-40 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%" cy="50%"
                innerRadius={45} outerRadius={65}
                dataKey="value" strokeWidth={0}
              >
                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={t.chartTooltip} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-3">
          <Stat label={t.is ? 'Human contribution' : 'HUMAN CONTRIBUTION'} value={`${humanPct}%`}    color={t.primary.text}   t={t} />
          <Stat label={t.is ? 'AI contribution'    : 'AI CONTRIBUTION'}    value={`${100-humanPct}%`} color={t.secondary.text} t={t} />
          <Stat label={t.is ? 'Overrides'          : 'OVERRIDES'}          value={conflicts}          color="text-game-red"    t={t} />
          <Stat label={t.is ? 'Handoffs'           : 'HANDOFFS'}           value={handoffs}           color="text-game-green"  t={t} />
          {/* Score delta in co-pilot and vs modes */}
          {(mode === 'copilot' || mode === 'vs') && humanScore > 0 && (
            <Stat
              label={t.is ? 'Score vs AI' : 'SCORE VS AI'}
              value={scoreDelta >= 0
                ? `+${scoreDelta.toLocaleString()}`
                : scoreDelta.toLocaleString()}
              color={scoreDelta >= 0 ? 'text-game-green' : 'text-game-red'}
              t={t}
            />
          )}
        </div>
      </div>

      {/* What the AI learned */}
      <div className="mt-4 p-3 bg-game-bg rounded border border-game-border">
        <span className="stat-label block mb-1">
          {t.is ? 'what the AI learned' : 'WHAT THE AI LEARNED'}
        </span>
        {/* TODO: INTEGRATE AI MODEL — generate real insight */}
        <p className="font-mono text-xs text-game-text leading-relaxed">
          Your routing through the upper-left cluster was 14% more efficient than the AI's
          nearest-neighbor pass. The diagonal skip at nodes {Math.floor(Math.random()*10)+5}→
          {Math.floor(Math.random()*10)+15} was novel — flagged for model retraining.
        </p>
      </div>
    </div>
  )
}

function Stat({ label, value, color, t }) {
  return (
    <div className="flex items-center justify-between border-b border-game-border/40 pb-1">
      <span className="stat-label">{label}</span>
      <span className={`font-mono font-bold text-sm ${color}`}>{value}</span>
    </div>
  )
}
