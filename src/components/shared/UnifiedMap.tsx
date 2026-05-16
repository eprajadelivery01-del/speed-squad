import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useOnlineDrivers } from "@/services/drivers";
import { useDeliveries } from "@/services/deliveries";
import { useCity } from "@/contexts/CityContext";
import { Search, MapPin, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RegionRow } from "@/services/regions";

interface UnifiedMapProps {
  regions: RegionRow[];
  centerCity?: { name: string; lat: number; lng: number } | null;
  interactive?: boolean;
  showControls?: boolean;
}

export function UnifiedMap({ 
  regions, 
  centerCity: propCenterCity, 
  interactive = false,
  showControls = true
}: UnifiedMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const searchMarkerRef = useRef<maplibregl.Marker | null>(null);
  const regionsRenderedRef = useRef<string[]>([]);
  const mapLoaded = useRef(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { selectedCityCoords } = useCity();
  const centerCity = propCenterCity || selectedCityCoords;

  const { data: drivers } = useOnlineDrivers();
  const { data: deliveriesData } = useDeliveries({ status: "in_route" });

  const calculateCentroid = (regs: RegionRow[]) => {
    if (!regs.length) return null;
    let totalLat = 0;
    let totalLng = 0;
    let count = 0;

    regs.forEach(r => {
      if (r.geometry && (r.geometry as any).coordinates?.[0]) {
        const coords = (r.geometry as any).coordinates[0];
        coords.forEach((c: [number, number]) => {
          totalLng += c[0];
          totalLat += c[1];
          count++;
        });
      }
    });

    return count > 0 ? [totalLng / count, totalLat / count] as [number, number] : null;
  };

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: centerCity ? [centerCity.lng, centerCity.lat] : [-56.0974, -15.5989],
      zoom: 12,
    });

    if (showControls) {
      map.current.addControl(new maplibregl.NavigationControl(), "bottom-right");
    }

    map.current.on("load", () => {
      mapLoaded.current = true;
      if (!centerCity && !regions.length && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            map.current?.flyTo({
              center: [pos.coords.longitude, pos.coords.latitude],
              zoom: 13,
              duration: 2000
            });
          },
          (err) => console.log("Geolocation error:", err)
        );
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Centering logic
  useEffect(() => {
    if (!map.current) return;

    if (centerCity) {
      map.current.flyTo({ center: [centerCity.lng, centerCity.lat], zoom: 13, duration: 1500 });
    } else if (regions.length > 0) {
      const centroid = calculateCentroid(regions);
      if (centroid) {
        map.current.flyTo({ center: centroid, zoom: 13, duration: 1500 });
      }
    }
  }, [centerCity?.lat, centerCity?.lng, regions]);

  // Render Regions and Labels
  useEffect(() => {
    const m = map.current;
    if (!m || !regions) return;

    const render = () => {
      // Clear old regions
      regionsRenderedRef.current.forEach((id) => {
        [`rfill-${id}`, `rline-${id}`, `rlabel-${id}`].forEach(l => {
          if (m.getLayer(l)) m.removeLayer(l);
        });
        if (m.getSource(`rsrc-${id}`)) m.removeSource(`rsrc-${id}`);
      });
      regionsRenderedRef.current = [];

      regions.forEach((region) => {
        if (!region.geometry) return;
        const geojson = region.geometry as any;
        if (geojson.type !== "Polygon") return;

        const srcId = `rsrc-${region.id}`;
        
        m.addSource(srcId, {
          type: "geojson",
          data: {
            type: "Feature",
            properties: { 
              name: region.name, 
              price: `R$ ${Number(region.price).toFixed(2)}` 
            },
            geometry: geojson,
          },
        });

        m.addLayer({
          id: `rfill-${region.id}`,
          type: "fill",
          source: srcId,
          paint: { "fill-color": region.color, "fill-opacity": 0.15 },
        });

        m.addLayer({
          id: `rline-${region.id}`,
          type: "line",
          source: srcId,
          paint: { "line-color": region.color, "line-width": 2, "line-opacity": 0.6 },
        });

        m.addLayer({
          id: `rlabel-${region.id}`,
          type: "symbol",
          source: srcId,
          layout: {
            "text-field": ["concat", ["get", "name"], "\n", ["get", "price"]],
            "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
            "text-size": 11,
            "text-anchor": "center",
            "text-allow-overlap": false,
            "text-offset": [0, 0],
            "text-line-height": 1.2,
          },
          paint: {
            "text-color": "#1a1a1a",
            "text-halo-color": "#ffffff",
            "text-halo-width": 2,
          }
        });

        if (interactive) {
          m.on("mouseenter", `rfill-${region.id}`, () => {
            m.getCanvas().style.cursor = "pointer";
            m.setPaintProperty(`rfill-${region.id}`, "fill-opacity", 0.3);
          });
          m.on("mouseleave", `rfill-${region.id}`, () => {
            m.getCanvas().style.cursor = "";
            m.setPaintProperty(`rfill-${region.id}`, "fill-opacity", 0.15);
          });
        }

        regionsRenderedRef.current.push(region.id);
      });
    };

    if (m.isStyleLoaded()) render();
    else m.once("load", render);
  }, [regions, interactive]);

  // Realtime Drivers
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    markersRef.current.forEach(mk => mk.remove());
    markersRef.current = [];

    (drivers ?? []).forEach((driver) => {
      if (!driver.latitude || !driver.longitude) return;

      const el = document.createElement("div");
      el.className = "driver-marker";
      const badge = document.createElement("div");
      badge.setAttribute("style", "width:38px;height:38px;border-radius:12px;background:#22c55e;border:2px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(34,197,94,0.4);font-size:18px;cursor:pointer;transition:transform 0.2s;");
      badge.textContent = "Status";
      badge.onmouseover = () => (badge.style.transform = "scale(1.1)");
      badge.onmouseout = () => (badge.style.transform = "scale(1)");
      el.appendChild(badge);

      // Build popup DOM safely (no HTML interpolation of user data)
      const popupEl = document.createElement("div");
      popupEl.setAttribute("style", "padding:10px;font-family:sans-serif;min-width:160px;text-align:left;");

      const nameEl = document.createElement("div");
      nameEl.setAttribute("style", "font-weight:bold;color:#1a1a1a;margin-bottom:2px;");
      nameEl.textContent = driver.profiles?.full_name || "Entregador";
      popupEl.appendChild(nameEl);

      const statusEl = document.createElement("div");
      statusEl.setAttribute("style", "font-size:11px;color:#22c55e;margin-bottom:10px;");
      statusEl.textContent = "● Disponível";
      popupEl.appendChild(statusEl);

      const btnWrap = document.createElement("div");
      btnWrap.setAttribute("style", "display:flex;flex-direction:column;gap:6px;");

      const chatBtn = document.createElement("button");
      chatBtn.setAttribute("style", "cursor:pointer;background:#3b82f6;color:white;border:none;border-radius:8px;padding:7px;font-size:11px;font-weight:600;");
      chatBtn.textContent = "💬 Iniciar Chat";
      chatBtn.onclick = () => {
        const safeId = encodeURIComponent(String(driver.user_id ?? ""));
        window.location.href = `/driver/chat?recipient=${safeId}`;
      };
      btnWrap.appendChild(chatBtn);

      const phoneDigits = String(driver.profiles?.phone ?? "").replace(/\D/g, "");
      if (phoneDigits) {
        const waBtn = document.createElement("button");
        waBtn.setAttribute("style", "cursor:pointer;background:#22c55e;color:white;border:none;border-radius:8px;padding:7px;font-size:11px;font-weight:600;");
        waBtn.textContent = "🟢 WhatsApp";
        waBtn.onclick = () => window.open(`https://wa.me/${encodeURIComponent(phoneDigits)}`, "_blank");
        btnWrap.appendChild(waBtn);
      }

      popupEl.appendChild(btnWrap);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([driver.longitude, driver.latitude])
        .setPopup(new maplibregl.Popup({ offset: 15, closeButton: false }).setDOMContent(popupEl))
        .addTo(m);

      markersRef.current.push(marker);
    });
  }, [drivers]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=br`
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectLocation = (result: any) => {
    if (!map.current) return;

    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);

    map.current.flyTo({
      center: [lon, lat],
      zoom: 16,
      duration: 2000
    });

    if (searchMarkerRef.current) searchMarkerRef.current.remove();

    searchMarkerRef.current = new maplibregl.Marker({ color: "#f97316" })
      .setLngLat([lon, lat])
      .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`<div style="padding: 5px; font-weight: bold;">${result.display_name}</div>`))
      .addTo(map.current);

    setSearchResults([]);
    setSearchQuery(result.display_name);
  };

  return (
    <div className="relative w-full h-full group">
      {/* Google Maps Style Search Bar */}
      <div className="absolute top-4 left-4 z-[40] w-full max-w-[320px] md:max-w-md animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="relative bg-background/80 backdrop-blur-xl border border-border shadow-2xl rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <div className="flex items-center px-4 py-3 gap-3">
            <Search className="h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Buscar ruas, cidades..."
              className="flex-1 bg-transparent border-none outline-none text-sm font-medium placeholder:text-muted-foreground/60"
            />
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : searchQuery ? (
              <button 
                onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                className="p-1 hover:bg-muted rounded-full transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            ) : null}
          </div>

          {searchResults.length > 0 && (
            <div className="border-t border-border max-h-[300px] overflow-y-auto bg-background/95 backdrop-blur-xl">
              {searchResults.map((result, idx) => (
                <button
                  key={idx}
                  onClick={() => selectLocation(result)}
                  className="w-full text-left px-4 py-3 hover:bg-primary/5 transition-colors border-b border-border/40 last:border-none flex items-start gap-3 group"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 group-hover:text-primary transition-colors" />
                  <span className="text-xs font-medium text-foreground line-clamp-2 leading-relaxed">
                    {result.display_name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div ref={mapContainer} className="w-full h-full rounded-xl overflow-hidden shadow-inner bg-muted/20" />
    </div>
  );
}
