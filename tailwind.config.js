/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./admin.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB', // Modern mavi
        'primary-dark': '#1E40AF',
        secondary: '#1F2937', // Yumuşak koyu gri
        accent: '#F59E0B', // Turuncu vurgu
        'accent-light': '#FEF3C7',
        whatsapp: '#25D366',
        'gray-soft': '#F3F4F6',
      },
      fontFamily: {
        'sans': ['Poppins', 'sans-serif'],
        'logo': ['Raleway', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
}
