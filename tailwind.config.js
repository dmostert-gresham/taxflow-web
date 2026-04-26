/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy:  { DEFAULT: '#1B3A5C', light: '#2A5280', dark: '#122740' },
        teal:  { DEFAULT: '#00C896', light: '#00E0AA', dark: '#00A87E' },
        coral: { DEFAULT: '#FF6B35', light: '#FF8555', dark: '#E05520' },
        slate: { DEFAULT: '#64748B', light: '#94A3B8', dark: '#475569' },
      },
      fontFamily: {
        sans:    ['Geist', 'system-ui', 'sans-serif'],
        display: ['Syne', 'system-ui', 'sans-serif'],
        mono:    ['Geist Mono', 'monospace'],
      },
      boxShadow: {
        card:  '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        panel: '0 4px 24px -4px rgb(0 0 0 / 0.10)',
      },
    },
  },
  plugins: [],
}
