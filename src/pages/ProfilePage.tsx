// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { DriverLayout } from "@/components/driver/DriverLayout";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfile, uploadAvatar } from "@/services/users";
import { useToast } from "@/hooks/use-toast";
import {
  Camera, Loader2, User, Phone, Trash2, AlertCircle, FileText,
  ShieldCheck, LogOut, Star, Package, TrendingUp, Check,
  Edit3, X, ChevronRight, MapPin, Bike, Clock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";

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
  const [uploadingCover, setUploadingCover] = useState(false);
  const [editing, setEditing] = useState(false);
  const [coverUrl, setCoverUrl] = useState("");
  const [driverStats, setDriverStats] = useState({ deliveries: 0, rating: 0, earnings: 0, online: false });

  useEffect(() => {
    setFullName(profile?.full_name || "");
    setPhone(profile?.phone || "");
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    fetchDriverData();
  }, [user]);

  const fetchDriverData = async () => {
    try {
      // Get driver record
      const { data: driver } = await supabase
        .from("delivery_drivers")
        .select("id, rating, is_online")
        .eq("user_id", user.id)
        .maybeSingle();

      if (driver) {
        setCoverUrl(localStorage.getItem(`driver_cover_${user.id}`) || "");
        // Count deliveries
        const { count } = await supabase
          .from("deliveries")
          .select("id", { count: "exact", head: true })
          .eq("driver_id", driver.id)
          .eq("status", "delivered");

        setDriverStats({
          deliveries: count || 0,
          rating: driver.rating || 5.0,
          earnings: 0,
          online: driver.is_online || false,
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

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingCover(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/cover-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      localStorage.setItem(`driver_cover_${user.id}`, publicUrl);
      setCoverUrl(publicUrl);
      toast({ title: "Capa atualizada!" });
    } catch (err: any) {
      toast({ title: "Erro na capa", description: err.message, variant: "destructive" });
    } finally {
      setUploadingCover(false);
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
      <div className="min-h-screen pb-24">
        {/* === COVER PHOTO === */}
        <div className="relative h-44 bg-gradient-to-br from-primary via-orange-500 to-amber-400 -mx-4 -mt-4">
          {coverUrl ? (
            <img src={coverUrl} className="w-full h-full object-cover" alt="Capa" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
              <Bike className="h-24 w-24 text-white" />
            </div>
          )}
          {/* Online dot */}
          <div className={cn("absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-sm border border-white/20",
            driverStats.online ? "bg-green-500/80 text-white" : "bg-black/40 text-white/70"
          )}>
            <div className={cn("w-1.5 h-1.5 rounded-full", driverStats.online ? "bg-white animate-pulse" : "bg-white/40")} />
            {driverStats.online ? "Online" : "Offline"}
          </div>
        </div>

        {/* === AVATAR OVERLAPPING === */}
        <div className="px-4 -mt-16 mb-4 flex items-end justify-between">
          <div className="relative">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-32 h-32 rounded-full border-4 border-background shadow-xl bg-background overflow-hidden hover:scale-105 transition-transform"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
              ) : (
                <div className="w-full h-full gradient-primary flex items-center justify-center">
                  <span className="text-4xl font-black text-white">{initial}</span>
                </div>
              )}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-foreground border-2 border-background flex items-center justify-center shadow-lg"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin text-background" /> : <Camera className="h-4 w-4 text-background" />}
            </button>
            <input ref={fileInputRef} type="file" capture="environment" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>

          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border font-bold text-sm text-foreground hover:bg-muted transition-all mt-16"
          >
            <Edit3 className="h-4 w-4" />
            Editar
          </button>
        </div>

        {/* === NAME & INFO === */}
        <div className="px-4 mb-5">
          <h1 className="text-xl font-black text-foreground">{displayName}</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          {profile?.phone && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Phone className="h-3 w-3" /> {profile.phone}
            </p>
          )}
        </div>

        {/* === STATS ROW === */}
        <div className="px-4 mb-6">
          <div className="grid grid-cols-3 gap-0 border border-border rounded-2xl overflow-hidden bg-card">
            {[
              { value: driverStats.deliveries, label: 'Entregas', icon: Package },
              { value: driverStats.rating.toFixed(1), label: 'Avaliação', icon: Star },
              { value: `R$0`, label: 'Esta semana', icon: TrendingUp },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={cn("flex flex-col items-center justify-center py-4", i < 2 && "border-r border-border")}
              >
                <stat.icon className="h-4 w-4 text-primary mb-1" />
                <span className="text-lg font-black text-foreground">{stat.value}</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* === ACTIONS MENU === */}
        <div className="px-4 bg-card border border-border rounded-2xl overflow-hidden mb-6 mx-4">
          {[
            { icon: FileText, label: "Termos de Uso", onClick: () => navigate("/terms"), chevron: true },
            { icon: ShieldCheck, label: "Privacidade", onClick: () => navigate("/privacy"), chevron: true },
          ].map((item, i, arr) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={cn("w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/40 transition-colors", i < arr.length - 1 && "border-b border-border/50")}
            >
              <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <item.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="flex-1 text-sm font-bold text-foreground">{item.label}</span>
              {item.chevron && <ChevronRight className="h-4 w-4 text-muted-foreground/40" />}
            </button>
          ))}
        </div>

        {/* === SIGN OUT === */}
        <div className="px-4 space-y-3 pb-6">
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-border text-muted-foreground font-bold text-sm hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 transition-all"
          >
            <LogOut className="h-4 w-4" /> Sair da conta
          </button>

          {/* Danger Zone */}
          <div className="bg-destructive/5 rounded-2xl p-5 border border-destructive/20">
            <h3 className="text-sm font-bold text-destructive flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4" /> Zona de Perigo
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Ao excluir sua conta, todos os dados são removidos permanentemente.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="flex items-center gap-2 text-xs font-bold text-destructive hover:underline">
                  <Trash2 className="h-4 w-4" /> Excluir minha conta
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl max-w-[90vw] sm:max-w-lg">
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col gap-2">
                  <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => { try { await deleteAccount(); navigate("/login"); } catch { } }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                  >
                    Sim, excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* === EDIT SHEET === */}
      <Sheet open={editing} onOpenChange={setEditing}>
        <SheetContent side="bottom" hideClose className="h-[70vh] rounded-t-3xl border-none p-0">
          <div className="h-full flex flex-col bg-background">
            <div className="p-6 pb-4 flex items-center justify-between border-b border-border">
              <h3 className="text-xl font-black">Editar Perfil</h3>
              <button onClick={() => setEditing(false)} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nome completo</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-border bg-muted/30 font-medium outline-none focus:border-primary transition-all"
                    placeholder="Seu nome"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-border bg-muted/30 font-medium outline-none focus:border-primary transition-all"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-4 rounded-2xl gradient-primary text-primary-foreground font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {saving ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </DriverLayout>
  );
}

