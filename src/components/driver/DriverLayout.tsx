import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Truck,
  AlertTriangle,
  User,
  LogOut,
  ChevronRight,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useAllRealtime } from "@/services/realtime";

const tabs = [
  { label: "Painel Principal", icon: Home, href: "/driver" },
  { label: "Minhas Entregas", icon: Truck, href: "/driver/deliveries" },
  { label: "Ocorrências", icon: AlertTriangle, href: "/driver/occurrences" },
  { label: "Meu Perfil", icon: User, href: "/driver/profile" },
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("epj_driver_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem("epj_driver_sidebar_collapsed", String(newState));
  };

  const isActive = (href: string) => {
    if (href === "/driver") return location.pathname === "/driver";
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row font-sans selection:bg-primary/20">
      {/* Sidebar overlay (mobile) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-300"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar (Desktop) */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out shadow-2xl lg:shadow-none",
          "lg:translate-x-0 lg:static lg:z-auto",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "w-20" : "w-72"
        )}
      >
        {/* Toggle Button (Desktop) */}
        <button 
          onClick={toggleSidebar}
          className={cn(
            "hidden lg:flex absolute -right-3.5 top-20 w-7 h-7 rounded-full bg-primary border-4 border-background items-center justify-center text-primary-foreground shadow-xl transition-all hover:scale-110 z-[60]",
            collapsed && "rotate-180"
          )}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>

        {/* Brand/Driver Info */}
        <div className={cn("px-6 py-8 transition-all border-b border-border/50", collapsed && "px-0 flex justify-center")}>
          <div className="flex items-center gap-4">
             <div className="relative w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                <Truck className="h-6 w-6 text-primary" />
             </div>
            {!collapsed && (
              <div className="min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
                <p className="text-[10px] text-primary leading-none mb-1 font-black uppercase tracking-[0.2em]">Painel Entregador</p>
                <h2 className="text-base font-black text-foreground leading-tight truncate">
                  {profile?.full_name?.split(" ")[0] || "Motorista"}
                </h2>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {tabs.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                to={tab.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "group flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200",
                  active
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  collapsed && "justify-center px-0"
                )}
                title={collapsed ? tab.label : ""}
              >
                <tab.icon className={cn("h-5 w-5 shrink-0 transition-transform group-hover:scale-110", active ? "text-primary-foreground" : "text-muted-foreground")} />
                {!collapsed && <span className="flex-1 animate-in fade-in slide-in-from-left-2 duration-300">{tab.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Action Sidebar Footer */}
        <div className={cn("p-4 border-t border-border mt-auto", collapsed && "flex flex-col items-center px-0")}>
          <button
            onClick={signOut}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all",
              collapsed && "justify-center px-0"
            )}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span className="animate-in fade-in slide-in-from-left-2 duration-300">Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 bg-muted/20 overflow-hidden h-screen">
        {/* Header (Top bar for all views) */}
        <header className="flex-none bg-background/80 backdrop-blur-xl border-b border-border px-6 py-4 flex items-center justify-between gap-4 relative z-30">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2.5 rounded-2xl bg-muted/50 hover:bg-muted transition-colors"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-6 w-6 text-foreground" />
            </button>
            <h1 className="text-xl font-display font-black text-foreground tracking-tight flex items-center gap-3 lowercase sm:uppercase">
              <span className="hidden sm:inline w-1 h-6 bg-primary rounded-full" />
              {title || "Operacional"}
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="hidden sm:flex flex-col items-end mr-2">
                <span className="text-xs font-black text-foreground leading-none">{profile?.full_name?.split(" ")[0]}</span>
                <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">Motorista</span>
             </div>
             <Link to="/driver/profile" className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 hover:scale-105 transition-transform">
                <span className="text-sm font-black text-primary uppercase">
                   {profile?.full_name?.charAt(0) || "M"}
                </span>
             </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:px-8 lg:py-8 pb-24 lg:pb-8">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation (Floating) */}
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 lg:hidden bg-card/80 backdrop-blur-2xl border border-white/10 flex items-center gap-2 py-2 px-3 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-in slide-in-from-bottom-10 duration-700">
          {tabs.map((tab, idx) => {
            const active = isActive(tab.href);
            return (
              <Link
                key={idx}
                to={tab.href}
                className={cn(
                  "flex items-center justify-center p-3 rounded-full transition-all duration-300",
                  active ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110" : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                <tab.icon className={cn("h-5 w-5", active && "stroke-[2.5px]")} />
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
