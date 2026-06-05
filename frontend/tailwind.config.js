/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        sidebar: {
          bg:      '#1a1f2e',
          hover:   'rgba(255,255,255,0.06)',
          active:  '#2563eb',
          text:    'rgba(255,255,255,0.55)',
          textHi:  'rgba(255,255,255,0.85)',
          border:  'rgba(255,255,255,0.08)',
          section: 'rgba(255,255,255,0.3)',
        },
      },
    },
  },
  plugins: [],
}