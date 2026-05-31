import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useGameStore } from '../../stores/gameStore'
import { useAiStore }   from '../../stores/aiStore'

export default function CollaborationScore() {
  const { humanEdges, aiEdges, moveHistory } = useGameStore()
  const { overrideCount } = useAiStore()

  const humanCount = humanEdges.length
  const aiCount    = aiEdges.length
  const total      = humanCount + aiCount || 1

  const data = [
    { name: 'Human', value: humanCount, color: '#00e5ff' },
    { name: 'AI',    value: aiCount,    color: '#ffab00' },
  ]

  const conflicts   = overrideCount
  const handoffs    = moveHistory.filter(m => m.type === 'ai').length
  const humanPct    = Math.round((humanCount / total) * 100)

  return (
    <div className="bg-game-surface border border-game-border rounded-lg p-5">
      <h3 className="font-display font-semibold text-game-text tracking-wider mb-4">
        COLLABORATION BREAKDOWN
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
              <Tooltip
                contentStyle={{ background: '#0f1623', border: '1px solid #1a2540', fontFamily: 'JetBrains Mono' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-3">
          <Stat label="HUMAN CONTRIBUTION" value={`${humanPct}%`}    color="text-game-cyan"  />
          <Stat label="AI CONTRIBUTION"    value={`${100-humanPct}%`} color="text-game-amber" />
          <Stat label="OVERRIDES"          value={conflicts}          color="text-game-red"   />
          <Stat label="HANDOFFS"           value={handoffs}           color="text-game-green" />
        </div>
      </div>
      {/* What the AI learned */}
      <div className="mt-4 p-3 bg-game-bg rounded border border-game-border">
        <span className="stat-label block mb-1">WHAT THE AI LEARNED</span>
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

function Stat({ label, value, color }) {
  return (
    <div className="flex items-center justify-between border-b border-game-border/40 pb-1">
      <span className="stat-label">{label}</span>
      <span className={`font-mono font-bold text-sm ${color}`}>{value}</span>
    </div>
  )
}