import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Upload, Check, ChevronRight, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const STEPS = ["Dados Pessoais", "Veículo", "Acesso"];

export function CreateDriverDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    fullName: "", phone: "", document: "", email: "", password: "",
    vehicleType: "motorcycle", vehiclePlate: "", commission: "10",
  });

  const set = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const validate = () => {
    if (step === 0 && (!form.fullName || !form.phone || !form.document)) {
      toast.error("Preencha todos os campos obrigatórios");
      return false;
    }
    if (step === 2 && (!form.email || !form.password || form.password.length < 6)) {
      toast.error("Email e senha (mín. 6 caracteres) são obrigatórios");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-admin", {
        body: {
          email: form.email, password: form.password, fullName: form.fullName,
          phone: form.phone, document: form.document, role: "driver",
          vehicleType: form.vehicleType, vehiclePlate: form.vehiclePlate,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Upload avatar if provided
      if (avatarFile && data?.userId) {
        const ext = avatarFile.name.split(".").pop();
        const path = `${data.userId}/avatar.${ext}`;
        await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", data.userId);
        await supabase.from("delivery_drivers").update({ avatar_url: urlData.publicUrl }).eq("user_id", data.userId);
      }

      toast.success("Entregador criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      resetForm();
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar entregador");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(0);
    setForm({ fullName: "", phone: "", document: "", email: "", password: "", vehicleType: "motorcycle", vehiclePlate: "", commission: "10" });
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2"><UserPlus className="h-4 w-4" />Cadastrar Entregador</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Entregador</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-4">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors ${i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:inline ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        {/* Step 0: Personal Data */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3">
              <div onClick={() => fileRef.current?.click()} className="w-20 h-20 rounded-full bg-muted flex items-center justify-center cursor-pointer hover:opacity-80 overflow-hidden border-2 border-dashed border-border">
                {avatarPreview ? <img src={avatarPreview} className="w-full h-full object-cover" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
              <span className="text-xs text-muted-foreground">Foto de perfil</span>
            </div>
            <div>
              <Label>Nome completo *</Label>
              <Input value={form.fullName} onChange={e => set("fullName", e.target.value)} placeholder="Ex: João da Silva" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telefone *</Label>
                <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="(65) 99999-9999" />
              </div>
              <div>
                <Label>CPF *</Label>
                <Input value={form.document} onChange={e => set("document", e.target.value)} placeholder="000.000.000-00" />
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Vehicle */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Tipo de veículo</Label>
              <Select value={form.vehicleType} onValueChange={v => set("vehicleType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="motorcycle">🏍️ Moto</SelectItem>
                  <SelectItem value="bicycle">🚲 Bicicleta</SelectItem>
                  <SelectItem value="car">🚗 Carro</SelectItem>
                  <SelectItem value="van">🚐 Van</SelectItem>
                  <SelectItem value="truck">🚛 Caminhão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Placa</Label>
              <Input value={form.vehiclePlate} onChange={e => set("vehiclePlate", e.target.value.toUpperCase())} placeholder="ABC-1234" />
            </div>
            <div>
              <Label>Comissão (%)</Label>
              <Input type="number" min="0" max="100" value={form.commission} onChange={e => set("commission", e.target.value)} />
            </div>
          </div>
        )}

        {/* Step 2: Access */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="entregador@email.com" />
            </div>
            <div>
              <Label>Senha *</Label>
              <Input type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <p className="text-xs text-muted-foreground">O entregador poderá fazer login imediatamente após a criação.</p>
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button type="button" variant="outline" onClick={() => step > 0 ? setStep(step - 1) : setOpen(false)}>
            <ChevronLeft className="h-4 w-4 mr-1" />{step > 0 ? "Voltar" : "Cancelar"}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={() => validate() && setStep(step + 1)}>
              Próximo<ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Criando..." : "Criar Entregador"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
