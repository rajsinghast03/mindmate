-- Mindmate Phase 2: Initial schema, pgvector, RLS, and triggers
-- Apply via Supabase SQL Editor or: supabase db push

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Updated-at trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name VARCHAR(60) NOT NULL,
  age SMALLINT NOT NULL CHECK (age >= 18),
  city_or_timezone VARCHAR(100) NOT NULL,
  curiosity_profile TEXT NOT NULL CHECK (char_length(curiosity_profile) >= 50),
  profile_embedding VECTOR(1536),
  visibility VARCHAR(20) NOT NULL DEFAULT 'discoverable'
    CHECK (visibility IN ('discoverable', 'paused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_embedding_hnsw
  ON public.profiles USING hnsw (profile_embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_profiles_visibility ON public.profiles(visibility);

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Matches
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_a_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  profile_b_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  score REAL NOT NULL DEFAULT 0.0,
  explanation TEXT NOT NULL,
  shared_curiosity TEXT NOT NULL,
  shared_question TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'suggested'
    CHECK (status IN ('suggested', 'requested', 'connected', 'passed', 'unmatched')),
  requested_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_profile_pair UNIQUE (profile_a_id, profile_b_id),
  CONSTRAINT different_profiles CHECK (profile_a_id <> profile_b_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_profiles
  ON public.matches(profile_a_id, profile_b_id, status);

DROP TRIGGER IF EXISTS matches_updated_at ON public.matches;
CREATE TRIGGER matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  body TEXT NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON public.messages(conversation_id, created_at ASC);

-- 7. Blocks
CREATE TABLE IF NOT EXISTS public.blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  blocked_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_block_pair UNIQUE (blocker_profile_id, blocked_profile_id)
);

-- 8. Reports
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reported_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Vector candidate retrieval (Phase 3)
CREATE OR REPLACE FUNCTION public.match_candidate_profiles(
  target_profile_id UUID,
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  display_name VARCHAR,
  age SMALLINT,
  city_or_timezone VARCHAR,
  curiosity_profile TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.display_name,
    p.age,
    p.city_or_timezone,
    p.curiosity_profile,
    1 - (p.profile_embedding <=> query_embedding) AS similarity
  FROM public.profiles p
  WHERE p.id <> target_profile_id
    AND p.visibility = 'discoverable'
    AND p.profile_embedding IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.matches m
      WHERE (m.profile_a_id = target_profile_id AND m.profile_b_id = p.id)
         OR (m.profile_b_id = target_profile_id AND m.profile_a_id = p.id)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_profile_id = target_profile_id AND b.blocked_profile_id = p.id)
         OR (b.blocker_profile_id = p.id AND b.blocked_profile_id = target_profile_id)
    )
    AND (1 - (p.profile_embedding <=> query_embedding)) > match_threshold
  ORDER BY p.profile_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 10. Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Profiles: own profile only (matching uses service role / RPC in Phase 3)
DROP POLICY IF EXISTS "Users manage own profile" ON public.profiles;
CREATE POLICY "Users manage own profile"
  ON public.profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Matches: view and update matches the user is part of
DROP POLICY IF EXISTS "Users view own matches" ON public.matches;
CREATE POLICY "Users view own matches"
  ON public.matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND (p.id = profile_a_id OR p.id = profile_b_id)
    )
  );

DROP POLICY IF EXISTS "Users update own matches" ON public.matches;
CREATE POLICY "Users update own matches"
  ON public.matches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND (p.id = profile_a_id OR p.id = profile_b_id)
    )
  );

-- Conversations
DROP POLICY IF EXISTS "Users view own conversations" ON public.conversations;
CREATE POLICY "Users view own conversations"
  ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      JOIN public.profiles p ON (p.id = m.profile_a_id OR p.id = m.profile_b_id)
      WHERE m.id = match_id AND p.user_id = auth.uid()
    )
  );

-- Messages
DROP POLICY IF EXISTS "Users access own messages" ON public.messages;
CREATE POLICY "Users access own messages"
  ON public.messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.matches m ON c.match_id = m.id
      JOIN public.profiles p ON (p.id = m.profile_a_id OR p.id = m.profile_b_id)
      WHERE c.id = messages.conversation_id
        AND p.user_id = auth.uid()
        AND m.status = 'connected'
    )
  );

-- Blocks
DROP POLICY IF EXISTS "Users manage own blocks" ON public.blocks;
CREATE POLICY "Users manage own blocks"
  ON public.blocks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = blocker_profile_id AND p.user_id = auth.uid()
    )
  );

-- Reports
DROP POLICY IF EXISTS "Users create reports" ON public.reports;
CREATE POLICY "Users create reports"
  ON public.reports FOR INSERT
  WITH CHECK (
    reporter_profile_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = reporter_profile_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users view own reports" ON public.reports;
CREATE POLICY "Users view own reports"
  ON public.reports FOR SELECT
  USING (
    reporter_profile_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = reporter_profile_id AND p.user_id = auth.uid()
    )
  );
