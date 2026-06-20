import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Search, X, Crosshair, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";

export type PickedLocation = {
  lat: number;
  lng: number;
  line1: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (loc: PickedLocation) => void;
};

const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629]; // India

async function reverseGeocode(lat: number, lng: number) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) throw new Error("Lookup failed");
  return res.json();
}

async function searchPlace(q: string) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&q=${encodeURIComponent(q)}`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

function toPicked(lat: number, lng: number, j: any): PickedLocation {
  const a = j?.address ?? {};
  const line1 =
    [a.house_number, a.road || a.pedestrian || a.neighbourhood].filter(Boolean).join(" ") ||
    j?.display_name?.split(",").slice(0, 2).join(", ") ||
    "";
  return {
    lat,
    lng,
    line1,
    city: a.city || a.town || a.village || a.suburb || "",
    state: a.state || "",
    postal_code: a.postcode || "",
    country: (a.country_code || "in").toUpperCase(),
  };
}

export function LocationPickerDialog({ open, onClose, onConfirm }: Props) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [permState, setPermState] = useState<"unknown" | "granted" | "denied" | "prompt">("unknown");
  const [address, setAddress] = useState<string>("Drag the pin or search to set delivery location");
  const [picked, setPicked] = useState<PickedLocation | null>(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);

  // Init map
  useEffect(() => {
    if (!open || !mapDivRef.current) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      // Fix marker icon URLs (Leaflet's default points to a path that doesn't exist after bundling)
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (cancelled || !mapDivRef.current) return;
      if (mapRef.current) return;

      const map = L.map(mapDivRef.current, { zoomControl: true }).setView(DEFAULT_CENTER, 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker(DEFAULT_CENTER, { draggable: true }).addTo(map);
      mapRef.current = map;
      markerRef.current = marker;

      const update = async (lat: number, lng: number) => {
        setBusy(true);
        try {
          const j = await reverseGeocode(lat, lng);
          const p = toPicked(lat, lng, j);
          setPicked(p);
          setAddress(j.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } catch {
          setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          setPicked({ lat, lng, line1: "", city: "", state: "", postal_code: "", country: "IN" });
        } finally {
          setBusy(false);
        }
      };

      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        update(lat, lng);
      });
      map.on("click", (e: any) => {
        marker.setLatLng(e.latlng);
        update(e.latlng.lat, e.latlng.lng);
      });

      // Fix sizing inside dialog
      setTimeout(() => map.invalidateSize(), 50);

      // Only check permission state — DO NOT auto-request location.
      // Geolocation must be triggered by a user gesture (Crosshair button).
      try {
        // @ts-ignore
        const status = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
        if (status) {
          setPermState(status.state as any);
          status.onchange = () => setPermState(status.state as any);
        }
      } catch { /* ignore */ }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  // Cleanup when closed
  useEffect(() => {
    if (open) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      markerRef.current = null;
    }
    setPicked(null);
    setAddress("Drag the pin or search to set delivery location");
    setQ("");
    setResults([]);
  }, [open]);

  async function recenterToMe() {
    try {
      // @ts-ignore
      const status = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
      if (status?.state === "denied") {
        setPermState("denied");
        toast.error("Location is blocked. Tap the lock icon in your address bar → Site settings → Location → Allow, then retry.", { duration: 8000 });
        return;
      }
    } catch { /* ignore */ }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapRef.current?.setView([latitude, longitude], 16);
        markerRef.current?.setLatLng([latitude, longitude]);
        markerRef.current?.fire("dragend");
        setPermState("granted");
      },
      (err) => {
        if (err.code === 1) {
          setPermState("denied");
          toast.error("Permission denied. Enable Location for this site in your browser settings.", { duration: 8000 });
        } else {
          toast.error("Couldn't get your location.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    try {
      const r = await searchPlace(q.trim());
      setResults(r);
    } catch {
      toast.error("Search failed");
    }
  }

  function pickResult(r: any) {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    mapRef.current?.setView([lat, lng], 16);
    markerRef.current?.setLatLng([lat, lng]);
    const p = toPicked(lat, lng, r);
    setPicked(p);
    setAddress(r.display_name);
    setResults([]);
    setQ("");
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-2xl h-[90vh] sm:h-[80vh] glass-strong sm:rounded-3xl rounded-t-3xl border border-white/10 flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="size-4 text-cyan shrink-0" />
                <h2 className="font-bold truncate">Pick your delivery location</h2>
              </div>
              <button onClick={onClose} aria-label="Close" className="size-8 rounded-full glass grid place-items-center">
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={runSearch} className="p-3 border-b border-white/10 flex gap-2">
              <div className="flex-1 flex items-center gap-2 glass rounded-xl px-3">
                <Search className="size-4 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search area, street, landmark…"
                  className="flex-1 bg-transparent outline-none text-sm py-2 min-w-0"
                />
              </div>
              <button type="submit" className="px-4 rounded-xl bg-aurora text-background text-xs font-bold">
                Search
              </button>
            </form>

            {results.length > 0 && (
              <div className="max-h-44 overflow-y-auto border-b border-white/10">
                {results.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => pickResult(r)}
                    className="w-full text-left px-4 py-2 hover:bg-white/5 border-b border-white/5 last:border-0"
                  >
                    <p className="text-sm truncate">{r.display_name}</p>
                  </button>
                ))}
              </div>
            )}

            {permState === "denied" && (
              <div className="px-4 py-2 bg-amber-300/10 text-amber-200 text-xs flex items-start gap-2 border-b border-white/10">
                <AlertCircle className="size-4 mt-0.5 shrink-0" />
                <span>
                  Location is blocked for this site. To use GPS, tap the lock icon in your address bar → Site settings → Location → Allow. You can still drag the pin or search manually below.
                </span>
              </div>
            )}

            <div className="relative flex-1">
              <div ref={mapDivRef} className="absolute inset-0" />
              <button
                type="button"
                onClick={recenterToMe}
                aria-label="Use my current location"
                className="absolute bottom-4 right-4 z-[400] size-11 rounded-full bg-background border border-white/20 grid place-items-center shadow-lg hover:bg-white/5"
              >
                <Crosshair className="size-5 text-cyan" />
              </button>
            </div>

            <div className="p-4 border-t border-white/10 space-y-3">
              <div className="flex items-start gap-2">
                <MapPin className="size-4 text-cyan mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Selected location</p>
                  <p className="text-sm break-words">
                    {busy ? <span className="inline-flex items-center gap-1 text-muted-foreground"><Loader2 className="size-3 animate-spin" /> Resolving address…</span> : address}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={!picked || busy}
                onClick={() => picked && onConfirm(picked)}
                className="w-full h-11 rounded-xl bg-aurora animate-aurora text-background font-bold text-sm disabled:opacity-50"
              >
                Confirm location & fill address
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
