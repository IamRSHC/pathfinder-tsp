import { create } from 'zustand'

export const useUiStore = create((set) => ({
  mobileDrawerOpen: false,
  activeDrawerTab:  'ai',     // 'ai' | 'stats'
  activePanel:      'canvas', // desktop focus
  showTutorial:     false,
  notification:     null,

  toggleDrawer:    ()    => set(s => ({ mobileDrawerOpen: !s.mobileDrawerOpen })),
  openDrawer:      (tab) => set({ mobileDrawerOpen: true, activeDrawerTab: tab }),
  closeDrawer:     ()    => set({ mobileDrawerOpen: false }),
  setActiveDrawerTab: (tab) => set({ activeDrawerTab: tab }),
  showNotification: (msg, type = 'info') => {
    set({ notification: { msg, type, id: Date.now() } })
    setTimeout(() => set({ notification: null }), 3000)
  },
  setShowTutorial: (v) => set({ showTutorial: v }),
}))