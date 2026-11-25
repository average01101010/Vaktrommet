import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase-klient, lastet først når den trengs og bare hvis miljøvariablene er satt.
 * Uten konfigurasjon kjører spillet helt lokalt (localStorage + demo-toppliste).
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

let client: Promise<SupabaseClient> | null = null

export function getSupabase(): Promise<SupabaseClient> | null {
  if (!url || !anonKey) return null
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } }),
  )
  return client
}
