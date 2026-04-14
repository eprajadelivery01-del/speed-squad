import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Truck, AlertTriangle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useAllRealtime } from "@/services/realtime";
import { useDriverNotifications } from "@/hooks/useDriverNotifications";
import logoEpraja from "@/assets/logo.jpeg";

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
  useAllRealtime();
  useDriverNotifications();
  const location = useLocation();
  const { profile, user } = useAuth();
  const metadataName = typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";
  const displayName = profile?.full_name?.trim() || metadataName || user?.email?.split("@")[0] || "";
  const avatarInitial = displayName.charAt(0).toUpperCase();

  const isActive = (href: string) => {
    if (href === "/driver") return location.pathname === "/driver";
    return location.pathname.startsWith(href);
  };

  const currentTab = tabs.find(t => isActive(t.href));

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Top Header */}
      <header className="flex-none bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={logoEpraja}
            alt="ÉpraJá"
            className="w-10 h-10 rounded-full object-cover border-2 border-primary/20"
          />
          <div>
            <h1 className="text-base font-extrabold text-foreground leading-tight">
              {currentTab?.label || title || "Início"}
            </h1>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Entregador</p>
          </div>
        </div>
        <Link
          to="/driver/profile"
          className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20"
        >
          <span className="text-sm font-bold text-primary">{avatarInitial || "?"}</span>
        </Link>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        <div className="max-w-lg mx-auto">{children}</div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex items-center justify-around py-2 px-2">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[60px]",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <tab.icon className={cn("h-5 w-5", active && "stroke-[2.5px]")} />
              <span className={cn("text-[10px] font-bold", active && "font-extrabold")}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
