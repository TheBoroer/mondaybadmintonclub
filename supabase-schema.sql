-- Monday Badminton Club Database Schema
-- Run this in your Supabase SQL Editor to set up the tables

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  courts INTEGER NOT NULL DEFAULT 2,
  max_players INTEGER NOT NULL DEFAULT 14,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  archived BOOLEAN DEFAULT FALSE
);

-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  position INTEGER NOT NULL,
  is_waitlist BOOLEAN DEFAULT FALSE,
  paid BOOLEAN DEFAULT FALSE,
  signed_up_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_players_session_id ON players(session_id);
CREATE INDEX idx_sessions_date ON sessions(date);
CREATE INDEX idx_sessions_archived ON sessions(archived);

-- Enable Row Level Security (RLS)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Policies for public read access (authenticated via app password)
CREATE POLICY "Allow public read access to sessions" ON sessions
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to players" ON players
  FOR SELECT USING (true);

-- Policies for insert/update/delete (handled via service role key on server)
CREATE POLICY "Allow service role full access to sessions" ON sessions
  FOR ALL USING (true);

CREATE POLICY "Allow service role full access to players" ON players
  FOR ALL USING (true);
