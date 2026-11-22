/**
 * Verzorging bij logies (board_type op accommodation_quotes), in gewoon
 * Nederlands. Spiegelt BOARD_TYPES in src/types/accommodation.ts; houd beide
 * gelijk. Gebruikt in de mails aan klant en partner.
 */
export const BOARD_LABELS: Record<string, string> = {
  room_only: "Logies (alleen overnachting)",
  breakfast: "Logies & ontbijt",
  half_board: "Halfpension",
  full_board: "Volpension",
  all_inclusive: "All-inclusive",
  other: "Anders / in overleg",
};

/**
 * Leesbare verzorging; bij "anders" met de toelichting van de partner erbij.
 * Leeg als er niets is ingevuld (dan toont de mail de regel niet).
 */
export function boardLabel(boardType: string | null | undefined, boardNotes?: string | null): string {
  if (!boardType) return "";
  const label = BOARD_LABELS[boardType] ?? boardType;
  const notes = boardNotes?.trim();
  if (boardType === "other" && notes) return `${label}: ${notes}`;
  return notes ? `${label} (${notes})` : label;
}
