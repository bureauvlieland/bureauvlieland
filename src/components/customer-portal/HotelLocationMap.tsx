import { useEffect, useRef, useState } from "react";
import { Navigation, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import "leaflet/dist/leaflet.css";

interface HotelLocationMapProps {
  lat: number;
  lng: number;
  label: string;
  address?: string | null;
}

export const HotelLocationMap = ({ lat, lng, label, address }: HotelLocationMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      LRef.current = L;
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
      }

      const map = L.map(mapRef.current).setView([lat, lng], 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      L.marker([lat, lng])
        .addTo(map)
        .bindPopup(`<strong>${label}</strong>${address ? `<br/>${address}` : ""}`);

      leafletMapRef.current = map;
      setTimeout(() => map.invalidateSize(), 100);
    })();

    return () => {
      cancelled = true;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [lat, lng, label, address]);

  const handleLocate = () => {
    setError(null);
    if (!navigator.geolocation) {
      setError("Locatie wordt niet ondersteund door uw browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        setUserPos([userLat, userLng]);
        setLocating(false);

        const L = LRef.current;
        const map = leafletMapRef.current;
        if (L && map) {
          if (userMarkerRef.current) userMarkerRef.current.remove();
          if (routeLineRef.current) routeLineRef.current.remove();

          userMarkerRef.current = L.circleMarker([userLat, userLng], {
            radius: 8,
            color: "#2563eb",
            fillColor: "#3b82f6",
            fillOpacity: 0.9,
          })
            .addTo(map)
            .bindPopup("Uw locatie");

          routeLineRef.current = L.polyline(
            [
              [userLat, userLng],
              [lat, lng],
            ],
            { color: "#2563eb", weight: 3, dashArray: "6,8", opacity: 0.7 }
          ).addTo(map);

          map.fitBounds(
            L.latLngBounds([
              [userLat, userLng],
              [lat, lng],
            ]),
            { padding: [40, 40] }
          );
        }
      },
      (err) => {
        setLocating(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Geef toegang tot uw locatie om de route te tonen."
            : "Uw locatie kon niet worden bepaald."
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const directionsUrl = userPos
    ? `https://www.google.com/maps/dir/?api=1&origin=${userPos[0]},${userPos[1]}&destination=${lat},${lng}&travelmode=walking`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;

  return (
    <div className="space-y-3">
      <div
        ref={mapRef}
        className="w-full h-64 rounded-lg overflow-hidden border z-0"
        style={{ background: "hsl(var(--muted))" }}
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={handleLocate} disabled={locating}>
          {locating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4 mr-2" />
          )}
          {userPos ? "Locatie bijwerken" : "Toon route vanaf mijn locatie"}
        </Button>
        <a href={directionsUrl} target="_blank" rel="noreferrer">
          <Button size="sm" variant="default">
            <Navigation className="h-4 w-4 mr-2" />
            Open in Google Maps
          </Button>
        </a>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};
