import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MapPin, Search, X } from "lucide-react";
import "leaflet/dist/leaflet.css";

const VLIELAND_CENTER: [number, number] = [53.2967, 5.0456];
const DEFAULT_ZOOM = 15;

interface LocationPickerProps {
  lat: number | null;
  lng: number | null;
  address: string;
  onChange: (lat: number | null, lng: number | null, address: string) => void;
}

export const LocationPicker = ({ lat, lng, address, onChange }: LocationPickerProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [_mapReady, setMapReady] = useState(false);

  // Always-current refs so map click handler doesn't capture stale closures
  const addressRef = useRef(address);
  const onChangeRef = useRef(onChange);
  useEffect(() => { addressRef.current = address; }, [address]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // Initialize map
  useEffect(() => {
    let mounted = true;

    const initMap = async () => {
      const L = (await import("leaflet")).default;

      if (!mapRef.current || leafletMapRef.current) return;

      // Fix default marker icon
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const center: [number, number] = lat && lng ? [lat, lng] : VLIELAND_CENTER;
      const map = L.map(mapRef.current).setView(center, DEFAULT_ZOOM);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Add existing marker if coordinates exist
      if (lat && lng) {
        markerRef.current = L.marker([lat, lng]).addTo(map);
      }

      // Click to place marker — use refs to avoid stale closure
      map.on("click", (e: any) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;

        if (markerRef.current) {
          markerRef.current.setLatLng([clickLat, clickLng]);
        } else {
          markerRef.current = L.marker([clickLat, clickLng]).addTo(map);
        }

        onChangeRef.current(
          Math.round(clickLat * 1000000) / 1000000,
          Math.round(clickLng * 1000000) / 1000000,
          addressRef.current
        );
      });

      leafletMapRef.current = map;
      if (mounted) setMapReady(true);
    };

    initMap();

    return () => {
      mounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        markerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Sync map view and marker when lat/lng props change (e.g. opening a different item)
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    const sync = async () => {
      const L = (await import("leaflet")).default;
      if (!leafletMapRef.current) return;

      const hasCoords = lat != null && lng != null;

      // Force Leaflet to recalculate container size (critical inside sheets/modals)
      map.invalidateSize();
      setTimeout(() => {
        map.invalidateSize();
        if (hasCoords) {
          map.setView([lat!, lng!], DEFAULT_ZOOM);
          if (markerRef.current) {
            markerRef.current.setLatLng([lat!, lng!]);
          } else {
            markerRef.current = L.marker([lat!, lng!]).addTo(map);
          }
        } else {
          if (markerRef.current) {
            map.removeLayer(markerRef.current);
            markerRef.current = null;
          }
          map.setView(VLIELAND_CENTER, DEFAULT_ZOOM);
        }
      }, 0);
    };

    requestAnimationFrame(sync);
  }, [lat, lng]);

  // Search via Nominatim
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + " Vlieland")}&limit=1`
      );
      const results = await res.json();

      if (results.length > 0) {
        const { lat: sLat, lon: sLng, display_name } = results[0];
        const parsedLat = parseFloat(sLat);
        const parsedLng = parseFloat(sLng);

        if (leafletMapRef.current) {
          const L = (await import("leaflet")).default;
          leafletMapRef.current.setView([parsedLat, parsedLng], 17);

          if (markerRef.current) {
            markerRef.current.setLatLng([parsedLat, parsedLng]);
          } else {
            markerRef.current = L.marker([parsedLat, parsedLng]).addTo(leafletMapRef.current);
          }
        }

        onChange(parsedLat, parsedLng, display_name.split(",").slice(0, 3).join(",").trim());
      }
    } catch {
      // silently fail
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, onChange]);

  const handleClear = () => {
    if (markerRef.current && leafletMapRef.current) {
      leafletMapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    onChange(null, null, "");
  };

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="flex gap-2">
        <Input
          placeholder="Zoek adres op Vlieland..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
        />
        <Button type="button" variant="outline" size="icon" onClick={handleSearch} disabled={isSearching}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Map */}
      <div
        ref={mapRef}
        className="h-[250px] rounded-lg border overflow-hidden"
        style={{ zIndex: 0 }}
      />

      {/* Address field */}
      <div>
        <Label className="text-sm">Adres</Label>
        <div className="flex gap-2 mt-1">
          <div className="relative flex-1">
            <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={address}
              onChange={(e) => onChange(lat, lng, e.target.value)}
              placeholder="Dorpsstraat 99, Vlieland"
              className="pl-8"
            />
          </div>
          {(lat || address) && (
            <Button type="button" variant="ghost" size="icon" onClick={handleClear}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Coordinates display */}
      {lat && lng && (
        <p className="text-xs text-muted-foreground">
          Coördinaten: {lat}, {lng}
        </p>
      )}
    </div>
  );
};
