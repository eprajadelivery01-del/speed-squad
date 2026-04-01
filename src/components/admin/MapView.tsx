import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useOnlineDrivers } from "@/services/drivers";

interface MapViewProps {
  centerCity?: { name: string; lat: number; lng: number } | null;
}

export function MapView({ centerCity }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const { data: drivers } = useOnlineDrivers();

  const defaultCenter: [number, number] = centerCity
    ? [centerCity.lng, centerCity.lat]
    : [-56.0974, -15.5989];

  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) { map.current.remove(); map.current = null; }

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: defaultCenter,
      zoom: 12,
    });
    map.current.addControl(new maplibregl.NavigationControl(), "bottom-right");

    return () => { map.current?.remove(); map.current = null; };
  }, [centerCity?.lat, centerCity?.lng]);

  useEffect(() => {
    if (!map.current || !centerCity) return;
    map.current.flyTo({ center: [centerCity.lng, centerCity.lat], zoom: 13, duration: 1500 });
  }, [centerCity]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    markersRef.current.forEach((mk) => mk.remove());
    markersRef.current = [];

    (drivers ?? []).forEach((driver) => {
      if (!driver.current_latitude || !driver.current_longitude) return;
      const el = document.createElement("div");
      el.innerHTML = `<div style="background:hsl(217,91%,50%);border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.2)">🏍️</div>`;
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([driver.current_longitude, driver.current_latitude])
        .setPopup(new maplibregl.Popup({ offset: 20 }).setHTML(`
          <div style="padding:8px"><strong>${driver.full_name || "Entregador"}</strong><br/><span style="color:green">● Online</span><br/>${driver.vehicle_type} • ⭐ ${Number(driver.rating).toFixed(1)}</div>
        `))
        .addTo(m);
      markersRef.current.push(marker);
    });
  }, [drivers]);

  return <div ref={mapContainer} className="w-full h-full min-h-[400px]" />;
}
