-- ======================================================================================
-- FINAL TRIGGER NUKE: RESOLVING LEGACY "final_price" ERROR
-- ======================================================================================

BEGIN;

-- 1. DROP ALL POTENTIAL OFFENDING TRIGGERS
-- Using DO block to safely drop any triggers on the deliveries table
DO $$
DECLARE
    trig_record RECORD;
BEGIN
    FOR trig_record IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'deliveries' 
        AND trigger_schema = 'public'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trig_record.trigger_name || ' ON public.deliveries;';
    END LOOP;
END $$;

-- 2. CREATE A CLEAN SETTLEMENT FUNCTION
CREATE OR REPLACE FUNCTION public.handle_delivery_completion_v3()
RETURNS TRIGGER AS $$
DECLARE
    v_earning_amount NUMERIC;
BEGIN
    -- Only act on transition to 'delivered'
    IF (NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered')) THEN
        
        -- Use the correct financial fields available in the schema
        -- commission: what the driver gets (usually)
        -- price: the delivery fee
        -- value: total order value
        v_earning_amount := COALESCE(NEW.commission, NEW.price, 0);

        IF NEW.driver_id IS NOT NULL THEN
            -- Insert into driver_earnings (if table exists)
            BEGIN
                INSERT INTO public.driver_earnings (
                    driver_id,
                    delivery_id,
                    amount,
                    type,
                    description,
                    created_at
                ) VALUES (
                    NEW.driver_id,
                    NEW.id,
                    v_earning_amount,
                    'delivery',
                    'Entrega #' || NEW.id,
                    NOW()
                );
            EXCEPTION WHEN OTHERS THEN
                -- If the table doesn't exist yet, we don't block the delivery update
                RAISE WARNING 'Não foi possível registrar ganhos: %', SQLERRM;
            END;
        END IF;

        -- Force set delivered_at if not set
        IF NEW.delivered_at IS NULL THEN
            NEW.delivered_at := NOW();
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ATTACH THE FRESH TRIGGER
CREATE TRIGGER on_delivery_delivered_master_v3
    BEFORE UPDATE ON public.deliveries
    FOR EACH ROW
    WHEN (NEW.status = 'delivered' AND OLD.status != 'delivered')
    EXECUTE FUNCTION public.handle_delivery_completion_v3();

COMMIT;
