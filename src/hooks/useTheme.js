/**
 * useTheme — central hook for theme-aware class resolution.
 * Every component imports this instead of hardcoding cyber-specific Tailwind classes.
 */
import { useUiStore } from '../stores/uiStore'

export function useTheme() {
  const { theme } = useUiStore()
  const is = theme === 'serene'

  return {
    is,

    pageTitle: is
      ? 'font-display font-bold text-3xl text-game-cyan'
      : 'font-display font-bold text-3xl text-game-cyan glow-cyan tracking-wider',

    pageSubtitle: 'font-mono text-xs text-game-muted mt-1',

    sectionTitle: is
      ? 'font-display font-semibold text-game-text'
      : 'font-display font-semibold text-game-text tracking-wider',

    header: is
      ? 'font-display font-semibold text-sm text-game-text'
      : 'font-display font-semibold text-sm text-game-text tracking-wider',

    card: 'bg-game-surface border border-game-border rounded-lg',

    primary: {
      text:   'text-game-cyan',
      border: is ? 'border-[rgba(45,106,79,0.35)]'   : 'border-game-cyan/40',
      bg:     is ? 'bg-[rgba(45,106,79,0.07)]'       : 'bg-game-cyan/10',
      bgHov:  is ? 'hover:bg-[rgba(45,106,79,0.13)]' : 'hover:bg-game-cyan/20',
      ring:   is ? 'border-[rgba(45,106,79,0.50)]'   : 'border-game-cyan/50',
      subtle: is ? 'bg-[rgba(45,106,79,0.05)]'       : 'bg-game-cyan/5',
      glow:   is ? '' : 'glow-cyan',
    },

    secondary: {
      text:   'text-game-amber',
      border: is ? 'border-[rgba(181,131,141,0.35)]'   : 'border-game-amber/40',
      bg:     is ? 'bg-[rgba(181,131,141,0.07)]'       : 'bg-game-amber/10',
      bgHov:  is ? 'hover:bg-[rgba(181,131,141,0.13)]' : 'hover:bg-game-amber/20',
      subtle: is ? 'bg-[rgba(181,131,141,0.05)]'       : 'bg-game-amber/5',
    },

    success: {
      text:   'text-game-green',
      border: is ? 'border-[rgba(58,125,91,0.35)]' : 'border-game-green/40',
      bg:     is ? 'bg-[rgba(58,125,91,0.07)]'     : 'bg-game-green/5',
    },

    danger: {
      text:   'text-game-red',
      border: is ? 'border-[rgba(192,84,78,0.35)]'   : 'border-game-red/40',
      bg:     is ? 'bg-[rgba(192,84,78,0.07)]'       : 'bg-game-red/10',
      bgHov:  is ? 'hover:bg-[rgba(192,84,78,0.13)]' : 'hover:bg-game-red/20',
    },

    special: {
      text:   'text-game-purple',
      border: is ? 'border-[rgba(109,104,117,0.35)]' : 'border-game-purple/30',
      bg:     is ? 'bg-[rgba(109,104,117,0.07)]'     : 'bg-game-purple/5',
    },

    btn: {
      primary: [
        'font-mono text-xs font-bold rounded transition-colors',
        'text-game-cyan',
        is ? 'bg-[rgba(45,106,79,0.07)] border border-[rgba(45,106,79,0.35)] hover:bg-[rgba(45,106,79,0.13)]'
           : 'bg-game-cyan/10 border border-game-cyan/40 hover:bg-game-cyan/20',
      ].join(' '),

      ghost: [
        'font-mono text-xs font-bold rounded border transition-colors',
        'border-game-border text-game-muted hover:text-game-text hover:border-game-text/40',
      ].join(' '),

      warn: [
        'font-mono text-xs font-bold rounded transition-colors',
        'text-game-amber',
        is ? 'bg-[rgba(181,131,141,0.07)] border border-[rgba(181,131,141,0.35)] hover:bg-[rgba(181,131,141,0.13)]'
           : 'bg-game-amber/10 border border-game-amber/40 hover:bg-game-amber/20',
      ].join(' '),

      danger: [
        'font-mono text-xs font-bold rounded transition-colors',
        'text-game-red',
        is ? 'bg-[rgba(192,84,78,0.07)] border border-[rgba(192,84,78,0.35)] hover:bg-[rgba(192,84,78,0.13)]'
           : 'bg-game-red/10 border border-game-red/40 hover:bg-game-red/20',
      ].join(' '),
    },

    track: 'bg-game-bg rounded-full overflow-hidden',

    tab: (active) => active
      ? is
        ? 'text-game-cyan border-b-2 border-game-cyan font-mono text-xs font-bold'
        : 'text-game-cyan border-b-2 border-game-cyan font-mono text-xs font-bold tracking-wider'
      : 'text-game-muted font-mono text-xs font-bold',

    pill: (actor) => actor === 'human'
      ? [
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded border font-mono text-xs',
          'text-game-cyan',
          is ? 'border-[rgba(45,106,79,0.35)] bg-[rgba(45,106,79,0.06)]'
             : 'border-game-cyan/40 bg-game-cyan/5',
        ].join(' ')
      : [
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded border font-mono text-xs',
          'text-game-amber',
          is ? 'border-[rgba(181,131,141,0.35)] bg-[rgba(181,131,141,0.06)]'
             : 'border-game-amber/40 bg-game-amber/5',
        ].join(' '),

    seedActive: is
      ? 'border-[rgba(45,106,79,0.50)] bg-[rgba(45,106,79,0.05)]'
      : 'border-game-cyan/50 bg-game-cyan/5',

    confidenceFill: (pct) => {
      if (is) {
        return pct >= 70
          ? 'linear-gradient(90deg, #3A7D5B, #52B788)'
          : pct >= 40
          ? 'linear-gradient(90deg, #B5838D, #D4A5A5)'
          : 'linear-gradient(90deg, #C0544E, #D4A5A5)'
      }
      return pct >= 70
        ? 'linear-gradient(90deg, #00e676, #00e5ff)'
        : pct >= 40
        ? 'linear-gradient(90deg, #ffab00, #ff6d00)'
        : 'linear-gradient(90deg, #ff1744, #ff6d00)'
    },

    gapFill: (gap) => {
      if (is) return gap <= 10 ? '#3A7D5B' : gap <= 25 ? '#B5838D' : '#C0544E'
      return gap <= 10 ? '#00e676' : gap <= 25 ? '#ffab00' : '#ff1744'
    },

    chartTooltip: {
      background:   is ? '#FFFFFF'              : '#0f1623',
      border:       is ? '1px solid #E8E4DF'   : '1px solid #1a2540',
      fontFamily:   is ? 'DM Mono, monospace'  : 'JetBrains Mono, monospace',
      color:        is ? '#1A1A2E'             : '#c9d4e8',
      borderRadius: is ? '8px'                 : '4px',
      fontSize:     '11px',
    },

    chartGrid: is ? '#E8E4DF' : '#1a2540',
    chartTick: is ? '#9A9A9A' : '#4a5568',
  }
}
