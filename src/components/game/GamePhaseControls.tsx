import React from "react";
import { GAME_PHASES, SPEAKING_STATE } from "@/lib/constants/game";
import StartGameButton from "../gameSession/phaseButtonsForHost/StartGameButton";
import StartPickingRolesButton from "../gameSession/phaseButtonsForHost/StartPickingRolesButton";
import ConfirmRolesButton from "../gameSession/phaseButtonsForHost/ConfirmRolesButton";
import EndMafiaMeetButton from "../gameSession/phaseButtonsForHost/EndMafiaMeetButton";
import EndDonChooseRightHandButton from "../gameSession/phaseButtonsForHost/EndDonChooseRightHandButton";
import EndYakuzaShogunMeetButton from "../gameSession/phaseButtonsForHost/EndYakuzaShogunMeetButton";
import EndDetectiveMeetButton from "../gameSession/phaseButtonsForHost/EndDetectiveMeetButton";
import EndDoctorMeetButton from "../gameSession/phaseButtonsForHost/EndDoctorMeetButton";
import StartNightPhaseButton from "../gameSession/phaseButtonsForHost/StartNightPhaseButton";
import StartMafiaTargetButton from "../gameSession/phaseButtonsForHost/StartMafiaTargetButton";
import EndMafiaTargetButton from "../gameSession/phaseButtonsForHost/EndMafiaTargetButton";
import EndDonCheckButton from "../gameSession/phaseButtonsForHost/EndDonCheckButton";
import EndRightHandCheckButton from "../gameSession/phaseButtonsForHost/EndRightHandCheckButton";
import EndYakuzaTargetButton from "../gameSession/phaseButtonsForHost/EndYakuzaTargetButton";
import EndDetectiveCheckButton from "../gameSession/phaseButtonsForHost/EndDetectiveCheckButton";
import EndDoctorHealButton from "../gameSession/phaseButtonsForHost/EndDoctorHealButton";
import FarewellSpeechControls from "../gameSession/phaseButtonsForHost/FarewellSpeechControls";
import VotingPhaseControls from "../gameSession/vote/VotingPhaseControls";
import ContinueNextRoundButton from "../gameSession/phaseButtonsForHost/ContinueNextRoundButton";
import EndGameControls from "../gameSession/phaseButtonsForHost/EndGameControls";
import DayPhaseSpeakingControls from "../gameSession/phaseButtonsForHost/DayPhaseSpeakingControls";
import StartNominatedPlayersSpeakButton from "../gameSession/phaseButtonsForHost/StartNominatedPlayersSpeakButton";
import StartVotingButton from "../gameSession/phaseButtonsForHost/StartVotingButton";
import NominatedPlayersSpeakingControls from "../gameSession/phaseButtonsForHost/NominatedPlayersSpeakingControls";
import StartNextPhaseButton from "../gameSession/phaseButtonsForHost/StartNextPhaseButton";
import NightActionsDisplay from "./NightActionsDisplay";
import PhaseTitle from "../ui/PhaseTitle";
import WinnerBanner from "../host-controls/WinnerBanner";
import { useGameRoom } from "@/lib/context/gameRoomContext";

function isSpeakingComplete(
  currentSpeakerIndex: number | null | undefined,
): boolean {
  return SPEAKING_STATE.isCompleted(currentSpeakerIndex ?? null);
}

/**
 * Component that renders phase title + appropriate action controls for the host.
 */
const GamePhaseControls = () => {
  const { gameSessionState, gameId } = useGameRoom();
  if (!gameSessionState) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2">
        <StartGameButton />
      </div>
    );
  }

  // A faction has been auto-decided: show the win banner. While the game is not
  // finished yet, include the host's "Finish Game" button to confirm the end.
  if (gameSessionState.winner) {
    return (
      <WinnerBanner
        gameId={gameId}
        winner={gameSessionState.winner}
        canFinish={!gameSessionState.isFinished}
      />
    );
  }

  // The game was finished with no decided winner (e.g. an admin force-ended it):
  // show the "No Contest" end state instead of stale live-phase controls.
  if (gameSessionState.isFinished) {
    return <WinnerBanner gameId={gameId} winner={null} />;
  }

  const currentPhase = gameSessionState.gamePhase;

  const renderPhaseControls = () => {
    switch (currentPhase) {
      case GAME_PHASES[0]: // "game_session_started"
        return <StartPickingRolesButton gameSessionState={gameSessionState} />;

      case GAME_PHASES[1]: // "picking_roles"
        return <ConfirmRolesButton gameSessionState={gameSessionState} />;

      case GAME_PHASES[2]: // "mafia_meet"
        return <EndMafiaMeetButton gameSessionState={gameSessionState} />;

      case GAME_PHASES[3]: // "don_chooses_right_hand"
        return (
          <EndDonChooseRightHandButton gameSessionState={gameSessionState} />
        );

      case GAME_PHASES[4]: // "yakuda_shogun_meet"
        return (
          <EndYakuzaShogunMeetButton gameSessionState={gameSessionState} />
        );

      case GAME_PHASES[5]: // "detective_meet"
        return <EndDetectiveMeetButton gameSessionState={gameSessionState} />;

      case GAME_PHASES[6]: // "doctor_meet"
        return <EndDoctorMeetButton gameSessionState={gameSessionState} />;

      case GAME_PHASES[7]: // "introduction_phase"
        if (isSpeakingComplete(gameSessionState.currentSpeakerIndex)) {
          return <StartNightPhaseButton gameSessionState={gameSessionState} />;
        }
        return (
          <DayPhaseSpeakingControls
            gameId={gameId}
            gameSessionState={gameSessionState}
          />
        );

      case GAME_PHASES[8]: // "night_phase"
        return <StartMafiaTargetButton gameSessionState={gameSessionState} />;

      case GAME_PHASES[9]: // "mafia_chooses_target"
        return <EndMafiaTargetButton gameSessionState={gameSessionState} />;

      case GAME_PHASES[10]: // "don_checks_for_detective"
        return <EndDonCheckButton gameSessionState={gameSessionState} />;

      case GAME_PHASES[11]: // "right_hand_checks_for_yakuza"
        return <EndRightHandCheckButton gameSessionState={gameSessionState} />;

      case GAME_PHASES[12]: // "yakuza_and_shogun_chooses_target"
        return <EndYakuzaTargetButton gameSessionState={gameSessionState} />;

      case GAME_PHASES[13]: // "detective_checks_for_mafia"
        return <EndDetectiveCheckButton gameSessionState={gameSessionState} />;

      case GAME_PHASES[14]: // "doctor_heals_player"
        return <EndDoctorHealButton />;

      case GAME_PHASES[15]: // "farewell_speech"
        return <FarewellSpeechControls gameSessionState={gameSessionState} />;

      case GAME_PHASES[16]: // "day_phase"
        if (isSpeakingComplete(gameSessionState.currentSpeakerIndex)) {
          return gameSessionState.withoutSelfJustification ? (
            <StartVotingButton gameSessionState={gameSessionState} />
          ) : (
            <StartNominatedPlayersSpeakButton
              gameSessionState={gameSessionState}
            />
          );
        }
        return (
          <DayPhaseSpeakingControls
            gameId={gameId}
            gameSessionState={gameSessionState}
          />
        );

      case GAME_PHASES[17]: // "nominated_players_speak"
        return (
          <NominatedPlayersSpeakingControls
            gameSessionState={gameSessionState}
          />
        );

      case GAME_PHASES[18]: // "voting"
        return <VotingPhaseControls />;

      case GAME_PHASES[19]: // "repeat"
        return <ContinueNextRoundButton gameSessionState={gameSessionState} />;

      case GAME_PHASES[20]: // "end_game"
        return <EndGameControls />;

      case GAME_PHASES[21]: // "phase_transition" (neutral sleep buffer)
        return <StartNextPhaseButton gameSessionState={gameSessionState} />;

      default:
        return (
          <div className="text-xs text-slate-400">
            Unknown phase: {currentPhase}
          </div>
        );
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center gap-3 justify-between">
      <NightActionsDisplay />
      <PhaseTitle gameSessionState={gameSessionState} isHost />
      {renderPhaseControls()}
    </div>
  );
};

export default GamePhaseControls;
