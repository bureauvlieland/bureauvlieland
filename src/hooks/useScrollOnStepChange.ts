import { useEffect, useRef, type RefObject } from "react";

/**
 * Scrollt bij elke stapwissel van een wizard naar het element (meestal de
 * `StepperBar`), niet bij de eerste weergave. De volgende-knop staat
 * onderaan de vorige stap; zonder dit begint de nieuwe stap halverwege het
 * scherm. Respecteert `prefers-reduced-motion`.
 */
export const useScrollOnStepChange = (ref: RefObject<HTMLElement>, step: string) => {
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (last.current === null) {
      last.current = step;
      return;
    }
    if (last.current === step) return;
    last.current = step;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    ref.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [ref, step]);
};
