// lib/supabase-fix.ts
import { getSupabaseBrowserClient } from './supabase/client'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let serverClient: ReturnType<typeof createClient> | null = null

export function getSupabase() {
  if (typeof window !== 'undefined') {
    return getSupabaseBrowserClient()
  }
  if (!serverClient) {
    serverClient = createClient(supabaseUrl, supabaseKey)
  }
  return serverClient
}

export const supabase = typeof window !== 'undefined'
  ? getSupabaseBrowserClient()
  : createClient(supabaseUrl, supabaseKey)