import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * FUNÇÕES
 */
export async function calculateDeliveryFee(lat: number, lng: number) {
  // Chama a função RPC do Postgres que criamos (find_region_for_point)
  const { data: regionId, error: regionError } = await supabase.rpc("find_region_for_point", {
    _lat: lat,
    _lng: lng,
  });

  if (regionError) throw regionError;
  if (!regionId) return { fee: 0, regionId: null, message: "Fora da área de cobertura" };

  const { data: region, error: regError } = await supabase
    .from("regions")
    .select("price")
    .eq("id", regionId)
    .single();

  if (regError) throw regError;

  return { fee: region.price, regionId: regionId };
}

export async function createOrder(orderData: {
  company_id: string;
  customer_id: string;
  items: { product_id: string; quantity: number; price: number }[];
  total: number;
}) {
  // 1. Criar o pedido (Order)
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      company_id: orderData.company_id,
      customer_id: orderData.customer_id,
      total: orderData.total,
      status: "pending",
    })
    .select()
    .single();

  if (orderError) throw orderError;

  // 2. Criar os itens do pedido (Order Items)
  const orderItems = orderData.items.map((item) => ({
    order_id: order.id,
    product_id: item.product_id,
    quantity: item.quantity,
    price: item.price,
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
  if (itemsError) throw itemsError;

  return order;
}

/**
 * HOOKS
 */
export function useCalculateDeliveryFee() {
  return useMutation({
    mutationFn: ({ lat, lng }: { lat: number; lng: number }) => calculateDeliveryFee(lat, lng),
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useOrders(customerId?: string) {
  return useQuery({
    queryKey: ["orders", customerId],
    queryFn: async () => {
      let query = supabase.from("orders").select("*, order_items(*), companies(name)");
      if (customerId) query = query.eq("customer_id", customerId);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });
}
