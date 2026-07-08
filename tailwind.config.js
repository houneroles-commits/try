/**
 * Lima earthy palette — soil, clay, sun. No "agri-app green".
 * All colors are defined ONCE here as CSS variables consumed from src/theme.css.
 * Light/dark values live in theme.css under :root and .dark.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Backgrounds / grounding
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--c-surface-2) / <alpha-value>)',
        soil: 'rgb(var(--c-soil) / <alpha-value>)',
        umber: 'rgb(var(--c-umber) / <alpha-value>)',
        // Text
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        'ink-soft': 'rgb(var(--c-ink-soft) / <alpha-value>)',
        'ink-faint': 'rgb(var(--c-ink-faint) / <alpha-value>)',
        // Primary accent: burnt terracotta / clay
        clay: 'rgb(var(--c-clay) / <alpha-value>)',
        'clay-strong': 'rgb(var(--c-clay-strong) / <alpha-value>)',
        'clay-soft': 'rgb(var(--c-clay-soft) / <alpha-value>)',
        'on-clay': 'rgb(var(--c-on-clay) / <alpha-value>)',
        // Supporting accents
        sun: 'rgb(var(--c-sun) / <alpha-value>)',
        sky: 'rgb(var(--c-sky) / <alpha-value>)',
        // Genuine warnings ONLY
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
        'on-danger': 'rgb(var(--c-on-danger) / <alpha-value>)',
        // Hairlines
        line: 'rgb(var(--c-line) / <alpha-value>)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Ubuntu',
          'Noto Sans',
          'sans-serif',
        ],
        // Editorial serif for headings — no download, works offline.
        display: ['ui-serif', 'Georgia', 'Cambria', '"Times New Roman"', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(60 35 20 / 0.06), 0 4px 16px -6px rgb(60 35 20 / 0.10)',
        float: '0 8px 30px -8px rgb(40 22 10 / 0.35)',
        // Warm terracotta glow for hero cards / primary buttons.
        glow: '0 14px 40px -12px rgb(var(--c-clay) / 0.55)',
      },
    },
  },
  plugins: [],
};
