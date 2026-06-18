# Pathfinder TSP

## Overview
**Pathfinder TSP** is a sophisticated, interactive visualization and gameplay platform centered around the **Traveling Salesman Problem (TSP)**. It serves as an experimental arena where human spatial intuition meets machine heuristics. The project explores whether collaborative human-AI routing can outperform traditional algorithms in solving one of computer science's most famous NP-hard problems.

The application allows users to plot routes across various node distributions, ranging from small benchmark sets to massive 500+ node clusters, featuring both a high-fidelity **2D Pixi.js** engine and a Google Earth-style **3D Three.js** environment.

---

## Tech Stack & Architecture

### Core Technologies
- **Framework:** [React 18](https://react.dev/) (Vite-powered)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand) (Centralized, reactive store-driven architecture)
- **2D Rendering:** [Pixi.js](https://pixijs.com/) (High-performance WebGL 2D engine)
- **3D Rendering:** [Three.js](https://threejs.org/) (Perspective-camera world with orbit controls)
- **Animations:** [GSAP](https://gsap.com/) (UI transitions and hero effects)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) + PostCSS (Themed via custom CSS variables)
- **Data Viz:** [Recharts](https://recharts.org/) (Convergence graphs and performance metrics)
- **Routing:** React Router DOM (Single Page Application structure)

### System Architecture
The project follows a **Unidirectional Data Flow** pattern:
1.  **Zustand Stores** (`gameStore`, `aiStore`, `uiStore`) act as the "Single Source of Truth."
2.  **React Components** respond to state changes to update the UI and HUD.
3.  **Canvas Hooks** (`usePixiGame`, `useThreeGame`) synchronize the rendering engines with the state, ensuring that adding an edge in 2D is immediately reflected in the 3D view.
4.  **Utility Layer** (`tspUtils`, `tourValidator`) handles the heavy lifting of geometry, coordinate scaling, and Hamiltonian cycle validation.

---

## Features Implemented (V11)

### 🎮 Game Modes
- **Solo Run:** Pure human intuition. Plot the shortest path without assistance.
- **Co-Pilot:** AI provides real-time suggestions (dashed lines) based on nearest-neighbor heuristics.
- **Vs AI:** Compete against the machine's best-calculated route in real-time.

### 📍 Node Management
- **Random Generation:** Dynamic spawning with collision detection to ensure spacing.
- **Standard Benchmarks:** S (10), M (20), and L (30) presets for reproducible testing.
- **Custom Input:** Paste raw coordinates (x,y) to solve specific real-world datasets.
- **Scaling Engine:** Automatically normalizes any coordinate range to fit the canvas viewport.

### 🌌 Dual-Engine Visualization
- **2D Mode:** High-contrast tactical view with pulsing nodes and scanline overlays.
- **3D Mode:** Immersive perspective with an orbital camera, depth fog, and floating label sprites.
- **Seamless Toggle:** Swap engines mid-game without losing progress or state.

### 🛠️ Advanced Logic & Validation
- **Hamiltonian Validation:** Prevents invalid moves by checking node degrees (max 2) and detecting premature sub-tours.
- **MST Lower Bound:** Calculates a theoretical "Optimal Bound" using a Minimum Spanning Tree heuristic to measure player efficiency.
- **Theming:** Full system-wide support for **Cyber** (Neon/Dark) and **Serene** (Minimalist/Light) themes.

### 📊 Analytics & Debrief
- **Route Replay:** Step-through analysis of the completed tour.
- **Convergence Graph:** Visualize how the solution improves over time compared to AI averages.
- **Collaboration Score:** Measures the synergy between human overrides and AI suggestions.

---

## File & Directory Structure

```text
pathfinder-tsp/
├── src/
│   ├── components/
│   │   ├── canvas/          # 2D (Pixi) and 3D (Three) rendering engines
│   │   ├── panels/          # HUD elements (AI reasoning, Stats, Mobile Drawers)
│   │   ├── results/         # Post-game charts and replay components
│   │   └── ui/              # Reusable UI primitives (Buttons, Dials, Navbar)
│   ├── hooks/               # Custom hooks (e.g., useTheme for reactive styling)
│   ├── screens/             # Top-level page layouts (Landing, Arena, Results, Global)
│   ├── stores/              # Zustand state definitions (Game, AI, UI)
│   ├── utils/               # Math, TSP algorithms, and tour validation logic
│   ├── App.jsx              # Main router and root layout
│   └── main.jsx             # Entry point
├── tailwind.config.js       # Theme definitions and color palettes
└── vite.config.js           # Build configuration
```

---

## Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm or yarn

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally
1. Start the development server:
   ```bash
   npm run dev
   ```
2. Open `http://localhost:5173` in your browser.

### Building for Production
1. Create an optimized build:
   ```bash
   npm run build
   ```
2. Preview the production build:
   ```bash
   npm run preview
   ```

---

## Key Components & Code Flow

### 1. The Interaction Loop
When a user clicks a node in the `ArenaScreen`:
- The event is captured by either `usePixiGame` or `useThreeGame`.
- It validates the move via `tourValidator.js` (Is the node degree < 2? Does it close a sub-tour?).
- If valid, `addHumanEdge` is dispatched to the `gameStore`.
- The `aiStore` triggers `requestSuggestion`, which runs a heuristic to find the next best move.
- The UI and both Canvas engines re-render automatically to reflect the new edge.

### 2. Coordinate Scaling
Because custom inputs can have coordinates in the thousands (or decimals), `tspUtils.js` implements `scaleNodesToCanvas`. This function maps any bounding box of points into the normalized pixel space of the player's screen while maintaining a safe "padding" zone for the HUD.

### 3. The Theme System
The project uses a hybrid theme system. Layout colors are managed via Tailwind and `data-theme` attributes on the HTML root. Visual styles inside the canvases (where CSS doesn't apply) are managed via the `useTheme` hook, which provides HEX/Numeric color constants directly to the Pixi/Three.js material initializers.

---
