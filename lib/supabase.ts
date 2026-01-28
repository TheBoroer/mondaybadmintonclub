import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy initialization to avoid build errors
let supabaseInstance: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables')
    }

    supabaseInstance = createClient(supabaseUrl, supabaseKey)
  }
  return supabaseInstance
}

// Server-side client with secret key for admin operations
export function createServerSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseSecretKey)
}

// Types for our database tables
export interface Session {
  id: string
  date: string
  courts: number
  max_players: number
  cost: number
  created_at: string
  archived: boolean
}

export interface Player {
  id: string
  session_id: string
  name: string
  pin?: string // Not returned in public queries for security
  position: number
  is_waitlist: boolean
  paid: boolean
  signed_up_at: string
}
