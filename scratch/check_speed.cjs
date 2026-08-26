const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY 
);

async function check() {
  const { data, error } = await supabase.from('deliveries').select('*').ilike('customer_name', '%Teste Cliente Novo%');
  console.log('Entregas no speed squad:', data);
}
check();
