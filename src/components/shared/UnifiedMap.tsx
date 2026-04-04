import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useOnlineDrivers } from "@/services/drivers";
import { useDeliveries } from "@/services/deliveries";
import type { RegionRow } from "@/services/regions";

interface UnifiedMapProps {
  regions: RegionRow[];
  centerCity?: { name: string; lat: number; lng: number } | null;
  interactive?: boolean;
}

export function UnifiedMap({ regions, centerCity, interactive = false }: UnifiedMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const regionsRenderedRef = useRef<string[]>([]);

  const { data: drivers } = useOnlineDrivers();
  const { data: deliveriesData } = useDeliveries({ status: "in_route" });

  const defaultCenter: [number, number] = centerCity
    ? [centerCity.lng, centerCity.lat]
    : [-56.0974, -15.5989];

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: defaultCenter,
      zoom: 12,
    });

    map.current.addControl(new maplibregl.NavigationControl(), "bottom-right");

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current || !centerCity) return;
    map.current.flyTo({ center: [centerCity.lng, centerCity.lat], zoom: 13, duration: 1500 });
  }, [centerCity?.lat, centerCity?.lng]);

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

        // Fill layer
        m.addLayer({
          id: `rfill-${region.id}`,
          type: "fill",
          source: srcId,
          paint: { "fill-color": region.color, "fill-opacity": 0.15 },
        });

        // Line layer
        m.addLayer({
          id: `rline-${region.id}`,
          type: "line",
          source: srcId,
          paint: { "line-color": region.color, "line-width": 2, "line-opacity": 0.6 },
        });

        // Label layer (Text in center)
        m.addLayer({
          id: `rlabel-${region.id}`,
          type: "symbol",
          source: srcId,
          layout: {
            "text-field": ["get", "price"],
            "text-font": ["Noto Sans Regular"],
            "text-size": 12,
            "text-anchor": "center",
            "text-allow-overlap": true,
          },
          paint: {
            "text-color": "#444",
            "text-halo-color": "#fff",
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
      el.innerHTML = `<div style="width: 32px; height: 32px; border-radius: 50%; background: #22c55e; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2); font-size: 14px;">🏍️</div>`;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([driver.longitude, driver.latitude])
        .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(`<strong>${driver.profiles?.full_name || "Entregador"}</strong>`))
        .addTo(m);

      markersRef.current.push(marker);
    });
  }, [drivers]);

  return <div ref={mapContainer} className="w-full h-full rounded-xl overflow-hidden shadow-inner bg-muted/20" />;
}
