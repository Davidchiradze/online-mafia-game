"use client";

import { useTranslations } from "next-intl";
import PhaseButton from "@/features/game-room/components/ui/PhaseButton";

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
  /** Button variant for "both leave" mode uses danger color */
  variant?: "regular" | "both_leave";
};

/**
 * Smart action button that renders the appropriate button based on voting state.
 * Uses PhaseButton for consistent styling across all game phases.
 */
export function VotingActionButton({
  state,
  onVoteNow,
  onNextCandidate,
  onTally,
  onSeeResult,
  variant = "regular",
}: Props) {
  const t = useTranslations("game");

  switch (state) {
    case "loading":
      return (
        <div className="flex items-center gap-2 text-xs text-white/60">
          <span className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
          {t("processingAction")}
        </div>
      );

    case "voting":
      return (
        <span className="text-xs text-white/50">{t("votingInProgress")}</span>
      );

    case "tally":
      return (
        <PhaseButton
          onClick={onTally ?? (() => {})}
          isLoading={false}
          label={t("tallyResults")}
        />
      );

    case "next":
      return (
        <PhaseButton
          onClick={onNextCandidate ?? (() => {})}
          isLoading={false}
          label={t("nextCandidate")}
          variant="secondary"
        />
      );

    case "vote_now":
      return (
        <PhaseButton
          onClick={onVoteNow ?? (() => {})}
          isLoading={false}
          label={t("voteNow")}
          variant={variant === "both_leave" ? "danger" : "primary"}
        />
      );

    case "see_result":
      return (
        <PhaseButton
          onClick={onSeeResult ?? (() => {})}
          isLoading={false}
          label={t("seeResult")}
        />
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
  const {
    isLoading,
    isVoting,
    showTallyButton,
    showNextCandidateButton,
    showVoteNowButton,
  } = params;

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
