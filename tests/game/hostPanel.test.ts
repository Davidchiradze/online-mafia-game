/**
 * Host-panel fitting rules.
 *
 * SILENT FAILURE MODE: the panel picks its composition from its own measured
 * box, and the boxes it gets come from the ring geometry — a Japanese merged
 * 2×2 centre, a Sports single tile, a phone strip. None of that is visible in
 * a unit run, and a wrong band does not throw: it renders the full three-zone
 * stack into a 90px hole and pushes the action button out of the cell, on one
 * variant, on one orientation. So the bands are pinned here numerically.
 */

import { describe, expect, it } from "vitest";

import {
  HOST_PANEL_COLLAPSED_CHIP_LIMIT,
  HOST_PANEL_PHASES,
  hostPanelCollapsedChips,
  orderedSeatChips,
  resolveHostPanelLayout,
  type HostPanelDescriptor,
} from "@/features/game-room/lib/hostPanel";
import { JAPANESE_PHASE_CONTROLS } from "@/features/game-room/variants/japanese/phaseControls";
import { SPORTS_PHASE_CONTROLS } from "@/features/game-room/variants/sports/phaseControls";

describe("resolveHostPanelLayout", () => {
  it("gives a desktop centre cell the full three-zone panel", () => {
    // Japanese 4×4 merged centre on a laptop: the controls half of a 2×2 span.
    expect(resolveHostPanelLayout({ width: 520, height: 300 })).toBe("panel");
    // Sports 4×3 split centre — one tile, tall and narrow rather than wide.
    expect(resolveHostPanelLayout({ width: 300, height: 430 })).toBe("panel");
  });

  it("composes down before it clips", () => {
    // Short: no room for a chip label, chips, a countdown AND a status line.
    expect(resolveHostPanelLayout({ width: 340, height: 150 })).toBe("compact");
    // Narrow: a chip run cannot wrap into 180px without stacking one per row.
    expect(resolveHostPanelLayout({ width: 180, height: 400 })).toBe("compact");
  });

  it("docks to a bar only when the cell is short AND wide enough for one row", () => {
    expect(resolveHostPanelLayout({ width: 390, height: 104 })).toBe("bar");
    // Short but too narrow to put a 44px action beside the identity: the bar
    // would overlap, so compact (which stacks them) is the safe band.
    expect(resolveHostPanelLayout({ width: 240, height: 104 })).toBe("compact");
  });

  it("keeps the bands ordered so every size resolves", () => {
    for (let width = 120; width <= 640; width += 20) {
      for (let height = 60; height <= 480; height += 20) {
        expect(["panel", "compact", "bar"]).toContain(
          resolveHostPanelLayout({ width, height }),
        );
      }
    }
  });
});

describe("orderedSeatChips", () => {
  it("marks spent seats done, the cursor active, the rest idle", () => {
    expect(orderedSeatChips([4, 1, 7, 2], 2)).toEqual([
      { seat: 4, tone: "done" },
      { seat: 1, tone: "done" },
      { seat: 7, tone: "active" },
      { seat: 2, tone: "idle" },
    ]);
  });

  it("leaves nothing active once the run is complete", () => {
    const chips = orderedSeatChips([4, 1], 2);
    expect(chips.every((chip) => chip.tone === "done")).toBe(true);
  });
});

describe("hostPanelCollapsedChips", () => {
  const withChips = (order: number[], cursor: number): HostPanelDescriptor => ({
    eyebrow: "Pre-game",
    title: "Picking roles",
    chips: orderedSeatChips(order, cursor),
    actions: [],
  });

  const twelveSeats = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  it("passes a short run through untouched", () => {
    expect(hostPanelCollapsedChips(withChips([4, 9], 0))).toHaveLength(2);
  });

  it("keeps the active seat visible late in a 12-seat run", () => {
    // The whole point of the collapsed line is "who is up now" — truncating
    // from the front drops that the moment the run passes seat 4.
    const chips = hostPanelCollapsedChips(withChips(twelveSeats, 9));
    expect(chips).toHaveLength(HOST_PANEL_COLLAPSED_CHIP_LIMIT);
    expect(chips.some((chip) => chip.tone === "active")).toBe(true);
  });

  it("never runs off either end of the run", () => {
    for (let cursor = 0; cursor < twelveSeats.length; cursor++) {
      const chips = hostPanelCollapsedChips(withChips(twelveSeats, cursor));
      expect(chips).toHaveLength(HOST_PANEL_COLLAPSED_CHIP_LIMIT);
      expect(twelveSeats).toEqual(expect.arrayContaining(chips.map((c) => c.seat)));
    }
  });
});

describe("HOST_PANEL_PHASES", () => {
  it("only names phases BOTH variants have", () => {
    // The set is read by the variant-agnostic `GamePhaseControls`. A phase only
    // one variant registers would make the other fall through to the legacy
    // stack and stack a duplicate `<PhaseTitle>` above the panel's own title.
    for (const phase of HOST_PANEL_PHASES) {
      expect(JAPANESE_PHASE_CONTROLS[phase], phase).toBeTypeOf("function");
      expect(SPORTS_PHASE_CONTROLS[phase], phase).toBeTypeOf("function");
    }
  });
});
