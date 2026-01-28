# Project Guidelines

## Database Migrations

**IMPORTANT:** Whenever database fields or tables are changed in any way, you MUST create a database migration.

### Migration Process

All migrations are managed in `scripts/migrate.ts`. To add a new migration:

1. Open `scripts/migrate.ts`
2. Add a new entry to the `migrations` array with:
   - `name`: Sequential identifier (e.g., `003_add_new_field`)
   - `description`: Brief description of what the migration does
   - `sql`: The SQL to execute
3. Update the TypeScript types in `lib/supabase.ts` to reflect the schema changes
4. Run the migration with `npm run migrate`

### Example: Adding a Migration

```typescript
// In scripts/migrate.ts, add to the migrations array:
{
  name: '003_add_cost_field',
  description: 'Add cost column to sessions table',
  sql: `
    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2) DEFAULT 0;
  `,
},
```

### Running Migrations

```bash
npm run migrate
```

This command will:
- Create a backup of all existing data in `/backups/`
- Check which migrations have already been executed
- Run only pending migrations
- Track completed migrations in the `_migrations` table

### Migration Best Practices

- Always use `IF NOT EXISTS` or `IF EXISTS` to make migrations idempotent
- Use sequential naming: `001_`, `002_`, `003_`, etc.
- Keep migrations small and focused on one change
- Never modify an existing migration that has been run - create a new one instead

## Schema Reference

### sessions table
- `id` (uuid, primary key)
- `date` (date)
- `courts` (integer)
- `max_players` (integer)
- `cost` (decimal) - cost per player for the session
- `archived` (boolean)
- `created_at` (timestamp)

### players table
- `id` (uuid, primary key)
- `session_id` (uuid, foreign key to sessions)
- `name` (text)
- `pin` (text, nullable) - last 4 digits of phone for cancellation (null for admin-added players)
- `position` (integer)
- `is_waitlist` (boolean)
- `paid` (boolean)
- `signed_up_at` (timestamp)

### _migrations table (internal)
- `id` (serial, primary key)
- `name` (varchar, unique)
- `executed_at` (timestamp)
