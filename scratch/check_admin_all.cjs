const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../pronto-agora-hub/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PUBLISHABLE_KEY 
);

async function check() {
  const { data: user } = await supabase.from('deliveries').select('id, status, driver_id, customer_name').order('created_at', { ascending: false }).limit(20);
  console.log('Todas no Admin:', user?.length);
  console.log(user);
}
check();
