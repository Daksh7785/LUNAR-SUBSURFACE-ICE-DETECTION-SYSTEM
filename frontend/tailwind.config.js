/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glass-cyan': '0 8px 32px 0 rgba(6, 182, 212, 0.15)',
        'glass-blue': '0 8px 32px 0 rgba(37, 99, 235, 0.15)',
      },
      backdropFilter: {
        'glass': 'blur(12px)',
      }
    },
  },
  plugins: [],
}
