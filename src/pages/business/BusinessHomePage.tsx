import { useState } from "react";
import { BusinessLayout } from "@/components/business/BusinessLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Truck, Clock, CheckCircle, Loader2, ArrowLeft } from "lucide-react";
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
              <p className="text-xs text-muted-foreground">Em trânsito</p>
            </div>
            <div className="bg-card rounded-2xl p-4 text-center shadow-card">
              <CheckCircle className="h-5 w-5 text-success mx-auto mb-1" />
              <p className="text-xl font-bold text-foreground">0</p>
              <p className="text-xs text-muted-foreground">Entregues</p>
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
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);

    const { error } = await supabase.from("deliveries").insert([{
      customer_name: customerName,
      address: `${pickupAddress} → ${dropoffAddress}`,
      company_id: userId || "",
      notes: notes || null,
    }] as any);

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
          <label className="text-sm font-medium text-foreground mb-1 block">Endereço de coleta</label>
          <input
            value={pickupAddress}
            onChange={(e) => setPickupAddress(e.target.value)}
            placeholder="Rua, número, bairro"
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Endereço de entrega</label>
          <input
            value={dropoffAddress}
            onChange={(e) => setDropoffAddress(e.target.value)}
            placeholder="Rua, número, bairro"
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary"
            required
          />
        </div>

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
          disabled={submitting || !customerName || !pickupAddress || !dropoffAddress}
          className="w-full py-3 rounded-xl gradient-primary text-primary-foreground text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Criando..." : "Criar Entrega"}
        </button>
      </form>
    </div>
  );
}
