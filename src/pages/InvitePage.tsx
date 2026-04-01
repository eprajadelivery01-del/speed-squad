import { useNavigate } from "react-router-dom";
import { Truck } from "lucide-react";
import { useEffect } from "react";

export default function InvitePage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Invitations system not yet implemented
    const timer = setTimeout(() => navigate("/login"), 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <Truck className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">Sistema de convites</h1>
        <p className="text-sm text-muted-foreground">O sistema de convites ainda não foi implementado. Redirecionando para o login...</p>
      </div>
    </div>
  );
}
