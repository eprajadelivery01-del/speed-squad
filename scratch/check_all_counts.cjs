const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../pronto-agora-hub/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PUBLISHABLE_KEY 
);

async function check() {
  const { data: user } = await supabase.from('deliveries').select('id');
  console.log('Total deliveries in DB:', user?.length);
  
  const { data: ord } = await supabase.from('orders').select('id');
  console.log('Total orders in DB:', ord?.length);
}
check();
