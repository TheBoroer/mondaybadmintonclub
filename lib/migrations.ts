import { createServerSupabaseClient } from './supabase'

export interface Migration {
  name: string
  description: string
  sql: string
}

// Define migrations in order
export const migrations: Migration[] = [
  {
    name: '001_initial_schema',
    description: 'Create initial tables for sessions and players',
    sql: `
-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  courts INTEGER NOT NULL DEFAULT 2,
  max_players INTEGER NOT NULL DEFAULT 14,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  archived BOOLEAN DEFAULT FALSE
);

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  position INTEGER NOT NULL,
  is_waitlist BOOLEAN DEFAULT FALSE,
  paid BOOLEAN DEFAULT FALSE,
  signed_up_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_players_session_id ON players(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
CREATE INDEX IF NOT EXISTS idx_sessions_archived ON sessions(archived);
    `.trim(),
  },
  {
    name: '002_add_player_pin',
    description: 'Add PIN column to players table for cancellation verification',
    sql: `
-- Add pin column for player verification
ALTER TABLE players ADD COLUMN IF NOT EXISTS pin VARCHAR(4) NOT NULL DEFAULT '0000';
    `.trim(),
  },
]

export async function ensureMigrationsTable(): Promise<boolean> {
  const supabase = createServerSupabaseClient()

  // Check if _migrations table exists by trying to query it
  const { error } = await supabase
    .from('_migrations')
    .select('id')
    .limit(1)

  return !error
}

export async function getMigrationStatus(): Promise<{
  tableExists: boolean
  executed: string[]
  pending: Migration[]
}> {
  const supabase = createServerSupabaseClient()

  // Check if migrations table exists
  const { data: executedMigrations, error } = await supabase
    .from('_migrations')
    .select('name')
    .order('id', { ascending: true })

  if (error) {
    // Table doesn't exist
    return {
      tableExists: false,
      executed: [],
      pending: migrations,
    }
  }

  const executedNames = executedMigrations?.map((m) => m.name) || []
  const executedSet = new Set(executedNames)

  const pending = migrations.filter((m) => !executedSet.has(m.name))

  return {
    tableExists: true,
    executed: executedNames,
    pending,
  }
}

export async function markMigrationComplete(name: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerSupabaseClient()

  // Verify migration exists
  const migration = migrations.find((m) => m.name === name)
  if (!migration) {
    return { success: false, error: 'Migration not found' }
  }

  // Check if already executed
  const { data: existing } = await supabase
    .from('_migrations')
    .select('id')
    .eq('name', name)
    .single()

  if (existing) {
    return { success: false, error: 'Migration already executed' }
  }

  // Mark as complete
  const { error } = await supabase
    .from('_migrations')
    .insert({ name })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export function getSetupSQL(): string {
  return `
-- Run this first to set up the migrations tracking table
CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
  `.trim()
}

export function getAllMigrationsSQL(): string {
  return migrations.map((m) => `-- Migration: ${m.name}\n-- ${m.description}\n\n${m.sql}`).join('\n\n')
}
