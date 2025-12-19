/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,njk,md,js}"
  ],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            // 移除 code 的前後引號
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            // 讓 pre 的樣式由 Prism 控制
            'pre': {
              backgroundColor: 'transparent',
              padding: '0',
            },
            'pre code': {
              backgroundColor: 'transparent',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
