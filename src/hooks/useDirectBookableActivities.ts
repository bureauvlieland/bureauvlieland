/**
 * Bundelt de live MAP-activiteiten van de komende 90 dagen per activiteitstype
 * + partner, zodat de bouwstenen-catalogus kan tonen wat direct boekbaar is.
 */
import { useMemo } from "react";
import { format, addDays } from "date-fns";
import { useAllMapActivities, type MapActivity } from "@/hooks/useMapActivities";
import type { BookableBundle } from "@/lib/directBookable";

const WINDOW_DAYS = 90;

type Enriched = MapActivity & {
  _partnerId?: string;
  _partnerName?: string;
  _partnerSlug?: string;
  _image?: string | null;
};

export const useDirectBookableActivities = (enabled = true) => {
  const today = format(new Date(), "yyyy-MM-dd");
  const until = format(addDays(new Date(), WINDOW_DAYS), "yyyy-MM-dd");

  const { data, isLoading, isError } = useAllMapActivities(today, until, enabled);

  const bundles = useMemo<BookableBundle[]>(() => {
    if (!data) return [];
    const now = Date.now();
    // ActivityTypeId is alleen uniek per MAP-tenant, dus altijd groeperen op
    // activiteit + partner om te voorkomen dat partners door elkaar lopen.
    const map = new Map<string, BookableBundle>();

    for (const raw of data as Enriched[]) {
      const departure = new Date(raw.Departure).getTime();
      if (isNaN(departure) || departure <= now) continue;
      if (raw.IsCancelled || raw.IsActive === false) continue;

      const groupKey = `${raw.ActivityTypeId}::${raw._partnerId ?? raw._partnerSlug ?? "unknown"}`;
      const existing = map.get(groupKey);
      if (existing) {
        existing.totalSlotsLeft += Math.max(0, raw.RemainingSlots ?? 0);
        existing.momentCount += 1;
        if (new Date(raw.Departure) < new Date(existing.nextDeparture)) {
          existing.nextDeparture = raw.Departure;
        }
      } else {
        map.set(groupKey, {
          activityTypeId: raw.ActivityTypeId,
          partnerId: raw._partnerId ?? null,
          partnerName: raw._partnerName ?? null,
          partnerSlug: raw._partnerSlug ?? null,
          name: raw.ActivityTypeName,
          description: raw.Description ?? null,
          image: raw._image ?? null,
          pricePerPerson: raw.PricePerPerson ?? null,
          nextDeparture: raw.Departure,
          totalSlotsLeft: Math.max(0, raw.RemainingSlots ?? 0),
          momentCount: 1,
        });
      }
    }

    return Array.from(map.values())
      .filter((b) => b.totalSlotsLeft > 0)
      .sort((a, b) => a.nextDeparture.localeCompare(b.nextDeparture));
  }, [data]);

  return { bundles, isLoading, isError };
};
