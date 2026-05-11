/**
 * Project-origin helper (Fase 5).
 *
 * Achtergrond: `program_type` werd historisch zowel als label (waar komt het
 * project vandaan) als workflow-driver gebruikt. We migreren naar één veld
 * `origin` puur voor classificatie/labeling. Workflow loopt via `quote_status`
 * en de pipeline-helpers, niet meer via type-branching.
 *
 * Tijdens de transitie:
 * - DB-trigger `sync_program_origin_from_type` houdt `origin` synchroon met
 *   `program_type` voor inserts/updates die nog op het oude veld schrijven.
 * - Frontend leest via `getProjectOrigin()` zodat we ongeacht het veld altijd
 *   één bron hebben.
 */

export type ProjectOrigin =
  | "self_service"
  | "quote"
  | "maatwerk_zakelijk"
  | "maatwerk_prive"
  | (string & {}); // future-proof: nieuwe waarden mogen, helpers vallen door op default-takken

export interface ProjectOriginShape {
  origin?: string | null;
  program_type?: string | null;
}

/** Eén bron-of-truth voor "wat voor project is dit?" — leest `origin`, valt terug op `program_type`. */
export function getProjectOrigin(project: ProjectOriginShape | null | undefined): ProjectOrigin {
  if (!project) return "self_service";
  return (project.origin ?? project.program_type ?? "self_service") as ProjectOrigin;
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
