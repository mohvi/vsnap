/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Mesma identidade da app (constants/theme.ts): rosa #FF286A → laranja #FF8C5A.
      colors: {
        brand: {
          300: '#FF8FB0',
          400: '#FF5C8D',
          500: '#FF3D78',
          600: '#FF286A',
          700: '#D91B57',
        },
        accent: {
          300: '#FFC0A3',
          400: '#FFA47C',
          500: '#FF9468',
          600: '#FF8C5A',
        },
        ink: {
          950: '#0D0D0D',
          900: '#161616',
          850: '#1A1A1A',
          800: '#222222',
          700: '#2A2A2A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
