-- Migration: 002_add_player_pin
-- Description: Add PIN column to players table for cancellation verification

-- Add pin column (with default for existing rows)
ALTER TABLE players ADD COLUMN IF NOT EXISTS pin VARCHAR(4) NOT NULL DEFAULT '0000';
