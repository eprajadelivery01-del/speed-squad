import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mqhzlhuaxdntkupnkmdk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xaHpsaHVheGRudGt1cG5rbWRrIiwiZ29sZSI6ImFub24iLCJpYXQiOjE3MTY4ODk0MjIsImV4cCI6MjAzMjQ2NTQyMn0.yYw2mDiz3R9jB8FkO7Y1rT4-XvK6Bw7x5N9K8U1yX9k';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRPC() {
  const { data, error } = await supabase.rpc('get_driver_earnings_summary', {
    p_driver_id: 'bca5b00c-b258-4505-88bd-b03dcfefb7f7',
    p_start_date: '2026-07-03T00:00:00.000Z',
    p_end_date: '2026-07-03T23:59:59.999Z'
  });
  console.log(data);
}
testRPC();
