import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useDrivers } from "@/services/drivers";
import { useCompanies } from "@/services/companies";
import { useInvitations, useCreateInvitation, usePendingProfiles, useApproveUser, useRejectUser } from "@/services/users";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Building2, Bike, Plus, Star, Mail, Copy, Loader2, Check, Clock, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Tab = "pending" | "drivers" | "companies" | "invitations";

export default function UsersPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const { data: drivers, isLoading: loadingDrivers } = useDrivers();
  const { data: companies, isLoading: loadingCompanies } = useCompanies();
  const { data: invitations, isLoading: loadingInvites } = useInvitations();
  const { data: pendingProfiles, isLoading: loadingPending } = usePendingProfiles();

  const pendingCount = pendingProfiles?.length ?? 0;

  return (
    <AdminLayout title="Usuários" subtitle="Gerenciamento de usuários do sistema">
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
            {([
              { key: "pending" as const, icon: Clock, label: "Solicitações", badge: pendingCount },
              { key: "drivers" as const, icon: Bike, label: "Entregadores" },
              { key: "companies" as const, icon: Building2, label: "Empresas" },
              { key: "invitations" as const, icon: Mail, label: "Convites" },
            ]).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all relative",
                  tab === t.key ? "bg-card shadow-card text-foreground" : "text-muted-foreground"
                )}
              >
                <t.icon className="h-4 w-4" /> {t.label}
                {t.badge !== undefined && t.badge > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
          <InviteDialog />
        </div>

        {tab === "pending" && (
          loadingPending ? <LoadingGrid /> : <PendingApprovals profiles={pendingProfiles ?? []} />
        )}

        {tab === "drivers" && (
          loadingDrivers ? <LoadingGrid /> : (
            <div className="grid gap-3">
              {(drivers ?? []).map((driver) => (
                <div key={driver.id} className="rounded-2xl bg-card p-4 shadow-card flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {driver.profiles?.avatar_url ? (
                          <img src={driver.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-primary">
                            {(driver.profiles?.full_name || "?").split(" ").map(n => n[0]).join("")}
                          </span>
                        )}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${driver.is_online ? "bg-success" : "bg-muted-foreground/30"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{driver.profiles?.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{driver.profiles?.phone || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{driver.vehicle}</span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-warning" /> {Number(driver.rating).toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
              {(drivers ?? []).length === 0 && <EmptyState text="Nenhum entregador cadastrado" />}
            </div>
          )
        )}

        {tab === "companies" && (
          loadingCompanies ? <LoadingGrid /> : (
            <div className="grid gap-3">
              {(companies ?? []).map((company) => (
                <div key={company.id} className="rounded-2xl bg-card p-4 shadow-card">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{company.name}</p>
                      <p className="text-xs text-muted-foreground">{company.phone || "—"}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{company.address || "—"}</p>
                </div>
              ))}
              {(companies ?? []).length === 0 && <EmptyState text="Nenhuma empresa cadastrada" />}
            </div>
          )
        )}

        {tab === "invitations" && (
          loadingInvites ? <LoadingGrid /> : (
            <div className="rounded-2xl bg-card shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invitations ?? []).map((inv) => (
                      <tr key={inv.id} className="border-b border-border">
                        <td className="px-4 py-3">{inv.email}</td>
                        <td className="px-4 py-3"><span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-primary/10 text-primary">{inv.role}</span></td>
                        <td className="px-4 py-3"><span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-muted text-muted-foreground">{inv.status}</span></td>
                        <td className="px-4 py-3">{inv.status === "pending" && <CopyLinkButton token={inv.token} />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(invitations ?? []).length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">Nenhum convite enviado</p>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </AdminLayout>
  );
}

function PendingApprovals({ profiles }: { profiles: any[] }) {
  const { toast } = useToast();
  const approve = useApproveUser();
  const reject = useRejectUser();

  const handleApprove = async (userId: string, name: string) => {
    try {
      await approve.mutateAsync(userId);
      toast({ title: "Aprovado!", description: `${name} agora pode acessar o sistema.` });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleReject = async (userId: string, name: string) => {
    try {
      await reject.mutateAsync(userId);
      toast({ title: "Rejeitado", description: `${name} foi bloqueado.` });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  if (profiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <CheckCircle2 className="h-8 w-8 mb-2 text-success" />
        <p className="text-sm">Nenhuma solicitação pendente</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card shadow-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <p className="text-sm font-medium text-foreground flex items-center gap-2">
          <Clock className="h-4 w-4 text-warning" />
          Solicitações de Cadastro ({profiles.length})
        </p>
      </div>
      <div className="divide-y divide-border">
        {profiles.map((profile) => {
          const roles = profile.user_roles?.map((r: any) => r.role) ?? [];
          const roleLabel = roles.includes("driver") ? "Entregador" : roles.includes("company") ? "Empresa" : roles[0] || "—";
          const initials = (profile.full_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2);

          return (
            <div key={profile.user_id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-warning">{initials}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{profile.full_name || "Sem nome"}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{roleLabel}</span>
                    <span>{profile.phone || "—"}</span>
                    <span>•</span>
                    <span>{new Date(profile.created_at).toLocaleDateString("pt-BR")}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleApprove(profile.user_id, profile.full_name)}
                  disabled={approve.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
                </button>
                <button
                  onClick={() => handleReject(profile.user_id, profile.full_name)}
                  disabled={reject.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors disabled:opacity-50"
                >
                  <XCircle className="h-3.5 w-3.5" /> Rejeitar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InviteDialog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const createInvite = useCreateInvitation();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"company" | "driver">("driver");
  const [open, setOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await createInvite.mutateAsync({ email, role, invitedBy: user.id });
      toast({ title: "Convite criado!" });
      setEmail("");
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" /> Convidar Usuário
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar Usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tipo</label>
            <div className="flex gap-2">
              {(["driver", "company"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-sm font-medium border transition-colors",
                    role === r ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                  )}
                >
                  {r === "driver" ? "Entregador" : "Empresa"}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={createInvite.isPending} className="w-full flex items-center justify-center gap-2 gradient-primary text-primary-foreground py-2.5 rounded-xl font-medium text-sm disabled:opacity-50">
            {createInvite.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Enviar Convite
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CopyLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/invite/${token}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copiado!" : "Copiar link"}
    </button>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl bg-card p-4 shadow-card animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-3 bg-muted rounded w-1/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Users className="h-8 w-8 mb-2" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
