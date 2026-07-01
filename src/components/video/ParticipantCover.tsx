/**
 * ParticipantCover — full-tile overlay shown instead of video.
 *
 * Driven by a single `state` prop so the parent only needs to
 * map VisibilityState → CoverState without passing emoji strings
 * or multiple booleans.
 *
 * Each visual state is implemented as a separate component
 * under `participant/playerStates/`.
 */

import {
  DeadCover,
  NightCover,
  DimmedCover,
  MaskedCover,
  DisconnectedCover,
} from "@/components/participant/playerStates";

export type CoverState =
  | "sleeping"
  | "dead"
  | "disconnected"
  | "dimmed"
  | "masked";

interface ParticipantCoverProps {
  state: CoverState;
  className?: string;
}

export default function ParticipantCover({
  state,
  className = "",
}: ParticipantCoverProps) {
  switch (state) {
    case "dead":
      return <DeadCover className={className} />;
    case "disconnected":
      return <DisconnectedCover className={className} />;
    case "dimmed":
      return <DimmedCover className={className} />;
    case "masked":
      return <MaskedCover className={className} />;
    case "sleeping":
      return <NightCover className={className} />;
  }
}
