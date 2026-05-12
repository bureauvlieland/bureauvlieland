import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MapPin, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import "leaflet/dist/leaflet.css";

const VLIELAND_CENTER: [number, number] = [53.2967, 5.0456];
const DEFAULT_ZOOM = 15;

interface KnownLocation {
  label: string;
  address: string;
  lat: number;
  lng: number;
  source: "partner" | "bouwsteen";
}

/**
 * Compose a clean Dutch-style address from a Nominatim addressdetails object:
 *   "Dorpsstraat 88, Vlieland"
 * Falls back to a sensible truncation of display_name when details are missing.
 */
function formatAddress(data: any): string {
  const a = data?.address ?? {};
  const street = a.road || a.pedestrian || a.footway || a.path || a.cycleway || "";
  const nr = a.house_number || "";
  const place =
    a.village || a.town || a.city || a.hamlet || a.suburb || a.municipality || "";
  const line1 = [street, nr].filter(Boolean).join(" ").trim();
  const parts = [line1, place].filter(Boolean);
  if (parts.length) return parts.join(", ");
  if (data?.display_name) {
    return String(data.display_name).split(",").slice(0, 2).join(", ").trim();
  }
  return "";
}

interface LocationPickerProps {
  lat: number | null;
  lng: number | null;
  address: string;
  onChange: (lat: number | null, lng: number | null, address: string) => void;
  /** Tailwind height class for the map container, e.g. "h-[250px]" or "h-[600px]" */
  mapHeightClass?: string;
}

export const LocationPicker = ({ lat, lng, address, onChange, mapHeightClass = "h-[250px]" }: LocationPickerProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [_mapReady, setMapReady] = useState(false);
  const [known, setKnown] = useState<KnownLocation[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);

  // Load known addresses from existing partners + bouwstenen so users can pick instead of retyping
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [partnersRes, blocksRes] = await Promise.all([
        supabase
          .from("partners")
          .select("name, address_street, address_postal, address_city, location_lat, location_lng")
          .not("location_lat", "is", null)
          .not("location_lng", "is", null),
        supabase
          .from("building_blocks")
          .select("name, location_address, location_lat, location_lng")
          .not("location_lat", "is", null)
          .not("location_lng", "is", null),
      ]);
      if (cancelled) return;
      const list: KnownLocation[] = [];
      const seen = new Set<string>();
      for (const p of (partnersRes.data || []) as any[]) {
        const key = `${p.location_lat},${p.location_lng}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const addr = [p.address_street, [p.address_postal, p.address_city].filter(Boolean).join(" ")]
          .filter(Boolean).join(", ");
        list.push({
          label: p.name,
          address: addr,
          lat: Number(p.location_lat),
          lng: Number(p.location_lng),
          source: "partner",
        });
      }
      for (const b of (blocksRes.data || []) as any[]) {
        const key = `${b.location_lat},${b.location_lng}`;
        if (seen.has(key)) continue;
        seen.add(key);
        list.push({
          label: b.name,
          address: b.location_address || "",
          lat: Number(b.location_lat),
          lng: Number(b.location_lng),
          source: "bouwsteen",
        });
      }
      setKnown(list);
    })();
    return () => { cancelled = true; };
  }, []);

  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return known
      .filter(k =>
        k.label.toLowerCase().includes(q) ||
        k.address.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [searchQuery, known]);

  const pickKnown = useCallback(async (k: KnownLocation) => {
    setShowSuggest(false);
    setSearchQuery("");
    if (leafletMapRef.current) {
      const L = (await import("leaflet")).default;
      leafletMapRef.current.setView([k.lat, k.lng], 17);
      if (markerRef.current) {
        markerRef.current.setLatLng([k.lat, k.lng]);
      } else {
        markerRef.current = L.marker([k.lat, k.lng]).addTo(leafletMapRef.current);
      }
    }
    onChange(k.lat, k.lng, k.address || k.label);
  }, [onChange]);

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

        // Center map on click point so marker is always visible
        map.panTo([clickLat, clickLng]);

        // Geocode to get address
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${clickLat}&lon=${clickLng}&zoom=18&addressdetails=1`)
          .then(res => res.json())
          .then(data => {
            const addr = formatAddress(data) || `${clickLat.toFixed(6)}, ${clickLng.toFixed(6)}`;
            onChangeRef.current(
              Math.round(clickLat * 1000000) / 1000000,
              Math.round(clickLng * 1000000) / 1000000,
              addr
            );
          })
          .catch(() => {
            // Fallback to coordinates if geocoding fails
            onChangeRef.current(
              Math.round(clickLat * 1000000) / 1000000,
              Math.round(clickLng * 1000000) / 1000000,
              `${clickLat.toFixed(6)}, ${clickLng.toFixed(6)}`
            );
          });
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
          // Ensure marker exists and is positioned correctly
          if (markerRef.current) {
            markerRef.current.setLatLng([lat!, lng!]);
          } else {
            markerRef.current = L.marker([lat!, lng!]).addTo(map);
          }
          // Only recenter when the marker isn't already visible in the current view
          // (avoids resetting zoom after every map click)
          const bounds = map.getBounds();
          if (!bounds.contains([lat!, lng!])) {
            map.setView([lat!, lng!], DEFAULT_ZOOM);
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

  // Geocode an arbitrary address string and place marker
  const geocodeAndPlace = useCallback(async (query: string, keepAddress = false) => {
    if (!query.trim()) return false;
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=nl&q=${encodeURIComponent(query)}&limit=1`
      );
      const results = await res.json();
      if (results.length > 0) {
        const hit = results[0];
        const parsedLat = parseFloat(hit.lat);
        const parsedLng = parseFloat(hit.lon);
        if (leafletMapRef.current) {
          const L = (await import("leaflet")).default;
          leafletMapRef.current.setView([parsedLat, parsedLng], 17);
          if (markerRef.current) {
            markerRef.current.setLatLng([parsedLat, parsedLng]);
          } else {
            markerRef.current = L.marker([parsedLat, parsedLng]).addTo(leafletMapRef.current);
          }
        }
        const newAddr = keepAddress ? query : (formatAddress(hit) || query);
        onChangeRef.current(parsedLat, parsedLng, newAddr);
        return true;
      }
    } catch {
      // ignore
    } finally {
      setIsSearching(false);
    }
    return false;
  }, []);

  const handleSearch = useCallback(() => {
    geocodeAndPlace(searchQuery);
  }, [searchQuery, geocodeAndPlace]);

  // Auto-geocode current address on mount if we have an address but no coords
  const autoTriedRef = useRef<string | null>(null);
  useEffect(() => {
    const key = `${address}`;
    if (autoTriedRef.current === key) return;
    if (address && address.trim() && (lat == null || lng == null) && leafletMapRef.current) {
      autoTriedRef.current = key;
      geocodeAndPlace(address, true);
    }
  }, [address, lat, lng, geocodeAndPlace]);

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
      <div className="flex gap-2 relative">
        <div className="flex-1 relative">
          <Input
            placeholder="Zoek adres of bestaande locatie..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowSuggest(true); }}
            onFocus={() => setShowSuggest(true)}
            onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
          />
          {showSuggest && suggestions.length > 0 && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-64 overflow-y-auto">
              {suggestions.map((k, i) => (
                <button
                  key={`${k.lat},${k.lng},${i}`}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-start gap-2"
                  onMouseDown={(e) => { e.preventDefault(); pickKnown(k); }}
                >
                  <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{k.label}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {k.address || `${k.lat.toFixed(5)}, ${k.lng.toFixed(5)}`} · {k.source}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <Button type="button" variant="outline" size="icon" onClick={handleSearch} disabled={isSearching}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Map */}
      <div
        ref={mapRef}
        className={`${mapHeightClass} rounded-lg border overflow-hidden`}
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => geocodeAndPlace(address, true)}
            disabled={!address.trim() || isSearching}
            title="Plaats marker op basis van dit adres"
          >
            <Search className="h-4 w-4 mr-1" /> Plaats op adres
          </Button>
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
