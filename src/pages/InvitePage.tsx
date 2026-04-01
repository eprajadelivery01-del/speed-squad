import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { validateInvitation, acceptInvitation } from "@/services/users";
import { Truck, User, Phone, FileText, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { InvitationRow } from "@/services/users";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [invitation, setInvitation] = useState<InvitationRow | null>(null);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [document, setDocument] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    validateInvitation(token)
      .then(setInvitation)
      .catch((e) => setError(e.message))
      .finally(() => setValidating(false));
  }, [token]);

  const roleLabels: Record<string, string> = {
    admin: "Administrador",
    company: "Lojista",
    driver: "Entregador",
    customer: "Cliente",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation || !token) return;
    setSubmitting(true);

    try {
      await acceptInvitation(token, {
        email: invitation.email,
        password,
        fullName,
        phone,
        document,
      });
      toast({ title: "Conta criada!", description: "Verifique seu email para confirmar o cadastro." });
      navigate("/login");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (validating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
            <Truck className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Convite inválido</h1>
          <p className="text-sm text-muted-foreground">{error || "Este convite não existe ou já expirou."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6 rounded-2xl bg-card p-8 shadow-card">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary">
            <Truck className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Complete seu cadastro</h1>
          <p className="text-sm text-muted-foreground">
            Você foi convidado como <span className="font-medium text-primary">{roleLabels[invitation.role] || invitation.role}</span>
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
            Email: <span className="font-medium text-foreground">{invitation.email}</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nome completo</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary transition-colors" required />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Telefone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary transition-colors" required />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">CPF / Documento</label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type="text" value={document} onChange={(e) => setDocument(e.target.value)} placeholder="000.000.000-00"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary transition-colors" required />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary transition-colors" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </button>
            </div>
          </div>
        </div>

        <button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-2 gradient-primary text-primary-foreground py-2.5 rounded-xl font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Criando conta..." : "Criar conta"}
        </button>
      </form>
    </div>
  );
}
