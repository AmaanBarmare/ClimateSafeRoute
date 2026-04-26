import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
        display: ["var(--font-fraunces)", "ui-serif", "serif"],
      },
      animation: {
        "draw-route": "draw 3s ease-in-out forwards",
        "draw-route-slow": "draw 4.5s ease-in-out forwards",
        "pulse-glow": "pulseGlow 3.5s ease-in-out infinite",
        "marquee": "marquee 40s linear infinite",
        "fade-up": "fadeUp 0.9s cubic-bezier(0.22, 1, 0.36, 1) both",
        "shimmer": "shimmer 2.4s linear infinite",
      },
      keyframes: {
        draw: {
          "0%": { strokeDashoffset: "1200" },
          "100%": { strokeDashoffset: "0" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.35", transform: "scale(1)" },
          "50%": { opacity: "0.7", transform: "scale(1.06)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
