import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { surfaceFor } from "@/lib/surface";

/**
 * Zet `data-surface` op het html-element: `public` voor de site en het
 * klantportaal, `portal` voor admin en partners. De actiekleur van knoppen
 * volgt dit (index.css): publiek zonsondergang-oranje (besluit 1, 18
 * september 2026), portalen oceaanblauw zodat die niet ongevraagd van
 * kleur veranderen.
 */
export const SurfaceTheme = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    document.documentElement.dataset.surface = surfaceFor(pathname);
  }, [pathname]);
  return null;
};
