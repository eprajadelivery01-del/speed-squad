import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Truck, AlertTriangle, User, Bell, Trash2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useAllRealtime } from "@/services/realtime";
import { useDriverNotifications } from "@/hooks/useDriverNotifications";
import { useNotifications } from "@/contexts/NotificationContext";
import { ThemeToggle } from "../shared/ThemeToggle";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useDeliveries } from "@/services/deliveries";
import { useState } from "react";
import { useUniqueDeliveries } from "@/hooks/useUniqueDeliveries";

const tabs = [
  { label: "Início", icon: Home, href: "/driver" },
  { label: "Entregas", icon: Truck, href: "/driver/deliveries" },
  { label: "Ocorrências", icon: AlertTriangle, href: "/driver/occurrences" },
  { label: "Perfil", icon: User, href: "/driver/profile" },
  { label: "Suporte", icon: MessageSquare, href: "https://wa.me/556599034795", external: true },
];

interface DriverLayoutProps {
  children: ReactNode;
  title?: string;
}

export function DriverLayout({ children, title }: DriverLayoutProps) {
  useAllRealtime();
  useDriverNotifications();
  const location = useLocation();
  const { profile } = useAuth();
  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications();

  const isActive = (href: string) => {
    if (href === "/driver") return location.pathname === "/driver";
    return location.pathname.startsWith(href);
  };

  const currentTab = tabs.find(t => isActive(t.href));

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-zinc-950 pb-24">
      {/* Top Header */}
      <header className="bg-background border-b border-border shadow-sm px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="ÉpraJá"
            className="w-10 h-10 rounded-xl object-contain"
          />
          <div>
            <h1 className="text-base font-extrabold text-foreground leading-tight">
              {currentTab?.label || title || "Início"}
            </h1>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest truncate max-w-[150px]">
              {profile?.full_name || "Entregador"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {/* Notifications Tab */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-xl bg-primary/5 hover:bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
                {unreadCount > 0 && (
                  <Badge 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] border-2 border-card"
                    variant="destructive"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[90%] sm:w-[400px] p-0">
              <div className="flex flex-col h-full">
                <SheetHeader className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <SheetTitle className="text-lg font-bold">Notificações</SheetTitle>
                    {notifications.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4 mr-1" /> Limpar tudo
                      </Button>
                    )}
                  </div>
                  <SheetDescription>Acompanhe novidades e alertas em tempo real.</SheetDescription>
                </SheetHeader>
                <ScrollArea className="flex-1">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                        <Bell className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm text-muted-foreground">Nenhuma notificação por enquanto.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {notifications.map((n) => (
                        <div 
                          key={n.id} 
                          className={cn(
                            "p-4 transition-colors cursor-pointer hover:bg-muted/50",
                            !n.read && "bg-primary/5 border-l-2 border-primary"
                          )}
                          onClick={() => markAsRead(n.id)}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="text-sm font-bold text-foreground">{n.title}</h4>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{n.description}</p>
                          
                          {/* Status Badge */}
                          {n.type === 'delivery' && n.deliveryStatus && n.deliveryStatus !== 'pending' && (
                            <div className="mt-2">
                              <Badge 
                                variant={
                                  n.deliveryStatus === 'accepted' ? 'default' :
                                  n.deliveryStatus === 'rejected' ? 'outline' : 'secondary'
                                }
                                className={cn(
                                  n.deliveryStatus === 'accepted' && "bg-green-600 hover:bg-green-600",
                                  n.deliveryStatus === 'rejected' && "text-muted-foreground border-muted-foreground",
                                  n.deliveryStatus === 'expired' && "text-orange-500 bg-orange-500/10"
                                )}
                              >
                                {n.deliveryStatus === 'accepted' ? 'Corrida Aceita' :
                                 n.deliveryStatus === 'rejected' ? 'Corrida Recusada' : 'Corrida Expirada'}
                              </Badge>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 p-4">
        <div className="max-w-lg mx-auto">{children}</div>
      </main>

      {/* Bottom Navigation */}
      <nav 
        className="fixed bottom-0 z-50 w-full border-t border-border bg-background pb-6 pt-1"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex h-16 items-center justify-around px-2">
          {tabs.map((tab) => {
            const active = isActive(tab.href);
            
            let badgeCount = 0;
            if (tab.label === "Início") badgeCount = broadcastCount;
            if (tab.label === "Entregas") badgeCount = activeDeliveriesCount;

            return tab.external ? (
              <a
                key={tab.label}
                href={tab.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex flex-1 flex-col items-center justify-center gap-1 h-full"
              >
                <div className="relative">
                  <tab.icon className="h-[22px] w-[22px] text-muted-foreground stroke-[1.5px]" />
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {tab.label}
                </span>
              </a>
            ) : (
              <Link
                key={tab.href}
                to={tab.href}
                className="group relative flex flex-1 flex-col items-center justify-center gap-1 h-full"
              >
                <div className="relative">
                  <tab.icon className={cn(
                    'h-[22px] w-[22px] transition-all duration-200',
                    active ? 'text-foreground stroke-[2.5px]' : 'text-muted-foreground stroke-[1.5px]'
                  )} />
                  {badgeCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground border border-background shadow-sm">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </div>
                <span className={cn(
                  "text-[10px] transition-all duration-200",
                  active ? "text-foreground font-bold" : "text-muted-foreground font-medium"
                )}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
