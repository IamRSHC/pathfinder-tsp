// TODO: INTEGRATE AI MODEL — This entire file gets replaced by real model calls

export const MOCK_LEADERBOARD = [
  { rank: 1, name: 'NeuralWanderer', score: 2847, gap: '3.2%',  mode: 'Co-Pilot' },
  { rank: 2, name: 'HumanHeuristic', score: 2901, gap: '5.1%',  mode: 'Solo'     },
  { rank: 3, name: 'PathSeeker99',   score: 2965, gap: '7.3%',  mode: 'Co-Pilot' },
  { rank: 4, name: 'TSPMaster',      score: 3102, gap: '12.4%', mode: 'Vs AI'    },
  { rank: 5, name: 'QuickRouter',    score: 3198, gap: '15.9%', mode: 'Co-Pilot' },
]

export const MOCK_CONVERGENCE = Array.from({ length: 20 }, (_, i) => ({
  round:    i + 1,
  best:     3800 - i * 48 - Math.random() * 30,
  average:  4200 - i * 38 - Math.random() * 40,
  aiOnly:   3600 - i * 30 - Math.random() * 20,
}))

export const MOCK_GLOBAL_SEEDS = [
  { seed: 'ALPHA-7',  players: 1842, best: 2847, improvement: '34%' },
  { seed: 'BETA-12',  players:  923, best: 3102, improvement: '28%' },
  { seed: 'GAMMA-3',  players: 3201, best: 2654, improvement: '41%' },
]

export const MOCK_REPLAY_MOVES = Array.from({ length: 15 }, (_, i) => ({
  step:   i + 1,
  actor:  i % 3 === 2 ? 'AI' : 'Human',
  from:   i,
  to:     i + 1,
  length: 120 + Math.random() * 80,
}))