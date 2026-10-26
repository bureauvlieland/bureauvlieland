/**
 * Eén manier om de chat te openen vanuit een gewone link of knop op de site
 * ("Stel uw vraag via de chat"). De widget luistert naar dit event; zo hoeft
 * geen enkele pagina de staat van de widget te kennen.
 */
export const OPEN_CHAT_EVENT = "bv:open-chat";

export function openPreSalesChat(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT));
}
