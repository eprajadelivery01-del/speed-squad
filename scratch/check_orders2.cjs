const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY 
);

async function check() {
  const { data, error } = await supabase.from('orders').select('id, status, delivery_status, customer_name').order('created_at', { ascending: false }).limit(5);
  console.log('Ultimos 5 orders:', data);
}
check();
