CREATE POLICY "Drivers can view companies" ON public.companies FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.delivery_drivers WHERE user_id = auth.uid()));
