/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/renderer/index.html", "./src/renderer/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        vector: {
          bg: "#0D0221",
          blue: "#7DF9FF",
          darkblue: "#0A3B40",
          white: "#FFFFFF",
        },
      },
      fontFamily: {
        terminal: ['"Press Start 2P"', "cursive"],
        mono: ['"VT323"', "monospace"],
      },
      boxShadow: {
        "card-glow": "0 0 20px rgba(125, 249, 255, 0.15)",
        "card-glow-hover": "0 0 30px rgba(125, 249, 255, 0.3)",
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("@tailwindcss/forms"),
    require("@tailwindcss/container-queries"),
  ],
};
