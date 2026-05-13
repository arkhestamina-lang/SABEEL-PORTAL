/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#EEEBE5',
        primary: '#4A89C8',
        dark: '#1A1A1A',
        card: '#FAFAF8',
      },
      fontFamily: {
        heading: ['Oswald', 'sans-serif'],
        body: ['Montserrat', 'sans-serif'],
        quote: ['"Playfair Display"', 'serif'],
      },
    },
  },
  plugins: [],
};
