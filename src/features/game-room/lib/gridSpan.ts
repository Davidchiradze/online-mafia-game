import type { CSSProperties } from "react";
import type { GridSpan } from "@/features/game-room/variants/core/types";

/**
 * A ruleset's `GridSpan` as CSS grid-line properties.
 *
 * Ring geometry is data (`ruleset.seatLayout`), so the spans it hands out have
 * to become inline style — a Tailwind class cannot be built from a runtime
 * number, and the two variants' centre regions are different shapes.
 */
export function gridSpanStyle(span: GridSpan): CSSProperties {
  return {
    gridColumnStart: span.colStart,
    gridColumnEnd: span.colEnd,
    gridRowStart: span.rowStart,
    gridRowEnd: span.rowEnd,
  };
}
