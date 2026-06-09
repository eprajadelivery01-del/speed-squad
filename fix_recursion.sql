DROP POLICY IF EXISTS "Drivers can read companies" ON public.companies;

CREATE OR REPLACE FUNCTION public.is_driver_secure(user_uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.delivery_drivers WHERE user_id = user_uid
  );
$$;

CREATE POLICY "Drivers can read companies" ON public.companies
  FOR SELECT TO authenticated
  USING (
    public.is_driver_secure(auth.uid())
  );
