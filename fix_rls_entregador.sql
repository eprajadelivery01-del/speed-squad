BEGIN;

-- Remove as políticas problemáticas que causam "Row level security (RLS) blocked the action"
DROP POLICY IF EXISTS "Drivers can accept pending deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "deliveries_driver_update" ON public.deliveries;

-- Cria uma nova política garantindo que o entregador consiga dar UPDATE
-- na entrega para o status de "accepted" desde que a entrega esteja pending ou broadcasted
CREATE POLICY "deliveries_driver_update" ON public.deliveries
  FOR UPDATE TO authenticated
  USING (
    -- Entregador que já assumiu a corrida (para os status subsequentes)
    driver_id = (SELECT id FROM public.delivery_drivers WHERE user_id = auth.uid() LIMIT 1)
    OR 
    -- Ou se a corrida não tem dono ainda e está disponível para aceite
    (driver_id IS NULL AND status IN ('pending', 'broadcasted'))
  );

COMMIT;
