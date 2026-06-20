import { useTheme } from '../../hooks/useTheme'

export default function ModeCard({ mode, selected, onClick, dense = false, fill = false }) {
  const t = useTheme()

  const config = {
    solo: {
      icon:    '⚡',
      labelC:  'SOLO RUN',
      labelS:  'Solo Run',
      desc:    'You vs. the TSP. Raw human intuition, no AI assist.',
      color:   'text-game-green',
      badgeC:  'SELECTED',
      badgeS:  'Selected',
      selectedBorder: t.is
        ? `border-[rgba(58,125,91,0.5)] ${t.success.bg}`
        : 'border-game-green shadow-[0_0_20px_#00e67633]',
      badgeCls: t.is
        ? `${t.success.border} ${t.success.bg}`
        : 'border-game-green/40',
    },
    copilot: {
      icon:    '🤝',
      labelC:  'CO-PILOT',
      labelS:  'Co-Pilot',
      desc:    'You + AI collaborate. Neither solves it alone.',
      color:   t.primary.text,
      badgeC:  'SELECTED',
      badgeS:  'Selected',
      selectedBorder: t.is
        ? `${t.primary.ring} ${t.primary.subtle}`
        : 'border-game-cyan shadow-[0_0_20px_#00e5ff33]',
      badgeCls: t.is
        ? `${t.primary.border} ${t.primary.bg}`
        : 'border-game-cyan/40',
    },
    vs: {
      icon:    '⚔️',
      labelC:  'VS AI',
      labelS:  'Vs AI',
      desc:    'Build your path. AI builds its own. Best route wins.',
      color:   t.secondary.text,
      badgeC:  'SELECTED',
      badgeS:  'Selected',
      selectedBorder: t.is
        ? `${t.secondary.border} ${t.secondary.subtle}`
        : 'border-game-amber shadow-[0_0_20px_#ffab0033]',
      badgeCls: t.is
        ? `${t.secondary.border} ${t.secondary.bg}`
        : 'border-game-amber/40',
    },
  }[mode]

  if (fill) {
    return (
      <button
        onClick={() => onClick(mode)}
        className={`flex items-center gap-3 px-3 rounded-lg border-2
          bg-game-surface text-left w-full transition-all duration-200
          ${selected ? config.selectedBorder : 'border-game-border'}
          ${selected && t.is ? 'mode-card-selected' : ''}`}
        style={{ flex: 1, minHeight: 0 }}
      >
        <span className="text-2xl flex-shrink-0">{config.icon}</span>
        <span className="flex-1 min-w-0">
          <span className={`block font-display font-bold text-base ${config.color} ${t.is ? '' : 'tracking-wider'}`}>
            {t.is ? config.labelS : config.labelC}
          </span>
          <span className="block font-mono text-[0.68rem] text-game-muted leading-snug mt-0.5">
            {config.desc}
          </span>
        </span>
        {selected && (
          <span className={`flex-shrink-0 text-base font-bold ${config.color}`} aria-hidden="true">
            ✓
          </span>
        )}
      </button>
    )
  }

  if (dense) {
    return (
      <button
        onClick={() => onClick(mode)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border-2
          bg-game-surface text-left w-full transition-all duration-200
          ${selected ? config.selectedBorder : 'border-game-border'}
          ${selected && t.is ? 'mode-card-selected' : ''}`}
      >
        <span className="text-xl flex-shrink-0">{config.icon}</span>
        <span className="flex-1 min-w-0">
          <span className={`block font-display font-bold text-sm ${config.color} ${t.is ? '' : 'tracking-wider'}`}>
            {t.is ? config.labelS : config.labelC}
          </span>
          <span className="block font-mono text-[0.65rem] text-game-muted leading-snug truncate">
            {config.desc}
          </span>
        </span>
        {selected && (
          <span className={`flex-shrink-0 text-xs font-bold ${config.color}`} aria-hidden="true">
            ✓
          </span>
        )}
      </button>
    )
  }

  return (
    <button
      onClick={() => onClick(mode)}
      className={`mode-card flex flex-col items-start p-5 rounded-lg border-2
        bg-game-surface text-left w-full transition-all duration-200
        ${selected ? config.selectedBorder : 'border-game-border'}
        ${selected && t.is ? 'mode-card-selected' : ''}`}
    >
      <span className="text-3xl mb-3">{config.icon}</span>
      <span className={`font-display font-bold text-lg ${config.color} ${t.is ? '' : 'tracking-wider'}`}>
        {t.is ? config.labelS : config.labelC}
      </span>
      <span className="font-mono text-xs text-game-muted mt-1 leading-relaxed">
        {config.desc}
      </span>
      {selected && (
        <span className={`mt-3 text-xs font-mono font-bold ${config.color}
          border ${config.badgeCls} px-2 py-0.5 rounded`}>
          {t.is ? config.badgeS : config.badgeC}
        </span>
      )}
    </button>
  )
}
