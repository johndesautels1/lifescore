/**
 * LIFE SCORE - how much paying yearly saves, worked out from the prices shown.
 *
 * John, 4 Oct 2026 ("Save up to 28%"): the pricing pop-up's Annual button said
 * "Save 28%", true only for NAVIGATOR (SOVEREIGN saves 24%). Both pricing
 * screens now print "Save up to N%" from their own price lists, so the label
 * follows any price change.
 */

/** Whole-percent saving of one yearly payment over twelve monthly ones, rounded down so it is never overstated; 0 for a free plan. */
export function annualSavingPercent(monthly: number, annual: number): number {
  if (monthly <= 0) return 0;
  return Math.max(0, Math.floor((1 - annual / (monthly * 12)) * 100));
}

/** The largest saving among the plans. */
export function maxAnnualSavingPercent(plans: ReadonlyArray<{ monthlyPrice: number; annualPrice: number }>): number {
  return Math.max(0, ...plans.map((plan) => annualSavingPercent(plan.monthlyPrice, plan.annualPrice)));
}
