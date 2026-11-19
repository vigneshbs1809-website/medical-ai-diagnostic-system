/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'medical-bg': '#F8FAFC',
        'medical-card': '#FFFFFF',
        'medical-primary': '#183B56',
        'medical-accent': '#367CB8',
        'medical-accent-light': '#EAF3FA',
        'medical-text': '#243447',
        'medical-secondary': '#718096',
        'medical-success': '#27865C',
        'medical-border': '#E2E8F0',
        'medical-danger': '#DC2626',
        'medical-warning': '#D97706',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 4px 6px -1px rgba(24, 59, 86, 0.08), 0 2px 4px -2px rgba(24, 59, 86, 0.06)',
      }
    },
  },
  plugins: [],
}
