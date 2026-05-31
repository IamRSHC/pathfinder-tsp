/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'game-bg':      '#090d14',
        'game-surface': '#0f1623',
        'game-border':  '#1a2540',
        'game-cyan':    '#00e5ff',
        'game-amber':   '#ffab00',
        'game-green':   '#00e676',
        'game-red':     '#ff1744',
        'game-purple':  '#d500f9',
        'game-text':    '#c9d4e8',
        'game-muted':   '#4a5568',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['"Rajdhani"', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow':       'glow 2s ease-in-out infinite alternate',
        'slide-up':   'slideUp 0.3s ease-out',
        'fade-in':    'fadeIn 0.5s ease-out',
      },
      keyframes: {
        glow: {
          '0%':   { boxShadow: '0 0 5px #00e5ff44' },
          '100%': { boxShadow: '0 0 20px #00e5ff88, 0 0 40px #00e5ff33' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(100%)', opacity: 0 },
          '100%': { transform: 'translateY(0)',    opacity: 1 },
        },
        fadeIn: {
          '0%':   { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}