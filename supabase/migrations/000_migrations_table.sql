-- Migration: 000_migrations_table
-- Description: Create migrations tracking table (run this first manually)

CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
