"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Modal from "@/components/ui/Modal";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (withoutSelfJustification: boolean) => void;
  isLoading: boolean;
};

/**
 * Asks the host, at game start, whether nominated players get a 30s
 * self-justification phase before voting.
 * The selection value IS `withoutSelfJustification`:
 *  - false (default, pre-selected) → normal game with self-justification.
 *  - true → skip nominated_players_speak and go straight to voting.
 */
export default function StartGameModal({
  open,
  onClose,
  onConfirm,
  isLoading,
}: Props) {
  const t = useTranslations("game.host");
  const tCommon = useTranslations("common");
  const [withoutSelfJustification, setWithoutSelfJustification] =
    useState(false);

  const options: {
    value: boolean;
    label: string;
    hint: string;
  }[] = [
    {
      value: false,
      label: t("withSelfJustification"),
      hint: t("withSelfJustificationHint"),
    },
    {
      value: true,
      label: t("withoutSelfJustification"),
      hint: t("withoutSelfJustificationHint"),
    },
  ];

  return (
    <Modal
      open={open}
      onClose={() => !isLoading && onClose()}
      title={t("startGameTitle")}
      variant="dark"
      size="md"
      footer={
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            disabled={isLoading}
            className="px-4 py-2 text-gray-300 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {tCommon("cancel")}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConfirm(withoutSelfJustification);
            }}
            disabled={isLoading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {t("start")}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-300">{t("selfJustificationQuestion")}</p>
        <div className="space-y-2">
          {options.map((opt) => {
            const selected = withoutSelfJustification === opt.value;
            return (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => setWithoutSelfJustification(opt.value)}
                disabled={isLoading}
                className={`w-full flex items-start gap-3 rounded-xl border p-3 text-left transition-colors cursor-pointer disabled:cursor-not-allowed ${
                  selected
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    selected ? "border-emerald-400" : "border-white/30"
                  }`}
                >
                  {selected ? (
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  ) : null}
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-semibold text-white">
                    {opt.label}
                  </span>
                  <span className="text-xs text-gray-400">{opt.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
