/**
 * The voting round — which of the host's four buttons is the right one.
 *
 * SILENT FAILURE MODE: the LAST candidate is never voted on. When
 * `advanceCandidate` steps onto them it auto-assigns a vote from every seat
 * that has not voted yet, because a mafia vote is exhaustive by construction —
 * whoever is left has, by elimination, voted for the only name remaining. So
 * the host's button on that candidate is "Tally", not "Vote Now".
 *
 * Offer the window anyway and nothing throws: it opens, `castVote` rejects
 * every one of those seats as a duplicate, and the host watches a 3-second
 * countdown collect zero votes before tallying the same numbers they would
 * have had. The same applies once every eligible voter has voted early —
 * further candidates cannot gain anything, so the queue is cut short.
 *
 * Both of those rules live in the backend and are invisible from the UI state
 * alone, which is why the step machine is derived here, in one place, from a
 * snapshot rather than re-assembled out of five booleans per component.
 */

import type { HostPanelMeta } from "@/features/game-room/lib/hostPanel";

export type VotingMode = "regular" | "both-leave";

/**
 * `next-candidate` and `tally` are regular-only; `result` is both-leave only.
 * `open-window` and `counting` mean the same thing in both, which is why the
 * two modes can share one countdown and one "Vote Now".
 */
export type VotingStep =
  | "open-window"
  | "counting"
  | "next-candidate"
  | "tally"
  | "result";

export type VotingSnapshot = {
  candidates: readonly number[];
  currentCandidateIndex: number;
  /** The server's 3s window is open right now. */
  votingActive: boolean;
  /** A window has been opened for THIS candidate (`votingStartedAt` is set). */
  hasWindowRun: boolean;
  bothLeaveVoteActive: boolean;
  isTieBreak: boolean;
  tieBreakRound: number;
  /** Alive, non-host seats — everyone who is allowed to vote. */
  eligibleVoterCount: number;
  /** How many of them have cast a vote this round. */
  votedCount: number;
};

export type VotingRound = {
  mode: VotingMode;
  step: VotingStep;
  candidates: readonly number[];
  currentIndex: number;
  currentCandidate: number | null;
  /** The queue ran off its end — every candidate has had their turn. */
  isQueueComplete: boolean;
  /** The last candidate, whose votes the server assigned rather than collected. */
  isFinalCandidate: boolean;
  isTieBreak: boolean;
  tieBreakRound: number;
};

export function votingRound(snapshot: VotingSnapshot): VotingRound {
  const {
    candidates,
    currentCandidateIndex: currentIndex,
    votingActive,
    hasWindowRun,
    bothLeaveVoteActive,
    isTieBreak,
    tieBreakRound,
    eligibleVoterCount,
    votedCount,
  } = snapshot;

  const total = candidates.length;
  const isQueueComplete = currentIndex >= total;
  const isFinalCandidate = !isQueueComplete && currentIndex === total - 1;

  const shared = {
    candidates,
    currentIndex,
    currentCandidate: candidates[currentIndex] ?? null,
    isQueueComplete,
    isFinalCandidate,
    isTieBreak,
    tieBreakRound,
  };

  // One yes/no question for the whole table, so there is no queue to step
  // through — open it, watch it, read it.
  if (bothLeaveVoteActive) {
    return {
      ...shared,
      mode: "both-leave",
      step: votingActive ? "counting" : hasWindowRun ? "result" : "open-window",
    };
  }

  // Nobody can vote any more, so stepping through what is left of the queue
  // would only open windows that collect nothing.
  const everyoneVoted =
    eligibleVoterCount > 0 && votedCount >= eligibleVoterCount;

  const step: VotingStep = votingActive
    ? "counting"
    : isQueueComplete || isFinalCandidate || (hasWindowRun && everyoneVoted)
      ? "tally"
      : hasWindowRun
        ? "next-candidate"
        : "open-window";

  return { ...shared, mode: "regular", step };
}

/**
 * The candidate queue as label→value pills: seat on the left, votes on the
 * right. Vote counts are the whole point of this phase, and a bare seat chip
 * cannot carry a number — the pills also survive the collapse to a phone bar,
 * where they scroll sideways rather than disappearing.
 */
export function votingTally(
  candidates: readonly number[],
  votes: Record<string, readonly number[]>,
  activeCandidate: number | null,
): HostPanelMeta[] {
  return candidates.map((seat) => ({
    id: `candidate-${seat}`,
    label: `#${seat}`,
    value: String((votes[String(seat)] ?? []).length),
    tone: seat === activeCandidate ? "rose" : "slate",
    isActive: seat === activeCandidate,
  }));
}
