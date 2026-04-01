
-- ============================
-- TABLE: regions
-- ============================
CREATE TABLE public.regions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read regions"
  ON public.regions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage regions"
  ON public.regions FOR ALL
  TO authenticated
  USING (has_profile_role(auth.uid(), 'admin'))
  WITH CHECK (has_profile_role(auth.uid(), 'admin'));

CREATE TRIGGER update_regions_updated_at
  BEFORE UPDATE ON public.regions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================
-- TABLE: user_roles
-- ============================
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'driver', 'company', 'customer');

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (has_profile_role(auth.uid(), 'admin'))
  WITH CHECK (has_profile_role(auth.uid(), 'admin'));

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- ============================
-- TABLE: invitations
-- ============================
CREATE TABLE public.invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'driver',
  token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID,
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (email, role)
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage invitations"
  ON public.invitations FOR ALL
  TO authenticated
  USING (has_profile_role(auth.uid(), 'admin'))
  WITH CHECK (has_profile_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read own invitation by email"
  ON public.invitations FOR SELECT
  TO authenticated
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));
