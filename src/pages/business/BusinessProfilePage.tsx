// @ts-nocheck
import { useState, useEffect } from "react";
import { BusinessLayout } from "@/components/business/BusinessLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Store, Camera, ImagePlus, Loader2, Save, User, MapPin, Phone, 
  Eye, Info, CheckCircle2, Pencil, X, Clock3
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function BusinessProfilePage() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Company data
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("restaurante");
  const [isOpen, setIsOpen] = useState(true);
  const [businessHours, setBusinessHours] = useState("");
  const [gallery, setGallery] = useState<string[]>([]);

  // Edit states for overlays
  const [isEditingLogo, setIsEditingLogo] = useState(false);
  const [isEditingCover, setIsEditingCover] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchCompanyData();
  }, [user]);

  const fetchCompanyData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: company } = await supabase
        .from("companies")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (company) {
        setCompanyId(company.id);
        setStoreName(company.name || "");
        setPhone(company.phone || "");
        setAddress(company.address || "");
        setDescription(company.description || "");
        setLogoUrl(company.logo_url || "");
        setCoverUrl(company.cover_url || "");
        setCategory(company.category || "restaurante");
        setIsOpen(company.is_open ?? true);
        setBusinessHours(company.business_hours || "");
        setGallery(company.gallery || []);
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') => {
    const file = event.target.files?.[0];
    if (!file || !companyId) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande! Limite de 5MB.");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${companyId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('store-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('store-assets')
        .getPublicUrl(filePath);

      if (type === 'logo') setLogoUrl(data.publicUrl);
      else setCoverUrl(data.publicUrl);

      toast.success("Foto enviada com sucesso!");
    } catch (error: any) {
      toast.error("Falha ao enviar imagem.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleGalleryUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !companyId) return;

    setIsUploading(true);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 5 * 1024 * 1024) continue;

        const fileExt = file.name.split('.').pop();
        const fileName = `gallery-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${companyId}/gallery/${fileName}`;

        const { error } = await supabase.storage.from('store-assets').upload(filePath, file);
        if (!error) {
          const { data } = supabase.storage.from('store-assets').getPublicUrl(filePath);
          newUrls.push(data.publicUrl);
        }
      }
      setGallery(prev => [...prev, ...newUrls]);
      toast.success("Galeria atualizada!");
    } catch (error) {
      toast.error("Erro no upload");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!companyId) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("companies")
        .update({
          name: storeName,
          phone,
          address,
          description,
          logo_url: logoUrl,
          cover_url: coverUrl,
          category: category,
          is_open: isOpen,
          business_hours: businessHours,
          gallery: gallery,
        })
        .eq("id", companyId);

      if (error) throw error;
      toast.success("Perfil Social atualizado!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <BusinessLayout title="Perfil">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </BusinessLayout>
    );
  }

  return (
    <BusinessLayout title="Editor de Perfil">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Left Column */}
        <div className="xl:col-span-8 space-y-6">
          <div className="bg-card border border-border rounded-[2.5rem] shadow-card overflow-hidden">
            <div className="relative group/banner h-64 md:h-80 bg-muted">
               {coverUrl ? (
                 <img src={coverUrl} className="w-full h-full object-cover" alt="Banner" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                    <Camera className="h-12 w-12 text-muted-foreground/20" />
                 </div>
               )}
               
               <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/banner:opacity-100 transition-opacity flex items-center justify-center">
                  <label className="cursor-pointer px-6 py-2.5 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-full font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-white/30 transition-all shadow-2xl">
                    <Pencil className="h-4 w-4" /> Alterar Banner
                    <input type="file" capture="environment" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'cover')} />
                  </label>
               </div>

               <div className="absolute -bottom-16 left-8 group/avatar">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] bg-white p-2 shadow-2xl border-4 border-card relative">
                     <div className="w-full h-full rounded-[2rem] bg-muted overflow-hidden flex items-center justify-center relative">
                        {logoUrl ? (
                          <img src={logoUrl} className="w-full h-full object-cover" alt="Logo" />
                        ) : (
                          <Store className="h-10 w-10 text-muted-foreground/30" />
                        )}
                        <label className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                           <Camera className="h-8 w-8 text-white" />
                           <input type="file" capture="environment" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} />
                        </label>
                     </div>
                  </div>
               </div>
            </div>

            <div className="pt-20 px-8 pb-8 space-y-10">
               <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-1">
                     <h2 className="text-3xl font-black text-foreground tracking-tight">{storeName || "Minha Loja"}</h2>
                     <div className="flex items-center gap-2 mt-1">
                        <div className={cn("h-2.5 w-2.5 rounded-full", isOpen ? "bg-green-500 animate-pulse" : "bg-red-500")} />
                        <span className={cn("text-[11px] font-black uppercase tracking-widest", isOpen ? "text-green-600" : "text-red-600")}>
                           {isOpen ? "Sua Loja estÃ¡ aberta" : "Sua Loja estÃ¡ fechada"}
                        </span>
                      </div>
                  </div>
                  <button 
                     onClick={() => handleSave()}
                     className="px-8 py-3 rounded-2xl bg-foreground text-background font-black text-sm uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-xl shadow-foreground/10"
                  >
                     {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publicar Perfil"}
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-border/50">
                  <div className="space-y-6">
                     <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                        <Info className="h-3 w-3" /> Sobre o NegÃ³cio
                     </div>
                     <div className="space-y-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Nome da Loja</label>
                           <input value={storeName} onChange={(e) => setStoreName(e.target.value)} className="w-full px-5 py-3.5 rounded-2xl border border-border bg-background focus:ring-4 focus:ring-primary/5 transition-all outline-none font-bold" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Bio / DescriÃ§Ã£o</label>
                           <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Fale um pouco sobre o que vocÃª vende..." className="w-full px-5 py-3.5 rounded-2xl border border-border bg-background focus:ring-4 focus:ring-primary/5 transition-all outline-none font-medium text-sm min-h-[100px] resize-none" />
                        </div>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                        <Phone className="h-3 w-3" /> Contato e Galeria
                     </div>
                     <div className="space-y-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">WhatsApp</label>
                           <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-5 py-3.5 rounded-2xl border border-border bg-background outline-none font-bold" placeholder="(00) 00000-0000" />
                        </div>

                        <div className="pt-4 border-t border-border/40 space-y-4">
                            <div className="flex items-center justify-between">
                               <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Galeria</div>
                               <label className="cursor-pointer text-primary text-[10px] font-black uppercase tracking-widest">Adicionar Fotos
                                  <input type="file" capture="environment" multiple accept="image/*" className="hidden" onChange={handleGalleryUpload} />
                               </label>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                               {gallery.map((url, idx) => (
                                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group/item">
                                     <img src={url} className="w-full h-full object-cover" />
                                     <button onClick={() => setGallery(prev => prev.filter(u => u !== url))} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-md opacity-0 group-hover/item:opacity-100 transition-opacity"><X className="h-3 w-3" /></button>
                                  </div>
                               ))}
                            </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Right Column: Preview */}
        <div className="xl:col-span-4 hidden xl:block">
           <div className="sticky top-28 bg-muted/30 border border-border/50 rounded-[3rem] p-8 text-center space-y-6">
              <div className="flex items-center justify-center gap-2 text-primary">
                 <Eye className="h-5 w-5" />
                 <h3 className="font-black text-xs uppercase tracking-widest">Marketplace View</h3>
              </div>
              <div className="w-full max-w-[260px] mx-auto aspect-[9/18] bg-foreground rounded-[3rem] p-2.5 shadow-2xl overflow-hidden">
                 <div className="w-full h-full bg-background rounded-[2.2rem] overflow-hidden flex flex-col relative text-left">
                    <div className="h-20 bg-muted relative">
                       {coverUrl && <img src={coverUrl} className="w-full h-full object-cover" />}
                       <div className="absolute -bottom-3 left-3 w-10 h-10 rounded-xl bg-white p-1 shadow-lg">
                          <div className="w-full h-full rounded-lg bg-muted overflow-hidden">
                             {logoUrl && <img src={logoUrl} className="w-full h-full object-cover" />}
                          </div>
                       </div>
                    </div>
                    <div className="mt-5 px-4 space-y-4">
                       <div>
                          <p className="text-[10px] font-black text-foreground">{storeName || "Sua Loja"}</p>
                          <p className="text-[7px] text-muted-foreground font-bold italic">{address}</p>
                       </div>
                       <div className="h-14 bg-muted/40 rounded-xl p-2">
                          <p className="text-[7px] text-muted-foreground italic leading-tight">{description || "Sua descriÃ§Ã£o aqui..."}</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </BusinessLayout>
  );
}

