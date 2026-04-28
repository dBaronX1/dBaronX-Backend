/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#5E17EB',
        'primary-light': '#7B3FF5',
        'primary-dark': '#4510C4',
        accent: '#00F0FF',
        'accent-dim': 'rgba(0,240,255,0.15)',
        'eco-green': '#22C55E',
        'bg-base': '#050510',
        'bg-card': '#0D0D2B',
        'bg-card2': '#0A0A1F',
        'fg-base': '#E8E8FF',
        'fg-muted': '#9090BB',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '3rem',
      },
      boxShadow: {
        'glow-purple': '0 0 30px rgba(94,23,235,0.5), 0 0 60px rgba(94,23,235,0.2)',
        'glow-cyan': '0 0 20px rgba(0,240,255,0.4), 0 0 40px rgba(0,240,255,0.15)',
        'glow-green': '0 0 20px rgba(34,197,94,0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};