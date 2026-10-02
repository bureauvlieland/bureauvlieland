import { useEffect, useRef, useState, type RefObject } from "react";

/** De dagkop staat na een klik 144px (scroll-mt-36) onder de bovenrand; daaronder telt een dag als "in beeld". */
const SCROLL_LINE = 150;

/**
 * Welke dag van de doorlopende tijdlijn in beeld is, voor de dagbalk: de
 * laatste dagkop (`[data-day-section]` in `timelineRef`) boven de lijn.
 * Klikken in de dagbalk scrolt naar de dag; tijdens het verblijf opent de
 * tijdlijn één keer bij vandaag.
 */
export const useActiveDay = (
  timelineRef: RefObject<HTMLElement>,
  dayCount: number,
  todayIndex: number | null,
  enabled: boolean,
) => {
  const [activeDayIndex, setActiveDayIndex] = useState(() => (todayIndex != null && todayIndex > 0 ? todayIndex : 0));

  useEffect(() => {
    if (!enabled || dayCount <= 1) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const sections = timelineRef.current?.querySelectorAll<HTMLElement>("[data-day-section]");
      if (!sections?.length) return;
      let current = 0;
      sections.forEach((el) => {
        if (el.getBoundingClientRect().top <= SCROLL_LINE) current = Number(el.dataset.daySection);
      });
      setActiveDayIndex(current);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [enabled, dayCount, timelineRef]);

  const openedAtToday = useRef(false);
  useEffect(() => {
    if (!enabled || openedAtToday.current || todayIndex == null || todayIndex <= 0 || dayCount <= 1) return;
    openedAtToday.current = true;
    document.getElementById(`dag-${todayIndex}`)?.scrollIntoView({ block: "start" });
    setActiveDayIndex(todayIndex);
  }, [enabled, todayIndex, dayCount]);

  const scrollToDay = (index: number) => {
    setActiveDayIndex(index);
    document.getElementById(`dag-${index}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return { activeDayIndex, scrollToDay };
};
