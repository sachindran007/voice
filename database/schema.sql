-- AI Voice Recorder Database Schema
-- Run this in your Supabase SQL editor

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- for full-text search

-- ============================================
-- RECORDINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS recordings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Untitled Recording',
  duration INTEGER DEFAULT 0, -- total duration in seconds
  file_url TEXT, -- Supabase storage URL
  file_size INTEGER DEFAULT 0, -- in bytes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
  user_id TEXT DEFAULT 'default' -- for future auth
);

-- ============================================
-- CHUNKS TABLE (30-second audio segments)
-- ============================================
CREATE TABLE IF NOT EXISTS chunks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  recording_id UUID REFERENCES recordings(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  file_url TEXT,
  duration INTEGER DEFAULT 30,
  transcript TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SUMMARIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS summaries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  recording_id UUID REFERENCES recordings(id) ON DELETE CASCADE UNIQUE,
  full_transcript TEXT,
  summary TEXT,
  action_items JSONB DEFAULT '[]',
  key_points JSONB DEFAULT '[]',
  sentiment TEXT DEFAULT 'neutral',
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  model_used TEXT DEFAULT 'gemini-2.0-flash'
);

-- ============================================
-- INDEXES FOR SEARCH
-- ============================================
CREATE INDEX IF NOT EXISTS idx_summaries_transcript_gin
  ON summaries USING gin(to_tsvector('english', full_transcript));

CREATE INDEX IF NOT EXISTS idx_summaries_summary_trgm
  ON summaries USING gin(summary gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_recordings_created
  ON recordings(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chunks_recording
  ON chunks(recording_id, chunk_index);

-- ============================================
-- SEARCH FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION search_recordings(search_query TEXT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ,
  duration INTEGER,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.title,
    s.summary,
    r.created_at,
    r.duration,
    ts_rank(to_tsvector('english', COALESCE(s.full_transcript, '') || ' ' || COALESCE(s.summary, '')),
            plainto_tsquery('english', search_query)) AS rank
  FROM recordings r
  LEFT JOIN summaries s ON s.recording_id = r.id
  WHERE
    to_tsvector('english', COALESCE(s.full_transcript, '') || ' ' || COALESCE(s.summary, ''))
    @@ plainto_tsquery('english', search_query)
    OR r.title ILIKE '%' || search_query || '%'
  ORDER BY rank DESC, r.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STORAGE BUCKET (run via Supabase dashboard)
-- ============================================
-- Create a bucket named "audio-chunks" with public access

-- ============================================
-- ROW LEVEL SECURITY (optional, for auth)
-- ============================================
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;

-- For now, allow all access (update when you add auth)
CREATE POLICY "Allow all recordings" ON recordings FOR ALL USING (true);
CREATE POLICY "Allow all chunks" ON chunks FOR ALL USING (true);
CREATE POLICY "Allow all summaries" ON summaries FOR ALL USING (true);

-- ============================================
-- AUTO-UPDATE TIMESTAMP TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recordings_updated_at
  BEFORE UPDATE ON recordings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
