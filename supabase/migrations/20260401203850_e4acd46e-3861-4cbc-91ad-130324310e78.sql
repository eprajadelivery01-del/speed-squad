
-- Add geometry, color, price, city to regions
ALTER TABLE public.regions ADD COLUMN IF NOT EXISTS color text DEFAULT '#3B82F6';
ALTER TABLE public.regions ADD COLUMN IF NOT EXISTS price numeric DEFAULT 0;
ALTER TABLE public.regions ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.regions ADD COLUMN IF NOT EXISTS geometry jsonb;

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Function to find region for a geographic point using GeoJSON ray-casting
CREATE OR REPLACE FUNCTION public.find_region_for_point(_lat double precision, _lng double precision)
RETURNS TABLE(region_id uuid, region_name text, region_price numeric, region_color text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r RECORD;
  coords jsonb;
  ring jsonb;
  n int;
  i int;
  x1 double precision; y1 double precision;
  x2 double precision; y2 double precision;
  inside boolean;
BEGIN
  FOR r IN SELECT id, name, price, color, geometry FROM regions WHERE active = true AND geometry IS NOT NULL
  LOOP
    -- Support Polygon type
    IF r.geometry->>'type' = 'Polygon' THEN
      ring := r.geometry->'coordinates'->0;
      n := jsonb_array_length(ring);
      inside := false;
      FOR i IN 0..n-2
      LOOP
        x1 := (ring->i->>0)::double precision;
        y1 := (ring->i->>1)::double precision;
        x2 := (ring->(i+1)->>0)::double precision;
        y2 := (ring->(i+1)->>1)::double precision;
        IF ((y1 > _lat) != (y2 > _lat)) AND (_lng < (x1 - x2) * (_lat - y2) / (y1 - y2) + x2) THEN
          inside := NOT inside;
        END IF;
      END LOOP;
      IF inside THEN
        region_id := r.id;
        region_name := r.name;
        region_price := r.price;
        region_color := r.color;
        RETURN NEXT;
        RETURN;
      END IF;
    END IF;
  END LOOP;
END;
$$;
