import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | undefined
export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key || url.includes('YOUR_PROJECT') || !key.startsWith('sb_publishable_')) {
    throw new Error('Duo Chat 尚未配置连接，请按 README 配置 Supabase 后重启应用。')
  }
  client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
  return client
}
