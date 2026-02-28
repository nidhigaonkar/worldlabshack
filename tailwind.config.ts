import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'reverie-black': '#080810',
        'reverie-surface': '#12121f',
        'reverie-border': '#1e1e35',
        'reverie-muted': '#6b6b8a',
        'reverie-accent': '#7c6df5',
        'reverie-glow': '#a394ff',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-bar': {
          '0%, 100%': { transform: 'scaleY(0.4)' },
          '50%': { transform: 'scaleY(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 20px rgba(124, 109, 245, 0.3)' },
          '50%': { opacity: '0.9', boxShadow: '0 0 30px rgba(124, 109, 245, 0.6)' },
        },
        'spin-reverse': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(-360deg)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'pulse-bar': 'pulse-bar 1.2s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        'pulse-slow': 'pulse-slow 2s ease-in-out infinite',
        'spin-reverse': 'spin-reverse 1.5s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config

