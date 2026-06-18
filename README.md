# Pathfinder TSP — v13

A browser-based, interactive Travelling Salesman Problem (TSP) game with a mock AI Co-Pilot, three game modes, 2D/3D canvas rendering, and a full scoring system.

---

## Table of Contents

- [What It Is](#what-it-is)
- [Game Modes](#game-modes)
- [Scoring System](#scoring-system)
- [Node Sources](#node-sources)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [AI Integration Status](#ai-integration-status)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)

---

## What It Is

Pathfinder TSP is a web app that turns the NP-hard Travelling Salesman Problem into an interactive game. The player places edges between nodes on a canvas to build a Hamiltonian cycle (a closed route that visits every node exactly once), competing against or collaborating with a mock AI Co-Pilot.

The goal is to find the shortest possible closed tour — shorter path = higher score.

---

## Game Modes

### Solo Run
The player routes the entire tour alone. No AI involvement. Score is based purely on path length, time taken, and puzzle difficulty (node count).

### Co-Pilot
The player and AI take turns or the AI makes suggestions the player can Accept or Override. The AI uses a nearest-neighbour heuristic (mock, not a real model — see [AI Integration Status](#ai-integration-status)). A **Synergy Bonus** is awarded if the human-routed path beats the AI's solo path by more than 10%.

### VS AI
Direct duel — the player routes the tour while the AI simultaneously computes its own nearest-neighbour tour. Both receive independent scores. The player with the lower path length (higher score) wins. A score gap bar on the results screen shows the margin.

---

## Scoring System

### Formula

```
score = BASE × efficiency × timeBonus × nodeFactor
```

| Variable | Definition |
|---|---|
| `BASE` | 10,000 (fixed ceiling) |
| `efficiency` | `min(1, optimalBound / pathLength)` — closer to 1 means better routing |
| `timeBonus` | Decays from 1.0 → 0.5 over 600 seconds. Floors at 0.5 so slow play is never catastrophic |
| `nodeFactor` | `log10(nodeCount)`, minimum 1. Rewards harder puzzles with larger base scores |

The optimal bound is computed via a greedy Prim-style MST approximation and scaled by 0.78 as a conservative lower bound.

### Grade Tiers

Grades are normalised against the maximum achievable score for the given node count, so S/A/B/C thresholds are fair at every difficulty level.

| Grade | Threshold | Meaning |
|---|---|---|
| S | ≥ 90% of max | Near-optimal routing |
| A | ≥ 70% of max | Efficient |
| B | ≥ 50% of max | Acceptable |
| C | < 50% of max | Needs improvement |

### Mode-specific behaviour

- **Solo** — single score displayed with grade badge
- **Co-Pilot** — human score + AI score shown side by side; Synergy Bonus (+5% of BASE × beat margin) added when human beats AI by > 10%; share text always uses the total (with bonus)
- **VS AI** — scores shown in a split duel panel with a proportional gap bar

---

## Node Sources

| Source | Description |
|---|---|
| **Random** | Nodes generated randomly with minimum spacing. Count set by the Difficulty Dial (5–150) |
| **Standard** | Fixed benchmark sets — S (10 nodes), M (20 nodes), L (30 nodes) — for repeatable comparisons |
| **Custom** | User pastes `x,y` coordinate pairs (one per line, space/comma/semicolon delimited). Coordinates are normalised and scaled to the canvas |

---

## Tech Stack

| Layer | Library | Version |
|---|---|---|
| UI framework | React | 18.3 |
| Routing | React Router DOM | 6.26 |
| State management | Zustand | 4.5 |
| 2D canvas | PixiJS | 7.4 |
| 3D canvas | Three.js | 0.164 |
| Animation | GSAP | 3.12 |
| Charts | Recharts | 2.12 |
| Styling | Tailwind CSS | 3.4 |
| Build tool | Vite | 5.4 |

---

## Project Structure

```
src/
├── screens/
│   ├── LandingScreen.jsx      — mode/difficulty/source selection
│   ├── ArenaScreen.jsx        — main game canvas + panels
│   ├── ResultsScreen.jsx      — debrief, scores, grade, replay
│   └── GlobalScreen.jsx       — global leaderboard (mock data)
│
├── components/
│   ├── canvas/
│   │   ├── GameCanvas.jsx         — switches between 2D and 3D
│   │   ├── usePixiGame.js         — PixiJS 2D renderer + interaction
│   │   └── useThreeGame.js        — Three.js 3D renderer + orbit controls
│   ├── panels/
│   │   ├── StatsPanel.jsx         — live stats (path length, time, edges)
│   │   ├── AIPanel.jsx            — AI Co-Pilot suggestion UI
│   │   └── MobileDrawer.jsx       — bottom-sheet for mobile
│   ├── results/
│   │   ├── RouteReplay.jsx        — step-through move history
│   │   ├── CollaborationScore.jsx — pie chart + score delta breakdown
│   │   └── ConvergenceGraph.jsx   — path length convergence chart
│   └── ui/
│       ├── Navbar.jsx
│       ├── ModeCard.jsx
│       ├── DifficultyDial.jsx
│       ├── NodeSourcePicker.jsx
│       ├── ViewToggle.jsx
│       └── LeaderboardTeaser.jsx
│
├── stores/
│   ├── gameStore.js    — nodes, edges, scores, game phase
│   ├── aiStore.js      — AI suggestion state (mock engine)
│   └── uiStore.js      — theme, view mode, notifications
│
├── utils/
│   ├── tspUtils.js       — computeScore, scoreGrade, nearestNeighborTour, node generators
│   ├── tourValidator.js  — Hamiltonian cycle enforcement (degree, sub-tour, connectivity)
│   └── mockAI.js         — static mock data for leaderboard and convergence graph
│
└── hooks/
    └── useTheme.js       — Cyber / Serene theme token map
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 18.0
- npm ≥ 9.0

### Install and run

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

The dev server starts at `http://localhost:5173` by default.

### Deploy

The project includes a `vercel.json` configured for SPA routing. Deploy to Vercel by connecting the repository — no additional configuration needed.

---

## AI Integration Status

**No real AI model is currently connected.** All AI behaviour is simulated:

| UI element | Current implementation |
|---|---|
| Suggestion (Node X → Y) | Nearest-neighbour heuristic pick |
| Confidence % | `Math.random()` in range 50–95 |
| Saving % shown | Random number 8–28 |
| "What the AI learned" text | Static hardcoded string |
| Leaderboard scores | Hardcoded mock data (`mockAI.js`) |
| Convergence graph | Randomly generated values |

Three `TODO: INTEGRATE AI MODEL` markers in `src/stores/aiStore.js` mark the exact insertion points for real model calls:

1. `requestSuggestion()` — replace mock with a model API call that returns `{ from, to, reason }`
2. `handoffSegment()` — replace with model-driven auto-complete for a segment
3. `aiStore` confidence — replace random value with model's actual confidence output

---

## Known Limitations

- The optimal bound is a heuristic lower bound (MST-based, ×0.78), not the true TSP optimum. Gap-to-optimal percentages shown in-game are approximate.
- The convergence graph on the Results screen uses mock data, not actual game history.
- The leaderboard is entirely static mock data.
- Route Replay reconstructs from `moveHistory` which is capped at 20 moves.
- Custom node input does not validate for duplicate coordinates.

---

## Roadmap

The following features are planned for upcoming versions:

- Real AI model integration (Claude API) for suggestions and handoff
- Persistent leaderboard with Supabase or similar backend
- Multiplayer / shared seed mode (two players, same node layout)
- Per-session replay storage
- Export tour as GeoJSON / SVG
- Accessibility pass (keyboard-only routing, screen-reader labels)
