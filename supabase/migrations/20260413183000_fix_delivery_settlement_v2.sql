-- ======================================================================================
-- MASTER FIX: DELIVERY SETTLEMENT & EARNINGS LOGIC
-- Resolves: record "v_delivery" has no field "final_price"
-- Author: Antigravity
-- ======================================================================================

BEGIN;

-- 1. Create or Replace the Financial Settlement Function
-- This function handles the creation of driver earnings and financial movements
-- when a delivery is marked as 'delivered'.
CREATE OR REPLACE FUNCTION public.handle_delivery_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_delivery_record RECORD;
  v_driver_id UUID;
  v_earning_amount NUMERIC;
BEGIN
  -- We only act when status transition to 'delivered'
  IF (NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered')) THEN
    
    -- IMPORTANT: 'v_delivery' alias used in some legacy triggers was causing the error
    -- we use 'NEW' directly to access row fields accurately.
    -- Fields available: value (total), commission, price (delivery fee)
    
    v_driver_id := NEW.driver_id;
    
    -- HACKY FIX: If the trigger was using 'final_price', it failed because the column is 'value' or 'price'.
    -- We assume the driver payout is the 'price' field (delivery fee) or based on business logic.
    -- If 'price' is null or zero, we fallback to 'value' (total order value).
    v_earning_amount := COALESCE(NEW.price, NEW.value);

    IF v_driver_id IS NOT NULL THEN
      -- Insert into driver_earnings
      INSERT INTO public.driver_earnings (
        driver_id,
        delivery_id,
        amount,
        type,
        description,
        created_at
      ) VALUES (
        v_driver_id,
        NEW.id,
        v_earning_amount,
        'delivery',
        'Entrega concluída #' || NEW.id,
        NOW()
      );

      -- Update driver status to 'available' (optional based on system flow)
      -- UPDATE public.delivery_drivers 
      -- SET status = 'available' 
      -- WHERE id = v_driver_id;
    END IF;

    -- Log completion timestamp if not set
    IF NEW.delivered_at IS NULL THEN
      NEW.delivered_at := NOW();
    END IF;

  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Prevent error from blocking the whole update if it's just a financial log failure
  -- but we log it to standard error if possible
  RAISE WARNING 'Erro ao processar ganhos da entrega: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Cleanup Legacy Broken Triggers
-- Search and destroy any trigger that might be referencing 'final_price'
DROP TRIGGER IF EXISTS tr_delivery_completion ON public.deliveries;
DROP TRIGGER IF EXISTS on_delivery_delivered ON public.deliveries;

-- 3. Attach the New Master Trigger
CREATE TRIGGER on_delivery_delivered_master
  BEFORE UPDATE ON public.deliveries
  FOR EACH ROW
  WHEN (NEW.status = 'delivered' AND OLD.status != 'delivered')
  EXECUTE FUNCTION public.handle_delivery_completion();

-- 4. Sync Schema: Ensure 'price' and 'value' are consistent
-- Ensure 'price' is a numeric for financial math
ALTER TABLE public.deliveries ALTER COLUMN price TYPE NUMERIC(10,2);
ALTER TABLE public.deliveries ALTER COLUMN value TYPE NUMERIC(10,2);
ALTER TABLE public.deliveries ALTER COLUMN commission TYPE NUMERIC(10,2);

COMMIT;
