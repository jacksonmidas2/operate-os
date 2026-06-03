import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surface tokens for the dark-by-default UI
        ink: {
          950: "#06070d",   // deepest background
          900: "#0b0d18",
          800: "#11142a",
          700: "#1a1f3c",
          600: "#262c4d",
        },
        // Primary accent — cool indigo/violet for OperateHQ chrome
        accent: {
          50: "#eef0ff",
          100: "#dde1ff",
          200: "#b9c2ff",
          300: "#8d99ff",
          400: "#6a78ff",
          500: "#4a55ff",
          600: "#3640e6",
          700: "#2a32b8",
          800: "#1f258a",
          900: "#161b66",
        },
        // Brand orange retained as a secondary accent (echoes M&M invoices)
        brand: {
          50: "#fff7ed",
          100: "#ffedd5",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          900: "#7c2d12",
        },
      },
      backgroundImage: {
        "noise":
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.06 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        glow: "0 0 60px -10px rgba(74, 85, 255, 0.35)",
        "glow-brand": "0 0 60px -10px rgba(249, 115, 22, 0.35)",
        card: "0 1px 0 rgba(255,255,255,0.06) inset, 0 30px 60px -30px rgba(0,0,0,0.65)",
      },
      backdropBlur: {
        xs: "2px",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
