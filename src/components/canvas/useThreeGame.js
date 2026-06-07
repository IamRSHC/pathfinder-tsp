import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { useGameStore } from '../../stores/gameStore'
import { useAiStore }   from '../../stores/aiStore'
import { useUiStore }   from '../../stores/uiStore'
import { euclidDist, generateNodes, scaleNodesToCanvas, STANDARD_SETS, parseCustomNodes } from '../../utils/tspUtils'
import { exceedsDegree, wouldCloseSubtour } from '../../utils/tourValidator'

// ─────────────────────────────────────────────────────────────────────────────
// COORDINATE SYSTEM (Y-up, Google-Earth style)
//
//  Canvas 2D:  x → right,  y → down   (origin top-left)
//  3D World:   x → right,  y → UP,    z → toward camera
//
//  Mapping from canvas (cx,cy) to world:
//    worldX =  (node.x - canvasW/2)
//    worldY =  0                        ← all nodes sit on ground plane
//    worldZ = -(node.y - canvasH/2)    ← canvas-Y flipped to world-Z
//
//  Camera orbits above the XZ ground plane.  Ground plane at y = -20.
//  Grid lines are drawn ON the ground plane → perspective recession = 3D feel.
// ─────────────────────────────────────────────────────────────────────────────

// ── Theme palettes ────────────────────────────────────────────────────────────
const THEME3D = {
  cyber: {
    bg:          0x090d14,
    gridColor:   0x1a3060,
    gridOpacity: 0.55,
    nodeMat:     { color: 0x003344,  emissive: 0x00e5ff, emissiveIntensity: 1.0 },
    nodeHover:   { color: 0x005566,  emissive: 0x00e5ff, emissiveIntensity: 2.0 },
    nodeSelect:  { color: 0x004455,  emissive: 0x00ffff, emissiveIntensity: 2.8 },
    humanEdge:   0x00e5ff,
    humanAlpha:  0.90,
    aiEdge:      0xffab00,
    aiAlpha:     0.75,
    sugEdge:     0xd500f9,
    sugAlpha:    0.85,
    startNode:   { color: 0x332200, emissive: 0xffd700, emissiveIntensity: 2.2 },
    startRing:   0xffd700,
    labelColor:  '#00e5ff',
    labelShadow: '#003355',
    startColor:  '#ffd700',
    ambient:     { color: 0x223355, intensity: 1.4 },
    dirLight:    { color: 0x00e5ff, intensity: 0.8 },
    ground:      { color: 0x080c18, opacity: 1.0 },
    nodeRadius:  7,
    nodeSegs:    20,
    edgeTube:    2.2,
    aiTube:      1.6,
    fogColor:    0x090d14,
    fogNear:     800,
    fogFar:      2200,
  },
  serene: {
    bg:          0xF5F3EF,
    gridColor:   0xC8C0B4,
    gridOpacity: 0.45,
    nodeMat:     { color: 0xd4ece2,  emissive: 0x2D6A4F, emissiveIntensity: 0.4 },
    nodeHover:   { color: 0xb8dece,  emissive: 0x2D6A4F, emissiveIntensity: 0.9 },
    nodeSelect:  { color: 0xa0d0be,  emissive: 0x2D6A4F, emissiveIntensity: 1.3 },
    humanEdge:   0x2D6A4F,
    humanAlpha:  0.80,
    aiEdge:      0xB5838D,
    aiAlpha:     0.70,
    sugEdge:     0x6D6875,
    sugAlpha:    0.75,
    startNode:   { color: 0x3d1a00, emissive: 0xE07B39, emissiveIntensity: 1.6 },
    startRing:   0xE07B39,
    labelColor:  '#2D6A4F',
    labelShadow: '#E8F5EE',
    startColor:  '#E07B39',
    ambient:     { color: 0xffffff, intensity: 2.2 },
    dirLight:    { color: 0xfff8f0, intensity: 0.9 },
    ground:      { color: 0xECE8E2, opacity: 1.0 },
    nodeRadius:  7,
    nodeSegs:    20,
    edgeTube:    2.2,
    aiTube:      1.6,
    fogColor:    0xF5F3EF,
    fogNear:     900,
    fogFar:      2400,
  },
}

// ── Orbit state ───────────────────────────────────────────────────────────────
function createOrbitState() {
  return {
    isPointerDown:  false,
    lastX:          0,
    lastY:          0,
    theta:          0,      // horizontal rotation around Y axis
    phi:            0.72,   // polar angle from Y-up: 0=top, PI/2=side  (~41° tilt = Google-Earth feel)
    radius:         780,
    target:         new THREE.Vector3(0, 0, 0),
    lastPinchDist:  0,
  }
}

// ── Canvas-texture label sprite ───────────────────────────────────────────────
function makeNodeSprite(label, isStart, theme) {
  const C   = THEME3D[theme] || THEME3D.cyber
  const sz  = 128
  const cv  = document.createElement('canvas')
  cv.width  = sz
  cv.height = sz
  const ctx = cv.getContext('2d')

  // Transparent background
  ctx.clearRect(0, 0, sz, sz)

  // Circular backing pill (subtle)
  ctx.beginPath()
  ctx.arc(sz / 2, sz / 2, isStart ? 36 : 28, 0, Math.PI * 2)
  ctx.fillStyle = isStart
    ? (theme === 'cyber' ? 'rgba(40,28,0,0.72)' : 'rgba(80,35,0,0.65)')
    : (theme === 'cyber' ? 'rgba(0,20,35,0.65)' : 'rgba(240,235,230,0.65)')
  ctx.fill()

  // Text
  const color  = isStart ? C.startColor : C.labelColor
  const text   = isStart ? `★${label}` : String(label)
  const fSize  = isStart ? 38 : 36
  ctx.font      = `bold ${fSize}px 'JetBrains Mono', 'Courier New', monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Shadow / glow
  ctx.shadowColor   = isStart
    ? (theme === 'cyber' ? '#ffd700' : '#E07B39')
    : (theme === 'cyber' ? '#00e5ff' : '#2D6A4F')
  ctx.shadowBlur    = isStart ? 18 : 12
  ctx.fillStyle     = color
  ctx.fillText(text, sz / 2, sz / 2)

  // Second pass — crisp foreground text on top of glow
  ctx.shadowBlur = 0
  ctx.fillStyle  = theme === 'serene' && !isStart ? '#1a4a35' : color
  ctx.fillText(text, sz / 2, sz / 2)

  const tex      = new THREE.CanvasTexture(cv)
  const mat      = new THREE.SpriteMaterial({
    map:         tex,
    transparent: true,
    depthTest:   false,   // always visible, never occluded by spheres
  })
  const sprite   = new THREE.Sprite(mat)
  const spriteW  = isStart ? 28 : 22
  sprite.scale.set(spriteW, spriteW, 1)
  return sprite
}

// ── Main hook ─────────────────────────────────────────────────────────────────
export function useThreeGame(containerRef) {
  const rendererRef   = useRef(null)
  const sceneRef      = useRef(null)
  const cameraRef     = useRef(null)
  const nodeMeshesRef = useRef([])   // { mesh, sprite, worldX, worldZ }
  const edgeGroupRef  = useRef(null)
  const sugGroupRef   = useRef(null)
  const orbitRef      = useRef(createOrbitState())
  const rafRef        = useRef(null)
  const isMountedRef  = useRef(true)
  const tickRef       = useRef(0)

  const {
    nodes, humanEdges, aiEdges, gamePhase, startNode,
    setNodes, addHumanEdge, setStartNode,
  } = useGameStore()
  const { suggestion, requestSuggestion } = useAiStore()
  const { theme } = useUiStore()
  const C = THEME3D[theme] || THEME3D.cyber

  // ── Scene init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container || rendererRef.current) return
    isMountedRef.current = true

    const W = container.offsetWidth  || 800
    const H = container.offsetHeight || 600

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H)
    renderer.setClearColor(C.bg, 1)
    container.appendChild(renderer.domElement)
    renderer.domElement.style.display     = 'block'
    renderer.domElement.style.touchAction = 'none'
    rendererRef.current = renderer

    // Scene + fog for depth
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(C.bg)
    scene.fog        = new THREE.Fog(C.fogColor, C.fogNear, C.fogFar)
    sceneRef.current = scene

    // Camera (Y-up perspective)
    const camera = new THREE.PerspectiveCamera(52, W / H, 1, 5000)
    cameraRef.current = camera
    positionCamera(camera, orbitRef.current)

    // Lights
    const ambient = new THREE.AmbientLight(C.ambient.color, C.ambient.intensity)
    ambient.name = 'ambient'
    scene.add(ambient)

    const dir = new THREE.DirectionalLight(C.dirLight.color, C.dirLight.intensity)
    dir.position.set(300, 600, 400)
    dir.name = 'dirLight'
    scene.add(dir)

    // Ground + grid
    buildGround(scene, C)

    // Edge groups
    const eg = new THREE.Group(); eg.name = 'edges';      scene.add(eg); edgeGroupRef.current = eg
    const sg = new THREE.Group(); sg.name = 'suggestion'; scene.add(sg); sugGroupRef.current  = sg

    // Resize observer
    const ro = new ResizeObserver(entries => {
      if (!isMountedRef.current) return
      const { width, height } = entries[0].contentRect
      if (!width || !height) return
      renderer.setSize(width, height)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    })
    ro.observe(container)

    // Render loop
    function animate() {
      if (!isMountedRef.current) return
      rafRef.current = requestAnimationFrame(animate)
      tickRef.current += theme === 'serene' ? 0.016 : 0.028

      // Pulse node glow + gentle Y float
      nodeMeshesRef.current.forEach(({ mesh, sprite }, i) => {
        if (!mesh || mesh.userData.selected) return
        const mat  = mesh.material
        const base = C.nodeMat.emissiveIntensity
        const wave = Math.sin(tickRef.current + i * 0.45)
        mat.emissiveIntensity = base + wave * (theme === 'serene' ? 0.07 : 0.2)
        const floatY = Math.sin(tickRef.current * 0.7 + i * 0.3) * (theme === 'serene' ? 1.5 : 3)
        mesh.position.y = mesh.userData.baseY + floatY

        // Label hovers above the sphere
        if (sprite) sprite.position.y = mesh.position.y + C.nodeRadius + 14
      })

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      isMountedRef.current = false
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      const el = renderer.domElement
      requestAnimationFrame(() => {
        try { renderer.dispose(); if (el.parentNode) el.parentNode.removeChild(el) } catch (_) {}
      })
      rendererRef.current  = null
      sceneRef.current     = null
      cameraRef.current    = null
      nodeMeshesRef.current = []
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Theme changes ──────────────────────────────────────────────────────────
  useEffect(() => {
    const scene    = sceneRef.current
    const renderer = rendererRef.current
    if (!scene || !renderer) return

    renderer.setClearColor(C.bg, 1)
    scene.background = new THREE.Color(C.bg)
    scene.fog        = new THREE.Fog(C.fogColor, C.fogNear, C.fogFar)

    const amb = scene.getObjectByName('ambient')
    if (amb) { amb.color.setHex(C.ambient.color); amb.intensity = C.ambient.intensity }
    const dl  = scene.getObjectByName('dirLight')
    if (dl)  { dl.color.setHex(C.dirLight.color);  dl.intensity  = C.dirLight.intensity  }

    const oldGround = scene.getObjectByName('ground')
    if (oldGround) scene.remove(oldGround)
    buildGround(scene, C)

    rebuildNodes()
    rebuildEdges()
  }, [theme]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Node meshes + label sprites ────────────────────────────────────────────
  const rebuildNodes = useCallback(() => {
    const scene = sceneRef.current
    if (!scene) return

    // Remove old meshes + sprites
    nodeMeshesRef.current.forEach(({ mesh, sprite, ring }) => {
      if (mesh)   scene.remove(mesh)
      if (sprite) scene.remove(sprite)
      if (ring)   scene.remove(ring)
    })
    nodeMeshesRef.current = []

    const { nodes: ns, startNode: sn, theme: th } = { ...useGameStore.getState(), theme: useUiStore.getState().theme }
    if (!ns.length) return

    const TC  = THEME3D[th] || THEME3D.cyber
    const cont = containerRef.current
    const cx   = (cont?.offsetWidth  || 800) / 2
    const cy   = (cont?.offsetHeight || 600) / 2

    ns.forEach((node, idx) => {
      const isStart  = sn === idx
      const matSpec  = isStart ? TC.startNode : TC.nodeMat
      const radius   = isStart ? TC.nodeRadius * 1.4 : TC.nodeRadius

      // World position: XZ ground plane
      const wx = node.x - cx
      const wz = -(node.y - cy)        // flip canvas-Y to world-Z
      const wy = radius                 // sit on top of ground (y=0), not half-buried

      // Sphere
      const geo  = new THREE.SphereGeometry(radius, TC.nodeSegs, TC.nodeSegs)
      const mat  = new THREE.MeshStandardMaterial({
        color:             matSpec.color,
        emissive:          new THREE.Color(matSpec.emissive),
        emissiveIntensity: matSpec.emissiveIntensity,
        roughness:         0.25,
        metalness:         th === 'cyber' ? 0.7 : 0.15,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(wx, wy, wz)
      mesh.userData = { index: idx, baseY: wy, selected: false, isStart }
      mesh.name     = `node-${idx}`
      scene.add(mesh)

      // Canvas-texture label sprite — always faces camera (billboard)
      const sprite = makeNodeSprite(idx, isStart, th)
      sprite.position.set(wx, wy + radius + 14, wz)
      sprite.name = `label-${idx}`
      scene.add(sprite)

      // Orbit ring for start node (on the ground, flat XZ ring)
      let ring = null
      if (isStart) {
        const ringGeo = new THREE.RingGeometry(radius + 4, radius + 9, 36)
        const ringMat = new THREE.MeshBasicMaterial({
          color: TC.startRing, side: THREE.DoubleSide, transparent: true, opacity: 0.8,
        })
        ring = new THREE.Mesh(ringGeo, ringMat)
        ring.rotation.x = -Math.PI / 2   // lay flat on XZ ground
        ring.position.set(wx, 1, wz)
        ring.name = `startRing-${idx}`
        scene.add(ring)
      }

      nodeMeshesRef.current.push({ mesh, sprite, ring })
    })

    rebuildEdges()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { rebuildNodes() }, [nodes, startNode, theme]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { rebuildEdges() }, [humanEdges, aiEdges, theme]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Suggestion overlay ─────────────────────────────────────────────────────
  useEffect(() => {
    const group = sugGroupRef.current
    if (!group) return
    group.clear()

    const { nodes: ns, theme: th } = { ...useGameStore.getState(), theme: useUiStore.getState().theme }
    const { suggestion: sug }      = useAiStore.getState()
    if (!sug || !ns.length) return

    const { from, to } = sug
    if (!ns[from] || !ns[to]) return

    const TC   = THEME3D[th] || THEME3D.cyber
    const cont = containerRef.current
    const cx   = (cont?.offsetWidth  || 800) / 2
    const cy   = (cont?.offsetHeight || 600) / 2

    addTube(
      group,
      new THREE.Vector3(ns[from].x - cx, TC.nodeRadius, -(ns[from].y - cy)),
      new THREE.Vector3(ns[to].x   - cx, TC.nodeRadius, -(ns[to].y   - cy)),
      TC.sugEdge, TC.sugAlpha * 0.85, 1.0
    )

    // Pulsing ring at target — standing vertical, facing camera side
    const tx = ns[to].x - cx, tz = -(ns[to].y - cy)
    const ringGeo = new THREE.RingGeometry(14, 18, 32)
    const ringMat = new THREE.MeshBasicMaterial({
      color: TC.sugEdge, side: THREE.DoubleSide, transparent: true, opacity: TC.sugAlpha,
    })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.position.set(tx, TC.nodeRadius, tz)
    group.add(ring)
  }, [suggestion, nodes, theme]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Edge tubes ─────────────────────────────────────────────────────────────
  function rebuildEdges() {
    const group = edgeGroupRef.current
    const scene = sceneRef.current
    if (!group || !scene) return
    group.clear()

    const { nodes: ns, humanEdges: he, aiEdges: ae } = useGameStore.getState()
    const { theme: th } = useUiStore.getState()
    const TC  = THEME3D[th] || THEME3D.cyber
    if (!ns.length) return

    const cont = containerRef.current
    const cx   = (cont?.offsetWidth  || 800) / 2
    const cy   = (cont?.offsetHeight || 600) / 2
    const groundY = TC.nodeRadius   // edge runs at node-centre height

    he.forEach(({ from, to }) => {
      addTube(
        group,
        new THREE.Vector3(ns[from].x - cx, groundY, -(ns[from].y - cy)),
        new THREE.Vector3(ns[to].x   - cx, groundY, -(ns[to].y   - cy)),
        TC.humanEdge, TC.humanAlpha, TC.edgeTube
      )
    })

    ae.forEach(({ from, to }) => {
      addTube(
        group,
        new THREE.Vector3(ns[from].x - cx, groundY + 1, -(ns[from].y - cy)),
        new THREE.Vector3(ns[to].x   - cx, groundY + 1, -(ns[to].y   - cy)),
        TC.aiEdge, TC.aiAlpha, TC.aiTube
      )
    })
  }

  // ── Pointer / touch orbit + raycast ───────────────────────────────────────
  useEffect(() => {
    const renderer = rendererRef.current
    if (!renderer) return
    const canvas = renderer.domElement

    function applyOrbit(dx, dy) {
      const o = orbitRef.current
      o.theta -= dx * 0.005
      // phi: 0.15 = near-top-down, PI/2.05 = near-horizontal
      o.phi = Math.max(0.15, Math.min(Math.PI / 2.05, o.phi + dy * 0.005))
      positionCamera(cameraRef.current, o)
    }
    function applyZoom(delta) {
      const o = orbitRef.current
      o.radius = Math.max(200, Math.min(1400, o.radius + delta))
      positionCamera(cameraRef.current, o)
    }
    function getClickedNode(clientX, clientY) {
      const r = rendererRef.current, cam = cameraRef.current, sc = sceneRef.current
      if (!r || !cam || !sc) return -1
      const rect = r.domElement.getBoundingClientRect()
      const ndcX =  ((clientX - rect.left) / rect.width)  * 2 - 1
      const ndcY = -((clientY - rect.top)  / rect.height) * 2 + 1
      const ray  = new THREE.Raycaster()
      ray.setFromCamera({ x: ndcX, y: ndcY }, cam)
      ray.params.Mesh = { threshold: 12 }
      const meshes = nodeMeshesRef.current.map(o => o.mesh).filter(Boolean)
      const hits   = ray.intersectObjects(meshes)
      return hits.length ? hits[0].object.userData.index : -1
    }

    let dragMoved = false
    const onMouseDown = e => { orbitRef.current.isPointerDown = true; orbitRef.current.lastX = e.clientX; orbitRef.current.lastY = e.clientY; dragMoved = false }
    const onMouseMove = e => {
      if (!orbitRef.current.isPointerDown) return
      const dx = e.clientX - orbitRef.current.lastX, dy = e.clientY - orbitRef.current.lastY
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragMoved = true
      applyOrbit(dx, dy)
      orbitRef.current.lastX = e.clientX; orbitRef.current.lastY = e.clientY
    }
    const onMouseUp = e => {
      orbitRef.current.isPointerDown = false
      if (!dragMoved) { const i = getClickedNode(e.clientX, e.clientY); if (i !== -1) handleNodeClick(i) }
    }
    const onWheel = e => { e.preventDefault(); applyZoom(e.deltaY * 0.9) }

    function pinchDist(t) { const dx = t[0].clientX-t[1].clientX, dy = t[0].clientY-t[1].clientY; return Math.sqrt(dx*dx+dy*dy) }
    const onTouchStart = e => {
      e.preventDefault(); dragMoved = false
      if (e.touches.length === 1) { orbitRef.current.isPointerDown = true; orbitRef.current.lastX = e.touches[0].clientX; orbitRef.current.lastY = e.touches[0].clientY }
      else if (e.touches.length === 2) { orbitRef.current.isPointerDown = false; orbitRef.current.lastPinchDist = pinchDist(e.touches) }
    }
    const onTouchMove = e => {
      e.preventDefault()
      if (e.touches.length === 1 && orbitRef.current.isPointerDown) {
        const dx = e.touches[0].clientX - orbitRef.current.lastX, dy = e.touches[0].clientY - orbitRef.current.lastY
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true
        applyOrbit(dx, dy); orbitRef.current.lastX = e.touches[0].clientX; orbitRef.current.lastY = e.touches[0].clientY
      } else if (e.touches.length === 2) {
        const d = pinchDist(e.touches)
        applyZoom((orbitRef.current.lastPinchDist - d) * 2.5)
        orbitRef.current.lastPinchDist = d; dragMoved = true
      }
    }
    const onTouchEnd = e => {
      orbitRef.current.isPointerDown = false
      if (!dragMoved && e.changedTouches.length === 1) {
        const t = e.changedTouches[0]; const i = getClickedNode(t.clientX, t.clientY); if (i !== -1) handleNodeClick(i)
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

  // ── Node click handler ─────────────────────────────────────────────────────
  const selectedIdxRef = useRef(-1)

  const handleNodeClick = useCallback((idx) => {
    const state  = useGameStore.getState()
    const notify = useUiStore.getState().showNotification

    if (state.gamePhase === 'placing') {
      setStartNode(idx)
      return
    }
    if (state.gamePhase !== 'routing') return

    const { nodes: ns, humanEdges: he } = state
    const prev = selectedIdxRef.current

    if (prev === -1) { selectedIdxRef.current = idx; applyNodeState(idx, 'selected'); return }
    if (prev === idx) { selectedIdxRef.current = -1; applyNodeState(idx, 'normal'); return }

    const exists = he.some(e => (e.from === prev && e.to === idx) || (e.from === idx && e.to === prev))
    if (exists) { notify('Edge already exists', 'warn'); selectedIdxRef.current = -1; applyNodeState(prev, 'normal'); return }

    const offender = exceedsDegree(he, prev, idx)
    if (offender !== -1) { notify(`Node ${offender} already has 2 connections`, 'warn'); selectedIdxRef.current = -1; applyNodeState(prev, 'normal'); return }

    if (wouldCloseSubtour(he, prev, idx, ns.length)) { notify('This would close an incomplete sub-tour', 'warn'); selectedIdxRef.current = -1; applyNodeState(prev, 'normal'); return }

    addHumanEdge({ from: prev, to: idx, dist: euclidDist(ns[prev], ns[idx]) })
    applyNodeState(prev, 'normal')
    applyNodeState(idx, 'flash')
    selectedIdxRef.current = -1
    useAiStore.getState().requestSuggestion(ns, useGameStore.getState().humanEdges)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function applyNodeState(idx, state) {
    const entry = nodeMeshesRef.current[idx]
    if (!entry?.mesh) return
    const { mesh } = entry
    const { theme: th } = useUiStore.getState()
    const TC  = THEME3D[th] || THEME3D.cyber
    const mat = mesh.material
    if (state === 'selected') {
      mat.color.setHex(TC.nodeSelect.color); mat.emissive.setHex(TC.nodeSelect.emissive)
      mat.emissiveIntensity = TC.nodeSelect.emissiveIntensity; mesh.scale.setScalar(1.45); mesh.userData.selected = true
    } else if (state === 'flash') {
      mat.emissiveIntensity = TC.nodeHover.emissiveIntensity; mesh.scale.setScalar(1.25)
      setTimeout(() => {
        if (!mesh.material) return
        mat.color.setHex(TC.nodeMat.color); mat.emissive.setHex(TC.nodeMat.emissive)
        mat.emissiveIntensity = TC.nodeMat.emissiveIntensity; mesh.scale.setScalar(1.0); mesh.userData.selected = false
      }, 300)
    } else {
      mat.color.setHex(TC.nodeMat.color); mat.emissive.setHex(TC.nodeMat.emissive)
      mat.emissiveIntensity = TC.nodeMat.emissiveIntensity; mesh.scale.setScalar(1.0); mesh.userData.selected = false
    }
  }

  // ── Spawn (called by ArenaScreen) ──────────────────────────────────────────
  const spawnNodes = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const state = useGameStore.getState()
    const W = container.offsetWidth  || 800
    const H = container.offsetHeight || 600
    let newNodes = []
    if (state.nodeSource === 'standard') {
      newNodes = scaleNodesToCanvas((STANDARD_SETS[state.standardSize] || STANDARD_SETS.M).nodes, W, H)
    } else if (state.nodeSource === 'custom') {
      const { nodes: parsed } = parseCustomNodes(state.customRaw)
      if (parsed.length < 3) { useUiStore.getState().showNotification('Need at least 3 valid nodes', 'warn'); return }
      newNodes = scaleNodesToCanvas(parsed, W, H)
    } else {
      newNodes = generateNodes(state.difficulty, W, H)
    }
    setNodes(newNodes)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { spawnNodes }
}

// ── Camera positioning (Y-up orbit) ──────────────────────────────────────────
function positionCamera(camera, orbit) {
  if (!camera) return
  const { theta, phi, radius, target } = orbit
  // Standard spherical coords with Y as up axis
  camera.position.x = target.x + radius * Math.sin(phi) * Math.sin(theta)
  camera.position.y = target.y + radius * Math.cos(phi)
  camera.position.z = target.z + radius * Math.sin(phi) * Math.cos(theta)
  camera.lookAt(target)
  camera.updateProjectionMatrix()
}

// ── Ground plane + perspective grid ──────────────────────────────────────────
// Ground is horizontal (XZ plane at y=0). Grid lines converge in the distance
// giving true Google-Earth-style depth perspective.
function buildGround(scene, C) {
  const group = new THREE.Group()
  group.name  = 'ground'

  // Solid ground plane
  const planeGeo = new THREE.PlaneGeometry(3000, 3000)
  const planeMat = new THREE.MeshStandardMaterial({
    color:     C.ground.color,
    roughness: 0.95,
    metalness: 0.0,
  })
  const plane = new THREE.Mesh(planeGeo, planeMat)
  plane.rotation.x = -Math.PI / 2   // rotate to lie flat (XZ)
  plane.position.y = -0.5            // just below y=0 so nodes sit ON it
  group.add(plane)

  // Grid lines on the ground (XZ plane, 1-px lines — fine for decoration)
  const gridMat = new THREE.LineBasicMaterial({
    color:       C.gridColor,
    transparent: true,
    opacity:     C.gridOpacity,
  })
  const pts  = []
  const step = 80
  const half = 1200
  // Lines parallel to Z axis (varying X)
  for (let x = -half; x <= half; x += step) {
    pts.push(new THREE.Vector3(x, 0.2, -half), new THREE.Vector3(x, 0.2, half))
  }
  // Lines parallel to X axis (varying Z)
  for (let z = -half; z <= half; z += step) {
    pts.push(new THREE.Vector3(-half, 0.2, z), new THREE.Vector3(half, 0.2, z))
  }
  const gridGeo = new THREE.BufferGeometry().setFromPoints(pts)
  group.add(new THREE.LineSegments(gridGeo, gridMat))

  scene.add(group)
}

// ── Cylinder tube between two 3D points ──────────────────────────────────────
function addTube(group, start, end, color, opacity, radius) {
  const dir    = new THREE.Vector3().subVectors(end, start)
  const length = dir.length()
  if (length < 1) return

  const geo  = new THREE.CylinderGeometry(radius, radius, length, 8, 1)
  const mat  = new THREE.MeshBasicMaterial({ color, opacity, transparent: opacity < 1 })
  const mesh = new THREE.Mesh(geo, mat)

  const mid  = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
  mesh.position.copy(mid)

  // CylinderGeometry default axis = Y; align to edge direction
  mesh.setRotationFromQuaternion(
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
  )
  group.add(mesh)
}
