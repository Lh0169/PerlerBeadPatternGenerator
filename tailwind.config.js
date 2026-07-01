/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: '#30E787',
        surface: '#1A1A1A',
        muted: '#6B7280',
      }
    },
  },
  plugins: [],
}
