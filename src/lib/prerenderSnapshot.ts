/**
 * De geprerenderde HTML (zie scripts/prerender.ts) staat bij het laden al in
 * `#root`. Zodra React rendert, maakt `createRoot` de container leeg; de
 * routes zijn lazy, dus tot het chunk van de pagina binnen is, zou de
 * bezoeker naar een lege pagina kijken (op een trage verbinding ruim een
 * seconde, gezien 28 oktober 2026). Daarom bewaren we de HTML en toont de
 * Suspense-fallback van de routes hem, tot de echte pagina gemount is.
 */
let snapshot: string | null = null;

/** Aanroepen vóór de eerste render: bewaart de geprerenderde inhoud, als die er is. */
export function captureSnapshot(root: HTMLElement): void {
  snapshot = root.firstElementChild ? root.innerHTML : null;
}

export function getSnapshot(): string | null {
  return snapshot;
}

/** Zodra de eerste pagina echt gemount is, is de momentopname niet meer nodig. */
export function clearSnapshot(): void {
  snapshot = null;
}
