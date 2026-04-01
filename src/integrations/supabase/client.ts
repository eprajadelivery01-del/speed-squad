import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://nptkxlrhrlssdsevpgqe.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY_HERE"; // TODO: Replace with your actual anon key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
