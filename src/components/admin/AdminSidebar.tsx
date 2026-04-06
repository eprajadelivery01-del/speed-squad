import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Truck, Map, Users, Building2, Bike,
  MapPin, DollarSign, AlertTriangle, Settings, Menu, X, LogOut, User, MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import logoImg from "@/assets/logo.jpeg";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { label: "Corridas (OS)", icon: Truck, href: "/admin/deliveries" },
  { label: "Chat", icon: MessageSquare, href: "/admin/chat" },
  { label: "Mapa", icon: Map, href: "/admin/map" },
  { label: "Usuários", icon: Users, href: "/admin/users" },
  { label: "Empresas", icon: Building2, href: "/admin/companies" },
  { label: "Entregadores", icon: Bike, href: "/admin/drivers" },
  { label: "Regiões", icon: MapPin, href: "/admin/regions" },
  { label: "Financeiro", icon: DollarSign, href: "/admin/reports" },
  { label: "Ocorrências", icon: AlertTriangle, href: "/admin/occurrences" },
  { label: "Configurações", icon: Settings, href: "/admin/settings" },
];

export function AdminSidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, signOut } = useAuth();

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-card shadow-card"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Brand */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="É Pra Já" className="h-10 w-auto rounded-lg" />
            <div>
              <span className="text-base font-bold text-sidebar-foreground">É Pra Já</span>
              <span className="block text-xs text-sidebar-accent-foreground">Delivery</span>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href !== "/admin" && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-4 w-4 text-primary" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{profile?.full_name || "Admin"}</p>
                <p className="text-xs text-muted-foreground">Administrador</p>
              </div>
            </div>
            <button onClick={signOut} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
