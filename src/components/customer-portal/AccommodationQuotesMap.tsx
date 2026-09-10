import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";
import type { AccommodationQuote } from "@/types/accommodation";
import { presentQuotePartner } from "@/lib/accommodationQuotePresentation";

interface AccommodationQuotesMapProps {
  quotes: AccommodationQuote[];
  formatPrice: (price: number) => string;
}

const VLIELAND_CENTER: [number, number] = [53.2967, 5.0456];

/**
 * Vergelijk offertes op de kaart: een pin per aanbieder met prijs in de
 * popup, en een link die naar de bijbehorende offertekaart springt
 * (`#quote-<id>`, zie AccommodationSection).
 */
export const AccommodationQuotesMap = ({ quotes, formatPrice }: AccommodationQuotesMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletMapRef = useRef<any>(null);

  const withCoords = quotes
    .map((quote) => ({ quote, coordinates: presentQuotePartner(quote).coordinates }))
    .filter((q): q is { quote: AccommodationQuote; coordinates: { lat: number; lng: number } } => !!q.coordinates);
  const withoutCoords = quotes.filter((quote) => !presentQuotePartner(quote).coordinates);

  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (cancelled || !mapRef.current) return;

      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }

      const map = L.map(mapRef.current, {
        center: VLIELAND_CENTER,
        zoom: 13,
        scrollWheelZoom: false,
      });
      leafletMapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      const bounds: [number, number][] = [];

      withCoords.forEach(({ quote, coordinates }) => {
        const popup = `
          <div style="min-width:170px">
            <div style="font-weight:600">${quote.accommodation_name}</div>
            <div style="font-size:13px;color:#0a7c4a;font-weight:600;margin-top:2px">
              ${formatPrice(quote.price_total)}
            </div>
            <a href="#quote-${quote.id}" style="font-size:12px;color:#0066cc;display:inline-block;margin-top:6px">
              Naar deze offerte →
            </a>
          </div>`;
        L.marker([coordinates.lat, coordinates.lng]).addTo(map).bindPopup(popup);
        bounds.push([coordinates.lat, coordinates.lng]);
      });

      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 15);
      }

      requestAnimationFrame(() => map.invalidateSize());
    })();

    return () => {
      cancelled = true;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withCoords.map((q) => q.quote.id).join(","), formatPrice]);

  return (
    <div className="space-y-3">
      <Card className="overflow-hidden">
        <div ref={mapRef} className="w-full h-[50vh] min-h-[320px] bg-muted" />
      </Card>

      {withoutCoords.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="py-3 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Zonder pin op de kaart
            </p>
            {withoutCoords.map((quote) => (
              <div key={quote.id} className="flex items-center justify-between text-sm gap-3">
                <span className="truncate">{quote.accommodation_name}</span>
                <a href={`#quote-${quote.id}`} className="text-xs text-primary hover:underline shrink-0">
                  Naar deze offerte
                </a>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
