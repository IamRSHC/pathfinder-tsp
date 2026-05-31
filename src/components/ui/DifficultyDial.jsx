const PRESETS = [
  { label: '10',   value: 10,  tag: 'EASY',        color: 'text-game-green'  },
  { label: '25',   value: 25,  tag: 'NORMAL',       color: 'text-game-cyan'   },
  { label: '50',   value: 50,  tag: 'HARD',         color: 'text-game-amber'  },
  { label: '100',  value: 100, tag: 'EXTREME',      color: 'text-game-red'    },
  { label: '500+', value: 500, tag: 'MACRO ROUTING', color: 'text-game-purple' },
]

export default function DifficultyDial({ value, onChange }) {
  return (
    <div className="space-y-2">
      <span className="stat-label block">NODE COUNT</span>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map(p => (
          <button
            key={p.value}
            onClick={() => onChange(p.value)}
            className={`flex flex-col items-center px-3 py-2 rounded border transition-all duration-150
              font-mono text-sm font-bold
              ${value === p.value
                ? `${p.color} border-current bg-current/10`
                : 'text-game-muted border-game-border hover:border-game-text/30'
              }`}
          >
            <span>{p.label}</span>
            <span className="text-xs font-normal opacity-70">{p.tag}</span>
          </button>
        ))}
      </div>
      {value >= 500 && (
        <p className="text-game-purple font-mono text-xs mt-1">
          ⬡ Macro-Routing: human zones, AI intra-zone optimization
        </p>
      )}
      {value > 150 && value < 500 && (
        <p className="text-game-amber font-mono text-xs mt-1">
          ◎ Heatmap mode: place waypoints through density zones
        </p>
      )}
      {value > 50 && value <= 150 && (
        <p className="text-game-cyan font-mono text-xs mt-1">
          ◈ Cluster mode: route between regional groups
        </p>
      )}
    </div>
  )
}