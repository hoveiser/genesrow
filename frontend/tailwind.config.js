/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gl: {
          orange: "#FF6B35",
          purple: "#6B46C1",
          violet: "#9B6AF6",
          blue: "#110FFF",
        },
        ink: {
          950: "#070b16",
          900: "#0b1220",
          800: "#131c2e",
          700: "#1e293b",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "gl-gradient": "linear-gradient(135deg, #FF6B35 0%, #6B46C1 100%)",
        "gl-mesh":
          "radial-gradient(60% 60% at 20% 15%, rgba(255,107,53,0.18) 0%, transparent 60%), radial-gradient(60% 60% at 85% 25%, rgba(107,70,193,0.22) 0%, transparent 60%), radial-gradient(80% 80% at 50% 100%, rgba(155,106,246,0.14) 0%, transparent 55%)",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,107,53,0.25), 0 8px 40px -12px rgba(107,70,193,0.45)",
      },
    },
  },
  plugins: [],
};
