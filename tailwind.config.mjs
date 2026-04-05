/** @type {import('tailwindcss').Config} */
const config = {

  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#1e2a62',
        },
        navy: '#1E293B',
        offwhite: '#F8F9FA',
      },
      spacing: {
        '18': '4.5rem',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        'soft': '0 10px 24px rgba(15, 23, 42, 0.08)',
        'lift': '0 20px 40px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}

export default config;


