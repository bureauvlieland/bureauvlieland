import { useEffect, useRef } from "react";
import { ExternalLink, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import "leaflet/dist/leaflet.css";

interface PartnerLocationMapProps {
  lat: number | null;
  lng: number | null;
  label: string;
  address?: string | null;
  isVisible: boolean;
}

export const PartnerLocationMap = ({ lat, lng, label, address, isVisible }: PartnerLocationMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const hasCoords = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
  const directionsTarget = hasCoords ? `${lat},${lng}` : address ?? label;
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(directionsTarget)}`;

  useEffect(() => {
    if (!isVisible || !mapRef.current || !hasCoords) return;
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
      if (leafletMapRef.current) leafletMapRef.current.remove();

      const point: [number, number] = [Number(lat), Number(lng)];
      const map = L.map(mapRef.current, { scrollWheelZoom: false }).setView(point, 16);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);
      L.marker(point)
        .addTo(map)
        .bindPopup(`<strong>${label}</strong>${address ? `<br/>${address}` : ""}`);

      leafletMapRef.current = map;
      setTimeout(() => map.invalidateSize(), 150);
    })();

    return () => {
      cancelled = true;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [address, hasCoords, isVisible, label, lat, lng]);

  if (!address && !hasCoords) return null;

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <div className="flex items-start gap-2">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Locatie</p>
          <p className="font-medium text-foreground break-words">{address ?? label}</p>
        </div>
      </div>
      {hasCoords && (
        <div
          ref={mapRef}
          className="h-56 w-full overflow-hidden rounded-md border bg-muted"
          aria-label={`Kaart van ${address ?? label}`}
        />
      )}
      <a href={directionsUrl} target="_blank" rel="noreferrer" className="inline-flex">
        <Button type="button" size="sm" variant="outline">
          <ExternalLink className="mr-2 h-4 w-4" />
          Open kaart
        </Button>
      </a>
    </div>
  );
};