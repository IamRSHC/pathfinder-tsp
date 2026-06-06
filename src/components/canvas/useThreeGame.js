import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { useGameStore } from '../../stores/gameStore'
import { useAiStore }   from '../../stores/aiStore'
import { useUiStore }   from '../../stores/uiStore'
import { euclidDist, generateNodes, scaleNodesToCanvas, STANDARD_SETS, parseCustomNodes } from '../../utils/tspUtils'
import { exceedsDegree, wouldCloseSubtour } from '../../utils/tourValidator'

// ── Theme palettes (mirrors THEME_COLORS in usePixiGame) ──────────────────
const THEME3D = {
  cyber: {
    bg:          0x090d14,
    bgFog:       '#090d14',
    gridColor:   0x1a2540,
    nodeMat:     { color: 0x003344,  emissive: 0x00e5ff, emissiveIntensity: 0.9 },
    nodeHover:   { color: 0x005566,  emissive: 0x00e5ff, emissiveIntensity: 1.8 },
    nodeSelect:  { color: 0x004455,  emissive: 0x00ffff, emissiveIntensity: 2.5 },
    humanEdge:   0x00e5ff,
    humanAlpha:  0.85,
    aiEdge:      0xffab00,
    aiAlpha:     0.7,
    sugEdge:     0xd500f9,
    sugAlpha:    0.8,
    labelColor:  '#00e5ff',
    ambient:     { color: 0x112233, intensity: 1.2 },
    dirLight:    { color: 0x00e5ff, intensity: 0.6 },
    ground:      { color: 0x0a1020, opacity: 0.6 },
    startNode:   { color: 0x332200, emissive: 0xffd700, emissiveIntensity: 2.0 },
    startRing:   0xffd700,
    nodeRadius:  7,
    nodeSegs:    20,
  },
  serene: {
    bg:          0xFAFAF8,
    bgFog:       '#FAFAF8',
    gridColor:   0xE8E4DF,
    nodeMat:     { color: 0xd4ece2,  emissive: 0x2D6A4F, emissiveIntensity: 0.3 },
    nodeHover:   { color: 0xb8dece,  emissive: 0x2D6A4F, emissiveIntensity: 0.7 },
    nodeSelect:  { color: 0xa0d0be,  emissive: 0x2D6A4F, emissiveIntensity: 1.1 },
    humanEdge:   0x2D6A4F,
    humanAlpha:  0.75,
    aiEdge:      0xB5838D,
    aiAlpha:     0.65,
    sugEdge:     0x6D6875,
    sugAlpha:    0.7,
    labelColor:  '#2D6A4F',
    ambient:     { color: 0xffffff, intensity: 2.0 },
    dirLight:    { color: 0xfff8f0, intensity: 0.8 },
    ground:      { color: 0xf0ede8, opacity: 0.5 },
    startNode:   { color: 0x3d1a00, emissive: 0xE07B39, emissiveIntensity: 1.5 },
    startRing:   0xE07B39,
    nodeRadius:  7,
    nodeSegs:    20,
  },
}

// ── Touch / pointer orbit state ────────────────────────────────────────────
function createOrbitState() {
  return {
    isPointerDown: false,
    lastX: 0, lastY: 0,
    theta: 0,          // horizontal rotation (radians)
    phi: Math.PI / 4,  // vertical tilt (radians, 0=top, PI/2=side)
    radius: 600,
    target: new THREE.Vector3(0, 0, 0),
    // touch
    lastPinchDist: 0,
    pointers: {},
  }
}

// ── Main hook ─────────────────────────────────────────────────────────────
export function useThreeGame(containerRef) {
  const rendererRef    = useRef(null)
  const sceneRef       = useRef(null)
  const cameraRef      = useRef(null)
  const nodeMeshesRef  = useRef([])  // THREE.Mesh per node
  const edgeLinesRef   = useRef(null) // LineSegments for human+ai edges
  const sugLineRef     = useRef(null) // LineSegments for suggestion
  const orbitRef       = useRef(createOrbitState())
  const rafRef         = useRef(null)
  const isMountedRef   = useRef(true)
  const pulseTickRef   = useRef(0)

  const { nodes, humanEdges, aiEdges, difficulty, gamePhase, startNode, setNodes, addHumanEdge, setStartNode } = useGameStore()
  const { suggestion, requestSuggestion } = useAiStore()
  const { theme } = useUiStore()

  const C = THEME3D[theme] || THEME3D.cyber

  // ── Init Three.js scene ─────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container || rendererRef.current) return
    isMountedRef.current = true

    const W = container.offsetWidth  || container.clientWidth  || 800
    const H = container.offsetHeight || container.clientHeight || 600

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H)
    renderer.setClearColor(C.bg, 1)
    renderer.shadowMap.enabled = false
    container.appendChild(renderer.domElement)
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.touchAction = 'none'
    rendererRef.current = renderer

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(C.bg)
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(55, W / H, 1, 5000)
    cameraRef.current = camera
    positionCamera(camera, orbitRef.current)

    // Lights
    const ambient = new THREE.AmbientLight(C.ambient.color, C.ambient.intensity)
    ambient.name = 'ambient'
    scene.add(ambient)

    const dirLight = new THREE.DirectionalLight(C.dirLight.color, C.dirLight.intensity)
    dirLight.position.set(200, 400, 300)
    dirLight.name = 'dirLight'
    scene.add(dirLight)

    // Ground grid
    buildGround(scene, C)

    // Edge group placeholders
    const edgeGroup = new THREE.Group()
    edgeGroup.name = 'edges'
    scene.add(edgeGroup)
    edgeLinesRef.current = edgeGroup

    const sugGroup = new THREE.Group()
    sugGroup.name = 'suggestion'
    scene.add(sugGroup)
    sugLineRef.current = sugGroup

    // Resize observer
    const ro = new ResizeObserver(entries => {
      if (!isMountedRef.current) return
      const { width, height } = entries[0].contentRect
      if (width === 0 || height === 0) return
      renderer.setSize(width, height)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    })
    ro.observe(container)

    // Render loop
    let tick = 0
    function animate() {
      if (!isMountedRef.current) return
      rafRef.current = requestAnimationFrame(animate)
      tick += theme === 'serene' ? 0.018 : 0.032
      pulseTickRef.current = tick

      // Pulse node emissive + gentle float
      nodeMeshesRef.current.forEach((mesh, i) => {
        if (!mesh || mesh.userData.selected || mesh.userData.hovered) return
        const mat = mesh.material
        const base = C.nodeMat.emissiveIntensity
        const wave = Math.sin(tick + i * 0.45) * (theme === 'serene' ? 0.06 : 0.18)
        mat.emissiveIntensity = base + wave
        // subtle float
        mesh.position.z = mesh.userData.baseZ + Math.sin(tick * 0.7 + i * 0.3) * (theme === 'serene' ? 1.5 : 2.5)
      })

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      isMountedRef.current = false
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      const domEl = renderer.domElement
      requestAnimationFrame(() => {
        try {
          renderer.dispose()
          if (domEl.parentNode) domEl.parentNode.removeChild(domEl)
        } catch (_) {}
      })
      rendererRef.current = null
      sceneRef.current     = null
      cameraRef.current    = null
      nodeMeshesRef.current = []
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Theme change: update materials + lights ──────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current
    const renderer = rendererRef.current
    if (!scene || !renderer) return

    renderer.setClearColor(C.bg, 1)
    scene.background = new THREE.Color(C.bg)

    // Update lights
    const amb = scene.getObjectByName('ambient')
    if (amb) { amb.color.setHex(C.ambient.color); amb.intensity = C.ambient.intensity }
    const dl = scene.getObjectByName('dirLight')
    if (dl) { dl.color.setHex(C.dirLight.color); dl.intensity = C.dirLight.intensity }

    // Rebuild ground
    const oldGround = scene.getObjectByName('ground')
    if (oldGround) scene.remove(oldGround)
    buildGround(scene, C)

    // Update node materials
    nodeMeshesRef.current.forEach(mesh => {
      if (!mesh) return
      mesh.material.color.setHex(C.nodeMat.color)
      mesh.material.emissive.setHex(C.nodeMat.emissive)
      mesh.material.emissiveIntensity = C.nodeMat.emissiveIntensity
    })

    // Rebuild edges with new colors
    rebuildEdges()
  }, [theme]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Build / rebuild node meshes when nodes change ────────────────────────
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene || !nodes.length) return

    // Remove old node meshes
    nodeMeshesRef.current.forEach(m => { if (m) scene.remove(m) })
    nodeMeshesRef.current = []

    const { offsetWidth: W, offsetHeight: H } = containerRef.current
    // Map 2D canvas coords → 3D world coords centered at origin
    const cx = W / 2, cy = H / 2

    const { startNode: sn } = useGameStore.getState()
    nodes.forEach((node, idx) => {
      const isStart = sn === idx
      const matSpec = isStart ? C.startNode : C.nodeMat
      const radius  = isStart ? C.nodeRadius * 1.35 : C.nodeRadius
      const geo = new THREE.SphereGeometry(radius, C.nodeSegs, C.nodeSegs)
      const mat = new THREE.MeshStandardMaterial({
        color:             matSpec.color,
        emissive:          new THREE.Color(matSpec.emissive),
        emissiveIntensity: matSpec.emissiveIntensity,
        roughness:         0.3,
        metalness:         theme === 'cyber' ? 0.6 : 0.1,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(node.x - cx, -(node.y - cy), 0)
      mesh.userData = { index: idx, baseZ: 0, hovered: false, selected: false, isStart }
      mesh.name = `node-${idx}`
      scene.add(mesh)
      nodeMeshesRef.current.push(mesh)

      // Add orbit ring for start node
      if (isStart) {
        const ringGeo = new THREE.RingGeometry(radius + 5, radius + 9, 32)
        const ringMat = new THREE.MeshBasicMaterial({
          color: C.startRing, side: THREE.DoubleSide, transparent: true, opacity: 0.75,
        })
        const ring = new THREE.Mesh(ringGeo, ringMat)
        ring.position.set(node.x - cx, -(node.y - cy), 0.5)
        ring.name = `startRing-${idx}`
        scene.add(ring)
      }
    })

    // Rebuild edges too (nodes changed = fresh game)
    rebuildEdges()
  }, [nodes, theme, startNode]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Rebuild edge lines when edges change ────────────────────────────────
  useEffect(() => { rebuildEdges() }, [humanEdges, aiEdges, theme]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Suggestion line ─────────────────────────────────────────────────────
  useEffect(() => {
    const group = sugLineRef.current
    if (!group) return
    group.clear()
    if (!suggestion || !nodes.length) return

    const { from, to } = suggestion
    if (!nodes[from] || !nodes[to]) return

    const { offsetWidth: W, offsetHeight: H } = containerRef.current
    const cx = W / 2, cy = H / 2

    const pts = [
      new THREE.Vector3(nodes[from].x - cx, -(nodes[from].y - cy), 2),
      new THREE.Vector3(nodes[to].x   - cx, -(nodes[to].y   - cy), 2),
    ]
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    const mat = new THREE.LineDashedMaterial({
      color:     C.sugEdge,
      opacity:   C.sugAlpha,
      transparent: true,
      dashSize:  12,
      gapSize:   6,
      linewidth: 1,
    })
    const line = new THREE.LineSegments(geo, mat)
    line.computeLineDistances()
    group.add(line)

    // Ring around target node
    const ringGeo = new THREE.RingGeometry(14, 17, 32)
    const ringMat = new THREE.MeshBasicMaterial({
      color: C.sugEdge, side: THREE.DoubleSide,
      opacity: C.sugAlpha, transparent: true,
    })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.position.set(nodes[to].x - cx, -(nodes[to].y - cy), 1)
    group.add(ring)
  }, [suggestion, nodes, theme]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pointer / touch events ──────────────────────────────────────────────
  useEffect(() => {
    const renderer = rendererRef.current
    if (!renderer) return
    const canvas = renderer.domElement

    // ── Orbit helpers ────────────────────────────────────────────────────
    function applyOrbit(dx, dy) {
      const o = orbitRef.current
      o.theta -= dx * 0.005
      o.phi    = Math.max(0.05, Math.min(Math.PI / 2.1, o.phi - dy * 0.005))
      positionCamera(cameraRef.current, o)
    }

    function applyZoom(delta) {
      const o = orbitRef.current
      o.radius = Math.max(150, Math.min(1400, o.radius + delta))
      positionCamera(cameraRef.current, o)
    }

    // ── Raycasting ───────────────────────────────────────────────────────
    function getClickedNode(clientX, clientY) {
      const renderer = rendererRef.current
      const camera   = cameraRef.current
      const scene    = sceneRef.current
      if (!renderer || !camera || !scene) return -1
      const rect    = renderer.domElement.getBoundingClientRect()
      const ndcX    = ((clientX - rect.left) / rect.width)  * 2 - 1
      const ndcY   = -((clientY - rect.top)  / rect.height) * 2 + 1
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera({ x: ndcX, y: ndcY }, camera)
      // Expand hit radius for touch friendliness
      raycaster.params.Mesh = { threshold: 10 }
      const hits = raycaster.intersectObjects(nodeMeshesRef.current.filter(Boolean))
      if (hits.length > 0) return hits[0].object.userData.index
      return -1
    }

    let dragMoved = false

    // ── Mouse ────────────────────────────────────────────────────────────
    function onMouseDown(e) {
      orbitRef.current.isPointerDown = true
      orbitRef.current.lastX = e.clientX
      orbitRef.current.lastY = e.clientY
      dragMoved = false
    }
    function onMouseMove(e) {
      if (!orbitRef.current.isPointerDown) return
      const dx = e.clientX - orbitRef.current.lastX
      const dy = e.clientY - orbitRef.current.lastY
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragMoved = true
      applyOrbit(dx, dy)
      orbitRef.current.lastX = e.clientX
      orbitRef.current.lastY = e.clientY
    }
    function onMouseUp(e) {
      orbitRef.current.isPointerDown = false
      if (!dragMoved) {
        const idx = getClickedNode(e.clientX, e.clientY)
        if (idx !== -1) handleNodeClick(idx)
      }
    }
    function onWheel(e) {
      e.preventDefault()
      applyZoom(e.deltaY * 0.8)
    }

    // ── Touch ────────────────────────────────────────────────────────────
    function pinchDist(touches) {
      const dx = touches[0].clientX - touches[1].clientX
      const dy = touches[0].clientY - touches[1].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }

    function onTouchStart(e) {
      e.preventDefault()
      dragMoved = false
      if (e.touches.length === 1) {
        orbitRef.current.isPointerDown = true
        orbitRef.current.lastX = e.touches[0].clientX
        orbitRef.current.lastY = e.touches[0].clientY
      } else if (e.touches.length === 2) {
        orbitRef.current.isPointerDown = false
        orbitRef.current.lastPinchDist = pinchDist(e.touches)
      }
    }
    function onTouchMove(e) {
      e.preventDefault()
      if (e.touches.length === 1 && orbitRef.current.isPointerDown) {
        const dx = e.touches[0].clientX - orbitRef.current.lastX
        const dy = e.touches[0].clientY - orbitRef.current.lastY
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true
        applyOrbit(dx, dy)
        orbitRef.current.lastX = e.touches[0].clientX
        orbitRef.current.lastY = e.touches[0].clientY
      } else if (e.touches.length === 2) {
        const d = pinchDist(e.touches)
        const delta = (orbitRef.current.lastPinchDist - d) * 2.5
        applyZoom(delta)
        orbitRef.current.lastPinchDist = d
        dragMoved = true
      }
    }
    function onTouchEnd(e) {
      orbitRef.current.isPointerDown = false
      if (!dragMoved && e.changedTouches.length === 1) {
        const t = e.changedTouches[0]
        const idx = getClickedNode(t.clientX, t.clientY)
        if (idx !== -1) handleNodeClick(idx)
      }
    }

    canvas.addEventListener('mousedown',  onMouseDown)
    canvas.addEventListener('mousemove',  onMouseMove)
    canvas.addEventListener('mouseup',    onMouseUp)
    canvas.addEventListener('wheel',      onWheel,      { passive: false })
    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false })
    canvas.addEventListener('touchend',   onTouchEnd)

    return () => {
      canvas.removeEventListener('mousedown',  onMouseDown)
      canvas.removeEventListener('mousemove',  onMouseMove)
      canvas.removeEventListener('mouseup',    onMouseUp)
      canvas.removeEventListener('wheel',      onWheel)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove',  onTouchMove)
      canvas.removeEventListener('touchend',   onTouchEnd)
    }
  }, [nodes]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Node interaction ─────────────────────────────────────────────────────
  const selectedIdxRef = useRef(-1)

  const handleNodeClick = useCallback((idx) => {
    const state = useGameStore.getState()
    const { showNotification: notify } = useUiStore.getState()

    // ── PLACING phase: pick start node ───────────────────────────────
    if (state.gamePhase === 'placing') {
      setStartNode(idx)
      return
    }

    if (state.gamePhase !== 'routing') return
    const { nodes, humanEdges } = state
    const prev = selectedIdxRef.current

    // First selection
    if (prev === -1) {
      selectedIdxRef.current = idx
      applyNodeState(idx, 'selected')
      return
    }

    // Deselect same node
    if (prev === idx) {
      selectedIdxRef.current = -1
      applyNodeState(idx, 'normal')
      return
    }

    // 1. Duplicate edge check
    const exists = humanEdges.some(
      e => (e.from === prev && e.to === idx) || (e.from === idx && e.to === prev)
    )
    if (exists) {
      notify('Edge already exists between these nodes', 'warn')
      selectedIdxRef.current = -1; applyNodeState(prev, 'normal'); return
    }

    // 2. Degree-2 constraint
    const offender = exceedsDegree(humanEdges, prev, idx)
    if (offender !== -1) {
      notify(`Node ${offender} already has 2 connections`, 'warn')
      selectedIdxRef.current = -1; applyNodeState(prev, 'normal'); return
    }

    // 3. Sub-tour prevention
    if (wouldCloseSubtour(humanEdges, prev, idx, nodes.length)) {
      notify('This would close an incomplete sub-tour', 'warn')
      selectedIdxRef.current = -1; applyNodeState(prev, 'normal'); return
    }

    // ── Valid edge ──────────────────────────────────────────────────
    const d = euclidDist(nodes[prev], nodes[idx])
    addHumanEdge({ from: prev, to: idx, dist: d })
    applyNodeState(prev, 'normal')
    applyNodeState(idx, 'flash')
    selectedIdxRef.current = -1

    const { requestSuggestion } = useAiStore.getState()
    requestSuggestion(nodes, useGameStore.getState().humanEdges)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function applyNodeState(idx, state) {
    const mesh = nodeMeshesRef.current[idx]
    if (!mesh) return
    const { theme } = useUiStore.getState()
    const TC = THEME3D[theme] || THEME3D.cyber
    const mat = mesh.material

    if (state === 'selected') {
      mat.color.setHex(TC.nodeSelect.color)
      mat.emissive.setHex(TC.nodeSelect.emissive)
      mat.emissiveIntensity = TC.nodeSelect.emissiveIntensity
      mesh.scale.setScalar(1.4)
      mesh.userData.selected = true
    } else if (state === 'flash') {
      mat.emissiveIntensity = TC.nodeHover.emissiveIntensity
      mesh.scale.setScalar(1.2)
      setTimeout(() => {
        if (!mesh || !mesh.material) return
        mat.color.setHex(TC.nodeMat.color)
        mat.emissive.setHex(TC.nodeMat.emissive)
        mat.emissiveIntensity = TC.nodeMat.emissiveIntensity
        mesh.scale.setScalar(1.0)
        mesh.userData.selected = false
      }, 300)
    } else {
      mat.color.setHex(TC.nodeMat.color)
      mat.emissive.setHex(TC.nodeMat.emissive)
      mat.emissiveIntensity = TC.nodeMat.emissiveIntensity
      mesh.scale.setScalar(1.0)
      mesh.userData.selected = false
    }
  }

  // ── Rebuild edge lines ───────────────────────────────────────────────────
  function rebuildEdges() {
    const group = edgeLinesRef.current
    const scene = sceneRef.current
    if (!group || !scene) return
    group.clear()

    const { nodes, humanEdges, aiEdges } = useGameStore.getState()
    const { theme } = useUiStore.getState()
    const TC = THEME3D[theme] || THEME3D.cyber
    if (!nodes.length) return

    const { offsetWidth: W, offsetHeight: H } = containerRef.current
    const cx = W / 2, cy = H / 2

    // Human edges
    if (humanEdges.length) {
      const pts = []
      humanEdges.forEach(({ from, to }) => {
        pts.push(
          new THREE.Vector3(nodes[from].x - cx, -(nodes[from].y - cy), 1),
          new THREE.Vector3(nodes[to].x   - cx, -(nodes[to].y   - cy), 1),
        )
      })
      const geo = new THREE.BufferGeometry().setFromPoints(pts)
      const mat = new THREE.LineBasicMaterial({
        color: TC.humanEdge, opacity: TC.humanAlpha, transparent: true,
        linewidth: 2,
      })
      group.add(new THREE.LineSegments(geo, mat))
    }

    // AI edges
    if (aiEdges.length) {
      const pts = []
      aiEdges.forEach(({ from, to }) => {
        pts.push(
          new THREE.Vector3(nodes[from].x - cx, -(nodes[from].y - cy), 1.5),
          new THREE.Vector3(nodes[to].x   - cx, -(nodes[to].y   - cy), 1.5),
        )
      })
      const geo = new THREE.BufferGeometry().setFromPoints(pts)
      const mat = new THREE.LineBasicMaterial({
        color: TC.aiEdge, opacity: TC.aiAlpha, transparent: true,
        linewidth: 2,
      })
      group.add(new THREE.LineSegments(geo, mat))
    }
  }

  // ── Spawn nodes ──────────────────────────────────────────────────────────
  const spawnNodes = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const state = useGameStore.getState()
    const W = container.offsetWidth  || container.clientWidth  || 800
    const H = container.offsetHeight || container.clientHeight || 600

    let newNodes = []
    if (state.nodeSource === 'standard') {
      const set = STANDARD_SETS[state.standardSize] || STANDARD_SETS.M
      newNodes = scaleNodesToCanvas(set.nodes, W, H)
    } else if (state.nodeSource === 'custom') {
      const { nodes: parsed } = parseCustomNodes(state.customRaw)
      if (parsed.length < 3) {
        useUiStore.getState().showNotification('Need at least 3 valid nodes', 'warn')
        return
      }
      newNodes = scaleNodesToCanvas(parsed, W, H)
    } else {
      newNodes = generateNodes(state.difficulty, W, H)
    }
    setNodes(newNodes)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { spawnNodes }
}

// ── Camera positioning from orbit state ────────────────────────────────────
function positionCamera(camera, orbit) {
  if (!camera) return
  const { theta, phi, radius, target } = orbit
  camera.position.x = target.x + radius * Math.sin(phi) * Math.sin(theta)
  camera.position.y = target.y + radius * Math.cos(phi)
  camera.position.z = target.z + radius * Math.sin(phi) * Math.cos(theta)
  camera.lookAt(target)
  camera.updateProjectionMatrix()
}

// ── Ground plane + grid lines ───────────────────────────────────────────────
function buildGround(scene, C) {
  const group = new THREE.Group()
  group.name = 'ground'

  // Plane
  const geo = new THREE.PlaneGeometry(2000, 2000)
  const mat = new THREE.MeshBasicMaterial({
    color:       C.ground.color,
    opacity:     C.ground.opacity,
    transparent: true,
    side:        THREE.DoubleSide,
  })
  const plane = new THREE.Mesh(geo, mat)
  plane.rotation.x = -Math.PI / 2
  plane.position.y = -60
  group.add(plane)

  // Grid lines
  const gridMat = new THREE.LineBasicMaterial({
    color:       C.gridColor,
    opacity:     0.25,
    transparent: true,
  })
  const step = 80, half = 800
  const pts = []
  for (let i = -half; i <= half; i += step) {
    pts.push(new THREE.Vector3(i, -60, -half), new THREE.Vector3(i, -60, half))
    pts.push(new THREE.Vector3(-half, -60, i), new THREE.Vector3(half, -60, i))
  }
  const gridGeo = new THREE.BufferGeometry().setFromPoints(pts)
  group.add(new THREE.LineSegments(gridGeo, gridMat))

  scene.add(group)
}
