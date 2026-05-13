import { useEffect, useMemo, useState } from "react";

/**
 * Event-modus hook.
 *
 * Beslist of de klant zich "tijdens het evenement" bevindt op basis van
 * `selectedDates` (eerste t/m laatste programmadag). Geeft daarnaast een
 * handmatige override-toggle terug zodat de klant het altijd zelf kan
 * aanzetten/uitzetten.
 *
 * - `isEventDay`: true als vandaag binnen het programma valt (lokale datum).
 * - `currentDayIndex`: index in `selectedDates` die overeenkomt met vandaag,
 *    of `null` als vandaag buiten het programma valt.
 * - `eventModeActive`: combinatie van automatische detectie + handmatige toggle.
 * - `manualOverride`: 'on' | 'off' | null (null = automatisch).
 * - `setManualOverride(...)`: zet de override expliciet.
 */
export type EventModeOverride = "on" | "off" | null;

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export function useEventMode(selectedDates: Date[], storageKey?: string) {
  const [today, setToday] = useState<Date>(() => startOfDay(new Date()));
  const [manualOverride, setManualOverrideState] = useState<EventModeOverride>(() => {
    if (typeof window === "undefined" || !storageKey) return null;
    try {
      const v = window.sessionStorage.getItem(storageKey);
      if (v === "on" || v === "off") return v;
    } catch {}
    return null;
  });

  // Refresh "today" elk uur zodat we niet stuck-blijven op de vorige datum.
  useEffect(() => {
    const id = window.setInterval(() => setToday(startOfDay(new Date())), 60 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  const { isEventDay, currentDayIndex, isUpcoming } = useMemo(() => {
    if (!selectedDates?.length) {
      return { isEventDay: false, currentDayIndex: null as number | null, isUpcoming: false };
    }
    const sorted = [...selectedDates].map(startOfDay).sort((a, b) => a.getTime() - b.getTime());
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const t = today.getTime();
    const inRange = t >= first.getTime() && t <= last.getTime();
    const idx = inRange
      ? selectedDates.findIndex((d) => startOfDay(d).getTime() === t)
      : -1;
    return {
      isEventDay: inRange,
      currentDayIndex: idx >= 0 ? idx : inRange ? 0 : null,
      isUpcoming: t < first.getTime(),
    };
  }, [selectedDates, today]);

  const eventModeActive =
    manualOverride === "on" ? true : manualOverride === "off" ? false : isEventDay;

  const setManualOverride = (v: EventModeOverride) => {
    setManualOverrideState(v);
    if (typeof window === "undefined" || !storageKey) return;
    try {
      if (v === null) window.sessionStorage.removeItem(storageKey);
      else window.sessionStorage.setItem(storageKey, v);
    } catch {}
  };

  return {
    isEventDay,
    isUpcoming,
    currentDayIndex,
    eventModeActive,
    manualOverride,
    setManualOverride,
  };
}
