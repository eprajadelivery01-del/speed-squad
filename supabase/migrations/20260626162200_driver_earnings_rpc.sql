CREATE OR REPLACE FUNCTION public.get_driver_earnings_summary(
    p_driver_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
    total_deliveries INT,
    gross_earnings NUMERIC,
    platform_fee NUMERIC,
    net_earnings NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_commission_rate NUMERIC;
BEGIN
    -- Obter a taxa de comissão do motorista (fallback para 0.40 se nulo)
    SELECT COALESCE(commission_rate, 0.40) INTO v_commission_rate
    FROM public.delivery_drivers
    WHERE id = p_driver_id;

    RETURN QUERY
    SELECT 
        COUNT(id)::INT AS total_deliveries,
        COALESCE(SUM(delivery_fee), 0) AS gross_earnings,
        (COUNT(id) * v_commission_rate) AS platform_fee,
        COALESCE(SUM(delivery_fee), 0) - (COUNT(id) * v_commission_rate) AS net_earnings
    FROM public.deliveries
    WHERE driver_id = p_driver_id
      AND status = 'completed' -- 'completed' é o valor salvo no BD para 'delivered'
      AND created_at >= p_start_date
      AND created_at <= p_end_date;
END;
$$;
