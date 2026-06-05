/**
 * tourValidator.js
 * ─────────────────────────────────────────────────────────────────────────
 * All logic for enforcing a valid Hamiltonian-cycle (closed TSP tour):
 *   • Every node visited exactly once
 *   • Every node has degree exactly 2 in the completed tour
 *   • No sub-tours (premature closure of a loop)
 *   • Final edge must close back to the designated start node
 */

/**
 * Returns a degree map: { nodeIndex: count } for all edges.
 */
export function getNodeDegrees(edges) {
  const deg = {}
  edges.forEach(({ from, to }) => {
    deg[from] = (deg[from] || 0) + 1
    deg[to]   = (deg[to]   || 0) + 1
  })
  return deg
}

/**
 * Would adding edge (from → to) exceed degree-2 on either endpoint?
 * Returns the offending node index, or -1 if fine.
 */
export function exceedsDegree(edges, from, to) {
  const deg = getNodeDegrees(edges)
  if ((deg[from] || 0) >= 2) return from
  if ((deg[to]   || 0) >= 2) return to
  return -1
}

/**
 * Would adding edge (from → to) close a sub-tour that does NOT include
 * all nodes?
 *
 * Algorithm: build an adjacency list from existing edges + the candidate
 * edge, then do a DFS/BFS from `from`. If we can reach `from` again via
 * the candidate edge AND the connected component is smaller than totalNodes,
 * it's a premature closure.
 */
export function wouldCloseSubtour(edges, from, to, totalNodes) {
  // Build adjacency from existing edges only
  const adj = {}
  edges.forEach(({ from: f, to: t }) => {
    if (!adj[f]) adj[f] = []
    if (!adj[t]) adj[t] = []
    adj[f].push(t)
    adj[t].push(f)
  })

  // Check if `to` can already reach `from` through existing edges.
  // If yes, adding from→to would close a cycle.
  const visited = new Set()
  const stack   = [to]
  while (stack.length) {
    const cur = stack.pop()
    if (cur === from) {
      // Found a path to→from through existing edges → adding this edge closes a loop.
      // Count reachable nodes to see if the loop is complete.
      const reachable = new Set()
      const countStack = [from]
      while (countStack.length) {
        const n = countStack.pop()
        if (reachable.has(n)) continue
        reachable.add(n)
        ;(adj[n] || []).forEach(nb => countStack.push(nb))
      }
      // Also count the candidate endpoints
      reachable.add(from)
      reachable.add(to)
      // If reachable count < totalNodes, it's a premature sub-tour
      return reachable.size < totalNodes
    }
    if (visited.has(cur)) continue
    visited.add(cur)
    ;(adj[cur] || []).forEach(nb => stack.push(nb))
  }
  return false
}

/**
 * Is the tour complete?
 *   • edges.length === totalNodes  (one edge per node in a Hamiltonian cycle)
 *   • every node has degree exactly 2
 *   • the graph is fully connected (one component)
 *   • startNode is in the tour (always true if degree-2 enforced)
 */
export function isTourComplete(edges, totalNodes, startNode) {
  if (edges.length !== totalNodes) return false

  const deg = getNodeDegrees(edges)
  for (let i = 0; i < totalNodes; i++) {
    if ((deg[i] || 0) !== 2) return false
  }

  // Connectivity check via BFS
  const adj = {}
  edges.forEach(({ from, to }) => {
    if (!adj[from]) adj[from] = []
    if (!adj[to])   adj[to]   = []
    adj[from].push(to)
    adj[to].push(from)
  })
  const visited = new Set()
  const queue   = [startNode ?? 0]
  while (queue.length) {
    const n = queue.shift()
    if (visited.has(n)) continue
    visited.add(n)
    ;(adj[n] || []).forEach(nb => queue.push(nb))
  }
  return visited.size === totalNodes
}

/**
 * How many more edges are needed to complete the tour?
 */
export function edgesRemaining(currentEdgeCount, totalNodes) {
  return Math.max(0, totalNodes - currentEdgeCount)
}

/**
 * Given existing edges, find the "chain endpoint" that the player should
 * connect next — i.e. the node currently at degree 1 that is furthest
 * along the chain from startNode.  Returns -1 if no such node.
 *
 * Used for the "connect back to start" hint.
 */
export function getOpenEndpoint(edges, startNode) {
  if (!edges.length) return -1
  const deg = getNodeDegrees(edges)
  const openEnds = Object.entries(deg)
    .filter(([, d]) => d === 1)
    .map(([n]) => parseInt(n, 10))
  // The open end that is NOT the start node (or whichever isn't start)
  const nonStart = openEnds.filter(n => n !== startNode)
  return nonStart.length ? nonStart[0] : (openEnds[0] ?? -1)
}
