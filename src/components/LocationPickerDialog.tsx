import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629];

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
  const updateLocationRef = useRef<((lat: number, lng: number) => Promise<void>) | null>(null);
  const [permState, setPermState] = useState<"unknown" | "granted" | "denied" | "prompt">("unknown");
  const [secureState, setSecureState] = useState<"unknown" | "secure" | "insecure">("unknown");
  const [locationMessage, setLocationMessage] = useState("Tap 'Use my current location' to allow GPS access");
  const [address, setAddress] = useState<string>("Drag the pin or search to set delivery location");
  const [picked, setPicked] = useState<PickedLocation | null>(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Init map
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setSecureState(window.isSecureContext ? "secure" : "insecure");
    navigator.permissions?.query({ name: "geolocation" as PermissionName }).then((status) => {
      if (cancelled) return;
      console.log("[geolocation] permission state", status.state);
      setPermState(status.state as any);
      status.onchange = () => {
        console.log("[geolocation] permission changed", status.state);
        setPermState(status.state as any);
      };
    }).catch(() => undefined);

    (async () => {
      const L = (await import("leaflet")).default;
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // Wait for the map div to actually mount in the portal
      let tries = 0;
      while (!mapDivRef.current && tries < 50) {
        await new Promise((r) => setTimeout(r, 20));
        tries++;
      }
      if (cancelled || !mapDivRef.current || mapRef.current) return;

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
      updateLocationRef.current = update;

      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        update(lat, lng);
      });
      map.on("click", (e: any) => {
        marker.setLatLng(e.latlng);
        update(e.latlng.lat, e.latlng.lng);
      });

      setTimeout(() => map.invalidateSize(), 80);
      setTimeout(() => map.invalidateSize(), 300);
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        updateLocationRef.current = null;
      }
      setPicked(null);
      setAddress("Drag the pin or search to set delivery location");
      setLocationMessage("Tap 'Use my current location' to allow GPS access");
      setQ("");
      setResults([]);
    };
  }, [open]);

  function recenterToMe() {
    console.log("GPS CLICKED", { mapReady: !!mapRef.current, perm: permState, secure: secureState });
    if (!navigator.geolocation) {
      setLocationMessage("Geolocation is not supported on this device.");
      toast.error("Geolocation is not supported on this device.");
      return;
    }
    if (!mapRef.current) {
      console.warn("MAP NOT READY");
      toast.error("Map is still loading, please try again in a moment.");
      return;
    }
    setLocationMessage("Waiting for browser location permission…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        console.log("LOCATION:", latitude, longitude);
        try {
          mapRef.current?.setView([latitude, longitude], 16, { animate: true, duration: 1.5 });
          markerRef.current?.setLatLng([latitude, longitude]);
          setTimeout(() => {
            const c = mapRef.current?.getCenter?.();
            console.log("MAP CENTER AFTER ZOOM:", c?.lat, c?.lng);
          }, 200);
        } catch (e) {
          console.error("map update failed", e);
        }
        updateLocationRef.current?.(latitude, longitude);
        setPermState("granted");
        setLocationMessage(`GPS lock: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      },
      (err) => {
        console.error("geolocation error", err.code, err.message);
        if (err.code === 1) {
          setPermState("denied");
          setLocationMessage("Enable location from browser settings");
          toast.error("Location blocked. Enable it for this site in your browser settings.", { duration: 8000 });
        } else {
          setLocationMessage("GPS failed. Drag the pin, tap the map, or search manually.");
          toast.error("Couldn't get your location. Drag the pin or search manually.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function usePinManually() {
    const point = markerRef.current?.getLatLng?.();
    if (!point) return;
    mapRef.current?.setView([point.lat, point.lng], Math.max(mapRef.current?.getZoom?.() ?? 15, 15));
    updateLocationRef.current?.(point.lat, point.lng);
    setLocationMessage("Using the selected map pin manually.");
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

  if (typeof document === "undefined" || !open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999]"
      style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%" }}
    >
      {/* Opaque overlay that fully blocks background UI */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
        onClick={onClose}
      />

      {/* Modal content */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[min(90vw,640px)] sm:h-[85vh] sm:rounded-3xl bg-background border border-white/10 flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-background">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="size-4 text-cyan shrink-0" />
            <h2 className="font-bold truncate">Pick your delivery location</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="size-9 rounded-full glass grid place-items-center">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={runSearch} className="p-3 border-b border-white/10 flex gap-2 bg-background">
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
          <div className="max-h-44 overflow-y-auto border-b border-white/10 bg-background">
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

        <div className="px-4 py-2 bg-cyan/10 text-cyan text-xs flex items-start gap-2 border-b border-white/10">
          <AlertCircle className="size-4 mt-0.5 shrink-0" />
          <span>
            {locationMessage}
            <span className="block mt-1 font-mono text-[10px] text-muted-foreground">
              Debug: permission={permState}; context={secureState}
            </span>
          </span>
        </div>

        <div className="px-4 py-3 border-b border-white/10 bg-background">
          <button
            type="button"
            onClick={recenterToMe}
            aria-label="Use my current location"
            className="w-full h-12 rounded-xl bg-aurora text-background inline-flex items-center justify-center gap-2 text-sm font-bold shadow-glow-cyan active:scale-[0.98] transition-transform"
          >
            <Crosshair className="size-5" />
            Use my current location
          </button>
        </div>

        <div className="relative flex-1 min-h-[240px] bg-black/40">
          <div ref={mapDivRef} className="absolute inset-0" />
        </div>

        <div className="p-4 border-t border-white/10 space-y-3 bg-background">
          <button
            type="button"
            onClick={usePinManually}
            className="w-full h-10 rounded-xl glass-strong hover:bg-cyan/10 text-xs font-bold inline-flex items-center justify-center gap-2"
          >
            Use map pin manually
          </button>
          <div className="flex items-start gap-2">
            <MapPin className="size-4 text-cyan mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Selected location</p>
              <p className="text-sm break-words">
                {busy ? (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" /> Resolving address…
                  </span>
                ) : (
                  address
                )}
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
      </div>
    </div>,
    document.body
  );
}
