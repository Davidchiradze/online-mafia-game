import React from "react";
import { GAME_PHASES } from "@/lib/constants/game";
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
import StartVotingButton from "../gameSession/phaseButtonsForHost/StartVotingButton";
import EndVotingButton from "../gameSession/phaseButtonsForHost/EndVotingButton";
import ContinueNextRoundButton from "../gameSession/phaseButtonsForHost/ContinueNextRoundButton";
import EndGameControls from "../gameSession/phaseButtonsForHost/EndGameControls";
import { useGameRoom } from "@/lib/context/gameRoomContext";

/**
 * Component that renders appropriate action buttons based on the current game phase
 */
const GamePhaseControls = () => {
  const { gameSessionState } = useGameRoom();
  // If no game session exists, show "Start Game" button
  if (!gameSessionState) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <StartGameButton />
      </div>
    );
  }

  const currentPhase = gameSessionState.game_phase;

  // Render buttons based on current phase
  const renderPhaseButton = () => {
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
        return <StartNightPhaseButton gameSessionState={gameSessionState} />;

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
        return <EndDoctorHealButton gameSessionState={gameSessionState} />;

      case GAME_PHASES[15]: // "day_phase"
        return <StartVotingButton gameSessionState={gameSessionState} />;

      case GAME_PHASES[16]: // "voting"
        return <EndVotingButton gameSessionState={gameSessionState} />;

      case GAME_PHASES[17]: // "repeat"
        return <ContinueNextRoundButton gameSessionState={gameSessionState} />;

      case GAME_PHASES[18]: // "end_game"
        return <EndGameControls />;

      default:
        return (
          <div className="text-xs text-gray-300/80">
            Unknown phase: {currentPhase}
          </div>
        );
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      {renderPhaseButton()}
    </div>
  );
};

export default GamePhaseControls;
