"use client";

type Props = {
  text: string;
};

/**
 * Status text display.
 */
export function StatusText({ text }: Props) {
  return (
    <div
      className="text-xs text-white/60 uppercase tracking-wider text-center"
      style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
    >
      {text}
    </div>
  );
}
