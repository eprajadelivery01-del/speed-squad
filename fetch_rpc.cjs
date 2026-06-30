const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:postgres@nptkxlrhrlssdsevpgqe.supabase.co:5432/postgres' });
async function getCode() {
  try {
    await client.connect();
    // In PostgreSQL, to cast a string to regproc, we use single quotes.
    const queryStr = "SELECT pg_get_functiondef('public.update_delivery_status_safe(uuid, text, uuid)'::regprocedure);";
    const res = await client.query(queryStr);
    console.log(res.rows[0].pg_get_functiondef);
  } catch(e) {
    console.error("Error:", e.message);
  } finally {
    await client.end();
  }
}
getCode();
