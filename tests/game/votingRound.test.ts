/**
 * The voting step machine.
 *
 * SILENT FAILURE MODE: two of the backend's rules are invisible from the
 * session document. `advanceCandidate` auto-votes every silent seat onto the
 * LAST candidate, and once every eligible voter has voted no later candidate
 * can gain anything. Get either wrong and the host is offered a vote window
 * that opens, rejects every `castVote` as a duplicate, and collects nothing —
 * no error, just three seconds of an empty countdown and the same numbers.
 */

import { describe, expect, it } from "vitest";

import {
  votingRound,
  votingTally,
  type VotingSnapshot,
} from "@/features/game-room/lib/votingRound";

const snapshot = (over: Partial<VotingSnapshot> = {}): VotingSnapshot => ({
  candidates: [4, 7, 9],
  currentCandidateIndex: 0,
  votingActive: false,
  hasWindowRun: false,
  bothLeaveVoteActive: false,
  isTieBreak: false,
  tieBreakRound: 0,
  eligibleVoterCount: 8,
  votedCount: 0,
  ...over,
});

describe("votingRound — regular", () => {
  it("opens a window on a candidate nobody has voted on yet", () => {
    const round = votingRound(snapshot());
    expect(round.mode).toBe("regular");
    expect(round.step).toBe("open-window");
    expect(round.currentCandidate).toBe(4);
  });

  it("offers no action while the window is open", () => {
    expect(votingRound(snapshot({ votingActive: true })).step).toBe("counting");
  });

  it("moves to the next candidate once the window has closed", () => {
    const round = votingRound(snapshot({ hasWindowRun: true, votedCount: 3 }));
    expect(round.step).toBe("next-candidate");
  });

  it("tallies instead of voting on the last candidate", () => {
    // THE rule: stepping onto the last candidate auto-votes every seat that
    // has not voted, so opening a window there collects nothing at all.
    const round = votingRound(snapshot({ currentCandidateIndex: 2 }));
    expect(round.step).toBe("tally");
    expect(round.isFinalCandidate).toBe(true);
    // Even before any window has run for them.
    expect(round.currentCandidate).toBe(9);
  });

  it("cuts the queue short once every eligible voter has voted", () => {
    // Seat 4 took all eight votes on the first window. Seats 7 and 9 cannot
    // gain one, so stepping through them is dead time.
    const round = votingRound(
      snapshot({ hasWindowRun: true, eligibleVoterCount: 8, votedCount: 8 }),
    );
    expect(round.step).toBe("tally");
    expect(round.isFinalCandidate).toBe(false);
  });

  it("does not treat an empty table as fully voted", () => {
    // Guards the `eligibleVoterCount > 0` clause: 0 >= 0 would otherwise skip
    // the whole queue the moment the session loads.
    const round = votingRound(
      snapshot({ hasWindowRun: true, eligibleVoterCount: 0, votedCount: 0 }),
    );
    expect(round.step).toBe("next-candidate");
  });

  it("tallies once the queue has run off its end", () => {
    const round = votingRound(snapshot({ currentCandidateIndex: 3 }));
    expect(round.step).toBe("tally");
    expect(round.isQueueComplete).toBe(true);
    expect(round.currentCandidate).toBeNull();
  });

  it("keeps counting even on the last candidate", () => {
    // An open window outranks every "which button next" rule — the host must
    // not be able to tally out from under a vote that is still being cast.
    const round = votingRound(
      snapshot({ currentCandidateIndex: 2, votingActive: true }),
    );
    expect(round.step).toBe("counting");
  });
});

describe("votingRound — both leave", () => {
  const bothLeave = (over: Partial<VotingSnapshot> = {}) =>
    votingRound(
      snapshot({
        bothLeaveVoteActive: true,
        candidates: [4, 7],
        isTieBreak: true,
        tieBreakRound: 2,
        ...over,
      }),
    );

  it("asks the question once, with no queue to step through", () => {
    expect(bothLeave().step).toBe("open-window");
    expect(bothLeave({ votingActive: true }).step).toBe("counting");
    expect(bothLeave({ hasWindowRun: true }).step).toBe("result");
  });

  it("never routes to a candidate step", () => {
    // The single yes/no vote has no "next candidate" and no tally — reaching
    // either would call a mutation that does not apply to this mode.
    const steps = [
      bothLeave().step,
      bothLeave({ votingActive: true }).step,
      bothLeave({ hasWindowRun: true, votedCount: 8 }).step,
      bothLeave({ currentCandidateIndex: 1 }).step,
    ];
    expect(steps).not.toContain("next-candidate");
    expect(steps).not.toContain("tally");
  });

  it("carries the tie-break round through", () => {
    expect(bothLeave().tieBreakRound).toBe(2);
  });
});

describe("votingTally", () => {
  it("pairs each candidate with their standing vote count", () => {
    expect(votingTally([4, 7], { "4": [1, 2, 3], "7": [] }, 4)).toEqual([
      { id: "candidate-4", label: "#4", value: "3", tone: "rose", isActive: true },
      { id: "candidate-7", label: "#7", value: "0", tone: "slate", isActive: false },
    ]);
  });

  it("shows a zero rather than dropping a candidate nobody voted for", () => {
    const [pill] = votingTally([9], {}, null);
    expect(pill.value).toBe("0");
  });
});
