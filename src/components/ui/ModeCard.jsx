export default function ModeCard({ mode, selected, onClick }) {
  const config = {
    solo: {
      icon:    '⚡',
      label:   'SOLO RUN',
      desc:    'You vs. the TSP. Raw human intuition, no AI assist.',
      color:   'game-green',
      border:  selected ? 'border-game-green shadow-[0_0_20px_#00e67633]' : 'border-game-border',
    },
    copilot: {
      icon:    '🤝',
      label:   'CO-PILOT',
      desc:    'You + AI collaborate. Neither solves it alone.',
      color:   'game-cyan',
      border:  selected ? 'border-game-cyan shadow-[0_0_20px_#00e5ff33]' : 'border-game-border',
    },
    vs: {
      icon:    '⚔️',
      label:   'VS AI',
      desc:    'Build your path. AI builds its own. Best route wins.',
      color:   'game-amber',
      border:  selected ? 'border-game-amber shadow-[0_0_20px_#ffab0033]' : 'border-game-border',
    },
  }[mode]

  return (
    <button
      onClick={() => onClick(mode)}
      className={`mode-card flex flex-col items-start p-5 rounded-lg border-2
        bg-game-surface text-left w-full transition-all duration-200
        ${config.border}`}
    >
      <span className="text-3xl mb-3">{config.icon}</span>
      <span className={`font-display font-bold text-lg text-${config.color} tracking-wider`}>
        {config.label}
      </span>
      <span className="font-mono text-xs text-game-muted mt-1 leading-relaxed">
        {config.desc}
      </span>
      {selected && (
        <span className={`mt-3 text-xs font-mono font-bold text-${config.color}
          border border-${config.color}/40 px-2 py-0.5 rounded`}>
          SELECTED
        </span>
      )}
    </button>
  )
}