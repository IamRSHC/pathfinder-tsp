import { create } from 'zustand'
import { isTourComplete } from '../utils/tourValidator'
import { computeScore }   from '../utils/tspUtils'

export const useGameStore = create((set, get) => ({
  // Config
  mode:         'copilot',  // 'solo' | 'copilot' | 'vs'
  difficulty:   25,         // node count (used for RANDOM)
  nodeSource:   'random',   // 'random' | 'standard' | 'custom'
  standardSize: 'M',        // 'S' | 'M' | 'L'
  customRaw:    '',         // raw text from custom input
  customNodeNames:  [],     // ['N0', 'N1', ...]
  customRawCoords:  [],     // [{ x, y }, ...] — original pre-scale coords

  // Game state
  nodes:          [],
  startNode:      null,      // index of the designated start/home node
  humanEdges:     [],        // [{ from, to, dist }]
  aiEdges:        [],
  contestedEdges: [],
  currentPath:    [],
  pathLength:     0,
  optimalBound:   0,
  timeElapsed:    0,
  moveHistory:    [],
  gamePhase:      'idle',    // 'idle'|'placing'|'routing'|'complete'
  // 'placing' = nodes spawned, waiting for player to pick start node
  // 'routing' = start node set, player is connecting edges

  // Scores (computed on game complete)
  humanScore:     0,
  aiScore:        0,

  // Actions
  setMode:         (mode)         => set({ mode }),
  setDifficulty:   (difficulty)   => set({ difficulty }),
  setNodeSource:   (nodeSource)   => set({ nodeSource }),
  setStandardSize: (standardSize) => set({ standardSize }),
  setCustomRaw:    (customRaw)    => set({ customRaw }),
  setCustomNodeNames: (customNodeNames, customRawCoords) =>
    set({ customNodeNames, customRawCoords }),

  setNodes: (nodes) => {
    const bound = computeLowerBound(nodes)
    set({
      nodes,
      optimalBound:  bound,
      gamePhase:     'placing',   // wait for start-node selection
      startNode:     null,
      humanEdges:    [],
      aiEdges:       [],
      pathLength:    0,
      moveHistory:   [],
    })
  },

  setStartNode: (idx) => set({ startNode: idx, gamePhase: 'routing' }),

  addHumanEdge: (edge) => set(s => {
    const humanEdges  = [...s.humanEdges, edge]
    const pathLength  = humanEdges.reduce((acc, e) => acc + e.dist, 0)
    const moveHistory = [
      { type: 'human', edge, time: s.timeElapsed },
      ...s.moveHistory,
    ].slice(0, 20)

    // Check for tour completion
    const complete = isTourComplete(humanEdges, s.nodes.length, s.startNode ?? 0)
    return {
      humanEdges,
      pathLength,
      moveHistory,
      gamePhase: complete ? 'complete' : s.gamePhase,
    }
  }),

  addAiEdge: (edge) => set(s => ({ aiEdges: [...s.aiEdges, edge] })),

  undoLastMove: () => set(s => {
    if (!s.humanEdges.length) return s
    const humanEdges  = s.humanEdges.slice(0, -1)
    const pathLength  = humanEdges.reduce((acc, e) => acc + e.dist, 0)
    const moveHistory = s.moveHistory.slice(1)
    // If we undo back to 0 edges, we could re-enter placing — but keep routing
    // so the start node stays set and the player doesn't lose their selection.
    return { humanEdges, pathLength, moveHistory }
  }),

  tickTime: () => set(s => ({ timeElapsed: s.timeElapsed + 1 })),

  completeGame: () => set({ gamePhase: 'complete' }),

  // Called from ResultsScreen once AI path length is known
  finalizeScore: (aiPathLength) => set(s => {
    const params = {
      optimalBound: s.optimalBound,
      timeElapsed:  s.timeElapsed,
      nodeCount:    s.nodes.length,
    }
    const humanScore = computeScore({ pathLength: s.pathLength, ...params })
    const aiScore    = computeScore({ pathLength: aiPathLength, ...params })
    return { humanScore, aiScore }
  }),

  resetGame: () => set({
    nodes: [], startNode: null, customNodeNames: [], customRawCoords: [],
    humanEdges: [], aiEdges: [], contestedEdges: [],
    currentPath: [], pathLength: 0, timeElapsed: 0,
    moveHistory: [], gamePhase: 'idle',
    humanScore: 0, aiScore: 0,
  }),
}))

function computeLowerBound(nodes) {
  if (nodes.length < 2) return 0
  let total = 0
  const visited   = new Set([0])
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
