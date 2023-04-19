/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js,jsx,tsx}"],
  theme: {
    extend: {
      spacing: {
        '45rev': '-250px',
        '130': '500px',
        '50prev': '-50%',
      },
      colors: {
        background: '#2C3333',
        navbar: '#2E4F4F',
        navtext: '#CBE4DE',
        highlight: '#0E8388',
        highlighthover: '#127275',
        highlightdarker: '#2b5052',
        highlightlighter: '#a3cacc',
        highlighthoverlight: '#74a3a6',
      },
      animation: {
        slidein: 'slidein 0.25s forwards',
        slideout: 'slideout 0.25s forwards',
      },
      keyframes: {
        slidein: {
          '100%': { top: '33.33%', opacity: '1' },
        },
        slideout: {
          '100%': { top: '0', opacity: '0' },
        }
      },
    },
  },
  plugins: [],
}

