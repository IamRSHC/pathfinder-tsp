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
// ── Custom node parser ─────────────────────────────────────────────────────
/**
 * Parse a user-pasted string of "x,y" or "x y" lines.
 * Returns { nodes: [{x,y,id}], errors: [string] }
 */
export function parseCustomNodes(raw) {
  const lines  = raw.split('\n').map(l => l.trim()).filter(Boolean)
  const nodes  = []
  const errors = []

  lines.forEach((line, i) => {
    // Accept "x,y"  "x y"  "x;y"  "x\ty"
    const parts = line.split(/[\s,;]+/).map(p => p.trim()).filter(Boolean)
    if (parts.length < 2) {
      errors.push(`Line ${i + 1}: "${line}" — need two numbers`)
      return
    }
    const x = parseFloat(parts[0])
    const y = parseFloat(parts[1])
    if (isNaN(x) || isNaN(y)) {
      errors.push(`Line ${i + 1}: "${line}" — not valid numbers`)
      return
    }
    nodes.push({ x, y, id: nodes.length })
  })

  return { nodes, errors }
}

/**
 * Scale parsed custom nodes to fit inside the canvas with padding.
 * Raw coords can be anything; we normalise to [padding, W-padding] × [padding, H-padding].
 */
export function scaleNodesToCanvas(rawNodes, width, height, padding = 60) {
  if (!rawNodes.length) return []
  const xs = rawNodes.map(n => n.x)
  const ys = rawNodes.map(n => n.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const rangeX = maxX - minX || 1
  const rangeY = maxY - minY || 1
  const usableW = width  - padding * 2
  const usableH = height - padding * 2
  return rawNodes.map((n, i) => ({
    id: i,
    x: padding + ((n.x - minX) / rangeX) * usableW,
    y: padding + ((n.y - minY) / rangeY) * usableH,
  }))
}

// ── Standard benchmark node sets ──────────────────────────────────────────
// Coords are in a 0–1000 normalised space; scaleNodesToCanvas() maps them to canvas.
export const STANDARD_SETS = {
  S: {
    label: 'Small (10)',
    count: 10,
    nodes: [
      { x: 100, y: 200 }, { x: 300, y: 100 }, { x: 500, y: 150 },
      { x: 700, y: 200 }, { x: 850, y: 400 }, { x: 750, y: 650 },
      { x: 500, y: 800 }, { x: 250, y: 700 }, { x: 100, y: 500 },
      { x: 400, y: 450 },
    ],
  },
  M: {
    label: 'Medium (20)',
    count: 20,
    nodes: [
      { x: 100, y: 150 }, { x: 250, y: 80  }, { x: 420, y: 100 },
      { x: 580, y: 80  }, { x: 750, y: 150 }, { x: 880, y: 300 },
      { x: 900, y: 480 }, { x: 820, y: 650 }, { x: 680, y: 780 },
      { x: 500, y: 830 }, { x: 320, y: 800 }, { x: 150, y: 700 },
      { x: 80,  y: 520 }, { x: 100, y: 350 }, { x: 220, y: 250 },
      { x: 380, y: 300 }, { x: 540, y: 280 }, { x: 680, y: 350 },
      { x: 620, y: 520 }, { x: 400, y: 550 },
    ],
  },
  L: {
    label: 'Large (30)',
    count: 30,
    nodes: [
      { x: 100, y: 100 }, { x: 280, y: 60  }, { x: 460, y: 80  },
      { x: 640, y: 60  }, { x: 820, y: 100 }, { x: 930, y: 260 },
      { x: 950, y: 440 }, { x: 900, y: 610 }, { x: 780, y: 750 },
      { x: 620, y: 840 }, { x: 440, y: 870 }, { x: 260, y: 820 },
      { x: 110, y: 700 }, { x: 60,  y: 520 }, { x: 80,  y: 340 },
      { x: 180, y: 200 }, { x: 340, y: 160 }, { x: 500, y: 180 },
      { x: 660, y: 200 }, { x: 800, y: 300 }, { x: 820, y: 460 },
      { x: 740, y: 600 }, { x: 580, y: 690 }, { x: 400, y: 710 },
      { x: 230, y: 650 }, { x: 150, y: 500 }, { x: 200, y: 360 },
      { x: 360, y: 330 }, { x: 520, y: 350 }, { x: 650, y: 440 },
    ],
  },
}
