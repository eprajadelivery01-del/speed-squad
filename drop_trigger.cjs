const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

async function run() {
  const { data, error } = await supabase.rpc('run_sql', {
    query: `
      DROP TRIGGER IF EXISTS tr_order_ready_automation ON public.orders;
      DROP FUNCTION IF EXISTS public.handle_order_ready_automation();
    `
  });
  console.log('Result:', data, error);
}
run();
