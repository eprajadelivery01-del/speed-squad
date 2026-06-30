-- Run this in the Supabase SQL editor (external project nptkxlrhrlssdsevpgqe).
-- Adds an audit log for delivery accept attempts and patches
-- update_delivery_status_safe to record every attempt (success or failure).

BEGIN;

-- 1) Audit table
CREATE TABLE IF NOT EXISTS public.delivery_accept_attempts (
  id              BIGSERIAL PRIMARY KEY,
  delivery_id     UUID,
  driver_id       UUID,
  auth_uid        UUID,
  attempted_status TEXT,
  success         BOOLEAN NOT NULL,
  error_message   TEXT,
  previous_driver_id UUID,
  previous_status TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accept_attempts_delivery ON public.delivery_accept_attempts(delivery_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accept_attempts_driver   ON public.delivery_accept_attempts(driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accept_attempts_created  ON public.delivery_accept_attempts(created_at DESC);

-- Grants: function writes via SECURITY DEFINER, so only service_role needs full access.
-- Authenticated users may read their own attempts (helpful for support/debug).
GRANT SELECT ON public.delivery_accept_attempts TO authenticated;
GRANT ALL    ON public.delivery_accept_attempts TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.delivery_accept_attempts_id_seq TO service_role;

ALTER TABLE public.delivery_accept_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Driver reads own accept attempts" ON public.delivery_accept_attempts;
CREATE POLICY "Driver reads own accept attempts"
ON public.delivery_accept_attempts
FOR SELECT
TO authenticated
USING (driver_id = auth.uid() OR auth_uid = auth.uid());

-- 2) Function patch: same lock-based logic + audit insert on every exit path.
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
  v_auth UUID := auth.uid();
  v_log_attempt BOOLEAN;
  v_err TEXT;
BEGIN
  v_log_attempt := (p_status = 'accepted');

  IF v_auth IS NULL THEN
    IF v_log_attempt THEN
      INSERT INTO public.delivery_accept_attempts(delivery_id, driver_id, auth_uid, attempted_status, success, error_message)
      VALUES (p_delivery_id, p_driver_id, NULL, p_status, false, 'Não autenticado');
    END IF;
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
      IF v_log_attempt THEN
        INSERT INTO public.delivery_accept_attempts(delivery_id, driver_id, auth_uid, attempted_status, success, error_message)
        VALUES (p_delivery_id, p_driver_id, v_auth, p_status, false, 'Status inválido');
      END IF;
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
    IF v_log_attempt THEN
      INSERT INTO public.delivery_accept_attempts(delivery_id, driver_id, auth_uid, attempted_status, success, error_message)
      VALUES (p_delivery_id, p_driver_id, v_auth, p_status, false, 'Entrega não encontrada');
    END IF;
    RETURN jsonb_build_object('success', false, 'error', 'Entrega não encontrada');
  END IF;

  IF v_db_status = 'accepted' THEN
    IF v_current_driver_id IS NOT NULL AND v_current_driver_id <> p_driver_id THEN
      v_err := 'Esta corrida já foi aceita por outro entregador.';
      INSERT INTO public.delivery_accept_attempts(delivery_id, driver_id, auth_uid, attempted_status, success, error_message, previous_driver_id, previous_status)
      VALUES (p_delivery_id, p_driver_id, v_auth, p_status, false, v_err, v_current_driver_id, v_current_status::text);
      RETURN jsonb_build_object('success', false, 'error', v_err);
    END IF;
    IF v_current_status NOT IN ('pending', 'broadcasted', 'accepted') THEN
      v_err := 'Esta corrida não está mais disponível.';
      INSERT INTO public.delivery_accept_attempts(delivery_id, driver_id, auth_uid, attempted_status, success, error_message, previous_driver_id, previous_status)
      VALUES (p_delivery_id, p_driver_id, v_auth, p_status, false, v_err, v_current_driver_id, v_current_status::text);
      RETURN jsonb_build_object('success', false, 'error', v_err);
    END IF;
    IF v_current_status = 'accepted' AND v_current_driver_id = p_driver_id THEN
      INSERT INTO public.delivery_accept_attempts(delivery_id, driver_id, auth_uid, attempted_status, success, error_message, previous_driver_id, previous_status)
      VALUES (p_delivery_id, p_driver_id, v_auth, p_status, true, 'Idempotente: já aceita por você', v_current_driver_id, v_current_status::text);
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

  IF v_log_attempt THEN
    INSERT INTO public.delivery_accept_attempts(delivery_id, driver_id, auth_uid, attempted_status, success, error_message, previous_driver_id, previous_status)
    VALUES (p_delivery_id, p_driver_id, v_auth, p_status, true, NULL, v_current_driver_id, v_current_status::text);
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Entrega atualizada com sucesso');
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_delivery_status_safe(UUID, TEXT, UUID) TO authenticated;

COMMIT;

-- Consulta útil para depurar quem tentou aceitar uma corrida:
-- SELECT created_at, driver_id, success, error_message, previous_driver_id, previous_status
-- FROM public.delivery_accept_attempts
-- WHERE delivery_id = '<UUID>'
-- ORDER BY created_at DESC;
