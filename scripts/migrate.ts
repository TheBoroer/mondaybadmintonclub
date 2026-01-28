import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import postgres from 'postgres'
import * as fs from 'fs'
import * as path from 'path'

interface Migration {
  name: string
  description: string
  sql: string
}

const migrations: Migration[] = [
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
    `,
  },
  {
    name: '002_add_player_pin',
    description: 'Add PIN column to players table for cancellation verification',
    sql: `
-- Add pin column for player verification
ALTER TABLE players ADD COLUMN IF NOT EXISTS pin VARCHAR(4) NOT NULL DEFAULT '0000';
    `,
  },
]

async function createBackup(sql: postgres.Sql) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = path.join(process.cwd(), 'backups')

  // Ensure backups directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  const backupFile = path.join(backupDir, `backup-${timestamp}.json`)

  console.log('Creating backup...')

  const backup: Record<string, unknown[]> = {}

  // Check which tables exist and backup their data
  const tables = ['sessions', 'players', '_migrations']

  for (const table of tables) {
    try {
      const rows = await sql.unsafe(`SELECT * FROM ${table}`)
      backup[table] = rows as unknown[]
      console.log(`  ✓ Backed up ${rows.length} rows from ${table}`)
    } catch {
      console.log(`  - Table ${table} does not exist yet, skipping`)
    }
  }

  // Write backup to file
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2))
  console.log(`\n✓ Backup saved to: ${backupFile}\n`)

  return backupFile
}

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is not set')
    console.log('\nAdd DATABASE_URL to your .env.local file:')
    console.log('DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres')
    console.log('\nYou can find this in Supabase Dashboard > Settings > Database > Connection string (URI)')
    process.exit(1)
  }

  console.log('Connecting to database...\n')
  const sql = postgres(databaseUrl)

  try {
    // Create backup before any changes
    await createBackup(sql)

    // Create migrations table if it doesn't exist
    console.log('Ensuring migrations table exists...')
    await sql`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Get executed migrations
    const executed = await sql<{ name: string }[]>`
      SELECT name FROM _migrations ORDER BY id ASC
    `
    const executedNames = new Set(executed.map((m) => m.name))

    console.log(`\nExecuted migrations: ${executedNames.size}`)
    for (const name of executedNames) {
      console.log(`  ✓ ${name}`)
    }

    // Find pending migrations
    const pending = migrations.filter((m) => !executedNames.has(m.name))

    if (pending.length === 0) {
      console.log('\n✓ All migrations are up to date!')
      await sql.end()
      return
    }

    console.log(`\nPending migrations: ${pending.length}`)
    for (const m of pending) {
      console.log(`  - ${m.name}: ${m.description}`)
    }

    // Run pending migrations
    console.log('\nRunning migrations...\n')
    for (const migration of pending) {
      console.log(`Running: ${migration.name}...`)
      try {
        await sql.unsafe(migration.sql)
        await sql`INSERT INTO _migrations (name) VALUES (${migration.name})`
        console.log(`  ✓ ${migration.name} completed`)
      } catch (error) {
        console.error(`  ✗ ${migration.name} failed:`, error)
        throw error
      }
    }

    console.log('\n✓ All migrations completed successfully!')
  } catch (error) {
    console.error('\nMigration failed:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

runMigrations()
