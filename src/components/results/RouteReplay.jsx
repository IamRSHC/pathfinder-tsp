import { MOCK_REPLAY_MOVES } from '../../utils/mockAI'
import { useTheme }          from '../../hooks/useTheme'

export default function RouteReplay() {
  const t = useTheme()

  return (
    <div className={`${t.card} p-5`}>
      <h3 className={`${t.sectionTitle} mb-4`}>
        {t.is ? 'Route Replay' : 'ROUTE REPLAY'}
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {MOCK_REPLAY_MOVES.map(move => (
          <div
            key={move.step}
            className={t.pill(move.actor === 'Human' ? 'human' : 'ai')}
          >
            <span>{move.actor === 'Human' ? '◈' : '◆'}</span>
            <span>{move.from}→{move.to}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-4">
        <div className={`flex items-center gap-2 font-mono text-xs ${t.primary.text}`}>
          <span>◈</span><span>{t.is ? 'Human moves' : 'Human moves'}</span>
        </div>
        <div className={`flex items-center gap-2 font-mono text-xs ${t.secondary.text}`}>
          <span>◆</span><span>{t.is ? 'AI moves' : 'AI moves'}</span>
        </div>
      </div>
    </div>
  )
}
