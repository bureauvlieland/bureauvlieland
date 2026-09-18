/**
 * Welk oppervlak een route is: `portal` (admin, partnerportaal) of `public`
 * (site en klantportaal). De actiekleur van knoppen volgt dit via
 * `data-surface` op het html-element (index.css, SurfaceTheme).
 */
export type Surface = "public" | "portal";

export const isPortalPath = (pathname: string): boolean =>
  pathname === "/admin" ||
  pathname.startsWith("/admin/") ||
  pathname === "/partner" ||
  pathname.startsWith("/partner/");

export const surfaceFor = (pathname: string): Surface => (isPortalPath(pathname) ? "portal" : "public");
