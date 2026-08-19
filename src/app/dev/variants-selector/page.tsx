"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  VariantBadge,
  VariantCardGroup,
  VariantChips,
  VariantSegmented,
} from "@/shared/ui/variants-selector";
import {
  useGameVariantOptions,
  type GameVariant,
} from "@/shared/hooks/useGameVariantOptions";

const SECTION_LABEL =
  "font-orbitron text-[0.68rem] font-bold tracking-[0.16em] text-zinc-300";
const SECTION_NOTE = "text-[0.74rem] text-zinc-600";

/**
 * Dev-only gallery for the variant selector kit — one primitive, four forms.
 *
 * Visit /dev/variants-selector. Every surface is driven by the same
 * `useGameVariantOptions()` array, which is the point: switching a card here
 * cannot disagree with the badge below it about what a variant looks like.
 *
 * Backed by local state instead of Convex, so this page also doubles as the
 * check that the kit works with no game in hand.
 */
export default function VariantsSelectorDevPage() {
  const t = useTranslations("game");
  const options = useGameVariantOptions();
  const ladderOptions = useGameVariantOptions({ disableUnrated: true });

  const [card, setCard] = useState<GameVariant | null>(
    options[0]?.value ?? null,
  );
  const [row, setRow] = useState<GameVariant | null>(options[0]?.value ?? null);
  const [ladder, setLadder] = useState<GameVariant>(
    ladderOptions.find((option) => !option.disabled)?.value ??
      ladderOptions[0].value,
  );
  const [filter, setFilter] = useState<GameVariant | null>(null);

  return (
    <main className="min-h-screen bg-[#07070d] px-6 py-14 text-zinc-200 sm:px-12">
      <div className="mx-auto grid max-w-5xl gap-13">
        <header className="grid gap-2">
          <h1 className="font-orbitron text-base font-bold uppercase tracking-[0.08em] text-zinc-50">
            Variant Selector — one primitive, four forms
          </h1>
          <p className="max-w-[78ch] text-[0.84rem] leading-relaxed text-zinc-500">
            Each variant owns an accent, a glyph and a seat count, defined once
            in <code className="text-zinc-400">useGameVariantOptions</code>. The
            surfaces differ only in density: cards where the choice is the
            point, segmented where it switches a dataset, chips where it is one
            filter among several, badge where it is read-only.
          </p>
        </header>

        <section className="grid gap-4">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className={SECTION_LABEL}>A · CARDS</span>
            <span className={SECTION_NOTE}>
              CreateGameModal · onboarding · variant landing pages
            </span>
          </div>
          <VariantCardGroup
            options={options}
            value={card}
            onChange={setCard}
            label={t("variantSelector.chooseVariant")}
            className="max-w-[860px]"
          />
          <p className={SECTION_NOTE}>
            selected: <span className="text-zinc-400">{card ?? "none"}</span>
          </p>
        </section>

        <section className="grid gap-4">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className={SECTION_LABEL}>A′ · CARDS, ROW DENSITY</span>
            <span className={SECTION_NOTE}>
              same component, for a form field rather than a whole step
            </span>
          </div>
          <VariantCardGroup
            options={options}
            value={row}
            onChange={setRow}
            density="row"
            label={t("variantSelector.chooseVariant")}
            className="max-w-[420px]"
          />
        </section>

        <section className="grid gap-4">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className={SECTION_LABEL}>B · SEGMENTED</span>
            <span className={SECTION_NOTE}>
              leaderboard hero · StatsHeader · RolePerformanceGrid
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-7">
            <VariantSegmented
              options={ladderOptions}
              value={ladder}
              onChange={setLadder}
              label={t("chooseLadder")}
              className="w-[min(380px,100%)]"
            />
            <VariantSegmented
              options={ladderOptions}
              value={ladder}
              onChange={setLadder}
              size="sm"
              label={t("chooseLadder")}
              className="w-[min(330px,100%)]"
            />
          </div>
          <p className={SECTION_NOTE}>
            The indicator carries the accent and is the only thing that moves.
            An unrated variant renders dimmed and inert rather than absent, so
            the control never changes width.
          </p>
        </section>

        <section className="grid gap-4">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className={SECTION_LABEL}>C · CHIPS</span>
            <span className={SECTION_NOTE}>
              MatchFilters · admin ArchiveList — needs an “all” member
            </span>
          </div>
          <VariantChips
            options={options}
            value={filter}
            onChange={setFilter}
            allLabel={t("variantSelector.allVariants")}
          />
          <VariantChips
            options={options}
            value={filter}
            onChange={setFilter}
            allLabel={t("variantSelector.allVariants")}
            size="sm"
          />
          <p className={SECTION_NOTE}>
            filtering by:{" "}
            <span className="text-zinc-400">{filter ?? "all"}</span> — the dot
            alone carries variant identity at this size.
          </p>
        </section>

        <section className="grid gap-4">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className={SECTION_LABEL}>D · BADGE</span>
            <span className={SECTION_NOTE}>
              read-only — MatchRow · RoomCard · GameRoomHeader · ArchiveRow
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {options.map((option) => (
              <VariantBadge key={option.value} option={option} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {options.map((option) => (
              <VariantBadge key={option.value} option={option} size="sm" />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
