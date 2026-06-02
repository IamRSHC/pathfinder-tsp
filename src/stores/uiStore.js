import { create } from 'zustand'

export const useUiStore = create((set) => ({
  mobileDrawerOpen: false,
  activeDrawerTab:  'ai',
  activePanel:      'canvas',
  showTutorial:     false,
  notification:     null,
  theme:            'cyber',

  toggleDrawer:       ()    => set(s => ({ mobileDrawerOpen: !s.mobileDrawerOpen })),
  openDrawer:         (tab) => set({ mobileDrawerOpen: true, activeDrawerTab: tab }),
  closeDrawer:        ()    => set({ mobileDrawerOpen: false }),
  setActiveDrawerTab: (tab) => set({ activeDrawerTab: tab }),

  showNotification: (msg, type = 'info') => {
    set({ notification: { msg, type, id: Date.now() } })
    setTimeout(() => set({ notification: null }), 3000)
  },

  setShowTutorial: (v) => set({ showTutorial: v }),

  toggleTheme: () => set(s => {
    const next = s.theme === 'cyber' ? 'serene' : 'cyber'
    document.documentElement.setAttribute('data-theme', next)
    return { theme: next }
  }),
}))

// Apply on first load
document.documentElement.setAttribute('data-theme', 'cyber')