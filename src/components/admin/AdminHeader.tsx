import { Bell, Search } from "lucide-react";
import { NotificationsPopover } from "./NotificationsPopover";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
}

export function AdminHeader({ title, subtitle }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 bg-muted rounded-xl px-3 py-2 border border-transparent focus-within:border-primary/20 transition-all">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Buscar..."
              className="bg-transparent text-sm outline-none w-40 placeholder:text-muted-foreground"
            />
          </div>
          <NotificationsPopover />
        </div>
      </div>
    </header>
  );
}
