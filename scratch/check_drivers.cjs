const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY 
);

async function check() {
  const { data, error } = await supabase.from('delivery_drivers').select('*').limit(5);
  console.log('Driver profiles:', data?.length);
}
check();
