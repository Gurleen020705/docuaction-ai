/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f5ff",
          100: "#dfe9ff",
          200: "#c1d4ff",
          300: "#9ab5ff",
          400: "#6d8dff",
          500: "#3f61f7",
          600: "#2c42e0",
          700: "#2333b3",
          800: "#1f2c8c",
          900: "#1c2870",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(16, 24, 40, 0.08), 0 1px 2px rgba(16, 24, 40, 0.04)",
      },
    },
  },
  plugins: [],
};
