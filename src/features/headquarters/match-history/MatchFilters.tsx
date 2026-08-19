"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import VariantChips from "@/shared/ui/variants-selector/VariantChips";
import type { VariantOption } from "@/shared/ui/variants-selector";

export type OutcomeFilter = "all" | "win" | "loss" | "no_contest";

interface Props {
  outcome: OutcomeFilter;
  onOutcomeChange: (v: OutcomeFilter) => void;
}

/**
 * Outcome filter for the match list — form C of the variant selector kit.
 *
 * Mode is deliberately NOT here. It moved to the one centred switcher in
 * `StatsHeader`, which scopes the stats and this list together; a second mode
 * control at this altitude was the same question asked twice, and the two could
 * disagree. So this row narrows WITHIN the selected mode and sits right-aligned
 * above the table, out of the hero's way.
 *
 * The `"all"` sentinel stays in the exported type because `MatchHistoryList`
 * passes it straight to the query. The kit models "no filter" as `null`, so the
 * two are mapped at this boundary only.
 */
export default function MatchFilters({ outcome, onOutcomeChange }: Props) {
  const t = useTranslations("matchHistory");

  // Borrows the accents the rows below already use — emerald win, red loss — so
  // the filter and the result it produces are the same colour.
  const outcomeOptions = useMemo<
    VariantOption<Exclude<OutcomeFilter, "all">>[]
  >(
    () => [
      { value: "win", label: t("filterVictories"), accent: "emerald" },
      { value: "loss", label: t("filterDefeats"), accent: "red" },
      { value: "no_contest", label: t("filterNoContest"), accent: "neutral" },
    ],
    [t],
  );

  return (
    <div className="mb-4 flex justify-end">
      <VariantChips
        options={outcomeOptions}
        value={outcome === "all" ? null : outcome}
        onChange={(value) => onOutcomeChange(value ?? "all")}
        allLabel={t("filterAllOutcomes")}
        size="sm"
        className="justify-end"
      />
    </div>
  );
}
