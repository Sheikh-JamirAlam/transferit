/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: '#2C3333',
        navbar: '#2E4F4F',
        navtext: '#CBE4DE',
        highlight: '#0E8388',
        highlighthover: '#127275',
        highlightdarker: '#2b5052',
      },
    },
  },
  plugins: [],
}

