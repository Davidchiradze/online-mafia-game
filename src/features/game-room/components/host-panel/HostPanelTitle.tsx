type HostPanelTitleProps = {
  title: string;
};

/**
 * The phase title. Sized entirely by the container-query clamp in game.css —
 * 38px in a desktop centre cell, 12px in a dock — so it never needs a variant
 * or a breakpoint, and it wraps rather than truncating (Georgian runs long
 * enough that ellipsising would eat the phase name itself).
 */
export default function HostPanelTitle({ title }: HostPanelTitleProps) {
  return <h3 className="host-panel__title">{title}</h3>;
}
