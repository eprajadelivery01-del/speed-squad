import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useOnlineDrivers } from "@/services/drivers";
import { useDeliveries } from "@/services/deliveries";
import { useCity } from "@/contexts/CityContext";
import type { RegionRow } from "@/services/regions";

interface UnifiedMapProps {
  regions: RegionRow[];
  centerCity?: { name: string; lat: number; lng: number } | null;
  interactive?: boolean;
}

export function UnifiedMap({ regions, centerCity: propCenterCity, interactive = false }: UnifiedMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const regionsRenderedRef = useRef<string[]>([]);
  const mapLoaded = useRef(false);

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

    map.current.addControl(new maplibregl.NavigationControl(), "bottom-right");

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
      el.innerHTML = `
        <div style="
          width: 38px; 
          height: 38px; 
          border-radius: 12px; 
          background: #22c55e; 
          border: 2px solid white; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4); 
          font-size: 18px;
          cursor: pointer;
          transition: transform 0.2s;
        " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
          Status
        </div>
      `;

      const popupContent = `
        <div style="padding: 10px; font-family: sans-serif; min-width: 160px; text-align: left;">
          <div style="font-weight: bold; color: #1a1a1a; margin-bottom: 2px;">${driver.profiles?.full_name || "Entregador"}</div>
          <div style="font-size: 11px; color: #22c55e; margin-bottom: 10px; display: flex; align-items: center; gap: 5px;">
            <div style="width: 7px; height: 7px; border-radius: 50%; background: #22c55e; animation: pulse 2s infinite;"></div>
            Disponível
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <button onclick="window.location.href='/admin/chat?recipient=${driver.user_id}'" style="
              cursor: pointer;
              background: #3b82f6;
              color: white;
              border: none;
              border-radius: 8px;
              padding: 7px;
              font-size: 11px;
              font-weight: 600;
              transition: opacity 0.2s;
            ">💬 Iniciar Chat</button>
            <button onclick="window.open('https://wa.me/${driver.profiles?.phone?.replace(/\D/g, "")}', '_blank')" style="
              cursor: pointer;
              background: #22c55e;
              color: white;
              border: none;
              border-radius: 8px;
              padding: 7px;
              font-size: 11px;
              font-weight: 600;
              transition: opacity 0.2s;
            ">🟢 WhatsApp</button>
          </div>
          <style>@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }</style>
        </div>
      `;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([driver.longitude, driver.latitude])
        .setPopup(new maplibregl.Popup({ offset: 15, closeButton: false }).setHTML(popupContent))
        .addTo(m);

      markersRef.current.push(marker);
    });
  }, [drivers]);

  return <div ref={mapContainer} className="w-full h-full rounded-xl overflow-hidden shadow-inner bg-muted/20" />;
}
