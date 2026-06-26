-- Fix to allow old app versions to fetch the Admin ID without RLS blocking them
CREATE POLICY "Anyone can view admin role" ON public.user_roles
    FOR SELECT TO authenticated
    USING (role = 'admin');
