-- ============================================================
-- Poker Tracker — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Players
CREATE TABLE public.players (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions
CREATE TABLE public.sessions (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date       DATE NOT NULL,
  location   TEXT NOT NULL,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session results (profit is auto-computed from cashout - buyin)
CREATE TABLE public.session_results (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  player_id  UUID NOT NULL REFERENCES public.players(id)  ON DELETE CASCADE,
  buyin      NUMERIC(10,2) NOT NULL DEFAULT 0,
  cashout    NUMERIC(10,2) NOT NULL DEFAULT 0,
  profit     NUMERIC(10,2) GENERATED ALWAYS AS (cashout - buyin) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security
-- The admin password is enforced client-side only, so we give
-- the anon key full read/write access to all three tables.
-- ============================================================

ALTER TABLE public.players        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all" ON public.players
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all" ON public.sessions
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all" ON public.session_results
  FOR ALL TO anon USING (true) WITH CHECK (true);
