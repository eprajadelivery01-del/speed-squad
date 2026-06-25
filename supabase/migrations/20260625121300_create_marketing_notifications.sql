-- Migration: 20260625121300_create_marketing_notifications
-- Description: Create marketing_notifications table for Admin to Customer push notifications

BEGIN;

CREATE TABLE IF NOT EXISTS public.marketing_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  emoji TEXT,
  image_url TEXT,
  coupon_code TEXT,
  target_audience TEXT DEFAULT 'all', -- 'all', 'customers', etc
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'active'
);

-- Habilitar RLS
ALTER TABLE public.marketing_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
-- Admin pode inserir, atualizar, deletar
CREATE POLICY "Admins can manage marketing_notifications" 
ON public.marketing_notifications 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Público (clientes) pode apenas ler
CREATE POLICY "Anyone can view active marketing_notifications" 
ON public.marketing_notifications 
FOR SELECT 
USING (status = 'active');

-- Adicionar a tabela ao publication do supabase_realtime para escutar inserts no front-end
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'marketing_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.marketing_notifications;
  END IF;
END
$$;

COMMIT;
