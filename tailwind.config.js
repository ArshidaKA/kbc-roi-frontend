/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg:           'var(--color-bg)',
        surface:      'var(--color-surface)',
        card:         'var(--color-card)',
        border:       'var(--color-border)',
        'border-light':'var(--color-border-light)',
        primary:      'var(--color-primary)',
        'primary-dark':'var(--color-primary-dark)',
        accent:       'var(--color-accent)',
        success:      'var(--color-success)',
        danger:       'var(--color-danger)',
        warn:         'var(--color-warn)',
        text:         'var(--color-text)',
        muted:        'var(--color-muted)',
        'muted-light':'var(--color-muted-light)',
      },
      fontFamily: {
        sans: ['Fira Sans', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
