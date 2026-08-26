const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../pronto-agora-hub/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PUBLISHABLE_KEY 
);

async function check() {
  const { data, error } = await supabase.from('deliveries').select('*').ilike('customer_name', '%Teste Cliente Novo%');
  console.log('Deliveries with that name:', data);
  
  if (data?.length > 0) {
     const id = data[0].id;
     // Fazer broadcast
     const { error: updErr } = await supabase.from('deliveries').update({ status: 'broadcasted', driver_id: null }).eq('id', id);
     console.log('Update broadcast err:', updErr);
  } else {
     console.log('Não achei!');
  }
}
check();
