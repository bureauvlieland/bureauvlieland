import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * True zodra de site-footer (element #site-footer) het scherm binnenkomt.
 * Gebruikt om fixed-positioned widgets (chatknop, floating cart-balk) uit de
 * weg te halen zodra de bezoeker onderaan de pagina is — anders blijven ze
 * over de footer heen staan.
 *
 * Herkoppelt de observer bij elke route-wissel: de footer zit in de
 * paginaboom, niet in een blijvende layout, dus het DOM-element wordt bij
 * navigatie opnieuw aangemaakt.
 */
export const useFooterInView = () => {
  const [footerInView, setFooterInView] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setFooterInView(false);
    let observer: IntersectionObserver | null = null;
    let cancelled = false;

    // Footer rendert soms een tick later (lazy-loaded route); kort pollen
    // tot het element bestaat, dan pas observeren. Sommige pagina's (admin,
    // klantportaal) hebben geen footer — na ~1s stoppen we met pollen.
    let attempts = 0;
    const attach = () => {
      if (cancelled) return;
      const footer = document.getElementById("site-footer");
      if (!footer) {
        if (attempts++ < 60) requestAnimationFrame(attach);
        return;
      }
      observer = new IntersectionObserver(
        ([entry]) => setFooterInView(entry.isIntersecting),
        { rootMargin: "0px 0px -1px 0px" },
      );
      observer.observe(footer);
    };
    attach();

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [pathname]);

  return footerInView;
};
