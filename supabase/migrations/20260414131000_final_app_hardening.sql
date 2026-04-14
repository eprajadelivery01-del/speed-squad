-- FINAL HARDENING: CORE APP PERMISSIONS
-- This ensures GPS, Deliveries, and Earnings all work correctly for the driver.

BEGIN;

-- 1. Table: delivery_drivers (GPS & Status)
ALTER TABLE public.delivery_drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers can view all driver profiles" ON public.delivery_drivers;
CREATE POLICY "Drivers can view all driver profiles" ON public.delivery_drivers
  FOR SELECT USING (true); -- Everyone can see who is online (or at least admins/drivers)

DROP POLICY IF EXISTS "Drivers can update own status and location" ON public.delivery_drivers;
CREATE POLICY "Drivers can update own status and location" ON public.delivery_drivers
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Table: deliveries (Order Management)
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers can view broadcasted deliveries" ON public.deliveries;
CREATE POLICY "Drivers can view broadcasted deliveries" ON public.deliveries
  FOR SELECT USING (status = 'broadcasted' OR driver_id = auth.uid());

DROP POLICY IF EXISTS "Drivers can claim and update their deliveries" ON public.deliveries;
CREATE POLICY "Drivers can claim and update their deliveries" ON public.deliveries
  FOR UPDATE USING (status = 'broadcasted' OR driver_id = auth.uid())
  WITH CHECK (true);

-- 3. Table: driver_earnings (Financials)
ALTER TABLE public.driver_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers can view own earnings" ON public.driver_earnings;
CREATE POLICY "Drivers can view own earnings" ON public.driver_earnings
  FOR SELECT USING (auth.uid() = driver_id);

-- 4. Table: user_roles (Self-Verification)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

COMMIT;
