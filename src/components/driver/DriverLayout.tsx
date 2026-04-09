import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Truck, AlertTriangle, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useAllRealtime } from "@/services/realtime";
import { APP_TYPE, APP_PROJECT_ID, APP_COLOR } from "@/constants/app-config";

const tabs = [
  { label: "Início", icon: Home, href: "/driver" },
  { label: "Entregas", icon: Truck, href: "/driver/deliveries" },
  { label: "Ocorrências", icon: AlertTriangle, href: "/driver/occurrences" },
  { label: "Perfil", icon: User, href: "/driver/profile" },
];

interface DriverLayoutProps {
  children: ReactNode;
  title?: string;
}

export function DriverLayout({ children, title }: DriverLayoutProps) {
  // Activate global realtime listeners
  useAllRealtime();

  const location = useLocation();
  const { signOut, profile } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card border-b border-border px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm p-1">
            <img src="/logo.png" alt="É Pra Já" className="w-full h-full object-contain" />
          </div>
          <span className="font-display font-black text-foreground tracking-tighter uppercase text-sm">É Pra Já</span>
        </div>
        <button onClick={signOut} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors group">
          <LogOut className="h-5 w-5 text-muted-foreground group-hover:text-destructive" />
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 pb-20 overflow-auto flex flex-col">
        <div className="flex-1">
          {children}
        </div>
        
        {/* Global Branding Footer */}
        <div className="w-full py-8 flex justify-center opacity-10 pointer-events-none select-none mt-auto">
          <p className="text-[10px] font-black tracking-[0.4em] text-muted-foreground uppercase">
            BONASOFT
          </p>
        </div>
      </main>

      {/* Bottom nav - mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border flex items-center justify-around py-2 px-4 safe-area-bottom">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.href;
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Persistence Safety Badge - DEV ONLY */}
      <div 
        className="fixed bottom-20 right-4 z-[9999] px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest text-white shadow-2xl flex items-center gap-2 pointer-events-none select-none opacity-80"
        style={{ backgroundColor: APP_COLOR, border: "2px solid white" }}
      >
        <span className="animate-pulse">●</span>
        APP: {APP_TYPE} ({APP_PROJECT_ID})
      </div>
    </div>
  );
}
