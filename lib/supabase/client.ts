import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://nrtsoyjikofwkyrusjnz.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_qOQmXz15br_ibZQmiDl5Ww_KUjwu1ji";

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("your-project-id") &&
    supabaseUrl.startsWith("https://")
  );
};

let cachedClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cachedClient) return cachedClient;

  // If not configured, use placeholder credentials to avoid build-time crashes
  const url = isSupabaseConfigured() ? supabaseUrl : "https://placeholder-project.supabase.co";
  const key = isSupabaseConfigured() ? supabaseAnonKey : "placeholder-anon-key";

  cachedClient = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return cachedClient;
}

export const supabase = getSupabase();
