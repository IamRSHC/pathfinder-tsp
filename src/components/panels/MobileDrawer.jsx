import { useEffect, useRef } from 'react'
import { gsap }          from 'gsap'
import { useUiStore }    from '../../stores/uiStore'
import { useTheme }      from '../../hooks/useTheme'
import AIPanel           from './AIPanel'
import StatsPanel        from './StatsPanel'

export default function MobileDrawer() {
  const {
    mobileDrawerOpen, activeDrawerTab, drawerFocused,
    closeDrawer, setActiveDrawerTab,
  } = useUiStore()
  const t = useTheme()
  const drawerRef = useRef(null)

  useEffect(() => {
    if (!drawerRef.current) return
    gsap.to(drawerRef.current, {
      y:        mobileDrawerOpen ? '0%' : '100%',
      duration: 0.32,
      ease:     'power3.out',
    })
  }, [mobileDrawerOpen])

  // Panel title for focused (gesture-opened) mode
  const focusedTitle = activeDrawerTab === 'ai'
    ? (t.is ? '🤖 AI Co-Pilot' : '🤖 AI CO-PILOT')
    : (t.is ? '📊 Statistics'   : '📊 STATISTICS')

  return (
    <>
      {/* Backdrop */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeDrawer}
        />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden
          bg-game-surface border-t border-game-border rounded-t-2xl
          translate-y-full"
        style={{ maxHeight: '75vh' }}
      >
        {/* Handle */}
        <div className="pt-3 pb-1 cursor-pointer" onClick={closeDrawer}>
          <div className="drawer-handle" />
        </div>

        {drawerFocused ? (
          /* ── Focused mode (3-finger gesture): show only the active panel ── */
          <div className="px-4 pb-2 border-b border-game-border flex items-center justify-between">
            <span className={`font-mono text-sm font-bold ${t.primary.text}`}>
              {focusedTitle}
            </span>
            <button
              onClick={closeDrawer}
              className="font-mono text-xs text-game-muted active:text-game-cyan transition-colors"
            >
              {t.is ? 'Close ×' : 'CLOSE ×'}
            </button>
          </div>
        ) : (
          /* ── Normal mode (button): show tab bar ── */
          <div className="flex border-b border-game-border px-4">
            {['ai', 'stats'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveDrawerTab(tab)}
                className={`flex-1 py-2 transition-colors ${t.tab(activeDrawerTab === tab)}`}
              >
                {tab === 'ai'
                  ? (t.is ? '🤖 AI Panel' : '🤖 AI PANEL')
                  : (t.is ? '📊 Stats'    : '📊 STATS')}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(75vh - 80px)' }}>
          {activeDrawerTab === 'ai'
            ? <AIPanel    className="border-none" />
            : <StatsPanel className="border-none" />
          }
        </div>
      </div>
    </>
  )
}
