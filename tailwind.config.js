/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#030305',
        card: {
          DEFAULT: '#07070c',
          border: 'rgba(255, 255, 255, 0.08)',
        },
        accent: {
          purple: '#6366f1',
          cherry: '#e23e3e',
          amber: '#dfb86c',
        },
        muted: 'rgba(255, 255, 255, 0.6)',
        blueprint: '#1e293b',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
