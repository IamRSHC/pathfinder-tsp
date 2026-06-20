/**
 * nn2opt.js — Nearest-Neighbor + 2-Opt TSP heuristic
 *
 * Synchronous, runs on main thread in <10ms for up to 30 nodes.
 * Returns { tour, edges, length } where tour is an index array
 * and edges is [{from, to, dist},...] suitable for aiEdges in gameStore.
 */
import { euclidDist } from './tspUtils'

export function nn2OptTour(nodes) {
  const n = nodes.length
  if (n < 2) return { tour: [], edges: [], length: 0 }
  if (n === 2) {
    const d = euclidDist(nodes[0], nodes[1])
    return {
      tour:   [0, 1],
      edges:  [{ from: 0, to: 1, dist: d }, { from: 1, to: 0, dist: d }],
      length: Math.round(d * 2),
    }
  }

  // Build flat distance matrix for speed
  const D = buildD(nodes, n)

  // Step 1: NN from node 0
  const tour = nnTour(D, n)

  // Step 2: 2-Opt passes
  twoOpt(tour, D, n)

  // Convert to edge list
  return tourToEdges(tour, nodes, n)
}

/**
 * Tour from index array to edges + length.
 */
export function tourToEdges(tour, nodes, n) {
  const len = n || tour.length
  const edges = []
  let length = 0
  for (let i = 0; i < len; i++) {
    const from = tour[i]
    const to   = tour[(i + 1) % len]
    const d    = euclidDist(nodes[from], nodes[to])
    edges.push({ from, to, dist: d })
    length += d
  }
  return { tour, edges, length: Math.round(length) }
}

// ── Internals ──────────────────────────────────────────────────────────────

function buildD(nodes, n) {
  const D = new Float64Array(n * n)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const dx = nodes[i].x - nodes[j].x
      const dy = nodes[i].y - nodes[j].y
      D[i * n + j] = Math.sqrt(dx * dx + dy * dy)
    }
  }
  return D
}

function nnTour(D, n) {
  const visited = new Uint8Array(n)
  const tour    = [0]
  visited[0]    = 1
  for (let step = 1; step < n; step++) {
    const cur  = tour[tour.length - 1]
    const base = cur * n
    let best = Infinity, bestJ = -1
    for (let j = 0; j < n; j++) {
      if (!visited[j] && D[base + j] < best) {
        best = D[base + j]; bestJ = j
      }
    }
    tour.push(bestJ)
    visited[bestJ] = 1
  }
  return tour
}

function twoOpt(tour, D, n) {
  let improved = true
  while (improved) {
    improved = false
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue
        const a = tour[i], b = tour[i + 1]
        const c = tour[j], d = tour[(j + 1) % n]
        if (D[a * n + c] + D[b * n + d] < D[a * n + b] + D[c * n + d] - 1e-10) {
          let lo = i + 1, hi = j
          while (lo < hi) { const tmp = tour[lo]; tour[lo++] = tour[hi]; tour[hi--] = tmp }
          improved = true
        }
      }
    }
  }
}
