import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { useUiStore }  from '../../stores/uiStore'
import AIPanel         from './AIPanel'
import StatsPanel      from './StatsPanel'

export default function MobileDrawer() {
  const { mobileDrawerOpen, activeDrawerTab, closeDrawer, setActiveDrawerTab } = useUiStore()
  const drawerRef = useRef(null)

  useEffect(() => {
    if (!drawerRef.current) return
    gsap.to(drawerRef.current, {
      y:        mobileDrawerOpen ? '0%' : '100%',
      duration: 0.32,
      ease:     'power3.out',
    })
  }, [mobileDrawerOpen])

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

        {/* Tabs */}
        <div className="flex border-b border-game-border px-4">
          {['ai', 'stats'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveDrawerTab(tab)}
              className={`flex-1 py-2 font-mono text-xs font-bold tracking-wider transition-colors
                ${activeDrawerTab === tab
                  ? 'text-game-cyan border-b-2 border-game-cyan'
                  : 'text-game-muted'}`}
            >
              {tab === 'ai' ? '🤖 AI PANEL' : '📊 STATS'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(75vh - 80px)' }}>
          {activeDrawerTab === 'ai'
            ? <AIPanel className="border-none" />
            : <StatsPanel className="border-none" />
          }
        </div>
      </div>
    </>
  )
}