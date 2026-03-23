import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        board: {
          light:     'var(--board-light)',
          dark:      'var(--board-dark)',
          highlight: 'var(--board-highlight)',
          selected:  'var(--board-selected)',
          lastFrom:  'var(--board-last-from)',
          lastTo:    'var(--board-last-to)',
        },
        citadel: {
          bg:     'var(--citadel-bg)',
          border: 'var(--citadel-border)',
        },
        surface: {
          primary:   'var(--surface-primary)',
          secondary: 'var(--surface-secondary)',
          tertiary:  'var(--surface-tertiary)',
        },
        accent: {
          gold:      'var(--accent-gold)',
          goldHover: 'var(--accent-gold-hover)',
          goldMuted: 'var(--accent-gold-muted)',
        },
        text: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted:     'var(--text-muted)',
        },
      },
    },
  },
} satisfies Config
