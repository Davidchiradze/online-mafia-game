/**
 * Who may see the Serial Killer's mark, and when.
 *
 * SHIPPED AS A LEAK, which is why this is a pure function with tests rather
 * than an inline expression like its yakuza and doctor equivalents. The first
 * version rendered the confirmation before any phase or viewer check ran, so
 * every player in the room saw who the Serial Killer had shot, for the whole
 * night. `NightActionWrapper` is `z-30` and `NightCover` is `z-10`, so the
 * night cover did not hide it — it was painted on top of the very thing meant
 * to be concealing the table.
 *
 * The rule has two halves and BOTH were missing:
 *
 *   WHO — the host monitors, and the Serial Killer sees their own pick. Nobody
 *   else. This is a solo faction (`docs/variants/serial_killer/rules.md` §4):
 *   unlike the mafia or the yakuza there are no teammates to share a target
 *   with, so the audience is exactly two people.
 *
 *   WHEN — inside `serial_killer_chooses_target` only. `serialKillerTarget`
 *   stays on the night row for the rest of that night, so without the phase
 *   gate the mark would linger through the detective and doctor phases and on
 *   into the dawn resolution.
 */

export type SerialKillIndicatorInput = {
  /** From `useNightActionAuthority()` — the viewer is in the SK's phase. */
  isSerialKillerPhase: boolean;
  /** The host monitors every night action. */
  isViewerHost: boolean;
  /**
   * From `useNightActionAuthority()` — already encodes "living SERIAL_KILLER,
   * in their own phase, not the host". Deliberately NOT re-derived from
   * `viewerRole` here: a second copy of the role rule is a second thing to
   * drift.
   */
  hasSerialKillerAuthority: boolean;
  /** `nightPhaseSession.serialKillerTarget` — the seat that was shot, if any. */
  serialKillerTarget: number | undefined;
  /** The seat this tile is rendering. */
  seatNumber: number;
};

export function shouldShowSerialKillIndicator({
  isSerialKillerPhase,
  isViewerHost,
  hasSerialKillerAuthority,
  serialKillerTarget,
  seatNumber,
}: SerialKillIndicatorInput): boolean {
  if (!isSerialKillerPhase) return false;
  if (!isViewerHost && !hasSerialKillerAuthority) return false;
  if (serialKillerTarget === undefined) return false;
  return serialKillerTarget === seatNumber;
}
