/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#EEEBE5',
        primary: '#4A89C8',
        dark:    '#1A1A1A',
        card:    '#FAFAF8',
        muted:   '#8A8A8A',
        border:  'rgba(26,26,26,0.08)',
      },
      fontFamily: {
        heading: ['Oswald', 'sans-serif'],
        body:    ['Montserrat', 'sans-serif'],
        quote:   ['"Playfair Display"', 'serif'],
      },
      boxShadow: {
        card:  '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        float: '0 4px 16px rgba(0,0,0,0.08)',
        blue:  '0 4px 14px rgba(74,137,200,0.30)',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
    },
  },
  plugins: [],
};
