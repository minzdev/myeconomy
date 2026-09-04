/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brutal: {
          yellow: '#FFDC58',
          pink: '#FF90E8',
          green: '#23A094',
          blue: '#90CDF4',
          cream: '#FFFBEB',
          black: '#000000',
        },
      },
      fontFamily: {
        display: ['"Archivo Black"', 'Lexend Mega', 'sans-serif'],
        body: ['"Space Grotesk"', 'sans-serif'],
      },
      boxShadow: {
        brutal: '4px 4px 0px #000',
        'brutal-lg': '6px 6px 0px #000',
      },
    },
  },
  plugins: [],
}
