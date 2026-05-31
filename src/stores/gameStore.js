import { create } from 'zustand'

export const useGameStore = create((set, get) => ({
  // Config
  mode:       'copilot', // 'solo' | 'copilot' | 'vs'
  difficulty: 25,        // node count

  // Game state
  nodes:       [],
  humanEdges:  [],   // [{ from, to, dist }]
  aiEdges:     [],
  contestedEdges: [],
  currentPath: [],   // ordered node indices
  pathLength:  0,
  optimalBound: 0,
  timeElapsed:  0,
  moveHistory:  [],
  gamePhase:   'idle', // 'idle'|'placing'|'routing'|'complete'

  // Actions
  setMode:       (mode)       => set({ mode }),
  setDifficulty: (difficulty) => set({ difficulty }),

  setNodes: (nodes) => {
    // Compute a rough lower bound (nearest-neighbor estimate * 0.75)
    const bound = computeLowerBound(nodes)
    set({ nodes, optimalBound: bound, gamePhase: 'routing' })
  },

  addHumanEdge: (edge) => set(s => {
    const humanEdges  = [...s.humanEdges, edge]
    const pathLength  = humanEdges.reduce((acc, e) => acc + e.dist, 0)
    const moveHistory = [
      { type: 'human', edge, time: s.timeElapsed },
      ...s.moveHistory,
    ].slice(0, 20)
    return { humanEdges, pathLength, moveHistory }
  }),

  addAiEdge: (edge) => set(s => ({
    aiEdges: [...s.aiEdges, edge],
  })),

  undoLastMove: () => set(s => {
    if (!s.humanEdges.length) return s
    const humanEdges = s.humanEdges.slice(0, -1)
    const pathLength = humanEdges.reduce((acc, e) => acc + e.dist, 0)
    const moveHistory = s.moveHistory.slice(1)
    return { humanEdges, pathLength, moveHistory }
  }),

  tickTime: () => set(s => ({ timeElapsed: s.timeElapsed + 1 })),

  completeGame: () => set({ gamePhase: 'complete' }),

  resetGame: () => set({
    nodes: [], humanEdges: [], aiEdges: [], contestedEdges: [],
    currentPath: [], pathLength: 0, timeElapsed: 0,
    moveHistory: [], gamePhase: 'idle',
  }),
}))

function computeLowerBound(nodes) {
  if (nodes.length < 2) return 0
  // Minimum spanning tree lower bound approximation
  let total = 0
  const visited = new Set([0])
  const remaining = new Set(nodes.map((_, i) => i).slice(1))
  while (remaining.size > 0) {
    let best = Infinity, bestNode = -1
    for (const v of visited) {
      for (const r of remaining) {
        const d = dist(nodes[v], nodes[r])
        if (d < best) { best = d; bestNode = r }
      }
    }
    total += best
    visited.add(bestNode)
    remaining.delete(bestNode)
  }
  return Math.round(total * 0.78)
}

function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}