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

        const startIso = format(start, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
        const endIso = format(end, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");

        const driverRate = driver.commission_rate !== null && driver.commission_rate !== undefined ? Number(driver.commission_rate) : 0.40;

        const { data: summaryData, error: summaryError } = await supabase.rpc("get_driver_earnings_summary", {
          p_driver_id: driver.id,
          p_start_date: startIso,
          p_end_date: endIso
        });

        let grossEarnings = 0;
        let platformFee = 0;
        let netEarnings = 0;
        let periodCount = 0;

        if (!summaryError && summaryData && summaryData.length > 0) {
          grossEarnings = Number(summaryData[0].gross_earnings || 0);
          periodCount = Number(summaryData[0].total_deliveries || 0);
          
          platformFee = periodCount * driverRate;
          netEarnings = grossEarnings - platformFee;
        }

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
    } catch (e) {
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
      <div className="min-h-screen pb-24 bg-slate-50 dark:bg-zinc-950">
        
        <div className="relative bg-zinc-900 dark:bg-zinc-900 -mx-4 -mt-4 rounded-b-[2.5rem] shadow-xl overflow-hidden pb-8">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent opacity-20" />
          
          <div className="relative z-10 px-6 pt-12">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-xl font-black text-white tracking-tight">Meu Perfil</h1>
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all text-xs font-bold"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Editar
              </button>
            </div>

            <div className="flex items-center gap-5">
              <div className="relative">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-20 h-20 rounded-full border-4 border-zinc-800 shadow-2xl bg-zinc-800 overflow-hidden relative group"
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
                  ) : (
                    <div className="w-full h-full gradient-primary flex items-center justify-center">
                      <span className="text-3xl font-black text-white">{initial}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <Camera className="h-5 w-5 text-white" />}
                  </div>
                </button>
                <input ref={fileInputRef} type="file" capture="environment" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                
                <div className={cn(
                  "absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-zinc-900 flex items-center justify-center",
                  driverStats.online ? "bg-emerald-500" : "bg-zinc-500"
                )}>
                  {driverStats.online && <div className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-black text-white mb-1">{displayName}</h2>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800/80 border border-zinc-700">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-xs font-bold text-white">{driverStats.rating.toFixed(1)}</span>
                  </div>
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                    {driverStats.online ? "Online Agora" : "Offline"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 -mt-6 relative z-20">
          
          <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-5 shadow-sm border border-slate-100 dark:border-zinc-800 mb-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-zinc-800/50">
              <h3 className="text-sm font-black text-slate-800 dark:text-zinc-100 uppercase tracking-widest flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" /> Painel Financeiro
              </h3>
              <select 
                value={period} 
                onChange={(e) => setPeriod(e.target.value)}
                className="bg-slate-50 dark:bg-zinc-800 border-none text-slate-600 dark:text-zinc-300 text-xs font-bold rounded-xl px-3 py-1.5 outline-none cursor-pointer"
              >
                <option value="today">Hoje</option>
                <option value="yesterday">Ontem</option>
                <option value="week">Semana</option>
                <option value="month">MÃªs</option>
                <option value="custom">Outro</option>
              </select>
            </div>

            {period === "custom" && (
              <input 
                type="date" 
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-foreground mb-4 outline-none"
              />
            )}

            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl p-5 mb-4 border border-emerald-100 dark:border-emerald-900/50">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">Seu Ganho LÃ­quido</p>
                  <p className="text-[11px] font-medium text-emerald-700/70 dark:text-emerald-400/70">Livre de taxas</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <p className="text-4xl font-black text-emerald-700 dark:text-emerald-400 tracking-tighter">
                <span className="text-lg font-bold mr-1 opacity-70">R$</span>
                {driverStats.netEarnings.toFixed(2).replace('.', ',')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-4 border border-slate-100 dark:border-zinc-800/50 flex flex-col justify-between">
                <Package className="h-5 w-5 text-slate-400 dark:text-zinc-500 mb-3" />
                <div>
                  <p className="text-xl font-black text-slate-800 dark:text-zinc-100">{driverStats.periodDeliveries}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-400">Corridas ConcluÃ­das</p>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-900/30 flex flex-col justify-between">
                <Wallet className="h-5 w-5 text-blue-400 mb-3" />
                <div>
                  <p className="text-xl font-black text-blue-600 dark:text-blue-500 truncate">
                    R$ {driverStats.grossEarnings.toFixed(2).replace('.', ',')}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 dark:text-blue-400/80 mt-1">Taxas Recebidas</p>
                </div>
              </div>

              <div className="bg-rose-50 dark:bg-rose-950/20 rounded-2xl p-4 border border-rose-100 dark:border-rose-900/30 flex flex-col justify-between">
                <ArrowUpRight className="h-5 w-5 text-rose-400 mb-3" />
                <div>
                  <p className="text-xl font-black text-rose-600 dark:text-rose-500 truncate">
                    - R$ {driverStats.platformFee.toFixed(2).replace('.', ',')}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500 dark:text-rose-400/80 mt-1">Devido ao App</p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-4 border border-slate-100 dark:border-zinc-800/50 flex flex-col justify-between">
                <Star className="h-5 w-5 text-amber-400 mb-3" />
                <div>
                  <p className="text-xl font-black text-slate-800 dark:text-zinc-100">{driverStats.deliveries}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-400">Total Histórico</p>
                </div>
              </div>
            </div>

            <div className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                <h4 className="text-xs font-black uppercase text-slate-700 dark:text-zinc-300">Entenda seus ganhos</h4>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed font-medium">
                Você recebe <strong className="text-slate-700 dark:text-zinc-200">100% da Taxa de Entrega</strong> paga pelo cliente. A plataforma cobra apenas <strong className="text-slate-700 dark:text-zinc-200">R$ {driverStats.commissionRate.toFixed(2).replace('.', ',')}</strong> de repasse por cada entrega concluída.
              </p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed font-medium mt-1">
                Lembre-se de realizar o pagamento do repasse via Pix na aba Suporte para evitar bloqueios automáticos da sua conta.
              </p>
            </div>
          </div>

          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-3 ml-4">Legal & Conta</h3>
          <div className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-zinc-800 overflow-hidden mb-6">
            <button onClick={() => navigate("/terms")} className="w-full flex items-center gap-4 px-6 py-4 border-b border-slate-100 dark:border-zinc-800/50 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-slate-500 dark:text-zinc-400" />
              </div>
              <span className="flex-1 text-sm font-bold text-slate-700 dark:text-zinc-300 text-left">Termos de Uso</span>
              <ChevronRight className="h-4 w-4 text-slate-300 dark:text-zinc-600" />
            </button>
            <button onClick={() => navigate("/privacy")} className="w-full flex items-center gap-4 px-6 py-4 border-b border-slate-100 dark:border-zinc-800/50 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-4 w-4 text-slate-500 dark:text-zinc-400" />
              </div>
              <span className="flex-1 text-sm font-bold text-slate-700 dark:text-zinc-300 text-left">Política de Privacidade</span>
              <ChevronRight className="h-4 w-4 text-slate-300 dark:text-zinc-600" />
            </button>
            <button onClick={signOut} className="w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                <LogOut className="h-4 w-4 text-slate-500 dark:text-zinc-400" />
              </div>
              <span className="flex-1 text-sm font-bold text-slate-700 dark:text-zinc-300 text-left">Sair da Conta</span>
            </button>
          </div>

          <div className="text-center px-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="text-[11px] font-black uppercase tracking-widest text-rose-500/70 hover:text-rose-500 transition-colors py-2">
                  Excluir Conta Permanentemente
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-[32px] max-w-[90vw] sm:max-w-lg border-0 shadow-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl font-black">Tem certeza absoluta?</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm font-medium">VocÃª perderÃ¡ o acesso e todo o histÃ³rico. Essa aÃ§Ã£o Ã© irreversÃ­vel.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col gap-3 mt-4">
                  <AlertDialogCancel className="rounded-xl font-bold h-12 m-0 bg-slate-100 border-none">Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => { try { await deleteAccount(); navigate("/login"); } catch (e) { } }}
                    className="bg-rose-500 text-white hover:bg-rose-600 rounded-xl font-black h-12 m-0 shadow-lg shadow-rose-500/30"
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
        <SheetContent side="bottom" hideClose className="h-auto max-h-[85vh] rounded-t-[2.5rem] border-none p-0 bg-white dark:bg-zinc-900 shadow-2xl">
          <SheetTitle className="sr-only">Editar Perfil</SheetTitle>
          <SheetDescription className="sr-only">FormulÃ¡rio para editar nome e telefone do entregador</SheetDescription>
          <div className="flex flex-col">
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full mx-auto mt-4 mb-2" />
            <div className="p-6 pb-4 flex items-center justify-between border-b border-slate-100 dark:border-zinc-800">
              <h3 className="text-xl font-black text-slate-800 dark:text-zinc-100 tracking-tight">Editar Perfil</h3>
              <button onClick={() => setEditing(false)} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors">
                <X className="h-5 w-5 text-slate-500 dark:text-zinc-400" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-[1.5rem] border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 font-bold text-slate-800 dark:text-zinc-100 outline-none focus:border-primary focus:bg-white dark:focus:bg-zinc-900 transition-all"
                    placeholder="Seu nome"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">WhatsApp</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-[1.5rem] border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 font-bold text-slate-800 dark:text-zinc-100 outline-none focus:border-primary focus:bg-white dark:focus:bg-zinc-900 transition-all"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-4 rounded-[1.5rem] bg-primary text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25 disabled:opacity-50 mt-4 active:scale-95 transition-all"
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                {saving ? "Salvando..." : "Salvar AlteraÃ§Ãµes"}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </DriverLayout>
  );
}
