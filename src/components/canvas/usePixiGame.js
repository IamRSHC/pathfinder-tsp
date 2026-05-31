import { useEffect, useRef, useCallback } from 'react'
import * as PIXI from 'pixi.js'
import { useGameStore } from '../../stores/gameStore'
import { useAiStore }   from '../../stores/aiStore'
import { euclidDist, generateNodes } from '../../utils/tspUtils'

const COLORS = {
  node:      0x00e5ff,
  nodeHover: 0xffffff,
  humanEdge: 0x00e5ff,
  aiEdge:    0xffab00,
  contested: 0xd500f9,
  bg:        0x090d14,
  grid:      0x0f1623,
  nodeInner: 0x090d14,
}

export function usePixiGame(containerRef) {
  const appRef        = useRef(null)
  const nodesGfxRef   = useRef([])
  const edgesGfxRef   = useRef(null)
  const hoveredRef    = useRef(-1)
  const selectedRef   = useRef(-1)
  const tickerRef     = useRef(null)
  const pulseTickRef  = useRef(0)

  const { nodes, humanEdges, aiEdges, difficulty, gamePhase, setNodes, addHumanEdge } = useGameStore()
  const { suggestion, requestSuggestion } = useAiStore()

  // ── Init Pixi ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || appRef.current) return

    const container = containerRef.current
    const app = new PIXI.Application({
      resizeTo:        container,
      backgroundColor: COLORS.bg,
      antialias:       true,
      resolution:      window.devicePixelRatio || 1,
      autoDensity:     true,
    })
    container.appendChild(app.view)
    appRef.current = app

    // Grid background
    const grid = new PIXI.Graphics()
    drawGrid(grid, container.offsetWidth, container.offsetHeight)
    app.stage.addChild(grid)

    // Edges layer (below nodes)
    const edgesGfx = new PIXI.Graphics()
    app.stage.addChild(edgesGfx)
    edgesGfxRef.current = edgesGfx

    // Suggestion overlay
    const sugGfx = new PIXI.Graphics()
    sugGfx.name = 'suggestion'
    app.stage.addChild(sugGfx)

    return () => {
      app.destroy(true, { children: true })
      appRef.current = null
      nodesGfxRef.current = []
    }
  }, [])

  // ── Draw / redraw nodes ────────────────────────────────────────────────────
  useEffect(() => {
    const app = appRef.current
    if (!app || !nodes.length) return

    // Clear old nodes
    nodesGfxRef.current.forEach(c => c.destroy())
    nodesGfxRef.current = []

    nodes.forEach((node, idx) => {
      const container = new PIXI.Container()
      container.x = node.x
      container.y = node.y
      container.interactive = true
      container.buttonMode  = true
      container.hitArea     = new PIXI.Circle(0, 0, 18)

      // Outer glow ring
      const glow = new PIXI.Graphics()
      glow.lineStyle(1.5, COLORS.node, 0.25)
      glow.drawCircle(0, 0, 14)
      glow.name = 'glow'

      // Main node circle
      const circle = new PIXI.Graphics()
      circle.beginFill(COLORS.node, 0.9)
      circle.drawCircle(0, 0, 7)
      circle.endFill()
      circle.name = 'circle'

      // Inner dot
      const inner = new PIXI.Graphics()
      inner.beginFill(COLORS.nodeInner)
      inner.drawCircle(0, 0, 3)
      inner.endFill()

      // Label
      const label = new PIXI.Text(String(idx), {
        fontFamily: 'JetBrains Mono',
        fontSize:   9,
        fill:       0x00e5ff,
        align:      'center',
      })
      label.anchor.set(0.5)
      label.y = -20
      label.alpha = 0.7

      container.addChild(glow, circle, inner, label)

      // Hover
      container.on('pointerover', () => {
        hoveredRef.current = idx
        circle.tint = 0xffffff
        glow.alpha  = 1
      })
      container.on('pointerout', () => {
        hoveredRef.current = -1
        circle.tint = 0xffffff
        if (selectedRef.current !== idx) glow.alpha = 0.25
      })

      // Click — add edge
      container.on('pointerdown', () => handleNodeClick(idx))

      app.stage.addChild(container)
      nodesGfxRef.current.push(container)
    })
  }, [nodes])

  // ── Redraw edges ───────────────────────────────────────────────────────────
  useEffect(() => {
    const gfx = edgesGfxRef.current
    if (!gfx || !nodes.length) return
    gfx.clear()

    // Human edges
    humanEdges.forEach(({ from, to }) => {
      gfx.lineStyle(2, COLORS.humanEdge, 0.8)
      gfx.moveTo(nodes[from].x, nodes[from].y)
      gfx.lineTo(nodes[to].x,   nodes[to].y)
    })

    // AI edges
    aiEdges.forEach(({ from, to }) => {
      gfx.lineStyle(2, COLORS.aiEdge, 0.6)
      gfx.moveTo(nodes[from].x, nodes[from].y)
      gfx.lineTo(nodes[to].x,   nodes[to].y)
    })
  }, [humanEdges, aiEdges, nodes])

  // ── Draw suggestion overlay ────────────────────────────────────────────────
  useEffect(() => {
    const app = appRef.current
    if (!app) return
    const sugGfx = app.stage.getChildByName('suggestion')
    if (!sugGfx) return
    sugGfx.clear()
    if (!suggestion || !nodes.length) return

    const { from, to } = suggestion
    if (!nodes[from] || !nodes[to]) return

    // Dashed suggestion line
    sugGfx.lineStyle(2, COLORS.contested, 0.7)
    drawDashed(sugGfx, nodes[from].x, nodes[from].y, nodes[to].x, nodes[to].y, 8, 5)

    // Highlight target node
    sugGfx.lineStyle(2, COLORS.contested, 0.9)
    sugGfx.drawCircle(nodes[to].x, nodes[to].y, 16)
  }, [suggestion, nodes])

  // ── Pulse ticker ───────────────────────────────────────────────────────────
  useEffect(() => {
    const app = appRef.current
    if (!app) return
    const ticker = app.ticker.add(() => {
      pulseTickRef.current += 0.04
      nodesGfxRef.current.forEach((c, i) => {
        const glow = c.getChildByName('glow')
        if (glow) {
          const offset = (i * 0.3) + pulseTickRef.current
          glow.alpha  = 0.15 + Math.sin(offset) * 0.12
          glow.scale.set(1 + Math.sin(offset) * 0.08)
        }
      })
    })
    return () => app.ticker.remove(ticker)
  }, [nodes])

  // ── Handle node click ──────────────────────────────────────────────────────
  const handleNodeClick = useCallback((idx) => {
    const { nodes, humanEdges, gamePhase } = useGameStore.getState()
    if (gamePhase !== 'routing') return

    const prev = selectedRef.current

    if (prev === -1) {
      // First node selected
      selectedRef.current = idx
      highlightNode(idx, true)
      return
    }

    if (prev === idx) {
      // Deselect
      selectedRef.current = -1
      highlightNode(idx, false)
      return
    }

    // Check duplicate edge
    const exists = humanEdges.some(
      e => (e.from === prev && e.to === idx) || (e.from === idx && e.to === prev)
    )
    if (exists) return

    const d = euclidDist(nodes[prev], nodes[idx])
    addHumanEdge({ from: prev, to: idx, dist: d })

    highlightNode(prev, false)
    selectedRef.current = -1

    // Request AI suggestion after human move
    const { requestSuggestion } = useAiStore.getState()
    requestSuggestion(nodes, useGameStore.getState().humanEdges)
  }, [])

  function highlightNode(idx, on) {
    const c = nodesGfxRef.current[idx]
    if (!c) return
    const glow = c.getChildByName('glow')
    if (glow) glow.alpha = on ? 1 : 0.25
  }

  // ── Spawn nodes ────────────────────────────────────────────────────────────
  const spawnNodes = useCallback(() => {
    const app = appRef.current
    if (!app) return
    const { difficulty } = useGameStore.getState()
    const { offsetWidth: w, offsetHeight: h } = app.view
    const newNodes = generateNodes(difficulty, w, h)
    setNodes(newNodes)
  }, [])

  return { spawnNodes }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function drawGrid(gfx, w, h) {
  gfx.lineStyle(1, 0x00e5ff, 0.04)
  for (let x = 0; x < w; x += 40) { gfx.moveTo(x, 0); gfx.lineTo(x, h) }
  for (let y = 0; y < h; y += 40) { gfx.moveTo(0, y); gfx.lineTo(w,  y) }
}

function drawDashed(gfx, x1, y1, x2, y2, dashLen = 8, gapLen = 5) {
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)
  const nx = dx / len, ny = dy / len
  let pos = 0, drawing = true
  while (pos < len) {
    const seg = Math.min(drawing ? dashLen : gapLen, len - pos)
    const sx = x1 + nx * pos, sy = y1 + ny * pos
    const ex = sx + nx * seg, ey = sy + ny * seg
    if (drawing) { gfx.moveTo(sx, sy); gfx.lineTo(ex, ey) }
    pos += seg; drawing = !drawing
  }
}