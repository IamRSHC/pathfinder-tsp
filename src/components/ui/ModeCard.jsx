import { useTheme } from '../../hooks/useTheme'

export default function ModeCard({ mode, selected, onClick }) {
  const t = useTheme()

  const config = {
    solo: {
      icon:    '⚡',
      labelC:  'SOLO RUN',
      labelS:  'Solo Run',
      desc:    'You vs. the TSP. Raw human intuition, no AI assist.',
      color:   'text-game-green',
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
      selectedBorder: t.is
        ? `${t.secondary.border} ${t.secondary.subtle}`
        : 'border-game-amber shadow-[0_0_20px_#ffab0033]',
      badgeCls: t.is
        ? `${t.secondary.border} ${t.secondary.bg}`
        : 'border-game-amber/40',
    },
  }[mode]

  return (
    <button
      onClick={() => onClick(mode)}
      // ── MOBILE: min-h ensures 44px+ touch target; compact padding on small screens
      className={`mode-card flex flex-col items-start p-3 sm:p-5 rounded-lg border-2
        bg-game-surface text-left w-full transition-all duration-200
        min-h-[44px]
        ${selected ? config.selectedBorder : 'border-game-border'}
        ${selected && t.is ? 'mode-card-selected' : ''}`}
    >
      <span className="text-2xl sm:text-3xl mb-1 sm:mb-3">{config.icon}</span>
      <span className={`font-display font-bold text-base sm:text-lg ${config.color}
        ${t.is ? '' : 'tracking-wider'}`}>
        {t.is ? config.labelS : config.labelC}
      </span>
      <span className="font-mono text-xs text-game-muted mt-0.5 leading-relaxed hidden sm:block">
        {config.desc}
      </span>
      {/* Compact desc on mobile */}
      <span className="font-mono text-xs text-game-muted mt-0.5 leading-tight sm:hidden">
        {config.desc.split('.')[0]}.
      </span>
      {selected && (
        <span className={`mt-2 text-xs font-mono font-bold ${config.color}
          border ${config.badgeCls} px-2 py-0.5 rounded`}>
          {t.is ? 'Selected' : 'SELECTED'}
        </span>
      )}
    </button>
  )
}
