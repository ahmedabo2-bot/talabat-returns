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
        brand: {
          50: '#fff4ee',
          100: '#ffe4cc',
          200: '#ffc799',
          300: '#ff9f61',
          400: '#ff7a33',
          500: '#ff6b2b',
          600: '#e55520',
          700: '#c04018',
          800: '#9a3215',
          900: '#7d2a13',
        },
        sidebar: '#1E1E2D',
        'sidebar-hover': '#2a2a3d',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
