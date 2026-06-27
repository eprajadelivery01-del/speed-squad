import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  console.log("Signing in...");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'dosanjosmoreiratiago@gmail.com',
    password: 'tiago0809'
  });

  if (error) {
    console.error("Login Error:", error.message);
    return;
  }

  console.log("Success! User ID:", data.user.id);

  console.log("Fetching roles...");
  const roles = await supabase.from('user_roles').select('*').eq('user_id', data.user.id);
  console.log('Roles Data:', roles.data);
  console.log('Roles Error:', roles.error);

  console.log("Fetching profile...");
  const profile = await supabase.from('profiles').select('*').eq('user_id', data.user.id);
  console.log('Profile Data:', profile.data);
  console.log('Profile Error:', profile.error);
}

test();
