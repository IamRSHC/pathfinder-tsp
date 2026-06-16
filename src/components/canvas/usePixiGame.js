import { useEffect, useRef, useCallback } from 'react'
import * as PIXI from 'pixi.js'
import { useGameStore } from '../../stores/gameStore'
import { useAiStore }   from '../../stores/aiStore'
import { useUiStore }   from '../../stores/uiStore'
import { euclidDist, generateNodes, scaleNodesToCanvas, STANDARD_SETS, parseCustomNodes } from '../../utils/tspUtils'
import { exceedsDegree, wouldCloseSubtour } from '../../utils/tourValidator'

// ── Color sets per theme ───────────────────────────────────────────────────
const THEME_COLORS = {
  cyber: {
    bg: 0x090d14, grid: { r: 0, g: 229, b: 255, a: 0.04 },
    node: 0x00e5ff, humanEdge: 0x00e5ff, aiEdge: 0xffab00,
    contested: 0xd500f9, nodeInner: 0x090d14, nodeFill: 0x00e5ff,
    startNode: 0xffd700, startGlow: 0xffa500,
    glowAlpha: { min: 0.15, range: 0.12 }, pulseScale: { min: 1, range: 0.08 },
  },
  serene: {
    bg: 0xF5F3EF, grid: { r: 180, g: 170, b: 155, a: 0.18 },
    node: 0x2D6A4F, humanEdge: 0x2D6A4F, aiEdge: 0xB5838D,
    contested: 0x6D6875, nodeInner: 0xF5F3EF, nodeFill: 0x2D6A4F,
    startNode: 0xE07B39, startGlow: 0xE07B39,
    glowAlpha: { min: 0.06, range: 0.05 }, pulseScale: { min: 1, range: 0.03 },
  },
}

const HIT_RADIUS = 28

export function usePixiGame(containerRef) {
  const appRef       = useRef(null)
  const nodesGfxRef  = useRef([])
  const edgesGfxRef  = useRef(null)
  const hoveredRef   = useRef(-1)
  const selectedRef  = useRef(-1)
  const pulseTickRef = useRef(0)
  const nodeDownStagePos = useRef({ x: 0, y: 0 })  // stage position at last pointerdown

  const { nodes, humanEdges, aiEdges, gamePhase, startNode, difficulty,
          nodeSource, standardSize, customRaw,
          setNodes, addHumanEdge, setStartNode } = useGameStore()
  const { suggestion, requestSuggestion } = useAiStore()
  const { theme, showNotification } = useUiStore()
  const C = THEME_COLORS[theme] || THEME_COLORS.cyber

  // ── Init Pixi ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || appRef.current) return
    const container = containerRef.current
    const app = new PIXI.Application({
      resizeTo: container, backgroundColor: C.bg,
      antialias: true, resolution: window.devicePixelRatio || 1, autoDensity: true,
    })
    container.appendChild(app.view)
    app.view.style.touchAction = 'none'
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
      const appToDestroy = app
      requestAnimationFrame(() => {
        try { appToDestroy.destroy(true, { children: true }) } catch (_) {}
      })
      appRef.current = null; nodesGfxRef.current = []; edgesGfxRef.current = null
    }
  }, [])

  // ── Theme change ──────────────────────────────────────────────────────
  useEffect(() => {
    const app = appRef.current
    if (!app) return
    app.renderer.backgroundColor = C.bg
    const grid = app.stage.children[0]
    if (grid instanceof PIXI.Graphics) {
      grid.clear()
      drawGrid(grid, app.view.width, app.view.height, C.grid)
    }
  }, [theme])

  // ── Draw nodes ────────────────────────────────────────────────────────
  useEffect(() => {
    const app = appRef.current
    if (!app || !nodes.length) return
    nodesGfxRef.current.forEach(c => c.destroy())
    nodesGfxRef.current = []

    const { startNode: sn, gamePhase: gp } = useGameStore.getState()

    nodes.forEach((node, idx) => {
      const isStart = sn === idx
      const cont    = new PIXI.Container()
      cont.x = node.x; cont.y = node.y
      cont.interactive = true; cont.buttonMode = true
      cont.hitArea = new PIXI.Circle(0, 0, HIT_RADIUS)

      // Outer glow ring
      const glow = new PIXI.Graphics()
      glow.lineStyle(isStart ? 2.5 : (theme === 'serene' ? 1 : 1.5),
        isStart ? C.startNode : C.node,
        isStart ? 0.8 : (theme === 'serene' ? 0.18 : 0.25))
      glow.drawCircle(0, 0, isStart ? 18 : 14)
      glow.name = 'glow'

      // Second ring for start node
      if (isStart) {
        const ring2 = new PIXI.Graphics()
        ring2.lineStyle(1.5, C.startGlow, 0.4)
        ring2.drawCircle(0, 0, 24)
        ring2.name = 'ring2'
        cont.addChild(ring2)
      }

      // Main circle
      const circle = new PIXI.Graphics()
      circle.beginFill(isStart ? C.startNode : C.nodeFill,
        theme === 'serene' ? 0.85 : 0.9)
      circle.drawCircle(0, 0, isStart ? 9 : (theme === 'serene' ? 6 : 7))
      circle.endFill(); circle.name = 'circle'

      // Inner dot
      const inner = new PIXI.Graphics()
      inner.beginFill(isStart ? C.nodeInner : C.nodeInner)
      inner.drawCircle(0, 0, isStart ? 3.5 : (theme === 'serene' ? 2.5 : 3))
      inner.endFill()

      // Label
      const label = new PIXI.Text(isStart ? `★${idx}` : String(idx), {
        fontFamily: theme === 'serene' ? 'DM Mono' : 'JetBrains Mono',
        fontSize:   isStart ? 10 : (theme === 'serene' ? 8 : 9),
        fill:       isStart ? C.startNode : C.node,
        fontWeight: isStart ? 'bold' : 'normal',
        align:      'center',
      })
      label.anchor.set(0.5); label.y = isStart ? -26 : -20
      label.alpha = isStart ? 1 : (theme === 'serene' ? 0.55 : 0.7)

      cont.addChild(glow, circle, inner, label)

      cont.on('pointerover', () => {
        hoveredRef.current = idx; circle.tint = 0xffffff
        glow.alpha = theme === 'serene' ? 0.4 : 1
      })
      cont.on('pointerout', () => {
        hoveredRef.current = -1; circle.tint = 0xffffff
        if (selectedRef.current !== idx) glow.alpha = theme === 'serene' ? 0.1 : 0.25
      })
      cont.on('pointerdown', () => {
        // Record stage position at the moment of touch/click down.
        // Used in pointerup to distinguish a tap from a pan gesture.
        nodeDownStagePos.current = { x: app.stage.x, y: app.stage.y }
      })
      cont.on('pointerup', () => {
        // Compare stage position now vs at pointerdown.
        // If the stage moved more than 10px the user was panning — not clicking.
        // This works for BOTH desktop (stage never moves, delta always 0)
        // and mobile (stage moves during pan, delta > 10).
        // No race condition: both events come from Pixi's own ordered queue.
        const dx = Math.abs(app.stage.x - nodeDownStagePos.current.x)
        const dy = Math.abs(app.stage.y - nodeDownStagePos.current.y)
        if (dx > 10 || dy > 10) return  // was a pan — ignore
        handleNodeClick(idx)
      })

      app.stage.addChild(cont)
      nodesGfxRef.current.push(cont)
    })
  }, [nodes, theme, startNode])

  // ── Redraw edges ──────────────────────────────────────────────────────
  useEffect(() => {
    const gfx = edgesGfxRef.current
    if (!gfx || !nodes.length) return
    gfx.clear()
    humanEdges.forEach(({ from, to }) => {
      gfx.lineStyle(theme === 'serene' ? 1.5 : 2, C.humanEdge, theme === 'serene' ? 0.7 : 0.8)
      gfx.moveTo(nodes[from].x, nodes[from].y)
      gfx.lineTo(nodes[to].x, nodes[to].y)
    })
    aiEdges.forEach(({ from, to }) => {
      gfx.lineStyle(theme === 'serene' ? 1.5 : 2, C.aiEdge, theme === 'serene' ? 0.55 : 0.6)
      gfx.moveTo(nodes[from].x, nodes[from].y)
      gfx.lineTo(nodes[to].x, nodes[to].y)
    })
  }, [humanEdges, aiEdges, nodes, theme])

  // ── Suggestion overlay ────────────────────────────────────────────────
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

  // ── Mobile touch: pan (1 finger) + pinch-zoom (2 fingers) ─────────────
  // Desktop mouse events are completely untouched.
  // Guards: 'ontouchstart' in window — only runs on touch devices.
  useEffect(() => {
    const app = appRef.current
    if (!app || !('ontouchstart' in window)) return

    const canvas = app.view
    let panStartX     = 0, panStartY     = 0
    let stageStartX   = 0, stageStartY   = 0
    let totalMoveDist = 0
    let isPanning     = false
    let pinchStartDist  = 0
    let pinchStartScale = 1

    function touchDist(t) {
      const dx = t[0].clientX - t[1].clientX
      const dy = t[0].clientY - t[1].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }

    // Clamp stage so user never pans into empty space beyond the canvas bounds
    function clampStage() {
      const sc  = app.stage.scale.x
      const pr  = window.devicePixelRatio || 1
      const vw  = app.view.width  / pr
      const vh  = app.view.height / pr
      const ww  = vw * sc
      const wh  = vh * sc
      app.stage.x = Math.max(Math.min(0, vw - ww), Math.min(0, app.stage.x))
      app.stage.y = Math.max(Math.min(0, vh - wh), Math.min(0, app.stage.y))
    }

    function onTouchStart(e) {
      if (e.touches.length === 1) {
        panStartX     = e.touches[0].clientX
        panStartY     = e.touches[0].clientY
        stageStartX   = app.stage.x
        stageStartY   = app.stage.y
        totalMoveDist = 0
        isPanning     = false
        pinchStartDist = 0
      } else if (e.touches.length === 2) {
        pinchStartDist  = touchDist(e.touches)
        pinchStartScale = app.stage.scale.x
        isPanning       = false
      }
    }

    function onTouchMove(e) {
      e.preventDefault()
      if (e.touches.length === 1 && pinchStartDist === 0) {
        const dx = e.touches[0].clientX - panStartX
        const dy = e.touches[0].clientY - panStartY
        totalMoveDist = Math.sqrt(dx * dx + dy * dy)
        if (totalMoveDist > 8) {
          isPanning   = true
          app.stage.x = stageStartX + dx
          app.stage.y = stageStartY + dy
          clampStage()
        }
      } else if (e.touches.length === 2 && pinchStartDist > 0) {
        const dist     = touchDist(e.touches)
        const newScale = Math.max(0.45, Math.min(2.8, pinchStartScale * (dist / pinchStartDist)))
        const rect     = canvas.getBoundingClientRect()
        const mx       = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left
        const my       = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top
        const ratio    = newScale / app.stage.scale.x
        app.stage.x    = mx - (mx - app.stage.x) * ratio
        app.stage.y    = my - (my - app.stage.y) * ratio
        app.stage.scale.set(newScale)
        clampStage()
        isPanning = true
      }
    }

    function onTouchEnd(e) {
      if (e.touches.length === 0) {
        // isPanning state is now consumed by the stage-delta check in
        // each node's pointerup handler — no flag needed here.
        isPanning      = false
        pinchStartDist = 0
      }
    }

    canvas.addEventListener('touchstart', onTouchStart, { passive: true  })
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false })
    canvas.addEventListener('touchend',   onTouchEnd,   { passive: true  })
    return () => {
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove',  onTouchMove)
      canvas.removeEventListener('touchend',   onTouchEnd)
    }
  }, [nodes]) // re-attach after node rebuild (new containers on stage)

  // ── Pulse ticker ──────────────────────────────────────────────────────
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

  // ── Node click ────────────────────────────────────────────────────────
  const handleNodeClick = useCallback((idx) => {
    const state = useGameStore.getState()
    const { showNotification: notify } = useUiStore.getState()

    // ── PLACING phase: pick the start node ────────────────────────────
    if (state.gamePhase === 'placing') {
      setStartNode(idx)
      // Re-render nodes to show the star
      return
    }

    if (state.gamePhase !== 'routing') return
    const { nodes, humanEdges, startNode: sn } = state
    const prev = selectedRef.current

    // First selection
    if (prev === -1) {
      selectedRef.current = idx
      highlightNode(idx, true)
      return
    }

    // Deselect same node
    if (prev === idx) {
      selectedRef.current = -1
      highlightNode(idx, false)
      return
    }

    // ── Validation ──────────────────────────────────────────────────────

    // 1. Duplicate edge check
    const exists = humanEdges.some(
      e => (e.from === prev && e.to === idx) || (e.from === idx && e.to === prev)
    )
    if (exists) {
      notify('Edge already exists between these nodes', 'warn')
      selectedRef.current = -1; highlightNode(prev, false); return
    }

    // 2. Degree-2 constraint
    const offender = exceedsDegree(humanEdges, prev, idx)
    if (offender !== -1) {
      notify(`Node ${offender} already has 2 connections`, 'warn')
      selectedRef.current = -1; highlightNode(prev, false); return
    }

    // 3. Sub-tour prevention
    if (wouldCloseSubtour(humanEdges, prev, idx, nodes.length)) {
      notify('This would close an incomplete sub-tour', 'warn')
      selectedRef.current = -1; highlightNode(prev, false); return
    }

    // ── Valid edge ──────────────────────────────────────────────────────
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
    const { theme: th } = useUiStore.getState()
    if (glow) glow.alpha = on ? (th === 'serene' ? 0.5 : 1) : (th === 'serene' ? 0.1 : 0.25)
  }

  // ── Spawn nodes (called from GameCanvas) ──────────────────────────────
  const spawnNodes = useCallback(() => {
    const app = appRef.current
    if (!app) return
    const state = useGameStore.getState()
    // Use containerRef dimensions, not app.view — app.view can be 0x0 when hidden
    const container = containerRef.current
    const w = container?.offsetWidth  || container?.clientWidth  || 800
    const h = container?.offsetHeight || container?.clientHeight || 600

    let newNodes = []
    if (state.nodeSource === 'standard') {
      const set = STANDARD_SETS[state.standardSize] || STANDARD_SETS.M
      newNodes = scaleNodesToCanvas(set.nodes, w, h)
    } else if (state.nodeSource === 'custom') {
      const { nodes: parsed } = parseCustomNodes(state.customRaw)
      if (parsed.length < 3) {
        useUiStore.getState().showNotification('Need at least 3 valid nodes', 'warn')
        return
      }
      newNodes = scaleNodesToCanvas(parsed, w, h)
    } else {
      newNodes = generateNodes(state.difficulty, w, h)
    }
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
