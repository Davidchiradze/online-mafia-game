import type { HostPanelNote as HostPanelNoteModel } from "@/features/game-room/lib/hostPanel";

type HostPanelNoteProps = {
  note: HostPanelNoteModel;
};

/**
 * A short highlighted sentence — a foul elimination, a tie-break, a
 * both-leave question. Keeping these out of the status line is what makes
 * panel height predictable: status is always exactly one line, and anything
 * that needs more room or more emphasis becomes this instead.
 */
export default function HostPanelNote({ note }: HostPanelNoteProps) {
  return (
    <div className={`host-panel__note host-panel__note--${note.tone}`}>
      {note.text}
    </div>
  );
}
