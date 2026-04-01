import { useState, useEffect } from "react";
import { BusinessLayout } from "@/components/business/BusinessLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Truck, Clock, CheckCircle, MapPin, DollarSign, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function BusinessHomePage() {
  const { user, profile } = useAuth();
  const [showNewDelivery, setShowNewDelivery] = useState(false);

  return (
    <BusinessLayout>
      {showNewDelivery ? (
        <NewDeliveryForm onClose={() => setShowNewDelivery(false)} userId={user?.id} />
      ) : (
        <div className="space-y-6">
          <div className="text-center pt-4">
            <h1 className="text-2xl font-bold text-foreground">
              Olá, {profile?.full_name || "Lojista"} 👋
            </h1>
            <p className="text-muted-foreground">Gerencie suas entregas</p>
          </div>

          <button
            onClick={() => setShowNewDelivery(true)}
            className="w-full py-4 rounded-2xl gradient-primary text-primary-foreground text-lg font-bold flex items-center justify-center gap-3"
          >
            <Plus className="h-6 w-6" />
            Nova Entrega
          </button>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card rounded-2xl p-4 text-center shadow-card">
              <Clock className="h-5 w-5 text-warning mx-auto mb-1" />
              <p className="text-xl font-bold text-foreground">0</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
            <div className="bg-card rounded-2xl p-4 text-center shadow-card">
              <Truck className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-xl font-bold text-foreground">0</p>
              <p className="text-xs text-muted-foreground">Em rota</p>
            </div>
            <div className="bg-card rounded-2xl p-4 text-center shadow-card">
              <CheckCircle className="h-5 w-5 text-success mx-auto mb-1" />
              <p className="text-xl font-bold text-foreground">0</p>
              <p className="text-xs text-muted-foreground">Concluídas</p>
            </div>
          </div>

          <div className="bg-card rounded-2xl p-6 text-center shadow-card">
            <Truck className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma entrega recente</p>
          </div>
        </div>
      )}
    </BusinessLayout>
  );
}

function NewDeliveryForm({ onClose, userId }: { onClose: () => void; userId?: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState(false);

  const [regionInfo, setRegionInfo] = useState<{ name: string; price: number; color: string } | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("companies")
      .select("id")
      .eq("user_id", userId)
      .single()
      .then(({ data }) => {
        if (data) setCompanyId(data.id);
      });
  }, [userId]);

  const lookupAddress = async () => {
    if (address.length < 5) return;
    setSearching(true);
    setRegionInfo(null);
    setCoords(null);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      const results = await res.json();

      if (results.length === 0) {
        toast({ title: "Endereço não encontrado", description: "Tente um endereço mais detalhado", variant: "destructive" });
        setSearching(false);
        return;
      }

      const lat = parseFloat(results[0].lat);
      const lng = parseFloat(results[0].lon);
      setCoords({ lat, lng });

      const { data: regionId } = await supabase.rpc("find_region_for_point", {
        _lat: lat,
        _lng: lng,
      });

      if (regionId) {
        const { data: region } = await supabase
          .from("regions")
          .select("name, price, color")
          .eq("id", regionId)
          .single();

        if (region) {
          setRegionInfo({ name: region.name, price: Number(region.price), color: region.color });
        }
      } else {
        setRegionInfo(null);
        toast({ title: "Região não encontrada", description: "Este endereço não está em nenhuma região cadastrada" });
      }
    } catch {
      toast({ title: "Erro ao buscar endereço", variant: "destructive" });
    }

    setSearching(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) {
      toast({ title: "Erro", description: "Empresa não encontrada", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from("deliveries").insert({
      company_id: companyId,
      customer_name: customerName,
      address,
      value: regionInfo?.price ?? 0,
      commission: (regionInfo?.price ?? 0) * 0.15,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
      region_id: null,
      notes: notes || null,
    });

    if (error) {
      toast({ title: "Erro ao criar entrega", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Entrega criada!", description: "Aguardando um entregador aceitar" });
      qc.invalidateQueries({ queryKey: ["deliveries"] });
      onClose();
    }

    setSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <button onClick={onClose} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <h2 className="text-xl font-bold text-foreground">Nova Entrega</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Nome do cliente</label>
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Nome do destinatário"
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Endereço de entrega</label>
          <div className="flex gap-2">
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, número, bairro, cidade"
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary"
              required
            />
            <button type="button" onClick={lookupAddress} disabled={searching} className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {regionInfo && (
          <div className="bg-success/10 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: regionInfo.color }} />
                <span className="text-sm font-medium text-foreground">{regionInfo.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-success" />
                <span className="text-lg font-bold text-success">
                  R$ {regionInfo.price.toFixed(2)}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Preço calculado automaticamente pela região</p>
          </div>
        )}

        {coords && !regionInfo && !searching && (
          <div className="bg-warning/10 rounded-xl p-3 text-sm text-warning">
            ⚠️ Endereço localizado mas fora de qualquer região cadastrada. O preço será R$ 0,00.
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Observações (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Referências, instruções..."
            rows={2}
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !customerName || !address}
          className="w-full py-3 rounded-xl gradient-primary text-primary-foreground text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Criando..." : `Criar Entrega${regionInfo ? ` • R$ ${regionInfo.price.toFixed(2)}` : ""}`}
        </button>
      </form>
    </div>
  );
}
