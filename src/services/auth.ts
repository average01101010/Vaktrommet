import { getSupabase, isSupabaseConfigured } from './supabase'

/**
 * Kontostatus. Uten Supabase-konfigurasjon spilles det alltid lokalt og
 * anonymt. Koden under er klargjort for Supabase Auth (innlogging med lenke
 * på e-post), men er ikke prøvd mot en ekte instans, og lagringen
 * synkroniseres ikke til server ennå.
 */
export type Account = { status: 'local' } | { status: 'signedIn'; email: string }

export const isAccountLinkingAvailable = isSupabaseConfigured

export async function getAccount(): Promise<Account> {
  const supabase = getSupabase()
  if (!supabase) return { status: 'local' }
  try {
    const client = await supabase
    const { data } = await client.auth.getSession()
    const email = data.session?.user.email
    return email ? { status: 'signedIn', email } : { status: 'local' }
  } catch {
    return { status: 'local' }
  }
}

export type LinkResult = { ok: true } | { ok: false; reason: string }

/** Sender en innloggingslenke på e-post. */
export async function requestAccountLink(email: string): Promise<LinkResult> {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, reason: 'Kontotilkobling er ikke aktivert i denne versjonen.' }
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) return { ok: false, reason: 'Skriv inn en gyldig e-postadresse.' }
  try {
    const client = await supabase
    const { error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    return error ? { ok: false, reason: 'Kunne ikke sende lenken. Prøv igjen om litt.' } : { ok: true }
  } catch {
    return { ok: false, reason: 'Fikk ikke kontakt med serveren.' }
  }
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return
  try {
    await (await supabase).auth.signOut()
  } catch {
    // Ingenting å gjøre – økten utløper av seg selv.
  }
}
