import { create } from 'zustand'

// TODO: INTEGRATE AI MODEL — replace all mock values with real model outputs

export const useAiStore = create((set) => ({
  confidence:    72,        // 0–100
  suggestion:    null,      // { from: nodeIdx, to: nodeIdx, reason: string }
  suggestions:   [],        // queue of next 3 suggestions
  overrideCount: 0,
  aiPathLength:  0,
  aiEdges:       [],
  reasoningLog:  [
    { id: 1, text: 'Analyzing node distribution...', type: 'info' },
    { id: 2, text: 'Nearest-neighbor heuristic initialized.', type: 'info' },
  ],
  isThinking:    false,

  // TODO: INTEGRATE AI MODEL — call model here
  requestSuggestion: (nodes, existingEdges) => {
    set({ isThinking: true })
    setTimeout(() => {
      // Mock: suggest nearest unvisited node
      const mockSuggestion = generateMockSuggestion(nodes, existingEdges)
      set(s => ({
        isThinking:   false,
        confidence:   Math.floor(50 + Math.random() * 45),
        suggestion:   mockSuggestion,
        reasoningLog: [
          {
            id: Date.now(),
            text: mockSuggestion
              ? `Node ${mockSuggestion.from}→${mockSuggestion.to} saves ~${mockSuggestion.saving}% distance.`
              : 'No strong suggestion found. Your call.',
            type: mockSuggestion ? 'suggest' : 'warn',
          },
          ...s.reasoningLog,
        ].slice(0, 12),
      }))
    }, 600 + Math.random() * 400)
  },

  acceptSuggestion: () => set(s => ({
    suggestion: null,
    overrideCount: Math.max(0, s.overrideCount - 1),
  })),

  rejectSuggestion: () => set(s => ({
    suggestion: null,
    overrideCount: s.overrideCount + 1,
    reasoningLog: [
      { id: Date.now(), text: 'Override noted. Adapting strategy...', type: 'warn' },
      ...s.reasoningLog,
    ].slice(0, 12),
  })),

  // TODO: INTEGRATE AI MODEL — replace with real AI auto-complete
  handoffSegment: (nodes, fromIdx) => {
    set({ isThinking: true })
    setTimeout(() => {
      set(s => ({
        isThinking: false,
        reasoningLog: [
          { id: Date.now(), text: 'Segment complete. Returning control.', type: 'success' },
          ...s.reasoningLog,
        ].slice(0, 12),
      }))
    }, 1200)
  },

  setAiPath: (edges, length) => set({ aiEdges: edges, aiPathLength: length }),
  reset: () => set({
    confidence: 72, suggestion: null, suggestions: [],
    overrideCount: 0, aiEdges: [], aiPathLength: 0,
    reasoningLog: [{ id: 1, text: 'System ready.', type: 'info' }],
    isThinking: false,
  }),
}))

function generateMockSuggestion(nodes, existingEdges) {
  if (!nodes || nodes.length < 2) return null
  const usedTo = new Set(existingEdges.map(e => e.to))
  const usedFrom = new Set(existingEdges.map(e => e.from))
  const lastEdge = existingEdges[existingEdges.length - 1]
  const startIdx = lastEdge ? lastEdge.to : 0
  let best = Infinity, bestIdx = -1
  nodes.forEach((n, i) => {
    if (i === startIdx || usedTo.has(i)) return
    const d = Math.sqrt((nodes[startIdx].x - n.x) ** 2 + (nodes[startIdx].y - n.y) ** 2)
    if (d < best) { best = d; bestIdx = i }
  })
  if (bestIdx === -1) return null
  return { from: startIdx, to: bestIdx, saving: Math.floor(8 + Math.random() * 20) }
}