import { AdminLayout } from "@/components/admin/AdminLayout";
import { MapView } from "@/components/admin/MapView";
import { useAllRealtime } from "@/services/realtime";

export default function MapPage() {
  useAllRealtime();

  return (
    <AdminLayout title="Mapa" subtitle="Acompanhamento em tempo real">
      <div className="h-[calc(100vh-160px)] rounded-2xl overflow-hidden shadow-card">
        <MapView />
      </div>
    </AdminLayout>
  );
}
