CREATE TABLE IF NOT EXISTS public.system_alerts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    type text NOT NULL,
    message text NOT NULL,
    details jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    resolved boolean DEFAULT false
);

ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_delivery_status_safe(p_delivery_id uuid, p_status text, p_driver_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_delivery RECORD;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
  v_db_status TEXT;
  v_order_status TEXT := NULL;
  v_current_order_status TEXT;
  v_current_driver_id UUID;
  v_driver_name TEXT;
BEGIN
  -- 1. Fetch the existing delivery with FOR UPDATE to lock the row and prevent race conditions
  SELECT driver_id, status INTO v_current_driver_id, v_db_status
  FROM public.deliveries 
  WHERE id = p_delivery_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Entrega não encontrada');
  END IF;

  v_db_status := p_status;

  -- 2. ANTI-STEAL LOCK: Verify if it's already accepted by another driver
  IF p_status = 'accepted' AND p_driver_id IS NOT NULL THEN
     IF v_current_driver_id IS NOT NULL AND v_current_driver_id != p_driver_id THEN
        -- Get the driver name who tried to accept
        SELECT full_name INTO v_driver_name FROM public.profiles WHERE id = p_driver_id;
        
        -- Insert into system alerts
        INSERT INTO public.system_alerts (type, message, details)
        VALUES (
          'anti_steal_lock', 
          'TENTATIVA DE ACEITE DUPLO BLOQUEADA: Entregador tentou aceitar uma corrida que já foi aceita.',
          jsonb_build_object(
            'delivery_id', p_delivery_id,
            'attempted_driver_id', p_driver_id,
            'attempted_driver_name', v_driver_name,
            'current_driver_id', v_current_driver_id
          )
        );
        
        RETURN jsonb_build_object('success', false, 'error', 'Esta corrida já foi aceita por outro entregador.');
     END IF;
  END IF;
  
  -- 3. Update the delivery record
  UPDATE public.deliveries
  SET 
    status = v_db_status::public.delivery_status,
    driver_id = COALESCE(p_driver_id, driver_id),
    updated_at = v_now,
    accepted_at = CASE WHEN v_db_status = 'accepted' AND accepted_at IS NULL THEN v_now ELSE accepted_at END,
    collected_at = CASE WHEN v_db_status = 'in_route' AND collected_at IS NULL THEN v_now ELSE collected_at END,
    delivered_at = CASE WHEN (v_db_status = 'delivered' OR v_db_status = 'completed') AND delivered_at IS NULL THEN v_now ELSE delivered_at END,
    cancelled_at = CASE WHEN v_db_status = 'cancelled' AND cancelled_at IS NULL THEN v_now ELSE cancelled_at END
  WHERE id = p_delivery_id;

  -- 4. Also update any associated order status safely
  BEGIN
    -- Get current order status
    SELECT status::TEXT INTO v_current_order_status FROM public.orders WHERE delivery_id = p_delivery_id;

    IF v_db_status = 'accepted' THEN 
      -- If the store already marked it as ready, keep it ready. Otherwise preparing.
      IF v_current_order_status = 'ready' THEN
        v_order_status := 'ready';
      ELSE
        v_order_status := 'preparing';
      END IF;
    ELSIF v_db_status = 'collecting' THEN 
      v_order_status := 'preparing';
    ELSIF v_db_status = 'in_route' THEN 
      v_order_status := 'in_route';
    ELSIF v_db_status = 'completed' OR v_db_status = 'delivered' THEN 
      v_order_status := 'delivered';
    ELSIF v_db_status = 'cancelled' THEN 
      v_order_status := 'cancelled';
    END IF;

    IF v_order_status IS NOT NULL THEN
      UPDATE public.orders
      SET 
        status = v_order_status::public.order_status,
        updated_at = v_now
      WHERE delivery_id = p_delivery_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Fallback in case of enum cast errors (e.g. if order_status doesn't have 'confirmed')
    BEGIN
      IF v_order_status = 'confirmed' THEN
         IF v_current_order_status = 'ready' THEN
            UPDATE public.orders SET status = 'ready'::public.order_status WHERE delivery_id = p_delivery_id;
         ELSE
            UPDATE public.orders SET status = 'preparing'::public.order_status WHERE delivery_id = p_delivery_id;
         END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
    END;
  END;

  RETURN jsonb_build_object('success', true, 'message', 'Entrega atualizada com sucesso');
END;
$function$;
