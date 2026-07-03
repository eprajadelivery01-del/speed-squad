import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mqhzlhuaxdntkupnkmdk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xaHpsaHVheGRudGt1cG5rbWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3Mzg2NDQsImV4cCI6MjA5MzMxNDY0NH0.i6v5Fep6_o51nFTtQwHUDzil0OGh5vaLYvAJNQbuSHk';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('deliveries').select('id, commission, status').limit(5);
  console.log('Deliveries with commission:', data, error);
}

check();