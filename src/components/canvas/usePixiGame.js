import { useEffect, useRef, useCallback } from 'react'
import * as PIXI from 'pixi.js'
import { useGameStore } from '../../stores/gameStore'
import { useAiStore }   from '../../stores/aiStore'
import { useUiStore }   from '../../stores/uiStore'
import { euclidDist, generateNodes } from '../../utils/tspUtils'

// ── Color sets per theme ───────────────────────────────────────────────────
const THEME_COLORS = {
  cyber: {
    bg:        0x090d14,
    grid:      { r: 0,   g: 229, b: 255, a: 0.04 },
    node:      0x00e5ff,
    humanEdge: 0x00e5ff,
    aiEdge:    0xffab00,
    contested: 0xd500f9,
    nodeInner: 0x090d14,
    nodeFill:  0x00e5ff,
    glowAlpha: { min: 0.15, range: 0.12 },
    pulseScale: { min: 1, range: 0.08 },
  },
  serene: {
    bg:        0xF5F3EF,
    grid:      { r: 180, g: 170, b: 155, a: 0.18 },
    node:      0x2D6A4F,
    humanEdge: 0x2D6A4F,
    aiEdge:    0xB5838D,
    contested: 0x6D6875,
    nodeInner: 0xF5F3EF,
    nodeFill:  0x2D6A4F,
    glowAlpha: { min: 0.06, range: 0.05 },
    pulseScale: { min: 1, range: 0.03 },
  },
}

export function usePixiGame(containerRef) {
  const appRef        = useRef(null)
  const nodesGfxRef   = useRef([])
  const edgesGfxRef   = useRef(null)
  const hoveredRef    = useRef(-1)
  const selectedRef   = useRef(-1)
  const pulseTickRef  = useRef(0)

  const { nodes, humanEdges, aiEdges, difficulty, gamePhase, setNodes, addHumanEdge } = useGameStore()
  const { suggestion, requestSuggestion } = useAiStore()
  const { theme } = useUiStore()

  const C = THEME_COLORS[theme] || THEME_COLORS.cyber

  // ── Init Pixi ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || appRef.current) return

    const container = containerRef.current
    const app = new PIXI.Application({
      resizeTo:        container,
      backgroundColor: C.bg,
      antialias:       true,
      resolution:      window.devicePixelRatio || 1,
      autoDensity:     true,
    })
    container.appendChild(app.view)
    appRef.current = app

    const grid = new PIXI.Graphics()
    drawGrid(grid, container.offsetWidth, container.offsetHeight, C.grid)
    app.stage.addChild(grid)

    const edgesGfx = new PIXI.Graphics()
    app.stage.addChild(edgesGfx)
    edgesGfxRef.current = edgesGfx

    const sugGfx = new PIXI.Graphics()
    sugGfx.name = 'suggestion'
    app.stage.addChild(sugGfx)

    return () => {
      app.destroy(true, { children: true })
      appRef.current = null
      nodesGfxRef.current = []
    }
  }, [])

  // ── Update canvas bg + grid when theme changes ─────────────────────────────
  useEffect(() => {
    const app = appRef.current
    if (!app) return
    app.renderer.backgroundColor = C.bg

    // Redraw grid
    const grid = app.stage.children[0]
    if (grid && grid instanceof PIXI.Graphics) {
      grid.clear()
      drawGrid(grid, app.view.width, app.view.height, C.grid)
    }
  }, [theme])

  // ── Draw / redraw nodes ────────────────────────────────────────────────────
  useEffect(() => {
    const app = appRef.current
    if (!app || !nodes.length) return

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
      glow.lineStyle(theme === 'serene' ? 1 : 1.5, C.node, theme === 'serene' ? 0.18 : 0.25)
      glow.drawCircle(0, 0, 14)
      glow.name = 'glow'

      // Main node
      const circle = new PIXI.Graphics()
      circle.beginFill(C.nodeFill, theme === 'serene' ? 0.85 : 0.9)
      circle.drawCircle(0, 0, theme === 'serene' ? 6 : 7)
      circle.endFill()
      circle.name = 'circle'

      // Inner dot
      const inner = new PIXI.Graphics()
      inner.beginFill(C.nodeInner)
      inner.drawCircle(0, 0, theme === 'serene' ? 2.5 : 3)
      inner.endFill()

      // Label
      const label = new PIXI.Text(String(idx), {
        fontFamily: theme === 'serene' ? 'DM Mono' : 'JetBrains Mono',
        fontSize:   theme === 'serene' ? 8 : 9,
        fill:       C.node,
        align:      'center',
      })
      label.anchor.set(0.5)
      label.y = -20
      label.alpha = theme === 'serene' ? 0.55 : 0.7

      container.addChild(glow, circle, inner, label)

      container.on('pointerover', () => {
        hoveredRef.current = idx
        circle.tint = 0xffffff
        glow.alpha  = theme === 'serene' ? 0.4 : 1
      })
      container.on('pointerout', () => {
        hoveredRef.current = -1
        circle.tint = 0xffffff
        if (selectedRef.current !== idx) glow.alpha = theme === 'serene' ? 0.1 : 0.25
      })
      container.on('pointerdown', () => handleNodeClick(idx))

      app.stage.addChild(container)
      nodesGfxRef.current.push(container)
    })
  }, [nodes, theme])

  // ── Redraw edges ───────────────────────────────────────────────────────────
  useEffect(() => {
    const gfx = edgesGfxRef.current
    if (!gfx || !nodes.length) return
    gfx.clear()

    humanEdges.forEach(({ from, to }) => {
      gfx.lineStyle(theme === 'serene' ? 1.5 : 2, C.humanEdge, theme === 'serene' ? 0.7 : 0.8)
      gfx.moveTo(nodes[from].x, nodes[from].y)
      gfx.lineTo(nodes[to].x,   nodes[to].y)
    })

    aiEdges.forEach(({ from, to }) => {
      gfx.lineStyle(theme === 'serene' ? 1.5 : 2, C.aiEdge, theme === 'serene' ? 0.55 : 0.6)
      gfx.moveTo(nodes[from].x, nodes[from].y)
      gfx.lineTo(nodes[to].x,   nodes[to].y)
    })
  }, [humanEdges, aiEdges, nodes, theme])

  // ── Suggestion overlay ─────────────────────────────────────────────────────
  useEffect(() => {
    const app = appRef.current
    if (!app) return
    const sugGfx = app.stage.getChildByName('suggestion')
    if (!sugGfx) return
    sugGfx.clear()
    if (!suggestion || !nodes.length) return

    const { from, to } = suggestion
    if (!nodes[from] || !nodes[to]) return

    sugGfx.lineStyle(theme === 'serene' ? 1 : 2, C.contested, theme === 'serene' ? 0.5 : 0.7)
    drawDashed(sugGfx, nodes[from].x, nodes[from].y, nodes[to].x, nodes[to].y, 8, 5)

    sugGfx.lineStyle(theme === 'serene' ? 1 : 2, C.contested, theme === 'serene' ? 0.6 : 0.9)
    sugGfx.drawCircle(nodes[to].x, nodes[to].y, 16)
  }, [suggestion, nodes, theme])

  // ── Pulse ticker ───────────────────────────────────────────────────────────
  useEffect(() => {
    const app = appRef.current
    if (!app) return
    const ticker = app.ticker.add(() => {
      pulseTickRef.current += theme === 'serene' ? 0.02 : 0.04
      nodesGfxRef.current.forEach((c, i) => {
        const glow = c.getChildByName('glow')
        if (glow) {
          const offset = (i * 0.3) + pulseTickRef.current
          glow.alpha  = C.glowAlpha.min + Math.sin(offset) * C.glowAlpha.range
          glow.scale.set(C.pulseScale.min + Math.sin(offset) * C.pulseScale.range)
        }
      })
    })
    return () => app.ticker.remove(ticker)
  }, [nodes, theme])

  // ── Node click ─────────────────────────────────────────────────────────────
  const handleNodeClick = useCallback((idx) => {
    const { nodes, humanEdges, gamePhase } = useGameStore.getState()
    if (gamePhase !== 'routing') return

    const prev = selectedRef.current

    if (prev === -1) {
      selectedRef.current = idx
      highlightNode(idx, true)
      return
    }

    if (prev === idx) {
      selectedRef.current = -1
      highlightNode(idx, false)
      return
    }

    const exists = humanEdges.some(
      e => (e.from === prev && e.to === idx) || (e.from === idx && e.to === prev)
    )
    if (exists) return

    const d = euclidDist(nodes[prev], nodes[idx])
    addHumanEdge({ from: prev, to: idx, dist: d })

    highlightNode(prev, false)
    selectedRef.current = -1

    const { requestSuggestion } = useAiStore.getState()
    requestSuggestion(nodes, useGameStore.getState().humanEdges)
  }, [])

  function highlightNode(idx, on) {
    const c = nodesGfxRef.current[idx]
    if (!c) return
    const glow = c.getChildByName('glow')
    const { theme } = useUiStore.getState()
    if (glow) glow.alpha = on
      ? (theme === 'serene' ? 0.5 : 1)
      : (theme === 'serene' ? 0.1 : 0.25)
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
function drawGrid(gfx, w, h, gridColor) {
  const { r, g, b, a } = gridColor
  gfx.lineStyle(1, (r << 16) | (g << 8) | b, a)
  for (let x = 0; x < w; x += 40) { gfx.moveTo(x, 0); gfx.lineTo(x, h) }
  for (let y = 0; y < h; y += 40) { gfx.moveTo(0, y); gfx.lineTo(w, y) }
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