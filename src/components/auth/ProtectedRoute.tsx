import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Clock, XCircle } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "company" | "driver" | "customer";
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading, hasRole, userStatus } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (userStatus === "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center max-w-md p-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning/10">
            <Clock className="h-8 w-8 text-warning" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Aguardando aprovação</h2>
          <p className="text-muted-foreground mb-6">
            Seu cadastro está pendente de aprovação pelo administrador. Você será notificado quando for aprovado.
          </p>
          <button
            onClick={() => { window.location.href = "/login"; }}
            className="px-6 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Voltar ao login
          </button>
        </div>
      </div>
    );
  }

  if (userStatus === "rejected") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center max-w-md p-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Acesso negado</h2>
          <p className="text-muted-foreground mb-6">
            Seu cadastro foi recusado pelo administrador.
          </p>
          <button
            onClick={() => { window.location.href = "/login"; }}
            className="px-6 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Voltar ao login
          </button>
        </div>
      </div>
    );
  }

  if (requiredRole && !hasRole(requiredRole) && !hasRole("admin")) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
