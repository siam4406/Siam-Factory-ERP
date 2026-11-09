/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Industrial palette extensions
        factory: {
          50:  '#f0f7ff',
          100: '#e0effe',
          500: '#2563eb',
          600: '#1d4ed8',
          900: '#1e3a5f',
          950: '#0f1f35',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'slide-down':  'slideDown 0.25s ease-out',
        'slide-up':    'slideUp 0.25s ease-out',
        'fade-in':     'fadeIn 0.4s ease-out',
        'pulse-slow':  'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        slideDown: {
          '0%':   { opacity: '0', transform: 'translateY(-8px) translateX(-50%)' },
          '100%': { opacity: '1', transform: 'translateY(0)   translateX(-50%)' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(8px)'  },
          '100%': { opacity: '1', transform: 'translateY(0)'    },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      screens: {
        xs: '375px',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'glow-blue':   '0 0 20px rgba(37,99,235,0.35)',
        'glow-green':  '0 0 20px rgba(34,197,94,0.25)',
        'inner-dark':  'inset 0 2px 4px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
};
