import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Upload, Check, ChevronRight, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const STEPS = ["Dados da Empresa", "Endereço", "Acesso"];

export function CreateCompanyDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    companyName: "", responsibleName: "", phone: "", document: "",
    address: "", city: "", state: "", zipCode: "",
    email: "", password: "",
  });

  const set = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const validate = () => {
    if (step === 0 && (!form.companyName || !form.phone || !form.document)) {
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
          email: form.email, password: form.password,
          fullName: form.responsibleName || form.companyName,
          phone: form.phone, document: form.document, role: "company",
          companyName: form.companyName,
          address: [form.address, form.city, form.state, form.zipCode].filter(Boolean).join(", "),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Upload logo if provided
      if (logoFile && data?.userId) {
        const ext = logoFile.name.split(".").pop();
        const path = `${data.userId}/logo.${ext}`;
        await supabase.storage.from("avatars").upload(path, logoFile, { upsert: true });
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", data.userId);
      }

      toast.success("Empresa criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      resetForm();
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar empresa");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(0);
    setForm({ companyName: "", responsibleName: "", phone: "", document: "", address: "", city: "", state: "", zipCode: "", email: "", password: "" });
    setLogoFile(null);
    setLogoPreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Building2 className="h-4 w-4" />Cadastrar Empresa</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Empresa</DialogTitle>
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

        {/* Step 0: Company Data */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3">
              <div onClick={() => fileRef.current?.click()} className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center cursor-pointer hover:opacity-80 overflow-hidden border-2 border-dashed border-border">
                {logoPreview ? <img src={logoPreview} className="w-full h-full object-cover" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
              <span className="text-xs text-muted-foreground">Logo da empresa</span>
            </div>
            <div>
              <Label>Nome da empresa *</Label>
              <Input value={form.companyName} onChange={e => set("companyName", e.target.value)} placeholder="Ex: Restaurante do João" />
            </div>
            <div>
              <Label>Nome do responsável</Label>
              <Input value={form.responsibleName} onChange={e => set("responsibleName", e.target.value)} placeholder="Ex: João da Silva" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telefone *</Label>
                <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="(65) 99999-9999" />
              </div>
              <div>
                <Label>CNPJ/CPF *</Label>
                <Input value={form.document} onChange={e => set("document", e.target.value)} placeholder="00.000.000/0001-00" />
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Address */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Endereço</Label>
              <Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Rua, número, bairro" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cidade</Label>
                <Input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Cuiabá" />
              </div>
              <div>
                <Label>Estado</Label>
                <Input value={form.state} onChange={e => set("state", e.target.value)} placeholder="MT" maxLength={2} />
              </div>
            </div>
            <div>
              <Label>CEP</Label>
              <Input value={form.zipCode} onChange={e => set("zipCode", e.target.value)} placeholder="78000-000" />
            </div>
          </div>
        )}

        {/* Step 2: Access */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="empresa@email.com" />
            </div>
            <div>
              <Label>Senha *</Label>
              <Input type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <p className="text-xs text-muted-foreground">A empresa poderá fazer login imediatamente após a criação.</p>
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
              {loading ? "Criando..." : "Criar Empresa"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
