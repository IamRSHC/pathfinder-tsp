# PATHFINDER — TSP Collaborative Game

> *"Neither human nor AI solves it alone. The collaboration is the discovery."*

A research-grade, browser-based game that pits human spatial intuition against real AI optimization algorithms on the **Travelling Salesman Problem (TSP)** — one of the most famous NP-hard problems in computer science.

Built during **Summer Internship 2026** at NIT Tiruchirappalli under the guidance of **Dr. Sathyanarayanan S**, Dept. of CSE.

---

## Overview

**Pathfinder** is an interactive, real-time game where the player hand-draws edges between city nodes to build a Hamiltonian cycle (a closed tour visiting every node exactly once), while a real AI engine running **Nearest-Neighbor + 2-Opt** and **Ant Colony Optimisation (ACO)** works simultaneously to find the optimal route in the background.

The game is not just a toy. It is a research prototype investigating how **human-AI collaboration** performs on combinatorial optimization problems that scale beyond what either side can solve alone. The same math appears in:

- **Drug Discovery** — protein docking path optimization
- **Genome Sequencing** — fragment assembly ordering
- **SoC Routing** — chip wire-length minimization
- **Last-Mile Logistics** — delivery route optimization

### Three Play Modes

| Mode | Description |
|---|---|
| **Solo** | Player solves the TSP alone; AI result shown at debrief for comparison |
| **Co-Pilot** | AI suggests the next edge after each human move (pheromone-guided); player can accept or override |
| **Vs AI** | Direct head-to-head — player races the AI and the shorter route wins |

---

## Tech Stack & Architecture

### Languages & Runtime
| Technology | Role |
|---|---|
| **JavaScript (ESM)** | All application and algorithm code |
| **JSX / React 18** | UI component model |
| **CSS (Vanilla + Tailwind v3)** | Styling; two full design themes |

### Core Frameworks & Libraries

| Package | Version | Purpose |
|---|---|---|
| **React** | 18.3.x | UI framework |
| **React DOM** | 18.3.x | DOM renderer |
| **React Router DOM** | 6.26.x | Client-side routing (SPA, 4 routes) |
| **Zustand** | 4.5.x | Global state management (3 stores) |
| **Pixi.js** | 7.4.x | 2D WebGL canvas rendering (nodes, edges, pheromone overlays) |
| **Three.js** | 0.164.x | 3D WebGL scene (orbit camera, sphere nodes, cylinder tubes) |
| **GSAP** | 3.12.x | UI animations (landing panels, mobile drawer slide) |
| **Recharts** | 2.12.x | Data visualization (convergence graph, pie chart) |

### Build & Dev Tools

| Tool | Role |
|---|---|
| **Vite 5** | Dev server and production bundler |
| **@vitejs/plugin-react** | JSX + React Fast Refresh |
| **Tailwind CSS 3** | Utility classes, mapped to CSS custom properties |
| **PostCSS + Autoprefixer** | CSS post-processing |

### Deployment
- **Vercel** — `vercel.json` rewrites all routes to `/index.html` for SPA client-side routing

### Architecture Summary

```
Browser SPA (no backend, no database)
│
├── React Router — 4 client-side routes (/, /arena, /results, /global)
│
├── Zustand Stores (global reactive state, no prop drilling)
│   ├── gameStore  — all game state (nodes, edges, phase, scores)
│   ├── aiStore    — AI engine state + ACO worker bridge
│   └── uiStore    — theme, view mode, drawer, notifications
│
├── Rendering Layer
│   ├── Pixi.js (2D) — usePixiGame hook — WebGL canvas
│   └── Three.js (3D) — useThreeGame hook — WebGL orbital scene
│
├── AI Engine (runs entirely in-browser, no API calls)
│   ├── nn2opt.js — synchronous NN+2-Opt (main thread, <10ms)
│   └── acoWorker.js — Ant Colony Optimisation (Web Worker, async ~2-3s)
│
└── Deployed as static bundle on Vercel
```

**There is no server, no database, and no external API.** All AI computation runs inside the user's browser using a Web Worker for the ACO algorithm so it never blocks the UI thread.

---

## Features Implemented

### Game Configuration (Landing Screen)
- **Three node sources:**
  - *Random* — pseudo-random node placement with minimum spacing (configurable difficulty: node count)
  - *Standard* — three hand-crafted deterministic benchmark sets (S: 10 nodes, M: 20 nodes, L: 30 nodes) that produce consistent, comparable results across sessions
  - *Custom* — user pastes raw `x,y` coordinate pairs (comma, space, semicolon, or tab separated); the app parses, validates, and scales them to fit the canvas
- **Difficulty dial** — slider for random mode, controls number of nodes
- **Swipeable card deck** — Mode / Config / Leaderboard cards for pre-game setup with GSAP entrance animations
- **3-column desktop layout** — side panels animate in after all 3 cards are visited
- **Floating ⓘ info icon** — mobile/tablet only, hazard-light pulse animation, opens "Why This Exists" bottom sheet, stops pulsing permanently after first tap (persisted via `localStorage`)

### Arena (Gameplay)
- **Two rendering modes toggled live:**
  - **2D** (Pixi.js) — flat WebGL canvas with grid, animated pulsing nodes, human edges (cyan/green), AI edges (amber/rose), pheromone trail overlay
  - **3D** (Three.js) — full perspective scene with Y-up orbit camera, sphere nodes with float animation, cylinder tube edges, depth fog, orbit+pinch-zoom controls
- **Game phases:**
  - `placing` — player taps any node to designate the start/home node (shown with ★)
  - `routing` — player selects pairs of nodes to draw edges
  - `complete` — full Hamiltonian cycle formed, overlay shown, auto-navigate to results
- **Tour validation** (enforced in real-time):
  - No duplicate edges
  - Degree-2 constraint (each node gets exactly 2 edges)
  - Sub-tour prevention (premature loop closure blocked)
- **Undo** — removes the last placed human edge
- **Phase banners** — context-aware hints ("Click a node to set your start node", "Connect back to close the tour")
- **Move history** — live log of last 8 edges in the Stats panel
- **Timer** — runs only during `routing` phase

### AI Engine
- **Step 1 (instant, synchronous):** Nearest-Neighbor heuristic from node 0, followed by full 2-Opt local search passes. Produces an `aiEdges` result in under 10ms for up to 30 nodes.
- **Step 2 (async, Web Worker):** Ant Colony Optimisation runs concurrently in `acoWorker.js`:
  - Parameters: α=1 (pheromone influence), β=5 (distance influence), ρ=0.5 (evaporation), Q=100
  - Ant count: min(max(n, 10), 25)
  - Iteration budget: 120 (≤12 nodes) → 50 (>30 nodes)
  - Elitist ant strategy — global best tour receives bonus reinforcement each iteration
  - Every 5 iterations, pheromone edges above threshold are sent to the main thread for visual overlay
  - Worker communicates via typed messages: `nn2opt`, `update`, `pheromones`, `progress`, `done`
- **Confidence meter** — derived from ACO improvement ratio over NN baseline
- **Pheromone-guided suggestions** — in Co-Pilot mode, after each human edge the AI inspects the current pheromone map to recommend the strongest unvisited edge from the player's current position (falls back to nearest-neighbor if no pheromone data yet)
- **Override counter** — tracks how many times the player rejected suggestions (3 visible squares)
- **Reasoning feed** — live scrolling log of AI events (NN baseline, ACO iterations, convergence)

### UI System
- **Two complete themes, toggleable at runtime:**
  - **Cyber** — dark `#090d14` background, `#00e5ff` cyan accent, `Rajdhani` + `JetBrains Mono` fonts, glowing text shadows, scanlines overlay
  - **Serene** — warm `#FAFAF8` background, `#2D6A4F` forest green accent, `Fraunces` + `DM Mono` fonts, no glows, softer radius, subtle drop shadows
- **Theme toggle pill** in Navbar — sliding pill indicator, CSS variable propagation instantly repaints entire app
- **`useTheme()` hook** — single source of truth for all theme-conditional class names and style values (no inline ternaries scattered across components)
- **Tailwind custom colours** mapped to CSS custom properties (e.g., `game-cyan` → `var(--color-primary)`) so theme switching works globally
- **Responsive layout:**
  - Desktop (≥1024px): 3-column layout (Stats | Canvas | AI Panel)
  - Mobile/Tablet (<1024px): full-width canvas, bottom bar with drawer trigger, GSAP slide-up drawer
  - **TabletOrientationGuard** — blurred fullscreen overlay prompting portrait rotation for tablets (768–1199px) in landscape

### Results / Debrief Screen
- **Score formula:** `SCORE_BASE × (optimalBound / pathLength) × timeBonus × nodeFactor`
  - `optimalBound` — a greedy lower bound (~78% of nearest-neighbor MST) computed at game start
  - `timeBonus` decays from 1.0 → 0.5 over 600 seconds
  - `nodeFactor = log₁₀(nodeCount)` — harder puzzles give a larger multiplier
- **Letter grades:** S (≥90% of max), A (≥70%), B (≥50%), C (<50%) — normalized to node count
- **Mode-specific score layouts:** Solo (single score), Co-Pilot (human + AI + optional synergy bonus if player beat AI by >10%), Vs AI (side-by-side duel with gap bar)
- **Collaboration Breakdown** — Recharts donut chart showing human/AI edge contribution split, plus override and handoff counts
- **Convergence Graph** — Recharts line chart (currently using mock data; TODO: wire to real session ACO history)
- **Route Replay** — pill sequence of human vs AI moves (currently using mock data)
- **Real-world applications panel** — drug discovery, genome sequencing, SoC routing, logistics
- **Share button** — writes a formatted score string to clipboard

### Global Board Screen
- Application layer toggle (Cities / Drug Molecules / SoC Routing / Genome Sequences)
- Seed selector (mock data: ALPHA-7, BETA-12, GAMMA-3)
- Leaderboard table with rank medals
- Convergence graph (shared component)
- Research insight note

> **Note:** The Global Board uses static mock data (`mockAI.js`). The file contains `// TODO: INTEGRATE AI MODEL` comments at the relevant insertion points.

---

## File & Directory Structure

```
pathfinder-tsp-BETA/
│
├── index.html                  # Single HTML shell — loads Google Fonts, mounts #root
├── package.json                # Dependencies & npm scripts
├── vite.config.js              # Vite config (React plugin only)
├── tailwind.config.js          # Tailwind: custom colours mapped to CSS vars, animations
├── postcss.config.js           # PostCSS: Tailwind + Autoprefixer
├── vercel.json                 # SPA rewrite rule for Vercel deployment
│
└── src/
    ├── main.jsx                # Entry point — ReactDOM.createRoot, BrowserRouter
    ├── App.jsx                 # Route table (/, /arena, /results, /global) + TabletOrientationGuard
    ├── index.css               # Global styles: CSS vars (2 themes), Tailwind base/components/utilities,
    │                           #   animations (nodePulse, hazard-light, slideUp, etc.), responsive fixes
    │
    ├── stores/
    │   ├── gameStore.js        # Core game state (nodes, edges, phase, scores, undo, timer)
    │   │                       #   Also contains computeLowerBound() — greedy MST lower bound
    │   ├── aiStore.js          # AI engine bridge — NN+2-Opt runner, ACO worker lifecycle,
    │   │                       #   pheromone-guided suggestions, confidence, reasoning log
    │   └── uiStore.js          # Theme, 2D/3D view mode, mobile drawer, toast notifications
    │
    ├── hooks/
    │   └── useTheme.js         # Central hook — returns theme-conditional class/style tokens
    │                           #   consumed by every component (no hardcoded "cyber" classes)
    │
    ├── utils/
    │   ├── tspUtils.js         # generateNodes, parseCustomNodes, scaleNodesToCanvas,
    │   │                       #   nearestNeighborTour, computeScore, scoreGrade,
    │   │                       #   STANDARD_SETS (S/M/L benchmark node coords), formatters
    │   ├── nn2opt.js           # Nearest-Neighbor heuristic + 2-Opt local search (synchronous)
    │   │                       #   Uses Float64Array distance matrix for speed
    │   ├── tourValidator.js    # Hamiltonian-cycle enforcement: degree check, sub-tour prevention,
    │   │                       #   isTourComplete, edgesRemaining, getOpenEndpoint
    │   └── mockAI.js           # Static mock data for leaderboard, convergence, replay, global seeds
    │                           #   All marked TODO: INTEGRATE AI MODEL
    │
    ├── workers/
    │   └── acoWorker.js        # Web Worker: Ant Colony Optimisation for TSP
    │                           #   Full ACO pipeline: distance matrix, pheromone matrix,
    │                           #   ant tour construction (roulette wheel), 2-opt refinement,
    │                           #   elitist ant, pheromone evaporation, progress + pheromone messages
    │
    ├── screens/
    │   ├── LandingScreen.jsx   # / route — animated background canvas, card deck (Mode/Config/Leaderboard),
    │   │                       #   3-column desktop layout with GSAP, floating ⓘ icon (mobile)
    │   ├── ArenaScreen.jsx     # /arena route — owns node spawning (single source of truth),
    │   │                       #   3-panel layout, phase banners, completion overlay, toast
    │   ├── ResultsScreen.jsx   # /results route — score hero, stats row, collaboration chart,
    │   │                       #   convergence graph, path comparison, share button
    │   └── GlobalScreen.jsx    # /global route — application layer toggle, seed selector, leaderboard
    │
    └── components/
        ├── canvas/
        │   ├── GameCanvas.jsx       # Wrapper — visibility-swaps 2D and 3D canvases (never unmounts)
        │   │                        #   + ViewToggle pill overlay
        │   ├── GameCanvas3D.jsx     # Thin wrapper — mounts useThreeGame, shows "3D VIEW" badge
        │   ├── usePixiGame.js       # 2D rendering hook (Pixi.js v7):
        │   │                        #   grid, node containers (glow ring, circle, label),
        │   │                        #   edge redraw, pheromone overlay, suggestion dashed line,
        │   │                        #   touch pan + pinch-zoom, pulse ticker, node click handler
        │   └── useThreeGame.js      # 3D rendering hook (Three.js r164):
        │                            #   WebGLRenderer, perspective camera, orbit controls,
        │                            #   sphere node meshes with emissive materials + float animation,
        │                            #   canvas-texture label sprites (always face camera),
        │                            #   cylinder tube edges, ground plane + grid,
        │                            #   raycasting for node click, touch orbit + pinch-zoom
        │
        ├── panels/
        │   ├── AIPanel.jsx          # AI Co-Pilot sidebar: phase label, ACO progress bar,
        │   │                        #   NN/ACO path quality, confidence meter, pheromone summary,
        │   │                        #   suggestion accept/override buttons, handoff button,
        │   │                        #   override counter, scrolling reasoning feed
        │   ├── StatsPanel.jsx       # Stats sidebar: path length, optimal bound, gap bar,
        │   │                        #   timer, node count, edges placed/remaining, move history, undo
        │   └── MobileDrawer.jsx     # GSAP slide-up bottom drawer — tabs for AI/Stats panels
        │
        ├── results/
        │   ├── CollaborationScore.jsx  # Recharts donut chart + stats (human%, AI%, overrides, handoffs)
        │   ├── ConvergenceGraph.jsx    # Recharts line chart (mock data — Human+AI, Average, AI-only)
        │   └── RouteReplay.jsx         # Pill sequence of human/AI moves (mock data)
        │
        └── ui/
            ├── Navbar.jsx              # Logo (hard-reload resets state), nav links, theme toggle pill
            ├── CardDeck.jsx            # Swipeable card deck for landing (Mode/Config/Leaderboard)
            ├── ModeCard.jsx            # Individual mode selection card (solo/copilot/vs)
            ├── DifficultyDial.jsx      # Slider for random node count
            ├── NodeSourcePicker.jsx    # 3-way pill (Random/Standard/Custom) + custom textarea
            ├── LeaderboardTeaser.jsx   # Mini leaderboard preview on landing
            ├── ViewToggle.jsx          # 2D/3D sliding pill toggle (bottom-right of canvas)
            ├── FloatingInfoIcon.jsx    # Mobile/tablet ⓘ button with hazard-light animation
            │                           #   + bottom sheet "Why This Exists" with swipe-to-dismiss
            └── TabletOrientationGuard.jsx  # Fullscreen blur overlay for tablets in landscape
```

---

## Setup & Installation

### Prerequisites
- **Node.js** 18 or higher
- **npm** 9 or higher (comes with Node.js)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/IamRSHC/pathfinder-tsp-BETA.git
cd pathfinder-tsp-BETA

# 2. Install all dependencies
npm install

# 3. Start the development server
npm run dev
```

The dev server runs at **http://localhost:5173** (Vite default).

### Other Scripts

```bash
# Build production bundle (outputs to /dist)
npm run build

# Preview the production build locally
npm run preview
```

### Deployment (Vercel)
The repository is pre-configured for Vercel. Push to main and the platform will detect Vite automatically. The `vercel.json` file rewrites all URL paths to `/index.html` so React Router's client-side routing works correctly on direct URL access and page refresh.

---

## Key Components & Code Flow

### 1. Application Boot

```
index.html  →  src/main.jsx
               └─ ReactDOM.createRoot('#root')
               └─ <BrowserRouter>
                  └─ <App>
                     ├─ <TabletOrientationGuard>   ← always mounted, renders null if not tablet landscape
                     └─ <Routes>
                        ├─ /         → <LandingScreen>
                        ├─ /arena    → <ArenaScreen>
                        ├─ /results  → <ResultsScreen>
                        └─ /global   → <GlobalScreen>
```

`uiStore.js` runs a side-effect on import that sets `data-theme="cyber"` on `<html>`, which activates the default CSS variable set.

---

### 2. State Management (Zustand Stores)

Three independent stores. Components subscribe to only the slices they need.

```
gameStore ─── nodes, humanEdges, aiEdges, gamePhase, startNode,
              pathLength, optimalBound, timeElapsed, scores
              Actions: setNodes, setStartNode, addHumanEdge, undoLastMove,
                       tickTime, completeGame, finalizeScore, resetGame

aiStore ──── confidence, suggestion, aiEdges (AI's best tour),
             acoPhase, acoIteration, pheromoneEdges, reasoningLog
             Actions: initAI (launches NN+2-opt + ACO worker),
                      requestSuggestion, acceptSuggestion, rejectSuggestion,
                      stopAI (terminates worker), reset

uiStore ──── theme ('cyber'|'serene'), viewMode ('2d'|'3d'),
             mobileDrawerOpen, activeDrawerTab, notification
             Actions: toggleTheme, toggleViewMode, openDrawer, showNotification
```

---

### 3. Game Session Lifecycle

```
User clicks "Begin Routing" on Landing Screen
    │
    ▼
ArenaScreen mounts
    ├─ resetGame() + resetAi()               ← clean slate
    ├─ setTimeout(50ms) → spawnNodes()
    │   ├─ Reads canvas dimensions (waits for layout)
    │   ├─ Generates nodes (random / standard set / parsed custom)
    │   ├─ gameStore.setNodes(nodes)         ← phase → 'placing'
    │   └─ aiStore.initAI(nodes)
    │       ├─ nn2OptTour(nodes)             ← synchronous, <10ms
    │       │   Nearest-Neighbor from node 0 + 2-Opt passes
    │       │   → aiEdges set immediately
    │       └─ new Worker(acoWorker.js)      ← async starts
    │           Receives: { type:'start', nodes, initialTour, initialLength }
    │           Sends back: nn2opt → update → pheromones → progress → done
    │
    ▼ [gamePhase === 'placing']
Player taps a node → setStartNode(idx) → phase → 'routing'
    │
    ▼ [gamePhase === 'routing']
Player selects node A, then node B:
    ├─ tourValidator checks: duplicate edge? degree-2? sub-tour?
    ├─ If valid: addHumanEdge({ from, to, dist })
    │   ├─ pathLength updated
    │   ├─ moveHistory updated
    │   └─ isTourComplete() checked → if true, phase → 'complete'
    └─ aiStore.requestSuggestion() → pheromone-guided next-edge recommendation
    
    ▼ [gamePhase === 'complete']
ArenaScreen detects phase change → setTimeout(1600ms) → navigate('/results')
    │
    ▼
ResultsScreen mounts
    ├─ finalizeScore(aiLen) → computes humanScore + aiScore via computeScore()
    ├─ scoreGrade() → S/A/B/C letter grade (normalized to node count)
    └─ Renders: ScoreHero (mode-specific), stats, CollaborationScore, ConvergenceGraph
```

---

### 4. Rendering — Dual Canvas Architecture

`GameCanvas.jsx` mounts **both** rendering hooks simultaneously and swaps visibility, never unmounting, to avoid destroying and recreating WebGL contexts:

```
GameCanvas
  ├─ <div visibility=visible|hidden>   ← 2D layer
  │   └─ <GameCanvas2D>
  │       └─ usePixiGame(containerRef)
  │           • Pixi.Application (resizeTo container)
  │           • Stage children: grid → edges → pheromone → suggestion → node containers
  │           • Touch: 1-finger pan, 2-finger pinch-zoom (multiTouchRef guard)
  │
  └─ <div visibility=hidden|visible>   ← 3D layer
      └─ <GameCanvas3D>
          └─ useThreeGame(containerRef)
              • THREE.WebGLRenderer (antialias, pixel ratio ≤ 2)
              • THREE.PerspectiveCamera (52° FOV, Y-up orbit)
              • Orbit: theta (horizontal) + phi (polar, clamped 0.15–π/2.05)
              • Node meshes: SphereGeometry + MeshStandardMaterial (emissive glow)
              • Label sprites: CanvasTexture billboard (always faces camera)
              • Edges: CylinderGeometry tubes aligned to edge direction
              • Raycasting for node click detection
```

Both hooks read directly from `useGameStore` and `useAiStore` and react to state changes via `useEffect` dependencies.

---

### 5. AI Engine — Main Thread + Web Worker

```
aiStore.initAI(nodes)
    │
    ├─── [Main Thread, synchronous]
    │    nn2OptTour(nodes)
    │    1. buildD() — Float64Array n×n distance matrix
    │    2. nnTour() — greedy nearest-neighbor from node 0
    │    3. twoOpt() — iterative 2-opt improvement
    │    → set aiEdges immediately (player sees AI route within <10ms)
    │
    └─── [Web Worker, async]
         acoWorker.js receives { type:'start', nodes, initialTour, initialLength }
         │
         ├─ Recomputes NN+2-Opt independently (confirms or improves baseline)
         │   → postMessage({ type:'nn2opt', tour, length })
         │
         └─ runACO():
             For each iteration (up to MAX_ITER):
               1. Evaporate pheromones (τ *= 1 - ρ)
               2. Each ant builds a tour via roulette-wheel selection
                  (probability ∝ τ^α × η^β where η = 1/distance)
               3. Every 3rd ant after iter 10: apply 2-opt to its tour
               4. Ants deposit pheromones (δ = Q / tourLength)
               5. Elitist ant: global best gets bonus reinforcement
               6. If new global best: postMessage({ type:'update', ... })
               7. Every 5 iters: postMessage({ type:'pheromones', ... })
            → postMessage({ type:'done', tour, length, pheromoneEdges })
```

The pheromone edges sent back are used by `usePixiGame` for the amber/rose trail overlay on the 2D canvas, and by `aiStore.requestSuggestion()` to pick the next recommendation for the player.

---

### 6. Theme System

CSS custom properties on `<html data-theme="...">` define all colours. Tailwind's config maps utility classes to those variables. The `useTheme()` hook returns pre-built class strings for every context (buttons, text, borders, chart colours, etc.), eliminating ternary clutter inside components.

```
uiStore.toggleTheme()
    → document.documentElement.setAttribute('data-theme', next)
    → All CSS var() references repaint instantly
    → useUiStore.theme re-renders subscribed components
    → useTheme() returns updated class tokens
    → Pixi/Three theme effects respond on their own useEffect([theme]) triggers
```

Two themes have **completely separate** font families, typography scales, glow/shadow rules, border-radius values, and colour palettes — including distinct Tailwind overrides in `index.css` for static opacity-modifier classes that Vite generates at build time and can't otherwise be overridden by CSS variable changes alone.

---

## Known Limitations & Future Work

| Area | Status |
|---|---|
| Global leaderboard data | **Mock** — `mockAI.js` static data, marked `TODO: INTEGRATE AI MODEL` |
| Convergence graph | **Mock** — uses static `MOCK_CONVERGENCE` array |
| Route replay | **Mock** — uses static `MOCK_REPLAY_MOVES` array |
| "What the AI learned" insight | **Mock** — static string with `Math.random()` placeholders |
| Handoff segment to AI | **Stub** — `handoffSegment()` logs to reasoning feed but doesn't actually take over edge placement |
| Share button | **Clipboard only** — no social API integration |
| Persistent scores | **None** — all state lives in memory; refresh resets everything |

---

*Pathfinder TSP — Research Prototype · Deployed on Vercel · v20*
