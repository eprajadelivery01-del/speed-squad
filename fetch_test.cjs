const fs = require('fs');
let envStr = '';
try { envStr = fs.readFileSync('.env.local', 'utf8'); } catch(e) { envStr = fs.readFileSync('.env', 'utf8'); }
const m1 = envStr.match(/VITE_SUPABASE_URL=([^ \r\n]+)/);
const m2 = envStr.match(/VITE_SUPABASE_PUBLISHABLE_KEY=([^ \r\n]+)/);
const url = m1[1].replace(/\"/g, '');
const key = m2[1].replace(/\"/g, '');

fetch(url + '/rest/v1/deliveries?select=id,status,value,price,estimated_value,commission,created_at&limit=10&order=created_at.desc', { 
  headers: { apikey: key, Authorization: 'Bearer ' + key } 
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)));
