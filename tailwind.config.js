/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          100: '#FFF9E6',
          200: '#FFF0B8',
          300: '#FFE28A',
          400: '#FFD700',
          500: '#D4AF37',
          600: '#AA8C2C',
        },
      },
    },
  },
  plugins: [],
}
