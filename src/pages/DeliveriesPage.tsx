import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DeliveryStatusBadge } from "@/components/admin/DeliveryStatusBadge";
import { useDeliveries, useUpdateDeliveryStatus, useReassignDelivery, type DeliveryWithRelations } from "@/services/deliveries";
import { useCompanies } from "@/services/companies";
import { useDrivers } from "@/services/drivers";
import { useDeliveriesRealtime } from "@/services/realtime";
import {
  Search, Filter, Eye, MoreHorizontal, X as XIcon, ChevronLeft, ChevronRight,
  Loader2, Printer, UserCheck, Package, Send, MapPin
} from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { DeliveryStatus } from "@/types/models";

const statusFilters = [
  { label: "Todas", value: "all" },
  { label: "Pendentes", value: "pending" },
  { label: "Aceitas", value: "accepted" },
  { label: "Em Coleta", value: "collecting" },
  { label: "Em Trânsito", value: "in_transit" },
  { label: "Entregues", value: "delivered" },
  { label: "Canceladas", value: "cancelled" },
];

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function DeliveriesPage() {
  useDeliveriesRealtime();
  const { toast } = useToast();

  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [driverFilter, setDriverFilter] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const [detailDelivery, setDetailDelivery] = useState<DeliveryWithRelations | null>(null);
  const [reassignDelivery, setReassignDelivery] = useState<DeliveryWithRelations | null>(null);
  const [dispatchDelivery, setDispatchDelivery] = useState<DeliveryWithRelations | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState("");

  const { data, isLoading } = useDeliveries({
    status: activeFilter,
    search: search || undefined,
    companyId: companyFilter || undefined,
    driverId: driverFilter || undefined,
    page,
    pageSize,
  });

  const { data: companies } = useCompanies();
  const { data: drivers } = useDrivers();
  const updateStatus = useUpdateDeliveryStatus();
  const reassignMut = useReassignDelivery();

  const deliveries = data?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const onlineDrivers = (drivers ?? []).filter((d) => d.online);

  const getDriversSortedByProximity = (delivery: DeliveryWithRelations) => {
    if (!delivery.dropoff_latitude || !delivery.dropoff_longitude) return onlineDrivers;
    return [...onlineDrivers].sort((a, b) => {
      const distA = a.current_latitude && a.current_longitude
        ? haversineDistance(delivery.dropoff_latitude!, delivery.dropoff_longitude!, a.current_latitude, a.current_longitude)
        : Infinity;
      const distB = b.current_latitude && b.current_longitude
        ? haversineDistance(delivery.dropoff_latitude!, delivery.dropoff_longitude!, b.current_latitude, b.current_longitude)
        : Infinity;
      return distA - distB;
    });
  };

  const getDriverDistance = (driver: any, delivery: DeliveryWithRelations) => {
    if (!delivery.dropoff_latitude || !delivery.dropoff_longitude || !driver.current_latitude || !driver.current_longitude) return null;
    return haversineDistance(delivery.dropoff_latitude, delivery.dropoff_longitude, driver.current_latitude, driver.current_longitude);
  };

  const handleReassign = async () => {
    if (!reassignDelivery) return;
    try {
      await reassignMut.mutateAsync({ id: reassignDelivery.id, driverId: selectedDriverId || null });
      toast({ title: "Entregador reatribuído!" });
      setReassignDelivery(null);
      setSelectedDriverId("");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleDispatch = async () => {
    if (!dispatchDelivery || !selectedDriverId) return;
    try {
      await reassignMut.mutateAsync({ id: dispatchDelivery.id, driverId: selectedDriverId });
      await updateStatus.mutateAsync({ id: dispatchDelivery.id, status: "accepted" });
      toast({ title: "OS enviada!", description: "Entrega direcionada ao entregador selecionado" });
      setDispatchDelivery(null);
      setSelectedDriverId("");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handlePrint = (delivery: DeliveryWithRelations) => {
    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) return;
    w.document.write(`
      <html><body style="font-family:sans-serif;padding:20px">
        <h2>É Pra Já Delivery</h2>
        <h3>Ordem de Serviço</h3><hr/>
        <p><strong>OS:</strong> #${delivery.id.slice(0, 8).toUpperCase()}</p>
        <p><strong>Cliente:</strong> ${delivery.customer_name}</p>
        <p><strong>Coleta:</strong> ${delivery.pickup_address}</p>
        <p><strong>Entrega:</strong> ${delivery.dropoff_address}</p>
        <p><strong>Empresa:</strong> ${delivery.companies?.name || "—"}</p>
        <p><strong>Status:</strong> ${delivery.status}</p>
        <p><strong>Valor:</strong> R$ ${Number(delivery.price ?? 0).toFixed(2)}</p>
        <p><strong>Data:</strong> ${format(new Date(delivery.created_at), "dd/MM/yyyy HH:mm")}</p>
        ${delivery.notes ? `<p><strong>Obs:</strong> ${delivery.notes}</p>` : ""}
        <hr/><p style="font-size:11px">Impresso em ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  return (
    <AdminLayout title="Corridas (OS)" subtitle="Gerenciamento de entregas">
      <div className="space-y-3 mb-4">
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 bg-card rounded-xl px-3 py-2 shadow-card flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Buscar cliente..."
              className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground"
            />
            {search && (
              <button onClick={() => setSearch("")}><XIcon className="h-4 w-4 text-muted-foreground" /></button>
            )}
          </div>
          <select
            value={companyFilter}
            onChange={(e) => { setCompanyFilter(e.target.value); setPage(0); }}
            className="bg-card border border-border rounded-lg px-3 py-2 text-sm outline-none"
          >
            <option value="">Todas empresas</option>
            {(companies ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={driverFilter}
            onChange={(e) => { setDriverFilter(e.target.value); setPage(0); }}
            className="bg-card border border-border rounded-lg px-3 py-2 text-sm outline-none"
          >
            <option value="">Todos entregadores</option>
            {(drivers ?? []).map((d) => (
              <option key={d.id} value={d.id}>{d.full_name || "—"}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => { setActiveFilter(f.value); setPage(0); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                activeFilter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-card shadow-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cliente</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Empresa</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Destino</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Valor</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((delivery) => (
                    <tr key={delivery.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3"><p className="font-medium">{delivery.customer_name}</p></td>
                      <td className="px-4 py-3"><p className="text-muted-foreground">{delivery.companies?.name || "—"}</p></td>
                      <td className="px-4 py-3"><p className="text-muted-foreground truncate max-w-[200px]">{delivery.dropoff_address}</p></td>
                      <td className="px-4 py-3"><DeliveryStatusBadge status={delivery.status} /></td>
                      <td className="px-4 py-3 font-medium">R$ {Number(delivery.price ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-3"><span className="text-muted-foreground text-xs">{format(new Date(delivery.created_at), "dd/MM HH:mm")}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {delivery.status === "pending" && (
                            <button onClick={() => { setDispatchDelivery(delivery); setSelectedDriverId(""); }} className="p-2 rounded-lg hover:bg-info/10 transition-colors" title="Enviar para entregador">
                              <Send className="h-4 w-4 text-info" />
                            </button>
                          )}
                          <button onClick={() => setDetailDelivery(delivery)} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Ver detalhes">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-2 rounded-lg hover:bg-muted transition-colors"><MoreHorizontal className="h-4 w-4 text-muted-foreground" /></button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setDetailDelivery(delivery)}><Eye className="h-4 w-4 mr-2" /> Ver detalhes</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePrint(delivery)}><Printer className="h-4 w-4 mr-2" /> Imprimir OS</DropdownMenuItem>
                              {delivery.status === "pending" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => { setDispatchDelivery(delivery); setSelectedDriverId(""); }}><Send className="h-4 w-4 mr-2" /> Enviar para entregador</DropdownMenuItem>
                                </>
                              )}
                              {!["delivered", "cancelled"].includes(delivery.status) && (
                                <DropdownMenuItem onClick={() => { setReassignDelivery(delivery); setSelectedDriverId(delivery.driver_id || ""); }}><UserCheck className="h-4 w-4 mr-2" /> Reatribuir</DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {delivery.status === "pending" && (
                                <DropdownMenuItem onClick={() => updateStatus.mutate({ id: delivery.id, status: "accepted" })}>Aceitar</DropdownMenuItem>
                              )}
                              {delivery.status === "accepted" && (
                                <DropdownMenuItem onClick={() => updateStatus.mutate({ id: delivery.id, status: "collecting" })}>Iniciar Coleta</DropdownMenuItem>
                              )}
                              {delivery.status === "collecting" && (
                                <DropdownMenuItem onClick={() => updateStatus.mutate({ id: delivery.id, status: "in_transit" })}>Em Trânsito</DropdownMenuItem>
                              )}
                              {delivery.status === "in_transit" && (
                                <DropdownMenuItem onClick={() => updateStatus.mutate({ id: delivery.id, status: "delivered" })}>Finalizar</DropdownMenuItem>
                              )}
                              {!["delivered", "cancelled"].includes(delivery.status) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onClick={() => updateStatus.mutate({ id: delivery.id, status: "cancelled" })}>Cancelar</DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {deliveries.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Package className="h-8 w-8 mb-2" />
                <p className="text-sm">Nenhuma entrega encontrada</p>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalCount)} de {totalCount}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                  <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!detailDelivery} onOpenChange={(open) => !open && setDetailDelivery(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              OS #{detailDelivery?.id.slice(0, 8).toUpperCase()}
            </DialogTitle>
          </DialogHeader>
          {detailDelivery && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <DeliveryStatusBadge status={detailDelivery.status} />
                <div className="flex items-center gap-2">
                  {detailDelivery.status === "pending" && (
                    <button onClick={() => { setDispatchDelivery(detailDelivery); setDetailDelivery(null); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-info/10 text-info text-sm font-medium hover:bg-info/20 transition-colors">
                      <Send className="h-3.5 w-3.5" /> Direcionar
                    </button>
                  )}
                  <button onClick={() => handlePrint(detailDelivery)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-sm font-medium hover:bg-muted/80 transition-colors">
                    <Printer className="h-3.5 w-3.5" /> Imprimir
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <DetailField label="Cliente" value={detailDelivery.customer_name || "—"} />
                <DetailField label="Telefone" value={detailDelivery.customer_phone || "—"} />
                <DetailField label="Empresa" value={detailDelivery.companies?.name || "—"} />
                <DetailField label="Valor" value={`R$ ${Number(detailDelivery.price ?? 0).toFixed(2)}`} />
              </div>

              <DetailField label="Coleta" value={detailDelivery.pickup_address} />
              <DetailField label="Entrega" value={detailDelivery.dropoff_address} />
              {detailDelivery.notes && <DetailField label="Observações" value={detailDelivery.notes} />}

              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {detailDelivery.accepted_at && <span>Aceita: {format(new Date(detailDelivery.accepted_at), "dd/MM HH:mm")}</span>}
                {detailDelivery.collected_at && <span>Coletada: {format(new Date(detailDelivery.collected_at), "dd/MM HH:mm")}</span>}
                {detailDelivery.delivered_at && <span>Entregue: {format(new Date(detailDelivery.delivered_at), "dd/MM HH:mm")}</span>}
                {detailDelivery.cancelled_at && <span>Cancelada: {format(new Date(detailDelivery.cancelled_at), "dd/MM HH:mm")}</span>}
              </div>

              {!["delivered", "cancelled"].includes(detailDelivery.status) && (
                <div className="flex gap-2 pt-2">
                  <button onClick={() => { setReassignDelivery(detailDelivery); setSelectedDriverId(detailDelivery.driver_id || ""); setDetailDelivery(null); }} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-muted text-sm font-medium hover:bg-muted/80">
                    <UserCheck className="h-4 w-4" /> Reatribuir
                  </button>
                  <button onClick={() => { updateStatus.mutate({ id: detailDelivery.id, status: "cancelled" }); setDetailDelivery(null); }} className="px-4 py-2 rounded-lg bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20">
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reassign Modal */}
      <Dialog open={!!reassignDelivery} onOpenChange={(open) => !open && setReassignDelivery(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reatribuir Entregador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione o entregador para a OS #{reassignDelivery?.id.slice(0, 8).toUpperCase()}
            </p>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary"
            >
              <option value="">Sem entregador</option>
              {(drivers ?? []).map((d) => (
                <option key={d.id} value={d.id}>{d.full_name || "—"} {d.online ? "● Online" : ""}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button onClick={() => setReassignDelivery(null)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted">Cancelar</button>
              <button onClick={handleReassign} disabled={reassignMut.isPending} className="flex-1 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {reassignMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dispatch Modal */}
      <Dialog open={!!dispatchDelivery} onOpenChange={(open) => !open && setDispatchDelivery(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-info" />
              Enviar para Entregador
            </DialogTitle>
          </DialogHeader>
          {dispatchDelivery && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-muted/50">
                <p className="text-xs text-muted-foreground">OS</p>
                <p className="text-sm font-medium">#{dispatchDelivery.id.slice(0, 8).toUpperCase()} — {dispatchDelivery.customer_name}</p>
                <p className="text-xs text-muted-foreground mt-1">{dispatchDelivery.dropoff_address}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-foreground mb-2">Entregadores Online ({onlineDrivers.length})</p>
                {onlineDrivers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum entregador online</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {getDriversSortedByProximity(dispatchDelivery).map((driver) => {
                      const dist = getDriverDistance(driver, dispatchDelivery);
                      return (
                        <button
                          key={driver.id}
                          onClick={() => setSelectedDriverId(driver.id)}
                          className={`w-full text-left rounded-xl p-3 transition-all ${
                            selectedDriverId === driver.id
                              ? "bg-primary/10 border border-primary/30"
                              : "bg-muted/50 hover:bg-muted border border-transparent"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-xs font-bold text-primary">
                                  {(driver.full_name || "?")[0]}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium">{driver.full_name || "—"}</p>
                                <p className="text-xs text-muted-foreground">{driver.vehicle_type || "—"}</p>
                              </div>
                            </div>
                            {dist !== null && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={() => setDispatchDelivery(null)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted">Cancelar</button>
                <button onClick={handleDispatch} disabled={!selectedDriverId || reassignMut.isPending} className="flex-1 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                  {reassignMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Enviar
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
