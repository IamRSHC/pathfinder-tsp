import { MOCK_LEADERBOARD } from '../../utils/mockAI'

export default function LeaderboardTeaser() {
  return (
    <div className="rounded-lg border border-game-border bg-game-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-display font-semibold text-sm text-game-text tracking-wider">
          GLOBAL LEADERBOARD
        </span>
        <span className="font-mono text-xs text-game-muted">SEED: ALPHA-7</span>
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
            <span className={`${
              entry.mode === 'Co-Pilot' ? 'text-game-cyan' :
              entry.mode === 'Solo'     ? 'text-game-green' : 'text-game-amber'
            } text-xs`}>
              {entry.mode}
            </span>
            <span className="text-game-green">{entry.gap}</span>
          </div>
        ))}
      </div>
    </div>
  )
}