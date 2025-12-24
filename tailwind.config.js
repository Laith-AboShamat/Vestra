/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        cyan: '#00BFA5',
        coral: '#FF6B6B',
        charcoal: '#2D3436'
      }
    }
  },
  plugins: []
};
