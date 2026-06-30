-- Run this in the Supabase SQL editor (external project nptkxlrhrlssdsevpgqe).
-- Hardens accept-delivery against race conditions: explicit row lock + idempotent re-accept.

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
  v_current_driver_id UUID;
  v_current_status public.delivery_status;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  BEGIN
    v_db_status := p_status::public.delivery_status;
  EXCEPTION WHEN OTHERS THEN
    IF p_status = 'delivered' THEN
      v_db_status := 'completed'::public.delivery_status;
    ELSIF p_status = 'in_transit' THEN
      v_db_status := 'in_route'::public.delivery_status;
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Status inválido: ' || p_status);
    END IF;
  END;

  -- CRITICAL: lock the row to serialize concurrent accepts.
  SELECT driver_id, status
    INTO v_current_driver_id, v_current_status
  FROM public.deliveries
  WHERE id = p_delivery_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Entrega não encontrada');
  END IF;

  IF v_db_status = 'accepted' THEN
    IF v_current_driver_id IS NOT NULL AND v_current_driver_id <> p_driver_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'Esta corrida já foi aceita por outro entregador.');
    END IF;
    IF v_current_status NOT IN ('pending', 'broadcasted', 'accepted') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Esta corrida não está mais disponível.');
    END IF;
    IF v_current_status = 'accepted' AND v_current_driver_id = p_driver_id THEN
      RETURN jsonb_build_object('success', true, 'message', 'Já aceita por você');
    END IF;
  ELSE
    IF p_driver_id IS NOT NULL
       AND v_current_driver_id IS NOT NULL
       AND v_current_driver_id <> p_driver_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'Esta corrida pertence a outro entregador.');
    END IF;
  END IF;

  UPDATE public.deliveries
  SET
    status = v_db_status,
    updated_at = v_now,
    driver_id = COALESCE(p_driver_id, driver_id),
    accepted_at  = CASE WHEN v_db_status = 'accepted'   AND accepted_at  IS NULL THEN v_now ELSE accepted_at  END,
    collected_at = CASE WHEN v_db_status = 'collecting' AND collected_at IS NULL THEN v_now ELSE collected_at END,
    delivered_at = CASE WHEN v_db_status = 'completed'  AND delivered_at IS NULL THEN v_now ELSE delivered_at END
  WHERE id = p_delivery_id;

  BEGIN
    IF v_db_status = 'accepted'   THEN v_order_status := 'confirmed';
    ELSIF v_db_status = 'collecting' THEN v_order_status := 'preparing';
    ELSIF v_db_status = 'in_route'   THEN v_order_status := 'in_route';
    ELSIF v_db_status = 'completed'  THEN v_order_status := 'delivered';
    ELSIF v_db_status = 'cancelled'  THEN v_order_status := 'cancelled';
    END IF;

    IF v_order_status IS NOT NULL THEN
      SELECT status::text INTO v_current_order_status FROM public.orders WHERE delivery_id = p_delivery_id LIMIT 1;
      IF v_order_status = 'preparing' AND v_current_order_status IN ('ready','in_route','delivered') THEN
        NULL;
      ELSIF v_order_status = 'confirmed' AND v_current_order_status IN ('preparing','ready','in_route','delivered') THEN
        NULL;
      ELSE
        UPDATE public.orders SET status = v_order_status::public.order_status, updated_at = v_now
        WHERE delivery_id = p_delivery_id;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object('success', true, 'message', 'Entrega atualizada com sucesso');
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_delivery_status_safe(UUID, TEXT, UUID) TO authenticated;

COMMIT;
