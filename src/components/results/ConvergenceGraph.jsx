import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { MOCK_CONVERGENCE } from '../../utils/mockAI'
import { useTheme }         from '../../hooks/useTheme'

export default function ConvergenceGraph() {
  const t = useTheme()

  const humanAiColor = t.is ? '#2D6A4F' : '#00e5ff'
  const averageColor = t.is ? '#C4BBB5' : '#4a5568'
  const aiOnlyColor  = t.is ? '#B5838D' : '#ffab00'

  return (
    <div className={`${t.card} p-5`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={t.sectionTitle}>
          {t.is ? 'Global Convergence' : 'GLOBAL CONVERGENCE'}
        </h3>
        <span className="font-mono text-xs text-game-muted">
          {t.is ? 'Seed: Alpha-7 · 1,842 players' : 'Seed: ALPHA-7 · 1,842 players'}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={MOCK_CONVERGENCE} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
          <CartesianGrid stroke={t.chartGrid} strokeDasharray="4 4" />
          <XAxis
            dataKey="round"
            tick={{ fontFamily: t.is ? 'DM Mono' : 'JetBrains Mono', fontSize: 10, fill: t.chartTick }}
            label={{ value: 'Round', position: 'insideBottom', offset: -2, fill: t.chartTick, fontSize: 10 }}
          />
          <YAxis
            tick={{ fontFamily: t.is ? 'DM Mono' : 'JetBrains Mono', fontSize: 10, fill: t.chartTick }}
          />
          <Tooltip contentStyle={t.chartTooltip} />
          <Legend wrapperStyle={{ fontFamily: t.is ? 'DM Mono' : 'JetBrains Mono', fontSize: 11 }} />
          <Line
            type="monotone" dataKey="best"
            stroke={humanAiColor} strokeWidth={2} dot={false}
            name={t.is ? 'Human + AI Best' : 'Human+AI Best'}
          />
          <Line
            type="monotone" dataKey="average"
            stroke={averageColor} strokeWidth={1} dot={false}
            name={t.is ? 'Average' : 'Average'}
          />
          <Line
            type="monotone" dataKey="aiOnly"
            stroke={aiOnlyColor} strokeWidth={1.5} dot={false}
            strokeDasharray="5 3"
            name={t.is ? 'AI Only' : 'AI Only'}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
