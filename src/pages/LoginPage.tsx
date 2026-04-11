import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { APP_TYPE, APP_PROJECT_ID, APP_COLOR } from "@/constants/app-config";


export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, hasRole, roles, userStatus } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      console.log(`[LoginPage] Verificando acesso para user.id: ${user.id}, roles:`, roles);
      const timer = setTimeout(() => {
        if (hasRole("admin")) {
          console.log("[LoginPage] Role ADMIN detectada. Navegando para /admin");
          navigate("/admin");
        } else if (hasRole("company")) {
          navigate("/business");
        } else if (hasRole("driver")) {
          navigate("/driver");
        } else {
          console.warn("[LoginPage] Usuário sem papel detectado no redirecionamento.");
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [user, authLoading, hasRole, roles, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-4">
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-6 rounded-2xl bg-card p-8 shadow-card">
        <div className="flex flex-col items-center gap-2">
          <img src="/logo.png" alt="É Pra Já Delivery" className="h-20 w-auto rounded-xl" />
          <p className="text-sm text-muted-foreground">Painel de Gestão</p>
          <div className="mt-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full" style={{ borderColor: APP_COLOR + '40', backgroundColor: APP_COLOR + '10' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: APP_COLOR }}>PROJETO: {APP_TYPE} ({APP_PROJECT_ID})</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </button>
            </div>
          </div>
        </div>

        {user && !authLoading && roles.length === 0 && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
            <p className="text-[11px] text-destructive text-center font-bold uppercase leading-tight">
              Acesso Negado: Seu perfil não possui permissões. Contate o administrador.
            </p>
          </div>
        )}

        <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 gradient-primary text-primary-foreground py-2.5 rounded-xl font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>{loading ? "Entrando..." : "Entrar"}</span>
        </button>

        <p className="text-center text-xs text-muted-foreground">
          Acesso exclusivo por convite do administrador
        </p>
      </form>
    </div>
  );
}
