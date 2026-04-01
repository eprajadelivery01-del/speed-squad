import { AdminLayout } from "@/components/admin/AdminLayout";
import { MapView } from "@/components/admin/MapView";
import { MotoboysSidebar } from "@/components/admin/MotoboysSidebar";
import { NotificationsPanel } from "@/components/admin/NotificationsPanel";

export default function MapPage() {
  return (
    <AdminLayout title="Mapa" subtitle="Acompanhamento em tempo real">
      <div className="flex gap-4 h-[calc(100vh-160px)]">
        <div className="hidden xl:block w-72 flex-shrink-0">
          <MotoboysSidebar />
        </div>
        <div className="flex-1 rounded-2xl overflow-hidden shadow-card">
          <MapView />
        </div>
        <div className="hidden xl:block w-80 flex-shrink-0">
          <NotificationsPanel />
        </div>
      </div>
    </AdminLayout>
  );
}
