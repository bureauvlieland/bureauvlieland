/**
 * Central Dutch date formatting utilities.
 * All date display formats include the abbreviated day of week (ma, di, wo, do, vr, za, zo).
 */
import { format as fnsFormat, type FormatOptions } from "date-fns";
import { nl } from "date-fns/locale";

/**
 * Format a date in Dutch locale. Convenience wrapper that always uses nl locale.
 */
export function formatNL(date: Date | number, formatStr: string): string {
  return fnsFormat(date, formatStr, { locale: nl });
}

// ── Common format presets ────────────────────────────────────────────
/** "ma 5 jan" */
export const FMT_DAY_SHORT = "EEE d MMM";
/** "ma 5 jan 2025" */
export const FMT_DAY_SHORT_YEAR = "EEE d MMM yyyy";
/** "ma 5 januari" */
export const FMT_DAY_LONG = "EEE d MMMM";
/** "ma 5 januari 2025" */
export const FMT_DAY_LONG_YEAR = "EEE d MMMM yyyy";
/** "ma 5 jan 14:30" */
export const FMT_DAY_SHORT_TIME = "EEE d MMM HH:mm";
/** "ma 5 jan 2025, 14:30" */
export const FMT_DAY_SHORT_YEAR_TIME = "EEE d MMM yyyy, HH:mm";
/** "ma 5 januari 2025, 14:30" */
export const FMT_DAY_LONG_YEAR_TIME = "EEE d MMMM yyyy, HH:mm";
/** "ma 5 januari 2025 om 14:30" */
export const FMT_DAY_LONG_YEAR_OM_TIME = "EEE d MMMM yyyy 'om' HH:mm";
