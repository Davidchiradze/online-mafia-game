"use client";

import { useState } from "react";
import { ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  hostPanelHasCollapsedData,
  type HostPanelDescriptor,
} from "@/features/game-room/lib/hostPanel";
import HostPanelEyebrow from "./HostPanelEyebrow";
import HostPanelTitle from "./HostPanelTitle";
import HostPanelDataLine from "./HostPanelDataLine";
import HostPanelActions from "./HostPanelActions";
import HostPanelSheet from "./HostPanelSheet";

type HostPanelBarProps = {
  descriptor: HostPanelDescriptor;
};

/**
 * The dock: one row of identity beside a 44px action and a chevron.
 *
 * Reached when the ring leaves the controls cell under ~118px tall — there is
 * room for the action or for the data, not both, and the action wins. The
 * chevron opens the full panel in a sheet so nothing is actually unreachable.
 */
export default function HostPanelBar({ descriptor }: HostPanelBarProps) {
  const t = useTranslations("game.host");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  // The chevron costs ~36px of a row that is already short on width, so it is
  // only rendered when the sheet would actually show more than the bar does.
  const canExpand = hostPanelHasCollapsedData(descriptor);

  return (
    <>
      <div className="host-panel__bar">
        <div className="flex min-w-0 flex-col gap-0.5">
          <HostPanelEyebrow
            eyebrow={descriptor.eyebrow}
            timer={descriptor.timer}
          />
          <HostPanelTitle
            title={descriptor.title}
            accent={descriptor.titleAccent}
          />
          <HostPanelDataLine descriptor={descriptor} />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <HostPanelActions actions={descriptor.actions} />
          {canExpand && (
            <button
              type="button"
              onClick={() => {
                setIsSheetOpen(true);
              }}
              aria-label={t("expandControls")}
              title={t("expandControls")}
              className="host-panel__disclosure"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {isSheetOpen && (
        <HostPanelSheet
          descriptor={descriptor}
          closeLabel={t("collapseControls")}
          onClose={() => {
            setIsSheetOpen(false);
          }}
        />
      )}
    </>
  );
}
