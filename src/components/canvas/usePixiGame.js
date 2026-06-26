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
    currentNode: 0x00ff80, currentGlow: 0x00cc55,  // neon spring green — distinct from suggestion purple
    glowAlpha: { min: 0.15, range: 0.12 }, pulseScale: { min: 1, range: 0.08 },
  },
  serene: {
    bg: 0xF5F3EF, grid: { r: 180, g: 170, b: 155, a: 0.18 },
    node: 0x2D6A4F, humanEdge: 0x2D6A4F, aiEdge: 0x4A3B8C,  // deep indigo — visible on cream
    contested: 0x6D6875, nodeInner: 0xF5F3EF, nodeFill: 0x2D6A4F,
    startNode: 0xE07B39, startGlow: 0xE07B39,
    currentNode: 0x1B5E8A, currentGlow: 0x0D7A9E,  // deep ocean blue — "you are here"
    glowAlpha: { min: 0.06, range: 0.05 }, pulseScale: { min: 1, range: 0.03 },
  },
}

const HIT_RADIUS = 36   // enlarged for reliable tap targets at any zoom level

export function usePixiGame(containerRef) {
  const appRef       = useRef(null)
  const nodesGfxRef  = useRef([])
  const edgesGfxRef  = useRef(null)
  const hoveredRef   = useRef(-1)
  const selectedRef  = useRef(-1)
  const pulseTickRef = useRef(0)
  const nodeDownStagePos = useRef({ x: 0, y: 0 })  // stage position at last pointerdown
  const multiTouchRef    = useRef(false)            // true when 2+ fingers are/were on screen
  const isPanningRef     = useRef(false)            // true while a mouse-drag pan is active
  const currentNodeRef    = useRef(-1)              // node the player is currently "at"
  const pointerPosRef     = useRef({ x: 0, y: 0 }) // world-space cursor at last pointerdown
  const prevNodeCountRef  = useRef(0)               // detects new-game spawns for auto-fit

  const { nodes, humanEdges, gamePhase, startNode, difficulty,
          nodeSource, standardSize, customRaw, mode,
          setNodes, addHumanEdge, setStartNode } = useGameStore()
  const { suggestion, requestSuggestion, pheromoneEdges, acoPhase,
          aiRevealedEdges } = useAiStore()
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
    // Pheromone overlay — rendered between edges and suggestion layers
    const pheromoneGfx = new PIXI.Graphics()
    pheromoneGfx.name = 'pheromone'
    app.stage.addChild(pheromoneGfx)
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

      // ── "You are here" ring — hidden until this node becomes current ──
      const currentRing = new PIXI.Graphics()
      currentRing.lineStyle(2, C.currentNode, 0)           // alpha 0 = hidden
      currentRing.drawCircle(0, 0, 22)
      currentRing.name = 'currentRing'
      const currentRing2 = new PIXI.Graphics()
      currentRing2.lineStyle(1, C.currentGlow, 0)
      currentRing2.drawCircle(0, 0, 28)
      currentRing2.name = 'currentRing2'
      cont.addChild(currentRing, currentRing2)

      cont.on('pointerover', () => {
        hoveredRef.current = idx; circle.tint = 0xffffff
        glow.alpha = theme === 'serene' ? 0.4 : 1
      })
      cont.on('pointerout', () => {
        hoveredRef.current = -1; circle.tint = 0xffffff
        if (selectedRef.current !== idx) glow.alpha = theme === 'serene' ? 0.1 : 0.25
      })
      cont.on('pointerdown', (e) => {
        // Record stage position at the moment of touch/click down.
        // Used in pointerup to distinguish a tap from a pan gesture.
        nodeDownStagePos.current = { x: app.stage.x, y: app.stage.y }
        // Record world-space cursor position so nearest-node resolution works
        // correctly even when two nodes have overlapping hit areas.
        const wp = e.data.getLocalPosition(app.stage)
        pointerPosRef.current = { x: wp.x, y: wp.y }
      })
      cont.on('pointerup', () => {
        // Guard 1 — Multi-touch: pinch/zoom → never a node tap.
        if (multiTouchRef.current) return

        // Guard 2 — Pan detection: normalize stage delta by current zoom scale
        // so the threshold is consistent in world-space at every zoom level.
        // Example: at 3× zoom a 45px stage move = only 15 world-px → still a tap.
        const scale = app.stage.scale.x
        const dx = Math.abs(app.stage.x - nodeDownStagePos.current.x) / scale
        const dy = Math.abs(app.stage.y - nodeDownStagePos.current.y) / scale
        if (dx > 15 || dy > 15) return

        // Nearest-node resolution — override PIXI's z-order dispatch.
        // PIXI fires the event on the topmost container (highest z = last added),
        // so dense clusters (e.g. nodes 10 and 23) always misfire to the later node.
        // Fix: find the node geometrically closest to the actual tap world position.
        const ns = useGameStore.getState().nodes
        const { x: px, y: py } = pointerPosRef.current
        let nearest = idx
        let nearestDist = Infinity
        ns.forEach((n, i) => {
          const d = (n.x - px) ** 2 + (n.y - py) ** 2
          if (d < nearestDist) { nearestDist = d; nearest = i }
        })

        handleNodeClick(nearest)
      })

      app.stage.addChild(cont)
      nodesGfxRef.current.push(cont)
    })

    // Re-apply "you are here" indicator if a node was already current
    // (survives theme changes and node re-renders)
    if (currentNodeRef.current >= 0) setCurrentNode(currentNodeRef.current)
  }, [nodes, theme, startNode])

  // ── Auto-fit view on new node spawn ──────────────────────────────────
  // Fires when nodes.length changes (new game / difficulty change).
  // A small timeout lets PIXI commit the new canvas dimensions first.
  // Does NOT fire on theme / startNode changes (same node count).
  useEffect(() => {
    const app = appRef.current
    if (!app || !nodes.length) return
    if (nodes.length === prevNodeCountRef.current) return  // theme/startNode only
    prevNodeCountRef.current = nodes.length
    const t = setTimeout(() => {
      const a = appRef.current
      if (a) fitNodesToView(a, nodes)
    }, 80)
    return () => clearTimeout(t)
  }, [nodes])

  // ── Redraw edges ──────────────────────────────────────────────────────
  // In Solo Run mode AI edges are intentionally hidden so the player
  // can't follow the AI's path — they must think for themselves.
  // We read mode from getState() (not the hook closure) to be immune to
  // the local 'let mode' variable that the touch useEffect declares.
  useEffect(() => {
    const gfx = edgesGfxRef.current
    if (!gfx || !nodes.length) return
    gfx.clear()
    humanEdges.forEach(({ from, to }) => {
      gfx.lineStyle(theme === 'serene' ? 1.5 : 2, C.humanEdge, theme === 'serene' ? 0.7 : 0.8)
      gfx.moveTo(nodes[from].x, nodes[from].y)
      gfx.lineTo(nodes[to].x, nodes[to].y)
    })
    const currentMode = useGameStore.getState().mode
    if (currentMode !== 'solo') {
      // Draw only the AI edges that have been revealed so far (chess-style step reveal).
      // aiRevealedEdges grows by 1 after each human move; the full solution stays hidden.
      aiRevealedEdges.forEach(({ from, to }) => {
        // Serene: wider + higher alpha so the deep-indigo line reads clearly on cream
        gfx.lineStyle(theme === 'serene' ? 2.5 : 2, C.aiEdge, theme === 'serene' ? 0.9 : 0.6)
        gfx.moveTo(nodes[from].x, nodes[from].y)
        gfx.lineTo(nodes[to].x, nodes[to].y)
      })
    }
  }, [humanEdges, aiRevealedEdges, nodes, theme, mode])

  // ── Pheromone overlay ─────────────────────────────────────────────────
  // Hidden during gameplay so it doesn't reveal the AI solution path.
  // Only rendered after the game is complete (post-game analysis view).
  useEffect(() => {
    const app = appRef.current
    if (!app) return
    const gfx = app.stage.getChildByName('pheromone')
    if (!gfx) return
    gfx.clear()
    if (!nodes.length || !pheromoneEdges.length) return

    // Block while player is still routing — pheromone strength reveals the solution
    const { gamePhase: gp } = useGameStore.getState()
    if (gp !== 'complete') return

    const isCyber = theme !== 'serene'
    // Base colour: amber for cyber, muted rose for serene
    const color = isCyber ? 0xffab00 : 0xB5838D

    for (const pe of pheromoneEdges) {
      const a = nodes[pe.from], b = nodes[pe.to]
      if (!a || !b) continue
      // strength: 0.25–1.0 → alpha: 0.04–0.22
      const alpha = 0.04 + pe.strength * 0.18
      const width = 0.5 + pe.strength * (isCyber ? 2.5 : 1.5)
      gfx.lineStyle(width, color, alpha)
      gfx.moveTo(a.x, a.y)
      gfx.lineTo(b.x, b.y)
    }
  }, [pheromoneEdges, nodes, theme])

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

  // ── Shared clamp helper — Google Maps-style soft bounds ──────────────
  // Allows generous pan freedom so ALL nodes are always reachable.
  //
  // The core fix: the old formula clamped to exactly [vw-ww, 0], which at
  // scale=1.0 (ww=vw) collapsed to [0,0] — a hard lock that prevented any
  // panning at the default zoom level, making off-screen nodes unreachable.
  //
  // New formula adds MARGIN in each direction:
  //   stage.x ∈ [vw - ww - mx,  mx]
  //
  // At scale=1.0: stage.x ∈ [-mx, mx] → free panning ±30% of viewport.
  // At scale>1.0: same formula, extended by the same margin on both sides.
  // This mirrors Google Maps behaviour — content can overshoot the viewport
  // edge by a fixed amount, giving an "infinite canvas" feel.
  function clampStage(app) {
    const sc = app.stage.scale.x
    const pr = window.devicePixelRatio || 1
    const vw = app.view.width  / pr
    const vh = app.view.height / pr
    const ww = vw * sc   // world width  in screen pixels at current zoom
    const wh = vh * sc   // world height in screen pixels at current zoom

    // Pan overshoot margin: world edge may travel this far past the viewport
    // edge in either direction. Ensures edge-nodes are always reachable and
    // gives the "infinite canvas" feel even at the default 1× zoom.
    const mx = Math.max(vw * 0.30, 80)   // ≥ 80 px horizontal
    const my = Math.max(vh * 0.35, 120)  // ≥ 120 px vertical (bottom-bar clearance)

    app.stage.x = Math.max(vw - ww - mx, Math.min(mx, app.stage.x))
    app.stage.y = Math.max(vh - wh - my, Math.min(my, app.stage.y))
  }

  // ── Desktop: mouse-wheel zoom + drag-to-pan ───────────────────────────
  // Left-click drag → pan (Google Maps style).
  // Middle-click / right-click drag → also pan.
  // Mouse wheel → zoom IN only (min = scale 1, the default arena view).
  useEffect(() => {
    const app = appRef.current
    if (!app) return
    const canvas = app.view

    // Zoom-out floor = 0.5 (allows seeing the full node field on any screen).
    // Users can zoom IN freely up to 6×.
    const MIN_SCALE = 0.5
    const MAX_SCALE = 6

    // Hint to the user that the canvas is pannable (Google Maps style)
    canvas.style.cursor = 'grab'

    // ── Wheel zoom ───────────────────────────────────────────────────────
    function onWheel(e) {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      // Cursor position relative to the canvas element (CSS pixels)
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top

      // Normalise delta across browsers/trackpads
      const delta    = -e.deltaY * (e.deltaMode === 1 ? 30 : e.deltaMode === 2 ? 300 : 1)
      const factor   = 1 + Math.min(Math.abs(delta), 200) / 600
      const zoomIn   = delta > 0
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE,
        app.stage.scale.x * (zoomIn ? factor : 1 / factor)
      ))

      // Scale relative to cursor so the point under the mouse stays fixed
      const ratio  = newScale / app.stage.scale.x
      app.stage.x  = mx - (mx - app.stage.x) * ratio
      app.stage.y  = my - (my - app.stage.y) * ratio
      app.stage.scale.set(newScale)
      clampStage(app)
    }

    // ── Mouse drag pan ────────────────────────────────────────────────────
    // button 0 = left-click   (Google Maps style — primary pan gesture)
    // button 1 = middle-click (power-user shortcut)
    // button 2 = right-click  (fallback)
    //
    // NOTE: For left-click (button 0) we do NOT call e.preventDefault() so
    // Pixi's synthetic pointer events still reach node containers.
    // Accidental node-selection during a drag is prevented by the existing
    // stage-movement guard inside each node's pointerup handler (>10 px).
    let dragActive  = false
    let dragStartX  = 0, dragStartY  = 0
    let stageStartX = 0, stageStartY = 0

    function onMouseDown(e) {
      if (e.button === 0 || e.button === 1 || e.button === 2) {
        if (e.button !== 0) e.preventDefault()  // keep left-click events for Pixi nodes
        dragActive           = true
        isPanningRef.current = false
        dragStartX           = e.clientX
        dragStartY           = e.clientY
        stageStartX          = app.stage.x
        stageStartY          = app.stage.y
        canvas.style.cursor  = 'grabbing'
      }
    }

    function onMouseMove(e) {
      if (!dragActive) return
      const dx = e.clientX - dragStartX
      const dy = e.clientY - dragStartY
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        isPanningRef.current = true
      }
      if (isPanningRef.current) {
        app.stage.x = stageStartX + dx
        app.stage.y = stageStartY + dy
        clampStage(app)
      }
    }

    function onMouseUp(e) {
      if (e.button === 0 || e.button === 1 || e.button === 2) {
        dragActive           = false
        isPanningRef.current = false
        canvas.style.cursor  = 'grab'
      }
    }

    // Suppress the context menu so right-click-drag works cleanly
    function onContextMenu(e) { e.preventDefault() }

    // Double-click to fit all nodes (mirrors mobile double-tap)
    function onDblClick(e) {
      e.preventDefault()
      const ns = useGameStore.getState().nodes
      fitNodesToView(app, ns)
    }

    canvas.addEventListener('wheel',       onWheel,       { passive: false })
    canvas.addEventListener('mousedown',   onMouseDown)
    window.addEventListener('mousemove',   onMouseMove)   // on window so drag works if cursor leaves canvas
    window.addEventListener('mouseup',     onMouseUp)
    canvas.addEventListener('contextmenu', onContextMenu)
    canvas.addEventListener('dblclick',    onDblClick)

    return () => {
      canvas.style.cursor = ''
      canvas.removeEventListener('wheel',       onWheel)
      canvas.removeEventListener('mousedown',   onMouseDown)
      window.removeEventListener('mousemove',   onMouseMove)
      window.removeEventListener('mouseup',     onMouseUp)
      canvas.removeEventListener('contextmenu', onContextMenu)
      canvas.removeEventListener('dblclick',    onDblClick)
    }
  }, []) // stable — only needs the canvas ref, not node/theme state


  // ── Mobile touch: pan (1 finger) + pinch-zoom (2 fingers) ─────────────
  //
  // Design:
  //   • 1-finger drag   → pan in any direction freely
  //   • 2-finger pinch  → zoom centred on the midpoint (also pans with fingers)
  //   • 2→1 transition  → seamlessly continue panning with the remaining finger
  //   • tap (< 8px)     → node click (guarded by multiTouchRef + move distance)
  //
  useEffect(() => {
    const app = appRef.current
    if (!app || !('ontouchstart' in window)) return

    const canvas = app.view

    // ── State ─────────────────────────────────────────────────────────────
    let mode          = 'idle'   // 'idle' | 'pan' | 'pinch'
    let panStartX     = 0, panStartY     = 0
    let stageStartX   = 0, stageStartY   = 0
    let pinchStartDist  = 0
    let pinchStartScale = 1
    let pinchMidStartX  = 0, pinchMidStartY  = 0   // midpoint at pinch start
    let stageAtPinchX   = 0, stageAtPinchY  = 0   // stage pos at pinch start

    function getTouchMid(touches) {
      return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2,
      }
    }
    function touchDist(touches) {
      const dx = touches[0].clientX - touches[1].clientX
      const dy = touches[0].clientY - touches[1].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }

    // ── touchstart ────────────────────────────────────────────────────────
    function onTouchStart(e) {
      // Prevent browser pan/zoom on iOS — belt-and-suspenders alongside
      // the touchAction:'none' CSS. Without this, Safari may claim the
      // gesture before our first touchmove fires.
      e.preventDefault()

      if (e.touches.length === 1) {
        // Single finger: begin potential pan (or tap if barely moves)
        mode        = 'pan'
        panStartX   = e.touches[0].clientX
        panStartY   = e.touches[0].clientY
        stageStartX = app.stage.x
        stageStartY = app.stage.y
      } else if (e.touches.length === 3) {
        // ── 3-finger panel gesture ────────────────────────────────────────
        // Left third  → Statistics only (no tab bar shown)
        // Right third → AI Co-Pilot only (no tab bar shown)
        mode = 'idle'   // block any panning
        multiTouchRef.current = true
        const avgX = (
          e.touches[0].clientX + e.touches[1].clientX + e.touches[2].clientX
        ) / 3
        const vw = window.innerWidth
        if (avgX < vw * 0.33) {
          useUiStore.getState().openDrawerFocused('stats')
        } else if (avgX > vw * 0.67) {
          useUiStore.getState().openDrawerFocused('ai')
        }
      } else if (e.touches.length === 2) {
        // Two fingers: switch to pinch-zoom mode
        // Also set the multi-touch guard immediately so node pointerup is ignored
        multiTouchRef.current = true
        mode             = 'pinch'
        pinchStartDist   = touchDist(e.touches)
        pinchStartScale  = app.stage.scale.x
        const mid        = getTouchMid(e.touches)
        const rect       = canvas.getBoundingClientRect()
        pinchMidStartX   = mid.x - rect.left
        pinchMidStartY   = mid.y - rect.top
        stageAtPinchX    = app.stage.x
        stageAtPinchY    = app.stage.y
      }
    }

    // ── touchmove ─────────────────────────────────────────────────────────
    function onTouchMove(e) {
      e.preventDefault()

      if (mode === 'pan' && e.touches.length === 1) {
        const dx = e.touches[0].clientX - panStartX
        const dy = e.touches[0].clientY - panStartY
        // Only start moving after a small dead-zone to avoid accidental pans
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
          app.stage.x = stageStartX + dx
          app.stage.y = stageStartY + dy
          clampStage(app)
        }
      } else if (mode === 'pinch' && e.touches.length >= 2) {
        const rect     = canvas.getBoundingClientRect()
        const mid      = getTouchMid(e.touches)
        const curMidX  = mid.x - rect.left
        const curMidY  = mid.y - rect.top

        // ── Zoom: scale relative to pinch midpoint ─────────────────────
        const dist     = touchDist(e.touches)
        // MIN 0.35: gentle zoom-out floor so users can always see the full node
        // field. 1.0 was too aggressive — the clampStage formula locks stage.x/y
        // to 0 when scale=1.0 (world == viewport), preventing ALL panning.
        const newScale = Math.max(0.35, Math.min(6,
          pinchStartScale * (dist / pinchStartDist)
        ))
        const ratio    = newScale / app.stage.scale.x
        app.stage.scale.set(newScale)

        // ── Pan: midpoint movement also translates the stage ────────────
        // Formula: keep pinchMidStart world-point anchored to pinchMidStart
        // screen position, then offset by how much the midpoint moved.
        const panDx = curMidX - pinchMidStartX
        const panDy = curMidY - pinchMidStartY
        app.stage.x  = pinchMidStartX - (pinchMidStartX - stageAtPinchX) * (newScale / pinchStartScale) + panDx
        app.stage.y  = pinchMidStartY - (pinchMidStartY - stageAtPinchY) * (newScale / pinchStartScale) + panDy

        clampStage(app)
      }
    }

    // ── touchend / touchcancel ─────────────────────────────────────────────
    let multiTouchResetTimer = null
    let lastTapTime = 0  // for double-tap detection

    function onTouchEnd(e) {
      const remaining = e.touches.length

      // ── Double-tap to fit all nodes ───────────────────────────────────
      // Fires when a single finger is lifted and the previous tap was
      // within 300 ms — mirrors the Google Maps double-tap-to-fit gesture.
      if (remaining === 0 && e.changedTouches.length === 1 && mode !== 'pinch') {
        const now = Date.now()
        if (now - lastTapTime < 300) {
          const ns = useGameStore.getState().nodes
          fitNodesToView(app, ns)
        }
        lastTapTime = now
      }

      if (remaining === 0) {
        mode = 'idle'
        // Reset multi-touch guard after a short cooldown so staggered
        // pointerup events from Pixi don't fire node clicks
        clearTimeout(multiTouchResetTimer)
        multiTouchResetTimer = setTimeout(() => {
          multiTouchRef.current = false
        }, 200)
      } else if (remaining === 1 && mode === 'pinch') {
        // Transition: last finger lifted from a pinch → keep panning with
        // the single remaining finger, re-anchoring from its current position
        mode        = 'pan'
        panStartX   = e.touches[0].clientX
        panStartY   = e.touches[0].clientY
        stageStartX = app.stage.x
        stageStartY = app.stage.y
      }
    }

    // passive:false on touchstart so e.preventDefault() is honoured on iOS
    canvas.addEventListener('touchstart',  onTouchStart,  { passive: false })
    canvas.addEventListener('touchmove',   onTouchMove,   { passive: false })
    canvas.addEventListener('touchend',    onTouchEnd,    { passive: true  })
    canvas.addEventListener('touchcancel', onTouchEnd,    { passive: true  })
    return () => {
      canvas.removeEventListener('touchstart',  onTouchStart)
      canvas.removeEventListener('touchmove',   onTouchMove)
      canvas.removeEventListener('touchend',    onTouchEnd)
      canvas.removeEventListener('touchcancel', onTouchEnd)
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
      // Rotate the AI's precomputed tour so it starts from the same node
      // as the human. TSP tours are cyclic — quality is unchanged.
      useAiStore.getState().lockTourFromStartNode(idx)
      // Mark start node as current position ("you are here")
      setCurrentNode(idx)
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

    // Move "you are here" indicator to the newly connected-to node
    setCurrentNode(idx)

    // Chess-style AI reveal: after human makes a move in copilot/VS modes,
    // expose the AI's corresponding step from its precomputed solution.
    const currentGameMode = useGameStore.getState().mode
    if (currentGameMode !== 'solo') {
      useAiStore.getState().revealNextAiMove()
    }

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

  // ── "You are here" indicator ─────────────────────────────────────────────
  // Shows which node the player is currently positioned at (their path tail).
  // The ring shifts to the new node after each edge is committed.
  function setCurrentNode(idx) {
    const { theme: th } = useUiStore.getState()
    const TC = THEME_COLORS[th] || THEME_COLORS.cyber

    // Remove indicator from old node
    const old = currentNodeRef.current
    if (old >= 0 && old !== idx) {
      const oc = nodesGfxRef.current[old]
      if (oc) {
        const r1 = oc.getChildByName('currentRing')
        const r2 = oc.getChildByName('currentRing2')
        if (r1) r1.alpha = 0
        if (r2) r2.alpha = 0
      }
    }

    // Apply indicator to new node
    const c = nodesGfxRef.current[idx]
    if (c) {
      const r1 = c.getChildByName('currentRing')
      const r2 = c.getChildByName('currentRing2')
      if (r1) {
        r1.clear()
        r1.lineStyle(th === 'serene' ? 2 : 2.5, TC.currentNode, th === 'serene' ? 0.85 : 0.9)
        r1.drawCircle(0, 0, 22)
        r1.alpha = 1
      }
      if (r2) {
        r2.clear()
        r2.lineStyle(1, TC.currentGlow, th === 'serene' ? 0.3 : 0.4)
        r2.drawCircle(0, 0, 29)
        r2.alpha = 1
      }
    }
    currentNodeRef.current = idx
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

  // ── Reset / fit-to-nodes (exposed for the UI button) ─────────────────
  const resetView = useCallback(() => {
    const app = appRef.current
    const ns  = useGameStore.getState().nodes
    if (app && ns.length) fitNodesToView(app, ns)
  }, [])

  return { spawnNodes, resetView }
}

// ── fitNodesToView: Google Maps "fit all" / double-tap reset ──────────────
// Zooms and pans the stage so every node is comfortably visible with padding.
// Scale is capped at 1.0 so the default arena view is never over-zoomed.
function fitNodesToView(app, nodes) {
  if (!app || !nodes.length) return
  const pr = window.devicePixelRatio || 1
  const vw = app.view.width  / pr
  const vh = app.view.height / pr

  // Node bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  nodes.forEach(n => {
    if (n.x < minX) minX = n.x
    if (n.y < minY) minY = n.y
    if (n.x > maxX) maxX = n.x
    if (n.y > maxY) maxY = n.y
  })

  const PAD   = 70  // world-space padding around bounding box
  const cw    = (maxX - minX) + PAD * 2
  const ch    = (maxY - minY) + PAD * 2
  const scale = Math.min(vw / cw, vh / ch, 1.0)  // never zoom IN past 1×

  app.stage.scale.set(scale)
  // Centre the bounding box in the viewport
  const worldCx = (minX + maxX) / 2
  const worldCy = (minY + maxY) / 2
  app.stage.x   = vw / 2 - worldCx * scale
  app.stage.y   = vh / 2 - worldCy * scale
}

// ── Helpers ────────────────────────────────────────────────────────────────
function drawGrid(gfx, w, h, gridColor) {
  const { r, g, b, a } = gridColor
  // Extend 300 world-px beyond canvas edges so the grid fills any
  // overshoot-pan area and never shows a hard cutoff line.
  const EXT = 300
  gfx.lineStyle(1, (r << 16) | (g << 8) | b, a)
  for (let x = -EXT; x <= w + EXT; x += 40) { gfx.moveTo(x, -EXT); gfx.lineTo(x, h + EXT) }
  for (let y = -EXT; y <= h + EXT; y += 40) { gfx.moveTo(-EXT, y); gfx.lineTo(w + EXT, y) }
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
