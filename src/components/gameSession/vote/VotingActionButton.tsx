"use client";

import { LoadingSpinner } from "./LoadingSpinner";

export type ActionState =
  | "loading"
  | "voting"
  | "tally"
  | "next"
  | "vote_now"
  | "see_result"
  | "idle";

type Props = {
  state: ActionState;
  onVoteNow?: () => void;
  onNextCandidate?: () => void;
  onTally?: () => void;
  onSeeResult?: () => void;
  /** Button variant for "both leave" mode uses red color */
  variant?: "regular" | "both_leave";
};

/**
 * Smart action button that renders the appropriate button based on voting state.
 * Replaces nested ternaries with a clean switch statement.
 */
export function VotingActionButton({
  state,
  onVoteNow,
  onNextCandidate,
  onTally,
  onSeeResult,
  variant = "regular",
}: Props) {
  switch (state) {
    case "loading":
      return <LoadingSpinner text="Processing..." />;

    case "voting":
      return <span className="text-xs text-gray-500">Voting in progress...</span>;

    case "tally":
      return (
        <button
          type="button"
          onClick={onTally}
          className="px-4 py-1.5 text-sm bg-green-600 hover:bg-green-500 text-white rounded-md"
        >
          Tally Results
        </button>
      );

    case "next":
      return (
        <button
          type="button"
          onClick={onNextCandidate}
          className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-md"
        >
          Next Candidate →
        </button>
      );

    case "vote_now":
      return (
        <button
          type="button"
          onClick={onVoteNow}
          className={`px-4 py-1.5 text-sm text-white rounded-md ${
            variant === "both_leave"
              ? "bg-red-600 hover:bg-red-500"
              : "bg-amber-600 hover:bg-amber-500"
          }`}
        >
          Vote Now
        </button>
      );

    case "see_result":
      return (
        <button
          type="button"
          onClick={onSeeResult}
          className="px-4 py-1.5 text-sm bg-green-600 hover:bg-green-500 text-white rounded-md"
        >
          See Result
        </button>
      );

    case "idle":
    default:
      return null;
  }
}

/**
 * Helper to compute action state for regular voting.
 */
export function getRegularVotingActionState(params: {
  isLoading: boolean;
  isVoting: boolean;
  showTallyButton: boolean;
  showNextCandidateButton: boolean;
  showVoteNowButton: boolean;
}): ActionState {
  const { isLoading, isVoting, showTallyButton, showNextCandidateButton, showVoteNowButton } = params;

  if (isLoading) return "loading";
  if (isVoting) return "voting";
  if (showTallyButton) return "tally";
  if (showNextCandidateButton) return "next";
  if (showVoteNowButton) return "vote_now";
  return "idle";
}

/**
 * Helper to compute action state for "both leave" voting.
 */
export function getBothLeaveActionState(params: {
  isLoading: boolean;
  isVoting: boolean;
  voteEnded: boolean;
}): ActionState {
  const { isLoading, isVoting, voteEnded } = params;

  if (isLoading) return "loading";
  if (isVoting) return "voting";
  if (voteEnded) return "see_result";
  return "vote_now";
}

