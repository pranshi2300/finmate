/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#E4D3F0",
        bone: "#1D1330",
        ledger: "#06B6D4",
        "ledger-light": "#67E8F9",
        signal: "#F43F5E",
        hairline: "#B999D9",
      },
      fontFamily: {
        display: ["'Baloo 2'", "cursive"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'Space Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
