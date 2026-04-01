import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://nptkxlrhrlssdsevpgqe.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_x2IjGj8IHCv5PW8zScthNg_4S32wdnO";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
