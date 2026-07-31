"use client";

type Props = {
  message: string;
};

/**
 * Result message display.
 */
export function ResultMessage({ message }: Props) {
  return (
    <div
      className="w-full px-3 py-2 rounded-lg border text-center"
      style={{
        background: "linear-gradient(135deg, rgba(52,211,153,0.15) 0%, rgba(16,185,129,0.2) 100%)",
        borderColor: "rgba(52,211,153,0.35)",
      }}
    >
      <span
        className="text-xs text-emerald-300 font-semibold"
        style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
      >
        {message}
      </span>
    </div>
  );
}
