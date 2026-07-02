const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

async function run() {
  const { data, error } = await supabase.rpc('run_sql', { query: "SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'orders'" });
  console.log('RPC check:', data, error);
  
  if (error) {
    // try to query directly if RPC doesn't exist
    const { data: qdata, error: qerr } = await supabase.from('information_schema.triggers').select('trigger_name').eq('event_object_table', 'orders');
    console.log('Direct query:', qdata, qerr);
  }
}
run();
