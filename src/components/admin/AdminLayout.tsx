import { useAllRealtime } from "@/services/realtime";
import { ReactNode, useState, useEffect } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { APP_TYPE, APP_PROJECT_ID, APP_COLOR } from "@/constants/app-config";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  // Activate global realtime listeners (Deliveries and Drivers)
  useAllRealtime();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("epj_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar onCollapsedChange={setSidebarCollapsed} />
      <div
        className="flex-1 flex flex-col transition-all duration-300"
        style={{ marginLeft: sidebarCollapsed ? "68px" : "256px" }}
      >
        <AdminHeader title={title} subtitle={subtitle} />
        <main className="flex-1 p-4 md:p-6 animate-fade-in">
          {children}
        </main>
      </div>

      {/* Persistence Safety Badge - DEV ONLY */}
      <div 
        className="fixed bottom-6 right-6 z-[9999] px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest text-white shadow-2xl flex items-center gap-2 pointer-events-none select-none opacity-80"
        style={{ backgroundColor: APP_COLOR, border: "2px solid white" }}
      >
        <span className="animate-pulse">●</span>
        APP: {APP_TYPE} ({APP_PROJECT_ID})
      </div>
    </div>
  );
}
