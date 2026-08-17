import type { HostPanelTitleAccent } from "@/features/game-room/lib/hostPanel";

type HostPanelTitleProps = {
  title: string;
  /** Faction-coloured tail, e.g. the winner on the end screen. */
  accent?: HostPanelTitleAccent;
};

/**
 * The phase title. Sized entirely by the container-query clamp in game.css —
 * 38px in a desktop centre cell, 12px in a dock — so it never needs a variant
 * or a breakpoint, and it wraps rather than truncating (Georgian runs long
 * enough that ellipsising would eat the phase name itself).
 *
 * The accent inherits that same size and weight — only hue separates it from
 * the prefix — but renders on its own line (see `.host-panel__title-accent`
 * in host-panel.css), so a multi-word faction name never wraps mid-phrase.
 */
export default function HostPanelTitle({ title, accent }: HostPanelTitleProps) {
  return (
    <h3 className="host-panel__title">
      {title}
      {accent && (
        <span
          className={`host-panel__title-accent host-panel__title-accent--${accent.tone}`}
        >
          {accent.text}
        </span>
      )}
    </h3>
  );
}
