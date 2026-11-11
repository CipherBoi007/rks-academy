/**
 * The RKS palette (DESIGN.md §1.1): the single source of truth. Tailwind reads it for every utility class,
 * and the few places that need a raw value (the browser theme colour) import it from here.
 */
export const colors = {
  primary: { DEFAULT: "#1F3FBF", 700: "#18329A", 50: "#EEF1FC" },
  accent: { DEFAULT: "#FFE600" },
  // alert-700 is the AA-contrast shade for small orange text on white.
  alert: { DEFAULT: "#F26A1B", 700: "#C2500F", 50: "#FEF0E8" },
  ink: { DEFAULT: "#111111" },
  navy: { DEFAULT: "#0F1B4D" },
  surface: { DEFAULT: "#F4F6FB" },
  muted: { DEFAULT: "#6B7280" },
  line: { DEFAULT: "#E6E9F2" },
  chip: { DEFAULT: "#EEF0F4" },
} as const;
