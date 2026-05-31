export function euclidDist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

export function generateNodes(count, width, height, padding = 60) {
  const nodes = []
  const attempts = count * 20
  for (let i = 0; i < attempts && nodes.length < count; i++) {
    const x = padding + Math.random() * (width  - padding * 2)
    const y = padding + Math.random() * (height - padding * 2)
    // Minimum spacing
    const tooClose = nodes.some(n => euclidDist(n, { x, y }) < 28)
    if (!tooClose) nodes.push({ x, y, id: nodes.length })
  }
  return nodes
}

export function formatDist(d) {
  return d > 1000 ? `${(d / 1000).toFixed(2)}k` : Math.round(d).toString()
}

export function computeGapPercent(current, bound) {
  if (!bound || !current) return 0
  return Math.max(0, Math.round(((current - bound) / bound) * 100))
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

// Cluster nodes into groups for 51–150 range
export function clusterNodes(nodes, k) {
  if (nodes.length <= k) return nodes.map(n => ({ ...n, cluster: 0 }))
  // Simple k-means (1 pass) for visual clustering
  const centroids = nodes.slice(0, k).map(n => ({ ...n }))
  return nodes.map(node => {
    let best = 0, bestD = Infinity
    centroids.forEach((c, i) => {
      const d = euclidDist(node, c)
      if (d < bestD) { bestD = d; best = i }
    })
    return { ...node, cluster: best }
  })
}

// Nearest-neighbor path (for AI-only comparison)
export function nearestNeighborTour(nodes) {
  if (!nodes.length) return { edges: [], length: 0 }
  const visited = new Set()
  const edges = []
  let current = 0
  visited.add(0)
  let totalLen = 0
  while (visited.size < nodes.length) {
    let best = Infinity, bestIdx = -1
    nodes.forEach((n, i) => {
      if (visited.has(i)) return
      const d = euclidDist(nodes[current], n)
      if (d < best) { best = d; bestIdx = i }
    })
    if (bestIdx === -1) break
    edges.push({ from: current, to: bestIdx, dist: best })
    totalLen += best
    visited.add(bestIdx)
    current = bestIdx
  }
  // Close tour
  if (nodes.length > 1) {
    const closingDist = euclidDist(nodes[current], nodes[0])
    edges.push({ from: current, to: 0, dist: closingDist })
    totalLen += closingDist
  }
  return { edges, length: Math.round(totalLen) }
}