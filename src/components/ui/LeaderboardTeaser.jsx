import { MOCK_LEADERBOARD } from '../../utils/mockAI'
import { useTheme }         from '../../hooks/useTheme'

export default function LeaderboardTeaser() {
  const t = useTheme()

  const modeColor = (mode) => {
    if (mode === 'Co-Pilot') return t.primary.text
    if (mode === 'Solo')     return 'text-game-green'
    return t.secondary.text
  }

  return (
    <div className="rounded-lg border border-game-border bg-game-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <span className={t.header}>
          {t.is ? 'Global Leaderboard' : 'GLOBAL LEADERBOARD'}
        </span>
        <span className="font-mono text-xs text-game-muted">
          {t.is ? 'Seed: Alpha-7' : 'SEED: ALPHA-7'}
        </span>
      </div>
      <div className="space-y-2">
        {MOCK_LEADERBOARD.map(entry => (
          <div
            key={entry.rank}
            className="flex items-center gap-3 font-mono text-xs py-1
              border-b border-game-border/40 last:border-0"
          >
            <span className={`w-5 font-bold ${
              entry.rank === 1 ? 'text-game-amber' :
              entry.rank === 2 ? 'text-game-text'  :
              entry.rank === 3 ? 'text-game-amber/60' : 'text-game-muted'
            }`}>
              #{entry.rank}
            </span>
            <span className="flex-1 text-game-text truncate">{entry.name}</span>
            <span className={`${modeColor(entry.mode)} text-xs`}>{entry.mode}</span>
            <span className="text-game-green">{entry.gap}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
