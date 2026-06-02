/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // These now READ from CSS variables — so toggling [data-theme] changes them globally
        'game-bg':      'var(--color-bg)',
        'game-surface': 'var(--color-surface)',
        'game-border':  'var(--color-border)',
        'game-cyan':    'var(--color-primary)',
        'game-amber':   'var(--color-secondary)',
        'game-green':   'var(--color-success)',
        'game-red':     'var(--color-danger)',
        'game-purple':  'var(--color-special)',
        'game-text':    'var(--color-text)',
        'game-muted':   'var(--color-muted)',
      },
      fontFamily: {
        mono:    ['var(--font-mono)',    'monospace'],
        display: ['var(--font-display)', 'sans-serif'],
      },
      borderRadius: {
        'game-card': 'var(--radius-card)',
        'game-btn':  'var(--radius-btn)',
      },
      boxShadow: {
        'game-card': 'var(--shadow-card)',
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
          '0%':   { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}