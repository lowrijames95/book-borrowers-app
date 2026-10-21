import { createBrowserClient } from '@supabase/ssr';

let client;

export function createClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wpglrtecqejbhrxhneqa.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_34t8jA1Yxefhhd45EAfx5w_GD_blV1d';

  client = createBrowserClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return client;
}