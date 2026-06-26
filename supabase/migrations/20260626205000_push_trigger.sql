-- Trigger for calling send-push Edge Function when a new delivery is inserted
CREATE OR REPLACE FUNCTION public.trigger_send_push_on_delivery()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url text;
BEGIN
  -- We assume the edge function is served at the standard path
  -- We can pass a relative URL if we use net.http_post, but pg_net extension requires full URLs.
  -- To keep it simple and portable without hardcoding the URL, we can use the Supabase standard pattern
  -- But an easier approach using pg_net (if enabled) is:
  
  webhook_url := current_setting('custom.supabase_url', true) || '/functions/v1/send-push';

  PERFORM net.http_post(
      url := webhook_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', current_setting('custom.supabase_anon_key', true)
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', TG_TABLE_NAME,
        'schema', TG_TABLE_SCHEMA,
        'record', row_to_json(NEW),
        'old_record', null
      )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors so we don't break delivery insertion if webhook fails
  RAISE WARNING 'Push notification webhook failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_delivery_created_send_push ON public.deliveries;

CREATE TRIGGER on_delivery_created_send_push
AFTER INSERT ON public.deliveries
FOR EACH ROW
WHEN (NEW.status = 'pending' OR NEW.status = 'broadcasted')
EXECUTE FUNCTION public.trigger_send_push_on_delivery();
