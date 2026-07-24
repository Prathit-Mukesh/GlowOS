import type { Config } from "tailwindcss";

/**
 * GlowOS design system.
 * Mobile-first (390px baseline). Dark theme with violet/teal/gold accents.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#141b2e",
          900: "#0e1424",
          800: "#141b2e",
          700: "#1c2540",
          600: "#273357",
        },
        violet: {
          DEFAULT: "#6c4ff7",
          soft: "#8a72f9",
          deep: "#4a30c9",
        },
        teal: {
          DEFAULT: "#00b894",
          soft: "#3fd6b8",
        },
        gold: {
          DEFAULT: "#e8a020",
          soft: "#f2bd5a",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
      },
      maxWidth: {
        app: "480px",
      },
    },
  },
  plugins: [],
};

export default config;
