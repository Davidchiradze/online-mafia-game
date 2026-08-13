/**
 * Host-controls panel — the pure model and the fitting rules.
 *
 * The centre cell of the participant ring is the only place the host acts from,
 * and it is never the same size twice: a desktop Japanese 4×4 merged centre
 * gives it ~520×300, a Sports 4×3 split centre gives it one tile, and a phone
 * in portrait gives it a strip barely taller than a touch target. Rather than
 * one component guessing per variant, every host state is expressed as a
 * `HostPanelDescriptor` — three fixed zones' worth of data — and the shell
 * decides how to compose it from the size it actually got.
 *
 * Three zones, always in this order (see `.host-panel__stack` in game.css):
 *   identity  eyebrow + timer + phase title
 *   data      chips, progress, status — the ONLY zone that flexes
 *   action    the phase button, pinned, never scrolled off
 *
 * Nothing here imports React or touches `ctx` — the shell, the tests and the
 * variant maps all read the same plain data.
 */

import { GAME_PHASES } from "@/shared/lib/constants/game";

// ---------------------------------------------------------------------------
// Composition bands
// ---------------------------------------------------------------------------

/**
 * How the shell composes itself at a given size.
 *
 * - `panel`   — full three-zone stack; type and chips scale with the cell.
 * - `compact` — the data zone collapses to ONE line. Below ~170px of height
 *   there is no arrangement of a chip label, a chip run, a countdown and a
 *   status line that fits; scaling them all down just produces unreadable
 *   text. Rendering less is the fix, not rendering smaller.
 * - `bar`     — under ~118px the cell holds a single row: identity on the
 *   left, a 44px action and a disclosure chevron on the right. The full panel
 *   moves into a sheet the chevron opens.
 */
export type HostPanelLayout = "panel" | "compact" | "bar";

export type HostPanelSize = { width: number; height: number };

/**
 * The height at which a vertical stack stops fitting AT ALL.
 *
 * A stack has to pay for the eyebrow (~11px), a readable data line (~30px),
 * the action, and its own padding and gaps (~13px). Below roughly 94px those
 * add up to more than the cell, and since the action zone is a fixed grid
 * track it wins — the data zone is squeezed to a few pixels and the title
 * clips. Going side by side is the only arrangement left.
 */
export const HOST_PANEL_STACK_MIN_HEIGHT = 94;
/**
 * The width a bar needs: an identity column that can hold a wrapped Georgian
 * phase title (~110px) beside the action and its disclosure (~90px), plus
 * padding and gaps. Landscape phones hand the Japanese merged centre a cell
 * around 250×71 — comfortably a bar, and NOT a stack.
 */
export const HOST_PANEL_BAR_MIN_WIDTH = 224;
/** Below this height (or width) the data zone must collapse to one line. */
export const HOST_PANEL_COMPACT_MAX_HEIGHT = 170;
export const HOST_PANEL_COMPACT_MIN_WIDTH = 200;

/**
 * Pick the composition for a measured cell. Deliberately a pure function of
 * the PANEL's own box — never of the viewport — so the same phone gives a
 * different composition to a Japanese merged centre and a Sports split one.
 *
 * Order matters: "can a stack fit at all" is asked before "should the stack
 * collapse", because a cell that fails the first question cannot be rescued by
 * rendering less — the action's touch floor alone already overflows it.
 */
export function resolveHostPanelLayout({
  width,
  height,
}: HostPanelSize): HostPanelLayout {
  if (
    height < HOST_PANEL_STACK_MIN_HEIGHT &&
    width >= HOST_PANEL_BAR_MIN_WIDTH
  ) {
    return "bar";
  }
  if (
    height < HOST_PANEL_COMPACT_MAX_HEIGHT ||
    width < HOST_PANEL_COMPACT_MIN_WIDTH
  ) {
    return "compact";
  }
  return "panel";
}

// ---------------------------------------------------------------------------
// Descriptor
// ---------------------------------------------------------------------------

/**
 * Seat-chip states. Distinct tones rather than two greens, so the run reads at
 * a glance: who is up now, who is next, who is done, who is waiting — plus the
 * rose `nominated`, which is a standing fact rather than a step in a run.
 */
export type SeatChipTone =
  | "active"
  | "next"
  | "done"
  | "idle"
  | "nominated";

export type SeatChip = { seat: number; tone: SeatChipTone };

/**
 * An ordered run of seats with a cursor — card-picking order today, speaking
 * order when those phases move onto the panel. Seats before the cursor are
 * done, the cursor is active, the rest are idle.
 */
export function orderedSeatChips(
  order: readonly number[],
  currentIndex: number,
): SeatChip[] {
  return order.map((seat, index) => ({
    seat,
    tone:
      index < currentIndex ? "done" : index === currentIndex ? "active" : "idle",
  }));
}

/** Mirrors the `.phase-btn-*` palette so the panel and the legacy stacks match. */
export type HostPanelActionVariant =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "secondary";

export type HostPanelAction = {
  /** Stable across renders — used as the React key. */
  id: string;
  label: string;
  variant: HostPanelActionVariant;
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  /** Native tooltip, used to explain a disabled action. */
  title?: string;
  /** Ignore clicks for N ms after mount (guards a phase-entry double click). */
  disableOnMountMs?: number;
};

/** A "N of M" bar. Panel composition only — it is the first thing to go. */
export type HostPanelProgress = { value: number; total: number };

/**
 * Nominated seats. A standing fact for the whole day, NOT a warning: it gets
 * its own rose capsule above the emerald speaking pills so the two are never
 * confused, and it leads the chip run when the panel collapses — on a bar the
 * host needs who is up for the vote before who is speaking.
 */
export type HostPanelNominated = { label: string; seats: readonly number[] };

/**
 * Who holds the floor and who follows. During a day or introduction run those
 * are the only two facts that matter, so they are two pills rather than the
 * full order — the whole run only appears in self-justification, where it is
 * two or three seats long.
 */
export type HostPanelSpeaker = {
  role: "now" | "next";
  label: string;
  seat: number;
};

/**
 * A short highlighted sentence. Status is one ellipsis-free line; anything that
 * needs emphasis or runs longer (a foul elimination, a tie-break, a both-leave
 * question) becomes a note instead, so panel height stays predictable.
 */
export type HostPanelNoteTone = "amber" | "rose" | "emerald";
export type HostPanelNote = { text: string; tone: HostPanelNoteTone };

export type HostPanelDescriptor = {
  /** Small uppercase kicker above the title ("Pre-game", "Day 2"). */
  eyebrow: string;
  title: string;
  /** Countdown pill beside the eyebrow. */
  timer?: { label: string; isUrgent: boolean };
  nominated?: HostPanelNominated;
  speakers?: readonly HostPanelSpeaker[];
  note?: HostPanelNote;
  chipsLabel?: string;
  chips?: readonly SeatChip[];
  /** One line of prose, max. Anything longer belongs in its own pill. */
  status?: string;
  progress?: HostPanelProgress;
  actions: readonly HostPanelAction[];
};

// ---------------------------------------------------------------------------
// Collapsing
// ---------------------------------------------------------------------------

/**
 * The single data line the `compact` and `bar` compositions collapse to:
 * whichever ONE string matters most. A note is always a warning or a question
 * the host has to act on, so it outranks the status line it replaces.
 */
export function hostPanelCompactLine(
  descriptor: HostPanelDescriptor,
): string | null {
  return descriptor.note?.text ?? descriptor.status ?? null;
}

/** How many chips survive the collapse to one line. */
export const HOST_PANEL_COLLAPSED_CHIP_LIMIT = 4;

/**
 * Every seat the collapsed line could show, in priority order: nominated seats
 * first (who is up for the vote), then the speaker pills flattened to chips,
 * then whatever ordered run the panel was showing.
 */
function collapsibleChips(descriptor: HostPanelDescriptor): SeatChip[] {
  const nominated = (descriptor.nominated?.seats ?? []).map(
    (seat): SeatChip => ({ seat, tone: "nominated" }),
  );
  const speakers = (descriptor.speakers ?? []).map(
    (speaker): SeatChip => ({
      seat: speaker.seat,
      tone: speaker.role === "now" ? "active" : "next",
    }),
  );
  return [...nominated, ...speakers, ...(descriptor.chips ?? [])];
}

/**
 * The chips that survive the collapse — a window CENTRED on the active chip,
 * not the first N. A 12-seat run truncated from the front stops showing the
 * seat that is actually on the clock the moment the run passes seat 4, which
 * is the one fact the collapsed line exists to carry.
 */
export function hostPanelCollapsedChips(
  descriptor: HostPanelDescriptor,
): SeatChip[] {
  const chips = collapsibleChips(descriptor);
  if (chips.length <= HOST_PANEL_COLLAPSED_CHIP_LIMIT) return chips;

  const active = chips.findIndex((chip) => chip.tone === "active");
  if (active < 0) return chips.slice(0, HOST_PANEL_COLLAPSED_CHIP_LIMIT);

  const start = Math.min(
    Math.max(0, active - Math.floor((HOST_PANEL_COLLAPSED_CHIP_LIMIT - 1) / 2)),
    chips.length - HOST_PANEL_COLLAPSED_CHIP_LIMIT,
  );
  return chips.slice(start, start + HOST_PANEL_COLLAPSED_CHIP_LIMIT);
}

/**
 * Whether collapsing actually dropped anything the host might want.
 *
 * The bar spends ~36px on its disclosure chevron. On a 250px-wide landscape
 * cell that is a seventh of the row, so it is only worth paying when the sheet
 * behind it would show something the bar could not.
 */
export function hostPanelHasCollapsedData(
  descriptor: HostPanelDescriptor,
): boolean {
  if (collapsibleChips(descriptor).length > HOST_PANEL_COLLAPSED_CHIP_LIMIT) {
    return true;
  }
  if (descriptor.progress) return true;
  // The capsule carries a label the bare chips lose.
  if ((descriptor.nominated?.seats.length ?? 0) > 0) return true;
  // The single line shows the note, so the status underneath it is dropped.
  if (descriptor.note && descriptor.status) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Migration seam
// ---------------------------------------------------------------------------

/**
 * Phases whose host controls are rendered by the panel shell end-to-end —
 * their `phaseControls` entry owns the whole centre cell, including the phase
 * title, so `GamePhaseControls` must not also stack a `<PhaseTitle>` above it.
 *
 * Every phase named here exists in BOTH variants' phase maps, so this stays
 * variant-agnostic. It grows one phase group at a time as the rest of the host
 * states move onto the panel, and disappears once it covers all of them.
 */
export const HOST_PANEL_PHASES: ReadonlySet<string> = new Set<string>([
  GAME_PHASES[0], // game_session_started
  GAME_PHASES[1], // picking_roles
  GAME_PHASES[7], // introduction_phase
  GAME_PHASES[16], // day_phase
  GAME_PHASES[17], // nominated_players_speak
]);
