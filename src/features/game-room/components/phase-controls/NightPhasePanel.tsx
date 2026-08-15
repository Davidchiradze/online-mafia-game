"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { gameSessions } from "@convex/refs/game";
import { useTranslations } from "next-intl";
import {
  useGameRoom,
  type GameSessionState,
} from "@/features/game-room/context/gameRoomContext";
import { useNightPanelFields } from "@/features/game-room/hooks/game/useNightPanelFields";
import { useNightPhaseReadiness } from "@/features/game-room/hooks/game/useNightPhaseReadiness";
import HostPanel from "@/features/game-room/components/host-panel/HostPanel";
import type {
  HostPanelActionVariant,
  HostPanelDescriptor,
} from "@/features/game-room/lib/hostPanel";

/** Which acting role must have submitted before the host may close the phase. */
export type NightPhaseGate = "mafia" | "yakuza" | "doctor";

type NightPhasePanelProps = {
  gameSessionState: GameSessionState;
  /** The phase being advanced FROM — the destination comes from the ruleset. */
  sourcePhase: string;
  /** `game.host` key for the action once the gate (if any) is open. */
  labelKey: string;
  variant?: HostPanelActionVariant;
  gate?: NightPhaseGate;
  /** `game.host` key shown on the button while the gate is still closed. */
  waitingKey?: string;
};

/**
 * The generic night host panel — one component for every "a role is awake,
 * close the phase when they are done" state in both variants.
 *
 * Identity, countdown, summary pills and status all come from
 * `useNightPanelFields`, so a new night phase needs a map entry and a status
 * table row, not a new component. The destination is always
 * `ruleset.advanceUpdates(sourcePhase)` — never a hardcoded phase — because
 * the same phase name leads somewhere different in each variant.
 *
 * `gate` blocks the advance until the responsible player has actually acted;
 * without it a host can click past a mafia kill that was never recorded.
 */
export default function NightPhasePanel({
  gameSessionState,
  sourcePhase,
  labelKey,
  variant = "danger",
  gate,
  waitingKey,
}: NightPhasePanelProps) {
  const t = useTranslations("game.host");
  const { ruleset } = useGameRoom();
  const [isLoading, setIsLoading] = useState(false);
  const updateSession = useMutation(gameSessions.update);
  const fields = useNightPanelFields(gameSessionState);
  const readiness = useNightPhaseReadiness();

  const isOpen =
    gate === undefined ||
    (gate === "mafia"
      ? readiness.canEndMafiaPhase
      : gate === "yakuza"
        ? readiness.canEndYakuzaPhase
        : readiness.canEndDoctorPhase);

  const handleAdvance = async () => {
    if (isLoading || !isOpen) return;
    setIsLoading(true);
    try {
      await updateSession({
        sessionId: gameSessionState._id,
        updates: ruleset.advanceUpdates(sourcePhase),
      });
    } catch (error) {
      console.error(`Failed to advance from "${sourcePhase}":`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const descriptor: HostPanelDescriptor = {
    ...fields,
    actions: [
      {
        id: `night-${sourcePhase}`,
        label: isOpen || !waitingKey ? t(labelKey) : t(waitingKey),
        variant,
        onClick: () => void handleAdvance(),
        disabled: !isOpen,
        isLoading,
      },
    ],
  };

  return <HostPanel descriptor={descriptor} />;
}
