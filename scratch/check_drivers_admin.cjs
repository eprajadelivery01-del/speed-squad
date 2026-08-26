const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../pronto-agora-hub/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PUBLISHABLE_KEY 
);

async function check() {
  const { data, error } = await supabase.from('delivery_drivers').select('*').limit(5);
  console.log('Driver profiles (DB admin key):', data?.length);
  
  const { data: user } = await supabase.from('deliveries').select('id, status, driver_id, customer_name').order('created_at', { ascending: false }).limit(5);
  console.log('Deliveries with Admin key:', user);
}
check();
