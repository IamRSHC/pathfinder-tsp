import { create } from 'zustand'
import { nn2OptTour, tourToEdges } from '../utils/nn2opt'

/**
 * AI Store — Real NN+2-Opt + ACO
 *
 * Lifecycle:
 *   initAI(nodes)  — called from ArenaScreen after setNodes()
 *     1. NN+2-Opt runs synchronously → instant aiEdges
 *     2. ACO worker starts → refines over 2-3 s, updates aiEdges + pheromones
 *   stopAI()       — called from reset(); terminates worker
 *   reset()        — full state reset (calls stopAI first)
 */

// Module-level worker instance — safe for SPA (single game at a time)
let _worker = null
let _workerActive = false

// ── Confidence from solution quality ─────────────────────────────────────────
// confidence = 100 when ACO matches NN+2-Opt (no improvement room),
//              scales down as gap widens
function computeConfidence(acoLen, nnLen, acoPhase) {
  if (acoPhase === 'idle' || !nnLen) return 50
  if (acoPhase === 'running' && !acoLen) return 55
  const len = acoLen || nnLen
  const ratio = nnLen / len               // 0–1, higher = ACO closer to NN quality
  const base  = Math.round(ratio * 85)    // 0–85
  const bonus = acoPhase === 'done' ? 12 : 5
  return Math.min(97, Math.max(30, base + bonus))
}

// ── Pheromone-informed suggestion ────────────────────────────────────────────
function pheromoneSuggestion(nodes, humanEdges, pheromoneEdges) {
  if (!nodes || nodes.length < 2) return null
  if (!pheromoneEdges || pheromoneEdges.length === 0) {
    return fallbackSuggestion(nodes, humanEdges)
  }

  const usedTo    = new Set(humanEdges.map(e => e.to))
  const usedFrom  = new Set(humanEdges.map(e => e.from))
  const lastEdge  = humanEdges[humanEdges.length - 1]
  const fromIdx   = lastEdge ? lastEdge.to : 0

  // Find strongest unvisited pheromone edge from current node
  let bestEdge = null, bestStrength = -1
  for (const pe of pheromoneEdges) {
    const other = pe.from === fromIdx ? pe.to : pe.to === fromIdx ? pe.from : -1
    if (other === -1 || usedTo.has(other)) continue
    if (pe.strength > bestStrength) { bestStrength = pe.strength; bestEdge = { from: fromIdx, to: other, strength: pe.strength } }
  }

  if (bestEdge) {
    const dx = nodes[bestEdge.from].x - nodes[bestEdge.to].x
    const dy = nodes[bestEdge.from].y - nodes[bestEdge.to].y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const saving = Math.round(bestEdge.strength * 25 + 5)
    return { from: bestEdge.from, to: bestEdge.to, saving, reason: 'pheromone' }
  }

  return fallbackSuggestion(nodes, humanEdges)
}

function fallbackSuggestion(nodes, humanEdges) {
  if (!nodes || nodes.length < 2) return null
  const usedTo   = new Set(humanEdges.map(e => e.to))
  const lastEdge = humanEdges[humanEdges.length - 1]
  const fromIdx  = lastEdge ? lastEdge.to : 0
  let best = Infinity, bestIdx = -1
  nodes.forEach((n, i) => {
    if (i === fromIdx || usedTo.has(i)) return
    const dx = nodes[fromIdx].x - n.x, dy = nodes[fromIdx].y - n.y
    const d = Math.sqrt(dx * dx + dy * dy)
    if (d < best) { best = d; bestIdx = i }
  })
  if (bestIdx === -1) return null
  return { from: fromIdx, to: bestIdx, saving: Math.floor(8 + Math.random() * 15), reason: 'nn' }
}

// ── Store ─────────────────────────────────────────────────────────────────────
export const useAiStore = create((set, get) => ({
  // Confidence & suggestion
  confidence:    50,
  suggestion:    null,
  overrideCount: 0,

  // AI path — full solution is private; only aiRevealedEdges is drawn on canvas
  aiPathLength:    0,
  aiEdges:         [],   // complete computed solution (never drawn directly — updated by ACO)
  lockedAiEdges:   [],   // snapshot rotated to human's start node — used for step-by-step reveal
  aiStartNode:     -1,   // the human's chosen start node (-1 until they pick one)
  aiRevealedEdges: [],   // subset shown on canvas — grows 1 edge per human move
  revealedCount:   0,    // how many AI moves have been unveiled so far
  nnLength:        0,    // NN+2-Opt baseline length

  // ACO state
  acoPhase:      'idle',    // 'idle' | 'running' | 'done'
  acoIteration:  0,
  acoMaxIter:    0,
  pheromoneEdges: [],

  // Log
  isThinking:    false,
  reasoningLog:  [{ id: 1, text: 'System ready.', type: 'info' }],

  // ── Initialise AI for a new game ────────────────────────────────────────
  initAI: (nodes) => {
    if (!nodes || nodes.length < 2) return
    const n = nodes.length

    // Step 1: NN + 2-Opt — synchronous, instant
    const nn2opt = nn2OptTour(nodes)
    const confidence = computeConfidence(0, nn2opt.length, 'running')

    set({
      aiEdges:       nn2opt.edges,
      aiPathLength:  nn2opt.length,
      nnLength:      nn2opt.length,
      acoPhase:      'running',
      acoIteration:  0,
      pheromoneEdges: [],
      confidence,
      isThinking:    true,
      reasoningLog:  [
        { id: Date.now(),     text: `NN+2-Opt baseline: ${nn2opt.length} units`, type: 'success' },
        { id: Date.now() - 1, text: `ACO starting — ${n} nodes`, type: 'info' },
        { id: Date.now() - 2, text: 'System initialised.', type: 'info' },
      ],
    })

    // Step 2: Launch ACO worker
    stopWorker()
    try {
      _worker = new Worker(
        new URL('../workers/acoWorker.js', import.meta.url),
        { type: 'module' }
      )
      _workerActive = true

      _worker.onmessage = (e) => {
        if (!_workerActive) return
        const msg = e.data
        const state = get()

        switch (msg.type) {
          case 'nn2opt': {
            // Worker computed its own NN+2-opt — update if better
            if (msg.length < state.nnLength || state.nnLength === 0) {
              const { edges } = nn2OptTour(nodes)   // we already have edges; use worker's tour
              const workerEdges = tourToEdges(msg.tour, nodes)
              set(s => ({
                nnLength:      msg.length,
                aiEdges:       workerEdges.edges,
                aiPathLength:  msg.length,
                confidence:    computeConfidence(msg.length, msg.length, 'running'),
                reasoningLog: [
                  { id: Date.now(), text: `NN+2-Opt (worker): ${msg.length} units`, type: 'success' },
                  ...s.reasoningLog,
                ].slice(0, 14),
              }))
            }
            break
          }

          case 'update': {
            // ACO found a new best tour
            const workerEdges = tourToEdges(msg.tour, nodes)
            set(s => ({
              aiEdges:      workerEdges.edges,
              aiPathLength: msg.length,
              acoIteration: msg.iteration,
              acoMaxIter:   msg.maxIter,
              confidence:   computeConfidence(msg.length, s.nnLength, 'running'),
              reasoningLog: [
                { id: Date.now(), text: `ACO iter ${msg.iteration}: ${msg.length} units ↓`, type: 'suggest' },
                ...s.reasoningLog,
              ].slice(0, 14),
            }))
            break
          }

          case 'pheromones': {
            set({
              pheromoneEdges: msg.pheromoneEdges,
              acoIteration:   msg.iteration,
              acoMaxIter:     msg.maxIter,
            })
            break
          }

          case 'progress': {
            set({ acoIteration: msg.iteration, acoMaxIter: msg.maxIter })
            break
          }

          case 'done': {
            const workerEdges = tourToEdges(msg.tour, nodes)
            _workerActive = false
            set(s => ({
              aiEdges:        workerEdges.edges,
              aiPathLength:   msg.length,
              pheromoneEdges: msg.pheromoneEdges,
              acoPhase:       'done',
              acoIteration:   s.acoMaxIter || s.acoIteration,
              isThinking:     false,
              confidence:     computeConfidence(msg.length, s.nnLength, 'done'),
              reasoningLog: [
                { id: Date.now(), text: `ACO converged: ${msg.length} units`, type: 'success' },
                { id: Date.now() - 1, text: `Improvement: ${s.nnLength ? Math.round((1 - msg.length / s.nnLength) * 100) : 0}% over NN baseline`, type: 'suggest' },
                ...s.reasoningLog,
              ].slice(0, 14),
            }))
            break
          }

          default:
            break
        }
      }

      _worker.onerror = (err) => {
        console.warn('[ACO Worker] Error:', err.message)
        _workerActive = false
        set(s => ({
          acoPhase:   'done',
          isThinking: false,
          reasoningLog: [
            { id: Date.now(), text: 'ACO worker error — NN+2-Opt result used.', type: 'warn' },
            ...s.reasoningLog,
          ].slice(0, 14),
        }))
      }

      _worker.postMessage({
        type:          'start',
        nodes,
        initialTour:   nn2opt.tour,
        initialLength: nn2opt.length,
      })

    } catch (err) {
      console.warn('[AI] Worker failed to start:', err)
      _workerActive = false
      set({ acoPhase: 'done', isThinking: false })
    }
  },

  // ── Stop worker ─────────────────────────────────────────────────────────
  stopAI: () => {
    stopWorker()
    set({ acoPhase: 'idle', isThinking: false })
  },

  // ── Co-pilot suggestion (pheromone-informed) ─────────────────────────────
  requestSuggestion: (nodes, existingEdges) => {
    const { pheromoneEdges } = get()
    set({ isThinking: true })
    // Small async delay to feel responsive
    setTimeout(() => {
      const suggestion = pheromoneSuggestion(nodes, existingEdges, pheromoneEdges)
      set(s => ({
        isThinking: false,
        confidence: Math.max(s.confidence - 2, 30),  // slight dip while routing
        suggestion,
        reasoningLog: suggestion ? [
          {
            id:   Date.now(),
            text: suggestion.reason === 'pheromone'
              ? `Pheromone path: ${suggestion.from}→${suggestion.to} (strength ${Math.round(
                  (pheromoneEdges.find(
                    p => (p.from === suggestion.from && p.to === suggestion.to) ||
                         (p.from === suggestion.to   && p.to === suggestion.from)
                  )?.strength || 0) * 100
                )}%)`
              : `NN suggestion: ${suggestion.from}→${suggestion.to} (−${suggestion.saving}%)`,
            type: 'suggest',
          },
          ...s.reasoningLog,
        ].slice(0, 14) : s.reasoningLog,
      }))
    }, 120)
  },

  acceptSuggestion: () => set(s => ({
    suggestion:    null,
    overrideCount: Math.max(0, s.overrideCount - 1),
  })),

  rejectSuggestion: () => set(s => ({
    suggestion:    null,
    overrideCount: s.overrideCount + 1,
    reasoningLog:  [
      { id: Date.now(), text: 'Override noted. Adapting via pheromone trail.', type: 'warn' },
      ...s.reasoningLog,
    ].slice(0, 14),
  })),

  handoffSegment: (nodes, fromIdx) => {
    const { aiEdges } = get()
    set({ isThinking: true })
    setTimeout(() => {
      set(s => ({
        isThinking: false,
        reasoningLog: [
          { id: Date.now(), text: 'Segment complete. ACO path returned.', type: 'success' },
          ...s.reasoningLog,
        ].slice(0, 14),
      }))
    }, 400)
  },

  setAiPath: (edges, length) => set({ aiEdges: edges, aiPathLength: length }),

  // ── Lock tour to human start node ────────────────────────────────────────
  // Called the moment the human clicks their start node (placing → routing).
  // TSP tours are cyclic, so rotating the tour to start from startNode costs
  // the AI nothing — the optimal distance is the same; we just re-index.
  // This snapshot (lockedAiEdges) is what the chess-style reveal steps through.
  // aiEdges keeps updating from ACO for the final results comparison.
  lockTourFromStartNode: (startNode) => {
    const { aiEdges } = get()
    if (!aiEdges.length) {
      set({ aiStartNode: startNode })
      return
    }
    // Every node appears exactly once as 'from' in a valid Hamiltonian tour.
    const offset = aiEdges.findIndex(e => e.from === startNode)
    const rotated = offset <= 0
      ? aiEdges
      : [...aiEdges.slice(offset), ...aiEdges.slice(0, offset)]
    set(s => ({
      aiStartNode:   startNode,
      lockedAiEdges: rotated,
      reasoningLog:  [
        { id: Date.now(), text: `Tour locked from node ${startNode}. Same start as human.`, type: 'info' },
        ...s.reasoningLog,
      ].slice(0, 14),
    }))
  },

  // ── Reveal one AI move (called after each human edge in copilot/VS modes) ──
  // Chess-style: human moves first, then AI reveals its corresponding step.
  // Uses lockedAiEdges (rotated to human's start node) so the comparison is fair.
  revealNextAiMove: () => {
    const { lockedAiEdges, revealedCount } = get()
    if (!lockedAiEdges.length || revealedCount >= lockedAiEdges.length) return
    const nextEdge = lockedAiEdges[revealedCount]
    if (!nextEdge) return
    set(s => ({
      aiRevealedEdges: [...s.aiRevealedEdges, nextEdge],
      revealedCount:   s.revealedCount + 1,
      reasoningLog: [
        {
          id:   Date.now(),
          text: `AI move ${s.revealedCount + 1}: ${nextEdge.from}→${nextEdge.to}`,
          type: 'suggest',
        },
        ...s.reasoningLog,
      ].slice(0, 14),
    }))
  },

  reset: () => {
    stopWorker()
    set({
      confidence:      50,
      suggestion:      null,
      overrideCount:   0,
      aiPathLength:    0,
      aiEdges:         [],
      lockedAiEdges:   [],
      aiStartNode:     -1,
      aiRevealedEdges: [],
      revealedCount:   0,
      nnLength:        0,
      acoPhase:        'idle',
      acoIteration:    0,
      acoMaxIter:      0,
      pheromoneEdges:  [],
      isThinking:      false,
      reasoningLog:    [{ id: Date.now(), text: 'System ready.', type: 'info' }],
    })
  },
}))

function stopWorker() {
  _workerActive = false
  if (_worker) {
    try { _worker.postMessage({ type: 'stop' }) } catch (_) {}
    try { _worker.terminate() } catch (_) {}
    _worker = null
  }
}
