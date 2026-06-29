-- Migration: 20260629000000_fix_delivery_rpc_backward_status
-- Description: Prevent update_delivery_status_safe from downgrading order status from 'ready' to 'preparing'

BEGIN;

CREATE OR REPLACE FUNCTION public.update_delivery_status_safe(
  p_delivery_id UUID,
  p_status TEXT,
  p_driver_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_db_status public.delivery_status;
  v_now TIMESTAMPTZ := now();
  v_order_status TEXT;
  v_current_order_status TEXT;
BEGIN
  -- 1. Validate authentication
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  -- 2. Convert text to enum status
  BEGIN
    v_db_status := p_status::public.delivery_status;
  EXCEPTION WHEN OTHERS THEN
    -- Try mapping delivered to completed or in_transit to in_route
    IF p_status = 'delivered' THEN
      v_db_status := 'completed'::public.delivery_status;
    ELSIF p_status = 'in_transit' THEN
      v_db_status := 'in_route'::public.delivery_status;
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Status inválido: ' || p_status);
    END IF;
  END;

  -- 3. Update the delivery record (bypassing RLS because of SECURITY DEFINER)
  UPDATE public.deliveries
  SET 
    status = v_db_status,
    updated_at = v_now,
    driver_id = CASE WHEN p_driver_id IS NOT NULL THEN p_driver_id ELSE driver_id END,
    delivered_at = CASE WHEN v_db_status = 'completed' THEN v_now ELSE delivered_at END,
    accepted_at = CASE WHEN v_db_status = 'accepted' THEN v_now ELSE accepted_at END,
    collected_at = CASE WHEN v_db_status = 'collecting' THEN v_now ELSE collected_at END
  WHERE id = p_delivery_id
    -- ANTI-STEAL LOCK: Se for aceitar, a corrida DEVE estar pending ou broadcasted e o driver_id DEVE estar nulo
    AND (
      v_db_status != 'accepted' 
      OR (status IN ('pending', 'broadcasted') AND driver_id IS NULL)
    );

  -- Se tentou aceitar e a query afetou 0 linhas (alguém roubou primeiro)
  IF v_db_status = 'accepted' AND NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta corrida já foi aceita por outro entregador.');
  END IF;

  -- 4. Also update any associated order status safely
  BEGIN
    IF v_db_status = 'accepted' THEN 
      v_order_status := 'confirmed';
    ELSIF v_db_status = 'collecting' THEN 
      v_order_status := 'preparing';
    ELSIF v_db_status = 'in_route' THEN 
      v_order_status := 'in_route';
    ELSIF v_db_status = 'completed' THEN 
      v_order_status := 'delivered';
    ELSIF v_db_status = 'cancelled' THEN 
      v_order_status := 'cancelled';
    END IF;

    IF v_order_status IS NOT NULL THEN
      -- Get current order status
      SELECT status::text INTO v_current_order_status FROM public.orders WHERE delivery_id = p_delivery_id LIMIT 1;
      
      -- Prevent backward status changes.
      IF v_order_status = 'preparing' AND v_current_order_status IN ('ready', 'in_route', 'delivered') THEN
         -- do nothing
      ELSIF v_order_status = 'confirmed' AND v_current_order_status IN ('preparing', 'ready', 'in_route', 'delivered') THEN
         -- do nothing
      ELSE
         UPDATE public.orders
         SET 
           status = v_order_status::public.order_status,
           updated_at = v_now
         WHERE delivery_id = p_delivery_id;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Fallback to standard status or just ignore if enum values don't match
    BEGIN
      IF v_order_status = 'confirmed' THEN
         SELECT status::text INTO v_current_order_status FROM public.orders WHERE delivery_id = p_delivery_id LIMIT 1;
         IF v_current_order_status NOT IN ('preparing', 'ready', 'in_route', 'delivered') THEN
           UPDATE public.orders
           SET status = 'preparing'::public.order_status WHERE delivery_id = p_delivery_id;
         END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Ignore silently
    END;
  END;

  RETURN jsonb_build_object('success', true, 'message', 'Entrega atualizada com sucesso');
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_delivery_status_safe(UUID, TEXT, UUID) TO authenticated;

COMMIT;
