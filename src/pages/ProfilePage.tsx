// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { DriverLayout } from "@/components/driver/DriverLayout";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfile, uploadAvatar } from "@/services/users";
import { useToast } from "@/hooks/use-toast";
import {
  Camera, Loader2, User, Phone, Trash2, AlertCircle, FileText,
  ShieldCheck, LogOut, Star, Package, TrendingUp, Check,
  Edit3, X, ChevronRight, Bike, CalendarDays, Wallet, AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";

export default function ProfilePage() {
  const { user, profile, deleteAccount, syncProfile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [coverUrl, setCoverUrl] = useState("");
  const [period, setPeriod] = useState("today");
  const [customDate, setCustomDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split("T")[0];
  });
  
  const [driverStats, setDriverStats] = useState({ 
    deliveries: 0, 
    periodDeliveries: 0, 
    rating: 0, 
    grossEarnings: 0, 
    platformFee: 0,
    netEarnings: 0,
    online: false, 
    commissionRate: 0.40 
  });

  useEffect(() => {
    setFullName(profile?.full_name || "");
    setPhone(profile?.phone || "");
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    fetchDriverData();
  }, [user, period, customDate]);

  const fetchDriverData = async () => {
    try {
      // Get driver record
      const { data: driver } = await supabase
        .from("delivery_drivers")
        .select("id, rating, is_online, commission_rate")
        .eq("user_id", user.id)
        .maybeSingle();

      if (driver) {
        setCoverUrl(localStorage.getItem(`driver_cover_${user.id}`) || "");
        
        // Status considerados "entregue"
        const DELIVERED_STATUSES = ["delivered", "completed"] as any;

        // Count total deliveries
        const { count: totalCount } = await supabase
          .from("deliveries")
          .select("id", { count: "exact", head: true })
          .eq("driver_id", driver.id)
          .in("status", DELIVERED_STATUSES);

        // Compute date range
        let start = new Date();
        let end = new Date();
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        if (period === "today") {
          // already set
        } else if (period === "yesterday") {
          start.setDate(start.getDate() - 1);
          end.setDate(end.getDate() - 1);
        } else if (period === "week") {
          start.setDate(start.getDate() - start.getDay());
        } else if (period === "month") {
          start.setDate(1);
        } else if (period === "custom" && customDate) {
          const [year, month, day] = customDate.split("-").map(Number);
          start = new Date(year, month - 1, day, 0, 0, 0, 0);
          end = new Date(year, month - 1, day, 23, 59, 59, 999);
        }

        const { data: allDelivered } = await supabase
          .from("deliveries")
          .select("value, commission, delivered_at, completed_at, created_at")
          .eq("driver_id", driver.id)
          .in("status", DELIVERED_STATUSES);

        const startMs = start.getTime();
        const endMs = end.getTime();
        
        const periodDeliveries = (allDelivered || []).filter((d: any) => {
          const ref = d.delivered_at || d.completed_at || d.created_at;
          if (!ref) return false;
          const t = new Date(ref).getTime();
          return t >= startMs && t <= endMs;
        });

        const periodCount = periodDeliveries.length;
        const driverRate = driver.commission_rate !== null && driver.commission_rate !== undefined ? Number(driver.commission_rate) : 0.40;
        
        const grossEarnings = periodDeliveries.reduce((sum, d: any) => sum + Number(d.value || 0), 0);
        const platformFee = periodDeliveries.reduce((sum, d: any) => sum + Number(d.commission || driverRate), 0);
        const netEarnings = grossEarnings - platformFee;

        setDriverStats({
          deliveries: totalCount || 0,
          periodDeliveries: periodCount,
          rating: driver.rating || 5.0,
          grossEarnings,
          platformFee,
          netEarnings,
          online: driver.is_online || false,
          commissionRate: driverRate,
        });
      }
    } catch {
      // silent
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const url = await uploadAvatar(user.id, file);
      syncProfile({ avatar_url: url });
      toast({ title: "Foto atualizada!" });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const updatedProfile = await updateProfile(user.id, {
        id: profile?.id,
        full_name: fullName.trim(),
        phone
      });
      syncProfile(updatedProfile);
      toast({ title: "Perfil atualizado!" });
      setEditing(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const displayName = profile?.full_name?.split(" ")[0] || "Entregador";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <DriverLayout>
      <div className="min-h-screen pb-24 bg-slate-50/50">
        {/* === COVER & HEADER SECTION === */}
        <div className="relative h-[220px] bg-gradient-to-br from-primary via-orange-500 to-amber-400 -mx-4 -mt-4 overflow-hidden rounded-b-[40px] shadow-lg">
          {coverUrl ? (
            <img src={coverUrl} className="w-full h-full object-cover" alt="Capa" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
              <Bike className="h-32 w-32 text-white" />
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
            <div className="flex gap-4 items-end">
              <div className="relative z-10">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-[1.5rem] border-4 border-white/20 shadow-2xl bg-white overflow-hidden hover:scale-105 transition-transform"
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
                  ) : (
                    <div className="w-full h-full gradient-primary flex items-center justify-center">
                      <span className="text-3xl font-black text-white">{initial}</span>
                    </div>
                  )}
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white text-primary flex items-center justify-center shadow-lg"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </button>
                <input ref={fileInputRef} type="file" capture="environment" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
              
              <div className="mb-1 text-white">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">{displayName}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <div className={cn("flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border border-white/10",
                    driverStats.online ? "bg-green-500/20 text-green-100" : "bg-black/40 text-white/70"
                  )}>
                    <div className={cn("w-1.5 h-1.5 rounded-full", driverStats.online ? "bg-green-400 animate-pulse" : "bg-white/40")} />
                    {driverStats.online ? "Online" : "Offline"}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-bold bg-black/40 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>{driverStats.rating.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setEditing(true)}
              className="mb-1 flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 font-bold text-xs text-white hover:bg-white/20 transition-all active:scale-95 shadow-xl"
            >
              <Edit3 className="h-4 w-4" />
              <span className="hidden sm:inline">Editar</span>
            </button>
          </div>
        </div>

        {/* === FILTERS === */}
        <div className="mt-8 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Desempenho
            </h2>
            <select 
              value={period} 
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-white border border-slate-200 text-foreground text-xs font-bold rounded-xl px-4 py-2 outline-none cursor-pointer hover:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
            >
              <option value="today">Hoje</option>
              <option value="yesterday">Ontem</option>
              <option value="week">Esta Semana</option>
              <option value="month">Este Mês</option>
              <option value="custom">Data Específica</option>
            </select>
          </div>
          
          {period === "custom" && (
            <div className="mb-4 animate-in fade-in slide-in-from-top-2">
              <input 
                type="date" 
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm transition-all"
              />
            </div>
          )}
        </div>

        {/* === MAIN DASHBOARD === */}
        <div className="px-4 sm:px-6 mb-8">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
             {/* Total Entregas */}
             <div className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                <div className="flex items-center justify-between mb-4 relative z-10">
                   <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                     <Package className="h-5 w-5" />
                   </div>
                </div>
                <div className="relative z-10">
                   <p className="text-3xl font-black text-slate-800 tracking-tight">{driverStats.periodDeliveries}</p>
                   <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Entregas no Período</p>
                </div>
             </div>

             {/* Ganhos Brutos */}
             <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-[24px] p-5 shadow-lg shadow-emerald-500/20 text-white flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-x-8 -translate-y-8" />
                <div className="flex items-center justify-between mb-4 relative z-10">
                   <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                     <TrendingUp className="h-5 w-5" />
                   </div>
                </div>
                <div className="relative z-10">
                   <p className="text-2xl sm:text-3xl font-black tracking-tight"><span className="text-sm sm:text-base mr-1 opacity-80 font-bold">R$</span>{driverStats.grossEarnings.toFixed(2).replace('.', ',')}</p>
                   <p className="text-[10px] sm:text-xs font-bold text-emerald-100 uppercase tracking-widest mt-1">Ganhos Brutos</p>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:gap-4">
             {/* Acerto de Contas (Taxa) */}
             <div className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-100 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0 group-hover:scale-110 transition-transform">
                    <ArrowUpRight className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800">Taxa do App</h4>
                    <p className="text-[10px] sm:text-xs text-muted-foreground font-medium mt-0.5">Repasse à plataforma</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-rose-500">- R$ {driverStats.platformFee.toFixed(2).replace('.', ',')}</p>
                </div>
             </div>

             {/* Ganho Líquido */}
             <div className="bg-slate-900 rounded-[24px] p-5 shadow-xl shadow-slate-900/10 flex items-center justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-400 shrink-0">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">Ganho Líquido</h4>
                    <p className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5">O que fica pra você</p>
                  </div>
                </div>
                <div className="text-right relative z-10">
                  <p className="text-xl sm:text-2xl font-black text-white">
                    <span className="text-sm opacity-60 mr-1 font-bold">R$</span>
                    {driverStats.netEarnings.toFixed(2).replace('.', ',')}
                  </p>
                </div>
             </div>
          </div>
        </div>

        {/* === INFO SECTION === */}
        <div className="px-4 sm:px-6 mb-8">
          <div className="bg-amber-50 border border-amber-200/50 rounded-2xl p-4 flex items-start gap-3">
             <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
             <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-amber-800 mb-1">Sobre as Taxas</h4>
                <p className="text-xs text-amber-700/80 leading-relaxed font-medium">
                  A plataforma cobra uma pequena taxa fixa por entrega concluída (Sua taxa atual é <strong className="text-amber-800">R$ {driverStats.commissionRate.toFixed(2).replace('.', ',')}</strong>). Realize o pagamento (Repasse) na aba Financeiro/Suporte para evitar o bloqueio da conta.
                </p>
             </div>
          </div>
        </div>

        {/* === ACTIONS MENU === */}
        <div className="px-4 sm:px-6 mb-8">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3 ml-2">Configurações & Legal</h3>
          <div className="bg-white border border-slate-100 shadow-sm rounded-[24px] overflow-hidden">
            {[
              { icon: FileText, label: "Termos de Uso", onClick: () => navigate("/terms"), chevron: true },
              { icon: ShieldCheck, label: "Privacidade", onClick: () => navigate("/privacy"), chevron: true },
            ].map((item, i, arr) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className={cn("w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-slate-50 transition-colors active:scale-[0.99]", i < arr.length - 1 && "border-b border-slate-100")}
              >
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                  <item.icon className="h-5 w-5 text-slate-500" />
                </div>
                <span className="flex-1 text-sm font-bold text-slate-700">{item.label}</span>
                {item.chevron && <ChevronRight className="h-5 w-5 text-slate-300" />}
              </button>
            ))}
          </div>
        </div>

        {/* === SIGN OUT === */}
        <div className="px-4 sm:px-6 space-y-4 pb-8">
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold text-sm hover:text-slate-900 hover:bg-slate-50 active:scale-[0.99] transition-all shadow-sm"
          >
            <LogOut className="h-4 w-4" /> Sair da conta
          </button>

          {/* Danger Zone */}
          <div className="bg-rose-50/50 rounded-2xl p-5 border border-rose-100">
            <h3 className="text-sm font-black text-rose-600 flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4" /> Zona de Perigo
            </h3>
            <p className="text-[11px] text-rose-600/70 mb-4 font-medium leading-relaxed">
              Ao excluir sua conta, todos os dados, histórico de entregas e saldo são removidos permanentemente. Esta ação é irreversível.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-rose-600 hover:text-rose-700 hover:underline">
                  <Trash2 className="h-3 w-3" /> Excluir minha conta permanentemente
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-[32px] max-w-[90vw] sm:max-w-lg border-0 shadow-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl font-black">Tem certeza absoluta?</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm font-medium">Esta ação não pode ser desfeita. Você perderá acesso à plataforma e a todos os seus dados e ganhos.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col gap-3 mt-2">
                  <AlertDialogCancel className="rounded-xl font-bold h-12 m-0 border-slate-200">Cancelar e Manter Conta</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => { try { await deleteAccount(); navigate("/login"); } catch { } }}
                    className="bg-rose-600 text-white hover:bg-rose-700 rounded-xl font-black h-12 m-0 shadow-lg shadow-rose-600/20"
                  >
                    Sim, Excluir Minha Conta
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* === EDIT SHEET === */}
      <Sheet open={editing} onOpenChange={setEditing}>
        <SheetContent side="bottom" hideClose className="h-auto max-h-[85vh] rounded-t-[40px] border-none p-0 bg-slate-50 shadow-2xl">
          <SheetTitle className="sr-only">Editar Perfil</SheetTitle>
          <SheetDescription className="sr-only">Formulário para editar nome e telefone do entregador</SheetDescription>
          <div className="flex flex-col bg-white rounded-t-[40px] overflow-hidden">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2" />
            <div className="p-6 pb-4 flex items-center justify-between border-b border-slate-100">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Seus Dados</h3>
              <button onClick={() => setEditing(false)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors active:scale-95">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nome completo</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-[20px] border border-slate-200 bg-slate-50/50 font-bold text-slate-800 outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                    placeholder="Seu nome"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Telefone / WhatsApp</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-[20px] border border-slate-200 bg-slate-50/50 font-bold text-slate-800 outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-4 rounded-[20px] bg-primary text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25 disabled:opacity-50 hover:bg-primary/90 active:scale-[0.98] transition-all mt-4"
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                {saving ? "Salvando Alterações..." : "Confirmar e Salvar"}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </DriverLayout>
  );
}
