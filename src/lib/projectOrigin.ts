/**
 * Project-origin helper (Fase 5 — cleanup).
 *
 * `origin` is de bron-of-truth voor "wat voor project is dit?". Workflow loopt
 * via `quote_status` en de pipeline-helpers, niet meer via type-branching.
 * De legacy kolom `program_type` is gedropt uit de database.
 */

export type ProjectOrigin =
  | "self_service"
  | "quote"
  | "maatwerk_zakelijk"
  | "maatwerk_prive"
  | (string & {}); // future-proof: nieuwe waarden mogen, helpers vallen door op default-takken

export interface ProjectOriginShape {
  origin?: string | null;
}

/** Eén bron-of-truth voor "wat voor project is dit?". */
export function getProjectOrigin(project: ProjectOriginShape | null | undefined): ProjectOrigin {
  if (!project) return "self_service";
  return (project.origin ?? "self_service") as ProjectOrigin;
}

/** True voor maatwerk_zakelijk en maatwerk_prive. */
export function isMaatwerkProject(project: ProjectOriginShape | null | undefined): boolean {
  return getProjectOrigin(project).startsWith("maatwerk_");
}

/** True voor quote-flow en alle maatwerk-varianten — alles wat via offerte loopt i.p.v. zelf-bedienend. */
export function isQuoteOriginProject(project: ProjectOriginShape | null | undefined): boolean {
  const origin = getProjectOrigin(project);
  return origin === "quote" || origin.startsWith("maatwerk_");
}

/** Korte labels voor badges/admin-overzichten. */
export const PROJECT_ORIGIN_LABELS: Record<string, string> = {
  self_service: "Self-service",
  quote: "Offerte",
  maatwerk_zakelijk: "Maatwerk zakelijk",
  maatwerk_prive: "Maatwerk privé",
};

export function getProjectOriginLabel(project: ProjectOriginShape | null | undefined): string {
  const origin = getProjectOrigin(project);
  return PROJECT_ORIGIN_LABELS[origin] ?? origin;
}
