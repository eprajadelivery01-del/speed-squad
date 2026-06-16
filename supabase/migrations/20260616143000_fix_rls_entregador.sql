-- ==========================================
-- CORREÇÃO DE RLS: ACEITAR ENTREGAS
-- ==========================================
-- O erro "Row level security (RLS) blocked the action" ocorreu porque
-- a política de UPDATE atual só permitia que o entregador atualizasse
-- entregas que JÁ estavam atribuídas a ele (driver_id = seu_id).
-- Quando a entrega está 'pending', o driver_id é nulo, bloqueando a ação.

BEGIN;

DROP POLICY IF EXISTS "Drivers can accept pending deliveries" ON public.deliveries;

CREATE POLICY "Drivers can accept pending deliveries" ON public.deliveries
  FOR UPDATE 
  USING (
    status IN ('pending', 'broadcasted') AND public.has_role(auth.uid(), 'driver')
  ) 
  WITH CHECK (
    driver_id IN (SELECT id FROM public.delivery_drivers WHERE user_id = auth.uid())
  );

COMMIT;
