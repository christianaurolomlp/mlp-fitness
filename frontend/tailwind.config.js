/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0D005C',
          800: '#130a8a',
          700: '#1a0e9e',
          600: '#2318b5',
        },
        neon: '#00FF88',
        mlpred: '#FF3B3B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
