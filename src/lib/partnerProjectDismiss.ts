/**
 * Guard helpers voor de "Project sluiten"-actie in het partnerportaal.
 * Sluit in één keer alle onderdelen van een project die geen actie meer
 * vragen. Pure functies zodat we ze in Vitest kunnen dekken.
 */

import { canPartnerDismissInvoiceItem, type DismissableItem } from "./partnerInvoiceDismiss";

export interface ProjectDismissItem extends DismissableItem {
  id: string;
  block_name?: string | null;
}

/** Statussen waarbij de partner nog iets moet doen → nooit stilzwijgend sluiten. */
const OPEN_ACTION_STATUSES = new Set(["pending", "alternative", "counter_proposed"]);

export function isProjectItemClosable(item: ProjectDismissItem): boolean {
  if (OPEN_ACTION_STATUSES.has(item.status)) return false;
  return canPartnerDismissInvoiceItem(item);
}

export function selectClosableProjectItems<T extends ProjectDismissItem>(items: T[]): T[] {
  return items.filter(isProjectItemClosable);
}

/**
 * Het project mag als geheel gesloten worden zodra er minstens één sluitbaar
 * onderdeel is en er geen onderdeel meer op actie van de partner wacht.
 */
export function canPartnerCloseProject(items: ProjectDismissItem[]): boolean {
  if (items.length === 0) return false;
  const relevant = items.filter((i) => !i.partner_dismissed_at);
  if (relevant.length === 0) return false;
  if (relevant.some((i) => OPEN_ACTION_STATUSES.has(i.status))) return false;
  return relevant.some((i) => isProjectItemClosable(i));
}
