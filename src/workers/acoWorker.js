/**
 * ACO Web Worker — Ant Colony Optimisation for TSP
 *
 * Protocol (main → worker):
 *   { type: 'start', nodes: [{x,y},...], initialTour: [idx,...], initialLength: number }
 *   { type: 'stop' }
 *
 * Protocol (worker → main):
 *   { type: 'nn2opt',     tour, length }                          — instant NN+2-opt result
 *   { type: 'update',     tour, length, iteration, maxIter }      — new best found
 *   { type: 'pheromones', pheromoneEdges, iteration, maxIter }    — pheromone map update
 *   { type: 'done',       tour, length, pheromoneEdges }          — final result
 *   { type: 'progress',   iteration, maxIter, bestLength }        — iteration tick
 */

let running = false

// ── Parameters ─────────────────────────────────────────────────────────────
const ALPHA   = 1      // pheromone influence
const BETA    = 5      // heuristic (distance) influence
const RHO     = 0.5    // evaporation rate (0–1)
const Q       = 100    // pheromone deposit constant

// ── Message handler ─────────────────────────────────────────────────────────
self.onmessage = (e) => {
  const { type, nodes, initialTour, initialLength } = e.data
  if (type === 'stop') {
    running = false
    return
  }
  if (type === 'start') {
    running = true
    runPipeline(nodes, initialTour, initialLength)
  }
}

// ── Main pipeline ───────────────────────────────────────────────────────────
function runPipeline(nodes, initialTour, initialLength) {
  const n = nodes.length
  if (n < 3) {
    self.postMessage({ type: 'done', tour: initialTour || [], length: initialLength || 0, pheromoneEdges: [] })
    return
  }

  // Build distance matrix once
  const D = buildDistMatrix(nodes, n)

  // Step 1: NN + 2-opt baseline (also done on main thread, but we seed ACO from it)
  let bestTour   = initialTour ? [...initialTour] : nnTour(D, n)
  let bestLength = initialLength > 0 ? initialLength : tourLen(bestTour, D, n)
  bestTour = twoOpt(bestTour, D, n)
  bestLength = tourLen(bestTour, D, n)

  // Inform main thread of NN+2-opt result (in case this completes faster)
  self.postMessage({ type: 'nn2opt', tour: [...bestTour], length: Math.round(bestLength) })

  if (!running) return

  // Step 2: ACO
  runACO(nodes, n, D, bestTour, bestLength)
}

function runACO(nodes, n, D, initialBestTour, initialBestLength) {
  const N_ANTS  = Math.min(Math.max(n, 10), 25)
  const MAX_ITER = n <= 12 ? 120 : n <= 20 ? 90 : n <= 30 ? 70 : 50

  // Precompute eta[i][j] = 1/dist(i,j) — heuristic visibility
  const eta = []
  for (let i = 0; i < n; i++) {
    eta[i] = new Float64Array(n)
    for (let j = 0; j < n; j++) {
      eta[i][j] = D[i][j] > 0 ? 1.0 / D[i][j] : 0
    }
  }

  // Initialise pheromones — seed from best known tour length
  const initTau = Q / initialBestLength
  const tau = []
  for (let i = 0; i < n; i++) {
    tau[i] = new Float64Array(n).fill(initTau)
  }

  // Boost pheromones on initial best tour edges
  const boostDelta = (Q * 3) / initialBestLength
  for (let i = 0; i < initialBestTour.length; i++) {
    const a = initialBestTour[i]
    const b = initialBestTour[(i + 1) % initialBestTour.length]
    tau[a][b] += boostDelta
    tau[b][a] += boostDelta
  }

  let bestTour   = [...initialBestTour]
  let bestLength = initialBestLength

  for (let iter = 0; iter < MAX_ITER; iter++) {
    if (!running) break

    // Evaporate
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        tau[i][j] = Math.max(0.001, tau[i][j] * (1 - RHO))
      }
    }

    let iterBestLen  = Infinity
    let iterBestTour = null

    // Build ant tours
    for (let ant = 0; ant < N_ANTS; ant++) {
      const startNode = ant % n
      const tour = buildAntTour(startNode, n, tau, eta)
      if (!tour) continue

      // Quick 2-opt pass on promising ants (every 3rd ant after iter 10)
      let len = tourLen(tour, D, n)
      if (iter > 10 && ant % 3 === 0) {
        const improved = twoOpt(tour, D, n)
        const improvedLen = tourLen(improved, D, n)
        if (improvedLen < len) {
          tour.splice(0, tour.length, ...improved)
          len = improvedLen
        }
      }

      // Deposit pheromones proportional to tour quality
      const delta = Q / len
      for (let i = 0; i < n; i++) {
        const a = tour[i], b = tour[(i + 1) % n]
        tau[a][b] += delta
        tau[b][a] += delta
      }

      if (len < iterBestLen) {
        iterBestLen  = len
        iterBestTour = [...tour]
      }
    }

    // Elitist ant: reinforce global best
    if (bestTour) {
      const eliteDelta = (Q * 2) / bestLength
      for (let i = 0; i < n; i++) {
        const a = bestTour[i], b = bestTour[(i + 1) % n]
        tau[a][b] += eliteDelta
        tau[b][a] += eliteDelta
      }
    }

    // Update global best
    if (iterBestLen < bestLength - 0.5) {
      bestLength = iterBestLen
      bestTour   = iterBestTour
      self.postMessage({
        type:      'update',
        tour:      [...bestTour],
        length:    Math.round(bestLength),
        iteration: iter + 1,
        maxIter:   MAX_ITER,
      })
    }

    // Progress tick
    self.postMessage({ type: 'progress', iteration: iter + 1, maxIter: MAX_ITER, bestLength: Math.round(bestLength) })

    // Send pheromone overlay every 5 iterations
    if (iter % 5 === 0 || iter === MAX_ITER - 1) {
      self.postMessage({
        type:           'pheromones',
        pheromoneEdges: extractPheromoneEdges(tau, n, 0.25),
        iteration:      iter + 1,
        maxIter:        MAX_ITER,
      })
    }
  }

  self.postMessage({
    type:           'done',
    tour:           [...bestTour],
    length:         Math.round(bestLength),
    pheromoneEdges: extractPheromoneEdges(tau, n, 0.20),
  })
}

// ── Ant tour construction (roulette wheel selection) ─────────────────────────
function buildAntTour(startNode, n, tau, eta) {
  const visited  = new Uint8Array(n)
  const tour     = new Int32Array(n)
  tour[0]        = startNode
  visited[startNode] = 1

  for (let step = 1; step < n; step++) {
    const cur = tour[step - 1]
    let total  = 0
    const prob = new Float64Array(n)

    for (let j = 0; j < n; j++) {
      if (!visited[j]) {
        prob[j] = Math.pow(tau[cur][j], ALPHA) * Math.pow(eta[cur][j], BETA)
        total  += prob[j]
      }
    }

    if (total === 0) {
      // Fallback: greedy nearest unvisited
      let bestD = Infinity, bestJ = -1
      for (let j = 0; j < n; j++) {
        if (!visited[j] && eta[cur][j] > 0 && 1 / eta[cur][j] < bestD) {
          bestD = 1 / eta[cur][j]; bestJ = j
        }
      }
      if (bestJ === -1) return null
      tour[step]    = bestJ
      visited[bestJ] = 1
      continue
    }

    // Roulette selection
    let r    = Math.random() * total
    let next = -1
    for (let j = 0; j < n; j++) {
      if (!visited[j]) {
        r -= prob[j]
        if (r <= 0) { next = j; break }
      }
    }
    if (next === -1) {
      // Numeric rounding: pick last unvisited
      for (let j = 0; j < n; j++) { if (!visited[j]) { next = j; break } }
    }
    if (next === -1) return null
    tour[step]    = next
    visited[next] = 1
  }

  return Array.from(tour)
}

// ── 2-Opt improvement ────────────────────────────────────────────────────────
function twoOpt(tour, D, n) {
  const t = [...tour]
  let improved = true
  while (improved) {
    improved = false
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue  // skip wrap-around
        const a = t[i], b = t[i + 1], c = t[j], d = t[(j + 1) % n]
        if (D[a][c] + D[b][d] < D[a][b] + D[c][d] - 1e-10) {
          // Reverse segment [i+1 .. j]
          let lo = i + 1, hi = j
          while (lo < hi) { const tmp = t[lo]; t[lo++] = t[hi]; t[hi--] = tmp }
          improved = true
        }
      }
    }
  }
  return t
}

// ── Nearest-neighbor tour (tour as index array) ──────────────────────────────
function nnTour(D, n) {
  const visited = new Uint8Array(n)
  const tour    = [0]
  visited[0]    = 1
  for (let step = 1; step < n; step++) {
    const cur = tour[tour.length - 1]
    let best = Infinity, bestJ = -1
    for (let j = 0; j < n; j++) {
      if (!visited[j] && D[cur][j] < best) { best = D[cur][j]; bestJ = j }
    }
    tour.push(bestJ)
    visited[bestJ] = 1
  }
  return tour
}

// ── Tour length from index array ─────────────────────────────────────────────
function tourLen(tour, D, n) {
  let len = 0
  for (let i = 0; i < n; i++) len += D[tour[i]][tour[(i + 1) % n]]
  return len
}

// ── Distance matrix ──────────────────────────────────────────────────────────
function buildDistMatrix(nodes, n) {
  const D = []
  for (let i = 0; i < n; i++) {
    D[i] = new Float64Array(n)
    for (let j = 0; j < n; j++) {
      const dx = nodes[i].x - nodes[j].x
      const dy = nodes[i].y - nodes[j].y
      D[i][j]  = Math.sqrt(dx * dx + dy * dy)
    }
  }
  return D
}

// ── Extract top pheromone edges for overlay ──────────────────────────────────
function extractPheromoneEdges(tau, n, threshold) {
  let maxTau = 0
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (tau[i][j] > maxTau) maxTau = tau[i][j]
    }
  }
  if (maxTau === 0) return []

  const cutoff = maxTau * threshold
  const edges  = []
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (tau[i][j] >= cutoff) {
        edges.push({ from: i, to: j, strength: tau[i][j] / maxTau })
      }
    }
  }
  return edges
}
