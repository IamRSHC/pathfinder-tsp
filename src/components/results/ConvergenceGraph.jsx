import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { MOCK_CONVERGENCE } from '../../utils/mockAI'

export default function ConvergenceGraph() {
  return (
    <div className="bg-game-surface border border-game-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-game-text tracking-wider">
          GLOBAL CONVERGENCE
        </h3>
        <span className="font-mono text-xs text-game-muted">Seed: ALPHA-7 · 1,842 players</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={MOCK_CONVERGENCE} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
          <CartesianGrid stroke="#1a2540" strokeDasharray="4 4" />
          <XAxis
            dataKey="round"
            tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: '#4a5568' }}
            label={{ value: 'Round', position: 'insideBottom', offset: -2, fill: '#4a5568', fontSize: 10 }}
          />
          <YAxis tick={{ fontFamily: 'JetBrains Mono', fontSize: 10, fill: '#4a5568' }} />
          <Tooltip
            contentStyle={{
              background: '#0f1623', border: '1px solid #1a2540',
              fontFamily: 'JetBrains Mono', fontSize: 11,
            }}
          />
          <Legend wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: 11 }} />
          <Line type="monotone" dataKey="best"    stroke="#00e5ff" strokeWidth={2} dot={false} name="Human+AI Best" />
          <Line type="monotone" dataKey="average" stroke="#4a5568" strokeWidth={1} dot={false} name="Average"       />
          <Line type="monotone" dataKey="aiOnly"  stroke="#ffab00" strokeWidth={1.5} dot={false} strokeDasharray="5 3" name="AI Only" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}