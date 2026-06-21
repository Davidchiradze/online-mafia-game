/**
 * Elevated-dark dashboard accent system. One palette entry per accent gives a
 * card its identity: an icon-chip gradient, a tinted text color, a soft glow
 * blob, and a top hairline. Centralized so every widget pulls the same hues.
 */

export type Accent =
  | "indigo"
  | "violet"
  | "emerald"
  | "sky"
  | "amber"
  | "rose";

type AccentStyle = {
  /** Gradient for the icon chip background. */
  chip: string;
  /** Tinted text for figures/labels. */
  text: string;
  /** Blurred glow blob color (top-right corner of accented cards). */
  glow: string;
  /** Top hairline gradient. */
  line: string;
};

export const ACCENT: Record<Accent, AccentStyle> = {
  indigo: {
    chip: "from-indigo-400 to-indigo-600",
    text: "text-indigo-300",
    glow: "bg-indigo-500/25",
    line: "from-transparent via-indigo-400/60 to-transparent",
  },
  violet: {
    chip: "from-violet-400 to-violet-600",
    text: "text-violet-300",
    glow: "bg-violet-500/25",
    line: "from-transparent via-violet-400/60 to-transparent",
  },
  emerald: {
    chip: "from-emerald-400 to-emerald-600",
    text: "text-emerald-300",
    glow: "bg-emerald-500/25",
    line: "from-transparent via-emerald-400/60 to-transparent",
  },
  sky: {
    chip: "from-sky-400 to-sky-600",
    text: "text-sky-300",
    glow: "bg-sky-500/25",
    line: "from-transparent via-sky-400/60 to-transparent",
  },
  amber: {
    chip: "from-amber-400 to-amber-600",
    text: "text-amber-300",
    glow: "bg-amber-500/25",
    line: "from-transparent via-amber-400/60 to-transparent",
  },
  rose: {
    chip: "from-rose-400 to-rose-600",
    text: "text-rose-300",
    glow: "bg-rose-500/25",
    line: "from-transparent via-rose-400/60 to-transparent",
  },
};
