import { useState, useRef, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useRegions, useCreateRegion, useUpdateRegion, useDeleteRegion, type Region } from "@/services/regions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MapPin, Pencil, MousePointer, Trash2, Plus, Undo2, Save, X, DollarSign } from "lucide-react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type DrawMode = "none" | "points" | "freehand";

export default function RegionsPage() {
  const { data: regions, isLoading } = useRegions();
  const createRegion = useCreateRegion();
  const updateRegion = useUpdateRegion();
  const deleteRegion = useDeleteRegion();

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const [drawMode, setDrawMode] = useState<DrawMode>("none");
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [newRegion, setNewRegion] = useState({ name: "", color: "#3B82F6", price: "0", city: "" });

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: [-56.0974, -15.5989],
      zoom: 12,
    });
    m.addControl(new maplibregl.NavigationControl(), "top-right");
    m.on("load", () => setMapReady(true));
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  // Render regions on map
  useEffect(() => {
    if (!mapReady || !map.current || !regions) return;
    const m = map.current;

    // Remove old layers/sources
    regions.forEach((_, i) => {
      if (m.getLayer(`region-fill-${i}`)) m.removeLayer(`region-fill-${i}`);
      if (m.getLayer(`region-line-${i}`)) m.removeLayer(`region-line-${i}`);
      if (m.getSource(`region-${i}`)) m.removeSource(`region-${i}`);
    });
    // Also clean up stale ones
    for (let i = 0; i < 100; i++) {
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
        paint: { "fill-color": region.color || "#3B82F6", "fill-opacity": 0.25 },
      });
      m.addLayer({
        id: `region-line-${i}`,
        type: "line",
        source: `region-${i}`,
        paint: { "line-color": region.color || "#3B82F6", "line-width": 2 },
      });

      // Popup on click
      m.on("click", `region-fill-${i}`, (e) => {
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`<div style="padding:4px"><strong>${region.name}</strong><br/>R$ ${Number(region.price).toFixed(2)}</div>`)
          .addTo(m);
      });

      // Hover cursor
      m.on("mouseenter", `region-fill-${i}`, () => { m.getCanvas().style.cursor = "pointer"; });
      m.on("mouseleave", `region-fill-${i}`, () => { m.getCanvas().style.cursor = ""; });
    });
  }, [mapReady, regions]);

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
        m.addLayer({ id: "drawing-points", type: "circle", source: "drawing-pts", paint: { "circle-radius": 5, "circle-color": "#3B82F6" } });
      }
      return;
    }

    const coords = [...drawingPoints, drawingPoints[0]];
    m.addSource("drawing", {
      type: "geojson",
      data: { type: "Feature", geometry: { type: "Polygon", coordinates: [coords] }, properties: {} },
    });
    m.addLayer({ id: "drawing-fill", type: "fill", source: "drawing", paint: { "fill-color": "#3B82F6", "fill-opacity": 0.2 } });
    m.addLayer({ id: "drawing-line", type: "line", source: "drawing", paint: { "line-color": "#3B82F6", "line-width": 2, "line-dasharray": [2, 2] } });

    m.addSource("drawing-pts", { type: "geojson", data: { type: "FeatureCollection", features: drawingPoints.map(p => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: p }, properties: {} })) } });
    m.addLayer({ id: "drawing-points", type: "circle", source: "drawing-pts", paint: { "circle-radius": 5, "circle-color": "#3B82F6", "circle-stroke-width": 2, "circle-stroke-color": "#fff" } });
  }, [mapReady, drawingPoints]);

  // Map click handler for point mode
  useEffect(() => {
    if (!mapReady || !map.current) return;
    const m = map.current;
    const handleClick = (e: maplibregl.MapMouseEvent) => {
      if (drawMode !== "points") return;
      setDrawingPoints(prev => [...prev, [e.lngLat.lng, e.lngLat.lat]]);
    };
    m.on("click", handleClick);
    return () => { m.off("click", handleClick); };
  }, [mapReady, drawMode]);

  // Freehand drawing
  useEffect(() => {
    if (!mapReady || !map.current) return;
    const m = map.current;
    let isDrawing = false;

    const onDown = (e: maplibregl.MapMouseEvent) => {
      if (drawMode !== "freehand") return;
      isDrawing = true;
      m.dragPan.disable();
      setDrawingPoints([[e.lngLat.lng, e.lngLat.lat]]);
    };
    const onMove = (e: maplibregl.MapMouseEvent) => {
      if (!isDrawing || drawMode !== "freehand") return;
      setDrawingPoints(prev => [...prev, [e.lngLat.lng, e.lngLat.lat]]);
    };
    const onUp = () => {
      if (!isDrawing) return;
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
  }, [mapReady, drawMode]);

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
    try {
      await createRegion.mutateAsync({ name: newRegion.name, color: newRegion.color, price: parseFloat(newRegion.price) || 0, city: newRegion.city || undefined, geometry });
      toast.success("Região criada!");
      setConfigOpen(false);
      setDrawingPoints([]);
      setNewRegion({ name: "", color: "#3B82F6", price: "0", city: "" });
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
      await updateRegion.mutateAsync({ id: selectedRegion.id, name: selectedRegion.name, color: selectedRegion.color, price: selectedRegion.price, city: selectedRegion.city || undefined });
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

          {/* Drawing toolbar */}
          <div className="absolute top-4 left-4 flex gap-2">
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
                <div className="bg-card/95 backdrop-blur rounded-lg px-3 py-1.5 text-xs font-medium text-primary flex items-center gap-2 shadow-lg">
                  {drawMode === "points" ? <><MousePointer className="h-3 w-3" /> Clique para adicionar pontos</> : <><Pencil className="h-3 w-3" /> Arraste para desenhar</>}
                </div>
                {drawMode === "points" && drawingPoints.length > 0 && (
                  <Button size="sm" variant="outline" onClick={undoPoint} className="shadow-lg">
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
        <div className="w-80 rounded-2xl bg-card shadow-card p-4 overflow-y-auto">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />Regiões ({regions?.length || 0})
          </h3>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (regions ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma região cadastrada. Use os botões no mapa para criar.</p>
          ) : (
            <div className="space-y-2">
              {(regions ?? []).map(region => (
                <div
                  key={region.id}
                  className="p-3 rounded-xl border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => flyToRegion(region)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: region.color }} />
                    <span className="font-medium text-sm flex-1">{region.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedRegion(region); setEditOpen(true); }} className="text-muted-foreground hover:text-primary">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteRegion(region.id); }} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />R$ {Number(region.price).toFixed(2)}</span>
                    {region.city && <span>{region.city}</span>}
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
            <div>
              <Label>Cidade</Label>
              <Input value={newRegion.city} onChange={e => setNewRegion(p => ({ ...p, city: e.target.value }))} placeholder="Ex: Cuiabá" />
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
              <div>
                <Label>Cidade</Label>
                <Input value={selectedRegion.city || ""} onChange={e => setSelectedRegion(p => p ? { ...p, city: e.target.value } : p)} />
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
