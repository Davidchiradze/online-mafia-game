"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { nightPhase, sportsNightPhase } from "@convex/refs/game";
import type { Id } from "@convex/_generated/dataModel";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { MAFIA_TEAM_ROLES } from "@/lib/constants/game";
import MafiaKillButton from "@/components/game/MafiaKillButton";
import MafiaTargetIndicator from "./MafiaTargetIndicator";
import NightActionWrapper from "./NightActionWrapper";

/**
 * The mafia kill selection for one participant tile.
 *
 * The mafia kill MECHANISM is variant-specific, so it follows the ruleset
 * dispatch pattern (like `phaseControls`): a single boundary picks the cohesive
 * per-model implementation, and neither the shared button nor the caller
 * branches on `gameType`. Each variant hook returns the same presentational
 * shape (`MafiaKillState`), which `MafiaKillView` renders.
 *
 * - `single-authority` (Japanese): one authority sets a SHARED target the mafia
 *   team + host see; locked once chosen, no kill on night 1.
 * - `unanimous-vote` (Sports §5): every living mafia picks PRIVATELY inside the
 *   5s window (re-pickable, last-write-wins); each sees only their own pick.
 */

type MafiaKillProps = {
  seatNumber: number | null;
  isViewerHost: boolean;
  isTargetHost: boolean;
  isPlayerAlive: boolean;
  hasMafiaKillAuthority: boolean;
  isMafiaPhase: boolean;
};

type MafiaKillState = {
  canShowButton: boolean;
  isSelected: boolean;
  showIndicator: boolean;
  disabled: boolean;
  isLoading: boolean;
  onSelect: () => void;
};

const NOOP_STATE: MafiaKillState = {
  canShowButton: false,
  isSelected: false,
  showIndicator: false,
  disabled: false,
  isLoading: false,
  onSelect: () => {},
};

// ---------------------------------------------------------------------------
// Japanese — single shared kill authority.
// ---------------------------------------------------------------------------

function useSingleAuthorityMafiaKill({
  seatNumber,
  isViewerHost,
  isTargetHost,
  isPlayerAlive,
  hasMafiaKillAuthority,
  isMafiaPhase,
}: MafiaKillProps): MafiaKillState {
  const { gameId, nightPhaseSession, viewerRole } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const selectTarget = useMutation(nightPhase.selectMafiaTarget);

  const isViewerOnMafiaTeam = !!viewerRole &&
    MAFIA_TEAM_ROLES.includes(viewerRole as (typeof MAFIA_TEAM_ROLES)[number]);

  const isSelected =
    isMafiaPhase &&
    (isViewerHost || isViewerOnMafiaTeam) &&
    !!nightPhaseSession &&
    nightPhaseSession.mafiaTarget === seatNumber;

  const canShowButton =
    isMafiaPhase &&
    hasMafiaKillAuthority &&
    !isTargetHost &&
    isPlayerAlive &&
    nightPhaseSession?.nightNumber !== 1 &&
    nightPhaseSession?.mafiaTarget === undefined;

  const onSelect = useCallback(async () => {
    if (seatNumber === null || isLoading || isSelected) return;
    setIsLoading(true);
    try {
      await selectTarget({
        gameId: gameId as Id<"games">,
        targetSeatNumber: seatNumber,
      });
    } catch (error) {
      console.error("Error selecting mafia target:", error);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, seatNumber, isLoading, isSelected, selectTarget]);

  return {
    canShowButton,
    isSelected,
    showIndicator: isSelected && (isViewerHost || isViewerOnMafiaTeam),
    disabled: isLoading || isSelected,
    isLoading,
    onSelect,
  };
}

// ---------------------------------------------------------------------------
// Sports — every living mafia picks privately inside the 5s window (§5.4).
// ---------------------------------------------------------------------------

function useUnanimousMafiaKill({
  seatNumber,
  isTargetHost,
  isPlayerAlive,
  hasMafiaKillAuthority,
  isMafiaPhase,
}: MafiaKillProps): MafiaKillState {
  const { gameId, nightPhaseSession } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const selectTarget = useMutation(sportsNightPhase.selectMafiaTarget);

  // The caller's OWN pick only (never other mafia's) — §5.4 privacy.
  const myPick = useQuery(
    sportsNightPhase.getMySelection,
    isMafiaPhase ? { gameId: gameId as Id<"games"> } : "skip",
  );

  const isSelected = isMafiaPhase && myPick === seatNumber;

  const canShowButton =
    isMafiaPhase &&
    hasMafiaKillAuthority &&
    !isTargetHost &&
    isPlayerAlive &&
    nightPhaseSession?.mafiaTargetWindowActive === true;

  const onSelect = useCallback(async () => {
    // Re-pickable within the window (last-write-wins) — not locked by isSelected.
    if (seatNumber === null || isLoading) return;
    setIsLoading(true);
    try {
      await selectTarget({
        gameId: gameId as Id<"games">,
        targetSeatNumber: seatNumber,
      });
    } catch (error) {
      console.error("Error selecting mafia target:", error);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, seatNumber, isLoading, selectTarget]);

  return {
    canShowButton,
    isSelected,
    showIndicator: isSelected, // private: only the picker sees their own mark
    disabled: isLoading,
    isLoading,
    onSelect,
  };
}

// ---------------------------------------------------------------------------
// Presentational view (identical for both variants) + boundary dispatcher.
// ---------------------------------------------------------------------------

function MafiaKillView(state: MafiaKillState) {
  return (
    <>
      {state.canShowButton && (
        <NightActionWrapper isSelected={state.isSelected}>
          <MafiaKillButton
            isSelected={state.isSelected}
            isLoading={state.isLoading}
            disabled={state.disabled}
            onClick={() => {
              state.onSelect();
            }}
          />
        </NightActionWrapper>
      )}
      {state.showIndicator && !state.canShowButton && <MafiaTargetIndicator />}
    </>
  );
}

function SingleAuthorityMafiaKill(props: MafiaKillProps) {
  return <MafiaKillView {...useSingleAuthorityMafiaKill(props)} />;
}

function UnanimousMafiaKill(props: MafiaKillProps) {
  return <MafiaKillView {...useUnanimousMafiaKill(props)} />;
}

export default function MafiaKillControl(props: MafiaKillProps) {
  const { ruleset } = useGameRoom();
  const isMafiaKillPhase = useMemo(
    () => props.isMafiaPhase && props.seatNumber !== null,
    [props.isMafiaPhase, props.seatNumber],
  );
  // Render nothing (and run no selection query/mutation hooks) outside the phase.
  if (!isMafiaKillPhase) return <MafiaKillView {...NOOP_STATE} />;

  return ruleset.mafiaNightModel === "unanimous-vote" ? (
    <UnanimousMafiaKill {...props} />
  ) : (
    <SingleAuthorityMafiaKill {...props} />
  );
}
