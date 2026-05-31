import { MOCK_REPLAY_MOVES } from '../../utils/mockAI'

export default function RouteReplay() {
  return (
    <div className="bg-game-surface border border-game-border rounded-lg p-5">
      <h3 className="font-display font-semibold text-game-text tracking-wider mb-4">
        ROUTE REPLAY
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {MOCK_REPLAY_MOVES.map(move => (
          <div
            key={move.step}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border font-mono text-xs
              ${move.actor === 'Human'
                ? 'border-game-cyan/40  bg-game-cyan/5  text-game-cyan'
                : 'border-game-amber/40 bg-game-amber/5 text-game-amber'
              }`}
          >
            <span>{move.actor === 'Human' ? '◈' : '◆'}</span>
            <span>{move.from}→{move.to}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-4">
        <div className="flex items-center gap-2 font-mono text-xs text-game-cyan">
          <span>◈</span><span>Human moves</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-game-amber">
          <span>◆</span><span>AI moves</span>
        </div>
      </div>
    </div>
  )
}