/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CHART COLOR GUIDE  –  one variant per semantic role, used across all 3 tabs
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  Token    │ Hex      │ Meaning / When to use
 *  ─────────┼──────────┼──────────────────────────────────────────────────────
 *  GREEN    │ #10b981  │ Capacity · Available · On-track · Completed  (only green)
 *  RED      │ #f87171  │ Demand · Overloaded · Over-budget · Critical (only red)
 *  ORANGE   │ #f97316  │ At-Risk · Warning · Actual effort variance
 *  BLUE     │ #0ea5e9  │ Normal · Planned · Neutral series            (only blue)
 *  PURPLE   │ #8b5cf6  │ Extra series / surplus / skill gap
 *  AMBER    │ #fbbf24  │ Pending · In-progress · Capacity threshold
 *  PINK     │ #ec4899  │ Additional category
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const CHART_COLORS = {
  GREEN:  "#10b981",  // on-track / available / completed  — SINGLE green variant
  RED:    "#f87171",  // overloaded / critical             — SINGLE red variant
  ORANGE: "#f97316",  // at-risk / actual variance
  BLUE:   "#0ea5e9",  // normal / planned / neutral        — SINGLE blue variant
  PURPLE: "#8b5cf6",  // extra series / surplus
  AMBER:  "#fbbf24",  // pending / capacity threshold
  PINK:   "#ec4899",  // additional category
};

/** Ordered list of colours for charts that need many series. */
export const MULTI_SERIES_PALETTE: string[] = [
  CHART_COLORS.BLUE,
  CHART_COLORS.GREEN,
  CHART_COLORS.ORANGE,
  CHART_COLORS.PURPLE,
  CHART_COLORS.AMBER,
  CHART_COLORS.RED,
  CHART_COLORS.PINK,
];

/** Colours keyed by workload status (used in Workload & Utilization charts). */
export const STATUS_COLOR: Record<string, string> = {
  Overloaded: CHART_COLORS.RED,
  "At Risk":  CHART_COLORS.ORANGE,
  Normal:     CHART_COLORS.BLUE,
  Available:  CHART_COLORS.GREEN,
};