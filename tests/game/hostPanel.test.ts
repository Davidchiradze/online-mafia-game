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
  hostPanelHasCollapsedData,
  hostPanelMetaPillClass,
  hostPanelNominatedSeats,
  hostPanelRailCursor,
  hostPanelRunChips,
  orderedSeatChips,
  resolveHostPanelLayout,
  type HostPanelDescriptor,
  type HostPanelMeta,
} from "@/features/game-room/lib/hostPanel";
import { JAPANESE_PHASE_CONTROLS } from "@/features/game-room/variants/japanese/phaseControls";
import { SPORTS_PHASE_CONTROLS } from "@/features/game-room/variants/sports/phaseControls";
import { JAPANESE_PHASES } from "@convex/games/japanese/phases";
import { SPORTS_PHASES } from "@convex/games/sports/phases";

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
    // Still stackable at 104px — the action scales down and the title fits.
    expect(resolveHostPanelLayout({ width: 390, height: 104 })).toBe("compact");
  });

  it("docks a landscape phone's merged centre to a bar", () => {
    // THE regression. An iPhone 12 Pro in landscape gives the Japanese merged
    // centre a controls half of roughly 250×71. Stacking there spends every
    // pixel on the action's touch floor and clips the phase title out of the
    // data zone, which is exactly what shipped before this band existed.
    expect(resolveHostPanelLayout({ width: 250, height: 71 })).toBe("bar");
    expect(resolveHostPanelLayout({ width: 390, height: 88 })).toBe("bar");
  });

  it("keeps stacking when a short cell is too narrow for a bar", () => {
    // Under ~224px there is no identity column left once the action and its
    // disclosure are placed, so side-by-side is worse than a cramped stack.
    expect(resolveHostPanelLayout({ width: 200, height: 71 })).toBe("compact");
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

describe("hostPanelRunChips", () => {
  // What the COMPACT composition shows. Nominated seats and the speakers are
  // absent by design: they render as their own capsule and pills there, the
  // same way the full panel shows them.
  const dayRun: HostPanelDescriptor = {
    eyebrow: "Day 3",
    title: "Day phase",
    nominated: { label: "Nominated", seats: [4, 9] },
    speakers: [
      { role: "now", label: "Speaking", seat: 4 },
      { role: "next", label: "Next up", seat: 1 },
    ],
    actions: [],
  };

  it("leaves the nominated seats and the speakers to their own blocks", () => {
    // THE regression: on a phone these three all landed in one run of dots,
    // and seat 4 — nominated AND holding the floor — appeared in it twice.
    expect(hostPanelRunChips(dayRun)).toEqual([]);
  });

  it("still windows a long ordered run onto the active seat", () => {
    const chips = hostPanelRunChips({
      ...dayRun,
      chips: orderedSeatChips([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 9),
    });
    expect(chips).toHaveLength(HOST_PANEL_COLLAPSED_CHIP_LIMIT);
    expect(chips.some((chip) => chip.tone === "active")).toBe(true);
  });
});

describe("hostPanelRailCursor", () => {
  const tally = (activeSeat: number | null): HostPanelMeta[] =>
    [4, 7, 9].map((seat) => ({
      id: `candidate-${String(seat)}`,
      label: `#${String(seat)}`,
      value: "0",
      tone: seat === activeSeat ? "rose" : "slate",
      isActive: seat === activeSeat,
    }));

  it("is null when nothing is on the clock", () => {
    expect(hostPanelRailCursor([], tally(null))).toBeNull();
    expect(hostPanelRailCursor([], [])).toBeNull();
  });

  it("changes when the vote queue advances to the next candidate", () => {
    expect(hostPanelRailCursor([], tally(4))).not.toBe(
      hostPanelRailCursor([], tally(7)),
    );
  });

  // The whole point of gating on this: a count ticking up mid-window must not
  // re-centre the rail under the host's eye.
  it("is stable while only the vote counts change", () => {
    const before = tally(7);
    const after = tally(7).map((item) => ({ ...item, value: "3" }));
    expect(hostPanelRailCursor([], after)).toBe(hostPanelRailCursor([], before));
  });

  it("follows the ordered run's cursor when the rail holds chips", () => {
    const run = orderedSeatChips([3, 5, 8], 1);
    expect(hostPanelRailCursor(run, [])).toBe("chip:1:5");
  });

  // A seat can appear twice in the bar's flattened run — once nominated, once
  // speaking — so the position has to be part of the identity, not just a seat.
  it("distinguishes the same seat reached at a different position", () => {
    expect(hostPanelRailCursor(orderedSeatChips([5, 5], 0), [])).not.toBe(
      hostPanelRailCursor(orderedSeatChips([5, 5], 1), []),
    );
  });

  it("prefers the ordered run over the meta pills", () => {
    const run = orderedSeatChips([3, 5], 0);
    expect(hostPanelRailCursor(run, tally(7))).toBe("chip:0:3");
  });
});

describe("hostPanelMetaPillClass", () => {
  const pill = (extra: Partial<HostPanelMeta> = {}): HostPanelMeta => ({
    id: "candidate-4",
    label: "#4",
    value: "3",
    tone: "slate",
    ...extra,
  });

  it("emits the tone alone for a plain night-summary pill", () => {
    expect(hostPanelMetaPillClass(pill({ tone: "rose" }))).toBe(
      "host-panel__meta-pill host-panel__meta-pill--rose",
    );
  });

  // The CSS resolves `--strong` against `--done` and `--active` by source
  // order, so the class list has to arrive in the order the sheet expects.
  it("orders the state modifiers after the tone", () => {
    expect(
      hostPanelMetaPillClass(
        pill({ tone: "rose", emphasis: "strong", isActive: true }),
      ),
    ).toBe(
      "host-panel__meta-pill host-panel__meta-pill--rose" +
        " host-panel__meta-pill--strong host-panel__meta-pill--active",
    );
  });

  it("drops the state modifiers a pill has turned off", () => {
    expect(
      hostPanelMetaPillClass(
        pill({ emphasis: "strong", isDone: false, isActive: false }),
      ),
    ).toBe(
      "host-panel__meta-pill host-panel__meta-pill--slate" +
        " host-panel__meta-pill--strong",
    );
  });

  it("marks a counted candidate done", () => {
    expect(
      hostPanelMetaPillClass(pill({ emphasis: "strong", isDone: true })),
    ).toContain("host-panel__meta-pill--done");
  });
});

describe("hostPanelNominatedSeats", () => {
  it("renders a seat once however many times it was written", () => {
    expect(
      hostPanelNominatedSeats({ label: "Nominated", seats: [4, 1, 4, 4] }),
    ).toEqual([4, 1]);
    expect(hostPanelNominatedSeats(undefined)).toEqual([]);
  });

  it("keeps the bar's flattened row free of repeats too", () => {
    const chips = hostPanelCollapsedChips({
      eyebrow: "Day 3",
      title: "Day phase",
      nominated: { label: "Nominated", seats: [4, 4] },
      actions: [],
    });
    expect(chips).toEqual([{ seat: 4, tone: "nominated" }]);
  });
});

describe("hostPanelHasCollapsedData", () => {
  const base: HostPanelDescriptor = {
    eyebrow: "Day 2",
    title: "Day",
    actions: [],
  };

  it("is false when the bar already shows everything", () => {
    // No chevron then — it would cost a seventh of a landscape row to open a
    // sheet showing the same two facts.
    expect(
      hostPanelHasCollapsedData({ ...base, status: "4 of 10 spoken" }),
    ).toBe(false);
    // Two speaker pills fold into two chips — both survive the collapse.
    expect(
      hostPanelHasCollapsedData({
        ...base,
        speakers: [
          { role: "now", label: "Speaking", seat: 4 },
          { role: "next", label: "Next up", seat: 5 },
        ],
        status: "4 of 10 spoken",
      }),
    ).toBe(false);

    // The night summary renders inline on the collapsed line now. Charging the
    // chevron's ~36px for it would take the width the pills need to fit.
    expect(
      hostPanelHasCollapsedData({
        ...base,
        meta: [
          { id: "m", label: "M", value: "#7", tone: "rose" },
          { id: "y", label: "Y", value: "—", tone: "violet" },
          { id: "h", label: "H", value: "#7", tone: "emerald" },
        ],
        status: "Don awake",
      }),
    ).toBe(false);
  });

  it("is true when the collapse dropped something", () => {
    expect(
      hostPanelHasCollapsedData({
        ...base,
        chips: orderedSeatChips([1, 2, 3, 4, 5, 6], 2),
      }),
    ).toBe(true);
    expect(
      hostPanelHasCollapsedData({ ...base, progress: { value: 3, total: 8 } }),
    ).toBe(true);
    expect(
      hostPanelHasCollapsedData({
        ...base,
        nominated: { label: "Nominated", seats: [4, 9] },
      }),
    ).toBe(true);
    // The one line shows the note, so the status under it is lost.
    expect(
      hostPanelHasCollapsedData({
        ...base,
        note: { text: "Out on fouls", tone: "amber" },
        status: "Speaker may finish",
      }),
    ).toBe(true);
  });
});

describe("HOST_PANEL_PHASES", () => {
  const VARIANTS = [
    ["japanese", new Set<string>(JAPANESE_PHASES), JAPANESE_PHASE_CONTROLS],
    ["sports", new Set<string>(SPORTS_PHASES), SPORTS_PHASE_CONTROLS],
  ] as const;

  it("is registered by every variant that actually has the phase", () => {
    // The set is read by the variant-agnostic `GamePhaseControls`: a listed
    // phase renders bare, with no `<PhaseTitle>` above it. Listing a phase a
    // variant HAS but does not register drops that variant into the legacy
    // branch and renders "Unknown phase" where the controls should be.
    //
    // Not registering a phase a variant does not have is fine and expected —
    // Sports has no introduction phase.
    for (const [name, phases, controls] of VARIANTS) {
      for (const phase of HOST_PANEL_PHASES) {
        if (!phases.has(phase)) continue;
        expect(controls[phase], `${name}: ${phase}`).toBeTypeOf("function");
      }
    }
  });

  it("is not a set of phases no variant has", () => {
    for (const phase of HOST_PANEL_PHASES) {
      const owners = VARIANTS.filter(([, phases]) => phases.has(phase));
      expect(owners.length, phase).toBeGreaterThan(0);
    }
  });
});
