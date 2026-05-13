import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";
import type { ProgramRequestItem } from "@/types/programRequest";

interface ProgramMapProps {
  items: ProgramRequestItem[];
  selectedDates: Date[];
  /** Optionele extra pin voor het logies-adres */
  accommodationLabel?: string;
  accommodationLat?: number | null;
  accommodationLng?: number | null;
  accommodationAddress?: string | null;
}

const VLIELAND_CENTER: [number, number] = [53.2967, 5.0456];

export const ProgramMap = ({
  items,
  selectedDates,
  accommodationLabel,
  accommodationLat,
  accommodationLng,
  accommodationAddress,
}: ProgramMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);

  const pinned = items.filter(
    (i) => i.status !== "cancelled" && i.location_lat && i.location_lng
  );
  const unpinned = items.filter(
    (i) =>
      i.status !== "cancelled" &&
      (!i.location_lat || !i.location_lng) &&
      (i.location_address || i.provider_name)
  );

  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      // Default marker icon fix
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
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

      pinned.forEach((item, idx) => {
        const lat = Number(item.location_lat);
        const lng = Number(item.location_lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        const day = item.day_index >= 0 ? `Dag ${item.day_index + 1}` : "";
        const time =
          item.confirmed_time || item.proposed_time || item.preferred_time || "";
        const popup = `
          <div style="min-width:160px">
            <div style="font-weight:600">${item.block_name}</div>
            <div style="font-size:12px;color:#666">
              ${[day, time].filter(Boolean).join(" · ")}
            </div>
            ${
              item.location_address
                ? `<div style="font-size:12px;margin-top:4px">${item.location_address}</div>`
                : ""
            }
            ${
              item.location_address || (lat && lng)
                ? `<a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" style="font-size:12px;color:#0066cc;display:inline-block;margin-top:6px">Route openen →</a>`
                : ""
            }
          </div>`;
        L.marker([lat, lng]).addTo(map).bindPopup(popup);
        bounds.push([lat, lng]);
      });

      // Accommodation pin
      if (accommodationLat && accommodationLng) {
        const lat = Number(accommodationLat);
        const lng = Number(accommodationLng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          L.marker([lat, lng])
            .addTo(map)
            .bindPopup(
              `<div style="min-width:140px"><b>${
                accommodationLabel || "Logies"
              }</b>${
                accommodationAddress
                  ? `<div style="font-size:12px;color:#666">${accommodationAddress}</div>`
                  : ""
              }</div>`
            );
          bounds.push([lat, lng]);
        }
      }

      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 15);
      }

      // Vlieland-specific zoom safety
      requestAnimationFrame(() => map.invalidateSize());
    })();

    return () => {
      cancelled = true;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [
    pinned.length,
    accommodationLat,
    accommodationLng,
    accommodationLabel,
    accommodationAddress,
  ]);

  return (
    <div className="space-y-3">
      <Card className="overflow-hidden">
        <div ref={mapRef} className="w-full h-[60vh] min-h-[360px] bg-muted" />
      </Card>

      {pinned.length === 0 && (
        <Card className="bg-muted/30">
          <CardContent className="py-4 text-sm text-muted-foreground flex items-start gap-2">
            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Voor de geplande activiteiten zijn nog geen exacte locaties bekend.
              Bekijk de "Praktisch"- of "Programma"-tab voor adresgegevens.
            </span>
          </CardContent>
        </Card>
      )}

      {unpinned.length > 0 && (
        <Card>
          <CardContent className="py-3 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Zonder pin op de kaart
            </p>
            {unpinned.map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between text-sm gap-3"
              >
                <span className="truncate">{i.block_name}</span>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {i.location_address || i.provider_name || "—"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
