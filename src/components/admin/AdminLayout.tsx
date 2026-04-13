import React from "react";

export function AdminLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="min-h-screen bg-background">
      {title && (
        <header className="border-b border-border px-6 py-4">
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
        </header>
      )}
      <main>{children}</main>
    </div>
  );
}
