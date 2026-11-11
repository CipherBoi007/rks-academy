import type { Config } from "tailwindcss";
import { colors } from "./src/lib/theme";

/** "#111111" plus alpha becomes rgba(), so even shadows are derived from the palette. */
function alpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** The RKS design tokens (DESIGN.md). Colours come from src/lib/theme.ts; no hex values anywhere else. */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Short phones (e.g. 360x640): lets one-screen layouts like sign-in tighten up instead of scrolling.
      screens: { short: { raw: "(max-width: 767px) and (max-height: 700px)" } },
      colors,
      fontFamily: {
        display: ["var(--font-oswald)", "Bebas Neue", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        hard: `3px 3px 0 ${colors.ink.DEFAULT}`,
        "hard-sm": `1px 1px 0 ${colors.ink.DEFAULT}`,
        "hard-primary": `4px 4px 0 ${colors.primary.DEFAULT}`,
        card: `0 1px 2px ${alpha(colors.ink.DEFAULT, 0.04)}`,
        sheet: `-8px 0 32px ${alpha(colors.navy.DEFAULT, 0.12)}`,
      },
      letterSpacing: { eyebrow: "0.2em" },
      maxWidth: { content: "1240px" },
      spacing: { tabbar: "4rem" },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
        "slide-in-right": { from: { transform: "translateX(100%)" }, to: { transform: "translateX(0)" } },
        "slide-in-up": { from: { transform: "translateY(100%)" }, to: { transform: "translateY(0)" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
      },
      animation: {
        shimmer: "shimmer 1.4s infinite",
        "slide-in-right": "slide-in-right 200ms ease-out",
        "slide-in-up": "slide-in-up 220ms ease-out",
        "fade-in": "fade-in 150ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
