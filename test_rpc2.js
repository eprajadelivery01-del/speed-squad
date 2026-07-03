import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mqhzlhuaxdntkupnkmdk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xaHpsaHVheGRudGt1cG5rbWRrIiwiZ29sZSI6ImFub24iLCJpYXQiOjE3MTY4ODk0MjIsImV4cCI6MjAzMjQ2NTQyMn0.yYw2mDiz3R9jB8FkO7Y1rT4-XvK6Bw7x5N9K8U1yX9k';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDeliveries() {
  const { data, error } = await supabase.from('deliveries').select('id, delivery_fee, status').eq('driver_id', 'bca5b00c-b258-4505-88bd-b03dcfefb7f7').gte('completed_at', '2026-07-03T00:00:00.000Z');
  console.log(data);
}
checkDeliveries();
