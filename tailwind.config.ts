import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: [
          'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Ubuntu', 'Cantarell', 'Noto Sans', 'Helvetica', 'Arial', 'sans-serif',
        ],
      },
      colors: {
        bg: '#0b0c0f',
        card: '#14161b',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
} satisfies Config;

