"use client";

/**
 * The centered round suspect control for the Sports best move (§6).
 *
 * One component in two modes, so the checked state looks identical whether you
 * are the one clicking or one of the people watching:
 *
 *  - `onToggle` given → a real <button> the victim clicks to check / uncheck.
 *  - `onToggle` omitted → the same circle, inert, for everyone else (host, the
 *    other players, spectators). Renders nothing when unchecked.
 *
 * Empty is a dashed hollow ring that fills on hover; checked is a solid amber
 * disc with a stroked checkmark (an inline SVG, not an emoji, so it inherits
 * currentColor and stays crisp at any tile size). No pick-order numbers — a
 * check reads instantly and all three marks are equal.
 */

function CheckIcon() {
  return (
    <svg
      className="w-7 h-7 lg:w-8 lg:h-8"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

type BestMoveIndicatorProps = {
  isChecked: boolean;
  /** Omit for a read-only mark — everyone who is not the victim. */
  onToggle?: () => void;
  isLoading?: boolean;
  label?: string;
};

const SIZE = "w-14 h-14 lg:w-16 lg:h-16";

export default function BestMoveIndicator({
  isChecked,
  onToggle,
  isLoading = false,
  label,
}: BestMoveIndicatorProps) {
  const checkedRing =
    "bg-amber-500/85 border-amber-300 text-slate-950 shadow-[0_0_24px_rgba(245,158,11,0.55)]";
  const emptyRing =
    "bg-slate-950/55 border-dashed border-white/45 text-transparent backdrop-blur-[2px]";

  const shared = `${SIZE} flex items-center justify-center rounded-full border-2 transition-all duration-200 ${
    isChecked ? checkedRing : emptyRing
  }`;

  // Read-only: nothing to check, so render nothing at all.
  if (!onToggle) {
    if (!isChecked) return null;
    return (
      <div className="absolute inset-0 z-[28] pointer-events-none flex items-center justify-center">
        <div className={shared}>
          <CheckIcon />
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center">
      <button
        type="button"
        onClick={onToggle}
        disabled={isLoading}
        aria-pressed={isChecked}
        aria-label={label}
        title={label}
        className={`${shared} ${
          isLoading
            ? "opacity-60 cursor-wait"
            : "cursor-pointer hover:scale-105 active:scale-95 " +
              (isChecked
                ? "hover:bg-amber-400/90"
                : "hover:border-amber-300/80 hover:bg-amber-500/25 hover:text-amber-100/70")
        } focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950`}
      >
        {isLoading ? (
          <span className="w-5 h-5 border-2 border-white/25 border-t-white rounded-full animate-spin" />
        ) : (
          <CheckIcon />
        )}
      </button>
    </div>
  );
}
