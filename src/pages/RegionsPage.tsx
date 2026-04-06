import { useState, useRef, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useRegions, useCreateRegion, useUpdateRegion, useDeleteRegion, type Region } from "@/services/regions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MapPin, Pencil, MousePointer, Trash2, Undo2, Save, X, DollarSign, Search, Loader2, Eye, Check } from "lucide-react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCity } from "@/contexts/CityContext";
import { cn } from "@/lib/utils";

type DrawMode = "none" | "points" | "freehand";

export default function RegionsPage() {
  const { selectedCity, setSelectedCity, cities } = useCity();
  const { data: allRegions, isLoading } = useRegions();
  const createRegion = useCreateRegion();
  const updateRegion = useUpdateRegion();
  const deleteRegion = useDeleteRegion();

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isControlPressed, setIsControlPressed] = useState(false);

  const [drawMode, setDrawMode] = useState<DrawMode>("none");
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Filter regions by selected city
  const regions = allRegions?.filter(r => 
    !selectedCity || r.city?.toLowerCase() === selectedCity.name.toLowerCase()
  );

  const [newRegion, setNewRegion] = useState({ name: "", color: "#F59E0B", price: "0", city: selectedCity?.name || "" });

  // City search state
  const [cityQuery, setCityQuery] = useState("");
  const [citySuggestions, setCitySuggestions] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [searchingCity, setSearchingCity] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    const saved = localStorage.getItem("epj_selected_city");
    let center: [number, number] = [-56.0974, -15.5989];
    let zoom = 12;
    if (saved) {
      try {
        const c = JSON.parse(saved);
        center = [c.lng, c.lat];
      } catch {}
    }
    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center,
      zoom,
    });
    m.addControl(new maplibregl.NavigationControl(), "top-right");
    m.on("load", () => setMapReady(true));
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  // Key listeners for Control key
  useEffect(() => {
    const down = (e: KeyboardEvent) => e.key === "Control" && setIsControlPressed(true);
    const up = (e: KeyboardEvent) => e.key === "Control" && setIsControlPressed(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  // Sync map center with selected city
  useEffect(() => {
    if (map.current && selectedCity) {
      map.current.flyTo({ center: [selectedCity.lng, selectedCity.lat], zoom: 13, duration: 2000 });
      setCityQuery(selectedCity.name);
    }
  }, [selectedCity]);

  // Render regions on map
  useEffect(() => {
    if (!mapReady || !map.current || !regions) return;
    const m = map.current;

    // Clean up all region layers
    for (let i = 0; i < 500; i++) {
      if (m.getLayer(`region-fill-${i}`)) m.removeLayer(`region-fill-${i}`);
      if (m.getLayer(`region-line-${i}`)) m.removeLayer(`region-line-${i}`);
      if (m.getSource(`region-${i}`)) m.removeSource(`region-${i}`);
    }

    regions.forEach((region, i) => {
      if (!region.geometry) return;
      m.addSource(`region-${i}`, {
        type: "geojson",
        data: { type: "Feature", geometry: region.geometry, properties: { name: region.name, price: region.price } },
      });
      m.addLayer({
        id: `region-fill-${i}`,
        type: "fill",
        source: `region-${i}`,
        paint: {
          "fill-color": region.color || "#F59E0B",
          "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.45, 0.25],
        },
      });
      m.addLayer({
        id: `region-line-${i}`,
        type: "line",
        source: `region-${i}`,
        paint: { "line-color": region.color || "#F59E0B", "line-width": 2.5 },
      });

      // Popup on click
      m.on("click", `region-fill-${i}`, (e) => {
        new maplibregl.Popup({ closeButton: true, maxWidth: "200px" })
          .setLngLat(e.lngLat)
          .setHTML(`<div style="padding:6px 2px"><strong style="font-size:14px">${region.name}</strong><br/><span style="color:#F59E0B;font-weight:600">R$ ${Number(region.price).toFixed(2)}</span>${region.city ? `<br/><span style="font-size:12px;color:#888">${region.city}</span>` : ''}</div>`)
          .addTo(m);
      });

      m.on("mouseenter", `region-fill-${i}`, () => { m.getCanvas().style.cursor = "pointer"; });
      m.on("mouseleave", `region-fill-${i}`, () => { m.getCanvas().style.cursor = ""; });
    });
  }, [mapReady, regions]);

  // City search (Restore manual search)
  const searchCity = async () => {
    if (cityQuery.length < 2) return;
    setSearchingCity(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityQuery)}&limit=5&addressdetails=1`);
      const data = await res.json();
      setCitySuggestions(data.map((r: any) => ({
        name: r.display_name.split(",").slice(0, 3).join(",").trim(),
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
      })));
    } catch {}
    setSearchingCity(false);
  };

  const selectCity = (city: { name: string; lat: number; lng: number }) => {
    if (map.current) {
      map.current.flyTo({ center: [city.lng, city.lat], zoom: 13, duration: 2000 });
    }
    setCitySuggestions([]);
    setCityQuery(city.name);
  };

  // Render drawing preview
  useEffect(() => {
    if (!mapReady || !map.current) return;
    const m = map.current;
    if (m.getLayer("drawing-fill")) m.removeLayer("drawing-fill");
    if (m.getLayer("drawing-line")) m.removeLayer("drawing-line");
    if (m.getLayer("drawing-points")) m.removeLayer("drawing-points");
    if (m.getSource("drawing")) m.removeSource("drawing");
    if (m.getSource("drawing-pts")) m.removeSource("drawing-pts");

    if (drawingPoints.length < 2) {
      if (drawingPoints.length === 1) {
        m.addSource("drawing-pts", { type: "geojson", data: { type: "FeatureCollection", features: drawingPoints.map(p => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: p }, properties: {} })) } });
        m.addLayer({ id: "drawing-points", type: "circle", source: "drawing-pts", paint: { "circle-radius": 6, "circle-color": "#F59E0B", "circle-stroke-width": 2, "circle-stroke-color": "#fff" } });
      }
      return;
    }

    const coords = [...drawingPoints, drawingPoints[0]];
    m.addSource("drawing", {
      type: "geojson",
      data: { type: "Feature", geometry: { type: "Polygon", coordinates: [coords] }, properties: {} },
    });
    m.addLayer({ id: "drawing-fill", type: "fill", source: "drawing", paint: { "fill-color": "#F59E0B", "fill-opacity": 0.2 } });
    m.addLayer({ id: "drawing-line", type: "line", source: "drawing", paint: { "line-color": "#F59E0B", "line-width": 2, "line-dasharray": [2, 2] } });

    m.addSource("drawing-pts", { type: "geojson", data: { type: "FeatureCollection", features: drawingPoints.map(p => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: p }, properties: {} })) } });
    m.addLayer({ id: "drawing-points", type: "circle", source: "drawing-pts", paint: { "circle-radius": 6, "circle-color": "#F59E0B", "circle-stroke-width": 2, "circle-stroke-color": "#fff" } });
  }, [mapReady, drawingPoints]);

  // Map click handler for point mode
  useEffect(() => {
    if (!mapReady || !map.current) return;
    const m = map.current;
    const handleClick = (e: maplibregl.MapMouseEvent) => {
      if (drawMode !== "points" || isControlPressed) return;
      setDrawingPoints(prev => [...prev, [e.lngLat.lng, e.lngLat.lat]]);
    };
    m.on("click", handleClick);
    return () => { m.off("click", handleClick); };
  }, [mapReady, drawMode, isControlPressed]);

  // Freehand drawing
  useEffect(() => {
    if (!mapReady || !map.current) return;
    const m = map.current;
    let isDrawing = false;

    const onDown = (e: maplibregl.MapMouseEvent) => {
      if (drawMode !== "freehand" || isControlPressed) return;
      isDrawing = true;
      m.dragPan.disable();
      setDrawingPoints([[e.lngLat.lng, e.lngLat.lat]]);
    };
    const onMove = (e: maplibregl.MapMouseEvent) => {
      if (!isDrawing || drawMode !== "freehand" || isControlPressed) {
        if (isControlPressed) m.dragPan.enable();
        return;
      }
      setDrawingPoints(prev => [...prev, [e.lngLat.lng, e.lngLat.lat]]);
    };
    const onUp = () => {
      isDrawing = false;
      m.dragPan.enable();
    };

    m.on("mousedown", onDown);
    m.on("mousemove", onMove);
    m.on("mouseup", onUp);
    return () => {
      m.off("mousedown", onDown);
      m.off("mousemove", onMove);
      m.off("mouseup", onUp);
    };
  }, [mapReady, drawMode, isControlPressed]);

  const startDraw = (mode: DrawMode) => {
    setDrawMode(mode);
    setDrawingPoints([]);
  };

  const undoPoint = () => setDrawingPoints(prev => prev.slice(0, -1));

  const finishDraw = () => {
    if (drawingPoints.length < 3) {
      toast.error("Desenhe pelo menos 3 pontos para formar uma região");
      return;
    }
    setDrawMode("none");
    setConfigOpen(true);
  };

  const cancelDraw = () => {
    setDrawMode("none");
    setDrawingPoints([]);
  };

  const saveNewRegion = async () => {
    if (!newRegion.name) { toast.error("Nome é obrigatório"); return; }
    const coords = [...drawingPoints, drawingPoints[0]];
    const geometry = { type: "Polygon", coordinates: [coords] };
    const cityName = selectedCity?.name || newRegion.city;
    try {
      await createRegion.mutateAsync({ name: newRegion.name, color: newRegion.color, price: parseFloat(newRegion.price) || 0, city: cityName || undefined, geometry });
      toast.success("Região criada!");
      setConfigOpen(false);
      setDrawingPoints([]);
      setNewRegion({ name: "", color: "#F59E0B", price: "0", city: "" });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteRegion = async (id: string) => {
    if (!confirm("Excluir esta região?")) return;
    try {
      await deleteRegion.mutateAsync(id);
      toast.success("Região excluída");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleEditSave = async () => {
    if (!selectedRegion) return;
    try {
      await updateRegion.mutateAsync({ id: selectedRegion.id, name: selectedRegion.name, color: selectedRegion.color, price: selectedRegion.price, city: selectedRegion.city || selectedCity?.name || undefined });
      toast.success("Região atualizada!");
      setEditOpen(false);
      setSelectedRegion(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const flyToRegion = (region: Region) => {
    if (!map.current || !region.geometry) return;
    const coords = region.geometry.coordinates[0];
    const bounds = coords.reduce(
      (b: any, c: [number, number]) => b.extend(c),
      new maplibregl.LngLatBounds(coords[0], coords[0])
    );
    map.current.fitBounds(bounds, { padding: 80 });
  };

  return (
    <AdminLayout title="Regiões" subtitle="Gerenciamento de regiões de entrega">
      <div className="flex gap-4 h-[calc(100vh-140px)]">
        {/* Map */}
        <div className="flex-1 relative rounded-2xl overflow-hidden bg-card shadow-card">
          <div ref={mapContainer} className="w-full h-full" />

          {/* City search bar */}
          <div className="absolute top-4 right-14 w-72 z-10">
            <div className="bg-card/95 backdrop-blur rounded-xl shadow-lg overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  value={cityQuery}
                  onChange={(e) => setCityQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchCity()}
                  placeholder="Buscar cidade..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
                />
                {searchingCity && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              </div>
              {citySuggestions.length > 0 && (
                <div className="border-t border-border max-h-48 overflow-y-auto">
                  {citySuggestions.map((city, i) => (
                    <button
                      key={i}
                      onClick={() => selectCity(city)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10 transition-colors border-b border-border last:border-0 text-foreground"
                    >
                      {city.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Drawing toolbar */}
          <div className="absolute top-4 left-4 flex gap-2 z-10">
            {drawMode === "none" ? (
              <>
                <Button size="sm" onClick={() => startDraw("points")} className="gap-1.5 shadow-lg">
                  <MousePointer className="h-3.5 w-3.5" />Modo Pontos
                </Button>
                <Button size="sm" onClick={() => startDraw("freehand")} className="gap-1.5 shadow-lg">
                  <Pencil className="h-3.5 w-3.5" />Modo Lápis
                </Button>
              </>
            ) : (
              <>
                <div className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-2 shadow-lg animate-pulse">
                  {drawMode === "points" ? <><MousePointer className="h-3 w-3" /> Clique para adicionar pontos ({drawingPoints.length})</> : <><Pencil className="h-3 w-3" /> Arraste para desenhar ({drawingPoints.length} pts)</>}
                </div>
                {drawMode === "points" && drawingPoints.length > 0 && (
                  <Button size="sm" variant="outline" onClick={undoPoint} className="shadow-lg bg-card/95">
                    <Undo2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button size="sm" variant="default" onClick={finishDraw} disabled={drawingPoints.length < 3} className="shadow-lg gap-1.5">
                  <Save className="h-3.5 w-3.5" />Finalizar
                </Button>
                <Button size="sm" variant="destructive" onClick={cancelDraw} className="shadow-lg">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 rounded-2xl bg-card shadow-card p-4 overflow-y-auto custom-scrollbar">
          {/* City Selector List */}
          <div className="mb-6">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block px-1">Cidade Ativa</Label>
            <div className="space-y-1">
              {cities.map((city) => (
                <button
                  key={city.id}
                  onClick={() => setSelectedCity(city)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-xl text-sm transition-all flex items-center justify-between border border-transparent",
                    selectedCity?.id === city.id 
                      ? "bg-primary/10 text-primary border-primary/20 font-bold" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <MapPin className={cn("h-3.5 w-3.5", selectedCity?.id === city.id ? "text-primary" : "text-muted-foreground")} />
                    {city.name}
                  </span>
                  {selectedCity?.id === city.id && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>

          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2 px-1">
            <MousePointer className="h-4 w-4 text-primary" />Regiões ({regions?.length || 0})
          </h3>
          
          {isLoading ? (
            <p className="text-sm text-muted-foreground px-1">Carregando...</p>
          ) : (regions ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-xl border border-dashed border-border px-4 py-6 text-center">
              Nenhuma região cadastrada em <strong>{selectedCity?.name}</strong>.
            </p>
          ) : (
            <div className="space-y-2">
              {(regions ?? []).map(region => (
                <div
                  key={region.id}
                  className="p-3 rounded-xl border border-border hover:bg-primary/5 cursor-pointer transition-colors group bg-card"
                  onClick={() => flyToRegion(region)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-4 rounded-full border-2 border-background shadow-sm" style={{ backgroundColor: region.color }} />
                    <span className="font-medium text-sm flex-1 truncate">{region.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedRegion(region); setEditOpen(true); }} className="text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity p-1">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteRegion(region.id); }} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-1">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-bold text-primary">R$ {Number(region.price).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Config modal for new region */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Configurar Região</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={newRegion.name} onChange={e => setNewRegion(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Centro" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cor</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={newRegion.color} onChange={e => setNewRegion(p => ({ ...p, color: e.target.value }))} className="w-10 h-10 rounded border-0 cursor-pointer" />
                  <Input value={newRegion.color} onChange={e => setNewRegion(p => ({ ...p, color: e.target.value }))} className="font-mono text-xs" />
                </div>
              </div>
              <div>
                <Label>Preço (R$)</Label>
                <Input type="number" min="0" step="0.50" value={newRegion.price} onChange={e => setNewRegion(p => ({ ...p, price: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setConfigOpen(false); setDrawingPoints([]); }}>Cancelar</Button>
              <Button onClick={saveNewRegion} disabled={createRegion.isPending}>
                {createRegion.isPending ? "Salvando..." : "Salvar Região"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Região</DialogTitle>
          </DialogHeader>
          {selectedRegion && (
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input value={selectedRegion.name} onChange={e => setSelectedRegion(p => p ? { ...p, name: e.target.value } : p)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cor</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={selectedRegion.color} onChange={e => setSelectedRegion(p => p ? { ...p, color: e.target.value } : p)} className="w-10 h-10 rounded border-0 cursor-pointer" />
                  </div>
                </div>
                <div>
                  <Label>Preço (R$)</Label>
                  <Input type="number" min="0" step="0.50" value={selectedRegion.price} onChange={e => setSelectedRegion(p => p ? { ...p, price: parseFloat(e.target.value) || 0 } : p)} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
                <Button onClick={handleEditSave} disabled={updateRegion.isPending}>
                  {updateRegion.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
