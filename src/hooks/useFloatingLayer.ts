import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";
import { useFooterInView } from "@/hooks/useFooterInView";

/**
 * De zwevende laag (ontwerpsysteem fase 2 deel 3): één plek voor wat er
 * rechtsonder zweeft (chatknop, programma-knop) en hoe dat zich verhoudt
 * tot de rest van de pagina.
 *
 * - `useFloatingBar(ref, active)`: een vaste balk onderaan (zoals in de
 *   programma-bouwer) meldt zijn hoogte via `--floating-offset` op <html>,
 *   zodat de zwevende knoppen erboven blijven en `.pb-floating` er
 *   ruimte voor houdt.
 * - `useFloatingClearance(ref)`: een element dat de zwevende knoppen nooit
 *   mogen bedekken (de knoppenrij van een wizardstap) meldt wanneer het in
 *   beeld is; de knoppen wijken dan.
 * - `useFloatingHidden()`: true als de knoppen moeten wijken (footer of een
 *   gemeld element in beeld).
 */
const clearing = new Set<Element>();
const listeners = new Set<() => void>();
let version = 0;

const notify = () => {
  version += 1;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => version;

export const useFloatingClearance = (ref: RefObject<Element>, active = true) => {
  useEffect(() => {
    const el = ref.current;
    if (!el || !active || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) clearing.add(el);
        else clearing.delete(el);
        notify();
      },
      { rootMargin: "0px 0px -8px 0px" },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (clearing.delete(el)) notify();
    };
  }, [ref, active]);
};

export const useFloatingHidden = (): boolean => {
  const footerInView = useFooterInView();
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return footerInView || clearing.size > 0;
};

export const useFloatingBar = (ref: RefObject<HTMLElement>, active = true) => {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || !active) {
      setHeight(0);
      return;
    }
    // Altijd de gemeten hoogte zetten; React slaat een gelijke waarde over.
    // (Een eigen cache hier liet de balk na footer-in-beeld op 0 staan.)
    const measure = () => setHeight(Math.round(el.getBoundingClientRect().height));
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, active]);

  useEffect(() => {
    const root = document.documentElement;
    if (height > 0) root.style.setProperty("--floating-offset", `${height}px`);
    else root.style.removeProperty("--floating-offset");
    return () => {
      root.style.removeProperty("--floating-offset");
    };
  }, [height]);
};
