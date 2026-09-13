import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        wuwa: {
          bg: "#090c10",
          card: "rgba(15, 18, 24, 0.88)",
          cardBorder: "rgba(255, 255, 255, 0.12)",
          cardBorderActive: "#eab308",
          dark: "#0b0e14",
          surface: "#121620",
          accent: "#ffd15c",
          gold: "#ffd15c",
          goldLight: "#fef08a",
          purple: "#c084fc",
          purpleDark: "#6b21a8",
          blue: "#38bdf8",
          blueDark: "#0369a1",
          textMain: "#f3f4f6",
          textMuted: "#9ca3af",
          textDim: "#6b7280",
        },
        element: {
          spectro: "#facc15",
          havoc: "#e879f9",
          fusion: "#fb923c",
          aero: "#2dd4bf",
          electro: "#818cf8",
          glacio: "#38bdf8",
        },
      },
      fontFamily: {
        sans: ["'Lagu Sans'", "sans-serif"],
        display: ["'Lagu Sans'", "sans-serif"],
        mono: ["'Lagu Sans'", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "meteor-pass": "meteor 2s ease-in-out infinite",
        "glow-gold": "glowGold 2s ease-in-out infinite alternate",
        "scanline": "scanline 8s linear infinite",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        glowGold: {
          "0%": { boxShadow: "0 0 15px rgba(250, 204, 21, 0.4), inset 0 0 15px rgba(250, 204, 21, 0.2)" },
          "100%": { boxShadow: "0 0 35px rgba(250, 204, 21, 0.8), inset 0 0 25px rgba(250, 204, 21, 0.5)" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(1000%)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
