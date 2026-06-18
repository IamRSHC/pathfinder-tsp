import { useTheme } from '../../hooks/useTheme'

const PRESETS = [
  { label: '10',   value: 10,  tagC: 'EASY',         tagS: 'Easy',          color: 'text-game-green'  },
  { label: '25',   value: 25,  tagC: 'NORMAL',        tagS: 'Normal',        color: 'text-game-cyan'   },
  { label: '50',   value: 50,  tagC: 'HARD',          tagS: 'Hard',          color: 'text-game-amber'  },
  { label: '100',  value: 100, tagC: 'EXTREME',       tagS: 'Extreme',       color: 'text-game-red'    },
  { label: '500+', value: 500, tagC: 'MACRO ROUTING', tagS: 'Macro Routing', color: 'text-game-purple' },
]

export default function DifficultyDial({ value, onChange }) {
  const t = useTheme()

  return (
    <div className="space-y-2">
      <span className="stat-label block">{t.is ? 'node count' : 'NODE COUNT'}</span>
      <div className="flex gap-1.5 w-full">
        {PRESETS.map(p => (
          <button
            key={p.value}
            onClick={() => onChange(p.value)}
            className={`flex flex-col items-center flex-1 min-w-0 px-1 py-2 rounded border transition-all duration-150
              font-mono text-sm font-bold
              ${value === p.value
                ? `${p.color} border-current bg-current/10`
                : 'text-game-muted border-game-border hover:border-game-text/30'
              }`}
          >
            <span>{p.label}</span>
            <span className="text-xs font-normal opacity-70">
              {t.is ? p.tagS : p.tagC}
            </span>
          </button>
        ))}
      </div>
      {value >= 500 && (
        <p className="text-game-purple font-mono text-xs mt-1">
          ⬡ {t.is
            ? 'Macro-Routing: human zones, AI intra-zone optimization'
            : 'Macro-Routing: human zones, AI intra-zone optimization'}
        </p>
      )}
      {value > 150 && value < 500 && (
        <p className="text-game-amber font-mono text-xs mt-1">
          ◎ {t.is ? 'Heatmap mode: place waypoints through density zones'
                  : 'Heatmap mode: place waypoints through density zones'}
        </p>
      )}
      {value > 50 && value <= 150 && (
        <p className={`${t.primary.text} font-mono text-xs mt-1`}>
          ◈ {t.is ? 'Cluster mode: route between regional groups'
                  : 'Cluster mode: route between regional groups'}
        </p>
      )}
    </div>
  )
}
