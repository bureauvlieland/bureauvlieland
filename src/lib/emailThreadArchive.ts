/**
 * Pure helpers voor het archiveren van e-mailgesprekken in het Berichtencentrum.
 *
 * Belangrijk: "Archiveer" in het Berichtencentrum archiveert uitsluitend de
 * berichten (project_communications) van dat gesprek — nooit het hele dossier.
 * Het archiveren van een dossier (program_requests/accommodation_requests) is
 * een aparte, expliciete actie.
 */

export interface ArchivableEmailItem {
  /** id met bronprefix, bijv. "c:<uuid>" (communication) of "l:<uuid>" (email_log) */
  id: string;
  source: "communication" | "email_log";
  archived_at: string | null;
}

/** Verwijdert de bronprefix ("c:" / "l:") van een item-id. */
export function stripSourcePrefix(id: string): string {
  return id.replace(/^[cl]:/, "");
}

/** De project_communications-ids binnen een gesprek (zonder prefix). */
export function communicationIds(items: ArchivableEmailItem[]): string[] {
  return items.filter((i) => i.source === "communication").map((i) => stripSourcePrefix(i.id));
}

/**
 * Een gesprek is gearchiveerd wanneer het minstens één bericht bevat en
 * al die berichten gearchiveerd zijn. Automatische mails uit email_log kunnen
 * niet los gearchiveerd worden en tellen dus niet mee.
 */
export function isThreadArchived(items: ArchivableEmailItem[]): boolean {
  const comms = items.filter((i) => i.source === "communication");
  if (comms.length === 0) return false;
  return comms.every((i) => !!i.archived_at);
}

export interface ThreadArchivePlan {
  /** project_communications-ids die geüpdatet moeten worden */
  ids: string[];
  /** waarde voor archived_at (null = terughalen) */
  archivedAt: string | null;
  /** true wanneer er niets te archiveren valt (alleen automatische mails) */
  noop: boolean;
}

/**
 * Bepaalt welke berichten geüpdatet moeten worden om een gesprek te
 * (de)archiveren. `now` wordt geïnjecteerd zodat dit testbaar is.
 */
export function planThreadArchive(
  items: ArchivableEmailItem[],
  archived: boolean,
  now: Date = new Date(),
): ThreadArchivePlan {
  const all = communicationIds(items);
  const ids = items
    .filter((i) => i.source === "communication" && (archived ? !i.archived_at : !!i.archived_at))
    .map((i) => stripSourcePrefix(i.id));
  return {
    ids,
    archivedAt: archived ? now.toISOString() : null,
    noop: all.length === 0,
  };
}
